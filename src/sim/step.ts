import { classifyFootprint, reduceCorners, type FootprintKind } from './classify';
import { hashSeed, Rng } from './rng';
import type { SiteData } from './site';
import {
  ADULT_AGE,
  AREA_PER_PERSON,
  BIRTH_FLOOR_S,
  BIRTH_RATE_FULL,
  BUILDING_KINDS,
  BUILDING_MIN_H,
  BUILDING_ROOFS,
  COURSE_HEIGHT,
  DOOR_GAP_MAX,
  FOUNDING_CAPACITY,
  GROWTH_FULL,
  GROWTH_THRESHOLD,
  HUNGER_LEAVE_RATE,
  MIGRANTS_PER_YEAR_FULL,
  MORTALITY_BANDS,
  TICKS_PER_YEAR,
  dayOfYear,
  yearOf,
  type Person,
  DRESS_DRAW,
  DRESS_LEVELS,
  DRESS_SPEC,
  FARM_CLOSE_EPS,
  FARM_MIN_AREA,
  FARM_WALL_MAX_H,
  FIELD_USES,
  GATE_HALF,
  GATE_MIN_SEG,
  GATE_W,
  HAUL_METHODS,
  MATERIALS,
  REGROWTH_TICKS,
  TIMBER_PER_POST,
  ROOF_MATERIALS,
  ROOF_SNAP,
  ROOF_DECK,
  STONE_LEN,
  type BuildingKind,
  type BuildingRoof,
  type AditPlan,
  type Command,
  type CutPlan,
  type FieldUse,
  type FillPlan,
  type PlacedStone,
  type Stand,
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

  // fixed daily order: earth moves (winning stone to the pile) before the carts
  // haul it to the faces, before the masons lay — so stone won this morning can
  // be carted and laid the same day. SIM 17 threads HAUL between WIN and LAY.
  moveEarth(state);
  haulStone(state);
  layStones(state, site, rng);
  regrowWoods(state); // SIM 19: stools that have finished their rotation stand mature again
  livingYear(state); // SIM 20: once a year — deaths, births, migrants, departures (own rng stream)

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
      // the frozen haul (SIM 17): a finite positive rate if present, else local.
      // NaN/Infinity arrive as null from a save (JSON) — treated as absent = local.
      if (
        cmd.haulRate !== undefined &&
        (typeof cmd.haulRate !== 'number' || !Number.isFinite(cmd.haulRate) || cmd.haulRate <= 0)
      ) {
        return 'haul rate must be a finite positive number';
      }
      if (cmd.method !== undefined && !HAUL_METHODS.includes(cmd.method)) {
        return 'unknown haul method';
      }
      // the frozen dress level (SIM 18): a known level if present, else scappled
      if (cmd.dressLevel !== undefined && !DRESS_LEVELS.includes(cmd.dressLevel)) {
        return 'unknown dress level';
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
    case 'plan_cut': {
      if (typeof cmd.depth !== 'number' || !Number.isFinite(cmd.depth) || cmd.depth <= 0) {
        return 'depth must be a finite positive number';
      }
      if (!Array.isArray(cmd.points) || cmd.points.length < 3) {
        return 'a quarry needs at least three points';
      }
      if (badPoints(cmd.points)) return 'quarry points must have finite x and y';
      // the same ring hygiene as a fill (the quarry is a fill turned downward)
      const ring = normalizedFillRing(cmd.points);
      if (ring.length < 3) return 'a quarry needs at least three points';
      if (ringSelfIntersects(ring)) return 'quarry ring must not cross itself';
      if (ringSelfOverlaps(ring)) return 'quarry ring must not overlap itself';
      if (polygonArea(ring) < 1) return 'quarry ring must enclose area';
      // the bed-model economics are frozen into the log; guard them like any
      // float that enters hashed state (NaN/Infinity arrive as null from a save)
      if (typeof cmd.workTotal !== 'number' || !Number.isFinite(cmd.workTotal) || cmd.workTotal < 0) {
        return 'quarry workTotal must be a finite non-negative number';
      }
      if (typeof cmd.stoneTotal !== 'number' || !Number.isFinite(cmd.stoneTotal) || cmd.stoneTotal < 0) {
        return 'quarry stoneTotal must be a finite non-negative number';
      }
      return null;
    }
    case 'plan_adit': {
      if (!cmd.portal || !cmd.head || badPoints([cmd.portal, cmd.head])) {
        return 'adit portal and head must have finite x and y';
      }
      const len = Math.hypot(cmd.head.x - cmd.portal.x, cmd.head.y - cmd.portal.y);
      if (!(len > 0.5)) return 'an adit needs a drive of some length';
      if (typeof cmd.grade !== 'number' || !Number.isFinite(cmd.grade)) {
        return 'adit grade must be a finite number';
      }
      // the bed-model + surface economics are frozen into the log; guard them like
      // any float entering hashed state (NaN/Infinity arrive as null from a save)
      if (typeof cmd.workTotal !== 'number' || !Number.isFinite(cmd.workTotal) || cmd.workTotal < 0) {
        return 'adit workTotal must be a finite non-negative number';
      }
      if (typeof cmd.stoneTotal !== 'number' || !Number.isFinite(cmd.stoneTotal) || cmd.stoneTotal < 0) {
        return 'adit stoneTotal must be a finite non-negative number';
      }
      return null;
    }
    case 'plan_fell': {
      if (!Array.isArray(cmd.points) || cmd.points.length < 3) {
        return 'a fell needs at least three points';
      }
      if (badPoints(cmd.points)) return 'fell points must have finite x and y';
      // the same ring hygiene as a fill/quarry (a cant is a fill's plan gesture)
      const ring = normalizedFillRing(cmd.points);
      if (ring.length < 3) return 'a fell needs at least three points';
      if (ringSelfIntersects(ring)) return 'fell ring must not cross itself';
      if (ringSelfOverlaps(ring)) return 'fell ring must not overlap itself';
      if (polygonArea(ring) < 1) return 'fell ring must enclose area';
      // the tree-model economics are frozen into the log; guard them like any
      // float that enters hashed state (NaN/Infinity arrive as null from a save)
      if (typeof cmd.timberTotal !== 'number' || !Number.isFinite(cmd.timberTotal) || cmd.timberTotal < 0) {
        return 'fell timberTotal must be a finite non-negative number';
      }
      if (typeof cmd.workTotal !== 'number' || !Number.isFinite(cmd.workTotal) || cmd.workTotal < 0) {
        return 'fell workTotal must be a finite non-negative number';
      }
      return null;
    }
    case 'fell': {
      const stand =
        typeof cmd.standId === 'number'
          ? state.stands.find((s) => s.id === cmd.standId)
          : undefined;
      if (!stand) return 'no such stand';
      // you cannot cut what has not grown: a re-cut is legal only on a MATURE
      // stand — standing (feltTick < 0) and not already under the axe
      if (stand.felling) return 'the stand is already being felled';
      if (stand.feltTick >= 0) return 'the wood has not grown back';
      return null;
    }
    case 'plan_roof': {
      if (!Array.isArray(cmd.points) || cmd.points.length < 3) {
        return 'a roof needs at least three points';
      }
      if (badPoints(cmd.points)) return 'roof points must have finite x and y';
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
      // one tool, context decides (boss canon 2026-07-10): a farm wall takes
      // a GATE, a building wall takes a DOOR, and a PENDING enclosure (built,
      // not yet designated) takes either — you hang the gate before you name
      // the field. Plain curtain walls wait for the M6 gatehouse course.
      if (
        !state.farms.some((f) => f.wallId === wall.id) &&
        !state.buildings.some((b) => b.wallId === wall.id) &&
        !state.pending.includes(wall.id)
      ) {
        return 'only an enclosure wall takes a gate';
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
    case 'designate': {
      const wall =
        typeof cmd.wallId === 'number'
          ? state.walls.find((w) => w.id === cmd.wallId)
          : undefined;
      if (!wall || !state.pending.includes(wall.id)) {
        return 'no enclosure awaits the word there';
      }
      if (wall.plans !== null) {
        // a plotted building: the trade is the drawings' SECOND answer
        if (wall.plans.roof === null) return 'the roof is chosen before the trade';
        if (!isBuildingKind(cmd.use)) return 'a shell takes house, blacksmith, tower, or tavern';
        return null;
      }
      // no drawings ⇒ a field plot pending at completion; the one predicate
      // re-derives its facts (wall geometry is immutable)
      const rc = classifyRing(wall.points, wall.height);
      if (rc === null || rc.kind !== 'farm') return 'no enclosure awaits the word there'; // unreachable
      if (!isFieldUse(cmd.use)) return 'a field plot takes farm, livestock, or fallow';
      return null;
    }
    case 'choose_roof': {
      const wall =
        typeof cmd.wallId === 'number'
          ? state.walls.find((w) => w.id === cmd.wallId)
          : undefined;
      // only drawings that still await their roof take this word
      if (!wall || wall.plans === null || wall.plans.roof !== null) {
        return 'no shell awaits a roof there';
      }
      if (!(BUILDING_ROOFS as readonly string[]).includes(cmd.roof as string)) {
        return 'a roof is none, wood, straw, or brick';
      }
      return null;
    }
    case 'designate_roof': {
      const roof =
        typeof cmd.roofId === 'number'
          ? state.roofs.find((r) => r.id === cmd.roofId)
          : undefined;
      // an already-covered span is not asking; the word is one-shot here too
      if (!roof || roof.material !== null) return 'no span awaits its covering there';
      if (!ROOF_MATERIALS.includes(cmd.material)) {
        return 'a roof takes wood, straw, or brick';
      }
      return null;
    }
  }
}

/** palette guards for designate — includes() over the constant lists */
function isFieldUse(u: unknown): u is FieldUse {
  return typeof u === 'string' && (FIELD_USES as readonly string[]).includes(u);
}
function isBuildingKind(u: unknown): u is BuildingKind {
  return typeof u === 'string' && (BUILDING_KINDS as readonly string[]).includes(u);
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
      // a building-classifiable ring gets DRAWINGS (SIM 12): the roof and the
      // trade are asked at plot time, and the masons wait on the answers
      const rc = classifyRing(cmd.points, cmd.height);
      // THE SURVEY (SIM 13): level courses off the sim's own ground, frozen
      // here — buildings rise to ONE datum (a roof needs one flat bearing),
      // plain walls step their tops with the land, layers even either way
      const survey = surveyWall(
        cmd.points,
        cmd.height,
        gates,
        (x, y) => effectiveGroundAt(state, site, x, y),
        rc?.kind === 'building' ? 'level' : 'stepped',
      );
      const wall: WallPlan = {
        id: state.nextId++,
        points: cmd.points.map((p) => ({ x: p.x, y: p.y })),
        height: cmd.height,
        material: cmd.material ?? 'sandstone', // old logs/saves carry no material
        gates,
        infill: [],
        plans: rc?.kind === 'building' ? { roof: null, kind: null } : null,
        levelTop: survey.levelTop,
        courses: survey.courses,
        slotStarts: survey.slotStarts,
        slotEnds: survey.slotEnds,
        stonesTotal: survey.stonesTotal,
        stonesLaid: 0,
        // THE HAUL (SIM 17): absent ⇒ a 'local' wall (haulRate null) that draws
        // the pile directly, the SIM-16 path — so a log with no frozen route
        // replays byte-for-byte. A frozen finite rate carts stone to the face.
        haulRate: cmd.haulRate ?? null,
        faceBuffer: 0,
        method: cmd.method ?? 'local',
        // THE DRESS LEVEL (SIM 18): absent ⇒ 'scappled' (the SIM-16/17 cost), so
        // a log with no frozen level replays byte-for-byte. A finite level scales
        // the lay debt (DRESS_SPEC) and the per-stone draw (DRESS_DRAW).
        dressLevel: cmd.dressLevel ?? 'scappled',
      };
      state.walls.push(wall);
      state.events.push({
        kind: 'wall_planned',
        tick: state.tick,
        wallId: wall.id,
        stonesTotal: survey.stonesTotal,
      });
      if (wall.plans !== null && rc?.kind === 'building') {
        state.pending.push(wall.id);
        state.events.push({
          kind: 'shell_plotted',
          tick: state.tick,
          wallId: wall.id,
          area: rc.area,
        });
      }
      break;
    }
    case 'choose_roof': {
      // the drawings' first answer; the trade question follows
      const wall = state.walls.find((w) => w.id === cmd.wallId)!; // validated
      wall.plans!.roof = cmd.roof;
      state.events.push({
        kind: 'roof_chosen',
        tick: state.tick,
        wallId: wall.id,
        roof: cmd.roof,
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
      // the survey is frozen: the new total is the surviving columns' own
      // per-column course counts (stepped footings and tops and all)
      wall.stonesTotal = after.slots.reduce(
        (n, s) => n + (wall.slotEnds[s]! - wall.slotStarts[s]!),
        0,
      );
      wall.stonesLaid -= removed;
      // a farm mirrors its gates; a building's door lives on the wall alone
      const farm = state.farms.find((f) => f.wallId === wall.id);
      if (farm) farm.gates.push({ x: at.x, y: at.y });
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
      // the walling-up crew's marks in the record. Course-major, and each
      // column only from its own surveyed footing up (SIM 13).
      const had = new Set(before.slots);
      const reopened = after.slots.filter((s) => !had.has(s));
      let relay = 0;
      for (let c = 0; c < wall.courses; c++) {
        for (const s of reopened) {
          if (wall.slotStarts[s]! <= c && c < wall.slotEnds[s]!) {
            wall.infill.push({ course: c, slot: s });
            relay += 1;
          }
        }
      }
      wall.stonesTotal = after.slots.reduce(
        (n, s) => n + (wall.slotEnds[s]! - wall.slotStarts[s]!),
        0,
      );
      const farm = state.farms.find((f) => f.wallId === wall.id);
      if (farm) {
        const fi = farm.gates.findIndex((g) => g.x === gate.x && g.y === gate.y);
        if (fi >= 0) farm.gates.splice(fi, 1);
      }
      state.events.push({
        kind: 'gate_removed',
        tick: state.tick,
        wallId: wall.id,
        stonesToRelay: relay,
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
    case 'plan_cut': {
      // A quarry: the fill gesture turned downward. Ring hygiene matches the
      // fill; the floor is level at the lowest sampled ground minus the depth.
      // workTotal and stoneTotal were read from the bed model at the command
      // boundary and are frozen here — the sim core never touches the beds.
      const pts = normalizedFillRing(cmd.points);
      let gMin = Infinity;
      let cx = 0;
      let cy = 0;
      for (const p of pts) {
        cx += p.x;
        cy += p.y;
        const g = effectiveGroundAt(state, site, p.x, p.y);
        if (g < gMin) gMin = g;
      }
      cx /= pts.length;
      cy /= pts.length;
      const gc = effectiveGroundAt(state, site, cx, cy);
      if (gc < gMin) gMin = gc;
      const area = polygonArea(pts);
      const cut: CutPlan = {
        id: state.nextId++,
        points: pts,
        depth: cmd.depth,
        floorLevel: gMin - cmd.depth,
        volumeTotal: Math.max(1, area * cmd.depth),
        workTotal: Math.max(1, cmd.workTotal), // at least a day's work, like fills
        workDone: 0,
        stoneTotal: cmd.stoneTotal,
        stoneWon: false,
      };
      state.cuts.push(cut);
      state.events.push({
        kind: 'cut_planned',
        tick: state.tick,
        cutId: cut.id,
        volumeTotal: cut.volumeTotal,
        workTotal: cut.workTotal,
      });
      break;
    }
    case 'plan_adit': {
      // An adit: a drift driven into the hillside at the portal's grade. workTotal
      // and stoneTotal (self-drained, water-free) were read from the bed model + the
      // surface at the command boundary and are frozen here — the sim core never
      // touches beds, heights or the water table.
      const portal = { x: cmd.portal.x, y: cmd.portal.y };
      const head = { x: cmd.head.x, y: cmd.head.y };
      const adit: AditPlan = {
        id: state.nextId++,
        portal,
        head,
        grade: cmd.grade,
        workTotal: Math.max(1, cmd.workTotal), // at least a day's work, like cuts and fills
        workDone: 0,
        stoneTotal: cmd.stoneTotal,
        stoneWon: false,
      };
      state.adits.push(adit);
      state.events.push({
        kind: 'adit_planned',
        tick: state.tick,
        aditId: adit.id,
        length: Math.hypot(head.x - portal.x, head.y - portal.y),
        workTotal: adit.workTotal,
      });
      break;
    }
    case 'plan_fell': {
      // A managed cant: the felling gesture over woodland. timberTotal and workTotal
      // were read from the tree model at the command boundary and are frozen here —
      // the sim core never counts a tree. The crew begins felling at once (like a
      // quarry begins digging); on completion the timber is won and the stool regrows.
      const stand: Stand = {
        id: state.nextId++,
        points: normalizedFillRing(cmd.points),
        timberTotal: cmd.timberTotal,
        workTotal: Math.max(1, cmd.workTotal), // at least a day's work, like cuts and adits
        workDone: 0,
        felling: true,
        feltTick: -1,
      };
      state.stands.push(stand);
      state.events.push({
        kind: 'fell_planned',
        tick: state.tick,
        standId: stand.id,
        timberTotal: stand.timberTotal,
        workTotal: stand.workTotal,
      });
      break;
    }
    case 'fell': {
      // re-cut a MATURE stand — the coppice's next harvest on the rotation. Its
      // yield and cost are its own (frozen at plan_fell); we just put it back under
      // the axe. Validated mature (standing, not already felling) in rejectReason.
      const stand = state.stands.find((s) => s.id === cmd.standId)!;
      stand.felling = true;
      stand.workDone = 0;
      stand.feltTick = -1;
      state.events.push({ kind: 'fell_recut', tick: state.tick, standId: stand.id });
      break;
    }
    case 'plan_roof': {
      // the deck sits on the HIGHEST supporting wall top among the corners —
      // and since SIM 13 a wall's top IS its surveyed level datum, so the
      // deck meets the masonry exactly; each corner's support was validated
      const pts = cmd.points.map((p) => ({ x: p.x, y: p.y }));
      let level = -Infinity;
      for (const v of pts) {
        for (const w of state.walls) {
          if (w.stonesLaid < w.stonesTotal) continue;
          const q = nearestOnPolyline(w.points, v);
          if (dist(v.x, v.y, q.x, q.y) <= ROOF_SNAP) {
            if (w.levelTop > level) level = w.levelTop;
          }
        }
      }
      const area = polygonArea(pts);
      const roof = {
        id: state.nextId++,
        points: pts,
        level,
        // the default is none (boss canon 2026-07-10): the span is drawn,
        // its covering awaits the word, and no one decks bare air
        material: null,
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
    case 'designate_roof': {
      // the covering chosen: a paper act, like the enclosure's word — the
      // decking itself still queues behind the earth in the daily loop
      const roof = state.roofs.find((r) => r.id === cmd.roofId)!; // validated
      roof.material = cmd.material;
      state.events.push({
        kind: 'roof_covered',
        tick: state.tick,
        roofId: roof.id,
        material: cmd.material,
      });
      break;
    }
    case 'designate': {
      // the lord's word: a paper act, applied the day it is given — no labor,
      // no wall idle-check. For a plotted BUILDING this is the drawings'
      // second answer (the roof came first) and it frees the masons; for a
      // field plot it puts enclosed land to its use.
      const wall = state.walls.find((w) => w.id === cmd.wallId)!; // validated
      state.pending = state.pending.filter((id) => id !== wall.id);
      if (wall.plans !== null) {
        wall.plans.kind = cmd.use as BuildingKind; // validated against the shell palette
        state.events.push({
          kind: 'building_planned',
          tick: state.tick,
          wallId: wall.id,
          buildingKind: wall.plans.kind,
        });
        break;
      }
      const rc = classifyRing(wall.points, wall.height)!; // validated: a farm ring
      if (rc.kind === 'farm') {
        const farm = {
          id: state.nextId++,
          wallId: wall.id,
          use: cmd.use as FieldUse, // validated against the field palette
          points: rc.ring,
          area: rc.area,
          // every way in: the auto-gate carved at plan time plus any the tool
          // hung while pending (wall.gates is live truth) and/or a hand-drawn
          // gap's midpoint (rc.gate)
          gates: [...wall.gates.map((g) => ({ x: g.x, y: g.y })), ...(rc.gate ? [rc.gate] : [])],
          workdays: 0,
        };
        state.farms.push(farm);
        state.events.push({
          kind: 'plot_designated',
          tick: state.tick,
          plotId: farm.id,
          wallId: wall.id,
          use: farm.use,
          area: rc.area,
        });
      }
      break;
    }
  }
}

/**
 * Laborers move earth to the oldest unfinished fill (m³/day = their pace),
 * then deck the oldest unfinished roof (≈ m²/day at the same pace), and a
 * laborer with NO construction that day tends the ARABLE farm with the fewest
 * workdays instead (tie: the older farm) — one person-day of field work.
 * Earth outranks carpentry outranks the fields outranks idleness. The Lodge
 * never puppets individuals: the work exists, so hands find it.
 */
function moveEarth(state: WorldState): void {
  for (const person of state.people) {
    if (person.trade !== 'laborer' || !isAdult(person, state.tick)) continue; // SIM 20: children don't dig
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
      // an UNCOVERED span (material null) is not work — nobody decks bare
      // air; the designate_roof word opens it to the crew
      const roof = state.roofs.find((r) => r.material !== null && r.workDone < r.workTotal);
      if (!roof) break;
      const m = Math.min(quota, roof.workTotal - roof.workDone);
      roof.workDone += m;
      moved += m;
      quota -= m;
      if (roof.workDone >= roof.workTotal) {
        state.events.push({ kind: 'roof_complete', tick: state.tick, roofId: roof.id });
      }
    }
    if (moved === 0) {
      // a QUARRY outranks field-work (SIM 14): an idle laborer digs the oldest
      // unfinished cut — one person-day, the strata's pace already baked into
      // workTotal. On the day the pit is dug out, the building stone won (the
      // generous yield) is credited to the stockpile. No cut, no digging: the
      // field path below is untouched, so a world with no quarries is
      // byte-identical to before SIM 14.
      const cut = state.cuts.find((c) => c.workDone < c.workTotal);
      if (cut) {
        cut.workDone += 1;
        moved = 1;
        if (cut.workDone >= cut.workTotal && !cut.stoneWon) {
          cut.stoneWon = true;
          state.stockpile += cut.stoneTotal;
          state.events.push({ kind: 'cut_complete', tick: state.tick, cutId: cut.id });
          state.events.push({ kind: 'stone_won', tick: state.tick, cutId: cut.id, stone: cut.stoneTotal });
        }
      }
    }
    if (moved === 0) {
      // an ADIT is driven like a quarry is dug (SIM 15), ranked just under the
      // quarry: an idle laborer drives the oldest unfinished adit one person-day
      // (the strata's pace already baked into workTotal). On the day it is holed
      // through, the dewatered building stone is credited. No adit, no driving —
      // the field path below is untouched, so a world with no adits is byte-
      // identical to before SIM 15.
      const adit = state.adits.find((a) => a.workDone < a.workTotal);
      if (adit) {
        adit.workDone += 1;
        moved = 1;
        if (adit.workDone >= adit.workTotal && !adit.stoneWon) {
          adit.stoneWon = true;
          state.stockpile += adit.stoneTotal;
          state.events.push({ kind: 'adit_complete', tick: state.tick, aditId: adit.id });
          state.events.push({ kind: 'adit_stone_won', tick: state.tick, aditId: adit.id, stone: adit.stoneTotal });
        }
      }
    }
    if (moved === 0) {
      // THE WOODS are felled like a quarry is dug (SIM 19), ranked just under the
      // adit: an idle laborer fells the oldest stand still under the axe, one
      // person-day. On the day the cant is felled through, its timber is credited to
      // the global stock and the stool begins to regrow (regrowWoods matures it
      // later). No stand being felled, no felling — the field path below is
      // untouched, so a world with no woods work is byte-identical to before SIM 19.
      const stand = state.stands.find((s) => s.felling && s.workDone < s.workTotal);
      if (stand) {
        stand.workDone += 1;
        moved = 1;
        if (stand.workDone >= stand.workTotal) {
          stand.felling = false;
          stand.feltTick = state.tick;
          state.timber += stand.timberTotal;
          state.events.push({
            kind: 'timber_won',
            tick: state.tick,
            standId: stand.id,
            timber: stand.timberTotal,
          });
        }
      }
    }
    if (moved === 0) {
      // ARABLE only: pasture is grazed by its herd (later), fallow rests —
      // hands go to the tilled fields alone
      let target: { workdays: number } | null = null;
      for (const f of state.farms) {
        if (f.use !== 'farm') continue;
        if (target === null || f.workdays < target.workdays) target = f;
      }
      if (target !== null) target.workdays += 1;
    }
  }
}

/**
 * THE REGROWTH (SIM 19): a felled stool that has finished its rotation stands
 * mature again — fellable once more (the near-immortal coppice; felling is not
 * death). Pure tick arithmetic, no rng: a world with no felled stand is
 * byte-identical to before SIM 19. Re-cutting a mature stand is a deliberate act
 * (the `fell` command), so regrowth only reopens the option, it does not auto-fell.
 */
function regrowWoods(state: WorldState): void {
  for (const stand of state.stands) {
    if (!stand.felling && stand.feltTick >= 0 && state.tick >= stand.feltTick + REGROWTH_TICKS) {
      stand.feltTick = -1;
      stand.workDone = 0;
      state.events.push({ kind: 'stand_regrown', tick: state.tick, standId: stand.id });
    }
  }
}

/** A person's age in whole-and-fractional years (SIM 20). */
function ageInYears(bornTick: number, tick: number): number {
  return (tick - bornTick) / TICKS_PER_YEAR;
}

/** An adult digs and lays; a child does neither, until ADULT_AGE (SIM 20). */
function isAdult(p: Person, tick: number): boolean {
  return ageInYears(p.bornTick, tick) >= ADULT_AGE;
}

/** the folk pool new souls are named from — CONSTANT strings, like the founders */
const FOLK_NAMES = [
  'Agnes', 'Alwin', 'Beorn', 'Cecily', 'Drogo', 'Emma', 'Frideswide', 'Gilbert',
  'Hawise', 'Ivo', 'Juliana', 'Leofric', 'Matilda', 'Nicholas', 'Osgood', 'Petronilla',
  'Roger', 'Sibyl', 'Turold', 'Wulfric',
] as const;

/** a working adult drawn on the migration wind (arrives aged ADULT_AGE..+14) */
function newAdult(state: WorldState, rng: Rng, tick: number): Person {
  return {
    id: state.nextId++,
    name: rng.pick(FOLK_NAMES),
    trade: 'laborer', // migrants arrive as hands; the trades split in step 3
    pace: 3 + rng.int(3),
    bornTick: tick - Math.round((ADULT_AGE + rng.int(15)) * TICKS_PER_YEAR),
  };
}

/** a child born to the settlement — lifts no stone until it comes of age */
function newChild(state: WorldState, rng: Rng, tick: number): Person {
  return {
    id: state.nextId++,
    name: rng.pick(FOLK_NAMES),
    trade: 'laborer',
    pace: 3 + rng.int(3),
    bornTick: tick,
  };
}

/**
 * THE LIVING YEAR (SIM 20): once a year — the last day — the settlement is
 * reckoned. On its OWN rng stream (`seed:demo:<year>`), so people-churn never
 * advances the masonry jitter cursor (§10 isolation): each soul rolls survival on
 * the age curve; then the HARVEST — food capacity in mouths, space-gated by
 * enclosed arable area — sets the surplus S, which draws MIGRANTS (fast) and lifts
 * BIRTHS (slow) at surplus, or thins the village in hunger. A world stepped less
 * than a year (the 200-tick canon) never enters here: byte-identical but for the
 * new `bornTick` fields.
 */
function livingYear(state: WorldState): void {
  if (dayOfYear(state.tick) !== TICKS_PER_YEAR - 1) return;
  const rng = new Rng(hashSeed(`${state.seed}:demo:${yearOf(state.tick)}`));

  // 1. MORTALITY — each soul rolls survival on the age curve; deaths leave the record
  const survivors: Person[] = [];
  for (const p of state.people) {
    const age = ageInYears(p.bornTick, state.tick);
    const band = MORTALITY_BANDS.find((b) => age < b.untilAge) ?? MORTALITY_BANDS[MORTALITY_BANDS.length - 1]!;
    if (rng.float() < band.annual) {
      state.events.push({
        kind: 'person_died',
        tick: state.tick,
        personId: p.id,
        name: p.name,
        age: Math.floor(age),
      });
    } else {
      survivors.push(p);
    }
  }
  state.people = survivors;

  // 2. THE HARVEST — food capacity in mouths, space-gated by enclosed arable (§4)
  const arable = state.farms.reduce((a, f) => (f.use === 'farm' ? a + f.area : a), 0);
  const capacity = FOUNDING_CAPACITY + arable / AREA_PER_PERSON;
  const S = capacity / Math.max(1, state.people.length);

  // 3. BIRTHS (continuous), MIGRANTS (surplus only), HUNGER (dearth) — all off one S.
  // BIRTHS — the SLOW valve, always on above the fertility floor: at HOLD they
  // roughly replace the dead (no death-spiral), at surplus they grow the line, in
  // hunger they collapse. A child lifts no stone for ~ADULT_AGE years — a lineage.
  const birthFactor = Math.min(1, Math.max(0, (S - BIRTH_FLOOR_S) / (GROWTH_FULL - BIRTH_FLOOR_S)));
  if (birthFactor > 0) {
    const adults = state.people.filter((p) => isAdult(p, state.tick)).length;
    for (let i = 0; i < adults; i++) {
      if (rng.float() < BIRTH_RATE_FULL * birthFactor) {
        const p = newChild(state, rng, state.tick);
        state.people.push(p);
        state.events.push({ kind: 'person_born', tick: state.tick, personId: p.id, name: p.name });
      }
    }
  }
  // MIGRANTS — the FAST valve, only when there is real surplus to draw them: word of
  // a full granary spreads and working adults arrive THIS year (responsiveness).
  if (S >= GROWTH_THRESHOLD) {
    const g = Math.min(1, (S - GROWTH_THRESHOLD) / (GROWTH_FULL - GROWTH_THRESHOLD));
    const want = MIGRANTS_PER_YEAR_FULL * g;
    let migrants = Math.floor(want);
    if (rng.float() < want - migrants) migrants += 1;
    for (let i = 0; i < migrants; i++) {
      const p = newAdult(state, rng, state.tick);
      state.people.push(p);
      state.events.push({ kind: 'person_arrived', tick: state.tick, personId: p.id, name: p.name });
    }
  }
  // HUNGER — souls leave for another manor (the boss: "really bad, like starvation,
  // and they leave"). One soul always holds on — the settlement never empties here.
  if (S < 1.0) {
    let leaving = state.people.filter(() => rng.float() < HUNGER_LEAVE_RATE);
    if (leaving.length >= state.people.length) leaving = leaving.slice(0, state.people.length - 1);
    const gone = new Set(leaving.map((p) => p.id));
    for (const p of leaving) {
      state.events.push({ kind: 'person_left', tick: state.tick, personId: p.id, name: p.name });
    }
    state.people = state.people.filter((p) => !gone.has(p.id));
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
 * THE SURVEY (SIM 13, boss canon 2026-07-10: "leveled the stone wall … so
 * regardless of height the layers are even"): real masons build LEVEL courses
 * off a stepped footing, not courses that ride the ground. Every course is a
 * horizontal slab on ONE shared grid hung from the wall's datum (highest
 * ground + height), and each column's footing stone may sit partly buried,
 * as real footings do. Two honest datums:
 *
 * - 'level' (building-class rings — a roof needs one flat bearing): every
 *   column rises to THE datum. Downhill columns take extra footing courses,
 *   honestly billed.
 * - 'stepped' (plain walls and field rings — hillside practice): each
 *   column's top is its own ground + height rounded UP to the shared grid,
 *   so the layers stay even while the wall TOP steps with the land. A field
 *   ring crossing the gorge bank costs what it always cost, not four times
 *   more (the probe caught the single-datum bill: 420 → 1921 stones).
 *
 * slotStarts/slotEnds are indexed by RAW slot (gate ops never shift the
 * alignment): a column occupies courses start ≤ c < end. The survey runs
 * ONCE at plan time on the sim's own ground and is FROZEN on the wall — the
 * masons set out the works from the survey, not from ground that may move.
 * One function serves sim and pencil (the parity law), so the promised stone
 * count is the record's.
 */
export function surveyWall(
  points: readonly Vec2[],
  height: number,
  gates: readonly Vec2[],
  groundAt: (x: number, y: number) => number,
  datum: 'level' | 'stepped' = 'stepped',
): {
  levelTop: number;
  courses: number;
  slotStarts: number[];
  slotEnds: number[];
  slots: number[];
  spacing: number;
  stonesTotal: number;
} {
  const { slots, spacing } = decomposeWall(points, height, gates);
  const raw = Math.max(1, Math.floor(polylineLength(points) / STONE_LEN));
  // sample every column's ground once — the grid hangs from the highest
  const grounds: number[] = [];
  let gMax = -Infinity;
  for (let s = 0; s < raw; s++) {
    const at = pointAt(points, (s + 0.5) * spacing);
    const g = groundAt(at.x, at.y);
    grounds.push(g);
    if (g > gMax) gMax = g;
  }
  const levelTop = gMax + height;
  // per column: slabs below the datum where its TOP sits (0 for 'level'),
  // and how many slabs it stacks from the one containing its ground
  const tops = grounds.map((g) =>
    datum === 'level'
      ? 0
      : Math.max(0, Math.floor((levelTop - (g + height)) / COURSE_HEIGHT + 1e-9)),
  );
  const counts = grounds.map((g, s) =>
    Math.max(
      1,
      Math.ceil((levelTop - tops[s]! * COURSE_HEIGHT - g) / COURSE_HEIGHT - 1e-9),
    ),
  );
  let courses = 1;
  for (let s = 0; s < raw; s++) {
    if (tops[s]! + counts[s]! > courses) courses = tops[s]! + counts[s]!;
  }
  const slotStarts = grounds.map((_, s) => courses - tops[s]! - counts[s]!);
  const slotEnds = grounds.map((_, s) => courses - tops[s]!);
  let stonesTotal = 0;
  for (const s of slots) stonesTotal += slotEnds[s]! - slotStarts[s]!;
  return { levelTop, courses, slotStarts, slotEnds, slots, spacing, stonesTotal };
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

/** drawings with a null answer keep the crew off the wall (SIM 12) */
export function awaitsDrawings(w: WallPlan): boolean {
  return w.plans !== null && (w.plans.roof === null || w.plans.kind === null);
}

/**
 * THE HAUL (SIM 17): the carts move won stone from the global pile to each stone
 * wall's FACE at its frozen haulRate — the missing middle of WIN → HAUL → LAY.
 * Each hauled wall meters min(haulRate, pile, still-needed) into its faceBuffer
 * per day, so a wall far from winnable stone (a low rate) fills its face slowly
 * and stalls on the CART even while the pile is full. 'local' walls (haulRate
 * null) and timber take no cart — they draw the pile directly in layStones,
 * exactly as in SIM 16, so a world of only local/timber walls is byte-identical
 * to before. Walls are served in id order (oldest first), like diggers and
 * masons; when the pile runs dry the day's hauling stops.
 */
function haulStone(state: WorldState): void {
  for (const wall of state.walls) {
    if (state.stockpile <= 0) break; // the pile is dry — no cart rolls today
    if (wall.haulRate === null || wall.material === 'wood') continue; // no cart
    if (wall.stonesLaid >= wall.stonesTotal || awaitsDrawings(wall)) continue; // not being worked
    // never haul past what the wall can still lay — stone at a finished face is
    // stranded (the wall's demand, less what already stands at the face). The
    // demand is per-stone DRAW × remaining: an ashlar wall's face wants half again
    // more rough stone per block (SIM 18), so its cart falls behind sooner.
    const draw = DRESS_DRAW[wall.dressLevel];
    const need = (wall.stonesTotal - wall.stonesLaid) * draw - wall.faceBuffer;
    if (need <= 0) continue;
    const move = Math.min(wall.haulRate, state.stockpile, need);
    if (move <= 0) continue;
    state.stockpile -= move;
    wall.faceBuffer += move;
  }
}

function layStones(state: WorldState, site: SiteData, rng: Rng): void {
  // a wall the masons can WORK this moment (SIM 16 + 17 + 19): drawings settled (a
  // plotted building waits on its roof and trade), and its supply in hand — a WOOD
  // wall now DRAWS the global TIMBER stock (SIM 19: the WOODS are a cost; a post
  // spends TIMBER_PER_POST), a 'local' stone wall draws the global pile, a HAULED
  // wall draws the stone the carts brought to its FACE. A wood wall with a dry
  // timber stock stalls on the WOODS; a hauled wall whose face is dry stalls on the
  // CART even while the pile is full; a local wall with a dry pile stalls on the
  // quarry. The supply one unit needs is its dress DRAW (SIM 18) for a stone, or
  // TIMBER_PER_POST for a post. When nothing can be worked the crew stalls honestly.
  const supplied = (w: WallPlan): boolean =>
    w.material === 'wood'
      ? state.timber >= TIMBER_PER_POST
      : w.haulRate === null
        ? state.stockpile >= DRESS_DRAW[w.dressLevel]
        : w.faceBuffer >= DRESS_DRAW[w.dressLevel];
  for (const person of state.people) {
    if (person.trade !== 'mason' || !isAdult(person, state.tick)) continue; // SIM 20: children don't lay
    let quota = person.pace;
    while (quota > 0) {
      const wall = state.walls.find(
        (w) => w.stonesLaid < w.stonesTotal && !awaitsDrawings(w) && supplied(w),
      );
      if (!wall) return;
      // a laid unit spends its supply: a WOOD post draws TIMBER_PER_POST from the
      // global timber stock (SIM 19 — the palisade is no longer free; the generous
      // fell yield rewarded the winning); a STONE spends its dress DRAW from wherever
      // the wall draws — the FACE if hauled, the global pile if local. And it spends
      // the dress level's LAY DEBT of the mason's day (SIM 18): rubble quick (0.5),
      // ashlar slow (2.0), scappled 1.0 — wood is always scappled, so posts lay at
      // the neutral rate. The day's last unit is affordable whenever quota remains
      // (the mason finishes the block begun); quota resets each day, no carry.
      if (wall.material === 'wood') {
        state.timber -= TIMBER_PER_POST;
      } else if (wall.haulRate === null) {
        state.stockpile -= DRESS_DRAW[wall.dressLevel];
      } else {
        wall.faceBuffer -= DRESS_DRAW[wall.dressLevel];
      }
      layOneStone(state, site, rng, wall, person.id);
      quota -= DRESS_SPEC[wall.dressLevel].layDebt;
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
  let course = -1;
  let slot = -1;
  if (wall.infill.length > 0) {
    // walling a removed gate back up: explicit slots, bottom course first
    const job = wall.infill.shift()!;
    course = job.course;
    slot = job.slot;
  } else {
    // the initial build walks the SURVEY's slab grid bottom-up (SIM 13): a
    // course is laid clear across every column deep enough to hold it, so
    // the wall rises in LEVEL layers the way real coursework does. The
    // enumeration is stable for a wall's whole first life (gate ops are
    // legal only on complete, idle walls).
    let i = wall.stonesLaid;
    for (let c = 0; c < wall.courses && slot === -1; c++) {
      let n = 0;
      for (const s of slots) {
        if (wall.slotStarts[s]! <= c && c < wall.slotEnds[s]!) n += 1;
      }
      if (i < n) {
        let k = -1;
        for (const s of slots) {
          if (wall.slotStarts[s]! <= c && c < wall.slotEnds[s]!) {
            k += 1;
            if (k === i) {
              slot = s;
              break;
            }
          }
        }
        course = c;
      } else {
        i -= n;
      }
    }
    if (slot === -1) return; // unreachable: the caller checks laid < total
  }

  const at = pointAt(wall.points, (slot + 0.5) * spacing);

  // LEVEL courses hang from the surveyed datum — never from live ground
  const z = wall.levelTop - (wall.courses - course) * COURSE_HEIGHT + COURSE_HEIGHT / 2;
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
    recognizeEnclosure(state, site, wall);
  }
}

/**
 * What a completed ring's geometry declares — see classifyRing. `reading` is
 * the mason's vernacular opinion of a shell's footprint (advisory since
 * SIM 10; the functional kind is the lord's designation).
 */
export type RingClass =
  | { kind: 'farm'; ring: Vec2[]; area: number; gate: Vec2 | null }
  | { kind: 'building'; area: number; reading: FootprintKind }
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
  return { kind: 'building', area, reading: classifyFootprint(area, long, span) };
}

/**
 * When a wall completes, its GEOMETRY declares what it made (boss canon
 * 2026-07-09/10) — the pencil mode is not sim data. A FIELD ring asks at
 * completion (SIM 10): onto state.pending, awaiting its use. A BUILDING
 * answered its drawings at PLOT time (SIM 12), so completion simply makes it
 * real: the Building record takes the drawn kind and roof, and a BRICK roof
 * mints a real Roof span over the footprint — the deck the laborers build
 * and the next storey stands on. Recognition is ONE-SHOT per wall: a wall
 * that re-completes after gate infill must not ask or claim twice.
 */
export function recognizeEnclosure(state: WorldState, site: SiteData, wall: WallPlan): void {
  if (state.pending.includes(wall.id)) return;
  if (state.farms.some((f) => f.wallId === wall.id)) return;
  if (state.buildings.some((b) => b.wallId === wall.id)) return;
  if (wall.plans !== null) {
    // drawings settled long before the first stone (masons build nothing else)
    const rc = classifyRing(wall.points, wall.height);
    if (rc === null || rc.kind !== 'building') return; // unreachable: plans ⇒ building-class
    const building = {
      id: state.nextId++,
      wallId: wall.id,
      kind: wall.plans.kind!,
      roof: wall.plans.roof!,
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
    if (building.roof === 'brick') {
      // flat brick adds another layer (boss canon 2026-07-10): the chosen
      // roof is a REAL span over the footprint — decked by laborers through
      // the daily loop, and ground for the next storey when complete. It
      // bears on the wall's surveyed level datum (SIM 13), flush by law.
      const reduced = reduceCorners(wall.points);
      const pts = reduced.length >= 3 ? reduced : wall.points.map((p) => ({ x: p.x, y: p.y }));
      const level = wall.levelTop;
      const area = polygonArea(pts);
      const roof = {
        id: state.nextId++,
        points: pts,
        level,
        material: 'brick' as const,
        area,
        workTotal: Math.max(1, area),
        workDone: 0,
      };
      state.roofs.push(roof);
      state.events.push({
        kind: 'roof_planned',
        tick: state.tick,
        roofId: roof.id,
        workTotal: roof.workTotal,
      });
    }
    return;
  }
  const rc = classifyRing(wall.points, wall.height);
  if (rc === null || rc.kind !== 'farm') return; // building-class always has plans
  state.pending.push(wall.id);
  state.events.push({ kind: 'plot_enclosed', tick: state.tick, wallId: wall.id, area: rc.area });
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
