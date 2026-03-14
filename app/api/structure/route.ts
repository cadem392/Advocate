import { NextRequest, NextResponse } from "next/server";
import { runStructure } from "@/lib/server/pipeline";
import { validateStructureRequest, validationErrorResponse } from "@/lib/server/request-validation";

export async function POST(request: NextRequest) {
  try {
    const payload = validateStructureRequest(await request.json());
    const facts = await runStructure(payload);
    return NextResponse.json(facts);
  } catch (error) {
    console.error("Structure error:", error);
    return validationErrorResponse(error, "Failed to structure document");
  }
}
