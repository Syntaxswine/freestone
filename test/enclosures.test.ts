/**
 * SIM 3: farms + buildings recognized from enclosure geometry.
 * The load-bearing claims: a completed closed LOW ring establishes a farm
 * (boss canon 2026-07-09 — "farms are made by building a low wall, .5m around
 * a piece of land"); a completed near-closed TALL ring with a doorway gap
 * completes a building whose kind the footprint names; crossed, tiny, open or
 * wrong-height rings are recognized as nothing; and it all replays.
 */
import { describe, expect, it } from 'vitest';
import { classifyFootprint, reduceCorners } from '../src/sim/classify';
import { hashState, makeSave, replay } from '../src/sim/save';
import { flatSite } from '../src/sim/site';
import { polygonArea, worldStep } from '../src/sim/step';
import { createWorld } from '../src/sim/world';
import type { Command, Vec2 } from '../src/sim/types';

/** closed 20×20 field ring — 80 m of wall, exact closure (the snap's copy) */
const FIELD_RING: Vec2[] = [
  { x: 100, y: 100 },
  { x: 120, y: 100 },
  { x: 120, y: 120 },
  { x: 100, y: 120 },
  { x: 100, y: 100 },
];

/** the planner's doorway loop: 8×6 shell, 1.1 m gap at the front-edge middle */
const DOORWAY_LOOP: Vec2[] = [
  { x: 104.55, y: 100 }, // jamb, B side
  { x: 108, y: 100 },
  { x: 108, y: 106 },
  { x: 100, y: 106 },
  { x: 100, y: 100 },
  { x: 103.45, y: 100 }, // jamb, A side
];

function run(commands: Command[], days: number, seed = 'enclosures') {
  const site = flatSite('flat', 1000);
  const world = createWorld(seed, site.id);
  const byTick = new Map<number, Command[]>();
  for (const c of commands) {
    const b = byTick.get(c.tick);
    if (b) b.push(c);
    else byTick.set(c.tick, [c]);
  }
  for (let i = 0; i < days; i++) worldStep(world, site, byTick.get(world.tick) ?? []);
  return { world, site };
}

const wall = (points: Vec2[], height: number): Command => ({
  kind: 'plan_wall',
  tick: 0,
  points,
  height,
});

describe('farms', () => {
  it('a completed closed low ring establishes a farm the day the wall stands', () => {
    const { world } = run([wall(FIELD_RING, 0.5)], 100);
    const w = world.walls[0]!;
    expect(w.stonesLaid).toBe(w.stonesTotal); // the wall is done
    expect(world.farms).toHaveLength(1);
    const farm = world.farms[0]!;
    expect(farm.wallId).toBe(w.id);
    expect(farm.area).toBe(400); // 20 × 20, shoelace-exact on the open ring
    expect(farm.points).toHaveLength(4); // duplicate closing vertex dropped
    const done = world.events.find((e) => e.kind === 'wall_complete')!;
    const est = world.events.find((e) => e.kind === 'farm_established')!;
    expect(est.tick).toBe(done.tick); // recognized at completion, same day
    expect((est as { area: number }).area).toBe(400);
  });

  it('a sub-stone closing gap still closes (tolerant closure)', () => {
    const nearClosed = [...FIELD_RING.slice(0, 4), { x: 100, y: 100.3 }];
    const { world } = run([wall(nearClosed, 0.5)], 100);
    expect(world.farms).toHaveLength(1);
    expect(world.farms[0]!.area).toBe(400); // the extra vertex is collinear on the west wall
    expect(world.farms[0]!.points).toHaveLength(5); // tiny closing edge kept, no vertex dropped
  });

  it('a tall closed ring is a yard wall, not a farm', () => {
    const { world } = run([wall(FIELD_RING, 2)], 400);
    expect(world.walls[0]!.stonesLaid).toBe(world.walls[0]!.stonesTotal);
    expect(world.farms).toHaveLength(0);
    expect(world.buildings).toHaveLength(0); // and closure means it is no building either
  });

  it('an open wall encloses nothing', () => {
    const { world } = run([wall(FIELD_RING.slice(0, 4), 0.5)], 100); // C-shape, 20 m gap
    expect(world.walls[0]!.stonesLaid).toBe(world.walls[0]!.stonesTotal);
    expect(world.farms).toHaveLength(0);
    expect(world.buildings).toHaveLength(0);
  });

  it('a ring smaller than a farm is recognized as nothing', () => {
    const tiny: Vec2[] = [
      { x: 0, y: 0 },
      { x: 4, y: 0 },
      { x: 4, y: 4 },
      { x: 0, y: 4 },
      { x: 0, y: 0 },
    ];
    const { world } = run([wall(tiny, 0.5)], 100);
    expect(world.farms).toHaveLength(0); // 16 m² < 25
  });

  it('a bowtie ring builds a wall but encloses no field (the fill validator\'s lesson)', () => {
    const bowtie: Vec2[] = [
      { x: 0, y: 0 },
      { x: 20, y: 0 },
      { x: 0, y: 20 },
      { x: 20, y: 20 },
      { x: 0, y: 0 },
    ];
    const { world } = run([wall(bowtie, 0.5)], 200);
    expect(world.walls[0]!.stonesLaid).toBe(world.walls[0]!.stonesTotal); // legal masonry
    expect(world.farms).toHaveLength(0); // shoelace and even-odd disagree on crossed rings
  });
});

