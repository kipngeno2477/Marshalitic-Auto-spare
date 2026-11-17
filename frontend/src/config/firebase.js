// Firebase Configuration & Initialization
import { initializeApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAPeq4sRYEjEi-LF05_Fs3IgjAZY6mCHQU",
  authDomain: "marshalitic-auto-spare.firebaseapp.com",
  databaseURL: "https://marshalitic-auto-spare-default-rtdb.firebaseio.com",
  projectId: "marshalitic-auto-spare",
  storageBucket: "marshalitic-auto-spare.firebasestorage.app",
  messagingSenderId: "1016081506144",
  appId: "1:1016081506144:web:b844b9a9e88ca9cf240805",
  measurementId: "G-ENHL5SJZWY"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Analytics conditionally (safeguards SSR / unsupported environments)
let analytics = null;
if (typeof window !== "undefined") {
  isSupported().then((supported) => {
    if (supported) {
      analytics = getAnalytics(app);
      console.log("🔥 Firebase & Analytics successfully initialized for Mashalitic Auto Spares");
    }
  }).catch((err) => {
    console.warn("Firebase Analytics not supported in this environment:", err);
  });
}

export { app, analytics, firebaseConfig };
export default app;
