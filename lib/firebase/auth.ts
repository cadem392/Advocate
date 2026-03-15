"use client";

import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from "firebase/auth";
import type { Auth } from "firebase/auth";
import { getFirebaseAuth, isFirebaseAuthConfigured } from "./client";

export { getFirebaseAuth };
export { isFirebaseAuthConfigured };
export { signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, signOut };
export type { Auth };
