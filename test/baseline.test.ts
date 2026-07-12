/**
 * THE INSTRUMENT (house law: instruments before mechanisms — built before M2's
 * sim churn, while the sim is small).
 *
 * A canonical run — fixed seed, the real Durham terrain, a hand-authored command
 * script including one deliberately invalid command — is fingerprinted at
 * milestone ticks and committed as baselines/durham-42.json. Every `npm test`
 * replays it and compares: any change to physics, validation, decomposition, or
 * the rng path shows up as a hash mismatch here before it ships.
 *
 * When a physics change is INTENDED, regenerate deliberately with
 * `npm run gen-baseline` and commit the new baseline in the SAME commit that
 * explains, in field-note detail, why the numbers moved (the vugg two-commit
 * discipline: instrument-neutral refactors first, then the attributable bump).
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { hashState, replay, type SaveFile } from '../src/sim/save';
import { siteFromHeightmap, type HeightmapJson, type SiteData } from '../src/sim/site';
import { worldStep } from '../src/sim/step';
import { SIM_VERSION, type Command } from '../src/sim/types';
import { createWorld } from '../src/sim/world';

const here = dirname(fileURLToPath(import.meta.url));
const BASELINE_PATH = resolve(here, '../baselines/durham-42.json');
const TERRAIN_PATH = resolve(here, '../public/data/site-durham/heightmap.json');

const SEED = 'durham-baseline-42';
const END_TICK = 400;
const MILESTONE_TICKS = [1, 6, 61, 101, 200, 260, 320, 400];

/**
 * The canon must exercise every physics path the fingerprint should guard
 * (the SIM 2 review caught it guarding zero fill/material behavior): walls in
 * both materials, a fill that completes with a wall planned ON the platform
 * (effectiveGroundAt in the record), deliberately invalid commands so the
 * constant rejection strings are fingerprinted too, and — SIM 3/10 — a closed
 * low ring and a doorway loop that must PEND at completion and become a farm
 * and a tavern by the lord's word, a paddock whose workdays stay zero
 * (arable-only tending in the record), and — SIM 12 — the DRAWINGS: the
 * tick-150 building plots and the masons lay nothing (the 200 milestone
 * fingerprints the waiting shell), the roof is chosen at 205, the trade at
 * 255 (the 260 milestone catches the crew MID-BUILD), a door is cut in the
 * finished tavern at 350, and a span drawn at 300 stands UNCOVERED through
 * the 320 milestone until designate_roof bricks it at 382 (SIM 11).
 */
