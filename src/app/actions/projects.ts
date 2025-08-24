
'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import type { Project, ProjectStatus, Task } from '@/lib/types';
import { users } from '@/lib/data';
import { getData, setData } from '@/lib/data-cache';

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
  
  const data = await getData();
  const currentUser = data.users[data.currentUserIndex];

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
    data.projects.unshift(newProject);
    await setData(data);
    
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
        const data = await getData();
        const currentUser = data.users[data.currentUserIndex];
        const project = data.projects.find(p => p.id === projectId);

        if (!project) {
          throw new Error("Project not found");
        }

        const isAlreadyMember = project.team.some(member => member.user.id === currentUser.id);

        if (isAlreadyMember) {
            console.log("User is already a member");
            return { success: true };
        }

        project.team.push({ user: currentUser, role: 'participant' as const });

        await setData(data);

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
        const data = await getData();
        const currentUser = data.users[data.currentUserIndex];
        const projectIndex = data.projects.findIndex(p => p.id === id);
        if (projectIndex === -1) {
            throw new Error("Project not found");
        }
        const project = data.projects[projectIndex];

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
        
        data.projects[projectIndex] = updatedProject;
        await setData(data);

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
        const data = await getData();
        const currentUser = data.users[data.currentUserIndex];
        const taskIndex = data.tasks.findIndex(t => t.id === id);
        if (taskIndex === -1) {
            throw new Error("Task not found");
        }
        const task = data.tasks[taskIndex];
        
        const project = data.projects.find(p => p.id === task.projectId);
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

        data.tasks[taskIndex] = updatedTask;
        await setData(data);

    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : "An unknown error occurred."
        };
    }

    revalidatePath(`/projects/${taskData.projectId}`);
    return { success: true };
}
