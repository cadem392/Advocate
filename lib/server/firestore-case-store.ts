import crypto from "node:crypto";
import type { PersistedCaseSession, StoredCaseRecord } from "@/lib/types";
import { getAdminApp } from "./firebase-admin";

function casesCollection(uid: string) {
  const app = getAdminApp();
  if (!app) return null;
  return app.firestore().collection("users").doc(uid).collection("cases");
}

export async function createCaseRecordForUser(
  uid: string,
  payload: PersistedCaseSession
): Promise<StoredCaseRecord | null> {
  const col = casesCollection(uid);
  if (!col) return null;

  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const record: StoredCaseRecord = {
    id,
    createdAt: now,
    updatedAt: now,
    payload,
  };
  await col.doc(id).set(record);
  return record;
}

export async function getCaseRecordForUser(
  uid: string,
  caseId: string
): Promise<StoredCaseRecord | null> {
  const col = casesCollection(uid);
  if (!col) return null;

  const doc = await col.doc(caseId).get();
  if (!doc.exists) return null;
  return doc.data() as StoredCaseRecord;
}

export async function updateCaseRecordForUser(
  uid: string,
  caseId: string,
  payload: PersistedCaseSession
): Promise<StoredCaseRecord | null> {
  const col = casesCollection(uid);
  if (!col) return null;

  const ref = col.doc(caseId);
  const existing = await ref.get();
  if (!existing.exists) return null;

  const now = new Date().toISOString();
  const record: StoredCaseRecord = {
    id: caseId,
    createdAt: (existing.data() as StoredCaseRecord).createdAt,
    updatedAt: now,
    payload,
  };
  await ref.set(record);
  return record;
}

export async function listCaseRecordsForUser(
  uid: string
): Promise<StoredCaseRecord[]> {
  const col = casesCollection(uid);
  if (!col) return [];

  const snapshot = await col.get();
  const records = snapshot.docs.map((d) => d.data() as StoredCaseRecord);
  records.sort(
    (a, b) =>
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
  return records;
}
