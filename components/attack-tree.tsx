"use client";

import { AttackTree, AttackTreeNode } from "@/lib/types";

interface AttackTreeCanvasProps {
  tree: AttackTree;
  selectedNodeId: string | null | undefined;
  riskMode: boolean;
  onNodeClick: (node: AttackTreeNode) => void;
}

const NODE_W = 196;
const NODE_H = 106;
const COL_GAP = 52;
const ROW_GAP = 92;
const PAD_X = 60;
const PAD_Y = 36;

const typeRow: Record<string, number> = {
  action: 0,
  evidence: 1,
  deadline: 1,
  document: 2,
  escalation: 3,
  outcome: 4,
};

const typeColor: Record<string, { border: string; accent: string; icon: string }> = {
  action:     { border: "border-[#1B5E3F]",               accent: "#1B5E3F", icon: "⤴" },
  document:   { border: "border-[#C4A747]",               accent: "#C4A747", icon: "📄" },
  deadline:   { border: "border-[#B83A3A]",               accent: "#B83A3A", icon: "⏰" },
  escalation: { border: "border-[#D97706]",               accent: "#D97706", icon: "📈" },
  outcome:    { border: "border-dashed border-[#1E3A5F]", accent: "#1E3A5F", icon: "🎯" },
};

function layoutNodes(tree: AttackTree) {
  const rows = new Map<number, AttackTreeNode[]>();

  tree.nodes.forEach((node) => {
    const row = typeRow[node.type] ?? 0;
    const bucket = rows.get(row) || [];
    bucket.push(node);
    rows.set(row, bucket);
  });

  const rowKeys = Array.from(rows.keys()).sort((left, right) => left - right);
  const maxColumns = Math.max(...Array.from(rows.values()).map((nodes) => nodes.length), 1);
  const width = Math.max(
    720,
    PAD_X * 2 + maxColumns * NODE_W + Math.max(0, maxColumns - 1) * COL_GAP
  );

  return rowKeys.flatMap((row) => {
    const nodes = rows.get(row) || [];
    const rowWidth = nodes.length * NODE_W + Math.max(0, nodes.length - 1) * COL_GAP;
    const startX = (width - rowWidth) / 2;

    return nodes.map((node, index) => ({
      ...node,
      _col: index,
      _colIdx: row,
      _x: startX + index * (NODE_W + COL_GAP),
      _y: PAD_Y + row * (NODE_H + ROW_GAP),
    }));
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
          const x1 = src._x + NODE_W / 2;
          const y1 = src._y + NODE_H;
          const x2 = tgt._x + NODE_W / 2;
          const y2 = tgt._y;
          const my = (y1 + y2) / 2;
          const stroke =
            edge.type === "fallback" ? "#B83A3A" :
            edge.type === "parallel" ? "#2563EB" : "#D1CDCA";
          const dash =
            edge.type === "fallback" ? "4,3" :
            edge.type === "parallel" ? "2,2" : undefined;
          return (
            <g key={edge.id ?? `${edge.source}-${edge.target}`}>
              <path
                d={`M${x1},${y1} C${x1},${my} ${x2},${my} ${x2},${y2}`}
                stroke={stroke}
                strokeWidth="1.5"
                strokeDasharray={dash}
                fill="none"
                opacity={0.7}
              />
              {edge.label && (
                <text
                  x={(x1 + x2) / 2}
                  y={my - 6}
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
              "tree-node absolute bg-white border p-3 cursor-pointer text-left",
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
