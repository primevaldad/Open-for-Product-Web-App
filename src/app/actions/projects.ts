
'use server';

import fs from 'fs/promises';
import path from 'path';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import type { Project, ProjectCategory, ProjectStatus } from '@/lib/types';
import { currentUser } from '@/lib/data';
import { projects as allProjects, users } from '@/lib/data';

const dataFilePath = path.join(process.cwd(), 'src', 'lib', 'data.ts');

const ProjectSchema = z.object({
  name: z.string().min(1, 'Project name is required.'),
  tagline: z.string().min(1, 'Tagline is required.'),
  description: z.string().min(1, 'Description is required.'),
  category: z.enum(['Creative', 'Technical', 'Community', 'Business & Enterprise', 'Learning & Research']),
  contributionNeeds: z.string().min(1, 'Contribution needs are required.'),
});

function serializeProjects(projects: Project[]): string {
    const projectStrings = projects.map(p => {
        const teamString = p.team.map(m => `{ user: users.find(u => u.id === '${m.user.id}')!, role: '${m.role}' }`).join(',\n        ');
        const contributionNeedsString = p.contributionNeeds.map(n => `'${n}'`).join(', ');

        return `  {
    id: '${p.id}',
    name: '${p.name.replace(/'/g, "\\'")}',
    tagline: '${p.tagline.replace(/'/g, "\\'")}',
    description: \`${p.description.replace(/`/g, "\\`")}\`,
    category: '${p.category}',
    timeline: '${p.timeline}',
    contributionNeeds: [${contributionNeedsString}],
    progress: ${p.progress},
    team: [
        ${teamString}
    ],
    votes: ${p.votes},
    discussions: ${p.discussions},
    ${p.isExpertReviewed ? `isExpertReviewed: ${p.isExpertReviewed},` : ''}
    status: '${p.status}',
  }`;
    });

    return `export const projects: Project[] = [\n${projectStrings.join(',\n')}\n];`;
}


// This is a simplified example. In a real app, you'd use a database.
async function updateProjectsFile(updater: (projects: Project[]) => Project[]) {
  try {
    const currentProjects = allProjects;
    const updatedProjects = updater(currentProjects);

    const fileContent = await fs.readFile(dataFilePath, 'utf-8');
    const projectsRegex = /export const projects: Project\[\] = \[[\s\S]*?\];/;
    
    const updatedContent = fileContent.replace(projectsRegex, serializeProjects(updatedProjects));
    
    await fs.writeFile(dataFilePath, updatedContent, 'utf-8');

  } catch (error) {
    console.error("Error updating data file:", error);
    throw new Error("Could not update projects.");
  }
}

async function handleProjectSubmission(
  values: z.infer<typeof ProjectSchema>,
  status: ProjectStatus
) {
  const validatedFields = ProjectSchema.safeParse(values);

  if (!validatedFields.success) {
    return {
      success: false,
      error: 'Invalid data provided.',
    };
  }
  
  const { name, tagline, description, category, contributionNeeds } = validatedFields.data;
  
  const newProject: Project = {
    id: `p${Math.floor(Math.random() * 1000)}`,
    name,
    tagline,
    description,
    category,
    timeline: 'TBD',
    contributionNeeds: contributionNeeds.split(',').map(item => item.trim()),
    progress: 0,
    team: [{ user: currentUser, role: 'lead' }],
    votes: 0,
    discussions: 0,
    status,
  };

  try {
    await updateProjectsFile((projects) => [newProject, ...projects]);
    revalidatePath('/');
    revalidatePath('/create');
    if (status === 'draft') {
        revalidatePath('/drafts');
    }
  } catch (error) {
     return { 
      success: false, 
      error: error instanceof Error ? error.message : "An unknown error occurred." 
    };
  }
  
  if (status === 'published') {
    redirect(`/projects/${newProject.id}`);
  } else {
    redirect('/drafts');
  }

  return { success: true };
}


export async function saveProjectDraft(values: z.infer<typeof ProjectSchema>) {
    return handleProjectSubmission(values, 'draft');
}

export async function publishProject(values: z.infer<typeof ProjectSchema>) {
    return handleProjectSubmission(values, 'published');
}


export async function joinProject(projectId: string) {
    try {
        await updateProjectsFile((projects) => {
            const projectIndex = projects.findIndex(p => p.id === projectId);
            if (projectIndex === -1) {
                console.error("Project not found in joinProject updater");
                return projects; 
            }

            const project = projects[projectIndex];
            const isAlreadyMember = project.team.some(member => member.user.id === currentUser.id);

            if (isAlreadyMember) {
                console.log("User is already a member");
                return projects;
            }

            const updatedProject = {
                ...project,
                team: [...project.team, { user: currentUser, role: 'participant' as const }],
            };

            const updatedProjects = [...projects];
            updatedProjects[projectIndex] = updatedProject;
            
            return updatedProjects;
        });

        revalidatePath(`/projects/${projectId}`);
        return { success: true };

    } catch (error) {
        console.error("Error joining project:", error);
        return { 
            success: false, 
            error: error instanceof Error ? error.message : "An unknown error occurred." 
        };
    }
}
