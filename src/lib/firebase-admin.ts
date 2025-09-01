
import 'dotenv/config';
import admin from 'firebase-admin';
import { App, getApps, initializeApp, getApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// This is the recommended way to initialize the Admin SDK in a serverless environment.
// We check if the app is already initialized to prevent re-initialization.
if (!getApps().length) {
    if (process.env.SERVICE_ACCOUNT_KEY_JSON) {
        // Explicitly use the service account key if provided
        initializeApp({
            credential: admin.credential.cert(JSON.parse(process.env.SERVICE_ACCOUNT_KEY_JSON)),
        });
    } else {
        // Fallback for environments where the service account is implicitly available
        // (like Google Cloud Functions, Cloud Run, etc.)
        initializeApp();
    }
}

const db = getFirestore();

export { db };
