
'server-only';

import { FieldValue } from 'firebase-admin/firestore';
import { adminDb } from './firebase.server';
import { findProjectById, findUserById, findUsersByIds } from './data.server';
import {
    Event,
    EventType,
    Notification,
    Project,
    User,
    UserId,
} from './types';

/**
 * Creates an event and dispatches it, which may trigger notifications.
 *
 * @param event The event to create and dispatch.
 * @returns The created event, or null if the project is not found.
 */
export async function createAndDispatchEvent(
    event: Omit<Event, 'id' | 'createdAt'>
): Promise<Event | null> {
    const createdEvent = await createEvent(event);
    await dispatchEvent(createdEvent);
    return createdEvent;
}

/**
 * Creates a new event in the database.
 *
 * @param event The event data to create.
 * @returns The created event with its new ID.
 */
async function createEvent(event: Omit<Event, 'id' | 'createdAt'>): Promise<Event> {
    const eventWithTimestamp = {
        ...event,
        createdAt: FieldValue.serverTimestamp(),
    };
    const eventRef = await adminDb.collection('events').add(eventWithTimestamp);
    return { id: eventRef.id, ...event } as Event;
}

/**
 * Dispatches an event to the appropriate users.
 *
 * @param event The event to dispatch.
 */
async function dispatchEvent(event: Event): Promise<void> {
    switch (event.type) {
        case EventType.PROJECT_JOINED: {
            const { projectId, actorUserId } = event;
            if (projectId) {
                const project = await findProjectById(projectId, null);
                if (project && project.owner) {
                    await createNotification({
                        userId: project.owner.id,
                        eventId: event.id,
                    });
                }
            }
            break;
        }

        case EventType.PROJECT_LEFT: {
            const { projectId, actorUserId } = event;
            if (projectId) {
                const project = await findProjectById(projectId, null);
                if (project && project.owner) {
                    await createNotification({
                        userId: project.owner.id,
                        eventId: event.id,
                    });
                }
            }
            break;
        }

        case EventType.MEMBER_ROLE_APPLIED: {
            const { projectId, actorUserId, payload } = event;
            if (projectId) {
                const project = await findProjectById(projectId, null);
                if (project && project.owner) {
                    await createNotification({
                        userId: project.owner.id,
                        eventId: event.id,
                    });
                }
            }
            break;
        }

        case EventType.MEMBER_ROLE_APPROVED: {
            const { targetUserId, projectId } = event;
            if (targetUserId) {
                await createNotification({
                    userId: targetUserId,
                    eventId: event.id,
                });
            }
            break;
        }

        case EventType.USER_INVITED_TO_PROJECT: {
            const { targetUserId, projectId } = event;
            if (targetUserId) {
                await createNotification({
                    userId: targetUserId,
                    eventId: event.id,
                });
            }
            break;
        }

        case EventType.DISCUSSION_COMMENT_POSTED: {
            const { projectId, actorUserId } = event;
            if (projectId) {
                const project = await findProjectById(projectId, null);
                if (project) {
                    const recipientIds = project.team
                        .map((member) => member.userId)
                        .filter((id) => id !== actorUserId);

                    if (project.owner && project.owner.id !== actorUserId) {
                        recipientIds.push(project.owner.id);
                    }

                    const uniqueRecipientIds = [...new Set(recipientIds)];

                    for (const userId of uniqueRecipientIds) {
                        await createNotification({
                            userId,
                            eventId: event.id,
                        });
                    }
                }
            }
            break;
        }

        case EventType.DISCUSSION_COMMENT_REPLIED: {
            const { projectId, actorUserId, targetUserId } = event;
            if (projectId && targetUserId && actorUserId !== targetUserId) {
                await createNotification({
                    userId: targetUserId,
                    eventId: event.id,
                });
            }
            break;
        }
    }
}

/**
 * Creates a new notification in the database.
 *
 * @param notification The notification data to create.
 * @returns The ID of the newly created notification.
 */
async function createNotification(notification: Omit<Notification, 'id' | 'createdAt' | 'isRead'>): Promise<string> {
    const notificationWithTimestamp = {
        ...notification,
        isRead: false,
        createdAt: FieldValue.serverTimestamp(),
    };
    const notificationRef = await adminDb.collection('notifications').add(notificationWithTimestamp);
    return notificationRef.id;
}
