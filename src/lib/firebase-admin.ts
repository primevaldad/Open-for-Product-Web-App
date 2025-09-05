
import * as admin from 'firebase-admin';

const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

if (!serviceAccount) {
    throw new Error('Firebase service account key not found. Please set the FIREBASE_SERVICE_ACCOUNT_KEY environment variable.');
}

const serviceAccountJson = JSON.parse(serviceAccount);

let adminApp: admin.app.App;

if (!admin.apps.length) {
    adminApp = admin.initializeApp({
        credential: admin.credential.cert(serviceAccountJson),
    });
} else {
    adminApp = admin.app();
}

export { adminApp };
