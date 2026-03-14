import { NextResponse } from "next/server";
import type {
  AnalyzeRequest,
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
  if (!isRecord(payload.analysis)) {
    throw new ValidationError("Analysis data is required");
  }
  return payload as unknown as StrategyRequest;
}

export function validateDraftRequest(payload: unknown): DraftRequest {
  if (!isRecord(payload)) throw new ValidationError("Request body must be an object");
  return {
    ...payload,
    nodeLabel: requireNonEmptyString(payload.nodeLabel, "Node label"),
    nodeDescription: requireNonEmptyString(payload.nodeDescription, "Node description"),
    analysis: isRecord(payload.analysis)
      ? (payload.analysis as unknown as DraftRequest["analysis"])
      : (() => {
          throw new ValidationError("Analysis data is required");
        })(),
  } as unknown as DraftRequest;
}

export function validatePersistedCaseSession(payload: unknown): PersistedCaseSession {
  if (!isRecord(payload)) throw new ValidationError("Request body must be an object");
  if (!isRecord(payload.structuredFacts)) throw new ValidationError("Structured facts are required");
  if (!isRecord(payload.analysis)) throw new ValidationError("Analysis data is required");
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
