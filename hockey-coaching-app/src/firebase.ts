import { initializeApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getAnalytics } from 'firebase/analytics';

// Firebase configuration
// TODO: Replace with your actual Firebase project configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "demo-api-key",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "hockey-coaching-demo.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "hockey-coaching-demo",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "hockey-coaching-demo.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "123456789012",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:123456789012:web:abcdef123456",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-ABCDEF1234"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore
export const db = getFirestore(app);

// Initialize Auth
export const auth = getAuth(app);

// Initialize Analytics (optional, only in production)
export const analytics = typeof window !== 'undefined' && import.meta.env.PROD 
  ? getAnalytics(app) 
  : null;

// Connect to emulators in development ONLY if explicitly enabled
if (import.meta.env.DEV && import.meta.env.VITE_USE_EMULATOR === 'true' && typeof window !== 'undefined') {
  // Only connect to emulators if not already connected
  try {
    connectFirestoreEmulator(db, 'localhost', 8080);
    console.log('🔥 Connected to Firestore emulator');
  } catch (error) {
    console.log('🔥 Firestore emulator already connected or not available');
  }
  
  try {
    connectAuthEmulator(auth, 'http://localhost:9099');
    console.log('🔑 Connected to Auth emulator');
  } catch (error) {
    console.log('🔑 Auth emulator already connected or not available');
  }
}

export default app;