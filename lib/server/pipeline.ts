import {
  AnalyzeRequest,
  AnalysisResult,
  AttackTree,
  CasePipelineResult,
  CaseReanalysisRequest,
  BranchScore,
  DraftRequest,
  DraftDocument,
  StrategyRequest,
  StructuredFacts,
  StructureRequest,
  UploadedEvidenceInput,
  EvidenceItem,
} from "@/lib/types";
import { ANALYZE_PROMPT, DRAFT_PROMPT, STRATEGY_PROMPT, STRUCTURE_PROMPT } from "@/lib/prompts";
import { callOpenAI, extractJSON, isOpenAIFallbackError, sanitizePromptInput } from "@/lib/openai";
import { SAMPLE_ANALYSIS, SAMPLE_ATTACK_TREE, SAMPLE_DRAFT, SAMPLE_STRUCTURED_FACTS } from "@/lib/sample-data";
import { getOpenAIApiKey, isSampleMode } from "@/lib/server/env";
import { buildExplanation } from "@/lib/server/explanation";
import { deriveEvidenceItems } from "@/lib/server/evidence";
import { buildAppealRiskRequestFromAnalysis } from "@/lib/server/model-heuristics";
import { ValidationError } from "@/lib/server/request-validation";
import {
  heuristicAnalyze,
  heuristicDraft,
  heuristicStrategy,
  heuristicStructure,
} from "@/lib/server/heuristic-case";
import {
  getAppealRiskScore,
  getBlindSpotSignal,
  getBranchViability,
  getEvidenceRelevanceScore,
} from "@/lib/server/model-service";

const DOCUMENT_RELEVANCE_KEYWORDS = [
  "denial",
  "claim",
  "cpt",
  "eob",
  "insurer",
  "appeal",
  "diagnosis",
  "coverage",
  "deductible",
  "copay",
  "prior authorization",
  "medically necessary",
];

const LOWER_QUALITY_WARNING =
  "OpenAI API access is not configured. Results are using lower-quality heuristic estimates.";
const OPENAI_UNAVAILABLE_WARNING =
  "OpenAI API is temporarily unavailable or out of quota. Results are using lower-quality heuristic estimates.";

function ensureRelevantDocument(documentText: string) {
  const lower = documentText.toLowerCase();
  const hasKeyword = DOCUMENT_RELEVANCE_KEYWORDS.some((keyword) => lower.includes(keyword));
  if (!hasKeyword) {
    // Fix 1: block obviously unrelated documents before the pipeline starts.
    throw new ValidationError(
      "This document doesn't appear to be an insurance or medical document. Please upload a denial letter, EOB, medical bill, or policy excerpt.",
      422
    );
  }
}

function countUnknownStructuredFields(facts: StructuredFacts) {
  const values = [
    facts.patientName,
    facts.insurer,
    facts.policyNumber,
    facts.claimNumber,
    facts.dateOfService,
    facts.totalBilled,
    facts.deniedAmount,
    facts.denialReason,
    facts.denialCode,
    facts.appealDeadlineDays,
  ];

  return values.filter((value) => {
    if (value === null || value === undefined) return true;
    if (typeof value === "number") return Number.isNaN(value);
    return String(value).trim() === "" || String(value).trim().toLowerCase() === "unknown";
  }).length;
}

function ensureStructuredFactsMeaningful(facts: StructuredFacts) {
  if (countUnknownStructuredFields(facts) > 3) {
    // Fix 3: stop the pipeline when the structuring step did not recover enough signal to trust downstream steps.
    throw new ValidationError("The document couldn't be parsed properly.", 422);
  }
}

function ensureAnalysisMeaningful(analysis: AnalysisResult) {
  const missingCount = [
    analysis.summary,
    analysis.patientContext,
    analysis.deniedAmount,
    analysis.appealGrounds.length ? "present" : "",
    analysis.deadlines.length ? "present" : "",
  ].filter((value) => value === null || `${value}`.trim() === "").length;

  if (missingCount > 2) {
    throw new ValidationError("The document couldn't be analyzed reliably. Please review the extracted text and try again.", 422);
  }
}

function ensureStrategyMeaningful(tree: AttackTree) {
  if (!tree.nodes?.length || !tree.edges?.length) {
    throw new ValidationError("No actionable steps were found. The document may not contain enough case detail.", 422);
  }
}

