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
import { classifyRing, effectiveGroundAt, polygonArea, worldStep } from '../src/sim/step';
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

/** deterministic id of the FIRST wall planned in a fresh world: 13 founders (SIM 36), then it */
const W1 = 14;
const W2 = 15; // a second wall planned the same tick

function run(commands: Command[], days: number, seed = 'enclosures') {
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

const chooseRoof = (
  wallId: number,
  roof: 'none' | 'wood' | 'straw' | 'brick',
  tick = 40, // the drawings' first answer — before the trade
): Command => ({ kind: 'choose_roof', tick, wallId, roof });

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

  it('a BARE shell builds while it asks — the word never blocks (SIM 37)', () => {
    // the SIM-12 "the masons lay not one stone until the drawings are answered" law
    // is SUPERSEDED (boss decree 2026-07-16): the bones rise; the plot keeps asking
    const { world } = run([wall(DOORWAY_LOOP, 3)], 100);
    expect(world.pending).toEqual([W1]); // asking from the day it was plotted…
    expect(world.stones.length).toBe(world.walls[0]!.stonesTotal); // …and BUILT anyway
    expect(world.buildings).toHaveLength(0); // but no trade named ⇒ no Building minted
    const asked = world.events.find((e) => e.kind === 'shell_plotted')!;
    expect(asked.tick).toBe(0); // the ask stands the day of the plot
    expect((asked as { area: number }).area).toBeCloseTo(48, 6);
    expect(world.walls[0]!.plans).toEqual({ roof: null, kind: null });
  });

  it('a LATE trade word makes a standing shell real at answer-tick (SIM 37)', () => {
    const { world } = run(
      [wall(DOORWAY_LOOP, 3), chooseRoof(W1, 'straw', 10), designate(W1, 'tavern', 60)],
      70,
    );
    expect(world.stones.length).toBe(world.walls[0]!.stonesTotal); // stood long before the word
    expect(world.buildings).toHaveLength(1); // the word made it real…
    const made = world.events.find((e) => e.kind === 'building_complete')!;
    expect(made.tick).toBe(60); // …at ANSWER-tick, not completion-tick
    expect(world.buildings[0]!.roof).toBe('straw');
    expect(world.pending).toHaveLength(0); // both words answered — the ask closed
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

  it('drawings answered, the crew builds, and completion makes the building real', () => {
    const { world } = run(
      [wall(DOORWAY_LOOP, 3), chooseRoof(W1, 'straw', 10), designate(W1, 'tavern', 20)],
      100,
    );
    const planned = world.events.find((e) => e.kind === 'building_planned')!;
    expect(planned.tick).toBe(20); // the drawings settled…
    const w = world.walls[0]!;
    expect(w.stonesLaid).toBe(w.stonesTotal); // …and only then was it built
    expect(world.pending).toHaveLength(0);
    expect(world.buildings).toHaveLength(1);
    const b = world.buildings[0]!;
    expect(b.kind).toBe('tavern'); // the masons read a cot; the lord keeps ale
    expect(b.roof).toBe('straw');
    expect(b.area).toBeCloseTo(48, 6);
    expect(b.wallId).toBe(W1);
    const evt = world.events.find((e) => e.kind === 'building_complete')!;
    expect((evt as { buildingKind: string }).buildingKind).toBe('tavern');
    // SIM 37: the crew never waited on the words — stone rises from the plot
    expect(world.stones.some((s) => s.tickLaid < 20)).toBe(true);
  });

  it('a BRICK roof in the drawings mints a real deck at completion — a floor above', () => {
    const { world, site } = run(
      [wall(DOORWAY_LOOP, 3), chooseRoof(W1, 'brick', 10), designate(W1, 'house', 20)],
      60,
    );
    expect(world.buildings[0]!.roof).toBe('brick');
    expect(world.roofs).toHaveLength(1); // the span minted the day the shell topped out
    const roof = world.roofs[0]!;
    expect(roof.material).toBe('brick'); // covered from birth — the drawings chose
    expect(roof.level).toBe(3); // flat site: the wall top
    expect(roof.points).toHaveLength(4); // the doorway loop's true corners
    expect(roof.area).toBeCloseTo(48, 6);
    // the laborers deck it through the ordinary loop, and it becomes ground
    let guard = 0;
    while (roof.workDone < roof.workTotal && guard++ < 200) worldStep(world, site, []);
    expect(effectiveGroundAt(world, site, 104, 103)).toBeCloseTo(3.25, 9);
    // wood and none mint nothing
    const { world: w2 } = run(
      [wall(DOORWAY_LOOP, 3), chooseRoof(W1, 'none', 10), designate(W1, 'house', 20)],
      60,
    );
    expect(w2.roofs).toHaveLength(0);
    expect(w2.buildings[0]!.roof).toBe('none');
  });

  it('an irregular shell keeps its even-odd area through the drawings', () => {
    const staircase: Vec2[] = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
      { x: 4, y: 10 },
      { x: 4, y: 6 },
      { x: 0, y: 6 },
      { x: 0, y: 1.5 }, // 1.5 m doorway back to the start
    ];
    const { world } = run(
      [wall(staircase, 3), chooseRoof(W1, 'none', 10), designate(W1, 'blacksmith', 20)],
      200,
    );
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
    expect(rejections(world)).toEqual([
      'a field plot takes farm, livestock, pasture, orchard, or fallow',
    ]);
    // the refusal consumed nothing: the honest word landed after
    expect(world.farms).toHaveLength(1);
    expect(world.farms[0]!.use).toBe('farm');
  });

  it('the field palette takes the variety tenants — pasture and orchard (SIM 24)', () => {
    const pasture = run([wall(FIELD_RING, 0.5), designate(W1, 'pasture')], 100);
    expect(pasture.world.farms).toHaveLength(1);
    expect(pasture.world.farms[0]!.use).toBe('pasture');
    const orchard = run([wall(FIELD_RING, 0.5), designate(W1, 'orchard')], 100);
    expect(orchard.world.farms).toHaveLength(1);
    expect(orchard.world.farms[0]!.use).toBe('orchard');
  });

  it('the words come in ANY order now — and a shell still refuses a field use (SIM 37)', () => {
    // the SIM-12 roof-before-trade ordering guard retired with the blocking: the
    // trade may be named first (it lands), a named trade is one-shot, and the field
    // palette still bounces off a shell
    const { world } = run(
      [
        wall(DOORWAY_LOOP, 3),
        designate(W1, 'house', 5), // trade first — legal since SIM 37
        chooseRoof(W1, 'wood', 10),
        designate(W1, 'fallow', 15), // a building is no field — and the trade is already named
      ],
      100,
    );
    // both words were answered by t10, so the ask CLOSED — the t15 word finds nothing
    expect(rejections(world)).toEqual(['no enclosure awaits the word there']);
    expect(world.buildings).toHaveLength(1); // named at 5, minted at completion
    expect(world.buildings[0]!.kind).toBe('house');
    expect(world.buildings[0]!.roof).toBe('wood');
    expect(world.pending).toHaveLength(0); // both words answered
    expect(world.stones.length).toBe(world.walls[0]!.stonesTotal); // and the crew never waited
  });

  it('the roof word has its own refusals', () => {
    const { world } = run(
      [
        wall(FIELD_RING, 0.5), // a field plot — no drawings
        wall(DOORWAY_LOOP, 3), // W2: drawings
        { kind: 'choose_roof', tick: 5, wallId: 999, roof: 'wood' },
        { kind: 'choose_roof', tick: 10, wallId: W1, roof: 'wood' }, // fields take no roofs
        { kind: 'choose_roof', tick: 15, wallId: W2, roof: 'slate' as never },
        { kind: 'choose_roof', tick: 20, wallId: W2, roof: 'straw' }, // lands
        { kind: 'choose_roof', tick: 25, wallId: W2, roof: 'wood' }, // asked and answered
      ],
      40,
    );
    expect(rejections(world)).toEqual([
      'no shell awaits a roof there',
      'no shell awaits a roof there',
      'a roof is none, wood, straw, or brick',
      'no shell awaits a roof there',
    ]);
    expect(world.walls[1]!.plans).toEqual({ roof: 'straw', kind: null });
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
  it('pending, drawings, designations and refusals replay identically from a save', () => {
    const site = flatSite('flat', 1000);
    const world = createWorld('enclosures-replay', site.id);
    const log: Command[] = [
      wall(FIELD_RING, 0.5),
      wall(DOORWAY_LOOP, 3),
      designate(W1, 'livestock', 40),
      designate(W2, 'fallow', 45), // refused: a building is no field (SIM 37 retired the ordering guard)
      { kind: 'choose_roof', tick: 50, wallId: W2, roof: 'wood' },
      designate(W2, 'house', 55),
      // SIM 16: won stone in the log so the walls build and replay reproduces it
      // (appended, so FIELD_RING/DOORWAY_LOOP keep ids W1=14, W2=15)
      { kind: 'plan_cut', tick: 0, points: [{ x: 300, y: 300 }, { x: 306, y: 300 }, { x: 306, y: 306 }, { x: 300, y: 306 }], depth: 1, workTotal: 2, stoneTotal: 1e6 },
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

describe('the word at the plot (SIM 37)', () => {
  it('a fully-worded plan never asks: Building at completion, no pending, no card', () => {
    const { world } = run(
      [{ ...wall(DOORWAY_LOOP, 3), roof: 'straw', buildingKind: 'tavern' } as Command],
      100,
    );
    expect(world.pending).toHaveLength(0); // answered as it was drawn
    expect(world.buildings).toHaveLength(1);
    expect(world.buildings[0]!.kind).toBe('tavern');
    expect(world.buildings[0]!.roof).toBe('straw');
    const made = world.events.find((e) => e.kind === 'building_complete')!;
    const done = world.events.find((e) => e.kind === 'wall_complete')!;
    expect(made.tick).toBe(done.tick); // minted the day the shell stood
  });

  it("a field ring carrying its use is enclosed and named in one breath", () => {
    const { world } = run([{ ...wall(FIELD_RING, 0.5), use: 'farm' } as Command], 100);
    expect(world.pending).toHaveLength(0);
    expect(world.farms).toHaveLength(1);
    expect(world.farms[0]!.use).toBe('farm');
    const enclosed = world.events.find((e) => e.kind === 'plot_enclosed')!;
    const named = world.events.find((e) => e.kind === 'plot_designated')!;
    expect(named.tick).toBe(enclosed.tick); // the word rode the plan
  });

  it('a mis-aimed word rejects whole, with a constant reason', () => {
    const { world } = run(
      [
        { ...wall(FIELD_RING, 0.5), roof: 'straw' } as Command, // a roof on a field ring
        { ...wall(DOORWAY_LOOP, 3), use: 'farm' } as Command, // a use on a shell
      ],
      10,
    );
    expect(world.walls).toHaveLength(0); // both rejected whole — no silent word-dropping
    expect(rejections(world)).toEqual([
      'the roof and trade words want a building ring',
      'the use word wants a field ring',
    ]);
  });

  it('a LATE brick word decks a standing building at answer-tick', () => {
    const { world } = run(
      [
        { ...wall(DOORWAY_LOOP, 3), buildingKind: 'house' } as Command, // trade at plot, roof open
        chooseRoof(W1, 'brick', 80), // the shell stands long before this
      ],
      120,
    );
    expect(world.buildings).toHaveLength(1);
    expect(world.buildings[0]!.roof).toBe('brick');
    expect(world.roofs).toHaveLength(1); // the deck minted at ANSWER-tick
    const decked = world.events.find((e) => e.kind === 'roof_planned')!;
    expect(decked.tick).toBe(80);
  });
});

describe('geometry helpers', () => {
  it('polygonArea is exact on the canonical rings', () => {
    expect(polygonArea(FIELD_RING.slice(0, 4))).toBe(400);
    expect(polygonArea(DOORWAY_LOOP)).toBeCloseTo(48, 9);
  });
});
