import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { revealBars, revealTrendLines } from "../../lib/motion";
import { seriesColor } from "../../lib/seriesColors";

export interface ComparativeSeries {
  id: string;
  label: string;
  data: { year: number; count: number }[];
  /** Stable color slot - the institution's index in the full institutions list, not selection order, so its color never shifts when another one is toggled. */
  colorIndex: number;
}

/**
 * Grouped-bar comparative variant of BarChart: one bar per institution per
 * year (shared y-scale so heights are honestly comparable), plus a trend
 * line with point markers overlaid per institution — the reference doesn't
 * have a multi-series precedent, so this keeps the same construction
 * primitives (rounded gradient bars, dashed baseline, Navy Deep tooltip
 * pill, thinned ticks) rather than inventing a new visual language.
 * No click/drill-down for v1 — comparativa doesn't feed into a
 * per-institution Publicaciones filter yet.
 */
// Wider reference frame than BarChart's 640 (which assumes a ~half-width
// column, per Overview): this chart's card spans the full page width, so a
// 640-wide viewBox stretched over ~1300px+ would scale every bar/label up by
// ~2x - keeping W close to the actual full-width render size keeps bars and
// text at their intended on-screen size instead of blowing up.
const CHART_W = 1180;

export function ComparativeGrowthChart({ series, height = 300 }: { series: ComparativeSeries[]; height?: number }) {
  const W = CHART_W;
  const padTop = 40;
  const padBottom = 30;
  const padX = 26;
  const barArea = height - padTop - padBottom;

  const years = useMemo(() => {
    const set = new Set<number>();
    series.forEach((s) => s.data.forEach((d) => set.add(d.year)));
    return Array.from(set).sort((a, b) => a - b);
  }, [series]);

  const valueByYear = useMemo(() => {
    return series.map((s) => {
      const m = new Map(s.data.map((d) => [d.year, d.count]));
      return years.map((y) => m.get(y) ?? 0);
    });
  }, [series, years]);

  const max = Math.max(1, ...valueByYear.flat());
  const n = years.length;
  const slot = n > 0 ? W / n : W;
  const barGap = 3;
  // Capped like BarChart's single-series bars (max 64px) - otherwise a
  // handful of years (wide slots) or a single selected institution (no
  // sibling bars to share the slot with) blows the bar up to fill nearly
  // the whole slot instead of reading as one bar among several.
  const barWidth = Math.max(3, Math.min(56, (slot * 0.72 - barGap * (series.length - 1)) / Math.max(1, series.length)));
  // The *real* group width once bars are capped, not the theoretical 72% of
  // the slot - centering against the uncapped width would push a capped,
  // narrower group off-center.
  const groupWidth = barWidth * series.length + barGap * (series.length - 1);

  const tickCount = Math.min(n, 8);
  const tickIndices = new Set(
    Array.from({ length: tickCount }, (_, k) => Math.round((k * (n - 1)) / Math.max(1, tickCount - 1)))
  );

  const [hovered, setHovered] = useState<{ seriesIdx: number; yearIdx: number } | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  useLayoutEffect(() => {
    revealBars(svgRef.current);
    revealTrendLines(svgRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [series]);

  if (n === 0 || series.length === 0) {
    return (
      <div className="flex h-[220px] items-center justify-center text-sm text-muted">
        Elegí al menos una institución para comparar.
      </div>
    );
  }

  function barX(yearIdx: number, seriesIdx: number) {
    const groupX = yearIdx * slot + (slot - groupWidth) / 2;
    return groupX + seriesIdx * (barWidth + barGap);
  }

  const hoveredValue = hovered ? valueByYear[hovered.seriesIdx][hovered.yearIdx] : 0;
  const hoveredX = hovered ? barX(hovered.yearIdx, hovered.seriesIdx) + barWidth / 2 : 0;
  const hoveredTopY = hovered ? height - padBottom - Math.max(4, (hoveredValue / max) * barArea) : 0;

  return (
    <svg ref={svgRef} viewBox={`0 0 ${W} ${height}`} className="block w-full overflow-visible" role="img" aria-label="Comparativa de crecimiento por institución">
      <defs>
        {series.map((s) => {
          const color = seriesColor(s.colorIndex);
          return (
            <linearGradient key={s.id} id={`cmp-bar-${s.colorIndex}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color.from} />
              <stop offset="100%" stopColor={color.to} />
            </linearGradient>
          );
        })}
      </defs>

      <line x1="0" y1={height - padBottom} x2={W} y2={height - padBottom} stroke="var(--color-line)" strokeWidth="1.2" strokeDasharray="4 5" />

      {years.map((year, yearIdx) => {
        const showTick = tickIndices.has(yearIdx);
        return (
          <g key={year}>
            {series.map((s, seriesIdx) => {
              const value = valueByYear[seriesIdx][yearIdx];
              const barHeight = Math.max(2, (value / max) * barArea);
              const x = barX(yearIdx, seriesIdx);
              const y = height - padBottom - barHeight;
              const isHovered = hovered?.seriesIdx === seriesIdx && hovered?.yearIdx === yearIdx;
              return (
                <g
                  key={s.id}
                  onMouseEnter={() => setHovered({ seriesIdx, yearIdx })}
                  onMouseLeave={() => setHovered(null)}
                >
                  <rect x={x} y={height - padBottom} width={barWidth} height={padTop + 4} fill="transparent" />
                  <rect
                    data-bar
                    x={x}
                    y={y}
                    width={barWidth}
                    height={barHeight}
                    rx={Math.min(6, barWidth / 2)}
                    fill={`url(#cmp-bar-${s.colorIndex})`}
                    opacity={isHovered ? 1 : 0.92}
                    stroke={isHovered ? seriesColor(s.colorIndex).to : "none"}
                    strokeWidth={isHovered ? 1.5 : 0}
                  />
                </g>
              );
            })}
            {showTick && (
              <text
                x={Math.min(W - padX, Math.max(padX, yearIdx * slot + slot / 2))}
                y={height - 10}
                textAnchor="middle"
                className="text-[13.5px] font-medium"
                fill="var(--color-muted)"
              >
                {year}
              </text>
            )}
          </g>
        );
      })}

      {series.map((s, seriesIdx) => {
        const color = seriesColor(s.colorIndex).to;
        const points = years.map((_, yearIdx) => {
          const value = valueByYear[seriesIdx][yearIdx];
          const x = barX(yearIdx, seriesIdx) + barWidth / 2;
          const y = height - padBottom - Math.max(4, (value / max) * barArea);
          return { x, y };
        });
        const d = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
        return (
          <g key={s.id}>
            <path data-trend-line d={d} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
            {points.map((p, yearIdx) => (
              <circle key={yearIdx} data-trend-point cx={p.x} cy={p.y} r={3.5} fill={color} stroke="#ffffff" strokeWidth={1.5} />
            ))}
          </g>
        );
      })}

      {hovered && (
        <Tooltip
          x={Math.min(W - padX, Math.max(padX, hoveredX))}
          y={hoveredTopY}
          text={`${series[hovered.seriesIdx].label} · ${years[hovered.yearIdx]} · ${hoveredValue}`}
        />
      )}
    </svg>
  );
}

export function ComparativeLegend({ series }: { series: ComparativeSeries[] }) {
  return (
    <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
      {series.map((s) => (
        <div key={s.id} className="flex items-center gap-2 text-sm text-ink">
          <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: seriesColor(s.colorIndex).to }} />
          {s.label}
        </div>
      ))}
    </div>
  );
}

function Tooltip({ x, y, text }: { x: number; y: number; text: string }) {
  const width = text.length * 6.6 + 20;
  const height = 24;
  const tx = Math.min(CHART_W - 10, Math.max(10 + width / 2, x)) - width / 2;
  const ty = Math.max(0, y - height - 10);
  return (
    <g className="pointer-events-none">
      <rect x={tx} y={ty} width={width} height={height} rx={8} fill="var(--color-navy-deep)" />
      <text x={tx + width / 2} y={ty + height / 2 + 4.5} textAnchor="middle" className="text-[12.5px] font-semibold" fill="#ffffff">
        {text}
      </text>
    </g>
  );
}
