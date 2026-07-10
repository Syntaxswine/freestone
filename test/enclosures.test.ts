/**
 * SIM 3/6/10: enclosure recognition + designation.
 * The load-bearing claims since SIM 10 (boss canon 2026-07-10): a completed
 * enclosure ASKS rather than answers — a closed/gated LOW ring pends as a
 * field plot, a near-closed TALL ring pends as a shell — and only the lord's
 * designate command makes it a farm/paddock/fallow or a house/blacksmith/
 * tower/tavern. Crossed, tiny, open or wrong-height rings pend nothing; the
 * palettes are enforced; designation is one-shot; and it all replays.
 */
import { describe, expect, it } from 'vitest';
import { classifyFootprint, reduceCorners } from '../src/sim/classify';
import { hashState, makeSave, replay } from '../src/sim/save';
import { flatSite } from '../src/sim/site';
import { classifyRing, polygonArea, worldStep } from '../src/sim/step';
import { createWorld } from '../src/sim/world';
import type { BuildingKind, Command, FieldUse, Vec2 } from '../src/sim/types';

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

/** deterministic id of the FIRST wall planned in a fresh world: 4 founders, then it */
const W1 = 5;
const W2 = 6; // a second wall planned the same tick

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

const designate = (
  wallId: number,
  use: FieldUse | BuildingKind,
  tick = 50, // every canonical test wall completes well inside 50 days
): Command => ({ kind: 'designate', tick, wallId, use });

function rejections(world: { events: { kind: string }[] }): string[] {
  return world.events
    .filter((e) => e.kind === 'command_rejected')
    .map((e) => (e as unknown as { reason: string }).reason);
}

describe('pending — the completed enclosure asks', () => {
  it('a completed closed low ring pends as a plot the day the wall stands', () => {
    const { world } = run([wall(FIELD_RING, 0.5)], 100);
    const w = world.walls[0]!;
    expect(w.stonesLaid).toBe(w.stonesTotal); // the wall is done
    expect(world.pending).toEqual([W1]); // it asks…
    expect(world.farms).toHaveLength(0); // …and claims nothing yet
    const done = world.events.find((e) => e.kind === 'wall_complete')!;
    const asked = world.events.find((e) => e.kind === 'plot_enclosed')!;
    expect(asked.tick).toBe(done.tick); // recognized at completion, same day
    expect((asked as { area: number }).area).toBe(400);
  });

  it('a completed doorway shell pends as a shell (shell_raised)', () => {
    const { world } = run([wall(DOORWAY_LOOP, 3)], 100);
    expect(world.pending).toEqual([W1]);
    expect(world.buildings).toHaveLength(0);
    const asked = world.events.find((e) => e.kind === 'shell_raised')!;
    expect((asked as { area: number }).area).toBeCloseTo(48, 6);
  });

  it('between-heights, tall-closed, open, tiny and bowtie rings pend nothing', () => {
    const gated = [...FIELD_RING.slice(0, 4), { x: 100, y: 101.4 }];
    for (const [pts, h, days] of [
      [gated, 1.5, 200], // too tall to step over, too low to shelter
      [FIELD_RING, 2, 400], // a closed yard wall claims nothing
      [FIELD_RING.slice(0, 4), 0.5, 100], // C-shape, 20 m gap
      [
        [
          { x: 0, y: 0 },
          { x: 4, y: 0 },
          { x: 4, y: 4 },
          { x: 0, y: 4 },
          { x: 0, y: 0 },
        ],
        0.5,
        100,
      ], // 16 m² < 25
      [
        [
          { x: 0, y: 0 },
          { x: 20, y: 0 },
          { x: 0, y: 20 },
          { x: 20, y: 20 },
          { x: 0, y: 0 },
        ],
        0.5,
        200,
      ], // bowtie: shoelace and even-odd disagree on crossed rings
    ] as [Vec2[], number, number][]) {
      const { world } = run([wall(pts, h)], days);
      expect(world.walls[0]!.stonesLaid).toBe(world.walls[0]!.stonesTotal); // legal masonry
      expect(world.pending).toHaveLength(0);
      expect(world.farms).toHaveLength(0);
      expect(world.buildings).toHaveLength(0);
    }
  });
});

