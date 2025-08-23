
import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, Auth } from "firebase/auth";

const firebaseConfig = {
  projectId: 'open-for-product',
  appId: '1:36569631324:web:9cacdc439f6b8ced253499',
  storageBucket: 'open-for-product.appspot.com',
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyCDRVhRRr1rZHUYqWQBzWI_EZHtZ6iWhmY",
  authDomain: 'open-for-product.firebaseapp.com',
  messagingSenderId: '36569631324',
};


// Initialize Firebase
const app: FirebaseApp = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth: Auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

export { app, auth, googleProvider };
