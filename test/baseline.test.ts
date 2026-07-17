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
 * The canon exercises every physics path the fingerprint guards — since SIM 35 on
 * THE VISIBLE FLOW (a working pays its yield per person-day, the checkpoint credit),
 * over SIM 18's DRESS DIAL, SIM 17's HAUL, and SIM 16's CONSUMPTION LOOP. The run
 * tells the TRICKLE ECONOMY's story — the WIN cliff is dead; the surviving stalls
 * are the CART and the PILE — in one arc:
 *  - the FOUNDING quarry Q1 (tick 1) trickles stone from its FIRST person-day: the
 *    tick-7 milestone fingerprints ~80 stones already standing on a 2.6 m³ pile —
 *    the wall rises AS the pit deepens (the arc's whole thesis; under SIM 34 this
 *    milestone read 54 wood posts and a pile of exactly 0);
 *  - the HAUL stall survives: wall A (tick 5, hauled at a frozen 0.6 m³/day) is
 *    CART-bound its whole life — the pile has stone, A's face trickles — done ~49
 *    (the 30 milestone catches it mid-crawl at 112/384 while the pile reads 0);
 *  - the PILE stall survives: the plotted ashlar tavern BS (drawings answered
 *    20/25) draws half again as much stone per block and lays twice as slow
 *    (SIM 18), so demand outruns Q1's trickle — BS halts mid-build at 410/830
 *    (the 65 and 80 milestones, pile 0) until the RELIEF quarry Q2 (tick 92)
 *    trickles it back to life (creeping at the 100 milestone, done ~111 before
 *    the 130): starve → relief → resume, now as flows rather than cliffs;
 *  - the pre-17 grammar still runs on won stone: a completed fill carries W-plat,
 *    the farm is designated (tick 80) and tended, a ramp is billed, a door and a
 *    second gate are cut and one walled back up (the infill draws stone), a span
 *    stands uncovered then is bricked into a deck, and four invalid commands
 *    reject with their constant reasons;
 *  - and SIM 19 THE WOODS: the wood wall B spends the founder's woodpile 30 → 10
 *    by tick 30; the late coppice FELL (tick 137, after every wall/roof id is
 *    minted) now trickles its 30 m³ back per felled person-day (SIM 35 covers
 *    timber too — "the wood drops where it's felled"), standsFelled 1 by ~139.
 *  - ids re-probed under the trickle (stones share nextId, so earlier laying
 *    shifted every later mint): FR 225 → 278, BS 334 → 399; the span's roofId
 *    2531 HELD (all five walls still finish before the tick-135 span is drawn).
 *
 * SIM 36 re-authored it again — THIRTEEN FOUNDERS (3 green farmhands + 10
 * untrained) and the SKILL-ERA dawn pass: founders take ids 1–13, so every
 * mint shifts again (FR 278 → 18, BS 399 → 937, the span 2531 → 2540); the
 * crew's GROOVES show in the fingerprint (hands stick to the earthwork through
 * ~tick 9 — the tick-7 milestone reads pile 23.5 with no stone yet laid — then
 * the walls fly: wood B done ~12, FR ~13, cart-bound A ~27, the HAUL stall
 * alive); the ashlar tavern's PILE stall is now LONG and legible (411/830 from
 * ~t30 on a drained pile, through the 65/80 milestones, until Q2 at 92 revives
 * it — done ~99); and the farm tends its BOUNDED two slots at the green ×9/8
 * from the word (workdays 45 by t100, 270 by t200 — exact eighths).
 */
