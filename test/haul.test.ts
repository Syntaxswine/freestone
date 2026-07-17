/**
 * SIM 17 → SIM 39: THE HAUL, BECOME LABOR. Won stone never teleports from pile to wall —
 * each STONE wall carries a face buffer that CARRIERS fill by walking it there, and the
 * masons draw the FACE, not the pile. SIM 17's frozen haulRate is gone (a rate cannot be
 * re-read when the player lays a road across it); what the boundary freezes now is the
 * ROAD, and the sim does the labour. The load-bearing claims:
 *  - a LONG road throttles the build: a wall stalls on the CARRY even while the pile is
 *    full (the honest carriage stall the bottleneck line names);
 *  - won stone is conserved — pile + every face + laid = total won, always;
 *  - the carry never delivers past a wall's need (no stone stranded at a finished face);
 *  - carriers can only move stone that has been WON (the carry is pile-capped);
 *  - a 'local' wall (haul null) draws the pile DIRECTLY — the SIM-16 path, so its face
 *    never fills; a timber wall takes no carrier at all;
 *  - ★ A WAY PAYS: the same wall, same seed, finishes STRICTLY SOONER with a road under it;
 *  - ★ a way drawn OFF the route pays nothing — min(direct, viaWay) never detours a carrier;
 *  - ★ THE SPLIT SHIFTS: with a way, strictly FEWER hands carry and MORE lay. This is the
 *    boss's sentence as an assertion ("if the workers are moving faster the bricks reach
 *    their destination quicker") — the road's payoff is hands returned to the wall;
 *  - the crew is stable day over day (the dawn pass's duty-cycle, pinned);
 *  - a hauled build replays byte-for-byte.
 *
 * These shape the mechanism on a flat site, where a wall's stone demand is a known, modest
 * number (the boundary's real route model is eye-checked in play).
 */
import { describe, expect, it } from 'vitest';
import { hashState, makeSave, replay } from '../src/sim/save';
import { flatSite } from '../src/sim/site';
import { carryRate, computeAssignments, routeCost, worldStep } from '../src/sim/step';
import { createWorld } from '../src/sim/world';
import {
  GREEN_DAYS,
  GREEN_MULT,
  STONE_VOLUME,
  WAY_MULT_SOFT,
  WAY_TIMBER_PER_M,
  WAY_WORK_PER_M,
  type Command,
  type HaulRoute,
  type Vec2,
} from '../src/sim/types';
import { villager, zeroWorked } from './helpers';

// a LONG wall (~3,500 stones) — big enough that the road's throttle is observable for many
// days rather than swallowed in one. The first draft used an 11-stone wall, which finished
// either way, and the specimen said so in as many words: "expected 11 to be greater than 11".
const WALL: Vec2[] = [
  { x: 0, y: 0 },
  { x: 200, y: 0 },
];
const HEIGHT = 2;
const PILE = 5000; // blocks won — supply must never be the binding link in these specimens
// the pile the carriers load at: two kilometres off, so the ROAD, not the pit, is the throttle
const FROM: Vec2 = { x: 2000, y: 0 };
const TO: Vec2 = { x: 100, y: 0 }; // the wall's centre — where the boundary would freeze it

function run(commands: Command[], ticks: number) {
  const site = flatSite('flat', 4000);
  const byTick = new Map<number, Command[]>();
  for (const c of commands) (byTick.get(c.tick) ?? byTick.set(c.tick, []).get(c.tick)!).push(c);
  const world = createWorld('haul-seed', site.id);
  world.timber = 500; // ways are not the subject of most of these — never let timber bind
  for (let t = 0; t < ticks; t++) worldStep(world, site, byTick.get(world.tick) ?? []);
  return world;
}

// a quarry whose economics are hand-frozen to win exactly `stones` ashlars' worth of stone
const quarry = (tick: number, stones: number): Command => ({
  kind: 'plan_cut',
  tick,
  points: [
    { x: 100, y: 100 },
    { x: 110, y: 100 },
    { x: 110, y: 110 },
    { x: 100, y: 110 },
  ],
  depth: 3,
  workTotal: 2,
  stoneTotal: stones * STONE_VOLUME,
});

// a LOCAL wall (no road) — draws the pile directly, exactly as in SIM 16
const wall = (tick: number): Command => ({ kind: 'plan_wall', tick, points: WALL, height: HEIGHT });
// a HAULED wall — carriers walk its stone two kilometres from the pile to the face
const haulWall = (tick: number, over: Partial<Vec2> = {}): Command => ({
  kind: 'plan_wall',
  tick,
  points: WALL,
  height: HEIGHT,
  haul: { from: { ...FROM, ...over }, to: TO, climb: 0, detour: 1, method: 'ox-cart' },
});
// a WAY laid ALONG the road — from the pile to the wall, so a carrier rides nearly all of it
const wayAlong = (tick: number, mult = WAY_MULT_SOFT): Command => {
  const len = 2000;
  return {
    kind: 'plan_way',
    tick,
    points: [{ x: 2000, y: 0 }, { x: 0, y: 0 }],
    length: len,
    timberTotal: len * WAY_TIMBER_PER_M,
    workTotal: len * WAY_WORK_PER_M,
    speedMult: mult,
  };
};
/** the tick a wall was finished, or null if it never was */
const completedAt = (w: ReturnType<typeof run>): number | null => {
  const e = w.events.find((ev) => ev.kind === 'wall_complete');
  return e ? e.tick : null;
};

