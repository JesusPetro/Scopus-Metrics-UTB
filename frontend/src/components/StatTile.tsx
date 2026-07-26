import { useCountUp } from "../lib/motion";

export function StatTile({
  label,
  value,
  hint,
  trend,
}: {
  label: string;
  value: number | undefined;
  hint?: string;
  trend?: string;
}) {
  const ref = useCountUp(value);

  return (
    <div className="rounded-lg bg-surface p-5 shadow-card transition-shadow hover:shadow-md">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[12.5px] font-semibold tracking-wide text-muted uppercase">{label}</p>
        {trend && (
          <span
            className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
              trend.startsWith("↑") ? "bg-utb-green/15 text-utb-green-deep" : "bg-utb-amber/20 text-ink"
            }`}
          >
            {trend}
          </span>
        )}
      </div>
      {value === undefined ? (
        <div className="mt-2.5 h-7 w-16 animate-pulse rounded-full bg-line" />
      ) : (
        <p className="mt-2 text-[28px] leading-none font-bold tracking-tight text-ink">
          <span ref={ref}>0</span>
        </p>
      )}
      {hint && <p className="mt-1.5 text-sm text-muted">{hint}</p>}
    </div>
  );
}
