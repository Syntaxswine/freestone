/**
 * The plot is the plan (SCOPE §6): footprint size/shape names the building.
 * Bins are vernacular typology anchored on roof span — keep these cases in
 * step with the SCOPE canon when the citation pass lands.
 */
import { describe, expect, it } from 'vitest';
import { describeFootprint } from '../src/render/planner';

describe('describeFootprint — the plot is the plan', () => {
  it('names the vernacular ladder', () => {
    expect(describeFootprint(3, 3).label).toBe('a shed');
    expect(describeFootprint(5, 4).label).toBe('a cot');
    expect(describeFootprint(8, 6).label).toBe('a house');
    expect(describeFootprint(18, 5).label).toBe('a longhouse');
    expect(describeFootprint(15, 5).label).toBe('a longhouse');
    expect(describeFootprint(12, 10).label).toBe('a hall');
    expect(describeFootprint(30, 9).label).toBe('a great barn');
    // Great Coxwell tithe barn, 44 x 13 m — the real thing classifies as itself
    expect(describeFootprint(44, 13).label).toBe('a great barn');
  });

  it('orientation does not matter', () => {
    expect(describeFootprint(5, 18).label).toBe('a longhouse');
    expect(describeFootprint(9, 30).label).toBe('a great barn');
  });

  it('the master mason warns when the span wants aisles', () => {
    expect(describeFootprint(18, 5).note).toBeUndefined();
    expect(describeFootprint(30, 9).note).toContain('aisles');
    expect(describeFootprint(12, 10).note).toContain('aisles');
    expect(describeFootprint(44, 13).note).toContain('aisles');
  });
});
