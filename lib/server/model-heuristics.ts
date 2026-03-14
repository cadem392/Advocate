import {
  AnalysisResult,
  AppealRiskRequest,
  AppealRiskScore,
  EvidenceRelevanceRequest,
  EvidenceRelevanceScore,
  BlindSpotRequest,
  BlindSpotSignal,
  BranchScore,
  BranchViabilityRequest,
} from "@/lib/types";

function clamp(value: number, min = 0, max = 1): number {
  return Math.max(min, Math.min(max, value));
}

function parseCurrency(value?: string): number {
  if (!value) return 0;
  return Number(value.replace(/[^0-9.-]/g, "")) || 0;
}

function tokenize(value: string): string[] {
  return value
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

function jaccardSimilarity(left: string, right: string): number {
  const leftSet = new Set(tokenize(left));
  const rightSet = new Set(tokenize(right));
  if (!leftSet.size || !rightSet.size) return 0;

  let intersection = 0;
  for (const token of Array.from(leftSet)) {
    if (rightSet.has(token)) intersection += 1;
  }

  const union = new Set([...Array.from(leftSet), ...Array.from(rightSet)]).size;
  return union ? intersection / union : 0;
}

export function heuristicAppealRisk(input: AppealRiskRequest): AppealRiskScore {
  const denialReason = (input.denialReason || "").toLowerCase();
  const claimType = (input.claimType || "").toLowerCase();
  const insuranceType = (input.insuranceType || "").toLowerCase();
  const providerType = (input.providerType || "").toLowerCase();
  const numeric = input.numericFeatures || {};

  let score = 0.35;

  if (denialReason.includes("medical necessity")) score += 0.18;
  if (denialReason.includes("authorization")) score += 0.12;
  if (denialReason.includes("timely filing")) score += 0.2;
  if (claimType.includes("inpatient")) score += 0.1;
  if (claimType.includes("mental")) score += 0.06;
  if (insuranceType.includes("medicare advantage")) score += 0.05;
  if (providerType.includes("hospital")) score += 0.04;

  const deniedAmount = numeric.deniedAmount || numeric.denied_amount || 0;
  const daysToDeadline = numeric.daysToDeadline || numeric.days_to_deadline || 0;
  const evidenceScore = numeric.evidenceScore || numeric.evidence_score || 0;

  score += clamp(deniedAmount / 20000, 0, 0.18);
  if (daysToDeadline > 0) score += clamp((30 - Math.min(daysToDeadline, 30)) / 30, 0, 0.14);
  score -= clamp(evidenceScore * 0.18, 0, 0.18);

  return {
    riskScore: Number(clamp(score).toFixed(2)),
    source: "heuristic",
    featureContractComplete: false,
    warning:
      "Heuristic fallback in use. The serialized appeal risk model needs a finalized 18-feature registry before production scoring.",
  };
}

export function heuristicBranchViability(input: BranchViabilityRequest): BranchScore {
  const branchType = input.branchType.toLowerCase();
  const issueClass = input.issueClass.toLowerCase();
  const jurisdiction = input.jurisdiction.toLowerCase();

  let viability = input.evidenceScore * 0.55 + input.caseSimilarity * 0.3;
  let favorable = viability * 0.92;
  let escalationLevel: "low" | "medium" | "high" = "medium";

  if (branchType.includes("internal appeal")) viability += 0.08;
  if (branchType.includes("external review")) viability -= 0.04;
  if (branchType.includes("complaint")) favorable -= 0.06;
  if (issueClass.includes("insurance")) viability += 0.05;
  if (issueClass.includes("medical necessity")) viability += 0.04;
  if (jurisdiction.includes("ca")) favorable += 0.03;

  if (viability < 0.4) escalationLevel = "high";
  else if (viability > 0.72) escalationLevel = "low";

  return {
    branchTemplateId: input.branchType,
    branchId: input.branchType,
    viabilityScore: Number(clamp(viability).toFixed(2)),
    favorableOutcomeProbability: Number(clamp(favorable).toFixed(2)),
    escalationLevel,
    confidence: Number(clamp(0.55 + input.caseSimilarity * 0.25).toFixed(2)),
    source: "heuristic",
  };
}

export function heuristicBlindSpot(input: BlindSpotRequest): BlindSpotSignal {
  const text = input.text.toLowerCase();

  if (text.includes("prior authorization") && (text.includes("emergency") || text.includes("er "))) {
    return {
      primaryLabel: "emergency exception conflict",
      primaryScore: 0.86,
      secondaryLabel: "coverage terms mismatch",
      secondaryScore: 0.62,
      matchedText: "prior authorization + emergency encounter",
      source: "heuristic",
    };
  }

  if (text.includes("medical necessity") && (text.includes("physician") || text.includes("clinical"))) {
    return {
      primaryLabel: "medical necessity gap",
      primaryScore: 0.78,
      secondaryLabel: "missing clinician support",
      secondaryScore: 0.55,
      matchedText: "medical necessity + clinical evidence references",
      source: "heuristic",
    };
  }

  if (text.includes("70553") && text.includes("70551")) {
    return {
      primaryLabel: "coding inconsistency",
      primaryScore: 0.81,
      secondaryLabel: "billing discrepancy",
      secondaryScore: 0.57,
      matchedText: "multiple MRI CPT codes detected",
      source: "heuristic",
    };
  }

  return {
    primaryLabel: "no material conflict detected",
    primaryScore: 0.49,
    source: "heuristic",
  };
}

export function heuristicEvidenceRelevance(
  input: EvidenceRelevanceRequest
): EvidenceRelevanceScore {
  const snippet = input.snippet || "";
  const label = input.label || "";
  const appealGrounds = (input.appealGrounds || []).join(" ");
  const caseContext = [
    input.analysisSummary || "",
    input.denialReason || "",
    input.patientContext || "",
    input.insurer || "",
    appealGrounds,
    input.targetNodeLabel || "",
    input.targetNodeType || "",
  ].join(" ");

  const similarity = jaccardSimilarity(`${label} ${snippet}`, caseContext);
  let evidenceScore = 0.35;
  const lower = `${label} ${snippet}`.toLowerCase();
  const denialReason = (input.denialReason || "").toLowerCase();
  const nodeLabel = (input.targetNodeLabel || "").toLowerCase();

  if (input.sourceType === "provider_note") evidenceScore += 0.22;
  if (input.sourceType === "regulation") evidenceScore += 0.18;
  if (input.sourceType === "policy_excerpt") evidenceScore += 0.16;
  if (input.sourceType === "derived_signal") evidenceScore += 0.14;
  if (input.sourceType === "uploaded_file") evidenceScore += 0.08;
  if (input.missing) evidenceScore -= 0.3;

  if (lower.includes("medical necessity") && denialReason.includes("medical necessity")) {
    evidenceScore += 0.18;
  }
  if (lower.includes("prior authorization") && denialReason.includes("authorization")) {
    evidenceScore += 0.16;
  }
  if (lower.includes("emergency") && denialReason.includes("authorization")) {
    evidenceScore += 0.14;
  }
  if ((lower.includes("cpt") || /\b\d{5}\b/.test(lower)) && nodeLabel.includes("billing")) {
    evidenceScore += 0.15;
  }
  if (nodeLabel.includes("appeal") && (lower.includes("physician") || lower.includes("clinical"))) {
    evidenceScore += 0.12;
  }

  const blended = clamp(evidenceScore * 0.6 + similarity * 0.4);
  const reasoningParts = [
    `source=${input.sourceType}`,
    `similarity=${similarity.toFixed(2)}`,
  ];
  if (lower.includes("medical necessity")) reasoningParts.push("medical-necessity match");
  if (lower.includes("authorization")) reasoningParts.push("authorization match");
  if (/\b\d{5}\b/.test(lower)) reasoningParts.push("procedure code match");

  return {
    relevanceScore: Number(blended.toFixed(2)),
    confidence: Number(clamp(0.58 + similarity * 0.25).toFixed(2)),
    source: "heuristic",
    reasoning: reasoningParts.join(", "),
    evidenceScore: Number(clamp(evidenceScore).toFixed(2)),
    caseSimilarity: Number(similarity.toFixed(2)),
  };
}

export function buildAppealRiskRequestFromAnalysis(analysis: AnalysisResult): AppealRiskRequest {
  return {
    denialReason: analysis.appealGrounds[0]?.argument || analysis.summary,
    claimType: analysis.patientContext,
    numericFeatures: {
      deniedAmount: parseCurrency(analysis.deniedAmount),
      evidenceScore: analysis.appealGrounds.filter((ground) => ground.strength === "strong").length / 4,
      daysToDeadline: Math.max(
        ...analysis.deadlines.map((deadline) => (deadline.daysRemaining > 0 ? deadline.daysRemaining : 0)),
        0
      ),
    },
  };
}
