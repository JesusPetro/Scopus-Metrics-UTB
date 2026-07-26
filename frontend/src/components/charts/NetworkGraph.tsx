import { useState } from "react";
import type { PositionedEdge, PositionedNode } from "../../lib/useGraphLayout";
import type { PanZoomTransform } from "../../lib/usePanZoom";
import { IconMaximize, IconZoomIn, IconZoomOut } from "../icons";

/**
 * Circular nodes on a force-directed, pannable/zoomable layout — the one
 * deliberate shape exception to the system's rounded-rect grammar (per
 * DESIGN.md Shapes), styled after inspiracion/mejor nodos.png's "Inter-
 * Faculty Topology" board (dotted canvas, toolbar, glowing core node) but
 * built in the product's own palette. Selected node in Institutional Blue;
 * its edges in Purple, per the Quarantine Rule's one carve-out.
 */
export function NetworkGraph({
  nodes,
  edges,
  width,
  height,
  selectedId,
  onSelect,
  transform,
  panZoomHandlers,
  onZoomIn,
  onZoomOut,
  onFit,
}: {
  nodes: PositionedNode[];
  edges: PositionedEdge[];
  width: number;
  height: number;
  selectedId: string | null;
  onSelect: (id: string) => void;
  transform: PanZoomTransform;
  panZoomHandlers: {
    onPointerDown: (e: React.PointerEvent) => void;
    onPointerMove: (e: React.PointerEvent) => void;
    onPointerUp: (e: React.PointerEvent) => boolean;
    onWheel: (e: React.WheelEvent<SVGSVGElement>) => void;
  };
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFit: () => void;
}) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const connectedIds = new Set<string>();
  if (selectedId) {
    for (const e of edges) {
      if (e.authorA === selectedId) connectedIds.add(e.authorB);
      if (e.authorB === selectedId) connectedIds.add(e.authorA);
    }
  }

  return (
    <div className="relative h-full w-full overflow-hidden bg-canvas/40">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width={width}
        height={height}
        className="block cursor-grab touch-none active:cursor-grabbing"
        role="img"
        aria-label="Grafo de coautoría"
        onPointerDown={panZoomHandlers.onPointerDown}
        onPointerMove={panZoomHandlers.onPointerMove}
        onPointerUp={panZoomHandlers.onPointerUp}
        onWheel={panZoomHandlers.onWheel}
      >
        <defs>
          <pattern id="dotgrid" width="22" height="22" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1.2" fill="var(--color-line)" />
          </pattern>
          <radialGradient id="node-core" cx="35%" cy="30%" r="75%">
            <stop offset="0%" stopColor="var(--color-utb-blue-soft)" />
            <stop offset="100%" stopColor="var(--color-utb-blue)" />
          </radialGradient>
          <radialGradient id="node-connected" cx="35%" cy="30%" r="75%">
            <stop offset="0%" stopColor="#e3d9fb" />
            <stop offset="100%" stopColor="var(--color-utb-purple)" />
          </radialGradient>
          <radialGradient id="node-default" cx="35%" cy="30%" r="75%">
            <stop offset="0%" stopColor="#eef2fd" />
            <stop offset="100%" stopColor="#dbe4fb" />
          </radialGradient>
        </defs>

        <rect width={width} height={height} fill="url(#dotgrid)" />

        <g transform={`translate(${transform.x} ${transform.y}) scale(${transform.k})`}>
          {edges.map((e, i) => {
            const isHighlighted = selectedId && (e.authorA === selectedId || e.authorB === selectedId);
            return (
              <line
                key={i}
                x1={e.x1}
                y1={e.y1}
                x2={e.x2}
                y2={e.y2}
                stroke={isHighlighted ? "var(--color-utb-purple)" : "var(--color-line)"}
                strokeWidth={(isHighlighted ? 1.6 : 1) / transform.k}
                strokeOpacity={isHighlighted ? 0.9 : 0.7}
              />
            );
          })}

          {nodes.map((n) => {
            const isSelected = n.authorId === selectedId;
            const isConnected = connectedIds.has(n.authorId);
            const isHovered = hoveredId === n.authorId;
            const dim = selectedId && !isSelected && !isConnected;
            return (
              <g
                key={n.authorId}
                transform={`translate(${n.x}, ${n.y})`}
                onPointerEnter={() => setHoveredId(n.authorId)}
                onPointerLeave={() => setHoveredId(null)}
                onClick={() => onSelect(n.authorId)}
                className="cursor-pointer"
                opacity={dim ? 0.3 : 1}
              >
                {isSelected && (
                  <circle r={n.r + 6} fill="none" stroke="var(--color-utb-blue)" strokeWidth={1.5 / transform.k} strokeDasharray={`${3 / transform.k} ${4 / transform.k}`} />
                )}
                <circle
                  r={isHovered ? n.r * 1.08 : n.r}
                  fill={isSelected ? "url(#node-core)" : isConnected ? "url(#node-connected)" : "url(#node-default)"}
                  stroke="#ffffff"
                  strokeWidth={(isSelected || isConnected ? 2 : 1) / transform.k}
                  className="transition-[r] duration-150"
                />
                {n.r >= 22 && (
                  <text
                    textAnchor="middle"
                    dy="0.35em"
                    className="pointer-events-none text-[11px] font-semibold"
                    fill={isSelected || isConnected ? "#ffffff" : "var(--color-ink)"}
                  >
                    {initials(n.fullName)}
                  </text>
                )}
              </g>
            );
          })}
        </g>
      </svg>

      <div className="absolute top-3 right-3 flex items-center gap-1 rounded-full bg-surface p-1 shadow-card">
        <button
          onClick={onZoomIn}
          aria-label="Acercar"
          className="flex h-8 w-8 items-center justify-center rounded-full text-muted transition-colors hover:bg-canvas hover:text-ink"
        >
          <IconZoomIn className="h-4 w-4" />
        </button>
        <button
          onClick={onZoomOut}
          aria-label="Alejar"
          className="flex h-8 w-8 items-center justify-center rounded-full text-muted transition-colors hover:bg-canvas hover:text-ink"
        >
          <IconZoomOut className="h-4 w-4" />
        </button>
        <button
          onClick={onFit}
          aria-label="Ajustar a la vista"
          className="flex h-8 w-8 items-center justify-center rounded-full text-muted transition-colors hover:bg-canvas hover:text-ink"
        >
          <IconMaximize className="h-4 w-4" />
        </button>
        <span className="px-2 text-xs font-semibold text-muted tabular-nums">{Math.round(transform.k * 100)}%</span>
      </div>
    </div>
  );
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
