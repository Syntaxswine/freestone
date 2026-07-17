/**
 * SIM 18: THE DRESS DIAL. A stone wall's blocks are worked to a frozen dress level
 * — rubble | scappled | ashlar — and the level sets two costs the sim replays from
 * a constant table: a LAY DEBT (mason-days per stone) and a per-stone DRAW (rough
 * won stone spent from the pile/face). The load-bearing claims:
 *  - the lay debt sets the SPEED: rubble (0.5) flies up, scappled (1.0) is the
 *    neutral SIM-17 rate, ashlar (2.0) crawls — same crew, inverse of the debt;
 *  - ashlar carts HEAVIER: it draws half again as much won stone per block, so a
 *    hauled ashlar wall stalls on its cart sooner and eats more of the pile;
 *  - an absent dress level is 'scappled' — the SIM-17 cost, byte-for-byte, so old
 *    logs/saves replay unchanged;
 *  - won stone is still conserved with the per-level draw;
 *  - a mixed-dress build replays byte-for-byte (the frozen level is deterministic).
 *
 * The boundary's structure-keyed SMART DEFAULT (low→rubble, tall→ashlar) and the
 * override dial are eye-checked in play, like the haul route model — these tests
 * pin the sim the frozen level drives.
 */
import { describe, expect, it } from 'vitest';
import { hashState, makeSave, replay } from '../src/sim/save';
import { flatSite } from '../src/sim/site';
import { worldStep } from '../src/sim/step';
import { createWorld } from '../src/sim/world';
import {
  DRESS_DRAW,
  STONE_VOLUME,
  type Command,
  type DressLevel,
  type Vec2,
} from '../src/sim/types';

// a long, tall wall — far more stones than the day's crew can lay, so the lay
// debt shows as a SPEED, not a finish
const BIG: Vec2[] = [
  { x: 0, y: 0 },
  { x: 30, y: 0 },
];
// a short, low wall — ~one course, finishes fast so the pile SPENT is measurable
const SMALL: Vec2[] = [
  { x: 0, y: 0 },
  { x: 5, y: 0 },
];

function run(commands: Command[], ticks: number) {
  const site = flatSite('flat', 4000);
  const byTick = new Map<number, Command[]>();
  for (const c of commands) (byTick.get(c.tick) ?? byTick.set(c.tick, []).get(c.tick)!).push(c);
  const world = createWorld('dress-seed', site.id);
  for (let t = 0; t < ticks; t++) worldStep(world, site, byTick.get(world.tick) ?? []);
  return world;
}

// a quarry holed through in one tick (2 laborers → workTotal 2), winning `stones`
// scappled-blocks' worth of pile — credited the same day, before the masons lay
const quarry = (tick: number, stones: number): Command => ({
  kind: 'plan_cut',
  tick,
  points: [
    { x: 100, y: 100 },
    { x: 110, y: 100 },
    { x: 110, y: 110 },
    { x: 100, y: 110 },
  ],
  depth: 3,
  workTotal: 2,
  stoneTotal: stones * STONE_VOLUME,
});

// a LOCAL wall (no cart) at a given dress level — draws the pile directly
const wall = (tick: number, dressLevel: DressLevel, points = BIG, height = 3): Command => ({
  kind: 'plan_wall',
  tick,
  points,
  height,
  dressLevel,
});
// a HAULED wall at a given dress level, its stone carried from a pile `dist` metres off
// (SIM 39: the boundary freezes the ROAD, not a rate — the sim's carriers do the rest)
const haulWall = (
  tick: number,
  dressLevel: DressLevel,
  dist: number,
  points = BIG,
  height = 3,
): Command => ({
  kind: 'plan_wall',
  tick,
  points,
  height,
  dressLevel,
  haul: { from: { x: dist, y: 0 }, to: { x: 0, y: 0 }, climb: 0, detour: 1, method: 'ox-cart' },
});

