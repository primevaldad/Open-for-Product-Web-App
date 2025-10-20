
'use server';

import { revalidatePath } from 'next/cache';
import * as admin from 'firebase-admin';
import { z } from 'zod';
import type { 
    Project, 
    ProjectStatus, 
    ProjectTag, 
    Tag as GlobalTag, 
    User,
    ServerActionResponse,
    Discussion,
    Task,
    HydratedProjectMember,
    ProjectMember,
    Governance
} from '@/lib/types';
import {
    adminDb,
    addDiscussionComment as addDiscussionCommentToDb,
    addNotification as addNotificationToDb,
    addTask as addTaskToDb,
    deleteTaskFromDb,
    findProjectById,
    findUserById,
    updateProject as updateProjectInDb,
    updateTask as updateTaskInDb,
    getAllTags as getAllGlobalTags, // Import the new function
} from '@/lib/data.server';
import { getAuthenticatedUser } from '@/lib/session.server';
import { CreateProjectSchema, EditProjectSchema, CreateProjectFormValues, EditProjectFormValues } from '@/lib/schemas';

const MAX_TAG_LENGTH = 35;

// --- Helper Functions ---

const normalizeTag = (tag: string): string => {
  return tag.toLowerCase().trim().replace(/[^a-z0-9-_]/g, '').slice(0, MAX_TAG_LENGTH);
};

async function manageTagsForProject(
    transaction: FirebaseFirestore.Transaction,
    newTags: ProjectTag[],
    currentTags: ProjectTag[],
    currentUser: User
): Promise<ProjectTag[]> {
    const tagsCollection = adminDb.collection('tags');

    const newTagsMap = new Map(newTags.map(t => [normalizeTag(t.id), t]));
    const currentTagsMap = new Map(currentTags.map(t => [normalizeTag(t.id), t]));

    const tagsToAddIds = [...newTagsMap.keys()].filter(id => !currentTagsMap.has(id));
    const tagsToRemoveIds = [...currentTagsMap.keys()].filter(id => !newTagsMap.has(id));

    const allRelevantTagIds = [...new Set([...tagsToAddIds, ...tagsToRemoveIds])].filter(Boolean);
    if (allRelevantTagIds.length === 0) {
        return newTags.map(pTag => ({ ...pTag, id: normalizeTag(pTag.id) }));
    }
    
    const tagRefs = allRelevantTagIds.map(id => tagsCollection.doc(id));
    const tagSnaps = await transaction.getAll(...tagRefs);
    const tagSnapsMap = new Map(tagSnaps.map(snap => [snap.id, snap]));

    for (const id of tagsToAddIds) {
        const tagRef = tagsCollection.doc(id);
        const tagSnap = tagSnapsMap.get(id);
        const pTag = newTagsMap.get(id)!;

        if (tagSnap && tagSnap.exists) {
            transaction.update(tagRef, { usageCount: admin.firestore.FieldValue.increment(1) });
        } else {
            const newGlobalTag: Omit<GlobalTag, 'usageCount'> & { usageCount: number } = {
                id: id,
                normalized: id,
                display: pTag.display,
                type: pTag.type,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                createdBy: currentUser.id,
                usageCount: 1,
            };
            transaction.set(tagRef, newGlobalTag);
        }
    }

    for (const id of tagsToRemoveIds) {
        const tagRef = tagsCollection.doc(id);
        const tagSnap = tagSnapsMap.get(id);

        if (tagSnap && tagSnap.exists) {
            transaction.update(tagRef, { usageCount: admin.firestore.FieldValue.increment(-1) });
        }
    }

    return newTags.map(pTag => ({
        ...pTag,
        id: normalizeTag(pTag.id),
    }));
}

// --- Project Submission and Update Actions ---