const CANON_COMMANDS: Command[] = [
  // Q1 — THE FOUNDING QUARRY (SIM 16; trickling since SIM 35): the crew opens the
  // outcrop Low Main Post (NZ24SE109 logs sandstone from surface, rockhead 0).
  // Economics FROZEN as the render would from the bed model: ~44 m³ of post at the
  // ILO rock rate ≈ 58 person-days; generous 1.25 → 55 m³ won. Stone flows from the
  // FIRST person-day (the checkpoint credit), so the masons lay while the pit
  // deepens; the fills still outrank the digging, so the trickle pauses for them.
  { kind: 'plan_cut', tick: 1, points: [{ x: 1755, y: 1567 }, { x: 1761, y: 1567 }, { x: 1761, y: 1573 }, { x: 1755, y: 1573 }], depth: 3, workTotal: 58, stoneTotal: 55 },
  // F1 — a platform fill; W-plat stands on it once it sets (~tick 30)
  { kind: 'plan_fill', tick: 3, points: [{ x: 1970, y: 1968 }, { x: 1982, y: 1968 }, { x: 1982, y: 1980 }, { x: 1970, y: 1980 }], height: 1 },
  // A — a low sandstone wall planned tick 5, the CARRY stall's specimen. Under SIM 17 its
  // stone came up the bank at a frozen 0.6 m³/day; since SIM 39 the road is REAL and the
  // hands walk it: A's blocks are carried the ~480 m from Q1's own mouth, up an 8 m bank
  // (the boundary would freeze exactly this — the nearest dry winnable post IS the founding
  // quarry). So A is ROAD-bound its whole life even while Q1's trickle keeps the pile alive,
  // and the fingerprint now carries what a crew SPLIT between road and wall does to a
  // settlement's whole week. Light RUBBLE (SIM 18: lays 0.5 days/stone).
  { kind: 'plan_wall', tick: 5, points: [{ x: 1960, y: 2000 }, { x: 1995, y: 2000 }], height: 1, dressLevel: 'rubble', haul: { from: { x: 1758, y: 1570 }, to: { x: 1977.5, y: 2000 }, climb: 8, detour: 1, method: 'ox-cart uphill' } },
  // B — a WOOD wall: since SIM 19 timber is a COST — its ~590 posts DRAW the global
  // timber stock (TIMBER_PER_POST each), spending the founder's woodpile down from
  // SEED_TIMBER 30 to ~10 by tick 30, while sandstone A stands stalled on an empty
  // stone pile beside it. The palisade builds without STONE, not without cost. Its
  // posts set the ids of everything planned after it. (The FELL at tick 137 tops the
  // timber back up to 40 — the two sides of the wood loop in one fingerprint.)
  { kind: 'plan_wall', tick: 6, points: [{ x: 1940, y: 1980 }, { x: 1940, y: 1955 }], height: 2.5, material: 'wood' },
  // FR — a closed low ring on the gorge bank: stepped footings bill 629 stones
  // (SIM 13). A field wall is light RUBBLE (SIM 18); fed by Q1's trickle it
  // completes ~13 under SIM 36, and the word (tick 80) makes it a farm.
  { kind: 'plan_wall', tick: 10, points: [{ x: 1990, y: 1900 }, { x: 2014, y: 1900 }, { x: 2014, y: 1924 }, { x: 1990, y: 1924 }, { x: 1990, y: 1900 }], height: 0.5, dressLevel: 'rubble' },
  // BS — a plotted building (SIM 12): the doorway loop's jambs are collinear on
  // the front edge. It pends for its DRAWINGS, and is the PILE stall's specimen —
  // a tall building wants dressed ASHLAR (SIM 18), so its 830 blocks draw half
  // again as much stone AND lay twice as slow; demand outruns Q1's trickle and BS
  // halts at 410/830 (the 65/80 milestones, pile 0) until Q2's trickle (from 92)
  // creeps it back to life — done ~99 under SIM 36. "Tall structures need heavier blocks."
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
  // BS's drawings — the roof first (a thatched gable), then the trade. Since SIM 37
  // the shell builds bare and takes its words later; the tavern mints at this tick.
  // wallId RE-PROBED under SIM 39 (937 → 934): the crew now splits onto the road, so
  // fewer stones — hence fewer minted ids — stand before BS is planned at tick 12.
  { kind: 'choose_roof', tick: 20, wallId: 934, roof: 'straw' },
  { kind: 'designate', tick: 25, wallId: 934, use: 'tavern' },
  // W-plat — a wall on F1's COMPLETED platform (tick 40, after it sets ~30): the
  // survey reads effectiveGroundAt raised, so the fill is in the fingerprint.
  { kind: 'plan_wall', tick: 40, points: [{ x: 1972, y: 1974 }, { x: 1980, y: 1974 }], height: 1, dressLevel: 'rubble' },
  // FR gets the word — arable; tending begins this tick (wallId re-probed 225 → 278)
  { kind: 'designate', tick: 80, wallId: 18, use: 'farm' },
  // Q2 — THE RELIEF QUARRY: the ashlar tavern outran Q1's whole yield, so a second
  // cut relieves it — and since SIM 35 the relief TRICKLES from its first day (no
  // more waiting for holing-through): BS creeps at the 100 milestone, done ~111.
  // Starve → relief → resume, as flows.
  { kind: 'plan_cut', tick: 92, points: [{ x: 1745, y: 1567 }, { x: 1751, y: 1567 }, { x: 1751, y: 1573 }, { x: 1745, y: 1573 }], depth: 3, workTotal: 34, stoneTotal: 32 },
  // a span drawn over the finished tavern — it stands UNCOVERED (SIM 11) until the
  // word bricks it into a deck (~167). Corners rest on finished walls; roofId 2531
  // HELD under SIM 35 (probed — all five walls still finish before tick 135).
  { kind: 'plan_roof', tick: 135, points: [{ x: 2040, y: 1960 }, { x: 2048, y: 1960 }, { x: 2048, y: 1966 }, { x: 2040, y: 1966 }] },
  // FELL — a coppice cut (SIM 19): the crew, done with the pit and the walls, fells
  // a wooded cant late in the run. Economics FROZEN as the render would from the
  // tree model: ~30 trees ≈ 30 m³ of timber won for ~3 person-days' felling. Placed
  // tick 137 — AFTER every wall and the roof span are minted (≤135) so no
  // wallId/roofId shifts — and the laborers fell it through in a couple of days,
  // the timber now TRICKLING in per felled person-day (SIM 35 — the wood drops as
  // it's felled). The wood wall B already drew its posts from the founder's
  // woodpile, so this coppice tops the stock back up: SPENT and WON in one run.
  { kind: 'plan_fell', tick: 137, points: [{ x: 1900, y: 2030 }, { x: 1912, y: 2030 }, { x: 1912, y: 2042 }, { x: 1900, y: 2042 }], timberTotal: 30, workTotal: 3 },
  // gate ops (SIM 6/7/9) on finished walls: a second gate into the farm's east
  // wall, a back DOOR in the tavern; then the farm gate is taken down and the
  // masons wall it back up through the daily loop — the infill DRAWS stone (SIM 16).
  // wallIds re-probed under SIM 35 (225 → 278, 334 → 399).
  { kind: 'add_gate', tick: 140, wallId: 18, at: { x: 2014, y: 1912 } },
  { kind: 'add_gate', tick: 140, wallId: 934, at: { x: 2044, y: 1966 } },
  { kind: 'remove_gate', tick: 150, wallId: 18, at: { x: 2014, y: 1912 } },
  // the covering chosen: flat brick — the deck the laborers build (done ~167).
  // roofId RE-PROBED under SIM 39 and HELD at 2540: fixing BS's designate mints the
  // tavern Building again, so the span's id lands exactly where it did before.
  { kind: 'designate_roof', tick: 160, roofId: 2540, material: 'brick' },
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
