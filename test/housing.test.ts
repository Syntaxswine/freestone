/**
 * SIM 25: HOUSING QUALITY TIERS (step 4). A house is a hovel, a cottage, or a hall,
 * read from its floor and its roof; better housing HOLDS its people through a hard
 * year. The load-bearing claims:
 *  - the tier is size × roof: a mean roof (thatch or none) knocks a grand floor down;
 *  - a well-housed settlement loses far fewer souls to hunger than a bare one.
 *
 * The retention effect lives in livingYear, so a sub-year run is unchanged (baseline
 * guards that); the tier derivation is a pure shared function (sim + render agree).
 */
import { describe, expect, it } from 'vitest';
import { flatSite } from '../src/sim/site';
import { worldStep } from '../src/sim/step';
import { createWorld } from '../src/sim/world';
import { villager } from './helpers';
import {
  AREA_PER_PERSON,
  FOUNDING_SHELTER,
  HALL_SHELTER,
  SHELTER_GROWTH_SLACK,
  TICKS_PER_YEAR,
  houseTier,
  tierShelter,
  type Building,
  type Farm,
  type Person,
} from '../src/sim/types';

const site = flatSite('flat', 4000);
function fresh(seed = 'house-seed') {
  return createWorld(seed, site.id);
}
function stepN(world: ReturnType<typeof fresh>, n: number) {
  for (let i = 0; i < n; i++) worldStep(world, site, []);
}
const hall = (id: number): Building => ({ id, wallId: 8000 + id, kind: 'house', roof: 'brick', area: 100 });
const adult = (id: number): Person => villager(id, { bornTick: -25 * TICKS_PER_YEAR });

describe('housing tiers (SIM 25)', () => {
  it('reads a house tier from its floor and its roof', () => {
    expect(houseTier(20, 'wood')).toBe('hovel'); // too small for a cottage
    expect(houseTier(50, 'wood')).toBe('cottage'); // a fair floor, a fair roof
    expect(houseTier(100, 'brick')).toBe('hall'); // a great floor under a fine roof
    expect(houseTier(100, 'straw')).toBe('cottage'); // a grand floor but a mean roof — knocked down
    expect(houseTier(50, 'none')).toBe('hovel'); // a fair floor, no roof — knocked down
    expect(tierShelter('hall')).toBe(HALL_SHELTER);
    expect(tierShelter('hovel')).toBeLessThan(tierShelter('cottage'));
  });

  it('a well-housed settlement holds its people through a hard year', () => {
    // two hungry settlements, same thirty souls and seed (the SIM-36 founding floor of
    // 13 feeds 13 — thirty starves) — one roofed in halls, one bare
    const bare = fresh('hold');
    bare.people = Array.from({ length: 30 }, (_, i) => adult(300 + i));
    bare.farms = []; // no food → the leave pass runs each year
    const housed = fresh('hold');
    housed.people = Array.from({ length: 30 }, (_, i) => adult(300 + i));
    housed.farms = [];
    housed.buildings = [hall(1), hall(2), hall(3), hall(4)]; // shelter well past the thirty mouths
    stepN(bare, TICKS_PER_YEAR * 3);
    stepN(housed, TICKS_PER_YEAR * 3);
    expect(bare.events.some((e) => e.kind === 'person_left')).toBe(true); // the bare village bled souls
    expect(housed.people.length).toBeGreaterThan(bare.people.length); // the halls held theirs
  });

  it('shelter GATES growth — a housed settlement grows past the unhoused cap (SIM 30)', () => {
    // abundant food for both, same seed; one bare (only the founders' first roofs), one roofed in halls
    const farm = (): Farm => ({ id: 9001, wallId: 9000, use: 'farm', points: [], area: AREA_PER_PERSON * 40, gates: [], workdays: 0 });
    const bare = fresh('grow');
    bare.farms = [farm()]; // food for ~44 mouths, but no houses
    const housed = fresh('grow'); // same seed → same weather + demographic rolls
    housed.farms = [farm()];
    housed.buildings = Array.from({ length: 6 }, (_, i) => hall(1 + i)); // shelter well past the food cap
    stepN(bare, TICKS_PER_YEAR * 20);
    stepN(housed, TICKS_PER_YEAR * 20);
    const cap = FOUNDING_SHELTER + SHELTER_GROWTH_SLACK;
    expect(bare.people.length).toBeLessThanOrEqual(cap + 4); // the bare hamlet caps near founders' shelter + slack
    expect(housed.people.length).toBeGreaterThan(cap + 5); // the housed one grew PAST it, toward its food capacity
  });
});