describe('buildings', () => {
  it('the doorway loop completes as a building named by its footprint', () => {
    const { world } = run([wall(DOORWAY_LOOP, 3)], 100);
    expect(world.buildings).toHaveLength(1);
    const b = world.buildings[0]!;
    expect(b.kind).toBe('house'); // 8 × 6 = 48 m²
    expect(b.area).toBeCloseTo(48, 6);
    expect(b.wallId).toBe(world.walls[0]!.id);
    const evt = world.events.find((e) => e.kind === 'building_complete')!;
    expect((evt as { buildingKind: string }).buildingKind).toBe('house');
  });

  it('a low ring with a doorway gap shelters nothing and farms nothing', () => {
    const { world } = run([wall(DOORWAY_LOOP, 1)], 100);
    expect(world.buildings).toHaveLength(0); // below headroom
    expect(world.farms).toHaveLength(0); // the gap means it is not closed
  });

  it('an irregular near-closed ring falls back to area-only classification', () => {
    const staircase: Vec2[] = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
      { x: 4, y: 10 },
      { x: 4, y: 6 },
      { x: 0, y: 6 },
      { x: 0, y: 1.5 }, // 1.5 m doorway back to the start
    ];
    const { world } = run([wall(staircase, 3)], 200);
    expect(world.buildings).toHaveLength(1);
    expect(world.buildings[0]!.area).toBeCloseTo(84, 6); // 100 − the 4×4 notch
    expect(world.buildings[0]!.kind).toBe('house'); // 84 m²: not a cot, not yet a hall
  });

  it('reduceCorners collapses the doorway loop to its 4 true corners', () => {
    const corners = reduceCorners(DOORWAY_LOOP);
    expect(corners).toHaveLength(4);
    expect(corners).toContainEqual({ x: 108, y: 100 });
    expect(corners).toContainEqual({ x: 108, y: 106 });
    expect(corners).toContainEqual({ x: 100, y: 106 });
    expect(corners).toContainEqual({ x: 100, y: 100 });
  });

  it('classifyFootprint bins hold at the vernacular boundaries', () => {
    expect(classifyFootprint(11, 4, 2.75)).toBe('shed');
    expect(classifyFootprint(39, 7.8, 5)).toBe('cot');
    expect(classifyFootprint(96, 16, 6)).toBe('longhouse'); // long and narrow
    expect(classifyFootprint(192, 32, 6)).toBe('great_barn'); // longhouse outgrown
    expect(classifyFootprint(240, 24, 10)).toBe('great_barn'); // wide but barn-proportioned
    expect(classifyFootprint(120, 12, 10)).toBe('hall');
    expect(classifyFootprint(48, 8, 6)).toBe('house');
  });
});

describe('replay', () => {
  it('farms and buildings replay identically from a save', () => {
    const site = flatSite('flat', 1000);
    const world = createWorld('enclosures-replay', site.id);
    const log: Command[] = [wall(FIELD_RING, 0.5), wall(DOORWAY_LOOP, 3)];
    const byTick = new Map<number, Command[]>();
    byTick.set(0, log);
    for (let i = 0; i < 120; i++) worldStep(world, site, byTick.get(world.tick) ?? []);
    expect(world.farms).toHaveLength(1);
    expect(world.buildings).toHaveLength(1);
    const replayed = replay(makeSave(world, log), site);
    expect(hashState(replayed)).toBe(hashState(world));
  });
});

describe('geometry helpers', () => {
  it('polygonArea is exact on the canonical rings', () => {
    expect(polygonArea(FIELD_RING.slice(0, 4))).toBe(400);
    expect(polygonArea(DOORWAY_LOOP)).toBeCloseTo(48, 9);
  });
});
