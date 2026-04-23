import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

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
export const auth = getAuth(app);
export default app;