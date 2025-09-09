
'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import type { Project, ProjectStatus, Task } from '@/lib/types';
import { 
    addProject as addProjectToDb,
    addTask as addTaskToDb,
    deleteTask as deleteTaskFromDb,
    findProjectById, 
    findUserById, 
    getAllProjects,
    getAllTasks,
    updateProject as updateProjectInDb,
    updateTask as updateTaskInDb,
    updateUser,
} from '@/lib/data.server'; // Corrected import
import { getAuthenticatedUser } from '@/lib/session.server'; // Corrected import

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

const AddTeamMemberSchema = z.object({
    projectId: z.string(),
    userId: z.string(),
    role: z.enum(['participant', 'lead']),
});

async function handleProjectSubmission(
  values: z.infer<typeof ProjectSchema>,
  status: ProjectStatus
): Promise<{ success: boolean; error?: string; projectId?: string; }> {
  const validatedFields = ProjectSchema.safeParse(values);

  if (!validatedFields.success) {
    return {
      success: false,
      error: 'Invalid data provided.',
    };
  }

  const { name, tagline, description, category, contributionNeeds } = validatedFields.data;

  const currentUser = await getAuthenticatedUser(); // Corrected function call
  if (!currentUser) {
      return { success: false, error: "Could not find current user."};
  }
  
  const allProjects = await getAllProjects();
  const newProjectId = `p${allProjects.length + 1}`;

  const newProjectData: Project = {
    id: newProjectId,
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
    governance: {
        contributorsShare: 75,
        communityShare: 10,
        sustainabilityShare: 15,
    }
  };

  await addProjectToDb(newProjectData);

  revalidatePath('/');
  revalidatePath('/create');
  revalidatePath('/drafts');
  revalidatePath(`/projects/${newProjectId}`);

  return { success: true, projectId: newProjectId };
}

export async function saveProjectDraft(values: z.infer<typeof ProjectSchema>) {
    return await handleProjectSubmission(values, 'draft');
}

export async function publishProject(values: z.infer<typeof ProjectSchema>) {
    return await handleProjectSubmission(values, 'published');
}

export async function joinProject(projectId: string) {
    const currentUser = await getAuthenticatedUser(); // Corrected function call
    if (!currentUser) throw new Error("User not found");

    const project = await findProjectById(projectId);
    if (!project) {
        return { success: false, error: "Project not found" };
    }

    const isAlreadyMember = project.team.some(member => member.userId === currentUser.id);
    if (isAlreadyMember) {
        return { success: true };
    }

    project.team.push({ userId: currentUser.id, role: 'participant' as const });
    await updateProjectInDb(project);

    revalidatePath(`/projects/${projectId}`);
    revalidatePath('/', 'layout'); // To update project cards potentially seen by others
    return { success: true };
}

