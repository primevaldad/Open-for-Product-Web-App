
'use server';

import { cert, getApp, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import type { ServiceAccount } from 'firebase-admin';
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

const adminAuth = getAuth(adminApp);

export { adminApp, adminAuth };
