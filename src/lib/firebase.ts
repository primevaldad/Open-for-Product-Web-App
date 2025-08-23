
"use client";

import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, Auth, connectAuthEmulator } from "firebase/auth";

const firebaseConfig = {
  projectId: 'open-for-product',
  appId: '1:36569631324:web:9cacdc439f6b8ced253499',
  storageBucket: 'open-for-product.appspot.com',
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: 'open-for-product.firebaseapp.com',
  messagingSenderId: '36569631324',
};

function getFirebaseApp(): FirebaseApp {
    if (!getApps().length) {
        return initializeApp(firebaseConfig);
    }
    return getApp();
}

function getFirebaseAuth(): Auth {
    const app = getFirebaseApp();
    const auth = getAuth(app);
    if (process.env.NODE_ENV === 'development' && !(auth as any).emulatorConfig) {
        // Point to the Auth emulator running on localhost.
        // This is automatically wired up by Firebase Studio.
        connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
    }
    return auth;
}

const app = getFirebaseApp();
const auth = getFirebaseAuth();
const googleProvider = new GoogleAuthProvider();

export { app, auth, googleProvider };
