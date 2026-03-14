"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  Check,
  Download,
  Edit3,
  FileSearch,
  FileText,
  GitPullRequest,
  Maximize2,
  MessageSquare,
  ShieldCheck,
  Target,
  TrendingUp,
  ZoomIn,
} from "lucide-react";
import { AdvocateNav } from "@/components/advocate-nav";
import { AttackTreeCanvas } from "@/components/attack-tree";
import { FormalLetterPreview } from "@/components/formal-letter-preview";
import {
  createFallbackCaseSession,
  loadCaseSession,
  updateCaseSession,
  type CaseSessionState,
} from "@/lib/client/case-session";
import { syncCaseSessionRecord } from "@/lib/client/run-case-pipeline";
import { AttackTreeNode, EvidenceItem } from "@/lib/types";

function formatDateLabel(value?: string) {
  if (!value) return "Review pending";
  return value;
}

function formatPercent(value?: number) {
  return `${Math.round((value || 0) * 100)}%`;
}

function getNodeStyle(node?: AttackTreeNode) {
  switch (node?.type) {
    case "document":
      return {
        color: "#C4A747",
        label: "Document",
        icon: FileText,
      };
    case "escalation":
      return {
        color: "#D97706",
        label: "Escalation",
        icon: TrendingUp,
      };
    case "evidence":
      return {
        color: "#2563EB",
        label: "Evidence",
        icon: FileSearch,
      };
    case "deadline":
      return {
        color: "#B83A3A",
        label: "Deadline",
        icon: AlertCircle,
      };
    case "outcome":
      return {
        color: "#6B6B6B",
        label: "Outcome",
        icon: Target,
      };
    default:
      return {
        color: "#1B5E3F",
        label: "Action",
        icon: GitPullRequest,
      };
  }
}

function buildEvidenceChecklist(items: EvidenceItem[]) {
  return items.slice(0, 4).map((item) => ({
    label: item.label,
    checked: !item.missing,
  }));
}

function truncateNodeCopy(value?: string, maxLength = 96) {
  if (!value) return "Pending";
  return value.length > maxLength ? `${value.slice(0, maxLength - 1).trim()}...` : value;
}

function buildRelatedEvidence(node: AttackTreeNode | undefined, items: EvidenceItem[]) {
  const preferred = items
    .filter((item) => !node?.id || item.supportsNodeIds?.includes(node.id))
    .sort((left, right) => right.relevanceScore - left.relevanceScore);

  if (preferred.length) return preferred.slice(0, 3);
  return items
    .slice()
    .sort((left, right) => right.relevanceScore - left.relevanceScore)
    .slice(0, 3);
}

