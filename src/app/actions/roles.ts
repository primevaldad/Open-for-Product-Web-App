'use server';

import { revalidatePath } from 'next/cache';
import { getAuthenticatedUser } from '@/lib/session.server';
import { updateProjectMemberRole, findProjectById } from '@/lib/data.server';
import { createAndDispatchEvent } from '@/lib/events.server';
import { EventType, type ProjectMember, type User } from '@/lib/types';
import { deepSerialize } from '@/lib/utils.server';

export type ApplyForRoleAction = typeof applyForRole;
export type ApproveRoleApplicationAction = typeof approveRoleApplication;
export type DenyRoleApplicationAction = typeof denyRoleApplication;

async function canManageMembers(projectId: string, user: User): Promise<boolean> {
    const project = await findProjectById(projectId, null);
    if (!project) return false;
    const isLead = project.team.some(m => m.userId === user.id && m.role === 'lead');
    const isPublic = project.project_type === 'public' || !project.project_type;
    const isAdmin = user.role === 'admin';
    return isLead || (isAdmin && isPublic);
}

export async function applyForRole({ projectId, userId, role }: { projectId: string, userId: string, role: ProjectMember['role'] }) {
    const user = await getAuthenticatedUser();
    if (!user) return deepSerialize({ success: false, error: 'User not authenticated.' });

    try {
        await updateProjectMemberRole({ projectId, userId, pendingRole: role });

        await createAndDispatchEvent({
            type: EventType.MEMBER_ROLE_APPLIED,
            actorUserId: user.id,
            projectId,
            payload: { role },
        });

        revalidatePath(`/projects/${projectId}`);
        return deepSerialize({ success: true, message: 'Your application has been submitted and is pending approval.' });
    } catch (error) {
        return deepSerialize({ success: false, error: 'Failed to apply for role.' });
    }
}

export async function approveRoleApplication({ projectId, userId, role }: { projectId: string, userId: string, role: ProjectMember['role'] }) {
    const currentUser = await getAuthenticatedUser();
    if (!currentUser) return deepSerialize({ success: false, error: 'User not authenticated.' });

    if (!await canManageMembers(projectId, currentUser)) {
        return deepSerialize({ success: false, error: 'Only project leads (or platform admins for public projects) can approve applications.' });
    }

    try {
        await updateProjectMemberRole({ projectId, userId, role, pendingRole: null });
        
        await createAndDispatchEvent({
            type: EventType.MEMBER_ROLE_APPROVED,
            actorUserId: currentUser.id,
            targetUserId: userId,
            projectId,
            payload: { role },
        });

        revalidatePath(`/projects/${projectId}`);
        return deepSerialize({ success: true, message: 'Role application approved.' });
    } catch (error) {
        return deepSerialize({ success: false, error: 'Failed to approve application.' });
    }
}

export async function denyRoleApplication({ projectId, userId }: { projectId: string, userId: string }) {
    const currentUser = await getAuthenticatedUser();
    if (!currentUser) return deepSerialize({ success: false, error: 'User not authenticated.' });

    if (!await canManageMembers(projectId, currentUser)) {
        return deepSerialize({ success: false, error: 'Only project leads (or platform admins for public projects) can deny applications.' });
    }

    try {
        await updateProjectMemberRole({ projectId, userId, pendingRole: null });
        revalidatePath(`/projects/${projectId}`);
        return deepSerialize({ success: true, message: 'Role application denied.' });
    } catch (error) {
        return deepSerialize({ success: false, error: 'Failed to deny application.' });
    }
}

export async function updateProjectNotificationLevelAction({ projectId, notificationLevel }: { projectId: string, notificationLevel: 0 | 1 | 2 | 3 }) {
    const currentUser = await getAuthenticatedUser();
    if (!currentUser) return deepSerialize({ success: false, error: 'User not authenticated.' });

    try {
        await updateProjectMemberRole({ projectId, userId: currentUser.id, notificationLevel });
        revalidatePath(`/projects/${projectId}`);
        return deepSerialize({ success: true, message: 'Project notification preferences updated.' });
    } catch (error) {
        return deepSerialize({ success: false, error: 'Failed to update notification preferences.' });
    }
}
