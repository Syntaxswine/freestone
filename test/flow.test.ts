/**
 * SIM 35 — THE VISIBLE FLOW. A working pays its yield AS THE WORK IS DONE (a stateless
 * checkpoint credit off workDone), not in one lump at completion. The load-bearing
 * claims these specimens pin (crew arithmetic on the SIM-36 thirteen-soul founding):
 *  - the TRICKLE EXISTS: mid-dig, the stockpile holds exactly total·min(1, k/W) — a
 *    regression back to lump-at-completion fails here first;
 *  - CONSERVATION IS EXACT: at completion the pile holds the frozen total to the last
 *    bit (strict ===, no toBeCloseTo — the checkpoint form telescopes exactly), and it
 *    never exceeds the total no matter how long the world runs after;
 *  - the flow is MONOTONE — each day adds, nothing ever refunds;
 *  - felling flows the same law (the wood drops as it's felled), while the stool's
 *    regrowth clock still starts at completion;
 *  - a MID-TRICKLE save replays byte-for-byte (the partial credit is pure state).
 */
import { describe, expect, it } from 'vitest';
import { hashState, makeSave, replay } from '../src/sim/save';
import { flatSite } from '../src/sim/site';
import { worldStep } from '../src/sim/step';
import { createWorld } from '../src/sim/world';
import type { Command, Vec2 } from '../src/sim/types';

const ring: Vec2[] = [
  { x: 100, y: 100 },
  { x: 110, y: 100 },
  { x: 110, y: 110 },
  { x: 100, y: 110 },
];

// a cut whose economics are hand-frozen: 40 m³ of stone for 100 person-days — big
// enough that the 13-hand founding crew (all assigned to dig; nothing else wants
// hands) is mid-trickle for a week
const cut = (tick: number): Command => ({
  kind: 'plan_cut',
  tick,
  points: ring,
  depth: 4,
  workTotal: 100,
  stoneTotal: 40,
});

function run(commands: Command[], ticks: number) {
  const site = flatSite('flat', 4000);
  const byTick = new Map<number, Command[]>();
  for (const c of commands) (byTick.get(c.tick) ?? byTick.set(c.tick, []).get(c.tick)!).push(c);
  const world = createWorld('flow-seed', site.id);
  for (let t = 0; t < ticks; t++) worldStep(world, site, byTick.get(world.tick) ?? []);
  return world;
}

describe('the visible flow (SIM 35) — yield per person-day, exact at completion', () => {
  it('trickles stone from the first day: mid-dig the pile holds total·min(1, k/W) exactly', () => {
    // all 13 founders dig (no farms, no walls, nothing else wants hands) — 13 workdays day one
    const w = run([cut(0)], 1);
    const c = w.cuts[0]!;
    expect(c.workDone).toBe(13);
    expect(w.stockpile).toBe(40 * Math.min(1, 13 / 100)); // strict — the telescoped checkpoint value
    expect(w.stockpile).toBeGreaterThan(0); // the WIN cliff is dead: stone exists before completion
  });

  it('conserves exactly: completion lands the pile on the frozen total to the last bit, and never past it', () => {
    let previous = 0;
    const site = flatSite('flat', 4000);
    const world = createWorld('flow-seed', site.id);
    const byTick = new Map<number, Command[]>([[0, [cut(0)]]]);
    for (let t = 0; t < 12; t++) {
      worldStep(world, site, byTick.get(world.tick) ?? []);
      expect(world.stockpile).toBeGreaterThanOrEqual(previous); // monotone — nothing refunds
      expect(world.stockpile).toBeLessThanOrEqual(40); // never exceeds the frozen total
      previous = world.stockpile;
    }
    expect(world.cuts[0]!.stoneWon).toBe(true); // 100 workdays at 13/day — done inside the run
    expect(world.stockpile).toBe(40); // strict equality — the checkpoint form is exact, not close
    expect(world.events.filter((e) => e.kind === 'stone_won')).toHaveLength(1); // chronicle unchanged
  });

  it('fells the same law: timber flows as the cant is cut, exact at completion, regrowth from completion', () => {
    // NOTE the exactness law's honest boundary: the checkpoint LEDGER telescopes
    // exactly from zero (the stone specimens above pin it strictly, pile base 0) —
    // but timber accumulates onto the founders' NON-ZERO woodpile, so each add is
    // correctly-rounded and the running sum carries ulp-dust. Deterministic, bounded,
    // and identical on replay — asserted to 9 places, not to the bit.
    const fell: Command = { kind: 'plan_fell', tick: 0, points: ring, timberTotal: 9, workTotal: 30 };
    const seedTimber = run([], 0).timber; // the founders' woodpile, untouched by the fell
    const mid = run([fell], 1); // 13 felled person-days of 30
    expect(mid.timber).toBeCloseTo(seedTimber + 9 * Math.min(1, 13 / 30), 9);
    const done = run([fell], 6);
    expect(done.timber).toBeCloseTo(seedTimber + 9, 9); // exact-total, over the seeded base
    expect(done.stands[0]!.felling).toBe(false);
    expect(done.stands[0]!.feltTick).toBeGreaterThan(0); // the stool's clock starts at completion
    expect(done.events.filter((e) => e.kind === 'timber_won')).toHaveLength(1);
  });

  it('replays a MID-TRICKLE save byte-for-byte (partial credit is pure state)', () => {
    const cmds = [cut(0)];
    const live = run(cmds, 3); // 39 of 100 person-days in — the pile is partial
    expect(live.cuts[0]!.stoneWon).toBe(false);
    const site = flatSite('flat', 4000);
    const replayed = replay(makeSave(live, cmds), site, 3);
    expect(hashState(replayed)).toBe(hashState(live));
  });
});
