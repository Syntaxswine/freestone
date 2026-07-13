/**
 * SIM 15: the adit. The load-bearing claims:
 *  - aditEconomics drives at the portal's GRADE through the strata: work is
 *    material-aware, stone is the generous inversion, and it needs the SURFACE
 *    (heightAt) to find how deep the grade lies at each point;
 *  - it is SELF-DRAINING — no water gate — so it wins post under cover that a
 *    shallow open cut could never reach;
 *  - a plan_adit FREEZES that economics into the log (the sim core never touches
 *    beds, heights or the water table), and replay reproduces it byte-for-byte;
 *  - idle laborers drive the oldest adit one person-day at a time, and the day it
 *    is holed through the dewatered stone is credited to the stockpile — once;
 *  - a world with no adit is unchanged (guarded by the baseline instrument, not here).
 */
import { describe, expect, it } from 'vitest';
import {
  aditEconomics,
  bedModelFromJson,
  DIG_RATE,
  STONE_YIELD,
  type BedsJson,
} from '../src/sim/beds';
import { hashState, makeSave, replay } from '../src/sim/save';
import { flatSite } from '../src/sim/site';
import { worldStep } from '../src/sim/step';
import { createWorld } from '../src/sim/world';
import type { Command, Vec2 } from '../src/sim/types';

// a synthetic bed model: 5 m of drift over solid sandstone, everywhere
const beds = bedModelFromJson({
  site: 'flat',
  frame: { originE: 0, originN: 0 },
  materials: [],
  holes: [
    {
      ref: 'X',
      x: 0,
      y: 0,
      rockhead: 5,
      totalDepth: 60,
      column: [
        { m: 'drift', top: 0, base: 5 },
        { m: 'sandstone', top: 5, base: 60 },
      ],
    },
  ],
  seams: {},
} as BedsJson);

const flat100 = (): number => 100; // surface at 100 m AOD everywhere
const portal: Vec2 = { x: 0, y: 0 };
const head: Vec2 = { x: 20, y: 0 }; // a 20 m drive
const SECTION = 6; // must match ADIT_SECTION in beds.ts

function run(commands: Command[], ticks: number) {
  const site = flatSite('flat', 4000);
  const byTick = new Map<number, Command[]>();
  for (const c of commands) (byTick.get(c.tick) ?? byTick.set(c.tick, []).get(c.tick)!).push(c);
  const world = createWorld('adit-seed', site.id);
  for (let t = 0; t < ticks; t++) worldStep(world, site, byTick.get(world.tick) ?? []);
  return world;
}

describe('adit economics (self-draining, frozen)', () => {
  it('drives through the material at grade, material-aware', () => {
    // grade 95 → the floor lies 5 m below the 100 m surface → the sandstone top: the
    // drive cuts post its whole length
    const econ = aditEconomics(beds, flat100, portal, head, 95);
    expect(econ.length).toBeCloseTo(20, 5);
    const vol = SECTION * 20; // section × length
    expect(econ.workDays).toBeCloseTo(vol / DIG_RATE.sandstone, 4);
    expect(econ.stone).toBeCloseTo(vol * STONE_YIELD.sandstone, 4);
    expect(econ.stone).toBeGreaterThan(vol); // generous inversion — production > removal
  });

  it("is self-draining: wins post deep under cover an open cut couldn't reach", () => {
    // grade 60 → 40 m below the surface. A 12 m open cut could never reach it; the
    // adit drives to it and wins the post, with no water gate.
    const deep = aditEconomics(beds, flat100, portal, head, 60);
    expect(deep.stone).toBeGreaterThan(0);
    // and a drive that stays in the drift (grade just under the surface) wins none
    const inDrift = aditEconomics(beds, flat100, portal, head, 98); // 2 m down → drift
    expect(inDrift.stone).toBe(0);
  });
});

describe('the adit in the sim', () => {
  const econ = aditEconomics(beds, flat100, portal, head, 95);
  const adit = (tick: number): Command => ({
    kind: 'plan_adit',
    tick,
    portal,
    head,
    grade: 95,
    workTotal: econ.workDays,
    stoneTotal: econ.stone,
  });

  it('plans an adit that freezes the bed economics', () => {
    const w = run([adit(0)], 1);
    expect(w.adits).toHaveLength(1);
    expect(w.adits[0]!.workTotal).toBeCloseTo(econ.workDays, 5);
    expect(w.adits[0]!.stoneTotal).toBeCloseTo(econ.stone, 5);
    expect(w.adits[0]!.grade).toBe(95);
    expect(w.events.some((e) => e.kind === 'adit_planned')).toBe(true);
  });

  it('drives at one person-day per idle laborer and credits stone once, on completion', () => {
    const ticks = Math.ceil(econ.workDays / 2) + 2; // 2 laborers → 2 person-days/tick
    const w = run([adit(0)], ticks);
    const a = w.adits[0]!;
    expect(a.workDone).toBeGreaterThanOrEqual(a.workTotal);
    expect(a.stoneWon).toBe(true);
    expect(w.stockpile).toBeCloseTo(econ.stone, 5);
    // credited exactly once — the stockpile does not keep climbing after completion
    const later = run([adit(0)], ticks + 20);
    expect(later.stockpile).toBeCloseTo(econ.stone, 5);
    expect(later.events.filter((e) => e.kind === 'adit_stone_won')).toHaveLength(1);
  });

  it('an adit is driven before a field is tended', () => {
    // a farm plus an adit: idle laborers spend the day driving, so the farm gathers
    // no workdays while the heading is unfinished. Founders take ids 1–4 ⇒ first wall id 5.
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
    // the ring needs stone to build; a founding quarry wins it at tick 0 (SIM 16)
    const seedQuarry: Command = { kind: 'plan_cut', tick: 0, points: [{ x: 300, y: 300 }, { x: 306, y: 300 }, { x: 306, y: 306 }, { x: 300, y: 306 }], depth: 1, workTotal: 2, stoneTotal: 1e6 };
    const w = run([farmRing, seedQuarry, { kind: 'designate', tick: 40, wallId: 5, use: 'farm' }, adit(45)], 70);
    const noAdit = run([farmRing, seedQuarry, { kind: 'designate', tick: 40, wallId: 5, use: 'farm' }], 70);
    expect(w.farms[0]!.workdays).toBeLessThan(noAdit.farms[0]!.workdays);
  });

  it('replays an adit byte-for-byte', () => {
    const cmds = [adit(0)];
    const ticks = Math.ceil(econ.workDays / 2) + 5;
    const live = run(cmds, ticks);
    const site = flatSite('flat', 4000);
    const replayed = replay(makeSave(live, cmds), site, ticks);
    expect(hashState(replayed)).toBe(hashState(live));
  });

  it('rejects a malformed adit, chronicled not crashed', () => {
    const bad = run(
      [
        { kind: 'plan_adit', tick: 0, portal, head: portal, grade: 95, workTotal: 1, stoneTotal: 0 }, // zero-length
        { kind: 'plan_adit', tick: 0, portal, head, grade: 95, workTotal: -1, stoneTotal: 0 }, // negative work
        { kind: 'plan_adit', tick: 0, portal, head, grade: NaN, workTotal: 1, stoneTotal: 0 }, // bad grade
      ],
      1,
    );
    expect(bad.adits).toHaveLength(0);
    expect(bad.events.filter((e) => e.kind === 'command_rejected')).toHaveLength(3);
  });
});
