import {
  AnalysisResult,
  AttackTree,
  DraftDocument,
  EvidenceItem,
  PipelineProgress,
  StructuredFacts,
} from "@/lib/types";
import {
  SAMPLE_ANALYSIS,
  SAMPLE_ATTACK_TREE,
  SAMPLE_DRAFT,
  SAMPLE_EOB,
  SAMPLE_STRUCTURED_FACTS,
} from "@/lib/sample-data";

const CASE_SESSION_KEY = "advocate.case-session.v1";
const CASE_NOTICE_KEY = "advocate.case-session-notice.v1";
const CASE_PIPELINE_PROGRESS_KEY = "advocate.case-pipeline-progress.v1";

export interface VaultDocument {
  id: string;
  name: string;
  meta: string;
  category: string;
  snippet: string;
  extractedText?: string;
  ingestionStatus?: "parsed_text" | "parsed_pdf" | "metadata_only";
  ingestionWarnings?: string[];
  sourceType: EvidenceItem["sourceType"] | "uploaded_file";
  relevanceScore: number;
  scoreSource?: "model_service" | "heuristic";
  scoreConfidence?: number;
  scoreReasoning?: string;
  verified: boolean;
  linked: boolean;
  missing: boolean;
}

export interface DraftEditorState {
  content: string;
  lastSavedAt?: string;
}

export interface SubmissionState {
  method: "fax" | "mail";
  status: "draft" | "exported";
  trackingId?: string;
  recipient: string;
  confirmationEmail: string;
  smsOptIn: boolean;
  submittedAt?: string;
  notes?: string;
}

export interface ActivityItem {
  id: string;
  label: string;
  body: string;
  timestamp: string;
  type: "system" | "upload" | "draft" | "submission" | "support";
}

export interface CaseSessionState {
  caseRecordId?: string;
  documentText: string;
  useSampleMode: boolean;
  structuredFacts: StructuredFacts;
  analysis: AnalysisResult;
  strategy: AttackTree;
  draft: DraftDocument;
  draftEditor: DraftEditorState;
  vaultDocuments: VaultDocument[];
  submission: SubmissionState;
  activity: ActivityItem[];
  selectedNodeId?: string;
  generatedAt: string;
  notices?: string[];
}

function nowIso() {
  return new Date().toISOString();
}

function createId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function getCategory(sourceType: VaultDocument["sourceType"]) {
  switch (sourceType) {
    case "provider_note":
      return "Clinical Note";
    case "policy_excerpt":
      return "Policy";
    case "regulation":
      return "Regulation";
    case "template":
      return "Template";
    case "derived_signal":
      return "Derived";
    case "uploaded_file":
      return "Uploaded";
    default:
      return "Evidence";
  }
}

function buildVaultDocuments(items: EvidenceItem[]) {
  return items.map((item, index) => ({
    id: item.id,
    name: `${item.label.replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "_") || `Evidence_${index + 1}`}.pdf`,
    meta: `${Math.round(item.relevanceScore * 100)}% relevance`,
    category: getCategory(item.sourceType),
    snippet: item.snippet,
    sourceType: item.sourceType,
    relevanceScore: item.relevanceScore,
    scoreSource: item.scoreSource,
    scoreConfidence: item.scoreConfidence,
    scoreReasoning: item.scoreReasoning,
    verified: !item.missing,
    linked: Boolean(item.supportsNodeIds?.length),
    missing: item.missing,
  }));
}

function browserAvailable() {
  return typeof window !== "undefined";
}