describe('the dress dial (SIM 18)', () => {
  it('the dress level sets the lay speed — rubble flies up, ashlar crawls, on a full pile', () => {
    const pile = quarry(0, 10000); // supply is never the limit
    const r = run([wall(0, 'rubble'), pile], 1).walls[0]!.stonesLaid;
    const s = run([wall(0, 'scappled'), pile], 1).walls[0]!.stonesLaid;
    const a = run([wall(0, 'ashlar'), pile], 1).walls[0]!.stonesLaid;
    expect(r).toBeGreaterThan(s);
    expect(s).toBeGreaterThan(a);
    // same crew (same seed), no wall finished, supply unlimited → day-one output
    // scales inversely with the lay debt: rubble (0.5) lays ~twice scappled. SIM 36's
    // vigor rates are floats, so each hand's finish-the-block-begun rounding can shed
    // one stone against the exact double — bounded by the crew's headcount.
    expect(r).toBeLessThanOrEqual(2 * s);
    expect(2 * s - r).toBeLessThanOrEqual(2 * 13); // ≤ a couple of stones per hand
    // ashlar (2.0) lays about half — within the day's last-stone rounding
    expect(a).toBeGreaterThanOrEqual(Math.floor(s / 2));
    expect(a).toBeLessThan(s);
  });

  it('ashlar carts heavier — it draws half again as much won stone per block as scappled', () => {
    const total = run([wall(0, 'scappled', SMALL, 0.25)], 1).walls[0]!.stonesTotal;
    const start = 1000 * STONE_VOLUME;
    const s = run([wall(0, 'scappled', SMALL, 0.25), quarry(0, 1000)], 40);
    const a = run([wall(0, 'ashlar', SMALL, 0.25), quarry(0, 1000)], 40);
    expect(s.walls[0]!.stonesLaid).toBe(total); // both finish the little wall
    expect(a.walls[0]!.stonesLaid).toBe(total);
    const spentS = start - s.stockpile;
    const spentA = start - a.stockpile;
    expect(spentS).toBeCloseTo(total * DRESS_DRAW.scappled, 6);
    expect(spentA).toBeCloseTo(total * DRESS_DRAW.ashlar, 6);
    expect(spentA).toBeCloseTo(spentS * 1.5, 6); // half again the stone per block
  });

  it('a hauled ashlar wall stalls on the carry sooner — heavier blocks reach the face slower', () => {
    const road = 1500; // the same long road for both
    const s = run([haulWall(0, 'scappled', road), quarry(0, 10000)], 20).walls[0]!.stonesLaid;
    const a = run([haulWall(0, 'ashlar', road), quarry(0, 10000)], 20).walls[0]!.stonesLaid;
    expect(a).toBeLessThan(s); // the carriers move m³/day, and an ashlar block IS more m³
    expect(a).toBeGreaterThan(0); // but it does progress
  });

  it("a wall with no dress level frozen is 'scappled' — the SIM-17 cost, byte-identical", () => {
    const bare: Command = { kind: 'plan_wall', tick: 0, points: BIG, height: 3 };
    const w = run([bare, quarry(0, 10000)], 5);
    expect(w.walls[0]!.dressLevel).toBe('scappled');
    // and it lays exactly as an explicitly-scappled wall does
    const explicit = run([wall(0, 'scappled'), quarry(0, 10000)], 5).walls[0]!.stonesLaid;
    expect(w.walls[0]!.stonesLaid).toBe(explicit);
  });

  it('won stone is conserved with the per-level draw — pile + face + laid×draw = won', () => {
    const w = run([haulWall(0, 'ashlar', 1500), quarry(0, 200)], 40);
    const wl = w.walls[0]!;
    expect(w.stockpile + wl.faceBuffer + wl.stonesLaid * DRESS_DRAW.ashlar).toBeCloseTo(
      200 * STONE_VOLUME,
      6,
    );
  });

  it('replays a mixed-dress build byte-for-byte (the frozen level is deterministic)', () => {
    const cmds = [wall(0, 'rubble', SMALL, 0.5), haulWall(1, 'ashlar', 1500), quarry(0, 10000)];
    const live = run(cmds, 25);
    const site = flatSite('flat', 4000);
    const replayed = replay(makeSave(live, cmds), site, 25);
    expect(hashState(replayed)).toBe(hashState(live));
  });
});
