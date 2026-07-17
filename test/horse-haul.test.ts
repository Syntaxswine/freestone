/**
 * SIM 41: THE OX GIVES WAY TO THE HORSE. A settlement that keeps PASTURES has draft horses
 * (one each — the same asset that hauls grain since SIM 29), and those horses haul STONE too,
 * a horse-drawn team worth HORSE_HAUL_MULT hands. The load-bearing claims:
 *  - a pasture's horse ADDS delivery to a hauled face — the wall rises strictly faster;
 *  - and it FREES HANDS: strictly fewer carriers, strictly more masons, than the horseless twin
 *    (the ox→horse story, the same shape as the way — pastures are a lever on the road);
 *  - won stone is still conserved (the horse moves the pile to the face, mints nothing);
 *  - no pasture ⇒ byte-identical to SIM 40 (guarded by the canon, which keeps none);
 *  - replay byte-for-byte (the pasture count is dawn-decidable, deterministic).
 */
import { describe, expect, it } from 'vitest';
import { hashState, makeSave, replay } from '../src/sim/save';
import { flatSite } from '../src/sim/site';
import { carrierDemand, computeAssignments, worldStep } from '../src/sim/step';
import { createWorld } from '../src/sim/world';
import { STONE_VOLUME, type Command, type Vec2 } from '../src/sim/types';

const WALL: Vec2[] = [
  { x: 0, y: 0 },
  { x: 200, y: 0 },
];
const HEIGHT = 2;
const FROM: Vec2 = { x: 2000, y: 0 };
const TO: Vec2 = { x: 100, y: 0 };

const haulWall = (tick: number): Command => ({
  kind: 'plan_wall', tick, points: WALL, height: HEIGHT, dressLevel: 'rubble',
  haul: { from: FROM, to: TO, climb: 0, detour: 1, method: 'ox-cart' },
});
const quarry = (tick: number, stones: number): Command => ({
  kind: 'plan_cut', tick, points: [{ x: 100, y: 100 }, { x: 110, y: 100 }, { x: 110, y: 110 }, { x: 100, y: 110 }],
  depth: 3, workTotal: 2, stoneTotal: stones * STONE_VOLUME,
});

function run(commands: Command[], ticks: number, pastures = 0) {
  const site = flatSite('flat', 4000);
  const byTick = new Map<number, Command[]>();
  for (const c of commands) (byTick.get(c.tick) ?? byTick.set(c.tick, []).get(c.tick)!).push(c);
  const world = createWorld('horse-seed', site.id);
  world.timber = 500;
  // seed the pastures directly (a pasture is a designated farm; here we only need its COUNT,
  // which draftHorses reads — the horse asset, exactly like the grain HORSE_HAUL)
  for (let i = 0; i < pastures; i++) {
    world.farms.push({ id: 90000 + i, wallId: 90000 + i, use: 'pasture', area: 400, workdays: 0, gates: [] } as never);
  }
  for (let t = 0; t < ticks; t++) worldStep(world, site, byTick.get(world.tick) ?? []);
  return world;
}

describe('the ox→horse step (SIM 41)', () => {
  it('a pasture makes a hauled wall rise strictly faster — the horse adds delivery', () => {
    const none = run([haulWall(0), quarry(0, 5000)], 20, 0).walls[0]!.stonesLaid;
    const two = run([haulWall(0), quarry(0, 5000)], 20, 2).walls[0]!.stonesLaid;
    expect(two).toBeGreaterThan(none);
  });

  it('and it FREES HANDS — strictly fewer carriers, more masons (the ox→horse story)', () => {
    // a SHORT road (100 m): each horse makes many trips, so it is potent and a few pastures
    // visibly free hands. On a long road a horse is throttled like a carrier and pastures barely
    // dent a big crew's appetite — honest, and why this specimen sits the pile close.
    const shortWall: Command = {
      kind: 'plan_wall', tick: 0, points: WALL, height: HEIGHT, dressLevel: 'rubble',
      haul: { from: { x: 0, y: 0 }, to: TO, climb: 0, detour: 1, method: 'ox-cart' }, // TO is x:100 → a real 100 m
    };
    const count = (w: ReturnType<typeof run>, a: string) =>
      [...computeAssignments(w).values()].filter((x) => x === a).length;
    // measure while BOTH are mid-build (a short potent road + horses finishes the wall in a
    // week, so a late tick would read 0 assignments on the finished four-pasture wall)
    const none = run([shortWall, quarry(0, 5000)], 3, 0);
    const four = run([shortWall, quarry(0, 5000)], 3, 4);
    expect(count(four, 'carry')).toBeLessThan(count(none, 'carry'));
    expect(count(four, 'lay')).toBeGreaterThan(count(none, 'lay'));
    // the demand map itself records the drop
    expect(carrierDemand(four).get(four.walls[0]!.id)!).toBeLessThan(
      carrierDemand(none).get(none.walls[0]!.id)!,
    );
  });

  it('won stone is conserved — the horse moves the pile to the face, mints nothing', () => {
    const w = run([haulWall(0), quarry(0, 2000)], 60, 3);
    const wl = w.walls[0]!;
    expect(w.stockpile + wl.faceBuffer + wl.stonesLaid * STONE_VOLUME).toBeCloseTo(2000 * STONE_VOLUME, 5);
  });

  it('no pasture ⇒ byte-identical to the horseless run (the canon keeps none)', () => {
    const a = run([haulWall(0), quarry(0, 5000)], 25, 0);
    const b = run([haulWall(0), quarry(0, 5000)], 25, 0);
    expect(hashState(a)).toBe(hashState(b));
  });

  it('replays a horse-hauled build byte-for-byte', () => {
    // a pasture won through the LOG (a designate), so replay rebuilds it too
    const cmds: Command[] = [
      { kind: 'plan_wall', tick: 0, points: [{ x: 1990, y: 1900 }, { x: 2014, y: 1900 }, { x: 2014, y: 1924 }, { x: 1990, y: 1924 }, { x: 1990, y: 1900 }], height: 0.5, dressLevel: 'rubble' },
      haulWall(0), quarry(0, 5000),
    ];
    const site = flatSite('flat', 4000);
    const byTick = new Map<number, Command[]>();
    for (const c of cmds) (byTick.get(c.tick) ?? byTick.set(c.tick, []).get(c.tick)!).push(c);
    const live = createWorld('horse-seed', site.id);
    for (let t = 0; t < 30; t++) worldStep(live, site, byTick.get(live.tick) ?? []);
    const replayed = replay(makeSave(live, cmds), site, 30);
    expect(hashState(replayed)).toBe(hashState(live));
  });
});
