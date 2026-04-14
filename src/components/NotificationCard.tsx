'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { EventType, HydratedNotification } from '@/lib/types';
import { timeAgo, toDate } from '@/lib/utils';
import { markNotificationAsRead } from '@/app/actions/notifications';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getInitials } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface NotificationCardProps {
    notification: HydratedNotification;
}

function renderNotificationMessage(notification: HydratedNotification): React.ReactNode {
    const { event, actor, project } = notification;

    if (!event || !actor) return <p>Corrupted notification data.</p>;

    const actorName = <strong>{actor.name}</strong>;
    const projectName = project ? <strong>{project.name}</strong> : 'a project';

    switch (event.type) {
        // --- Membership & Role Events ---
        case EventType.PROJECT_JOINED:
            return <p>{actorName} joined {projectName}.</p>;
        case EventType.PROJECT_LEFT:
            return <p>{actorName} left {projectName}.</p>;
        case EventType.MEMBER_ROLE_APPLIED:
            return <p>{actorName} applied for the <strong>{event.payload?.role}</strong> role in {projectName}.</p>;
        case EventType.MEMBER_ROLE_APPROVED:
            return <p>Your application for <strong>{event.payload?.role}</strong> in {projectName} was approved.</p>;
        case EventType.USER_INVITED_TO_PROJECT:
            return <p>You have been invited to join {projectName} as a <strong>{event.payload?.role}</strong>.</p>;

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

        // --- Task Events ---
        case EventType.TASK_CREATED:
            return <p>{actorName} created a new task{event.payload?.taskTitle ? `: "${event.payload.taskTitle}"` : ''} in {projectName}.</p>;
        case EventType.TASK_UPDATED:
            return <p>{actorName} updated a task{event.payload?.taskTitle ? `: "${event.payload.taskTitle}"` : ''} in {projectName}.</p>;
        case EventType.TASK_DELETED:
            return <p>{actorName} deleted a task{event.payload?.taskTitle ? `: "${event.payload.taskTitle}"` : ''} in {projectName}.</p>;

        // --- Tag Events ---
        case EventType.TAG_CREATED:
            return <p>{actorName} created a new tag: <strong>{event.payload?.tagName}</strong>.</p>;

        // --- Learning Path Events ---
        case EventType.LEARNING_PATH_STARTED:
            return <p>{actorName} started a learning path{event.payload?.pathTitle ? `: "${event.payload.pathTitle}"` : ''}.</p>;
        case EventType.LEARNING_PATH_PROGRESS:
            return <p>{actorName} made progress on a learning path{event.payload?.pathTitle ? `: "${event.payload.pathTitle}"` : ''}.</p>;
        case EventType.LEARNING_PATH_COMPLETED:
            return <p>{actorName} completed a learning path{event.payload?.pathTitle ? `: "${event.payload.pathTitle}"` : ''}!</p>;
        case EventType.LEARNING_PATH_CONNECTED_TO_PROJECT:
            return <p>{actorName} connected a learning path to {projectName}.</p>;

        default:
            return <p>An unknown notification type was received.</p>;
    }
}

export function NotificationCard({ notification }: NotificationCardProps) {
    const router = useRouter();
    const [isRead, setIsRead] = useState(notification.isRead);

    const handleClick = async () => {
        if (!isRead) {
            await markNotificationAsRead(notification.id);
            setIsRead(true);
        }
        if (notification.event.projectId) {
            router.push(`/projects/${notification.event.projectId}`);
        }
    };

    return (
        <div 
            className={cn(
                "p-4 flex items-start gap-4 border-b last:border-b-0 hover:bg-gray-50 cursor-pointer",
                !isRead && "bg-blue-50"
            )}
            onClick={handleClick}
        >
            <Avatar className="w-10 h-10 border">
                <AvatarImage src={notification.actor?.avatarUrl} alt={notification.actor?.name} />
                <AvatarFallback>{getInitials(notification.actor?.name || '?')}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
                <div className="text-sm">
                    {renderNotificationMessage(notification)}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                    {timeAgo(toDate(notification.createdAt))}
                </p>
            </div>
            {!isRead && (
                <div className="w-2.5 h-2.5 bg-blue-500 rounded-full self-center"></div>
            )}
        </div>
    );
} 
