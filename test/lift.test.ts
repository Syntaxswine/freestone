/**
 * SIM 26: THE LIFT — the final course, the generational factory's last gear. A stone
 * raised high costs more of the mason's day than one laid at the foot; a GREAT WHEEL,
 * a timber treadwheel crane, relieves it. The load-bearing claims:
 *  - a stone wall that climbs past the free reach raises a wheel — if the woodpile can
 *    build one — drawing WHEEL_TIMBER;
 *  - with no wood to raise a wheel, the high courses CRAWL: the same wall finishes later;
 *  - a wall under the free reach takes no lift at all (no wheel, no wood drawn).
 *
 * The penalty rides on the mason's lay debt, so a tall wall's build TIMING moves — this
 * is the attributable bump the canon baseline was re-authored for.
 */
import { describe, expect, it } from 'vitest';
import { flatSite } from '../src/sim/site';
import { worldStep } from '../src/sim/step';
import { createWorld } from '../src/sim/world';
import { TICKS_PER_YEAR, WHEEL_TIMBER, type Command, type Person } from '../src/sim/types';
import { villager } from './helpers';

const site = flatSite('flat', 4000);
// SIM 36: generalist villagers; the dawn pass assigns both to LAY (a supplied wall)
const mason = (id: number): Person => villager(id, { bornTick: -25 * TICKS_PER_YEAR });

/** Build one long wall of a given height, with a given woodpile, and time it. */
function buildWall(seed: string, timber: number, height: number) {
  const w = createWorld(seed, site.id);
  w.people = [mason(1), mason(2)];
  w.stockpile = 100000; // ample stone (a local wall draws the pile directly)
  w.timber = timber;
  const cmd: Command = {
    kind: 'plan_wall',
    tick: 0,
    points: [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
    ],
    height,
    dressLevel: 'rubble',
  };
  const byTick = new Map<number, Command[]>([[0, [cmd]]]);
  const done = () => w.walls.length > 0 && w.walls[0]!.stonesLaid >= w.walls[0]!.stonesTotal;
  let t = 0;
  while (!done() && t < 5000) {
    worldStep(w, site, byTick.get(w.tick) ?? []);
    t += 1;
  }
  return { w, ticks: t, wall: w.walls[0]! };
}

describe('the lift (SIM 26)', () => {
  it('a tall stone wall raises a great wheel, drawing timber from the pile', () => {
    const tall = buildWall('lift', 100, 10); // height 10 = 20 courses, well past the free reach
    expect(tall.wall.wheel).toBe(true); // the wheel went up
    expect(tall.w.events.some((e) => e.kind === 'wheel_raised')).toBe(true); // on the record
    expect(tall.w.timber).toBe(100 - WHEEL_TIMBER); // and it cost the woodpile
  });

  it('with no wood to raise a wheel, the high courses crawl — the wall finishes later', () => {
    const withWheel = buildWall('lift', 100, 10);
    const noWheel = buildWall('lift', 0, 10); // the same tall wall, an empty woodpile
    expect(noWheel.wall.wheel).toBe(false); // no wood, no wheel
    expect(noWheel.ticks).toBeGreaterThan(withWheel.ticks); // the crawl cost it real time
  });

  it('a wall under the free reach takes no lift — no wheel, no wood spent', () => {
    const short = buildWall('lift', 100, 1); // height 1 = 2 courses, all within a hand's reach
    expect(short.wall.wheel).toBe(false); // it never climbed high enough to need one
    expect(short.w.events.some((e) => e.kind === 'wheel_raised')).toBe(false);
    expect(short.w.timber).toBe(100); // the woodpile is untouched
  });
});
