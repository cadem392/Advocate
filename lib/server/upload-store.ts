import crypto from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

const UPLOAD_STORE_DIR = path.join(process.cwd(), ".data", "uploads");
const SAFE_FILE_ID = /^[a-f0-9-]+$/i;

interface StoredUploadMeta {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
}

function metaPath(fileId: string) {
  return path.join(UPLOAD_STORE_DIR, `${fileId}.json`);
}

function blobPath(fileId: string) {
  return path.join(UPLOAD_STORE_DIR, `${fileId}.bin`);
}

async function ensureUploadStoreDir() {
  await fs.mkdir(UPLOAD_STORE_DIR, { recursive: true });
}

function normalizeFileId(fileId: string) {
  return SAFE_FILE_ID.test(fileId) ? fileId : null;
}

async function writeAtomically(filePath: string, contents: Buffer | string) {
  const tempPath = `${filePath}.tmp`;
  await fs.writeFile(tempPath, contents);
  await fs.rename(tempPath, filePath);
}

export async function persistUploadedFile(params: {
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  buffer: Buffer;
}) {
  await ensureUploadStoreDir();

  const id = crypto.randomUUID();
  const meta: StoredUploadMeta = {
    id,
    fileName: params.fileName,
    mimeType: params.mimeType,
    sizeBytes: params.sizeBytes,
    createdAt: new Date().toISOString(),
  };

  // Keep the upload durable enough for inline preview and route changes.
  await writeAtomically(blobPath(id), params.buffer);
  await writeAtomically(metaPath(id), JSON.stringify(meta, null, 2));

  return {
    storedFileId: id,
    previewUrl: `/api/evidence/files/${id}`,
  };
}

export async function loadUploadedFile(fileId: string) {
  const safeFileId = normalizeFileId(fileId);
  if (!safeFileId) return null;

  try {
    const [rawMeta, rawBuffer] = await Promise.all([
      fs.readFile(metaPath(safeFileId), "utf8"),
      fs.readFile(blobPath(safeFileId)),
    ]);

    return {
      meta: JSON.parse(rawMeta) as StoredUploadMeta,
      buffer: rawBuffer,
    };
  } catch {
    return null;
  }
}