const CANON_COMMANDS: Command[] = [
  {
    kind: 'plan_fill',
    tick: 3,
    points: [
      { x: 1970, y: 1968 },
      { x: 1982, y: 1968 },
      { x: 1982, y: 1980 },
      { x: 1970, y: 1980 },
    ],
    height: 1,
  },
  {
    kind: 'plan_wall',
    tick: 5,
    points: [
      { x: 1960, y: 2000 },
      { x: 2020, y: 2000 },
      { x: 2020, y: 2050 },
    ],
    height: 4,
  },
  {
    kind: 'plan_wall',
    tick: 60,
    points: [
      { x: 1940, y: 1980 },
      { x: 1940, y: 1930 },
    ],
    height: 2.5,
    material: 'wood',
  },
  {
    kind: 'plan_wall',
    tick: 100,
    points: [
      { x: 1900, y: 1900 },
      { x: 1910, y: 1900 },
    ],
    height: null as unknown as number, // deterministically rejected, chronicled
  },
  {
    kind: 'plan_fill',
    tick: 100,
    points: [
      { x: 1900, y: 1900 },
      { x: 1910, y: 1900 },
    ],
    height: 1, // rejected: two points cannot ring ground
  },
  {
    kind: 'plan_fill',
    tick: 100,
    points: [
      { x: 1860, y: 1890 },
      { x: 1860, y: 1860 },
      { x: 1890, y: 1860 },
      { x: 1890, y: 1890 },
      { x: 1860, y: 1889 },
      { x: 1860, y: 1862 },
      { x: 1888, y: 1862 },
      { x: 1888, y: 1888 },
      { x: 1860, y: 1888 },
    ],
    height: 1, // rejected: double-wound lap (SIM 4 overlap guard fingerprinted)
  },
  {
    kind: 'plan_wall',
    tick: 250,
    points: [
      { x: 1972, y: 1974 },
      { x: 1980, y: 1974 },
    ],
    height: 1, // stands ON the tick-3 fill's completed platform
  },
  {
    kind: 'plan_wall',
    tick: 130,
    points: [
      { x: 1990, y: 1900 },
      { x: 2014, y: 1900 },
      { x: 2014, y: 1924 },
      { x: 1990, y: 1924 },
      { x: 1990, y: 1900 },
    ],
    height: 0.5, // closed low ring — SIM 10: pends at completion (@137), designated below
  },
  {
    kind: 'designate',
    tick: 145, // the ring completes ~141 now — stepped footings on the bank
    //           bill 629 stones where flat-count billed 420 (SIM 13, honest)
    wallId: 5375, // the tick-130 ring — deterministic id, re-probed
    use: 'farm', // the word makes it arable; tending begins this very tick
  },
  {
    kind: 'plan_wall',
    tick: 150,
    points: [
      { x: 2044.55, y: 1960 }, // the doorway loop: jambs collinear on the front edge
      { x: 2048, y: 1960 },
      { x: 2048, y: 1966 },
      { x: 2040, y: 1966 },
      { x: 2040, y: 1960 },
      { x: 2043.45, y: 1960 },
    ],
    height: 3, // a PLOTTED BUILDING (SIM 12): pends from this very tick, and the
    //            masons lay NOT ONE STONE until both drawings are answered — the
    //            waiting shell is in the 200 fingerprint (stones ~700 lower)
  },
  {
    kind: 'choose_roof',
    tick: 205,
    wallId: 6006, // the tick-150 plot (re-probed) — the drawings' FIRST answer
    roof: 'straw', // a thatched gable at completion (the dressing path)
  },
  {
    kind: 'designate',
    tick: 255,
    wallId: 6006, // the second answer — the masons read a cot…
    use: 'tavern', // …the lord keeps ale. The crew starts THIS tick: the 260
    //                milestone catches the shell MID-BUILD (~338 stones in)
  },
  {
    kind: 'plan_fill',
    tick: 320,
    points: [
      { x: 2000, y: 2040 },
      { x: 2008, y: 2040 },
      { x: 2008, y: 2048 },
      { x: 2000, y: 2048 },
      { x: 2000, y: 2040.2 }, // hand-closed: SIM 5 normalization ACCEPTS this,
    ], //                        and tending must pause for it then resume
    height: 0.5,
  },
  {
    kind: 'plan_wall',
    tick: 340,
    points: [
      { x: 1930, y: 2035 },
      { x: 1946, y: 2035 },
      { x: 1946, y: 2051 },
      { x: 1930, y: 2051 },
      { x: 1930, y: 2036.5 }, // a 1.5 m gateway — SIM 6: the gap gate rides the designation
    ],
    height: 0.5,
  },
  {
    kind: 'designate',
    tick: 355,
    wallId: 6909, // the tick-340 gapped ring (re-probed under the SIM 13 id shifts)
    use: 'livestock', // a paddock: its workdays must stay ZERO in every milestone
  },
  {
    kind: 'add_gate',
    tick: 360,
    wallId: 5375, // the tick-130 farm ring's wall — deterministic id, re-probed
    at: { x: 2014, y: 1912 }, // a second gate knocked into the east wall
  },
  {
    kind: 'remove_gate',
    tick: 375,
    wallId: 5375,
    at: { x: 2014, y: 1912 }, // taken down again: the masons wall it back up
  },
  {
    kind: 'add_gate',
    tick: 350,
    wallId: 6006, // the tick-150 tavern — SIM 9: the same tool cuts a DOOR
    at: { x: 2044, y: 1966 }, // a back door in the north wall
  },
  {
    kind: 'plan_roof',
    tick: 100,
    points: [
      { x: 1900, y: 1900 },
      { x: 1910, y: 1900 },
      { x: 1910, y: 1910 },
    ], // rejected: floating in a field (SIM 8 support rule fingerprinted)
  },
  {
    kind: 'plan_roof',
    tick: 300, // after the tavern shell completes (~275) — spans rest on FINISHED walls
    points: [
      { x: 2040, y: 1960 }, // the tavern's four corners — a second, honest deck
      { x: 2048, y: 1960 }, // over the gable's building: it stands UNCOVERED
      { x: 2048, y: 1966 }, // through the 320 milestone (SIM 11 — the default is
      { x: 2040, y: 1966 }, // none, and the asking state is in the fingerprint)
    ],
  },
  {
    kind: 'designate_roof',
    tick: 382,
    roofId: 6907, // the tick-300 span (re-probed under SIM 13's footing bills)
    material: 'brick', // the covering chosen; decking begins, a floor above
  },
  {
    kind: 'plan_fill',
    tick: 385,
    points: [
      { x: 1955, y: 1955 },
      { x: 1961, y: 1955 },
      { x: 1961, y: 1961 },
      { x: 1955, y: 1961 },
    ],
    height: 1,
    shape: 'ramp', // SIM 8: the wedge in the record
  },
  {
    kind: 'plan_cut',
    tick: 300, // SIM 14: a quarry into the bare Low Main Post — the hole at this
    //            spot (NZ24SE109) logs sandstone from the surface, rockhead 0. The
    //            economics are FROZEN as the render would freeze them from the bed
    //            model: 3 m × 36 m² of post at the ILO rock rate (0.8 m³/person-day)
    //            = 135 person-days; 108 m³ removed → 135 m³ buildable (generous
    //            1.25). ~68 ticks with 2 laborers, so it digs 300→~368 and the 400
    //            fingerprint catches cutsComplete=1, stockpile 135. It pulls the
    //            idle hands off the fields while it runs (the quarry-before-field
    //            law), so farmWorkdays at 320/400 fall below the no-quarry run.
    points: [
      { x: 1755, y: 1567 },
      { x: 1761, y: 1567 },
      { x: 1761, y: 1573 },
      { x: 1755, y: 1573 },
    ],
    depth: 3,
    workTotal: 135,
    stoneTotal: 135,
  },
];

