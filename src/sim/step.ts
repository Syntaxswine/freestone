import { classifyFootprint, reduceCorners, type BuildingKind } from './classify';
import { Rng } from './rng';
import type { SiteData } from './site';
import {
  BUILDING_MIN_H,
  COURSE_HEIGHT,
  DOOR_GAP_MAX,
  FARM_CLOSE_EPS,
  FARM_MIN_AREA,
  FARM_WALL_MAX_H,
  GATE_HALF,
  GATE_MIN_SEG,
  GATE_W,
  MATERIALS,
  ROOF_MATERIALS,
  ROOF_SNAP,
  ROOF_DECK,
  STONE_LEN,
  type Command,
  type FillPlan,
  type PlacedStone,
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
function rejectReason(state: WorldState, cmd: Command): string | null {
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
      // the closure gesture is normalized BEFORE the geometry guards run: a
      // hand-closed ring's final near-duplicate vertex would otherwise sit
      // inside the overlap epsilon and reject the most careful honest closure
      // (the second fleet's confirmed knife edge — 3 cm rejected, 6 cm fine)
      const ring = normalizedFillRing(cmd.points);
      if (ring.length < 3) return 'a fill needs at least three points';
      // a self-crossing ring is a cheat, not a shape: its shoelace area can
      // cancel toward zero while even-odd containment still grants both lobes
      // as platform — volume billed at Math.max(1, ~0) for real ground gained
      if (ringSelfIntersects(ring)) return 'fill ring must not cross itself';
      // the double-wound lap (the review fleet's probe): collinear overlapping
      // runs cross nothing PROPERLY while shoelace adds every lap — billed
      // and granted geometry must share one measure
      if (ringSelfOverlaps(ring)) return 'fill ring must not overlap itself';
      if (polygonArea(ring) < 1) return 'fill ring must enclose area';
      if (cmd.shape !== undefined && cmd.shape !== 'flat' && cmd.shape !== 'ramp') {
        return 'unknown fill shape';
      }
      return null;
    }
    case 'plan_roof': {
      if (!Array.isArray(cmd.points) || cmd.points.length < 3) {
        return 'a roof needs at least three points';
      }
      if (badPoints(cmd.points)) return 'roof points must have finite x and y';
      if (cmd.material !== undefined && !ROOF_MATERIALS.includes(cmd.material)) {
        return 'unknown roof material';
      }
      if (ringSelfIntersects(cmd.points)) return 'roof ring must not cross itself';
      if (ringSelfOverlaps(cmd.points)) return 'roof ring must not overlap itself';
      if (polygonArea(cmd.points) < 1) return 'roof ring must enclose area';
      // every corner must rest on standing masonry — roofs span voids, they
      // do not float; and the walls must be FINISHED (you deck what is built)
      for (const v of cmd.points) {
        let held = false;
        for (const w of state.walls) {
          if (w.stonesLaid < w.stonesTotal) continue;
          const q = nearestOnPolyline(w.points, v);
          if (dist(v.x, v.y, q.x, q.y) <= ROOF_SNAP) {
            held = true;
            break;
          }
        }
        if (!held) return 'roof corners must rest on finished walls';
      }
      return null;
    }
    case 'add_gate':
    case 'remove_gate': {
      if (
        typeof cmd.at?.x !== 'number' ||
        typeof cmd.at?.y !== 'number' ||
        !Number.isFinite(cmd.at.x) ||
        !Number.isFinite(cmd.at.y)
      ) {
        return 'gate point must have finite x and y';
      }
      const wall =
        typeof cmd.wallId === 'number'
          ? state.walls.find((w) => w.id === cmd.wallId)
          : undefined;
      if (!wall) return 'no such wall';
      // gates are FARM furniture for now; gatehouses are another course (M6)
      if (!state.farms.some((f) => f.wallId === wall.id)) {
        return 'only a farm wall takes a gate';
      }
      // gate ops only on an idle, complete wall: the slot mapping that placed
      // every laid stone must never shift under a build in progress
      if (wall.stonesLaid < wall.stonesTotal) return 'the wall is at work';
      if (cmd.kind === 'add_gate') {
        const at = nearestOnPolyline(wall.points, cmd.at);
        for (const g of wall.gates) {
          if (dist(g.x, g.y, at.x, at.y) < GATE_W) return 'a gate already stands there';
        }
        // a wall may not be mostly holes
        const test = decomposeWall(wall.points, wall.height, [...wall.gates, at]);
        const raw = Math.max(1, Math.floor(polylineLength(wall.points) / STONE_LEN));
        if (test.stonesPerCourse < raw * 0.5) return 'the wall has gates enough';
      } else {
        let near = false;
        for (const g of wall.gates) {
          if (dist(g.x, g.y, cmd.at.x, cmd.at.y) < 2.5) near = true;
        }
        // a hand-drawn gap is the wall's SHAPE, not hung furniture — it has no
        // masonry to reinstate, so it cannot be removed here
        if (!near) return 'no gate there';
      }
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
 * Fill rings arrive open by convention (the pencil commits the open ring and
 * the closing edge is implied), but a player who clicks back near the start
 * out of wall-mode habit ships a trailing near-duplicate vertex. Drop it —
 * the same closure tolerance recognition uses — so the ring the guards judge
 * and the ring the fill stores are the honest shape, not the gesture.
 */
export function normalizedFillRing(points: readonly Vec2[]): Vec2[] {
  const first = points[0];
  const last = points[points.length - 1];
  if (
    points.length >= 4 &&
    first &&
    last &&
    dist(first.x, first.y, last.x, last.y) <= FARM_CLOSE_EPS
  ) {
    return points.slice(0, -1).map((p) => ({ x: p.x, y: p.y }));
  }
  return points.map((p) => ({ x: p.x, y: p.y }));
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
  const reason = rejectReason(state, cmd);
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
      // a plan that closes into a farm carves its gateway NOW: the builders
      // leave the opening as they build (boss canon 2026-07-10)
      const gates = planGates(cmd.points, cmd.height);
      const { stonesTotal } = decomposeWall(cmd.points, cmd.height, gates);
      const wall: WallPlan = {
        id: state.nextId++,
        points: cmd.points.map((p) => ({ x: p.x, y: p.y })),
        height: cmd.height,
        material: cmd.material ?? 'sandstone', // old logs/saves carry no material
        gates,
        infill: [],
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
    case 'add_gate': {
      const wall = state.walls.find((w) => w.id === cmd.wallId)!; // validated
      const at = nearestOnPolyline(wall.points, cmd.at);
      wall.gates.push(at);
      const after = decomposeWall(wall.points, wall.height, wall.gates);
      // the crew knocks the span out: every standing stone inside the new
      // opening comes down (positions are exact slot centers, so this matches
      // the slots the decomposition just closed)
      const keep: PlacedStone[] = [];
      let removed = 0;
      for (const s of state.stones) {
        if (s.wallId === wall.id && dist(s.pos[0], s.pos[1], at.x, at.y) < GATE_HALF) {
          removed += 1;
        } else {
          keep.push(s);
        }
      }
      state.stones = keep;
      wall.stonesTotal = after.stonesTotal;
      wall.stonesLaid -= removed;
      const farm = state.farms.find((f) => f.wallId === wall.id)!; // validated
      farm.gates.push({ x: at.x, y: at.y });
      state.events.push({
        kind: 'gate_added',
        tick: state.tick,
        wallId: wall.id,
        stonesRemoved: removed,
      });
      break;
    }
    case 'remove_gate': {
      const wall = state.walls.find((w) => w.id === cmd.wallId)!; // validated
      let gi = 0;
      let gd = Infinity;
      for (let i = 0; i < wall.gates.length; i++) {
        const g = wall.gates[i]!;
        const d = dist(g.x, g.y, cmd.at.x, cmd.at.y);
        if (d < gd) {
          gd = d;
          gi = i;
        }
      }
      const gate = wall.gates[gi]!;
      const before = decomposeWall(wall.points, wall.height, wall.gates);
      wall.gates.splice(gi, 1);
      const after = decomposeWall(wall.points, wall.height, wall.gates);
      // the reopened slots queue as infill: the masons wall the gateway back
      // up through the ordinary daily loop — fresh stones, fresh provenance,
      // the walling-up crew's marks in the record
      const had = new Set(before.slots);
      const reopened = after.slots.filter((s) => !had.has(s));
      for (let c = 0; c < after.courses; c++) {
        for (const s of reopened) wall.infill.push({ course: c, slot: s });
      }
      wall.stonesTotal = after.stonesTotal;
      const farm = state.farms.find((f) => f.wallId === wall.id)!;
      const fi = farm.gates.findIndex((g) => g.x === gate.x && g.y === gate.y);
      if (fi >= 0) farm.gates.splice(fi, 1);
      state.events.push({
        kind: 'gate_removed',
        tick: state.tick,
        wallId: wall.id,
        stonesToRelay: reopened.length * after.courses,
      });
      break;
    }
    case 'plan_fill': {
      // Target level: the highest sampled ground (vertices + centroid) plus the
      // asked-for height. Volume: polygon area × mean depth to that level — an
      // estimate, computed ONCE here so it is part of the deterministic record.
      // The ring is normalized exactly as validation normalized it: the stored
      // fill and the judged fill must be the same shape.
      const pts = normalizedFillRing(cmd.points);
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
      const shape = cmd.shape ?? 'flat';
      // a ramp climbs from the FIRST-placed edge: ground there is the toe
      let rampLowG = 0;
      if (shape === 'ramp') {
        const a = pts[0]!;
        const b = pts[1]!;
        rampLowG = effectiveGroundAt(state, site, (a.x + b.x) / 2, (a.y + b.y) / 2);
      }
      // billed volume: a ramp is the wedge — mean surface is halfway between
      // the toe and the crest, honestly cheaper than the full platform
      const meanSurf = shape === 'ramp' ? (rampLowG + level) / 2 : level;
      const volumeTotal = Math.max(1, polygonArea(pts) * (meanSurf - gMean));
      const fill: FillPlan = {
        id: state.nextId++,
        points: pts,
        level,
        shape,
        rampLowG,
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
    case 'plan_roof': {
      // the deck sits on the HIGHEST supporting wall top among the corners;
      // each corner's support was validated to exist
      const pts = cmd.points.map((p) => ({ x: p.x, y: p.y }));
      let level = -Infinity;
      for (const v of pts) {
        for (const w of state.walls) {
          if (w.stonesLaid < w.stonesTotal) continue;
          const q = nearestOnPolyline(w.points, v);
          if (dist(v.x, v.y, q.x, q.y) <= ROOF_SNAP) {
            const top = effectiveGroundAt(state, site, v.x, v.y) + w.height;
            if (top > level) level = top;
          }
        }
      }
      const area = polygonArea(pts);
      const roof = {
        id: state.nextId++,
        points: pts,
        level,
        material: cmd.material ?? 'wood',
        area,
        workTotal: Math.max(1, area), // ≈ a person-day per square meter
        workDone: 0,
      };
      state.roofs.push(roof);
      state.events.push({
        kind: 'roof_planned',
        tick: state.tick,
        roofId: roof.id,
        workTotal: roof.workTotal,
      });
      break;
    }
  }
}

/**
 * Laborers move earth to the oldest unfinished fill (m³/day = their pace),
 * then deck the oldest unfinished roof (≈ m²/day at the same pace), and a
 * laborer with NO construction that day tends the farm with the fewest
 * workdays instead (tie: the older farm) — one person-day of field work.
 * Earth outranks carpentry outranks the fields outranks idleness. The Lodge
 * never puppets individuals: the work exists, so hands find it.
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
    while (quota > 0) {
      const roof = state.roofs.find((r) => r.workDone < r.workTotal);
      if (!roof) break;
      const m = Math.min(quota, roof.workTotal - roof.workDone);
      roof.workDone += m;
      moved += m;
      quota -= m;
      if (roof.workDone >= roof.workTotal) {
        state.events.push({ kind: 'roof_complete', tick: state.tick, roofId: roof.id });
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

/**
 * Wall decomposition: full courses of evenly spaced stone SLOTS along the
 * polyline — minus any slot whose center falls inside a gateway (within
 * GATE_HALF of a gate point). Slot POSITIONS are pure geometry, independent
 * of which are buildable, so a gate added or removed later never shifts the
 * stones already standing. With no gates this reduces exactly to the old
 * uniform decomposition.
 */
export function decomposeWall(
  points: readonly Vec2[],
  height: number,
  gates: readonly Vec2[] = [],
): {
  stonesPerCourse: number;
  courses: number;
  stonesTotal: number;
  slots: number[];
  spacing: number;
} {
  const length = polylineLength(points);
  const raw = Math.max(1, Math.floor(length / STONE_LEN));
  const spacing = length / raw;
  const courses = Math.max(1, Math.ceil(height / COURSE_HEIGHT));
  const slots: number[] = [];
  for (let s = 0; s < raw; s++) {
    if (gates.length > 0) {
      const at = pointAt(points, (s + 0.5) * spacing);
      let open = false;
      for (const g of gates) {
        if (dist(at.x, at.y, g.x, g.y) < GATE_HALF) {
          open = true;
          break;
        }
      }
      if (open) continue;
    }
    slots.push(s);
  }
  return {
    stonesPerCourse: slots.length,
    courses,
    stonesTotal: slots.length * courses,
    slots,
    spacing,
  };
}

/**
 * A farm always gets its gate (boss canon 2026-07-10): when a plan's ring
 * closes at farm height, a gateway is carved into the FIRST segment placed —
 * the builders leave the opening as they build; nobody knocks a hole in a
 * finished wall. If the first segment is too short to take a gate, the first
 * long-enough segment serves; failing that, the longest. A hand-gapped ring
 * already has its way in and gets nothing extra.
 */
export function planGates(points: readonly Vec2[], height: number): Vec2[] {
  const rc = classifyRing(points, height);
  if (rc === null || rc.kind !== 'farm' || rc.gate !== null) return [];
  let chosen = -1;
  let longest = -1;
  let longestLen = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i]!;
    const b = points[i + 1]!;
    const l = dist(a.x, a.y, b.x, b.y);
    if (chosen === -1 && l >= GATE_MIN_SEG) chosen = i;
    if (l > longestLen) {
      longestLen = l;
      longest = i;
    }
  }
  const i = chosen !== -1 ? chosen : longest;
  if (i === -1) return [];
  const a = points[i]!;
  const b = points[i + 1]!;
  return [{ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }];
}

/** Closest point ON the polyline to p; comparisons, multiplies, sqrt only. */
export function nearestOnPolyline(points: readonly Vec2[], p: Vec2): Vec2 {
  let best: Vec2 = { x: points[0]!.x, y: points[0]!.y };
  let bd = Infinity;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1]!;
    const b = points[i]!;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const l2 = dx * dx + dy * dy;
    const t = l2 === 0 ? 0 : Math.min(1, Math.max(0, ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2));
    const qx = a.x + dx * t;
    const qy = a.y + dy * t;
    const d = dist(p.x, p.y, qx, qy);
    if (d < bd) {
      bd = d;
      best = { x: qx, y: qy };
    }
  }
  return best;
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
  const { slots, spacing } = decomposeWall(wall.points, wall.height, wall.gates);
  let course: number;
  let slot: number;
  if (wall.infill.length > 0) {
    // walling a removed gate back up: explicit slots, bottom course first
    const job = wall.infill.shift()!;
    course = job.course;
    slot = job.slot;
  } else {
    // the initial build: the slot list is stable for a wall's whole first
    // life (gate ops are legal only on complete, idle walls), so the plain
    // counter mapping stays sound
    const i = wall.stonesLaid;
    course = Math.floor(i / slots.length);
    slot = slots[i % slots.length]!;
  }

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

/** What a completed ring's geometry declares — see classifyRing. */
export type RingClass =
  | { kind: 'farm'; ring: Vec2[]; area: number; gate: Vec2 | null }
  | { kind: 'building'; area: number; buildingKind: BuildingKind }
  | null;

/**
 * THE enclosure predicate (SCOPE §6 — the plot is the plan), in one exported
 * pure function so the sim's recognition and the pencil's HUD promise can
 * never drift (the second fleet's parity law: every HUD promise is the sim's
 * own predicate, imported, never re-derived).
 *
 * - closed low ring (gap ≤ 0.45 m, ≤ 1 m tall, ≥ 25 m²) → a farm
 * - low ring with a person-width gap (≤ 2 m) → a farm WITH A GATE (fields
 *   need gateways; the gate is the gap's midpoint — today recognition, later
 *   the herd's way in and out)
 * - tall ring (≥ 2 m) with that gap → a building, kind from the footprint
 * - between heights (1–2 m), self-crossing, self-overlapping, or too small →
 *   nothing: legal masonry, no claim
 * Comparisons, multiplies and Math.sqrt only; kind strings are constants.
 */
export function classifyRing(pts: readonly Vec2[], height: number): RingClass {
  if (pts.length < 4) return null;
  const first = pts[0]!;
  const last = pts[pts.length - 1]!;
  const gap = dist(first.x, first.y, last.x, last.y);
  if (gap > DOOR_GAP_MAX) return null;

  if (gap <= FARM_CLOSE_EPS) {
    // closed ring — the closing vertex is dropped whether closure is exact
    // (the snap's copy) or within tolerance: a kept sub-stone sliver edge
    // would sit inside the overlap guard's epsilon and read as degenerate.
    if (height > FARM_WALL_MAX_H) return null; // a yard wall claims nothing
    const ring = pts.slice(0, -1);
    if (ring.length < 3 || ringSelfIntersects(ring) || ringSelfOverlaps(ring)) return null;
    const area = polygonArea(ring);
    if (area < FARM_MIN_AREA) return null;
    return { kind: 'farm', ring: ring.map((p) => ({ x: p.x, y: p.y })), area, gate: null };
  }

  // person-width gap: a gate in a field wall, or a doorway in a shell —
  // either way the closing edge across the gap completes the polygon
  if (ringSelfIntersects(pts) || ringSelfOverlaps(pts)) return null;
  const area = polygonArea(pts);

  if (height <= FARM_WALL_MAX_H) {
    if (area < FARM_MIN_AREA) return null;
    return {
      kind: 'farm',
      ring: pts.map((p) => ({ x: p.x, y: p.y })),
      area,
      gate: { x: (first.x + last.x) / 2, y: (first.y + last.y) / 2 },
    };
  }
  if (height < BUILDING_MIN_H) return null; // too tall to step over, too low to shelter
  if (area < 4) return null; // smaller than any shed shelters nothing
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
  return { kind: 'building', area, buildingKind: classifyFootprint(area, long, span) };
}

/**
 * When a wall completes, its GEOMETRY declares what it made (boss canon
 * 2026-07-09/10) — the pencil mode is not sim data. Recognition happens at
 * COMPLETION, not planning: the field exists when the wall stands, and the
 * chronicle records the day. Recognition is ONE-SHOT per wall: a wall that
 * re-completes after gate infill must not claim its land twice.
 */
export function recognizeEnclosure(state: WorldState, wall: WallPlan): void {
  if (state.farms.some((f) => f.wallId === wall.id)) return;
  if (state.buildings.some((b) => b.wallId === wall.id)) return;
  const rc = classifyRing(wall.points, wall.height);
  if (rc === null) return;
  if (rc.kind === 'farm') {
    const farm = {
      id: state.nextId++,
      wallId: wall.id,
      points: rc.ring,
      area: rc.area,
      // every way in: the auto-gate carved at plan time (wall.gates) and/or
      // a hand-drawn gap's midpoint (rc.gate)
      gates: [...wall.gates.map((g) => ({ x: g.x, y: g.y })), ...(rc.gate ? [rc.gate] : [])],
      workdays: 0,
    };
    state.farms.push(farm);
    state.events.push({
      kind: 'farm_established',
      tick: state.tick,
      farmId: farm.id,
      wallId: wall.id,
      area: rc.area,
    });
    return;
  }
  const building = {
    id: state.nextId++,
    wallId: wall.id,
    kind: rc.buildingKind,
    area: rc.area,
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

/**
 * A fill's finished surface at a point: flat platforms sit at `level`; a ramp
 * climbs from rampLowG at the FIRST-placed edge to `level` at the polygon's
 * far extent (linear in the perpendicular distance from that edge). Shared by
 * the sim's ground query and the render, so the drawn slope and the built
 * slope are one surface. Comparisons, multiplies and sqrt only.
 */
export function fillSurfaceAt(f: FillPlan, x: number, y: number): number {
  if (f.shape !== 'ramp') return f.level;
  const a = f.points[0]!;
  const b = f.points[1]!;
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2;
  const ex = b.x - a.x;
  const ey = b.y - a.y;
  const el = Math.sqrt(ex * ex + ey * ey) || 1;
  let px = -ey / el;
  let py = ex / el;
  // the climb points INTO the polygon: toward the vertices' mean
  let cx = 0;
  let cy = 0;
  for (const q of f.points) {
    cx += q.x;
    cy += q.y;
  }
  cx /= f.points.length;
  cy /= f.points.length;
  if ((cx - mx) * px + (cy - my) * py < 0) {
    px = -px;
    py = -py;
  }
  let extent = 0;
  for (const q of f.points) {
    const d = (q.x - mx) * px + (q.y - my) * py;
    if (d > extent) extent = d;
  }
  if (extent <= 0) return f.level;
  const t = Math.min(1, Math.max(0, ((x - mx) * px + (y - my) * py) / extent));
  return f.rampLowG + (f.level - f.rampLowG) * t;
}

/**
 * Ground for masonry: the site terrain, raised by any COMPLETED fill whose
 * polygon contains the point (flat platforms and ramp slopes alike — walls
 * stand on finished earth, never loose tipping), and by any completed BRICK
 * roof deck (boss canon 2026-07-10: flat brick adds another layer — the deck
 * IS the next storey's floor). Pure function of state + site; deterministic.
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
      const s = fillSurfaceAt(f, x, y);
      if (s > g) g = s;
    }
  }
  for (const r of state.roofs) {
    if (
      r.material === 'brick' &&
      r.workDone >= r.workTotal &&
      r.level + ROOF_DECK > g &&
      pointInPolygon(x, y, r.points)
    ) {
      g = r.level + ROOF_DECK;
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
