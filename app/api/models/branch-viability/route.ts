import { NextRequest, NextResponse } from "next/server";
import { getBranchViability } from "@/lib/server/model-service";
import {
  validateBranchViabilityRequest,
  validationErrorResponse,
} from "@/lib/server/request-validation";

export async function POST(request: NextRequest) {
  try {
    const payload = validateBranchViabilityRequest(await request.json());
    const score = await getBranchViability(payload);
    return NextResponse.json(score);
  } catch (error) {
    return validationErrorResponse(error, "Failed to score branch viability");
  }
}
