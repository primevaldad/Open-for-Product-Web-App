
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

export { adminApp };
