
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
 * Transforms a raw Activity object into a HydratedActivityItem.
 *
 * @param item - The raw Activity object from Firestore.
 * @param usersMap - A Map of all users, keyed by userId.
 * @param projectsMap - A Map of all projects, keyed by projectId.
 * @returns A hydrated activity item ready for the UI.
 */
export const toHydratedActivityItem = (
    item: Activity,
    usersMap: Map<string, User>,
    projectsMap: Map<string, Project>
): HydratedActivityItem | null => {

    const actor = usersMap.get(item.actorId);

    // If the actor can't be found, we can't render the item.
    if (!actor) {
        console.warn(`Could not find actor with ID: ${item.actorId} for activity ${item.id}`);
        return null;
    }

    const project = item.projectId ? projectsMap.get(item.projectId) : undefined;

    return {
        id: item.id,
        actor,
        type: item.type,
        timestamp: new Date(item.timestamp as string),
        project,
        context: item.context,
    };
};
