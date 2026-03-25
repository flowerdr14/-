import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Fallback configuration for AI Studio environment
// These values are taken from firebase-applet-config.json
const firebaseConfig = {
  apiKey: (import.meta as any).env.VITE_FIREBASE_API_KEY || "AIzaSyClLpxmm-CAA8-CbhDgBI5l4i5154gDO48",
  authDomain: (import.meta as any).env.VITE_FIREBASE_AUTH_DOMAIN || "total-nurse.firebaseapp.com",
  projectId: (import.meta as any).env.VITE_FIREBASE_PROJECT_ID || "total-nurse",
  storageBucket: (import.meta as any).env.VITE_FIREBASE_STORAGE_BUCKET || "total-nurse.firebasestorage.app",
  messagingSenderId: (import.meta as any).env.VITE_FIREBASE_MESSAGING_SENDER_ID || "259950983795",
  appId: (import.meta as any).env.VITE_FIREBASE_APP_ID || "1:259950983795:web:d067eb9c1db266e6d18806",
};

const dbId = (import.meta as any).env.VITE_FIREBASE_DATABASE_ID || "ai-studio-c439189c-2797-4f05-b0a0-200e22a1b70b";

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, dbId);
export const auth = getAuth(app);