function ensureDraftMeaningful(draft: DraftDocument) {
  if (!draft.content?.trim() || draft.content.trim().length < 120) {
    throw new ValidationError("A formal draft could not be generated from this document.", 422);
  }
}

function attachLowerQualityWarning(analysis: AnalysisResult, apiKey: string | null): AnalysisResult {
  if (apiKey) return analysis;
  const warnings = new Set([...(analysis.warnings || []), LOWER_QUALITY_WARNING]);
  return {
    ...analysis,
    warnings: Array.from(warnings),
  };
}

function attachFallbackWarning(analysis: AnalysisResult, warning: string): AnalysisResult {
  return {
    ...analysis,
    warnings: Array.from(new Set([...(analysis.warnings || []), warning])),
  };
}

export async function runStructure(request: StructureRequest): Promise<StructuredFacts> {
  if (!request.documentText?.trim()) {
    throw new Error("Document text is required");
  }

  if (isSampleMode(request.useSampleMode, request.apiKey)) {
    return SAMPLE_STRUCTURED_FACTS;
  }

  ensureRelevantDocument(request.documentText);
  const apiKey = getOpenAIApiKey(request.apiKey);
  if (!apiKey) {
    const facts = heuristicStructure(request.documentText);
    ensureStructuredFactsMeaningful(facts);
    return facts;
  }

  try {
    const raw = await callOpenAI(
      apiKey,
      [{ role: "user", content: `${STRUCTURE_PROMPT}${sanitizePromptInput(request.documentText)}` }],
      1000
    );
    const facts = JSON.parse(extractJSON(raw)) as StructuredFacts;
    ensureStructuredFactsMeaningful(facts);
    return facts;
  } catch (error) {
    if (!isOpenAIFallbackError(error)) {
      throw error;
    }
    const facts = heuristicStructure(request.documentText);
    ensureStructuredFactsMeaningful(facts);
    return facts;
  }
}

export async function runAnalyze(request: AnalyzeRequest): Promise<AnalysisResult> {
  if (!request.documentText?.trim()) {
    throw new Error("Document text is required");
  }

  if (isSampleMode(request.useSampleMode, request.apiKey)) {
    return SAMPLE_ANALYSIS;
  }

  const apiKey = getOpenAIApiKey(request.apiKey);
  if (!apiKey) {
    const structuredFacts = request.structuredFacts || heuristicStructure(request.documentText);
    ensureStructuredFactsMeaningful(structuredFacts);
    const analysis = heuristicAnalyze(
      request.documentText,
      structuredFacts
    );
    ensureAnalysisMeaningful(analysis);
    return attachLowerQualityWarning(analysis, apiKey);
  }

  try {
    const raw = await callOpenAI(
      apiKey,
      [{ role: "user", content: `${ANALYZE_PROMPT}${sanitizePromptInput(request.documentText)}` }]
    );
    const analysis = JSON.parse(extractJSON(raw)) as AnalysisResult;
    ensureAnalysisMeaningful(analysis);
    return analysis;
  } catch (error) {
    if (!isOpenAIFallbackError(error)) {
      throw error;
    }
    const structuredFacts = request.structuredFacts || heuristicStructure(request.documentText);
    ensureStructuredFactsMeaningful(structuredFacts);
    const analysis = heuristicAnalyze(request.documentText, structuredFacts);
    ensureAnalysisMeaningful(analysis);
    return attachFallbackWarning(analysis, OPENAI_UNAVAILABLE_WARNING);
  }
}

function mapNodeToIssueClass(nodeLabel: string, analysis: AnalysisResult): string {
  const text = `${nodeLabel} ${analysis.summary} ${analysis.patientContext}`.toLowerCase();
  if (text.includes("insurance") || text.includes("appeal") || text.includes("coverage")) return "Insurance - Coverage Dispute";
  if (text.includes("medical necessity")) return "Insurance - Bad Faith";
  return "Insurance - Coverage Dispute";
}

function mapNodeToJurisdiction(analysis: AnalysisResult): string {
  const text = `${analysis.summary} ${analysis.patientContext}`.toLowerCase();
  if (text.includes("california") || text.includes("ca ")) return "Ninth Circuit";
  if (text.includes("new york") || text.includes("ny ")) return "Second Circuit";
  return "Ninth Circuit";
}

