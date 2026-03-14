"use client";

import Link from "next/link";
import {
  AlertCircle,
  Check,
  Download,
  Edit3,
  FileSearch,
  FileText,
  GitPullRequest,
  Maximize2,
  ShieldCheck,
  Target,
  TrendingUp,
  ZoomIn,
} from "lucide-react";
import { AdvocateNav } from "@/components/advocate-nav";

export default function WorkspacePage() {
  const evidenceChecklist = [
    { label: "Imaging History (MRI 2023)", checked: true },
    { label: "Orthopedic Surgery Notes", checked: true },
    { label: "Physician Addendum (Pending)", checked: false },
    { label: "Clinical Guidelines Excerpt", checked: false },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#FDFCFB] text-[#1E3A5F]">
      <AdvocateNav
        activeItem="workspace"
        showCaseContext
        caseId="#ADV-2047"
        patientName="Marina Rodriguez"
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
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#6B6B6B] mb-1">Case Identity</p>
              <h2 className="font-serif text-2xl mb-4">MRI Denial Review</h2>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center pb-2 border-b border-[#F3F3F3]">
                <span className="text-[11px] font-medium text-[#6B6B6B]">Insurer</span>
                <span className="text-[11px] font-bold">Anthem Blue Cross</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-[#F3F3F3]">
                <span className="text-[11px] font-medium text-[#6B6B6B]">Denied Amount</span>
                <span className="text-[11px] font-bold text-[#B83A3A]">$47,832.00</span>
              </div>
              <div className="flex flex-col pt-2">
                <span className="text-[11px] font-medium text-[#6B6B6B] mb-1">Denial Rationale</span>
                <span className="text-[11px] font-semibold leading-snug">Medical Necessity: &quot;Experimental or investigational treatment path&quot;</span>
              </div>
            </div>
          </section>

          <section className="bg-[#FEF2F2] border border-[#FEE2E2] p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <AlertCircle className="text-[#B83A3A] h-4 w-4" />
                <span className="text-[11px] font-bold uppercase tracking-widest text-[#B83A3A]">Deadline</span>
              </div>
              <span className="text-xs font-bold text-[#B83A3A]">12 Days Left</span>
            </div>
            <p className="text-[11px] leading-relaxed text-[#7F1D1D]">
              Internal appeal window closes on March 28. Failure to file waives external review rights.
            </p>
          </section>

          <section>
            <h3 className="text-[11px] font-bold uppercase tracking-widest text-[#1E3A5F] mb-4">Evidence Checklist</h3>
            <ul className="space-y-3">
              {evidenceChecklist.map(({ label, checked }) => (
                <li key={label} className="flex items-start space-x-3">
                  <div className={`w-4 h-4 rounded border mt-0.5 flex items-center justify-center ${checked ? "border-[#1E3A5F] bg-[#1E3A5F] text-white" : "border-[#E8E4DF]"}`}>
                    {checked ? <Check className="h-[10px] w-[10px]" /> : null}
                  </div>
                  <span className="text-[11px] text-[#4A4A4A]">{label}</span>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h3 className="text-[11px] font-bold uppercase tracking-widest text-[#1E3A5F] mb-4">Appeal Grounds</h3>
            <div className="space-y-3">
              <div className="p-3 bg-[#F9F8F6] border border-[#E8E4DF]">
                <p className="text-[11px] font-bold mb-1">Incomplete Review</p>
                <p className="text-[10px] text-[#6B6B6B] leading-relaxed">Insurer failed to consider previous conservative physical therapy failure.</p>
              </div>
              <div className="p-3 bg-[#F9F8F6] border border-[#E8E4DF]">
                <p className="text-[11px] font-bold mb-1">Plan Language Mismatch</p>
                <p className="text-[10px] text-[#6B6B6B] leading-relaxed">Evidence shows criteria met under Section 4.2 of the Benefits Booklet.</p>
              </div>
            </div>
          </section>
        </aside>

        <main className="flex-1 bg-[#FDFCFB] relative overflow-hidden flex flex-col">
          <div className="absolute inset-0 graph-container pointer-events-none opacity-50" />
          <header className="p-6 border-b border-[#E8E4DF] bg-white/80 backdrop-blur-sm z-10 flex justify-between items-center">
            <div className="flex flex-col">
              <h1 className="font-serif text-3xl text-[#1E3A5F]">Attack Tree</h1>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#6B6B6B]">Escalation Strategy Graph</p>
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
                  <span className="text-[10px] font-bold uppercase text-[#6B6B6B]">{label}</span>
                </div>
              ))}
            </div>
          </header>

          <div className="flex-1 relative p-12 overflow-auto">
            <svg className="absolute inset-0 w-full h-full pointer-events-none">
              <path d="M 180 200 L 400 120" className="line-connector" />
              <path d="M 180 200 L 400 280" className="line-connector" />
              <path d="M 540 120 L 760 120" className="line-connector" />
              <path d="M 540 280 L 760 280" className="line-connector" />
              <path d="M 900 120 L 1050 200" className="line-connector" />
              <path d="M 900 280 L 1050 200" className="line-connector" />
            </svg>

            <div className="absolute top-[160px] left-[40px] node bg-white border-2 border-[#B83A3A] p-4 w-40 z-20">
              <div className="flex items-center justify-between mb-2">
                <AlertCircle className="text-[#B83A3A] h-4 w-4" />
                <span className="text-[9px] font-bold text-[#B83A3A] uppercase tracking-widest">Denial</span>
              </div>
              <p className="text-xs font-bold leading-tight">MRI Denial: Not Necessary</p>
            </div>

            <div className="absolute top-[80px] left-[380px] node bg-white border border-[#2563EB] p-4 w-40 z-20">
              <div className="flex items-center justify-between mb-2">
                <FileSearch className="text-[#2563EB] h-4 w-4" />
                <span className="text-[9px] font-bold text-[#2563EB] uppercase tracking-widest">Evidence</span>
              </div>
              <p className="text-xs font-bold leading-tight">Physician Addendum Needed</p>
            </div>

            <div className="absolute top-[240px] left-[380px] node bg-white border border-[#1B5E3F] p-4 w-40 z-20 border-l-4 border-l-[#1B5E3F]">
              <div className="flex items-center justify-between mb-2">
                <GitPullRequest className="text-[#1B5E3F] h-4 w-4" />
                <span className="text-[9px] font-bold text-[#1B5E3F] uppercase tracking-widest">Recommended</span>
              </div>
              <p className="text-xs font-bold leading-tight">Internal Appeal (Level 1)</p>
            </div>

            <Link href="/draft" className="absolute top-[80px] left-[740px] node bg-white border border-[#C4A747] p-4 w-40 z-20 ring-2 ring-[#C4A747] ring-offset-2 block">
              <div className="flex items-center justify-between mb-2">
                <FileText className="text-[#C4A747] h-4 w-4" />
                <span className="text-[9px] font-bold text-[#C4A747] uppercase tracking-widest">Selected</span>
              </div>
              <p className="text-xs font-bold leading-tight">Internal Appeal Letter Draft</p>
            </Link>

            <div className="absolute top-[240px] left-[740px] node bg-white border border-[#D97706] p-4 w-40 z-20">
              <div className="flex items-center justify-between mb-2">
                <TrendingUp className="text-[#D97706] h-4 w-4" />
                <span className="text-[9px] font-bold text-[#D97706] uppercase tracking-widest">Escalation</span>
              </div>
              <p className="text-xs font-bold leading-tight">External State Review</p>
            </div>

            <div className="absolute top-[170px] left-[1030px] node bg-[#FDFCFB] border border-[#E8E4DF] p-4 w-40 z-20 border-dashed">
              <div className="flex items-center justify-between mb-2">
                <Target className="text-[#6B6B6B] h-4 w-4" />
                <span className="text-[9px] font-bold text-[#6B6B6B] uppercase tracking-widest">Target</span>
              </div>
              <p className="text-xs font-bold leading-tight">Coverage Restored</p>
            </div>
          </div>

          <footer className="p-6 border-t border-[#E8E4DF] bg-white flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <ShieldCheck className="text-[#1B5E3F] h-4 w-4" />
              <span className="text-[11px] font-medium text-[#4A4A4A]">Verified clinical rationale used. Methodology: Clinical Standard Grounding.</span>
            </div>
            <div className="flex space-x-4">
              <button className="text-[11px] font-bold uppercase tracking-widest text-[#6B6B6B] flex items-center space-x-1 hover:text-[#1E3A5F]">
                <ZoomIn className="h-4 w-4" />
                <span>Zoom In</span>
              </button>
              <button className="text-[11px] font-bold uppercase tracking-widest text-[#6B6B6B] flex items-center space-x-1 hover:text-[#1E3A5F]">
                <Maximize2 className="h-4 w-4" />
                <span>Center Graph</span>
              </button>
            </div>
          </footer>
        </main>

        <aside className="w-[420px] border-l border-[#E8E4DF] bg-white flex flex-col overflow-hidden">
          <div className="p-6 border-b border-[#E8E4DF] flex items-center justify-between bg-[#F9F8F6]">
            <div className="flex flex-col">
              <span className="text-[9px] font-bold uppercase tracking-widest text-[#C4A747]">Drafting Environment</span>
              <h3 className="font-serif text-lg">Internal Appeal Letter</h3>
            </div>
            <div className="flex space-x-2">
              <Link href="/draft" className="w-8 h-8 rounded border border-[#E8E4DF] bg-white flex items-center justify-center hover:bg-gray-50">
                <Edit3 className="text-sm text-[#1E3A5F] h-4 w-4" />
              </Link>
              <button className="w-8 h-8 rounded border border-[#E8E4DF] bg-white flex items-center justify-center hover:bg-gray-50">
                <Download className="text-sm text-[#1E3A5F] h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-8 bg-[#F3F3F3]/30">
            <div className="bg-white letter-shadow p-10 min-h-full border border-[#E8E4DF] text-[#2C2C2C] leading-relaxed">
              <div className="flex justify-between items-start mb-8">
                <div className="text-[11px] uppercase tracking-tighter opacity-40 font-bold">Advocate ID: ADV-2047</div>
                <div className="text-right text-[11px]">
                  <p>Date: March 16, 2024</p>
                </div>
              </div>
              <div className="mb-8 text-[11px]">
                <p>Anthem Blue Cross</p>
                <p>Grievances and Appeals Department</p>
                <p>P.O. Box 4310</p>
                <p>Woodland Hills, CA 91365</p>
              </div>
              <div className="mb-8 font-bold text-xs">
                <p>RE: Expedited Appeal for Denied Service</p>
                <p>Patient: Marina Rodriguez</p>
                <p>Member ID: XEH847293021</p>
                <p>Claim #: CLM-889274</p>
              </div>
              <p className="mb-4 text-[11px]">To Whom It May Concern,</p>
              <p className="mb-4 text-[11px]">
                I am writing to formally appeal the denial of coverage for a medical necessity MRI of the lumbar spine
                (CPT 72148) as requested by Dr. Lawrence Chen. The denial, dated March 4, 2024, cites that the procedure
                is considered &quot;not medically necessary&quot; based on your internal clinical guidelines.
              </p>
              <div className="mb-6 p-4 bg-[#F9F8F6] border-l-2 border-[#C4A747] italic text-[11px]">
                &quot;This appeal is grounded in the Patient Protection and Affordable Care Act requirements for independent
                clinical review and accurate disclosure of clinical criteria used for medical necessity determinations.&quot;
              </div>
              <p className="mb-4 text-[11px]">
                As demonstrated in the attached medical history, the patient has completed six weeks of documented
                conservative therapy, including physical therapy (PT-2024-01) and pharmacological intervention, with no
                improvement in neurological symptoms. Under Clinical Guideline B-204 of your own provider manual, imaging
                is indicated when conservative measures have failed.
              </p>
              <p className="mb-8 text-[11px]">
                Please reconsider this denial immediately to avoid further deterioration of the patient&apos;s condition. I
                expect a response within the regulatory timeframe of 72 hours for expedited requests.
              </p>
              <div className="mt-12">
                <p className="text-[11px]">Sincerely,</p>
                <div className="h-12 w-32 border-b border-gray-300 mb-2" />
                <p className="text-[11px] font-bold">Marina Rodriguez</p>
              </div>
            </div>
          </div>

          <div className="p-6 border-t border-[#E8E4DF] bg-white space-y-4">
            <div className="flex items-center space-x-2 text-[10px] font-bold text-[#1B5E3F] mb-1 uppercase tracking-widest">
              <span>Recommended Actions</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Link id="btn-send-fax" href="/confirmation" className="bg-[#1E3A5F] text-white py-3 px-4 text-[10px] font-bold tracking-widest uppercase hover:bg-[#1B5E3F] transition-all flex items-center justify-center space-x-2">
                <span>Sign &amp; Fax</span>
              </Link>
              <button id="btn-send-mail" className="bg-white border border-[#1E3A5F] text-[#1E3A5F] py-3 px-4 text-[10px] font-bold tracking-widest uppercase hover:bg-gray-50 transition-all flex items-center justify-center space-x-2">
                <span>Send via USPS</span>
              </button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
