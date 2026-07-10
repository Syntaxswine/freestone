import { classifyFootprint, reduceCorners } from './classify';
import { Rng } from './rng';
import type { SiteData } from './site';
import {
  BUILDING_MIN_H,
  COURSE_HEIGHT,
  DOOR_GAP_MAX,
  FARM_CLOSE_EPS,
  FARM_MIN_AREA,
  FARM_WALL_MAX_H,
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
      // the double-wound lap (the review fleet's probe): collinear overlapping
      // runs cross nothing PROPERLY while shoelace adds every lap — billed
      // and granted geometry must share one measure
      if (ringSelfOverlaps(cmd.points)) return 'fill ring must not overlap itself';
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

/**
 * Degenerate-ring guard, the proper-crossing test's blind spot: non-adjacent
 * segments that RUN ALONG each other (double-wound laps via the map-edge
 * clamp, T-touches) cross nothing properly, but shoelace area counts every
 * lap while even-odd containment does not — a recognized farm could record
 * ~2× the land its tillage grants. Any non-adjacent pair closer than eps
 * makes the ring degenerate. Comparisons, multiplies, Math.sqrt only.
 */
export function ringSelfOverlaps(pts: readonly Vec2[], eps = 0.05): boolean {
  const n = pts.length;
  const segDist = (a: Vec2, b: Vec2, c: Vec2, d: Vec2): number =>
    Math.min(
      pointSegDist(a.x, a.y, c.x, c.y, d.x, d.y),
      pointSegDist(b.x, b.y, c.x, c.y, d.x, d.y),
      pointSegDist(c.x, c.y, a.x, a.y, b.x, b.y),
      pointSegDist(d.x, d.y, a.x, a.y, b.x, b.y),
    );
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (j === (i + 1) % n || (j + 1) % n === i) continue; // adjacent share a vertex
      if (
        segDist(pts[i]!, pts[(i + 1) % n]!, pts[j]!, pts[(j + 1) % n]!) < eps
      ) {
        return true;
      }
    }
  }
  return false;
}

function pointSegDist(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
): number {
  const dx = bx - ax;
  const dy = by - ay;
  const l2 = dx * dx + dy * dy;
  const t = l2 === 0 ? 0 : Math.min(1, Math.max(0, ((px - ax) * dx + (py - ay) * dy) / l2));
  return dist(px, py, ax + dx * t, ay + dy * t);
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

/**
 * Laborers move earth to the oldest unfinished fill; m³ per day = their pace.
 * A laborer with NO earth to move that day tends the farm with the fewest
 * workdays instead (tie: the older farm) — one person-day of field work.
 * Construction outranks the fields; the fields outrank idleness. The Lodge
 * never puppets individuals: recognized farms create the work by existing
 * (boss canon 2026-07-10).
 */
function moveEarth(state: WorldState): void {
  for (const person of state.people) {
    if (person.trade !== 'laborer') continue;
    let quota = person.pace;
    let moved = 0;
    while (quota > 0) {
      const fill = state.fills.find((f) => f.volumeMoved < f.volumeTotal);
      if (!fill) break;
      const m = Math.min(quota, fill.volumeTotal - fill.volumeMoved);
      fill.volumeMoved += m;
      moved += m;
      quota -= m;
      if (fill.volumeMoved >= fill.volumeTotal) {
        state.events.push({ kind: 'fill_complete', tick: state.tick, fillId: fill.id });
      }
    }
    if (moved === 0 && state.farms.length > 0) {
      let target = state.farms[0]!;
      for (const f of state.farms) {
        if (f.workdays < target.workdays) target = f;
      }
      target.workdays += 1;
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
    recognizeEnclosure(state, wall);
  }
}

/**
 * The plot is the plan (SCOPE §6): when a wall completes, its GEOMETRY declares
 * what it made. A closed low ring around land is a farm (boss canon 2026-07-09:
 * "farms are made by building a low wall, .5m around a piece of land"); a
 * near-closed tall ring whose gap is a doorway is a building. The pencil mode
 * is not sim data — a hand-drawn wall that closes IS an enclosure.
 *
 * Recognition happens at COMPLETION, not planning: the field exists when the
 * wall stands, and the chronicle records the day. A self-crossing ring is
 * recognized as nothing (the fill validator's bowtie lesson: shoelace area and
 * even-odd containment disagree on crossed rings — such geometry may be built
 * as a wall, but it encloses no field and shelters no one). Comparisons,
 * multiplies and Math.sqrt only; kind strings are constants.
 */
export function recognizeEnclosure(state: WorldState, wall: WallPlan): void {
  const pts = wall.points;
  if (pts.length < 4) return;
  const first = pts[0]!;
  const last = pts[pts.length - 1]!;
  const gap = dist(first.x, first.y, last.x, last.y);

  if (gap <= FARM_CLOSE_EPS) {
    // closed ring — a farm candidate. The closing vertex is dropped whether
    // closure is exact (the snap's copy) or within tolerance: a kept sub-stone
    // sliver edge would sit inside the overlap guard's epsilon of the first
    // segment and read the honest ring as degenerate.
    if (wall.height > FARM_WALL_MAX_H) return;
    const ring = pts.slice(0, -1);
    if (ring.length < 3 || ringSelfIntersects(ring) || ringSelfOverlaps(ring)) return;
    const area = polygonArea(ring);
    if (area < FARM_MIN_AREA) return;
    const farm = {
      id: state.nextId++,
      wallId: wall.id,
      points: ring.map((p) => ({ x: p.x, y: p.y })),
      area,
      workdays: 0,
    };
    state.farms.push(farm);
    state.events.push({
      kind: 'farm_established',
      tick: state.tick,
      farmId: farm.id,
      wallId: wall.id,
      area,
    });
    return;
  }

  if (gap <= DOOR_GAP_MAX) {
    // near-closed ring, person-width gap — a building candidate. The closing
    // edge across the doorway completes the footprint polygon.
    if (wall.height < BUILDING_MIN_H) return;
    if (ringSelfIntersects(pts) || ringSelfOverlaps(pts)) return;
    const area = polygonArea(pts);
    if (area < 4) return; // smaller than any shed shelters nothing
    // Reduced to 4 true corners (the doorway loop's jambs are collinear with
    // the front edge), the footprint has honest long/span; an irregular ring
    // is classified by area alone.
    const corners = reduceCorners(pts);
    let long = 0;
    let span = 0;
    if (corners.length === 4) {
      const e = corners.map((c, i) => {
        const d = corners[(i + 1) % 4]!;
        return dist(c.x, c.y, d.x, d.y);
      });
      const l1 = (e[0]! + e[2]!) / 2;
      const l2 = (e[1]! + e[3]!) / 2;
      long = Math.max(l1, l2);
      span = Math.min(l1, l2);
    } else {
      // no rectangle to measure: let area choose among the aspect-free bins
      long = Math.sqrt(area);
      span = long;
    }
    const building = {
      id: state.nextId++,
      wallId: wall.id,
      kind: classifyFootprint(area, long, span),
      area,
    };
    state.buildings.push(building);
    state.events.push({
      kind: 'building_complete',
      tick: state.tick,
      buildingId: building.id,
      wallId: wall.id,
      buildingKind: building.kind,
    });
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
