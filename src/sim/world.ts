import { hashSeed, Rng } from './rng';
import {
  FOUNDER_AGE,
  SEED_GRAIN,
  SEED_TIMBER,
  SIM_VERSION,
  TICKS_PER_YEAR,
  type Person,
  type WorldState,
} from './types';

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
      // SIM 20: the founders begin as young adults, STAGGERED in age (22, 25, 28,
      // 31) so they never die in one cohort wave (the Banished failure). A fixed
      // spread, NOT from rng — advancing the cursor here would shift every stone's
      // jitter and move the masonry baseline for a field the masons never read.
      bornTick: -(FOUNDER_AGE + i * 3) * TICKS_PER_YEAR,
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
    bellPits: [],
    stands: [],
    stockpile: 0,
    timber: SEED_TIMBER, // the founder's woodpile (SIM 19) — a first palisade before the first fell
    grain: SEED_GRAIN, // the founder's larder (SIM 22) — a store before the first harvest
    roofs: [],
    pending: [],
    farms: [],
    buildings: [],
    stones: [],
    events: [],
  };
}
