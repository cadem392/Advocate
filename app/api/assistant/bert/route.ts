import { NextRequest, NextResponse } from "next/server";
import { callOpenAI } from "@/lib/openai";
import { BERT_ASSISTANT_PROMPT } from "@/lib/prompts";
import { getOpenAIApiKey } from "@/lib/server/env";
import type { AnalysisResult, AttackTree, DraftDocument, StructuredFacts } from "@/lib/types";

interface BertAssistantRequest {
  message: string;
  stage?: string;
  pathname?: string;
  documentText?: string;
  structuredFacts?: StructuredFacts;
  analysis?: AnalysisResult;
  strategy?: AttackTree;
  draft?: DraftDocument;
  selectedNodeId?: string;
  selectedNodeLabel?: string;
  selectedNodeDescription?: string;
}

function listItems(items: string[], fallback = "none"): string {
  const compact = items.map((item) => item.trim()).filter(Boolean);
  return compact.length ? compact.join(", ") : fallback;
}

function getStageLabel(stage?: string, pathname?: string) {
  if (stage) return stage;
  switch (pathname) {
    case "/workspace":
      return "workspace";
    case "/evidence":
      return "evidence";
    case "/draft":
      return "draft";
    case "/confirmation":
      return "confirmation";
    case "/status":
      return "status";
    default:
      return "intake";
  }
}

function buildContextSummary(payload: BertAssistantRequest) {
  const selectedNode =
    payload.strategy?.nodes.find((node) => node.id === payload.selectedNodeId) ||
    payload.strategy?.nodes.find((node) => node.label === payload.selectedNodeLabel);
  const missingEvidence =
    payload.strategy?.evidenceItems
      ?.filter((item) => item.missing)
      .slice(0, 4)
      .map((item) => item.label) || [];
  const linkedEvidence =
    payload.strategy?.evidenceItems
      ?.filter((item) => !selectedNode?.id || item.supportsNodeIds?.includes(selectedNode.id))
      .slice(0, 4)
      .map((item) => item.label) || [];
  const deadlines =
    payload.analysis?.deadlines
      ?.slice(0, 3)
      .map((deadline) => `${deadline.action} (${deadline.date}, ${deadline.daysRemaining} days)`) || [];
  const nextDraftNode =
    payload.strategy?.nodes.find((node) => node.type === "document" || node.type === "action");

  return [
    `Stage: ${getStageLabel(payload.stage, payload.pathname)}`,
    `User message: ${payload.message}`,
    `Document preview: ${(payload.documentText || "").replace(/\s+/g, " ").trim().slice(0, 1000) || "none"}`,
    `Insurer: ${payload.structuredFacts?.insurer || "unknown"}`,
    `Claim number: ${payload.structuredFacts?.claimNumber || "unknown"}`,
    `Denial reason: ${payload.structuredFacts?.denialReason || payload.analysis?.summary || "unknown"}`,
    `Analysis risk level: ${payload.analysis?.riskLevel || "unknown"}`,
    `Deadlines: ${listItems(deadlines)}`,
    `Selected node: ${selectedNode?.label || payload.selectedNodeLabel || "unknown"}`,
    `Selected node description: ${selectedNode?.description || payload.selectedNodeDescription || "unknown"}`,
    `Evidence linked to selected node: ${listItems(linkedEvidence)}`,
    `Missing evidence: ${listItems(missingEvidence)}`,
    `Recommended node: ${nextDraftNode?.label || payload.strategy?.explanation?.recommendedNodeId || "unknown"}`,
    `Draft title: ${payload.draft?.title || "none"}`,
  ].join("\n");
}

