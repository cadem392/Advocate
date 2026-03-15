import { NextRequest, NextResponse } from "next/server";
import { runDraft } from "@/lib/server/pipeline";
import { validateDraftRequest, validationErrorResponse } from "@/lib/server/request-validation";
import { applyRateLimit } from "@/lib/server/rate-limit";

export async function POST(request: NextRequest) {
  const limited = applyRateLimit(request);
  if (limited) return limited;

  try {
    const payload = validateDraftRequest(await request.json());
    const draft = await runDraft(payload);
    return NextResponse.json(draft);
  } catch (error) {
    console.error("Draft error:", error);
    return validationErrorResponse(error, "Failed to generate draft");
  }
}