export async function runStrategy(request: StrategyRequest): Promise<AttackTree> {
  if (!request.analysis) {
    throw new Error("Analysis data is required");
  }

  const appealRisk = await getAppealRiskScore(buildAppealRiskRequestFromAnalysis(request.analysis));
  const blindSpotSignal = await getBlindSpotSignal({ text: JSON.stringify(request.analysis) });

  let tree: AttackTree;

  if (isSampleMode(request.useSampleMode, request.apiKey)) {
    tree = SAMPLE_ATTACK_TREE;
  } else {
    const apiKey = getOpenAIApiKey(request.apiKey);
    if (!apiKey) {
      tree = heuristicStrategy(request.analysis, request.structuredFacts);
    } else {
      try {
        const raw = await callOpenAI(apiKey, [
          { role: "user", content: STRATEGY_PROMPT + sanitizePromptInput(JSON.stringify(request.analysis, null, 2)) },
        ]);
        tree = JSON.parse(extractJSON(raw)) as AttackTree;
      } catch (error) {
        if (!isOpenAIFallbackError(error)) {
          throw error;
        }
        tree = heuristicStrategy(request.analysis, request.structuredFacts);
      }
    }
  }

  ensureStrategyMeaningful(tree);

  const branchScores: BranchScore[] = [];
  const evidenceSignal = Math.max(
    0.2,
    Math.min(
      0.95,
      (request.analysis.appealGrounds.length + request.analysis.billingErrors.length) / 8
    )
  );

  for (const node of tree.nodes) {
    if (!["action", "document", "escalation"].includes(node.type)) continue;
    const score = await getBranchViability({
      issueClass: mapNodeToIssueClass(node.label, request.analysis),
      branchType: node.label,
      evidenceScore: evidenceSignal,
      caseSimilarity: Math.max(0.35, Math.min(0.92, 0.55 + request.analysis.appealGrounds.length * 0.07)),
      jurisdiction: mapNodeToJurisdiction(request.analysis),
    });
    branchScores.push({ ...score, branchId: node.id });
  }

  const recommendedNode = tree.nodes
    .filter((node) => ["action", "document", "escalation"].includes(node.type))
    .sort((a, b) => {
      const scoreA = branchScores.find((score) => score.branchId === a.id)?.viabilityScore || 0;
      const scoreB = branchScores.find((score) => score.branchId === b.id)?.viabilityScore || 0;
      return scoreB - scoreA;
    })[0];

  const evidenceItems = await deriveEvidenceItems(
    request.analysis,
    request.structuredFacts,
    recommendedNode
  );

  return {
    ...tree,
    evidenceItems,
    appealRisk,
    blindSpotSignals: [blindSpotSignal],
    branchScores,
    explanation: buildExplanation({
      analysis: request.analysis,
      recommendedNode,
      branchScores,
      evidenceItems,
      blindSpotSignals: [blindSpotSignal],
    }),
  };
}

export async function runDraft(request: DraftRequest): Promise<DraftDocument> {
  if (!request.nodeDescription || !request.analysis) {
    throw new Error("Required parameters missing");
  }

  if (isSampleMode(request.useSampleMode, request.apiKey)) {
    const draft = {
      type: request.documentType || "appeal_letter",
      title: request.nodeLabel,
      content: SAMPLE_DRAFT,
      keyPoints: [
        "Grounded in emergency-service exception",
        "Requests CPT correction",
        "Reserves external review rights",
      ],
      explanation: buildExplanation({ analysis: request.analysis }),
    };
    ensureDraftMeaningful(draft);
    return draft;
  }

  const apiKey = getOpenAIApiKey(request.apiKey);
  if (!apiKey) {
    const draft = {
      ...heuristicDraft(request),
      explanation: buildExplanation({ analysis: request.analysis }),
    };
    ensureDraftMeaningful(draft);
    return draft;
  }

  const ctx = `Node: ${request.nodeLabel}\nDescription: ${request.nodeDescription}\nDocument type: ${request.documentType}\nCase analysis: ${sanitizePromptInput(JSON.stringify(request.analysis))}`;
  try {
    const content = await callOpenAI(
      apiKey,
      [{ role: "user", content: DRAFT_PROMPT + ctx }],
      2500
    );

    const draft = {
      type: request.documentType || "appeal_letter",
      title: request.nodeLabel,
      content,
      keyPoints: request.analysis.appealGrounds.slice(0, 3).map((ground) => ground.argument),
      explanation: buildExplanation({ analysis: request.analysis }),
    };
    ensureDraftMeaningful(draft);
    return draft;
  } catch (error) {
    if (!isOpenAIFallbackError(error)) {
      throw error;
    }
    const draft = {
      ...heuristicDraft(request),
      explanation: buildExplanation({ analysis: request.analysis }),
    };
    ensureDraftMeaningful(draft);
    return draft;
  }
}

