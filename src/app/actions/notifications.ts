'use server';

import { getAuthenticatedUser } from '@/lib/session.server';
import { adminDb } from '@/lib/data.server';
import { deepSerialize } from '@/lib/utils.server';
import type { Notification } from '@/lib/types';

export async function getNotifications(): Promise<{ success: boolean, notifications?: Notification[], error?: string }> {
  const currentUser = await getAuthenticatedUser();
  if (!currentUser) {
    return { success: false, error: "User not authenticated." };
  }

  try {
    const notificationsSnapshot = await adminDb
      .collection('notifications')
      .where('userId', '==', currentUser.id)
      .orderBy('timestamp', 'desc')
      .get();

    const notifications = notificationsSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            ...data,
            timestamp: new Date(data.timestamp).toISOString(),
        } as Notification;
    });

    return deepSerialize({ success: true, notifications });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred.";
    return deepSerialize({ success: false, error: `Failed to fetch notifications: ${errorMessage}` });
  }
}
