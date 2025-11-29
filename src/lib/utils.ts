
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getInitials(name: string) {
    if (!name) return '??';
    const names = name.split(' ');
    if (names.length === 1) {
        return names[0].substring(0, 2).toUpperCase();
    }
    return (names[0][0] + names[names.length - 1][0]).toUpperCase();
}

const placeholderImages = [
    '/images/ofp-project-placeholder1.png',
    '/images/ofp-project-placeholder2.png',
    '/images/ofp-project-placeholder3.png',
];

// Simple debounce function
export function debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number
): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout | null = null;
    return function(this: ThisParameterType<T>, ...args: Parameters<T>) {
        const context = this;
        if (timeout) {
            clearTimeout(timeout);
        }
        timeout = setTimeout(() => {
            func.apply(context, args);
        }, wait);
    };
}


/**
 * Given a string ID, returns a deterministically selected placeholder image path.
 * This ensures that the same project ID will always get the same placeholder image.
 * @param id - The ID of the entity (e.g., project, user)
 * @returns A path to a placeholder image.
 */

export const getDeterministicPlaceholder = (id: string | null | undefined) => {
    if (!id || typeof id !== 'string') {
        // Return a default or random placeholder if ID is invalid to prevent crashes
        return placeholderImages[0];
    }
    const hash = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return placeholderImages[hash % placeholderImages.length];
};

/**
 * Converts a timestamp-like object or a string into a Date object.
 * This function uses duck-typing to check for a .toDate() method, which makes it
 * compatible with both Firebase/Firestore Timestamps and other similar structures,
 * without needing a direct import that could cause build issues.
 */
export const toDate = (timestamp: any): Date => {
  // Duck-typing for Firestore Timestamp or similar objects
  if (timestamp && typeof timestamp.toDate === 'function') {
    return timestamp.toDate();
  }
  // Handle ISO strings or other date string formats
  if (typeof timestamp === 'string') {
    const date = new Date(timestamp);
    if (!isNaN(date.getTime())) {
        return date;
    }
  }
  // Fallback for null, undefined, or invalid formats
  return new Date();
};

/**
 * Formats a date into a relative time string (e.g., "2 hours ago").
 * @param date The date to format.
 * @returns A relative time string.
 */
export const timeAgo = (date: Date): string => {
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    let interval = seconds / 31536000;
    if (interval > 1) {
        return Math.floor(interval) + " years ago";
    }
    interval = seconds / 2592000;
    if (interval > 1) {
        return Math.floor(interval) + " months ago";
    }
    interval = seconds / 86400;
    if (interval > 1) {
        return Math.floor(interval) + " days ago";
    }
    interval = seconds / 3600;
    if (interval > 1) {
        return Math.floor(interval) + " hours ago";
    }
    interval = seconds / 60;
    if (interval > 1) {
        return Math.floor(interval) + " minutes ago";
    }
    return Math.floor(seconds) + " seconds ago";
};
