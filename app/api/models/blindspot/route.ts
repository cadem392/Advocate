import { NextRequest, NextResponse } from "next/server";
import { getBlindSpotSignal } from "@/lib/server/model-service";
import {
  validateBlindSpotRequest,
  validationErrorResponse,
} from "@/lib/server/request-validation";
import { applyRateLimit } from "@/lib/server/rate-limit";

export async function POST(request: NextRequest) {
  const limited = applyRateLimit(request);
  if (limited) return limited;

  try {
    const payload = validateBlindSpotRequest(await request.json());
    const signal = await getBlindSpotSignal(payload);
    return NextResponse.json(signal);
  } catch (error) {
    return validationErrorResponse(error, "Failed to analyze blind spot signals");
  }
}
