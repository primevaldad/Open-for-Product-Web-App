
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

let app: FirebaseApp;
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

// In development, connect to the emulator
if (process.env.NODE_ENV === 'development') {
    // This is a check to prevent HMR from re-running this
    if (!('_emulatorConnected' in auth)) {
        connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
        (auth as any)._emulatorConnected = true;
    }
}


export { app, auth, googleProvider };
