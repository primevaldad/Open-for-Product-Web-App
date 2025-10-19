
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
export const serializeTimestamp = (timestamp: any): string => {
    if (typeof timestamp === 'string') return timestamp;
    // Use duck-typing to check for a toDate method, which is present on Firestore Timestamps
    if (timestamp && typeof timestamp.toDate === 'function') {
        return timestamp.toDate().toISOString();
    }
    if (timestamp instanceof Date) {
        return timestamp.toISOString();
    }
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

export function deepSerialize<T>(obj: T): T {
    if (obj === null || typeof obj !== 'object') {
        return obj;
    }

    // Duck-typing to check for Firestore Timestamp
    if (typeof (obj as any).toDate === 'function') {
        return (obj as any).toDate().toISOString() as T;
    }

    if (Array.isArray(obj)) {
        return obj.map(deepSerialize) as T;
    }

    const serializedObj: { [key: string]: unknown } = {};
    for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            serializedObj[key] = deepSerialize((obj as Record<string, unknown>)[key]);
        }
    }
    return serializedObj as T;
}

export function timeAgo(date: Date | undefined): string {
    if (!date) return '';
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + " years ago";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + " months ago";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + " days ago";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + " hours ago";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + " minutes ago";
    return Math.floor(seconds) + " seconds ago";
  }
