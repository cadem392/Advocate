import {
  AnalysisResult,
  AttackTree,
  CasePipelineResult,
  CaseReanalysisRequest,
  DraftDocument,
  PipelineProgress,
  PersistedCaseSession,
  StructuredFacts,
  StoredCaseRecord,
  UploadedEvidenceInput,
} from "@/lib/types";
import {
  CaseSessionState,
  clearPipelineProgress,
  loadPipelineProgress,
  saveCaseSession,
  savePipelineProgress,
  setSessionNotice,
  type ActivityItem,
  type VaultDocument,
} from "@/lib/client/case-session";

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
      recipient:
        structuredFacts.insurer && structuredFacts.insurer !== "unknown"
          ? structuredFacts.insurer
          : "Insurer appeals department",
      confirmationEmail: "case-review@example.com",
      smsOptIn: true,
    },
    activity: buildActivity(structuredFacts, analysis, strategy),
    selectedNodeId:
      strategy.nodes.find((node) => node.id === strategy.explanation?.recommendedNodeId)?.id ||
      strategy.nodes.find((node) => node.type === "document")?.id,
    generatedAt,
    notices: Array.from(new Set([...(existing?.notices || []), ...(analysis.warnings || [])])),
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
    notices: state.notices,
  };
}

async function syncCaseRecord(
  state: CaseSessionState,
  getIdToken?: () => Promise<string | null>
): Promise<CaseSessionState> {
  // Bug fix: Add error handling for sync failures
  if (!state) {
    throw new Error("Cannot sync null or undefined case state");
  }
  const payload = toPersistedCaseSession(state);
  const path = state.caseRecordId ? `/api/cases/${state.caseRecordId}` : "/api/cases";
  const method = state.caseRecordId ? "PATCH" : "POST";

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const token = getIdToken ? await getIdToken() : null;
  if (!token) {
    // Local/demo mode does not have a backend user session, so skip auth-backed persistence instead of throwing 401 noise.
    return state;
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  try {
    const response = await fetch(path, {
      method,
      headers,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      // Fix 7: convert persistence failures into a visible session notice instead of silently continuing.
      const message = "Your case couldn't be saved. Check your connection and try again.";
      console.error(`Case record sync failed: ${response.status} ${response.statusText}`);
      setSessionNotice(message);
      return {
        ...state,
        notices: Array.from(new Set([...(state.notices || []), message])),
      };
    }

    const record = (await response.json()) as StoredCaseRecord;
    if (!record || !record.id) {
      console.error("Invalid case record returned from server");
      const message = "Your case couldn't be saved. Check your connection and try again.";
      setSessionNotice(message);
      return {
        ...state,
        notices: Array.from(new Set([...(state.notices || []), message])),
      };
    }
    return {
      ...state,
      caseRecordId: record.id,
    };
  } catch (error) {
    console.error("Error syncing case record:", error);
    const message = "Your case couldn't be saved. Check your connection and try again.";
    setSessionNotice(message);
    return {
      ...state,
      notices: Array.from(new Set([...(state.notices || []), message])),
    };
  }
}

export async function syncCaseSessionRecord(
  state: CaseSessionState,
  getIdToken?: () => Promise<string | null>
): Promise<CaseSessionState> {
  return syncCaseRecord(state, getIdToken);
}

function matchesProgress(progress: PipelineProgress | null, params: { documentText: string; useSampleMode: boolean }) {
  return Boolean(
    progress &&
      progress.documentText === params.documentText &&
      progress.useSampleMode === params.useSampleMode
  );
}

function savePartialProgress(params: {
  documentText: string;
  useSampleMode: boolean;
  structuredFacts?: StructuredFacts;
  analysis?: AnalysisResult;
  strategy?: AttackTree;
  errorMessage: string;
}) {
  if (!params.structuredFacts && !params.analysis && !params.strategy) {
    return;
  }

  const lastCompletedStep = params.strategy
    ? "strategy"
    : params.analysis
      ? "analyze"
      : "structure";

  savePipelineProgress({
    status: "partial",
    documentText: params.documentText,
    useSampleMode: params.useSampleMode,
    lastCompletedStep,
    structuredFacts: params.structuredFacts,
    analysis: params.analysis,
    strategy: params.strategy,
    errorMessage: params.errorMessage,
    updatedAt: new Date().toISOString(),
  });
}

export async function runCasePipeline(params: {
  documentText: string;
  useSampleMode: boolean;
  getIdToken?: () => Promise<string | null>;
}): Promise<CaseSessionState> {
  const { documentText, useSampleMode, getIdToken } = params;
  const existingProgress = loadPipelineProgress();
  const resumableProgress = matchesProgress(existingProgress, params) ? existingProgress : null;
  let structuredFacts = resumableProgress?.structuredFacts;
  let analysis = resumableProgress?.analysis;
  let strategy = resumableProgress?.strategy;

  try {
    if (!structuredFacts) {
      structuredFacts = await postJSON<StructuredFacts>("/api/structure", {
        documentText,
        useSampleMode,
      });
      // Fix 18: persist completed steps so retries resume from the last successful stage.
      savePartialProgress({
        documentText,
        useSampleMode,
        structuredFacts,
        errorMessage: "",
      });
    }

    if (!analysis) {
      analysis = await postJSON<AnalysisResult>("/api/analyze", {
        documentText,
        structuredFacts,
        useSampleMode,
      });
      savePartialProgress({
        documentText,
        useSampleMode,
        structuredFacts,
        analysis,
        errorMessage: "",
      });
    }

    if (!strategy) {
      strategy = await postJSON<AttackTree>("/api/strategy", {
        analysis,
        structuredFacts,
        useSampleMode,
      });
      savePartialProgress({
        documentText,
        useSampleMode,
        structuredFacts,
        analysis,
        strategy,
        errorMessage: "",
      });
    }

    const draftNode = pickDraftNode(strategy);
    if (!draftNode) {
      const message = "No actionable steps were found. The document may not contain enough case detail.";
      // Fix 12: stop when the tree has no draftable node instead of fabricating a generic appeal.
      savePartialProgress({
        documentText,
        useSampleMode,
        structuredFacts,
        analysis,
        strategy,
        errorMessage: message,
      });
      throw new Error(message);
    }

    const draft = await postJSON<DraftDocument>("/api/draft", {
      nodeLabel: draftNode.label,
      nodeDescription: draftNode.description,
      documentType: draftNode.documentType || "appeal_letter",
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

    saveCaseSession(state);
    clearPipelineProgress();
    return syncCaseRecord(state, getIdToken);
  } catch (error) {
    savePartialProgress({
      documentText,
      useSampleMode,
      structuredFacts,
      analysis,
      strategy,
      errorMessage: error instanceof Error ? error.message : "Failed to generate case strategy",
    });
    throw error;
  }
}

export async function rerunCaseWithEvidence(params: {
  current: CaseSessionState;
  evidenceDocuments: VaultDocument[];
  getIdToken?: () => Promise<string | null>;
}): Promise<CaseSessionState> {
  // Bug fix: Validate params before processing
  if (!params || !params.current || !params.evidenceDocuments) {
    throw new Error("Invalid parameters for rerunCaseWithEvidence");
  }
  const { current, evidenceDocuments, getIdToken } = params;
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

  return syncCaseRecord(mergedState, getIdToken);
}
