
import * as admin from 'firebase-admin';

const serviceAccount = process.env.SERVICE_ACCOUNT_KEY_JSON;

if (!serviceAccount) {
    throw new Error('Firebase service account key not found. Please set the SERVICE_ACCOUNT_KEY_JSON environment variable.');
}

let serviceAccountJson;
try {
    serviceAccountJson = JSON.parse(serviceAccount);
} catch (e) {
    throw new Error('Failed to parse Firebase service account key. Make sure it is a valid JSON string.');
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
