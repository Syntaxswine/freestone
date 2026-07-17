/**
 * SIM 38: THE TIMBER WAY, drawn. The load-bearing claims of commit A:
 *  - a plan_way FREEZES its economics (length/timber/work, walked on the real surface at the
 *    command boundary) into the log; the sim core never touches heights;
 *  - the road hands PAVE it a skill-weighted person-day at a time, and it DRAWS its timber AS
 *    IT LAYS (the checkpoint credit the workings pay their stone by — no lump at the end);
 *  - the built fraction IS workDone/workTotal — the way is laid from its head;
 *  - a dry woodpile SHORTENS the day rather than stopping it, and timber is conserved exactly;
 *  - paving is CARTER work, and it writes the hand's biography;
 *  - replay reproduces it byte-for-byte;
 *  - a malformed way is chronicled, not crashed;
 *  - a world with NO way is byte-for-byte SIM 37 (guarded by the baseline instrument, not here:
 *    the regen moved only the milestone hashes + simVersion — not one semantic field).
 *
 * Nothing here asserts that a way makes haul faster — in SIM 38 nothing reads it. That is
 * SIM 39's bite, and it brings its own specimens.
 */
import { describe, expect, it } from 'vitest';
import { hashState, makeSave, replay } from '../src/sim/save';
import { flatSite } from '../src/sim/site';
import { computeAssignments, worldStep } from '../src/sim/step';
import { createWorld } from '../src/sim/world';
import { WAY_TIMBER_PER_M, WAY_WORK_PER_M, type Command, type Vec2 } from '../src/sim/types';

// a KILOMETRE of road: long enough that the thirteen founders cannot plank it in a day,
// so the incremental claims have room to be observed (1000 m ⇒ 60 m³, 40 person-days)
const RUN: Vec2[] = [
  { x: 100, y: 100 },
  { x: 1100, y: 100 },
];
const LEN = 1000;
const TIMBER_TOTAL = LEN * WAY_TIMBER_PER_M; // 60 m³
const WORK_TOTAL = LEN * WAY_WORK_PER_M; // 40 person-days
const AMPLE_TIMBER = 200; // a woodpile that never binds — timber is not the subject here

function way(tick: number, over: Partial<Extract<Command, { kind: 'plan_way' }>> = {}): Command {
  return { kind: 'plan_way', tick, points: RUN, length: LEN, timberTotal: TIMBER_TOTAL, workTotal: WORK_TOTAL, ...over };
}

function run(commands: Command[], ticks: number, seedTimber = AMPLE_TIMBER) {
  const site = flatSite('flat', 4000);
  const byTick = new Map<number, Command[]>();
  for (const c of commands) (byTick.get(c.tick) ?? byTick.set(c.tick, []).get(c.tick)!).push(c);
  const world = createWorld('way-seed', site.id);
  world.timber = seedTimber;
  for (let t = 0; t < ticks; t++) worldStep(world, site, byTick.get(world.tick) ?? []);
  return world;
}

