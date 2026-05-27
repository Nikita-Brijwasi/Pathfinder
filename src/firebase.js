// src/firebase.js
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { GoogleAuthProvider } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyAP9QY0B_R_lhgFEdQQz1bLVcYdY28-bVY",
  authDomain: "pathfinder-a98bd.firebaseapp.com",
  projectId: "pathfinder-a98bd",
  storageBucket: "pathfinder-a98bd.firebasestorage.app",
  messagingSenderId: "87130017761",
  appId: "1:87130017761:web:141be70519814202e84ca0"
};


// Initialize Firebase
const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const appId = 'pathfinder-ai-local'; // Or your specific ID
export const googleProvider = new GoogleAuthProvider();

export default app;