"use client";

import { Deadline, BillingError, AppealGround } from "@/lib/types";
import { useState } from "react";

interface TimelineProps {
  deadlines?: Deadline[];
  billingErrors?: BillingError[];
  appealGrounds?: AppealGround[];
  onDeadlineClick?: (deadline: Deadline) => void;
  riskLevel?: string;
}

const urgBg: Record<string, string> = {
  critical: "bg-[#FEF2F2] border-[#FEE2E2] text-[#B83A3A]",
  high:     "bg-[#FEF2F2] border-[#FEE2E2] text-[#B83A3A]",
  medium:   "bg-[#FFFBEB] border-[#FEF3C7] text-[#D97706]",
  low:      "bg-white border-[#E8E4DF] text-[#6B6B6B]",
};

export function Timeline({
  deadlines = [],
  billingErrors = [],
  appealGrounds = [],
  onDeadlineClick,
  riskLevel,
}: TimelineProps) {
  const [expanded, setExpanded] = useState({ deadlines: true, errors: false, grounds: false });
  const toggle = (k: keyof typeof expanded) => setExpanded(p => ({ ...p, [k]: !p[k] }));

  return (
    <div className="w-full bg-white border border-[#E8E4DF] p-4 max-h-96 overflow-y-auto">
      <div className={`mb-4 p-3 border ${urgBg[riskLevel ?? "low"] ?? urgBg.low}`}>
        <p className="text-[9px] font-bold uppercase tracking-widest mb-0.5">Risk Level</p>
        <p className="text-base font-bold uppercase">{riskLevel ?? "unknown"}</p>
      </div>

      <div className="mb-3 border-b border-[#E8E4DF]">
        <button onClick={() => toggle("deadlines")}
          className="w-full flex items-center justify-between py-2 text-left hover:text-[#1B5E3F] transition-colors">
          <span className="text-[10px] font-bold uppercase tracking-widest">Deadlines ({deadlines.length})</span>
          <span className="text-xs">{expanded.deadlines ? "▲" : "▼"}</span>
        </button>
        {expanded.deadlines && (
          <div className="space-y-2 pb-3">
            {deadlines.length === 0 ? (
              <p className="text-[11px] text-[#6B6B6B]">No deadlines found</p>
            ) : deadlines.map((d, i) => (
              <button key={d.id ?? i} onClick={() => onDeadlineClick?.(d)}
                className={`w-full text-left p-2 border transition-colors hover:opacity-80 ${urgBg[d.urgency] ?? urgBg.low}`}>
                <p className="text-[9px] font-bold uppercase">{d.urgency}</p>
                <p className="text-[11px] font-bold">{d.action}</p>
                <p className="text-[10px] opacity-70">{d.date}</p>
                <p className="text-[10px] opacity-60 mt-0.5">{d.daysRemaining} days remaining</p>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="mb-3 border-b border-[#E8E4DF]">
        <button onClick={() => toggle("errors")}
          className="w-full flex items-center justify-between py-2 text-left hover:text-[#1B5E3F] transition-colors">
          <span className="text-[10px] font-bold uppercase tracking-widest">Errors Found ({billingErrors.length})</span>
          <span className="text-xs">{expanded.errors ? "▲" : "▼"}</span>
        </button>
        {expanded.errors && (
          <div className="space-y-2 pb-3">
            {billingErrors.length === 0 ? (
              <p className="text-[11px] text-[#6B6B6B]">No errors detected</p>
            ) : billingErrors.map((e, i) => (
              <div key={e.id ?? i} className="p-2 bg-[#F9F8F6] border border-[#E8E4DF]">
                <p className="text-[9px] font-bold uppercase text-[#B83A3A]">{e.type.replace(/_/g," ")}</p>
                <p className="text-[11px] mt-0.5">{e.description}</p>
                <p className="text-[10px] font-bold text-[#1B5E3F] mt-1">Overcharge: {e.estimatedOvercharge}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <button onClick={() => toggle("grounds")}
          className="w-full flex items-center justify-between py-2 text-left hover:text-[#1B5E3F] transition-colors">
          <span className="text-[10px] font-bold uppercase tracking-widest">Appeal Grounds ({appealGrounds.length})</span>
          <span className="text-xs">{expanded.grounds ? "▲" : "▼"}</span>
        </button>
        {expanded.grounds && (
          <div className="space-y-2 pb-3">
            {appealGrounds.length === 0 ? (
              <p className="text-[11px] text-[#6B6B6B]">No appeal grounds identified</p>
            ) : appealGrounds.map((g, i) => (
              <div key={g.id ?? i} className="p-2 bg-[#F9F8F6] border border-[#E8E4DF]">
                <div className="flex justify-between items-start">
                  <p className="text-[11px] font-bold capitalize">{g.basis.replace(/_/g," ")}</p>
                  <span className={`text-[9px] font-bold uppercase ${g.strength === "strong" ? "text-[#1B5E3F]" : g.strength === "moderate" ? "text-[#D97706]" : "text-[#6B6B6B]"}`}>
                    {g.strength}
                  </span>
                </div>
                {g.regulation && <p className="text-[9px] font-mono text-[#6B6B6B] mt-0.5">{g.regulation}</p>}
                <p className="text-[10px] text-[#4A4A4A] mt-1">{g.argument}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
