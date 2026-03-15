import { NextRequest, NextResponse } from "next/server";
import { runCaseReanalysis } from "@/lib/server/pipeline";
import {
  validateCaseReanalysisRequest,
  validationErrorResponse,
} from "@/lib/server/request-validation";
import { applyRateLimit } from "@/lib/server/rate-limit";

export async function POST(request: NextRequest) {
  const limited = applyRateLimit(request);
  if (limited) return limited;

  try {
    const payload = validateCaseReanalysisRequest(await request.json());
    const result = await runCaseReanalysis(payload);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Case reanalysis error:", error);
    return validationErrorResponse(error, "Failed to reanalyze case with uploaded evidence");
  }
}
