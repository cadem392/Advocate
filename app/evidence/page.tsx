"use client";

import { Check, LayoutGrid, UploadCloud, ArrowDownWideNarrow } from "lucide-react";
import { AdvocateNav } from "@/components/advocate-nav";

const documents = [
  {
    name: "MRI_Lumbar_Spine_2023.pdf",
    meta: "Mar 12, 2024 • 2.4 MB",
    primaryTag: ["Imaging", "bg-[#E8F5E9] text-[#1B5E3F]"],
    secondaryTag: ["Linked", "bg-[#E3F2FD] text-[#2563EB]"],
    selected: false,
    verified: true,
  },
  {
    name: "Physician_Statement_v2.pdf",
    meta: "Mar 15, 2024 • 1.1 MB",
    primaryTag: ["Clinical Note", "bg-[#FFF8E1] text-[#C4A747]"],
    secondaryTag: ["Unverified", "bg-[#F3F3F3] text-gray-500"],
    selected: true,
    verified: false,
  },
  {
    name: "Surgical_Center_EOB.pdf",
    meta: "Mar 10, 2024 • 0.8 MB",
    primaryTag: ["Billing", "bg-[#F3E5F5] text-[#9333EA]"],
    selected: false,
    verified: false,
  },
  {
    name: "PT_Failure_Log.xlsx",
    meta: "Feb 28, 2024 • 0.2 MB",
    primaryTag: ["Treatment", "bg-[#E8F5E9] text-[#1B5E3F]"],
    selected: false,
    verified: false,
  },
];

