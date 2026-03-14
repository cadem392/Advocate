import { NextRequest, NextResponse } from "next/server";
import { runAnalyze } from "@/lib/server/pipeline";
import { validateAnalyzeRequest, validationErrorResponse } from "@/lib/server/request-validation";

export async function POST(request: NextRequest) {
  try {
    const payload = validateAnalyzeRequest(await request.json());
    const analysis = await runAnalyze(payload);
    return NextResponse.json(analysis);
  } catch (error) {
    console.error("Analysis error:", error);
    return validationErrorResponse(error, "Failed to analyze document");
  }
}
