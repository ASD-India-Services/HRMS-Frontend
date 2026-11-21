/**
 * Shared chart theme. Every recharts chart takes its palette, axis, grid, tooltip and legend
 * styling from here so charts look the same wherever they appear. Values are resolved from the
 * design-token CSS variables (RGB channels in index.css).
 */

/** Fixed chart body height (px) so cards in a row line up. */
export const CHART_HEIGHT = 320;

const PALETTE_TOKENS = [
  'primary-main', 'info-main', 'warning-main', 'error-main', 'secondary-main',
  'success-main', 'primary-dark', 'info-dark', 'warning-dark', 'secondary-dark',
];

function channel(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(`--${name}`).trim();
}

/** Series / slice colours. */
export function getChartColors(): string[] {
  return PALETTE_TOKENS.map((t) => `rgb(${channel(t)})`);
}

export interface ChartTheme {
  colors: string[];
  /** Axis tick style (12px, disabled-ink colour). */
  tick: { fontSize: number; fill: string };
  /** Horizontal-only dashed grid. */
  grid: { stroke: string; strokeDasharray: string; vertical: boolean };
  /** Cursor / hover band behind tooltips. */
  cursor: { fill: string };
}

export function getChartTheme(): ChartTheme {
  return {
    colors: getChartColors(),
    tick: { fontSize: 12, fill: `rgb(${channel('ink-disabled')})` },
    grid: { stroke: `rgb(${channel('divider')} / 0.2)`, strokeDasharray: '3 3', vertical: false },
    cursor: { fill: `rgb(${channel('grey-500')} / 0.08)` },
  };
}

/** Props shared by every XAxis / YAxis: no axis line, no ticks marks. */
export const AXIS_PROPS = { axisLine: false, tickLine: false } as const;

/** Props for the shared legend (pie / donut). */
export const LEGEND_PROPS = {
  iconType: 'circle',
  iconSize: 8,
  wrapperStyle: { fontSize: 12 },
} as const;
