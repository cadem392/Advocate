import { getStorage } from "firebase-admin/storage";
import { getAdminApp } from "./firebase-admin";

/**
 * Upload the intake document (denial/EOB text) to Firebase Storage for a case.
 * Path: users/{uid}/cases/{caseId}/intake.txt
 * Does nothing if Admin or Storage bucket is not configured.
 */
export async function uploadCaseIntakeDocument(
  uid: string,
  caseId: string,
  documentText: string
): Promise<void> {
  const app = getAdminApp();
  if (!app) return;

  const bucket = getStorage(app).bucket();
  if (!bucket) return;

  const path = `users/${uid}/cases/${caseId}/intake.txt`;
  const file = bucket.file(path);

  await file.save(documentText || "(no content)", {
    contentType: "text/plain; charset=utf-8",
    metadata: {
      cacheControl: "private, max-age=31536000",
    },
  });
}
