"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bold,
  BookOpen,
  CheckCircle2,
  Italic,
  Microscope,
  PlusCircle,
  Quote,
  Send,
  ShieldCheck,
  Underline,
} from "lucide-react";
import { AdvocateNav } from "@/components/advocate-nav";
import { FormalLetterPreview } from "@/components/formal-letter-preview";
import { useAuth } from "@/contexts/auth-context";
import {
  clearCaseSession,
  createFallbackCaseSession,
  loadCaseSession,
  updateCaseSession,
  type CaseSessionState,
} from "@/lib/client/case-session";
import { syncCaseSessionRecord } from "@/lib/client/run-case-pipeline";
import { BlindSpotSignal, EvidenceItem } from "@/lib/types";

function topEvidence(items: EvidenceItem[]) {
  return items
    .slice()
    .sort((left, right) => right.relevanceScore - left.relevanceScore)
    .slice(0, 4);
}

function signalLabel(signal: BlindSpotSignal) {
  return signal.primaryLabel.replace(/[_-]/g, " ");
}

function createId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

export default function DraftPage() {
  const router = useRouter();
  const { configured: authConfigured, user, loading: authLoading, getIdToken } = useAuth();
  const [caseState, setCaseState] = useState<CaseSessionState | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (authConfigured && !authLoading && !user) {
      clearCaseSession();
      router.replace("/");
      return;
    }
    setCaseState(loadCaseSession() || createFallbackCaseSession());
  }, [authConfigured, authLoading, user, router]);

  const resolved = caseState || createFallbackCaseSession();
  const { structuredFacts, strategy, draft, draftEditor, vaultDocuments } = resolved;
  const evidenceItems = topEvidence(strategy.evidenceItems || []);
  const selectedVaultDocument = vaultDocuments[0];
  const blindSpotSignals = (strategy.blindSpotSignals || []).slice(0, 2);
  const explanation = strategy.explanation || draft.explanation;

  function persist(
    updater: Parameters<typeof updateCaseSession>[0],
    message: string
  ) {
    const next = updateCaseSession(updater);
    setCaseState(next);
    setNotice(message);
    void syncCaseSessionRecord(next, getIdToken).then(setCaseState).catch(() => undefined);
  }

  function insertEvidenceSnippet() {
    if (!selectedVaultDocument) return;

    persist(
      (current) => ({
        ...current,
        draftEditor: {
          ...current.draftEditor,
          content: `${current.draftEditor.content}\n\nSupporting evidence: ${selectedVaultDocument.snippet}`,
        },
        activity: [
          {
            id: createId("activity"),
            label: "Evidence inserted",
            body: `${selectedVaultDocument.name} added to the working draft.`,
            timestamp: new Date().toISOString(),
            type: "draft",
          },
          ...current.activity,
        ],
      }),
      `${selectedVaultDocument.name} inserted into the draft.`
    );
  }

  function insertClinicalCitation() {
    const citation = evidenceItems[0];
    if (!citation) return;

    persist(
      (current) => ({
        ...current,
        draftEditor: {
          ...current.draftEditor,
          content: `${current.draftEditor.content}\n\n"${citation.snippet}"\nSource: ${citation.label}`,
        },
        activity: [
          {
            id: createId("activity"),
            label: "Clinical citation inserted",
            body: `${citation.label} referenced in the working draft.`,
            timestamp: new Date().toISOString(),
            type: "draft",
          },
          ...current.activity,
        ],
      }),
      `${citation.label} inserted as a citation.`
    );
  }

  function saveDraft() {
    persist(
      (current) => ({
        ...current,
        draftEditor: {
          ...current.draftEditor,
          lastSavedAt: new Date().toISOString(),
        },
        activity: [
          {
            id: createId("activity"),
            label: "Draft saved",
            body: "Current draft state saved to the browser session.",
            timestamp: new Date().toISOString(),
            type: "draft",
          },
          ...current.activity,
        ],
      }),
      "Draft saved to the current case session."
    );
  }

  function previewFinal() {
    saveDraft();
    router.push("/confirmation");
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#FDFCFB] text-[#1E3A5F]">
      <AdvocateNav
        activeItem="workspace"
        showCaseContext
        caseId={structuredFacts.claimNumber || "#ADV-2047"}
        patientName={structuredFacts.patientName || "Case review"}
        workspaceHref="/workspace"
        methodologyHref="/#methodology"
        evidenceHref="/evidence"
        supportHref="/status"
        exportHref="/confirmation"
      />

      <main className="flex-1 flex overflow-hidden">
        <div className="w-3/5 flex flex-col bg-[#F3F3F3]/40 border-r border-[#E8E4DF]">
          <header className="bg-white border-b border-[#E8E4DF] px-8 py-3 flex items-center justify-between shadow-sm z-10">
            <div className="flex items-center space-x-4">
              <div className="flex items-center border border-[#E8E4DF] rounded bg-white overflow-hidden">
                <button className="px-3 py-2 hover:bg-gray-50 border-r border-[#E8E4DF]">
                  <Bold className="h-4 w-4" />
                </button>
                <button className="px-3 py-2 hover:bg-gray-50 border-r border-[#E8E4DF]">
                  <Italic className="h-4 w-4" />
                </button>
                <button className="px-3 py-2 hover:bg-gray-50">
                  <Underline className="h-4 w-4" />
                </button>
              </div>
              <div className="h-6 w-px bg-[#E8E4DF]" />
              <button
                onClick={insertEvidenceSnippet}
                className="flex items-center space-x-2 px-4 py-2 text-[10px] font-bold tracking-widest uppercase border border-[#E8E4DF] bg-white hover:bg-gray-50 transition-colors"
              >
                <PlusCircle className="text-[#C4A747] h-4 w-4" />
                <span>Insert Evidence</span>
              </button>
              <button
                onClick={insertClinicalCitation}
                className="flex items-center space-x-2 px-4 py-2 text-[10px] font-bold tracking-widest uppercase border border-[#E8E4DF] bg-white hover:bg-gray-50 transition-colors"
              >
                <Quote className="text-[#1B5E3F] h-4 w-4" />
                <span>Clinical Citation</span>
              </button>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-[9px] font-bold uppercase tracking-widest text-[#6B6B6B]">
                Last saved:{" "}
                {draftEditor.lastSavedAt
                  ? new Date(draftEditor.lastSavedAt).toLocaleTimeString("en-US", {
                      hour: "numeric",
                      minute: "2-digit",
                    })
                  : "unsaved"}
              </span>
            </div>
          </header>

          {notice ? (
            <div className="border-b border-[#E8E4DF] bg-white px-8 py-3 text-[11px] font-medium">
              {notice}
            </div>
          ) : null}

          <div className="flex-1 overflow-y-auto p-12 editor-surface">
            <div className="mx-auto max-w-[800px]">
              <FormalLetterPreview
                structuredFacts={structuredFacts}
                analysis={resolved.analysis}
                title={draft.title}
                content={draftEditor.content || draft.content}
                generatedAt={resolved.generatedAt}
              />
            </div>
          </div>
        </div>

        <aside className="w-2/5 bg-white flex flex-col border-l border-[#E8E4DF]">
          <header className="p-6 border-b border-[#E8E4DF] bg-[#FDFCFB]">
            <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#1E3A5F] mb-1">
              Evidence Library
            </h3>
            <p className="text-[10px] text-[#6B6B6B]">
              Drag and drop artifacts to insert as clinical citations
            </p>
          </header>

          <div className="flex-1 overflow-y-auto p-6 space-y-8">
            <section>
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-[#B83A3A] mb-4 flex items-center">
                <PlusCircle className="mr-2 h-4 w-4" />
                Primary Clinical Records
              </h4>
              <div className="space-y-4">
                {evidenceItems.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 border border-[#E8E4DF] bg-[#FDFCFB] hover:border-[#1E3A5F] transition-all group cursor-move"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-[10px] font-bold text-[#1E3A5F] uppercase">
                        {item.sourceType.replace(/_/g, " ")}
                      </span>
                      <span className="text-[9px] text-[#6B6B6B]">
                        {Math.round(item.relevanceScore * 100)}% match
                      </span>
                    </div>
                    <p className="text-[11px] font-semibold mb-1">{item.label}</p>
                    <p className="text-[10px] text-[#6B6B6B] leading-relaxed">{item.snippet}</p>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-[#C4A747] mb-4 flex items-center">
                <BookOpen className="mr-2 h-4 w-4" />
                Strategy Reasoning
              </h4>
              <div className="p-4 border border-[#C4A747]/30 bg-[#FDFCFB]">
                <p className="text-[11px] font-semibold mb-2">Why this path was selected</p>
                <p className="text-[10px] text-[#6B6B6B] leading-relaxed">
                  {explanation?.whySelected || strategy.reasoning}
                </p>
              </div>
            </section>

            <section>
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-[#1B5E3F] mb-4 flex items-center">
                <Microscope className="mr-2 h-4 w-4" />
                Blind Spot Signals
              </h4>
              <div className="space-y-4">
                {blindSpotSignals.length ? (
                  blindSpotSignals.map((signal, index) => (
                    <div
                      key={`${signal.primaryLabel}-${index}`}
                      className="p-4 border border-[#E8E4DF] bg-[#FDFCFB]"
                    >
                      <span className="text-[9px] font-bold text-[#1B5E3F] uppercase mb-1 block">
                        {signalLabel(signal)}
                      </span>
                      <p className="text-[10px] text-[#6B6B6B] leading-relaxed">
                        Confidence {Math.round(signal.primaryScore * 100)}%
                        {signal.matchedText ? ` • ${signal.matchedText}` : ""}
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="p-4 border border-[#E8E4DF] bg-[#FDFCFB]">
                    <p className="text-[10px] text-[#6B6B6B] leading-relaxed">
                      No blind spot alerts detected for this draft.
                    </p>
                  </div>
                )}
              </div>
            </section>
          </div>

          <div className="p-6 bg-[#FDFCFB] border-t border-[#E8E4DF]">
            <div className="flex items-center space-x-2 text-[10px] font-bold uppercase text-[#1B5E3F] mb-3">
              <ShieldCheck className="h-4 w-4" />
              <span>Source Verification</span>
            </div>
            <p className="text-[10px] text-[#6B6B6B] leading-relaxed">
              Every inserted citation is tied to a structured evidence item from the strategy
              pipeline.
            </p>
          </div>
        </aside>
      </main>

      <div className="h-20 border-t border-[#E8E4DF] bg-white px-8 flex items-center justify-between z-40">
        <div className="flex items-center space-x-8">
          <div className="flex flex-col">
            <span className="text-[9px] font-bold uppercase tracking-widest text-[#6B6B6B]">
              Draft Status
            </span>
            <span className="text-xs font-bold text-[#1B5E3F] flex items-center">
              <CheckCircle2 className="mr-1.5 h-4 w-4" />
              Ready for review
            </span>
          </div>
          <div className="h-8 w-px bg-[#E8E4DF]" />
          <div className="flex flex-col">
            <span className="text-[9px] font-bold uppercase tracking-widest text-[#6B6B6B]">
              Evidence Attached
            </span>
            <span className="text-xs font-bold">{evidenceItems.length} Artifacts</span>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <button
            onClick={saveDraft}
            className="bg-white border border-[#1E3A5F] text-[#1E3A5F] px-6 py-3 text-[10px] font-bold tracking-widest uppercase hover:bg-gray-50 transition-all"
          >
            Save Draft
          </button>
          <button
            onClick={previewFinal}
            className="bg-white border border-[#1E3A5F] text-[#1E3A5F] px-6 py-3 text-[10px] font-bold tracking-widest uppercase hover:bg-gray-50 transition-all"
          >
            Preview Final
          </button>
          <Link
            href="/confirmation"
            className="bg-[#1E3A5F] text-white px-10 py-3 text-[10px] font-bold tracking-widest uppercase hover:bg-[#1B5E3F] shadow-lg transition-all flex items-center space-x-2"
          >
            <Send className="h-4 w-4" />
            <span>Send Letter</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
