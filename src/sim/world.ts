import { hashSeed, Rng } from './rng';
import { SIM_VERSION, type Person, type WorldState } from './types';

/** Stub founding party for M1 groundwork; the real people sim arrives in M3. */
const FOUNDER_NAMES = [
  'Aldith', 'Bea', 'Cuthbert', 'Dunstan', 'Edith', 'Godric', 'Hild', 'Osbert',
] as const;

export function createWorld(seed: string, siteId: string): WorldState {
  const rng = new Rng(hashSeed(seed));
  let nextId = 1;
  const people: Person[] = [];
  const names = [...FOUNDER_NAMES];
  for (let i = 0; i < 4; i++) {
    const ni = rng.int(names.length);
    const name = names.splice(ni, 1)[0] ?? 'Unnamed';
    people.push({
      id: nextId++,
      name,
      trade: i < 2 ? 'mason' : 'laborer',
      // masons: 24–36 stones/day; laborers: 3–5 m³ of earth/day (both stubs
      // until M2's economy — a laborer's pace feeds fills, a mason's feeds walls)
      pace: i < 2 ? 24 + rng.int(13) : 3 + rng.int(3),
    });
  }
  return {
    simVersion: SIM_VERSION,
    seed,
    rng: rng.state,
    tick: 0,
    siteId,
    nextId,
    people,
    walls: [],
    fills: [],
    cuts: [],
    adits: [],
    stockpile: 0,
    roofs: [],
    pending: [],
    farms: [],
    buildings: [],
    stones: [],
    events: [],
  };
}
