'use server';

import { adminDb } from '@/lib/firebase.server';
import { getAuthenticatedUser } from '@/lib/session.server';
import { sendFastmailEmail } from '@/lib/fastmail.server';
import { ServerActionResponse, EventType, ProjectInvite, Project } from '@/lib/types';
import { createAndDispatchEvent } from '@/lib/events.server';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import crypto from 'crypto';

function generateToken() {
    return crypto.randomBytes(32).toString('hex');
}

export async function sendProjectInviteAction(data: {
    projectId: string;
    recipientEmail: string;
    role: 'lead' | 'contributor' | 'participant';
}): Promise<ServerActionResponse> {
    try {
        const currentUser = await getAuthenticatedUser();
        if (!currentUser) {
            return { success: false, error: 'Unauthorized' };
        }

        const { projectId, recipientEmail, role } = data;

        // Basic email validation
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmail)) {
            return { success: false, error: 'Invalid email address' };
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

        // Generate token and expiry (7 days)
        const token = generateToken();
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);

        // Save invite to Firestore
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

        // Prepare email content
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
        const inviteLink = `${baseUrl}/projects/${projectId}/join?token=${token}`;
        
        const subject = `You've been invited to join ${projectData.name}`;
        
        // Note: using the authenticated user's name as the sender, with fallback
        const inviterName = currentUser.name || 'A member';
        const senderDisplayName = `${inviterName} via Open for Product`;

        const htmlBody = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2>You're invited!</h2>
                <p><strong>${inviterName}</strong> has invited you to join the project <strong>${projectData.name}</strong> as a ${role}.</p>
                <div style="margin: 30px 0;">
                    <a href="${inviteLink}" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Accept Invitation</a>
                </div>
                <p>If the button doesn't work, copy and paste this link into your browser:</p>
                <p><a href="${inviteLink}">${inviteLink}</a></p>
                <p style="color: #666; font-size: 12px; margin-top: 40px;">This invitation will expire in 7 days.</p>
            </div>
        `;

        // Send email via Fastmail
        await sendFastmailEmail(recipientEmail, subject, htmlBody, senderDisplayName);

        // Log event
        await createAndDispatchEvent({
            type: EventType.USER_INVITED_TO_PROJECT,
            actorUserId: currentUser.id,
            targetUserId: targetUserId,
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
        if (projectData.team.some(m => m.userId === currentUser.id)) {
            await inviteDoc.ref.update({ status: 'accepted' });
            return { success: true, data: { projectId } };
        }

        // Add user to project team
        const newMember = {
            userId: currentUser.id,
            role: inviteData.role,
            createdAt: FieldValue.serverTimestamp()
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
        if (!currentUser) {
            return { success: false, error: 'Unauthorized' };
        }

        const invitesQuery = await adminDb.collection('projectInvites')
            .where('projectId', '==', projectId)
            .get();

        const invites: ProjectInvite[] = [];
        const now = new Date();

        for (const doc of invitesQuery.docs) {
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

        return { success: true, data: invites };
    } catch (error: any) {
        console.error('Error fetching project invites:', error);
        return { success: false, error: error.message || 'An unexpected error occurred' };
    }
}