function summarizeEvidenceDocuments(evidenceDocuments: UploadedEvidenceInput[]): string[] {
  return evidenceDocuments
    .map((document) => {
      const category = document.category ? `${document.category.toLowerCase()}: ` : "";
      const body = document.extractedText?.trim() || document.snippet?.trim() || document.name;
      return `${category}${body}`.trim();
    })
    .filter(Boolean);
}

function buildCaseCorpus(documentText: string, evidenceDocuments: UploadedEvidenceInput[]): string {
  const evidenceSections = summarizeEvidenceDocuments(evidenceDocuments);
  if (!evidenceSections.length) return documentText;

  return [
    documentText.trim(),
    "",
    "SUPPLEMENTAL EVIDENCE",
    ...evidenceSections.map((section, index) => `${index + 1}. ${section}`),
  ]
    .filter(Boolean)
    .join("\n");
}

function normalizeUploadedText(document: UploadedEvidenceInput): string {
  // Bug fix: Handle all falsy values and return empty string if all fields are undefined
  const text = document.extractedText?.trim() || document.snippet?.trim() || document.name || "";
  return text;
}

function hasAny(haystack: string, needles: string[]): boolean {
  return needles.some((needle) => haystack.includes(needle));
}

function augmentStructuredFactsWithEvidence(
  structuredFacts: StructuredFacts,
  evidenceDocuments: UploadedEvidenceInput[]
): StructuredFacts {
  const summary = evidenceDocuments.map((document) => document.name).join(", ");
  if (!summary) return structuredFacts;

  return {
    ...structuredFacts,
    rawSummary: `${structuredFacts.rawSummary} Supplemental evidence uploaded: ${summary}.`,
  };
}

function augmentAnalysisWithEvidence(
  analysis: AnalysisResult,
  evidenceDocuments: UploadedEvidenceInput[]
): AnalysisResult {
  if (!evidenceDocuments.length) return analysis;

  const lowerDocs = evidenceDocuments.map((document) => normalizeUploadedText(document).toLowerCase());
  const hasProviderSupport = lowerDocs.some((text) =>
    hasAny(text, ["physician", "clinical", "doctor", "provider", "medical necessity"])
  );
  const hasTreatmentHistory = lowerDocs.some((text) =>
    hasAny(text, ["physical therapy", "pt ", "conservative", "treatment", "follow-up"])
  );
  const hasPolicySupport = lowerDocs.some((text) =>
    hasAny(text, ["policy", "coverage", "benefit", "section", "prior authorization"])
  );
  const hasImagingSupport = lowerDocs.some((text) =>
    hasAny(text, ["mri", "imaging", "radiology", "x-ray", "scan"])
  );

  const appealGrounds = analysis.appealGrounds.map((ground) => ({ ...ground }));

  if (hasProviderSupport) {
    const existing = appealGrounds.find((ground) => ground.basis === "medical_necessity");
    if (existing) {
      if (!existing.argument.includes("Supplemental clinician support is now attached.")) {
        existing.argument = `${existing.argument} Supplemental clinician support is now attached.`;
      }
      existing.strength = "strong";
    } else {
      appealGrounds.push({
        id: "supplemental-medical-necessity",
        basis: "medical_necessity",
        argument:
          "Supplemental clinician notes document persistent symptoms and support medical necessity for the requested service.",
        strength: "strong",
      });
    }
  }

  if (hasTreatmentHistory && !appealGrounds.some((ground) => ground.argument.toLowerCase().includes("conservative"))) {
    appealGrounds.push({
      id: "supplemental-conservative-treatment",
      basis: "medical_necessity",
      argument:
        "Uploaded treatment records document failed conservative management, strengthening the medical necessity appeal.",
      strength: hasProviderSupport ? "strong" : "moderate",
    });
  }

  if (hasPolicySupport && !appealGrounds.some((ground) => ground.basis === "coverage_terms")) {
    appealGrounds.push({
      id: "supplemental-policy-support",
      basis: "coverage_terms",
      argument:
        "Uploaded policy materials provide direct plan-language support for the requested appeal path and review standard.",
      strength: "moderate",
    });
  }

  const evidenceSummary = evidenceDocuments
    .map((document) => document.name)
    .slice(0, 3)
    .join(", ");

  const updatedSummary = [
    analysis.summary,
    evidenceSummary ? `Supplemental evidence received: ${evidenceSummary}.` : "",
    hasImagingSupport ? "Imaging-related support is now present in the case record." : "",
  ]
    .filter(Boolean)
    .join(" ");

  const riskLevel =
    hasProviderSupport || hasTreatmentHistory
      ? analysis.riskLevel === "critical"
        ? "high"
        : analysis.riskLevel === "high"
          ? "medium"
          : analysis.riskLevel
      : analysis.riskLevel;

  return {
    ...analysis,
    summary: updatedSummary,
    appealGrounds,
    patientContext:
      hasProviderSupport || hasTreatmentHistory
        ? `${analysis.patientContext} Supplemental clinical evidence uploaded.`
        : analysis.patientContext,
    riskLevel,
  };
}

