import {
  AnalysisResult,
  AttackTree,
  CasePipelineResult,
  CaseReanalysisRequest,
  DraftDocument,
  PersistedCaseSession,
  StructuredFacts,
  StoredCaseRecord,
  UploadedEvidenceInput,
} from "@/lib/types";
import { CaseSessionState, type ActivityItem, type VaultDocument } from "@/lib/client/case-session";

async function postJSON<T>(path: string, payload: unknown): Promise<T> {
  const response = await fetch(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message =
      typeof data?.error === "string" ? data.error : `Request failed for ${path}`;
    throw new Error(message);
  }

  return data as T;
}

function pickDraftNode(tree: AttackTree) {
  // Bug fix: Validate tree.nodes exists and is not empty before accessing
  if (!tree.nodes || tree.nodes.length === 0) {
    return undefined;
  }
  return (
    tree.nodes.find((node) => node.id === tree.explanation?.recommendedNodeId && node.documentType) ||
    tree.nodes.find((node) => node.type === "document") ||
    tree.nodes.find((node) => node.type === "action" || node.type === "escalation") ||
    tree.nodes[0]
  );
}

function createId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function categoryFor(sourceType: VaultDocument["sourceType"]) {
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

function buildVaultDocuments(strategy: AttackTree): VaultDocument[] {
  // Bug fix: Validate strategy and evidenceItems before processing
  if (!strategy || !strategy.evidenceItems || strategy.evidenceItems.length === 0) {
    return [];
  }
  return strategy.evidenceItems.map((item, index) => ({
    id: item.id || createId("vault"),
    name: `${item.label?.replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "_") || `Evidence_${index + 1}`}.pdf`,
    meta: `${Math.round((item.relevanceScore || 0) * 100)}% relevance`,
    category: categoryFor(item.sourceType),
    snippet: item.snippet || "",
    sourceType: item.sourceType,
    relevanceScore: item.relevanceScore || 0,
    scoreSource: item.scoreSource,
    scoreConfidence: item.scoreConfidence,
    scoreReasoning: item.scoreReasoning,
    verified: !item.missing,
    linked: Boolean(item.supportsNodeIds?.length),
    missing: item.missing,
  }));
}

function buildActivity(
  structuredFacts: StructuredFacts,
  analysis: AnalysisResult,
  strategy: AttackTree
): ActivityItem[] {
  const now = new Date().toISOString();
  // Bug fix: Validate inputs exist before accessing properties
  if (!structuredFacts || !analysis || !strategy) {
    return [];
  }
  return [
    {
      id: createId("activity"),
      label: "Case structured",
      body: `Structured ${structuredFacts.claimNumber || "claim"} for ${structuredFacts.patientName || "patient"}.`,
      timestamp: now,
      type: "system",
    },
    {
      id: createId("activity"),
      label: "Strategy generated",
      body: strategy.explanation?.whySelected || analysis.summary || "Strategy generated successfully.",
      timestamp: now,
      type: "system",
    },
  ];
}

function buildCaseSession(
  result: CasePipelineResult,
  existing?: Partial<CaseSessionState>
): CaseSessionState {
  const { documentText, structuredFacts, analysis, strategy, draft } = result;
  const generatedAt = new Date().toISOString();
  const vaultDocuments = buildVaultDocuments(strategy);

  return {
    documentText,
    useSampleMode: existing?.useSampleMode ?? false,
    structuredFacts,
    analysis,
    strategy,
    draft,
    draftEditor: {
      content: draft.content,
      lastSavedAt: generatedAt,
    },
    vaultDocuments,
    submission: existing?.submission || {
      method: "fax",
      status: "draft",
      trackingId: "ADV-TXN-DRAFT",
      recipient: structuredFacts.insurer || "Insurer appeals department",
      confirmationEmail: "case-review@example.com",
      smsOptIn: true,
    },
    activity: buildActivity(structuredFacts, analysis, strategy),
    selectedNodeId:
      strategy.nodes.find((node) => node.id === strategy.explanation?.recommendedNodeId)?.id ||
      strategy.nodes.find((node) => node.type === "document")?.id,
    generatedAt,
  };
}

function mergeVaultDocuments(
  generated: VaultDocument[],
  existing: VaultDocument[]
): VaultDocument[] {
  const uploads = existing.filter((document) => document.sourceType === "uploaded_file");
  const merged = new Map<string, VaultDocument>();

  for (const document of [...uploads, ...generated]) {
    const key = `${document.sourceType}:${document.name}`;
    const prior = merged.get(key);
    merged.set(key, prior ? { ...prior, ...document, extractedText: prior.extractedText || document.extractedText } : document);
  }

  return Array.from(merged.values()).sort((left, right) => right.relevanceScore - left.relevanceScore);
}

function toPersistedCaseSession(state: CaseSessionState): PersistedCaseSession {
  return {
    documentText: state.documentText,
    useSampleMode: state.useSampleMode,
    structuredFacts: state.structuredFacts,
    analysis: state.analysis,
    strategy: state.strategy,
    draft: state.draft,
    draftEditor: state.draftEditor,
    vaultDocuments: state.vaultDocuments,
    submission: state.submission,
    activity: state.activity,
    selectedNodeId: state.selectedNodeId,
    generatedAt: state.generatedAt,
  };
}

async function syncCaseRecord(state: CaseSessionState): Promise<CaseSessionState> {
  // Bug fix: Add error handling for sync failures
  if (!state) {
    throw new Error("Cannot sync null or undefined case state");
  }
  const payload = toPersistedCaseSession(state);
  const path = state.caseRecordId ? `/api/cases/${state.caseRecordId}` : "/api/cases";
  const method = state.caseRecordId ? "PATCH" : "POST";

  try {
    const response = await fetch(path, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.error(`Case record sync failed: ${response.status} ${response.statusText}`);
      return state;
    }

    const record = (await response.json()) as StoredCaseRecord;
    if (!record || !record.id) {
      console.error("Invalid case record returned from server");
      return state;
    }
    return {
      ...state,
      caseRecordId: record.id,
    };
  } catch (error) {
    console.error("Error syncing case record:", error);
    return state;
  }
}

export async function syncCaseSessionRecord(state: CaseSessionState): Promise<CaseSessionState> {
  return syncCaseRecord(state);
}

export async function runCasePipeline(params: {
  documentText: string;
  useSampleMode: boolean;
}): Promise<CaseSessionState> {
  const { documentText, useSampleMode } = params;

  const structuredFacts = await postJSON<StructuredFacts>("/api/structure", {
    documentText,
    useSampleMode,
  });

  const analysis = await postJSON<AnalysisResult>("/api/analyze", {
    documentText,
    structuredFacts,
    useSampleMode,
  });

  const strategy = await postJSON<AttackTree>("/api/strategy", {
    analysis,
    structuredFacts,
    useSampleMode,
  });

  const draftNode = pickDraftNode(strategy);
  // Bug fix: Handle case where pickDraftNode returns undefined gracefully
  const draft = await postJSON<DraftDocument>("/api/draft", {
    nodeLabel: draftNode?.label || "Internal Appeal",
    nodeDescription:
      draftNode?.description || "Prepare a medically grounded internal appeal.",
    documentType: draftNode?.documentType || "appeal_letter",
    analysis,
    structuredFacts,
    useSampleMode,
  });

  if (!draft) {
    throw new Error("Failed to generate draft document");
  }

  const state = buildCaseSession(
    {
      documentText,
      structuredFacts,
      analysis,
      strategy,
      draft,
    },
    {
      useSampleMode,
    }
  );

  return syncCaseRecord(state);
}

export async function rerunCaseWithEvidence(params: {
  current: CaseSessionState;
  evidenceDocuments: VaultDocument[];
}): Promise<CaseSessionState> {
  // Bug fix: Validate params before processing
  if (!params || !params.current || !params.evidenceDocuments) {
    throw new Error("Invalid parameters for rerunCaseWithEvidence");
  }
  const { current, evidenceDocuments } = params;
  const uploadedDocuments = evidenceDocuments.filter((document) => document && document.sourceType === "uploaded_file");
  const payload: CaseReanalysisRequest = {
    documentText: current.documentText,
    useSampleMode: current.useSampleMode,
    structuredFacts: current.structuredFacts,
    analysis: current.analysis,
    strategy: current.strategy,
    evidenceDocuments: uploadedDocuments.map<UploadedEvidenceInput>((document) => ({
      id: document.id,
      name: document.name,
      category: document.category,
      snippet: document.snippet,
      extractedText: document.extractedText,
      ingestionStatus: document.ingestionStatus,
      ingestionWarnings: document.ingestionWarnings,
    })),
  };

  const result = await postJSON<CasePipelineResult>("/api/cases/reanalyze", payload);
  const next = buildCaseSession(result, current);

  const mergedState: CaseSessionState = {
    ...next,
    caseRecordId: current.caseRecordId,
    vaultDocuments: mergeVaultDocuments(next.vaultDocuments, uploadedDocuments),
    activity: [
      {
        id: createId("activity"),
        label: "Case reanalyzed",
        body: `${uploadedDocuments.length} uploaded evidence file(s) were incorporated into the case strategy.`,
        timestamp: new Date().toISOString(),
        type: "system" as const,
      },
      ...(current.activity || []),
    ],
  };

  return syncCaseRecord(mergedState);
}
