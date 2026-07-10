import { describe, expect, it } from 'vitest';
import { hashSeed, Rng } from '../src/sim/rng';

describe('seed-first rng', () => {
  it('same seed => same sequence', () => {
    const a = new Rng(hashSeed('castle'));
    const b = new Rng(hashSeed('castle'));
    for (let i = 0; i < 1000; i++) {
      expect(a.u32()).toBe(b.u32());
    }
  });

  it('different seeds => different sequences', () => {
    const a = new Rng(hashSeed('castle'));
    const b = new Rng(hashSeed('cultivator'));
    const aSeq = Array.from({ length: 8 }, () => a.u32());
    const bSeq = Array.from({ length: 8 }, () => b.u32());
    expect(aSeq).not.toEqual(bSeq);
  });

  it('floats live in [0, 1)', () => {
    const r = new Rng(hashSeed('bounds'));
    for (let i = 0; i < 10000; i++) {
      const f = r.float();
      expect(f).toBeGreaterThanOrEqual(0);
      expect(f).toBeLessThan(1);
    }
  });

  it('int stays in range and pick never returns undefined', () => {
    const r = new Rng(hashSeed('range'));
    const arr = ['a', 'b', 'c'] as const;
    for (let i = 0; i < 1000; i++) {
      const n = r.int(7);
      expect(n).toBeGreaterThanOrEqual(0);
      expect(n).toBeLessThan(7);
      expect(arr).toContain(r.pick(arr));
    }
  });

  it('hashSeed is stable and uint32', () => {
    expect(hashSeed('durham')).toBe(hashSeed('durham'));
    const h = hashSeed('durham');
    expect(h).toBeGreaterThanOrEqual(0);
    expect(h).toBeLessThanOrEqual(0xffffffff);
    expect(Number.isInteger(h)).toBe(true);
  });
});
