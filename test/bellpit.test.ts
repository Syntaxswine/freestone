/**
 * SIM 15: the bell pit (the method ladder's third rung). The load-bearing claims:
 *  - a plan_bell_pit FREEZES its economics (depth/work/stone, read from the water table + bed
 *    model at the command boundary) into the log; the sim core never touches beds or water;
 *  - idle laborers sink the oldest pit one person-day at a time, and the day it is worked
 *    through the dry stone is credited to the stockpile — ONCE;
 *  - replay reproduces it byte-for-byte;
 *  - a malformed pit is chronicled, not crashed;
 *  - a world with no bell pit is unchanged (guarded by the baseline instrument, not here).
 */
import { describe, expect, it } from 'vitest';
import { hashState, makeSave, replay } from '../src/sim/save';
import { flatSite } from '../src/sim/site';
import { worldStep } from '../src/sim/step';
import { createWorld } from '../src/sim/world';
import type { Command, Vec2 } from '../src/sim/types';

const at: Vec2 = { x: 100, y: 100 };

function run(commands: Command[], ticks: number) {
  const site = flatSite('flat', 4000);
  const byTick = new Map<number, Command[]>();
  for (const c of commands) (byTick.get(c.tick) ?? byTick.set(c.tick, []).get(c.tick)!).push(c);
  const world = createWorld('bell-seed', site.id);
  for (let t = 0; t < ticks; t++) worldStep(world, site, byTick.get(world.tick) ?? []);
  return world;
}

describe('the bell pit in the sim (frozen, self-contained)', () => {
  const bell = (tick: number): Command => ({
    kind: 'plan_bell_pit',
    tick,
    at,
    depth: 20, // deeper than an open cut's 12 m — the bell pit's niche
    workTotal: 12,
    stoneTotal: 30,
  });

  it('plans a bell pit that freezes its economics', () => {
    const w = run([bell(0)], 1);
    expect(w.bellPits).toHaveLength(1);
    expect(w.bellPits[0]!.depth).toBe(20);
    expect(w.bellPits[0]!.workTotal).toBeCloseTo(12, 5);
    expect(w.bellPits[0]!.stoneTotal).toBeCloseTo(30, 5);
    expect(w.events.some((e) => e.kind === 'bell_pit_planned')).toBe(true);
  });

  it('sinks a person-day per idle laborer and credits the dry stone once, on working-out', () => {
    // driven to completion (generous ticks — founders sink it); the pit is worked out
    const w = run([bell(0)], 40);
    const b = w.bellPits[0]!;
    expect(b.workDone).toBeGreaterThanOrEqual(b.workTotal);
    expect(b.stoneWon).toBe(true);
    expect(w.stockpile).toBeCloseTo(30, 5);
    // credited EXACTLY once — the stockpile does not keep climbing after it is worked out
    const later = run([bell(0)], 80);
    expect(later.stockpile).toBeCloseTo(30, 5);
    expect(later.events.filter((e) => e.kind === 'bell_pit_stone_won')).toHaveLength(1);
  });

  it('replays a bell pit byte-for-byte', () => {
    const cmds = [bell(0)];
    const ticks = 40;
    const live = run(cmds, ticks);
    const site = flatSite('flat', 4000);
    const replayed = replay(makeSave(live, cmds), site, ticks);
    expect(hashState(replayed)).toBe(hashState(live));
  });

  it('rejects a malformed bell pit, chronicled not crashed', () => {
    const bad = run(
      [
        { kind: 'plan_bell_pit', tick: 0, at, depth: 0, workTotal: 1, stoneTotal: 0 }, // no depth
        { kind: 'plan_bell_pit', tick: 0, at, depth: 20, workTotal: -1, stoneTotal: 0 }, // negative work
        { kind: 'plan_bell_pit', tick: 0, at: { x: NaN, y: 0 }, depth: 20, workTotal: 1, stoneTotal: 0 }, // bad mouth
      ],
      1,
    );
    expect(bad.bellPits).toHaveLength(0);
    expect(bad.events.filter((e) => e.kind === 'command_rejected')).toHaveLength(3);
  });
});
