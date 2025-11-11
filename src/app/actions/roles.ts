'use server';

import { revalidatePath } from 'next/cache';
import { getAuthenticatedUser } from '@/lib/session.server';
import { updateProjectMemberRole, addNotification, findProjectById } from '@/lib/data.server';
import type { ProjectMember, User } from '@/lib/types';
import { deepSerialize } from '@/lib/utils.server';

export type ApplyForRoleAction = typeof applyForRole;
export type ApproveRoleApplicationAction = typeof approveRoleApplication;
export type DenyRoleApplicationAction = typeof denyRoleApplication;

async function getProjectLeads(projectId: string): Promise<User[]> {
    const project = await findProjectById(projectId);
    if (!project) return [];
    return project.team.filter(m => m.role === 'lead').map(m => m.user as User);
}

async function isProjectLead(projectId: string, userId: string): Promise<boolean> {
    const project = await findProjectById(projectId);
    if (!project) return false;
    return project.team.some(m => m.userId === userId && m.role === 'lead');
}

export async function applyForRole({ projectId, userId, role }: { projectId: string, userId: string, role: ProjectMember['role'] }) {
    const user = await getAuthenticatedUser();
    if (!user) return deepSerialize({ success: false, error: 'User not authenticated.' });

    try {
        await updateProjectMemberRole({ projectId, userId, pendingRole: role });

        const projectLeads = await getProjectLeads(projectId);
        for (const lead of projectLeads) {
            await addNotification({
                userId: lead.id,
                message: `${user.name} has applied for the role of ${role} in your project.`,
                link: `/projects/${projectId}?tab=team`,
                timestamp: new Date().toISOString(),
                read: false,
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

    if (!await isProjectLead(projectId, currentUser.id)) {
        return deepSerialize({ success: false, error: 'Only project leads can approve applications.' });
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

    if (!await isProjectLead(projectId, currentUser.id)) {
        return deepSerialize({ success: false, error: 'Only project leads can deny applications.' });
    }

    try {
        await updateProjectMemberRole({ projectId, userId, pendingRole: null });
        revalidatePath(`/projects/${projectId}`);
        return deepSerialize({ success: true, message: 'Role application denied.' });
    } catch (error) {
        return deepSerialize({ success: false, error: 'Failed to deny application.' });
    }
}
