
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// IMPORTANT: Replace this with your actual Firebase config object
// from the Firebase console.
const firebaseConfig = {
  "projectId": "open-for-product",
  "appId": "1:36569631324:web:9cacdc439f6b8ced253499",
  "storageBucket": "open-for-product.firebasestorage.app",
  "apiKey": "AIzaSyCDRVhRRr1rZHUYqWQBzWI_EZHtZ6iWhmY",
  "authDomain": "open-for-product.firebaseapp.com",
  "measurementId": "",
  "messagingSenderId": "36569631324"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);
const auth = getAuth(app);

export { app, db, auth };
