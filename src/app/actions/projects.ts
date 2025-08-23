
'use server';

import fs from 'fs/promises';
import path from 'path';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import type { Project, ProjectCategory, ProjectStatus } from '@/lib/types';
import { currentUser } from '@/lib/data';

const dataFilePath = path.join(process.cwd(), 'src', 'lib', 'data.ts');

const ProjectSchema = z.object({
  name: z.string().min(1, 'Project name is required.'),
  tagline: z.string().min(1, 'Tagline is required.'),
  description: z.string().min(1, 'Description is required.'),
  category: z.enum(['Creative', 'Technical', 'Community', 'Business & Enterprise', 'Learning & Research']),
  contributionNeeds: z.string().min(1, 'Contribution needs are required.'),
});

// This is a simplified example. In a real app, you'd use a database.
async function appendToProjects(newProject: Project) {
  try {
    const fileContent = await fs.readFile(dataFilePath, 'utf-8');
    
    // This is a naive way to add a project. A real implementation would be more robust.
    const newProjectString = `,\n  {\n    id: '${newProject.id}',\n    name: '${newProject.name}',\n    tagline: '${newProject.tagline}',\n    description: \`${newProject.description}\`,\n    category: '${newProject.category}',\n    timeline: '${newProject.timeline}',\n    contributionNeeds: [${newProject.contributionNeeds.map(n => `'${n}'`).join(', ')}],\n    progress: ${newProject.progress},\n    team: [users.find(u => u.id === '${newProject.team[0].id}')!],\n    votes: ${newProject.votes},\n    discussions: ${newProject.discussions},\n    status: '${newProject.status}',\n  }`;

    const updatedContent = fileContent.replace(
      /(export const projects: Project\[\] = \[)/,
      `$1${newProjectString}`
    ).replace(/,(\s*\];)/, '$1'); // Fix trailing comma

     // A bit of a hack to prepend the new project to the array
    const projectsRegex = /export const projects: Project\[\] = \[([\s\S]*?)\];/;
    const match = fileContent.match(projectsRegex);
    if (match) {
        const existingProjects = match[1];
        const updatedProjects = `${newProjectString.slice(2)}${existingProjects ? ',' : ''}${existingProjects}`;
        const finalContent = fileContent.replace(projectsRegex, `export const projects: Project[] = [${updatedProjects}];`);
        await fs.writeFile(dataFilePath, finalContent, 'utf-8');
    } else {
         throw new Error("Could not find projects array in data file.");
    }

  } catch (error) {
    console.error("Error updating data file:", error);
    throw new Error("Could not add new project.");
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
    team: [currentUser],
    votes: 0,
    discussions: 0,
    status,
  };

  try {
    await appendToProjects(newProject);
    
    // Revalidate paths to show the new project
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
  
  // Redirect after successful submission
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
