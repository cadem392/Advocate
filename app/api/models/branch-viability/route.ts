import { NextRequest, NextResponse } from "next/server";
import { getBranchViability } from "@/lib/server/model-service";
import {
  validateBranchViabilityRequest,
  validationErrorResponse,
} from "@/lib/server/request-validation";
import { applyRateLimit } from "@/lib/server/rate-limit";

export async function POST(request: NextRequest) {
  const limited = applyRateLimit(request);
  if (limited) return limited;

  try {
    const payload = validateBranchViabilityRequest(await request.json());
    const score = await getBranchViability(payload);
    return NextResponse.json(score);
  } catch (error) {
    return validationErrorResponse(error, "Failed to score branch viability");
  }
}
