import { classifyFootprint, reduceCorners, type FootprintKind } from './classify';
import { hashSeed, Rng } from './rng';
import type { SiteData } from './site';
import {
  ADULT_AGE,
  AREA_PER_PERSON,
  BASE_HAUL,
  BIRTH_FLOOR_S,
  BIRTH_RATE_FULL,
  BUILDING_KINDS,
  BUILDING_MIN_H,
  BUILDING_ROOFS,
  CART_HAUL,
  CART_UPKEEP,
  COURSE_HEIGHT,
  LIFT_FREE_COURSES,
  LIFT_PER_COURSE,
  WHEEL_RELIEF,
  WHEEL_TIMBER,
  DOOR_GAP_MAX,
  FOUNDING_CAPACITY,
  FOUNDING_SHELTER,
  FOUNDING_STORAGE,
  GRANARY_STORAGE,
  GROWTH_FULL,
  RETENTION_MAX,
  SHELTER_GROWTH_SLACK,
  houseTier,
  tierShelter,
  GROWTH_THRESHOLD,
  HORSE_HAUL,
  HUNGER_LEAVE_RATE,
  MIGRANTS_PER_YEAR_FULL,
  MORTALITY_BANDS,
  ORCHARD_AREA_PER_PERSON,
  SMITH_DRESS_RELIEF,
  SMITH_MIN_POP,
  SMITH_RELIEF_MAX,
  TICKS_PER_YEAR,
  VARIETY_FOR_SMITH,
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
  WEATHER_MIN,
  WEATHER_MAX,
  ROOF_MATERIALS,
  ROOF_SNAP,
  ROOF_DECK,
  STONE_LEN,
  type BuildingKind,
  type BuildingRoof,
  type AditPlan,
  type BellPitPlan,
  type Command,
  type CutPlan,
  type ShaftPlan,
  type FieldUse,
  type FillPlan,
  type PlacedStone,
  type Stand,
  type Vec2,
  type WallPlan,
  type WayPlan,
  type HaulRoute,
  type WorldState,
  type JobSkill,
  type Grave,
  bestSkill,
  GRAVE_STONE,
  GRAVE_WOOD,
  GRIEF_PER_GRAVE,
  GRIEF_FLOOR,
  MASTER_DAYS,
  LINEAGE_INHERIT,
  WAY_MIN_LENGTH,
  WAY_MULT_FIRM,
  WAY_MULT_SOFT,
  CARRIER_THROUGHPUT,
  HORSE_HAUL_MULT,
  HAUL_UPHILL_PER_M,
  LAY_RATE_BASE,
  LAY_RATE_SPREAD,
  FARM_AREA_PER_HAND,
  GREEN_DAYS,
  STONE_VOLUME,
  earthRateOf,
  jobMult,
  layRateOf,
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
    applyCommand(state, site, cmd, rng);
  }

  // fixed daily order: the DAWN PASS assigns every hand its day (SIM 36 — after the
  // commands apply, frozen for the day), then earth moves (winning stone to the pile)
  // before the CARRIERS walk it to the faces, before the layers lay — so stone won this
  // morning can be carried and laid the same day. SIM 17 threaded HAUL between WIN and
  // LAY; SIM 39 made that middle link people (carryStone), and the chain is hands all
  // the way down: WIN → CARRY → LAY.
  const assignments = computeAssignments(state);
  moveEarth(state, assignments);
  carryStone(state, assignments);
  layStones(state, site, rng, assignments);
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
      // THE ROAD (SIM 17; its FACTS rather than its rate since SIM 39): present ⇒ the two
      // ends of the journey plus the terrain against it, all frozen at the boundary. Absent
      // ⇒ a local wall that draws the pile directly. Guard every float that enters hashed
      // state — NaN/Infinity arrive as null from a save (JSON).
      if (cmd.haul !== undefined) {
        const h = cmd.haul;
        if (!h.from || !h.to || badPoints([h.from, h.to])) {
          return 'a haul road needs two ends with finite x and y';
        }
        if (typeof h.climb !== 'number' || !Number.isFinite(h.climb) || h.climb < 0) {
          return 'haul climb must be a finite non-negative number';
        }
        if (typeof h.detour !== 'number' || !Number.isFinite(h.detour) || h.detour < 1) {
          return 'haul detour must be a finite number of at least one';
        }
        if (!HAUL_METHODS.includes(h.method)) return 'unknown haul method';
      }
      // the frozen dress level (SIM 18): a known level if present, else scappled
      if (cmd.dressLevel !== undefined && !DRESS_LEVELS.includes(cmd.dressLevel)) {
        return 'unknown dress level';
      }
      // THE WORD AT THE PLOT (SIM 37): optional answers ride the plan. Each must be
      // a legal value AND match the ring's class — a roof on a field ring (or a use
      // on a shell) is a mis-aimed word, rejected whole with a constant reason
      // rather than silently dropped.
      if (cmd.roof !== undefined || cmd.buildingKind !== undefined || cmd.use !== undefined) {
        if (cmd.roof !== undefined && !(BUILDING_ROOFS as readonly string[]).includes(cmd.roof as string)) {
          return 'a roof is none, wood, straw, or brick';
        }
        if (cmd.buildingKind !== undefined && !isBuildingKind(cmd.buildingKind)) {
          return 'a shell takes house, blacksmith, tower, or tavern';
        }
        if (cmd.use !== undefined && !isFieldUse(cmd.use)) {
          return 'a field plot takes farm, livestock, pasture, orchard, fallow, or churchyard';
        }
        const rc = classifyRing(cmd.points, cmd.height);
        if ((cmd.roof !== undefined || cmd.buildingKind !== undefined) && rc?.kind !== 'building') {
          return 'the roof and trade words want a building ring';
        }
        if (cmd.use !== undefined && rc?.kind !== 'farm') {
          return 'the use word wants a field ring';
        }
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
    case 'plan_bell_pit': {
      if (!cmd.at || badPoints([cmd.at])) return 'bell pit mouth must have finite x and y';
      if (typeof cmd.depth !== 'number' || !Number.isFinite(cmd.depth) || cmd.depth <= 0) {
        return 'a bell pit needs a positive depth';
      }
      // the bed-model + water economics are frozen into the log; guard the floats like the adit's
      if (typeof cmd.workTotal !== 'number' || !Number.isFinite(cmd.workTotal) || cmd.workTotal < 0) {
        return 'bell pit workTotal must be a finite non-negative number';
      }
      if (typeof cmd.stoneTotal !== 'number' || !Number.isFinite(cmd.stoneTotal) || cmd.stoneTotal < 0) {
        return 'bell pit stoneTotal must be a finite non-negative number';
      }
      return null;
    }
    case 'plan_shaft': {
      if (!cmd.at || badPoints([cmd.at])) return 'shaft mouth must have finite x and y';
      if (typeof cmd.depth !== 'number' || !Number.isFinite(cmd.depth) || cmd.depth <= 0) {
        return 'a shaft needs a positive depth';
      }
      if (typeof cmd.workTotal !== 'number' || !Number.isFinite(cmd.workTotal) || cmd.workTotal < 0) {
        return 'shaft workTotal must be a finite non-negative number';
      }
      if (typeof cmd.stoneTotal !== 'number' || !Number.isFinite(cmd.stoneTotal) || cmd.stoneTotal < 0) {
        return 'shaft stoneTotal must be a finite non-negative number';
      }
      return null;
    }
    case 'plan_way': {
      if (!Array.isArray(cmd.points) || cmd.points.length < 2) {
        return 'a way needs at least two points';
      }
      if (badPoints(cmd.points)) return 'way points must have finite x and y';
      // the length is the BOUNDARY's read of the ground (the sim core never walks the
      // terrain); guard it like every float that enters hashed state, and refuse the
      // gesture that is too short to be a road
      if (typeof cmd.length !== 'number' || !Number.isFinite(cmd.length) || cmd.length < WAY_MIN_LENGTH) {
        return 'a way needs a run of some length';
      }
      if (typeof cmd.timberTotal !== 'number' || !Number.isFinite(cmd.timberTotal) || cmd.timberTotal < 0) {
        return 'way timberTotal must be a finite non-negative number';
      }
      if (typeof cmd.workTotal !== 'number' || !Number.isFinite(cmd.workTotal) || cmd.workTotal < 0) {
        return 'way workTotal must be a finite non-negative number';
      }
      // what the ground makes this road worth (SIM 39) — clamped at apply, guarded here
      if (
        cmd.speedMult !== undefined &&
        (typeof cmd.speedMult !== 'number' || !Number.isFinite(cmd.speedMult) || cmd.speedMult < 1)
      ) {
        return 'way speedMult must be a finite number of at least one';
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
      // SIM 37: the at-plot covering, validated like designate_roof's word
      if (cmd.material !== undefined && !ROOF_MATERIALS.includes(cmd.material)) {
        return 'a roof takes wood, straw, or brick';
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
        // a plotted building: the trade may be named at any time while unanswered —
        // the SIM-12 roof-before-trade ordering guard retired with the blocking
        // (SIM 37); an answered trade is one-shot (re-designation stays reserved)
        if (wall.plans.kind !== null) return 'the shell already has its trade';
        if (!isBuildingKind(cmd.use)) return 'a shell takes house, blacksmith, tower, or tavern';
        return null;
      }
      // no drawings ⇒ a field plot pending at completion; the one predicate
      // re-derives its facts (wall geometry is immutable)
      const rc = classifyRing(wall.points, wall.height);
      if (rc === null || rc.kind !== 'farm') return 'no enclosure awaits the word there'; // unreachable
      if (!isFieldUse(cmd.use)) return 'a field plot takes farm, livestock, pasture, orchard, fallow, or churchyard';
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
    case 'cheat_give': {
      const fields = [cmd.stone, cmd.timber, cmd.grain];
      if (fields.every((v) => v === undefined)) return 'a cheat gives stone, timber, or grain';
      for (const v of fields) {
        if (v !== undefined && (typeof v !== 'number' || !Number.isFinite(v) || v < 0)) {
          return 'cheat amounts must be finite and not negative';
        }
      }
      return null;
    }
    case 'cheat_spawn_person': {
      if (
        typeof cmd.at?.x !== 'number' ||
        typeof cmd.at?.y !== 'number' ||
        !Number.isFinite(cmd.at.x) ||
        !Number.isFinite(cmd.at.y)
      ) {
        return 'spawn point must have finite x and y';
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

function applyCommand(state: WorldState, site: SiteData, cmd: Command, rng: Rng): void {
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
      // a building-classifiable ring gets DRAWINGS (SIM 12); since SIM 37 the
      // answers may RIDE THE PLAN (the word at the plot), and a null never
      // blocks — the shell builds bare and takes its words later
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
        wheel: false, // THE LIFT (SIM 26): a great wheel is raised only when the wall climbs high
        plans:
          rc?.kind === 'building'
            ? { roof: cmd.roof ?? null, kind: cmd.buildingKind ?? null }
            : null,
        // THE FIELD'S AT-PLOT WORD (SIM 37): carried to completion, where the land
        // is designated without pending (validated: use ⇒ a farm-class ring)
        fieldUse: rc?.kind === 'farm' ? (cmd.use ?? null) : null,
        levelTop: survey.levelTop,
        courses: survey.courses,
        slotStarts: survey.slotStarts,
        slotEnds: survey.slotEnds,
        stonesTotal: survey.stonesTotal,
        stonesLaid: 0,
        // THE ROAD (SIM 17; its facts since SIM 39): absent ⇒ a 'local' wall that draws
        // the pile directly, the SIM-16 path. Present ⇒ the journey the carriers walk;
        // copied per-field so the log's own objects can never be aliased into state.
        haul: cmd.haul
          ? {
              from: { x: cmd.haul.from.x, y: cmd.haul.from.y },
              to: { x: cmd.haul.to.x, y: cmd.haul.to.y },
              climb: cmd.haul.climb,
              detour: cmd.haul.detour,
              method: cmd.haul.method,
            }
          : null,
        faceBuffer: 0,
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
        // SIM 37: pend only while a word is still unanswered — a fully-worded plan
        // never asks; a bare one pends (non-blockingly) until its words are given
        if (wall.plans.roof === null || wall.plans.kind === null) {
          state.pending.push(wall.id);
        }
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
      const wall = state.walls.find((w) => w.id === cmd.wallId)!; // validated
      wall.plans!.roof = cmd.roof;
      state.events.push({
        kind: 'roof_chosen',
        tick: state.tick,
        wallId: wall.id,
        roof: cmd.roof,
      });
      // SIM 37 — the LATE roof word: if the shell already stands as a minted
      // Building (its trade was answered and it completed roofless), the word
      // lands on the record too — and a late BRICK decks at answer-tick. The
      // houseTier/shelter shift this causes is intended: naming a roof changes
      // what the house is worth to the people in it.
      const std = state.buildings.find((b) => b.wallId === wall.id);
      if (std) {
        std.roof = cmd.roof;
        if (cmd.roof === 'brick') mintBrickDeck(state, wall);
      }
      if (wall.plans!.kind !== null) {
        state.pending = state.pending.filter((id) => id !== wall.id); // both words answered
      }
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
    case 'plan_bell_pit': {
      // A bell pit: a shaft sunk into flat ground for deeper DRY post than an open cut reaches.
      // depth, workTotal and stoneTotal (dry, resink-penalised) were read from the bed model +
      // the water table at the command boundary and are frozen here — the sim core never touches
      // beds, heights or the water table.
      const bellPit: BellPitPlan = {
        id: state.nextId++,
        at: { x: cmd.at.x, y: cmd.at.y },
        depth: cmd.depth,
        workTotal: Math.max(1, cmd.workTotal), // at least a day's work, like cuts and adits
        workDone: 0,
        stoneTotal: cmd.stoneTotal,
        stoneWon: false,
      };
      state.bellPits.push(bellPit);
      state.events.push({
        kind: 'bell_pit_planned',
        tick: state.tick,
        bellPitId: bellPit.id,
        depth: bellPit.depth,
        workTotal: bellPit.workTotal,
      });
      break;
    }
    case 'plan_shaft': {
      // A shaft-and-pump: a deep shaft that beats the water table (the drowned pump tax is baked
      // into workTotal at the command boundary). depth/work/stone were read from the bed model +
      // the water table there and are frozen here — the sim core never touches beds or water.
      const shaft: ShaftPlan = {
        id: state.nextId++,
        at: { x: cmd.at.x, y: cmd.at.y },
        depth: cmd.depth,
        workTotal: Math.max(1, cmd.workTotal),
        workDone: 0,
        stoneTotal: cmd.stoneTotal,
        stoneWon: false,
      };
      state.shafts.push(shaft);
      state.events.push({
        kind: 'shaft_planned',
        tick: state.tick,
        shaftId: shaft.id,
        depth: shaft.depth,
        workTotal: shaft.workTotal,
      });
      break;
    }
    case 'plan_way': {
      // THE TIMBER WAY (SIM 38): the drawn causeway. Its length was walked on the real
      // surface at the command boundary and is frozen here with the timber + person-days
      // it costs — the sim core never touches heights. The road hands begin paving at
      // once (like a quarry begins digging), laying it from the head as the timber allows.
      const way: WayPlan = {
        id: state.nextId++,
        points: cmd.points.map((p) => ({ x: p.x, y: p.y })),
        length: cmd.length,
        timberTotal: cmd.timberTotal,
        timberLaid: 0,
        workTotal: Math.max(1, cmd.workTotal), // at least a day's work, like cuts and adits
        workDone: 0,
        // what the road is WORTH — frozen from the ground it crosses (SIM 39, the research's
        // correction: the multiplier is a property of what the road replaces). Clamped to the
        // evidence's own span so no boundary bug can mint a magic road.
        speedMult: Math.min(WAY_MULT_SOFT, Math.max(WAY_MULT_FIRM, cmd.speedMult ?? WAY_MULT_FIRM)),
      };
      state.ways.push(way);
      state.events.push({
        kind: 'way_planned',
        tick: state.tick,
        wayId: way.id,
        length: way.length,
        workTotal: way.workTotal,
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
        // the default is none (boss canon 2026-07-10): the span is drawn, its
        // covering awaits the word, and no one decks bare air. SIM 37: the
        // covering may ride the plan (the at-plot word) — decked from day one.
        material: cmd.material ?? null,
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
      if (roof.material !== null) {
        state.events.push({
          kind: 'roof_covered',
          tick: state.tick,
          roofId: roof.id,
          material: roof.material,
        });
      }
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
      // no wall idle-check. For a plotted BUILDING this names the trade (any
      // time while unanswered, SIM 37 — the ordering guard retired with the
      // blocking); for a field plot it puts enclosed land to its use.
      const wall = state.walls.find((w) => w.id === cmd.wallId)!; // validated
      if (wall.plans !== null) {
        wall.plans.kind = cmd.use as BuildingKind; // validated against the shell palette
        state.events.push({
          kind: 'building_planned',
          tick: state.tick,
          wallId: wall.id,
          buildingKind: wall.plans.kind,
        });
        // SIM 37: the shell may already STAND (it built bare) — the late trade
        // word makes the building real at answer-tick, roof 'none' until (unless)
        // its own word comes; the ask closes only when both words are answered
        if (wall.stonesLaid >= wall.stonesTotal) {
          mintBuilding(state, wall);
        }
        if (wall.plans.roof !== null) {
          state.pending = state.pending.filter((id) => id !== wall.id);
        }
        break;
      }
      state.pending = state.pending.filter((id) => id !== wall.id);
      const rc = classifyRing(wall.points, wall.height)!; // validated: a farm ring
      if (rc.kind === 'farm') {
        mintFarm(state, wall, cmd.use as FieldUse, rc); // validated against the field palette
      }
      break;
    }
    case 'cheat_give': {
      // THE CHEAT MENU: stocks appear by decree — logged, validated, replay-true.
      // Grain honors the granaries' cap exactly as a harvest would (a cheat tests
      // the game, it does not invent a bigger barn).
      if (cmd.stone !== undefined) state.stockpile += cmd.stone;
      if (cmd.timber !== undefined) state.timber += cmd.timber;
      if (cmd.grain !== undefined) {
        const cap =
          FOUNDING_STORAGE +
          state.buildings.reduce((n, b) => (b.kind === 'granary' ? n + GRANARY_STORAGE : n), 0);
        state.grain = Math.min(cap, state.grain + cmd.grain);
      }
      state.events.push({ kind: 'cheat_given', tick: state.tick });
      break;
    }
    case 'cheat_spawn_person': {
      // a working adult by decree — drawn on the WORLD rng (a cheat is a logged
      // command, so the draw replays identically; the jitter shift it causes is the
      // cheat's own honest cost). The spawn point is advisory (the diorama's).
      const p: Person = {
        id: state.nextId++,
        name: rng.pick(FOLK_NAMES),
        trade: 'villager',
        vigor: rng.float(),
        worked: { mason: 0, digger: 0, woodsman: 0, farmhand: 0, carter: 0 },
        lastJob: null,
        bornTick: state.tick - 25 * TICKS_PER_YEAR,
      };
      state.people.push(p);
      state.events.push({ kind: 'person_arrived', tick: state.tick, personId: p.id, name: p.name });
      break;
    }
  }
}

/**
 * THE VISIBLE FLOW (SIM 35): a working pays its yield AS THE WORK IS DONE, not in one
 * lump at completion. A workday moving workDone from `before` to `after` credits
 * total·min(1, after/W) − total·min(1, before/W) — a stateless checkpoint read off
 * workDone, no accumulator state — so the increments telescope to EXACTLY `total` at
 * completion (the final checkpoint is total·1, and each subtraction is IEEE-exact).
 * A real face yields block by block from the first day: the pile grows daily, and a
 * wall can rise while its pit deepens. (SIM 36 made the step fractional — a green
 * digger's day advances workDone by 9/8 — which the checkpoint form absorbs whole.)
 */
function checkpointCredit(total: number, after: number, before: number, workTotal: number): number {
  return total * Math.min(1, after / workTotal) - total * Math.min(1, before / workTotal);
}

/** THE SKILL SYSTEM's day jobs (SIM 36) and the biography each one writes. */
export type Assignment = 'lay' | 'pave' | 'carry' | 'fill' | 'roof' | 'dig' | 'fell' | 'farm';
// ⚠ PAVE ranks ABOVE CARRY, and a red specimen is why. Drafted the other way round (carry first,
// as the tightest link of WIN → CARRY → LAY), the ladder STARVED THE ROAD OF ITS OWN BUILDERS: a
// long haul wants nearly every hand carrying, so one hand was left to pave and a 2 km way needed
// eighty days instead of seven — the player draws a road and the crew never builds it. A way is
// FINITE, high-leverage work the player explicitly ordered; the crew builds it and then uses it.
// The honest price is legible and is the decision itself: the road costs you days of carrying up
// front and pays them back for the rest of the wall's life.
const ASSIGNMENT_LADDER: readonly Assignment[] = ['lay', 'pave', 'carry', 'fill', 'roof', 'dig', 'fell', 'farm'];
export const JOB_OF: Record<Assignment, JobSkill> = {
  lay: 'mason',
  // THE ROAD's own trade (SIM 38/39): a carter PAVES the way and DRIVES it — one groove, so a
  // year on the road greens both halves. Attested: "v caretis et iiij carectariis", Pipe Roll
  // 17 Henry II; "many carts for hire in King John's time" (DIGEST-2026-07-17 §3).
  carry: 'carter',
  fill: 'digger',
  roof: 'digger',
  pave: 'carter',
  dig: 'digger',
  fell: 'woodsman',
  farm: 'farmhand',
};

/**
 * THE DAWN PASS (SIM 36): one deterministic assignment per adult villager per day,
 * computed after the day's commands apply and before any work runs, frozen for the
 * day (the no-trade-change-within-a-day invariant smithMult leans on). Favor, not
 * puppet: the player never assigns anyone — each hand, in state.people array order,
 * takes (1) their GREENED jobs first, in ladder order (the groove — this supersedes
 * the SIM 4/14 global ordering for skilled hands: farmers farm), then (2) yesterday's
 * job if it still has work (deterministic stickiness, so a hand settles in and
 * actually accrues its year), then (3) the global ladder lay → fill → roof → dig →
 * fell → farm.
 *
 * LAY is supply-governed by a VIRTUAL LEDGER, so the old mason/laborer split becomes
 * emergent: each lay assignment consumes a day's estimated draw from the ledger, each
 * dig assignment ADDS its working's per-day yield (today's trickle is laid today —
 * worldStep wins before it lays), and when the ledger runs dry later hands fall
 * through to digging. All reads are dawn-decidable (stockpile, face buffers + today's
 * cart delivery, the workings' frozen economics) — never supply the same day's later
 * phases produce, which is the duty-cycle oscillation this pass was pinned against.
 * FARM demand is BOUNDED (area/FARM_AREA_PER_HAND hands per farm per day), so tending
 * saturates and can never swallow the crew. Recomputed every tick from state; the
 * map itself is never hashed. Exported so the theater and HUD read the SAME truth.
 */
export function computeAssignments(state: WorldState): Map<number, Assignment> {
  const out = new Map<number, Assignment>();
  // the dawn work census
  const fillWork = state.fills.some((f) => f.volumeMoved < f.volumeTotal);
  const roofWork = state.roofs.some((r) => r.material !== null && r.workDone < r.workTotal);
  const digTarget =
    state.cuts.find((c) => c.workDone < c.workTotal) ??
    state.adits.find((a) => a.workDone < a.workTotal) ??
    state.bellPits.find((b) => b.workDone < b.workTotal) ??
    state.shafts.find((s) => s.workDone < s.workTotal) ??
    null;
  const digYield = digTarget ? digTarget.stoneTotal / digTarget.workTotal : 0;
  const fellWork = state.stands.some((s) => s.felling && s.workDone < s.workTotal);
  // PAVING (SIM 38): a drawn way wants hands only while the woodpile can plank it — a way
  // with no timber to lay is an honest stall, and a hand falls through to other work rather
  // than stand on the road all day. Paving sits with FILL and ROOF in the ladder: finite,
  // player-ordered construction, ranked above the open-ended digging it exists to serve.
  const paveWork = state.timber > 0 && state.ways.some((w) => w.workDone < w.workTotal);
  let farmSlots = 0;
  for (const f of state.farms) {
    if (f.use === 'farm') farmSlots += Math.ceil(f.area / FARM_AREA_PER_HAND);
  }
  // the lay ledgers: STONE a mason could draw today — the pile (which feeds local walls
  // directly) plus stone already standing at the hauled faces. A carrier's RATE is
  // CAPACITY, never supply: counting a delivery as supply assigned the whole crew to lay
  // against a phantom cart while the pit stood undug (the specimen that caught it) — and
  // TIMBER for the palisades.
  const layWalls = state.walls.filter((w) => w.stonesLaid < w.stonesTotal);
  let stoneLedger = 0;
  let localStoneWork = false;
  let hauledStoneWork = false;
  let woodWallWork = false;
  for (const w of layWalls) {
    if (w.material === 'wood') woodWallWork = true;
    else if (w.haul === null) localStoneWork = true; // draws the PILE directly
    else {
      hauledStoneWork = true;
      stoneLedger += w.faceBuffer; // a hauled mason can draw only what stands at HIS face
    }
  }
  // ⚠ FIXED IN SIM 39 (a latent bug the carry EXPOSED): the pile counts toward the lay ledger
  // only when a LOCAL wall is being worked. Since SIM 17 this line read `stoneLedger =
  // state.stockpile` unconditionally — so a world of only HAULED walls with a full pile
  // assigned the whole crew to LAY against stone they could not reach (their faces were dry),
  // and they stalled all day. It was invisible while haul was a frozen rate that needed no
  // hands; now those hands are exactly the ones who should be CARRYING, and the miscount
  // would starve the road of the crew it needs. Same phantom-supply family as the dawn-pass
  // specimen that caught the cart-as-supply read (SIM 36).
  if (localStoneWork) stoneLedger += state.stockpile;
  const stoneWallWork = localStoneWork || hauledStoneWork;
  let timberLedger = state.timber;
  // THE ROAD's demand (SIM 39): how many hands each hauled face wants carrying to it today.
  // A pure ratio of dawn rates (carrierDemand) — the crew splits itself between road and wall.
  const carrySlots = carrierDemand(state);
  let carryWanted = 0;
  for (const n of carrySlots.values()) carryWanted += n;
  // nobody carries from an empty pile: with no won stone the road is not the binding link,
  // and the hands are better in the pit (dawn-decidable — today's dig is not yet in the pile)
  if (state.stockpile <= 0) carryWanted = 0;

  const hasWork = (a: Assignment): boolean => {
    switch (a) {
      case 'lay':
        return (stoneWallWork && stoneLedger > 0) || (woodWallWork && timberLedger > 0);
      case 'carry':
        return carryWanted > 0;
      case 'fill':
        return fillWork;
      case 'roof':
        return roofWork;
      case 'pave':
        return paveWork;
      case 'dig':
        return digTarget !== null;
      case 'fell':
        return fellWork;
      case 'farm':
        return farmSlots > 0;
    }
  };

  // ⚠ RESERVE THE MASON (SIM 39, a live probe caught this). carrierDemand's balance rounds
  // carriers UP on a long road (12.5 → 13 for a 13-hand crew), which claims EVERY available
  // hand — and since they all carried yesterday, the stickiness step keeps them on the road
  // and NOBODY lays. The wall then rose only in a grotesque boom-bust (carry the whole face
  // full, THEN drain it) instead of the steady split the boss's story needs. So when a hauled
  // face has stone to lay, cap carrying to leave at least one hand for the wall. The available
  // pool is the hands NOT already claimed by a green groove elsewhere (a green farmer with a
  // field to tend will never be at the road, so they must not pad the cap). Purely dawn-
  // decidable (green days worked, today's work census) — no buffer feedback, no oscillation.
  if (hauledStoneWork && stoneLedger > 0) {
    let roadPool = 0;
    for (const p of state.people) {
      if (p.trade !== 'villager' || !isAdult(p, state.tick)) continue;
      let elsewhere = false;
      for (const a of ASSIGNMENT_LADDER) {
        if (p.worked[JOB_OF[a]] >= GREEN_DAYS && hasWork(a)) {
          elsewhere = a !== 'lay' && a !== 'carry' && a !== 'pave'; // a road/wall groove keeps them free
          break;
        }
      }
      if (!elsewhere) roadPool++;
    }
    carryWanted = Math.min(carryWanted, Math.max(0, roadPool - 1)); // one hand always reaches the wall
  }

  const take = (p: Person, a: Assignment): void => {
    out.set(p.id, a);
    if (a === 'carry') carryWanted -= 1; // the road's slots are finite — it cannot swallow the crew
    else if (a === 'farm') farmSlots -= 1;
    else if (a === 'dig') {
      // today's trickle is layable today (worldStep wins before it lays) — but ONLY at a
      // LOCAL wall. ⚠ A hauled face gets today's stone no sooner than the carriers walk it
      // there, and crediting the pit to that ledger was the SAME phantom-supply bug in a
      // third disguise: the probe caught the first digger's yield flipping hasWork('lay')
      // true, so twelve hands took LAY and stood at a dry face all day while nobody carried.
      // Cart-as-supply (SIM 36), pile-as-supply (above), now pit-as-supply. One law: only
      // stone a mason can actually REACH today counts as today's supply.
      if (localStoneWork) stoneLedger += digYield * jobMult(p, 'digger');
    }
    else if (a === 'lay') {
      // a day's estimated draw; the scappled STONE_VOLUME is the heuristic unit (dress
      // varies per wall — this governs the ASSIGNMENT count, the lay loop spends the truth)
      if (stoneWallWork && stoneLedger > 0) stoneLedger -= layRateOf(p) * STONE_VOLUME;
      else timberLedger -= layRateOf(p) * TIMBER_PER_POST;
    }
  };

  for (const p of state.people) {
    if (p.trade !== 'villager' || !isAdult(p, state.tick)) continue; // smiths keep their forge; children play
    let picked: Assignment | null = null;
    // 1. the groove of the skilled hand: greened jobs, in ladder order
    for (const a of ASSIGNMENT_LADDER) {
      if (p.worked[JOB_OF[a]] >= GREEN_DAYS && hasWork(a)) {
        picked = a;
        break;
      }
    }
    // 2. yesterday's work, if it still wants hands (ties settle into grooves)
    if (picked === null && p.lastJob !== null) {
      for (const a of ASSIGNMENT_LADDER) {
        if (JOB_OF[a] === p.lastJob && hasWork(a)) {
          picked = a;
          break;
        }
      }
    }
    // 3. the global ladder
    if (picked === null) {
      for (const a of ASSIGNMENT_LADDER) {
        if (hasWork(a)) {
          picked = a;
          break;
        }
      }
    }
    if (picked !== null) take(p, picked);
  }
  return out;
}

/**
 * The day's earth-and-field work (SIM 36: by ASSIGNMENT — one job per hand per day;
 * the old within-day fallthrough retired with the trades). A hand assigned FILL or
 * ROOF spends an earth-rate quota across that job's targets oldest-first; DIG and
 * FELL advance their working one skill-weighted person-day (the ILO pace is baked in
 * workTotal); FARM tends the fewest-workdays arable field. A day that produced real
 * work writes the person's biography: worked[job] += 1, lastJob = job.
 */
function moveEarth(state: WorldState, assignments: Map<number, Assignment>): void {
  for (const person of state.people) {
    if (person.trade !== 'villager' || !isAdult(person, state.tick)) continue; // SIM 20: children don't dig
    const assigned = assignments.get(person.id);
    // lay runs in layStones, CARRY in carryStone (SIM 39), farm below
    if (assigned === undefined || assigned === 'lay' || assigned === 'carry' || assigned === 'farm') continue;
    let quota = earthRateOf(person, JOB_OF[assigned]);
    let moved = 0;
    if (assigned === 'fill') {
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
    }
    if (assigned === 'roof') {
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
    }
    if (assigned === 'pave') {
      // THE PAVING (SIM 38): a road hand advances the oldest unfinished way one
      // skill-weighted person-day, and the way DRAWS its timber as it lays — the same
      // stateless checkpoint credit the workings pay their stone by (SIM 35), so the
      // road's cost flows with the road instead of landing in a lump. The way is laid
      // from its HEAD: workDone/workTotal IS the built fraction, and only that prefix
      // is road (SIM 39 reads it). A short woodpile does not stop the paving, it
      // SHORTENS the day: the hand planks as far as the timber reaches and no further.
      const way = state.ways.find((w) => w.workDone < w.workTotal);
      if (way) {
        const before = way.workDone;
        let step = jobMult(person, 'carter');
        // as far as the woodpile reaches: the draw is linear in the step, so invert it
        if (way.timberTotal > 0) {
          const maxStep = (state.timber * way.workTotal) / way.timberTotal;
          if (maxStep < step) step = maxStep;
        }
        const after = Math.min(way.workTotal, before + step);
        if (after > before) {
          way.workDone = after;
          const draw = checkpointCredit(way.timberTotal, after, before, way.workTotal);
          // spend only what is there: the ulp between the linear bound and the
          // checkpoint form must never mint or lose timber (conservation is exact)
          const spend = Math.min(draw, state.timber);
          state.timber -= spend;
          way.timberLaid += spend;
          moved = 1;
          if (way.workDone >= way.workTotal) {
            state.events.push({ kind: 'way_complete', tick: state.tick, wayId: way.id });
          }
        }
      }
    }
    if (assigned === 'dig') {
      // THE DIGGING (SIM 14/15, assignment-driven since SIM 36): the hand works the
      // oldest unfinished working in the method ladder's order — cut, adit, bell pit,
      // shaft — one skill-weighted person-day (a green digger's day counts 9/8; the
      // strata's pace is already baked into workTotal). The stone flows AS IT IS DUG
      // (SIM 35, checkpoint credit, exact-total); completion events still fire once.
      const dig = (working: {
        id: number;
        workDone: number;
        workTotal: number;
        stoneTotal: number;
        stoneWon: boolean;
      }): boolean => {
        const before = working.workDone;
        working.workDone += jobMult(person, 'digger');
        state.stockpile += checkpointCredit(working.stoneTotal, working.workDone, before, working.workTotal);
        return working.workDone >= working.workTotal && !working.stoneWon;
      };
      const cut = state.cuts.find((c) => c.workDone < c.workTotal);
      const adit = cut ? undefined : state.adits.find((a) => a.workDone < a.workTotal);
      const bellPit = cut || adit ? undefined : state.bellPits.find((b) => b.workDone < b.workTotal);
      const shaft = cut || adit || bellPit ? undefined : state.shafts.find((s) => s.workDone < s.workTotal);
      if (cut) {
        moved = 1;
        if (dig(cut)) {
          cut.stoneWon = true;
          state.events.push({ kind: 'cut_complete', tick: state.tick, cutId: cut.id });
          state.events.push({ kind: 'stone_won', tick: state.tick, cutId: cut.id, stone: cut.stoneTotal });
        }
      } else if (adit) {
        moved = 1;
        if (dig(adit)) {
          adit.stoneWon = true;
          state.events.push({ kind: 'adit_complete', tick: state.tick, aditId: adit.id });
          state.events.push({ kind: 'adit_stone_won', tick: state.tick, aditId: adit.id, stone: adit.stoneTotal });
        }
      } else if (bellPit) {
        moved = 1;
        if (dig(bellPit)) {
          bellPit.stoneWon = true;
          state.events.push({ kind: 'bell_pit_complete', tick: state.tick, bellPitId: bellPit.id });
          state.events.push({ kind: 'bell_pit_stone_won', tick: state.tick, bellPitId: bellPit.id, stone: bellPit.stoneTotal });
        }
      } else if (shaft) {
        moved = 1;
        if (dig(shaft)) {
          shaft.stoneWon = true;
          state.events.push({ kind: 'shaft_complete', tick: state.tick, shaftId: shaft.id });
          state.events.push({ kind: 'shaft_stone_won', tick: state.tick, shaftId: shaft.id, stone: shaft.stoneTotal });
        }
      }
    }
    if (assigned === 'fell') {
      // THE FELLING (SIM 19, assignment-driven since SIM 36): one skill-weighted
      // person-day on the oldest stand under the axe; the wood drops AS it's felled
      // (SIM 35); the stool's regrowth clock still starts at completion.
      const stand = state.stands.find((s) => s.felling && s.workDone < s.workTotal);
      if (stand) {
        const before = stand.workDone;
        stand.workDone += jobMult(person, 'woodsman');
        moved = 1;
        state.timber += checkpointCredit(stand.timberTotal, stand.workDone, before, stand.workTotal);
        if (stand.workDone >= stand.workTotal) {
          stand.felling = false;
          stand.feltTick = state.tick;
          state.events.push({
            kind: 'timber_won',
            tick: state.tick,
            standId: stand.id,
            timber: stand.timberTotal,
          });
        }
      }
    }
    if (moved > 0) {
      // the biography (SIM 36): a day of real work at a job is a day toward its band
      person.worked[JOB_OF[assigned]] += 1;
      person.lastJob = JOB_OF[assigned];
    }
  }
  // THE TENDING (assignment-driven since SIM 36; ARABLE only — pasture is grazed by
  // its herd (later), fallow rests): each hand assigned to the fields tends the farm
  // with the fewest workdays, a skill-weighted person-day (a green farmhand's day
  // counts 9/8 — worked in exact eighths).
  for (const person of state.people) {
    if (person.trade !== 'villager' || !isAdult(person, state.tick)) continue;
    if (assignments.get(person.id) !== 'farm') continue;
    let target: { workdays: number } | null = null;
    for (const f of state.farms) {
      if (f.use !== 'farm') continue;
      if (target === null || f.workdays < target.workdays) target = f;
    }
    if (target !== null) {
      target.workdays += jobMult(person, 'farmhand');
      person.worked.farmhand += 1;
      person.lastJob = 'farmhand';
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
    trade: 'villager', // migrants arrive untrained hands (SIM 36) — skill is earned by doing
    vigor: rng.float(),
    worked: { mason: 0, digger: 0, woodsman: 0, farmhand: 0, carter: 0 },
    lastJob: null,
    bornTick: tick - Math.round((ADULT_AGE + rng.int(15)) * TICKS_PER_YEAR),
  };
}

/** a child born to the settlement — lifts no stone until it comes of age */
function newChild(state: WorldState, rng: Rng, tick: number): Person {
  const child: Person = {
    id: state.nextId++,
    name: rng.pick(FOLK_NAMES),
    trade: 'villager',
    vigor: rng.float(),
    worked: { mason: 0, digger: 0, woodsman: 0, farmhand: 0, carter: 0 },
    lastJob: null,
    bornTick: tick,
  };
  // LINEAGE (SIM 45, Beat 4): the child inherits a HEAD-START in a parent's finest trade — a
  // master's children begin closer to mastery, so skilled bloodlines form across the generations
  // (the boss's dynasties: the Delvers dig, a mason's line lays). A parent is drawn among the
  // adults on the demo rng (isolated, never the masonry cursor); the head-start is capped below
  // the master threshold, so a child is born a prodigy at most, never a master — mastery is earned.
  const adults = state.people.filter((p) => p.trade === 'villager' && isAdult(p, tick));
  if (adults.length > 0) {
    const parent = adults[rng.int(adults.length)]!;
    const skill = bestSkill(parent);
    if (skill.job) {
      child.worked[skill.job] = Math.min(
        MASTER_DAYS - 1,
        Math.floor(parent.worked[skill.job] * LINEAGE_INHERIT),
      );
    }
  }
  return child;
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

  // 1. MORTALITY — each soul rolls survival on the age curve; deaths leave the record AND a GRAVE
  // (SIM 44, Beat 4): a named soul is never a bare subtraction — the settlement raises a mound,
  // unmarked until stone or wood is spared, carrying the dead's finest craft for the headstone.
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
      const skill = bestSkill(p);
      const grave: Grave = {
        id: state.nextId++,
        personId: p.id,
        name: p.name,
        bornTick: p.bornTick,
        diedTick: state.tick,
        job: skill.job,
        band: skill.band,
        marker: 'none',
      };
      state.graves.push(grave);
      state.events.push({ kind: 'grave_dug', tick: state.tick, graveId: grave.id, personId: p.id, name: p.name });
    } else {
      survivors.push(p);
    }
  }
  state.people = survivors;

  // MARKING (SIM 44): honour the unmarked dead — a STONE slab first (the fine, lasting memorial),
  // else WOOD (the affordable marker); oldest mound first (grave id order), as material allows. What
  // can't be spared this year waits as a mound, and grieves. So mortality gently draws the stone and
  // timber the living would spend on walls — the dead compete for the same hands' harvest.
  for (const g of state.graves) {
    if (g.marker !== 'none') continue;
    if (state.stockpile >= GRAVE_STONE) {
      state.stockpile -= GRAVE_STONE;
      g.marker = 'stone';
      state.events.push({ kind: 'grave_marked', tick: state.tick, graveId: g.id, marker: 'stone' });
    } else if (state.timber >= GRAVE_WOOD) {
      state.timber -= GRAVE_WOOD;
      g.marker = 'wood';
      state.events.push({ kind: 'grave_marked', tick: state.tick, graveId: g.id, marker: 'wood' });
    }
  }
  // GRIEF (SIM 44): every unmarked mound weighs on the living — a gentle, cumulative drag on the
  // year's GROWTH (births + migrants below), lifting the moment a grave is honoured. Floored so a
  // neglected churchyard slows the settlement without ever halting it (no death-spiral). "Unmarked
  // people make others sad."
  const unmarkedGraves = state.graves.reduce((n, g) => n + (g.marker === 'none' ? 1 : 0), 0);
  const griefFactor = Math.max(GRIEF_FLOOR, 1 - unmarkedGraves * GRIEF_PER_GRAVE);

  // 2. THE HARVEST + THE GRAIN STOCK (SIM 22) — grain is PRODUCED (the founding floor +
  // the enclosed arable §4, times this year's WEATHER), EATEN by the mouths, and the
  // surplus STORED up to the granaries' cap. A lean year DRAWS the store down to hold off
  // hunger — the granary's one true job (mutual aid = a buffer, not a bigger field).
  const arable = state.farms.reduce((a, f) => (f.use === 'farm' ? a + f.area : a), 0);
  // SIM 29: the variety tenants pay now — an ORCHARD bears food (a supplement to the grain staple, at a
  // gentler yield per m²), and each PASTURE keeps a draft horse that hauls more surplus to the store
  // (below, in the haul cap). Fallow still rests, livestock still only feeds its own herd (later).
  const orchard = state.farms.reduce((a, f) => (f.use === 'orchard' ? a + f.area : a), 0);
  const pastures = state.farms.reduce((n, f) => (f.use === 'pasture' ? n + 1 : n), 0);
  const granaries = state.buildings.reduce((n, b) => (b.kind === 'granary' ? n + 1 : n), 0);
  const carts = state.buildings.reduce((n, b) => (b.kind === 'carpentry' ? n + 1 : n), 0);
  // THE WEATHER (SIM 22, shaped SIM 31): a multiplier on the harvest, drawn on the demographic rng
  // stream (never state.rng). The MEAN of two uniform rolls — a TRIANGULAR distribution peaked at the
  // centre — so ordinary years cluster near 1.0 and the extreme famine/glut years (which drive the
  // hunger churn) grow rarer, WITHOUT shifting the average. Two draws on the isolated stream.
  const weather = WEATHER_MIN + ((rng.float() + rng.float()) / 2) * (WEATHER_MAX - WEATHER_MIN);
  const produced =
    (FOUNDING_CAPACITY + arable / AREA_PER_PERSON + orchard / ORCHARD_AREA_PER_PERSON) * weather;
  const mouths = Math.max(1, state.people.length);
  // S = the FIELDS' abundance (harvest per mouth): drives GROWTH, never touched by the
  // store, so a settlement never breeds off its hoard.
  const S = produced / mouths;
  let eaten: number;
  if (produced >= mouths) {
    eaten = mouths;
    // THE CART (SIM 23): only so much surplus reaches the store each year — hand-carry
    // (BASE_HAUL) plus the maintained carts. A cart rolls only if the woodpile can keep it
    // in repair (CART_UPKEEP a year); run the wood dry and the carts sit idle. The rest of
    // the surplus spoils in the field — carts are what actually FILL a granary.
    const maintained = Math.min(carts, Math.floor(state.timber / CART_UPKEEP));
    state.timber -= maintained * CART_UPKEEP;
    const haulCap = BASE_HAUL + maintained * CART_HAUL + pastures * HORSE_HAUL; // SIM 29: pasture horses haul too
    const carried = Math.min(produced - mouths, haulCap);
    const cap = FOUNDING_STORAGE + granaries * GRANARY_STORAGE;
    state.grain = Math.min(cap, state.grain + carried); // the surplus that reaches the store
  } else {
    // a lean year: the store covers what shortfall it can before anyone goes hungry
    const drawn = Math.min(state.grain, mouths - produced);
    state.grain -= drawn;
    eaten = produced + drawn;
  }
  // effectiveS = the POST-BUFFER ratio: 1.0 if the store fed everyone, < 1.0 only when the
  // grain ran out too. HUNGER gates on this — a granary with grain holds the village together.
  const effectiveS = eaten / mouths;
  state.events.push({
    kind: 'harvest',
    tick: state.tick,
    year: yearOf(state.tick),
    weather,
    produced,
    eaten,
    stored: state.grain,
  });

  // 3. BIRTHS (continuous), MIGRANTS (surplus only) off S; HUNGER off effectiveS.
  // SHELTER (SIM 25/30): the souls the founders' roofs + the houses (by tier) can hold, reckoned ONCE here —
  // it GATES growth (SIM 30) and softens hunger (SIM 25). growthRoom is full while the shelter comfortably
  // exceeds the mouths and tapers to zero as they meet it, with SHELTER_GROWTH_SLACK of headroom so a founding
  // hamlet still grows on its first roofs before it must BUILD HOUSES to grow past ~FOUNDING_SHELTER + SLACK.
  const shelter =
    FOUNDING_SHELTER +
    state.buildings.reduce(
      (n, b) => (b.kind === 'house' ? n + tierShelter(houseTier(b.area, b.roof)) : n),
      0,
    );
  const growthRoom = Math.min(1, Math.max(0, (shelter - mouths + SHELTER_GROWTH_SLACK) / SHELTER_GROWTH_SLACK));
  // BIRTHS — the SLOW valve, always on above the fertility floor: at HOLD they
  // roughly replace the dead (no death-spiral), at surplus they grow the line, in
  // hunger they collapse. A child lifts no stone for ~ADULT_AGE years — a lineage.
  const birthFactor = Math.min(1, Math.max(0, (S - BIRTH_FLOOR_S) / (GROWTH_FULL - BIRTH_FLOOR_S)));
  if (birthFactor > 0) {
    const adults = state.people.filter((p) => isAdult(p, state.tick)).length;
    for (let i = 0; i < adults; i++) {
      if (rng.float() < BIRTH_RATE_FULL * birthFactor * growthRoom * griefFactor) { // SIM 30 housing · SIM 44 grief
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
    const want = MIGRANTS_PER_YEAR_FULL * g * growthRoom * griefFactor; // SIM 30 housing · SIM 44 grief
    let migrants = Math.floor(want);
    if (rng.float() < want - migrants) migrants += 1;
    for (let i = 0; i < migrants; i++) {
      const p = newAdult(state, rng, state.tick);
      state.people.push(p);
      state.events.push({ kind: 'person_arrived', tick: state.tick, personId: p.id, name: p.name });
    }
  }
  // HUNGER — souls leave for another manor (the boss: "really bad, like starvation,
  // and they leave"), but ONLY when the store couldn't cover the shortfall either
  // (effectiveS < 1). One soul always holds on — the settlement never empties here.
  // SPECIALISTS never leave: their trade is rooted to the base (SIM 24). And HOUSING HOLDS
  // people (SIM 25): a well-sheltered settlement loses far fewer to a hard year — the shelter
  // its houses give (by tier), over the mouths, softens the leave rate up to RETENTION_MAX.
  if (effectiveS < 1.0) {
    const housed = Math.min(1, shelter / mouths); // the shelter reckoned once at §3 top (SIM 30)
    const leaveRate = HUNGER_LEAVE_RATE * (1 - RETENTION_MAX * housed);
    let leaving = state.people.filter((p) => p.trade !== 'smith' && rng.float() < leaveRate);
    if (leaving.length >= state.people.length) leaving = leaving.slice(0, state.people.length - 1);
    const gone = new Set(leaving.map((p) => p.id));
    for (const p of leaving) {
      state.events.push({ kind: 'person_left', tick: state.tick, personId: p.id, name: p.name });
    }
    state.people = state.people.filter((p) => !gone.has(p.id));
  }

  // 4. SPECIALIZATION (SIM 24) — a settlement varied + populous enough draws a SMITH
  // to a blacksmith it holds. The trade is as permanent as the base: a smith is only
  // ever drawn while the base holds (variety + a smithy + the people to spare one), so
  // if a smith dies and the base still stands, another comes; if the base has failed,
  // the trade dies out with the last master. One smith per smithy.
  const smithies = state.buildings.reduce((n, b) => (b.kind === 'blacksmith' ? n + 1 : n), 0);
  const baseHolds =
    smithies >= 1 && countVariety(state) >= VARIETY_FOR_SMITH && state.people.length >= SMITH_MIN_POP;
  const smiths = state.people.reduce((n, p) => (p.trade === 'smith' ? n + 1 : n), 0);
  if (baseHolds && smiths < smithies) {
    // THE APPRENTICE BOND (SIM 28): the trade passes DOWN when there is a master to teach it.
    // If a smith already lives, the settlement's YOUNGEST hand is raised to the forge under the
    // master — a local lineage, no new body, one of your own reassigned. Only with NO master to
    // learn from (the FIRST smith, or after the last master has died) does a journeyman MIGRATE
    // in. The path taken rides on the event's `origin` so the chronicle can tell one from the other.
    let apprentice: Person | null = null;
    if (smiths >= 1) {
      for (const p of state.people) {
        // the youngest adult villager — a child of the settlement newly come of age is the
        // apprentice (largest bornTick = youngest); specialists and children are never drawn.
        if (p.trade !== 'villager' || !isAdult(p, state.tick)) continue;
        if (apprentice === null || p.bornTick > apprentice.bornTick) apprentice = p;
      }
    }
    if (apprentice) {
      apprentice.trade = 'smith'; // raised from within, the master's hand on the youngster's
      state.events.push({
        kind: 'specialist_arrived',
        tick: state.tick,
        personId: apprentice.id,
        name: apprentice.name,
        trade: 'smith',
        origin: 'apprentice',
      });
    } else {
      const p = newAdult(state, rng, state.tick); // a journeyman on the migration wind
      p.trade = 'smith';
      state.people.push(p);
      state.events.push({
        kind: 'specialist_arrived',
        tick: state.tick,
        personId: p.id,
        name: p.name,
        trade: 'smith',
        origin: 'migrant',
      });
    }
  }
}

/**
 * The settlement's VARIETY (SIM 24): distinct productive tenants + workshops. Fallow
 * doesn't count (it produces nothing); the more kinds of work a place holds, the more
 * it can keep a specialist.
 */
function countVariety(state: WorldState): number {
  const kinds = new Set<string>();
  for (const f of state.farms) if (f.use !== 'fallow') kinds.add(`field:${f.use}`);
  for (const b of state.buildings) {
    if (b.kind === 'blacksmith' || b.kind === 'carpentry') kinds.add(`shop:${b.kind}`);
  }
  return kinds.size;
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

// (SIM 12's awaitsDrawings — "drawings with a null answer keep the crew off the
// wall" — RETIRED by SIM 37: an unanswered word never blocks; the shell builds
// bare and takes its words later. The boss's 2026-07-16 decree supersedes the
// 2026-07-10 canon; recorded in the charter and BACKLOG.)

/** plain 2-D distance. Math.sqrt is IEEE-exact (correctly rounded); Math.hypot is NOT specified
 *  to be, so it must never touch hashed state — the house law, paid here. */
function dist2(ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax;
  const dy = by - ay;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * The closest point to (px,py) on a segment, and how far along the segment it lies.
 * Pure geometry — no terrain, no rng, exact-rounded arithmetic only.
 */
function closestOnSeg(px: number, py: number, ax: number, ay: number, bx: number, by: number) {
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  const t = len2 > 0 ? Math.min(1, Math.max(0, ((px - ax) * dx + (py - ay) * dy) / len2)) : 0;
  return { x: ax + dx * t, y: ay + dy * t, t };
}

/**
 * THE DOGLEG (SIM 39) — the effective metres a carrier spends walking `route`, given every
 * BUILT way on the ground. NOT A* (§3H's own note: "polyline-with-way-segments cost fields,
 * not full A*"): for each way we ask the only question that matters — could this carrier get
 * on the road, ride it, and get off nearer the face than walking straight?
 *
 *     direct = |from → to|
 *     viaWay = |from → entry| + (entry → exit along the built prefix)/speedMult + |exit → to|
 *     cost   = min(direct, viaWay, …) × detour + HAUL_UPHILL_PER_M × climb
 *
 * `min` is load-bearing: a carrier is NEVER made worse off by a road existing, because nobody
 * detours onto a road that costs them. So a way drawn across an irrelevant meadow changes
 * nothing at all — which is a specimen, not an accident.
 *
 * A way is road only as far as it is PAVED (built from its head), so a half-built way discounts
 * only its built prefix — you watch the haul quicken as the road creeps toward the quarry.
 */
export function routeCost(state: WorldState, haul: HaulRoute): number {
  let best = dist2(haul.from.x, haul.from.y, haul.to.x, haul.to.y);
  for (const way of state.ways) {
    const built = way.length * Math.min(1, way.workDone / way.workTotal);
    if (built <= 0) continue;
    // walk the run, finding where the carrier would join and leave the BUILT prefix
    let along = 0; // metres of built road walked so far
    let entry: { at: number; d: number } | null = null;
    let exit: { at: number; d: number } | null = null;
    for (let i = 1; i < way.points.length && along < built; i++) {
      const a = way.points[i - 1]!;
      const b = way.points[i]!;
      const segLen = dist2(a.x, a.y, b.x, b.y);
      if (segLen <= 0) continue;
      const usable = Math.min(segLen, built - along); // the paved part of this leg
      const clampT = usable / segLen;
      const e = closestOnSeg(haul.from.x, haul.from.y, a.x, a.y, b.x, b.y);
      const x = closestOnSeg(haul.to.x, haul.to.y, a.x, a.y, b.x, b.y);
      const eT = Math.min(e.t, clampT); // never join past the end of the pavement
      const xT = Math.min(x.t, clampT);
      const ePt = { x: a.x + (b.x - a.x) * eT, y: a.y + (b.y - a.y) * eT };
      const xPt = { x: a.x + (b.x - a.x) * xT, y: a.y + (b.y - a.y) * xT };
      const eD = dist2(haul.from.x, haul.from.y, ePt.x, ePt.y);
      const xD = dist2(haul.to.x, haul.to.y, xPt.x, xPt.y);
      if (entry === null || eD < entry.d) entry = { at: along + segLen * eT, d: eD };
      if (exit === null || xD < exit.d) exit = { at: along + segLen * xT, d: xD };
      along += usable;
    }
    if (entry === null || exit === null) continue;
    const ride = Math.abs(exit.at - entry.at);
    const viaWay = entry.d + ride / way.speedMult + exit.d;
    if (viaWay < best) best = viaWay;
  }
  // the terrain the boundary froze: the gorge sends the road round by a bridge, and every
  // metre of climb costs the hands dear
  return best * haul.detour + HAUL_UPHILL_PER_M * haul.climb;
}

/**
 * m³ of stone one hand delivers to this face in a day (SIM 39). A day is a budget of
 * THROUGHPUT — m³·m — not of pace: loaded and unloaded people walk at the same speed, so a
 * road cannot make a hand walk faster; it makes the hand's day MOVE MORE STONE (the research's
 * own correction — see CARRIER_THROUGHPUT). The ×2 is the empty walk back, half of portering
 * and the reason a SHORT haul beats a fast one.
 */
export function carryRate(state: WorldState, haul: HaulRoute, p: Person): number {
  const cost = routeCost(state, haul);
  if (!(cost > 0)) return CARRIER_THROUGHPUT; // the pile is underfoot — a degenerate road
  return (CARRIER_THROUGHPUT / (2 * cost)) * jobMult(p, 'carter');
}

/**
 * ★ THE CREW SPLITS ITSELF (SIM 39) — how many hands this wall wants on the ROAD.
 *
 * This is the boss's sentence turned into arithmetic. Balance the chain: hands divide so that
 * what the road DELIVERS matches what the wall EATS.
 *
 *     carriers / crew = appetite / (appetite + deliverPerCarter)
 *
 * Lay a way → the route's effective metres fall → deliverPerCarter RISES → the fraction FALLS →
 * fewer hands on the road and MORE at the wall → the wall goes up faster. "If the workers are
 * moving faster the bricks reach their destination quicker" — arrived at by mechanism, and
 * VISIBLE: you watch the crowd on the road thin and the crowd on the wall thicken. The road pays
 * for itself in front of you.
 *
 * DAWN-DECIDABLE BY CONSTRUCTION (the charter's determinism critique, honoured): the split is a
 * ratio of RATES — the frozen route, the way's built prefix, the crew's size — never a reaction
 * to yesterday's buffer. No feedback, so no duty cycle. The only faceBuffer read is the boolean
 * "is this face already stocked for the whole remaining wall", which can only be true at the very
 * end of a wall's life and so cannot oscillate in steady state.
 */
/** draft horses available to the haul (SIM 41): one per PASTURE — the same asset that hauls
 *  grain to the granary (HORSE_HAUL, SIM 29). A settlement asset, not a person: no assignment,
 *  no biography, like the grain horse. */
function draftHorses(state: WorldState): number {
  return state.farms.reduce((n, f) => (f.use === 'pasture' ? n + 1 : n), 0);
}

export function carrierDemand(state: WorldState): Map<number, number> {
  const out = new Map<number, number>();
  let pool = 0;
  for (const p of state.people) {
    if (p.trade === 'villager' && isAdult(p, state.tick)) pool++;
  }
  if (pool === 0) return out;
  // THE OX→HORSE STEP (SIM 41): the pasture's draft horses each haul like HORSE_HAUL_MULT
  // carriers, so they cover part of the appetite and FEWER hands are needed on the road. Spent
  // oldest-wall-first (like carriers and horses in carryStone), as horse-equivalent carriers.
  let horseEquiv = draftHorses(state) * HORSE_HAUL_MULT;
  for (const wall of state.walls) {
    if (wall.haul === null || wall.material === 'wood') continue; // won underfoot — no road
    if (wall.stonesLaid >= wall.stonesTotal) continue; // not being worked
    const draw = DRESS_DRAW[wall.dressLevel];
    if ((wall.stonesTotal - wall.stonesLaid) * draw - wall.faceBuffer <= 0) continue; // face fully stocked
    // a representative mason's appetite at THIS wall's dress: an ashlar wall lays half as fast
    // but carts half again as much per block, so its road needs are its own (SIM 18)
    const appetite = ((LAY_RATE_BASE + LAY_RATE_SPREAD / 2) / DRESS_SPEC[wall.dressLevel].layDebt) * draw;
    const cost = routeCost(state, wall.haul);
    const deliver = cost > 0 ? CARRIER_THROUGHPUT / (2 * cost) : CARRIER_THROUGHPUT;
    // balance C human carriers + H horse-equivalents against M masons (C + M = pool):
    //   C·deliver + H·deliver = M·appetite  ⇒  C = (pool·appetite − H·deliver)/(appetite + deliver)
    // With no horses this is the SIM-39 ratio pool·appetite/(appetite+deliver), unchanged.
    // a wall can't use more horse than its whole crew would eat (pool·appetite of delivery),
    // so surplus horses flow to the next hauled wall (oldest-first, like carriers)
    const usedHorse = Math.min(horseEquiv, (pool * appetite) / deliver);
    horseEquiv -= usedHorse;
    const want = Math.round((pool * appetite - usedHorse * deliver) / (appetite + deliver));
    // between one hand (or a wall far from stone gets not a single block) and pool−1 (or a
    // long road claims the WHOLE crew and no one is left to lay — a live probe's lesson;
    // computeAssignments enforces the same reserve across all walls together).
    out.set(wall.id, Math.min(pool - 1, Math.max(1, want)));
  }
  return out;
}

/**
 * WHICH FACE each carrier serves (SIM 39) — a pure derivation from state + the day's
 * assignments, so the sim's carry, the dawn pass and the THEATER all read one truth (the
 * parity law: people.ts imports this, and the sprites walk the errand the sim believes).
 * Carriers fill the walls' demand in id order — oldest work first, like diggers and masons.
 */
export function computeCarryTargets(state: WorldState, assignments: Map<number, Assignment>): Map<number, number> {
  const demand = carrierDemand(state);
  const carriers = state.people.filter((p) => assignments.get(p.id) === 'carry');
  const out = new Map<number, number>();
  let i = 0;
  for (const wall of state.walls) {
    const want = demand.get(wall.id) ?? 0;
    for (let k = 0; k < want && i < carriers.length; k++, i++) out.set(carriers[i]!.id, wall.id);
  }
  return out;
}

/**
 * THE CARRY (SIM 17's haul, made LABOR in SIM 39): hands move won stone from the global pile
 * to each stone wall's FACE — the middle of WIN → HAUL → LAY, and the last link to become
 * people. Each carrier assigned to a wall delivers its own carryRate; the pile is drawn in
 * id order (oldest wall first, like diggers and masons); when the pile runs dry the day's
 * carrying stops. Never deliver past what the wall can still lay — stone at a finished face
 * is stranded — and the demand is per-stone DRAW × remaining, so an ashlar wall's face wants
 * half again more rough stone per block (SIM 18) and its road falls behind sooner.
 *
 * 'local' walls (haul null) and timber take no carrier: they draw the pile directly in
 * layStones, exactly as in SIM 16.
 */
function carryStone(state: WorldState, assignments: Map<number, Assignment>): void {
  // who serves which face — ONE derivation, shared with the dawn pass and the theater
  const targets = computeCarryTargets(state, assignments);
  const crew = new Map<number, Person[]>();
  for (const person of state.people) {
    const wallId = targets.get(person.id);
    if (wallId === undefined) continue;
    (crew.get(wallId) ?? crew.set(wallId, []).get(wallId)!).push(person);
  }
  // THE OX→HORSE STEP (SIM 41): the pasture's draft horses haul stone too, oldest-wall-first
  // like the carriers, each a team worth HORSE_HAUL_MULT hands. A settlement asset, spent as a
  // budget of horse-days — a horse fully used on one wall isn't free for the next.
  let horseDays = draftHorses(state);
  for (const wall of state.walls) {
    if (state.stockpile <= 0) break; // the pile is dry — nobody loads today
    if (wall.haul === null || wall.material === 'wood') continue; // no road
    if (wall.stonesLaid >= wall.stonesTotal) continue; // not being worked
    const draw = DRESS_DRAW[wall.dressLevel];
    let need = (wall.stonesTotal - wall.stonesLaid) * draw - wall.faceBuffer;
    if (need <= 0) continue;
    const hands = crew.get(wall.id);
    for (const person of hands ?? []) {
      if (state.stockpile <= 0 || need <= 0) break;
      const move = Math.min(carryRate(state, wall.haul, person), state.stockpile, need);
      if (move <= 0) continue;
      state.stockpile -= move;
      wall.faceBuffer += move;
      need -= move;
      // the day wrote the road hand's biography (SIM 36: only real work counts)
      person.worked.carter += 1;
      person.lastJob = 'carter';
    }
    // then the draft horses top the face up, at HORSE_HAUL_MULT an untrained hand's rate
    // (SIM 41) — a horse benefits from the WAY exactly as a carrier does (routeCost)
    const cost = routeCost(state, wall.haul);
    const perHorse = HORSE_HAUL_MULT * (cost > 0 ? CARRIER_THROUGHPUT / (2 * cost) : CARRIER_THROUGHPUT);
    while (horseDays > 0 && need > 0 && state.stockpile > 0) {
      const move = Math.min(perHorse, state.stockpile, need);
      if (move <= 0) break;
      state.stockpile -= move;
      wall.faceBuffer += move;
      need -= move;
      horseDays -= 1;
      if (move < perHorse) break; // the pile or the face ran out mid-team
    }
  }
}

function layStones(
  state: WorldState,
  site: SiteData,
  rng: Rng,
  assignments: Map<number, Assignment>,
): void {
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
      : w.haul === null
        ? state.stockpile >= DRESS_DRAW[w.dressLevel]
        : w.faceBuffer >= DRESS_DRAW[w.dressLevel];
  // THE FIRST TECHNIQUE (SIM 27): a smith at the forge keeps the crew's irons sharp, so
  // the masons dress and lay faster. Count the smiths ONCE — no soul changes trade within a
  // day — and turn it into a lay-debt multiplier: each relieves SMITH_DRESS_RELIEF, saturating
  // at SMITH_RELIEF_MAX. With no smith the factor is EXACTLY 1 (byte-identical to before, and
  // the 200-tick canon never draws one), so a world without a forge lays stone as it always did.
  const smiths = state.people.reduce((n, p) => (p.trade === 'smith' ? n + 1 : n), 0);
  const smithMult = 1 - Math.min(SMITH_RELIEF_MAX, smiths * SMITH_DRESS_RELIEF);
  for (const person of state.people) {
    // SIM 36: the dawn pass assigns the day's layers (children and smiths never lay)
    if (person.trade !== 'villager' || !isAdult(person, state.tick)) continue;
    if (assignments.get(person.id) !== 'lay') continue;
    let quota = layRateOf(person);
    let laidAny = false;
    while (quota > 0) {
      const wall = state.walls.find(
        (w) => w.stonesLaid < w.stonesTotal && supplied(w),
      );
      if (!wall) break;
      // where the next stone lands (its COURSE decides the lift cost, SIM 26)
      const decomp = decomposeWall(wall.points, wall.height, wall.gates);
      const pick = pickSlot(wall, decomp.slots);
      if (!pick) break; // unreachable past the laid<total check
      // THE LIFT (SIM 26): a stone raised high costs more of the mason's day. A wood
      // palisade is set, not stacked, and takes no lift. A stone wall climbing past the
      // free reach raises a GREAT WHEEL if the woodpile can build one (drawing
      // WHEEL_TIMBER), and the wheel then relieves the penalty to WHEEL_RELIEF of itself.
      let liftMult = 1;
      if (wall.material !== 'wood') {
        const above = pick.course - LIFT_FREE_COURSES;
        if (above > 0) {
          if (!wall.wheel && state.timber >= WHEEL_TIMBER) {
            state.timber -= WHEEL_TIMBER;
            wall.wheel = true;
            state.events.push({
              kind: 'wheel_raised',
              tick: state.tick,
              wallId: wall.id,
              timber: WHEEL_TIMBER,
            });
          }
          liftMult = 1 + above * LIFT_PER_COURSE * (wall.wheel ? WHEEL_RELIEF : 1);
        }
      }
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
      } else if (wall.haul === null) {
        state.stockpile -= DRESS_DRAW[wall.dressLevel];
      } else {
        wall.faceBuffer -= DRESS_DRAW[wall.dressLevel];
      }
      layOneStone(state, site, rng, wall, person.id, pick, decomp.spacing);
      laidAny = true;
      // the LIFT taxes the mason's day (SIM 26); the SMITH relieves it (SIM 27). smithMult is
      // 1 with no forge, so this is byte-identical to SIM 26 until a smith stands at the base.
      quota -= DRESS_SPEC[wall.dressLevel].layDebt * liftMult * smithMult;
    }
    if (laidAny) {
      // the biography (SIM 36): a day that laid real stone is a day toward the mason band
      person.worked.mason += 1;
      person.lastJob = 'mason';
    }
  }
}

/**
 * Which (course, slot) the NEXT stone falls in — the level-coursing walk (SIM 13),
 * lifted out of layOneStone so the caller can know the working COURSE before it spends
 * the mason's quota (the lift penalty rides on height, SIM 26). Infill (a walled-back
 * gate) is explicit and consumes its job here, exactly as before. Returns null only past
 * the laid<total check (unreachable in the lay loop).
 */
function pickSlot(wall: WallPlan, slots: number[]): { course: number; slot: number } | null {
  if (wall.infill.length > 0) {
    // walling a removed gate back up: explicit slots, bottom course first
    const job = wall.infill.shift()!;
    return { course: job.course, slot: job.slot };
  }
  // the initial build walks the SURVEY's slab grid bottom-up (SIM 13): a course is laid
  // clear across every column deep enough to hold it, so the wall rises in LEVEL layers.
  let i = wall.stonesLaid;
  for (let c = 0; c < wall.courses; c++) {
    let n = 0;
    for (const s of slots) {
      if (wall.slotStarts[s]! <= c && c < wall.slotEnds[s]!) n += 1;
    }
    if (i < n) {
      let k = -1;
      for (const s of slots) {
        if (wall.slotStarts[s]! <= c && c < wall.slotEnds[s]!) {
          k += 1;
          if (k === i) return { course: c, slot: s };
        }
      }
    } else {
      i -= n;
    }
  }
  return null;
}

function layOneStone(
  state: WorldState,
  site: SiteData,
  rng: Rng,
  wall: WallPlan,
  masonId: number,
  pick: { course: number; slot: number },
  spacing: number,
): void {
  const { course, slot } = pick;
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
  if (state.farms.some((f) => f.wallId === wall.id)) return;
  if (state.buildings.some((b) => b.wallId === wall.id)) return;
  if (wall.plans !== null) {
    // SIM 37: a NAMED shell becomes a building the day it stands — roof 'none'
    // until (unless) its own word comes. An unnamed shell stands bare, still
    // asking (it pends from the plot; the late trade word mints it then).
    if (wall.plans.kind === null) return;
    mintBuilding(state, wall);
    return;
  }
  if (state.pending.includes(wall.id)) return; // already asking (one-shot recognition)
  const rc = classifyRing(wall.points, wall.height);
  if (rc === null || rc.kind !== 'farm') return; // building-class always has plans
  state.events.push({ kind: 'plot_enclosed', tick: state.tick, wallId: wall.id, area: rc.area });
  if (wall.fieldUse !== null) {
    // THE FIELD'S AT-PLOT WORD (SIM 37): the use rode the plan, so the land is
    // designated the day the ring stands — enclosed and named in one breath,
    // no pending, no card
    mintFarm(state, wall, wall.fieldUse, rc);
    return;
  }
  state.pending.push(wall.id);
}

/**
 * SIM 37: mint the Building a named shell has earned — at completion when the trade
 * rode the plan, or at ANSWER-TICK when the word came late to a standing shell. The
 * roof is whatever the drawings hold ('none' until its word); a brick roof decks a
 * real span the day it is known.
 */
function mintBuilding(state: WorldState, wall: WallPlan): void {
  const rc = classifyRing(wall.points, wall.height);
  if (rc === null || rc.kind !== 'building') return; // unreachable: plans ⇒ building-class
  const building = {
    id: state.nextId++,
    wallId: wall.id,
    kind: wall.plans!.kind!,
    roof: wall.plans!.roof ?? ('none' as const),
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
  if (building.roof === 'brick') mintBrickDeck(state, wall);
}

/**
 * Flat brick adds another layer (boss canon 2026-07-10): the chosen roof is a REAL
 * span over the footprint — decked by laborers through the daily loop, and ground
 * for the next storey when complete. It bears on the wall's surveyed level datum
 * (SIM 13), flush by law. Since SIM 37 a LATE brick word decks at answer-tick.
 */
function mintBrickDeck(state: WorldState, wall: WallPlan): void {
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

/** SIM 37: the farm-minting shared by the pending word and the at-plot word. */
function mintFarm(
  state: WorldState,
  wall: WallPlan,
  use: FieldUse,
  rc: Extract<NonNullable<ReturnType<typeof classifyRing>>, { kind: 'farm' }>,
): void {
  const farm = {
    id: state.nextId++,
    wallId: wall.id,
    use,
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
