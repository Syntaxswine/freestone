/**
 * THE INSTRUMENT (house law: instruments before mechanisms — built before M2's
 * sim churn, while the sim is small).
 *
 * A canonical run — fixed seed, the real Durham terrain, a hand-authored command
 * script including several deliberately invalid commands — is fingerprinted at
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
const END_TICK = 200;
const MILESTONE_TICKS = [1, 7, 30, 65, 80, 100, 130, 200];

/**
 * The canon exercises every physics path the fingerprint guards — now including
 * SIM 17's HAUL (each stone wall's face is fed by the cart at a frozen rate), on
 * top of SIM 16's CONSUMPTION LOOP (masonry DRAWS the pile). The run tells the
 * carriage stalls in one arc:
 *  - a WOOD wall (tick 6) builds free while a SANDSTONE wall A (tick 5) stands
 *    STALLED beside it on an empty pile — the loop in one fingerprint (the 7 and
 *    30 milestones catch stones climbing on timber alone, stockpile 0);
 *  - the FOUNDING quarry Q1 holes through ~tick 60 (the laborers clear the fills
 *    first). Now the WIN stall gives way to the HAUL stall: A's stone comes up the
 *    bank by cart at 0.6 m³/day, so A's FACE trickles — the crew (oldest-wall
 *    first) lays A's few blocks each day then flexes to the stepped-footing farm
 *    ring FR and the tavern off the pile while A waits on the road (A partway at
 *    the 65 milestone, done ~80);
 *  - the plotted tavern BS (drawings answered 20/25) is the PILE stall: it wants
 *    more stone than Q1 leaves, so it halts mid-build (the 100 milestone, stockpile
 *    ~0) until the RELIEF quarry Q2 lands ~124 and it finishes (the 130 milestone)
 *    — WIN → HAUL → PILE stalls, then relief, all in one fingerprint;
 *  - and the pre-17 grammar still runs, now on hauled and won stone: a completed
 *    fill carries W-plat (effectiveGroundAt in the record), the farm is designated
 *    and tended, a ramp is billed, a door and a second gate are cut and one is
 *    walled back up (the infill draws stone), a span stands uncovered then is
 *    bricked into a deck (~167), and four invalid commands reject with their
 *    constant reasons. The wallIds/roofId hold under SIM 17 — all walls finish
 *    before the span is drawn, so the counts that set FR 225, BS 334 and the span
 *    2531 are unchanged; only A's throttled pace moved the intermediate milestones.
 */
