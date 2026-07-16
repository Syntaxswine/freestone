/**
 * SIM 27: THE FIRST TECHNIQUE — the smith's PRODUCTION EFFECT, the payoff of the
 * specialization pyramid (SIM 24 gave the smith a life; this gives him a purpose). A smith
 * at the forge keeps the crew's irons sharp, so the masons DRESS and LAY faster. The
 * load-bearing claims:
 *  - a wall built with a smith at the base finishes SOONER than the same wall without one;
 *  - the relief SATURATES — the crew's smiths together speed the work no more than the cap,
 *    so a second forge that reaches the cap and a fifth both finish in the same time (tools
 *    speed the work, they never do it);
 *  - it COMPOSES with the lift — a tall wall with a smith still finishes sooner than the same
 *    tall wall without, the two multipliers stacking on the mason's day.
 *
 * The smith lays no stone himself (only masons lay); his PRESENCE is the multiplier. With no
 * smith the factor is exactly 1 — the baseline instrument guards that the 200-tick canon,
 * which never draws a smith, is byte-identical to SIM 26.
 */
import { describe, expect, it } from 'vitest';
import { flatSite } from '../src/sim/site';
import { worldStep } from '../src/sim/step';
import { createWorld } from '../src/sim/world';
import { TICKS_PER_YEAR, type Command, type Person } from '../src/sim/types';
import { villager, zeroWorked } from './helpers';

const site = flatSite('flat', 4000);
// SIM 36: the crew are generalist villagers — the dawn pass assigns them all to LAY
// (a supplied wall, nothing else to do), so the specimens' relative timings survive.
const mason = (id: number): Person => villager(id, { bornTick: -25 * TICKS_PER_YEAR });
const smith = (id: number): Person =>
  villager(id, {
    trade: 'smith', // a smith lays no stone — his PRESENCE is the relief
    worked: { ...zeroWorked },
    bornTick: -30 * TICKS_PER_YEAR,
  });

/** Build one wall with a given crew and time it (ample stone, so only the crew binds). */
function buildWall(crew: Person[], height: number) {
  const w = createWorld('technique', site.id);
  w.people = crew;
  w.stockpile = 1_000_000; // a local wall draws the pile directly; never starve it
  w.timber = 1_000_000; // if it ever climbs high enough for a wheel, the wood is there
  const cmd: Command = {
    kind: 'plan_wall',
    tick: 0,
    points: [
      { x: 0, y: 0 },
      { x: 60, y: 0 },
    ],
    height,
    dressLevel: 'scappled',
  };
  const byTick = new Map<number, Command[]>([[0, [cmd]]]);
  const done = () => w.walls.length > 0 && w.walls[0]!.stonesLaid >= w.walls[0]!.stonesTotal;
  let t = 0;
  while (!done() && t < 20000) {
    worldStep(w, site, byTick.get(w.tick) ?? []);
    t += 1;
  }
  return { w, ticks: t, wall: w.walls[0]! };
}

describe('the first technique (SIM 27)', () => {
  it('a smith at the forge speeds the dress — the wall finishes sooner', () => {
    // height 1.5 = 6 courses, all within the free reach (no lift), so this isolates the smith
    const plain = buildWall([mason(1), mason(2)], 1.5);
    const forged = buildWall([mason(1), mason(2), smith(3)], 1.5);
    expect(plain.ticks).toBeGreaterThan(1); // the wall is a real multi-day build
    expect(forged.ticks).toBeLessThan(plain.ticks); // sharp irons laid it faster
    // and both raised the same wall — the smith speeds the work, he does not change it
    expect(forged.wall.stonesTotal).toBe(plain.wall.stonesTotal);
  });

  it('the relief saturates at the cap — a second forge helps, a fifth adds nothing', () => {
    // SMITH_DRESS_RELIEF 0.15 × 2 = 0.30 = SMITH_RELIEF_MAX, so two smiths reach the cap
    const one = buildWall([mason(1), mason(2), smith(3)], 1.5);
    const two = buildWall([mason(1), mason(2), smith(3), smith(4)], 1.5);
    const five = buildWall([mason(1), mason(2), smith(3), smith(4), smith(5), smith(6), smith(7)], 1.5);
    expect(two.ticks).toBeLessThanOrEqual(one.ticks); // a second forge speeds it further
    expect(five.ticks).toBe(two.ticks); // but past the cap, more smiths change nothing
  });

  it('it composes with the lift — a tall wall with a smith still finishes sooner', () => {
    // height 3 = 12 courses, half of them past the free reach: the lift taxes the day, and
    // the smith relieves it — the two multipliers stack, so the forge still saves time
    const tallPlain = buildWall([mason(1), mason(2)], 3);
    const tallForged = buildWall([mason(1), mason(2), smith(3)], 3);
    expect(tallForged.ticks).toBeLessThan(tallPlain.ticks);
  });
});