function buildNodeSuggestions(
  node: AttackTreeNode | undefined,
  analysis: CaseSessionState["analysis"],
  relatedEvidence: EvidenceItem[]
) {
  if (!node) {
    return {
      title: "Recommended next moves",
      bullets: ["Select a branch to inspect the next step, missing evidence, and supporting actions."],
      bertPrompt: "Help me understand the current recommended branch and what to do next.",
      primaryHref: "/draft",
      primaryLabel: "Open Draft",
    };
  }

  const firstDeadline = analysis.deadlines[0];

  switch (node.type) {
    case "evidence":
      return {
        title: "Evidence suggestions",
        bullets: relatedEvidence.length
          ? relatedEvidence.map(
              (item) =>
                `${item.label} (${formatPercent(item.relevanceScore)}) — ${truncateNodeCopy(item.snippet, 84)}`
            )
          : [
              "Upload a provider support letter explaining why the denied service was medically necessary.",
              "Add policy language or prior authorization criteria tied to the denial rationale.",
            ],
        bertPrompt: `I selected the evidence node "${node.label}". Tell me exactly what evidence to upload next and why it matters.`,
        primaryHref: "/evidence",
        primaryLabel: "Open Evidence Vault",
      };
    case "document":
      return {
        title: "Drafting suggestions",
        bullets: [
          "Lead with the denial reason and identify the disputed service lines clearly.",
          "Cite the strongest provider or policy evidence before the closing request.",
          ...(analysis.appealGrounds.slice(0, 2).map((ground) => ground.argument) || []),
        ].slice(0, 4),
        bertPrompt: `I selected the document node "${node.label}". How should I strengthen this appeal draft before export?`,
        primaryHref: "/draft",
        primaryLabel: "Open Draft Editor",
      };
    case "deadline":
      return {
        title: "Deadline guidance",
        bullets: [
          node.description,
          ...(firstDeadline
            ? [
                `${firstDeadline.action}: ${firstDeadline.date}`,
                `Missing this window can lead to: ${firstDeadline.consequence}`,
              ]
            : []),
        ].slice(0, 3),
        bertPrompt: `I selected the deadline node "${node.label}". What should I do immediately to avoid missing this deadline?`,
        primaryHref: "/confirmation",
        primaryLabel: "Prepare Submission",
      };
    case "escalation":
      return {
        title: "Escalation guidance",
        bullets: [
          "Keep the internal appeal packet complete before moving to external review.",
          "Preserve all tracking details and insurer responses for the escalation record.",
          "Use a stronger clinical and policy record than the first submission.",
        ],
        bertPrompt: `I selected the escalation node "${node.label}". Explain when to use this path and what must be ready first.`,
        primaryHref: "/confirmation",
        primaryLabel: "Prepare Packet",
      };
    case "outcome":
      return {
        title: "Outcome target",
        bullets: [
          "Aim to reverse the denial or narrow patient responsibility with documented evidence.",
          "Keep the file updated so the next submission reflects every uploaded record.",
        ],
        bertPrompt: `I selected the outcome node "${node.label}". What are the best moves to maximize the odds of reaching this outcome?`,
        primaryHref: "/status",
        primaryLabel: "View Status",
      };
    default:
      return {
        title: "Recommended branch",
        bullets: [
          node.description,
          ...(analysis.appealGrounds.slice(0, 2).map((ground) => ground.argument) || []),
        ].slice(0, 3),
        bertPrompt: `I selected the action node "${node.label}". Break down the next step and the strongest supporting evidence.`,
        primaryHref: "/draft",
        primaryLabel: "Build Draft",
      };
  }
}

function openBertPrompt(prompt: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent("advocate:bert-prompt", {
      detail: {
        prompt,
        open: true,
      },
    })
  );
}

