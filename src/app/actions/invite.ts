'use server';

import { adminDb } from '@/lib/firebase.server';
import { getAuthenticatedUser } from '@/lib/session.server';
import { sendFastmailEmail } from '@/lib/fastmail.server';
import { ServerActionResponse, EventType, ProjectInvite, Project } from '@/lib/types';
import { createAndDispatchEvent } from '@/lib/events.server';
import { FieldValue, Timestamp, FieldPath } from 'firebase-admin/firestore';
import crypto from 'crypto';
import { deepSerialize } from '@/lib/utils.server';

function generateToken() {
    return crypto.randomBytes(32).toString('hex');
}

export async function sendProjectInviteAction(data: {
    projectId: string;
    recipientEmail: string;
    role: 'lead' | 'contributor' | 'participant';
    customMessage?: string;
}): Promise<ServerActionResponse> {
    try {
        const currentUser = await getAuthenticatedUser();
        if (!currentUser) {
            return { success: false, error: 'Unauthorized' };
        }

        const { projectId, role, customMessage } = data;
        const recipientEmail = data.recipientEmail?.trim().toLowerCase();

        if (!recipientEmail) {
            return { success: false, error: 'Email address is required' };
        }

        // Basic email validation
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmail)) {
            return { success: false, error: 'Invalid email address format' };
        }

        // Get project and verify permissions
        const projectDoc = await adminDb.collection('projects').doc(projectId).get();
        if (!projectDoc.exists) {
            return { success: false, error: 'Project not found' };
        }

        const projectData = projectDoc.data() as Project;
        
        // Verify caller is a lead or owner
        const isOwner = projectData.ownerId === currentUser.id;
        const isLead = projectData.team.some(
            member => member.userId === currentUser.id && member.role === 'lead'
        );

        if (!isOwner && !isLead) {
            return { success: false, error: 'You do not have permission to invite members to this project' };
        }

        // Check if user is already in project
        const userQuery = await adminDb.collection('users').where('email', '==', recipientEmail).limit(1).get();
        let targetUserId: string | undefined = undefined;
        if (!userQuery.empty) {
            targetUserId = userQuery.docs[0].id;
            const isAlreadyMember = projectData.team.some(m => m.userId === targetUserId);
            if (isAlreadyMember) {
                return { success: false, error: 'User is already a member of this project' };
            }
        }

        // Check if there is already a pending invite for this email
        const existingInviteQuery = await adminDb.collection('projectInvites')
            .where('projectId', '==', projectId)
            .where('email', '==', recipientEmail)
            .where('status', '==', 'pending')
            .limit(1)
            .get();

        if (!existingInviteQuery.empty) {
            return { success: false, error: 'An invitation is already pending for this email address.' };
        }

        // Generate token and expiry (7 days)
        const token = generateToken();
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);

        // Prepare email content
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
        const inviteLink = `${baseUrl}/projects/${projectId}?tab=team&inviteToken=${token}`;
        
        const subject = `You've been invited to join ${projectData.name}`;
        
        const inviterName = currentUser.name || 'A member';
        const senderDisplayName = `${inviterName} via Open for Product`;

        const htmlBody = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2>You're invited!</h2>
                <p><strong>${inviterName}</strong> has invited you to join the project <strong>${projectData.name}</strong> as a ${role}.</p>
                ${customMessage ? `<div style="background-color: #f4f4f4; padding: 15px; border-left: 4px solid #007bff; margin: 20px 0;">${customMessage}</div>` : ''}
                <div style="margin: 30px 0;">
                    <a href="${inviteLink}" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Accept Invitation</a>
                </div>
                <p>If the button doesn't work, copy and paste this link into your browser:</p>
                <p><a href="${inviteLink}">${inviteLink}</a></p>
                <p style="color: #666; font-size: 12px; margin-top: 40px;">This invitation will expire in 7 days.</p>
            </div>
        `;

        // Send email via Fastmail FIRST
        await sendFastmailEmail(recipientEmail, subject, htmlBody, senderDisplayName);

        // ONLY IF EMAIL SUCCEEDS: Save invite to Firestore
        const invite: Omit<ProjectInvite, 'id'> = {
            projectId,
            email: recipientEmail,
            role,
            invitedBy: currentUser.id,
            status: 'pending',
            token,
            createdAt: FieldValue.serverTimestamp() as Timestamp,
            expiresAt: Timestamp.fromDate(expiresAt),
        };

        await adminDb.collection('projectInvites').add(invite);

        // Log event
        await createAndDispatchEvent({
            type: EventType.USER_INVITED_TO_PROJECT,
            actorUserId: currentUser.id,
            targetUserId: targetUserId || null, // Use null instead of undefined
            projectId: projectId,
            payload: { email: recipientEmail, role }
        });

        return { success: true };

    } catch (error: any) {
        console.error('Error sending project invite:', error);
        return { success: false, error: error.message || 'An unexpected error occurred' };
    }
}

export async function acceptInviteAction(token: string): Promise<ServerActionResponse<{ projectId: string }>> {
    try {
        const currentUser = await getAuthenticatedUser();
        if (!currentUser) {
            return { success: false, error: 'You must be signed in to accept an invitation.' };
        }

        // Find invite by token
        const inviteQuery = await adminDb.collection('projectInvites').where('token', '==', token).limit(1).get();
        
        if (inviteQuery.empty) {
            return { success: false, error: 'Invalid or missing invitation token.' };
        }

        const inviteDoc = inviteQuery.docs[0];
        const inviteData = inviteDoc.data() as ProjectInvite;

        if (inviteData.status === 'accepted') {
            return { success: false, error: 'This invitation has already been accepted.' };
        }

        if (inviteData.status === 'expired') {
            return { success: false, error: 'This invitation has expired.' };
        }

        // Check if it's past the expiry date
        const now = new Date();
        const expiresAt = (inviteData.expiresAt as unknown as Timestamp)?.toDate?.() || new Date(inviteData.expiresAt as string);
        if (now > expiresAt) {
            await inviteDoc.ref.update({ status: 'expired' });
            return { success: false, error: 'This invitation has expired.' };
        }

        // Verify the logged-in user matches the invited email
        if (currentUser.email !== inviteData.email) {
            return { success: false, error: 'This invitation was sent to a different email address.' };
        }

        const projectId = inviteData.projectId;
        const projectDoc = await adminDb.collection('projects').doc(projectId).get();

        if (!projectDoc.exists) {
            return { success: false, error: 'The project no longer exists.' };
        }

        const projectData = projectDoc.data() as Project;
        
        // Check if user is already a member
        const memberIndex = projectData.team.findIndex(m => m.userId === currentUser.id);
        if (memberIndex !== -1) {
            const currentRole = projectData.team[memberIndex].role;
            if (currentRole !== inviteData.role) {
                // Update their role
                const updatedTeam = [...projectData.team];
                updatedTeam[memberIndex] = {
                    ...updatedTeam[memberIndex],
                    role: inviteData.role,
                    updatedAt: new Date().toISOString()
                };
                await projectDoc.ref.update({ team: updatedTeam });
            }
            await inviteDoc.ref.update({ status: 'accepted' });
            return { success: true, data: { projectId } };
        }

        // Add user to project team
        const newMember = {
            userId: currentUser.id,
            role: inviteData.role,
            createdAt: new Date().toISOString()
        };

        const batch = adminDb.batch();
        batch.update(projectDoc.ref, {
            team: FieldValue.arrayUnion(newMember),
            updatedAt: FieldValue.serverTimestamp()
        });
        batch.update(inviteDoc.ref, {
            status: 'accepted'
        });

        await batch.commit();

        // Log event
        await createAndDispatchEvent({
            type: EventType.INVITE_ACCEPTED,
            actorUserId: currentUser.id,
            projectId: projectId,
            payload: { role: inviteData.role }
        });

        return { success: true, data: { projectId } };

    } catch (error: any) {
        console.error('Error accepting invite:', error);
        return { success: false, error: error.message || 'An unexpected error occurred' };
    }
}

export async function getProjectInvitesAction(projectId: string): Promise<ServerActionResponse<ProjectInvite[]>> {
    try {
        const currentUser = await getAuthenticatedUser();
        if (!currentUser) return { success: false, error: 'Unauthorized' };

        const projectDoc = await adminDb.collection('projects').doc(projectId).get();
        if (!projectDoc.exists) return { success: false, error: 'Project not found' };

        // If user is lead, they see all invites for project. 
        // If not, they only see their own.
        const projectData = projectDoc.data() as Project;
        const isLead = projectData.ownerId === currentUser.id || projectData.team.some(m => m.userId === currentUser.id && m.role === 'lead');

        let invitesQuery = adminDb.collection('projectInvites').where('projectId', '==', projectId);
        
        if (!isLead) {
            invitesQuery = invitesQuery.where('email', '==', currentUser.email.trim().toLowerCase()).where('status', '==', 'pending');
        }

        const snapshot = await invitesQuery.get();
        const invites: ProjectInvite[] = [];
        const now = new Date();

        for (const doc of snapshot.docs) {
            const data = doc.data() as ProjectInvite;
            data.id = doc.id;
            if (data.status === 'pending') {
                const expiresAt = (data.expiresAt as unknown as Timestamp)?.toDate?.() || new Date(data.expiresAt as string);
                if (now > expiresAt) {
                    data.status = 'expired';
                    adminDb.collection('projectInvites').doc(doc.id).update({ status: 'expired' }).catch(console.error);
                }
            }
            invites.push(data);
        }

        return { success: true, data: deepSerialize(invites) };
    } catch (error: any) {
        console.error('Error fetching project invites:', error);
        return { success: false, error: error.message || 'An unexpected error occurred' };
    }
}

export async function cancelInviteAction(inviteId: string): Promise<ServerActionResponse> {
    try {
        const currentUser = await getAuthenticatedUser();
        if (!currentUser) return { success: false, error: 'Unauthorized' };

        const inviteRef = adminDb.collection('projectInvites').doc(inviteId);
        const inviteSnap = await inviteRef.get();
        if (!inviteSnap.exists) return { success: false, error: 'Invitation not found' };

        const inviteData = inviteSnap.data() as ProjectInvite;

        // Verify permissions
        const projectDoc = await adminDb.collection('projects').doc(inviteData.projectId).get();
        const projectData = projectDoc.data() as Project;
        const isLead = projectData.ownerId === currentUser.id || projectData.team.some(m => m.userId === currentUser.id && m.role === 'lead');

        if (!isLead) return { success: false, error: 'Unauthorized' };

        await inviteRef.update({ status: 'cancelled' });
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function resendInviteAction(inviteId: string, customMessage?: string): Promise<ServerActionResponse> {
    try {
        const currentUser = await getAuthenticatedUser();
        if (!currentUser) return { success: false, error: 'Unauthorized' };

        const inviteRef = adminDb.collection('projectInvites').doc(inviteId);
        const inviteSnap = await inviteRef.get();
        if (!inviteSnap.exists) return { success: false, error: 'Invitation not found' };

        const inviteData = inviteSnap.data() as ProjectInvite;

        // Verify permissions
        const projectDoc = await adminDb.collection('projects').doc(inviteData.projectId).get();
        const projectData = projectDoc.data() as Project;
        const isLead = projectData.ownerId === currentUser.id || projectData.team.some(m => m.userId === currentUser.id && m.role === 'lead');

        if (!isLead) return { success: false, error: 'Unauthorized' };

        // Refresh token and expiry
        const token = generateToken();
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);

        await inviteRef.update({
            token,
            expiresAt: Timestamp.fromDate(expiresAt),
            status: 'pending',
            updatedAt: FieldValue.serverTimestamp()
        });

        // Prepare email
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
        const inviteLink = `${baseUrl}/projects/${inviteData.projectId}/join?token=${token}`;
        const subject = `Reminder: You've been invited to join ${projectData.name}`;
        const inviterName = currentUser.name || 'A member';
        
        const htmlBody = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2>Invitation Reminder</h2>
                <p>This is a reminder that <strong>${inviterName}</strong> has invited you to join the project <strong>${projectData.name}</strong>.</p>
                ${customMessage ? `<div style="background-color: #f4f4f4; padding: 15px; border-left: 4px solid #007bff; margin: 20px 0;">${customMessage}</div>` : ''}
                <div style="margin: 30px 0;">
                    <a href="${inviteLink}" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Accept Invitation</a>
                </div>
                <p>If the button doesn't work, copy and paste this link into your browser:</p>
                <p><a href="${inviteLink}">${inviteLink}</a></p>
                <p style="color: #666; font-size: 12px; margin-top: 40px;">This invitation will expire in 7 days.</p>
            </div>
        `;

        await sendFastmailEmail(inviteData.email, subject, htmlBody, `${inviterName} via Open for Product`);

        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function getCollaboratorsAction(): Promise<ServerActionResponse<{id: string, name: string, email: string, username?: string}[]>> {
    try {
        const currentUser = await getAuthenticatedUser();
        if (!currentUser) return { success: false, error: 'Unauthorized' };

        // 1. Fetch all projects (using the same pattern as data.server.ts)
        const projectsSnap = await adminDb.collection('projects').get();
        
        const allMemberIds = new Set<string>();
        
        projectsSnap.docs.forEach(doc => {
            const data = doc.data() as Project;
            const isMember = data.ownerId === currentUser.id || (data.team && data.team.some(m => m.userId === currentUser.id));
            
            if (isMember) {
                if (data.ownerId) allMemberIds.add(data.ownerId);
                if (data.team) data.team.forEach(m => allMemberIds.add(m.userId));
            }
        });

        allMemberIds.delete(currentUser.id); // Remove self

        if (allMemberIds.size === 0) return { success: true, data: [] };

        // 2. Fetch user details in batches
        const memberIds = Array.from(allMemberIds);
        const users: {id: string, name: string, email: string, username?: string}[] = [];

        for (let i = 0; i < memberIds.length; i += 30) {
            const chunk = memberIds.slice(i, i + 30);
            const userSnap = await adminDb.collection('users')
                .where(FieldPath.documentId(), 'in', chunk)
                .get();
            
            userSnap.docs.forEach(doc => {
                const data = doc.data();
                users.push({ id: doc.id, name: data.name, email: data.email, username: data.username });
            });
        }

        return { success: true, data: users };
    } catch (error: any) {
        console.error('getCollaboratorsAction error:', error);
        return { success: false, error: error.message };
    }
}
