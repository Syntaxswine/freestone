/**
 * SIM 19: THE WOODS. Timber is a real WON, SPENT, and REGROWING resource — the
 * generational heart. The load-bearing claims, shaped as red specimens on flat
 * ground (the sim never counts a tree; a fell's economics are frozen in the
 * command, so flat ground is a fair bench):
 *  - a fell WINS timber: the crew fells the cant one person-day at a time, and on
 *    felling-through the timber is credited and the stool begins to regrow;
 *  - a WOOD wall DRAWS timber (TIMBER_PER_POST a post) and STALLS when the stock
 *    is dry — the palisade is no longer free — then RESUMES when a fell lands;
 *  - you cannot cut what has not grown: a `fell` re-cut on a regrowing stand is
 *    refused (a constant-reason rejection), the stool untouched;
 *  - the stool REGROWS on its rotation (REGROWTH_TICKS) and yields AGAIN — felling
 *    is not death; the coppice is near-immortal;
 *  - and it all replays byte-for-byte (the new state + draw are deterministic).
 *
 * A world with no fell and no wood wall is unchanged (guarded by the baseline
 * instrument, not here).
 */
import { describe, expect, it } from 'vitest';
import { hashState, makeSave, replay } from '../src/sim/save';
import { flatSite } from '../src/sim/site';
import { worldStep } from '../src/sim/step';
import { createWorld } from '../src/sim/world';
import { REGROWTH_TICKS, type Command, type Vec2 } from '../src/sim/types';

// a short, low wood wall — a known, modest post demand on flat ground (one course)
const WALL: Vec2[] = [
  { x: 0, y: 0 },
  { x: 5, y: 0 },
];

/** run a scenario; `seedTimber` overrides the founder's woodpile (test-only, so a
 *  dry stock can be forced) — omit it (default SEED_TIMBER) for replayable runs */
function run(commands: Command[], ticks: number, seedTimber?: number) {
  const site = flatSite('flat', 4000);
  const byTick = new Map<number, Command[]>();
  for (const c of commands) (byTick.get(c.tick) ?? byTick.set(c.tick, []).get(c.tick)!).push(c);
  const world = createWorld('woods-seed', site.id);
  if (seedTimber !== undefined) world.timber = seedTimber;
  for (let t = 0; t < ticks; t++) worldStep(world, site, byTick.get(world.tick) ?? []);
  return world;
}

// a cant whose economics are hand-frozen (as the boundary would from the tree
// model): `timber` m³ won for `work` person-days of felling
const fell = (tick: number, timber: number, work: number): Command => ({
  kind: 'plan_fell',
  tick,
  points: [
    { x: 100, y: 100 },
    { x: 110, y: 100 },
    { x: 110, y: 110 },
    { x: 100, y: 110 },
  ],
  timberTotal: timber,
  workTotal: work,
});

const woodWall: Command = { kind: 'plan_wall', tick: 0, points: WALL, height: 0.25, material: 'wood' };

describe('the woods (SIM 19)', () => {
  it('a fell WINS timber: the cant is felled through, the stock rises, the stool regrows', () => {
    const w = run([fell(0, 20, 2)], 10, 0); // seed 0 so the 20 m³ won is unambiguous
    expect(w.timber).toBe(20); // credited on felling through
    const stand = w.stands[0]!;
    expect(stand.felling).toBe(false); // no longer under the axe
    expect(stand.feltTick).toBeGreaterThanOrEqual(0); // regrowing (not mature, not being cut)
    expect(w.events.some((e) => e.kind === 'timber_won')).toBe(true);
  });

  it('a WOOD wall draws timber and STALLS on a dry stock, then RESUMES on a fell', () => {
    // dry stock (seed 0): the palisade lays NOTHING — the WOODS are a cost now
    const dry = run([woodWall], 20, 0);
    expect(dry.timber).toBe(0);
    expect(dry.stones).toHaveLength(0); // stalled — no timber, no posts
    expect(dry.walls[0]!.stonesTotal).toBeGreaterThan(0); // there IS work waiting
    expect(dry.events.some((e) => e.kind === 'stone_laid')).toBe(false);

    // feed it a fell (moveEarth wins the timber before layStones the same day): it builds
    const fed = run([woodWall, fell(0, 5, 1)], 20, 0);
    expect(fed.stones.length).toBe(fed.walls[0]!.stonesTotal); // the palisade went up
    expect(fed.events.some((e) => e.kind === 'wall_complete')).toBe(true);
    expect(fed.timber).toBeGreaterThan(0); // won 5, spent the posts, kept the surplus
    expect(fed.timber).toBeLessThan(5); // and it DID spend timber on the posts
  });

  it('you cannot cut what has not grown: a fell on a regrowing stand is refused', () => {
    const standId = run([fell(0, 20, 2)], 1, 0).stands[0]!.id; // probe the minted id
    const w = run([fell(0, 20, 2), { kind: 'fell', tick: 5, standId }], 10, 0);
    expect(w.timber).toBe(20); // only the FIRST cut won timber — the re-cut was refused
    expect(
      w.events.some((e) => e.kind === 'command_rejected' && e.reason === 'the wood has not grown back'),
    ).toBe(true);
    expect(w.stands[0]!.feltTick).toBeGreaterThanOrEqual(0); // still regrowing, not re-cut
  });

  it('the stool REGROWS on its rotation and yields AGAIN — felling is not death', () => {
    const standId = run([fell(0, 20, 2)], 1, 0).stands[0]!.id;
    const recutTick = REGROWTH_TICKS + 3; // wait out the ~7-year rotation, then re-cut
    const w = run([fell(0, 20, 2), { kind: 'fell', tick: recutTick, standId }], recutTick + 5, 0);
    expect(w.events.some((e) => e.kind === 'stand_regrown')).toBe(true);
    expect(w.events.filter((e) => e.kind === 'timber_won')).toHaveLength(2); // two harvests
    expect(w.timber).toBe(40); // 20 + 20, the coppice yielded twice
    expect(w.stands[0]!.feltTick).toBeGreaterThanOrEqual(0); // regrowing again after the re-cut
  });

  it('replays a fell → regrow → re-cut run byte-for-byte', () => {
    const standId = run([fell(0, 20, 2)], 1).stands[0]!.id; // default seed — replayable
    const recutTick = REGROWTH_TICKS + 3;
    const cmds: Command[] = [fell(0, 20, 2), { kind: 'fell', tick: recutTick, standId }];
    const live = run(cmds, recutTick + 5);
    const site = flatSite('flat', 4000);
    const replayed = replay(makeSave(live, cmds), site, recutTick + 5);
    expect(hashState(replayed)).toBe(hashState(live));
  });
});
