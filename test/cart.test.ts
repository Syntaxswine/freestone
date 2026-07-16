/**
 * SIM 23: THE CART — the woods' first payoff. A carpenter's yard keeps a cart,
 * and the cart carries the harvest surplus from the fields to the granary. The
 * load-bearing claims:
 *  - a cart raises grain THROUGHPUT: a carted settlement fills its granary faster
 *    than a hand-carrying one (the surplus a bare larder spoils, the cart keeps);
 *  - the cart is the woods' first consumer besides walls — it DRAWS timber a year
 *    to stay in repair;
 *  - a cart with no wood to maintain it sits IDLE: it hauls no more than hand-carry.
 *
 * All of it lives in livingYear (once a year), so a run under a year is unchanged
 * (guarded by the baseline instrument, not here).
 */
import { describe, expect, it } from 'vitest';
import { flatSite } from '../src/sim/site';
import { worldStep } from '../src/sim/step';
import { createWorld } from '../src/sim/world';
import { villager } from './helpers';
import {
  AREA_PER_PERSON,
  CART_UPKEEP,
  TICKS_PER_YEAR,
  type Building,
  type Command,
  type Farm,
  type Person,
} from '../src/sim/types';

const site = flatSite('flat', 4000);

function fresh(seed = 'cart-seed') {
  return createWorld(seed, site.id);
}
function stepN(world: ReturnType<typeof fresh>, n: number) {
  for (let i = 0; i < n; i++) worldStep(world, site, []);
}
function fatField(): Farm {
  // produced_mean = FOUNDING(4) + 10 = 14 mouth-years — a fat harvest, always a surplus
  return { id: 9001, wallId: 9000, use: 'farm', points: [], area: AREA_PER_PERSON * 10, gates: [], workdays: 0 };
}
const granary = (id: number): Building => ({ id, wallId: 9000, kind: 'granary', roof: 'none', area: 30 });
const carpentry = (id: number): Building => ({ id, wallId: 9000, kind: 'carpentry', roof: 'none', area: 30 });
const adult = (id: number): Person => villager(id, { bornTick: -25 * TICKS_PER_YEAR });

describe('the cart (SIM 23)', () => {
  it('a cart raises grain throughput — a carted granary fills faster than a hand-carried one', () => {
    const base = fresh('cart'); // a granary, but no cart: hand-carry only
    base.people = [adult(1), adult(2)];
    base.farms = [fatField()];
    base.buildings = [granary(8001)];
    base.timber = 100;
    const carted = fresh('cart'); // the same, plus a carpenter's yard keeping a cart
    carted.people = [adult(1), adult(2)];
    carted.farms = [fatField()];
    carted.buildings = [granary(8001), carpentry(8002)];
    carted.timber = 100; // wood enough to keep the cart in repair
    stepN(base, TICKS_PER_YEAR * 2);
    stepN(carted, TICKS_PER_YEAR * 2);
    expect(carted.grain).toBeGreaterThan(base.grain); // the cart carried more surplus to the store
  });

  it('a cart draws timber a year to stay in repair — the woods first consumer besides walls', () => {
    const w = fresh('upkeep');
    w.people = [adult(1), adult(2)];
    w.farms = [{ ...fatField(), area: AREA_PER_PERSON * 20 }]; // very fat → a surplus to haul every year
    w.buildings = [granary(8001), carpentry(8002)];
    w.timber = 20;
    stepN(w, TICKS_PER_YEAR * 3); // three hauling years
    expect(w.timber).toBeLessThan(20); // the cart drew upkeep from the woodpile
    expect(w.timber).toBeGreaterThanOrEqual(20 - 3 * CART_UPKEEP); // at most one cart's upkeep a year
  });

  it('a cart with no wood to maintain it sits idle — it hauls no more than hand-carry', () => {
    const fed = fresh('idle'); // a carpenter's yard WITH wood
    fed.people = [adult(1), adult(2)];
    fed.farms = [fatField()];
    fed.buildings = [granary(8001), carpentry(8002)];
    fed.timber = 100;
    const starved = fresh('idle'); // the SAME yard, but an empty woodpile
    starved.people = [adult(1), adult(2)];
    starved.farms = [fatField()];
    starved.buildings = [granary(8001), carpentry(8002)];
    starved.timber = 0;
    stepN(fed, TICKS_PER_YEAR * 2);
    stepN(starved, TICKS_PER_YEAR * 2);
    expect(fed.grain).toBeGreaterThan(starved.grain); // the fed cart hauled; the starved one sat idle
  });
});
