/**
 * SIM 4/10: field work + the degenerate-ring overlap guard.
 * The load-bearing claims: a laborer with no earth to move tends the ARABLE
 * farm with the fewest workdays (+1 person-day, exact and deterministic —
 * pasture is grazed and fallow rests, neither draws hands); construction
 * outranks the fields; multiple farms balance; and the review fleet's
 * double-wound lap exploit (collinear overlapping runs that cross nothing
 * PROPERLY while shoelace adds every lap) is recognized as nothing and
 * rejected as a fill.
 */
import { describe, expect, it } from 'vitest';
import { hashState, makeSave, replay } from '../src/sim/save';
import { flatSite } from '../src/sim/site';
import { ringSelfOverlaps, worldStep } from '../src/sim/step';
import { createWorld } from '../src/sim/world';
import type { Command, FieldUse, Vec2 } from '../src/sim/types';

const FIELD_RING: Vec2[] = [
  { x: 100, y: 100 },
  { x: 120, y: 100 },
  { x: 120, y: 120 },
  { x: 100, y: 120 },
  { x: 100, y: 100 },
];

/**
 * The fleet's probe: two collinear laps joined along x=1 (the map-edge clamp
 * makes exact collinearity free in real play). No proper crossing; shoelace
 * counts both laps (~14,600 m² for ~7,700 m² of even-odd land).
 */
const DOUBLE_WOUND: Vec2[] = [
  { x: 1, y: 90 },
  { x: 1, y: 1 },
  { x: 90, y: 1 },
  { x: 90, y: 90 },
  { x: 1, y: 89 },
  { x: 1, y: 5 },
  { x: 85, y: 5 },
  { x: 85, y: 85 },
  { x: 1, y: 85 },
  { x: 1, y: 90 },
];

const wall = (points: Vec2[], height: number, tick = 0): Command => ({
  kind: 'plan_wall',
  tick,
  points,
  height,
});

/** first wall in a fresh world is id 5 (4 founders), a same-tick second is 6 */
const W1 = 5;
const W2 = 6;

const designate = (wallId: number, use: FieldUse, tick = 20): Command => ({
  kind: 'designate',
  tick,
  wallId,
  use,
});

