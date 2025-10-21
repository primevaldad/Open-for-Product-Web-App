import { initializeApp, getApps, getApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

let adminApp;

try {
  if (!getApps().length) {
    const key = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

    if (key) {
      // Safely parse only when env var exists
      const parsedServiceAccount =
        typeof key === "string" ? JSON.parse(key) : key;

      adminApp = initializeApp({
        credential: cert(parsedServiceAccount),
      });
    } else {
      // Skip Firebase Admin init if key missing (build environment, etc.)
      console.warn(
        "[firebase.server] Skipping Firebase Admin initialization — no FIREBASE_SERVICE_ACCOUNT_KEY set."
      );
    }
  } else {
    adminApp = getApp();
  }
} catch (error) {
  console.error(
    "[firebase.server] Error initializing Firebase Admin:",
    error
  );
  // Allow build to continue even if Firebase fails
  adminApp = undefined;
}

export { adminApp };

// Safe getter for auth — will throw only when accessed without proper init
export const adminAuth = adminApp ? getAuth(adminApp) : undefined;
