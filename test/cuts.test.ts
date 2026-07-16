/**
 * SIM 14: the quarry. The load-bearing claims:
 *  - cutEconomics reads the strata: work is MATERIAL-AWARE (sandstone ~1/6 the
 *    pace of drift) and stone yield is the generous inversion (> the volume
 *    removed) — production exceeds removal, from the verified ILO ladder;
 *  - a plan_cut FREEZES that economics into the log (the sim core never touches
 *    the bed model), and replay reproduces it byte-for-byte;
 *  - idle laborers dig the oldest cut one person-day at a time, and the day the
 *    pit is dug out the stone is credited to the stockpile — once;
 *  - a quarry outranks field-work but not fills, and a world with no quarry is
 *    unchanged (guarded by the baseline instrument, not here).
 */
import { describe, expect, it } from 'vitest';
import {
  bedModelFromJson,
  cutEconomics,
  DIG_RATE,
  STONE_YIELD,
  type BedsJson,
} from '../src/sim/beds';
import { hashState, makeSave, replay } from '../src/sim/save';
import { flatSite } from '../src/sim/site';
import { worldStep } from '../src/sim/step';
import { createWorld } from '../src/sim/world';
import type { Command, Vec2 } from '../src/sim/types';

const RING: Vec2[] = [
  { x: 100, y: 100 },
  { x: 110, y: 100 },
  { x: 110, y: 110 },
  { x: 100, y: 110 },
]; // area 100 m²

// a synthetic bed model: 4 m of drift over solid sandstone, everywhere
const beds = bedModelFromJson({
  site: 'flat',
  frame: { originE: 0, originN: 0 },
  materials: [],
  holes: [
    {
      ref: 'X',
      x: 0,
      y: 0,
      rockhead: 4,
      totalDepth: 50,
      column: [
        { m: 'drift', top: 0, base: 4 },
        { m: 'sandstone', top: 4, base: 50 },
      ],
    },
  ],
  seams: {},
} as BedsJson);

function run(commands: Command[], ticks: number) {
  const site = flatSite('flat', 4000);
  const byTick = new Map<number, Command[]>();
  for (const c of commands) (byTick.get(c.tick) ?? byTick.set(c.tick, []).get(c.tick)!).push(c);
  const world = createWorld('quarry-seed', site.id);
  for (let t = 0; t < ticks; t++) worldStep(world, site, byTick.get(world.tick) ?? []);
  return world;
}

describe('cut economics (bed-model derived, frozen)', () => {
  it('is material-aware: a deep post cut costs far more than drift alone', () => {
    const area = 100;
    const drift = cutEconomics(beds, 105, 105, 4, area); // just the 4 m of drift
    const deep = cutEconomics(beds, 105, 105, 10, area); // 4 m drift + 6 m post
    // drift: 4·100 / 4.0 = 100 person-days, no stone
    expect(drift.workDays).toBeCloseTo((4 * area) / DIG_RATE.drift, 5);
    expect(drift.stone).toBe(0);
    // deep adds 6 m of sandstone at the ROCK rate — a big jump in work
    expect(deep.workDays).toBeCloseTo(
      (4 * area) / DIG_RATE.drift + (6 * area) / DIG_RATE.sandstone,
      5,
    );
    expect(deep.workDays).toBeGreaterThan(drift.workDays * 5); // rock dominates
  });

  it('yields more building stone than the rock removed (the generous inversion)', () => {
    const area = 100;
    const depth = 10; // 6 m of it is sandstone
    const { stone } = cutEconomics(beds, 105, 105, depth, area);
    const sandstoneRemoved = 6 * area; // m³ of post actually dug out
    expect(stone).toBeCloseTo(sandstoneRemoved * STONE_YIELD.sandstone, 5);
    expect(stone).toBeGreaterThan(sandstoneRemoved); // production > removal
  });

  it('assumes the deepest bed continues below the log', () => {
    const shallow = cutEconomics(beds, 105, 105, 50, 100); // to the logged base
    const deeper = cutEconomics(beds, 105, 105, 60, 100); // 10 m past it
    expect(deeper.stone).toBeGreaterThan(shallow.stone); // more post assumed
  });
});

