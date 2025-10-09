
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const getInitials = (name: string | null | undefined) => {
  if (!name) return 'U';
  const names = name.split(' ')
  if (names.length === 0) return 'U'
  const firstInitial = names[0][0]
  const lastInitial = names.length > 1 ? names[names.length - 1][0] : ''
  return `${firstInitial}${lastInitial}`.toUpperCase()
}

/**
 * A type-safe serializer for Firestore Timestamps or JS Date objects.
 * Returns an ISO string or null.
 */
export const serializeTimestamp = (timestamp: { toDate: () => Date } | Date | null | undefined): string | null => {
  if (!timestamp) return null;
  if (typeof (timestamp as { toDate: () => Date }).toDate === 'function') {
    return (timestamp as { toDate: () => Date }).toDate().toISOString();
  }
  if (timestamp instanceof Date) {
    return timestamp.toISOString();
  }
  return null; // Return null if the input is not a recognized type
}
