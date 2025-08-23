
'use server';

import fs from 'fs/promises';
import path from 'path';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import type { Project, ProjectCategory, ProjectStatus, Governance, Task, TaskStatus } from '@/lib/types';
import { currentUser } from '@/lib/data';
import { users } from '@/lib/data';

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

const TaskSchema = z.object({
    id: z.string(),
    projectId: z.string(),
    title: z.string().min(1, "Title is required."),
    description: z.string().optional(),
    status: z.enum(['To Do', 'In Progress', 'Done']),
    assignedToId: z.string().optional(),
    estimatedHours: z.coerce.number().optional(),
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

        const isExpertReviewedString = p.isExpertReviewed ? `\n    isExpertReviewed: ${p.isExpertReviewed},` : '';

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
    discussions: ${p.discussions},${isExpertReviewedString}
    status: '${p.status}',${governanceString}
  }`;
    }).join(',\n');

    return `export const projects: Project[] = [\n${projectStrings}\n];`;
}


function serializeTasks(tasks: Task[]): string {
    const taskStrings = tasks.map(t => {
        const assignedToString = t.assignedTo ? `assignedTo: users.find(u => u.id === '${t.assignedTo!.id}')` : 'assignedTo: undefined';
        const descriptionString = t.description ? `description: \`${t.description.replace(/`/g, "\\`")}\`` : '';
        const estimatedHoursString = t.estimatedHours ? `estimatedHours: ${t.estimatedHours}` : '';

        const fields = [
            `id: '${t.id}'`,
            `projectId: '${t.projectId}'`,
            `title: '${t.title.replace(/'/g, "\\'")}'`,
            descriptionString,
            `status: '${t.status}'`,
            assignedToString,
            estimatedHoursString
        ].filter(Boolean).join(', ');

        return `    { ${fields} }`;
    }).join(',\n');

    return `export let tasks: Task[] = [\n${taskStrings}\n];`;
}


// This is a simplified example. In a real app, you'd use a database.
async function updateDataFile(updater: (data: { projects: Project[], tasks: Task[] }) => { projects: Project[], tasks: Task[] }) {
  try {
    const dataFileModule = await import(`@/lib/data.ts?timestamp=${new Date().getTime()}`);
    const currentProjects: Project[] = dataFileModule.projects;
    const currentTasks: Task[] = dataFileModule.tasks;

    const { projects: updatedProjects, tasks: updatedTasks } = updater({ projects: currentProjects, tasks: currentTasks });
    
    // Read the original file content to preserve other exports
    const originalContent = await fs.readFile(dataFilePath, 'utf-8');
    
    // Replace projects array
    const projectsRegex = /export const projects: Project\[\] = \[[\s\S]*?\];/;
    let updatedContent = originalContent.replace(projectsRegex, serializeProjects(updatedProjects));

    // Replace tasks array
    const tasksRegex = /export let tasks: Task\[\] = \[[\s\S]*?\];/;
    updatedContent = updatedContent.replace(tasksRegex, serializeTasks(updatedTasks));
    
    await fs.writeFile(dataFilePath, updatedContent, 'utf-8');

  } catch (error) {
    console.error("Error updating data file:", error);
    throw new Error("Could not update data file.");
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
    await updateDataFile(({ projects, tasks }) => ({ projects: [newProject, ...projects], tasks }));
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
        await updateDataFile(({ projects, tasks }) => {
            const projectIndex = projects.findIndex(p => p.id === projectId);
            if (projectIndex === -1) {
                console.error("Project not found in joinProject updater");
                return { projects, tasks }; 
            }

            const project = projects[projectIndex];
            const isAlreadyMember = project.team.some(member => member.user.id === currentUser.id);

            if (isAlreadyMember) {
                console.log("User is already a member");
                return { projects, tasks };
            }

            const updatedProject = {
                ...project,
                team: [...project.team, { user: currentUser, role: 'participant' as const }],
            };

            const updatedProjects = [...projects];
            updatedProjects[projectIndex] = updatedProject;
            
            return { projects: updatedProjects, tasks };
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
        await updateDataFile(({ projects, tasks }) => {
            const projectIndex = projects.findIndex(p => p.id === id);
            if (projectIndex === -1) {
                throw new Error("Project not found");
            }
            const project = projects[projectIndex];

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
                contributionNeeds: typeof projectData.contributionNeeds === 'string'
                    ? projectData.contributionNeeds.split(',').map(item => item.trim())
                    : project.contributionNeeds,
                governance: projectData.governance,
            };
            

            const updatedProjects = [...projects];
            updatedProjects[projectIndex] = updatedProject;
            return { projects: updatedProjects, tasks };
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


export async function updateTask(values: z.infer<typeof TaskSchema>) {
    const validatedFields = TaskSchema.safeParse(values);

    if (!validatedFields.success) {
        return {
            success: false,
            error: 'Invalid data provided.',
        };
    }

    const { id, assignedToId, ...taskData } = validatedFields.data;

    try {
        await updateDataFile(({ projects, tasks }) => {
            const taskIndex = tasks.findIndex(t => t.id === id);
            if (taskIndex === -1) {
                throw new Error("Task not found");
            }
            const task = tasks[taskIndex];
            
            const project = projects.find(p => p.id === task.projectId);
            if (!project) {
                throw new Error("Associated project not found");
            }

            const isMember = project.team.some(m => m.user.id === currentUser.id);
            if (!isMember) {
                throw new Error("Only team members can edit tasks.");
            }

            const updatedTask: Task = {
                ...task,
                ...taskData,
                assignedTo: assignedToId ? users.find(u => u.id === assignedToId) : undefined,
            };

            const updatedTasks = [...tasks];
            updatedTasks[taskIndex] = updatedTask;
            return { projects, tasks: updatedTasks };
        });
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : "An unknown error occurred."
        };
    }

    revalidatePath(`/projects/${taskData.projectId}`);
    return { success: true };
}
