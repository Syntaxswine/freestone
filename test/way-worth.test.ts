/**
 * SIM 42: THE WAY'S WORTH — the bands, PINNED. A causeway is worth building in proportion to how
 * SOFT the ground it crosses is (DIGEST-2026-07-17 §2: firm dry ~1×, ordinary earth ~3×, bog ~5×).
 * `wayMultForDepth` maps depth-to-water → that multiplier; the boundary averages it along the run.
 *
 * WHY THIS TEST EXISTS: the SIM-39 calibration INVERTED these bands (made firm the default) and
 * shipped that way, near-inert on the real Durham map — and NO test caught it; it took the live
 * terrain, read through the new way-worth readout, to expose the lie. This is that missing guard.
 * If a future edit re-inverts the bands (firm as default, or the ordinary→3× anchor drifting far),
 * these assertions fail LOUDLY instead of the map going quietly worthless.
 */
import { describe, expect, it } from 'vitest';
import { WAY_DRY_DEPTH, WAY_MULT_FIRM, WAY_MULT_SOFT, wayMultForDepth } from '../src/sim/types';

describe('the way-worth bands (SIM 42)', () => {
  it('standing bog (the table at the surface) is the MOST worth a road', () => {
    expect(wayMultForDepth(0)).toBeCloseTo(WAY_MULT_SOFT, 6); // ~5× — a real road
  });

  it('firm dry ground (the table WAY_DRY_DEPTH down, or deeper) is the LEAST — planks on rock', () => {
    expect(wayMultForDepth(WAY_DRY_DEPTH)).toBeCloseTo(WAY_MULT_FIRM, 6); // ~1.15×
    expect(wayMultForDepth(WAY_DRY_DEPTH + 50)).toBeCloseTo(WAY_MULT_FIRM, 6); // clamped, never below
    expect(wayMultForDepth(-3)).toBeCloseTo(WAY_MULT_SOFT, 6); // a flooded cell clamps to wettest
  });

  it("★ ORDINARY EARTH reads ~3× — the evidence's default, the SIM-39 INVERSION this guards against", () => {
    // Durham's MEASURED median depth-to-water is ~13.5 m; ordinary earth must land near 3× (not
    // near firm). If this drifts toward WAY_MULT_FIRM, the way has gone inert on the map again.
    const ordinary = wayMultForDepth(13.5);
    expect(ordinary).toBeGreaterThan(2.5);
    expect(ordinary).toBeLessThan(3.6);
    // and it is unambiguously nearer the ordinary-earth band than the firm band
    expect(Math.abs(ordinary - 3)).toBeLessThan(Math.abs(ordinary - WAY_MULT_FIRM));
  });

  it('the worth is monotone: wetter ground is never worth LESS than drier', () => {
    let prev = Infinity;
    for (let depth = 0; depth <= WAY_DRY_DEPTH + 5; depth += 1) {
      const m = wayMultForDepth(depth);
      expect(m).toBeLessThanOrEqual(prev + 1e-9); // non-increasing in depth
      expect(m).toBeGreaterThanOrEqual(WAY_MULT_FIRM - 1e-9); // never below firm
      expect(m).toBeLessThanOrEqual(WAY_MULT_SOFT + 1e-9); // never above bog
      prev = m;
    }
  });
});