describe('the quarry in the sim', () => {
  const area = 100;
  const depth = 10;
  const econ = cutEconomics(beds, 105, 105, depth, area);
  const cut = (tick: number): Command => ({
    kind: 'plan_cut',
    tick,
    points: RING,
    depth,
    workTotal: econ.workDays,
    stoneTotal: econ.stone,
  });

  it('plans a cut that freezes the bed economics', () => {
    const w = run([cut(0)], 1);
    expect(w.cuts).toHaveLength(1);
    expect(w.cuts[0]!.workTotal).toBeCloseTo(econ.workDays, 5);
    expect(w.cuts[0]!.stoneTotal).toBeCloseTo(econ.stone, 5);
    expect(w.cuts[0]!.volumeTotal).toBeCloseTo(area * depth, 5); // sim-computed
    expect(w.events.some((e) => e.kind === 'cut_planned')).toBe(true);
  });

  it('digs at one person-day per idle laborer and credits stone once, on completion', () => {
    // 2 laborers dig 2 person-days/tick; workTotal person-days → ceil/2 ticks
    const ticks = Math.ceil(econ.workDays / 2) + 2;
    const w = run([cut(0)], ticks);
    const c = w.cuts[0]!;
    expect(c.workDone).toBeGreaterThanOrEqual(c.workTotal);
    expect(c.stoneWon).toBe(true);
    expect(w.stockpile).toBeCloseTo(econ.stone, 5);
    // credited exactly once — stockpile does not keep climbing after completion
    const later = run([cut(0)], ticks + 20);
    expect(later.stockpile).toBeCloseTo(econ.stone, 5);
    expect(later.events.filter((e) => e.kind === 'stone_won')).toHaveLength(1);
  });

  it('a quarry draws the untrained hands — and costs the farm nothing (SIM 36)', () => {
    // a farm plus a later quarry: the farm's demand is BOUNDED (its slots, held by the
    // green farmhands in their groove), so the untrained crew digs the pit while the
    // tending holds — the quarry-before-fields law survives as the unskilled ladder,
    // and the field is never the poorer for the digging.
    const farmRing: Command = {
      kind: 'plan_wall',
      tick: 0,
      points: [
        { x: 200, y: 200 },
        { x: 224, y: 200 },
        { x: 224, y: 224 },
        { x: 200, y: 224 },
        { x: 200, y: 201.5 },
      ],
      height: 0.5,
    };
    // the ring needs stone to build; a founding quarry wins it at tick 0 (SIM 16),
    // so the ring completes and pends; designate it a farm, then open a LATER
    // quarry. The 13 founders take ids 1–13, so the first wall is id 14.
    const seedQuarry: Command = { kind: 'plan_cut', tick: 0, points: [{ x: 300, y: 300 }, { x: 306, y: 300 }, { x: 306, y: 306 }, { x: 300, y: 306 }], depth: 1, workTotal: 2, stoneTotal: 1e6 };
    const w = run(
      [farmRing, seedQuarry, { kind: 'designate', tick: 40, wallId: 14, use: 'farm' }, cut(45)],
      70,
    );
    const noQuarry = run([farmRing, seedQuarry, { kind: 'designate', tick: 40, wallId: 14, use: 'farm' }], 70);
    expect(w.cuts[1]!.workDone).toBeGreaterThan(0); // the pit was dug…
    expect(w.farms[0]!.workdays).toBeCloseTo(noQuarry.farms[0]!.workdays, 9); // …at no cost to the field
  });

  it('replays a quarry byte-for-byte', () => {
    const cmds = [cut(0)];
    const ticks = Math.ceil(econ.workDays / 2) + 5;
    const live = run(cmds, ticks);
    const site = flatSite('flat', 4000);
    const save = makeSave(live, cmds);
    const replayed = replay(save, site, ticks);
    expect(hashState(replayed)).toBe(hashState(live));
  });

  it('rejects a malformed quarry, chronicled not crashed', () => {
    const bad = run(
      [
        { kind: 'plan_cut', tick: 0, points: RING, depth: 0, workTotal: 1, stoneTotal: 0 },
        { kind: 'plan_cut', tick: 0, points: RING, depth: 3, workTotal: -1, stoneTotal: 0 },
        { kind: 'plan_cut', tick: 0, points: [{ x: 0, y: 0 }], depth: 3, workTotal: 1, stoneTotal: 0 },
      ],
      1,
    );
    expect(bad.cuts).toHaveLength(0);
    expect(bad.events.filter((e) => e.kind === 'command_rejected')).toHaveLength(3);
  });
});
