"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Circle, FileCheck, Mail, Printer } from "lucide-react";
import { AdvocateNav } from "@/components/advocate-nav";
import { BrandLockup } from "@/components/brand-lockup";
import { useAuth } from "@/contexts/auth-context";
import {
  clearCaseSession,
  createFallbackCaseSession,
  loadCaseSession,
  updateCaseSession,
  type CaseSessionState,
} from "@/lib/client/case-session";
import { syncCaseSessionRecord } from "@/lib/client/run-case-pipeline";

export default function ConfirmationPage() {
  const router = useRouter();
  const { user, loading: authLoading, getIdToken } = useAuth();
  const [caseState, setCaseState] = useState<CaseSessionState | null>(null);
  const [method, setMethod] = useState<"fax" | "mail">("fax");
  const [email, setEmail] = useState("case-review@example.com");
  const [smsOptIn, setSmsOptIn] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      clearCaseSession();
      router.replace("/");
      return;
    }
    const current = loadCaseSession() || createFallbackCaseSession();
    setCaseState(current);
    setMethod(current.submission.method);
    setEmail(current.submission.confirmationEmail);
    setSmsOptIn(current.submission.smsOptIn);
  }, [authLoading, user, router]);

  const resolved = caseState || createFallbackCaseSession();
  const attachmentCount = useMemo(() => resolved.vaultDocuments.length, [resolved.vaultDocuments.length]);

  function isValidEmail(value: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  async function exportPacketLocally() {
    if (!isValidEmail(email)) {
      setNotice("Enter a valid confirmation email before exporting the packet.");
      return;
    }

    const next = updateCaseSession((current) => ({
      ...current,
      submission: {
        ...current.submission,
        method,
        status: "exported",
        recipient:
          current.structuredFacts.insurer && current.structuredFacts.insurer !== "unknown"
            ? current.structuredFacts.insurer
            : "Insurer appeals department",
        confirmationEmail: email,
        smsOptIn,
        submittedAt: new Date().toISOString(),
      },
      activity: [
        {
          id: `activity-${Date.now()}`,
          // Fix 6: record a local export event instead of implying a real insurer submission occurred.
          label: "Appeal packet exported locally",
          body: `Packet prepared for local ${method === "fax" ? "fax-ready export" : "mail-ready export"} review. No insurer submission was sent.`,
          timestamp: new Date().toISOString(),
          type: "submission",
        },
        ...current.activity,
      ],
    }));

    const synced = await syncCaseSessionRecord(next, getIdToken).catch(() => next);
    setCaseState(synced);
    setNotice(`Packet prepared for local ${method === "fax" ? "fax-ready export" : "mail-ready export"}.`);
    router.push("/status");
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#FDFCFB] text-[#1E3A5F]">
      <AdvocateNav
        activeItem="workspace"
        showCaseContext
        caseId={resolved.structuredFacts.claimNumber || "#ADV-2047"}
        patientName={resolved.structuredFacts.patientName || "Case review"}
        workspaceHref="/workspace"
        methodologyHref="/#methodology"
        evidenceHref="/evidence"
        supportHref="/status"
        exportHref="/confirmation"
      />

      <main className="flex-1 max-w-[1400px] mx-auto w-full px-8 py-10">
        <header className="mb-10">
          <div className="flex items-center space-x-2 text-[10px] font-bold uppercase tracking-widest text-[#6B6B6B] mb-2">
            <Link href="/workspace" className="hover:text-[#1E3A5F]">
              Workspace
            </Link>
            <span>/</span>
            <span className="text-[#1E3A5F]">Export Confirmation</span>
          </div>
          <h1 className="font-serif text-4xl text-[#1E3A5F]">Finalize Export</h1>
          <p className="text-sm text-[#6B6B6B] mt-2 font-light">
            Review your appeal packet and prepare a local export package for filing.
          </p>
        </header>

        {notice ? (
          <div className="bg-white border-subtle p-4 mb-8 text-[11px] font-medium">{notice}</div>
        ) : null}

        <section className="bg-white border-subtle p-6 mb-8 flex items-center justify-between">
          <div className="flex items-center space-x-8">
            <div className="flex items-center space-x-3">
              <FileCheck className="text-[#1B5E3F] h-6 w-6" />
              <div className="flex flex-col">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B6B6B]">
                  Packet Content
                </span>
                <span className="text-xs font-semibold">
                  {resolved.draft.title} + {attachmentCount} Evidence Attachment(s)
                </span>
              </div>
            </div>
            <div className="h-10 w-px bg-[#E8E4DF]" />
            <div className="flex flex-col">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B6B6B]">
                Recipient
              </span>
              <span className="text-xs font-semibold">
                {resolved.structuredFacts.insurer || "Insurer"} | Appeals Department
              </span>
            </div>
          </div>
          <Link
            href="/draft"
            className="text-[10px] font-bold uppercase tracking-widest text-[#1E3A5F] border-b border-[#1E3A5F] pb-0.5 hover:opacity-70"
          >
            Review Documents
          </Link>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          <div className="lg:col-span-7 flex flex-col gap-8">
            <div className="bg-white border-subtle p-8">
                <h2 className="text-xs font-bold uppercase tracking-[0.2em] mb-6 text-[#1E3A5F]">
                Select Export Method
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label
                  className={`relative flex flex-col p-5 border-2 ${
                    method === "fax" ? "border-[#1E3A5F] bg-[#FDFCFB]" : "border-[#E8E4DF] bg-white"
                  } cursor-pointer group`}
                >
                  <input
                    type="radio"
                    name="submission_method"
                    className="hidden"
                    checked={method === "fax"}
                    onChange={() => setMethod("fax")}
                  />
                  <div className="flex justify-between items-start mb-4">
                    <Printer className="text-[#1E3A5F] h-6 w-6" />
                    <div
                      className={`w-4 h-4 rounded-full ${
                        method === "fax"
                          ? "border-4 border-[#1E3A5F] bg-white"
                          : "border border-[#E8E4DF] bg-white"
                      }`}
                    />
                  </div>
                  <span className="text-sm font-bold">Digital Fax</span>
                  <p className="text-[11px] text-[#6B6B6B] mt-1 leading-relaxed">
                    Export a fax-ready packet locally so you can send it through your own fax workflow.
                  </p>
                  <div className="mt-4 pt-4 border-t border-[#E8E4DF] flex justify-between">
                    <span className="text-[10px] font-bold uppercase text-[#1B5E3F]">
                      Recommended
                    </span>
                    <span className="text-[10px] font-bold uppercase text-[#6B6B6B]">Free</span>
                  </div>
                </label>

                <label
                  className={`relative flex flex-col p-5 border ${
                    method === "mail" ? "border-[#1E3A5F]" : "border-[#E8E4DF]"
                  } bg-white hover:border-[#1E3A5F] transition-colors cursor-pointer group`}
                >
                  <input
                    type="radio"
                    name="submission_method"
                    className="hidden"
                    checked={method === "mail"}
                    onChange={() => setMethod("mail")}
                  />
                  <div className="flex justify-between items-start mb-4">
                    <Mail className="text-[#6B6B6B] group-hover:text-[#1E3A5F] h-6 w-6" />
                    <div
                      className={`w-4 h-4 rounded-full ${
                        method === "mail"
                          ? "border-4 border-[#1E3A5F] bg-white"
                          : "border border-[#E8E4DF] bg-white"
                      }`}
                    />
                  </div>
                  <span className="text-sm font-bold">USPS Certified Mail</span>
                  <p className="text-[11px] text-[#6B6B6B] mt-1 leading-relaxed">
                    Export a print-ready packet locally for mailing or courier delivery.
                  </p>
                  <div className="mt-4 pt-4 border-t border-[#E8E4DF] flex justify-between">
                    <span className="text-[10px] font-bold uppercase text-[#6B6B6B]">Priority</span>
                    <span className="text-[10px] font-bold uppercase text-[#6B6B6B]">$14.50 Fee</span>
                  </div>
                </label>
              </div>
            </div>

            <div className="bg-white border-subtle p-8">
              <h2 className="text-xs font-bold uppercase tracking-[0.2em] mb-6 text-[#1E3A5F]">
                Verification & Notifications
              </h2>
              <div className="space-y-4">
                <div className="flex flex-col">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[#6B6B6B] mb-1.5">
                    Confirmation Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="bg-[#F9F8F6] border-subtle p-3 text-xs focus:ring-1 focus:ring-[#1E3A5F] outline-none"
                  />
                </div>
                <div className="flex items-center space-x-3 mt-4">
                  <input
                    type="checkbox"
                    id="sms-notif"
                    className="w-4 h-4 border-[#E8E4DF] text-[#1E3A5F]"
                    checked={smsOptIn}
                    onChange={(event) => setSmsOptIn(event.target.checked)}
                  />
                  <label htmlFor="sms-notif" className="text-[11px] text-[#4A4A4A]">
                    Send SMS status updates to the stored case contact
                  </label>
                </div>
              </div>
            </div>

            <div className="bg-[#FEF2F2] border border-[#FEE2E2] p-5 flex items-start space-x-4">
              <AlertTriangle className="text-[#B83A3A] mt-0.5 h-5 w-5" />
              <div className="flex flex-col">
                <span className="text-[11px] font-bold uppercase tracking-widest text-[#B83A3A] mb-1">
                  Institutional Warning
                </span>
                <p className="text-[11px] leading-relaxed text-[#7F1D1D]">
                  This step only prepares a local export or copy of your packet. Review the draft and evidence attachments before sending anything through an external channel.
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-4 pt-4">
              <button
                onClick={() => void exportPacketLocally()}
                className="flex-1 bg-[#1E3A5F] text-white py-4 px-6 text-[11px] font-bold tracking-[0.2em] uppercase hover:bg-[#1B5E3F] transition-all text-center"
              >
                Export Packet Locally
              </button>
              <Link
                href="/workspace"
                className="bg-white border border-[#E8E4DF] text-[#6B6B6B] py-4 px-6 text-[11px] font-bold tracking-[0.2em] uppercase hover:bg-gray-50 transition-all"
              >
                Return to Workspace
              </Link>
            </div>
          </div>

          <div className="lg:col-span-5">
            <div className="bg-[#F9F8F6] border-subtle p-8 sticky top-24">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-[#1E3A5F]">
                  Local Export Summary
                </h2>
                <span className="px-2 py-1 bg-white border border-[#E8E4DF] text-[9px] font-bold uppercase tracking-wider">
                  {resolved.submission.status === "exported" ? "Prepared" : "Pending Export"}
                </span>
              </div>

              <div className="relative space-y-10 pl-2">
                <div className="status-line" />
                <div className="relative flex items-start space-x-6 z-10">
                  <div className="w-4 h-4 rounded-full bg-[#1E3A5F] flex items-center justify-center ring-4 ring-white">
                    <Circle className="text-white h-1.5 w-1.5 fill-white" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[11px] font-bold uppercase text-[#1E3A5F]">
                      Awaiting Local Export
                    </span>
                    <span className="text-[10px] text-[#6B6B6B]">
                      Verification of case assets and chosen export format.
                    </span>
                    <span className="text-[9px] font-medium text-[#1E3A5F] mt-1">
                      CURRENT STEP
                    </span>
                  </div>
                </div>

                {[
                  ["Export Prepared", "Packet exported into a user-managed local filing path."],
                  ["User Sends Packet", "Submission happens outside Advocate through the user's workflow."],
                  ["User Logs Outcome", "Status updates can be recorded manually after filing."],
                ].map(([title, body]) => (
                  <div key={title} className="relative flex items-start space-x-6 z-10">
                    <div className="w-4 h-4 rounded-full bg-white border-2 border-[#E8E4DF] flex items-center justify-center ring-4 ring-[#F9F8F6]" />
                    <div className="flex flex-col opacity-40">
                      <span className="text-[11px] font-bold uppercase text-[#6B6B6B]">{title}</span>
                      <span className="text-[10px] text-[#6B6B6B]">{body}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-12 bg-white border border-[#E8E4DF] p-6 space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B6B6B]">
                    Selected Method
                  </span>
                  <span className="text-xs font-semibold">
                    {method === "fax" ? "Digital Fax" : "Certified Mail"}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B6B6B]">
                    Export Format
                  </span>
                  <span className="text-xs font-semibold text-[#1B5E3F]">
                    {method === "fax" ? "Fax-ready PDF" : "Print-and-mail packet"}
                  </span>
                </div>
              </div>

              <div className="mt-8">
                <p className="text-[10px] leading-relaxed text-[#6B6B6B] italic font-light">
                  Export records are session-backed. Advocate does not send the packet to the insurer for you.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="bg-white border-t border-[#E8E4DF] p-10">
        <div className="max-w-[1400px] mx-auto flex flex-col md:flex-row justify-between items-center">
          <div className="mb-6 md:mb-0">
            <BrandLockup width={540} height={129} imageClassName="h-[66px] w-auto" />
          </div>
        </div>
      </footer>
    </div>
  );
}
