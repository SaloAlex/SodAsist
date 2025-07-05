import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';

const firebaseConfig = {
  apiKey: "AIzaSyBdegSq9AF9MWRaf2uxauAoja4VWb1lvOE",
  authDomain: "sodapp-5cb8a.firebaseapp.com",
  projectId: "sodapp-5cb8a",
  storageBucket: "sodapp-5cb8a.firebasestorage.app",
  messagingSenderId: "609019767047",
  appId: "1:609019767047:web:54d2877758ecb300e73da2",
  measurementId: "G-NSJ9DZDDQK"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const auth = getAuth();
export const db = getFirestore();
export const functions = getFunctions();

export default app;