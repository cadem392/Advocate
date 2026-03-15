import { NextRequest, NextResponse } from "next/server";
import { getAuthUid, normalizeCaseId } from "@/lib/server/firebase-admin";
import { uploadCaseIntakeDocument } from "@/lib/server/firebase-storage-upload";
import {
  getCaseRecordForUser,
  updateCaseRecordForUser,
} from "@/lib/server/firestore-case-store";
import {
  validatePersistedCaseSession,
  validationErrorResponse,
} from "@/lib/server/request-validation";
import { applyRateLimit } from "@/lib/server/rate-limit";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ caseId: string }> }
) {
  const limited = applyRateLimit(request);
  if (limited) return limited;

  try {
    const uid = await getAuthUid(request);
    if (!uid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { caseId } = await context.params;
    const safeId = normalizeCaseId(caseId);
    if (!safeId) {
      return NextResponse.json({ error: "Invalid case id" }, { status: 400 });
    }
    const record = await getCaseRecordForUser(uid, safeId);
    if (!record) {
      return NextResponse.json({ error: "Case not found" }, { status: 404 });
    }
    return NextResponse.json(record);
  } catch (error) {
    console.error("Get case record error:", error);
    return validationErrorResponse(error, "Failed to fetch case record");
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ caseId: string }> }
) {
  const limited = applyRateLimit(request);
  if (limited) return limited;

  try {
    const uid = await getAuthUid(request);
    if (!uid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { caseId } = await context.params;
    const safeId = normalizeCaseId(caseId);
    if (!safeId) {
      return NextResponse.json({ error: "Invalid case id" }, { status: 400 });
    }
    const payload = validatePersistedCaseSession(await request.json());
    const record = await updateCaseRecordForUser(uid, safeId, payload);
    if (!record) {
      return NextResponse.json({ error: "Case not found" }, { status: 404 });
    }
    await uploadCaseIntakeDocument(uid, safeId, payload.documentText).catch(
      (err) => console.error("Upload intake document to Storage failed:", err)
    );
    return NextResponse.json(record);
  } catch (error) {
    console.error("Update case record error:", error);
    return validationErrorResponse(error, "Failed to update case record");
  }
}
