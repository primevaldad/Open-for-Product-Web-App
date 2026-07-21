'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { EventType, HydratedNotification } from '@/lib/types';
import { timeAgo, toDate } from '@/lib/utils';
import { markNotificationAsRead } from '@/app/actions/notifications';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getInitials } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface NotificationCardProps {
    notification: HydratedNotification;
    onClick?: () => void;
}

export function getProjectTabQuery(eventType?: EventType, payload?: any): string {
    if (payload?.tab) return `?tab=${payload.tab}`;
    if (!eventType) return '';
    switch (eventType) {
        case EventType.FUNDRY_TOGGLED:
        case EventType.FUNDING_GOAL_MILESTONE:
            return '?tab=fundry';
        case EventType.GOVERNANCE_EDITED:
            return '?tab=governance';
        case EventType.PROJECT_POST_PUBLISHED:
        case EventType.POST_EDITED:
        case EventType.POST_DELETED:
            return '?tab=posts';
        case EventType.DISCUSSION_COMMENT_POSTED:
        case EventType.DISCUSSION_COMMENT_REPLIED:
        case EventType.DISCUSSION_COMMENT_EDITED:
        case EventType.DISCUSSION_COMMENT_DELETED:
            return '?tab=discussions';
        case EventType.TASK_CREATED:
        case EventType.TASK_UPDATED:
        case EventType.TASK_COMPLETED:
        case EventType.TASK_DELETED:
            return '?tab=tasks';
        case EventType.MEMBER_ROLE_APPLIED:
        case EventType.MEMBER_ROLE_APPROVED:
        case EventType.USER_INVITED_TO_PROJECT:
        case EventType.PROJECT_JOINED:
        case EventType.PROJECT_LEFT:
        case EventType.INVITE_ACCEPTED:
        case EventType.INVITE_REJECTED:
            return '?tab=team';
        case EventType.AGENT_UPDATE_READY:
            return '?tab=lead';
        default:
            return '';
    }
}

