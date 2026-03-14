"use client";

import Link from "next/link";
import { Upload } from "lucide-react";
import { AdvocateNav } from "@/components/advocate-nav";
import { BrandLockup } from "@/components/brand-lockup";

const cases = [
  {
    id: "#ADV-2047",
    title: "MRI Denial Review",
    deadline: "12 Days Remaining",
    deadlineClass: "bg-[#FEF2F2] border border-[#FEE2E2] text-[#B83A3A]",
    amount: "$47,832",
    insurer: "Anthem BCBS",
    reason: 'Medical Necessity: "Experimental or investigational treatment path"',
    evidence: "75%",
    evidenceWidth: "w-[75%]",
    primaryActionHref: "/workspace",
    primaryActionLabel: "View Workspace",
    primaryActionClass: "bg-[#1E3A5F] text-white hover:bg-[#1B5E3F]",
    secondaryBorder: "border-[#1E3A5F] text-[#1E3A5F]",
  },
  {
    id: "#ADV-2051",
    title: "CPAP Machine Claim",
    deadline: "28 Days Remaining",
    deadlineClass: "bg-[#FFFBEB] border border-[#FEF3C7] text-[#D97706]",
    amount: "$3,420",
    insurer: "UnitedHealth",
    reason: 'Inadequate Documentation: "Missing sleep study results and compliance logs"',
    evidence: "30%",
    evidenceWidth: "w-[30%]",
    primaryActionHref: "/workspace",
    primaryActionLabel: "View Workspace",
    primaryActionClass: "bg-[#1E3A5F] text-white hover:bg-[#1B5E3F]",
    secondaryBorder: "border-[#1E3A5F] text-[#1E3A5F]",
  },
  {
    id: "#ADV-2055",
    title: "Cardiac Surgery",
    deadline: "48 Hours Left",
    deadlineClass: "bg-[#B83A3A] text-white",
    amount: "$112,000",
    insurer: "Blue Shield CA",
    reason: 'Out-of-Network: "Provider not authorized for tertiary level procedure"',
    evidence: "95%",
    evidenceWidth: "w-[95%]",
    primaryActionHref: "/confirmation",
    primaryActionLabel: "Submit Immediately",
    primaryActionClass: "bg-[#B83A3A] text-white hover:opacity-90",
    secondaryBorder: "border-[#B83A3A] text-[#B83A3A] hover:bg-[#FEF2F2]",
    urgent: true,
  },
];

export default function DashboardPage() {
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

      <main className="flex-1 max-w-[1536px] mx-auto w-full px-8 py-10">
        <header className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-[#B83A3A] mb-2">Institutional Claim Management</p>
            <h1 className="font-serif text-5xl text-[#1E3A5F]">Active Cases</h1>
          </div>
          <div className="flex flex-wrap items-center gap-4 bg-white border border-[#E8E4DF] p-2 rounded-sm shadow-sm">
            <div className="px-4 py-2 border-r border-[#E8E4DF]">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#6B6B6B] block mb-1">Filter by Status</span>
              <select className="text-xs font-bold bg-transparent outline-none cursor-pointer">
                <option>All Active</option>
                <option>Internal Appeal</option>
                <option>External Review</option>
                <option>Closed</option>
              </select>
            </div>
            <div className="px-4 py-2 border-r border-[#E8E4DF]">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#6B6B6B] block mb-1">Insurer</span>
              <select className="text-xs font-bold bg-transparent outline-none cursor-pointer">
                <option>All Insurers</option>
                <option>Anthem BCBS</option>
                <option>UnitedHealth</option>
                <option>Aetna</option>
              </select>
            </div>
            <div className="px-4 py-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#6B6B6B] block mb-1">Urgency</span>
              <select className="text-xs font-bold bg-transparent outline-none cursor-pointer">
                <option>All Deadlines</option>
                <option>Next 48 Hours</option>
                <option>This Week</option>
              </select>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {cases.map((item) => (
            <div
              key={item.id}
              className={`case-card bg-white border border-[#E8E4DF] p-6 flex flex-col h-full ${item.urgent ? "ring-2 ring-[#B83A3A] ring-offset-2" : ""}`}
            >
              <div className="flex justify-between items-start mb-6">
                <div className="flex flex-col">
                  <span className="text-[9px] font-bold uppercase tracking-widest text-[#6B6B6B] mb-1">{item.id}</span>
                  <h2 className="font-serif text-2xl">{item.title}</h2>
                </div>
                <div className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${item.deadlineClass}`}>
                  {item.deadline}
                </div>
              </div>

              <div className="space-y-4 mb-8">
                <div className="flex justify-between items-end">
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase font-bold text-[#6B6B6B] mb-0.5">Denied Amount</span>
                    <span className="text-2xl font-bold text-[#B83A3A]">{item.amount}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-[#6B6B6B] mb-0.5">Insurer</span>
                    <span className="text-xs font-bold block">{item.insurer}</span>
                  </div>
                </div>

                <div className={`p-3 border ${item.urgent ? "bg-[#FEF2F2] border-[#FEE2E2]" : "bg-[#FDFCFB] border-[#E8E4DF]"}`}>
                  <span className={`text-[9px] font-bold uppercase tracking-widest block mb-1 ${item.urgent ? "text-[#B83A3A]" : "text-[#1E3A5F]"}`}>
                    Primary Denial Reason
                  </span>
                  <p className={`text-[11px] leading-relaxed ${item.urgent ? "text-[#7F1D1D]" : "text-[#4A4A4A]"}`}>{item.reason}</p>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-[#6B6B6B]">Evidence Completion</span>
                    <span className="text-[10px] font-bold text-[#C4A747]">{item.evidence}</span>
                  </div>
                  <div className="w-full h-1 bg-[#F3F3F3]">
                    <div className={`progress-fill h-full ${item.evidenceWidth}`} />
                  </div>
                </div>
              </div>

              <div className="mt-auto flex gap-3">
                <Link
                  href={item.primaryActionHref}
                  className={`flex-1 py-3 px-4 text-[10px] font-bold tracking-widest uppercase text-center transition-all ${item.primaryActionClass}`}
                >
                  {item.primaryActionLabel}
                </Link>
                <Link
                  href="/evidence"
                  className={`p-3 bg-white border transition-all ${item.secondaryBorder} flex items-center justify-center`}
                >
                  <Upload className="text-sm h-4 w-4" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </main>

      <footer className="mt-auto border-t border-[#E8E4DF] bg-white py-12 px-8">
        <div className="max-w-[1536px] mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <BrandLockup width={620} height={148} imageClassName="h-[78px] w-auto" />

          <div className="flex space-x-12 text-[10px] font-bold tracking-widest uppercase text-[#6B6B6B]">
            <Link href="/" className="hover:text-[#1E3A5F]">Privacy Protocol</Link>
            <Link href="/" className="hover:text-[#1E3A5F]">Audit Logs</Link>
            <Link href="/#methodology" className="hover:text-[#1E3A5F]">Methodology</Link>
            <Link href="/" className="hover:text-[#1E3A5F]">Institutional Access</Link>
          </div>

          <p className="text-[10px] font-medium text-[#A1A1A1] uppercase tracking-widest">© 2024 Advocate Strategy. All Rights Reserved.</p>
        </div>
      </footer>
    </div>
  );
}
