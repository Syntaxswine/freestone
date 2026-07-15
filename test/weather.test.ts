/**
 * SIM 31: WEATHER SHAPED — the harvest's yearly weather multiplier is now the MEAN of two uniform rolls
 * (a triangular distribution peaked at the midpoint), not a single uniform roll. Same mean (1.0), but the
 * extreme famine/glut years grow rarer — a gentler difficulty curve without a fixed harvest. Verified
 * DISTRIBUTIONALLY over many years and seeds (the shape can't be read from a single year).
 *
 * All in livingYear §2, which the 200-tick canon never reckons — the baseline instrument guards a sub-year
 * run is unchanged (but for the two demo-rng draws, on the isolated stream).
 */
import { describe, expect, it } from 'vitest';
import { flatSite } from '../src/sim/site';
import { worldStep } from '../src/sim/step';
import { createWorld } from '../src/sim/world';
import { AREA_PER_PERSON, TICKS_PER_YEAR, WEATHER_MAX, WEATHER_MIN, type Farm } from '../src/sim/types';

const site = flatSite('flat', 4000);

/** every harvest's weather multiplier over `years` on one seed */
function weathers(seed: string, years: number): number[] {
  const w = createWorld(seed, site.id);
  const farm: Farm = { id: 9001, wallId: 9000, use: 'farm', points: [], area: AREA_PER_PERSON * 12, gates: [], workdays: 0 };
  w.farms = [farm]; // a living settlement so a harvest is reckoned each year
  for (let i = 0; i < years * TICKS_PER_YEAR; i++) worldStep(w, site, []);
  return w.events
    .filter((e): e is Extract<typeof e, { kind: 'harvest' }> => e.kind === 'harvest')
    .map((e) => e.weather);
}

describe('weather shaped (SIM 31)', () => {
  it('the weather is triangular — extremes rarer than uniform, the mean unmoved', () => {
    const all = ['a', 'b', 'c', 'd'].flatMap((s) => weathers(s, 150));
    expect(all.length).toBeGreaterThan(400); // plenty of years to read the shape

    // the MEAN is unmoved at the midpoint of the bounds (both uniform and triangular share it)
    const mean = all.reduce((a, b) => a + b, 0) / all.length;
    expect(Math.abs(mean - (WEATHER_MIN + WEATHER_MAX) / 2)).toBeLessThan(0.03);

    // the SHAPE: the outer fifth on each side. A UNIFORM roll would land ~40% of years there;
    // the triangular peak pulls that down to ~8% — assert well below the uniform expectation.
    const span = WEATHER_MAX - WEATHER_MIN;
    const lo = WEATHER_MIN + 0.2 * span;
    const hi = WEATHER_MAX - 0.2 * span;
    const extreme = all.filter((x) => x < lo || x > hi).length / all.length;
    expect(extreme).toBeLessThan(0.2); // the extremes are shaped out (uniform would be ~0.4)

    // and it still spans the range — the mildest and harshest years do occur, just seldom
    expect(Math.min(...all)).toBeLessThan(0.85);
    expect(Math.max(...all)).toBeGreaterThan(1.15);
  });
});
