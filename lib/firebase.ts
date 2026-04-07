import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";
import { getAnalytics, isSupported } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyDIap1oxxv1QNcPF7EGCwsF3bIoJLufOwk",
  authDomain: "webtest-5c188.firebaseapp.com",
  projectId: "webtest-5c188",
  storageBucket: "webtest-5c188.firebasestorage.app",
  messagingSenderId: "329177730186",
  appId: "1:329177730186:web:4346b72904fbeb6d7f3173",
  measurementId: "G-ZBMEE6ZXP0"
};

const app: FirebaseApp =
  getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const auth: Auth = getAuth(app);
export const db: Firestore = getFirestore(app);

if (typeof window !== "undefined") {
  isSupported().then((supported) => {
    if (supported) getAnalytics(app);
  });
}