describe('the timber way, drawn (SIM 38)', () => {
  it('plans a way that freezes its economics — the sim core never walks the ground', () => {
    const w = run([way(0)], 1);
    expect(w.ways).toHaveLength(1);
    expect(w.ways[0]!.length).toBe(LEN);
    expect(w.ways[0]!.timberTotal).toBeCloseTo(60, 9);
    expect(w.ways[0]!.workTotal).toBeCloseTo(40, 9);
    expect(w.events.some((e) => e.kind === 'way_planned')).toBe(true);
  });

  it('paves incrementally and DRAWS its timber as it lays — never a lump at the end', () => {
    const w = run([way(0)], 2);
    const p = w.ways[0]!;
    expect(p.workDone).toBeGreaterThan(0); // the road advanced on day one…
    expect(p.workDone).toBeLessThan(p.workTotal); // …and is not finished
    // the timber laid tracks the road laid, to the metre — the checkpoint form's whole point
    expect(p.timberLaid).toBeCloseTo(p.timberTotal * (p.workDone / p.workTotal), 9);
    expect(p.timberLaid).toBeGreaterThan(0);
    expect(p.timberLaid).toBeLessThan(p.timberTotal);
  });

  it('the built fraction is workDone/workTotal — the way is laid from its head', () => {
    const w = run([way(0)], 2);
    const p = w.ways[0]!;
    const built = p.length * (p.workDone / p.workTotal);
    expect(built).toBeGreaterThan(0);
    expect(built).toBeLessThan(p.length); // a part-built way is road only as far as it is laid
  });

  it('paves through to the end, fires way_complete ONCE, and spends exactly its timber', () => {
    const w = run([way(0)], 30);
    const p = w.ways[0]!;
    expect(p.workDone).toBeGreaterThanOrEqual(p.workTotal);
    expect(p.timberLaid).toBeCloseTo(p.timberTotal, 9); // exact-total, like every checkpoint credit
    expect(w.events.filter((e) => e.kind === 'way_complete')).toHaveLength(1);
    // CONSERVATION: every m³ the road laid came out of the woodpile — none minted, none lost
    expect(AMPLE_TIMBER - w.timber).toBeCloseTo(p.timberLaid, 9);
  });

  it('a dry woodpile SHORTENS the day, it does not stop the road', () => {
    // 1.5 m³ in the pile against a 60 m³ road: the hands plank as far as the timber reaches
    const w = run([way(0)], 30, 1.5);
    const p = w.ways[0]!;
    expect(p.timberLaid).toBeCloseTo(1.5, 6); // spent the pile, to the last m³
    expect(w.timber).toBeCloseTo(0, 6);
    expect(p.workDone).toBeGreaterThan(0); // the road advanced…
    expect(p.workDone).toBeLessThan(p.workTotal); // …but nowhere near its end
    expect(w.events.some((e) => e.kind === 'way_complete')).toBe(false);
  });

  it('a way with a dry woodpile wants no hands — paving falls through the ladder', () => {
    const w = run([way(0)], 1, 0);
    const assigned = computeAssignments(w);
    expect([...assigned.values()].some((a) => a === 'pave')).toBe(false);
  });

  it('paving is CARTER work — it writes the road hand’s biography', () => {
    const w = run([way(0)], 2);
    const paver = w.people.find((p) => p.worked.carter > 0);
    expect(paver).toBeDefined();
    expect(paver!.lastJob).toBe('carter');
    expect(paver!.worked.carter).toBe(2); // two days on the road, two days in the biography
    // and no OTHER trade was credited for the road's work
    expect(paver!.worked.digger).toBe(0);
    expect(paver!.worked.woodsman).toBe(0);
  });

  it('replays a way byte-for-byte', () => {
    const cmds = [way(0)];
    const ticks = 30;
    const live = run(cmds, ticks);
    const site = flatSite('flat', 4000);
    // NOTE: replay() rebuilds from createWorld, so it carries the FOUNDER's woodpile, not the
    // test's seeded one — drive the comparison from a world whose timber was never hand-seeded.
    const liveDefault = (() => {
      const world = createWorld('way-seed', site.id);
      const byTick = new Map<number, Command[]>();
      for (const c of cmds) (byTick.get(c.tick) ?? byTick.set(c.tick, []).get(c.tick)!).push(c);
      for (let t = 0; t < ticks; t++) worldStep(world, site, byTick.get(world.tick) ?? []);
      return world;
    })();
    const replayed = replay(makeSave(liveDefault, cmds), site, ticks);
    expect(hashState(replayed)).toBe(hashState(liveDefault));
    expect(live.ways).toHaveLength(1); // (the seeded run is the one the other specimens read)
  });

  it('rejects a malformed way, chronicled not crashed', () => {
    const bad = run(
      [
        way(0, { points: [{ x: 0, y: 0 }] }), // a single point is not a run
        way(0, { length: 2 }), // shorter than WAY_MIN_LENGTH — a gesture, not a road
        way(0, { length: NaN }), // NaN/Infinity arrive as null from a save
        way(0, { timberTotal: -1 }),
        way(0, { workTotal: Infinity }),
        way(0, { points: [{ x: NaN, y: 0 }, { x: 1, y: 1 }] }),
      ],
      1,
    );
    expect(bad.ways).toHaveLength(0);
    expect(bad.events.filter((e) => e.kind === 'command_rejected')).toHaveLength(6);
  });
});
