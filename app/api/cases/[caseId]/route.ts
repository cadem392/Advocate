import { NextRequest, NextResponse } from "next/server";
import { getCaseRecord, updateCaseRecord } from "@/lib/server/case-store";
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
    const { caseId } = await context.params;
    const record = await getCaseRecord(caseId);

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
    const { caseId } = await context.params;
    const payload = validatePersistedCaseSession(await request.json());
    const record = await updateCaseRecord(caseId, payload);

    if (!record) {
      return NextResponse.json({ error: "Case not found" }, { status: 404 });
    }

    return NextResponse.json(record);
  } catch (error) {
    console.error("Update case record error:", error);
    return validationErrorResponse(error, "Failed to update case record");
  }
}
