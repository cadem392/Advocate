import { NextRequest, NextResponse } from "next/server";
import { callOpenAI, sanitizePromptInput } from "@/lib/openai";
import { BERT_ASSISTANT_PROMPT } from "@/lib/prompts";
import { getOpenAIApiKey } from "@/lib/server/env";
import { applyRateLimit } from "@/lib/server/rate-limit";
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

type BertIntent =
  | "deadline"
  | "authorization"
  | "insurer"
  | "denial_reason"
  | "evidence"
  | "branch"
  | "draft"
  | "next_step"
  | "summary"
  | "status";

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "llama3.2:1b";
const BERT_GROUNDING_RULES =
  "Stay grounded in the provided case context and current product behavior. If a fact is missing, say it is not found in the case. Do not invent insurer rules, deadlines, or submission outcomes. Prefer concise, actionable guidance tied to the selected branch, uploaded evidence, and current page.";

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

function uniqueSuggestions(items: string[]) {
  return Array.from(new Set(items.map((item) => item.trim()).filter(Boolean))).slice(0, 3);
}

function asSentence(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return trimmed;
  return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`;
}

function detectIntent(message: string, stage: string): BertIntent {
  const normalized = message.toLowerCase();

  if (/deadline|when due|how long|days|urgent|time limit/.test(normalized)) return "deadline";
  if (/prior authorization|authorization|preauth|pre-auth/.test(normalized)) return "authorization";
  if (/insurer|insurance|carrier|plan/.test(normalized)) return "insurer";
  if (/denial|why denied|reason/.test(normalized)) return "denial_reason";
  if (/evidence|upload|document|missing|support|records/.test(normalized)) return "evidence";
  if (/branch|node|selected|tree|why is/.test(normalized)) return "branch";
  if (/draft|letter|appeal header|formal|rewrite/.test(normalized)) return "draft";
  if (/status|track|follow up|follow-up|monitor/.test(normalized)) return "status";
  if (/next|what should i do first|what do i do first|what now|best move|recommended/.test(normalized)) {
    return "next_step";
  }
  if (/summary|summarize|overview|what is this case/.test(normalized)) return "summary";

  switch (stage) {
    case "evidence":
      return "evidence";
    case "draft":
      return "draft";
    case "status":
      return "status";
    default:
      return "next_step";
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

function buildIntentSuggestions(intent: BertIntent, stage: string, selectedNodeLabel?: string) {
  switch (intent) {
    case "deadline":
      return uniqueSuggestions([
        "What is the best next step right now?",
        "What evidence should I upload first?",
        "What happens after I generate strategy?",
      ]);
    case "authorization":
      return uniqueSuggestions([
        "What proof should I upload next?",
        "What is missing from the current case?",
        "Why is this branch recommended?",
      ]);
    case "insurer":
      return uniqueSuggestions([
        "What is the denial reason?",
        "What deadline matters most?",
        "Summarize the case for me",
      ]);
    case "denial_reason":
      return uniqueSuggestions([
        "What evidence best rebuts this denial?",
        "What should I do first?",
        "Why is this branch recommended?",
      ]);
    case "evidence":
      return uniqueSuggestions([
        "Which evidence gap matters most?",
        selectedNodeLabel ? `Why is "${selectedNodeLabel}" important?` : "Why is this branch important?",
        "How should I strengthen the draft?",
      ]);
    case "branch":
      return uniqueSuggestions([
        "What evidence supports this branch?",
        "What should I do after this branch?",
        "What is missing from this branch?",
      ]);
    case "draft":
      return uniqueSuggestions([
        "What evidence should I cite?",
        "What is missing from the packet?",
        "What should I confirm before export?",
      ]);
    case "status":
      return uniqueSuggestions([
        "What should I monitor now?",
        "When should I upload more evidence?",
        "What is the next filing step?",
      ]);
    case "summary":
      return uniqueSuggestions([
        "What should I do first?",
        "What evidence is missing?",
        "What is the draftable next document?",
      ]);
    default:
      return uniqueSuggestions([
        "What should I do first?",
        "Which evidence gap matters most?",
        stage === "draft" ? "How do I strengthen this draft?" : "What should I upload next?",
      ]);
  }
}

function buildGroundedReply(payload: BertAssistantRequest) {
  const fallback = buildFallbackReply(payload);
  const stage = getStageLabel(payload.stage, payload.pathname);
  const intent = detectIntent(payload.message, stage);
  const message = payload.message.toLowerCase();
  const firstDeadline = payload.analysis?.deadlines?.[0];
  const insurer = payload.structuredFacts?.insurer || "not found in the case";
  const claimNumber = payload.structuredFacts?.claimNumber || "not found in the case";
  const denialReason =
    payload.structuredFacts?.denialReason || payload.analysis?.summary || "not found in the case";
  const selectedNode =
    payload.strategy?.nodes.find((node) => node.id === payload.selectedNodeId) ||
    payload.strategy?.nodes.find((node) => node.label === payload.selectedNodeLabel);
  const selectedNodeLabel = selectedNode?.label || payload.selectedNodeLabel || "not found in the case";
  const linkedEvidence =
    payload.strategy?.evidenceItems
      ?.filter((item) => !selectedNode?.id || item.supportsNodeIds?.includes(selectedNode.id))
      .slice(0, 3)
      .map((item) => item.label) || [];
  const missingEvidence =
    payload.strategy?.evidenceItems
      ?.filter((item) => item.missing)
      .slice(0, 3)
      .map((item) => item.label) || [];
  const topEvidence =
    payload.strategy?.evidenceItems
      ?.slice()
      .sort((left, right) => right.relevanceScore - left.relevanceScore)
      .slice(0, 3)
      .map((item) => `${item.label} (${Math.round(item.relevanceScore * 100)}%)`) || [];
  const nextNode =
    payload.strategy?.nodes.find((node) => node.id === payload.strategy?.explanation?.recommendedNodeId) ||
    payload.strategy?.nodes.find((node) => node.type === "action") ||
    payload.strategy?.nodes.find((node) => node.type === "document");
  const hasPriorAuthorization =
    /prior authorization|authorization/i.test(payload.documentText || "") ||
    /prior authorization|authorization/i.test(payload.structuredFacts?.denialReason || "");
  const caseSummary = [
    `Insurer: ${insurer}.`,
    `Claim number: ${claimNumber}.`,
    `Denial reason: ${denialReason}.`,
    firstDeadline
      ? `Current deadline: ${firstDeadline.action} by ${firstDeadline.date} (${firstDeadline.daysRemaining} days remaining).`
      : "Current deadline: not found in the case.",
  ];

  let reply = "";
  let preferDeterministic = true;

  switch (intent) {
    case "deadline":
      reply = firstDeadline
        ? `${caseSummary[3]} Immediate focus: ${nextNode?.label || "prepare the next case step"} before the filing window closes.`
        : "The filing deadline is not found in the case. Add the denial notice date or the appeal window text to make timing guidance reliable.";
      break;
    case "authorization":
      reply = hasPriorAuthorization
        ? "Prior authorization is mentioned in the current case text. The next step is to confirm whether the denial is specifically tied to authorization language and upload any authorization records, referral confirmations, or plan criteria that govern approval."
        : "I do not see proof of prior authorization in the current case data. If authorization matters for this denial, upload the referral trail, approval request, portal confirmation, or plan policy language that shows whether authorization was required.";
      break;
    case "insurer":
      reply = `${caseSummary[0]} ${caseSummary[1]} ${caseSummary[2]}`;
      break;
    case "denial_reason":
      reply = `${caseSummary[2]} The best rebuttal is usually the strongest provider-facing evidence plus the policy or coverage language tied to the denied service.`;
      break;
    case "evidence":
      reply = [
        `For the current branch, the strongest linked evidence is ${listItems(linkedEvidence, "not found in the case")}.`,
        `The main missing evidence is ${listItems(missingEvidence, "not found in the case")}.`,
        topEvidence.length
          ? `Highest-scoring evidence in the case: ${topEvidence.join(", ")}.`
          : "No scored evidence is available yet.",
      ].join(" ");
      break;
    case "branch":
      reply = [
        `The selected branch is ${selectedNodeLabel}.`,
        selectedNode?.description || "A detailed branch description is not found in the case.",
        nextNode?.id && nextNode.id !== selectedNode?.id
          ? `After this branch, the next recommended step is ${nextNode.label}.`
          : "This branch is currently the recommended step.",
      ].join(" ");
      break;
    case "draft":
      reply = [
        `The draft should focus on ${denialReason}.`,
        topEvidence.length
          ? `Cite the strongest evidence first: ${topEvidence.join(", ")}.`
          : "Upload and score evidence before trying to strengthen the draft.",
        missingEvidence.length
          ? `Still missing: ${missingEvidence.join(", ")}.`
          : "The current evidence gaps are not flagged in the case.",
      ].join(" ");
      break;
    case "status":
      reply = [
        firstDeadline
          ? `${caseSummary[3]}`
          : "The next filing deadline is not found in the case.",
        `Current branch focus: ${selectedNodeLabel}.`,
        "If new evidence arrives, upload it and refresh the strategy before exporting again.",
      ].join(" ");
      break;
    case "summary":
      reply = [
        ...caseSummary,
        `Current branch: ${selectedNodeLabel}.`,
        `Most useful evidence right now: ${listItems(topEvidence, "not found in the case")}.`,
      ].join(" ");
      break;
    case "next_step":
      reply = [
        `Case summary: ${denialReason}.`,
        `Best next step: ${nextNode?.label || selectedNodeLabel || "review the current case branch"}.`,
        asSentence(
          nextNode?.description || selectedNode?.description || "The case needs a clearer next action in the current strategy"
        ),
        missingEvidence.length
          ? `Before moving forward, try to close this gap first: ${missingEvidence[0]}.`
          : "The case does not currently flag a missing evidence item.",
      ].join(" ");
      preferDeterministic = true;
      break;
    default:
      reply = [
        ...caseSummary,
        `Recommended next step: ${nextNode?.label || (selectedNodeLabel !== "not found in the case" ? selectedNodeLabel : "use the current recommended branch and close the missing evidence gap first")}.`,
      ].join(" ");
      preferDeterministic = false;
  }

  return {
    reply,
    suggestions: buildIntentSuggestions(intent, stage, selectedNodeLabel),
    mode: "grounded" as const,
    preferDeterministic,
  };
}

async function callOllama(messages: Array<{ role: "system" | "user"; content: string }>) {
  const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      stream: false,
      options: {
        temperature: 0.2,
      },
      messages,
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(body || `Ollama API error ${response.status}`);
  }

  const data = (await response.json()) as {
    message?: { content?: string };
  };
  const content = data?.message?.content?.trim();
  if (!content) {
    throw new Error("Ollama returned empty response");
  }
  return content;
}

export async function POST(request: NextRequest) {
  const limited = applyRateLimit(request);
  if (limited) return limited;

  try {
    const payload = (await request.json()) as BertAssistantRequest;
    const message = payload.message?.trim();

    if (!message) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    const apiKey = getOpenAIApiKey();
    const grounded = buildGroundedReply(payload);
    const contextSummary = buildContextSummary(payload);
    const systemPrompt = `${BERT_ASSISTANT_PROMPT}\n\n${BERT_GROUNDING_RULES}`; // Keep the local assistant tightly aligned to the supplied case data.

    if (grounded.preferDeterministic) {
      return NextResponse.json({
        reply: grounded.reply,
        suggestions: grounded.suggestions,
        mode: grounded.mode,
      });
    }

    try {
      const completion = await callOllama([
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `${sanitizePromptInput(
            contextSummary
          )}\n\nRewrite the following grounded answer for clarity without adding any new facts. If a fact is missing, keep the phrase "not found in the case" unchanged.\n${grounded.reply}`,
        },
      ]);

      return NextResponse.json({
        reply: completion.trim() || grounded.reply,
        suggestions: grounded.suggestions,
        mode: "ollama" as const,
      });
    } catch (ollamaError) {
      console.warn("BERT assistant Ollama rewrite error:", ollamaError);
    }

    if (!apiKey) {
      return NextResponse.json(grounded);
    }

    try {
      const completion = await callOpenAI(
        apiKey,
        [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `${sanitizePromptInput(
              contextSummary
            )}\n\nRewrite the following grounded answer for clarity without adding any new facts. If a fact is missing, keep the phrase "not found in the case" unchanged.\n${grounded.reply}`,
          },
        ],
        450
      );

      return NextResponse.json({
        reply: completion.trim() || grounded.reply,
        suggestions: grounded.suggestions,
        mode: "llm" as const,
      });
    } catch (openAiError) {
      console.warn("BERT assistant OpenAI rewrite error:", openAiError);
      return NextResponse.json(grounded);
    }
  } catch (error) {
    console.error("BERT assistant error:", error);
    return NextResponse.json(
      { reply: "I can still guide the flow, but the assistant request failed. Keep the case specific: upload the source document, confirm the denial reason, and move to the recommended next branch.", suggestions: ["What should I upload first?", "What should I do next?"], mode: "fallback" },
      { status: 200 }
    );
  }
}
