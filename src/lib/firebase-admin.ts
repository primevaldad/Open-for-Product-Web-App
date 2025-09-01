import admin from 'firebase-admin';
import { getApps } from 'firebase-admin/app';

// This is the proper way to initialize the Admin SDK in a serverless environment.
// We check if the app is already initialized to prevent re-initialization.
if (!getApps().length) {
  admin.initializeApp();
}

const db = admin.firestore();

export { db };
