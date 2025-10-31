import { initializeApp, getApps, getApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

let adminApp;

try {
  if (!getApps().length) {
    if (process.env.NODE_ENV === 'production') {
      // Use default credentials provided by the App Hosting environment
      adminApp = initializeApp();
      console.log("--- Firebase Admin SDK Initialized (Production) ---");
    } else {
      // For local development, use the service account key from env variables
      const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
      if (serviceAccountKey) {
        const parsedServiceAccount = JSON.parse(serviceAccountKey);

        // The private_key needs to have newlines un-escaped
        if (parsedServiceAccount.private_key) {
          parsedServiceAccount.private_key = parsedServiceAccount.private_key.replace(/\\n/g, '\n');
        }

        adminApp = initializeApp({
          credential: cert(parsedServiceAccount),
          projectId: parsedServiceAccount.project_id,
        });
        console.log("--- Firebase Admin SDK Initialized (Development) ---");
      } else {
        console.warn("[firebase.server] Skipping Firebase Admin initialization for development — FIREBASE_SERVICE_ACCOUNT_KEY is not set.");
      }
    }
  } else {
    adminApp = getApp();
  }
} catch (error) {
  console.error("[firebase.server] Error initializing Firebase Admin:", error);
  adminApp = undefined; // Ensure app is undefined on error
}

// Safely export the initialized services
export const adminDb = adminApp ? getFirestore(adminApp) : undefined;
export const adminAuth = adminApp ? getAuth(adminApp) : undefined;

export { adminApp };