describe('designation — the word', () => {
  it('designate farm: the plot becomes an arable farm with its gates', () => {
    const { world } = run([wall(FIELD_RING, 0.5), designate(W1, 'farm')], 100);
    expect(world.pending).toHaveLength(0); // asked and answered
    expect(world.farms).toHaveLength(1);
    const farm = world.farms[0]!;
    expect(farm.use).toBe('farm');
    expect(farm.wallId).toBe(W1);
    expect(farm.area).toBe(400); // 20 × 20, shoelace-exact on the open ring
    expect(farm.points).toHaveLength(4); // duplicate closing vertex dropped
    // SIM 7: a plot always gets its gate, carved on the FIRST segment placed
    expect(farm.gates).toEqual([{ x: 110, y: 100 }]);
    const word = world.events.find((e) => e.kind === 'plot_designated')!;
    expect(word.tick).toBe(50); // the word applies the day it is given
    expect((word as { use: string }).use).toBe('farm');
    expect((word as { area: number }).area).toBe(400);
  });

  it('a sub-stone closing gap still closes, and designates clean (tolerant closure)', () => {
    const nearClosed = [...FIELD_RING.slice(0, 4), { x: 100, y: 100.3 }];
    const { world } = run([wall(nearClosed, 0.5), designate(W1, 'farm')], 100);
    expect(world.farms).toHaveLength(1);
    expect(world.farms[0]!.area).toBe(400); // the near-return vertex is dropped either way
    // the closing vertex is ALWAYS dropped: a kept sub-stone sliver edge would
    // sit inside the overlap guard's epsilon and read as degenerate
    expect(world.farms[0]!.points).toHaveLength(4);
  });

  it('a low ring with a person-width gap designates as a farm WITH the gap gate (SIM 6)', () => {
    const gated = [...FIELD_RING.slice(0, 4), { x: 100, y: 101.4 }]; // 1.4 m gateway
    const { world } = run([wall(gated, 0.5), designate(W1, 'farm')], 100);
    expect(world.farms).toHaveLength(1);
    const farm = world.farms[0]!;
    expect(farm.area).toBe(400); // the gate's closing edge completes the polygon
    expect(farm.points).toHaveLength(5); // the gapped ring is kept as drawn
    expect(farm.gates).toEqual([{ x: 100, y: 100.7 }]); // the gap's exact midpoint
  });

  it('designate livestock: a paddock, same land, different use', () => {
    const { world } = run([wall(FIELD_RING, 0.5), designate(W1, 'livestock')], 100);
    expect(world.farms).toHaveLength(1);
    expect(world.farms[0]!.use).toBe('livestock');
    const word = world.events.find((e) => e.kind === 'plot_designated')!;
    expect((word as { use: string }).use).toBe('livestock');
  });

  it('designate fallow: the land rests on the record', () => {
    const { world } = run([wall(FIELD_RING, 0.5), designate(W1, 'fallow')], 100);
    expect(world.farms[0]!.use).toBe('fallow');
  });

  it('a gate hung while PENDING is captured by the later designation', () => {
    const { world } = run(
      [
        wall(FIELD_RING, 0.5),
        { kind: 'add_gate', tick: 30, wallId: W1, at: { x: 120, y: 110 } }, // east side, mid-pend
        designate(W1, 'farm', 60),
      ],
      120,
    );
    expect(rejections(world)).toEqual([]); // the pending wall took the gate
    expect(world.farms[0]!.gates).toEqual([
      { x: 110, y: 100 }, // the auto-gate carved at plan time
      { x: 120, y: 110 }, // the one hung before the word
    ]);
  });

  it('the shell designates to the lord\'s kind, not the footprint\'s', () => {
    const { world } = run([wall(DOORWAY_LOOP, 3), designate(W1, 'tavern')], 100);
    expect(world.buildings).toHaveLength(1);
    const b = world.buildings[0]!;
    expect(b.kind).toBe('tavern'); // the masons read a cot; the lord keeps ale
    expect(b.area).toBeCloseTo(48, 6);
    expect(b.wallId).toBe(W1);
    const evt = world.events.find((e) => e.kind === 'building_complete')!;
    expect((evt as { buildingKind: string }).buildingKind).toBe('tavern');
  });

  it('an irregular shell designates with its even-odd area intact', () => {
    const staircase: Vec2[] = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
      { x: 4, y: 10 },
      { x: 4, y: 6 },
      { x: 0, y: 6 },
      { x: 0, y: 1.5 }, // 1.5 m doorway back to the start
    ];
    const { world } = run([wall(staircase, 3), designate(W1, 'blacksmith', 120)], 200);
    expect(world.buildings).toHaveLength(1);
    expect(world.buildings[0]!.area).toBeCloseTo(84, 6); // 100 − the 4×4 notch
    expect(world.buildings[0]!.kind).toBe('blacksmith');
  });

  it('a low doorway ring pens rather than shelters, and takes the field palette (SIM 6)', () => {
    const { world } = run([wall(DOORWAY_LOOP, 1), designate(W1, 'livestock')], 100);
    expect(world.buildings).toHaveLength(0); // below headroom, no shelter
    expect(world.farms).toHaveLength(1); // a low gapped ring pens
    expect(world.farms[0]!.use).toBe('livestock');
    expect(world.farms[0]!.area).toBeCloseTo(48, 6);
    expect(world.farms[0]!.gates).toEqual([{ x: 104, y: 100 }]); // mid-doorway
  });
});

