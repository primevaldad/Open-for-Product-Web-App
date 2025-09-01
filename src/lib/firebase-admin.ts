import admin from 'firebase-admin';
import { App, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// This is the proper way to initialize the Admin SDK in a serverless environment.
// We use a function to ensure it's initialized only once.
function getAdminApp(): App {
  if (getApps().length > 0) {
    return getApps()[0];
  }

  // When running in a Google Cloud environment like App Hosting,
  // the SDK automatically uses the environment's service account for credentials.
  return initializeApp();
}

const db = getFirestore(getAdminApp());

export { db };
