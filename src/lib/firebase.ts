// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  projectId: "open-for-product",
  appId: "1:927572713425:web:169d3f1c84f46ebb87f804",
  storageBucket: "open-for-product.appspot.com",
  apiKey: "API_KEY_REDACTED",
  authDomain: "open-for-product.firebaseapp.com",
  messagingSenderId: "927572713425",
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);


export { app, db };
