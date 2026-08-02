import { useLayoutEffect, useMemo, useRef, useState } from "react";
import gsap from "gsap";

// Same two-stop gradient pairs as HorizontalBarChart's series, so the ring
// and the sibling "Top Revistas" bars read as one color system instead of
// two charts that happen to share a card row.
const SERIES = [
  { from: "var(--color-utb-blue-soft)", to: "var(--color-utb-blue)" },
  { from: "#9fe8ee", to: "var(--color-utb-cyan)" },
  { from: "#4d9089", to: "var(--color-utb-green-deep)" },
  { from: "#a8f188", to: "var(--color-utb-green)" },
  { from: "#ffd876", to: "var(--color-utb-amber)" },
  { from: "#b3ade8", to: "var(--color-utb-purple)" },
];

// Top N individual slices + one "Otros" — a dozen-plus categories with a long
// near-zero tail crowded onto the ring reads as clutter, not fidelity.
const MAX_SLICES = 5;
const OTHERS_COLOR = "#b4b8c2";

const SIZE = 208;
const CENTER = SIZE / 2;
const OUTER_R = 92;
const INNER_R = 58; // wide hole carries the center total instead of a floating pill
const GAP_RAD = 0.045;

function point(angle: number, r: number): [number, number] {
  return [CENTER + r * Math.cos(angle), CENTER + r * Math.sin(angle)];
}

/** A real annular-sector path (outer arc + straight side + inner arc + straight side), corners rounded via a same-color round-linejoin stroke rather than hand-derived fillet arcs. */
function wedgePath(start: number, end: number): string {
  const [ox0, oy0] = point(start, OUTER_R);
  const [ox1, oy1] = point(end, OUTER_R);
  const [ix1, iy1] = point(end, INNER_R);
  const [ix0, iy0] = point(start, INNER_R);
  const largeArc = end - start > Math.PI ? 1 : 0;
  return `M ${ox0} ${oy0} A ${OUTER_R} ${OUTER_R} 0 ${largeArc} 1 ${ox1} ${oy1} L ${ix1} ${iy1} A ${INNER_R} ${INNER_R} 0 ${largeArc} 0 ${ix0} ${iy0} Z`;
}

/**
 * Rounded-wedge donut: real annular-sector wedges (outer arc, radial side,
 * inner arc, radial side) with every corner rounded and a two-stop gradient
 * per wedge, sharing its gradient pairs with HorizontalBarChart so the two
 * cards in this row read as one system. Per-wedge/on-ring percentage labels
 * were dropped in favor of a single running total in the hole and a legend
 * where every row carries its own share as a small bar — competing labels
 * scattered around the ring is what made this chart feel busy.
 */
