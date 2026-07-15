/**
 * SIM 32: THE SLEDGE ON ROLLERS — the heavy-block haul accelerant, the lift's overland twin. A HAULED wall
 * built on rollers moves its won stone across the ground faster (ROLLER_HAUL_BOOST on the delivered rate), so
 * its face fills sooner and it finishes sooner. It is OPT-IN, so the load-bearing claims are:
 *  - a hauled wall on rollers finishes SOONER than the same wall without them (the sledge does real work);
 *  - a wall NOT on rollers is unchanged, and a LOCAL wall (no cart, draws the pile directly) ignores rollers
 *    entirely — the sledge is for the road, and the whole 200-tick canon (no rollers) is byte-identical.
 */
import { describe, expect, it } from 'vitest';
import { flatSite } from '../src/sim/site';
import { worldStep } from '../src/sim/step';
import { createWorld } from '../src/sim/world';
import { TICKS_PER_YEAR, type Command, type Person } from '../src/sim/types';

const site = flatSite('flat', 4000);
const mason = (id: number): Person => ({
  id,
  name: `M${id}`,
  trade: 'mason',
  pace: 20,
  bornTick: -25 * TICKS_PER_YEAR,
});

/** build one long ASHLAR wall fed by a SLOW cart (the haul is the bottleneck), and time it */
function buildHauled(rollers: boolean) {
  const w = createWorld('sledge', site.id);
  w.people = [mason(1), mason(2)];
  w.stockpile = 1_000_000; // ample won stone waiting in the pile — only the CART limits the face
  const cmd: Command = {
    kind: 'plan_wall',
    tick: 0,
    points: [
      { x: 0, y: 0 },
      { x: 30, y: 0 },
    ],
    height: 2,
    dressLevel: 'ashlar', // heavy dressed blocks — the very stone a sledge is for
    haulRate: 0.8, // a slow cart: the masons could lay far faster than this fills the face
    method: 'sledge',
    ...(rollers ? { rollers: true } : {}),
  };
  const byTick = new Map<number, Command[]>([[0, [cmd]]]);
  const done = () => w.walls.length > 0 && w.walls[0]!.stonesLaid >= w.walls[0]!.stonesTotal;
  let t = 0;
  while (!done() && t < 40000) {
    worldStep(w, site, byTick.get(w.tick) ?? []);
    t += 1;
  }
  return { w, ticks: t, wall: w.walls[0]! };
}

/** build one LOCAL wall (no haulRate ⇒ draws the pile directly, no cart) and time it */
function buildLocal(rollers: boolean) {
  const w = createWorld('sledge', site.id);
  w.people = [mason(1)];
  w.stockpile = 100_000;
  const cmd: Command = {
    kind: 'plan_wall',
    tick: 0,
    points: [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
    ],
    height: 1,
    dressLevel: 'rubble',
    ...(rollers ? { rollers: true } : {}), // no haulRate: a 'local' wall, no cart to speed
  };
  const byTick = new Map<number, Command[]>([[0, [cmd]]]);
  const done = () => w.walls.length > 0 && w.walls[0]!.stonesLaid >= w.walls[0]!.stonesTotal;
  let t = 0;
  while (!done() && t < 40000) {
    worldStep(w, site, byTick.get(w.tick) ?? []);
    t += 1;
  }
  return t;
}

describe('the sledge on rollers (SIM 32)', () => {
  it('a hauled wall on rollers moves its stone faster — it finishes sooner', () => {
    const plain = buildHauled(false);
    const sledge = buildHauled(true);
    expect(plain.ticks).toBeGreaterThan(1); // a real cart-bound build
    expect(sledge.ticks).toBeLessThan(plain.ticks); // the rollers filled the face faster
    expect(sledge.wall.stonesTotal).toBe(plain.wall.stonesTotal); // the same wall, only faster to supply
    expect(sledge.wall.rollers).toBe(true);
    expect(plain.wall.rollers).toBe(false); // absent ⇒ false
  });

  it('rollers on a LOCAL wall change nothing — the sledge is for the road, not the pile', () => {
    // a local wall has no cart to speed, so the rollers flag can make no difference: byte-identical timing
    expect(buildLocal(true)).toBe(buildLocal(false));
  });
});