describe('designation — the palettes hold', () => {
  it('a field plot refuses a building kind, and the plot still awaits', () => {
    const { world } = run(
      [wall(FIELD_RING, 0.5), designate(W1, 'tavern', 50), designate(W1, 'farm', 60)],
      100,
    );
    expect(rejections(world)).toEqual(['a field plot takes farm, livestock, or fallow']);
    // the refusal consumed nothing: the honest word landed after
    expect(world.farms).toHaveLength(1);
    expect(world.farms[0]!.use).toBe('farm');
  });

  it('a shell refuses a field use', () => {
    const { world } = run([wall(DOORWAY_LOOP, 3), designate(W1, 'fallow')], 100);
    expect(rejections(world)).toEqual(['a shell takes house, blacksmith, tower, or tavern']);
    expect(world.buildings).toHaveLength(0);
    expect(world.pending).toEqual([W1]); // still asking
  });

  it('a wall that pends nothing takes no word', () => {
    const { world } = run([wall(FIELD_RING.slice(0, 4), 0.5), designate(W1, 'farm')], 100);
    expect(rejections(world)).toEqual(['no enclosure awaits the word there']);
    const { world: w2 } = run([designate(999, 'farm', 0)], 1);
    expect(rejections(w2)).toEqual(['no enclosure awaits the word there']);
  });

  it('the word is one-shot: a second designate finds nothing pending', () => {
    const { world } = run(
      [wall(FIELD_RING, 0.5), designate(W1, 'farm', 50), designate(W1, 'livestock', 60)],
      100,
    );
    expect(rejections(world)).toEqual(['no enclosure awaits the word there']);
    expect(world.farms).toHaveLength(1);
    expect(world.farms[0]!.use).toBe('farm'); // the first word stands
  });

  it('gate infill re-completion never re-asks (recognition stays one-shot)', () => {
    const { world } = run(
      [
        wall(FIELD_RING, 0.5),
        designate(W1, 'farm', 50),
        { kind: 'add_gate', tick: 60, wallId: W1, at: { x: 120, y: 110 } },
        { kind: 'remove_gate', tick: 70, wallId: W1, at: { x: 120, y: 110 } },
      ],
      200, // plenty for the masons to wall the opening back up
    );
    expect(world.walls[0]!.stonesLaid).toBe(world.walls[0]!.stonesTotal); // re-completed
    expect(world.walls[0]!.infill).toHaveLength(0);
    expect(world.pending).toHaveLength(0); // it never asked twice
    expect(world.farms).toHaveLength(1);
  });
});

describe('the one predicate', () => {
  it('classifyRing names farm, gated farm, shell reading, nothing', () => {
    const closed = FIELD_RING;
    const gated = [...FIELD_RING.slice(0, 4), { x: 100, y: 101.4 }];
    expect(classifyRing(closed, 0.5)).toMatchObject({ kind: 'farm', area: 400, gate: null });
    expect(classifyRing(gated, 1.0)).toMatchObject({
      kind: 'farm',
      area: 400,
      gate: { x: 100, y: 100.7 },
    });
    expect(classifyRing(gated, 1.5)).toBeNull(); // the between-heights hole
    // the reading is the mason's opinion — advisory since SIM 10
    expect(classifyRing(DOORWAY_LOOP, 3)).toMatchObject({ kind: 'building', reading: 'house' });
    expect(classifyRing(closed, 2)).toBeNull(); // a closed yard wall claims nothing
    expect(classifyRing(closed.slice(0, 3), 0.5)).toBeNull(); // not enough points
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
  it('pending, designations and refusals replay identically from a save', () => {
    const site = flatSite('flat', 1000);
    const world = createWorld('enclosures-replay', site.id);
    const log: Command[] = [
      wall(FIELD_RING, 0.5),
      wall(DOORWAY_LOOP, 3),
      designate(W1, 'livestock', 40),
      designate(W2, 'fallow', 45), // refused: a shell takes no field use
      designate(W2, 'house', 55),
    ];
    const byTick = new Map<number, Command[]>();
    for (const c of log) {
      const b = byTick.get(c.tick);
      if (b) b.push(c);
      else byTick.set(c.tick, [c]);
    }
    for (let i = 0; i < 120; i++) worldStep(world, site, byTick.get(world.tick) ?? []);
    expect(world.farms).toHaveLength(1);
    expect(world.buildings).toHaveLength(1);
    expect(rejections(world)).toHaveLength(1);
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
