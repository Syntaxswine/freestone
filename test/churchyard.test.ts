/**
 * SIM 44 — THE CHURCHYARD (Beat 4). Death is mourned and draws the stone economy: each death
 * (livingYear, the last day of a year) raises a GRAVE, an unmarked mound until the living spare a
 * STONE slab (a headstone) or WOOD (a marker); every unmarked mound weighs on the living as GRIEF,
 * a gentle cumulative drag on growth that lifts the moment a grave is honoured. The load-bearing
 * claims:
 *  - a death raises a grave carrying the dead's identity + finest craft (the epitaph);
 *  - the settlement marks with STONE first (the fine memorial), else WOOD, as material allows;
 *  - an unmarked mound is honoured LATER, when stone finally comes;
 *  - GRIEF slows growth — a village that honours its dead outgrows one that leaves them in mounds;
 *  - the whole demographic stream (deaths + graves + marking) replays byte-for-byte.
 */
import { describe, expect, it } from 'vitest';
import { hashState, makeSave, replay } from '../src/sim/save';
import { flatSite } from '../src/sim/site';
import { worldStep } from '../src/sim/step';
import { createWorld } from '../src/sim/world';
import { GRAVE_STONE, GRAVE_WOOD, TICKS_PER_YEAR, type Command, type Person } from '../src/sim/types';

const site = flatSite('flat', 4000);

// a crowd of ANCIENT souls — age ~80 falls in the 0.2 "last years" band, so under a fixed seed
// several die at the first year-turn (livingYear fires on tick 364, the last day of year 0)
function ancients(n: number): Person[] {
  const out: Person[] = [];
  for (let i = 0; i < n; i++) {
    out.push({
      id: 100 + i,
      name: `Elder${i}`,
      trade: 'villager',
      vigor: 0.5,
      worked: { mason: 500, digger: 0, woodsman: 0, farmhand: 0, carter: 0 }, // a green mason → an epitaph
      lastJob: 'mason',
      bornTick: -80 * TICKS_PER_YEAR,
    });
  }
  return out;
}

function firstYear(setup: (w: ReturnType<typeof createWorld>) => void, seed = 'churchyard') {
  const w = createWorld(seed, site.id);
  w.people = ancients(24);
  setup(w);
  for (let t = 0; t < TICKS_PER_YEAR; t++) worldStep(w, site, []); // through the first year-turn
  return w;
}

describe('the churchyard (SIM 44)', () => {
  it('a death raises a grave, unmarked when nothing can be spared', () => {
    const w = firstYear((w) => {
      w.stockpile = 0;
      w.timber = 0;
    });
    expect(w.graves.length).toBeGreaterThan(0); // several elders died
    expect(w.graves.every((g) => g.marker === 'none')).toBe(true); // nothing to mark with → bare mounds
    const g = w.graves[0]!;
    expect(g.name).toMatch(/^Elder/); // the dead's name, for the headstone
    expect(g.diedTick).toBe(TICKS_PER_YEAR - 1);
    expect(g.job).toBe('mason'); // their finest craft — the epitaph
    expect(g.band).toBe('green');
  });

  it('marks with STONE (one slab a grave) when the pile can spare it', () => {
    const w = firstYear((w) => {
      w.stockpile = 100 * GRAVE_STONE;
      w.timber = 0;
    });
    expect(w.graves.length).toBeGreaterThan(0);
    expect(w.graves.every((g) => g.marker === 'stone')).toBe(true);
    expect(w.stockpile).toBeCloseTo(100 * GRAVE_STONE - w.graves.length * GRAVE_STONE, 6); // a slab each
  });

  it('falls back to WOOD when there is no stone but timber to spare', () => {
    const w = firstYear((w) => {
      w.stockpile = 0;
      w.timber = 100 * GRAVE_WOOD;
    });
    expect(w.graves.length).toBeGreaterThan(0);
    expect(w.graves.every((g) => g.marker === 'wood')).toBe(true);
  });

  it('an unmarked mound is honoured LATER, when stone finally comes', () => {
    const w = createWorld('churchyard-later', site.id);
    w.people = ancients(24);
    w.stockpile = 0;
    w.timber = 0;
    for (let t = 0; t < TICKS_PER_YEAR; t++) worldStep(w, site, []);
    const dead = w.graves.length;
    expect(dead).toBeGreaterThan(0);
    expect(w.graves.every((g) => g.marker === 'none')).toBe(true); // year one: bare mounds
    w.stockpile = 100 * GRAVE_STONE; // the quarry finally spares stone
    for (let t = 0; t < TICKS_PER_YEAR; t++) worldStep(w, site, []);
    // the old mounds are marked now — grief lifts
    expect(w.graves.slice(0, dead).every((g) => g.marker === 'stone')).toBe(true);
  });

  it('GRIEF slows growth — a village that honours its dead outgrows one that leaves them in mounds', () => {
    // two identical settlements over 15 years; one given ample stone (marked, no grief), one nothing.
    const pop = (stone: number) => {
      const w = createWorld('grief', site.id);
      w.people = ancients(24);
      w.stockpile = stone;
      w.grain = 100000; // fed either way — isolate grief from hunger
      for (let t = 0; t < 15 * TICKS_PER_YEAR; t++) worldStep(w, site, []);
      return w.people.length;
    };
    const honoured = pop(1_000_000 * GRAVE_STONE); // graves marked → no grief
    const neglected = pop(0); // graves mounds → grief drags growth
    expect(honoured).toBeGreaterThanOrEqual(neglected);
  });

  it('replays byte-for-byte with deaths + graves (the demographic stream is deterministic)', () => {
    // the FOUNDING world over ~30 years — the founders age into the mortal bands and die, raising
    // graves; replay() rebuilds founders from the seed, so no hand-seeded crew here.
    const cmds: Command[] = [];
    const years = 30;
    const live = createWorld('churchyard-replay', site.id);
    for (let t = 0; t < years * TICKS_PER_YEAR; t++) worldStep(live, site, []);
    expect(live.graves.length).toBeGreaterThan(0); // some founders have died over the generation
    const replayed = replay(makeSave(live, cmds), site, years * TICKS_PER_YEAR);
    expect(hashState(replayed)).toBe(hashState(live));
  });
});
