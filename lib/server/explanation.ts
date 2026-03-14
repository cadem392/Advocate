import { AnalysisResult, AttackTreeNode, BlindSpotSignal, BranchScore, EvidenceItem, Explanation } from "@/lib/types";

export function buildExplanation(params: {
  analysis: AnalysisResult;
  recommendedNode?: AttackTreeNode;
  branchScores?: BranchScore[];
  evidenceItems?: EvidenceItem[];
  blindSpotSignals?: BlindSpotSignal[];
}): Explanation {
  const { analysis, recommendedNode, branchScores = [], evidenceItems = [], blindSpotSignals = [] } = params;
  const selectedScore = recommendedNode
    ? branchScores.find((score) => score.branchId === recommendedNode.id)
    : undefined;

  const strongestSignals = [
    analysis.appealGrounds[0]?.argument,
    analysis.billingErrors[0]?.description,
    blindSpotSignals[0]?.primaryLabel,
  ].filter(Boolean) as string[];

  const evidenceUsed = evidenceItems
    .filter((item) => !item.missing)
    .slice(0, 3)
    .map((item) => item.label);

  const missingInfo = evidenceItems
    .filter((item) => item.missing)
    .slice(0, 3)
    .map((item) => item.label);

  const fallbackOptions = branchScores
    .filter((score) => !recommendedNode || score.branchId !== recommendedNode.id)
    .sort((a, b) => b.viabilityScore - a.viabilityScore)
    .slice(0, 2)
    .map((score) => score.branchTemplateId);

  return {
    recommendedNodeId: recommendedNode?.id,
    whySelected: recommendedNode
      ? `${recommendedNode.label} is the highest-priority next step based on available evidence, deadline pressure, and current appeal strength${
          selectedScore ? ` (viability ${selectedScore.viabilityScore.toFixed(2)})` : ""
        }.`
      : "No single branch was recommended because the case does not yet contain enough structured evidence.",
    strongestSignals,
    evidenceUsed,
    missingInfo,
    fallbackOptions,
  };
}
