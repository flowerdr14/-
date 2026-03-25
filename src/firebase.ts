import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Use environment variables for Firebase configuration
// These are configured in the AI Studio UI Settings panel or Vercel Environment Variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Check if critical config is missing
const isConfigMissing = !firebaseConfig.apiKey || !firebaseConfig.projectId || !firebaseConfig.appId;

if (isConfigMissing) {
  console.error('Firebase configuration is missing! Please set VITE_FIREBASE_* environment variables.');
}

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, import.meta.env.VITE_FIREBASE_DATABASE_ID);
export const auth = getAuth(app);
