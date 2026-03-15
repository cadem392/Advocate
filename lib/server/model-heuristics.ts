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

function parseCurrency(value?: string | null): number {
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

const MEDICAL_APPEAL_TERMS = [
  "denial",
  "claim",
  "appeal",
  "coverage",
  "medical necessity",
  "medically necessary",
  "provider",
  "physician",
  "clinical",
  "therapy",
  "treatment",
  "diagnosis",
  "cpt",
  "icd",
  "date of service",
  "policy",
  "eob",
  "explanation of benefits",
  "prior authorization",
  "authorization",
  "member id",
  "claim number",
  "billed amount",
  "determination",
];

const CLINICAL_SUPPORT_TERMS = [
  "provider note",
  "physician",
  "clinical",
  "progress note",
  "therapy",
  "physical therapy",
  "conservative treatment",
  "symptom",
  "diagnosis",
  "imaging",
  "mri",
  "medical necessity",
];

const COVERAGE_TERMS = [
  "coverage",
  "policy",
  "evidence of coverage",
  "medical policy",
  "benefit",
  "member handbook",
  "plan section",
  "clinical policy bulletin",
  "prior authorization",
  "authorization",
  "appeal rights",
];

const DENIAL_TERMS = [
  "claim denied",
  "adverse benefit determination",
  "denial code",
  "reason for denial",
  "determination",
  "claim determination notice",
  "appeal rights",
];

const IRRELEVANT_FILE_TERMS = [
  "doctype html",
  "<html",
  "<body",
  "div class",
  "linked-user-flow",
  "case-dashboard",
  "workspace",
  "send-confirmation",
  "status-tracker",
  "navigation",
  "tailwind",
  "next.js",
  "localhost",
  "advocate-",
];

function countPhraseHits(text: string, terms: string[]): number {
  return terms.reduce((total, term) => (text.includes(term) ? total + 1 : total), 0);
}

function alphaRatio(text: string): number {
  const compact = text.replace(/\s+/g, "");
  if (!compact) return 0;
  const alphaChars = compact.replace(/[^a-z]/gi, "").length;
  return alphaChars / compact.length;
}

function classifyDocumentFamily(text: string): "clinical" | "coverage" | "denial" | "irrelevant" | "general" {
  if (countPhraseHits(text, IRRELEVANT_FILE_TERMS) > 0) return "irrelevant";
  const clinicalHits = countPhraseHits(text, CLINICAL_SUPPORT_TERMS);
  const coverageHits = countPhraseHits(text, COVERAGE_TERMS);
  const denialHits = countPhraseHits(text, DENIAL_TERMS);

  if (clinicalHits >= coverageHits && clinicalHits >= denialHits && clinicalHits > 0) return "clinical";
  if (coverageHits >= denialHits && coverageHits > 0) return "coverage";
  if (denialHits > 0) return "denial";
  return "general";
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
  const issueClass = (input.issueClass || "").toLowerCase();
  const branchType = (input.branchType || "").toLowerCase();
  const caseContext = [
    input.analysisSummary || "",
    input.denialReason || "",
    input.patientContext || "",
    input.insurer || "",
    appealGrounds,
    issueClass,
    branchType,
    input.targetNodeLabel || "",
    input.targetNodeType || "",
  ].join(" ");

  const rawText = `${label} ${snippet}`;
  const similarity = jaccardSimilarity(rawText, caseContext);
  let evidenceScore = 0.12;
  const lower = rawText.toLowerCase();
  const denialReason = (input.denialReason || "").toLowerCase();
  const nodeLabel = (input.targetNodeLabel || "").toLowerCase();
  const family = classifyDocumentFamily(lower);
  const medicalHits = countPhraseHits(lower, MEDICAL_APPEAL_TERMS);
  const alphaQuality = alphaRatio(lower);
  const looksIrrelevant =
    family === "irrelevant" ||
    (medicalHits === 0 && similarity < 0.08) ||
    alphaQuality < 0.55;

  if (input.sourceType === "provider_note") evidenceScore += 0.3;
  if (input.sourceType === "policy_excerpt") evidenceScore += 0.26;
  if (input.sourceType === "regulation") evidenceScore += 0.22;
  if (input.sourceType === "derived_signal") evidenceScore += 0.16;
  if (input.sourceType === "uploaded_file") evidenceScore -= 0.02;
  if (input.missing) evidenceScore -= 0.3;

  if (family === "clinical") evidenceScore += 0.2;
  if (family === "coverage") evidenceScore += 0.18;
  if (family === "denial") evidenceScore += 0.16;

  evidenceScore += Math.min(0.22, medicalHits * 0.025);

  if (lower.includes("medical necessity") && denialReason.includes("medical necessity")) {
    evidenceScore += 0.24;
  }
  if (lower.includes("prior authorization") && denialReason.includes("authorization")) {
    evidenceScore += 0.22;
  }
  if ((lower.includes("coverage") || lower.includes("policy")) && denialReason.includes("coverage")) {
    evidenceScore += 0.2;
  }
  if (lower.includes("emergency") && denialReason.includes("authorization")) {
    evidenceScore += 0.14;
  }
  if ((lower.includes("cpt") || /\b\d{5}\b/.test(lower)) && (nodeLabel.includes("billing") || lower.includes("claim"))) {
    evidenceScore += 0.12;
  }
  if ((nodeLabel.includes("provider") || branchType.includes("provider")) && family === "clinical") {
    evidenceScore += 0.18;
  }
  if ((nodeLabel.includes("coverage") || branchType.includes("coverage")) && family === "coverage") {
    evidenceScore += 0.18;
  }
  if (nodeLabel.includes("appeal") && (lower.includes("physician") || lower.includes("clinical"))) {
    evidenceScore += 0.12;
  }

  if (looksIrrelevant) {
    evidenceScore = Math.min(evidenceScore, 0.06);
  } else if (medicalHits === 0) {
    evidenceScore = Math.min(evidenceScore, 0.18);
  }

  const blended = looksIrrelevant
    ? clamp(Math.min(0.06, similarity * 0.3))
    : clamp(evidenceScore * 0.72 + similarity * 0.28);
  const reasoningParts = [
    `source=${input.sourceType}`,
    `similarity=${similarity.toFixed(2)}`,
    `medical_hits=${medicalHits}`,
  ];
  if (family !== "general") reasoningParts.push(`family=${family}`);
  if (looksIrrelevant) reasoningParts.push("irrelevant-document penalty");
  if (lower.includes("medical necessity")) reasoningParts.push("medical-necessity match");
  if (lower.includes("authorization")) reasoningParts.push("authorization match");
  if (lower.includes("coverage") || lower.includes("policy")) reasoningParts.push("coverage match");
  if (/\b\d{5}\b/.test(lower)) reasoningParts.push("procedure code match");

  return {
    relevanceScore: Number(blended.toFixed(2)),
    confidence: Number(
      clamp(
        looksIrrelevant ? 0.78 : 0.46 + similarity * 0.24 + Math.min(0.2, medicalHits * 0.01)
      ).toFixed(2)
    ),
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
