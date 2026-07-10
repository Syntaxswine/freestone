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
const MILESTONE_TICKS = [1, 6, 61, 101, 200, 260, 400];

/**
 * The canon must exercise every physics path the fingerprint should guard
 * (the SIM 2 review caught it guarding zero fill/material behavior): walls in
 * both materials, a fill that completes with a wall planned ON the platform
 * (effectiveGroundAt in the record), deliberately invalid commands so the
 * constant rejection strings are fingerprinted too, and — SIM 3 — a closed
 * low ring that must establish a farm plus a doorway loop that must complete
 * a building, so enclosure recognition is in the fingerprint.
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
    height: 0.5, // closed low ring — SIM 3 must establish a farm on completion
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
    height: 3, // near-closed tall ring — SIM 3 must complete a building (house)
  },
];

interface Milestone {
  tick: number;
  hash: string;
  stones: number;
  events: number;
  wallsComplete: number;
  fillsComplete: number;
  farms: number;
  buildings: number;
  farmWorkdays: number;
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
        farms: world.farms.length,
        buildings: world.buildings.length,
        farmWorkdays: world.farms.reduce((n, f) => n + f.workdays, 0),
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
