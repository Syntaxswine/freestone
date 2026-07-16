/**
 * SIM 36 — THE SKILL SYSTEM. Skill is earned by doing: a year of days worked at a job
 * (GREEN_DAYS, integer, counted only on days of real work) flips the hand to the GREEN
 * band, a ×9/8 BONUS over today's rates (untrained = the old measured world; the
 * roadmap's anti-XP law — a discrete threshold, never a curve). The load-bearing claims:
 *  - the BAND FLIP lands on the exact day the year completes — the discrete step under
 *    the hash (the 200-tick canon can never cross it, so this specimen is the guard);
 *  - a green mason out-lays an untrained twin of the same vigor by exactly ×9/8;
 *  - the biography only counts REAL work — an honest stall teaches nothing;
 *  - the flip replays byte-for-byte (worked/lastJob are hashed state).
 */
import { describe, expect, it } from 'vitest';
import { hashState, makeSave, replay } from '../src/sim/save';
import { flatSite } from '../src/sim/site';
import { worldStep } from '../src/sim/step';
import { createWorld } from '../src/sim/world';
import { GREEN_DAYS, GREEN_MULT, type Command, type Person } from '../src/sim/types';
import { villager, zeroWorked } from './helpers';

const site = flatSite('flat', 4000);

function stepped(people: Person[], cmds: Command[], ticks: number, seed = 'skill') {
  const w = createWorld(seed, site.id);
  w.people = people;
  w.stockpile = 1_000_000;
  const byTick = new Map<number, Command[]>();
  for (const c of cmds) (byTick.get(c.tick) ?? byTick.set(c.tick, []).get(c.tick)!).push(c);
  for (let t = 0; t < ticks; t++) worldStep(w, site, byTick.get(w.tick) ?? []);
  return w;
}

const longWall = (tick = 0): Command => ({
  kind: 'plan_wall',
  tick,
  points: [
    { x: 0, y: 0 },
    { x: 400, y: 0 },
  ],
  height: 1,
  dressLevel: 'scappled',
});

describe('the skill system (SIM 36)', () => {
  it('the band flips on the EXACT day the year of work completes — and the rate steps with it', () => {
    // one hand a single day short of the mason band, on an endless supplied wall
    const w = stepped(
      [villager(1, { worked: { ...zeroWorked, mason: GREEN_DAYS - 1 } })],
      [longWall()],
      1,
    );
    // day one: laid at the UNTRAINED rate (30 at vigor 0.5)… and the day itself completed the year
    expect(w.stones.length).toBe(30);
    expect(w.people[0]!.worked.mason).toBe(GREEN_DAYS);
    const w2 = stepped(
      [villager(1, { worked: { ...zeroWorked, mason: GREEN_DAYS - 1 } })],
      [longWall()],
      2,
    );
    // day two: the band held — ×9/8 exactly (quota 33.75 → 34 stones, the begun block finished)
    expect(w2.stones.length).toBe(30 + Math.ceil(30 * GREEN_MULT));
  });

  it('a green mason out-lays an untrained twin of the same vigor', () => {
    const untrained = stepped([villager(1)], [longWall()], 1);
    const green = stepped([villager(1, { worked: { ...zeroWorked, mason: GREEN_DAYS } })], [longWall()], 1);
    expect(untrained.stones.length).toBe(30); // vigor 0.5 → the old measured rate
    expect(green.stones.length).toBe(Math.ceil(30 * GREEN_MULT)); // the ×9/8 bonus
  });

  it('an honest stall teaches nothing — the biography counts only days of real work', () => {
    // a wall with NO stone in the world: assigned or not, nobody lays, nobody learns
    const w = createWorld('skill-stall', site.id);
    w.people = [villager(1)];
    w.stockpile = 0;
    const byTick = new Map<number, Command[]>([[0, [longWall()]]]);
    for (let t = 0; t < 10; t++) worldStep(w, site, byTick.get(w.tick) ?? []);
    expect(w.stones.length).toBe(0);
    expect(w.people[0]!.worked.mason).toBe(0); // ten stalled days, zero days learned
  });

  it('the biography replays byte-for-byte (worked and lastJob are hashed state)', () => {
    // the founding world itself (replay() rebuilds founders, so no hand-replaced crew
    // here): a founding quarry feeds a wall, days accrue into worked{}, and the whole
    // biography replays to the bit.
    const cmds: Command[] = [
      { kind: 'plan_cut', tick: 0, points: [{ x: 300, y: 300 }, { x: 306, y: 300 }, { x: 306, y: 306 }, { x: 300, y: 306 }], depth: 1, workTotal: 40, stoneTotal: 100 },
      longWall(1),
    ];
    const live = createWorld('skill-replay', site.id);
    const byTick = new Map<number, Command[]>();
    for (const c of cmds) (byTick.get(c.tick) ?? byTick.set(c.tick, []).get(c.tick)!).push(c);
    for (let t = 0; t < 8; t++) worldStep(live, site, byTick.get(live.tick) ?? []);
    expect(live.people.some((p) => p.worked.digger > 0)).toBe(true); // days accrued into state
    expect(live.people.some((p) => p.lastJob !== null)).toBe(true);
    const replayed = replay(makeSave(live, cmds), site, 8);
    expect(hashState(replayed)).toBe(hashState(live));
  });
});
