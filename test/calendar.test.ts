/**
 * THE CIVIC CALENDAR (step 0 of the living settlement) — the one clock the whole
 * generational layer reads. These lock the pure season function and the boundary
 * math Sit-the-Season fast-forwards to. Pure functions of tick: no world, no rng,
 * no hash — so they are cheap to pin exhaustively.
 */
import { describe, expect, it } from 'vitest';
import {
  SEASONS,
  TICKS_PER_YEAR,
  dayOfYear,
  seasonOf,
  ticksUntilNextSeason,
  yearOf,
} from '../src/sim/types';

describe('the civic calendar — season as a pure function of tick', () => {
  it('names four seasons in calendar order', () => {
    expect(SEASONS).toEqual(['winter', 'spring', 'summer', 'autumn']);
  });

  it('places each season at its bound (coarsening of the farm crop bands)', () => {
    expect(seasonOf(0)).toBe('winter'); // deep winter opens the year
    expect(seasonOf(59)).toBe('winter');
    expect(seasonOf(60)).toBe('spring'); // spring begins day 60
    expect(seasonOf(120)).toBe('spring');
    expect(seasonOf(121)).toBe('summer'); // summer runs long, through harvest
    expect(seasonOf(243)).toBe('summer');
    expect(seasonOf(244)).toBe('autumn'); // the short autumn after the stubble
    expect(seasonOf(304)).toBe('autumn');
    expect(seasonOf(305)).toBe('winter'); // and back to winter
    expect(seasonOf(364)).toBe('winter');
  });

  it('repeats every year and survives negative ticks', () => {
    expect(seasonOf(TICKS_PER_YEAR)).toBe('winter'); // day 0 of Year 2
    expect(seasonOf(TICKS_PER_YEAR + 60)).toBe('spring');
    expect(seasonOf(10 * TICKS_PER_YEAR + 130)).toBe('summer');
    expect(dayOfYear(-1)).toBe(364);
    expect(seasonOf(-1)).toBe('winter'); // no throw, wraps cleanly
  });

  it('counts the year from 1', () => {
    expect(yearOf(0)).toBe(1);
    expect(yearOf(364)).toBe(1);
    expect(yearOf(365)).toBe(2);
    expect(yearOf(3 * TICKS_PER_YEAR)).toBe(4);
  });

  it('measures the ticks to the next season turn', () => {
    expect(ticksUntilNextSeason(0)).toBe(60); // winter → spring at day 60
    expect(ticksUntilNextSeason(59)).toBe(1);
    expect(ticksUntilNextSeason(60)).toBe(61); // spring → summer at 121
    expect(ticksUntilNextSeason(120)).toBe(1);
    expect(ticksUntilNextSeason(121)).toBe(123); // summer → autumn at 244
    expect(ticksUntilNextSeason(243)).toBe(1);
    expect(ticksUntilNextSeason(244)).toBe(61); // autumn → winter at 305
    expect(ticksUntilNextSeason(304)).toBe(1);
    expect(ticksUntilNextSeason(305)).toBe(120); // winter → next spring, through year's end
    expect(ticksUntilNextSeason(364)).toBe(61);
  });

  it('the boundary invariant: the jump lands exactly on a season change', () => {
    for (let t = 0; t < 2 * TICKS_PER_YEAR; t++) {
      const d = ticksUntilNextSeason(t);
      expect(d).toBeGreaterThanOrEqual(1);
      expect(d).toBeLessThanOrEqual(TICKS_PER_YEAR);
      // the day before the jump is still this season; the jump itself is the next
      expect(seasonOf(t + d - 1)).toBe(seasonOf(t));
      expect(seasonOf(t + d)).not.toBe(seasonOf(t));
    }
  });
});
