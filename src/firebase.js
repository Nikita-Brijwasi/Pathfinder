// src/firebase.js
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { GoogleAuthProvider } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyAwdpV5C72IynDkZ5oFPsiO5KUqcFZEjUE",
  authDomain: "sandbox-pathfinder.firebaseapp.com",
  projectId: "sandbox-pathfinder",
  storageBucket: "sandbox-pathfinder.firebasestorage.app",
  messagingSenderId: "1095126790201",
  appId: "1:1095126790201:web:796f29725e8c6adcf31de8",
  measurementId: "G-DQKQPMEJ16"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const appId = 'pathfinder-ai-local'; // Or your specific ID
export const googleProvider = new GoogleAuthProvider();

export default app;