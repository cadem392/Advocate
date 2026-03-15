"use client";

import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getStorage, type FirebaseStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export function isFirebaseAuthConfigured() {
  // Keep auth optional in local/demo environments unless the Firebase client config is actually present.
  return Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);
}

function getFirebaseApp(): FirebaseApp | null {
  if (typeof window === "undefined") return null;
  if (getApps().length > 0) return getApp();
  if (!isFirebaseAuthConfigured()) return null;
  return initializeApp(firebaseConfig);
}

export function getFirebaseAuth(): Auth | null {
  const app = getFirebaseApp();
  return app ? getAuth(app) : null;
}

/** Firebase Storage for user uploads (e.g. evidence files). Case + attack tree data are stored in Firestore. */
export function getFirebaseStorage(): FirebaseStorage | null {
  const app = getFirebaseApp();
  return app && firebaseConfig.storageBucket ? getStorage(app) : null;
}
