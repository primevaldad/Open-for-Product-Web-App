
import 'server-only';
import { getApps, initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
if (!serviceAccountKey) {
    throw new Error('The FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not set.');
}

// Parse the service account key to inspect its contents
const parsedServiceAccount = JSON.parse(serviceAccountKey);

// --- DIAGNOSTIC LOG ---
// This will print the email of the service account being used to the server console on startup.
console.log('--- Firebase Admin SDK Initialization ---');
console.log(`Initializing with service account: ${parsedServiceAccount.client_email}`);
console.log('------------------------------------');


// Initialize the admin app if it doesn't already exist
const adminApp = !getApps().length
    ? initializeApp({
        credential: cert(parsedServiceAccount)
      })
    : getApps()[0];

// Initialize and export the admin Firestore instance for server-side data access
const adminDb = getFirestore(adminApp);

export { adminApp, adminDb };
