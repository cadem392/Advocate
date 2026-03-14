"use client";

import { AnalysisResult } from "@/lib/types";

interface LeftRailProps {
  analysis: AnalysisResult;
}

const urgColors: Record<string, string> = {
  critical: "bg-[#FEF2F2] border-[#FEE2E2] text-[#B83A3A]",
  high:     "bg-[#FEF2F2] border-[#FEE2E2] text-[#B83A3A]",
  medium:   "bg-[#FFFBEB] border-[#FEF3C7] text-[#D97706]",
  low:      "bg-white border-[#E8E4DF] text-[#6B6B6B]",
};

const strColors: Record<string, string> = {
  strong:   "text-[#1B5E3F]",
  moderate: "text-[#D97706]",
  weak:     "text-[#6B6B6B]",
};

export function LeftRail({ analysis: a }: LeftRailProps) {
  return (
    <div className="p-5 space-y-5">

      {/* ── Case Identity ── */}
      <section className="stagger">
        <p className="text-[10px] font-bold uppercase tracking-widest text-[#6B6B6B] mb-1">Case Identity</p>
        <h2 className="font-serif text-2xl mb-4">
          {a.patientContext.split(",")[0] || "Case"}
        </h2>
        <div className="space-y-2.5 text-[11px]">
          <div className="flex justify-between pb-2 border-b border-[#F3F3F3]">
            <span className="text-[#6B6B6B]">Risk Level</span>
            <span className="font-bold text-[#B83A3A] uppercase">{a.riskLevel}</span>
          </div>
          <div className="flex justify-between pb-2 border-b border-[#F3F3F3]">
            <span className="text-[#6B6B6B]">Total Billed</span>
            <span className="font-bold">{a.totalBilled}</span>
          </div>
          <div className="flex justify-between pb-2 border-b border-[#F3F3F3]">
            <span className="text-[#6B6B6B]">Overcharged</span>
            <span className="font-bold text-[#B83A3A]">{a.totalOvercharged}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#6B6B6B]">Denied</span>
            <span className="font-bold text-[#B83A3A]">{a.deniedAmount}</span>
          </div>
        </div>
        <div className="mt-4 p-3 bg-[#F9F8F6] border border-[#E8E4DF] text-[11px] leading-relaxed text-[#4A4A4A]">
          {a.summary}
        </div>
      </section>

      {/* ── Deadlines ── */}
      {a.deadlines.length > 0 && (
        <section>
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#B83A3A] mb-3">Deadlines</p>
          {a.deadlines.map((d) => (
            <div
              key={d.id ?? d.action}
              className={`mb-2 p-3 border ${urgColors[d.urgency] ?? "bg-white border-[#E8E4DF]"} ${d.urgency === "critical" ? "deadline-pulse" : ""}`}
            >
              <p className="text-[9px] font-bold uppercase">{d.urgency}</p>
              <p className="text-[11px] font-bold">{d.action}</p>
              <p className="text-[10px] opacity-70 mt-0.5">{d.date}</p>
            </div>
          ))}
        </section>
      )}

      {/* ── Billing Errors ── */}
      {a.billingErrors.length > 0 && (
        <section>
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#1E3A5F] mb-3">Billing Errors Found</p>
          {a.billingErrors.map((e) => (
            <div key={e.id ?? e.cptCode} className="mb-2.5 p-3 bg-[#F9F8F6] border border-[#E8E4DF]">
              <p className="text-[9px] font-bold uppercase text-[#B83A3A] mb-0.5">
                {e.type.replace("_", " ")}
              </p>
              <p className="text-[11px] font-bold">{e.cptCode || ""}</p>
              <p className="text-[10px] text-[#6B6B6B] leading-relaxed mt-0.5">
                {e.description.slice(0, 80)}…
              </p>
              <p className="text-[10px] font-bold text-[#1B5E3F] mt-1">
                Overcharge: {e.estimatedOvercharge}
              </p>
            </div>
          ))}
        </section>
      )}

      {/* ── Appeal Grounds ── */}
      {a.appealGrounds.length > 0 && (
        <section>
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#1E3A5F] mb-3">Appeal Grounds</p>
          {a.appealGrounds.map((g) => (
            <div key={g.id ?? g.basis} className="mb-2.5 p-3 bg-[#F9F8F6] border border-[#E8E4DF]">
              <div className="flex justify-between items-start mb-1">
                <p className="text-[11px] font-bold">{g.basis.replace("_", " ")}</p>
                <span className={`text-[9px] font-bold uppercase ${strColors[g.strength] ?? ""}`}>
                  {g.strength}
                </span>
              </div>
              {g.regulation && (
                <p className="text-[9px] text-[#6B6B6B] font-mono mb-1">{g.regulation}</p>
              )}
              <p className="text-[10px] text-[#4A4A4A] leading-relaxed">
                {g.argument.slice(0, 100)}…
              </p>
            </div>
          ))}
        </section>
      )}

    </div>
  );
}
