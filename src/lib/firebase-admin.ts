
import admin from 'firebase-admin';
import { App, getApps, initializeApp, getApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// This is the recommended way to initialize the Admin SDK in a serverless environment.
// We check if the app is already initialized to prevent re-initialization.
if (!getApps().length) {
    initializeApp();
}

const db = getFirestore();

export { db };
