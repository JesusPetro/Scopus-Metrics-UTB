import { useMemo } from "react";
import { forceCenter, forceCollide, forceLink, forceManyBody, forceSimulation } from "d3-force";
import type { CoauthorshipEdge, CoauthorshipNode } from "./types";

export interface PositionedNode extends CoauthorshipNode {
  x: number;
  y: number;
  r: number;
}

export interface PositionedEdge extends CoauthorshipEdge {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

const MIN_R = 15;
const MAX_R = 46;

function radiusFor(publicationCount: number, maxCount: number): number {
  if (maxCount <= 0) return MIN_R;
  return MIN_R + Math.sqrt(publicationCount / maxCount) * (MAX_R - MIN_R);
}

/**
 * Deterministic force-directed layout, simulated synchronously (no live
 * animation) so the graph renders as a static, reproducible SVG scene.
 */
export function useGraphLayout(
  nodes: CoauthorshipNode[],
  edges: CoauthorshipEdge[],
  width: number,
  height: number
): { nodes: PositionedNode[]; edges: PositionedEdge[] } {
  return useMemo(() => {
    if (nodes.length === 0) return { nodes: [], edges: [] };

    const maxCount = Math.max(...nodes.map((n) => n.publicationCount));
    type SimNode = CoauthorshipNode & { id: string; x: number; y: number; r: number };
    const simNodes: SimNode[] = nodes.map((n) => ({
      ...n,
      id: n.authorId,
      x: width / 2 + (Math.random() - 0.5) * 40,
      y: height / 2 + (Math.random() - 0.5) * 40,
      r: radiusFor(n.publicationCount, maxCount),
    }));

    const simLinks = edges.map((e) => ({ source: e.authorA, target: e.authorB, weight: e.weight }));

    const simulation = forceSimulation(simNodes)
      .force(
        "link",
        forceLink(simLinks)
          .id((d) => (d as SimNode).id)
          .distance((l) => 90 - Math.min(50, (l as unknown as { weight: number }).weight * 6))
          .strength(0.35)
      )
      .force("charge", forceManyBody().strength(-180))
      .force("center", forceCenter(width / 2, height / 2))
      .force(
        "collide",
        forceCollide((d) => (d as SimNode).r + 6)
      )
      .stop();

    for (let i = 0; i < 300; i++) simulation.tick();

    const positioned: PositionedNode[] = simNodes.map((n) => ({
      authorId: n.authorId,
      fullName: n.fullName,
      publicationCount: n.publicationCount,
      x: n.x,
      y: n.y,
      r: n.r,
    }));

    const byId = new Map(positioned.map((n) => [n.authorId, n]));
    const positionedEdges: PositionedEdge[] = edges.flatMap((e) => {
      const a = byId.get(e.authorA);
      const b = byId.get(e.authorB);
      if (!a || !b) return [];
      return [{ ...e, x1: a.x, y1: a.y, x2: b.x, y2: b.y }];
    });

    return { nodes: positioned, edges: positionedEdges };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, edges, width, height]);
}
