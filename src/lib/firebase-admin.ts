'use server';
import admin from 'firebase-admin';
import { App, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { credential } from 'firebase-admin';

// This is the recommended way to initialize the Admin SDK in a serverless environment.
// We check if the app is already initialized to prevent re-initialization.
if (!getApps().length) {
  if (process.env.SERVICE_ACCOUNT_KEY_JSON) {
    initializeApp({
      credential: credential.cert(JSON.parse(process.env.SERVICE_ACCOUNT_KEY_JSON)),
    });
  } else {
    // Fallback for environments where the service account is implicitly available
    initializeApp();
  }
}

const db = getFirestore();

export { db };
