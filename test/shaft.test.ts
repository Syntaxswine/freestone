/**
 * SIM 15: the shaft-and-pump (the method ladder's fourth + last rung). The load-bearing claims:
 *  - a plan_shaft FREEZES its economics (depth/work/stone, the pump tax already baked in at the
 *    command boundary) into the log; the sim core never touches beds or the water table;
 *  - idle laborers sink the oldest shaft one person-day at a time, and the day it is worked
 *    through the dewatered stone is credited to the stockpile — ONCE;
 *  - replay reproduces it byte-for-byte;
 *  - a malformed shaft is chronicled, not crashed;
 *  - a world with no shaft is unchanged (guarded by the baseline instrument, not here).
 */
import { describe, expect, it } from 'vitest';
import { hashState, makeSave, replay } from '../src/sim/save';
import { flatSite } from '../src/sim/site';
import { worldStep } from '../src/sim/step';
import { createWorld } from '../src/sim/world';
import type { Command, Vec2 } from '../src/sim/types';

const at: Vec2 = { x: 120, y: 120 };

function run(commands: Command[], ticks: number) {
  const site = flatSite('flat', 4000);
  const byTick = new Map<number, Command[]>();
  for (const c of commands) (byTick.get(c.tick) ?? byTick.set(c.tick, []).get(c.tick)!).push(c);
  const world = createWorld('shaft-seed', site.id);
  for (let t = 0; t < ticks; t++) worldStep(world, site, byTick.get(world.tick) ?? []);
  return world;
}

describe('the shaft-and-pump in the sim (frozen, self-contained)', () => {
  const shaft = (tick: number): Command => ({
    kind: 'plan_shaft',
    tick,
    at,
    depth: 40, // deep — past the water table (it pumps)
    workTotal: 18,
    stoneTotal: 40,
  });

  it('plans a shaft that freezes its economics', () => {
    const w = run([shaft(0)], 1);
    expect(w.shafts).toHaveLength(1);
    expect(w.shafts[0]!.depth).toBe(40);
    expect(w.shafts[0]!.workTotal).toBeCloseTo(18, 5);
    expect(w.shafts[0]!.stoneTotal).toBeCloseTo(40, 5);
    expect(w.events.some((e) => e.kind === 'shaft_planned')).toBe(true);
  });

  it('sinks + pumps a person-day per idle laborer and credits the dewatered stone once', () => {
    const w = run([shaft(0)], 50);
    const s = w.shafts[0]!;
    expect(s.workDone).toBeGreaterThanOrEqual(s.workTotal);
    expect(s.stoneWon).toBe(true);
    expect(w.stockpile).toBeCloseTo(40, 5);
    // credited EXACTLY once — the stockpile does not keep climbing after it is worked out
    const later = run([shaft(0)], 90);
    expect(later.stockpile).toBeCloseTo(40, 5);
    expect(later.events.filter((e) => e.kind === 'shaft_stone_won')).toHaveLength(1);
  });

  it('replays a shaft byte-for-byte', () => {
    const cmds = [shaft(0)];
    const ticks = 50;
    const live = run(cmds, ticks);
    const site = flatSite('flat', 4000);
    const replayed = replay(makeSave(live, cmds), site, ticks);
    expect(hashState(replayed)).toBe(hashState(live));
  });

  it('rejects a malformed shaft, chronicled not crashed', () => {
    const bad = run(
      [
        { kind: 'plan_shaft', tick: 0, at, depth: 0, workTotal: 1, stoneTotal: 0 }, // no depth
        { kind: 'plan_shaft', tick: 0, at, depth: 40, workTotal: -1, stoneTotal: 0 }, // negative work
        { kind: 'plan_shaft', tick: 0, at: { x: 0, y: Infinity }, depth: 40, workTotal: 1, stoneTotal: 0 }, // bad mouth
      ],
      1,
    );
    expect(bad.shafts).toHaveLength(0);
    expect(bad.events.filter((e) => e.kind === 'command_rejected')).toHaveLength(3);
  });
});
