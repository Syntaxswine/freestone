/**
 * Headless render smoke: the new SIM 8 layers must construct real geometry
 * from real sim state without throwing (three's geometry math is node-safe;
 * only the GPU upload isn't). Catches crashes-on-first-use; the LOOK still
 * wants an eye in the preview.
 */
import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { FillLayer } from '../src/render/fills';
import { RoofLayer } from '../src/render/roofs';
import { flatSite } from '../src/sim/site';
import { worldStep } from '../src/sim/step';
import { createWorld } from '../src/sim/world';
import type { Command } from '../src/sim/types';

describe('SIM 8 render layers (headless)', () => {
  it('a completed ramp renders a sloped body; stacked fills get distinct tints', () => {
    const site = flatSite('flat', 1000);
    const world = createWorld('smoke', site.id);
    const cmds: Command[] = [
      {
        kind: 'plan_fill',
        tick: 0,
        points: [
          { x: 0, y: 0 },
          { x: 10, y: 0 },
          { x: 10, y: 10 },
          { x: 0, y: 10 },
        ],
        height: 2,
        shape: 'ramp',
      },
      {
        kind: 'plan_fill',
        tick: 0,
        points: [
          { x: 20, y: 0 },
          { x: 30, y: 0 },
          { x: 30, y: 10 },
          { x: 20, y: 10 },
        ],
        height: 1,
      },
    ];
    worldStep(world, site, cmds);
    while (world.fills.some((f) => f.volumeMoved < f.volumeTotal)) worldStep(world, site, []);
    const scene = new THREE.Scene();
    const layer = new FillLayer(world, scene, () => 0);
    layer.update();
    expect(scene.children.length).toBe(2);
    // the ramp's displayed top follows the sim's slope exactly
    expect(layer.topAtSim(5, 5)).toBe(1);
    expect(layer.topAtSim(5, 9.9)).toBeCloseTo(1.98, 6);
    expect(layer.topAtSim(25, 5)).toBe(1); // the flat platform
    // distinct per-fill tints — the dirt-on-dirt fix
    const mats = scene.children.map(
      (g) => ((g as THREE.Group).children[0] as THREE.Mesh).material as THREE.MeshLambertMaterial,
    );
    expect(mats[0]!.color.getHex()).not.toBe(mats[1]!.color.getHex());
  });

  it('a completed roof builds its deck plate', () => {
    const site = flatSite('flat', 1000);
    const world = createWorld('smoke-roof', site.id);
    // masonry DRAWS the stockpile since SIM 16 — a stone wall with a dry pile never
    // rises, so an unsupplied build loop spins FOREVER (it hung the vitest worker
    // and leaked the pool). Seed the pile so the wall can complete and the roof
    // has something to rest on. Geometry smoke test — supply is not what it checks.
    world.stockpile = 1e6;
    const ring = [
      { x: 50, y: 50 },
      { x: 60, y: 50 },
      { x: 60, y: 60 },
      { x: 50, y: 60 },
      { x: 50, y: 50 },
    ];
    worldStep(world, site, [{ kind: 'plan_wall', tick: 0, points: ring, height: 3 }]);
    while (world.walls[0]!.stonesLaid < world.walls[0]!.stonesTotal) worldStep(world, site, []);
    worldStep(world, site, [
      { kind: 'plan_roof', tick: world.tick, points: ring.slice(0, 4) },
    ]);
    worldStep(world, site, [
      {
        kind: 'designate_roof',
        tick: world.tick,
        roofId: world.roofs[0]!.id,
        material: 'brick',
      },
    ]);
    const scene = new THREE.Scene();
    const layer = new RoofLayer(world, scene);
    layer.update();
    expect(scene.children.length).toBe(0); // nothing shows while the work is open
    while (world.roofs[0]!.workDone < world.roofs[0]!.workTotal) worldStep(world, site, []);
    layer.update();
    expect(scene.children.length).toBe(1); // the deck appears at completion
    const group = scene.children[0] as THREE.Group;
    expect(group.children.length).toBe(2); // plate + edge band
  });
});
