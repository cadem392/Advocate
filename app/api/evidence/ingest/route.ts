import { NextRequest, NextResponse } from "next/server";
import { ingestFile } from "@/lib/server/file-ingestion";
import { ValidationError } from "@/lib/server/request-validation";
import { applyRateLimit } from "@/lib/server/rate-limit";

export async function POST(request: NextRequest) {
  const limited = applyRateLimit(request);
  if (limited) return limited;

  try {
    const formData = await request.formData();
    const uploaded = formData.get("file");

    if (!(uploaded instanceof File)) {
      return NextResponse.json({ error: "File is required" }, { status: 400 });
    }

    const result = await ingestFile(uploaded);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Evidence ingestion error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to ingest evidence file",
      },
      { status: error instanceof ValidationError ? error.status : 500 }
    );
  }
}
