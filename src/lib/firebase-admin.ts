
'use server';

import * as admin from 'firebase-admin';
import type { ServiceAccount } from 'firebase-admin';

// Using a direct JSON import is the most robust method for Next.js.
// The bundler includes the JSON content at build time, avoiding runtime file path issues.
import serviceAccountJson from '@/lib/serviceAccountKey.json';

let adminApp: admin.app.App;

if (!admin.apps.length) {
    // The imported JSON needs to be cast to the ServiceAccount type
    const serviceAccount = serviceAccountJson as ServiceAccount;

    adminApp = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
    });
} else {
  adminApp = admin.app();
}

export { adminApp };