interface Milestone {
  tick: number;
  hash: string;
  stones: number;
  events: number;
  wallsComplete: number;
  fillsComplete: number;
  pending: number;
  farms: number;
  buildings: number;
  farmWorkdays: number;
  gates: number;
  roofsUncovered: number;
  roofsComplete: number;
  cutsComplete: number;
  aditsComplete: number;
  stockpile: number;
}

interface Baseline {
  note: string;
  save: SaveFile;
  milestones: Milestone[];
}

function loadDurham(): SiteData {
  const json = JSON.parse(readFileSync(TERRAIN_PATH, 'utf8')) as HeightmapJson;
  return siteFromHeightmap(json);
}

function runCanon(site: SiteData): Baseline {
  const byTick = new Map<number, Command[]>();
  for (const cmd of CANON_COMMANDS) {
    const bucket = byTick.get(cmd.tick);
    if (bucket) bucket.push(cmd);
    else byTick.set(cmd.tick, [cmd]);
  }
  const world = createWorld(SEED, site.id);
  const milestones: Milestone[] = [];
  while (world.tick < END_TICK) {
    worldStep(world, site, byTick.get(world.tick) ?? []);
    if (MILESTONE_TICKS.includes(world.tick)) {
      milestones.push({
        tick: world.tick,
        hash: hashState(world),
        stones: world.stones.length,
        events: world.events.length,
        wallsComplete: world.walls.filter((w) => w.stonesLaid >= w.stonesTotal).length,
        fillsComplete: world.fills.filter((f) => f.volumeMoved >= f.volumeTotal).length,
        pending: world.pending.length,
        farms: world.farms.length,
        buildings: world.buildings.length,
        farmWorkdays: world.farms.reduce((n, f) => n + f.workdays, 0),
        gates: world.farms.reduce((n, f) => n + f.gates.length, 0),
        roofsUncovered: world.roofs.filter((r) => r.material === null).length,
        roofsComplete: world.roofs.filter((r) => r.workDone >= r.workTotal).length,
        cutsComplete: world.cuts.filter((c) => c.workDone >= c.workTotal).length,
        aditsComplete: world.adits.filter((a) => a.workDone >= a.workTotal).length,
        stockpile: Math.round(world.stockpile),
      });
    }
  }
  return {
    note:
      'Canonical determinism baseline. Regenerate ONLY deliberately via ' +
      '`npm run gen-baseline`, in the same commit that explains why physics moved.',
    save: {
      meta: { simVersion: SIM_VERSION, seed: SEED, siteId: site.id, savedAtTick: END_TICK },
      commands: CANON_COMMANDS,
    },
    milestones,
  };
}

describe('baseline — the determinism instrument', () => {
  const site = loadDurham();

  it('the canonical run matches baselines/durham-42.json at every milestone', () => {
    const fresh = runCanon(site);

    if (process.env.GEN_BASELINE) {
      mkdirSync(dirname(BASELINE_PATH), { recursive: true });
      writeFileSync(BASELINE_PATH, JSON.stringify(fresh, null, 2) + '\n');
      console.warn(`baseline REGENERATED at ${BASELINE_PATH} — commit it with the why`);
      return;
    }

    let committed: Baseline;
    try {
      committed = JSON.parse(readFileSync(BASELINE_PATH, 'utf8')) as Baseline;
    } catch {
      throw new Error(
        'baselines/durham-42.json is missing — run `npm run gen-baseline` once and commit it',
      );
    }

    expect(
      committed.save.meta.simVersion,
      'SIM_VERSION moved: regenerate the baseline DELIBERATELY (npm run gen-baseline) ' +
        'in the commit that explains the physics change',
    ).toBe(SIM_VERSION);

    for (const [i, expected] of committed.milestones.entries()) {
      const got = fresh.milestones[i]!;
      expect(got.tick).toBe(expected.tick);
      expect(
        got,
        `physics drifted at tick ${expected.tick} — if intended, npm run gen-baseline; ` +
          'if not, you just caught a regression before it shipped',
      ).toEqual(expected);
    }
  });

  it('replay() of the baseline save reproduces the final milestone hash', () => {
    const committed = JSON.parse(readFileSync(BASELINE_PATH, 'utf8')) as Baseline;
    const world = replay(committed.save, site);
    const last = committed.milestones[committed.milestones.length - 1]!;
    expect(world.tick).toBe(last.tick);
    expect(hashState(world)).toBe(last.hash);
  });
});