describe('the haul, become labor (SIM 39)', () => {
  it('a long road throttles the build — the wall stalls on the CARRY, full pile or no', () => {
    const w = run([haulWall(0), quarry(0, PILE)], 3);
    const wl = w.walls[0]!;
    expect(w.stockpile).toBeGreaterThan(3); // the pile is barely touched — supply is not the limit
    expect(wl.stonesLaid).toBeGreaterThan(0); // the carriers delivered SOME
    expect(wl.stonesLaid).toBeLessThan(wl.stonesTotal); // nowhere near done…
  });

  it('a hauled wall finishes over many days — the face fills and the masons draw it', () => {
    const total = run([wall(0)], 1).walls[0]!.stonesTotal; // probe the demand
    const w = run([haulWall(0), quarry(0, PILE)], 400); // plenty of days
    const wl = w.walls[0]!;
    expect(wl.stonesLaid).toBe(total); // it DOES finish, just slowly
    expect(completedAt(w)).not.toBeNull();
    // conservation: every m³ won is in the pile, at the face, or laid in the wall
    expect(w.stockpile + wl.faceBuffer).toBeCloseTo((PILE - total) * STONE_VOLUME, 6);
    expect(wl.faceBuffer).toBeLessThan(STONE_VOLUME); // no more than a block stranded at the face
  });

  it('carriers can only move stone that has been WON — the carry is capped by the pile', () => {
    // the pile holds 2 blocks: no number of hands can carry a third
    const w = run([haulWall(0), quarry(0, 2)], 8);
    const wl = w.walls[0]!;
    expect(wl.stonesLaid).toBeLessThanOrEqual(2);
    expect(wl.stonesLaid).toBeLessThan(wl.stonesTotal); // and stalls, pile and face both dry
    expect(w.stockpile + wl.faceBuffer + wl.stonesLaid * STONE_VOLUME).toBeCloseTo(2 * STONE_VOLUME, 6);
  });

  it("a 'local' wall draws the pile directly — the face never fills (the SIM-16 path)", () => {
    const w = run([wall(0), quarry(0, 5)], 20);
    const wl = w.walls[0]!;
    expect(wl.haul).toBeNull(); // no road
    expect(wl.faceBuffer).toBe(0); // never carried to — drew the pile
    expect(w.stones).toHaveLength(5); // spent 5 blocks from the pile
    expect(w.stockpile).toBeLessThan(STONE_VOLUME); // drawn down under a block, then stalled
    // and NOBODY was put on the road for it
    expect([...computeAssignments(w).values()].some((a) => a === 'carry')).toBe(false);
  });

  it('a timber wall takes no carrier — it builds free even with a road set', () => {
    const timber: Command = {
      kind: 'plan_wall',
      tick: 0,
      points: WALL,
      height: HEIGHT,
      material: 'wood',
      haul: { from: FROM, to: TO, climb: 0, detour: 1, method: 'ox-cart' },
    };
    const w = run([timber], 20);
    const wl = w.walls[0]!;
    expect(w.stockpile).toBe(0); // drew no stone
    expect(wl.faceBuffer).toBe(0); // and was never carried to
    expect(w.stones).toHaveLength(wl.stonesTotal); // yet fully built
  });

  it('★ A WAY PAYS — the same wall, same seed, finishes STRICTLY sooner with a road under it', () => {
    const bare = run([haulWall(0), quarry(0, PILE)], 400);
    const paved = run([haulWall(0), quarry(0, PILE), wayAlong(0)], 400);
    const bareTick = completedAt(bare);
    const pavedTick = completedAt(paved);
    expect(bareTick).not.toBeNull();
    expect(pavedTick).not.toBeNull();
    // the road costs days of paving up front and pays them back many times over — the
    // whole decision, in one assertion
    expect(pavedTick!).toBeLessThan(bareTick!);
    // and the road's whole point: a carrier's journey is cheaper on it
    const bareCost = routeCost(bare, bare.walls[0]!.haul!);
    const pavedCost = routeCost(paved, paved.walls[0]!.haul!);
    expect(pavedCost).toBeLessThan(bareCost);
    // the boss asked for ≥3× visible: the built road cuts the journey to under a third
    expect(pavedCost).toBeLessThan(bareCost / 3);
  });

  it('★ a way drawn OFF the route pays nothing — min(direct, viaWay) never detours a carrier', () => {
    const cmds: Command[] = [haulWall(0), quarry(0, PILE)];
    const bare = run(cmds, 25);
    // a fine road, laid across an irrelevant meadow a kilometre off the route
    const elsewhere: Command = {
      kind: 'plan_way',
      tick: 0,
      points: [{ x: 0, y: 1000 }, { x: 2000, y: 1000 }],
      length: 2000,
      timberTotal: 2000 * WAY_TIMBER_PER_M,
      workTotal: 2000 * WAY_WORK_PER_M,
      speedMult: WAY_MULT_SOFT,
    };
    const meadow = run([...cmds, elsewhere], 25);
    // the ROUTE does not care in the slightest — nobody walks a kilometre off their way
    // to save a few hundred metres. (The wall itself builds SLOWER, because the crew is
    // off paving a useless road — which is the honest price of a bad decision, not a bug.)
    expect(routeCost(meadow, meadow.walls[0]!.haul!)).toBeCloseTo(routeCost(bare, bare.walls[0]!.haul!), 9);
  });

  it('★ THE SPLIT SHIFTS — a way puts FEWER hands on the road and MORE at the wall', () => {
    const count = (w: ReturnType<typeof run>, a: string) =>
      [...computeAssignments(w).values()].filter((x) => x === a).length;
    // step both worlds to the same day, with stone won and the way fully paved
    const bare = run([haulWall(0), quarry(0, PILE)], 30);
    const paved = run([haulWall(0), quarry(0, PILE), wayAlong(0)], 30);
    expect(paved.ways[0]!.workDone).toBeGreaterThanOrEqual(paved.ways[0]!.workTotal); // road is built
    expect(count(paved, 'carry')).toBeLessThan(count(bare, 'carry'));
    expect(count(paved, 'lay')).toBeGreaterThan(count(bare, 'lay'));
  });

  it('the carry crew is STABLE day over day — the dawn pass has no duty cycle', () => {
    // the oscillation the charter's determinism critique caught: an assignment that reads
    // the buffer its own day fills will swing 2–3 days wide. This one reads only rates.
    const w = run([haulWall(0), quarry(0, PILE)], 12);
    const site = flatSite('flat', 4000);
    const counts: number[] = [];
    for (let t = 0; t < 6; t++) {
      counts.push([...computeAssignments(w).values()].filter((a) => a === 'carry').length);
      worldStep(w, site, []);
    }
    expect(Math.max(...counts) - Math.min(...counts)).toBeLessThanOrEqual(1);
  });

  it('a GREEN carter delivers ×9/8 more than an untrained one (carryRate honours the band)', () => {
    // the carter's OTHER half: way.test pins that PAVING greens the trade; this pins that
    // CARRYING draws the same band — carryRate applies jobMult('carter'), so a year on the road
    // makes a hand deliver 9/8 more stone per day (SIM 36's discrete band, the anti-XP law).
    const site = flatSite('flat', 4000);
    const w = createWorld('carter-seed', site.id);
    const haul: HaulRoute = { from: { x: 300, y: 0 }, to: { x: 0, y: 0 }, climb: 0, detour: 1, method: 'ox-cart' };
    const green = villager(1, { worked: { ...zeroWorked, carter: GREEN_DAYS } });
    const untrained = villager(2); // zero days on the road
    expect(carryRate(w, haul, green)).toBeCloseTo(carryRate(w, haul, untrained) * GREEN_MULT, 9);
    // and a day short of the year is still UNTRAINED (the band flips on the exact day, no ramp)
    const almost = villager(3, { worked: { ...zeroWorked, carter: GREEN_DAYS - 1 } });
    expect(carryRate(w, haul, almost)).toBeCloseTo(carryRate(w, haul, untrained), 9);
  });

  it('replays a hauled build byte-for-byte (the frozen road is deterministic)', () => {
    const cmds = [haulWall(0), quarry(0, PILE), wayAlong(0)];
    const site = flatSite('flat', 4000);
    const byTick = new Map<number, Command[]>();
    for (const c of cmds) (byTick.get(c.tick) ?? byTick.set(c.tick, []).get(c.tick)!).push(c);
    const live = createWorld('haul-seed', site.id); // default woodpile — replay rebuilds from createWorld
    for (let t = 0; t < 30; t++) worldStep(live, site, byTick.get(live.tick) ?? []);
    const replayed = replay(makeSave(live, cmds), site, 30);
    expect(hashState(replayed)).toBe(hashState(live));
  });

  it('rejects a malformed road, chronicled not crashed', () => {
    const bad = run(
      [
        { kind: 'plan_wall', tick: 0, points: WALL, height: HEIGHT, haul: { from: { x: NaN, y: 0 }, to: TO, climb: 0, detour: 1, method: 'ox-cart' } },
        { kind: 'plan_wall', tick: 0, points: WALL, height: HEIGHT, haul: { from: FROM, to: TO, climb: -1, detour: 1, method: 'ox-cart' } },
        { kind: 'plan_wall', tick: 0, points: WALL, height: HEIGHT, haul: { from: FROM, to: TO, climb: 0, detour: 0, method: 'ox-cart' } },
      ],
      1,
    );
    expect(bad.walls).toHaveLength(0);
    expect(bad.events.filter((e) => e.kind === 'command_rejected')).toHaveLength(3);
  });
});
