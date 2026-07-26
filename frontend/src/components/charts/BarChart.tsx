import { useLayoutEffect, useRef, useState } from "react";
import { revealBars } from "../../lib/motion";

/**
 * Bespoke SVG bar chart in the graficas.html grammar: rounded-top bars, a
 * two-stop gradient (dark→light) on the emphasized bar, dashed baseline,
 * plain value labels above each bar, tick labels below. No charting library —
 * per DESIGN.md every chart in this product is hand-built SVG.
 */
export function BarChart({
  data,
  formatValue = (v) => String(v),
  height = 260,
  emphasizeIndex,
  onBarClick,
}: {
  data: { label: string; value: number }[];
  formatValue?: (value: number) => string;
  height?: number;
  /** Defaults to the last bar; pass a lower index when the last bar is a partial/in-progress period. */
  emphasizeIndex?: number;
  onBarClick?: (index: number, datum: { label: string; value: number }) => void;
}) {
  const W = 640;
  const padTop = 40;
  const padBottom = 30;
  const padX = 26;
  const barArea = height - padTop - padBottom;
  const max = Math.max(1, ...data.map((d) => d.value));
  const n = data.length;
  const slot = W / n;
  const barWidth = Math.min(64, slot * 0.6);
  const gid = "bar-hot";
  const gidSoft = "bar-soft";
  const emphasized = emphasizeIndex ?? n - 1;
  // Dense series (e.g. 20+ years) would collide if every tick rendered; thin
  // them to ~8 evenly spaced ticks (by construction this always lands on
  // both index 0 and n-1, with no two ticks closer than the others).
  const tickCount = Math.min(n, 8);
  const tickIndices = new Set(
    Array.from({ length: tickCount }, (_, k) => Math.round((k * (n - 1)) / Math.max(1, tickCount - 1)))
  );

  const [hovered, setHovered] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  useLayoutEffect(() => {
    revealBars(svgRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  const hoveredDatum = hovered != null ? data[hovered] : null;
  const hoveredBarX = hovered != null ? hovered * slot + slot / 2 : 0;
  const hoveredBarTop =
    hovered != null ? height - padBottom - Math.max(4, (data[hovered].value / max) * barArea) : 0;

  return (
    <svg ref={svgRef} viewBox={`0 0 ${W} ${height}`} className="block w-full overflow-visible" role="img" aria-label="Gráfico de barras">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--color-utb-blue-soft)" />
          <stop offset="100%" stopColor="var(--color-utb-blue)" />
        </linearGradient>
        <linearGradient id={gidSoft} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#aec0f6" />
          <stop offset="100%" stopColor="#cbd8fa" />
        </linearGradient>
      </defs>

      <line
        x1="0"
        y1={height - padBottom}
        x2={W}
        y2={height - padBottom}
        stroke="var(--color-line)"
        strokeWidth="1.2"
        strokeDasharray="4 5"
      />

      {data.map((d, i) => {
        const isEmphasized = i === emphasized;
        const isHovered = hovered === i;
        const barHeight = Math.max(4, (d.value / max) * barArea);
        const x = i * slot + (slot - barWidth) / 2;
        const y = height - padBottom - barHeight;
        const showTick = tickIndices.has(i) || isHovered;
        const showValue = (tickCount === n || isEmphasized || i === 0 || i === n - 1) && !isHovered;
        // Always centered on the bar's true midpoint — never clamped/shifted
        // toward the viewBox edge, which just re-creates the "off-center"
        // look for the first/last bar. The svg is `overflow-visible` and the
        // card padding around it absorbs the sliver that pokes past 0/W.
        const valueX = x + barWidth / 2;
        return (
          <g
            key={d.label}
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
            onClick={() => onBarClick?.(i, d)}
            className={onBarClick ? "cursor-pointer" : undefined}
          >
            <rect x={x} y={height - padBottom} width={barWidth} height={padTop + 4} fill="transparent" />
            {showValue && (
              <text x={valueX} y={y - 10} textAnchor="middle" className="text-[13.5px] font-semibold" fill="var(--color-ink)">
                {formatValue(d.value)}
              </text>
            )}
            <rect
              data-bar
              x={x}
              y={y}
              width={barWidth}
              height={barHeight}
              rx={12}
              fill={isEmphasized ? `url(#${gid})` : `url(#${gidSoft})`}
              opacity={isHovered && !isEmphasized ? 0.85 : 1}
              stroke={isHovered ? "var(--color-utb-blue)" : "none"}
              strokeWidth={isHovered ? 1.5 : 0}
            />
            {showTick && (
              <text
                x={Math.min(W - padX, Math.max(padX, x + barWidth / 2))}
                y={height - 10}
                textAnchor="middle"
                className="text-[13.5px] font-medium"
                fill={isHovered ? "var(--color-ink)" : "var(--color-muted)"}
              >
                {d.label}
              </text>
            )}
          </g>
        );
      })}

      {hoveredDatum && (
        <Tooltip
          x={Math.min(W - padX, Math.max(padX, hoveredBarX))}
          y={hoveredBarTop}
          text={`${hoveredDatum.label} · ${formatValue(hoveredDatum.value)}`}
        />
      )}
    </svg>
  );
}

function Tooltip({ x, y, text }: { x: number; y: number; text: string }) {
  const width = text.length * 6.6 + 20;
  const height = 24;
  const tx = Math.min(640 - 10, Math.max(10 + width / 2, x)) - width / 2;
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
