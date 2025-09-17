
'use server';

import { revalidatePath } from 'next/cache';
import * as admin from 'firebase-admin';
import { z } from 'zod';
import type { Project, ProjectStatus, ProjectTag, Tag as GlobalTag, User, ProjectMember } from '@/lib/types';
import {
    adminDb,
    addDiscussionComment as addDiscussionCommentToDb,
    addNotification as addNotificationToDb,
    addTask as addTaskToDb,
    deleteTask as deleteTaskFromDb,
    findProjectById,
    findUserById,
    getAllTasks,
    updateProject as updateProjectInDb,
    updateTask as updateTaskInDb,
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
    projectTags: ProjectTag[],
    currentUser: User
): Promise<ProjectTag[]> {
    if (!projectTags || projectTags.length === 0) return [];

    const tagsCollection = adminDb.collection('tags');

    // --- READ PHASE ---
    // First, perform all reads to check for existing tags.
    const tagReads = await Promise.all(
        projectTags.map(async (pTag) => {
            const normalizedId = normalizeTag(pTag.id);
            if (!normalizedId) return null; // Filter out invalid tags

            const tagRef = tagsCollection.doc(normalizedId);
            const tagSnap = await transaction.get(tagRef);
            return { pTag, normalizedId, tagRef, tagSnap };
        })
    );

    // --- WRITE PHASE ---
    // Now that all reads are complete, perform all writes.
    const processedProjectTags: ProjectTag[] = [];

    for (const readResult of tagReads) {
        if (!readResult) continue; // Skip any invalid tags from the read phase

        const { pTag, normalizedId, tagRef, tagSnap } = readResult;

        if (tagSnap.exists) {
            // This tag already exists in the global collection. Increment its usage count.
            transaction.update(tagRef, { usageCount: admin.firestore.FieldValue.increment(1) });
        } else {
            // This is a new tag. Create it in the global collection.
            const newGlobalTag: GlobalTag = {
                id: normalizedId,
                normalized: normalizedId,
                display: pTag.display,
                type: pTag.role, // Set the initial type based on its first use
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                createdBy: currentUser.id,
                usageCount: 1,
            };
            transaction.set(tagRef, newGlobalTag);
        }

        // Add the processed tag to the list that will be stored in the project document.
        processedProjectTags.push({ id: normalizedId, display: pTag.display, role: pTag.role });
    }

    return processedProjectTags;
}

async function hydrateTeamMembers(team: ProjectMember[]): Promise<ProjectMember[]> {
    console.log('hydrating team members')
    const userIdsToFetch = team.filter(m => !m.user).map(m => m.userId);
    if (userIdsToFetch.length === 0) return team;

    const userPromises = userIdsToFetch.map(findUserById);
    const users = await Promise.all(userPromises);
    const userMap = new Map(users.filter(Boolean).map(u => [u!.id, u]));

    return team.map(member => {
        console.log('returning hydrated team member')
        if (member.user) return member;
        const user = userMap.get(member.userId);
        return user ? { ...member, user } : member;
    });
}


// --- Project Submission and Update Actions ---

async function handleProjectSubmission(
  values: CreateProjectFormValues,
  status: ProjectStatus
): Promise<{ success: boolean; error?: string; projectId?: string; }> {
  const validatedFields = CreateProjectSchema.safeParse(values);

  if (!validatedFields.success) {
    return { success: false, error: validatedFields.error.issues[0]?.message || 'Invalid data.' };
  }

  const { name, tagline, description, contributionNeeds, tags } = validatedFields.data;
  const currentUser = await getAuthenticatedUser();
  if (!currentUser) return { success: false, error: "Authentication required." };

  let newProjectId: string | undefined;
  console.log('new project got an ID')
  
  try {
    await adminDb.runTransaction(async (transaction) => {
        const newProjectRef = adminDb.collection('projects').doc();
        newProjectId = newProjectRef.id;
        const processedTags = await manageTagsForProject(transaction, tags, currentUser);

        const newProjectData: Omit<Project, 'id'> = {
            name, tagline, description, tags: processedTags,
            contributionNeeds: contributionNeeds.split(',').map(item => item.trim()),
            timeline: 'TBD', progress: 0, 
            team: [{ userId: currentUser.id, role: 'lead' }],
            votes: 0, status, 
            governance: { contributorsShare: 75, communityShare: 10, sustainabilityShare: 15 },
            startDate: new Date().toISOString(), endDate: '',
            createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
        };
        transaction.set(newProjectRef, newProjectData);
    });

    if (!newProjectId) throw new Error("Failed to create project.");
  
    revalidatePath('/', 'layout');
    if (status === 'draft') revalidatePath('/drafts');
  
    return { success: true, projectId: newProjectId };
  } catch (error) {
      console.error("Project creation failed:", error);
      return { success: false, error: "An unexpected error occurred while creating the project." };
  }
}

export async function saveProjectDraft(values: CreateProjectFormValues) {
    return handleProjectSubmission(values, 'draft');
}

export async function publishProject(values: CreateProjectFormValues) {
    return handleProjectSubmission(values, 'published');
}

