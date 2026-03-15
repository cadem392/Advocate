import * as admin from "firebase-admin";
import { NextRequest } from "next/server";

const SAFE_ID = /^[a-zA-Z0-9-]+$/;

function getAdminApp(): admin.app.App | null {
  if (admin.apps.length > 0) {
    return admin.app();
  }
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!projectId || !clientEmail || !privateKey) return null;
  const storageBucket =
    process.env.FIREBASE_STORAGE_BUCKET ||
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey,
      }),
      ...(storageBucket ? { storageBucket } : {}),
    });
    return admin.app();
  } catch {
    return null;
  }
}

/**
 * Verifies the Firebase ID token from Authorization: Bearer <token> and returns the uid.
 * Returns null if no token, invalid token, or Firebase Admin not configured.
 */
export async function getAuthUid(request: NextRequest): Promise<string | null> {
  const authHeader = request.headers.get("Authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) return null;
  const app = getAdminApp();
  if (!app) return null;
  try {
    const decoded = await app.auth().verifyIdToken(token);
    return decoded?.uid ?? null;
  } catch {
    return null;
  }
}

export function normalizeCaseId(caseId: string): string | null {
  return SAFE_ID.test(caseId) ? caseId : null;
}

export { getAdminApp };