async function handleProjectSubmission(
  values: CreateProjectFormValues,
  status: ProjectStatus
): Promise<ServerActionResponse<{ projectId: string }>> {
  const validatedFields = CreateProjectSchema.safeParse(values);

  if (!validatedFields.success) {
    return { success: false, error: validatedFields.error.issues[0]?.message || 'Invalid data.' };
  }

  const { name, tagline, description, contributionNeeds, tags, team } = validatedFields.data;
  const currentUser = await getAuthenticatedUser();
  if (!currentUser) return { success: false, error: "Authentication required." };

  // Hydrate tag strings into ProjectTag objects
  const allGlobalTags = await getAllGlobalTags();
  const globalTagsMap = new Map(allGlobalTags.map(t => [t.id, t]));
  const hydratedTags: ProjectTag[] = tags.map(tagId => {
      const normalizedId = normalizeTag(tagId);
      const existingTag = globalTagsMap.get(normalizedId);
      if (existingTag) {
          return { id: existingTag.id, display: existingTag.display, type: existingTag.type };
      }
      // For new tags, the display name is the tagId itself. The type is 'custom'.
      return { id: tagId, display: tagId, type: 'custom' };
  });

  const finalTeam: ProjectMember[] = team.filter(member => member.userId && member.role) as ProjectMember[];
  const creatorIsLead = finalTeam.some(member => member.userId === currentUser.id && member.role === 'lead');

  if (!creatorIsLead) {
    finalTeam.push({ userId: currentUser.id, role: 'lead' });
  }

  let newProjectId: string | undefined;
  
  try {
    await adminDb.runTransaction(async (transaction) => {
        const newProjectRef = adminDb.collection('projects').doc();
        newProjectId = newProjectRef.id;

        const processedTags = await manageTagsForProject(transaction, hydratedTags, [], currentUser);

        const newProjectData: Omit<Project, 'id' | 'category' | 'fallbackSuggestion'> = {
            name, tagline, description, tags: processedTags,
            contributionNeeds: contributionNeeds.split(',').map(item => item.trim()),
            timeline: 'TBD', progress: 0, 
            team: finalTeam,
            votes: 0, status, 
            governance: { contributorsShare: 75, communityShare: 10, sustainabilityShare: 15 },
            startDate: new Date().toISOString(), endDate: '',
            createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
            ownerId: currentUser.id
        };
        transaction.set(newProjectRef, newProjectData);
    });

    if (!newProjectId) throw new Error("Failed to create project.");
  
    revalidatePath('/', 'layout');
    if (status === 'draft') revalidatePath('/drafts');
  
    return { success: true, data: { projectId: newProjectId } };
  } catch (error) {
      console.error("Project creation failed:", error);
      const message = error instanceof Error ? error.message : "An unexpected error occurred.";
      return { success: false, error: `Project creation failed: ${message}` };
  }
}

export async function saveProjectDraft(values: CreateProjectFormValues): Promise<ServerActionResponse<{ projectId: string }>> {
    return handleProjectSubmission(values, 'draft');
}

export async function publishProject(projectId: string): Promise<ServerActionResponse<{}>> {
    const currentUser = await getAuthenticatedUser();
    if (!currentUser) return { success: false, error: "Authentication required." };

    try {
        await adminDb.runTransaction(async (transaction) => {
            const projectRef = adminDb.collection('projects').doc(projectId);
            const projectSnap = await transaction.get(projectRef);
            if (!projectSnap.exists) throw new Error("Project not found");

            const project = projectSnap.data() as Project;
            const isLead = project.team.some(m => m.role === 'lead' && m.userId === currentUser.id);
            if (!isLead) throw new Error("Only a project lead can publish.");

            if (project.status === 'published') return; // Already published

            transaction.update(projectRef, { 
                status: 'published',
                updatedAt: new Date().toISOString(),
             });
        });

        revalidatePath('/', 'layout');
        revalidatePath(`/projects/${projectId}`);
        revalidatePath(`/drafts`);

        return { success: true, data: {} };
    } catch (error) {
        console.error("Failed to publish project:", error);
        const message = error instanceof Error ? error.message : "An unexpected error occurred.";
        return { success: false, error: `Project publication failed: ${message}` };
    }
}

