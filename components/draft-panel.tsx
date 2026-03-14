"use client";

import { useState } from "react";
import { AttackTreeNode } from "@/lib/types";

interface DraftPanelProps {
  node: AttackTreeNode | null;
  draftContent: string | null;
  isLoading: boolean;
  onRegenerate: () => void;
  onSubmit?: () => void;
}

export function DraftPanel({
  node,
  draftContent,
  isLoading,
  onRegenerate,
  onSubmit,
}: DraftPanelProps) {
  const [copied, setCopied] = useState(false);

  function copyDraft() {
    if (!draftContent) return;
    navigator.clipboard.writeText(draftContent).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const title = node ? node.label : "Select a node";

  return (
    <div className="flex flex-col h-full">

      {/* ── Header ── */}
      <div className="p-4 border-b border-[#E8E4DF] bg-[#F9F8F6] flex items-center justify-between">
        <div>
          <span className="text-[9px] font-bold uppercase tracking-widest text-[#C4A747]">
            Drafting Environment
          </span>
          <h3 className="font-serif text-lg">{title}</h3>
        </div>
        <div className="flex gap-1.5">
          <button
            onClick={copyDraft}
            title="Copy"
            className="w-8 h-8 border border-[#E8E4DF] bg-white flex items-center justify-center hover:bg-gray-50 text-sm transition-colors"
          >
            {copied ? "✅" : "📋"}
          </button>
          <button
            onClick={onRegenerate}
            title="Regenerate"
            className="w-8 h-8 border border-[#E8E4DF] bg-white flex items-center justify-center hover:bg-gray-50 text-sm transition-colors"
          >
            ↻
          </button>
        </div>
      </div>

      {/* ── Content area ── */}
      <div className="flex-1 overflow-y-auto p-5 bg-[#F3F3F3]/30">
        {!node ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center h-full text-center gap-3">
            <div className="w-12 h-12 border-2 border-dashed border-[#E8E4DF] flex items-center justify-center text-xl opacity-40 animate-float">
              📄
            </div>
            <p className="text-[11px] text-[#6B6B6B] leading-relaxed">
              Click any{" "}
              <span className="font-bold text-[#C4A747]">gold document node</span>{" "}
              in the attack tree to generate the draft.
            </p>
          </div>
        ) : isLoading ? (
          /* Loading spinner */
          <div className="flex flex-col items-center justify-center h-48 gap-3">
            <div
              className="w-5 h-5 border-2 border-[#1E3A5F] border-t-transparent rounded-full"
              style={{ animation: "spin 1s linear infinite" }}
            />
            <p className="text-xs text-[#6B6B6B]">
              Generating {node.documentType?.replace("_", " ") ?? "document"}…
            </p>
          </div>
        ) : draftContent ? (
          /* Letter preview */
          <div className="bg-white letter-shadow p-8 border border-[#E8E4DF] text-[#2C2C2C]">
            <pre className="text-[11px] leading-relaxed whitespace-pre-wrap font-sans">
              {draftContent}
            </pre>
          </div>
        ) : node.type === "document" || node.documentType ? null : (
          /* Action / deadline / escalation description */
          <div>
            <div className="mb-4 p-3 border-l-2 border-[#1B5E3F] bg-[#F9F8F6]">
              <p className="text-[9px] font-bold uppercase tracking-widest text-[#1B5E3F] mb-1">
                Node Description
              </p>
              <p className="text-[11px] leading-relaxed text-[#2C2C2C]">{node.description}</p>
            </div>
            <div className="p-3 border border-[#E8E4DF] bg-white">
              <p className="text-[9px] font-bold uppercase tracking-widest text-[#6B6B6B] mb-1">
                Status
              </p>
              <p className="text-xs font-bold capitalize">
                {node.status} — {node.urgency?.replace("_", " ")}
              </p>
            </div>
            {node.type === "deadline" && (
              <div className="mt-3 p-3 bg-[#FEF2F2] border border-[#FEE2E2]">
                <p className="text-[9px] font-bold uppercase tracking-widest text-[#B83A3A] mb-1">
                  Risk if missed
                </p>
                <p className="text-[11px] text-[#7F1D1D] leading-relaxed">
                  Missing this deadline may permanently close your escalation options. Act immediately.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Actions footer ── */}
      <div className="p-4 border-t border-[#E8E4DF] bg-white space-y-2.5">
        <div className="flex items-center gap-2 text-[10px] font-bold text-[#1B5E3F] uppercase tracking-widest">
          <span>✨</span>
          <span>Recommended Actions</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={onSubmit}
            className="bg-[#1E3A5F] text-white py-2.5 text-[10px] font-bold tracking-widest uppercase hover:bg-[#1B5E3F] transition-colors btn-ripple"
          >
            Sign &amp; Fax
          </button>
          <button className="bg-white border border-[#1E3A5F] text-[#1E3A5F] py-2.5 text-[10px] font-bold tracking-widest uppercase hover:bg-gray-50 transition-colors">
            Send USPS
          </button>
        </div>
        {node?.type === "deadline" && (
          <p className="text-[10px] text-[#B83A3A] leading-relaxed font-bold">
            ⚠ This deadline is time-sensitive.
          </p>
        )}
      </div>

    </div>
  );
}
