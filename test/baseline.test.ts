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
 * SIM 18's DRESS DIAL (each stone wall's blocks are worked to a level that sets its
 * lay debt and haul weight), on SIM 17's HAUL (the cart feeds each face at a frozen
 * rate), on SIM 16's CONSUMPTION LOOP (masonry DRAWS the pile). The run tells the
 * carriage stalls, and the dress trade, in one arc:
 *  - a WOOD wall (tick 6) builds free while a SANDSTONE wall A (tick 5) stands
 *    STALLED beside it on an empty pile — the loop in one fingerprint (the 7 and
 *    30 milestones catch stones climbing on timber alone, stockpile 0);
 *  - the FOUNDING quarry Q1 holes through ~tick 60 (the laborers clear the fills
 *    first). Now the WIN stall gives way to the HAUL stall: A's stone comes up the
 *    bank by cart at 0.6 m³/day, so A's FACE trickles — the crew (oldest-wall
 *    first) lays A's few blocks each day then flexes to the stepped-footing farm
 *    ring FR and the tavern off the pile while A waits on the road. A and FR are
 *    light RUBBLE (SIM 18: lay 0.5 days/stone) so FR flies up (done ~67); A is still
 *    cart-bound, done ~82;
 *  - the plotted tavern BS (drawings answered 20/25) is the deepest stall: a tall
 *    building wants dressed ASHLAR, so its blocks DRAW half again as much stone and
 *    LAY twice as slow (SIM 18). It halts mid-build (the 100 milestone) — hungrier
 *    than the SIM-17 tavern — until the bigger RELIEF quarry Q2 lands ~109 and it
 *    finishes ~123 (the 130 milestone): WIN → HAUL → PILE stall, dressed heavy, then
 *    relief, all in one fingerprint — "tall structures need heavier blocks" made real;
 *  - and the pre-17 grammar still runs, now on hauled, dressed, won stone: a
 *    completed fill carries W-plat (effectiveGroundAt in the record), the farm is
 *    designated and tended, a ramp is billed, a door and a second gate are cut and
 *    one is walled back up (the infill draws stone), a span stands uncovered then is
 *    bricked into a deck (~167), and four invalid commands reject with their constant
 *    reasons. The wallIds/roofId hold under SIM 18 — dress moves TIMING, not counts,
 *    and all walls finish before the span is drawn, so FR 225, BS 334 and the span
 *    2531 are unchanged; the dress levels and retuned relief moved the milestones;
 *  - and SIM 19 THE WOODS: the wood wall B DRAWS timber (the palisade is no longer
 *    free), spending the founder's woodpile 30 → 10 by tick 30; then a late coppice
 *    FELL (tick 137 — after every wall/roof id is minted, so no ripple) is felled
 *    through ~139 and wins 30 m³ back (timber 10 → 40, standsFelled 1) for three
 *    person-days of the laborers' time (farmWorkdays 190 → 187) — the SPENT and WON
 *    sides of the timber loop in one run.
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
  // A — a low sandstone wall planned tick 5 that STALLS with an empty pile until Q1
  // lands (~60). SIM 17: A's stone comes up the bank by CART at a frozen 0.6 m³/day
  // — far slower than the masons could lay it — so A's face trickles and the crew,
  // oldest-wall-first, lays A's few blocks then flexes to FR/BS off the pile while A
  // waits on the road. SIM 18: a low wall (h1) is light RUBBLE (draw 1.0×, lays 0.5
  // days/stone) — quick to lay when supplied, but A is haul-bound, so the CART still
  // binds. A waits first on the PIT, then on the CART; done ~82.
  { kind: 'plan_wall', tick: 5, points: [{ x: 1960, y: 2000 }, { x: 1995, y: 2000 }], height: 1, haulRate: 0.6, method: 'ox-cart uphill', dressLevel: 'rubble' },
  // B — a WOOD wall: since SIM 19 timber is a COST — its ~590 posts DRAW the global
  // timber stock (TIMBER_PER_POST each), spending the founder's woodpile down from
  // SEED_TIMBER 30 to ~10 by tick 30, while sandstone A stands stalled on an empty
  // stone pile beside it. The palisade builds without STONE, not without cost. Its
  // posts set the ids of everything planned after it. (The FELL at tick 137 tops the
  // timber back up to 40 — the two sides of the wood loop in one fingerprint.)
  { kind: 'plan_wall', tick: 6, points: [{ x: 1940, y: 1980 }, { x: 1940, y: 1955 }], height: 2.5, material: 'wood' },
  // FR — a closed low ring on the gorge bank: stepped footings bill 629 stones
  // (SIM 13). A field wall is light RUBBLE (SIM 18) — it lays 0.5 days/stone, twice
  // as fast, so it completes ~67 (earlier than as scappled); the word makes it a farm.
  { kind: 'plan_wall', tick: 10, points: [{ x: 1990, y: 1900 }, { x: 2014, y: 1900 }, { x: 2014, y: 1924 }, { x: 1990, y: 1924 }, { x: 1990, y: 1900 }], height: 0.5, dressLevel: 'rubble' },
  // BS — a plotted building (SIM 12): the doorway loop's jambs are collinear on
  // the front edge. It pends for its DRAWINGS, and is the deepest STALL — a tall
  // building wants dressed ASHLAR (SIM 18), so its 830 blocks draw half again as
  // much stone (~42 m³, not 28) AND lay twice as slow. It halts mid-build until the
  // bigger relief quarry Q2 lands (~109) and finishes ~123 — heavy and slow, the
  // "tall structures need heavier blocks" the dial makes real.
  { kind: 'plan_wall', tick: 12, points: [{ x: 2044.55, y: 1960 }, { x: 2048, y: 1960 }, { x: 2048, y: 1966 }, { x: 2040, y: 1966 }, { x: 2040, y: 1960 }, { x: 2043.45, y: 1960 }], height: 3, dressLevel: 'ashlar' },
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
  { kind: 'plan_wall', tick: 40, points: [{ x: 1972, y: 1974 }, { x: 1980, y: 1974 }], height: 1, dressLevel: 'rubble' },
  // FR gets the word — arable; tending begins this tick (wallId re-probed)
  { kind: 'designate', tick: 80, wallId: 225, use: 'farm' },
  // Q2 — THE RELIEF QUARRY: the ashlar tavern draws half again as much stone per
  // block AND lays twice as slow (SIM 18), so it is HUNGRIER than the SIM-17 tavern
  // was — the relief is bigger and opened earlier (32 m³, holed ~tick 109) so BS
  // finishes ~123, a hair before the span is drawn. Starve → relief → resume.
  { kind: 'plan_cut', tick: 92, points: [{ x: 1745, y: 1567 }, { x: 1751, y: 1567 }, { x: 1751, y: 1573 }, { x: 1745, y: 1573 }], depth: 3, workTotal: 34, stoneTotal: 32 },
  // a span drawn over the finished tavern — it stands UNCOVERED (SIM 11) until the
  // word bricks it into a deck (~167). Corners rest on finished walls; roofId re-probed.
  { kind: 'plan_roof', tick: 135, points: [{ x: 2040, y: 1960 }, { x: 2048, y: 1960 }, { x: 2048, y: 1966 }, { x: 2040, y: 1966 }] },
  // FELL — a coppice cut (SIM 19): the crew, done with the pit and the walls, fells
  // a wooded cant late in the run. Economics FROZEN as the render would from the
  // tree model: ~30 trees ≈ 30 m³ of timber won for ~3 person-days' felling. Placed
  // tick 137 — AFTER every wall and the roof span are minted (≤135) so no
  // wallId/roofId shifts — and the two laborers (idle since Q2 holed through) fell
  // it through in a couple of days. The wood wall B already drew its posts from the
  // founder's woodpile (SEED_TIMBER), so this coppice tops the stock back up: the
  // WON side of the timber loop fingerprinted, beside B's SPENT side (the timber
  // milestone falls as B builds, then rises when the cant is felled through).
  { kind: 'plan_fell', tick: 137, points: [{ x: 1900, y: 2030 }, { x: 1912, y: 2030 }, { x: 1912, y: 2042 }, { x: 1900, y: 2042 }], timberTotal: 30, workTotal: 3 },
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
  timber: number;
  grain: number;
  standsFelled: number;
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
        timber: Math.round(world.timber),
        grain: Math.round(world.grain), // SIM 22 — constant SEED_GRAIN in the canon (livingYear never fires in 200 ticks)
        // felled-through stands: standing (feltTick>=0) or regrown after a completed cut
        standsFelled: world.stands.filter((s) => !s.felling && s.workDone >= s.workTotal).length,
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
