// Chart colors for Reports (PRD §9). Values match the CSS custom properties
// in globals.css (--chart-1..6, --chart-sequential) — kept as plain hex here
// too since Recharts renders SVG presentation attributes, which don't
// reliably resolve CSS var() the way an inline style would. Categorical
// order is fixed (never re-sorted per render) per the dataviz skill's
// CVD-safety rule — the palette's ordering is itself the safety mechanism.
export const CATEGORICAL_COLORS = [
  "#2a78d6", // blue
  "#eb6834", // orange
  "#1baf7a", // aqua
  "#eda100", // yellow
  "#e87ba4", // magenta
  "#008300", // green
];

export const SEQUENTIAL_LINE_COLOR = "#2a78d6";