export async function addTeamMember(values: z.infer<typeof AddTeamMemberSchema>) {
    const validatedFields = AddTeamMemberSchema.safeParse(values);

    if (!validatedFields.success) {
        return { success: false, error: "Invalid data provided." };
    }

    const { projectId, userId, role } = validatedFields.data;

    const project = await findProjectById(projectId);
    if (!project) {
        return { success: false, error: "Project not found" };
    }

    const isAlreadyMember = project.team.some(member => member.userId === userId);
    if (isAlreadyMember) {
        return { success: false, error: "User is already a member of this project" };
    }

    project.team.push({ userId, role });
    await updateProjectInDb(project);

    const invitedUser = await findUserById(userId);
    if (invitedUser) {
        if (!invitedUser.notifications) {
            invitedUser.notifications = [];
        }
        invitedUser.notifications.push({
            id: `n${Date.now()}`,
            message: `You have been added to the project "${project.name}" as a ${role}.`,
            link: `/projects/${projectId}`,
            read: false,
        });
        await updateUser(invitedUser);
    }

    revalidatePath(`/projects/${projectId}`);
    revalidatePath('/', 'layout');
    return { success: true };
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

    const currentUser = await getAuthenticatedUser(); // Corrected function call
    if (!currentUser) throw new Error("User not found");

    const project = await findProjectById(id);
    if (!project) {
        return { success: false, error: "Project not found" };
    }

    const lead = project.team.find(m => m.role === 'lead');
    if (!lead || lead.userId !== currentUser.id) {
        return { success: false, error: "Only the project lead can edit the project." };
    }

    const updatedData: Project = {
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

    await updateProjectInDb(updatedData);

    revalidatePath('/');
    revalidatePath(`/projects/${id}`);
    revalidatePath(`/projects/${id}/edit`);
    revalidatePath('/drafts');

    return { success: true };
}

export async function addTask(values: z.infer<typeof CreateTaskSchema>) {
    const validatedFields = CreateTaskSchema.safeParse(values);

    if (!validatedFields.success) {
        return { success: false, error: 'Invalid data provided.' };
    }

    const { projectId, title, description, status } = validatedFields.data;

    const currentUser = await getAuthenticatedUser(); // Corrected function call
    if (!currentUser) throw new Error("User not found");

    const project = await findProjectById(projectId);
    if (!project) {
      return { success: false, error: "Associated project not found" };
    }

    const isMember = project.team.some(m => m.userId === currentUser.id);
    if (!isMember) {
      return { success: false, error: "Only team members can add tasks." };
    }
    const allTasks = await getAllTasks();
    const newTaskId = `t${allTasks.length + 1}`;
    const newTaskData: Task = {
        id: newTaskId,
        projectId,
        title,
        description,
        status,
    };

    await addTaskToDb(newTaskData);

    revalidatePath(`/projects/${projectId}`);
    return { success: true };
}

export async function updateTask(values: z.infer<typeof TaskSchema>) {
    const validatedFields = TaskSchema.safeParse(values);

    if (!validatedFields.success) {
        return { success: false, error: 'Invalid data provided.' };
    }

    const { id, projectId, ...taskData } = validatedFields.data;

    const currentUser = await getAuthenticatedUser(); // Corrected function call
    if (!currentUser) throw new Error("User not found");

    const project = await findProjectById(projectId);
    if (!project) {
        return { success: false, error: "Associated project not found" };
    }
    const isMember = project.team.some(m => m.userId === currentUser.id);
    if (!isMember) {
        return { success: false, error: "Only team members can edit tasks." };
    }

    const existingTask = (await getAllTasks()).find(t => t.id === id);
    if (!existingTask) {
        return { success: false, error: "Task not found" };
    }

    await updateTaskInDb({ ...existingTask, ...taskData });

    revalidatePath(`/projects/${projectId}`);
    revalidatePath('/activity');
    return { success: true };
}

export async function deleteTask(values: z.infer<typeof DeleteTaskSchema>) {
    const validatedFields = DeleteTaskSchema.safeParse(values);

    if (!validatedFields.success) {
        return { success: false, error: 'Invalid data provided.' };
    }

    const { id, projectId } = validatedFields.data;

    const currentUser = await getAuthenticatedUser(); // Corrected function call
    if (!currentUser) throw new Error("User not found");

    const project = await findProjectById(projectId);
    if (!project) {
      return { success: false, error: "Associated project not found" };
    }

    const isMember = project.team.some(m => m.userId === currentUser.id);
    if (!isMember) {
      return { success: false, error: "Only team members can delete tasks." };
    }

    await deleteTaskFromDb(id);

    revalidatePath(`/projects/${projectId}`);
    revalidatePath('/activity');
    return { success: true };
}

export async function addDiscussionComment(values: z.infer<typeof DiscussionCommentSchema>) {
    const validatedFields = DiscussionCommentSchema.safeParse(values);

    if (!validatedFields.success) { return { success: false, error: "Invalid data provided." }; }

    const { projectId, userId, content } = validatedFields.data;

    const project = await findProjectById(projectId);
    if (!project) {
      return { success: false, error: "Project not found" };
    }

    const isMember = project.team.some(m => m.userId === userId);
    if (!isMember) {
      return { success: false, error: "Only team members can add comments." };
    }

    const newComment = {
        userId,
        content,
        timestamp: new Date().toISOString(),
    };

    project.discussions.push(newComment);
    await updateProjectInDb(project);

    revalidatePath(`/projects/${projectId}`);
    return { success: true };

}