function renderNotificationMessage(notification: HydratedNotification): React.ReactNode {
    const { event, actor, project } = notification;

    if (!event || !actor) return <p>Corrupted notification data.</p>;

    const actorName = (
        <Link 
            href={`/profile/${actor.id}`} 
            className="font-semibold hover:underline" 
            onClick={(e) => e.stopPropagation()}
        >
            {actor.name || actor.username || 'User'}
        </Link>
    );
    const projectTabQuery = getProjectTabQuery(event.type, event.payload);
    const projectName = project ? (
        <Link 
            href={`/projects/${project.id}${projectTabQuery}`} 
            className="font-semibold hover:underline" 
            onClick={(e) => e.stopPropagation()}
        >
            {project.name}
        </Link>
    ) : 'a project';

    switch (event.type) {
        // --- Membership & Role Events ---
        case EventType.PROJECT_JOINED:
            return <p>{actorName} joined {projectName}.</p>;
        case EventType.PROJECT_LEFT:
            return <p>{actorName} left {projectName}.</p>;
        case EventType.MEMBER_ROLE_APPLIED:
            return <p>{actorName} applied for the <span className="font-semibold">{event.payload?.role}</span> role in {projectName}.</p>;
        case EventType.MEMBER_ROLE_APPROVED:
            return <p>Your application for <span className="font-semibold">{event.payload?.role}</span> in {projectName} was approved.</p>;
        case EventType.USER_INVITED_TO_PROJECT:
            return <p>You have been invited to join {projectName} as a <span className="font-semibold">{event.payload?.role}</span>.</p>;

        // --- Discussion Events ---
        case EventType.DISCUSSION_COMMENT_POSTED:
            return <p>{actorName} posted a new discussion in {projectName}.</p>;
        case EventType.DISCUSSION_COMMENT_REPLIED:
            return <p>{actorName} replied to your comment in {projectName}.</p>;

        // --- Profile & Settings Events ---
        case EventType.PROFILE_UPDATED:
            return <p>Your profile was updated successfully.</p>;
        case EventType.SETTINGS_UPDATED:
            return <p>Your settings were updated successfully.</p>;

        // --- Project Lifecycle Events ---
        case EventType.PROJECT_CREATED:
            return <p>{actorName} created {projectName}.</p>;
        case EventType.PROJECT_DRAFTED:
            return <p>{actorName} saved a draft for {projectName}.</p>;
        case EventType.PROJECT_PUBLISHED:
            return <p>{actorName} published {projectName}.</p>;
        case EventType.PROJECT_DRAFT_UPDATED:
            return <p>{actorName} updated the draft for {projectName}.</p>;
        case EventType.PROJECT_DETAILS_UPDATED:
            return <p>{actorName} updated {projectName}.</p>;
        case EventType.PROJECT_PHOTO_UPDATED:
            return <p>{actorName} updated the photo for {projectName}.</p>;
        case EventType.PROJECT_VISIBILITY_UPDATED:
            return <p>{actorName} changed the visibility of {projectName}.</p>;
        case EventType.GOVERNANCE_EDITED:
            return <p>{actorName} updated the governance for {projectName}.</p>;
        case EventType.FUNDRY_TOGGLED: {
            const isEnabled = event.payload?.enabled;
            return <p>{actorName} {isEnabled ? 'activated' : 'deactivated'} Fundry for {projectName}.</p>;
        }
        case EventType.FUNDING_GOAL_MILESTONE:
            return <p>{projectName} reached a funding milestone!</p>;
        case EventType.PROJECT_POST_PUBLISHED:
            return <p>{actorName} published a new post in {projectName}.</p>;
        case EventType.AGENT_UPDATE_READY:
            return <p>{actorName} has an update ready for review in {projectName}.</p>;

        // --- Task Events ---
        case EventType.TASK_CREATED:
            return <p>{actorName} created a new task{event.payload?.taskTitle ? `: "${event.payload.taskTitle}"` : ''} in {projectName}.</p>;
        case EventType.TASK_UPDATED:
            return <p>{actorName} updated a task{event.payload?.taskTitle ? `: "${event.payload.taskTitle}"` : ''} in {projectName}.</p>;
        case EventType.TASK_COMPLETED:
            return <p>{actorName} completed a task{event.payload?.taskTitle ? `: "${event.payload.taskTitle}"` : ''} in {projectName}.</p>;
        case EventType.TASK_DELETED:
            return <p>{actorName} deleted a task{event.payload?.taskTitle ? `: "${event.payload.taskTitle}"` : ''} in {projectName}.</p>;

        // --- Tag Events ---
        case EventType.TAG_CREATED:
            return <p>{actorName} created a new tag: <span className="font-semibold">{event.payload?.tagName}</span>.</p>;

        // --- Learning Path Events ---
        case EventType.LEARNING_PATH_STARTED:
            return <p>{actorName} started a learning path{event.payload?.pathTitle ? `: "${event.payload.pathTitle}"` : ''}.</p>;
        case EventType.LEARNING_PATH_PROGRESS:
            return <p>{actorName} made progress on a learning path{event.payload?.pathTitle ? `: "${event.payload.pathTitle}"` : ''}.</p>;
        case EventType.LEARNING_PATH_COMPLETED:
            return <p>{actorName} completed a learning path{event.payload?.pathTitle ? `: "${event.payload.pathTitle}"` : ''}!</p>;
        case EventType.LEARNING_PATH_CONNECTED_TO_PROJECT:
            return <p>{actorName} connected a learning path to {projectName}.</p>;
            
        case EventType.COLLECTION_CREATED: {
            const collectionName = event.payload?.collectionName || 'a collection';
            const collectionLink = (
                <Link href={`/collections/${event.payload?.collectionSlug || event.payload?.collectionId}`} className="font-semibold text-primary hover:underline" onClick={(e) => e.stopPropagation()}>
                    {collectionName}
                </Link>
            );
            return <p>Your collection {collectionLink} was created successfully.</p>;
        }
        case EventType.COLLECTION_UPDATED: {
            const collectionName = event.payload?.collectionName || 'a collection';
            const collectionLink = (
                <Link href={`/collections/${event.payload?.collectionSlug || event.payload?.collectionId}`} className="font-semibold text-primary hover:underline" onClick={(e) => e.stopPropagation()}>
                    {collectionName}
                </Link>
            );
            return <p>Your collection {collectionLink} was updated successfully.</p>;
        }
        case EventType.COLLECTION_DELETED: {
            return <p>Your collection <span className="font-semibold">{event.payload?.collectionName || 'a collection'}</span> was deleted successfully.</p>;
        }
        case EventType.PROJECT_ADDED_TO_COLLECTION: {
            const collectionName = event.payload?.collectionName || 'a collection';
            const collectionLink = event.payload?.isProjectCollection ? (
                <Link href={`/projects/${event.payload.collectionId}`} className="font-semibold text-primary hover:underline" onClick={(e) => e.stopPropagation()}>
                    {collectionName}
                </Link>
            ) : (
                <Link href={`/collections/${event.payload?.collectionSlug || event.payload?.collectionId}`} className="font-semibold text-primary hover:underline" onClick={(e) => e.stopPropagation()}>
                    {collectionName}
                </Link>
            );
            return <p>{actorName} added {projectName} to the collection {collectionLink}.</p>;
        }
        case EventType.PROJECT_REMOVED_FROM_COLLECTION: {
            const collectionName = event.payload?.collectionName || 'a collection';
            const collectionLink = event.payload?.isProjectCollection ? (
                <Link href={`/projects/${event.payload.collectionId}`} className="font-semibold text-primary hover:underline" onClick={(e) => e.stopPropagation()}>
                    {collectionName}
                </Link>
            ) : (
                <Link href={`/collections/${event.payload?.collectionSlug || event.payload?.collectionId}`} className="font-semibold text-primary hover:underline" onClick={(e) => e.stopPropagation()}>
                    {collectionName}
                </Link>
            );
            return <p>{actorName} removed {projectName} from the collection {collectionLink}.</p>;
        }

        default:
            return <p>An unknown notification type was received.</p>;
    }
}

