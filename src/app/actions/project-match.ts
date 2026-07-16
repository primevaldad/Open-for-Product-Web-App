'use server';

import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { revalidatePath } from 'next/cache';

import { adminDb } from '@/lib/firebase.server';
import { getAuthenticatedUser } from '@/lib/session.server';
import { sendFastmailEmail } from '@/lib/fastmail.server';
import {
  generateProjectMatchToken,
  grantProjectMatchThreadAccess,
  hashProjectMatchToken,
  normalizeProjectMatchEmail,
} from '@/lib/project-match';
import type { ProjectMatchMessage, ProjectMatchThread, User } from '@/lib/types';
import { deepSerialize } from '@/lib/utils.server';

const THREAD_COLLECTION = 'projectMatchThreads';
const MESSAGE_COLLECTION = 'projectMatchMessages';
const ONE_TIME_TOKEN_DAYS = 7;
const THREAD_INACTIVITY_DAYS = 60;
const REPLAY_SESSION_DAYS = 7;
const FINALIZED_READONLY_DAYS = 7;

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function htmlEscape(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

async function sendProjectMatchEmail(
  recipientEmail: string,
  subject: string,
  bodyHtml: string,
  senderName = 'Open for Product'
) {
  await sendFastmailEmail(recipientEmail, subject, bodyHtml, senderName);
}

export async function createProjectMatchThreadAction(values: {
  email: string;
  interests: string;
  contribution: string;
  requesterName?: string;
  notes?: string;
}) {
  const email = normalizeProjectMatchEmail(values.email || '');
  const interests = values.interests?.trim();
  const contribution = values.contribution?.trim();

  if (!email || !isValidEmail(email)) {
    return { success: false, error: 'Please enter a valid email address.' };
  }

  if (!interests || !contribution) {
    return { success: false, error: 'Please share a little more context.' };
  }

  const token = generateProjectMatchToken();
  const tokenHash = hashProjectMatchToken(token);
  const now = new Date();
  const tokenExpiresAt = new Date(now.getTime() + ONE_TIME_TOKEN_DAYS * 24 * 60 * 60 * 1000);
  const threadExpiresAt = new Date(now.getTime() + THREAD_INACTIVITY_DAYS * 24 * 60 * 60 * 1000);

  const threadRef = adminDb.collection(THREAD_COLLECTION).doc();
  const threadId = threadRef.id;
  const requesterMessage = values.notes?.trim() || '';

  const thread: Omit<ProjectMatchThread, 'id'> = {
    email,
    interests,
    contribution,
    notes: requesterMessage || undefined,
    requesterMessage: requesterMessage || undefined,
    requesterName: values.requesterName?.trim() || undefined,
    status: 'open',
    tokenHash,
    tokenIssuedAt: Timestamp.fromDate(now),
    tokenExpiresAt: Timestamp.fromDate(tokenExpiresAt),
    lastAccessAt: Timestamp.fromDate(now),
    lastActivityAt: Timestamp.fromDate(now),
    expiresAt: Timestamp.fromDate(threadExpiresAt),
    createdAt: FieldValue.serverTimestamp() as Timestamp,
    updatedAt: FieldValue.serverTimestamp() as Timestamp,
    createdByUserId: null,
    updatedByUserId: null,
  };

  const initialMessage: Omit<ProjectMatchMessage, 'id'> = {
    threadId,
    senderType: 'requester',
    senderEmail: email,
    senderUserId: null,
    body: requesterMessage || [
      `Interests: ${interests}`,
      `Contribution: ${contribution}`,
    ].join('\n'),
    kind: 'message',
    createdAt: FieldValue.serverTimestamp() as Timestamp,
  };

  await adminDb.runTransaction(async (tx) => {
    tx.set(threadRef, thread);
    tx.set(adminDb.collection(MESSAGE_COLLECTION).doc(), initialMessage);
  });

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  const accessLink = `${baseUrl}/api/project-match/access?token=${token}&threadId=${threadId}`;
  const subject = 'We received your project match request';
  const htmlBody = `
    <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; line-height: 1.6; color: #1f1f1f;">
      <h2 style="margin-bottom: 12px;">We received your request</h2>
      <p>Thanks for reaching out. We’ll review what you shared and reply in the app.</p>
      <div style="margin: 24px 0; padding: 16px; border-left: 4px solid #b8512c; background: #faf6ef;">
        <p><strong>Interests:</strong> ${htmlEscape(interests)}</p>
        <p><strong>Contribution:</strong> ${htmlEscape(contribution)}</p>
      </div>
      <p>
        Use this link to view the conversation. It opens once, then this browser keeps access for a while.
      </p>
      <p><a href="${accessLink}">${accessLink}</a></p>
      <p style="font-size: 12px; color: #666;">This access link is one-time use. If you need a new one later, request a refresh from the thread.</p>
    </div>
  `;

  await sendProjectMatchEmail(email, subject, htmlBody, 'Open for Product');

  revalidatePath('/admin/project-match');

  return { success: true, data: { threadId } };
}

export async function consumeProjectMatchThreadToken(token: string) {
  const tokenHash = hashProjectMatchToken(token);
  const now = new Date();
  const threadSnapshot = await adminDb.collection(THREAD_COLLECTION)
    .where('tokenHash', '==', tokenHash)
    .limit(1)
    .get();

  if (threadSnapshot.empty) {
    return { success: false, error: 'Invalid access link.' };
  }

  const threadDoc = threadSnapshot.docs[0];
  const thread = threadDoc.data() as ProjectMatchThread;
  const expiresAt = (thread.tokenExpiresAt as Timestamp | undefined)?.toDate?.() || new Date(0);

  if (thread.status === 'expired' || thread.status === 'archived') {
    return { success: false, error: 'This thread is no longer active.' };
  }

  if (expiresAt.getTime() && now > expiresAt) {
    await threadDoc.ref.update({
      status: 'expired',
      updatedAt: FieldValue.serverTimestamp(),
    });
    return { success: false, error: 'This access link has expired.' };
  }

  const sessionExpiresAt = new Date(now.getTime() + REPLAY_SESSION_DAYS * 24 * 60 * 60 * 1000);

  await threadDoc.ref.update({
    tokenHash: null,
    tokenConsumedAt: FieldValue.serverTimestamp(),
    tokenExpiresAt: Timestamp.fromDate(now),
    lastAccessAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  await grantProjectMatchThreadAccess(threadDoc.id, sessionExpiresAt);

  return { success: true, data: { threadId: threadDoc.id } };
}

export async function getProjectMatchThreadForViewer(threadId: string) {
  const threadDoc = await adminDb.collection(THREAD_COLLECTION).doc(threadId).get();
  if (!threadDoc.exists) {
    return { success: false, error: 'Thread not found.' };
  }

  const thread = threadDoc.data() as ProjectMatchThread;
  const now = new Date();
  const toDate = (value: any) => (value && typeof value.toDate === 'function' ? value.toDate() : value ? new Date(value) : null);
  const accessExpired = toDate(thread.expiresAt);
  const finalizedAt = toDate(thread.finalizedAt);
  const readonlyCutoff = finalizedAt
    ? new Date(finalizedAt.getTime() + FINALIZED_READONLY_DAYS * 24 * 60 * 60 * 1000)
    : null;

  const grant = await import('@/lib/project-match').then((mod) => mod.getProjectMatchGrant(threadId));
  const hasGrant = !!grant;

  const currentUser = await getAuthenticatedUser();
  const isAdmin = currentUser?.role === 'admin';

  if (!hasGrant && !isAdmin) {
    return { success: false, error: 'You do not have access to this thread.' };
  }

  if (accessExpired && now > accessExpired && thread.status !== 'finalized') {
    await threadDoc.ref.update({
      status: 'expired',
      updatedAt: FieldValue.serverTimestamp(),
    });
    return { success: false, error: 'This thread has expired.' };
  }

  if (readonlyCutoff && now > readonlyCutoff) {
    await threadDoc.ref.update({
      status: 'expired',
      updatedAt: FieldValue.serverTimestamp(),
    });
    return { success: false, error: 'This thread has expired.' };
  }

  const messagesSnapshot = await adminDb.collection(MESSAGE_COLLECTION)
    .where('threadId', '==', threadId)
    .orderBy('createdAt', 'asc')
    .get();

  const messages = messagesSnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as ProjectMatchMessage[];

  return { success: true, data: deepSerialize({ thread: { id: threadDoc.id, ...thread }, messages }) };
}

export async function addProjectMatchMessageAction(values: {
  threadId: string;
  body: string;
  senderType: 'requester' | 'admin';
}) {
  const body = values.body?.trim();
  if (!body) {
    return { success: false, error: 'Message body is required.' };
  }

  const threadRef = adminDb.collection(THREAD_COLLECTION).doc(values.threadId);
  const threadSnap = await threadRef.get();
  if (!threadSnap.exists) return { success: false, error: 'Thread not found.' };
  const thread = threadSnap.data() as ProjectMatchThread;
  const currentUser = await getAuthenticatedUser();
  const isAdmin = currentUser?.role === 'admin';

  if (values.senderType === 'admin') {
    if (!isAdmin) {
      return { success: false, error: 'Unauthorized.' };
    }
    if (thread.status === 'finalized') {
      return { success: false, error: 'This thread is finalized and cannot receive new messages.' };
    }
  }

  if (values.senderType === 'requester') {
    const grant = await import('@/lib/project-match').then((mod) => mod.getProjectMatchGrant(values.threadId));
    // Admins can bypass the grant check even if they use the public form
    if (!grant && !isAdmin && thread.status !== 'finalized') {
      return { success: false, error: 'You do not have access to this thread.' };
    }
    if (thread.status !== 'open') {
      return { success: false, error: 'This thread is read-only.' };
    }
  }

  const message: Omit<ProjectMatchMessage, 'id'> = {
    threadId: values.threadId,
    senderType: values.senderType,
    senderUserId: currentUser?.id || null,
    senderEmail: currentUser?.email || thread.email,
    body,
    kind: 'message',
    createdAt: FieldValue.serverTimestamp() as Timestamp,
  };

  await adminDb.collection(MESSAGE_COLLECTION).add(message);
  await threadRef.update({
    lastActivityAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    status: (thread.status === 'finalized' || thread.status === 'archived') ? thread.status : 'open',
  });

  // revalidatePath(`/match/${values.threadId}`);
  // revalidatePath('/admin/project-match');

  return { success: true };
}

export async function addRequesterProjectMatchMessageAction(
  _previousState: { success: boolean; error?: string; message?: string },
  formData: FormData
) {
  const threadId = String(formData.get('threadId') || '');
  const body = String(formData.get('body') || '');
  const result = await addProjectMatchMessageAction({
    threadId,
    body,
    senderType: 'requester',
  });

  if (!result.success) {
    return { success: false, error: result.error || 'Unable to send reply.' };
  }

  return { success: true, message: 'Reply sent.' };
}

export async function finalizeProjectMatchThreadAction(threadId: string) {
  const currentUser = await getAuthenticatedUser();
  if (!currentUser || currentUser.role !== 'admin') {
    return { success: false, error: 'Unauthorized.' };
  }

  await adminDb.collection(THREAD_COLLECTION).doc(threadId).update({
    status: 'finalized',
    finalizedAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  revalidatePath(`/admin/project-match/${threadId}`);
  revalidatePath(`/match/${threadId}`);
  return { success: true };
}

export async function archiveProjectMatchThreadAction(threadId: string) {
  const currentUser = await getAuthenticatedUser();
  if (!currentUser || currentUser.role !== 'admin') {
    return { success: false, error: 'Unauthorized.' };
  }

  await adminDb.collection(THREAD_COLLECTION).doc(threadId).update({
    status: 'archived',
    archivedAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  revalidatePath(`/admin/project-match/${threadId}`);
  revalidatePath(`/match/${threadId}`);
  return { success: true };
}

export async function updateProjectMatchThreadNotesAction(values: {
  threadId: string;
  internalNote?: string;
  leadMessage?: string;
  inviteEmailSnapshot?: string;
}) {
  const currentUser = await getAuthenticatedUser();
  if (!currentUser || currentUser.role !== 'admin') {
    return { success: false, error: 'Unauthorized.' };
  }

  await adminDb.collection(THREAD_COLLECTION).doc(values.threadId).update({
    internalNote: values.internalNote?.trim() || '',
    leadMessage: values.leadMessage?.trim() || '',
    inviteEmailSnapshot: values.inviteEmailSnapshot?.trim() || '',
    updatedAt: FieldValue.serverTimestamp(),
    updatedByUserId: currentUser.id,
  });
  revalidatePath(`/admin/project-match/${values.threadId}`);
  revalidatePath('/admin/project-match');
  return { success: true };
}

export async function requestProjectMatchAccessRefreshAction(threadId: string, email: string) {
  const normalizedEmail = normalizeProjectMatchEmail(email);
  if (!normalizedEmail || !isValidEmail(normalizedEmail)) {
    return { success: true };
  }

  const threadSnap = await adminDb.collection(THREAD_COLLECTION).doc(threadId).get();
  if (!threadSnap.exists) {
    return { success: true };
  }

  const thread = threadSnap.data() as ProjectMatchThread;
  if (thread.email !== normalizedEmail) {
    return { success: true };
  }

  const token = generateProjectMatchToken();
  const tokenHash = hashProjectMatchToken(token);
  const tokenExpiresAt = new Date(Date.now() + ONE_TIME_TOKEN_DAYS * 24 * 60 * 60 * 1000);

  await threadSnap.ref.update({
    tokenHash,
    tokenIssuedAt: FieldValue.serverTimestamp(),
    tokenExpiresAt: Timestamp.fromDate(tokenExpiresAt),
    updatedAt: FieldValue.serverTimestamp(),
  });

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  const accessLink = `${baseUrl}/api/project-match/access?token=${token}&threadId=${threadId}`;
  const htmlBody = `
    <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto;">
      <h2>Your new access link</h2>
      <p>Here is a fresh link to your project match conversation.</p>
      <p><a href="${accessLink}">${accessLink}</a></p>
    </div>
  `;

  await sendProjectMatchEmail(thread.email, 'Your new project match access link', htmlBody, 'Open for Product');
  return { success: true };
}

export async function listProjectMatchThreadsAction() {
  const currentUser = await getAuthenticatedUser();
  if (!currentUser || currentUser.role !== 'admin') {
    return { success: false, error: 'Unauthorized.' };
  }

  const snapshot = await adminDb.collection(THREAD_COLLECTION).orderBy('updatedAt', 'desc').limit(500).get();
  const threads = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as ProjectMatchThread[];
  return { success: true, data: deepSerialize(threads) };
}

export async function getProjectMatchThreadAdminAction(threadId: string) {
  const currentUser = await getAuthenticatedUser();
  if (!currentUser || currentUser.role !== 'admin') {
    return { success: false, error: 'Unauthorized.' };
  }

  const threadDoc = await adminDb.collection(THREAD_COLLECTION).doc(threadId).get();
  if (!threadDoc.exists) return { success: false, error: 'Thread not found.' };

  const messagesSnapshot = await adminDb.collection(MESSAGE_COLLECTION)
    .where('threadId', '==', threadId)
    .orderBy('createdAt', 'asc')
    .get();

  const messages = messagesSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as ProjectMatchMessage[];
  return { success: true, data: deepSerialize({ thread: { id: threadDoc.id, ...threadDoc.data() }, messages }) };
}
