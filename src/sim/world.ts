import { hashSeed, Rng } from './rng';
import {
  GREEN_DAYS,
  SEED_GRAIN,
  SEED_TIMBER,
  SIM_VERSION,
  TICKS_PER_YEAR,
  type Person,
  type WorldState,
} from './types';

/**
 * The founding party's name pool (SIM 36: sixteen names for thirteen souls — the pool
 * must exceed the party or the splice runs dry and mints 'Unnamed' into the hash).
 */
const FOUNDER_NAMES = [
  'Aldith', 'Bea', 'Cuthbert', 'Dunstan', 'Edith', 'Godric', 'Hild', 'Osbert',
  'Aelfric', 'Maud', 'Swein', 'Gytha', 'Ulf', 'Edeva', 'Brictric', 'Leofwyn',
] as const;

/**
 * SIM 36: the founders' ages, a FIXED cycling spread in the 20–35 band — never rng
 * (advancing the cursor here would shift every stone's jitter), never past the
 * mortality curve's teeth (the old i×3 stagger put a 13th founder at 58), and never
 * a cohort wave (the Banished failure — no two neighbours in the list are close).
 */
const FOUNDER_AGES = [22, 27, 32, 20, 25, 30, 35, 23, 28, 33, 21, 26, 31] as const;

export function createWorld(seed: string, siteId: string): WorldState {
  const rng = new Rng(hashSeed(seed));
  let nextId = 1;
  const people: Person[] = [];
  const names = [...FOUNDER_NAMES];
  // THE THIRTEEN (SIM 36, boss: "the town should start off with 13 people… 3 farmers
  // and the rest unskilled"): every founder is a generalist VILLAGER — nobody founds
  // as a mason; skill is earned by doing (a year at a job → the GREEN band). The
  // first three carry a year of field work in their hands already: green FARMHANDS.
  // Two rng draws per founder (name, vigor), exactly as the old party drew two.
  for (let i = 0; i < 13; i++) {
    const ni = rng.int(names.length);
    const name = names.splice(ni, 1)[0] ?? 'Unnamed';
    people.push({
      id: nextId++,
      name,
      trade: 'villager',
      vigor: rng.float(), // inherent pace, scaled per job by the base-rate constants
      worked: { mason: 0, digger: 0, woodsman: 0, farmhand: i < 3 ? GREEN_DAYS : 0, carter: 0 },
      lastJob: i < 3 ? 'farmhand' : null,
      bornTick: -FOUNDER_AGES[i]! * TICKS_PER_YEAR,
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
    shafts: [],
    stands: [],
    ways: [], // SIM 38: the timber causeways — none until the player draws one
    graves: [], // SIM 44: the settlement's dead — none until the first death (past tick 364)
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
