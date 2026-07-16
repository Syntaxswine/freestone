/**
 * SIM 8/11: ramp fills + roofs.
 * The load-bearing claims: a ramp's billed volume is the honest wedge and its
 * finished surface slopes from the FIRST-placed edge (masonry grounds on the
 * slope); a roof must rest every corner on a finished wall; a drawn span is
 * UNCOVERED by default (boss canon 2026-07-10 — material null, nobody decks
 * bare air) until designate_roof names its covering; laborers then deck it
 * after the earth is moved, and a completed BRICK deck is ground — the next
 * storey's walls stand on it. Wood caps a void and carries nothing.
 */
import { describe, expect, it } from 'vitest';
import { hashState, makeSave, replay } from '../src/sim/save';
import { flatSite } from '../src/sim/site';
import { effectiveGroundAt, fillSurfaceAt, worldStep } from '../src/sim/step';
import { createWorld } from '../src/sim/world';
import { GREEN_MULT } from '../src/sim/types';
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

  it('courses are LEVEL on the slope — the survey steps the footing (SIM 13)', () => {
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
    const w = world.walls[0]!;
    while (w.stonesLaid < w.stonesTotal) worldStep(world, site, []);
    const stones = world.stones.filter((s) => s.wallId === w.id);
    const cols = new Map<string, { x: number; y: number; zs: number[] }>();
    for (const s of stones) {
      const key = `${s.pos[0].toFixed(6)}:${s.pos[1].toFixed(6)}`;
      const col = cols.get(key) ?? { x: s.pos[0], y: s.pos[1], zs: [] };
      col.zs.push(s.pos[2]);
      cols.set(key, col);
    }
    const tops: number[] = [];
    for (const col of cols.values()) {
      // every stone sits on the ONE shared slab grid — the layers are even
      for (const z of col.zs) {
        const k = (w.levelTop - 0.125 - z) / 0.25;
        expect(Math.abs(k - Math.round(k))).toBeLessThan(1e-9);
      }
      // a plain wall STEPS: each column's top covers its own ground + height
      // within one slab (hillside practice — not one datum for 80 m of ring)
      const g = effectiveGroundAt(world, site, col.x, col.y);
      const top = Math.max(...col.zs) + 0.125; // the slab line the column reaches
      expect(top).toBeGreaterThanOrEqual(g + 0.5 - 1e-9);
      expect(top).toBeLessThan(g + 0.5 + 0.25);
      tops.push(top);
    }
    // and on a 1.2 m bank the top genuinely steps rather than leveling
    expect(Math.max(...tops) - Math.min(...tops)).toBeGreaterThan(0.5);
    expect(w.stonesTotal).toBe(stones.length);
  });

  it("a BUILDING on the slope levels to ONE datum — the roof's flat bearing (SIM 13)", () => {
    const { world, site } = run(
      [{ kind: 'plan_fill', tick: 0, points: RAMP_RING, height: 2, shape: 'ramp' }],
      1,
    );
    while (world.fills[0]!.volumeMoved < world.fills[0]!.volumeTotal) worldStep(world, site, []);
    // the doorway loop, set on the ramp's slope (ground 0.2 → 1.4 beneath it)
    const loop: Vec2[] = [
      { x: 5.55, y: 1 },
      { x: 9, y: 1 },
      { x: 9, y: 7 },
      { x: 1, y: 7 },
      { x: 1, y: 1 },
      { x: 4.45, y: 1 },
    ];
    worldStep(world, site, [{ kind: 'plan_wall', tick: world.tick, points: loop, height: 3 }]);
    const w = world.walls[0]!;
    worldStep(world, site, [
      { kind: 'choose_roof', tick: world.tick, wallId: w.id, roof: 'none' },
    ]);
    worldStep(world, site, [
      { kind: 'designate', tick: world.tick, wallId: w.id, use: 'house' },
    ]);
    while (w.stonesLaid < w.stonesTotal) worldStep(world, site, []);
    const cols = new Map<string, number[]>();
    for (const s of world.stones) {
      if (s.wallId !== w.id) continue;
      const key = `${s.pos[0].toFixed(6)}:${s.pos[1].toFixed(6)}`;
      const arr = cols.get(key) ?? [];
      arr.push(s.pos[2]);
      cols.set(key, arr);
    }
    // ONE flat datum: every column tops out at the same height, regardless
    // of the ramp beneath (boss canon 2026-07-10 — leveled before the roof)
    for (const zs of cols.values()) {
      expect(Math.max(...zs)).toBeCloseTo(w.levelTop - 0.125, 9);
    }
    // and the downhill footing carries more stones, honestly billed
    const counts = [...cols.values()].map((zs) => zs.length);
    expect(Math.max(...counts)).toBeGreaterThan(Math.min(...counts));
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
      { kind: 'plan_roof', tick: world.tick, points: SHELL_RING.slice(0, 4) },
    ]);
    const roof = world.roofs[0]!;
    expect(roof.level).toBe(3); // flat site: wall top
    expect(roof.workTotal).toBe(100); // 10 × 10 m² of decking
    expect(roof.material).toBeNull(); // the default is none
    worldStep(world, site, [
      { kind: 'designate_roof', tick: world.tick, roofId: roof.id, material: 'brick' },
    ]);
    expect(world.events.some((e) => e.kind === 'roof_covered')).toBe(true);
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
      { kind: 'plan_roof', tick: world.tick, points: SHELL_RING.slice(0, 4) },
    ]);
    worldStep(world, site, [
      {
        kind: 'designate_roof',
        tick: world.tick,
        roofId: world.roofs[0]!.id,
        material: 'wood',
      },
    ]);
    while (world.roofs[0]!.workDone < world.roofs[0]!.workTotal) worldStep(world, site, []);
    expect(effectiveGroundAt(world, site, 55, 55)).toBe(0); // still the terrain
  });

  it('an uncovered span draws no hands — the default is none (SIM 11)', () => {
    const { world, site } = shellWorld();
    worldStep(world, site, [
      { kind: 'plan_roof', tick: world.tick, points: SHELL_RING.slice(0, 4) },
    ]);
    const roof = world.roofs[0]!;
    for (let i = 0; i < 30; i++) worldStep(world, site, []);
    expect(roof.workDone).toBe(0); // thirty days, not a plank — nobody decks bare air
    expect(world.events.some((e) => e.kind === 'roof_complete')).toBe(false);
    // the word opens it to the crew
    worldStep(world, site, [
      { kind: 'designate_roof', tick: world.tick, roofId: roof.id, material: 'straw' },
    ]);
    while (roof.workDone < roof.workTotal) worldStep(world, site, []);
    expect(world.events.some((e) => e.kind === 'roof_complete')).toBe(true);
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
    ]);
    // the covering has its own constant refusals now (SIM 11)
    worldStep(world, site, [
      { kind: 'plan_roof', tick: world.tick, points: SHELL_RING.slice(0, 4) },
    ]);
    const roofId = world.roofs[0]!.id;
    worldStep(world, site, [
      { kind: 'designate_roof', tick: world.tick, roofId: 9999, material: 'wood' },
      { kind: 'designate_roof', tick: world.tick, roofId, material: 'slate' as never },
      { kind: 'designate_roof', tick: world.tick, roofId, material: 'wood' }, // lands
      { kind: 'designate_roof', tick: world.tick, roofId, material: 'straw' }, // covered already
    ]);
    const reasons = world.events
      .filter((e) => e.kind === 'command_rejected')
      .map((e) => (e as { reason: string }).reason);
    expect(reasons).toEqual([
      'roof corners must rest on finished walls',
      'roof corners must rest on finished walls',
      'no span awaits its covering there',
      'a roof takes wood, straw, or brick',
      'no span awaits its covering there',
    ]);
    expect(world.roofs[0]!.material).toBe('wood'); // the honest word stood
  });

  it('the earth outranks the deck for UNTRAINED hands — and the green farmhand tends through it', () => {
    // a farm, then simultaneously a fill and a roof: the untrained crew moves earth
    // first, then decks (the old ordering, kept for the unskilled) — while the green
    // farmhand keeps her slot straight through (SIM 36, the groove supersession).
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
        { kind: 'designate', tick: 20, wallId: 14, use: 'farm' }, // first wall in a fresh world (13 founders)
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
      { kind: 'plan_roof', tick: world.tick, points: SHELL_RING.slice(0, 4) },
    ]);
    worldStep(world, site, [
      {
        kind: 'designate_roof',
        tick: world.tick,
        roofId: world.roofs[0]!.id,
        material: 'straw',
      },
    ]);
    // the earth moves BEFORE the deck (the untrained ladder): while the fill is open,
    // the covered roof gains nothing — and the farm's one slot is tended every day
    // regardless (the green farmhand's groove, ×9/8 a day)
    let previous = world.farms[0]!.workdays;
    expect(previous).toBeGreaterThan(before - 1e-9); // never paused for the shell either
    while (world.fills[0]!.volumeMoved < world.fills[0]!.volumeTotal) {
      expect(world.roofs[0]!.workDone).toBe(0); // earth first
      worldStep(world, site, []);
      expect(world.farms[0]!.workdays).toBeCloseTo(previous + GREEN_MULT, 9); // tended through
      previous = world.farms[0]!.workdays;
    }
    while (world.roofs[0]!.workDone < world.roofs[0]!.workTotal) {
      worldStep(world, site, []);
      expect(world.farms[0]!.workdays).toBeCloseTo(previous + GREEN_MULT, 9); // still tended
      previous = world.farms[0]!.workdays;
    }
    expect(world.events.filter((e) => e.kind === 'roof_complete')).toHaveLength(1); // the deck followed the earth
  });

  it('ramps and roofs replay identically from a save', () => {
    const site = flatSite('flat', 1000);
    const world = createWorld('ramps-roofs-replay', site.id);
    const log: Command[] = [
      { kind: 'plan_wall', tick: 0, points: SHELL_RING, height: 3 },
      { kind: 'plan_fill', tick: 0, points: RAMP_RING, height: 2, shape: 'ramp' },
      // SIM 16: won stone in the log so the shell builds and replay reproduces it
      { kind: 'plan_cut', tick: 0, points: [{ x: 300, y: 300 }, { x: 306, y: 300 }, { x: 306, y: 306 }, { x: 300, y: 306 }], depth: 1, workTotal: 2, stoneTotal: 1e6 },
    ];
    const byTick = new Map<number, Command[]>();
    byTick.set(0, log.slice());
    for (let i = 0; i < 40; i++) worldStep(world, site, byTick.get(world.tick) ?? []);
    const roofCmd: Command = {
      kind: 'plan_roof',
      tick: world.tick,
      points: SHELL_RING.slice(0, 4),
    };
    log.push(roofCmd);
    worldStep(world, site, [roofCmd]);
    const coverCmd: Command = {
      kind: 'designate_roof',
      tick: world.tick,
      roofId: world.roofs[0]!.id,
      material: 'brick',
    };
    log.push(coverCmd);
    worldStep(world, site, [coverCmd]);
    for (let i = 0; i < 60; i++) worldStep(world, site, []);
    expect(world.roofs[0]!.workDone).toBe(world.roofs[0]!.workTotal);
    const replayed = replay(makeSave(world, log), site);
    expect(hashState(replayed)).toBe(hashState(world));
  });
});
