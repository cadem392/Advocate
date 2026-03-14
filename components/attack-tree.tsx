"use client";

import { AttackTree, AttackTreeNode } from "@/lib/types";

interface AttackTreeCanvasProps {
  tree: AttackTree;
  selectedNodeId: string | null | undefined;
  riskMode: boolean;
  onNodeClick: (node: AttackTreeNode) => void;
}

const NODE_W = 168;
const NODE_H = 90;
const COL_W  = 230;
const ROW_H  = 130;
const PAD_X  = 60;
const PAD_Y  = 60;

const typeCol: Record<string, number> = {
  action:     0,
  document:   1,
  deadline:   1,
  escalation: 2,
  outcome:    3,
};

const typeColor: Record<string, { border: string; accent: string; icon: string }> = {
  action:     { border: "border-[#1B5E3F]",               accent: "#1B5E3F", icon: "⤴" },
  document:   { border: "border-[#C4A747]",               accent: "#C4A747", icon: "📄" },
  deadline:   { border: "border-[#B83A3A]",               accent: "#B83A3A", icon: "⏰" },
  escalation: { border: "border-[#D97706]",               accent: "#D97706", icon: "📈" },
  outcome:    { border: "border-dashed border-[#1E3A5F]", accent: "#1E3A5F", icon: "🎯" },
};

function layoutNodes(tree: AttackTree) {
  const colCounts: Record<number, number> = {};
  return tree.nodes.map((n) => {
    const col = typeCol[n.type] ?? 0;
    if (colCounts[col] === undefined) colCounts[col] = 0;
    const colIdx = colCounts[col]++;
    return {
      ...n,
      _col:    col,
      _colIdx: colIdx,
      _x:      PAD_X + col * COL_W,
      _y:      PAD_Y + colIdx * ROW_H,
    };
  });
}

export function AttackTreeCanvas({
  tree,
  selectedNodeId,
  onNodeClick,
}: AttackTreeCanvasProps) {
  const laidNodes = layoutNodes(tree);

  const maxX = Math.max(...laidNodes.map((n) => n._x)) + NODE_W + PAD_X;
  const maxY = Math.max(...laidNodes.map((n) => n._y)) + NODE_H + PAD_Y;

  const nodeMap: Record<string, (typeof laidNodes)[0]> = {};
  laidNodes.forEach((n) => { if (n.id) nodeMap[n.id] = n; });

  return (
    <div
      className="relative"
      style={{ width: maxX, height: maxY, minWidth: 800, minHeight: 600 }}
    >
      {/* SVG edges */}
      <svg
        className="absolute inset-0 pointer-events-none"
        width={maxX}
        height={maxY}
        viewBox={`0 0 ${maxX} ${maxY}`}
      >
        {tree.edges.map((edge) => {
          const src = nodeMap[edge.source];
          const tgt = nodeMap[edge.target];
          if (!src || !tgt) return null;
          const x1 = src._x + NODE_W;
          const y1 = src._y + NODE_H / 2;
          const x2 = tgt._x;
          const y2 = tgt._y + NODE_H / 2;
          const mx = (x1 + x2) / 2;
          const stroke =
            edge.type === "fallback" ? "#B83A3A" :
            edge.type === "parallel" ? "#2563EB" : "#D1CDCA";
          const dash =
            edge.type === "fallback" ? "4,3" :
            edge.type === "parallel" ? "2,2" : undefined;
          return (
            <g key={edge.id ?? `${edge.source}-${edge.target}`}>
              <path
                d={`M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`}
                stroke={stroke}
                strokeWidth="1.5"
                strokeDasharray={dash}
                fill="none"
                opacity={0.7}
              />
              {edge.label && (
                <text
                  x={mx}
                  y={(y1 + y2) / 2 - 4}
                  textAnchor="middle"
                  fontSize={8}
                  fill="#9B9B9B"
                  fontFamily="Inter, sans-serif"
                  fontWeight="600"
                >
                  {edge.label}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {/* Nodes */}
      {laidNodes.map((node, idx) => {
        const tc = typeColor[node.type] ?? typeColor.action;
        const isSelected = node.id === selectedNodeId;
        const isBlocked  = node.status === "blocked";
        return (
          <div
            key={node.id ?? idx}
            id={`node-${node.id}`}
            className={[
              "tree-node absolute bg-white border p-3 cursor-pointer",
              tc.border,
              node.type === "deadline" ? "deadline-pulse" : "",
              isBlocked ? "opacity-60" : "",
              isSelected ? "selected" : "",
            ].filter(Boolean).join(" ")}
            style={{
              width: NODE_W,
              left:  node._x,
              top:   node._y,
              animationDelay: `${idx * 0.07}s`,
            }}
            onClick={() => onNodeClick(node)}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-sm leading-none">{tc.icon}</span>
              <span
                className="text-[8px] font-bold uppercase tracking-widest"
                style={{ color: tc.accent }}
              >
                {node.type}
              </span>
            </div>
            <p className="text-[10px] font-bold leading-snug mb-1 line-clamp-2">{node.label}</p>
            <p className="text-[9px] text-[#6B6B6B] leading-snug line-clamp-2">
              {node.description.slice(0, 60)}…
            </p>
            <div className="flex items-center justify-between mt-1.5">
              <span
                className="text-[8px] uppercase tracking-widest"
                style={{ color: tc.accent }}
              >
                {node.urgency?.replace("_", " ")}
              </span>
              <span className="text-[8px] uppercase text-[#9B9B9B]">{node.status}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
