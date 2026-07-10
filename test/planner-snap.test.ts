/**
 * ⇧-held geometry snap (boss request 2026-07-10): while shift is down the
 * pick magnetizes to existing walls — corners (wall vertices + own placed
 * points) outrank points ON a segment; radii are screen-space; shift up
 * means no snap at all. ROOF mode (boss finding 2026-07-10: "it snaps to
 * the bottom of walls instead of the tops") magnetizes at wall TOPS, only
 * to FINISHED walls, and works even when the ground pick missed (a corner
 * aimed at against the sky). Headless: real THREE camera math, stubbed DOM.
 */
import * as THREE from 'three';
import { beforeAll, describe, expect, it } from 'vitest';
import { WallPlanner, type SnapWall } from '../src/render/planner';
import { flatSite } from '../src/sim/site';
import type { Vec2 } from '../src/sim/types';

beforeAll(() => {
  (globalThis as { window?: unknown }).window = { addEventListener: () => {} };
  (globalThis as { document?: unknown }).document = {
    body: { classList: { add: () => {}, remove: () => {} } },
  };
});

const RECT = { left: 0, top: 0, width: 800, height: 600 };

/** one straight 20 m wall, west corner (1990,2000), east corner (2010,2000) */
const WALL: Vec2[] = [
  { x: 1990, y: 2000 },
  { x: 2010, y: 2000 },
];

function makeCamera(): THREE.PerspectiveCamera {
  const camera = new THREE.PerspectiveCamera(55, RECT.width / RECT.height, 0.1, 5000);
  camera.position.set(2000, 40, 1960); // south of the wall, looking north-down
  camera.lookAt(2000, 0, 2000);
  camera.updateMatrixWorld(true);
  return camera;
}

function makePlanner(
  camera: THREE.PerspectiveCamera,
  targets: SnapWall[] = [{ points: WALL, height: 3, complete: true }],
): WallPlanner {
  const dom = {
    addEventListener: () => {},
    getBoundingClientRect: () => RECT,
  } as unknown as HTMLElement;
  return new WallPlanner({
    scene: new THREE.Scene(),
    camera,
    site: flatSite('flat', 4000),
    groundAt: () => 0,
    heightBounds: { min: 0, max: 1 },
    dom,
    onConfirm: () => true,
    snapTargets: () => targets,
  });
}

/** the same world→pixels mapping screenOf uses (flat ground at 0; z overrides) */
function screenAt(
  camera: THREE.PerspectiveCamera,
  p: Vec2,
  z = 0,
): { x: number; y: number } {
  const v = new THREE.Vector3(p.x, z, p.y).project(camera);
  return {
    x: RECT.left + ((v.x + 1) / 2) * RECT.width,
    y: RECT.top + ((1 - v.y) / 2) * RECT.height,
  };
}

