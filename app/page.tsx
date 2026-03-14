"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Check, FileText, Search, X } from "lucide-react";
import { AdvocateNav } from "@/components/advocate-nav";
import { BrandLockup } from "@/components/brand-lockup";
import { SAMPLE_EOB } from "@/lib/sample-data";

const methodologySteps = [
  {
    number: "01",
    title: "Ingest and extract",
    description:
      "Parse denial text, insurer references, coverage language, charge details, and known dates from uploaded documents.",
    panel: "bg-white",
  },
  {
    number: "02",
    title: "Classify denial",
    description:
      "Identify whether the dispute is based on medical necessity, coverage terms, documentation failure, coding issues, or utilization review procedure.",
    panel: "bg-panel",
  },
  {
    number: "03",
    title: "Detect deadlines",
    description:
      "Surface immediate filing windows, missing dependencies, and risk cascades if the user misses a specific stage in the process.",
    panel: "bg-white",
  },
  {
    number: "04",
    title: "Map evidence",
    description:
      "Connect clinical notes, prior authorization history, plan guidelines, and provider documentation to each viable appeal ground.",
    panel: "bg-panel",
  },
  {
    number: "05",
    title: "Generate strategy",
    description:
      "Build the case graph showing which actions should happen first, which documents unlock the next stage, and where escalation begins.",
    panel: "bg-white",
  },
  {
    number: "06",
    title: "Draft and export",
    description:
      "Produce internal appeals, external review requests, and complaint drafts in a professional, evidence-aware structure.",
    panel: "bg-panel",
  },
];

