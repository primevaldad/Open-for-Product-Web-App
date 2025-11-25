'use server';

import { adminDb, findProjectById } from '@/lib/data.server';
import type { Activity, Project, ActivityType } from '@/lib/types';
import { getAuthenticatedUser } from '@/lib/session.server';

interface LogActivityParams {
    projectId?: string;
    actorId: string;
    type: ActivityType;
    context?: Record<string, any>;
}

async function fanOutActivity(activityData: Activity, project?: Project) {
    const userIdsToUpdate = new Set<string>();
    
    userIdsToUpdate.add(activityData.actorId);

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
    const { projectId, actorId, type, context } = params;
    const user = await getAuthenticatedUser();
    
    if (!user || user.id !== actorId) {
        console.error('[AUTH_ACTION_TRACE] Unauthorized attempt to log activity');
        throw new Error('You must be logged in to perform this action');
    }

    try {
        const activityRef = adminDb.collection('activity').doc();
        
        const activityData: Activity = {
            id: activityRef.id,
            type,
            actorId,
            timestamp: new Date().toISOString(), // Use serializable ISO string
            projectId: projectId ?? undefined,
            context: context ?? {},
        };

        await activityRef.set(activityData);

        let project: Project | undefined;
        if (projectId) {
            const hydratedProject = await findProjectById(projectId);
            if (hydratedProject) {
                project = {
                    ...hydratedProject,
                    ownerId: hydratedProject.owner?.id ?? undefined,
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
