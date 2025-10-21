import 'server-only';
import fs from 'fs';
import { getApps, initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// --- Load and parse the service account key ---
const keyEnv = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
if (!keyEnv) {
  throw new Error('The FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not set.');
}

let parsedServiceAccount: Record<string, any>;

try {
  if (fs.existsSync(keyEnv)) {
    // Case 1: FIREBASE_SERVICE_ACCOUNT_KEY points to a file path
    parsedServiceAccount = JSON.parse(fs.readFileSync(keyEnv, 'utf8'));
  } else {
    // Case 2: FIREBASE_SERVICE_ACCOUNT_KEY contains JSON content
    parsedServiceAccount = JSON.parse(keyEnv);
  }
} catch (err) {
  console.error('Error parsing FIREBASE_SERVICE_ACCOUNT_KEY:', err);
  throw new Error('Invalid FIREBASE_SERVICE_ACCOUNT_KEY format.');
}

// --- Normalize private key format ---
if (parsedServiceAccount.private_key) {
  let privateKey = parsedServiceAccount.private_key.replace(/\\n/g, '\n');

  // Remove stray brackets or quotes, just in case
  if (privateKey.startsWith('[') && privateKey.endsWith(']')) {
    privateKey = privateKey.slice(1, -1);
  }
  parsedServiceAccount.private_key = privateKey;
}

// --- Load project ID ---
const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
if (!projectId) {
  throw new Error('The NEXT_PUBLIC_FIREBASE_PROJECT_ID environment variable is not set.');
}

// --- Diagnostics for CI/CD logs (safe info only) ---
console.log('--- Firebase Admin SDK Initialization ---');
console.log(`Initializing with service account: ${parsedServiceAccount.client_email || 'unknown'}`);
console.log(`Using Project ID: ${projectId}`);
console.log('------------------------------------');

// --- Initialize Firebase Admin ---
const adminApp = !getApps().length
  ? initializeApp({
      credential: cert(parsedServiceAccount),
      projectId,
    })
  : getApps()[0];

export const adminDb = getFirestore(adminApp);
export { adminApp };
