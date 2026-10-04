import { initializeApp } from 'firebase/app';
import { browserLocalPersistence, getAuth, getRedirectResult, GoogleAuthProvider, setPersistence, signInWithPopup, signInWithRedirect } from 'firebase/auth';
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

const isMobileBrowser = () => {
  if (typeof window === 'undefined') return false;
  const ua = window.navigator.userAgent || '';
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile/i.test(ua);
};

export const signInWithGoogle = async () => {
  if (isMobileBrowser()) {
    console.log('Mobile device detected, using signInWithRedirect for mobile COOP safety');
    await signInWithRedirect(auth, googleProvider);
    return null;
  }

  try {
    const res = await signInWithPopup(auth, googleProvider);
    return res.user;
  } catch (err: any) {
    console.warn('signInWithPopup failed, falling back to signInWithRedirect:', err);
    if (
      err?.code === 'auth/popup-blocked' ||
      err?.code === 'auth/popup-closed-by-user' ||
      err?.code === 'auth/cancelled-popup-request' ||
      err?.message?.includes('cross origin') ||
      err?.message?.includes('closed')
    ) {
      await signInWithRedirect(auth, googleProvider);
      return null;
    }
    throw err;
  }
};

export { getRedirectResult };

export const analyticsPromise = isSupported().then((supported) => (supported ? getAnalytics(app) : null));

// Persist session across refresh/restart until user explicitly logs out.
void setPersistence(auth, browserLocalPersistence).catch((error) => {
  console.error('Failed to enable persistent auth session', error);
});
