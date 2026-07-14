/**
 * SIM 17: THE HAUL. Won stone no longer teleports from pile to wall — each STONE
 * wall carries a face buffer that the carts meter into at a frozen haulRate, and
 * the masons draw the FACE, not the pile. The load-bearing claims:
 *  - a low haulRate THROTTLES the build: a wall stalls on the CART even while the
 *    pile is full (the honest carriage stall the bottleneck line names);
 *  - won stone is conserved — pile + every face + laid = total won, always;
 *  - HAUL never hauls past a wall's need (no stone stranded at a finished face);
 *  - the cart can only move stone that has been WON (haul is pile-capped);
 *  - a 'local' wall (haulRate null) draws the pile DIRECTLY — the SIM-16 path,
 *    so its face never fills; a timber wall ignores the cart entirely;
 *  - the frozen rate is deterministic: a hauled build replays byte-for-byte.
 *
 * These shape the mechanism on a flat site, where a wall's stone demand is a
 * known, modest number (the boundary's real route model is eye-checked in play).
 */
import { describe, expect, it } from 'vitest';
import { hashState, makeSave, replay } from '../src/sim/save';
import { flatSite } from '../src/sim/site';
import { worldStep } from '../src/sim/step';
import { createWorld } from '../src/sim/world';
import { STONE_VOLUME, type Command, type Vec2 } from '../src/sim/types';

// a short, low wall — a known, modest stone demand on flat ground (one course)
const WALL: Vec2[] = [
  { x: 0, y: 0 },
  { x: 5, y: 0 },
];

function run(commands: Command[], ticks: number) {
  const site = flatSite('flat', 4000);
  const byTick = new Map<number, Command[]>();
  for (const c of commands) (byTick.get(c.tick) ?? byTick.set(c.tick, []).get(c.tick)!).push(c);
  const world = createWorld('haul-seed', site.id);
  for (let t = 0; t < ticks; t++) worldStep(world, site, byTick.get(world.tick) ?? []);
  return world;
}

// a quarry whose economics are hand-frozen to win exactly `stones` ashlars' worth
// of stone, holed through in one tick (2 laborers → workTotal 2)
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

// a LOCAL wall (no cart) — draws the pile directly, exactly as in SIM 16
const wall = (tick: number): Command => ({ kind: 'plan_wall', tick, points: WALL, height: 0.25 });
// a HAULED wall — the cart meters `haulRate` m³/day to its face
const haulWall = (tick: number, haulRate: number): Command => ({
  kind: 'plan_wall',
  tick,
  points: WALL,
  height: 0.25,
  haulRate,
  method: 'ox-cart',
});

describe('the haul (SIM 17)', () => {
  it('a low haul rate throttles the build — the wall stalls on the CART, full pile or no', () => {
    // a full pile (100 ashlars won), but the cart delivers only ~1.5 blocks/day
    const w = run([haulWall(0, 0.05), quarry(0, 100)], 3);
    const wl = w.walls[0]!;
    expect(w.stockpile).toBeGreaterThan(3); // the pile is barely touched — supply is not the limit
    expect(wl.stonesLaid).toBeGreaterThan(0); // the cart delivered SOME
    expect(wl.stonesLaid).toBeLessThan(wl.stonesTotal); // nowhere near done...
    expect(wl.stonesLaid).toBeLessThanOrEqual(6); // ...though the masons could lay all ~11 in a day
  });

  it('a hauled wall finishes over many days — the face fills and the masons draw it', () => {
    const total = run([wall(0)], 1).walls[0]!.stonesTotal; // probe the demand
    const w = run([haulWall(0, 0.05), quarry(0, 100)], 60); // plenty of days
    const wl = w.walls[0]!;
    expect(wl.stonesLaid).toBe(total); // it DOES finish, just slowly
    expect(w.events.some((e) => e.kind === 'wall_complete')).toBe(true);
    // conservation: every m³ won is in the pile, at the face, or laid in the wall
    expect(w.stockpile + wl.faceBuffer).toBeCloseTo((100 - total) * STONE_VOLUME, 6);
    expect(wl.faceBuffer).toBeLessThan(STONE_VOLUME); // no more than a block stranded at the face
  });

  it('the cart can only move stone that has been WON — haul is capped by the pile', () => {
    // a fast cart (huge rate) but a near-empty pile: haul is pile-limited
    const w = run([haulWall(0, 100), quarry(0, 2)], 4);
    const wl = w.walls[0]!;
    expect(wl.stonesLaid).toBeLessThanOrEqual(2); // could not lay more than the 2 won
    expect(wl.stonesLaid).toBeLessThan(wl.stonesTotal); // and stalls, pile and face both dry
    // conservation again: won (2 blocks) = pile + face + laid
    expect(w.stockpile + wl.faceBuffer + wl.stonesLaid * STONE_VOLUME).toBeCloseTo(
      2 * STONE_VOLUME,
      6,
    );
  });

  it("a 'local' wall draws the pile directly — the face never fills (the SIM-16 path)", () => {
    const w = run([wall(0), quarry(0, 5)], 20);
    const wl = w.walls[0]!;
    expect(wl.haulRate).toBeNull(); // no cart
    expect(wl.faceBuffer).toBe(0); // never hauled — drew the pile
    expect(w.stones).toHaveLength(5); // spent 5 blocks from the pile (as consumption.test proves)
    expect(w.stockpile).toBeLessThan(STONE_VOLUME); // drawn down under a block, then stalled
  });

  it('a timber wall ignores the cart — builds free even with a haul rate set', () => {
    const timber: Command = {
      kind: 'plan_wall',
      tick: 0,
      points: WALL,
      height: 0.25,
      material: 'wood',
      haulRate: 0.01, // a crawling rate — irrelevant to timber
    };
    const w = run([timber], 20);
    const wl = w.walls[0]!;
    expect(w.stockpile).toBe(0); // drew no stone
    expect(wl.faceBuffer).toBe(0); // and never hauled
    expect(w.stones).toHaveLength(wl.stonesTotal); // yet fully built
  });

  it('replays a hauled build byte-for-byte (the frozen rate is deterministic)', () => {
    const cmds = [haulWall(0, 0.05), quarry(0, 100)];
    const live = run(cmds, 30);
    const site = flatSite('flat', 4000);
    const replayed = replay(makeSave(live, cmds), site, 30);
    expect(hashState(replayed)).toBe(hashState(live));
  });
});
