/**
 * SIM 14 groundwork: the bed model query (src/sim/beds.ts).
 * Load-bearing claims: a surface-registered column reads the nearest real hole;
 * strataAt walks depth-below-surface to the right material and, below the deepest
 * logged bed, assumes more of the deepest material; the dig-rate ladder matches
 * the VERIFIED ILO spine (sandstone ≈ 1/6 the pace of drift); and stone yield is
 * the boss's deliberate generous inversion (sandstone > 1.0).
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  bedModelFromJson,
  DIG_RATE,
  emptyBedModel,
  GROUND_MATERIALS,
  STONE_YIELD,
  type BedsJson,
} from '../src/sim/beds';

const synthetic: BedsJson = {
  site: 'test',
  frame: { originE: 0, originN: 0 },
  materials: [...GROUND_MATERIALS],
  holes: [
    {
      ref: 'A',
      x: 0,
      y: 0,
      rockhead: 5,
      totalDepth: 30,
      column: [
        { m: 'drift', top: 0, base: 5 },
        { m: 'sandstone', top: 5, base: 12 },
        { m: 'mudstone', top: 12, base: 20 },
        { m: 'coal', top: 20, base: 20.5 },
        { m: 'sandstone', top: 20.5, base: 30 },
      ],
    },
    {
      ref: 'B',
      x: 100,
      y: 0,
      rockhead: 2,
      totalDepth: 10,
      column: [
        { m: 'drift', top: 0, base: 2 },
        { m: 'mudstone', top: 2, base: 10 },
      ],
    },
  ],
  seams: {
    Hutton: { observations: 4, plane: { a: -0.001, b: -0.0003, c: 40, cE: 427420, cN: 542150, dipDeg: 0.6, downDipAzimuthDeg: 100 } },
    Maudlin: { observations: 2, plane: null },
  },
};

describe('bed model query', () => {
  const m = bedModelFromJson(synthetic);

  it('reads strata from the nearest hole, by depth below surface', () => {
    expect(m.strataAt(0, 0, 0)).toBe('drift'); // surface
    expect(m.strataAt(0, 0, 4.9)).toBe('drift'); // still overburden
    expect(m.strataAt(0, 0, 5)).toBe('sandstone'); // rockhead — the post
    expect(m.strataAt(0, 0, 15)).toBe('mudstone'); // the metal
    expect(m.strataAt(0, 0, 20.2)).toBe('coal'); // a seam
    expect(m.strataAt(0, 0, 25)).toBe('sandstone'); // post again
  });

  it('snaps a query to the nearest borehole', () => {
    expect(m.nearestHole(10, 0)?.ref).toBe('A');
    expect(m.nearestHole(90, 0)?.ref).toBe('B');
    // hole B is shallower rock — rockhead differs by location
    expect(m.rockheadAt(0, 0)).toBe(5);
    expect(m.rockheadAt(100, 0)).toBe(2);
  });

  it('below the deepest logged bed, assumes more of the deepest material', () => {
    expect(m.strataAt(0, 0, 999)).toBe('sandstone'); // hole A ends in post
    expect(m.strataAt(100, 0, 999)).toBe('mudstone'); // hole B ends in metal
  });

  it('above ground reads as overburden, never crashes', () => {
    expect(m.strataAt(0, 0, -3)).toBe('drift');
  });

  it('exposes only fitted seam planes', () => {
    expect(m.seams.Hutton).toBeDefined();
    expect(m.seams.Maudlin).toBeUndefined(); // plane was null
  });

  it('empty model answers safely', () => {
    const e = emptyBedModel();
    expect(e.strataAt(0, 0, 5)).toBe('unknown');
    expect(e.rockheadAt(0, 0)).toBe(0);
    expect(e.nearestHole(0, 0)).toBeNull();
  });
});

describe('dig-rate and yield constants (verified spine)', () => {
  it('covers every ground material', () => {
    for (const g of GROUND_MATERIALS) {
      expect(DIG_RATE[g]).toBeTypeOf('number');
      expect(STONE_YIELD[g]).toBeTypeOf('number');
    }
  });

  it('matches the ILO ladder shape: sandstone ≈ 1/6 the pace of drift', () => {
    expect(DIG_RATE.sandstone).toBe(0.8); // ILO rock, verified at source
    expect(DIG_RATE.drift).toBe(4.0);
    expect(DIG_RATE.mudstone).toBeGreaterThan(DIG_RATE.sandstone);
    expect(DIG_RATE.drift / DIG_RATE.sandstone).toBeGreaterThan(4); // "factor of 4+"
    expect(DIG_RATE.void).toBe(0); // open ground, nothing to dig
  });

  it('stone yield is the deliberate generous inversion (building stone > 1.0)', () => {
    expect(STONE_YIELD.sandstone).toBeGreaterThan(1.0); // real recovery is ~0.29
    expect(STONE_YIELD.limestone).toBeGreaterThan(1.0);
    expect(STONE_YIELD.drift).toBe(0); // spoil, not stone
    expect(STONE_YIELD.mudstone).toBe(0); // rubble-grade only
    expect(STONE_YIELD.coal).toBe(0); // fuel, not stone
  });
});

describe('real beds.json artifact', () => {
  it('loads and answers a peninsula query sensibly', () => {
    const json = JSON.parse(
      readFileSync(resolve(__dirname, '../public/data/site-durham/beds.json'), 'utf8'),
    ) as BedsJson;
    const m = bedModelFromJson(json);
    expect(m.holes.length).toBeGreaterThan(10);
    // Palace Green (E427420 N542150) → site-local via the frame origin
    const px = 427420 - json.frame.originE;
    const py = 542150 - json.frame.originN;
    expect(m.nearestHole(px, py)).not.toBeNull();
    // shallow is overburden, deep is rock somewhere in the column
    expect(m.strataAt(px, py, 0)).toBe('drift');
    const deep = m.strataAt(px, py, 40);
    expect(GROUND_MATERIALS).toContain(deep);
  });
});