export default function EvidencePage() {
  const filters = [
    { label: "All Documents", count: "12", active: true },
    { label: "Imaging & Scans", count: "3", active: false },
    { label: "Surgical Notes", count: "2", active: false },
    { label: "Clinical Corr.", count: "4", active: false },
    { label: "Test Results", count: "1", active: false },
    { label: "Treatment History", count: "2", active: false },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#FDFCFB] text-[#1E3A5F]">
      <AdvocateNav
        activeItem="evidence"
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
        <aside className="w-64 border-r border-[#E8E4DF] bg-white overflow-y-auto p-6 flex flex-col gap-8">
          <section>
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-[#6B6B6B] mb-4">Document Filter</h3>
            <nav className="space-y-1">
              {filters.map(({ label, count, active }) => (
                <a
                  key={label}
                  href="#"
                  className={`flex items-center justify-between p-2 text-[11px] ${active ? "font-bold bg-[#F9F8F6] text-[#1E3A5F]" : "font-medium text-[#6B6B6B] hover:bg-gray-50"}`}
                >
                  <span>{label}</span>
                  <span className="opacity-50">{count}</span>
                </a>
              ))}
            </nav>
          </section>

          <section>
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-[#6B6B6B] mb-4">Vault Status</h3>
            <div className="space-y-3">
              {[
                ["#1B5E3F", "8 Verified & Linked"],
                ["#C4A747", "3 Pending Analysis"],
                ["#B83A3A", "1 Missing Metadata"],
              ].map(([color, label]) => (
                <div key={label} className="flex items-center space-x-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                  <span className="text-[11px] font-medium">{label}</span>
                </div>
              ))}
            </div>
          </section>

          <div className="mt-auto">
            <div className="bg-[#F9F8F6] p-4 border border-[#E8E4DF]">
              <p className="text-[10px] font-bold uppercase text-[#1E3A5F] mb-1">Vault Storage</p>
              <div className="w-full bg-gray-200 h-1 mb-2">
                <div className="bg-[#1E3A5F] h-1 w-1/4" />
              </div>
              <p className="text-[9px] text-[#6B6B6B]">12.4 MB of 500 MB used</p>
            </div>
          </div>
        </aside>

        <main className="flex-1 bg-[#FDFCFB] p-10 overflow-y-auto flex flex-col gap-10">
          <header className="flex justify-between items-end">
            <div className="flex flex-col gap-1">
              <h1 className="font-serif text-4xl text-[#1E3A5F]">Evidence Library</h1>
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#6B6B6B]">Repository for Claim #ADV-2047</p>
            </div>
            <div className="flex gap-3">
              <button className="px-4 py-2 border border-[#E8E4DF] bg-white text-[10px] font-bold uppercase tracking-widest hover:bg-gray-50">
                Scan Folder
              </button>
              <button className="px-4 py-2 bg-[#1E3A5F] text-white text-[10px] font-bold uppercase tracking-widest hover:bg-[#1B5E3F]">
                Upload Documents
              </button>
            </div>
          </header>

          <div className="border-2 border-dashed border-[#E8E4DF] bg-[#F9F8F6] p-12 text-center rounded-sm hover:border-[#1E3A5F] transition-colors cursor-pointer">
            <UploadCloud className="text-3xl text-[#6B6B6B] mb-3 mx-auto h-8 w-8" />
            <p className="text-sm font-semibold">Drag and drop evidence files here</p>
            <p className="text-[11px] text-[#6B6B6B] mt-1 uppercase tracking-wider">Supports PDF, JPEG, DICOM, and TIFF</p>
          </div>

          <section>
            <div className="flex items-center justify-between mb-6 pb-2 border-b border-[#E8E4DF]">
              <h2 className="text-[11px] font-bold uppercase tracking-widest text-[#1E3A5F]">Recent Uploads</h2>
              <div className="flex items-center gap-4 text-[11px] font-medium text-[#6B6B6B]">
                <span className="flex items-center gap-1 cursor-pointer hover:text-[#1E3A5F]"><ArrowDownWideNarrow className="h-4 w-4" />Date</span>
                <span className="flex items-center gap-1 cursor-pointer hover:text-[#1E3A5F]"><LayoutGrid className="h-4 w-4" />Grid</span>
              </div>
            </div>

            <div className="doc-grid">
              {documents.map((doc) => (
                <div
                  key={doc.name}
                  className={`${doc.selected ? "border-2 border-[#C4A747] ring-2 ring-[#C4A747] ring-offset-2" : "border border-[#E8E4DF]"} bg-white p-3 flex flex-col gap-3 hover:border-[#1E3A5F] group cursor-pointer`}
                >
                  <div className={`aspect-[3/4] ${doc.selected ? "bg-[#F9F8F6]" : "bg-[#F3F3F3]"} flex items-center justify-center overflow-hidden border border-gray-100 relative`}>
                    <div className={`text-4xl ${doc.selected ? "text-[#C4A747]" : "text-gray-300"}`}>📄</div>
                    {doc.verified || doc.selected ? (
                      <div className="absolute top-2 right-2 flex gap-1">
                        <div className={`w-2 h-2 rounded-full ${doc.selected ? "bg-[#C4A747]" : "bg-[#1B5E3F]"}`} />
                      </div>
                    ) : null}
                  </div>
                  <div className="flex flex-col gap-1">
                    <p className={`text-[11px] font-bold truncate ${doc.selected ? "underline underline-offset-2" : ""}`}>{doc.name}</p>
                    <p className="text-[9px] text-[#6B6B6B] uppercase">{doc.meta}</p>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    <span className={`px-1.5 py-0.5 text-[8px] font-bold uppercase ${doc.primaryTag[1]}`}>{doc.primaryTag[0]}</span>
                    {doc.secondaryTag ? <span className={`px-1.5 py-0.5 text-[8px] font-bold uppercase ${doc.secondaryTag[1]}`}>{doc.secondaryTag[0]}</span> : null}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </main>

        <aside className="w-[400px] border-l border-[#E8E4DF] bg-white flex flex-col overflow-hidden">
          <div className="p-6 border-b border-[#E8E4DF] bg-[#F9F8F6] flex flex-col gap-1">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#C4A747]">Document Insight</span>
            <h3 className="font-serif text-lg truncate">Physician_Statement_v2.pdf</h3>
          </div>

          <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-8">
            <section className="bg-[#F9F8F6] border border-[#E8E4DF] p-5">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] font-bold uppercase tracking-widest">Relevance Score</span>
                <span className="text-xl font-serif font-bold text-[#1B5E3F]">94%</span>
              </div>
              <div className="h-1.5 w-full bg-gray-200 rounded-full mb-4">
                <div className="h-1.5 bg-[#1B5E3F] rounded-full" style={{ width: "94%" }} />
              </div>
              <p className="text-[11px] text-[#6B6B6B] leading-relaxed">
                High alignment with denial grounds: <b>Medical Necessity</b>. Document contains direct clinician testimony
                addressing prior PT failure.
              </p>
            </section>

            <section>
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-[#6B6B6B] mb-3 border-b border-[#E8E4DF] pb-2">Evidence Mapping</h4>
              <div className="space-y-4">
                <div className="flex gap-3">
                  <div className="mt-1 w-4 h-4 rounded-full bg-[#1B5E3F] flex-shrink-0 flex items-center justify-center">
                    <Check className="text-white h-[10px] w-[10px]" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <p className="text-[11px] font-bold">Strategy Link: Internal Appeal Level 1</p>
                    <p className="text-[10px] text-[#6B6B6B]">Mapped as primary clinical evidence for Section 2.4 (Exhaustion of conservative therapy).</p>
                  </div>
                </div>
                <div className="flex gap-3 opacity-50">
                  <div className="mt-1 w-4 h-4 rounded-full border border-[#E8E4DF] flex-shrink-0" />
                  <div className="flex flex-col gap-1">
                    <p className="text-[11px] font-bold">Strategy Link: External State Review</p>
                    <p className="text-[10px] text-[#6B6B6B]">Potential secondary evidence for procedural fairness.</p>
                  </div>
                </div>
              </div>
            </section>

            <section>
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-[#6B6B6B] mb-3 border-b border-[#E8E4DF] pb-2">Annotations</h4>
              <div className="space-y-3">
                <div className="p-3 bg-white border border-[#E8E4DF] rounded-sm">
                  <p className="text-[10px] text-[#1E3A5F] leading-relaxed italic">
                    &quot;Note: Highlight page 3, second paragraph where Dr. Chen explicitly mentions the failure of the 6-week PT course.&quot;
                  </p>
                  <div className="flex justify-between mt-2">
                    <span className="text-[9px] font-bold uppercase opacity-40">AI Suggestion</span>
                    <span className="text-[9px] font-bold text-[#C4A747] uppercase cursor-pointer hover:underline">Apply Highlight</span>
                  </div>
                </div>
              </div>
            </section>
          </div>

          <div className="p-6 border-t border-[#E8E4DF] bg-white flex flex-col gap-3">
            <button className="w-full bg-[#1E3A5F] text-white py-3 text-[10px] font-bold uppercase tracking-widest hover:bg-[#1B5E3F] transition-all">
              Verify and Link Document
            </button>
            <button className="w-full border border-[#B83A3A] text-[#B83A3A] py-3 text-[10px] font-bold uppercase tracking-widest hover:bg-[#B83A3A] hover:text-white transition-all">
              Remove from Vault
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}
