/**
 * SIM 2: fills (earthworks) + wall materials.
 * The load-bearing claims: fills are deterministic and replayable; laborers
 * move earth at their pace; stones stand on COMPLETED fills only; bad
 * materials and bad fill polygons are rejected with constant reasons.
 */
import { describe, expect, it } from 'vitest';
import { makeSave, replay, hashState } from '../src/sim/save';
import { flatSite } from '../src/sim/site';
import { effectiveGroundAt, pointInPolygon, polygonArea, worldStep } from '../src/sim/step';
import { createWorld } from '../src/sim/world';
import type { Command } from '../src/sim/types';

const SQUARE: Command = {
  kind: 'plan_fill',
  tick: 0,
  points: [
    { x: 100, y: 100 },
    { x: 110, y: 100 },
    { x: 110, y: 110 },
    { x: 100, y: 110 },
  ],
  height: 2,
};

function run(commands: Command[], days: number, seed = 'earthworks') {
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

describe('fills', () => {
  it('geometry helpers are sane', () => {
    expect(polygonArea(SQUARE.points)).toBe(100);
    expect(pointInPolygon(105, 105, SQUARE.points)).toBe(true);
    expect(pointInPolygon(99, 105, SQUARE.points)).toBe(false);
  });

  it('laborers move earth at their pace and the fill completes', () => {
    const { world } = run([SQUARE], 1);
    const fill = world.fills[0]!;
    // flat site: level = 0 + 2, volume = 100 m² × 2 m = 200 m³
    expect(fill.level).toBe(2);
    expect(fill.volumeTotal).toBe(200);
    const laborerPace = world.people
      .filter((p) => p.trade === 'laborer')
      .reduce((n, p) => n + p.pace, 0);
    expect(fill.volumeMoved).toBe(laborerPace); // one day of earth
    const { world: later } = run([SQUARE], 400);
    expect(later.fills[0]!.volumeMoved).toBe(200);
    expect(later.events.filter((e) => e.kind === 'fill_complete')).toHaveLength(1);
  });

  it('stones stand on COMPLETED fills only', () => {
    const site = flatSite('flat', 1000);
    const world = createWorld('earthworks', site.id);
    // mid-fill: not a platform yet
    worldStep(world, site, [SQUARE]);
    expect(effectiveGroundAt(world, site, 105, 105)).toBe(0);
    // force-complete deterministically by running the fill out
    while (world.fills[0]!.volumeMoved < world.fills[0]!.volumeTotal) {
      worldStep(world, site, []);
    }
    expect(effectiveGroundAt(world, site, 105, 105)).toBe(2);
    expect(effectiveGroundAt(world, site, 99, 105)).toBe(0); // outside stays ground
    // a wall planned ON the platform grounds its first course at the fill level
    worldStep(world, site, [
      {
        kind: 'plan_wall',
        tick: world.tick,
        points: [
          { x: 102, y: 105 },
          { x: 108, y: 105 },
        ],
        height: 1,
      },
    ]);
    const s0 = world.stones[0]!;
    expect(s0.pos[2]).toBeCloseTo(2 + 0.125, 6);
  });

  it('walls carry material; unknown material and bad fills are rejected with constant reasons', () => {
    const { world } = run(
      [
        {
          kind: 'plan_wall',
          tick: 0,
          points: [
            { x: 10, y: 10 },
            { x: 20, y: 10 },
          ],
          height: 1,
          material: 'wood',
        },
        {
          kind: 'plan_wall',
          tick: 0,
          points: [
            { x: 30, y: 10 },
            { x: 40, y: 10 },
          ],
          height: 1,
        }, // no material → sandstone default
        {
          kind: 'plan_wall',
          tick: 0,
          points: [
            { x: 50, y: 10 },
            { x: 60, y: 10 },
          ],
          height: 1,
          material: 'marble' as never,
        },
        { kind: 'plan_fill', tick: 0, points: [{ x: 0, y: 0 }, { x: 1, y: 0 }], height: 1 },
      ],
      1,
    );
    expect(world.walls[0]!.material).toBe('wood');
    expect(world.walls[1]!.material).toBe('sandstone');
    const rejections = world.events.filter((e) => e.kind === 'command_rejected');
    expect(rejections.map((r) => (r as { reason: string }).reason)).toEqual([
      'unknown material',
      'a fill needs at least three points',
    ]);
  });

  it('self-crossing and degenerate rings are rejected (the bowtie cheat)', () => {
    const { world } = run(
      [
        {
          kind: 'plan_fill',
          tick: 0,
          points: [
            { x: 0, y: 0 },
            { x: 10, y: 0 },
            { x: 0, y: 10 },
            { x: 10, y: 10 },
          ], // bowtie: shoelace area 0, even-odd covers both lobes
          height: 2,
        },
        {
          kind: 'plan_fill',
          tick: 0,
          points: [
            { x: 0, y: 0 },
            { x: 5, y: 0 },
            { x: 10, y: 0 },
          ], // collinear: crosses nothing, encloses nothing
          height: 2,
        },
      ],
      1,
    );
    expect(world.fills).toHaveLength(0);
    const reasons = world.events
      .filter((e) => e.kind === 'command_rejected')
      .map((e) => (e as { reason: string }).reason);
    expect(reasons).toEqual(['fill ring must not cross itself', 'fill ring must enclose area']);
  });

  it('a fill planned on a completed platform grounds on the platform, not raw terrain', () => {
    const site = flatSite('flat', 1000);
    const world = createWorld('earthworks', site.id);
    worldStep(world, site, [SQUARE]);
    while (world.fills[0]!.volumeMoved < world.fills[0]!.volumeTotal) worldStep(world, site, []);
    // second lift on the same ring: level must stack on the first platform
    worldStep(world, site, [{ ...SQUARE, tick: world.tick }]);
    const second = world.fills[1]!;
    expect(second.level).toBe(4); // 2 (first platform) + 2
    expect(second.volumeTotal).toBe(200); // 100 m² × 2 m lift, not 4 m of phantom depth
  });

  it('fills replay identically from a save', () => {
    const site = flatSite('flat', 1000);
    const world = createWorld('earthworks-replay', site.id);
    const log: Command[] = [SQUARE];
    const byTick = new Map<number, Command[]>();
    byTick.set(0, [SQUARE]);
    for (let i = 0; i < 60; i++) worldStep(world, site, byTick.get(world.tick) ?? []);
    const save = makeSave(world, log);
    const replayed = replay(save, site);
    expect(hashState(replayed)).toBe(hashState(world));
  });
});
