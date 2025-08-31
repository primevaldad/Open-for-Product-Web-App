
'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import type { Project, ProjectStatus, Task, Discussion } from '@/lib/types';
import { getHydratedData } from '@/lib/data-cache';
import { db } from '@/lib/firebase-admin';
import { doc, setDoc, addDoc, collection, updateDoc, deleteDoc, arrayUnion } from 'firebase/firestore';

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

const CreateTaskSchema = TaskSchema.omit({ id: true });
const DeleteTaskSchema = z.object({ id: z.string(), projectId: z.string() });

const DiscussionCommentSchema = z.object({
    projectId: z.string(),
    userId: z.string(),
    content: z.string().min(1, "Comment cannot be empty."),
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
  
  const data = await getHydratedData();
  const currentUser = data.users[data.currentUserIndex];

  const newProjectData = {
    name,
    tagline,
    description,
    category,
    timeline: 'TBD',
    contributionNeeds: contributionNeeds.split(',').map(item => item.trim()),
    progress: 0,
    team: [{ userId: currentUser.id, role: 'lead' }],
    votes: 0,
    discussions: [],
    status,
  };

  try {
    const docRef = await addDoc(collection(db, 'projects'), newProjectData);
    
    revalidatePath('/');
    revalidatePath('/create');
    if (status === 'draft') {
        revalidatePath('/drafts');
    }

    if (status === 'published') {
      redirect(`/projects/${docRef.id}`);
    } else {
      redirect('/drafts');
    }

  } catch (error) {
     return { 
      success: false, 
      error: error instanceof Error ? error.message : "An unknown error occurred." 
    };
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
        const data = await getHydratedData();
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

        const projectDocRef = doc(db, 'projects', projectId);
        await updateDoc(projectDocRef, {
            team: arrayUnion({ userId: currentUser.id, role: 'participant' as const })
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
        const data = await getHydratedData();
        const currentUser = data.users[data.currentUserIndex];
        const project = data.projects.find(p => p.id === id);
        if (!project) {
            throw new Error("Project not found");
        }

        const lead = project.team.find(m => m.role === 'lead');
        if (!lead || lead.user.id !== currentUser.id) {
            throw new Error("Only the project lead can edit the project.");
        }
        
        const updatedData = {
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

        const projectDocRef = doc(db, 'projects', id);
        await updateDoc(projectDocRef, updatedData);

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

export async function addTask(values: z.infer<typeof CreateTaskSchema>) {
    const validatedFields = CreateTaskSchema.safeParse(values);

    if (!validatedFields.success) {
        return {
            success: false,
            error: 'Invalid data provided.',
        };
    }

    const { projectId, title, description, status } = validatedFields.data;

    try {
        const data = await getHydratedData();
        const currentUser = data.users[data.currentUserIndex];
        const project = data.projects.find(p => p.id === projectId);
        if (!project) {
            throw new Error("Associated project not found");
        }

        const isMember = project.team.some(m => m.user.id === currentUser.id);
        if (!isMember) {
            throw new Error("Only team members can add tasks.");
        }

        const newTaskData = {
            projectId,
            title,
            description,
            status,
        };

        await addDoc(collection(db, 'tasks'), newTaskData);

    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : "An unknown error occurred."
        };
    }

    revalidatePath(`/projects/${projectId}`);
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

    const { id, projectId, ...taskData } = validatedFields.data;

    try {
        const data = await getHydratedData();
        const currentUser = data.users[data.currentUserIndex];
        
        const project = data.projects.find(p => p.id === projectId);
        if (!project) {
            throw new Error("Associated project not found");
        }

        const isMember = project.team.some(m => m.user.id === currentUser.id);
        if (!isMember) {
            throw new Error("Only team members can edit tasks.");
        }
        
        const taskDocRef = doc(db, 'tasks', id);
        await updateDoc(taskDocRef, taskData);


    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : "An unknown error occurred."
        };
    }

    revalidatePath(`/projects/${projectId}`);
    return { success: true };
}


export async function deleteTask(values: z.infer<typeof DeleteTaskSchema>) {
    const validatedFields = DeleteTaskSchema.safeParse(values);

    if (!validatedFields.success) {
        return {
            success: false,
            error: 'Invalid data provided.',
        };
    }
    
    const { id, projectId } = validatedFields.data;
    
    try {
        const data = await getHydratedData();
        const currentUser = data.users[data.currentUserIndex];
        const project = data.projects.find(p => p.id === projectId);
        if (!project) {
            throw new Error("Associated project not found");
        }

        const isMember = project.team.some(m => m.user.id === currentUser.id);
        if (!isMember) {
            throw new Error("Only team members can delete tasks.");
        }

        await deleteDoc(doc(db, 'tasks', id));

    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : "An unknown error occurred."
        };
    }

    revalidatePath(`/projects/${projectId}`);
    return { success: true };
}

export async function addDiscussionComment(values: z.infer<typeof DiscussionCommentSchema>) {
    const validatedFields = DiscussionCommentSchema.safeParse(values);

    if (!validatedFields.success) {
        return { success: false, error: "Invalid data provided." };
    }

    const { projectId, userId, content } = validatedFields.data;

    try {
        const data = await getHydratedData();
        const project = data.projects.find(p => p.id === projectId);
        if (!project) {
            throw new Error("Project not found");
        }
        
        const user = data.users.find(u => u.id === userId);
        if (!user) {
            throw new Error("User not found");
        }

        const isMember = project.team.some(m => m.user.id === userId);
        if (!isMember) {
            throw new Error("Only team members can add comments.");
        }
        
        const newComment = {
            userId,
            content,
            timestamp: new Date().toISOString(),
        };

        const projectDocRef = doc(db, 'projects', projectId);
        await updateDoc(projectDocRef, {
            discussions: arrayUnion(newComment)
        });
        
        revalidatePath(`/projects/${projectId}`);
        return { success: true };

    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : "An unknown error occurred."
        };
    }
}
