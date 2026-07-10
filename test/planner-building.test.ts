/**
 * Building-mode geometry regressions from the adversarial review:
 * - derived back corners must never leave the world (the cursor is clamped by
 *   pick(), but A+p·depth / B+p·depth are computed — a diagonal front near the
 *   edge could fling them off the site)
 * - a second front corner in the 0.6–2 m crack must be refused at placement
 *   (accepted, it dead-ends: the loop can never close and commits no-op)
 * Runs headless: THREE geometry is node-safe; window/document are stubbed.
 */
import * as THREE from 'three';
import { beforeAll, describe, expect, it } from 'vitest';
import { flatSite } from '../src/sim/site';
import { WallPlanner } from '../src/render/planner';

beforeAll(() => {
  (globalThis as { window?: unknown }).window = { addEventListener: () => {} };
  (globalThis as { document?: unknown }).document = {
    body: { classList: { add: () => {}, remove: () => {} } },
  };
});

function makePlanner(): WallPlanner {
  const dom = { addEventListener: () => {} } as unknown as HTMLElement;
  return new WallPlanner({
    scene: new THREE.Scene(),
    camera: new THREE.PerspectiveCamera(),
    site: flatSite('flat', 4000),
    groundAt: () => 0,
    heightBounds: { min: 0, max: 1 },
    dom,
    onConfirm: () => true,
  });
}

describe('building mode geometry (review regressions)', () => {
  it('caps the depth so derived back corners stay in-world (diagonal front at the edge)', () => {
    const p = makePlanner();
    p.mode = 'building';
    p.active = true;
    p.points.push({ x: 20, y: 1990 }, { x: 34, y: 2004 });
    // an IN-BOUNDS cursor whose perpendicular projection would fling the back
    // corners to x ≈ -145 without the cap
    (p as unknown as { cursor: { x: number; y: number } }).cursor = { x: 200, y: 2500 };
    const loop = p.previewPolyline();
    expect(loop).toHaveLength(6);
    for (const q of loop) {
      expect(q.x).toBeGreaterThanOrEqual(1);
      expect(q.x).toBeLessThanOrEqual(3999);
      expect(q.y).toBeGreaterThanOrEqual(1);
      expect(q.y).toBeLessThanOrEqual(3999);
    }
    // and the cap BINDS: the western corners land exactly on the clamp line
    expect(Math.min(...loop.map((q) => q.x))).toBeCloseTo(1, 3);
  });

  it('refuses a second front corner inside the 0.6–2 m dead-end crack', () => {
    const p = makePlanner();
    p.mode = 'building';
    p.active = true;
    const add = (pt: { x: number; y: number }) =>
      (p as unknown as { addPoint(q: { x: number; y: number }): void }).addPoint(pt);
    add({ x: 2000, y: 2000 });
    add({ x: 2001.2, y: 2000 }); // 1.2 m — legal for a wall, dead-end for a building
    expect(p.points).toHaveLength(1);
    add({ x: 2012, y: 2000 }); // 12 m — a real front
    expect(p.points).toHaveLength(2);
  });

  it('wall mode still accepts closely spaced points beyond MIN_POINT_GAP', () => {
    const p = makePlanner();
    p.mode = 'wall';
    p.active = true;
    const add = (pt: { x: number; y: number }) =>
      (p as unknown as { addPoint(q: { x: number; y: number }): void }).addPoint(pt);
    add({ x: 2000, y: 2000 });
    add({ x: 2001.2, y: 2000 }); // 1.2 m — fine for a wall
    expect(p.points).toHaveLength(2);
  });
});
