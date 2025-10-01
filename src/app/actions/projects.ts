
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
    newTags: ProjectTag[],       // Tags from the form
    currentTags: ProjectTag[],   // Tags currently on the project
    currentUser: User
): Promise<ProjectTag[]> {
    const tagsCollection = adminDb.collection('tags');

    const newTagsMap = new Map(newTags.map(t => [normalizeTag(t.id), t]));
    const currentTagsMap = new Map(currentTags.map(t => [normalizeTag(t.id), t]));

    const tagsToAddIds = [...newTagsMap.keys()].filter(id => !currentTagsMap.has(id));
    const tagsToRemoveIds = [...currentTagsMap.keys()].filter(id => !newTagsMap.has(id));

    // --- READ PHASE ---
    // Fetch all relevant tag documents from the global collection at once to respect transaction rules.
    const allRelevantTagIds = [...new Set([...tagsToAddIds, ...tagsToRemoveIds])].filter(Boolean);
    if (allRelevantTagIds.length === 0) {
        // If no tags were added or removed, just return the normalized new tags.
        return newTags.map(pTag => ({ ...pTag, id: normalizeTag(pTag.id) }));
    }
    
    const tagRefs = allRelevantTagIds.map(id => tagsCollection.doc(id));
    const tagSnaps = await transaction.getAll(...tagRefs);
    const tagSnapsMap = new Map(tagSnaps.map(snap => [snap.id, snap]));

    // --- WRITE PHASE ---
    // Now that all reads are complete, perform all writes.

    // Process tags to add
    for (const id of tagsToAddIds) {
        const tagRef = tagsCollection.doc(id);
        const tagSnap = tagSnapsMap.get(id);
        const pTag = newTagsMap.get(id)!; // It must exist in the map

        if (tagSnap && tagSnap.exists) {
            // Tag exists, increment usage count.
            transaction.update(tagRef, { usageCount: admin.firestore.FieldValue.increment(1) });
        } else {
            // This is a new tag. Create it in the global collection.
            const newGlobalTag: GlobalTag = {
                id: id,
                normalized: id,
                display: pTag.display,
                type: pTag.role, // Set the initial type based on its first use
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                createdBy: currentUser.id,
                usageCount: 1,
            };
            transaction.set(tagRef, newGlobalTag);
        }
    }

    // Process tags to remove
    for (const id of tagsToRemoveIds) {
        const tagRef = tagsCollection.doc(id);
        const tagSnap = tagSnapsMap.get(id);

        if (tagSnap && tagSnap.exists) {
            // Tag exists, decrement usage count. This is safe in a transaction.
            transaction.update(tagRef, { usageCount: admin.firestore.FieldValue.increment(-1) });
        }
    }

    // Return the final list of tags to be stored on the project document.
    const processedProjectTags = newTags.map(pTag => ({
        ...pTag,
        id: normalizeTag(pTag.id),
    }));

    return processedProjectTags;
}

async function hydrateTeamMembers(team: ProjectMember[]): Promise<ProjectMember[]> {
    const userIdsToFetch = team.filter(m => !m.user).map(m => m.userId);
    if (userIdsToFetch.length === 0) return team;

    const userPromises = userIdsToFetch.map(findUserById);
    const users = await Promise.all(userPromises);
    const userMap = new Map(users.filter(Boolean).map(u => [u!.id, u]));

    return team.map(member => {
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

  const { name, tagline, description, contributionNeeds, tags, team } = validatedFields.data;
  const currentUser = await getAuthenticatedUser();
  if (!currentUser) return { success: false, error: "Authentication required." };

  const finalTeam = [...(team || [])];
  const creatorIsLead = finalTeam.some(member => member.userId === currentUser.id && member.role === 'lead');

  if (!creatorIsLead) {
    const withoutCreator = finalTeam.filter(member => member.userId !== currentUser.id);
    finalTeam.push({ userId: currentUser.id, role: 'lead' });
  }

  let newProjectId: string | undefined;
  
  try {
    await adminDb.runTransaction(async (transaction) => {
        const newProjectRef = adminDb.collection('projects').doc();
        newProjectId = newProjectRef.id;
        const processedTags = await manageTagsForProject(transaction, tags, [], currentUser);

        const newProjectData: Omit<Project, 'id'> = {
            name, tagline, description, tags: processedTags,
            contributionNeeds: contributionNeeds.split(',').map(item => item.trim()),
            timeline: 'TBD', progress: 0, 
            team: finalTeam,
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
            const isLead = project.team.some(m => m.role === 'lead' && m.userId === currentUser.id);
            if (!isLead) throw new Error("Only a project lead can edit.");

            const processedTags = await manageTagsForProject(transaction, tags, project.tags || [], currentUser);
            
            const updatedData: Partial<Project> = {
                ...projectData,
                governance,
                contributionNeeds: typeof projectData.contributionNeeds === 'string'
                    ? projectData.contributionNeeds.split(',').map(item => item.trim())
                    : project.contributionNeeds,
                tags: processedTags,
                team: project.team, // --- FIX: Preserve existing team members ---
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
const AddTeamMemberSchema = z.object({ projectId: z.string(), userId: z.string() });

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
    
    const { projectId, userId } = validatedFields.data;

    try {
        const project = await findProjectById(projectId);
        const user = await findUserById(userId);

        if (!project || !user) {
            return { success: false, error: "Project or user not found" };
        }
        
        if (project.team.some(member => member.userId === userId)) {
            return { success: false, error: "User is already a member" };
        }

        const requiredBadgesSnapshot = await adminDb.collection('projectBadgeLinks').where('projectId', '==', projectId).where('isRequirement', '==', true).get();
        const requiredBadgeIds = requiredBadgesSnapshot.docs.map(doc => doc.data().badgeId);

        const userBadgesSnapshot = await adminDb.collection('userBadges').where('userId', '==', userId).get();
        const userBadgeIds = new Set(userBadgesSnapshot.docs.map(doc => doc.data().badgeId));

        const hasAllRequiredBadges = requiredBadgeIds.every(badgeId => userBadgeIds.has(badgeId));
        const role = hasAllRequiredBadges ? 'contributor' : 'participant';

        const updatedTeam = [...(project.team || []), { userId: user.id, role }];

        await updateProjectInDb({ ...project, team: updatedTeam });
        
        await addNotificationToDb({ 
            userId: user.id, 
            message: `You have been added to the project "${project.name}" as a ${role}.`, 
            link: `/projects/${projectId}`, 
            read: false, 
            timestamp: new Date().toISOString() 
        });
        
        revalidatePath(`/projects/${projectId}`);
        return { success: true };
    } catch (error) {
        console.error("Failed to add team member:", error);
        return { success: false, error: "An unexpected error occurred." };
    }
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
