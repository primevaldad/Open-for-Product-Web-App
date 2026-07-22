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

async function shouldNotifyUser(userId: string, projectId: string | undefined, eventType: EventType): Promise<boolean> {
    // Some events ALWAYS notify, regardless of project settings.
    const ALWAYS_NOTIFY = [
        EventType.USER_INVITED_TO_PROJECT,
        EventType.MEMBER_ROLE_APPROVED,
        EventType.INVITE_ACCEPTED,
        EventType.INVITE_REJECTED,
        EventType.MEMBER_ROLE_APPLIED,
        EventType.AGENT_UPDATE_READY,
        EventType.DISCUSSION_COMMENT_REPLIED, // If someone replies to your thread, you should know
        EventType.PROJECT_JOINED,
        EventType.PROJECT_LEFT
    ];
    if (ALWAYS_NOTIFY.includes(eventType)) return true;

    if (!projectId) return true; // Non-project events

    const user = await findUserById(userId);
    if (!user) return false;
    const project = await findProjectById(projectId, null);
    if (!project) return false;

    const member = project.team.find(m => m.userId === userId);
    const isLeadOrOwner = member?.role === 'lead' || project.owner?.id === userId;
    const defaultLevel = isLeadOrOwner ? 3 : 1;
    
    // Evaluate based on preference level
    const prefLevel = member?.notificationLevel !== undefined 
        ? member.notificationLevel 
        : (user.globalNotificationLevel !== undefined ? user.globalNotificationLevel : defaultLevel);

    switch (prefLevel) {
        case 0:
            return false;
        case 1:
            return [
                EventType.FUNDING_GOAL_MILESTONE,
                EventType.PROJECT_POST_PUBLISHED
            ].includes(eventType);
        case 2:
            return [
                EventType.FUNDING_GOAL_MILESTONE,
                EventType.PROJECT_POST_PUBLISHED,
                EventType.TASK_COMPLETED
            ].includes(eventType);
        case 3:
            return true; // All updates
        default:
            return true;
    }
}

/**
 * Dispatches an event to the appropriate users.
 *
 * @param event The event to dispatch.
 */
async function dispatchEvent(event: Event): Promise<void> {
    const getProjectLeads = (project: Project) => {
        const leadIds = project.team
            .filter(m => m.role === 'lead')
            .map(m => m.userId);
        if (project.ownerId) leadIds.push(project.ownerId);
        return [...new Set(leadIds)];
    };

    switch (event.type) {
        case EventType.PROJECT_JOINED:
        case EventType.PROJECT_LEFT:
        case EventType.MEMBER_ROLE_APPLIED:
        case EventType.INVITE_ACCEPTED:
        case EventType.INVITE_REJECTED:
        case EventType.AGENT_UPDATE_READY: {
            const { projectId } = event;
            if (projectId) {
                const project = await findProjectById(projectId, null);
                if (project) {
                    for (const userId of getProjectLeads(project)) {
                        if (await shouldNotifyUser(userId, projectId, event.type)) {
                            await createNotification({ userId, eventId: event.id });
                        }
                    }
                }
            }
            break;
        }

        case EventType.MEMBER_ROLE_APPROVED:
        case EventType.USER_INVITED_TO_PROJECT: {
            const { targetUserId, projectId } = event;
            if (targetUserId) {
                if (await shouldNotifyUser(targetUserId, projectId, event.type)) {
                    await createNotification({
                        userId: targetUserId,
                        eventId: event.id,
                    });
                }
            }
            break;
        }

        case EventType.DISCUSSION_COMMENT_POSTED:
        case EventType.TASK_CREATED:
        case EventType.TASK_UPDATED:
        case EventType.TASK_COMPLETED:
        case EventType.TASK_DELETED:
        case EventType.PROJECT_DETAILS_UPDATED:
        case EventType.GOVERNANCE_EDITED:
        case EventType.FUNDRY_TOGGLED:
        case EventType.FUNDING_CONTRIBUTION_ADDED:
        case EventType.FUNDING_GOAL_MILESTONE:
        case EventType.PROJECT_POST_PUBLISHED:
        case EventType.PROJECT_PHOTO_UPDATED:
        case EventType.PROJECT_VISIBILITY_UPDATED: {
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
                        if (await shouldNotifyUser(userId, projectId, event.type)) {
                            await createNotification({
                                userId,
                                eventId: event.id,
                            });
                        }
                    }
                }
            }
            break;
        }

        case EventType.DISCUSSION_COMMENT_REPLIED: {
            const { projectId, actorUserId, targetUserId, payload } = event;
            const recipientIds = new Set<string>();
            if (targetUserId) recipientIds.add(targetUserId);
            if (payload?.threadParticipantIds) {
                payload.threadParticipantIds.forEach((id: string) => recipientIds.add(id));
            }
            recipientIds.delete(actorUserId);

            for (const userId of recipientIds) {
                if (await shouldNotifyUser(userId, projectId, event.type)) {
                    await createNotification({
                        userId,
                        eventId: event.id,
                    });
                }
            }
            break;
        }

        case EventType.COLLECTION_CREATED:
        case EventType.COLLECTION_UPDATED:
        case EventType.COLLECTION_DELETED: {
            // Self-notification or log record for the creator/owner
            await createNotification({
                userId: event.actorUserId,
                eventId: event.id,
            });
            break;
        }

        case EventType.PROJECT_ADDED_TO_COLLECTION:
        case EventType.PROJECT_REMOVED_FROM_COLLECTION: {
            const { projectId, actorUserId } = event;
            const collectionOwnerId = event.payload?.collectionOwnerId;
            const recipientIds = new Set<string>();

            // 1. Notify the collection owner (if not the actor)
            if (collectionOwnerId && collectionOwnerId !== actorUserId) {
                recipientIds.add(collectionOwnerId);
            }

            // 2. Notify the project leads/owner (if not the actor)
            if (projectId) {
                const project = await findProjectById(projectId, null);
                if (project) {
                    if (project.owner?.id && project.owner.id !== actorUserId) {
                        recipientIds.add(project.owner.id);
                    }
                    project.team.forEach(m => {
                        if (m.userId !== actorUserId) {
                            recipientIds.add(m.userId);
                        }
                    });
                }
            }

            // 3. Keep a record for the actor themselves so it shows in their own notification list if needed
            recipientIds.add(actorUserId);

            for (const userId of recipientIds) {
                if (await shouldNotifyUser(userId, projectId, event.type)) {
                    await createNotification({
                        userId,
                        eventId: event.id,
                    });
                }
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
