"use client";

import Link from "next/link";
import {
  Bold,
  BookOpen,
  CheckCircle2,
  Download,
  ExternalLink,
  FileText,
  Italic,
  Microscope,
  PlusCircle,
  Quote,
  Save,
  Send,
  ShieldCheck,
  Underline,
} from "lucide-react";
import { AdvocateNav } from "@/components/advocate-nav";

export default function DraftPage() {
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

      <main className="flex-1 flex overflow-hidden">
        <div className="w-3/5 flex flex-col bg-[#F3F3F3]/40 border-r border-[#E8E4DF]">
          <header className="bg-white border-b border-[#E8E4DF] px-8 py-3 flex items-center justify-between shadow-sm z-10">
            <div className="flex items-center space-x-4">
              <div className="flex items-center border border-[#E8E4DF] rounded bg-white overflow-hidden">
                <button className="px-3 py-2 hover:bg-gray-50 border-r border-[#E8E4DF]"><Bold className="text-sm h-4 w-4" /></button>
                <button className="px-3 py-2 hover:bg-gray-50 border-r border-[#E8E4DF]"><Italic className="text-sm h-4 w-4" /></button>
                <button className="px-3 py-2 hover:bg-gray-50"><Underline className="text-sm h-4 w-4" /></button>
              </div>
              <div className="h-6 w-px bg-[#E8E4DF]" />
              <button className="flex items-center space-x-2 px-4 py-2 text-[10px] font-bold tracking-widest uppercase border border-[#E8E4DF] bg-white hover:bg-gray-50 transition-colors">
                <PlusCircle className="text-sm text-[#C4A747] h-4 w-4" />
                <span>Insert Evidence</span>
              </button>
              <button className="flex items-center space-x-2 px-4 py-2 text-[10px] font-bold tracking-widest uppercase border border-[#E8E4DF] bg-white hover:bg-gray-50 transition-colors">
                <Quote className="text-sm text-[#1B5E3F] h-4 w-4" />
                <span>Clinical Citation</span>
              </button>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-[9px] font-bold uppercase tracking-widest text-[#6B6B6B]">Last saved: 2m ago</span>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto p-12 editor-surface">
            <div className="max-w-[800px] mx-auto bg-white letter-shadow p-16 min-h-[1056px] border border-[#E8E4DF] text-[#2C2C2C] leading-relaxed relative">
              <div className="absolute top-12 right-16 text-right text-[10px] uppercase font-bold tracking-widest opacity-30">Official Appeal Draft</div>
              <div className="mb-10 text-[11px]">
                <p className="font-bold">Anthem Blue Cross</p>
                <p>Grievances and Appeals Department</p>
                <p>P.O. Box 4310</p>
                <p>Woodland Hills, CA 91365</p>
              </div>
              <div className="mb-10 font-bold text-xs uppercase tracking-tight border-b border-[#F3F3F3] pb-4">
                <p>RE: Expedited Internal Appeal (Level 1)</p>
                <p>Patient: Marina Rodriguez | Claim: CLM-889274</p>
              </div>
              <p className="mb-6 text-[11px]">To the Appeals Committee,</p>
              <p className="mb-6 text-[11px]">
                This letter serves as a formal appeal regarding the denial of coverage for a lumbar spine MRI (CPT 72148)
                for Marina Rodriguez. The denial, issued on March 4, 2024, wrongly concludes that the procedure is not
                medically necessary.
              </p>
              <div className="mb-8 p-5 bg-[#F9F8F6] border-l-2 border-[#1B5E3F]">
                <p className="text-[11px] font-serif italic mb-3">&quot;Clinical Evidence Argument: Failure of Conservative Therapy&quot;</p>
                <p className="text-[11px]">
                  As documented in the patient&apos;s medical records from <span className="editable-region px-1 rounded">[SELECT_PROVIDER_DATE]</span>,
                  the patient has completed more than six weeks of conservative treatment including{" "}
                  <span className="editable-region px-1 rounded">[INSERT_TREATMENT_TYPES]</span>. The insurer&apos;s internal guideline
                  B-204 clearly states that imaging is indicated when such therapy fails to produce neurological improvement.
                </p>
              </div>
              <p className="mb-6 text-[11px]">
                Specific to the patient&apos;s presentation of radiculopathy, Dr. Lawrence Chen noted on{" "}
                <span className="editable-region px-1 rounded">February 14, 2024</span> that &quot;the patient&apos;s pain has progressed despite
                maximal physical therapy intervention.&quot; This clinical observation was omitted from your initial review of the file.
              </p>
              <p className="mb-8 text-[11px]">
                Furthermore, per the <span className="editable-region px-1 rounded italic">ACA Section 2719</span> requirements for
                independent clinical review, we request that a board-certified neuroradiologist review this case specifically
                against the criteria for neurological progression.
              </p>
              <p className="mb-12 text-[11px]">
                Please provide a determination within the expedited 72-hour window required for medical necessity disputes
                where a delay could result in irreversible clinical deterioration.
              </p>
              <div className="mt-20">
                <p className="text-[11px]">Sincerely,</p>
                <div className="h-16 w-48 border-b border-gray-300 mb-2" />
                <p className="text-[11px] font-bold">Marina Rodriguez</p>
                <p className="text-[10px] text-gray-400 font-medium uppercase mt-1">Electronic Signature Pending Verification</p>
              </div>
            </div>
          </div>
        </div>

        <aside className="w-2/5 bg-white flex flex-col border-l border-[#E8E4DF]">
          <header className="p-6 border-b border-[#E8E4DF] bg-[#FDFCFB]">
            <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#1E3A5F] mb-1">Evidence Library</h3>
            <p className="text-[10px] text-[#6B6B6B]">Drag and drop artifacts to insert as clinical citations</p>
          </header>

          <div className="flex-1 overflow-y-auto p-6 space-y-8">
            <section>
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-[#B83A3A] mb-4 flex items-center">
                <FileText className="mr-2 h-4 w-4" />Primary Clinical Records
              </h4>
              <div className="space-y-4">
                <div className="p-4 border border-[#E8E4DF] bg-[#FDFCFB] hover:border-[#1E3A5F] transition-all group cursor-move">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[10px] font-bold text-[#1E3A5F] uppercase">Dr. Lawrence Chen</span>
                    <span className="text-[9px] text-[#6B6B6B]">02/14/24</span>
                  </div>
                  <p className="text-[11px] font-semibold mb-1">Progress Note: PT Failure</p>
                  <p className="text-[10px] text-[#6B6B6B] leading-relaxed line-clamp-2">
                    &quot;Patient reports 8/10 pain. PT records show 12 sessions without relief. Requesting MRI...&quot;
                  </p>
                </div>
                <div className="p-4 border border-[#E8E4DF] bg-[#FDFCFB] hover:border-[#1E3A5F] transition-all group cursor-move">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[10px] font-bold text-[#1E3A5F] uppercase">Summit PT Center</span>
                    <span className="text-[9px] text-[#6B6B6B]">01/28/24</span>
                  </div>
                  <p className="text-[11px] font-semibold mb-1">PT Completion Summary</p>
                  <p className="text-[10px] text-[#6B6B6B] leading-relaxed line-clamp-2">
                    Documentation of 6-week protocol adherence. No change in radicular symptoms.
                  </p>
                </div>
              </div>
            </section>

            <section>
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-[#C4A747] mb-4 flex items-center">
                <BookOpen className="mr-2 h-4 w-4" />Insurer Guidelines
              </h4>
              <div className="p-4 border border-[#C4A747]/30 bg-[#FDFCFB] hover:border-[#C4A747] transition-all cursor-move">
                <div className="flex items-center space-x-2 mb-2">
                  <ExternalLink className="text-[#C4A747] text-xs h-3 w-3" />
                  <span className="text-[9px] font-bold text-[#C4A747] uppercase">Internal Policy B-204</span>
                </div>
                <p className="text-[11px] font-semibold mb-1">Lumbar Imaging Criteria</p>
                <p className="text-[10px] text-[#6B6B6B] italic leading-relaxed">
                  &quot;Requires 6 weeks conservative tx unless progressive neuro deficit exists.&quot;
                </p>
              </div>
            </section>

            <section>
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-[#1B5E3F] mb-4 flex items-center">
                <Microscope className="mr-2 h-4 w-4" />Precedents &amp; Laws
              </h4>
              <div className="p-4 border border-[#E8E4DF] bg-[#FDFCFB] hover:border-[#1B5E3F] transition-all cursor-move">
                <span className="text-[9px] font-bold text-[#1B5E3F] uppercase mb-1 block">ACA Sec. 2719</span>
                <p className="text-[10px] text-[#6B6B6B] leading-relaxed">Requirements for external review of medical necessity disputes.</p>
              </div>
            </section>
          </div>

          <div className="p-6 bg-[#FDFCFB] border-t border-[#E8E4DF]">
            <div className="flex items-center space-x-2 text-[10px] font-bold uppercase text-[#1B5E3F] mb-3">
              <ShieldCheck className="h-4 w-4" />
              <span>Source Verification</span>
            </div>
            <p className="text-[10px] text-[#6B6B6B] leading-relaxed">
              Every clinical citation in this draft is tied to an verified OCR-scanned artifact from the case library.
            </p>
          </div>
        </aside>
      </main>

      <div className="h-20 border-t border-[#E8E4DF] bg-white px-8 flex items-center justify-between z-40">
        <div className="flex items-center space-x-8">
          <div className="flex flex-col">
            <span className="text-[9px] font-bold uppercase tracking-widest text-[#6B6B6B]">Draft Status</span>
            <span className="text-xs font-bold text-[#1B5E3F] flex items-center">
              <CheckCircle2 className="mr-1.5 h-4 w-4" />
              Ready for review
            </span>
          </div>
          <div className="h-8 w-px bg-[#E8E4DF]" />
          <div className="flex flex-col">
            <span className="text-[9px] font-bold uppercase tracking-widest text-[#6B6B6B]">Evidence Attached</span>
            <span className="text-xs font-bold">4 Artifacts</span>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <button id="btn-save-draft" className="bg-white border border-[#1E3A5F] text-[#1E3A5F] px-6 py-3 text-[10px] font-bold tracking-widest uppercase hover:bg-gray-50 transition-all">
            Save Draft
          </button>
          <button id="btn-preview-final" className="bg-white border border-[#1E3A5F] text-[#1E3A5F] px-6 py-3 text-[10px] font-bold tracking-widest uppercase hover:bg-gray-50 transition-all">
            Preview Final
          </button>
          <Link id="btn-send-letter" href="/confirmation" className="bg-[#1E3A5F] text-white px-10 py-3 text-[10px] font-bold tracking-widest uppercase hover:bg-[#1B5E3F] shadow-lg transition-all flex items-center space-x-2">
            <Send className="h-4 w-4" />
            <span>Send Letter</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
