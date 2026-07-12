/**
 * The BED MODEL — the world under the landscape (boss directive 2026-07-10:
 * "populate the world under the landscape with minerals… data for how quickly
 * workers could dig through that area").
 *
 * Like SiteData, a BedModel is immutable input to the sim, NOT part of WorldState
 * — but the same package must be supplied to step/replay for determinism (strata
 * decide dig pace and stone yield). It is baked by tools/build-bed-model.mjs from
 * the transcribed BGS borehole records → public/data/site-durham/beds.json.
 *
 * v0 query model: each hole is a SURFACE-REGISTERED strata column; a query reads
 * the nearest real borehole, hung from the player's actual (LiDAR) surface. Honest
 * and deterministic — "the ground beneath you looks like the nearest real hole."
 */

import type { Vec2 } from './types';

/** What lies in the ground. Distinct from wall Material (what a wall is built of). */
export const GROUND_MATERIALS = [
  'drift', // soil / sand / gravel / clay / till — the overburden
  'sandstone', // "post" — the building stone
  'mudstone', // "metal" — shale / bind / siltstone
  'seatearth', // "seggar" — fireclay under coal
  'coal',
  'limestone',
  'band', // ironstone / thin hard girdle
  'void', // old workings — a hazard, not a material
  'unknown',
] as const;
export type GroundMaterial = (typeof GROUND_MATERIALS)[number];

/** DIG PACE, m³ of in-situ rock a laborer wins per person-day, by material.
 *  From the ILO/ASIST excavation ladder (5.0 soft → 0.8 rock, VERIFIED at source —
 *  research/DIGEST-2026-07-10-dig-rates-and-yield.md §1) mapped onto the bed classes.
 *  These are CONSTANTS: they enter hashed state only through the sim's commands. */
export const DIG_RATE: Record<GroundMaterial, number> = {
  drift: 4.0, // mixed overburden, soft→hard (ILO 5.0/3.5 down to 3.0/2.0)
  seatearth: 3.0, // fireclay — hard but not rock
  coal: 3.0, // hewn, not quarried (hewer 2.25–6 t/shift ≈ 2–4 m³/day)
  mudstone: 2.0, // "metal" — very hard (crowbar + pick)
  band: 1.2, // ironstone girdles — near rock
  sandstone: 0.8, // "post" — rock (sledge + chisel); ~1/6 the pace of drift
  limestone: 0.8, // rock
  void: 0, // already open ground — no digging, a hazard instead
  unknown: 2.0,
};

/** BUILDABLE STONE won per m³ excavated — the boss's DELIBERATE inversion of the
 *  real ~0.29 recovery (DIGEST §4): the quarry waste is the wall's rubble core, and
 *  a generous thumb on the scale rewards great works. Only the building stones yield;
 *  the rest is spoil (feeds fills, no stone). Labelled game choice, not geology. */
export const STONE_YIELD: Record<GroundMaterial, number> = {
  sandstone: 1.25, // generous: > 1.0 (real dressed-stone recovery is ~0.29)
  limestone: 1.25,
  drift: 0,
  mudstone: 0, // rubble-grade only; no dressed stone
  seatearth: 0,
  coal: 0, // fuel, not stone (a later resource)
  band: 0,
  void: 0,
  unknown: 0,
};

export interface BedColumnSegment {
  m: GroundMaterial;
  top: number; // metres below the ground surface
  base: number;
}

export interface BedHole {
  ref: string;
  x: number; // site-local metres (same frame as SiteData / heightmap.json)
  y: number;
  rockhead: number; // metres of drift before rock
  totalDepth: number;
  column: BedColumnSegment[];
}

export interface SeamPlane {
  a: number; // z = a*(E-cE) + b*(N-cN) + c, elevation AOD
  b: number;
  c: number;
  cE: number;
  cN: number;
  dipDeg: number;
  downDipAzimuthDeg: number;
}

export interface BedsJson {
  site: string;
  frame: { originE: number; originN: number };
  materials: string[];
  holes: BedHole[];
  seams: Record<string, { observations: number; plane: SeamPlane | null }>;
}

export interface BedModel {
  id: string;
  holes: readonly BedHole[];
  seams: Readonly<Record<string, SeamPlane>>;
  /** nearest surface-registered borehole to a site-local point */
  nearestHole(x: number, y: number): BedHole | null;
  /** ground material at depth d (metres below surface) at (x, y) */
  strataAt(x: number, y: number, depthBelow: number): GroundMaterial;
  /** metres of drift/overburden before rock at (x, y) */
  rockheadAt(x: number, y: number): number;
  /** AOD elevation (three-space Y) of a named seam at site-local (x, y), or null if
   *  the seam has no fitted plane. The plane is stored in absolute E/N, so this folds
   *  in the frame origin the render layer would otherwise have to carry itself. */
  seamElevationAt(name: string, x: number, y: number): number | null;
}

function nearest(holes: readonly BedHole[], x: number, y: number): BedHole | null {
  let best: BedHole | null = null;
  let bd = Infinity;
  for (const h of holes) {
    const d = (h.x - x) ** 2 + (h.y - y) ** 2;
    if (d < bd) {
      bd = d;
      best = h;
    }
  }
  return best;
}

