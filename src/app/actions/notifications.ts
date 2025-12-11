'use server';

import { revalidatePath } from 'next/cache';
import { getAuthenticatedUser } from '@/lib/session.server';
import { adminDb, findProjectById, findUserById, findUsersByIds } from '@/lib/data.server';
import { deepSerialize } from '@/lib/utils.server';
import type { Notification, HydratedNotification, Event, User, Project } from '@/lib/types';

/**
 * Fetches and hydrates notifications for the authenticated user.
 */
export async function getHydratedNotifications(): Promise<{ success: boolean, notifications?: HydratedNotification[], error?: string }> {
  const currentUser = await getAuthenticatedUser();
  if (!currentUser) {
    return { success: false, error: "User not authenticated." };
  }

  try {
    const notificationsSnapshot = await adminDb
      .collection('notifications')
      .where('userId', '==', currentUser.id)
      .orderBy('createdAt', 'desc')
      .get();

    const notifications = notificationsSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            ...data,
            createdAt: new Date(data.createdAt.toDate()).toISOString(),
        } as Notification;
    });

    if (notifications.length === 0) {
        return deepSerialize({ success: true, notifications: [] });
    }

    // Start hydration process
    const eventIds = [...new Set(notifications.map(n => n.eventId))];
    const eventDocs = await adminDb.collection('events').where(admin.firestore.FieldPath.documentId(), 'in', eventIds).get();
    const eventsMap = new Map<string, Event>(eventDocs.docs.map(doc => ( { id: doc.id, ...doc.data() } as Event)));

    const actorUserIds = [...new Set(Array.from(eventsMap.values()).map(e => e.actorUserId))];
    const targetUserIds = [...new Set(Array.from(eventsMap.values()).map(e => e.targetUserId).filter(Boolean) as string[])];
    const projectIds = [...new Set(Array.from(eventsMap.values()).map(e => e.projectId).filter(Boolean) as string[])];

    const [actors, targets, projects] = await Promise.all([
        findUsersByIds(actorUserIds),
        findUsersByIds(targetUserIds),
        Promise.all(projectIds.map(id => findProjectById(id, currentUser)))
    ]);

    const actorsMap = new Map<string, User>(actors.map(u => [u.id, u]));
    const targetsMap = new Map<string, User>(targets.map(u => [u.id, u]));
    const projectsMap = new Map<string, Project>(projects.filter(Boolean).map(p => [p!.id, p!]));

    const hydratedNotifications: HydratedNotification[] = notifications.map(notification => {
        const event = eventsMap.get(notification.eventId);
        if (!event) return null; // Should not happen

        return {
            ...notification,
            event,
            actor: actorsMap.get(event.actorUserId),
            targetUser: event.targetUserId ? targetsMap.get(event.targetUserId) : undefined,
            project: event.projectId ? projectsMap.get(event.projectId) : undefined,
        };
    }).filter((n): n is HydratedNotification => !!n);

    return deepSerialize({ success: true, notifications: hydratedNotifications });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred.";
    return deepSerialize({ success: false, error: `Failed to fetch notifications: ${errorMessage}` });
  }
}

/**
 * Marks a specific notification as read.
 */
export async function markNotificationAsRead(notificationId: string): Promise<{ success: boolean, error?: string }> {
    const currentUser = await getAuthenticatedUser();
    if (!currentUser) {
        return { success: false, error: "User not authenticated." };
    }

    try {
        const notificationRef = adminDb.collection('notifications').doc(notificationId);
        const notificationDoc = await notificationRef.get();

        if (!notificationDoc.exists || notificationDoc.data()?.userId !== currentUser.id) {
            return { success: false, error: "Notification not found or permission denied." };
        }

        await notificationRef.update({ isRead: true });
        
        revalidatePath('/', 'layout');

        return { success: true };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
        return { success: false, error: `Failed to mark notification as read: ${errorMessage}` };
    }
}

/**
 * Marks all unread notifications for the user as read.
 */
export async function markAllNotificationsAsRead(): Promise<{ success: boolean, error?: string }> {
    const currentUser = await getAuthenticatedUser();
    if (!currentUser) {
        return { success: false, error: "User not authenticated." };
    }

    try {
        const notificationsQuery = adminDb.collection('notifications')
            .where('userId', '==', currentUser.id)
            .where('isRead', '==', false);
        
        const snapshot = await notificationsQuery.get();

        if (snapshot.empty) {
            return { success: true }; // Nothing to mark
        }

        const batch = adminDb.batch();
        snapshot.docs.forEach(doc => {
            batch.update(doc.ref, { isRead: true });
        });

        await batch.commit();

        revalidatePath('/', 'layout');

        return { success: true };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
        return { success: false, error: `Failed to mark all notifications as read: ${errorMessage}` };
    }
}
