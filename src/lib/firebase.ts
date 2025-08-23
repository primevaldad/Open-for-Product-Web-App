
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  "projectId": "open-for-product",
  "appId": "1:36569631324:web:9cacdc439f6b8ced253499",
  "storageBucket": "open-for-product.firebasestorage.app",
  "apiKey": "AIzaSyCDRVhRRr1rZHUYqWQBzWI_EZHtZ6iWhmY",
  "authDomain": "open-for-product.firebaseapp.com",
  "measurementId": "",
  "messagingSenderId": "36569631324"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

export { app, auth, googleProvider };