describe('⇧ geometry snap', () => {
  it('shift up: the pick is returned untouched', () => {
    const camera = makeCamera();
    const p = makePlanner(camera);
    const s = screenAt(camera, { x: 1990.3, y: 2000.2 });
    const out = p.geoSnap(
      { clientX: s.x, clientY: s.y, shiftKey: false },
      { x: 1990.3, y: 2000.2 },
    );
    expect(out).toEqual({ x: 1990.3, y: 2000.2 });
    expect(p.snapped).toBe(false);
  });

  it('snaps to a wall corner within the radius — an exact copy', () => {
    const camera = makeCamera();
    const p = makePlanner(camera);
    const corner = screenAt(camera, WALL[0]!);
    const out = p.geoSnap(
      { clientX: corner.x + 5, clientY: corner.y + 3, shiftKey: true },
      { x: 1990.4, y: 2000.6 },
    );
    expect(out).toEqual({ x: 1990, y: 2000 });
    expect(p.snapped).toBe(true);
  });

  it('far from everything: no snap even with shift held', () => {
    const camera = makeCamera();
    const p = makePlanner(camera);
    const away = { x: 1990, y: 2020 }; // 20 m north of the wall
    const s = screenAt(camera, away);
    const out = p.geoSnap({ clientX: s.x, clientY: s.y, shiftKey: true }, away);
    expect(out).toEqual(away);
    expect(p.snapped).toBe(false);
  });

  it('snaps onto the wall segment when no corner is near', () => {
    const camera = makeCamera();
    const p = makePlanner(camera);
    const near = { x: 2000, y: 2000.8 }; // 0.8 m off the wall's middle
    const s = screenAt(camera, near);
    const out = p.geoSnap({ clientX: s.x, clientY: s.y, shiftKey: true }, near);
    expect(out).toEqual({ x: 2000, y: 2000 }); // exact projection onto the line
    expect(p.snapped).toBe(true);
  });

  it('a corner outranks the edge under it — joints land on joints', () => {
    const camera = makeCamera();
    const p = makePlanner(camera);
    const near = { x: 1991, y: 2000.3 }; // over the segment AND ~1 m from the corner
    const s = screenAt(camera, near);
    const out = p.geoSnap({ clientX: s.x, clientY: s.y, shiftKey: true }, near);
    expect(out).toEqual({ x: 1990, y: 2000 });
  });

  it('snaps to the points already placed this drawing', () => {
    const camera = makeCamera();
    const p = makePlanner(camera);
    p.points.push({ x: 2005, y: 2010 });
    const s = screenAt(camera, { x: 2005, y: 2010 });
    const out = p.geoSnap(
      { clientX: s.x + 4, clientY: s.y - 2, shiftKey: true },
      { x: 2005.5, y: 2010.4 },
    );
    expect(out).toEqual({ x: 2005, y: 2010 });
  });
});

describe('roof-mode snap — wall TOPS (boss finding 2026-07-10)', () => {
  it('aiming at the visible TOP corner snaps; aiming at the base no longer does', () => {
    const camera = makeCamera();
    const p = makePlanner(camera);
    p.mode = 'roof';
    const top = screenAt(camera, WALL[0]!, 3); // the 3 m wall's visible top corner
    const base = screenAt(camera, WALL[0]!, 0);
    // the two aims are genuinely distinct on screen (else the test proves nothing)
    expect(Math.hypot(top.x - base.x, top.y - base.y)).toBeGreaterThan(16);
    const out = p.geoSnap(
      { clientX: top.x, clientY: top.y, shiftKey: true },
      { x: 1990.5, y: 2000.5 },
    );
    expect(out).toEqual({ x: 1990, y: 2000 }); // the top aim lands the corner
    expect(p.snapped).toBe(true);
    p.geoSnap({ clientX: base.x, clientY: base.y, shiftKey: true }, { x: 1990.2, y: 2000.2 });
    expect(p.snapped).toBe(false); // the base aim (the old behavior) is dead
  });

  it('walls still at work do not magnetize a roof (the sim support rule, mirrored)', () => {
    const camera = makeCamera();
    const p = makePlanner(camera, [{ points: WALL, height: 3, complete: false }]);
    p.mode = 'roof';
    const top = screenAt(camera, WALL[0]!, 3);
    const picked = { x: 1990.5, y: 2000.5 };
    const out = p.geoSnap({ clientX: top.x, clientY: top.y, shiftKey: true }, picked);
    expect(out).toEqual(picked); // nothing finished, nothing held
    expect(p.snapped).toBe(false);
  });

  it('a sky pick (ray missed the ground) still lands on a corner', () => {
    const camera = makeCamera();
    const p = makePlanner(camera);
    p.mode = 'roof';
    const top = screenAt(camera, WALL[1]!, 3);
    const out = p.geoSnap({ clientX: top.x, clientY: top.y, shiftKey: true }, null);
    expect(out).toEqual({ x: 2010, y: 2000 });
    expect(p.snapped).toBe(true);
  });

  it('wall mode still snaps at the base — only the roof flies', () => {
    const camera = makeCamera();
    const p = makePlanner(camera);
    const base = screenAt(camera, WALL[0]!, 0);
    const out = p.geoSnap(
      { clientX: base.x + 4, clientY: base.y + 3, shiftKey: true },
      { x: 1990.4, y: 2000.4 },
    );
    expect(out).toEqual({ x: 1990, y: 2000 });
    expect(p.snapped).toBe(true);
  });
});
