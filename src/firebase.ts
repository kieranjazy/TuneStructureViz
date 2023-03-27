// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyC9YyMBG_qLhgjwgkaN9aX2ATSNMDne-28",
  authDomain: "fyproject-98a82.firebaseapp.com",
  projectId: "fyproject-98a82",
  storageBucket: "fyproject-98a82.appspot.com",
  messagingSenderId: "170574439723",
  appId: "1:170574439723:web:6ae3381c50290dd7de116e"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