async function buildUploadedEvidenceItems(
  evidenceDocuments: UploadedEvidenceInput[],
  analysis: AnalysisResult,
  structuredFacts: StructuredFacts,
  recommendedNodeId?: string
): Promise<EvidenceItem[]> {
  return Promise.all(
    evidenceDocuments.map(async (document, index) => {
      const payload = {
        label: document.name,
        snippet: normalizeUploadedText(document),
        sourceType: "uploaded_file" as const,
        analysisSummary: analysis.summary,
        denialReason: structuredFacts.denialReason,
        patientContext: analysis.patientContext,
        insurer: structuredFacts.insurer,
        appealGrounds: analysis.appealGrounds.map((ground) => `${ground.basis} ${ground.argument}`),
        targetNodeLabel: recommendedNodeId,
      };

      const score = await getEvidenceRelevanceScore(payload);

      return {
        id: document.id || `uploaded-evidence-${index + 1}`,
        label: document.name,
        sourceType: "uploaded_file" as const,
        snippet: normalizeUploadedText(document),
        relevanceScore: score.relevanceScore,
        scoreSource: score.source,
        scoreConfidence: score.confidence,
        scoreReasoning: score.reasoning,
        supportsNodeIds: recommendedNodeId ? [recommendedNodeId] : undefined,
        missing: false,
      };
    })
  );
}

function mergeEvidenceItems(
  baseItems: EvidenceItem[],
  uploadedItems: EvidenceItem[]
): EvidenceItem[] {
  const merged = new Map<string, EvidenceItem>();

  for (const item of [...uploadedItems, ...baseItems]) {
    const key = `${item.sourceType}:${item.label}:${item.snippet}`;
    if (!merged.has(key)) {
      merged.set(key, item);
    }
  }

  return Array.from(merged.values()).sort((left, right) => right.relevanceScore - left.relevanceScore);
}

function augmentDraftWithEvidence(
  draft: DraftDocument,
  evidenceDocuments: UploadedEvidenceInput[]
): DraftDocument {
  if (!evidenceDocuments.length) return draft;

  const evidenceList = evidenceDocuments
    .map((document) => `- ${document.name}`)
    .slice(0, 4)
    .join("\n");

  return {
    ...draft,
    content: `${draft.content}\n\nSUPPLEMENTAL EVIDENCE REVIEWED\n${evidenceList}`,
    keyPoints: Array.from(new Set([...draft.keyPoints, ...evidenceDocuments.slice(0, 3).map((document) => `Evidence attached: ${document.name}`)])),
  };
}

export async function runCasePipelineBundle(params: {
  documentText: string;
  useSampleMode?: boolean;
  apiKey?: string;
}): Promise<CasePipelineResult> {
  const structuredFacts = await runStructure({
    documentText: params.documentText,
    useSampleMode: params.useSampleMode,
    apiKey: params.apiKey,
  });

  const analysis = await runAnalyze({
    documentText: params.documentText,
    structuredFacts,
    useSampleMode: params.useSampleMode,
    apiKey: params.apiKey,
  });

  const strategy = await runStrategy({
    analysis,
    structuredFacts,
    useSampleMode: params.useSampleMode,
    apiKey: params.apiKey,
  });

  const draftNode =
    strategy.nodes.find((node) => node.id === strategy.explanation?.recommendedNodeId && node.documentType) ||
    strategy.nodes.find((node) => node.type === "document") ||
    strategy.nodes.find((node) => node.type === "action" || node.type === "escalation") ||
    strategy.nodes[0];

  if (!draftNode) {
    throw new ValidationError("No actionable steps were found. The document may not contain enough case detail.", 422);
  }

  const draft = await runDraft({
    nodeLabel: draftNode.label,
    nodeDescription: draftNode.description,
    documentType: draftNode.documentType || "appeal_letter",
    analysis,
    structuredFacts,
    useSampleMode: params.useSampleMode,
    apiKey: params.apiKey,
  });

  return {
    documentText: params.documentText,
    structuredFacts,
    analysis,
    strategy,
    draft,
  };
}

