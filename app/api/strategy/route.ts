import { NextRequest, NextResponse } from "next/server";
import { runStrategy } from "@/lib/server/pipeline";
import { validateStrategyRequest, validationErrorResponse } from "@/lib/server/request-validation";
import { applyRateLimit } from "@/lib/server/rate-limit";

export async function POST(request: NextRequest) {
  const limited = applyRateLimit(request);
  if (limited) return limited;

  try {
    const payload = validateStrategyRequest(await request.json());
    const tree = await runStrategy(payload);
    return NextResponse.json(tree);
  } catch (error) {
    console.error("Strategy error:", error);
    return validationErrorResponse(error, "Failed to generate strategy");
  }
}
