import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyA-YR3776Cb_PtniqOqsmfLd9wJA613UUU",
  authDomain: "dyslexia-aid-cf2f7.firebaseapp.com",
  projectId: "dyslexia-aid-cf2f7",
  storageBucket: "dyslexia-aid-cf2f7.firebasestorage.app",
  messagingSenderId: "264516753139",
  appId: "1:264516753139:web:b3b96086bc82f65c380986",
  measurementId: "G-MBBND0SR6J"
};

const app = initializeApp(firebaseConfig);
export const analytics = getAnalytics(app);
export const auth = getAuth(app);
export const db = getFirestore(app);
