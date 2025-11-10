'use server';

import { adminDb, findProjectById } from '@/lib/data.server';
import { FieldValue } from 'firebase-admin/firestore';
import type { Activity, Project } from '@/lib/types';
import { getAuthenticatedUser } from '@/lib/session.server';

interface LogActivityParams {
    projectId?: string;
    actorId: string;
    type: 'project_created' | 'project_updated' | 'task_created' | 'task_updated' | 'task_deleted' | 'discussion_created' | 'user_joined' | 'user_left';
    metadata?: Record<string, any>;
}

async function fanOutActivity(activityData: Activity, project?: Project) {
    const userIdsToUpdate = new Set<string>();
    
    // Always add the actor to the list of users to be notified
    userIdsToUpdate.add(activityData.actorId);

    // If there is a project associated with the activity, add all project members
    if (project) {
        if (project.ownerId) {
            userIdsToUpdate.add(project.ownerId);
        }
        project.team.forEach(member => {
            userIdsToUpdate.add(member.userId);
        });
    }

    const batch = adminDb.batch();
    userIdsToUpdate.forEach(userId => {
        const userFeedRef = adminDb.collection('users').doc(userId).collection('feed').doc(activityData.id);
        batch.set(userFeedRef, activityData);
    });

    await batch.commit();
}

export async function logActivity(params: LogActivityParams) {
    const { projectId, actorId, type, metadata } = params;
    const user = await getAuthenticatedUser();
    
    if (!user || user.id !== actorId) {
        console.error('[AUTH_ACTION_TRACE] Unauthorized attempt to log activity');
        throw new Error('You must be logged in to perform this action');
    }

    try {
        const activityRef = adminDb.collection('activity').doc();
        const activityData: Activity = {
            id: activityRef.id,
            projectId: projectId ?? null,
            actorId,
            type,
            metadata: metadata ?? {},
            timestamp: FieldValue.serverTimestamp(),
        };

        // First, write to the global activity log
        await activityRef.set(activityData);

        // Then, fan out the activity to all relevant users' feeds
        let project: Project | undefined;
        if (projectId) {
            const hydratedProject = await findProjectById(projectId);
            // The fan out needs the raw project, not the hydrated one
            if (hydratedProject) {
                project = {
                    ...hydratedProject,
                    ownerId: hydratedProject.owner?.id ?? null,
                    team: hydratedProject.team.map(m => ({ userId: m.user.id, role: m.role }))
                };
            }
        }

        await fanOutActivity(activityData, project);

        return { success: true, activityId: activityRef.id };
    } catch (error) {
        console.error('Error logging activity:', error);
        return { success: false, message: 'Failed to log activity' };
    }
}
