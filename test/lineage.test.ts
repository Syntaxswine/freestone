/**
 * SIM 45 — LINEAGE (Beat 4). "Their kids start off with a higher proficiency": a child born to the
 * settlement inherits a HEAD-START in a parent's finest trade, so a master's children begin closer
 * to mastery and skilled bloodlines form across generations. The load-bearing claims:
 *  - a child born where the adults are MASTERS starts with real days in that trade (a head-start),
 *    where a child born among UNTRAINED adults starts from zero;
 *  - the head-start is capped below master — a child is a prodigy at most, never born a master;
 *  - the whole birth stream (with inheritance) replays byte-for-byte.
 */
import { describe, expect, it } from 'vitest';
import { hashState, makeSave, replay } from '../src/sim/save';
import { flatSite } from '../src/sim/site';
import { worldStep } from '../src/sim/step';
import { createWorld } from '../src/sim/world';
import { LINEAGE_INHERIT, MASTER_DAYS, TICKS_PER_YEAR, type Command, type Person } from '../src/sim/types';

const site = flatSite('flat', 4000);

// a crowd of prime-age adults, all masters (or all untrained) of the given trade, well-fed so births
// fire; ages in the young band (low mortality) so the crowd survives to breed
function crowd(n: number, masonDays: number): Person[] {
  const out: Person[] = [];
  for (let i = 0; i < n; i++) {
    out.push({
      id: 200 + i,
      name: `Adult${i}`,
      trade: 'villager',
      vigor: 0.5,
      worked: { mason: masonDays, digger: 0, woodsman: 0, farmhand: 0, carter: 0 },
      lastJob: masonDays > 0 ? 'mason' : null,
      bornTick: -25 * TICKS_PER_YEAR, // age 25, the 0.008 band — they survive to breed
    });
  }
  return out;
}

function bredChildren(masonDays: number, seed: string) {
  const w = createWorld(seed, site.id);
  // a SMALL crowd (well under FOUNDING_CAPACITY) so the founding harvest is a surplus (S > 1) and
  // BIRTHS fire — births gate on the field's abundance, never the hoard, so a full store isn't enough
  w.people = crowd(6, masonDays);
  w.grain = 100000; // fed → no hunger departures to thin the crowd
  for (let t = 0; t < 5 * TICKS_PER_YEAR; t++) worldStep(w, site, []); // several year-turns of births
  return w.people.filter((p) => p.bornTick >= 0); // the young — born in-game
}

describe('lineage (SIM 45)', () => {
  it('children of MASTERS inherit a head-start; children of the UNTRAINED start from zero', () => {
    const ofMasters = bredChildren(MASTER_DAYS, 'lineage-master');
    const ofNovices = bredChildren(0, 'lineage-novice');
    expect(ofMasters.length).toBeGreaterThan(0);
    expect(ofNovices.length).toBeGreaterThan(0);
    // the masters' children are born with real mason-days (the inherited head-start)…
    expect(ofMasters.some((c) => c.worked.mason > 0)).toBe(true);
    const headStart = Math.floor(MASTER_DAYS * LINEAGE_INHERIT);
    expect(ofMasters.filter((c) => c.worked.mason === headStart).length).toBeGreaterThan(0);
    // …where the novices' children start from nothing (no craft to inherit)
    expect(ofNovices.every((c) => c.worked.mason === 0)).toBe(true);
  });

  it('the head-start is capped below master — a child is never born a master', () => {
    // even inheriting from the deepest master, the cap holds (LINEAGE_INHERIT < 1 already, but the
    // cap is the guard): every inherited child is short of the master threshold
    const children = bredChildren(MASTER_DAYS, 'lineage-cap');
    expect(children.every((c) => c.worked.mason < MASTER_DAYS)).toBe(true);
  });

  it('replays byte-for-byte with inheritance (the birth stream is deterministic)', () => {
    // the FOUNDING world over ~20 years — founders age, breed, and their children inherit; replay
    // rebuilds founders from the seed, so no hand-seeded crew here.
    const cmds: Command[] = [];
    const years = 20;
    const live = createWorld('lineage-replay', site.id);
    for (let t = 0; t < years * TICKS_PER_YEAR; t++) worldStep(live, site, []);
    expect(live.people.some((p) => p.bornTick >= 0)).toBe(true); // children were born
    const replayed = replay(makeSave(live, cmds), site, years * TICKS_PER_YEAR);
    expect(hashState(replayed)).toBe(hashState(live));
  });
});
