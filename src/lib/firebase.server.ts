
import 'server-only';
import { getApps, initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
if (!serviceAccountKey) {
    throw new Error('The FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not set.');
}

// Get the project ID from the environment variables
const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
if (!projectId) {
    throw new Error('The NEXT_PUBLIC_FIREBASE_PROJECT_ID environment variable is not set.');
}

// Parse the service account key
const parsedServiceAccount = JSON.parse(serviceAccountKey);

// This is a common workaround for environments that don't handle multiline
// environment variables well. The private key from the service account JSON
// often gets its newline characters escaped (e.g., `\n` becomes `\\n`). 
// This replaces the escaped newlines with actual newlines, ensuring the PEM 
// key is formatted correctly for the Firebase Admin SDK.
if (parsedServiceAccount.private_key) {
    // Fix for escaped newlines
    let privateKey = parsedServiceAccount.private_key.replace(/\\n/g, '\n');
    
    // Fix for erroneous brackets surrounding the key
    if (privateKey.startsWith('[') && privateKey.endsWith(']')) {
        privateKey = privateKey.substring(1, privateKey.length - 1);
    }
    
    parsedServiceAccount.private_key = privateKey;
}


// --- DIAGNOSTIC LOG ---
// This will print the email of the service account being used to the server console on startup.
console.log('--- Firebase Admin SDK Initialization ---');
console.log(`Initializing with service account: ${parsedServiceAccount.client_email}`);
console.log(`Using Project ID: ${projectId}`);
console.log('------------------------------------');


// Initialize the admin app if it doesn't already exist
const adminApp = !getApps().length
    ? initializeApp({
        credential: cert(parsedServiceAccount),
        projectId: projectId,
      })
    : getApps()[0];

// Initialize and export the admin Firestore instance for server-side data access
const adminDb = getFirestore(adminApp);

export { adminApp, adminDb };