export function bedModelFromJson(json: BedsJson): BedModel {
  const holes = json.holes ?? [];
  const seams: Record<string, SeamPlane> = {};
  for (const [name, s] of Object.entries(json.seams ?? {})) {
    if (s.plane) seams[name] = s.plane;
  }
  const originE = json.frame?.originE ?? 0;
  const originN = json.frame?.originN ?? 0;
  return {
    id: json.site,
    holes,
    seams,
    nearestHole: (x, y) => nearest(holes, x, y),
    strataAt: (x, y, depthBelow) => {
      const h = nearest(holes, x, y);
      if (!h) return 'unknown';
      if (depthBelow < 0) return 'drift'; // above ground: treat as overburden
      for (const seg of h.column) {
        if (depthBelow >= seg.top && depthBelow < seg.base) return seg.m;
      }
      // below the deepest logged bed: assume more of the deepest material
      const last = h.column[h.column.length - 1];
      return last ? last.m : 'unknown';
    },
    rockheadAt: (x, y) => {
      const h = nearest(holes, x, y);
      return h ? h.rockhead : 0;
    },
    seamElevationAt: (name, x, y) => {
      const p = seams[name];
      if (!p) return null;
      return p.a * (x + originE - p.cE) + p.b * (y + originN - p.cN) + p.c;
    },
  };
}

/**
 * The economics of a quarry, read from the strata and FROZEN into the plan_cut
 * command (SIM 14). Integrates the nearest hole's column from surface to `depth`:
 *   workDays = Σ (layer thickness · area) / DIG_RATE[material]  (person-days)
 *   stone    = Σ (layer thickness · area) · STONE_YIELD[material] (m³ won)
 * Below the deepest logged bed, the deepest material is assumed to continue.
 * void layers (DIG_RATE 0 — already open ground) cost no work.
 */
export function cutEconomics(
  model: BedModel,
  x: number,
  y: number,
  depth: number,
  area: number,
): { workDays: number; stone: number } {
  const h = model.nearestHole(x, y);
  const column = h && h.column.length ? h.column : [{ m: 'unknown' as GroundMaterial, top: 0, base: depth }];
  let workDays = 0;
  let stone = 0;
  const add = (m: GroundMaterial, top: number, base: number) => {
    const t = base - top;
    if (t <= 0) return;
    const r = DIG_RATE[m];
    if (r > 0) workDays += (t * area) / r;
    stone += t * area * STONE_YIELD[m];
  };
  for (const seg of column) add(seg.m, Math.max(0, seg.top), Math.min(depth, seg.base));
  const lastBase = column[column.length - 1]!.base;
  if (depth > lastBase) add(column[column.length - 1]!.m, lastBase, depth);
  return { workDays, stone };
}

const ADIT_SECTION = 6; // m² — a driven drift's cross-section (~2.5 × 2.4 m)
const ADIT_STEP = 2; // m between samples along the drive

/**
 * The economics of an ADIT (SIM 15), frozen into plan_adit at the command boundary.
 * The drift is driven from portal to head at the portal's GRADE (an AOD elevation),
 * cutting ADIT_SECTION m² of whatever lies at grade each step:
 *   workDays += (section · step) / DIG_RATE[material]     (person-days)
 *   stone    += (section · step) · STONE_YIELD[material]  (m³ won — the seam it drives)
 * SELF-DRAINING: there is NO water gate on the drive (the adit drains to its mouth) —
 * that is the whole point, it wins post the open quarry can't. Needs the SURFACE
 * (heightAt) to find how deep the grade lies at each point, so it takes it as input;
 * where the drive would break surface (past the hill) there is no rock to cut.
 */
export function aditEconomics(
  model: BedModel,
  heightAt: (x: number, y: number) => number,
  portal: Vec2,
  head: Vec2,
  grade: number,
): { workDays: number; stone: number; length: number } {
  const dx = head.x - portal.x;
  const dy = head.y - portal.y;
  const length = Math.hypot(dx, dy);
  const n = Math.max(1, Math.ceil(length / ADIT_STEP));
  const seg = length / n; // actual sample length
  let workDays = 0;
  let stone = 0;
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n; // sample at segment midpoints
    const x = portal.x + dx * t;
    const y = portal.y + dy * t;
    const gradeDepth = heightAt(x, y) - grade; // how far the adit floor lies below the surface here
    if (gradeDepth < 0) continue; // the drive would break surface — past the hill, no rock to cut
    const m = model.strataAt(x, y, gradeDepth);
    const vol = ADIT_SECTION * seg;
    const r = DIG_RATE[m];
    if (r > 0) workDays += vol / r;
    stone += vol * STONE_YIELD[m];
  }
  return { workDays, stone, length };
}

/** Flat placeholder — no subsurface data (tests, and the sim before beds land). */
export function emptyBedModel(id = 'no-beds'): BedModel {
  return {
    id,
    holes: [],
    seams: {},
    nearestHole: () => null,
    strataAt: () => 'unknown',
    rockheadAt: () => 0,
    seamElevationAt: () => null,
  };
}