export function NotificationCard({ notification, onClick }: NotificationCardProps) {
    const router = useRouter();
    const [isRead, setIsRead] = useState(notification.isRead);

    const handleClick = async () => {
        onClick?.();
        if (!isRead) {
            await markNotificationAsRead(notification.id);
            setIsRead(true);
        }
        if (notification.project) {
            const tabQuery = getProjectTabQuery(notification.event?.type, notification.event?.payload);
            router.push(`/projects/${notification.project.id}${tabQuery}`);
        } else {
            router.push(`/feed`);
        }
    };

    return (
        <div 
            className={cn(
                "p-4 flex items-start gap-4 border-b last:border-b-0 cursor-pointer transition-colors",
                !isRead ? "bg-accent/30 dark:bg-accent/40 hover:bg-accent/40 dark:hover:bg-accent/50" : "hover:bg-muted/50 dark:hover:bg-muted/20"
            )}
            onClick={handleClick}
        >
            <Avatar className="w-10 h-10 border bg-background">
                <AvatarImage src={notification.actor?.avatarUrl || notification.actor?.photoUrl} alt={notification.actor?.name || notification.actor?.username || 'User'} />
                <AvatarFallback>{getInitials(notification.actor?.name || notification.actor?.username || 'U')}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
                <div className="text-sm">
                    {renderNotificationMessage(notification)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                    {timeAgo(toDate(notification.createdAt))}
                </p>
            </div>
            {!isRead && (
                <div className="w-2.5 h-2.5 bg-primary rounded-full self-center flex-shrink-0"></div>
            )}
        </div>
    );
} 
