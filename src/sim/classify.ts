/**
 * Enclosure geometry — the plot IS the plan (SCOPE §6, boss canon via Populous):
 * the shape of what you draw names what it becomes. Pure functions shared by
 * the sim (recognition when a wall completes) and the planner (live naming
 * while the player draws), so the preview and the record can never disagree.
 * Comparisons, multiplies and Math.sqrt only — these run inside worldStep, and
 * the cross-engine determinism law applies.
 */
import type { Vec2 } from './types';

export const BUILDING_KINDS = [
  'shed',
  'cot',
  'longhouse',
  'great_barn',
  'hall',
  'house',
] as const;
export type BuildingKind = (typeof BUILDING_KINDS)[number];

/**
 * Vernacular typology bins. The honest logic: ~5–6.5 m of clear roof timber
 * caps a building's span, so medieval buildings grow LONG, not deep, and real
 * width means aisles (halls and great barns were aisled).
 * PARTLY watchlist: dimension bins want a citation pass before they gate function.
 */
export function classifyFootprint(area: number, long: number, span: number): BuildingKind {
  if (area < 12) return 'shed';
  if (area < 40) return 'cot';
  if (span <= 6.5 && long >= 15) return area >= 180 ? 'great_barn' : 'longhouse';
  if (area >= 220 && long / span >= 1.8) return 'great_barn';
  if (area >= 110) return 'hall';
  return 'house';
}

/**
 * Collapse collinear (and duplicate) vertices of a CLOSED ring — input is the
 * open vertex list, the closing edge is implied. The planner's doorway loop
 * puts its two jambs exactly ON the front-edge line, so the 6-point shell
 * reduces to its 4 true corners; a hand-drawn ring keeps every real bend.
 * Relative-epsilon cross test: only floating-point-collinear vertices drop.
 */
export function reduceCorners(pts: readonly Vec2[]): Vec2[] {
  const out: Vec2[] = [];
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    const p = pts[(i + n - 1) % n]!;
    const v = pts[i]!;
    const q = pts[(i + 1) % n]!;
    const ax = v.x - p.x;
    const ay = v.y - p.y;
    const bx = q.x - v.x;
    const by = q.y - v.y;
    const la = Math.sqrt(ax * ax + ay * ay);
    const lb = Math.sqrt(bx * bx + by * by);
    if (la === 0 || lb === 0) continue; // duplicate vertex is no corner
    const cross = ax * by - ay * bx;
    if (Math.abs(cross) > 1e-6 * la * lb) out.push({ x: v.x, y: v.y });
  }
  return out;
}
