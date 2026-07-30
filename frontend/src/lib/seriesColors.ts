// Same ordered two-stop gradient pairs as DonutChart/HorizontalBarChart's
// series, shared so an institution's color is stable and consistent
// everywhere it appears (comparative chart, its legend, the institution
// picker chips) - keyed by the institution's fixed position in the full
// institutions list, never by selection order, so a color never shifts when
// a different institution is toggled on/off.
export const SERIES_COLORS = [
  { from: "var(--color-utb-blue-soft)", to: "var(--color-utb-blue)" },
  { from: "#9fe8ee", to: "var(--color-utb-cyan)" },
  { from: "#4d9089", to: "var(--color-utb-green-deep)" },
  { from: "#a8f188", to: "var(--color-utb-green)" },
  { from: "#ffd876", to: "var(--color-utb-amber)" },
  { from: "#b3ade8", to: "var(--color-utb-purple)" },
];

export function seriesColor(index: number) {
  return SERIES_COLORS[index % SERIES_COLORS.length];
}
