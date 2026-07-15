/**
 * SIM 29: VARIETY BEARS FRUIT — the specialization pyramid's variety tenants stop being decoration and
 * start to PAY. The load-bearing claims, each proven against a clean A/B on the SAME seed (so the weather
 * roll is identical and only the tenant differs):
 *  - an ORCHARD bears food toward the harvest — the same fields plus an orchard PRODUCE more;
 *  - a PASTURE keeps a draft horse that hauls more surplus to the store — with a fat harvest and an empty
 *    granary, the pasture settlement carries more grain in a year, and still never overtops the cap.
 *
 * All in livingYear §2, which the 200-tick canon never reckons — the baseline instrument guards that a
 * sub-year run is unchanged.
 */
import { describe, expect, it } from 'vitest';
import { flatSite } from '../src/sim/site';
import { worldStep } from '../src/sim/step';
import { createWorld } from '../src/sim/world';
import {
  AREA_PER_PERSON,
  FOUNDING_STORAGE,
  GRANARY_STORAGE,
  TICKS_PER_YEAR,
  type Building,
  type Farm,
  type Person,
} from '../src/sim/types';

const site = flatSite('flat', 4000);
const fresh = (seed = 'variety') => createWorld(seed, site.id);
function stepN(w: ReturnType<typeof fresh>, n: number) {
  for (let i = 0; i < n; i++) worldStep(w, site, []);
}
const field = (id: number, use: Farm['use'], area: number): Farm => ({
  id,
  wallId: 9000 + id,
  use,
  points: [],
  area,
  gates: [],
  workdays: 0,
});
const granary = (id: number): Building => ({ id, wallId: 8000 + id, kind: 'granary', roof: 'none', area: 30 });
const adult = (id: number): Person => ({
  id,
  name: `A${id}`,
  trade: 'laborer',
  pace: 4,
  bornTick: -25 * TICKS_PER_YEAR,
});
/** the last harvest reckoning on the record (control-flow narrows to the harvest member) */
function lastHarvest(w: ReturnType<typeof fresh>) {
  for (let i = w.events.length - 1; i >= 0; i--) {
    const e = w.events[i]!;
    if (e.kind === 'harvest') return e;
  }
  return null;
}

describe('variety bears fruit (SIM 29)', () => {
  it('an orchard bears food toward the harvest — more is produced', () => {
    const bare = fresh('orch');
    bare.people = [adult(1), adult(2)];
    bare.farms = [field(1, 'farm', AREA_PER_PERSON * 2)]; // arable alone
    const orch = fresh('orch'); // same seed → same weather, a clean A/B
    orch.people = [adult(1), adult(2)];
    orch.farms = [field(1, 'farm', AREA_PER_PERSON * 2), field(2, 'orchard', 3000)]; // arable + an orchard
    stepN(bare, TICKS_PER_YEAR);
    stepN(orch, TICKS_PER_YEAR);
    expect(lastHarvest(orch)!.produced).toBeGreaterThan(lastHarvest(bare)!.produced); // the fruit added yield
  });

  it('a pasture keeps a draft horse that hauls more grain to the store', () => {
    // a fat harvest (big surplus), a granary to keep it, and the store starts empty — so we measure what
    // ONE year hauls in. The bare hand-haul is small (BASE_HAUL), so the pasture's horse is the difference.
    const noHorse = fresh('haul');
    noHorse.people = [adult(1), adult(2)];
    noHorse.farms = [field(1, 'farm', AREA_PER_PERSON * 10)]; // produced ~14 for 2 mouths → a big surplus
    noHorse.buildings = [granary(10)];
    noHorse.grain = 0;
    const withHorse = fresh('haul'); // same seed → same weather
    withHorse.people = [adult(1), adult(2)];
    withHorse.farms = [field(1, 'farm', AREA_PER_PERSON * 10), field(2, 'pasture', 2000)];
    withHorse.buildings = [granary(10)];
    withHorse.grain = 0;
    stepN(noHorse, TICKS_PER_YEAR);
    stepN(withHorse, TICKS_PER_YEAR);
    expect(withHorse.grain).toBeGreaterThan(noHorse.grain); // the horse carried more surplus to the store
    const cap = FOUNDING_STORAGE + GRANARY_STORAGE;
    expect(withHorse.grain).toBeLessThanOrEqual(cap + 1e-9); // and it fills faster, not past the cap
  });
});
