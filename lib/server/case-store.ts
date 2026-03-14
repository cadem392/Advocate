import { promises as fs } from "fs";
import path from "path";
import { PersistedCaseSession, StoredCaseRecord } from "@/lib/types";

const CASE_STORE_DIR = path.join(process.cwd(), ".data", "cases");
const SAFE_CASE_ID = /^[a-zA-Z0-9-]+$/;

async function ensureStoreDir() {
  await fs.mkdir(CASE_STORE_DIR, { recursive: true });
}

function getCasePath(caseId: string) {
  return path.join(CASE_STORE_DIR, `${caseId}.json`);
}

function normalizeCaseId(caseId: string) {
  return SAFE_CASE_ID.test(caseId) ? caseId : null;
}

export async function createCaseRecord(
  payload: PersistedCaseSession
): Promise<StoredCaseRecord> {
  await ensureStoreDir();

  const timestamp = new Date().toISOString();
  const record: StoredCaseRecord = {
    id: crypto.randomUUID(),
    createdAt: timestamp,
    updatedAt: timestamp,
    payload,
  };

  await fs.writeFile(getCasePath(record.id), JSON.stringify(record, null, 2), "utf8");
  return record;
}

export async function getCaseRecord(caseId: string): Promise<StoredCaseRecord | null> {
  const safeCaseId = normalizeCaseId(caseId);
  if (!safeCaseId) return null;

  try {
    const raw = await fs.readFile(getCasePath(safeCaseId), "utf8");
    return JSON.parse(raw) as StoredCaseRecord;
  } catch {
    return null;
  }
}

export async function updateCaseRecord(
  caseId: string,
  payload: PersistedCaseSession
): Promise<StoredCaseRecord | null> {
  const safeCaseId = normalizeCaseId(caseId);
  if (!safeCaseId) return null;

  const existing = await getCaseRecord(safeCaseId);
  if (!existing) return null;

  // Bug fix: Validate payload is not null before updating record
  if (!payload) return null;

  const record: StoredCaseRecord = {
    ...existing,
    updatedAt: new Date().toISOString(),
    payload,
  };

  await fs.writeFile(getCasePath(safeCaseId), JSON.stringify(record, null, 2), "utf8");
  return record;
}
