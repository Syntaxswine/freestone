/**
 * Seed-first deterministic RNG (house law: the rng cursor lives in WorldState.rng
 * and only worldStep may advance it — render and UI never touch it).
 *
 * hashSeed: xmur3 string hash -> uint32 initial cursor.
 * Rng: mulberry32 stream over a mutable cursor. Create it FROM state at the top of
 * a step, write the cursor BACK to state at the end. Never construct one anywhere else.
 */

export function hashSeed(seed: string): number {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return (h ^ (h >>> 16)) >>> 0;
}

export class Rng {
  constructor(public state: number) {}

  /** mulberry32 */
  u32(): number {
    let t = (this.state = (this.state + 0x6d2b79f5) >>> 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return (t ^ (t >>> 14)) >>> 0;
  }

  /** [0, 1) */
  float(): number {
    return this.u32() / 4294967296;
  }

  /** [0, maxExclusive) — modulo bias is acceptable at game scale */
  int(maxExclusive: number): number {
    return this.u32() % maxExclusive;
  }

  pick<T>(arr: readonly T[]): T {
    const v = arr[this.int(arr.length)];
    if (v === undefined) throw new Error('Rng.pick on empty array');
    return v;
  }
}
