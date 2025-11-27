
import type { Activity, User, Project, ActivityType } from '@/lib/types';

/**
 * A HydratedActivityItem is a processed version of a raw Activity object,
 * ready for rendering in the UI. It replaces IDs with full objects.
 */
export type HydratedActivityItem = {
  id: string;
  actor: User;          // The full user object for the person who performed the action.
  type: ActivityType;   // The specific type of activity that occurred.
  timestamp: Date;      // The date object for when the activity happened.
  project?: Project;      // The full project object, if the activity is related to one.
  context: Activity['context']; // The original context from the activity log.
};

/**
 * Safely converts a timestamp of unknown format (string, Firestore Timestamp, etc.) to a Date object.
 * @param timestamp The timestamp to convert.
 * @returns A valid Date object.
 */
function toSafeDate(timestamp: any): Date {
    // First, try a direct conversion. This works for ISO strings and some other formats.
    const date = new Date(timestamp);
    if (!isNaN(date.getTime())) {
        return date;
    }

    // Next, check if it's a Firestore Timestamp object with a toDate method.
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
 * This involves fetching the full User and Project objects from the provided maps.
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

    const actor = usersMap.get(item.actorId);
    if (!actor) return null; // Don't show activity if the actor is not found

    const project = item.projectId ? projectsMap.get(item.projectId) : undefined;

    return {
        id: item.id,
        actor,
        type: item.type,
        timestamp: toSafeDate(item.timestamp), // Use the robust conversion function
        project,
        context: item.context,
    };
};
