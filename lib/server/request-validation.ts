import { NextResponse } from "next/server";
import type {
  AnalyzeRequest,
  AnalysisResult,
  BlindSpotRequest,
  BranchViabilityRequest,
  CaseReanalysisRequest,
  DraftRequest,
  EvidenceRelevanceRequest,
  PersistedCaseSession,
  StrategyRequest,
  StructureRequest,
} from "@/lib/types";

export class ValidationError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "ValidationError";
    this.status = status;
  }
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function requireNonEmptyString(value: unknown, label: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new ValidationError(`${label} is required`);
  }
  return value.trim();
}

export function requireNumber(value: unknown, label: string): number {
  if (typeof value !== "number" || Number.isNaN(value)) {
    throw new ValidationError(`${label} must be a number`);
  }
  return value;
}

function requireArray(value: unknown, label: string) {
  if (!Array.isArray(value)) {
    throw new ValidationError(`${label} must be an array`);
  }
  return value;
}

function validateAnalysisShape(value: unknown): AnalysisResult {
  if (!isRecord(value)) {
    throw new ValidationError("Analysis data is required");
  }

  return {
    summary: requireNonEmptyString(value.summary, "Analysis summary"),
    totalBilled: typeof value.totalBilled === "string" || value.totalBilled === null ? value.totalBilled : null,
    totalOvercharged:
      typeof value.totalOvercharged === "string" || value.totalOvercharged === null
        ? value.totalOvercharged
        : null,
    deniedAmount: typeof value.deniedAmount === "string" || value.deniedAmount === null ? value.deniedAmount : null,
    billingErrors: requireArray(value.billingErrors, "Billing errors") as AnalysisResult["billingErrors"],
    appealGrounds: requireArray(value.appealGrounds, "Appeal grounds") as AnalysisResult["appealGrounds"],
    deadlines: requireArray(value.deadlines, "Deadlines") as AnalysisResult["deadlines"],
    riskLevel: requireNonEmptyString(value.riskLevel, "Risk level") as AnalysisResult["riskLevel"],
    patientContext: requireNonEmptyString(value.patientContext, "Patient context"),
    warnings: Array.isArray(value.warnings) ? value.warnings.filter((entry): entry is string => typeof entry === "string") : undefined,
  };
}

export function validateStructureRequest(payload: unknown): StructureRequest {
  if (!isRecord(payload)) throw new ValidationError("Request body must be an object");
  return {
    ...payload,
    documentText: requireNonEmptyString(payload.documentText, "Document text"),
  } as unknown as StructureRequest;
}

export function validateAnalyzeRequest(payload: unknown): AnalyzeRequest {
  if (!isRecord(payload)) throw new ValidationError("Request body must be an object");
  return {
    ...payload,
    documentText: requireNonEmptyString(payload.documentText, "Document text"),
  } as unknown as AnalyzeRequest;
}

export function validateStrategyRequest(payload: unknown): StrategyRequest {
  if (!isRecord(payload)) throw new ValidationError("Request body must be an object");
  return {
    ...payload,
    // Fix 16: require the analysis fields strategy generation actually depends on.
    analysis: validateAnalysisShape(payload.analysis),
  } as StrategyRequest;
}

export function validateDraftRequest(payload: unknown): DraftRequest {
  if (!isRecord(payload)) throw new ValidationError("Request body must be an object");
  return {
    ...payload,
    nodeLabel: requireNonEmptyString(payload.nodeLabel, "Node label"),
    nodeDescription: requireNonEmptyString(payload.nodeDescription, "Node description"),
    // Fix 16: block draft requests that only pass a non-null shell analysis object.
    analysis: validateAnalysisShape(payload.analysis),
  } as unknown as DraftRequest;
}

export function validatePersistedCaseSession(payload: unknown): PersistedCaseSession {
  if (!isRecord(payload)) throw new ValidationError("Request body must be an object");
  if (!isRecord(payload.structuredFacts)) throw new ValidationError("Structured facts are required");
  validateAnalysisShape(payload.analysis);
  if (!isRecord(payload.strategy)) throw new ValidationError("Strategy data is required");
  if (!isRecord(payload.draft)) throw new ValidationError("Draft data is required");
  return payload as unknown as PersistedCaseSession;
}

export function validateCaseReanalysisRequest(payload: unknown): CaseReanalysisRequest {
  if (!isRecord(payload)) throw new ValidationError("Request body must be an object");
  return {
    ...payload,
    documentText: requireNonEmptyString(payload.documentText, "Document text"),
  } as unknown as CaseReanalysisRequest;
}

export function validateEvidenceRelevanceRequest(payload: unknown): EvidenceRelevanceRequest {
  if (!isRecord(payload)) throw new ValidationError("Request body must be an object");
  // Bug fix: Validate snippet is present and non-empty for meaningful relevance scoring
  const snippet = typeof payload.snippet === "string" ? payload.snippet.trim() : "";
  if (!snippet) throw new ValidationError("Snippet cannot be empty for evidence relevance");
  return {
    ...payload,
    label: requireNonEmptyString(payload.label, "Label"),
    sourceType: requireNonEmptyString(payload.sourceType, "Source type") as EvidenceRelevanceRequest["sourceType"],
    snippet,
  } as unknown as EvidenceRelevanceRequest;
}

export function validateBranchViabilityRequest(payload: unknown): BranchViabilityRequest {
  if (!isRecord(payload)) throw new ValidationError("Request body must be an object");
  return {
    issueClass: requireNonEmptyString(payload.issueClass, "Issue class"),
    branchType: requireNonEmptyString(payload.branchType, "Branch type"),
    evidenceScore: requireNumber(payload.evidenceScore, "Evidence score"),
    caseSimilarity: requireNumber(payload.caseSimilarity, "Case similarity"),
    jurisdiction: requireNonEmptyString(payload.jurisdiction, "Jurisdiction"),
  };
}

export function validateBlindSpotRequest(payload: unknown): BlindSpotRequest {
  if (!isRecord(payload)) throw new ValidationError("Request body must be an object");
  return {
    text: requireNonEmptyString(payload.text, "Text"),
  };
}

export function validationErrorResponse(error: unknown, fallback: string) {
  if (error instanceof ValidationError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  return NextResponse.json(
    {
      error: error instanceof Error ? error.message : fallback,
    },
    { status: 500 }
  );
}
