'use server';

import { revalidatePath } from 'next/cache';
import * as admin from 'firebase-admin';
import { z } from 'zod';
import type {
  Project,
  ProjectTag,
  Tag as GlobalTag,
  User,
  ServerActionResponse,
  Discussion,
  Task,
  HydratedProjectMember,
  ProjectMember,
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
  getAllTags as getAllGlobalTags,
} from '@/lib/data.server';
import { getAuthenticatedUser } from '@/lib/session.server';
import {
  CreateProjectSchema,
  EditProjectSchema,
  CreateProjectFormValues,
  EditProjectFormValues,
} from '@/lib/schemas';
import { toHydratedProject } from '@/lib/utils';

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
): Promise<void> {
  const tagsCollection = adminDb.collection('tags');
  const newTagIds = newTags.map((t) => normalizeTag(t.id));
  const currentTagIds = currentTags.map((t) => normalizeTag(t.id));

  const tagsToAddIds = newTagIds.filter((id) => !currentTagIds.includes(id));
  const tagsToRemoveIds = currentTagIds.filter((id) => !newTagIds.includes(id));

  const allRelevantIds = [...new Set([...tagsToAddIds, ...tagsToRemoveIds])];
  if (allRelevantIds.length === 0) return;

  const tagRefs = allRelevantIds.map((id) => tagsCollection.doc(id));
  const tagSnaps = await transaction.getAll(...tagRefs);
  const tagSnapsMap = new Map(tagSnaps.map((snap) => [snap.id, snap]));

  for (const id of tagsToAddIds) {
    const tagRef = tagsCollection.doc(id);
    const tagSnap = tagSnapsMap.get(id);
    const pTag = newTags.find((t) => normalizeTag(t.id) === id)!;

    if (tagSnap && tagSnap.exists) {
      transaction.update(tagRef, { usageCount: admin.firestore.FieldValue.increment(1) });
    } else {
      const newGlobalTag: Omit<GlobalTag, 'usageCount'> & { usageCount: number } = {
        id,
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
}

// --- Project Submission and Update Actions ---
export async function handleProjectSubmission(values: CreateProjectFormValues, status: 'draft' | 'published') {
  const validatedFields = CreateProjectSchema.safeParse(values);
  if (!validatedFields.success) {
    return { success: false, error: validatedFields.error.issues[0]?.message || 'Invalid data.' };
  }

  const { name, tagline, description, contributionNeeds, tags, team } = validatedFields.data;
  const currentUser = await getAuthenticatedUser();
  if (!currentUser) return { success: false, error: 'Authentication required.' };

  const allGlobalTags = await getAllGlobalTags();
  const globalTagsMap = new Map(allGlobalTags.map((t) => [t.id, t]));

  const hydratedTags: ProjectTag[] = tags.map(tag => {
    const normalizedId = normalizeTag(tag.id);
    const globalTag = globalTagsMap.get(normalizedId);
    if (globalTag) {
        return {
            id: globalTag.id,
            display: globalTag.display,
            type: ['category', 'relational', 'custom'].includes(globalTag.type) ? globalTag.type : 'custom',
        };
    }
    return {
        id: normalizedId,
        display: tag.display,
        type: ['category', 'relational', 'custom'].includes(tag.type) ? tag.type : 'custom',
    };
  });

  const finalTeam: ProjectMember[] = team.filter((m): m is ProjectMember => m.userId !== undefined && m.role !== undefined);
  if (!finalTeam.some((m) => m.userId === currentUser.id)) {
    finalTeam.push({ userId: currentUser.id, role: 'lead' });
  }

  let newProjectId: string | undefined;

  try {
    await adminDb.runTransaction(async (transaction) => {
      const newProjectRef = adminDb.collection('projects').doc();
      newProjectId = newProjectRef.id;

      await manageTagsForProject(transaction, hydratedTags, [], currentUser);

      const newProjectData: Omit<Project, 'id' | 'fallbackSuggestion'> = {
        name,
        startDate: admin.firestore.Timestamp.fromDate(new Date()),
        endDate: admin.firestore.Timestamp.fromDate(new Date()),
        tagline,
        description,
        tags: hydratedTags.map((t) => ({ ...t, id: normalizeTag(t.id) })),
        contributionNeeds: contributionNeeds.split(',').map((i) => i.trim()),
        progress: 0,
        team: finalTeam,
        status,
        governance: { contributorsShare: 75, communityShare: 10, sustainabilityShare: 15 },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ownerId: currentUser.id,
      };
      transaction.set(newProjectRef, newProjectData);
    });

    if (!newProjectId) throw new Error('Failed to create project.');

    revalidatePath('/', 'layout');
    if (status === 'draft') revalidatePath('/drafts');

    return { success: true, data: { projectId: newProjectId } };
  } catch (error) {
    console.error('Project creation failed:', error);
    const message = error instanceof Error ? error.message : 'An unexpected error occurred.';
    return { success: false, error: `Project creation failed: ${message}` };
  }
}

export async function saveProjectDraft(values: CreateProjectFormValues) {
  return handleProjectSubmission(values, 'draft');
}

export async function publishProject(projectId: string) {
  const currentUser = await getAuthenticatedUser();
  if (!currentUser) return { success: false, error: 'Authentication required.' };

  try {
    await adminDb.runTransaction(async (transaction) => {
      const projectRef = adminDb.collection('projects').doc(projectId);
      const projectSnap = await transaction.get(projectRef);
      if (!projectSnap.exists) throw new Error('Project not found');

      const project = projectSnap.data() as Project;
      const isLead = project.team.some((m) => m.role === 'lead' && m.userId === currentUser.id);
      if (!isLead) throw new Error('Only a project lead can publish.');

      if (project.status === 'published') return;

      transaction.update(projectRef, { status: 'published', updatedAt: new Date().toISOString() });
    });

    revalidatePath('/', 'layout');
    revalidatePath(`/projects/${projectId}`);
    revalidatePath('/drafts');

    return { success: true, data: {} };
  } catch (error) {
    console.error('Failed to publish project:', error);
    const message = error instanceof Error ? error.message : 'An unexpected error occurred.';
    return { success: false, error: `Project publication failed: ${message}` };
  }
}

export async function updateProject(values: EditProjectFormValues) {
  const validatedFields = EditProjectSchema.safeParse(values);
  if (!validatedFields.success) {
    return { success: false, error: validatedFields.error.issues[0]?.message || 'Invalid data.' };
  }

  const { id, tags, governance, ...projectData } = validatedFields.data;
  const currentUser = await getAuthenticatedUser();
  if (!currentUser) return { success: false, error: 'Authentication required.' };

  try {
    const allGlobalTags = await getAllGlobalTags();
    const globalTagsMap = new Map(allGlobalTags.map((t) => [t.id, t]));

    const hydratedTags: ProjectTag[] = tags.map(tag => {
        const normalizedId = normalizeTag(tag.id);
        const globalTag = globalTagsMap.get(normalizedId);
        if (globalTag) {
            return {
                id: globalTag.id,
                display: globalTag.display,
                type: ['category', 'relational', 'custom'].includes(globalTag.type) ? globalTag.type : 'custom',
            };
        }
        return {
            id: normalizedId,
            display: tag.display,
            type: ['category', 'relational', 'custom'].includes(tag.type) ? tag.type : 'custom',
        };
    });

    await adminDb.runTransaction(async (transaction) => {
      const projectRef = adminDb.collection('projects').doc(id);
      const projectSnap = await transaction.get(projectRef);
      if (!projectSnap.exists) throw new Error('Project not found');

      const project = projectSnap.data() as Project;
      const isLead = project.team.some((m) => m.role === 'lead' && m.userId === currentUser.id);
      if (!isLead) throw new Error('Only a project lead can edit.');

      await manageTagsForProject(transaction, hydratedTags, project.tags || [], currentUser);

      const finalGovernance: Project['governance'] = {
        contributorsShare: governance?.contributorsShare ?? 75,
        communityShare: governance?.communityShare ?? 10,
        sustainabilityShare: governance?.sustainabilityShare ?? 15,
      };

      const updatedData: Partial<Project> = {
        ...projectData,
        governance: finalGovernance,
        ...(projectData.team !== undefined && {
          team: projectData.team.filter((m): m is ProjectMember => m.userId !== undefined && m.role !== undefined),
        }),
        contributionNeeds:
          typeof projectData.contributionNeeds === 'string'
            ? projectData.contributionNeeds.split(',').map((i) => i.trim())
            : project.contributionNeeds,
        tags: hydratedTags.map((t) => ({ ...t, id: normalizeTag(t.id) })),
        updatedAt: new Date().toISOString(),
      };
      transaction.update(projectRef, updatedData);
    });

    revalidatePath('/', 'layout');
    revalidatePath(`/projects/${id}`);
    revalidatePath(`/projects/${id}/edit`);

    return { success: true, data: {} };
  } catch (error) {
    console.error('Failed to update project:', error);
    if (error instanceof Error) return { success: false, error: error.message };
    return { success: false, error: 'An unexpected error occurred while updating the project.' };
  }
}

// --- Project Interaction Actions ---

export async function joinProject(projectId: string): Promise<ServerActionResponse<HydratedProjectMember>> {
  const currentUser = await getAuthenticatedUser();
  if (!currentUser) return { success: false, error: 'Authentication required.' };

  try {
    const project = await findProjectById(projectId);
    if (!project) return { success: false, error: 'Project not found.' };

    const isAlreadyMember = project.team.some(member => member.userId === currentUser.id);
    if (isAlreadyMember) return { success: false, error: 'User is already a member of this project.' };

    const newMember: ProjectMember = { userId: currentUser.id, role: 'participant' };
    project.team.push(newMember);

    await updateProjectInDb({ ...project, team: project.team });

    revalidatePath(`/projects/${projectId}`);
    const hydratedMember: HydratedProjectMember = { ...newMember, user: currentUser };
    return { success: true, data: hydratedMember };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'An unexpected error occurred.';
    return { success: false, error: message };
  }
}

export async function addTeamMember(data: { projectId: string; userId: string; role: ProjectMember['role'] }): Promise<ServerActionResponse<HydratedProjectMember>> {
    const { projectId, userId, role } = data;
    const currentUser = await getAuthenticatedUser();
    if (!currentUser) return { success: false, error: 'Authentication required.' };

    try {
        const project = await findProjectById(projectId);
        if (!project) return { success: false, error: 'Project not found.' };

        const isLead = project.team.some(member => member.userId === currentUser.id && member.role === 'lead');
        if (!isLead) return { success: false, error: 'Only project leads can add team members.' };

        const isAlreadyMember = project.team.some(member => member.userId === userId);
        if (isAlreadyMember) return { success: false, error: 'User is already a member of this project.' };

        const newMember: ProjectMember = { userId, role };
        const user = await findUserById(userId);
        if (!user) return { success: false, error: 'User to be added not found.' };

        project.team.push(newMember);
        await updateProjectInDb({ ...project, team: project.team });

        await addNotificationToDb({
            userId,
            message: `You have been added to the project '${project.name}' as a ${role}.`,
            link: `/projects/${projectId}`,
            read: false,
            timestamp: new Date().toISOString(),
        });

        revalidatePath(`/projects/${projectId}`);
        const hydratedMember: HydratedProjectMember = { ...newMember, user };
        return { success: true, data: hydratedMember };
    } catch (error) {
        const message = error instanceof Error ? error.message : 'An unexpected error occurred.';
        return { success: false, error: message };
    }
}

export async function addDiscussionComment(data: { projectId: string; content: string }): Promise<ServerActionResponse<Discussion>> {
    const { projectId, content } = data;
    const currentUser = await getAuthenticatedUser();
    if (!currentUser) return { success: false, error: 'Authentication required' };

    try {
        const newComment = await addDiscussionCommentToDb({ 
            projectId,
            timestamp: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            userId: currentUser.id, 
            content 
        });

        const project = await findProjectById(projectId);
        const projectLeads = project?.team.filter(m => m.role === 'lead') || [];
        for (const lead of projectLeads) {
            if (lead.userId !== currentUser.id) {
                await addNotificationToDb({
                    userId: lead.userId,
                    message: `${currentUser.name} commented on your project: ${project?.name}`,
                    link: `/projects/${projectId}?tab=discussion`,
                    read: false,
                    timestamp: new Date().toISOString(),
                });
            }
        }

        revalidatePath(`/projects/${projectId}`);
        return { success: true, data: newComment };
    } catch (error) {
        const message = error instanceof Error ? error.message : 'An unexpected error occurred';
        return { success: false, error: message };
    }
}


export async function addTask(data: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Promise<ServerActionResponse<Task>> {
    const currentUser = await getAuthenticatedUser();
    if (!currentUser) return { success: false, error: 'Authentication required.' };

    try {
        const project = await findProjectById(data.projectId);
        if (!project) return { success: false, error: 'Project not found.' };

        const isLead = project.team.some(member => member.userId === currentUser.id && member.role === 'lead');
        if (!isLead) return { success: false, error: 'Only project leads can add tasks.' };
        
        const newTask = await addTaskToDb({
            ...data,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        });
        revalidatePath(`/projects/${data.projectId}`);
        return { success: true, data: newTask };
    } catch (error) {
        const message = error instanceof Error ? error.message : 'An unexpected error occurred.';
        return { success: false, error: message };
    }
}

export async function updateTask(data: Task): Promise<ServerActionResponse<Task>> {
    const currentUser = await getAuthenticatedUser();
    if (!currentUser) return { success: false, error: 'Authentication required.' };

    try {
        const project = await findProjectById(data.projectId);
        if (!project) return { success: false, error: 'Project not found.' };

        const isLead = project.team.some(member => member.userId === currentUser.id && member.role === 'lead');
        if (!isLead) return { success: false, error: 'Only project leads can update tasks.' };

        const updatedTask = await updateTaskInDb(data);
        revalidatePath(`/projects/${data.projectId}`);
        return { success: true, data: updatedTask };
    } catch (error) {
        const message = error instanceof Error ? error.message : 'An unexpected error occurred.';
        return { success: false, error: message };
    }
}

export async function deleteTask(data: { id: string; projectId: string }): Promise<ServerActionResponse<{}>> {
    const currentUser = await getAuthenticatedUser();
    if (!currentUser) return { success: false, error: 'Authentication required.' };

    try {
        const project = await findProjectById(data.projectId);
        if (!project) return { success: false, error: 'Project not found.' };

        const isLead = project.team.some(member => member.userId === currentUser.id && member.role === 'lead');
        if (!isLead) return { success: false, error: 'Only project leads can delete tasks.' };

        await deleteTaskFromDb(data.id);
        revalidatePath(`/projects/${data.projectId}`);
        return { success: true, data: {} };
    } catch (error) {
        const message = error instanceof Error ? error.message : 'An unexpected error occurred.';
        return { success: false, error: message };
    }
}
