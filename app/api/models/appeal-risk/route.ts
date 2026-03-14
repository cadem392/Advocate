import { NextRequest, NextResponse } from "next/server";
import { getAppealRiskScore } from "@/lib/server/model-service";

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    // Bug fix: Validate payload is a non-empty object before passing to model service
    if (!payload || typeof payload !== "object") {
      return NextResponse.json(
        { error: "Request body must be a valid JSON object" },
        { status: 400 }
      );
    }
    const score = await getAppealRiskScore(payload);
    return NextResponse.json(score);
  } catch (error) {
    console.error("Appeal risk scoring error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to score appeal risk" },
      { status: 500 }
    );
  }
}
