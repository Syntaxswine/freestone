/**
 * Sim state and command/event vocabulary.
 *
 * Laws (SCOPE §11):
 * - WorldState is plain serializable data. No class instances, no functions, no Dates.
 * - Physics advances ONLY through worldStep. UI speed controls are transport.
 * - The save format is {meta, commands}: seed + command log fully determine a world.
 *   SimEvents are derived outcomes (the chronicle's source), reproduced by replay.
 */

export const SIM_VERSION = 1;

export const TICKS_PER_YEAR = 365; // 1 tick = 1 game day
export const SEASON_LENGTH = 91; // rough quarter-year, refined in M4

/** Ashlar block dimensions, meters. Course height per Guédelon's 20–35 cm range. */
export const STONE_LEN = 0.45;
export const STONE_DEPTH = 0.3;
export const COURSE_HEIGHT = 0.25;

export interface Vec2 {
  x: number;
  y: number;
}

export interface WallPlan {
  id: number;
  points: Vec2[]; // polyline in site-local meters
  height: number; // target height above ground, meters
  stonesTotal: number;
  stonesLaid: number;
}

export interface PlacedStone {
  id: number;
  wallId: number;
  /** center, site-local meters; z is elevation (up) */
  pos: [number, number, number];
  yaw: number; // radians about z
  tickLaid: number;
  masonId: number;
}

export interface Person {
  id: number;
  name: string;
  trade: 'mason' | 'laborer';
  /** stones laid per day (stub value; real pacing arrives with M2's quarry loop) */
  pace: number;
}

export type Command = {
  kind: 'plan_wall';
  tick: number; // the tick at whose start this command applies
  points: Vec2[];
  height: number;
};

export type SimEvent =
  | { kind: 'wall_planned'; tick: number; wallId: number; stonesTotal: number }
  | { kind: 'stone_laid'; tick: number; stoneId: number; wallId: number; masonId: number }
  | { kind: 'wall_complete'; tick: number; wallId: number }
  /** an invalid command was deterministically skipped — chronicled, never crashed on */
  | { kind: 'command_rejected'; tick: number; commandKind: string; reason: string };

export interface WorldState {
  simVersion: number;
  seed: string;
  rng: number; // rng cursor — only worldStep advances it
  tick: number;
  siteId: string;
  nextId: number;
  people: Person[];
  walls: WallPlan[];
  stones: PlacedStone[];
  /**
   * Chronicle source. Deterministically reproduced by replay, so it may live in
   * state for now; becomes an external sink/ring buffer when it grows real (M3).
   */
  events: SimEvent[];
}
