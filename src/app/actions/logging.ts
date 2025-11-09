'use server';

import { adminDb } from '@/lib/firebase.server';
import { FieldValue } from 'firebase-admin/firestore';
import type { Activity } from '@/lib/types';

/**
 * Logs an activity to the 'activity' collection in Firestore.
 * @param activityData - An object containing the activity details.
 *                       This should be of type Omit<Activity, 'id' | 'timestamp'>.
 */
export async function logActivity(activityData: Omit<Activity, 'id' | 'timestamp'>): Promise<void> {
  try {
    const activityWithTimestamp = {
      ...activityData,
      timestamp: FieldValue.serverTimestamp(), // Use server-side timestamp
    };

    await adminDb.collection('activity').add(activityWithTimestamp);
  } catch (error) {
    console.error('Error logging activity:', error);
    // In a real-world scenario, you might want to throw the error
    // or handle it in a more sophisticated way, like sending it to a monitoring service.
  }
}
