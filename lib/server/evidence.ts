import {
  AnalysisResult,
  AttackTreeNode,
  EvidenceItem,
  EvidenceRelevanceRequest,
  StructuredFacts,
} from "@/lib/types";
import { getEvidenceRelevanceScore } from "@/lib/server/model-service";

function buildBaseEvidenceItems(
  analysis: AnalysisResult,
  structuredFacts?: StructuredFacts
): EvidenceItem[] {
  const items: EvidenceItem[] = [];

  for (const error of analysis.billingErrors) {
    items.push({
      id: error.id || `evidence-${items.length + 1}`,
      label: error.cptCode ? `${error.cptCode} billing support` : error.type,
      sourceType: "derived_signal",
      snippet: error.evidence,
      relevanceScore: 0,
      missing: false,
    });
  }

  for (const ground of analysis.appealGrounds) {
    items.push({
      id: ground.id || `ground-${items.length + 1}`,
      label: ground.regulation || ground.basis,
      sourceType: ground.regulation ? "regulation" : "derived_signal",
      snippet: ground.argument,
      relevanceScore: 0,
      missing: false,
    });
  }

  const lineItems = structuredFacts?.lineItems || [];
  const hasDeniedLineItem = lineItems.some((item) => item.status === "denied");
  if (!hasDeniedLineItem) {
    items.push({
      id: "missing-denied-line-items",
      label: "Detailed denied line items",
      sourceType: "user_document",
      snippet: "Upload or transcribe the insurer's detailed denied service rows and codes.",
      relevanceScore: 0,
      missing: true,
    });
  }

  if (!analysis.appealGrounds.some((ground) => ground.basis === "medical_necessity")) {
    items.push({
      id: "missing-clinical-support",
      label: "Clinical support letter",
      sourceType: "provider_note",
      snippet: "A physician or therapist letter materially strengthens most denial appeals.",
      relevanceScore: 0,
      missing: true,
    });
  }

  return items.slice(0, 8);
}

function buildEvidenceRequest(
  item: EvidenceItem,
  analysis: AnalysisResult,
  structuredFacts?: StructuredFacts,
  recommendedNode?: AttackTreeNode
): EvidenceRelevanceRequest {
  return {
    label: item.label,
    snippet: item.snippet,
    sourceType: item.sourceType,
    missing: item.missing,
    analysisSummary: analysis.summary,
    denialReason: structuredFacts?.denialReason || analysis.summary,
    patientContext: analysis.patientContext,
    insurer: structuredFacts?.insurer,
    appealGrounds: analysis.appealGrounds.map((ground) => `${ground.basis} ${ground.argument}`),
    issueClass: analysis.appealGrounds.map((ground) => ground.basis).join(" "),
    branchType: recommendedNode?.label || recommendedNode?.type,
    targetNodeLabel: recommendedNode?.label,
    targetNodeType: recommendedNode?.type,
  };
}

export async function deriveEvidenceItems(
  analysis: AnalysisResult,
  structuredFacts?: StructuredFacts,
  recommendedNode?: AttackTreeNode
): Promise<EvidenceItem[]> {
  const baseItems = buildBaseEvidenceItems(analysis, structuredFacts);

  const scoredItems = await Promise.all(
    baseItems.map(async (item) => {
      const score = await getEvidenceRelevanceScore(
        buildEvidenceRequest(item, analysis, structuredFacts, recommendedNode)
      );

      return {
        ...item,
        relevanceScore: score.relevanceScore,
        scoreSource: score.source,
        scoreConfidence: score.confidence,
        // Fix 17: carry fallback-scoring warnings into the UI-facing evidence metadata.
        scoreReasoning: score.warning ? `${score.reasoning} ${score.warning}` : score.reasoning,
      };
    })
  );

  return scoredItems.sort((left, right) => right.relevanceScore - left.relevanceScore);
}
