
import * as admin from 'firebase-admin';
import dotenv from 'dotenv';

dotenv.config();

const serviceAccount = process.env.SERVICE_ACCOUNT_KEY_JSON;

if (!serviceAccount) {
    throw new Error('Firebase service account key not found. Please set the SERVICE_ACCOUNT_KEY_JSON environment variable.');
}

let serviceAccountJson;
try {
    serviceAccountJson = JSON.parse(serviceAccount);
} catch (e) {
    console.error("Error parsing Firebase service account key:", e);
    throw new Error('Failed to parse Firebase service account key. Make sure it is a valid JSON string in your .env file.');
}


let adminApp: admin.app.App;

if (!admin.apps.length) {
    adminApp = admin.initializeApp({
        credential: admin.credential.cert(serviceAccountJson),
    });
} else {
    adminApp = admin.app();
}

export { adminApp };
