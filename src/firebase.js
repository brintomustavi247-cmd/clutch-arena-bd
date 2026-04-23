import { initializeApp } from "firebase/app";
import { getAuth, setPersistence, browserLocalPersistence, onAuthStateChanged } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyADV3HOJODpgYyZfJmof16DM6T9IJ6GgBI",
  authDomain: "clutch-arena-bd.firebaseapp.com",
  projectId: "clutch-arena-bd",
  storageBucket: "clutch-arena-bd.firebasestorage.app",
  messagingSenderId: "173752162789",
  appId: "1:173752162789:web:1af9399599095de518f70c",
  measurementId: "G-4BPNGYRYM5"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// ✅ KEY FIX: Export a promise that resolves ONLY AFTER persistence is ready
// This prevents onAuthStateChanged from firing before localStorage is checked
export const firebaseReady = setPersistence(auth, browserLocalPersistence)
  .then(() => {
    console.log('[Firebase] Persistence set to LOCAL — session will survive refresh');
    return true;
  })
  .catch((err) => {
    console.error('[Firebase] Persistence failed:', err);
    return true; // still continue even if it fails
  });

export { auth, onAuthStateChanged };
export default app;