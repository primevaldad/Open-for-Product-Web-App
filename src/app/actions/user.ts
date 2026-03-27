'use server';

import { revalidatePath } from 'next/cache';
import { FieldValue } from 'firebase-admin/firestore';
import { adminDb, updateUser as updateUserInDb, findUserById } from '@/lib/data.server';
import type { ServerActionResponse, User, Event, Notification, EventType, ProfileTag, GlobalTag } from '@/lib/types';

async function createEvent(type: EventType, actorUserId: string, targetUserId?: string, projectId?: string, payload?: any): Promise<Event> {
    const eventRef = adminDb.collection('events').doc();
    
    const eventData: any = {
        id: eventRef.id,
        type,
        actorUserId,
        createdAt: FieldValue.serverTimestamp(),
    };

    if (targetUserId) eventData.targetUserId = targetUserId;
    if (projectId) eventData.projectId = projectId;
    if (payload) eventData.payload = payload;

    await eventRef.set(eventData);
    
    return eventData as Event;
}

async function createNotification(userId: string, eventId: string): Promise<void> {
    const notificationRef = adminDb.collection('notifications').doc();
    const notification: Omit<Notification, 'id'> = {
        userId,
        eventId,
        isRead: false,
        createdAt: FieldValue.serverTimestamp() as any,
    };
    await notificationRef.set(notification);
}

const MAX_TAG_LENGTH = 35;
const normalizeTag = (tag: string): string => {
  return tag.toLowerCase().trim().replace(/[^a-z0-9-_]/g, '-').slice(0, MAX_TAG_LENGTH);
};

async function manageUserInterests(
  transaction: FirebaseFirestore.Transaction,
  newInterests: ProfileTag[],
  currentInterests: ProfileTag[],
  userId: string
): Promise<void> {
  const tagsCollection = adminDb.collection('tags');
  const newTagIds = (newInterests as any[]).map((t) => normalizeTag(typeof t === 'string' ? t : t.id));
  const currentTagIds = (currentInterests as any[]).map((t) => normalizeTag(typeof t === 'string' ? t : t.id));

  const tagsToAddIds = newInterests ? newTagIds.filter((id) => !currentTagIds.includes(id)) : [];
  const tagsToRemoveIds = currentInterests ? currentTagIds.filter((id) => !newTagIds.includes(id)) : [];

  const allRelevantIds = [...new Set([...tagsToAddIds, ...tagsToRemoveIds])];
  if (allRelevantIds.length === 0) return;

  const tagRefs = allRelevantIds.map((id) => tagsCollection.doc(id));
  const tagSnaps = await transaction.getAll(...tagRefs);
  const tagSnapsMap = new Map(tagSnaps.map((snap) => [snap.id, snap]));

  for (const id of tagsToAddIds) {
    const tagRef = tagsCollection.doc(id);
    const tagSnap = tagSnapsMap.get(id);
    const pTag = (newInterests as any[]).find((t) => normalizeTag(typeof t === 'string' ? t : t.id) === id);
    const display = typeof pTag === 'string' ? pTag : (pTag?.display || id);

    if (tagSnap && tagSnap.exists) {
      transaction.update(tagRef, { usageCount: FieldValue.increment(1) });
    } else {
      const newGlobalTag: Omit<GlobalTag, 'usageCount'> & { usageCount: number } = {
        id,
        normalized: id,
        display: display,
        isCategory: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: userId,
        usageCount: 1,
      };
      transaction.set(tagRef, newGlobalTag);
    }
  }

  for (const id of tagsToRemoveIds) {
    const tagRef = tagsCollection.doc(id);
    const tagSnap = tagSnapsMap.get(id);
    if (tagSnap && tagSnap.exists) {
      transaction.update(tagRef, { usageCount: FieldValue.increment(-1) });
    }
  }
}

// --- Main Action --- //
export async function updateUser(userId: string, userData: Partial<User>): Promise<ServerActionResponse<User>> {
  try {
    await adminDb.runTransaction(async (transaction) => {
      const userRef = adminDb.collection('users').doc(userId);
      const userDoc = await transaction.get(userRef);
      if (!userDoc.exists) {
        throw new Error('User not found');
      }
      const currentUserData = userDoc.data() as User;

        if (userData.interests) {
          await manageUserInterests(
            transaction,
            userData.interests as ProfileTag[],
            currentUserData.interests || [],
            userId
          );
        }

      // Perform the user update
      transaction.update(userRef, userData);
    });

    const updatedUser = await findUserById(userId);
    if (!updatedUser) {
      return { success: false, error: 'Failed to retrieve updated user.' };
    }

    // --- Event and Notification Creation ---
    const event = await createEvent('profile-updated' as EventType, userId, userId, undefined, { updatedFields: Object.keys(userData) });
    await createNotification(userId, event.id);
    // -------------------------------------

    revalidatePath('/', 'layout'); // Revalidate all paths to reflect user changes
    return { success: true, data: updatedUser };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'An unexpected error occurred.';
    return { success: false, error: message };
  }
}
