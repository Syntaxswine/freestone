/**
 * SIM 8: ramp fills + roofs.
 * The load-bearing claims: a ramp's billed volume is the honest wedge and its
 * finished surface slopes from the FIRST-placed edge (masonry grounds on the
 * slope); a roof must rest every corner on a finished wall, laborers deck it
 * after the earth is moved, and a completed BRICK deck is ground — the next
 * storey's walls stand on it. Wood caps a void and carries nothing.
 */
import { describe, expect, it } from 'vitest';
import { hashState, makeSave, replay } from '../src/sim/save';
import { flatSite } from '../src/sim/site';
import { effectiveGroundAt, fillSurfaceAt, worldStep } from '../src/sim/step';
import { createWorld } from '../src/sim/world';
import { ROOF_DECK, type Command, type Vec2 } from '../src/sim/types';

const RAMP_RING: Vec2[] = [
  { x: 0, y: 0 },
  { x: 10, y: 0 }, // first edge — the toe: ground level here
  { x: 10, y: 10 },
  { x: 0, y: 10 },
];

const SHELL_RING: Vec2[] = [
  { x: 50, y: 50 },
  { x: 60, y: 50 },
  { x: 60, y: 60 },
  { x: 50, y: 60 },
  { x: 50, y: 50 },
];

