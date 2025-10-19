import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Project, HydratedProject, User, HydratedProjectMember } from './types';

export function getInitials(name: string) {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase();
  }
  

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Converts a server-side timestamp (string | Date | Firestore Timestamp) to a serializable string.
 * Returns an empty string if the timestamp is null or undefined, or keeps it as a string if it already is.
 */
export const serializeTimestamp = (timestamp: string | Date | { toDate: () => Date } | null | undefined): string => {
    if (!timestamp) return '';
    if (typeof timestamp === 'string') return timestamp;
    if ('toDate' in timestamp && typeof timestamp.toDate === 'function') return timestamp.toDate().toISOString(); // Firestore Timestamp
    if (timestamp instanceof Date) return timestamp.toISOString(); // Javascript Date
    return '';
};

/**
 * Converts a timestamp string from a serialized object back into a Date object.
 */
export const toDate = (timestamp: string | undefined): Date | undefined => {
    return timestamp ? new Date(timestamp) : undefined;
};

/**
 * Hydrates a project by embedding full user objects into the team array.
 * Timestamps are preserved as they are on the source Project object.
 * @param project The raw project object.
 * @param usersMap A Map of userId to User object.
 * @returns A HydratedProject.
 */
export const toHydratedProject = (project: Project, usersMap: Map<string, User>): HydratedProject => {
    const hydratedTeam = project.team
        .map(member => {
            const user = usersMap.get(member.userId);
            // Ensure we have a user before creating the hydrated member
            return user ? { ...member, user } : null;
        })
        .filter((member): member is HydratedProjectMember => member !== null);

    return {
        ...project,
        team: hydratedTeam,
    };
};
