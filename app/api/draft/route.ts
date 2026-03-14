import { NextRequest, NextResponse } from "next/server";
import { runDraft } from "@/lib/server/pipeline";
import { validateDraftRequest, validationErrorResponse } from "@/lib/server/request-validation";

export async function POST(request: NextRequest) {
  try {
    const payload = validateDraftRequest(await request.json());
    const draft = await runDraft(payload);
    return NextResponse.json(draft);
  } catch (error) {
    console.error("Draft error:", error);
    return validationErrorResponse(error, "Failed to generate draft");
  }
}
