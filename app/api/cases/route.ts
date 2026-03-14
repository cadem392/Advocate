import { NextRequest, NextResponse } from "next/server";
import { createCaseRecord } from "@/lib/server/case-store";
import {
  validatePersistedCaseSession,
  validationErrorResponse,
} from "@/lib/server/request-validation";
import { applyRateLimit } from "@/lib/server/rate-limit";

export async function POST(request: NextRequest) {
  const limited = applyRateLimit(request);
  if (limited) return limited;

  try {
    const payload = validatePersistedCaseSession(await request.json());
    const record = await createCaseRecord(payload);
    return NextResponse.json(record, { status: 201 });
  } catch (error) {
    console.error("Create case record error:", error);
    return validationErrorResponse(error, "Failed to create case record");
  }
}
