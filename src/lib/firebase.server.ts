import { initializeApp, getApps, getApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

let adminApp;

try {
  if (!getApps().length) {
    const key = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

    if (key) {
      const parsedServiceAccount =
        typeof key === "string" ? JSON.parse(key) : key;

      // Fix escaped newlines
      if (parsedServiceAccount.private_key) {
        parsedServiceAccount.private_key = parsedServiceAccount.private_key.replace(/\\n/g, "\n");
        if (
          parsedServiceAccount.private_key.startsWith("[") &&
          parsedServiceAccount.private_key.endsWith("]")
        ) {
          parsedServiceAccount.private_key = parsedServiceAccount.private_key.slice(1, -1);
        }
      }

      adminApp = initializeApp({
        credential: cert(parsedServiceAccount),
        projectId: parsedServiceAccount.project_id,
      });

      console.log("--- Firebase Admin SDK Initialized ---");
      console.log(`Client Email: ${parsedServiceAccount.client_email}`);
      console.log(`Project ID: ${parsedServiceAccount.project_id}`);
      console.log("-------------------------------------");
    } else {
      console.warn("[firebase.server] Skipping Firebase Admin initialization — no FIREBASE_SERVICE_ACCOUNT_KEY set.");
    }
  } else {
    adminApp = getApp();
  }
} catch (error) {
  console.error("[firebase.server] Error initializing Firebase Admin:", error);
  adminApp = undefined;
}

// Export Firestore and Auth safely
export const adminDb = adminApp ? getFirestore(adminApp) : undefined;
export const adminAuth = adminApp ? getAuth(adminApp) : undefined;

export { adminApp };
