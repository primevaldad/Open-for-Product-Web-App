'use server';

import * as admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';

let adminApp: admin.app.App;

if (!admin.apps.length) {
    try {
        // Resolve the path to be absolute from the project root
        const serviceAccountPath = path.resolve('src/lib/serviceAccountKey.json');
        const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

        adminApp = admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
        });
    } catch (e) {
        console.error("Error initializing Firebase Admin SDK:", e);
        throw new Error('Failed to initialize Firebase Admin SDK. Make sure the serviceAccountKey.json file is correctly placed and formatted.');
    }
} else {
  adminApp = admin.app();
}

export { adminApp };
