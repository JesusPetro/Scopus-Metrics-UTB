import { useLayoutEffect, useRef } from "react";
import { revealHBars } from "../../lib/motion";

const SERIES = [
  { from: "var(--color-utb-blue-soft)", to: "var(--color-utb-blue)" },
  { from: "#9fe8ee", to: "var(--color-utb-cyan)" },
  { from: "#4d9089", to: "var(--color-utb-green-deep)" },
  { from: "#a8f188", to: "var(--color-utb-green)" },
  { from: "#ffd876", to: "var(--color-utb-amber)" },
  { from: "#b3ade8", to: "var(--color-utb-purple)" },
];

const W = 400;
const ROW_H = 12;

/**
 * Rounded gradient progress bars — the horizontal counterpart to BarChart,
 * used for breakdowns (document types, faculties) per DESIGN.md's chart
 * grammar: hand-authored SVG, two-stop gradient fills, no library defaults.
 */
export function HorizontalBarChart({ data }: { data: { label: string; value: number; percent: number }[] }) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    revealHBars(containerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  return (
    <div ref={containerRef} className="flex flex-col gap-4">
      {data.map((d, i) => {
        const width = Math.max(W * 0.02, (d.percent / 100) * W);
        const gid = `hbar-${i}`;
        const series = SERIES[i % SERIES.length];
        return (
          <div key={d.label}>
            <div className="mb-1.5 flex items-baseline justify-between text-sm">
              <span className="font-medium text-ink">{d.label}</span>
              <span className="font-semibold text-muted">{d.percent.toFixed(0)}%</span>
            </div>
            <svg
              viewBox={`0 0 ${W} ${ROW_H}`}
              preserveAspectRatio="none"
              className="block w-full"
              style={{ height: ROW_H }}
            >
              <defs>
                <linearGradient id={gid} x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor={series.from} />
                  <stop offset="100%" stopColor={series.to} />
                </linearGradient>
              </defs>
              <rect width={W} height={ROW_H} rx={ROW_H / 2} fill="var(--color-canvas)" />
              <rect data-bar width={width} height={ROW_H} rx={ROW_H / 2} fill={`url(#${gid})`} />
            </svg>
          </div>
        );
      })}
    </div>
  );
}
