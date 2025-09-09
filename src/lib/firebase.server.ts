import 'server-only';
import admin from 'firebase-admin';
import { getApps, initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
if (!serviceAccountKey) {
    throw new Error('The FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not set.');
}

// Initialize the admin app if it doesn't already exist
const adminApp = !getApps().length
    ? initializeApp({
        credential: cert(JSON.parse(serviceAccountKey))
      })
    : getApps()[0];

// Initialize and export the admin Firestore instance for server-side data access
const adminDb = getFirestore(adminApp);

export { adminApp, adminDb };
