
import React from 'react';
import Link from 'next/link';
import type { Activity, User, Project, ActivityType } from '@/lib/types';

/**
 * A HydratedActivityItem is a processed version of a raw Activity object,
 * ready for rendering in the UI. It replaces IDs with full objects.
 * The timestamp is serialized to a string to safely cross the server-client boundary.
 */
export type HydratedActivityItem = {
  id: string;
  actor: User;          // The full user object for the person who performed the action.
  type: ActivityType;   // The specific type of activity that occurred.
  timestamp: string;      // The timestamp is a string for serialization.
  project?: Project;      // The full project object, if the activity is related to one.
  context: Activity['context']; // The original context from the activity log.
};

/**
 * Safely converts a timestamp of unknown format (string, Firestore Timestamp, etc.) to a Date object.
 * This is intended for CLIENT-SIDE use to parse serialized strings or other formats.
 * @param timestamp The timestamp to convert.
 * @returns A valid Date object.
 */
export function toSafeDate(timestamp: any): Date {
    // First, try a direct conversion. This works for ISO strings and some other formats.
    const date = new Date(timestamp);
    if (!isNaN(date.getTime())) {
        return date;
    }

    // Next, check if it's a Firestore Timestamp object with a toDate method (for any client-side Firestore usage).
    if (timestamp && typeof timestamp.toDate === 'function') {
        return timestamp.toDate();
    }

    // If all else fails, log the problematic timestamp and return the current date as a fallback.
    // This prevents the UI from ever displaying "Invalid Date".
    console.error('Could not parse timestamp. Raw value:', timestamp);
    return new Date();
}

/**
 * Converts a raw Activity object from the database into a HydratedActivityItem.
 * This is used on the SERVER and must return a serializable object.
 *
 * @param item The raw activity item from Firestore.
 * @param usersMap A Map of User objects, keyed by user ID.
 * @param projectsMap A Map of Project objects, keyed by project ID.
 * @returns A hydrated activity item, or null if essential data is missing.
 */
export const hydrateActivityItem = (
    item: Activity,
    usersMap: Map<string, User>,
    projectsMap: Map<string, Project>
): HydratedActivityItem | null => {
    console.log('--- Processing Activity Item ---', item);

    const actorId = item.actorId;
    if (!actorId) {
        console.log('-> ❌ Activity rejected: No actorId found on item.');
        return null; 
    }
    console.log(`-> Actor ID found: ${actorId}`);

    const actor = usersMap.get(actorId);
    if (!actor) {
        console.log(`-> ❌ Activity rejected: User not found in usersMap for ID: ${actorId}`);
        console.log('Available user IDs in map:', Array.from(usersMap.keys()));
        return null;
    }
    console.log('-> ✅ Actor found:', actor);

    const project = item.projectId ? projectsMap.get(item.projectId) : undefined;
    if (item.projectId) {
        if (project) {
            console.log(`-> ✅ Project found for ID ${item.projectId}:`, project);
        } else {
            console.log(`-> ⚠️ Project not found in projectsMap for ID: ${item.projectId}`);
            console.log('Available project IDs in map:', Array.from(projectsMap.keys()));
        }
    } else {
        console.log('-> ℹ️ No projectId associated with this activity.');
    }

    // Server-side timestamp serialization with type-safe checks.
    const rawTimestamp = item.timestamp;
    let serializedTimestamp = '';

    if (typeof rawTimestamp === 'string') {
      serializedTimestamp = rawTimestamp;
    } else if (rawTimestamp instanceof Date) {
      serializedTimestamp = rawTimestamp.toISOString();
    } else if (rawTimestamp && typeof (rawTimestamp as any).toDate === 'function') {
      // This handles Firestore Timestamp objects safely.
      serializedTimestamp = (rawTimestamp as any).toDate().toISOString();
    } else {
      // Fallback for unexpected formats.
      serializedTimestamp = new Date().toISOString();
    }

    console.log('-> ✅ Activity hydrated successfully!');
    return {
        id: item.id,
        actor: { ...actor },
        type: item.type,
        timestamp: serializedTimestamp,
        project: project ? { ...project } : undefined,
        context: item.context,
    };
};

/**
 * Generates a human-readable message for an activity item.
 * @param item The hydrated activity item.
 * @returns A React node representing the activity message.
 */
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
            return <>updated a member\'s role in {projectLink} to <strong>{item.context.newMemberRole}</strong></>;

        case 'task-created':
            return <>created a new task in {projectLink}: "{item.context.taskTitle}"</>;

        case 'task-status-updated':
            return <>updated task "{item.context.taskTitle}" to <strong>{item.context.taskStatus}</strong> in {projectLink}</>;

        case 'task-assigned':
            return <>was assigned a task in {projectLink}</>;

        case 'discussion-posted':
            return <>posted a new discussion in {projectLink}</>;

        default:
            return <>performed an unknown action on {projectLink}</>;
    }
}