function buildFallbackReply(payload: BertAssistantRequest) {
  const stage = getStageLabel(payload.stage, payload.pathname);
  const insurer = payload.structuredFacts?.insurer || "the insurer";
  const denialReason = payload.structuredFacts?.denialReason || "the current denial";
  const selectedNode =
    payload.strategy?.nodes.find((node) => node.id === payload.selectedNodeId) ||
    payload.strategy?.nodes.find((node) => node.label === payload.selectedNodeLabel);
  const firstDeadline = payload.analysis?.deadlines?.[0];
  const missingEvidence =
    payload.strategy?.evidenceItems?.filter((item) => item.missing).map((item) => item.label) || [];
  const nextNode =
    payload.strategy?.nodes.find((node) => node.id === payload.strategy?.explanation?.recommendedNodeId) ||
    payload.strategy?.nodes.find((node) => node.type === "document") ||
    payload.strategy?.nodes.find((node) => node.type === "action");

  let reply = "";
  let suggestions: string[] = [];

  switch (stage) {
    case "intake":
      reply = `Start by uploading or pasting the strongest source document you have: denial letter, EOB, policy excerpt, or provider note. Once the text is in the intake panel, generate the case strategy so Advocate can classify ${denialReason} and map the next branch. If the upload only extracts partial text, keep typing directly in the panel to fill in claim number, denied service, deadlines, and any provider facts.`;
      suggestions = [
        "What should I upload first?",
        "What details matter most in the intake box?",
        "What happens after I generate strategy?",
      ];
      break;
    case "workspace":
      if (selectedNode?.type === "evidence") {
        reply = `You currently have "${selectedNode.label}" selected. Treat this branch as the evidence unlock for the appeal. Upload the most direct clinical support first, then add policy language or treatment history that closes the gap identified in the denial. Once those records are linked, return to ${nextNode?.label || "the recommended action branch"} and strengthen the draft with those citations.`;
      } else if (selectedNode?.type === "deadline") {
        reply = `You currently have "${selectedNode.label}" selected. This branch is about timing discipline: confirm the filing window, finish the supporting packet before submission, and preserve escalation rights if the internal appeal fails. Do not wait on perfect documentation if the deadline is the immediate risk.`;
      } else if (selectedNode?.type === "document") {
        reply = `You currently have "${selectedNode.label}" selected. This branch is where the case becomes a formal appeal record. Make the denial reason explicit, cite the strongest available evidence, and keep the requested remedy precise so the reviewer can act on the packet quickly.`;
      } else {
        reply = `The workspace should answer three questions first: why ${insurer} denied the case, what deadline matters most, and which branch unlocks the next document. ${selectedNode ? `You currently have "${selectedNode.label}" selected.` : ""} Your current best move is ${nextNode?.label || "the recommended action branch"}. If that branch is blocked, fill the evidence gaps first: ${listItems(missingEvidence.slice(0, 3), "provider support and policy language")}.`;
      }
      suggestions = [
        "What should I do first?",
        "Which evidence gap matters most?",
        selectedNode ? `Why is "${selectedNode.label}" important?` : "Why is this branch recommended?",
      ];
      break;
    case "evidence":
      reply = `Use this page to strengthen the case, not just store files. The most useful uploads are documents that directly rebut ${denialReason}, especially provider notes, therapy records, imaging history, and coverage language. ${selectedNode ? `For the selected branch "${selectedNode.label}", prioritize evidence that directly supports that branch.` : ""} After upload, check the relevance score, then verify and link the document so it can influence the refreshed case strategy.`;
      suggestions = [
        "What documents matter most?",
        "Why is this score low?",
        "What should I upload next?",
      ];
      break;
    case "draft":
      reply = `Treat the draft as the argument layer built on top of the case graph. Tighten it by inserting the highest-relevance evidence, naming the denial reason clearly, and referencing the strongest appeal grounds before export. If something still feels weak, it is usually because a provider rationale, policy excerpt, or deadline detail is still missing.`;
      suggestions = [
        "How do I strengthen this draft?",
        "What evidence should I cite?",
        "What is still missing?",
      ];
      break;
    case "confirmation":
      reply = `Before transmitting, confirm the packet contains the current draft, the highest-relevance evidence, and the deadline-sensitive instructions. If ${insurer} requires a specific submission method, note that in the confirmation step and preserve the tracking details so the status page has a reliable audit trail.`;
      suggestions = [
        "What should I confirm before sending?",
        "What is missing from the packet?",
      ];
      break;
    case "status":
      reply = `Use the status page as the operating log for the case. Watch the submission method, tracking details, and next follow-up trigger${firstDeadline ? `, especially ${firstDeadline.action} by ${firstDeadline.date}` : ""}. If new evidence arrives, bring it back into the case so the strategy and draft stay aligned.`;
      suggestions = [
        "What should I monitor now?",
        "When should I upload more evidence?",
      ];
      break;
    default:
      reply = `I can guide you through intake, evidence, strategy, drafting, and submission. Right now the most important next step is to make the case specific: upload or paste the source document, confirm the denial reason, and fill in any missing evidence before moving forward.`;
      suggestions = [
        "What should I do next?",
        "What information is missing?",
      ];
  }

  return { reply, suggestions, mode: "fallback" as const };
}

export async function POST(request: NextRequest) {
  try {
    const payload = (await request.json()) as BertAssistantRequest;
    const message = payload.message?.trim();

    if (!message) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    const apiKey = getOpenAIApiKey();
    const fallback = buildFallbackReply(payload);

    if (!apiKey) {
      return NextResponse.json(fallback);
    }

    const contextSummary = buildContextSummary(payload);
    const completion = await callOpenAI(
      apiKey,
      [
        { role: "system", content: BERT_ASSISTANT_PROMPT },
        { role: "user", content: `${contextSummary}\n\nAnswer the user.` },
      ],
      450
    );

    return NextResponse.json({
      reply: completion.trim() || fallback.reply,
      suggestions: fallback.suggestions,
      mode: "llm" as const,
    });
  } catch (error) {
    console.error("BERT assistant error:", error);
    return NextResponse.json(
      { reply: "I can still guide the flow, but the assistant request failed. Keep the case specific: upload the source document, confirm the denial reason, and move to the recommended next branch.", suggestions: ["What should I upload first?", "What should I do next?"], mode: "fallback" },
      { status: 200 }
    );
  }
}