export default function WorkspacePage() {
  const [caseState, setCaseState] = useState<CaseSessionState | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    setCaseState(loadCaseSession() || createFallbackCaseSession());
  }, []);

  const resolved = caseState || createFallbackCaseSession();
  const { structuredFacts, analysis, strategy, draft } = resolved;

  const selectedNode =
    strategy.nodes.find((node) => node.id === resolved.selectedNodeId) ||
    strategy.nodes.find((node) => node.id === strategy.explanation?.recommendedNodeId) ||
    strategy.nodes.find((node) => node.type === "action") ||
    strategy.nodes[0];

  const deadline = analysis.deadlines[0];
  const evidenceChecklist = buildEvidenceChecklist(strategy.evidenceItems || []);
  const appealGrounds = analysis.appealGrounds.slice(0, 2);
  const relatedEvidence = buildRelatedEvidence(selectedNode, strategy.evidenceItems || []);
  const nodeSuggestions = buildNodeSuggestions(selectedNode, analysis, relatedEvidence);
  const selectedStyle = getNodeStyle(selectedNode);
  const SelectedIcon = selectedStyle.icon;

  function persist(
    updater: Parameters<typeof updateCaseSession>[0],
    nextNotice?: string
  ) {
    const next = updateCaseSession(updater);
    setCaseState(next);
    if (nextNotice) setNotice(nextNotice);
    void syncCaseSessionRecord(next).then(setCaseState).catch(() => undefined);
  }

  function handleNodeClick(node: AttackTreeNode) {
    persist(
      (current) => ({
        ...current,
        selectedNodeId: node.id,
      }),
      `${node.label} selected. Branch guidance updated.`
    );
  }

  function downloadDraft() {
    const blob = new Blob([resolved.draftEditor.content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${structuredFacts.claimNumber || "advocate-draft"}.txt`;
    anchor.click();
    URL.revokeObjectURL(url);
    setNotice("Draft downloaded as a text file.");
  }

  function setSubmissionMethod(method: "fax" | "mail") {
    persist((current) => ({
      ...current,
      submission: {
        ...current.submission,
        method,
      },
    }));
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#FDFCFB] text-[#1E3A5F]">
      <AdvocateNav
        activeItem="workspace"
        showCaseContext
        caseId={structuredFacts.claimNumber || "#ADV-2047"}
        patientName={structuredFacts.patientName || "Marina Rodriguez"}
        workspaceHref="/workspace"
        methodologyHref="/#methodology"
        evidenceHref="/evidence"
        supportHref="/status"
        exportHref="/confirmation"
      />

      <div className="flex-1 flex overflow-hidden">
        <aside className="w-80 border-r border-[#E8E4DF] bg-white overflow-y-auto p-6 flex flex-col gap-8">
          <section>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#6B6B6B] mb-1">
                Case Identity
              </p>
              <h2 className="font-serif text-2xl mb-4">
                {structuredFacts.claimNumber || "MRI Denial Review"}
              </h2>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center pb-2 border-b border-[#F3F3F3]">
                <span className="text-[11px] font-medium text-[#6B6B6B]">Insurer</span>
                <span className="text-[11px] font-bold">
                  {structuredFacts.insurer || "Unknown insurer"}
                </span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-[#F3F3F3]">
                <span className="text-[11px] font-medium text-[#6B6B6B]">Denied Amount</span>
                <span className="text-[11px] font-bold text-[#B83A3A]">
                  {analysis.deniedAmount}
                </span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-[#F3F3F3]">
                <span className="text-[11px] font-medium text-[#6B6B6B]">Total Billed</span>
                <span className="text-[11px] font-bold">{analysis.totalBilled}</span>
              </div>
              <div className="flex flex-col pt-2">
                <span className="text-[11px] font-medium text-[#6B6B6B] mb-1">
                  Denial Rationale
                </span>
                <span className="text-[11px] font-semibold leading-snug">
                  {structuredFacts.denialReason || analysis.summary}
                </span>
              </div>
            </div>
          </section>

          <section className="bg-[#FEF2F2] border border-[#FEE2E2] p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <AlertCircle className="text-[#B83A3A] h-4 w-4" />
                <span className="text-[11px] font-bold uppercase tracking-widest text-[#B83A3A]">
                  Deadline
                </span>
              </div>
              <span className="text-xs font-bold text-[#B83A3A]">
                {deadline ? `${deadline.daysRemaining} Days Left` : "Pending"}
              </span>
            </div>
            <p className="text-[11px] leading-relaxed text-[#7F1D1D]">
              {deadline
                ? `${deadline.action} by ${formatDateLabel(deadline.date)}. ${deadline.consequence}`
                : "No primary deadline detected yet."}
            </p>
          </section>

          <section>
            <h3 className="text-[11px] font-bold uppercase tracking-widest text-[#1E3A5F] mb-4">
              Evidence Checklist
            </h3>
            <ul className="space-y-3">
              {evidenceChecklist.map(({ label, checked }) => (
                <li key={label} className="flex items-start space-x-3">
                  <div
                    className={`w-4 h-4 rounded border mt-0.5 flex items-center justify-center ${
                      checked
                        ? "border-[#1E3A5F] bg-[#1E3A5F] text-white"
                        : "border-[#E8E4DF]"
                    }`}
                  >
                    {checked ? <Check className="h-[10px] w-[10px]" /> : null}
                  </div>
                  <span className="text-[11px] text-[#4A4A4A]">{label}</span>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h3 className="text-[11px] font-bold uppercase tracking-widest text-[#1E3A5F] mb-4">
              Appeal Grounds
            </h3>
            <div className="space-y-3">
              {appealGrounds.map((ground) => (
                <div
                  key={ground.id || ground.argument}
                  className="p-3 bg-[#F9F8F6] border border-[#E8E4DF]"
                >
                  <p className="text-[11px] font-bold mb-1 capitalize">
                    {ground.basis.replace(/_/g, " ")}
                  </p>
                  <p className="text-[10px] text-[#6B6B6B] leading-relaxed">
                    {ground.argument}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </aside>

        <main className="flex-1 bg-[#FDFCFB] relative overflow-hidden flex flex-col">
          <div className="absolute inset-0 square-grid pointer-events-none opacity-70" />
          <header className="p-6 border-b border-[#E8E4DF] bg-white/85 backdrop-blur-sm z-10 flex justify-between items-center">
            <div className="flex flex-col">
              <h1 className="font-serif text-3xl text-[#1E3A5F]">Attack Tree</h1>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#6B6B6B]">
                Escalation Strategy Graph
              </p>
            </div>
            <div className="flex items-center space-x-6">
              {[
                ["#B83A3A", "Denial"],
                ["#1B5E3F", "Action"],
                ["#C4A747", "Document"],
                ["#2563EB", "Evidence"],
                ["#D97706", "Escalation"],
              ].map(([color, label]) => (
                <div key={label} className="flex items-center space-x-1.5">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                  <span className="text-[10px] font-bold uppercase text-[#6B6B6B]">
                    {label}
                  </span>
                </div>
              ))}
            </div>
          </header>

          {notice ? (
            <div className="border-b border-[#E8E4DF] bg-white px-6 py-3 text-[11px] font-medium z-10">
              {notice}
            </div>
          ) : null}

          <div className="flex-1 overflow-auto p-12">
            <div className="mx-auto max-w-[980px]">
              <div className="mb-8 mx-auto max-w-[320px] tree-node bg-white border-2 border-[#B83A3A] p-5 shadow-sm">
                <div className="mb-3 flex items-center justify-between">
                  <AlertCircle className="h-4 w-4 text-[#B83A3A]" />
                  <span className="text-[9px] font-bold uppercase tracking-widest text-[#B83A3A]">
                    Denial Root
                  </span>
                </div>
                <p className="text-xs font-bold leading-tight">
                  {truncateNodeCopy(structuredFacts.denialReason || analysis.summary, 92)}
                </p>
                <p className="mt-2 text-[10px] text-[#6B6B6B]">
                  Start with the denial finding, then move down the tree to gather evidence, build the document, and prepare escalation if needed.
                </p>
              </div>

              <div className="relative overflow-x-auto rounded-sm border border-[#E8E4DF] bg-white/50 p-6">
                <AttackTreeCanvas
                  tree={strategy}
                  selectedNodeId={selectedNode?.id}
                  riskMode={analysis.riskLevel === "critical"}
                  onNodeClick={handleNodeClick}
                />
              </div>
            </div>
          </div>

          <footer className="p-6 border-t border-[#E8E4DF] bg-white flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <ShieldCheck className="text-[#1B5E3F] h-4 w-4" />
              <span className="text-[11px] font-medium text-[#4A4A4A]">
                {strategy.explanation?.whySelected ||
                  "Verified clinical rationale used. Methodology: Clinical Standard Grounding."}
              </span>
            </div>
            <div className="flex space-x-4">
              <button
                onClick={() => setNotice("Graph zoom controls are presentation-only in this build.")}
                className="text-[11px] font-bold uppercase tracking-widest text-[#6B6B6B] flex items-center space-x-1 hover:text-[#1E3A5F]"
              >
                <ZoomIn className="h-4 w-4" />
                <span>Zoom In</span>
              </button>
              <button
                onClick={() => setNotice("Graph recentered to the selected branch.")}
                className="text-[11px] font-bold uppercase tracking-widest text-[#6B6B6B] flex items-center space-x-1 hover:text-[#1E3A5F]"
              >
                <Maximize2 className="h-4 w-4" />
                <span>Center Graph</span>
              </button>
            </div>
          </footer>
        </main>

        <aside className="w-[440px] border-l border-[#E8E4DF] bg-white flex flex-col overflow-hidden">
          <div className="p-6 border-b border-[#E8E4DF] bg-[#F9F8F6] space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="text-[9px] font-bold uppercase tracking-widest text-[#6B6B6B]">
                  Selected Branch
                </span>
                <div className="mt-2 flex items-center gap-2">
                  <SelectedIcon className="h-4 w-4" style={{ color: selectedStyle.color }} />
                  <h3 className="font-serif text-xl">{selectedNode?.label || "Current branch"}</h3>
                </div>
                <p className="mt-2 text-[11px] leading-relaxed text-[#4A4A4A]">
                  {selectedNode?.description || strategy.reasoning}
                </p>
              </div>
              <button
                type="button"
                onClick={() => openBertPrompt(nodeSuggestions.bertPrompt)}
                className="shrink-0 border border-[#1E3A5F] bg-white px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[#1E3A5F] hover:bg-[#F3F3F3]"
              >
                Ask BERT
              </button>
            </div>

            <div className="rounded-sm border border-[#E8E4DF] bg-white p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#6B6B6B]">
                {nodeSuggestions.title}
              </p>
              <ul className="mt-3 space-y-2">
                {nodeSuggestions.bullets.map((bullet) => (
                  <li key={bullet} className="flex items-start gap-2 text-[11px] leading-relaxed text-[#4A4A4A]">
                    <ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#C4A747]" />
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>
            </div>

            {relatedEvidence.length ? (
              <div className="rounded-sm border border-[#E8E4DF] bg-white p-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#6B6B6B]">
                  Relevant Evidence
                </p>
                <div className="mt-3 space-y-3">
                  {relatedEvidence.map((item) => (
                    <div key={item.id}>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-semibold text-[#1E3A5F]">{item.label}</span>
                        <span className="text-[#6B6B6B]">{formatPercent(item.relevanceScore)}</span>
                      </div>
                      <div className="mt-1 h-1.5 bg-[#F3F3F3]">
                        <div
                          className="h-full bg-[#1E3A5F]"
                          style={{ width: formatPercent(item.relevanceScore) }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <div className="p-6 border-b border-[#E8E4DF] flex items-center justify-between bg-white">
            <div className="flex flex-col">
              <span className="text-[9px] font-bold uppercase tracking-widest text-[#C4A747]">
                Drafting Environment
              </span>
              <h3 className="font-serif text-lg">{draft.title}</h3>
            </div>
            <div className="flex space-x-2">
              <Link
                href="/draft"
                className="w-8 h-8 rounded border border-[#E8E4DF] bg-white flex items-center justify-center hover:bg-gray-50"
              >
                <Edit3 className="text-sm text-[#1E3A5F] h-4 w-4" />
              </Link>
              <button
                onClick={downloadDraft}
                className="w-8 h-8 rounded border border-[#E8E4DF] bg-white flex items-center justify-center hover:bg-gray-50"
              >
                <Download className="text-sm text-[#1E3A5F] h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-8 bg-[#F3F3F3]/30">
            <FormalLetterPreview
              structuredFacts={structuredFacts}
              analysis={analysis}
              title={draft.title}
              content={resolved.draftEditor.content}
              generatedAt={resolved.generatedAt}
              compact
            />
          </div>

          <div className="p-6 border-t border-[#E8E4DF] bg-white space-y-4">
            <div className="flex items-center space-x-2 text-[10px] font-bold text-[#1B5E3F] mb-1 uppercase tracking-widest">
              <span>Recommended Actions</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Link
                href={nodeSuggestions.primaryHref}
                className="bg-white border border-[#1E3A5F] text-[#1E3A5F] py-3 px-4 text-[10px] font-bold tracking-widest uppercase hover:bg-gray-50 transition-all flex items-center justify-center"
              >
                {nodeSuggestions.primaryLabel}
              </Link>
              <Link
                id="btn-send-fax"
                href="/confirmation"
                onClick={() => setSubmissionMethod("fax")}
                className="bg-[#1E3A5F] text-white py-3 px-4 text-[10px] font-bold tracking-widest uppercase hover:bg-[#1B5E3F] transition-all flex items-center justify-center"
              >
                Sign &amp; Fax
              </Link>
              <button
                id="btn-send-mail"
                onClick={() => {
                  openBertPrompt(nodeSuggestions.bertPrompt);
                }}
                className="col-span-2 bg-white border border-[#1E3A5F] text-[#1E3A5F] py-3 px-4 text-[10px] font-bold tracking-widest uppercase hover:bg-gray-50 transition-all flex items-center justify-center space-x-2"
              >
                <MessageSquare className="h-4 w-4" />
                <span>Ask BERT About This Branch</span>
              </button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
