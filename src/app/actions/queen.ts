'use server';

import { adminDb } from '@/lib/firebase.server';
import { getAuthenticatedUser } from '@/lib/session.server';
import { ContributorProfile, QueenAction, ActivityType } from '@/lib/types';
import { FieldValue } from 'firebase-admin/firestore';

export async function submitOnboardingAction(
    projectId: string, 
    profileData: Partial<ContributorProfile>, 
    queenActionsData: Partial<QueenAction>[]
): Promise<{ success: boolean; error?: string }> {
    try {
        const currentUser = await getAuthenticatedUser();
        if (!currentUser) return { success: false, error: 'Not authenticated' };

        const batch = adminDb.batch();

        // 1. Save ContributorProfile
        const profileRef = adminDb.collection('projects').doc(projectId).collection('contributor_profiles').doc(currentUser.id);
        const profile: ContributorProfile = {
            id: currentUser.id,
            projectId,
            userId: currentUser.id,
            goals: profileData.goals || '',
            skills: profileData.skills || [],
            hoursPerWeek: profileData.hoursPerWeek || 0,
            contributionStyle: profileData.contributionStyle || '',
            rawOnboardingJson: profileData.rawOnboardingJson || {},
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        batch.set(profileRef, profile);

        // 2. Save Pending Queen Actions
        const actionsCollectionRef = adminDb.collection('projects').doc(projectId).collection('queen_actions');
        for (const actionData of queenActionsData) {
            const actionRef = actionsCollectionRef.doc();
            const action: QueenAction = {
                id: actionRef.id,
                projectId,
                type: actionData.type || 'task_recommendation',
                status: 'pending_approval',
                payload: actionData.payload || {},
                proposedAt: new Date().toISOString(),
            };
            batch.set(actionRef, action);

            // Log activity for the proposed action
            const activityRef = adminDb.collection('activity').doc();
            batch.set(activityRef, {
                type: ActivityType.QueenActionProposed,
                actorId: currentUser.id, // Or 'queen' if we had a system user, but currentUser initiated it
                timestamp: FieldValue.serverTimestamp(),
                projectId,
                context: {
                    queenActionId: actionRef.id,
                    queenActionType: action.type
                }
            });
        }

        // Add user to project team if not already (assuming they are joining as participant)
        const projectRef = adminDb.collection('projects').doc(projectId);
        const projectDoc = await projectRef.get();
        if (projectDoc.exists) {
            const projectData = projectDoc.data();
            const team = projectData?.team || [];
            if (!team.some((m: any) => m.userId === currentUser.id)) {
                team.push({
                    userId: currentUser.id,
                    role: 'participant',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                });
                batch.update(projectRef, { team });
            }
        }

        await batch.commit();

        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function getPendingQueenActionsAction(projectId: string): Promise<{ success: boolean; data?: QueenAction[]; error?: string }> {
    try {
        const currentUser = await getAuthenticatedUser();
        if (!currentUser) return { success: false, error: 'Not authenticated' };

        const snapshot = await adminDb.collection('projects').doc(projectId).collection('queen_actions')
            .where('status', '==', 'pending_approval')
            .get();

        const actions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as QueenAction));
        
        // Sort in memory to avoid requiring a composite Firestore index during dev
        actions.sort((a, b) => {
            const getTime = (date: any) => date?.toDate ? date.toDate().getTime() : new Date(date).getTime();
            return getTime(b.proposedAt) - getTime(a.proposedAt);
        });
        
        return { success: true, data: actions };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function approveQueenAction(projectId: string, actionId: string): Promise<{ success: boolean; error?: string }> {
    try {
        const currentUser = await getAuthenticatedUser();
        if (!currentUser) return { success: false, error: 'Not authenticated' };

        const batch = adminDb.batch();
        const actionRef = adminDb.collection('projects').doc(projectId).collection('queen_actions').doc(actionId);
        
        const actionDoc = await actionRef.get();
        if (!actionDoc.exists) return { success: false, error: 'Action not found' };
        
        const actionData = actionDoc.data() as QueenAction;
        
        // 1. Mark as approved
        batch.update(actionRef, { 
            status: 'approved',
            reviewedAt: new Date().toISOString(),
            reviewedBy: currentUser.id
        });

        // 2. Execute side effect (create task)
        if (actionData.type === 'task_recommendation' && actionData.payload) {
            const taskRef = adminDb.collection('projects').doc(projectId).collection('tasks').doc();
            batch.set(taskRef, {
                id: taskRef.id,
                projectId,
                title: actionData.payload.title || 'Untitled AI Task',
                description: actionData.payload.description || '',
                status: 'To Do',
                createdBy: 'queen', // Mark it as created by AI
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                columnId: 'todo', // Assuming default columns
            });
            
            // Log activity
            const activityRef = adminDb.collection('activity').doc();
            batch.set(activityRef, {
                type: ActivityType.TaskCreated,
                actorId: currentUser.id,
                timestamp: FieldValue.serverTimestamp(),
                projectId,
                context: {
                    taskId: taskRef.id,
                    taskTitle: actionData.payload.title
                }
            });
        }

        await batch.commit();
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function rejectQueenAction(projectId: string, actionId: string): Promise<{ success: boolean; error?: string }> {
    try {
        const currentUser = await getAuthenticatedUser();
        if (!currentUser) return { success: false, error: 'Not authenticated' };

        const actionRef = adminDb.collection('projects').doc(projectId).collection('queen_actions').doc(actionId);
        await actionRef.update({
            status: 'rejected',
            reviewedAt: new Date().toISOString(),
            reviewedBy: currentUser.id
        });

        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
