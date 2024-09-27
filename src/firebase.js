// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyATOoq0cCvvCAjv3sq1A6rfOOWT185sRKo",
  authDomain: "todo-app-a48d7.firebaseapp.com",
  projectId: "todo-app-a48d7",
  storageBucket: "todo-app-a48d7.appspot.com",
  messagingSenderId: "421384549571",
  appId: "1:421384549571:web:ca796976d66688ce3f5e76",
  measurementId: "G-H4RP6LR0R3"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };