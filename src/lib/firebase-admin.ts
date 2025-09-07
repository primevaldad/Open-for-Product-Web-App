
'use server';

import { cert, getApp, getApps, initializeApp, type ServiceAccount } from 'firebase-admin/app';
import serviceAccountJson from '@/lib/serviceAccountKey.json';

let adminApp;

if (!getApps().length) {
    const serviceAccount = serviceAccountJson as ServiceAccount;
    adminApp = initializeApp({
        credential: cert(serviceAccount),
    });
} else {
  adminApp = getApp();
}

// Do not export adminAuth directly.
// Instead, other server actions will import adminApp and call getAuth(adminApp).
export { adminApp };
