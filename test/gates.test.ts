/**
 * SIM 7: real gates. The load-bearing claims: a closed farm ring auto-gates
 * its FIRST-placed segment at plan time and the masonry genuinely skips the
 * opening; add_gate knocks the span out of a built wall (exact stone
 * arithmetic); remove_gate queues infill the masons re-lay through the
 * ordinary daily loop, and the wall's re-completion does NOT re-claim the
 * land (one-shot recognition); the tool's rejections are constant strings;
 * and it all replays.
 */
import { describe, expect, it } from 'vitest';
import { hashState, makeSave, replay } from '../src/sim/save';
import { flatSite } from '../src/sim/site';
import { decomposeWall, pointAt, worldStep } from '../src/sim/step';
import { createWorld } from '../src/sim/world';
import { GATE_HALF, type Command, type Vec2 } from '../src/sim/types';

const FIELD_RING: Vec2[] = [
  { x: 100, y: 100 },
  { x: 120, y: 100 },
  { x: 120, y: 120 },
  { x: 100, y: 120 },
  { x: 100, y: 100 },
];

const wall = (points: Vec2[], height: number, tick = 0): Command => ({
  kind: 'plan_wall',
  tick,
  points,
  height,
});

function run(commands: Command[], days: number, seed = 'gates') {
  const site = flatSite('flat', 1000);
  const world = createWorld(seed, site.id);
  const byTick = new Map<number, Command[]>();
  for (const c of commands) {
    const b = byTick.get(c.tick);
    if (b) b.push(c);
    else byTick.set(c.tick, [c]);
  }
  for (let i = 0; i < days; i++) worldStep(world, site, byTick.get(world.tick) ?? []);
  return { world, site, byTick };
}

describe('auto-gates', () => {
  it('a closed farm ring carves its gate on the first-placed segment, and the masonry skips it', () => {
    const { world } = run([wall(FIELD_RING, 0.5)], 100);
    const w = world.walls[0]!;
    expect(w.gates).toEqual([{ x: 110, y: 100 }]); // first segment's midpoint
    expect(world.farms[0]!.gates).toEqual([{ x: 110, y: 100 }]);
    // the opening is real: no stone stands inside it
    for (const s of world.stones) {
      const d = Math.sqrt((s.pos[0] - 110) ** 2 + (s.pos[1] - 100) ** 2);
      expect(d).toBeGreaterThanOrEqual(GATE_HALF);
    }
    // and the count is the decomposition's own arithmetic, complete
    const d = decomposeWall(w.points, w.height, w.gates);
    expect(w.stonesTotal).toBe(d.stonesTotal);
    expect(w.stonesLaid).toBe(w.stonesTotal);
    expect(d.stonesPerCourse).toBeLessThan(Math.floor(80 / 0.45)); // slots were removed
  });

  it('a hand-gapped ring gets no auto-gate — the gap already serves', () => {
    const gapped = [...FIELD_RING.slice(0, 4), { x: 100, y: 101.4 }];
    const { world } = run([wall(gapped, 0.5)], 100);
    expect(world.walls[0]!.gates).toEqual([]);
    expect(world.farms[0]!.gates).toEqual([{ x: 100, y: 100.7 }]);
  });

  it('a short first segment falls forward to the first segment that can take a gate', () => {
    const ring: Vec2[] = [
      { x: 0, y: 0 },
      { x: 2, y: 0 }, // 2 m — too short for a gate
      { x: 2, y: 20 },
      { x: -18, y: 20 },
      { x: -18, y: 0 },
      { x: 0, y: 0 },
    ];
    const { world } = run([wall(ring, 0.5)], 200);
    expect(world.farms).toHaveLength(1);
    expect(world.walls[0]!.gates).toEqual([{ x: 2, y: 10 }]); // second segment's midpoint
  });
});

