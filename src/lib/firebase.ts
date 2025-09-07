
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// IMPORTANT: Replace this with your actual Firebase config object
// from the Firebase console.
const firebaseConfig = {
  "projectId": "open-for-product",
  "appId": "1:36569631324:web:9cacdc439f6b8ced253499",
  "storageBucket": "open-for-product.appspot.com",
  "apiKey": "AIzaSyAz_-_rWTApPK5bJAgO93Z5SxqTVT5iDQ",
  "authDomain": "open-for-product.firebaseapp.com",
  "measurementId": "G-5G01E1N3L7",
  "messagingSenderId": "36569631324"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);
const auth = getAuth(app);

export { app, db, auth };
