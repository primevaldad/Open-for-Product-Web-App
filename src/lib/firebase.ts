
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyAz_-_rWTApPK5bJAgO93Z5SxqTVT5iDQ",
  authDomain: "open-for-product.firebaseapp.com",
  projectId: "open-for-product",
  storageBucket: "open-for-product.appspot.com",
  messagingSenderId: "9120564014",
  appId: "1:9120564014:web:8f19e6fb022e3f53856d95",
  measurementId: "G-13FEN04DFF"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);
const auth = getAuth(app);

export { app, db, auth };
