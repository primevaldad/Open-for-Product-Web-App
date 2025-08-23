
'use server';

import fs from 'fs/promises';
import path from 'path';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import type { Project, ProjectCategory, ProjectStatus, Governance } from '@/lib/types';
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

const EditProjectSchema = ProjectSchema.extend({
  id: z.string(),
  timeline: z.string().min(1, "Timeline is required."),
  governance: z.object({
    contributorsShare: z.number(),
    communityShare: z.number(),
    sustainabilityShare: z.number(),
  }),
});


function serializeProjects(projects: Project[]): string {
    const projectStrings = projects.map(p => {
        const teamString = p.team.map(m => `{ user: users.find(u => u.id === '${m.user.id}')!, role: '${m.role}' }`).join(',\n        ');
        const contributionNeedsString = p.contributionNeeds.map(n => `'${n.replace(/'/g, "\\'")}'`).join(', ');
        
        let governanceString = '';
        if (p.governance) {
            governanceString = `\n    governance: {
      contributorsShare: ${p.governance.contributorsShare},
      communityShare: ${p.governance.communityShare},
      sustainabilityShare: ${p.governance.sustainabilityShare},
    },`;
        }


        return `  {
    id: '${p.id}',
    name: '${p.name.replace(/'/g, "\\'")}',
    tagline: '${p.tagline.replace(/'/g, "\\'")}',
    description: \`${p.description.replace(/`/g, "\\`")}\`,
    category: '${p.category}',
    timeline: '${p.timeline.replace(/'/g, "\\'")}',
    contributionNeeds: [${contributionNeedsString}],
    progress: ${p.progress},
    team: [
        ${teamString}
    ],
    votes: ${p.votes},
    discussions: ${p.discussions},${p.isExpertReviewed ? `\n    isExpertReviewed: ${p.isExpertReviewed},` : ''}
    status: '${p.status}',${governanceString}
  }`;
    });

    return `export const projects: Project[] = [\n${projectStrings.join(',\n')}\n];`;
}


// This is a simplified example. In a real app, you'd use a database.
async function updateProjectsFile(updater: (projects: Project[]) => Project[]) {
  try {
    // NOTE: This is not a safe way to read/write files in a concurrent environment.
    // For this prototype, we are assuming single-user access.
    // We are also re-importing the data on each write to get the latest version.
    const dataFileContent = await fs.readFile(path.join(process.cwd(), 'src', 'lib', 'data.ts'), 'utf-8');
    const projectsRegex = /export const projects: Project\[\] = \[[\s\S]*?\];/;
    const match = dataFileContent.match(projectsRegex);

    if (!match) {
        throw new Error("Could not find projects array in data.ts");
    }
    
    // A bit of a hack to re-evaluate the projects array from the file content.
    // In a real app, this would come from a database.
    const currentProjects: Project[] = eval(`(function() { 
        const users = ${JSON.stringify(users)}; 
        ${match[0].replace('export const projects: Project[] =', 'return')} 
    })()`);


    const updatedProjects = updater(currentProjects);
    
    const updatedContent = dataFileContent.replace(projectsRegex, serializeProjects(updatedProjects));
    
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

export async function updateProject(values: z.infer<typeof EditProjectSchema>) {
    const validatedFields = EditProjectSchema.safeParse(values);

    if (!validatedFields.success) {
        return {
            success: false,
            error: 'Invalid data provided.',
        };
    }

    const { id, ...projectData } = validatedFields.data;

    try {
        await updateProjectsFile((projects) => {
            const projectIndex = projects.findIndex(p => p.id === id);
            if (projectIndex === -1) {
                throw new Error("Project not found");
            }
            const project = projects[projectIndex];

            // Ensure only the lead can edit
            const lead = project.team.find(m => m.role === 'lead');
            if (!lead || lead.user.id !== currentUser.id) {
                throw new Error("Only the project lead can edit the project.");
            }

            const updatedProject: Project = {
                ...project,
                name: projectData.name,
                tagline: projectData.tagline,
                description: projectData.description,
                category: projectData.category,
                timeline: projectData.timeline,
                contributionNeeds: projectData.contributionNeeds.split(',').map(item => item.trim()),
                governance: projectData.governance,
            };

            const updatedProjects = [...projects];
            updatedProjects[projectIndex] = updatedProject;
            return updatedProjects;
        });
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : "An unknown error occurred."
        };
    }

    revalidatePath(`/projects/${id}`);
    revalidatePath(`/projects/${id}/edit`);
    redirect(`/projects/${id}`);
    
    return { success: true };
}