describe('the gate tool', () => {
  it('add_gate knocks the span out of a built wall, exactly', () => {
    const { world, site } = run([wall(FIELD_RING, 0.5)], 100);
    const w = world.walls[0]!;
    const before = decomposeWall(w.points, w.height, w.gates);
    const stonesBefore = world.stones.length;
    worldStep(world, site, [
      { kind: 'add_gate', tick: world.tick, wallId: w.id, at: { x: 120, y: 110 } },
    ]);
    const after = decomposeWall(w.points, w.height, w.gates);
    expect(w.gates).toHaveLength(2);
    expect(w.gates[1]).toEqual({ x: 120, y: 110 }); // snapped onto the east wall
    const removed = stonesBefore - world.stones.length;
    expect(removed).toBe((before.stonesPerCourse - after.stonesPerCourse) * after.courses);
    expect(removed).toBeGreaterThan(0);
    expect(w.stonesTotal).toBe(after.stonesTotal);
    expect(w.stonesLaid).toBe(w.stonesTotal); // still complete, just holed
    expect(world.farms[0]!.gates).toHaveLength(2);
    const evt = world.events.find((e) => e.kind === 'gate_added')!;
    expect((evt as { stonesRemoved: number }).stonesRemoved).toBe(removed);
  });

  it('remove_gate queues infill and the masons wall it back up — with no second farm', () => {
    const { world, site } = run([wall(FIELD_RING, 0.5)], 100);
    const w = world.walls[0]!;
    const preAddTotal = w.stonesTotal; // auto-gate only
    worldStep(world, site, [
      { kind: 'add_gate', tick: world.tick, wallId: w.id, at: { x: 120, y: 110 } },
    ]);
    const removeTick = world.tick;
    worldStep(world, site, [
      { kind: 'remove_gate', tick: world.tick, wallId: w.id, at: { x: 120, y: 110 } },
    ]);
    const evt = world.events.find((e) => e.kind === 'gate_removed')!;
    const toRelay = (evt as { stonesToRelay: number }).stonesToRelay;
    expect(toRelay).toBeGreaterThan(0);
    expect(w.gates).toHaveLength(1); // the auto-gate stays
    expect(world.farms[0]!.gates).toHaveLength(1);
    // a handful of stones is under a day's pace — the masons may already be
    // done; run until the wall stands whole either way
    while (w.stonesLaid < w.stonesTotal) worldStep(world, site, []);
    expect(w.infill).toHaveLength(0);
    expect(w.stonesTotal).toBe(preAddTotal); // back to the auto-gate-only count
    expect(w.stonesLaid).toBe(preAddTotal);
    expect(world.farms).toHaveLength(1); // one-shot recognition: no re-claim
    // fresh stones stand in the opening again, with the walling-up crew's dates
    const relaid = world.stones.filter(
      (s) =>
        s.wallId === w.id &&
        Math.sqrt((s.pos[0] - 120) ** 2 + (s.pos[1] - 110) ** 2) < GATE_HALF,
    );
    expect(relaid.length).toBe(toRelay);
    for (const s of relaid) expect(s.tickLaid).toBeGreaterThanOrEqual(removeTick);
  });

  it('rejections are constant and honest', () => {
    const { world, site } = run(
      [
        wall(FIELD_RING, 0.5),
        wall(
          [
            { x: 300, y: 300 },
            { x: 320, y: 300 },
          ],
          2,
          0,
        ), // a plain wall, no farm
      ],
      200,
    );
    const farmWall = world.walls[0]!;
    const plainWall = world.walls[1]!;
    worldStep(world, site, [
      { kind: 'add_gate', tick: world.tick, wallId: 9999, at: { x: 0, y: 0 } },
      { kind: 'add_gate', tick: world.tick, wallId: plainWall.id, at: { x: 310, y: 300 } },
      { kind: 'add_gate', tick: world.tick, wallId: farmWall.id, at: { x: 110.2, y: 100 } }, // on the auto-gate
      { kind: 'remove_gate', tick: world.tick, wallId: farmWall.id, at: { x: 120, y: 120 } }, // nothing there
    ]);
    const reasons = world.events
      .filter((e) => e.kind === 'command_rejected')
      .map((e) => (e as { reason: string }).reason);
    expect(reasons).toEqual([
      'no such wall',
      'only a farm or building wall takes a gate',
      'a gate already stands there',
      'no gate there',
    ]);
  });

  it('the same tool cuts a DOOR on a building wall (context decides)', () => {
    // the doorway-loop house: recognized as a building at completion
    const loop: Vec2[] = [
      { x: 304.55, y: 300 },
      { x: 308, y: 300 },
      { x: 308, y: 306 },
      { x: 300, y: 306 },
      { x: 300, y: 300 },
      { x: 303.45, y: 300 },
    ];
    const { world, site } = run([wall(loop, 3)], 200);
    expect(world.buildings).toHaveLength(1);
    const w = world.walls[0]!;
    const stonesBefore = world.stones.length;
    // cut a back door in the north wall
    worldStep(world, site, [
      { kind: 'add_gate', tick: world.tick, wallId: w.id, at: { x: 304, y: 306 } },
    ]);
    expect(w.gates).toHaveLength(1);
    expect(world.stones.length).toBeLessThan(stonesBefore); // the span came down
    expect(w.stonesLaid).toBe(w.stonesTotal); // still complete, just opened
    expect(world.farms).toHaveLength(0); // no farm mirror, no crash
    // and it walls back up like any gate
    worldStep(world, site, [
      { kind: 'remove_gate', tick: world.tick, wallId: w.id, at: { x: 304, y: 306 } },
    ]);
    while (w.stonesLaid < w.stonesTotal) worldStep(world, site, []);
    expect(world.stones.length).toBe(stonesBefore);
    expect(world.buildings).toHaveLength(1); // one-shot recognition held
  });

  it('gate ops wait while the wall is at work (mid-infill)', () => {
    const { world, site } = run([wall(FIELD_RING, 0.5)], 100);
    const w = world.walls[0]!;
    worldStep(world, site, [
      { kind: 'add_gate', tick: world.tick, wallId: w.id, at: { x: 120, y: 110 } },
    ]);
    // remove queues infill THIS tick; the same-day second op sees laid < total
    worldStep(world, site, [
      { kind: 'remove_gate', tick: world.tick, wallId: w.id, at: { x: 120, y: 110 } },
      { kind: 'add_gate', tick: world.tick, wallId: w.id, at: { x: 110, y: 120 } },
    ]);
    const reasons = world.events
      .filter((e) => e.kind === 'command_rejected')
      .map((e) => (e as { reason: string }).reason);
    expect(reasons).toContain('the wall is at work');
  });

  it('a wall may not become mostly holes', () => {
    // a small 6×6 garth: 24 m of wall — gates ration out fast
    const small: Vec2[] = [
      { x: 50, y: 50 },
      { x: 56, y: 50 },
      { x: 56, y: 56 },
      { x: 50, y: 56 },
      { x: 50, y: 50 },
    ];
    const { world, site } = run([wall(small, 0.5)], 100);
    const w = world.walls[0]!;
    expect(world.farms).toHaveLength(1); // 36 m² — a legal garden farm
    // march the whole ring trying to gate every 1.7 m — the spacing guard
    // refuses neighbors, and the half-solid cap must trip before the wall
    // dissolves into posts
    for (let arc = 0; arc < 24; arc += 1.7) {
      const at = pointAt(w.points, arc);
      worldStep(world, site, [
        { kind: 'add_gate', tick: world.tick, wallId: w.id, at: { x: at.x, y: at.y } },
      ]);
    }
    const reasons = world.events
      .filter((e) => e.kind === 'command_rejected')
      .map((e) => (e as { reason: string }).reason);
    expect(reasons).toContain('the wall has gates enough');
    // and the wall still stands at least half solid
    const d = decomposeWall(w.points, w.height, w.gates);
    const raw = Math.max(1, Math.floor(24 / 0.45));
    expect(d.stonesPerCourse).toBeGreaterThanOrEqual(Math.floor(raw * 0.5));
  });

  it('gate operations replay identically from a save', () => {
    const site = flatSite('flat', 1000);
    const world = createWorld('gates-replay', site.id);
    const log: Command[] = [wall(FIELD_RING, 0.5)];
    const byTick = new Map<number, Command[]>();
    byTick.set(0, log.slice());
    for (let i = 0; i < 60; i++) worldStep(world, site, byTick.get(world.tick) ?? []);
    const add: Command = {
      kind: 'add_gate',
      tick: world.tick,
      wallId: world.walls[0]!.id,
      at: { x: 120, y: 110 },
    };
    log.push(add);
    worldStep(world, site, [add]);
    const rem: Command = {
      kind: 'remove_gate',
      tick: world.tick,
      wallId: world.walls[0]!.id,
      at: { x: 120, y: 110 },
    };
    log.push(rem);
    worldStep(world, site, [rem]);
    for (let i = 0; i < 30; i++) worldStep(world, site, []);
    const replayed = replay(makeSave(world, log), site);
    expect(hashState(replayed)).toBe(hashState(world));
  });
});
