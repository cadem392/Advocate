import { NextRequest, NextResponse } from "next/server";
import { loadUploadedFile } from "@/lib/server/upload-store";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
) {
  const { fileId } = await params;
  const stored = await loadUploadedFile(fileId);

  if (!stored) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  const encodedName = encodeURIComponent(stored.meta.fileName);

  return new NextResponse(stored.buffer, {
    headers: {
      "Content-Type": stored.meta.mimeType || "application/octet-stream",
      "Content-Length": String(stored.buffer.byteLength),
      "Cache-Control": "private, max-age=3600",
      "Content-Disposition": `inline; filename*=UTF-8''${encodedName}`,
    },
  });
}
