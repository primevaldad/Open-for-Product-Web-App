'use server';

import { revalidatePath } from 'next/cache';
import { FieldValue, admin } from 'firebase-admin/firestore';
import { adminDb, updateUser as updateUserInDb, findUserById } from '@/lib/data.server';
import type { ServerActionResponse, User, Event, Notification, EventType, ProfileTag } from '@/lib/types';

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
        createdAt: FieldValue.serverTimestamp(),
    };
    await notificationRef.set(notification);
}

// --- Tag Management --- //
async function manageUserInterests(
  transaction: FirebaseFirestore.Transaction,
  newInterests: ProfileTag[],
  currentInterests: ProfileTag[]
): Promise<void> {
  const tagsCollection = adminDb.collection('tags');
  const newTagIds = newInterests.map((t) => t.id);
  const currentTagIds = currentInterests.map((t) => t.id);

  const tagsToAdd = newTagIds.filter((id) => !currentTagIds.includes(id));
  const tagsToRemove = currentTagIds.filter((id) => !newTagIds.includes(id));

  for (const tagId of tagsToAdd) {
    const tagRef = tagsCollection.doc(tagId);
    transaction.update(tagRef, { usageCount: admin.firestore.FieldValue.increment(1) });
  }

  for (const tagId of tagsToRemove) {
    const tagRef = tagsCollection.doc(tagId);
    transaction.update(tagRef, { usageCount: admin.firestore.FieldValue.increment(-1) });
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

      // If interests are being updated, manage the tags
      if (userData.interests) {
        await manageUserInterests(
          transaction,
          userData.interests as ProfileTag[],
          currentUserData.interests || []
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
