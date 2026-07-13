import { describe, expect, it } from 'vitest';
import { hashState, makeSave, replay, stableStringify } from '../src/sim/save';
import { flatSite } from '../src/sim/site';
import { worldStep } from '../src/sim/step';
import { createWorld } from '../src/sim/world';
import type { Command, WorldState } from '../src/sim/types';

const CMDS: Command[] = [
  {
    kind: 'plan_wall',
    tick: 3,
    points: [
      { x: 100, y: 100 },
      { x: 160, y: 100 },
      { x: 160, y: 140 },
    ],
    height: 3,
  },
  // SIM 16: a founding quarry wins ample stone at tick 0 — IN THE LOG, so replay
  // reproduces it and "the log alone determines the world" still holds. Appended
  // (not prepended) so the wall stays commands[0] for the deep-copy test.
  {
    kind: 'plan_cut',
    tick: 0,
    points: [
      { x: 300, y: 300 },
      { x: 306, y: 300 },
      { x: 306, y: 306 },
      { x: 300, y: 306 },
    ],
    depth: 1,
    workTotal: 2,
    stoneTotal: 1e6,
  },
];

function run(seed: string, ticks: number, commands: Command[] = CMDS): WorldState {
  const site = flatSite('flat');
  const byTick = new Map<number, Command[]>();
  for (const c of commands) {
    const b = byTick.get(c.tick);
    if (b) b.push(c);
    else byTick.set(c.tick, [c]);
  }
  const world = createWorld(seed, site.id);
  for (let t = 0; t < ticks; t++) {
    worldStep(world, site, byTick.get(world.tick) ?? []);
  }
  return world;
}

describe('the sim law', () => {
  it('same seed + same commands => byte-identical state', () => {
    const a = run('alpha', 200);
    const b = run('alpha', 200);
    expect(hashState(a)).toBe(hashState(b));
    expect(stableStringify(a)).toBe(stableStringify(b));
  });

  it('replay from a save reproduces the live world exactly', () => {
    const live = run('beta', 150);
    const save = makeSave(live, CMDS);
    const replayed = replay(save, flatSite('flat'));
    expect(hashState(replayed)).toBe(hashState(live));
  });

  it('partial replay is a timelapse: stops at any tick with a valid world', () => {
    const live = run('beta', 150);
    const save = makeSave(live, CMDS);
    const early = replay(save, flatSite('flat'), 50);
    expect(early.tick).toBe(50);
    const laid = early.walls.reduce((n, w) => n + w.stonesLaid, 0);
    const laidLater = live.walls.reduce((n, w) => n + w.stonesLaid, 0);
    expect(laid).toBeGreaterThan(0);
    expect(laid).toBeLessThanOrEqual(laidLater);
  });

  it('different seeds diverge', () => {
    const a = run('alpha', 60);
    const b = run('gamma', 60);
    expect(hashState(a)).not.toBe(hashState(b));
  });

  it('state survives JSON round-trip unchanged (plain-data law)', () => {
    const a = run('alpha', 80);
    const roundTripped = JSON.parse(JSON.stringify(a)) as WorldState;
    expect(hashState(roundTripped)).toBe(hashState(a));
  });

  it('the wall completes exactly, never overshoots, and is chronicled once', () => {
    const world = run('alpha', 400);
    expect(world.walls).toHaveLength(1);
    const wall = world.walls[0]!;
    expect(wall.stonesLaid).toBe(wall.stonesTotal);
    expect(world.stones).toHaveLength(wall.stonesTotal);
    const completions = world.events.filter((e) => e.kind === 'wall_complete');
    expect(completions).toHaveLength(1);
    const planned = world.events.filter((e) => e.kind === 'wall_planned');
    expect(planned).toHaveLength(1);
  });

  it('the SAVE FILE itself survives JSON round-trip: replay(parse(stringify(save))) === live', () => {
    const live = run('beta', 150);
    const save = makeSave(live, CMDS);
    const rehydrated = JSON.parse(JSON.stringify(save)) as typeof save;
    const replayed = replay(rehydrated, flatSite('flat'));
    expect(hashState(replayed)).toBe(hashState(live));
  });

  it('replay refuses the wrong site package instead of silently diverging', () => {
    const live = run('beta', 50);
    const save = makeSave(live, CMDS);
    expect(() => replay(save, flatSite('some-other-site'))).toThrow(/recorded on site/);
  });

  it('mutating the live world after makeSave does not corrupt the save (deep copy)', () => {
    const live = run('beta', 50);
    const save = makeSave(live, CMDS);
    // CMDS[0] is a plan_wall by construction; narrow past the gate commands
    const original = CMDS[0] as Command & { kind: 'plan_wall' };
    const saved = save.commands[0] as Command & { kind: 'plan_wall' };
    original.points[0]!.x = 99999;
    try {
      expect(saved.points[0]!.x).toBe(100);
    } finally {
      original.points[0]!.x = 100;
    }
  });

  it('invalid commands are deterministically skipped and chronicled, never crash, never fork replay', () => {
    const bad: Command[] = [
      { kind: 'plan_wall', tick: 2, points: [], height: 4 },
      { kind: 'plan_wall', tick: 3, points: [{ x: 1, y: 1 }, { x: NaN, y: 2 }], height: 4 },
      { kind: 'plan_wall', tick: 4, points: [{ x: 0, y: 0 }, { x: 10, y: 0 }], height: NaN },
      { kind: 'plan_wall', tick: 5, points: [{ x: 0, y: 0 }, { x: 10, y: 0 }], height: Infinity },
      ...CMDS.map((c) => ({ ...c, tick: 6 })),
    ];
    const live = run('gamma', 100, bad);
    const rejected = live.events.filter((e) => e.kind === 'command_rejected');
    expect(rejected).toHaveLength(4);
    expect(live.walls).toHaveLength(1); // only the valid wall planted

    // and the save round-trip (NaN -> null in JSON) still replays identically,
    // because null fails the same validation the NaN failed
    const save = JSON.parse(JSON.stringify(makeSave(live, bad))) as ReturnType<typeof makeSave>;
    const replayed = replay(save, flatSite('flat'));
    expect(hashState(replayed)).toBe(hashState(live));
  });

  it('worldStep refuses mis-bucketed commands loudly', () => {
    const site = flatSite('flat');
    const world = createWorld('alpha', site.id);
    expect(() =>
      worldStep(world, site, [{ kind: 'plan_wall', tick: 7, points: [{ x: 0, y: 0 }, { x: 1, y: 0 }], height: 1 }]),
    ).toThrow(/stamped tick 7/);
  });

  it('every stone remembers its mason and its day (provenance substrate)', () => {
    const world = run('alpha', 400);
    const masonIds = new Set(
      world.people.filter((p) => p.trade === 'mason').map((p) => p.id),
    );
    for (const stone of world.stones) {
      expect(masonIds.has(stone.masonId)).toBe(true);
      expect(stone.tickLaid).toBeGreaterThanOrEqual(3);
      expect(stone.tickLaid).toBeLessThan(400);
    }
  });
});
