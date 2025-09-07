
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  "apiKey": "AIzaSyAz_-_rWTApPK5bJAgO93Z5SxqTVT5iDQ",
  "authDomain": "open-for-product.firebaseapp.com",
  "projectId": "open-for-product",
  "storageBucket": "open-for-product.appspot.com",
  "messagingSenderId": "36569631324",
  "appId": "1:36569631324:web:9cacdc439f6b8ced253499",
  "measurementId": "G-5G01E1N3L7"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);
const auth = getAuth(app);

export { app, db, auth };
