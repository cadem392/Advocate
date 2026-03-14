import { NextRequest, NextResponse } from "next/server";
import { getBlindSpotSignal } from "@/lib/server/model-service";
import {
  validateBlindSpotRequest,
  validationErrorResponse,
} from "@/lib/server/request-validation";

export async function POST(request: NextRequest) {
  try {
    const payload = validateBlindSpotRequest(await request.json());
    const signal = await getBlindSpotSignal(payload);
    return NextResponse.json(signal);
  } catch (error) {
    return validationErrorResponse(error, "Failed to analyze blind spot signals");
  }
}
