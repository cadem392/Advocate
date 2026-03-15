import { NextRequest, NextResponse } from "next/server";
import { getAuthUid } from "@/lib/server/firebase-admin";
import { uploadCaseIntakeDocument } from "@/lib/server/firebase-storage-upload";
import {
  createCaseRecordForUser,
  listCaseRecordsForUser,
} from "@/lib/server/firestore-case-store";
import {
  validatePersistedCaseSession,
  validationErrorResponse,
} from "@/lib/server/request-validation";
import { applyRateLimit } from "@/lib/server/rate-limit";

export async function GET(request: NextRequest) {
  try {
    const uid = await getAuthUid(request);
    if (!uid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const records = await listCaseRecordsForUser(uid);
    return NextResponse.json(records);
  } catch (error) {
    console.error("List case records error:", error);
    return validationErrorResponse(error, "Failed to list case records");
  }
}

export async function POST(request: NextRequest) {
  const limited = applyRateLimit(request);
  if (limited) return limited;

  try {
    const uid = await getAuthUid(request);
    if (!uid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const payload = validatePersistedCaseSession(await request.json());
    const record = await createCaseRecordForUser(uid, payload);
    if (!record) {
      return NextResponse.json(
        {
          error:
            "Firestore write failed. Ensure (1) Firestore database is created in Firebase Console (Build → Firestore), and (2) FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL, and FIREBASE_ADMIN_PRIVATE_KEY are set in .env.local. See docs/FIREBASE-SETUP.md.",
        },
        { status: 503 }
      );
    }
    await uploadCaseIntakeDocument(uid, record.id, payload.documentText).catch(
      (err) => console.error("Upload intake document to Storage failed:", err)
    );
    return NextResponse.json(record, { status: 201 });
  } catch (error) {
    console.error("Create case record error:", error);
    return validationErrorResponse(error, "Failed to create case record");
  }
}
