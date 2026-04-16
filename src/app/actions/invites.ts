'use server';

import { adminDb, findUserByEmail, findProjectById, updateProjectInDb, updateUser } from '@/lib/data.server';
import { getAuthenticatedUser } from '@/lib/session.server';
import { EventType, User, ProjectMember } from '@/lib/types';
import { FieldValue } from 'firebase-admin/firestore';
import { revalidatePath } from 'next/cache';
import { createAndDispatchEvent } from '@/lib/events.server';
import { deepSerialize } from '@/lib/utils.server';

const INVITE_EXPIRATION_DAYS = 14;

export async function inviteMember(data: { projectId: string; email: string; role: 'lead' | 'contributor' | 'participant' }) {
    const { projectId, email, role } = data;
    const currentUser = await getAuthenticatedUser();
    if (!currentUser) return { success: false, error: 'Authentication required.' };

    try {
        const project = await findProjectById(projectId, currentUser);
        if (!project) return { success: false, error: 'Project not found.' };

        const isLead = project.team.some(member => member.userId === currentUser.id && member.role === 'lead');
        if (!isLead) return { success: false, error: 'Only project leads can invite members.' };

        // 1. Check if the user already exists in the system
        const targetUser = await findUserByEmail(email);
        
        if (targetUser) {
            // Check if they are already on the team
            const isAlreadyMember = project.team.some(member => member.userId === targetUser.id);
            if (isAlreadyMember) {
                return { success: false, error: 'This user is already a member of the project team.' };
            }

            // Add them as a pending member directly
            const newMember: ProjectMember = {
                userId: targetUser.id,
                role: 'participant', // Default role for applications
                pendingRole: role,     // The role the lead is inviting them to
                createdAt: new Date().toISOString()
            };

            const updatedTeam = [...project.team, newMember];
            await updateProjectInDb(projectId, { team: updatedTeam });

            // Notify the user they've been invited
            await createAndDispatchEvent({
                type: EventType.USER_INVITED_TO_PROJECT,
                actorUserId: currentUser.id,
                targetUserId: targetUser.id,
                projectId,
            });

            revalidatePath(`/projects/${projectId}`);
            return { success: true, message: `${targetUser.name || email} has been added to pending members for approval.` };
        }

        // 2. If user doesn't exist, proceed with the 'invites' collection record
        // Check if an invite already exists
        const existingInviteQuery = await adminDb.collection('invites')
            .where('projectId', '==', projectId)
            .where('email', '==', email)
            .where('status', '==', 'pending')
            .get();

        if (!existingInviteQuery.empty) {
            return { success: false, error: 'An invitation is already pending for this email.' };
        }

        const inviteData = {
            projectId,
            email,
            role,
            invitedBy: currentUser.id,
            status: 'pending',
            createdAt: FieldValue.serverTimestamp(),
        };

        await adminDb.collection('invites').add(inviteData);

        return { success: true, message: `Invitation sent to ${email}` };
    } catch (error) {
        console.error('Failed to invite member:', error);
        return { success: false, error: 'Failed to send invitation.' };
    }
}

export async function checkAndConsumeInvites(user: User) {
    if (!user.email) return;

    try {
        const invitesQuery = await adminDb.collection('invites')
            .where('email', '==', user.email)
            .where('status', '==', 'pending')
            .get();

        if (invitesQuery.empty) return;

        const now = Date.now();
        const expirationMs = INVITE_EXPIRATION_DAYS * 24 * 60 * 60 * 1000;

        for (const doc of invitesQuery.docs) {
            const invite = doc.data();
            const createdAt = invite.createdAt.toDate().getTime();

            // Check if expired
            if (now - createdAt > expirationMs) {
                await doc.ref.update({ status: 'expired' });
                continue;
            }

            // Consume invite
            const project = await findProjectById(invite.projectId, null);
            if (project) {
                const isAlreadyMember = project.team.some(m => m.userId === user.id);
                if (!isAlreadyMember) {
                    const newMember: ProjectMember = { 
                        userId: user.id, 
                        role: invite.role,
                        createdAt: new Date().toISOString()
                    };
                    const updatedTeam = [...project.team, newMember];
                    await updateProjectInDb(invite.projectId, { team: updatedTeam });
                    
                    // Set bypass flag on user
                    await updateUser(user.id, { bypassOnboarding: true } as any);

                    // Notify the lead
                    await createAndDispatchEvent({
                        type: EventType.INVITE_ACCEPTED,
                        actorUserId: user.id,
                        targetUserId: invite.invitedBy,
                        projectId: invite.projectId,
                    });
                }
            }

            await doc.ref.update({ status: 'accepted', updatedAt: FieldValue.serverTimestamp() });
        }
        
        revalidatePath('/', 'layout');
    } catch (error) {
        console.error('Error consuming invites:', error);
    }
}
