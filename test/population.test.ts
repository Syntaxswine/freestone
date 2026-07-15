/**
 * SIM 20: THE LIVING YEAR. People age, die, are born, arrive and leave; the
 * harvest decides how many. The load-bearing claims, shaped on flat ground:
 *  - the demographic pass fires ONCE A YEAR (the last day), not every tick;
 *  - a child born in-game lifts no stone until it is ADULT_AGE (aging is real);
 *  - SURPLUS food grows the settlement — migrants (fast) + births (slow);
 *  - HUNGER thins it — souls leave for another manor, but it never empties;
 *  - the demographic rng is ISOLATED (`seed:demo:<year>`): people-churn never
 *    shifts the masonry jitter — a growing settlement lays the SAME stones;
 *  - it all replays byte-for-byte.
 *
 * A world stepped under a year is unchanged but for the new bornTick field
 * (guarded by the baseline instrument, not here).
 */
import { describe, expect, it } from 'vitest';
import { hashState, makeSave, replay } from '../src/sim/save';
import { flatSite } from '../src/sim/site';
import { worldStep } from '../src/sim/step';
import { createWorld } from '../src/sim/world';
import {
  ADULT_AGE,
  AREA_PER_PERSON,
  TICKS_PER_YEAR,
  type Command,
  type Farm,
  type Person,
  type Vec2,
} from '../src/sim/types';

const site = flatSite('flat', 4000);

function fresh(seed = 'pop-seed') {
  return createWorld(seed, site.id);
}
function stepN(world: ReturnType<typeof fresh>, n: number, cmds: Command[] = []) {
  const byTick = new Map<number, Command[]>();
  for (const c of cmds) (byTick.get(c.tick) ?? byTick.set(c.tick, []).get(c.tick)!).push(c);
  for (let i = 0; i < n; i++) worldStep(world, site, byTick.get(world.tick) ?? []);
}
/** a test-only farm of a given arable area (bypasses the enclosure dance) */
function seedFarm(area: number): Farm {
  return { id: 9001, wallId: 9000, use: 'farm', points: [], area, gates: [], workdays: 0 };
}
const adult = (id: number, tick: number, age = 25): Person => ({
  id,
  name: `A${id}`,
  trade: 'laborer',
  pace: 4,
  bornTick: tick - age * TICKS_PER_YEAR,
});

describe('the living year (SIM 20)', () => {
  it('the demographic pass fires only at year-end, never mid-year', () => {
    const w = fresh();
    w.farms = [seedFarm(AREA_PER_PERSON * 30)]; // give it surplus, so the pass has something to do
    stepN(w, TICKS_PER_YEAR - 1); // up to but not including the first reckoning
    expect(w.events.some((e) => e.kind.startsWith('person_'))).toBe(false); // silent all year
    stepN(w, TICKS_PER_YEAR + 1); // through the second year-end
    const ticks = w.events.filter((e) => e.kind.startsWith('person_')).map((e) => e.tick);
    expect(ticks.length).toBeGreaterThan(0); // the pass ran
    // every demographic event lands on the last day of a year — annual, not per-tick
    expect(ticks.every((t) => t % TICKS_PER_YEAR === TICKS_PER_YEAR - 1)).toBe(true);
  });

  it('a child born in-game lifts no stone until it comes of age', () => {
    const w = fresh();
    const child: Person = { id: 500, name: 'Wren', trade: 'mason', pace: 30, bornTick: 0 };
    w.people = [child]; // a lone newborn "mason"
    w.stockpile = 100; // plenty of stone
    // a wall it could build if it were grown
    const wall: Command = { kind: 'plan_wall', tick: 0, points: [{ x: 0, y: 0 }, { x: 5, y: 0 }], height: 0.25 };
    stepN(w, 100, [wall]);
    expect(w.stones).toHaveLength(0); // a child lays nothing
    // now age it past ADULT_AGE and step again — it works
    child.bornTick = -(ADULT_AGE + 1) * TICKS_PER_YEAR;
    stepN(w, 20);
    expect(w.stones.length).toBeGreaterThan(0); // grown, it lays
  });

  it('SURPLUS food grows the settlement — migrants and births', () => {
    const w = fresh();
    w.farms = [seedFarm(AREA_PER_PERSON * 30)]; // capacity ~34 mouths for 4 founders → S high
    const before = w.people.length;
    stepN(w, TICKS_PER_YEAR * 3); // three year-end reckonings
    expect(w.people.length).toBeGreaterThan(before); // it grew
    expect(w.events.some((e) => e.kind === 'person_arrived')).toBe(true); // the fast valve
    expect(w.events.some((e) => e.kind === 'person_born')).toBe(true); // the slow valve
  });

  it('HUNGER thins the settlement, but never empties it', () => {
    const w = fresh();
    // ten mouths, no field: capacity 4, S = 0.4 → hunger
    w.people = Array.from({ length: 10 }, (_, i) => adult(100 + i, 0));
    stepN(w, TICKS_PER_YEAR * 2);
    expect(w.people.length).toBeLessThan(10); // souls left
    expect(w.people.length).toBeGreaterThanOrEqual(1); // the last holds on
    expect(w.events.some((e) => e.kind === 'person_left')).toBe(true);
  });

  it('the demographic rng is ISOLATED — a growing settlement lays the SAME stones', () => {
    const wall: Command = { kind: 'plan_wall', tick: 0, points: [{ x: 0, y: 0 }, { x: 6, y: 0 }], height: 0.25 };
    const stable = fresh('iso');
    stable.stockpile = 100;
    const growing = fresh('iso'); // same seed → same founders, same masons
    growing.stockpile = 100;
    growing.farms = [seedFarm(AREA_PER_PERSON * 30)]; // this one grows
    stepN(stable, TICKS_PER_YEAR * 2, [wall]);
    stepN(growing, TICKS_PER_YEAR * 2, [wall]);
    // the growing settlement really did add people (migrants are laborers, not masons)
    expect(growing.people.length).toBeGreaterThan(stable.people.length);
    // yet the masonry jitter — driven by state.rng, which the demographic stream
    // never touches — is byte-identical: the same wall, the same stones, same yaws
    expect(growing.stones.length).toBe(stable.stones.length);
    expect(growing.stones.map((s) => s.yaw)).toEqual(stable.stones.map((s) => s.yaw));
    expect(growing.rng).toBe(stable.rng); // the masonry cursor itself is untouched
  });

  it('replays a multi-year demographic run byte-for-byte', () => {
    const w = fresh('replay');
    stepN(w, TICKS_PER_YEAR * 3); // three reckonings on the default founders
    const replayed = replay(makeSave(w, []), site, TICKS_PER_YEAR * 3);
    expect(hashState(replayed)).toBe(hashState(w));
  });
});
