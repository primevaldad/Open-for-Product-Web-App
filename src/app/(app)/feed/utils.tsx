'use client';

import React from 'react';
import Link from 'next/link';
import type { Activity, User, Project, ActivityType } from '@/lib/types';
import { timeAgo } from '@/lib/utils';

export function toSafeDate(timestamp: any): Date {
    const date = new Date(timestamp);
    if (!isNaN(date.getTime())) {
        return date;
    }
    if (timestamp && typeof timestamp.toDate === 'function') {
        return timestamp.toDate();
    }
    return new Date();
}

export type HydratedActivityItem = {
  id: string;
  actor: User;
  type: ActivityType;
  timestamp: string;
  project?: Project;
  context: any;
};

export function renderActivityMessage(item: HydratedActivityItem) {
    const projectLink = item.project ? (
        <Link href={`/projects/${item.project.id}`} className="font-semibold text-blue-600 hover:underline">
            {item.project.name}
        </Link>
    ) : (
        <span className="font-semibold">a project</span>
    );

    switch (item.type) {
        case 'project-created':
            return <>created the project {projectLink}</>;
        case 'project-status-updated':
            return <>updated the status of {projectLink} to <strong>{item.context.projectStatus}</strong></>;
        case 'project-member-added':
            return <>joined the project {projectLink}</>;
        case 'project-member-role-updated':
            return <>updated a member's role in {projectLink} to <strong>{item.context.newMemberRole}</strong></>;
        case 'task-created':
            return <>created a new task in {projectLink}: "{item.context.taskTitle}"</>;
        case 'task-status-updated':
            return <>updated task "{item.context.taskTitle}" to <strong>{item.context.taskStatus}</strong> in {projectLink}</>;
        case 'task-assigned':
            return <>was assigned a task in {projectLink}</>;
        case 'discussion-posted':
            return <>posted a new discussion in {projectLink}</>;
        case 'steem-community-post':
            return (
                <>
                    published a post in <span className="font-semibold text-[#3c4fe0]">{item.context.steemCommunity}</span>: 
                    <a 
                        href={`https://steemit.com${item.context.steemUrl}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="ml-1 font-semibold text-blue-600 hover:underline"
                    >
                        "{item.context.steemTitle}"
                    </a>
                </>
            );
        case 'collection-created':
            return <>created the collection <span className="font-semibold text-blue-600">{item.context.collectionName}</span></>;
        case 'collection-updated':
            return <>updated the collection <span className="font-semibold text-blue-600">{item.context.collectionName}</span></>;
        case 'collection-deleted':
            return <>deleted the collection <span className="font-semibold text-blue-600">{item.context.collectionName}</span></>;
        case 'collection-project-added': {
            const collectionLink = item.context.isProjectCollection ? (
                <Link href={`/projects/${item.context.collectionId}`} className="font-semibold text-blue-600 hover:underline">
                    {item.context.collectionName}
                </Link>
            ) : (
                <Link href={`/collections/${item.context.collectionSlug || item.context.collectionId}`} className="font-semibold text-blue-600 hover:underline">
                    {item.context.collectionName}
                </Link>
            );
            return <>collected {projectLink} into {collectionLink}</>;
        }
        case 'collection-project-removed': {
            const collectionLink = item.context.isProjectCollection ? (
                <Link href={`/projects/${item.context.collectionId}`} className="font-semibold text-blue-600 hover:underline">
                    {item.context.collectionName}
                </Link>
            ) : (
                <Link href={`/collections/${item.context.collectionSlug || item.context.collectionId}`} className="font-semibold text-blue-600 hover:underline">
                    {item.context.collectionName}
                </Link>
            );
            return <>removed {projectLink} from {collectionLink}</>;
        }
        default:
            return <>performed an action on {projectLink}</>;
    }
}