function run(commands: Command[], days: number, seed = 'fieldwork') {
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

describe('field work', () => {
  it('idle laborers tend the farm: exactly one person-day each, from the day of the word', () => {
    const { world } = run([wall(FIELD_RING, 0.5), designate(W1, 'farm')], 60);
    const word = world.events.find((e) => e.kind === 'plot_designated')!;
    expect(word.tick).toBe(20);
    const laborers = world.people.filter((p) => p.trade === 'laborer').length;
    expect(laborers).toBe(2);
    // the word applies at the START of its tick (commands before moveEarth),
    // so idle hands are in the field the very day it is given
    expect(world.farms[0]!.workdays).toBe(laborers * (world.tick - word.tick));
    expect(world.farms[0]!.workdays).toBe(80); // 2 hands × ticks 20…59
  });

  it('pasture is grazed and fallow rests: neither draws hands; arable takes ALL idle labor', () => {
    const second = FIELD_RING.map((p) => ({ x: p.x + 40, y: p.y }));
    const { world } = run(
      [
        wall(FIELD_RING, 0.5, 0),
        wall(second, 0.5, 0),
        designate(W1, 'livestock'),
        designate(W2, 'farm'),
      ],
      60,
    );
    expect(world.farms.find((f) => f.use === 'livestock')!.workdays).toBe(0);
    expect(world.farms.find((f) => f.use === 'farm')!.workdays).toBe(80); // undiluted
    // and a holding of ONLY paddock + fallow leaves every hand idle
    const { world: rest } = run(
      [
        wall(FIELD_RING, 0.5, 0),
        wall(second, 0.5, 0),
        designate(W1, 'livestock'),
        designate(W2, 'fallow'),
      ],
      60,
    );
    expect(rest.farms.map((f) => f.workdays)).toEqual([0, 0]);
  });

  it('construction outranks the fields: earth moves first, tending pauses', () => {
    const { world } = run([wall(FIELD_RING, 0.5), designate(W1, 'farm')], 60);
    const before = world.farms[0]!.workdays;
    const site = flatSite('flat', 1000);
    // a fresh fill: laborers barrow again; the farm waits
    worldStep(world, site, [
      {
        kind: 'plan_fill',
        tick: world.tick,
        points: [
          { x: 200, y: 200 },
          { x: 220, y: 200 },
          { x: 220, y: 220 },
          { x: 200, y: 220 },
        ],
        height: 1,
      },
    ]);
    while (world.fills[0]!.volumeMoved < world.fills[0]!.volumeTotal) {
      expect(world.farms[0]!.workdays).toBe(before);
      worldStep(world, site, []);
    }
    const atCompletion = world.farms[0]!.workdays;
    worldStep(world, site, []);
    expect(world.farms[0]!.workdays).toBe(atCompletion + 2); // both laborers back in the field
  });

  it('two farms balance to the day (fewest-workdays rule)', () => {
    const second = FIELD_RING.map((p) => ({ x: p.x + 40, y: p.y }));
    const { world } = run(
      [wall(FIELD_RING, 0.5, 0), wall(second, 0.5, 0), designate(W1, 'farm'), designate(W2, 'farm')],
      100,
    );
    expect(world.farms).toHaveLength(2);
    const [a, b] = world.farms;
    expect(a!.workdays + b!.workdays).toBeGreaterThan(0);
    expect(Math.abs(a!.workdays - b!.workdays)).toBeLessThanOrEqual(1);
  });

  it('the double-wound lap is recognized as nothing (farm) and rejected (fill)', () => {
    expect(ringSelfOverlaps(DOUBLE_WOUND.slice(0, -1))).toBe(true);
    const { world } = run([wall(DOUBLE_WOUND, 0.5)], 300);
    expect(world.walls[0]!.stonesLaid).toBe(world.walls[0]!.stonesTotal); // masonry is legal
    expect(world.pending).toHaveLength(0); // it never even asks
    expect(world.farms).toHaveLength(0); // the 14,600 m² claim is not
    const { world: w2 } = run(
      [{ kind: 'plan_fill', tick: 0, points: DOUBLE_WOUND.slice(0, -1), height: 1 }],
      1,
    );
    expect(w2.fills).toHaveLength(0);
    const reasons = w2.events
      .filter((e) => e.kind === 'command_rejected')
      .map((e) => (e as { reason: string }).reason);
    expect(reasons).toEqual(['fill ring must not overlap itself']);
  });

  it('a hand-closed fill ring is normalized, not rejected (the 3 cm knife edge)', () => {
    // the second fleet's confirmed finding: a trailing vertex within 5 cm of
    // the start sat inside the overlap epsilon and rejected the most careful
    // honest closure — even an EXACT duplicate. The gesture is dropped first.
    const ring = [
      { x: 200, y: 200 },
      { x: 230, y: 200 },
      { x: 230, y: 230 },
      { x: 200, y: 230 },
      { x: 200, y: 200.03 }, // the closing click, 3 cm out
    ];
    const { world } = run([{ kind: 'plan_fill', tick: 0, points: ring, height: 2 }], 1);
    expect(world.fills).toHaveLength(1);
    expect(world.fills[0]!.points).toHaveLength(4); // gesture dropped, shape stored
    expect(world.fills[0]!.volumeTotal).toBe(1800); // 30×30 × 2 m, flat site, exact
    const { world: exact } = run(
      [{ kind: 'plan_fill', tick: 0, points: [...ring.slice(0, 4), { x: 200, y: 200 }], height: 2 }],
      1,
    );
    expect(exact.fills).toHaveLength(1); // the perfect duplicate closes too
  });

  it('honest rings pass the overlap guard', () => {
    expect(ringSelfOverlaps(FIELD_RING.slice(0, -1))).toBe(false);
    // the doorway loop's closing edge runs the door line: collinear with the
    // front edge but 1.1 m clear of both jamb segments
    expect(
      ringSelfOverlaps([
        { x: 104.55, y: 100 },
        { x: 108, y: 100 },
        { x: 108, y: 106 },
        { x: 100, y: 106 },
        { x: 100, y: 100 },
        { x: 103.45, y: 100 },
      ]),
    ).toBe(false);
  });

  it('field work replays identically from a save', () => {
    const site = flatSite('flat', 1000);
    const world = createWorld('fieldwork-replay', site.id);
    const log: Command[] = [wall(FIELD_RING, 0.5), designate(W1, 'farm')];
    const byTick = new Map<number, Command[]>();
    for (const c of log) {
      const b = byTick.get(c.tick);
      if (b) b.push(c);
      else byTick.set(c.tick, [c]);
    }
    for (let i = 0; i < 90; i++) worldStep(world, site, byTick.get(world.tick) ?? []);
    expect(world.farms[0]!.workdays).toBeGreaterThan(0);
    const replayed = replay(makeSave(world, log), site);
    expect(hashState(replayed)).toBe(hashState(world));
  });
});
