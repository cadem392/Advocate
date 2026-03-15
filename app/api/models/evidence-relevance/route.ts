import { NextRequest, NextResponse } from "next/server";
import { getEvidenceRelevanceScore } from "@/lib/server/model-service";
import {
  validateEvidenceRelevanceRequest,
  validationErrorResponse,
} from "@/lib/server/request-validation";
import { applyRateLimit } from "@/lib/server/rate-limit";

export async function POST(request: NextRequest) {
  const limited = applyRateLimit(request);
  if (limited) return limited;

  try {
    const payload = validateEvidenceRelevanceRequest(await request.json());
    const score = await getEvidenceRelevanceScore(payload);
    return NextResponse.json(score);
  } catch (error) {
    console.error("Evidence relevance error:", error);
    return validationErrorResponse(error, "Failed to score evidence");
  }
}