export function DonutChart({
  data,
  onSelect,
  activeLabel,
}: {
  data: { label: string; value: number }[];
  /** Fires with the wedge's own label (not an index into `data` — this component sorts and groups internally, so an index would point at the wrong category). "Otros" wedges never fire, since they don't correspond to one filterable category. */
  onSelect?: (label: string | null) => void;
  activeLabel?: string | null;
}) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [hovered, setHovered] = useState<number | null>(null);

  const grouped = useMemo(() => {
    const sorted = [...data].sort((a, b) => b.value - a.value);
    if (sorted.length <= MAX_SLICES) return sorted;
    const head = sorted.slice(0, MAX_SLICES - 1);
    const rest = sorted.slice(MAX_SLICES - 1);
    const othersValue = rest.reduce((s, d) => s + d.value, 0);
    return othersValue > 0 ? [...head, { label: `Otros (${rest.length})`, value: othersValue }] : head;
  }, [data]);

  const sum = grouped.reduce((s, d) => s + d.value, 0) || 1;

  const segments = useMemo(() => {
    let cursor = -Math.PI / 2;
    return grouped.map((d, i) => {
      const isOthers = d.label.startsWith("Otros");
      const share = d.value / sum;
      const span = share * Math.PI * 2;
      const gap = span > GAP_RAD * 2.5 ? GAP_RAD : 0;
      const start = cursor + gap;
      const end = cursor + span - gap;
      cursor += span;
      return {
        ...d,
        share,
        start,
        end,
        gradient: isOthers ? { from: OTHERS_COLOR, to: OTHERS_COLOR } : SERIES[i % SERIES.length],
        dot: isOthers ? OTHERS_COLOR : SERIES[i % SERIES.length].to,
        index: i,
      };
    });
  }, [grouped, sum]);

  useLayoutEffect(() => {
    const wedges = svgRef.current?.querySelectorAll("[data-wedge]");
    if (!wedges || wedges.length === 0) return;
    gsap.fromTo(
      wedges,
      { scale: 0, transformOrigin: `${CENTER}px ${CENTER}px` },
      { scale: 1, duration: 0.5, stagger: 0.06, ease: "back.out(1.5)" }
    );
  }, [segments]);

  const total = Math.round(sum);
  const hoveredSeg = hovered != null ? segments.find((s) => s.index === hovered) : undefined;
  const hoveredPos = hoveredSeg ? point((hoveredSeg.start + hoveredSeg.end) / 2, OUTER_R + 16) : null;

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 sm:flex-row sm:gap-8">
      <div className="relative shrink-0" style={{ width: SIZE, height: SIZE }}>
        <svg ref={svgRef} viewBox={`0 0 ${SIZE} ${SIZE}`} width={SIZE} height={SIZE} className="overflow-visible">
          <defs>
            {segments.map((seg) => (
              <linearGradient key={seg.label} id={`donut-${seg.index}`} x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor={seg.gradient.from} />
                <stop offset="100%" stopColor={seg.gradient.to} />
              </linearGradient>
            ))}
          </defs>

          {segments.map((seg) => {
            if (seg.end <= seg.start) return null;
            const isOthers = seg.label.startsWith("Otros");
            const isActive = activeLabel === seg.label;
            const isHovered = hovered === seg.index;
            return (
              <path
                key={seg.label}
                data-wedge
                d={wedgePath(seg.start, seg.end)}
                fill={`url(#donut-${seg.index})`}
                className={isOthers ? undefined : "cursor-pointer"}
                style={{ transition: "opacity 200ms" }}
                opacity={(activeLabel == null || isActive ? 1 : 0.3) * (isHovered ? 0.85 : 1)}
                onPointerEnter={() => setHovered(seg.index)}
                onPointerLeave={() => setHovered(null)}
                onClick={isOthers ? undefined : () => onSelect?.(isActive ? null : seg.label)}
              />
            );
          })}
        </svg>

        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl leading-none font-bold tracking-tight text-ink">{total.toLocaleString("es-CO")}</span>
          <span className="mt-1.5 text-[11px] font-semibold tracking-wide text-muted uppercase">Documentos</span>
        </div>

        {hoveredSeg && hoveredPos && (
          <div
            className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded-lg px-2.5 py-1.5 text-[12.5px] font-semibold whitespace-nowrap text-white"
            style={{ left: hoveredPos[0], top: hoveredPos[1], backgroundColor: "var(--color-navy-deep)" }}
          >
            {hoveredSeg.label} · {Math.round(hoveredSeg.value).toLocaleString("es-CO")}
          </div>
        )}
      </div>

      <ul className="flex w-full min-w-0 flex-1 flex-col gap-1">
        {segments.map((seg) => {
          const pct = Math.round(seg.share * 100);
          const isOthers = seg.label.startsWith("Otros");
          const isActive = activeLabel === seg.label;
          return (
            <li key={seg.label}>
              <button
                onPointerEnter={() => setHovered(seg.index)}
                onPointerLeave={() => setHovered(null)}
                onClick={isOthers ? undefined : () => onSelect?.(isActive ? null : seg.label)}
                disabled={isOthers}
                className={`flex w-full flex-col gap-1.5 rounded-sm px-2 py-2 text-left transition-colors ${
                  isOthers ? "cursor-default" : "hover:bg-canvas"
                } ${isActive ? "bg-canvas" : ""}`}
              >
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: seg.dot }} />
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink">{seg.label}</span>
                  <span className="shrink-0 text-sm font-semibold text-ink">{pct}%</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-line">
                  <div
                    className="h-full rounded-full transition-[width] duration-500"
                    style={{ width: `${Math.max(pct, 2)}%`, background: isOthers ? seg.dot : `linear-gradient(90deg, ${seg.gradient.from}, ${seg.gradient.to})` }}
                  />
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
