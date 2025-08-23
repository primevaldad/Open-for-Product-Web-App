
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
async function updateProjectsFile(updater: (projects: Project[]) => Project[]) {
  try {
    const fileContent = await fs.readFile(dataFilePath, 'utf-8');
    
    // This is a very brittle way to update the projects array.
    // It relies on a simple regex and string replacement.
    // A real app would use a more robust method like parsing the AST.
    const projectsRegex = /export const projects: Project\[\] = (\[[\s\S]*?\]);/;
    const match = fileContent.match(projectsRegex);

    if (!match) {
      throw new Error("Could not find projects array in data file.");
    }

    // WARNING: This uses eval, which is dangerous with untrusted input.
    // We are using it here for simplicity in a prototyping context.
    const currentProjects: Project[] = eval(match[1]);
    const updatedProjects = updater(currentProjects);
    
    // We need to carefully serialize the projects back into a string.
    // This is also very fragile.
    const updatedProjectsString = JSON.stringify(updatedProjects, (key, value) => {
        // Custom replacer to handle functions and circular references if any
        if (key === 'user' && value.id) {
            return `users.find(u => u.id === '${value.id}')!`;
        }
        return value;
    }, 2)
    .replace(/"user": "users.find\(u => u.id === '(.*)'\)!/g, 'user: users.find(u => u.id === \'$1\')!')
    .replace(/"role":/g, 'role:')
    .replace(/"/g, "'");


    const updatedContent = fileContent.replace(projectsRegex, `export const projects: Project[] = ${updatedProjectsString};`);
    await fs.writeFile(dataFilePath, updatedContent, 'utf-8');

  } catch (error) {
    console.error("Error updating data file:", error);
    throw new Error("Could not update projects.");
  }
}


async function appendToProjects(newProject: Project) {
  try {
    const fileContent = await fs.readFile(dataFilePath, 'utf-8');
    const newProjectString = `,\n  {\n    id: '${newProject.id}',\n    name: '${newProject.name}',\n    tagline: '${newProject.tagline}',\n    description: \`${newProject.description}\`,\n    category: '${newProject.category}',\n    timeline: '${newProject.timeline}',\n    contributionNeeds: [${newProject.contributionNeeds.map(n => `'${n}'`).join(', ')}],\n    progress: ${newProject.progress},\n    team: [{ user: users.find(u => u.id === '${newProject.team[0].user.id}')!, role: '${newProject.team[0].role}' }],\n    votes: ${newProject.votes},\n    discussions: ${newProject.discussions},\n    status: '${newProject.status}',\n  }`;

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
    team: [{ user: currentUser, role: 'lead' }],
    votes: 0,
    discussions: 0,
    status,
  };

  try {
    await appendToProjects(newProject);
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
        const fileContent = await fs.readFile(dataFilePath, 'utf-8');
        
        const projectsRegex = /export const projects: Project\[\] = (\[[\s\S]*?\]);/s;
        const match = fileContent.match(projectsRegex);

        if (!match) throw new Error('Could not find projects array in data file.');
        
        // This is unsafe, for prototype only.
        const projects: Project[] = eval(match[1]); 

        const projectIndex = projects.findIndex(p => p.id === projectId);
        if (projectIndex === -1) {
            return { success: false, error: 'Project not found.' };
        }

        const project = projects[projectIndex];
        const isAlreadyMember = project.team.some(member => member.user.id === currentUser.id);

        if (isAlreadyMember) {
            return { success: false, error: 'You are already a member of this project.' };
        }

        const newMember = `{ user: users.find(u => u.id === '${currentUser.id}'), role: 'participant' }`;
        
        // This is extremely fragile. A real app would have a proper database and API.
        const teamRegex = new RegExp(`(id: '${projectId}'[\\s\\S]*?team: \\[)([\\s\\S]*?)(\\])`);
        const teamMatch = fileContent.match(teamRegex);

        if(!teamMatch) throw new Error('Could not find project team in data file.');

        const existingTeam = teamMatch[2];
        const updatedTeam = existingTeam ? `${existingTeam}, ${newMember}` : newMember;
        const updatedContent = fileContent.replace(teamRegex, `$1${updatedTeam}$3`);
        
        await fs.writeFile(dataFilePath, updatedContent, 'utf-8');

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
