// Chart colours for Reports (PRD §9).
//
// Kept as plain hex as well as CSS custom properties in globals.css, because
// Recharts renders SVG presentation attributes, which don't reliably resolve
// `var()` the way an inline style would. The two copies are tied together by
// src/lib/charts/__tests__/colors.test.ts — they drifted once already.
//
// M8 §1.4: spend-by-category plots ONE measure, so rank and bar length carry
// the comparison. Giving each category its own hue encodes identity that
// position already states, and competes with the brand accent for attention.
// So: one neutral hue for the bars, and the accent reserved for the bar the
// reader has drilled into.

/** Every bar in the category breakdown. */
export const UNSELECTED_BAR_COLOR = "#4a4a57";

/** The one bar currently expanded into its subcategories. */
export const SELECTED_BAR_COLOR = "#8b85f5";

/**
 * The 12-month trend line. Teal rather than blue so it cannot be mistaken for
 * the indigo brand accent on the same screen.
 */
export const SEQUENTIAL_LINE_COLOR = "#5fb8a6";
