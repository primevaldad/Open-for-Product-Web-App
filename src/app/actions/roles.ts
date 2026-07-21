'use server';

import { revalidatePath } from 'next/cache';
import { getAuthenticatedUser } from '@/lib/session.server';
import { updateProjectMemberRole, findProjectById, adminDb } from '@/lib/data.server';
import type { ProjectMember, User } from '@/lib/types';
import { deepSerialize } from '@/lib/utils.server';
import { FieldValue } from 'firebase-admin/firestore';

export type ApplyForRoleAction = typeof applyForRole;
export type ApproveRoleApplicationAction = typeof approveRoleApplication;
export type DenyRoleApplicationAction = typeof denyRoleApplication;

async function getProjectLeads(projectId: string): Promise<User[]> {
    const project = await findProjectById(projectId, null);
    if (!project) return [];
    return project.team.filter(m => m.role === 'lead').map(m => m.user as User);
}

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

        const projectLeads = await getProjectLeads(projectId);
        for (const lead of projectLeads) {
            // Create the event record
            const eventRef = await adminDb.collection('events').add({
                type: 'member-role-applied',
                actorUserId: user.id,
                targetUserId: lead.id,
                projectId,
                payload: { role },
                createdAt: FieldValue.serverTimestamp(),
            });
            // Create the notification pointing to the event
            await adminDb.collection('notifications').add({
                userId: lead.id,
                eventId: eventRef.id,
                isRead: false,
                createdAt: FieldValue.serverTimestamp(),
            });
        }

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
