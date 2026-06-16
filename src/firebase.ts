import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyDGEzE6Ra2xCmf6XrdMpS64Tj1TisglK5s",
  authDomain: "student-id-card-a5e40.firebaseapp.com",
  projectId: "student-id-card-a5e40",
  storageBucket: "student-id-card-a5e40.firebasestorage.app",
  messagingSenderId: "659474642829",
  appId: "1:659474642829:web:f46bff918d6d46ac18efc4",
  measurementId: "G-MBR2T4W8P0"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;
