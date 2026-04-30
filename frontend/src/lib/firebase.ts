import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAk7sNQXrzE5TplyO9Y_vrSBnBHMkjmViM",
  authDomain: "proctorai-smart.firebaseapp.com",
  projectId: "proctorai-smart",
  storageBucket: "proctorai-smart.firebasestorage.app",
  messagingSenderId: "827348507822",
  appId: "1:827348507822:web:14df996243def3fc1aa13f",
  measurementId: "G-3W49XK9KHE"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const analytics = typeof window !== "undefined" ? getAnalytics(app) : null;
export const auth = getAuth(app);
export const db = getFirestore(app);