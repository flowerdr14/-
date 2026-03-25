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

// Detailed check for missing config
const requiredKeys = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_APP_ID',
  'VITE_FIREBASE_DATABASE_ID'
];

const missingKeys = requiredKeys.filter(key => !import.meta.env[key]);

if (missingKeys.length > 0) {
  console.error('❌ Firebase configuration is incomplete!');
  console.error('Missing variables:', missingKeys.join(', '));
  console.warn('Please check your Vercel Environment Variables settings.');
}

const app = initializeApp(firebaseConfig);
// Use default database if VITE_FIREBASE_DATABASE_ID is missing, but log it
const dbId = import.meta.env.VITE_FIREBASE_DATABASE_ID;
export const db = getFirestore(app, dbId || undefined);
export const auth = getAuth(app);
