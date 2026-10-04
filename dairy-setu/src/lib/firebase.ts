import { initializeApp } from 'firebase/app';
import { browserLocalPersistence, getAuth, GoogleAuthProvider, setPersistence, signInWithPopup } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAnalytics, isSupported } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyCT8lFT4__LYJk0ymzQwtTuxheb9QdBR00",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "dairy-walla-cc77f.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "dairy-walla-cc77f",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "dairy-walla-cc77f.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "1015929968637",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:1015929968637:web:608e13879e54f5631eeb94",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-QVSQG7NGQE"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export const db = getFirestore(app);
export const storage = getStorage(app);

export const signInWithGoogle = async () => {
  return await signInWithPopup(auth, googleProvider);
};

export const analyticsPromise = isSupported().then((supported) => (supported ? getAnalytics(app) : null));

// Persist session across refresh/restart until user explicitly logs out.
void setPersistence(auth, browserLocalPersistence).catch((error) => {
  console.error('Failed to enable persistent auth session', error);
});
