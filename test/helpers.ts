/**
 * Shared red-specimen scaffolding (SIM 36): synthetic people in the skill-era shape.
 * vigor 0.5 reproduces the OLD midpoint paces the specimens were written against —
 * lay 30 stones/day (24 + 0.5×12), earth 4 m³/day (3 + 0.5×2) — so a test that seeded
 * "a mason at 30" or "a laborer at 4" keeps its arithmetic by seeding villager(id).
 * Pass `worked` to seed a band (e.g. a green mason: { ...zeroWorked, mason: 365 }).
 */
import type { Person } from '../src/sim/types';

export const zeroWorked = { mason: 0, digger: 0, woodsman: 0, farmhand: 0, carter: 0 } as const;

export function villager(id: number, over: Partial<Person> = {}): Person {
  return {
    id,
    name: `Specimen${id}`,
    trade: 'villager',
    vigor: 0.5,
    worked: { ...zeroWorked },
    lastJob: null,
    bornTick: -30 * 365, // a prime-age adult
    ...over,
  };
}
