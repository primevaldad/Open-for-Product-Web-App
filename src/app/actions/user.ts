'use server';

import { revalidatePath } from 'next/cache';
import { FieldValue } from 'firebase-admin/firestore';
import { adminDb, updateUser as updateUserInDb, findUserById } from '@/lib/data.server';
import type { ServerActionResponse, User, Event, Notification, EventType } from '@/lib/types';

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
    
    // We cast to Event because the dynamic object matches the interface
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

export async function updateUser(userId: string, userData: Partial<User>): Promise<ServerActionResponse<User>> {
  try {
    await updateUserInDb(userId, userData);
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
