
'use server';

import * as admin from 'firebase-admin';

// The path is relative to the root of the project where the app is running.
const serviceAccount = require('./serviceAccountKey.json');

let adminApp: admin.app.App;

if (!admin.apps.length) {
  adminApp = admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
} else {
  adminApp = admin.app();
}

export { adminApp };
