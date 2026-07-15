/**
 * SIM 24: THE SPECIALIST — the structural heart of the specialization pyramid (3c).
 * A settlement varied and populous enough draws a SMITH to a blacksmith it holds.
 * The load-bearing claims (the STRUCTURE; the smith's production effect is a later bump):
 *  - VARIETY + a smithy + the people to spare one → a smith arrives (a named soul);
 *  - no smithy, or too little variety, or too few souls → no smith;
 *  - one smith per smithy (the base's capacity, not a flood);
 *  - the trade is as permanent as the base: a smith never leaves (not even in hunger),
 *    and a new one is drawn ONLY while the base holds — lose it and the trade dies out.
 *
 * All in livingYear (once a year), so a sub-year run is unchanged (baseline guards that).
 */
import { describe, expect, it } from 'vitest';
import { flatSite } from '../src/sim/site';
import { worldStep } from '../src/sim/step';
import { createWorld } from '../src/sim/world';
import {
  TICKS_PER_YEAR,
  type Building,
  type Farm,
  type FieldUse,
  type Person,
} from '../src/sim/types';

const site = flatSite('flat', 4000);
function fresh(seed = 'smith-seed') {
  return createWorld(seed, site.id);
}
function stepN(world: ReturnType<typeof fresh>, n: number) {
  for (let i = 0; i < n; i++) worldStep(world, site, []);
}
const farm = (id: number, use: FieldUse, area = 4000): Farm => ({
  id,
  wallId: 9000 + id,
  use,
  points: [],
  area,
  gates: [],
  workdays: 0,
});
const blacksmith = (id: number): Building => ({ id, wallId: 8000 + id, kind: 'blacksmith', roof: 'none', area: 100 });
const adult = (id: number): Person => ({
  id,
  name: `A${id}`,
  trade: 'laborer',
  pace: 4,
  bornTick: -25 * TICKS_PER_YEAR,
});
const smiths = (w: ReturnType<typeof fresh>): number =>
  w.people.reduce((n, p) => (p.trade === 'smith' ? n + 1 : n), 0);
/** the origin ('apprentice' | 'migrant') of the most recently drawn smith, or null (SIM 28) */
function lastOrigin(w: ReturnType<typeof fresh>): string | null {
  for (let i = w.events.length - 1; i >= 0; i--) {
    const e = w.events[i]!;
    if (e.kind === 'specialist_arrived') return e.origin; // control-flow narrows to the arrival
  }
  return null;
}

describe('the specialist (SIM 24)', () => {
  it('a varied, populous settlement with a blacksmith draws a smith', () => {
    const w = fresh('smith');
    w.people = Array.from({ length: 8 }, (_, i) => adult(100 + i));
    w.farms = [farm(1, 'farm'), farm(2, 'pasture')]; // variety 3 with the smithy
    w.buildings = [blacksmith(10)];
    stepN(w, TICKS_PER_YEAR); // one reckoning
    expect(smiths(w)).toBe(1); // a smith was drawn
    expect(w.events.some((e) => e.kind === 'specialist_arrived')).toBe(true); // a named soul, on the record
  });

  it('no blacksmith, or too little variety, draws no smith', () => {
    const noShop = fresh('smith'); // varied fields, but no workshop for a smith
    noShop.people = Array.from({ length: 8 }, (_, i) => adult(100 + i));
    noShop.farms = [farm(1, 'farm'), farm(2, 'pasture'), farm(3, 'orchard')];
    noShop.buildings = [];
    stepN(noShop, TICKS_PER_YEAR * 3);
    expect(smiths(noShop)).toBe(0); // no smithy → no smith

    const thin = fresh('smith'); // a smithy, but a monoculture around it (variety 2 < 3)
    thin.people = Array.from({ length: 8 }, (_, i) => adult(100 + i));
    thin.farms = [farm(1, 'farm')];
    thin.buildings = [blacksmith(10)];
    stepN(thin, TICKS_PER_YEAR * 3);
    expect(smiths(thin)).toBe(0); // not varied enough to keep one
  });

  it('one smith per smithy — the base sets the capacity, not a flood', () => {
    const w = fresh('smith');
    w.people = Array.from({ length: 12 }, (_, i) => adult(100 + i));
    w.farms = [farm(1, 'farm'), farm(2, 'pasture')];
    w.buildings = [blacksmith(10)]; // ONE smithy
    stepN(w, TICKS_PER_YEAR * 5); // five reckonings, ample chance to over-draw
    expect(smiths(w)).toBe(1); // still exactly one
  });

  it('a smith never leaves, and no new one is drawn once the base has failed', () => {
    const w = fresh('smith');
    w.people = Array.from({ length: 8 }, (_, i) => adult(100 + i)); // eight laborers
    w.people.push({ ...adult(200), trade: 'smith' }); // and an established smith — nine souls
    w.farms = []; // no food at all → hunger will drive laborers out
    w.buildings = []; // and no smithy → the base has failed
    stepN(w, TICKS_PER_YEAR * 2); // two hungry reckonings
    expect(w.events.some((e) => e.kind === 'person_left')).toBe(true); // hunger emptied the fields' hands
    expect(smiths(w)).toBe(1); // but the smith stayed — rooted, and no new one drawn without the base
  });
});

describe('the apprentice bond (SIM 28)', () => {
  it('the first smith always MIGRATES — there is no master to learn the trade from', () => {
    const w = fresh('appr');
    w.people = Array.from({ length: 8 }, (_, i) => adult(100 + i));
    w.farms = [farm(1, 'farm'), farm(2, 'pasture')]; // variety 3 with the smithy
    w.buildings = [blacksmith(10)];
    stepN(w, TICKS_PER_YEAR); // one reckoning
    expect(smiths(w)).toBe(1);
    expect(lastOrigin(w)).toBe('migrant'); // a journeyman on the wind, not raised from within
  });

  it('under a living master, a second forge raises the trade from WITHIN (an apprentice)', () => {
    const w = fresh('appr');
    w.people = [
      { ...adult(200), trade: 'smith' }, // an established MASTER at the first forge
      ...Array.from({ length: 9 }, (_, i) => adult(100 + i)), // and nine local hands to raise from
    ];
    w.farms = [farm(1, 'farm'), farm(2, 'pasture')]; // variety 3
    w.buildings = [blacksmith(10), blacksmith(11)]; // TWO forges: one held, one open
    stepN(w, TICKS_PER_YEAR); // one reckoning fills the open forge
    expect(smiths(w)).toBe(2);
    expect(lastOrigin(w)).toBe('apprentice'); // the trade passed DOWN under the master, not imported
  });
});