const supportActions = [
  "Package denial, evidence, and draft documents together",
  "Highlight missing attachments before filing",
  "Prepare the next escalation path if the current stage fails",
];

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash.slice(1);
    if (!hash) return;
    const target = document.getElementById(hash);
    if (target) {
      requestAnimationFrame(() => {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  }, []);

  function startSampleCase() {
    sessionStorage.setItem("documentText", SAMPLE_EOB);
    sessionStorage.setItem("useSampleMode", "true");
    router.push("/dashboard");
  }

  return (
    <div className="min-h-screen bg-[#FDFCFB] text-[#1E3A5F]">
      <AdvocateNav
        activeItem="intake"
        showCaseContext={false}
        workspaceHref="/workspace"
        methodologyHref="/#methodology"
        evidenceHref="/evidence"
        supportHref="/status"
        exportHref="/confirmation"
        exportLabel="Case Packet"
      />

      <section className="max-w-[1400px] mx-auto pt-16 px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
          <div className="max-w-xl">
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#B83A3A] mb-4">Begin Your Case Review</p>
            <h1 className="font-serif text-7xl md:text-8xl text-[#1E3A5F] mb-8 leading-[0.9] tracking-tighter">
              Review the denial.
              <br />
              <span className="gold-text">Prepare the appeal.</span>
            </h1>
            <p className="text-[#6B6B6B] leading-relaxed mb-10 text-sm">
              Advocate ingests a denial letter or EOB, identifies the actual reason for denial, detects filing deadlines,
              maps escalation paths, and drafts the next documents required to appeal.
            </p>
            <div className="flex flex-wrap gap-4">
              <button
                id="hero-start-btn"
                onClick={startSampleCase}
                className="bg-[#1E3A5F] text-white px-6 py-3 text-xs font-bold tracking-widest uppercase hover:bg-[#1B5E3F] transition-colors inline-block"
              >
                Start a sample case
              </button>
              <Link
                href="/#methodology"
                id="hero-method-btn"
                className="bg-[#E8E4DF] text-[#1E3A5F] px-6 py-3 text-xs font-bold tracking-widest uppercase hover:bg-gray-300 transition-colors"
              >
                View methodology
              </Link>
            </div>
            <div className="mt-12 grid grid-cols-2 gap-8 border-t border-[#E8E4DF] pt-8">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Outputs</p>
                <p className="text-xs font-medium leading-relaxed">Appeal letters, review requests, regulator complaints</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Focus</p>
                <p className="text-xs font-medium leading-relaxed">Denied health-insurance claims and supporting evidence</p>
              </div>
            </div>
          </div>

          <div className="bg-panel border-subtle p-8 card-shadow">
            <div className="flex justify-between items-center mb-6">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#B83A3A] mb-1">Case Intake</p>
                <h2 className="font-serif text-3xl">Start with the denial</h2>
              </div>
              <span className="text-[9px] font-bold bg-[#E8E4DF] px-2 py-1 uppercase tracking-widest">Demo-ready</span>
            </div>
            <div className="space-y-6">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-[#6B6B6B] block mb-2">Denial Letter or EOB</label>
                <div className="bg-white border-subtle p-6 text-sm italic text-[#6B6B6B] leading-relaxed">
                  Claim denied: MRI lumbar spine CPT 72148. Reason listed as &quot;not medically necessary.&quot; Anthem BCBS denied
                  coverage on March 4 despite orthopedic referral and six weeks of documented physical therapy failure.
                  Estimated patient responsibility: $47,832.
                </div>
              </div>
              <div className="grid grid-cols-2 gap-8">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#1B5E3F] mb-1">Detected Denial Reason</p>
                  <p className="text-xs font-bold">Medical necessity</p>
                  <p className="text-[10px] text-[#6B6B6B]">Requires documentation and physician rationale</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#B83A3A] mb-1">Critical Deadline</p>
                  <p className="text-xs font-bold">12 days remaining</p>
                  <p className="text-[10px] text-[#6B6B6B]">Internal appeal window closes Mar 28</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#D97706] mb-1">Evidence Gap</p>
                  <p className="text-xs font-bold">Provider progress notes</p>
                  <p className="text-[10px] text-[#6B6B6B]">No imaging history attached to prior request</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#1B5E3F] mb-1">Next Document</p>
                  <p className="text-xs font-bold">Internal appeal draft</p>
                  <p className="text-[10px] text-[#6B6B6B]">Can be generated immediately</p>
                </div>
              </div>
              <div className="flex space-x-4 pt-4">
                <button
                  id="btn-gen-strategy"
                  onClick={startSampleCase}
                  className="bg-[#1E3A5F] text-white px-6 py-3 text-[10px] font-bold tracking-widest uppercase flex-1 text-center"
                >
                  Generate case strategy
                </button>
                <button
                  id="btn-upload-pdf"
                  className="bg-white border border-[#E8E4DF] text-[#1E3A5F] px-6 py-3 text-[10px] font-bold tracking-widest uppercase"
                >
                  Upload PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-[1400px] mx-auto py-32 px-8">
        <div className="flex items-end justify-between mb-12">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#6B6B6B] mb-4">Core Product Workspace</p>
            <h2 className="font-serif text-6xl">Case workspace</h2>
          </div>
          <div className="flex space-x-12 pb-2">
            <div className="text-center border-r border-[#E8E4DF] pr-12">
              <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400 mb-1">Case</p>
              <p className="text-xs font-bold">#ADV-2047</p>
            </div>
            <div className="text-center border-r border-[#E8E4DF] pr-12">
              <p className="text-[9px] font-bold uppercase tracking-widest text-[#B83A3A] mb-1">Denied Amount</p>
              <p className="text-xs font-bold text-[#B83A3A]">$47,832</p>
            </div>
            <div className="text-center border-r border-[#E8E4DF] pr-12">
              <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400 mb-1">Insurer</p>
              <p className="text-xs font-bold">Anthem BCBS</p>
            </div>
            <div className="text-center">
              <p className="text-[9px] font-bold uppercase tracking-widest text-[#D97706] mb-1">Countdown</p>
              <p className="text-xs font-bold">12 days</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          <div className="lg:col-span-3 space-y-6">
            <div className="bg-panel border-subtle p-6">
              <p className="text-[9px] font-bold uppercase tracking-widest text-[#6B6B6B] mb-4">Case Summary</p>
              <h3 className="font-serif text-2xl mb-4">MRI denial review</h3>
              <div className="space-y-4 text-[11px]">
                <div className="flex justify-between border-b border-[#E8E4DF] pb-2"><span className="text-[#6B6B6B]">Member</span><span className="font-bold">M. Rodriguez</span></div>
                <div className="flex justify-between border-b border-[#E8E4DF] pb-2"><span className="text-[#6B6B6B]">Plan</span><span className="font-bold">PPO Silver 200</span></div>
                <div className="flex justify-between border-b border-[#E8E4DF] pb-2"><span className="text-[#6B6B6B]">Denial reason</span><span className="font-bold text-[#B83A3A]">Not medically necessary</span></div>
                <div className="flex justify-between pb-2"><span className="text-[#6B6B6B]">Current stage</span><span className="font-bold text-[#1B5E3F]">Internal appeal available</span></div>
              </div>
            </div>

            <div className="bg-[#FEF2F2] border border-[#FEE2E2] p-6">
              <p className="text-[9px] font-bold uppercase tracking-widest text-[#B83A3A] mb-4">Deadlines</p>
              <div className="space-y-3">
                <div className="bg-white p-3 border border-[#FEE2E2]">
                  <p className="text-[9px] text-[#B83A3A] font-bold">Mar 28</p>
                  <p className="text-[11px] font-bold">Internal appeal due</p>
                </div>
                <div className="bg-white/50 p-3 border border-orange-200">
                  <p className="text-[9px] text-orange-600 font-bold">Mar 22</p>
                  <p className="text-[11px] font-bold">Obtain physician addendum</p>
                </div>
                <div className="bg-white/50 p-3 border border-blue-200 opacity-50">
                  <p className="text-[9px] text-blue-600 font-bold">Apr 14</p>
                  <p className="text-[11px] font-bold">External review fallback</p>
                </div>
              </div>
            </div>

            <div className="bg-panel border-subtle p-6">
              <p className="text-[9px] font-bold uppercase tracking-widest text-[#6B6B6B] mb-4">Evidence Checklist</p>
              <ul className="space-y-3">
                {[
                  ["#B83A3A", "Progress notes from orthopedist"],
                  ["#1B5E3F", "Prior authorization record"],
                  ["#B83A3A", "PT failure documentation"],
                  ["#E8E4DF", "Coverage terms excerpt"],
                ].map(([color, label]) => (
                  <li key={label} className="flex items-center space-x-2 text-[11px]">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                    <span>{label}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="p-6 bg-white border-subtle">
              <p className="text-[9px] font-bold uppercase tracking-widest text-[#B83A3A] mb-4">Appeal Grounds</p>
              <div className="space-y-3 text-[10px] leading-relaxed">
                <p>Coverage criteria applied without complete chart review</p>
                <p>Conservative treatment failure already documented</p>
                <p>Plan language supports advanced imaging after PT failure</p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-6 bg-panel border-subtle p-8 flex flex-col">
            <div className="flex justify-between items-center mb-8">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#6B6B6B] mb-1">Escalation Graph</p>
                <h3 className="font-serif text-3xl">Attack tree</h3>
              </div>
              <div className="flex space-x-4 text-[9px] font-bold uppercase tracking-widest">
                {[
                  ["#B83A3A", "Denial"],
                  ["#1B5E3F", "Action"],
                  ["#C4A747", "Document"],
                  ["#D97706", "Escalation"],
                  ["#2563EB", "Evidence"],
                ].map(([color, label]) => (
                  <span key={label} className="flex items-center">
                    <i className="w-2 h-2 rounded-full mr-1" style={{ backgroundColor: color }} />
                    {label}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center relative">
              <div className="bg-white border-subtle p-6 max-w-[200px] text-center mb-12 shadow-sm relative z-10">
                <p className="text-[9px] font-bold text-[#B83A3A] uppercase tracking-widest mb-1">Denial</p>
                <p className="text-[11px] font-bold leading-tight">MRI not medically necessary</p>
              </div>

              <div className="w-full flex justify-center space-x-12 relative">
                <svg className="absolute top-[-48px] left-0 w-full h-48 pointer-events-none" style={{ stroke: "#E8E4DF", strokeWidth: 1, fill: "none" }}>
                  <path d="M 345,0 L 225,100 M 345,0 L 345,100 M 345,0 L 465,100" />
                </svg>

                <div className="bg-white border-subtle p-4 w-40 text-center shadow-sm">
                  <p className="text-[9px] font-bold text-[#2563EB] uppercase tracking-widest mb-1">Evidence</p>
                  <p className="text-[10px] font-bold leading-tight mb-1">Medical basis</p>
                  <p className="text-[9px] text-gray-400">Orthopedic progression notes</p>
                </div>
                <div className="bg-white border-subtle p-4 w-40 text-center shadow-sm border-2 border-[#1B5E3F]">
                  <p className="text-[9px] font-bold text-[#1B5E3F] uppercase tracking-widest mb-1">Action</p>
                  <p className="text-[10px] font-bold leading-tight mb-1">Internal appeal</p>
                  <p className="text-[9px] text-gray-400">Primary route</p>
                </div>
                <div className="bg-white border-subtle p-4 w-40 text-center shadow-sm">
                  <p className="text-[9px] font-bold text-[#D97706] uppercase tracking-widest mb-1">Escalation</p>
                  <p className="text-[10px] font-bold leading-tight mb-1">External review</p>
                  <p className="text-[9px] text-gray-400">Fallback if denied</p>
                </div>
              </div>

              <div className="w-full flex justify-center space-x-12 mt-12 relative">
                <svg className="absolute top-[-48px] left-0 w-full h-48 pointer-events-none" style={{ stroke: "#E8E4DF", strokeWidth: 1, fill: "none" }}>
                  <path d="M 225,0 L 225,100 M 345,0 L 345,100 M 465,0 L 465,100" />
                </svg>

                <div className="bg-white border-subtle p-4 w-40 text-center shadow-sm opacity-60">
                  <p className="text-[9px] font-bold text-[#B83A3A] uppercase tracking-widest mb-1">Deadline</p>
                  <p className="text-[10px] font-bold leading-tight mb-1">Mar 28</p>
                  <p className="text-[9px] text-gray-400">Internal appeal cutoff</p>
                </div>
                <div className="bg-white border-subtle p-4 w-40 text-center shadow-sm">
                  <p className="text-[9px] font-bold text-[#C4A747] uppercase tracking-widest mb-1">Document</p>
                  <p className="text-[10px] font-bold leading-tight mb-1">Appeal draft</p>
                  <p className="text-[9px] text-gray-400">Ready to edit</p>
                </div>
                <div className="bg-white border-subtle p-4 w-40 text-center shadow-sm flex flex-col justify-between">
                  <div>
                    <p className="text-[9px] font-bold text-[#2563EB] uppercase tracking-widest mb-1">Evidence</p>
                    <p className="text-[10px] font-bold leading-tight mb-1">Gather records</p>
                    <p className="text-[9px] text-gray-400">PT + imaging history</p>
                  </div>
                </div>
                <div className="bg-white border-subtle p-4 w-40 text-center shadow-sm">
                  <p className="text-[9px] font-bold text-[#D97706] uppercase tracking-widest mb-1">Escalation</p>
                  <p className="text-[10px] font-bold leading-tight mb-1">Regulator complaint</p>
                  <p className="text-[9px] text-gray-400 italic">If procedural error found</p>
                </div>
              </div>

              <div className="mt-24 bg-[#F3F4F6] border-subtle px-12 py-6 text-center shadow-sm border-dashed">
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#1B5E3F] mb-1">Outcome</p>
                <h4 className="font-serif text-xl">Coverage restored</h4>
                <p className="text-[10px] text-gray-500">Claim overturned or reduced</p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-3 space-y-6">
            <div className="bg-white border-subtle p-6 card-shadow">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400 mb-1">Selected Node</p>
                  <h3 className="font-serif text-3xl">Internal appeal</h3>
                </div>
                <span className="bg-[#F0FDF4] text-[#166534] text-[9px] font-bold px-2 py-1 uppercase tracking-widest">Ready to draft</span>
              </div>

              <div className="space-y-4 mb-8">
                <div className="bg-[#F9F8F6] p-4 border-l-2 border-[#1B5E3F]">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#1B5E3F] mb-1">Success Signal</p>
                  <p className="text-[11px] font-bold leading-tight">Clinical documentation supports escalation</p>
                </div>
                <div className="bg-[#FEF2F2] p-4 border-l-2 border-[#B83A3A]">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#B83A3A] mb-1">Dependency</p>
                  <p className="text-[11px] font-bold leading-tight">Physician addendum still required</p>
                </div>
              </div>

              <div className="bg-white border-subtle p-6 mb-6">
                <p className="text-[9px] font-bold uppercase tracking-widest text-[#C4A747] mb-4">Draft Preview</p>
                <h4 className="font-serif text-2xl mb-4">Internal Appeal Letter – Draft 1</h4>
                <div className="text-[11px] leading-relaxed text-[#4A4A4A] space-y-4 font-light">
                  <p>
                    I am requesting reconsideration of the denial for lumbar spine MRI CPT 72148. The claim was denied for lack
                    of medical necessity, however the record reflects six weeks of unsuccessful physical therapy, worsening
                    radicular symptoms, and an orthopedic referral documenting the need for advanced imaging.
                  </p>
                  <ul className="list-disc pl-4 space-y-2">
                    <li>References conservative treatment failure already attempted</li>
                    <li>Cites plan language allowing imaging after documented symptom progression</li>
                    <li>Requests full utilization review rationale and reviewer credentials</li>
                  </ul>
                </div>
              </div>

              <div className="flex space-x-3 mb-8">
                <Link id="btn-export-draft" href="/draft" className="bg-[#1E3A5F] text-white px-4 py-2 text-[10px] font-bold tracking-widest uppercase flex-1 text-center">
                  Export draft
                </Link>
                <Link id="btn-edit-content" href="/draft" className="bg-white border border-[#E8E4DF] text-[#1E3A5F] px-4 py-2 text-[10px] font-bold tracking-widest uppercase">
                  Edit content
                </Link>
              </div>

              <div className="pt-6 border-t border-[#E8E4DF]">
                <p className="text-[9px] font-bold uppercase tracking-widest text-[#B83A3A] mb-1">Risk Mode</p>
                <p className="text-[11px] font-bold leading-tight">Miss Mar 28 and external review rights narrow immediately.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="methodology" className="max-w-[1400px] mx-auto py-32 px-8 border-t border-[#E8E4DF]">
        <div className="flex justify-between items-start mb-16">
          <div className="max-w-xl">
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#6B6B6B] mb-4">Methodology and Responsible Use</p>
            <h2 className="font-serif text-6xl leading-tight">How Advocate handles a denial</h2>
          </div>
          <p className="max-w-md text-sm text-[#6B6B6B] leading-relaxed text-right pt-12">
            The product experience is structured as a defensible process: document intake, denial classification, evidence
            mapping, escalation design, draft generation, and final case packaging.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-[#E8E4DF] border-subtle">
          {methodologySteps.map((step) => (
            <div key={step.number} className={`${step.panel} p-10`}>
              <p className="text-[10px] font-bold text-[#6B6B6B] mb-6 uppercase tracking-widest">{step.number}</p>
              <h3 className="font-serif text-3xl mb-4">{step.title}</h3>
              <p className="text-xs leading-relaxed text-[#6B6B6B]">{step.description}</p>
            </div>
          ))}
        </div>

        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-12">
          {[
            {
              eyebrow: "Evidence Grounding",
              title: "Every action ties back to a case artifact",
              body: "The system is framed around coverage excerpts, dates, and medical documentation rather than open-ended chat responses.",
            },
            {
              eyebrow: "Human Review",
              title: "Drafts are prepared for inspection, not blind submission",
              body: "The interface keeps assumptions visible, identifies missing records, and leaves room for clinician or patient review before export.",
            },
            {
              eyebrow: "Handling and Limits",
              title: "Institutional tone without overclaiming",
              body: "Advocate helps organize and draft a response. It does not present itself as a law firm or as a diagnostic medical authority.",
            },
          ].map((item) => (
            <div key={item.title} className="space-y-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#1B5E3F]">{item.eyebrow}</p>
              <h4 className="font-serif text-xl">{item.title}</h4>
              <p className="text-xs text-[#6B6B6B] leading-relaxed">{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-[1400px] mx-auto py-32 px-8 border-t border-[#E8E4DF]">
        <div className="mb-16">
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#6B6B6B] mb-4">Evidence and Research Library</p>
          <h2 className="font-serif text-6xl">Explore denial patterns and support requirements</h2>
        </div>

        <div className="bg-panel border-subtle p-10">
          <div className="max-w-5xl mx-auto mb-12">
            <div className="relative">
              <input
                type="text"
                placeholder="Search appeal grounds, insurer patterns, and required documents"
                className="w-full bg-white border-subtle p-4 pl-12 text-sm focus:border-[#1B5E3F] transition-colors outline-none"
                readOnly
              />
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
            </div>
            <div className="flex flex-wrap gap-4 mt-4">
              {[
                "Denial type: Medical necessity",
                "Insurer: Anthem BCBS",
                "Document class: Clinical support",
                "Escalation stage: Internal appeal",
              ].map((filter, index) => (
                <span key={filter} className="text-[9px] font-bold border border-[#E8E4DF] px-3 py-1 uppercase tracking-widest flex items-center bg-white cursor-pointer hover:bg-gray-100">
                  {filter}
                  {index < 2 ? <X className="ml-2 text-gray-300 h-3 w-3" /> : null}
                </span>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            {[
              {
                eyebrow: "Common Denial Reason",
                eyebrowColor: "text-[#B83A3A]",
                title: "Medical necessity",
                body: "Often requires progression evidence, specialist notes, and proof that conservative treatment has already failed.",
              },
              {
                eyebrow: "Required Support",
                eyebrowColor: "text-[#1B5E3F]",
                title: "Physician addendum",
                body: "A short clinical statement tying symptoms, failed treatment, and requested imaging to documented plan criteria.",
              },
              {
                eyebrow: "Escalation Path",
                eyebrowColor: "text-[#D97706]",
                title: "External review",
                body: "Appropriate when the internal appeal is denied or when procedural fairness issues appear in utilization review handling.",
              },
            ].map((card) => (
              <div key={card.title} className="bg-white border-subtle p-8">
                <p className={`text-[10px] font-bold uppercase tracking-widest mb-2 ${card.eyebrowColor}`}>{card.eyebrow}</p>
                <h3 className="font-serif text-3xl mb-4">{card.title}</h3>
                <p className="text-xs leading-relaxed text-[#6B6B6B]">{card.body}</p>
              </div>
            ))}
          </div>

          <div className="bg-white border-subtle p-8">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#B83A3A] mb-2">Insurer Pattern</p>
            <h3 className="font-serif text-3xl mb-4">Template rationale mismatch</h3>
            <p className="text-xs leading-relaxed text-[#6B6B6B] max-w-2xl">
              Denial language may repeat standardized phrasing even where the case record contains progression evidence
              supporting the request. Advocate identifies these discrepancies to force a specific manual review.
            </p>
          </div>
        </div>
      </section>

      <section id="support" className="max-w-[1400px] mx-auto py-32 px-8 border-t border-[#E8E4DF]">
        <div className="mb-16">
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#6B6B6B] mb-4">Support and Expert Review</p>
          <h2 className="font-serif text-6xl">Prepare the next escalation step</h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
          <div className="lg:col-span-7">
            <div className="space-y-8">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#B83A3A] mb-6">Request Help</p>
                <h3 className="font-serif text-4xl mb-8">Escalation support</h3>

                <div className="grid grid-cols-2 gap-8 mb-8">
                  <div className="space-y-2">
                    <label className="text-[9px] font-bold uppercase tracking-widest text-[#6B6B6B]">Full Name</label>
                    <input type="text" value="Marina Rodriguez" readOnly className="w-full bg-panel border-subtle p-4 text-xs font-medium focus:bg-white outline-none" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-bold uppercase tracking-widest text-[#6B6B6B]">Email</label>
                    <input type="email" value="marina@example.com" readOnly className="w-full bg-panel border-subtle p-4 text-xs font-medium focus:bg-white outline-none" />
                  </div>
                </div>

                <div className="space-y-2 mb-8">
                  <label className="text-[9px] font-bold uppercase tracking-widest text-[#6B6B6B]">Support Type</label>
                  <select className="w-full bg-panel border-subtle p-4 text-xs font-medium focus:bg-white outline-none appearance-none" defaultValue="Review my internal appeal before filing">
                    <option>Review my internal appeal before filing</option>
                    <option>Identify missing evidence artifacts</option>
                    <option>Draft external review request</option>
                  </select>
                </div>

                <div className="space-y-2 mb-8">
                  <label className="text-[9px] font-bold uppercase tracking-widest text-[#6B6B6B]">Case Notes</label>
                  <textarea
                    readOnly
                    className="w-full h-40 bg-panel border-subtle p-4 text-xs font-medium focus:bg-white outline-none resize-none"
                    value="Need a final check that the evidence packet and physician statement are aligned before submission."
                  />
                </div>

                <div className="flex space-x-4">
                  <button id="btn-request-review" className="bg-[#1E3A5F] text-white px-8 py-3 text-[10px] font-bold tracking-widest uppercase">
                    Request review
                  </button>
                  <Link id="btn-full-packet" href="/confirmation" className="bg-white border border-[#E8E4DF] text-[#1E3A5F] px-8 py-3 text-[10px] font-bold tracking-widest uppercase">
                    Export full case packet
                  </Link>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 space-y-12">
            <div className="space-y-6">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#1B5E3F]">Available Guidance</p>
              <h4 className="font-serif text-3xl">What the support flow can do</h4>
              <ul className="space-y-4">
                {supportActions.map((action) => (
                  <li key={action} className="flex items-start space-x-3 text-sm text-[#4A4A4A]">
                    <Check className="text-[#1B5E3F] mt-1 h-4 w-4" />
                    <span>{action}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-panel border-subtle p-8">
              <p className="text-[9px] font-bold uppercase tracking-widest text-[#6B6B6B] mb-2">Case Packet</p>
              <h4 className="font-serif text-3xl mb-4">Ready for export</h4>
              <p className="text-xs text-[#6B6B6B] leading-relaxed mb-6">
                Internal appeal draft, evidence checklist, denial summary, and deadline table can be exported as a single review packet.
              </p>
              <div className="h-px bg-[#E8E4DF] w-full mb-6" />
              <div className="flex items-center space-x-2 text-[10px] font-bold uppercase tracking-widest">
                <FileText className="text-xl" />
                <span>Case_Packet_Rodriguez_BCBS.pdf</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="bg-panel border-t border-[#E8E4DF] py-20 px-8">
        <div className="max-w-[1400px] mx-auto flex flex-col md:flex-row justify-between items-end">
          <div className="space-y-8">
            <BrandLockup width={620} height={148} imageClassName="h-[78px] w-auto" />
          </div>
          <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-12 text-[10px] font-bold tracking-[0.2em] uppercase text-[#4A4A4A]">
            <Link href="/" id="foot-intake" className="hover:text-[#1B5E3F]">Intake</Link>
            <Link href="/workspace" id="foot-workspace" className="hover:text-[#1B5E3F]">Workspace</Link>
            <Link href="/#methodology" id="foot-method" className="hover:text-[#1B5E3F]">Methodology</Link>
            <Link href="/evidence" id="foot-evidence" className="hover:text-[#1B5E3F]">Evidence</Link>
            <Link href="/#support" id="foot-support" className="hover:text-[#1B5E3F]">Support</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
