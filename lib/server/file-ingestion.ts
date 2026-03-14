import { EvidenceIngestionResult } from "@/lib/types";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { ValidationError } from "@/lib/server/request-validation";

const execFileAsync = promisify(execFile);

const TEXT_EXTENSIONS = new Set([
  "txt",
  "md",
  "csv",
  "tsv",
  "json",
  "xml",
  "html",
  "htm",
  "log",
]);

function getFileExtension(fileName: string): string {
  const parts = fileName.toLowerCase().split(".");
  return parts.length > 1 ? parts[parts.length - 1] : "";
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function excerptText(value: string, maxLength = 320): string {
  const normalized = normalizeWhitespace(value);
  return normalized.length > maxLength
    ? `${normalized.slice(0, maxLength - 1).trim()}…`
    : normalized;
}

function inferCategory(fileName: string, mimeType: string, extractedText: string) {
  const lowerName = fileName.toLowerCase();
  const lowerText = extractedText.toLowerCase();
  const haystack = `${lowerName} ${lowerText}`;

  if (
    haystack.includes("mri") ||
    haystack.includes("imaging") ||
    haystack.includes("radiology") ||
    haystack.includes("scan")
  ) {
    return "Imaging";
  }
  if (
    haystack.includes("physician") ||
    haystack.includes("doctor") ||
    haystack.includes("clinical") ||
    haystack.includes("progress note")
  ) {
    return "Clinical Note";
  }
  if (
    haystack.includes("policy") ||
    haystack.includes("coverage") ||
    haystack.includes("benefit") ||
    mimeType.includes("spreadsheet")
  ) {
    return "Policy";
  }
  if (
    haystack.includes("therapy") ||
    haystack.includes("treatment") ||
    haystack.includes("pt_") ||
    haystack.includes("physical therapy")
  ) {
    return "Treatment";
  }

  return "Uploaded";
}

function decodeText(buffer: Buffer): string {
  const utf8 = buffer.toString("utf8");
  if (utf8.includes("\uFFFD")) {
    return buffer.toString("latin1");
  }
  return utf8;
}

function extractPdfText(buffer: Buffer): string {
  const raw = buffer.toString("latin1");

  const literalStrings = Array.from(raw.matchAll(/\(([^()]{8,})\)/g))
    .map((match) => match[1].replace(/\\[rn]/g, " ").replace(/\\\)/g, ")"))
    .map(normalizeWhitespace)
    .filter((chunk) => chunk.length >= 12);

  const printableChunks = Array.from(
    raw.matchAll(/[A-Za-z0-9][A-Za-z0-9 ,.;:()/%#&'"_\-]{20,}/g)
  )
    .map((match) => normalizeWhitespace(match[0]))
    .filter((chunk) => chunk.length >= 20);

  const combined = Array.from(new Set([...literalStrings, ...printableChunks])).join(" ");
  return normalizeWhitespace(combined);
}

async function extractPdfTextWithPython(buffer: Buffer): Promise<string> {
  let tempDir = "";
  try {
    tempDir = await mkdtemp(join(tmpdir(), "advocate-pdf-"));
    const pdfPath = join(tempDir, "upload.pdf");
    await writeFile(pdfPath, buffer);

    const script = `
from pypdf import PdfReader
import sys

reader = PdfReader(sys.argv[1])
parts = []
for page in reader.pages:
    text = page.extract_text() or ""
    text = text.strip()
    if text:
        parts.append(text)

print("\\n".join(parts))
`;

    const { stdout } = await execFileAsync("python3", ["-c", script, pdfPath], {
      maxBuffer: 8 * 1024 * 1024,
    });

    return normalizeWhitespace(stdout || "");
  } catch {
    return "";
  } finally {
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true }).catch(() => undefined);
    }
  }
}

export async function ingestFile(file: File): Promise<EvidenceIngestionResult> {
  const fileName = file.name;
  const mimeType = file.type || "application/octet-stream";
  const sizeBytes = file.size;
  const extension = getFileExtension(fileName);
  const warnings: string[] = [];

  if (sizeBytes > 12 * 1024 * 1024) {
    warnings.push("Large file ingested without OCR. Extracted text may be incomplete.");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  let extractedText = "";
  let ingestionStatus: EvidenceIngestionResult["ingestionStatus"] = "metadata_only";

  if (mimeType.startsWith("text/") || TEXT_EXTENSIONS.has(extension)) {
    extractedText = normalizeWhitespace(decodeText(buffer));
    ingestionStatus = "parsed_text";
  } else if (mimeType === "application/pdf" || extension === "pdf") {
    extractedText = await extractPdfTextWithPython(buffer);
    if (!extractedText) {
      extractedText = extractPdfText(buffer);
    }
    ingestionStatus = extractedText ? "parsed_pdf" : "metadata_only";
    if (extractedText.length < 50) {
      // Fix 4: stop on unreadable PDFs instead of passing empty or noisy text through the pipeline.
      throw new ValidationError(
        "We couldn't extract text from this PDF. Try copy-pasting the content as text instead.",
        422
      );
    }
  } else {
    warnings.push("This file type is stored with metadata only. OCR/office parsing is not enabled yet.");
  }

  const excerpt = extractedText
    ? excerptText(extractedText)
    : `Uploaded file ${fileName}. No extracted text available yet.`;

  return {
    fileName,
    mimeType,
    sizeBytes,
    category: inferCategory(fileName, mimeType, extractedText),
    ingestionStatus,
    extractedText,
    excerpt,
    warnings,
  };
}
