import { Rng } from './rng';
import type { SiteData } from './site';
import {
  COURSE_HEIGHT,
  MATERIALS,
  STONE_LEN,
  type Command,
  type FillPlan,
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
    applyCommand(state, site, cmd);
  }

  // fixed daily order: earth moves before stones are laid (a fill completed
  // this morning can carry this afternoon's masonry)
  moveEarth(state);
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
  // Reasons must be CONSTANT strings: they enter hashed state, and the same bad
  // command must reject with byte-identical reason before and after a JSON
  // round-trip (NaN and Infinity both arrive as null from a save file).
  switch (cmd.kind) {
    case 'plan_wall': {
      if (typeof cmd.height !== 'number' || !Number.isFinite(cmd.height) || cmd.height <= 0) {
        return 'height must be a finite positive number';
      }
      if (!Array.isArray(cmd.points) || cmd.points.length < 2) {
        return 'a wall needs at least two points';
      }
      if (badPoints(cmd.points)) return 'wall points must have finite x and y';
      if (cmd.material !== undefined && !MATERIALS.includes(cmd.material)) {
        return 'unknown material';
      }
      return null;
    }
    case 'plan_fill': {
      if (typeof cmd.height !== 'number' || !Number.isFinite(cmd.height) || cmd.height <= 0) {
        return 'height must be a finite positive number';
      }
      if (!Array.isArray(cmd.points) || cmd.points.length < 3) {
        return 'a fill needs at least three points';
      }
      if (badPoints(cmd.points)) return 'fill points must have finite x and y';
      // a self-crossing ring is a cheat, not a shape: its shoelace area can
      // cancel toward zero while even-odd containment still grants both lobes
      // as platform — volume billed at Math.max(1, ~0) for real ground gained
      if (ringSelfIntersects(cmd.points)) return 'fill ring must not cross itself';
      if (polygonArea(cmd.points) < 1) return 'fill ring must enclose area';
      return null;
    }
  }
}

/** proper-crossing test over the closed ring's non-adjacent segment pairs */
export function ringSelfIntersects(pts: readonly Vec2[]): boolean {
  const n = pts.length;
  const cross = (o: Vec2, a: Vec2, b: Vec2): number =>
    (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (j === (i + 1) % n || (j + 1) % n === i) continue; // adjacent share a vertex
      const a = pts[i]!;
      const b = pts[(i + 1) % n]!;
      const c = pts[j]!;
      const d = pts[(j + 1) % n]!;
      const d1 = cross(a, b, c);
      const d2 = cross(a, b, d);
      const d3 = cross(c, d, a);
      const d4 = cross(c, d, b);
      if (
        ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) &&
        ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))
      ) {
        return true;
      }
    }
  }
  return false;
}

function badPoints(points: readonly Vec2[]): boolean {
  for (const p of points) {
    if (
      typeof p?.x !== 'number' ||
      typeof p?.y !== 'number' ||
      !Number.isFinite(p.x) ||
      !Number.isFinite(p.y)
    ) {
      return true;
    }
  }
  return false;
}

function applyCommand(state: WorldState, site: SiteData, cmd: Command): void {
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
        material: cmd.material ?? 'sandstone', // old logs/saves carry no material
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
    case 'plan_fill': {
      // Target level: the highest sampled ground (vertices + centroid) plus the
      // asked-for height. Volume: polygon area × mean depth to that level — an
      // estimate, computed ONCE here so it is part of the deterministic record.
      const pts = cmd.points.map((p) => ({ x: p.x, y: p.y }));
      let cx = 0;
      let cy = 0;
      for (const p of pts) {
        cx += p.x;
        cy += p.y;
      }
      cx /= pts.length;
      cy /= pts.length;
      // sample the EFFECTIVE ground (terrain + completed platforms), or a fill
      // planned on an existing motte burns full labor to gain nothing; a fill
      // over one still IN PROGRESS still under-grounds — known, chronicled cost.
      // Vertices are sampled 2% inset toward the centroid: a ring re-drawn on a
      // platform puts its corners exactly ON the boundary, where even-odd
      // containment is a knife edge — inset samples land honestly inside.
      let gMax = effectiveGroundAt(state, site, cx, cy);
      let gSum = gMax;
      for (const p of pts) {
        const sx = p.x + (cx - p.x) * 0.02;
        const sy = p.y + (cy - p.y) * 0.02;
        const g = effectiveGroundAt(state, site, sx, sy);
        if (g > gMax) gMax = g;
        gSum += g;
      }
      const gMean = gSum / (pts.length + 1);
      const level = gMax + cmd.height;
      const volumeTotal = Math.max(1, polygonArea(pts) * (level - gMean));
      const fill: FillPlan = {
        id: state.nextId++,
        points: pts,
        level,
        volumeTotal,
        volumeMoved: 0,
      };
      state.fills.push(fill);
      state.events.push({
        kind: 'fill_planned',
        tick: state.tick,
        fillId: fill.id,
        volumeTotal,
      });
      break;
    }
  }
}

/** Laborers move earth to the oldest unfinished fill; m³ per day = their pace. */
function moveEarth(state: WorldState): void {
  for (const person of state.people) {
    if (person.trade !== 'laborer') continue;
    let quota = person.pace;
    while (quota > 0) {
      const fill = state.fills.find((f) => f.volumeMoved < f.volumeTotal);
      if (!fill) return;
      const moved = Math.min(quota, fill.volumeTotal - fill.volumeMoved);
      fill.volumeMoved += moved;
      quota -= moved;
      if (fill.volumeMoved >= fill.volumeTotal) {
        state.events.push({ kind: 'fill_complete', tick: state.tick, fillId: fill.id });
      }
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

  const ground = effectiveGroundAt(state, site, at.x, at.y);
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

/**
 * Ground for masonry: the site terrain, raised by any COMPLETED fill whose
 * polygon contains the point — walls stand on finished platforms (ramparts,
 * mottes), never on loose tipping. Pure function of state + site; only
 * comparisons and multiplies, so it is deterministic across engines.
 */
export function effectiveGroundAt(
  state: WorldState,
  site: SiteData,
  x: number,
  y: number,
): number {
  let g = site.heightAt(x, y);
  for (const f of state.fills) {
    if (f.volumeMoved >= f.volumeTotal && f.level > g && pointInPolygon(x, y, f.points)) {
      g = f.level;
    }
  }
  return g;
}

/** Standard even-odd ray cast; comparisons and multiplies only. */
export function pointInPolygon(x: number, y: number, pts: readonly Vec2[]): boolean {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const a = pts[i]!;
    const b = pts[j]!;
    const crosses = a.y > y !== b.y > y;
    if (crosses && x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}

/** Shoelace area, absolute value. */
export function polygonArea(pts: readonly Vec2[]): number {
  let s = 0;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const a = pts[j]!;
    const b = pts[i]!;
    s += a.x * b.y - b.x * a.y;
  }
  return Math.abs(s) / 2;
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