export async function runCaseReanalysis(
  request: CaseReanalysisRequest
): Promise<CasePipelineResult> {
  const evidenceDocuments = request.evidenceDocuments || [];
  const corpus = buildCaseCorpus(request.documentText, evidenceDocuments);
  const effectiveSampleMode = isSampleMode(request.useSampleMode, request.apiKey);

  if (!evidenceDocuments.length) {
    return runCasePipelineBundle({
      documentText: request.documentText,
      useSampleMode: request.useSampleMode,
      apiKey: request.apiKey,
    });
  }

  let result = await runCasePipelineBundle({
    documentText: corpus,
    useSampleMode: request.useSampleMode,
    apiKey: request.apiKey,
  });

  if (effectiveSampleMode) {
    const structuredFacts = augmentStructuredFactsWithEvidence(
      request.structuredFacts || result.structuredFacts || SAMPLE_STRUCTURED_FACTS,
      evidenceDocuments
    );
    const analysis = augmentAnalysisWithEvidence(
      request.analysis || result.analysis || SAMPLE_ANALYSIS,
      evidenceDocuments
    );
    const strategy = await runStrategy({
      analysis,
      structuredFacts,
      useSampleMode: true,
      apiKey: request.apiKey,
    });
    const draftNode =
      strategy.nodes.find((node) => node.id === strategy.explanation?.recommendedNodeId && node.documentType) ||
      strategy.nodes.find((node) => node.type === "document") ||
      strategy.nodes[0];
    if (!draftNode) {
      throw new ValidationError("No actionable steps were found. The document may not contain enough case detail.", 422);
    }
    const draft = augmentDraftWithEvidence(
      await runDraft({
        nodeLabel: draftNode.label,
        nodeDescription: draftNode.description,
        documentType: draftNode.documentType || "appeal_letter",
        analysis,
        structuredFacts,
        useSampleMode: true,
        apiKey: request.apiKey,
      }),
      evidenceDocuments
    );

    result = {
      documentText: request.documentText,
      structuredFacts,
      analysis,
      strategy,
      draft,
    };
  }

  const recommendedNodeId = result.strategy.explanation?.recommendedNodeId;
  const uploadedItems = await buildUploadedEvidenceItems(
    evidenceDocuments,
    result.analysis,
    result.structuredFacts,
    recommendedNodeId
  );

  return {
    ...result,
    documentText: request.documentText,
    strategy: {
      ...result.strategy,
      evidenceItems: mergeEvidenceItems(result.strategy.evidenceItems || [], uploadedItems),
      explanation: result.strategy.explanation
        ? {
            ...result.strategy.explanation,
            evidenceUsed: Array.from(
              new Set([
                ...(result.strategy.explanation.evidenceUsed || []),
                ...uploadedItems.slice(0, 4).map((item) => item.label),
              ])
            ),
            missingInfo: (result.strategy.explanation.missingInfo || []).filter((item) => {
              const lower = item.toLowerCase();
              if (lower.includes("physician") || lower.includes("clinical")) {
                return !evidenceDocuments.some((document) =>
                  hasAny(normalizeUploadedText(document).toLowerCase(), [
                    "physician",
                    "clinical",
                    "doctor",
                    "provider",
                  ])
                );
              }
              if (lower.includes("policy") || lower.includes("coverage")) {
                return !evidenceDocuments.some((document) =>
                  hasAny(normalizeUploadedText(document).toLowerCase(), [
                    "policy",
                    "coverage",
                    "benefit",
                    "section",
                  ])
                );
              }
              return true;
            }),
          }
        : result.strategy.explanation,
    },
    draft: effectiveSampleMode ? result.draft : augmentDraftWithEvidence(result.draft, evidenceDocuments),
  };
}