export async function updateProject(values: EditProjectFormValues): Promise<{ success: boolean; error?: string; }> {
    const validatedFields = EditProjectSchema.safeParse(values);

    if (!validatedFields.success) {
        console.error("Project update validation failed:", validatedFields.error.issues);
        return { success: false, error: validatedFields.error.issues[0]?.message || 'Invalid data.' };
    }

    const { id, tags, governance, ...projectData } = validatedFields.data;
    const currentUser = await getAuthenticatedUser();
    if (!currentUser) return { success: false, error: "Authentication required." };

    try {
        await adminDb.runTransaction(async (transaction) => {
            const projectRef = adminDb.collection('projects').doc(id);
            const projectSnap = await transaction.get(projectRef);
            if (!projectSnap.exists) throw new Error("Project not found");

            const project = projectSnap.data() as Project;
            const lead = project.team.find(m => m.role === 'lead');
            if (!lead || lead.userId !== currentUser.id) throw new Error("Only the project lead can edit.");

            const processedTags = await manageTagsForProject(transaction, tags, currentUser);
            
            const updatedData: Partial<Project> = {
                ...projectData,
                governance, // Explicitly include the validated governance object
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

        return { success: true };
    } catch (error: any) {
        console.error("Failed to update project:", error);
        return { success: false, error: error.message || "An unexpected error occurred while updating the project." };
    }
}


// --- Other Actions ---

const TaskSchema = z.object({
    id: z.string(), projectId: z.string(), title: z.string().min(1), description: z.string().optional(),
    status: z.enum(['To Do', 'In Progress', 'Done']), assignedToId: z.string().optional(), estimatedHours: z.coerce.number().optional(),
});
const CreateTaskSchema = TaskSchema.omit({ id: true });
const DeleteTaskSchema = z.object({ id: z.string(), projectId: z.string() });
const DiscussionCommentSchema = z.object({ projectId: z.string(), userId: z.string(), content: z.string().min(1) });
const AddTeamMemberSchema = z.object({ projectId: z.string(), userId: z.string(), role: z.enum(['participant', 'lead']) });

export async function joinProject(projectId: string) {
    const currentUser = await getAuthenticatedUser();
    if (!currentUser) throw new Error("Authentication required.");

    const project = await findProjectById(projectId);
    if (!project) return { success: false, error: "Project not found" };

    if (project.team.some(member => member.userId === currentUser.id)) return { success: true };

    const updatedTeam = [...project.team, { userId: currentUser.id, role: 'participant' as const }];
    await updateProjectInDb({ ...project, team: updatedTeam });

    revalidatePath(`/projects/${projectId}`);
    revalidatePath('/', 'layout');
    return { success: true };
}

export async function addTeamMember(values: z.infer<typeof AddTeamMemberSchema>) {
    const validatedFields = AddTeamMemberSchema.safeParse(values);
    if (!validatedFields.success) return { success: false, error: "Invalid data." };
    
    const { projectId, userId, role } = validatedFields.data;
    const project = await findProjectById(projectId);
    if (!project) return { success: false, error: "Project not found" };

    if (project.team.some(member => member.userId === userId)) return { success: false, error: "User is already a member" };
    
    const userToAdd = await findUserById(userId);
    if (!userToAdd) return { success: false, error: "User to add not found" };

    const updatedTeam = [...project.team, { userId: userToAdd.id, role }];
    await updateProjectInDb({ ...project, team: updatedTeam });
    
    await addNotificationToDb({ 
        userId: userToAdd.id, 
        message: `You have been added to the project \"${project.name}\".`, 
        link: `/projects/${projectId}`, 
        read: false, 
        timestamp: new Date().toISOString() 
    });
    
    revalidatePath(`/projects/${projectId}`);
    return { success: true };
}

export async function addTask(values: z.infer<typeof CreateTaskSchema>) {
    const validatedFields = CreateTaskSchema.safeParse(values);
    if (!validatedFields.success) return { success: false, error: 'Invalid data.' };
    const { projectId } = validatedFields.data;
    const currentUser = await getAuthenticatedUser();
    if (!currentUser) return { success: false, error: "Authentication required." };

    const project = await findProjectById(projectId);
    if (!project || !project.team.some(m => m.userId === currentUser.id)) {
        return { success: false, error: "Only team members can add tasks." };
    }

    await addTaskToDb({ ...validatedFields.data, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    revalidatePath(`/projects/${projectId}`);
    return { success: true };
}

export async function updateTask(values: z.infer<typeof TaskSchema>) {
    const validatedFields = TaskSchema.safeParse(values);
    if (!validatedFields.success) return { success: false, error: 'Invalid data.' };
    const { id, projectId } = validatedFields.data;
    const currentUser = await getAuthenticatedUser();
    if (!currentUser) return { success: false, error: "Authentication required." };

    const project = await findProjectById(projectId);
    if (!project || !project.team.some(m => m.userId === currentUser.id)) {
        return { success: false, error: "Only team members can edit tasks." };
    }
    const existingTask = (await getAllTasks()).find(t => t.id === id);
    if (!existingTask) return { success: false, error: "Task not found" };

    await updateTaskInDb({ ...existingTask, ...validatedFields.data, updatedAt: new Date().toISOString() });
    revalidatePath(`/projects/${projectId}`);
    return { success: true };
}

export async function deleteTask(values: z.infer<typeof DeleteTaskSchema>) {
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
    return { success: true };
}

export async function addDiscussionComment(values: z.infer<typeof DiscussionCommentSchema>) {
    const validatedFields = DiscussionCommentSchema.safeParse(values);
    if (!validatedFields.success) return { success: false, error: "Invalid data." };
    const { projectId, userId } = validatedFields.data;
    const project = await findProjectById(projectId);
    if (!project || !project.team.some(m => m.userId === userId)) {
        return { success: false, error: "Only team members can comment." };
    }
    await addDiscussionCommentToDb({ ...validatedFields.data, timestamp: new Date().toISOString() });
    revalidatePath(`/projects/${projectId}`);
    return { success: true };
}