export async function updateProject(values: EditProjectFormValues): Promise<ServerActionResponse<{}>> {
    const validatedFields = EditProjectSchema.safeParse(values);

    if (!validatedFields.success) {
        return { success: false, error: validatedFields.error.issues[0]?.message || 'Invalid data.' };
    }

    const { id, tags, governance, ...projectData } = validatedFields.data;
    const currentUser = await getAuthenticatedUser();
    if (!currentUser) return { success: false, error: "Authentication required." };

    try {
        // Hydrate tag strings into ProjectTag objects
        const allGlobalTags = await getAllGlobalTags();
        const globalTagsMap = new Map(allGlobalTags.map(t => [t.id, t]));
        const hydratedTags: ProjectTag[] = tags.map(tagId => {
            const normalizedId = normalizeTag(tagId);
            const existingTag = globalTagsMap.get(normalizedId);
            if (existingTag) {
                return { id: existingTag.id, display: existingTag.display, type: existingTag.type };
            }
            return { id: tagId, display: tagId, type: 'custom' };
        });

        await adminDb.runTransaction(async (transaction) => {
            const projectRef = adminDb.collection('projects').doc(id);
            const projectSnap = await transaction.get(projectRef);
            if (!projectSnap.exists) throw new Error("Project not found");

            const project = projectSnap.data() as Project;
            const isLead = project.team.some(m => m.role === 'lead' && m.userId === currentUser.id);
            if (!isLead) throw new Error("Only a project lead can edit.");

            const processedTags = await manageTagsForProject(transaction, hydratedTags, project.tags || [], currentUser);
            
            const finalGovernance: Governance = {
                contributorsShare: governance?.contributorsShare ?? 75,
                communityShare: governance?.communityShare ?? 10,
                sustainabilityShare: governance?.sustainabilityShare ?? 15,
            };

            const updatedData: Partial<Project> = {
                ...projectData,
                governance: finalGovernance,
                contributionNeeds: typeof projectData.contributionNeeds === 'string'
                    ? projectData.contributionNeeds.split(',').map(item => item.trim())
                    : project.contributionNeeds,
                tags: processedTags,
                updatedAt: new Date().toISOString(),
            };
            transaction.update(projectRef, updatedData);
        });

        revalidatePath('/', 'layout');
        revalidatePath(`/projects/${id}`);
        revalidatePath(`/projects/${id}/edit`);

        return { success: true, data: {} };
    } catch (error) {
        console.error("Failed to update project:", error);
        if (error && typeof error === 'object' && 'code' in error) { // Check for Firebase-like error
            return { success: false, error: (error as { message: string }).message };
        }
        if (error instanceof Error) {
            return { success: false, error: error.message };
        }
        return { success: false, error: "An unexpected error occurred while updating the project." };
    }
}


// --- Other Actions ---

const AddTeamMemberSchema = z.object({ projectId: z.string(), userId: z.string(), role: z.enum(["lead", "contributor", "participant"]) });

export async function joinProject(projectId: string): Promise<ServerActionResponse<HydratedProjectMember>> {
    const currentUser = await getAuthenticatedUser();
    if (!currentUser) return { success: false, error: "Authentication required." };

    const project = await findProjectById(projectId);
    if (!project) return { success: false, error: "Project not found" };

    if (project.team.some(member => member.userId === currentUser.id)) {
        const member = project.team.find(member => member.userId === currentUser.id)!;
        return { success: true, data: { ...member, user: currentUser } };
    }

    const newMember: ProjectMember = { userId: currentUser.id, role: 'participant' };
    const updatedTeam = [...project.team, newMember];
    await updateProjectInDb({ ...project, team: updatedTeam });
    
    const hydratedMember: HydratedProjectMember = { ...newMember, user: currentUser };

    revalidatePath(`/projects/${projectId}`);
    revalidatePath('/', 'layout');
    return { success: true, data: hydratedMember };
}

export async function addTeamMember(data: { projectId: string, userId: string, role: ProjectMember['role'] }): Promise<ServerActionResponse<HydratedProjectMember>> {
    const validatedFields = AddTeamMemberSchema.safeParse(data);
    if (!validatedFields.success) return { success: false, error: "Invalid data." };
    
    const { projectId, userId, role } = validatedFields.data;

    try {
        const [project, user] = await Promise.all([findProjectById(projectId), findUserById(userId)]);

        if (!project || !user) return { success: false, error: "Project or user not found" };
        if (project.team.some(member => member.userId === userId)) return { success: false, error: "User is already a member" };

        const newMember: ProjectMember = { userId: user.id, role };
        const updatedTeam = [...(project.team || []), newMember];

        await updateProjectInDb({ ...project, team: updatedTeam });
        
        await addNotificationToDb({ 
            userId: user.id, 
            message: `You have been added to the project \"${project.name}\" as a ${role}.`, 
            link: `/projects/${projectId}`, 
            read: false, 
            timestamp: new Date().toISOString() 
        });
        
        revalidatePath(`/projects/${projectId}`);
        const hydratedMember: HydratedProjectMember = { ...newMember, user };
        return { success: true, data: hydratedMember };
    } catch (error) {
        console.error("Failed to add team member:", error);
        return { success: false, error: "An unexpected error occurred." };
    }
}

const CreateTaskSchema = z.object({
  projectId: z.string(),
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  status: z.enum(['To Do', 'In Progress', 'Done']),
  assignedToId: z.string().optional(),
  estimatedHours: z.coerce.number().optional(),
});