const CANON_COMMANDS: Command[] = [
  // Q1 — THE FOUNDING QUARRY (SIM 16): the crew opens the outcrop Low Main Post
  // (NZ24SE109 logs sandstone from surface, rockhead 0). Economics FROZEN as the
  // render would from the bed model: ~44 m³ of post at the ILO rock rate ≈ 58
  // person-days; generous 1.25 → 55 m³ won. The two laborers clear the fills
  // first (fills outrank the pit), so it holes through ~tick 60 — and no stone is
  // laid until then: the masons stall on an empty pile from the tick-5 wall on.
  { kind: 'plan_cut', tick: 1, points: [{ x: 1755, y: 1567 }, { x: 1761, y: 1567 }, { x: 1761, y: 1573 }, { x: 1755, y: 1573 }], depth: 3, workTotal: 58, stoneTotal: 55 },
  // F1 — a platform fill; W-plat stands on it once it sets (~tick 30)
  { kind: 'plan_fill', tick: 3, points: [{ x: 1970, y: 1968 }, { x: 1982, y: 1968 }, { x: 1982, y: 1980 }, { x: 1970, y: 1980 }], height: 1 },
  // A — a sandstone wall planned tick 5 that STALLS with an empty pile until Q1
  // lands (~60). New in SIM 17: A's stone comes up the bank by CART at a frozen
  // 0.6 m³/day — far slower than the masons could lay it — so A's face trickles
  // and the crew, oldest-wall-first, lays A's few blocks then flexes to FR/BS off
  // the pile while A waits on the road. A waits first on the PIT, then on the CART
  // (partway at the 65 milestone, done ~80): the two carriage stalls in one wall.
  { kind: 'plan_wall', tick: 5, points: [{ x: 1960, y: 2000 }, { x: 1995, y: 2000 }], height: 1, haulRate: 0.6, method: 'ox-cart uphill' },
  // B — a WOOD wall: timber draws no stone (the WOODS aren't a cost yet), so it
  // builds FREE from tick 6 while A stands stalled beside it — the loop, in one
  // fingerprint. Its ~600 posts set the ids of everything planned after it.
  { kind: 'plan_wall', tick: 6, points: [{ x: 1940, y: 1980 }, { x: 1940, y: 1955 }], height: 2.5, material: 'wood' },
  // FR — a closed low ring on the gorge bank: stepped footings bill 629 stones
  // (SIM 13); it pends at completion (~78) and the lord's word makes it a farm.
  { kind: 'plan_wall', tick: 10, points: [{ x: 1990, y: 1900 }, { x: 2014, y: 1900 }, { x: 2014, y: 1924 }, { x: 1990, y: 1924 }, { x: 1990, y: 1900 }], height: 0.5 },
  // BS — a plotted building (SIM 12): the doorway loop's jambs are collinear on
  // the front edge. It pends for its DRAWINGS, and is the SIM 16 STALL — it wants
  // 830 blocks (~28 m³) but only ~21 m³ is left when its turn comes, so it halts
  // mid-build (~2233/2515 at tick 100) until Q2 relieves it (~tick 127).
  { kind: 'plan_wall', tick: 12, points: [{ x: 2044.55, y: 1960 }, { x: 2048, y: 1960 }, { x: 2048, y: 1966 }, { x: 2040, y: 1966 }, { x: 2040, y: 1960 }, { x: 2043.45, y: 1960 }], height: 3 },
  // RF — a ramp fill (SIM 8): the wedge in the record
  { kind: 'plan_fill', tick: 15, points: [{ x: 1955, y: 1955 }, { x: 1961, y: 1955 }, { x: 1961, y: 1961 }, { x: 1955, y: 1961 }], height: 1, shape: 'ramp' },
  // four invalid commands (tick 16) — deterministically rejected, the constant
  // reason strings fingerprinted: a null height, a two-point fill, a double-wound
  // lap (the SIM 4 overlap guard), a roof floating in a field (the SIM 8 support rule)
  { kind: 'plan_wall', tick: 16, points: [{ x: 1900, y: 1900 }, { x: 1910, y: 1900 }], height: null as unknown as number },
  { kind: 'plan_fill', tick: 16, points: [{ x: 1900, y: 1900 }, { x: 1910, y: 1900 }], height: 1 },
  { kind: 'plan_fill', tick: 16, points: [{ x: 1860, y: 1890 }, { x: 1860, y: 1860 }, { x: 1890, y: 1860 }, { x: 1890, y: 1890 }, { x: 1860, y: 1889 }, { x: 1860, y: 1862 }, { x: 1888, y: 1862 }, { x: 1888, y: 1888 }, { x: 1860, y: 1888 }], height: 1 },
  { kind: 'plan_roof', tick: 16, points: [{ x: 1900, y: 1900 }, { x: 1910, y: 1900 }, { x: 1910, y: 1910 }] },
  // BS's drawings — the roof first (a thatched gable), then the trade. The masons
  // lay not one stone of BS until both are answered (SIM 12). wallId re-probed.
  { kind: 'choose_roof', tick: 20, wallId: 334, roof: 'straw' },
  { kind: 'designate', tick: 25, wallId: 334, use: 'tavern' },
  // W-plat — a wall on F1's COMPLETED platform (tick 40, after it sets ~30): the
  // survey reads effectiveGroundAt raised, so the fill is in the fingerprint.
  { kind: 'plan_wall', tick: 40, points: [{ x: 1972, y: 1974 }, { x: 1980, y: 1974 }], height: 1 },
  // FR gets the word — arable; tending begins this tick (wallId re-probed)
  { kind: 'designate', tick: 80, wallId: 225, use: 'farm' },
  // Q2 — THE RELIEF QUARRY: a second cut whose 20 m³ lands ~tick 124 and lets the
  // stalled tavern finish (~127). Starve → relief → resume, the loop's whole arc.
  { kind: 'plan_cut', tick: 110, points: [{ x: 1745, y: 1567 }, { x: 1751, y: 1567 }, { x: 1751, y: 1573 }, { x: 1745, y: 1573 }], depth: 3, workTotal: 30, stoneTotal: 20 },
  // a span drawn over the finished tavern — it stands UNCOVERED (SIM 11) until the
  // word bricks it into a deck (~167). Corners rest on finished walls; roofId re-probed.
  { kind: 'plan_roof', tick: 135, points: [{ x: 2040, y: 1960 }, { x: 2048, y: 1960 }, { x: 2048, y: 1966 }, { x: 2040, y: 1966 }] },
  // gate ops (SIM 6/7/9) on finished walls: a second gate into the farm's east
  // wall, a back DOOR in the tavern; then the farm gate is taken down and the
  // masons wall it back up through the daily loop — the infill DRAWS stone (SIM 16).
  { kind: 'add_gate', tick: 140, wallId: 225, at: { x: 2014, y: 1912 } },
  { kind: 'add_gate', tick: 140, wallId: 334, at: { x: 2044, y: 1966 } },
  { kind: 'remove_gate', tick: 150, wallId: 225, at: { x: 2014, y: 1912 } },
  // the covering chosen: flat brick — the deck the laborers build (done ~167)
  { kind: 'designate_roof', tick: 160, roofId: 2531, material: 'brick' },
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
