import { NextRequest, NextResponse } from "next/server";
import { ingestFile } from "@/lib/server/file-ingestion";

export async function POST(request: NextRequest) {
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
      { status: 500 }
    );
  }
}
