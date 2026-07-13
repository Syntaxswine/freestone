/**
 * SIM 16: THE CONSUMPTION LOOP. Masonry now DRAWS the stockpile — the standing
 * M2 economy the whole mining arc was for. The load-bearing claims:
 *  - a mason lays NOTHING while the pile is dry: work waits on won stone;
 *  - each ashlar draws STONE_VOLUME (its own dressed m³), so a lump of won stone
 *    buys exactly floor(stone / STONE_VOLUME) courses of progress, no more;
 *  - a wall STALLS mid-build when the pile empties, then RESUMES when a fresh
 *    quarry lands — the honest starve-and-relief the sixth mark dreamed of;
 *  - the draw is deterministic: a consumption run replays byte-for-byte.
 *
 * A world with no quarry and no wall is unchanged (guarded by the baseline
 * instrument, not here). These tests SHAPE the mechanism on a flat site, where a
 * wall's stone demand is a known, modest number.
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
  const world = createWorld('consume-seed', site.id);
  for (let t = 0; t < ticks; t++) worldStep(world, site, byTick.get(world.tick) ?? []);
  return world;
}

// a quarry whose economics are hand-frozen to win exactly `stones` ashlars'
// worth of stone, holed through in one tick (2 laborers → workTotal 2)
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

const wall = (tick: number): Command => ({ kind: 'plan_wall', tick, points: WALL, height: 0.25 });

describe('the consumption loop (SIM 16)', () => {
  it('lays nothing while the stockpile is dry — the masons wait on won stone', () => {
    const w = run([wall(0)], 20);
    expect(w.stockpile).toBe(0);
    expect(w.stones).toHaveLength(0);
    expect(w.walls[0]!.stonesLaid).toBe(0);
    expect(w.walls[0]!.stonesTotal).toBeGreaterThan(0); // there IS work waiting
    expect(w.events.some((e) => e.kind === 'stone_laid')).toBe(false);
  });

  it('a lump of won stone buys exactly floor(stone / STONE_VOLUME) stones, then stalls', () => {
    // win 5 ashlars' worth against a wall that wants more (~11 on flat ground)
    const w = run([wall(0), quarry(0, 5)], 20);
    expect(w.walls[0]!.stonesTotal).toBeGreaterThan(5); // demand exceeds supply
    expect(w.stones).toHaveLength(5); // spent the pile exactly — no borrowed stone
    expect(w.stockpile).toBeLessThan(STONE_VOLUME); // drawn down under one block
    expect(w.walls[0]!.stonesLaid).toBe(5); // stalled mid-build
    expect(w.events.some((e) => e.kind === 'wall_complete')).toBe(false);
  });

  it('stalls mid-build, then RESUMES when a fresh quarry lands (starve → relief)', () => {
    const total = run([wall(0)], 1).walls[0]!.stonesTotal; // probe the demand
    // the first quarry underfeeds (the wall stalls); a later quarry more than covers
    const w = run([wall(0), quarry(0, 5), quarry(10, total)], 40);
    expect(w.walls[0]!.stonesLaid).toBe(total); // the wall finished
    expect(w.events.some((e) => e.kind === 'wall_complete')).toBe(true);
    // it spent exactly `total` blocks; the surplus (5 + total − total = 5) remains
    expect(w.stockpile).toBeCloseTo(5 * STONE_VOLUME, 6);
  });

  it('a timber wall builds with a dry stockpile — the WOODS are free, not yet a cost', () => {
    const woodWall: Command = { kind: 'plan_wall', tick: 0, points: WALL, height: 0.25, material: 'wood' };
    const w = run([woodWall], 20);
    expect(w.stockpile).toBe(0); // drew no stone
    expect(w.stones).toHaveLength(w.walls[0]!.stonesTotal); // yet fully built
    expect(w.events.some((e) => e.kind === 'wall_complete')).toBe(true);
  });

  it('replays a consumption run byte-for-byte (the new draw is deterministic)', () => {
    const cmds = [wall(0), quarry(0, 5), quarry(10, 40)];
    const live = run(cmds, 40);
    const site = flatSite('flat', 4000);
    const replayed = replay(makeSave(live, cmds), site, 40);
    expect(hashState(replayed)).toBe(hashState(live));
  });
});
