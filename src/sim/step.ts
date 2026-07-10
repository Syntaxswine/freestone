import { Rng } from './rng';
import type { SiteData } from './site';
import {
  COURSE_HEIGHT,
  STONE_LEN,
  type Command,
  type Vec2,
  type WallPlan,
  type WorldState,
} from './types';

/**
 * THE LAW: physics advances only here. One call = one game day.
 * - `state` is mutated forward deterministically.
 * - `site` is immutable input data (terrain heights); the same site package must be
 *   supplied on replay.
 * - `due` are the commands stamped with cmd.tick === state.tick, in log order.
 * - The rng cursor is read from state at the top and written back at the bottom;
 *   nothing outside this file may advance it.
 */
export function worldStep(state: WorldState, site: SiteData, due: readonly Command[]): void {
  const rng = new Rng(state.rng);

  for (const cmd of due) {
    if (cmd.tick !== state.tick) {
      // Programmer error, not data error: the caller's bucketing is broken, and a
      // mis-timed command would silently break replay-equals-live. Fail loudly.
      throw new Error(`command stamped tick ${cmd.tick} handed to worldStep at tick ${state.tick}`);
    }
    applyCommand(state, cmd);
  }

  layStones(state, site, rng);

  state.tick += 1;
  state.rng = rng.state;
}

/**
 * Data validation at the sim boundary. Commands come from UI code and from saved
 * files (where JSON has already turned any NaN into null) — an invalid command is
 * deterministically SKIPPED and chronicled, identically in live play and replay,
 * so bad data can never fork the two or crash a timelapse.
 */
function rejectReason(cmd: Command): string | null {
  switch (cmd.kind) {
    case 'plan_wall': {
      // Reasons must be CONSTANT strings: they enter hashed state, and the same bad
      // command must reject with byte-identical reason before and after a JSON
      // round-trip (NaN and Infinity both arrive as null from a save file).
      if (typeof cmd.height !== 'number' || !Number.isFinite(cmd.height) || cmd.height <= 0) {
        return 'height must be a finite positive number';
      }
      if (!Array.isArray(cmd.points) || cmd.points.length < 2) {
        return 'a wall needs at least two points';
      }
      for (const p of cmd.points) {
        if (
          typeof p?.x !== 'number' ||
          typeof p?.y !== 'number' ||
          !Number.isFinite(p.x) ||
          !Number.isFinite(p.y)
        ) {
          return 'wall points must have finite x and y';
        }
      }
      return null;
    }
  }
}

function applyCommand(state: WorldState, cmd: Command): void {
  const reason = rejectReason(cmd);
  if (reason !== null) {
    state.events.push({
      kind: 'command_rejected',
      tick: state.tick,
      commandKind: cmd.kind,
      reason,
    });
    return;
  }
  switch (cmd.kind) {
    case 'plan_wall': {
      const { stonesTotal } = decomposeWall(cmd.points, cmd.height);
      const wall: WallPlan = {
        id: state.nextId++,
        points: cmd.points.map((p) => ({ x: p.x, y: p.y })),
        height: cmd.height,
        stonesTotal,
        stonesLaid: 0,
      };
      state.walls.push(wall);
      state.events.push({
        kind: 'wall_planned',
        tick: state.tick,
        wallId: wall.id,
        stonesTotal,
      });
      break;
    }
  }
}

/** Wall decomposition: full courses of evenly spaced stones along the polyline. */
export function decomposeWall(
  points: readonly Vec2[],
  height: number,
): { stonesPerCourse: number; courses: number; stonesTotal: number } {
  const length = polylineLength(points);
  const stonesPerCourse = Math.max(1, Math.floor(length / STONE_LEN));
  const courses = Math.max(1, Math.ceil(height / COURSE_HEIGHT));
  return { stonesPerCourse, courses, stonesTotal: stonesPerCourse * courses };
}

function layStones(state: WorldState, site: SiteData, rng: Rng): void {
  for (const person of state.people) {
    if (person.trade !== 'mason') continue;
    let quota = person.pace;
    while (quota > 0) {
      const wall = state.walls.find((w) => w.stonesLaid < w.stonesTotal);
      if (!wall) return;
      layOneStone(state, site, rng, wall, person.id);
      quota -= 1;
    }
  }
}

function layOneStone(
  state: WorldState,
  site: SiteData,
  rng: Rng,
  wall: WallPlan,
  masonId: number,
): void {
  const { stonesPerCourse } = decomposeWall(wall.points, wall.height);
  const i = wall.stonesLaid;
  const course = Math.floor(i / stonesPerCourse);
  const slot = i % stonesPerCourse;

  const length = polylineLength(wall.points);
  const spacing = length / stonesPerCourse;
  const at = pointAt(wall.points, (slot + 0.5) * spacing);

  const ground = site.heightAt(at.x, at.y);
  const z = ground + course * COURSE_HEIGHT + COURSE_HEIGHT / 2;
  // The human hand: a degree or two of jitter per stone. Uses the sim rng, so the
  // determinism tests exercise the cursor path. Quantized to 1e-9 rad before it
  // enters state: Math.atan2 is implementation-approximated in ECMA-262, and ulp
  // noise must never reach the hash (cross-engine replay law).
  const yaw = Math.round((at.yaw + (rng.float() - 0.5) * 0.035) * 1e9) / 1e9;

  state.stones.push({
    id: state.nextId++,
    wallId: wall.id,
    pos: [at.x, at.y, z],
    yaw,
    tickLaid: state.tick,
    masonId,
  });
  wall.stonesLaid += 1;
  state.events.push({
    kind: 'stone_laid',
    tick: state.tick,
    stoneId: state.nextId - 1,
    wallId: wall.id,
    masonId,
  });
  if (wall.stonesLaid === wall.stonesTotal) {
    state.events.push({ kind: 'wall_complete', tick: state.tick, wallId: wall.id });
  }
}

/** Math.sqrt is IEEE-exact where Math.hypot is implementation-approximated. */
function dist(ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax;
  const dy = by - ay;
  return Math.sqrt(dx * dx + dy * dy);
}

export function polylineLength(points: readonly Vec2[]): number {
  let len = 0;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1]!;
    const b = points[i]!;
    len += dist(a.x, a.y, b.x, b.y);
  }
  return len;
}

/** Point + tangent yaw at arc-length `along` the polyline (clamped). */
export function pointAt(points: readonly Vec2[], along: number): { x: number; y: number; yaw: number } {
  if (points.length === 0) return { x: 0, y: 0, yaw: 0 }; // unreachable past validation
  let remaining = Math.max(0, along);
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1]!;
    const b = points[i]!;
    const segLen = dist(a.x, a.y, b.x, b.y);
    if (remaining <= segLen || i === points.length - 1) {
      const t = segLen === 0 ? 0 : Math.min(remaining / segLen, 1);
      return {
        x: a.x + (b.x - a.x) * t,
        y: a.y + (b.y - a.y) * t,
        yaw: Math.atan2(b.y - a.y, b.x - a.x),
      };
    }
    remaining -= segLen;
  }
  const p = points[0]!;
  return { x: p.x, y: p.y, yaw: 0 };
}
