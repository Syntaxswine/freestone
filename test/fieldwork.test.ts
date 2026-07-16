/**
 * SIM 4/10 field work, re-authored for SIM 36's skill era. The load-bearing claims:
 * farm work is BOUNDED daily demand (ceil(area/FARM_AREA_PER_HAND) hands a day — the
 * FIELD_RING's 400 m² wants exactly ONE), taken greenest-first, so the founding green
 * farmhand holds the slot at ×9/8 a day; pasture is grazed and fallow rests (neither
 * draws hands); THE GROOVE SUPERSESSION (boss Q1 — farmers farm): a green farmhand
 * tends straight through construction while UNTRAINED hands take the fill (the old
 * SIM 4 "construction outranks fields" now binds the unskilled only); multiple farms
 * balance; and the double-wound lap exploit stays recognized as nothing.
 */
import { describe, expect, it } from 'vitest';
import { hashState, makeSave, replay } from '../src/sim/save';
import { flatSite } from '../src/sim/site';
import { ringSelfOverlaps, worldStep } from '../src/sim/step';
import { createWorld } from '../src/sim/world';
import { GREEN_MULT, type Command, type FieldUse, type Vec2 } from '../src/sim/types';

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

/** first wall in a fresh world is id 14 (13 founders, SIM 36), a same-tick second is 15 */
const W1 = 14;
const W2 = 15;

const designate = (wallId: number, use: FieldUse, tick = 20): Command => ({
  kind: 'designate',
  tick,
  wallId,
  use,
});

function run(commands: Command[], days: number, seed = 'fieldwork') {
  const site = flatSite('flat', 1000);
  const world = createWorld(seed, site.id);
  world.stockpile = 1e6; // SIM 16: ample won stone — these tests aren't about supply
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
  it('the farm draws its BOUNDED demand from the day of the word — one slot, greenest-first', () => {
    const { world } = run([wall(FIELD_RING, 0.5), designate(W1, 'farm')], 60);
    const word = world.events.find((e) => e.kind === 'plot_designated')!;
    expect(word.tick).toBe(20);
    // the 400 m² ring wants ceil(400/500) = ONE hand a day; the founding green
    // farmhand holds the slot in her groove, tending ×9/8 a day (worked in eighths).
    // The word applies at the START of its tick, so the field is tended that very day.
    expect(world.farms[0]!.workdays).toBeCloseTo((world.tick - word.tick) * GREEN_MULT, 9);
    expect(world.farms[0]!.workdays).toBeCloseTo(45, 9); // 40 days × 9/8
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
    expect(world.farms.find((f) => f.use === 'farm')!.workdays).toBeCloseTo(45, 9); // undiluted
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

  it('THE GROOVE holds through construction: the green farmhand tends while untrained hands fill', () => {
    // The SIM 36 supersession of SIM 4's "construction outranks fields" (boss Q1 —
    // farmers farm): a fresh fill draws the UNTRAINED hands, but the green farmhand
    // keeps her slot — tending never pauses, and the fill still completes.
    const { world } = run([wall(FIELD_RING, 0.5), designate(W1, 'farm')], 60);
    const site = flatSite('flat', 1000);
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
    let previous = world.farms[0]!.workdays;
    while (world.fills[0]!.volumeMoved < world.fills[0]!.volumeTotal) {
      worldStep(world, site, []);
      expect(world.farms[0]!.workdays).toBeCloseTo(previous + GREEN_MULT, 9); // tended THAT day too
      previous = world.farms[0]!.workdays;
    }
    expect(world.events.filter((e) => e.kind === 'fill_complete')).toHaveLength(1); // and the earth still moved
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
    const log: Command[] = [
      wall(FIELD_RING, 0.5),
      designate(W1, 'farm'),
      // SIM 16: won stone in the log so the ring builds and replay reproduces it
      { kind: 'plan_cut', tick: 0, points: [{ x: 300, y: 300 }, { x: 306, y: 300 }, { x: 306, y: 306 }, { x: 300, y: 306 }], depth: 1, workTotal: 2, stoneTotal: 1e6 },
    ];
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
