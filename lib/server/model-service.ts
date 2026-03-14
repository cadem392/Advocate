import {
  AppealRiskRequest,
  AppealRiskScore,
  EvidenceRelevanceRequest,
  EvidenceRelevanceScore,
  BlindSpotRequest,
  BlindSpotSignal,
  BranchScore,
  BranchViabilityRequest,
} from "@/lib/types";
import { getModelServiceUrl } from "@/lib/server/env";
import {
  heuristicAppealRisk,
  heuristicBlindSpot,
  heuristicBranchViability,
  heuristicEvidenceRelevance,
} from "@/lib/server/model-heuristics";

function toSnakeCase(value: string): string {
  return value.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

function toSnakeCaseKeys<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((entry) => toSnakeCaseKeys(entry)) as T;
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [toSnakeCase(key), toSnakeCaseKeys(entry)])
    ) as T;
  }

  return value;
}

function toCamelCase(value: string): string {
  return value.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());
}

function toCamelCaseKeys<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((entry) => toCamelCaseKeys(entry)) as T;
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [toCamelCase(key), toCamelCaseKeys(entry)])
    ) as T;
  }

  return value;
}

function normalizeEvidenceRelevance(value: number): number {
  const percentage = value <= 1 ? value * 100 : value;
  return Math.min(100, Math.max(0, percentage + 50)) / 100;
}

async function postJSON<TRequest, TResponse>(path: string, body: TRequest): Promise<TResponse | null> {
  const baseUrl = getModelServiceUrl();
  if (!baseUrl) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3000);

  try {
    const response = await fetch(`${baseUrl}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(toSnakeCaseKeys(body)),
      signal: controller.signal,
    });

    if (!response.ok) {
      return null;
    }

    const responseData = await response.json();
    // Bug fix: Ensure response data exists before transforming keys
    if (!responseData) return null;
    return toCamelCaseKeys(responseData as TResponse);
  } catch (error) {
    // Bug fix: Silently return null on abort or other errors for graceful fallback to heuristics
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function getAppealRiskScore(input: AppealRiskRequest): Promise<AppealRiskScore> {
  const remote = await postJSON<AppealRiskRequest, AppealRiskScore>("/predict/appeal-risk", input);
  return remote || heuristicAppealRisk(input);
}

export async function getBranchViability(input: BranchViabilityRequest): Promise<BranchScore> {
  const remote = await postJSON<BranchViabilityRequest, BranchScore>("/predict/branch-viability", input);
  return remote || heuristicBranchViability(input);
}

export async function getBlindSpotSignal(input: BlindSpotRequest): Promise<BlindSpotSignal> {
  const remote = await postJSON<BlindSpotRequest, BlindSpotSignal>("/analyze/blindspot", input);
  return remote || heuristicBlindSpot(input);
}

export async function getEvidenceRelevanceScore(
  input: EvidenceRelevanceRequest
): Promise<EvidenceRelevanceScore> {
  const remote = await postJSON<EvidenceRelevanceRequest, EvidenceRelevanceScore>(
    "/score/evidence-relevance",
    input
  );
  const resolved = remote || heuristicEvidenceRelevance(input);

  return {
    ...resolved,
    relevanceScore: Number(normalizeEvidenceRelevance(resolved.relevanceScore).toFixed(2)),
  };
}
