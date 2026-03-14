"use client";

export function RiskCascade() {
  return (
    <div className="text-sm text-slate-400 p-3 bg-slate-800/50 rounded-lg border border-slate-700">
      <p className="mb-2">
        <strong>Risk Cascade Mode:</strong> Click a deadline node to see what happens if you miss it.
      </p>
      <p>
        Missing internal appeal deadlines eliminates your right to external review,
        forcing you to restart with state complaints. Each missed deadline doubles your exposure.
      </p>
    </div>
  );
}
