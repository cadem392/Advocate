"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Calendar,
  Check,
  CheckCircle2,
  Info,
  Loader2,
  Mail,
  Send,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { AdvocateNav } from "@/components/advocate-nav";
import { useAuth } from "@/contexts/auth-context";
import {
  clearCaseSession,
  createFallbackCaseSession,
  loadCaseSession,
  updateCaseSession,
  type CaseSessionState,
} from "@/lib/client/case-session";
import { syncCaseSessionRecord } from "@/lib/client/run-case-pipeline";

function formatTimestamp(value?: string) {
  if (!value) return "Pending";
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function StatusPage() {
  const router = useRouter();
  const { user, loading: authLoading, getIdToken } = useAuth();
  const [caseState, setCaseState] = useState<CaseSessionState | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      clearCaseSession();
      router.replace("/");
      return;
    }
    setCaseState(loadCaseSession() || createFallbackCaseSession());
  }, [authLoading, user, router]);

  const resolved = caseState || createFallbackCaseSession();
  const submission = resolved.submission;
  const latestActivity = resolved.activity[0];
  const evidenceItems = resolved.vaultDocuments.slice(0, 4);

  const escalationStages = useMemo(
    () => [
      { stage: "Stage 01", label: "Internal Appeal (L1)", borderColor: "#1B5E3F", muted: false },
      { stage: "Stage 02", label: "Internal Appeal (L2)", borderColor: "#D97706", muted: submission.status !== "transmitted" },
      { stage: "Stage 03", label: "External State Review", borderColor: "#E8E4DF", muted: true },
      { stage: "Stage 04", label: "Regulatory Complaint", borderColor: "#E8E4DF", muted: true },
    ],
    [submission.status]
  );

  async function notifyPhysician() {
    const next = updateCaseSession((current) => ({
      ...current,
      activity: [
        {
          id: `activity-${Date.now()}`,
          label: "Physician notified",
          body: "A follow-up request was queued for the supporting physician statement.",
          timestamp: new Date().toISOString(),
          type: "support",
        },
        ...current.activity,
      ],
    }));

    const synced = await syncCaseSessionRecord(next, getIdToken).catch(() => next);
    setCaseState(synced);
    setNotice("Physician follow-up reminder queued in the case activity log.");
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#FDFCFB] text-[#1E3A5F]">
      <AdvocateNav
        activeItem="support"
        showCaseContext
        caseId={resolved.structuredFacts.claimNumber || "#ADV-2047"}
        patientName={resolved.structuredFacts.patientName || "Case review"}
        workspaceHref="/workspace"
        methodologyHref="/#methodology"
        evidenceHref="/evidence"
        supportHref="/status"
        exportHref="/confirmation"
      />

      <main className="flex-1 flex overflow-hidden">
        <aside className="w-80 border-r border-[#E8E4DF] bg-white overflow-y-auto p-6 flex flex-col gap-8">
          <section>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#6B6B6B] mb-1">
                Case Status
              </p>
              <h2 className="font-serif text-2xl mb-4">
                {submission.status === "transmitted" ? "Submitted" : "In Review"}
              </h2>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center pb-2 border-b border-[#F3F3F3]">
                <span className="text-[11px] font-medium text-[#6B6B6B]">Insurer</span>
                <span className="text-[11px] font-bold">
                  {resolved.structuredFacts.insurer || "Unknown insurer"}
                </span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-[#F3F3F3]">
                <span className="text-[11px] font-medium text-[#6B6B6B]">Current Stage</span>
                <span className="text-[11px] font-bold text-[#D97706]">Internal Appeal L1</span>
              </div>
              <div className="flex flex-col pt-2">
                <span className="text-[11px] font-medium text-[#6B6B6B] mb-1">
                  Submission Reference
                </span>
                <span className="text-[11px] font-semibold tabular-nums">
                  {submission.trackingId}
                </span>
              </div>
            </div>
          </section>

          <section className="bg-[#F9F8F6] border border-[#E8E4DF] p-4">
            <div className="flex items-center space-x-2 mb-2">
              <Info className="text-[#1E3A5F] h-4 w-4" />
              <span className="text-[11px] font-bold uppercase tracking-widest">
                Next Milestone
              </span>
            </div>
            <p className="text-[11px] leading-relaxed text-[#4A4A4A]">
              {submission.status === "transmitted"
                ? "Transmission recorded. Await insurer acknowledgment or request for additional information."
                : "Packet not transmitted yet. Return to confirmation to finalize delivery."}
            </p>
          </section>

          <section>
            <h3 className="text-[11px] font-bold uppercase tracking-widest text-[#1E3A5F] mb-4">
              Evidence Submission
            </h3>
            {evidenceItems.length ? (
              <ul className="space-y-3">
                {evidenceItems.map((item) => (
                  <li key={item.id} className="flex items-center space-x-3">
                    {item.verified ? (
                      <CheckCircle2 className="text-[#1B5E3F] h-4 w-4" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border border-[#E8E4DF]" />
                    )}
                    <span className="text-[11px] text-[#4A4A4A]">{item.name}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[11px] text-[#6B6B6B] leading-relaxed">
                No evidence has been attached to this case yet. Upload documents from the evidence vault before submitting or escalating.
              </p>
            )}
          </section>
        </aside>

        <div className="flex-1 bg-[#FDFCFB] overflow-y-auto p-12">
          <div className="max-w-5xl mx-auto">
            <header className="mb-12 border-b border-[#E8E4DF] pb-8">
              <div className="flex justify-between items-end">
                <div className="flex flex-col">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#1B5E3F] mb-2">
                    Appeal Lifecycle Tracker
                  </p>
                  <h1 className="font-serif text-4xl">
                    Case Tracking: {resolved.structuredFacts.claimNumber || "#ADV-2047"}
                  </h1>
                </div>
                <div className="flex space-x-4">
                  <Link
                    href="/confirmation"
                    className="px-4 py-2 bg-white border border-[#1E3A5F] text-[10px] font-bold uppercase tracking-widest hover:bg-[#F3F3F3] transition-colors"
                  >
                    View Receipt
                  </Link>
                  <button
                    onClick={() => void notifyPhysician()}
                    className="px-4 py-2 bg-[#1E3A5F] text-white text-[10px] font-bold uppercase tracking-widest hover:bg-[#14472F] transition-colors"
                  >
                    Notify Physician
                  </button>
                </div>
              </div>
            </header>

            {notice ? (
              <div className="mb-8 p-4 bg-white border-subtle text-[11px] font-medium">{notice}</div>
            ) : null}

            <div className="grid grid-cols-12 gap-12">
              <div className="col-span-4">
                <h3 className="text-xs font-bold uppercase tracking-widest mb-8 border-b border-[#E8E4DF] pb-2">
                  Case Timeline
                </h3>
                <div className="relative ml-2 space-y-12 pb-8">
                  <div className="timeline-line" />
                  <div className="relative pl-10">
                    <div className="absolute left-0 top-1 w-8 h-8 rounded-full bg-[#1B5E3F] flex items-center justify-center text-white z-10">
                      <Check className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-[#1B5E3F] uppercase tracking-widest">
                        {formatTimestamp(resolved.generatedAt)}
                      </p>
                      <h4 className="text-xs font-bold">Strategy Generated</h4>
                      <p className="text-[11px] text-[#6B6B6B] mt-1 italic">
                        {resolved.analysis.summary}
                      </p>
                    </div>
                  </div>
                  <div className="relative pl-10">
                    <div className="absolute left-0 top-1 w-8 h-8 rounded-full bg-[#1B5E3F] flex items-center justify-center text-white z-10">
                      <Send className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-[#1B5E3F] uppercase tracking-widest">
                        {formatTimestamp(submission.submittedAt)}
                      </p>
                      <h4 className="text-xs font-bold">Internal Appeal Filed</h4>
                      <p className="text-[11px] text-[#6B6B6B] mt-1">
                        {submission.status === "transmitted"
                          ? `Submitted via ${submission.method === "fax" ? "digital fax" : "certified mail"}.`
                          : "Waiting for submission."}
                      </p>
                    </div>
                  </div>
                  <div className="relative pl-10">
                    <div className="absolute left-0 top-1 w-8 h-8 rounded-full bg-[#FDFCFB] border-2 border-[#1E3A5F] flex items-center justify-center text-[#1E3A5F] z-10 status-pulse">
                      <Loader2 className="animate-spin h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-[#1E3A5F] uppercase tracking-widest">
                        In Progress
                      </p>
                      <h4 className="text-xs font-bold text-[#1E3A5F]">
                        Awaiting Insurer Response
                      </h4>
                      <p className="text-[11px] text-[#6B6B6B] mt-1">
                        Standard regulatory window: 72 hours for expedited.
                      </p>
                    </div>
                  </div>
                  <div className="relative pl-10 opacity-30">
                    <div className="absolute left-0 top-1 w-8 h-8 rounded-full bg-[#E8E4DF] flex items-center justify-center text-[#6B6B6B] z-10">
                      <Calendar className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest">
                        Next Deadline
                      </p>
                      <h4 className="text-xs font-bold">
                        {resolved.analysis.deadlines[0]?.action || "External Review Window"}
                      </h4>
                    </div>
                  </div>
                </div>
              </div>

              <div className="col-span-8 space-y-12">
                <section className="p-8 bg-white border border-[#E8E4DF] shadow-sm">
                  <div className="flex justify-between items-start mb-6">
                    <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-[#1E3A5F]">
                      Escalation Path Preview
                    </h3>
                    <span className="text-[10px] font-bold text-[#6B6B6B] bg-[#F3F3F3] px-2 py-0.5 rounded">
                      Institutional Framework
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-4">
                    {escalationStages.map(({ stage, label, borderColor, muted }) => (
                      <div
                        key={stage}
                        className={`flex flex-col items-center p-3 ${
                          muted ? "bg-[#FDFCFB]" : "bg-[#F9F8F6]"
                        }`}
                        style={{ borderBottom: `4px solid ${borderColor}` }}
                      >
                        <span
                          className={`text-[9px] font-bold uppercase mb-1 ${
                            stage === "Stage 01"
                              ? "text-[#1B5E3F]"
                              : stage === "Stage 02"
                                ? "text-[#D97706]"
                                : "text-[#6B6B6B]"
                          }`}
                        >
                          {stage}
                        </span>
                        <span
                          className={`text-[10px] font-semibold text-center leading-tight ${
                            muted ? "opacity-50" : ""
                          }`}
                        >
                          {label}
                        </span>
                      </div>
                    ))}
                  </div>
                </section>

                <section>
                  <h3 className="text-xs font-bold uppercase tracking-widest mb-6 border-b border-[#E8E4DF] pb-2">
                    Insurer Communications
                  </h3>
                  <div className="space-y-4">
                    <div className="p-6 border border-[#E8E4DF] bg-white hover:border-[#1E3A5F] transition-colors">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center space-x-2">
                          <Mail className="text-[#1E3A5F] h-4 w-4" />
                          <span className="text-[11px] font-bold uppercase tracking-tight">
                            Latest Activity
                          </span>
                        </div>
                        <span className="text-[10px] font-medium text-[#6B6B6B] tabular-nums">
                          {formatTimestamp(latestActivity?.timestamp)}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#4A4A4A] leading-relaxed mb-3">
                        {latestActivity?.body || "No recent activity."}
                      </p>
                      <div className="flex items-center space-x-3">
                        <Link
                          href="/draft"
                          className="text-[9px] font-bold uppercase border-b border-[#1E3A5F] text-[#1E3A5F]"
                        >
                          View Document
                        </Link>
                      </div>
                    </div>

                    <div className="p-6 border border-[#E8E4DF] bg-white opacity-80">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center space-x-2">
                          <AlertTriangle className="text-[#B83A3A] h-4 w-4" />
                          <span className="text-[11px] font-bold uppercase tracking-tight">
                            Original Denial Source
                          </span>
                        </div>
                        <span className="text-[10px] font-medium text-[#6B6B6B] tabular-nums">
                          {formatTimestamp(resolved.generatedAt)}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#4A4A4A] leading-relaxed mb-3">
                        {resolved.structuredFacts.denialReason}
                      </p>
                      <div className="flex items-center space-x-3">
                        <Link
                          href="/evidence"
                          className="text-[9px] font-bold uppercase border-b border-[#1E3A5F] text-[#1E3A5F]"
                        >
                          View Original
                        </Link>
                      </div>
                    </div>
                  </div>
                </section>

                <section className="p-8 bg-[#1E3A5F] text-white">
                  <div className="flex items-center space-x-3 mb-4">
                    <Sparkles className="text-[#C4A747] h-4 w-4" />
                    <h3 className="text-xs font-bold uppercase tracking-[0.2em]">
                      Next Recommended Actions
                    </h3>
                  </div>
                  <div className="space-y-4">
                    {resolved.activity.slice(0, 2).map((item, index) => (
                      <div
                        key={item.id}
                        className="flex items-start space-x-4 bg-white/5 p-4 border border-white/10"
                      >
                        <div className="w-5 h-5 bg-[#C4A747] text-white rounded-full flex items-center justify-center text-[10px] font-bold">
                          {index + 1}
                        </div>
                        <div className="flex-1">
                          <p className="text-[11px] font-bold mb-1">{item.label}</p>
                          <p className="text-[10px] text-white/70 leading-relaxed">{item.body}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="p-6 border-t border-[#E8E4DF] bg-white flex justify-between items-center z-40">
        <div className="flex items-center space-x-2">
          <ShieldCheck className="text-[#1B5E3F] h-4 w-4" />
          <span className="text-[11px] font-medium text-[#4A4A4A]">
            Session-backed tracking active. Submission metadata persists across the current browser
            flow.
          </span>
        </div>
        <div className="flex space-x-6 text-[10px] font-bold tracking-widest uppercase text-[#6B6B6B]">
          <Link href="/" className="hover:text-[#1E3A5F]">
            Regulatory Guidelines
          </Link>
          <Link href="/workspace" className="hover:text-[#1E3A5F]">
            Methodology
          </Link>
          <Link href="/draft" className="hover:text-[#1E3A5F]">
            Support Portal
          </Link>
        </div>
      </footer>
    </div>
  );
}