function run(commands: Command[], days: number, seed = 'ramps-roofs') {
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

describe('ramps', () => {
  it('bills the wedge and slopes from the first-placed edge', () => {
    const { world, site } = run(
      [{ kind: 'plan_fill', tick: 0, points: RAMP_RING, height: 2, shape: 'ramp' }],
      1,
    );
    const f = world.fills[0]!;
    expect(f.shape).toBe('ramp');
    expect(f.level).toBe(2);
    expect(f.rampLowG).toBe(0);
    expect(f.volumeTotal).toBe(100); // 100 m² × mean surface 1 m — half the platform
    // run it out and check the finished slope
    while (f.volumeMoved < f.volumeTotal) worldStep(world, site, []);
    expect(fillSurfaceAt(f, 5, 0)).toBe(0); // the toe
    expect(fillSurfaceAt(f, 5, 5)).toBe(1); // halfway up
    expect(fillSurfaceAt(f, 5, 10)).toBe(2); // the crest
    expect(effectiveGroundAt(world, site, 5, 5)).toBe(1);
    expect(effectiveGroundAt(world, site, 5, 9.99)).toBeCloseTo(1.998, 3);
  });

  it('masonry grounds per-column on the slope', () => {
    const { world, site } = run(
      [{ kind: 'plan_fill', tick: 0, points: RAMP_RING, height: 2, shape: 'ramp' }],
      1,
    );
    while (world.fills[0]!.volumeMoved < world.fills[0]!.volumeTotal) worldStep(world, site, []);
    worldStep(world, site, [
      {
        kind: 'plan_wall',
        tick: world.tick,
        points: [
          { x: 5, y: 2 },
          { x: 5, y: 8 },
        ],
        height: 0.5,
      },
    ]);
    while (world.walls[0]!.stonesLaid < world.walls[0]!.stonesTotal) worldStep(world, site, []);
    const low = world.stones.filter((s) => s.pos[1] < 3);
    const high = world.stones.filter((s) => s.pos[1] > 7);
    expect(low.length).toBeGreaterThan(0);
    expect(high.length).toBeGreaterThan(0);
    // same course, higher ground: the wall follows the ramp up
    expect(Math.min(...high.map((s) => s.pos[2]))).toBeGreaterThan(
      Math.max(...low.map((s) => s.pos[2])) - 0.25,
    );
  });

  it('an unknown fill shape is rejected with a constant reason', () => {
    const { world } = run(
      [
        {
          kind: 'plan_fill',
          tick: 0,
          points: RAMP_RING,
          height: 1,
          shape: 'dome' as never,
        },
      ],
      1,
    );
    expect(world.fills).toHaveLength(0);
    const reasons = world.events
      .filter((e) => e.kind === 'command_rejected')
      .map((e) => (e as { reason: string }).reason);
    expect(reasons).toEqual(['unknown fill shape']);
  });
});

describe('roofs', () => {
  function shellWorld() {
    const { world, site } = run([{ kind: 'plan_wall', tick: 0, points: SHELL_RING, height: 3 }], 1);
    while (world.walls[0]!.stonesLaid < world.walls[0]!.stonesTotal) worldStep(world, site, []);
    return { world, site };
  }

  it('a brick deck spans the shell and becomes the next floor', () => {
    const { world, site } = shellWorld();
    worldStep(world, site, [
      { kind: 'plan_roof', tick: world.tick, points: SHELL_RING.slice(0, 4), material: 'brick' },
    ]);
    const roof = world.roofs[0]!;
    expect(roof.level).toBe(3); // flat site: wall top
    expect(roof.workTotal).toBe(100); // 10 × 10 m² of decking
    while (roof.workDone < roof.workTotal) worldStep(world, site, []);
    expect(world.events.some((e) => e.kind === 'roof_complete')).toBe(true);
    // the deck IS ground now
    expect(effectiveGroundAt(world, site, 55, 55)).toBe(3 + ROOF_DECK);
    // and another layer stands on it
    worldStep(world, site, [
      {
        kind: 'plan_wall',
        tick: world.tick,
        points: [
          { x: 52, y: 55 },
          { x: 58, y: 55 },
        ],
        height: 1,
      },
    ]);
    const upstairs = world.walls[1]!;
    while (upstairs.stonesLaid < upstairs.stonesTotal) worldStep(world, site, []);
    const s0 = world.stones.find((s) => s.wallId === upstairs.id)!;
    expect(s0.pos[2]).toBeCloseTo(3 + ROOF_DECK + 0.125, 6);
  });

  it('wood and straw cap the void but carry nothing', () => {
    const { world, site } = shellWorld();
    worldStep(world, site, [
      { kind: 'plan_roof', tick: world.tick, points: SHELL_RING.slice(0, 4), material: 'wood' },
    ]);
    while (world.roofs[0]!.workDone < world.roofs[0]!.workTotal) worldStep(world, site, []);
    expect(effectiveGroundAt(world, site, 55, 55)).toBe(0); // still the terrain
  });

  it('roof corners must rest on finished walls — constant rejections', () => {
    const { world, site } = shellWorld();
    // an unfinished wall elsewhere
    worldStep(world, site, [
      {
        kind: 'plan_wall',
        tick: world.tick,
        points: [
          { x: 200, y: 200 },
          { x: 200, y: 260 },
          { x: 260, y: 260 },
          { x: 260, y: 200 },
          { x: 200, y: 200 },
        ],
        height: 3,
      },
    ]);
    worldStep(world, site, [
      {
        kind: 'plan_roof',
        tick: world.tick,
        points: [
          { x: 80, y: 80 },
          { x: 90, y: 80 },
          { x: 90, y: 90 },
        ], // floating in a field
      },
      {
        kind: 'plan_roof',
        tick: world.tick,
        points: [
          { x: 200, y: 200 },
          { x: 260, y: 200 },
          { x: 260, y: 260 },
        ], // resting on masonry that is not yet built
      },
      {
        kind: 'plan_roof',
        tick: world.tick,
        points: SHELL_RING.slice(0, 4),
        material: 'slate' as never,
      },
    ]);
    const reasons = world.events
      .filter((e) => e.kind === 'command_rejected')
      .map((e) => (e as { reason: string }).reason);
    expect(reasons).toEqual([
      'roof corners must rest on finished walls',
      'roof corners must rest on finished walls',
      'unknown roof material',
    ]);
  });

  it('the earth outranks the deck outranks the fields', () => {
    // a farm, then simultaneously a fill and a roof: earth moves first, then
    // carpentry, and tending pauses throughout
    const farmRing: Vec2[] = [
      { x: 100, y: 100 },
      { x: 120, y: 100 },
      { x: 120, y: 120 },
      { x: 100, y: 120 },
      { x: 100, y: 100 },
    ];
    const { world, site } = run(
      [
        { kind: 'plan_wall', tick: 0, points: farmRing, height: 0.5 },
        { kind: 'designate', tick: 20, wallId: 5, use: 'farm' }, // first wall in a fresh world
      ],
      60,
    );
    expect(world.farms).toHaveLength(1);
    const shell: Command = { kind: 'plan_wall', tick: world.tick, points: SHELL_RING, height: 3 };
    worldStep(world, site, [shell]);
    while (world.walls[1]!.stonesLaid < world.walls[1]!.stonesTotal) worldStep(world, site, []);
    const before = world.farms[0]!.workdays;
    worldStep(world, site, [
      {
        kind: 'plan_fill',
        tick: world.tick,
        points: [
          { x: 200, y: 200 },
          { x: 206, y: 200 },
          { x: 206, y: 206 },
          { x: 200, y: 206 },
        ],
        height: 1,
      },
      { kind: 'plan_roof', tick: world.tick, points: SHELL_RING.slice(0, 4), material: 'straw' },
    ]);
    // while EITHER job is open, no workday accrues
    while (
      world.fills[0]!.volumeMoved < world.fills[0]!.volumeTotal ||
      world.roofs[0]!.workDone < world.roofs[0]!.workTotal
    ) {
      expect(world.farms[0]!.workdays).toBe(before);
      worldStep(world, site, []);
    }
    worldStep(world, site, []);
    expect(world.farms[0]!.workdays).toBe(before + 2); // both hands back in the field
  });

  it('ramps and roofs replay identically from a save', () => {
    const site = flatSite('flat', 1000);
    const world = createWorld('ramps-roofs-replay', site.id);
    const log: Command[] = [
      { kind: 'plan_wall', tick: 0, points: SHELL_RING, height: 3 },
      { kind: 'plan_fill', tick: 0, points: RAMP_RING, height: 2, shape: 'ramp' },
    ];
    const byTick = new Map<number, Command[]>();
    byTick.set(0, log.slice());
    for (let i = 0; i < 40; i++) worldStep(world, site, byTick.get(world.tick) ?? []);
    const roofCmd: Command = {
      kind: 'plan_roof',
      tick: world.tick,
      points: SHELL_RING.slice(0, 4),
      material: 'brick',
    };
    log.push(roofCmd);
    worldStep(world, site, [roofCmd]);
    for (let i = 0; i < 60; i++) worldStep(world, site, []);
    expect(world.roofs[0]!.workDone).toBe(world.roofs[0]!.workTotal);
    const replayed = replay(makeSave(world, log), site);
    expect(hashState(replayed)).toBe(hashState(world));
  });
});
