/**
 * The Lodge Book (SIM 15 save/load): event-sourced saves — seed + command log fully
 * determine a world (save.ts house law, adopted from vugg). These lock the format the
 * home screen's Save/Load now depends on:
 *   - a world PLAYED the only legal way (via the command log), then saved and re-read
 *     exactly as localStorage would (stableStringify → JSON.parse), replays
 *     byte-for-byte — same tick, same state hash;
 *   - the save deep-copies the log, so scribbling on a save can't corrupt the live
 *     chronicle (husbandry law 8);
 *   - replay REFUSES a save from a different engine version or a different site rather
 *     than silently replaying it to a divergent world.
 * Pure format tests — no sim change, the durham baseline is untouched.
 */
import { describe, expect, it } from 'vitest';
import { flatSite } from '../src/sim/site';
import { worldStep } from '../src/sim/step';
import { createWorld } from '../src/sim/world';
import { hashState, makeSave, replay, stableStringify, type SaveFile } from '../src/sim/save';
import { SIM_VERSION, TICKS_PER_YEAR, type Command, type WorldState } from '../src/sim/types';

const site = flatSite('flat', 4000);
type WallCmd = Extract<Command, { kind: 'plan_wall' }>;

/** Play a world the ONLY legal way — through the command log — so the save invariant holds. */
function play(seed: string): { w: WorldState; log: Command[] } {
  const w = createWorld(seed, site.id);
  const log: Command[] = [];
  const byTick = new Map<number, Command[]>();
  const enq = (c: Command): void => {
    log.push(c);
    const b = byTick.get(c.tick);
    if (b) b.push(c);
    else byTick.set(c.tick, [c]);
  };
  // two walls drawn on different ticks — real player intent, real downstream state
  enq({ kind: 'plan_wall', tick: 4, points: [{ x: 0, y: 0 }, { x: 24, y: 0 }, { x: 24, y: 14 }], height: 2, dressLevel: 'scappled' });
  enq({ kind: 'plan_wall', tick: 90, points: [{ x: -12, y: -8 }, { x: -12, y: 12 }], height: 1, dressLevel: 'rubble' });
  for (let t = 0; t < 2 * TICKS_PER_YEAR + 30; t++) worldStep(w, site, byTick.get(w.tick) ?? []);
  return { w, log };
}

describe('the Lodge Book — event-sourced save/load (SIM 15)', () => {
  it('a played world, saved and re-read the way localStorage would, replays byte-identically', () => {
    const { w, log } = play('lodge-rt');
    const save = makeSave(w, log);
    const wire = stableStringify(save); // what localStorage.setItem would store
    const reread = JSON.parse(wire) as SaveFile; // what getItem + JSON.parse hands back
    const w2 = replay(reread, site);
    expect(w2.tick).toBe(w.tick);
    expect(save.meta.savedAtTick).toBe(w.tick);
    expect(save.meta.simVersion).toBe(SIM_VERSION);
    expect(save.commands).toHaveLength(log.length);
    expect(hashState(w2)).toBe(hashState(w)); // the whole world, byte-for-byte
  });

  it('deep-copies the log — scribbling on a save cannot corrupt the live chronicle', () => {
    const { w, log } = play('lodge-copy');
    const save = makeSave(w, log);
    const onSave = save.commands.find((c) => c.kind === 'plan_wall') as WallCmd;
    onSave.points[0]!.x = 9999; // vandalise the copy
    const live = log.find((c) => c.kind === 'plan_wall') as WallCmd;
    expect(live.points[0]!.x).not.toBe(9999); // the original is untouched
  });

  it('refuses a save from a different engine version (migration, not silent drift)', () => {
    const { w, log } = play('lodge-ver');
    const save = makeSave(w, log);
    const stale: SaveFile = { ...save, meta: { ...save.meta, simVersion: SIM_VERSION - 1 } };
    expect(() => replay(stale, site)).toThrow(/SIM/);
  });

  it('refuses a save recorded on a different site (terrain feeds stone height)', () => {
    const { w, log } = play('lodge-site');
    const save = makeSave(w, log);
    const elsewhere = flatSite('another-hill', 4000);
    expect(() => replay(save, elsewhere)).toThrow(/site/);
  });
});
