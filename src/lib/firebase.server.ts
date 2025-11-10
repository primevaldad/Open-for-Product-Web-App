import * as admin from 'firebase-admin';
import { getApps } from 'firebase-admin/app';

function getServiceAccount() {
  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!serviceAccountKey) {
    console.warn('FIREBASE_SERVICE_ACCOUNT_KEY not found. Relying on default credentials. This is expected in a GCP environment.');
    return undefined;
  }
  try {
    // Ensure the private key is formatted correctly
    const parsedKey = JSON.parse(serviceAccountKey);
    parsedKey.private_key = parsedKey.private_key.replace(/\\n/g, '\n');
    return parsedKey;
  } catch (e) {
    console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY. Make sure it is a valid JSON string.', e);
    return undefined;
  }
}

const serviceAccount = getServiceAccount();

if (!getApps().length) {
  admin.initializeApp({
    credential: serviceAccount ? admin.credential.cert(serviceAccount) : undefined,
    databaseURL: `https://${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'open-for-product'}.firebaseio.com`,
  });
}

const adminDb = admin.firestore();
const adminAuth = admin.auth();

export { adminDb, adminAuth };
