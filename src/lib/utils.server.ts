
import type { Project, HydratedProject, User, HydratedProjectMember } from './types';
import { Timestamp } from 'firebase-admin/firestore';

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
        owner: usersMap.get(project.ownerId) as User, // Assuming ownerId is always in usersMap when hydrating
        team: hydratedTeam,
    };
};

export function deepSerialize<T>(obj: T, visited = new WeakSet()): T {
    if (obj === null || typeof obj !== 'object') {
        // Functions are not serializable, so we return undefined to have them stripped out.
        if (typeof obj === 'function') {
            return undefined as T;
        }
        return obj;
    }

    // Duck-typing to check for Firestore Timestamp
    if (typeof (obj as any).toDate === 'function') {
        return (obj as any).toDate().toISOString() as T;
    }

    if (visited.has(obj)) {
        return '[Circular]' as T;
    }

    visited.add(obj);

    if (Array.isArray(obj)) {
        // When mapping arrays, filter out any undefined values that result from serializing functions.
        return obj.map(item => deepSerialize(item, visited)).filter(item => item !== undefined) as T;
    }

    const serializedObj: { [key: string]: unknown } = {};
    for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            const value = deepSerialize((obj as Record<string, unknown>)[key], visited);
            // Only include the key in the new object if its value is not undefined.
            if (value !== undefined) {
                serializedObj[key] = value;
            }
        }
    }
    return serializedObj as T;
}
