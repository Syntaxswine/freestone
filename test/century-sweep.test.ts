/**
 * THE CENTURY-SWEEP (SIM 20, PROPOSAL-THE-LIVING-SETTLEMENT §10) — the demographic
 * tuning instrument. None of the population knobs (the surplus threshold, the
 * mortality curve, the fertility floor, the migration rate) can be tuned by eye on
 * a 400-tick baseline; they need 100-year runs across many seeds. This file is both:
 *  - a FAST sanity guard on every `npm test`: a fixed food capacity converges near
 *    it — the settlement neither runs away nor dies out (a Malthusian equilibrium);
 *  - a full REPORT under `SWEEP=1` (`npm run sweep`): the 100-year distribution
 *    across seeds and capacities, for reading the curve and turning the knobs.
 */
import { describe, expect, it } from 'vitest';
import { flatSite } from '../src/sim/site';
import { worldStep } from '../src/sim/step';
import { createWorld } from '../src/sim/world';
import {
  AREA_PER_PERSON,
  FOUNDING_CAPACITY,
  HALL_AREA,
  HALL_SHELTER,
  TICKS_PER_YEAR,
  type Building,
  type Farm,
} from '../src/sim/types';

const site = flatSite('flat', 4000);

/** run `years` at a fixed food CAPACITY (mouths), return the demographic tallies */
function century(seed: string, years: number, capacityMouths: number) {
  const w = createWorld(seed, site.id);
  const area = Math.max(0, (capacityMouths - FOUNDING_CAPACITY) * AREA_PER_PERSON);
  if (area > 0) {
    const farm: Farm = { id: 9001, wallId: 9000, use: 'farm', points: [], area, gates: [], workdays: 0 };
    w.farms = [farm];
  }
  // SIM 30: house the settlement generously so the SHELTER growth-cap never binds here — this instrument
  // tunes the FOOD demographics; the housing gate itself is proven in housing.test.ts.
  const halls = Math.ceil(capacityMouths / HALL_SHELTER) + 2;
  w.buildings = Array.from({ length: halls }, (_, i): Building => ({
    id: 8001 + i,
    wallId: 8000,
    kind: 'house',
    roof: 'brick',
    area: HALL_AREA,
  }));
  let peak = w.people.length;
  for (let i = 0; i < years * TICKS_PER_YEAR; i++) {
    worldStep(w, site, []);
    if (w.people.length > peak) peak = w.people.length;
  }
  const tally = (k: string) => w.events.filter((e) => e.kind === k).length;
  return { final: w.people.length, peak, born: tally('person_born'), arrived: tally('person_arrived'), died: tally('person_died'), left: tally('person_left') };
}

const SEEDS = ['a', 'b', 'c', 'd', 'e', 'f'];
const stats = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  return { min: s[0], med: s[s.length >> 1], max: s[s.length - 1], mean: Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) };
};

describe('century-sweep — the demographic tuning instrument (SIM 20)', () => {
  it('a fixed carrying capacity converges near it — no runaway, no collapse', () => {
    // capacity ~12 mouths: over 25 years the settlement should settle in a sane band
    const finals = SEEDS.map((s) => century(s, 25, 12).final);
    for (const f of finals) {
      expect(f).toBeGreaterThan(0); // never dies out (the floor holds)
      expect(f).toBeLessThan(40); // never runs away past ~capacity
    }
  });

  it('SWEEP mode prints the 100-year distribution (run via `npm run sweep`)', () => {
    if (!process.env.SWEEP) return; // a report, not an assertion
    console.warn('\n=== CENTURY SWEEP — 100 years × ' + SEEDS.length + ' seeds ===');
    for (const cap of [4, 8, 20, 50]) {
      const runs = SEEDS.map((s) => century(s, 100, cap));
      const f = stats(runs.map((r) => r.final));
      const p = stats(runs.map((r) => r.peak));
      const avg = (k: 'born' | 'died' | 'arrived' | 'left') => Math.round(runs.reduce((a, r) => a + r[k], 0) / runs.length);
      console.warn(
        `capacity ${String(cap).padStart(3)} mouths → final ${JSON.stringify(f)} · peak ${JSON.stringify(p)} · ` +
          `100y avg: born ${avg('born')} died ${avg('died')} arrived ${avg('arrived')} left ${avg('left')}`,
      );
    }
    console.warn('read: final pop should track capacity; born≈died at equilibrium; migrants taper as pop nears capacity.\n');
  });
});