export async function addTask(values: z.infer<typeof CreateTaskSchema>): Promise<ServerActionResponse<Task>> {
    const validatedFields = CreateTaskSchema.safeParse(values);
    if (!validatedFields.success) return { success: false, error: 'Invalid data.' };
    
    const { projectId, title, status, description, assignedToId, estimatedHours } = validatedFields.data;
    
    const currentUser = await getAuthenticatedUser();
    if (!currentUser) return { success: false, error: "Authentication required." };

    const project = await findProjectById(projectId);
    if (!project || !project.team.some(m => m.userId === currentUser.id)) {
        return { success: false, error: "Only team members can add tasks." };
    }

    const newTaskData: Omit<Task, 'id'> = {
        projectId,
        title,
        status,
        description: description || '',
        assignedToId: assignedToId || '',
        estimatedHours: estimatedHours || 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: currentUser.id,
    };

    const newTaskId = await addTaskToDb(newTaskData);
    const createdTask: Task = { ...newTaskData, id: newTaskId };

    revalidatePath(`/projects/${projectId}`);
    return { success: true, data: createdTask };
}

const UpdateTaskSchema = CreateTaskSchema.extend({ id: z.string() });

export async function updateTask(values: z.infer<typeof UpdateTaskSchema>): Promise<ServerActionResponse<Task>> {
    const validatedFields = UpdateTaskSchema.safeParse(values);
    if (!validatedFields.success) return { success: false, error: 'Invalid data.' };

    const { id, projectId, ...taskUpdateData } = validatedFields.data;
    
    const currentUser = await getAuthenticatedUser();
    if (!currentUser) return { success: false, error: "Authentication required." };

    const project = await findProjectById(projectId);
    if (!project || !project.team.some(m => m.userId === currentUser.id)) {
        return { success: false, error: "Only team members can edit tasks." };
    }

    const allTasks = await adminDb.collection('tasks').where('projectId', '==', projectId).get();
    const existingTaskDoc = allTasks.docs.find(doc => doc.id === id);

    if (!existingTaskDoc) return { success: false, error: "Task not found" };
    const existingTask = { id: existingTaskDoc.id, ...existingTaskDoc.data() } as Task;

    const updatedTask: Task = {
        ...existingTask,
        ...taskUpdateData,
        title: taskUpdateData.title ?? existingTask.title,
        status: taskUpdateData.status ?? existingTask.status,
        updatedAt: new Date().toISOString(),
    };
    await updateTaskInDb(updatedTask);
    
    revalidatePath(`/projects/${projectId}`);
    return { success: true, data: updatedTask };
}

const DeleteTaskSchema = z.object({ id: z.string(), projectId: z.string() });

export async function deleteTask(values: z.infer<typeof DeleteTaskSchema>): Promise<ServerActionResponse<{}>> {
    const validatedFields = DeleteTaskSchema.safeParse(values);
    if (!validatedFields.success) return { success: false, error: 'Invalid data.' };
  
    const { id, projectId } = validatedFields.data;
    const currentUser = await getAuthenticatedUser();
    if (!currentUser) return { success: false, error: "Authentication required." };
  
    const project = await findProjectById(projectId);
    if (!project || !project.team.some(m => m.userId === currentUser.id)) {
      return { success: false, error: "Only team members can delete tasks." };
    }
  
    await deleteTaskFromDb(id);
    revalidatePath(`/projects/${projectId}`);
    return { success: true, data: {} };
  }
  
const DiscussionCommentSchema = z.object({ projectId: z.string(), userId: z.string(), content: z.string().min(1) });

export async function addDiscussionComment(values: z.infer<typeof DiscussionCommentSchema>): Promise<ServerActionResponse<Discussion>> {
    const validatedFields = DiscussionCommentSchema.safeParse(values);
    if (!validatedFields.success) return { success: false, error: "Invalid data." };
    
    const { projectId, userId, content } = validatedFields.data;
    
    const project = await findProjectById(projectId);
    if (!project || !project.team.some(m => m.userId === userId)) {
        return { success: false, error: "Only team members can comment." };
    }
    
    const newCommentData = { projectId, userId, content, timestamp: new Date().toISOString() };
    const newCommentId = await addDiscussionCommentToDb(newCommentData);
    const newComment: Discussion = { ...newCommentData, id: newCommentId };

    revalidatePath(`/projects/${projectId}`);
    return { success: true, data: newComment };
}