export function createFallbackCaseSession(): CaseSessionState {
  const vaultDocuments = buildVaultDocuments(SAMPLE_ATTACK_TREE.evidenceItems || []);
  const generatedAt = nowIso();

  return {
    documentText: SAMPLE_EOB,
    useSampleMode: true,
    structuredFacts: SAMPLE_STRUCTURED_FACTS,
    analysis: SAMPLE_ANALYSIS,
    strategy: SAMPLE_ATTACK_TREE,
    draft: {
      type: "appeal_letter",
      title: "Internal Appeal Letter",
      content: SAMPLE_DRAFT,
      keyPoints: [
        "Emergency-service exception applies",
        "CPT coding correction requested",
        "External review rights preserved",
      ],
    },
    draftEditor: {
      content: SAMPLE_DRAFT,
      lastSavedAt: generatedAt,
    },
    vaultDocuments,
    submission: {
      method: "fax",
      status: "draft",
      recipient: SAMPLE_STRUCTURED_FACTS.insurer,
      confirmationEmail: "case-review@example.com",
      smsOptIn: true,
    },
    activity: [
      {
        id: createId("activity"),
        label: "Case session created",
        body: "Fallback sample case loaded into the browser session.",
        timestamp: generatedAt,
        type: "system",
      },
    ],
    selectedNodeId: SAMPLE_ATTACK_TREE.nodes.find((node) => node.type === "document")?.id,
    generatedAt,
    notices: [],
  };
}

function normalizeCaseSession(raw: Partial<CaseSessionState>): CaseSessionState {
  // Bug fix: Validate raw input is not null/undefined before spreading
  const fallback = createFallbackCaseSession();
  const normalized = raw || {};

  return {
    ...fallback,
    ...normalized,
    draftEditor: {
      ...fallback.draftEditor,
      ...(normalized.draftEditor || {}),
      content: normalized.draftEditor?.content || normalized.draft?.content || fallback.draftEditor.content,
    },
    vaultDocuments:
      normalized.vaultDocuments && normalized.vaultDocuments.length
        ? normalized.vaultDocuments
        : buildVaultDocuments(normalized.strategy?.evidenceItems || fallback.strategy.evidenceItems || []),
    submission: {
      ...fallback.submission,
      ...(normalized.submission || {}),
    },
    activity:
      normalized.activity && normalized.activity.length
        ? normalized.activity
        : fallback.activity,
    notices: normalized.notices || [],
  };
}

export function saveCaseSession(state: CaseSessionState) {
  if (!browserAvailable()) return;
  window.sessionStorage.setItem(CASE_SESSION_KEY, JSON.stringify(state));
}

export function loadCaseSession(): CaseSessionState | null {
  if (!browserAvailable()) return null;
  const raw = window.sessionStorage.getItem(CASE_SESSION_KEY);
  if (!raw) return null;

  try {
    return normalizeCaseSession(JSON.parse(raw) as Partial<CaseSessionState>);
  } catch {
    return null;
  }
}

export function clearCaseSession() {
  if (!browserAvailable()) return;
  window.sessionStorage.removeItem(CASE_SESSION_KEY);
}

export function consumeSessionNotice(): string | null {
  if (!browserAvailable()) return null;
  const raw = window.sessionStorage.getItem(CASE_NOTICE_KEY);
  if (!raw) return null;
  window.sessionStorage.removeItem(CASE_NOTICE_KEY);
  return raw;
}

export function setSessionNotice(message: string) {
  if (!browserAvailable()) return;
  window.sessionStorage.setItem(CASE_NOTICE_KEY, message);
}

export function savePipelineProgress(progress: PipelineProgress) {
  if (!browserAvailable()) return;
  window.sessionStorage.setItem(CASE_PIPELINE_PROGRESS_KEY, JSON.stringify(progress));
}

export function loadPipelineProgress(): PipelineProgress | null {
  if (!browserAvailable()) return null;
  const raw = window.sessionStorage.getItem(CASE_PIPELINE_PROGRESS_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as PipelineProgress;
  } catch {
    return null;
  }
}

export function clearPipelineProgress() {
  if (!browserAvailable()) return;
  window.sessionStorage.removeItem(CASE_PIPELINE_PROGRESS_KEY);
}

export function updateCaseSession(
  updater: (current: CaseSessionState) => CaseSessionState
) {
  const current = loadCaseSession() || createFallbackCaseSession();
  const next = updater(current);
  saveCaseSession(next);
  return next;
}
