/**
 * Sim state and command/event vocabulary.
 *
 * Laws (SCOPE §11):
 * - WorldState is plain serializable data. No class instances, no functions, no Dates.
 * - Physics advances ONLY through worldStep. UI speed controls are transport.
 * - The save format is {meta, commands}: seed + command log fully determine a world.
 *   SimEvents are derived outcomes (the chronicle's source), reproduced by replay.
 */
// 15: THE ADIT — a drift driven INTO a hillside at the portal's grade, and
// SELF-DRAINING: water runs back out the mouth, so the adit dewaters the ground
// above its floor. It wins building stone the open quarry cannot — post that is
// DROWNED below the regional water table, or too deep under cover — at the cost
// of driving through the rock. Economics (drive length × section at the strata's
// pace, stone won along the seam) are frozen from the bed model + surface into the
// command, like the quarry (the sim core stays bed-model- and water-free).
// 14: THE QUARRY — the world beneath the landscape is real strata (the
// transcribed Durham bed model). A cut excavates DOWN through the beds at a
// MATERIAL-AWARE pace (the verified ILO dig ladder, frozen from the bed model
// into the command like the survey) and yields BUILDING STONE with a deliberate
// generous inversion of the real recovery — production exceeds removal, to
// reward great works (boss directive 2026-07-10). — 13: level coursing; 12:
// drawings before the build; 11: uncovered spans; 10: designation; 9: doors
export const SIM_VERSION = 15;

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

/**
 * Wall materials. 'wood' is the historical first phase (palisades before
 * curtains); stone kinds grow from the M2 bed model — for now the one honest
 * entry is the Durham country rock. Values are CONSTANT strings: they enter
 * hashed state via WallPlan.
 */
export const MATERIALS = ['wood', 'sandstone'] as const;
export type Material = (typeof MATERIALS)[number];

export interface WallPlan {
  id: number;
  points: Vec2[]; // polyline in site-local meters
  height: number; // target height above ground, meters
  material: Material;
  /**
   * Gateway centers ON the polyline. Masonry keeps GATE_HALF clear of each —
   * the opening is left as the wall is BUILT (a farm ring auto-gates its
   * first-placed segment at plan time), or knocked out/walled back up later
   * by the gate tool (add_gate / remove_gate).
   */
  gates: Vec2[];
  /**
   * Slots waiting to be re-laid after a gate was removed: the masons wall the
   * opening back up through the ordinary daily loop, one honest stone at a
   * time. Non-empty only between a remove_gate and the wall's re-completion.
   */
  infill: { course: number; slot: number }[];
  /**
   * THE DRAWINGS (SIM 12): non-null exactly when the plotted ring classifies
   * as a building. Both answers are given BEFORE the masons take the wall up
   * (boss canon 2026-07-10): first the roof (choose_roof), then the trade
   * (designate). A wall whose drawings hold a null waits unbuilt.
   */
  plans: { roof: BuildingRoof | null; kind: BuildingKind | null } | null;
  /**
   * THE SURVEY (SIM 13), frozen at plan time from the sim's own ground:
   * courses are LEVEL slabs on one shared grid hung from levelTop (highest
   * ground + height — boss canon 2026-07-10, "regardless of height the
   * layers are even"). A column occupies courses slotStarts[s] ≤ c <
   * slotEnds[s] (raw-slot indexed): building-class walls rise to ONE datum
   * (a roof needs one flat bearing); plain walls STEP their tops with the
   * land like hillside masonry, layers even throughout.
   */
  levelTop: number;
  courses: number;
  slotStarts: number[];
  slotEnds: number[];
  stonesTotal: number;
  stonesLaid: number;
}

/**
 * An earthwork: a polygon to be filled with dirt up to `level` (meters AOD).
 * Laborers move volume day by day; stones may stand on a fill only once it is
 * COMPLETE (you don't build on loose tipping). Fill between parallel walls =
 * a rampart; fill a drawn square = a platform (boss canon, 2026-07-09).
 */
export interface FillPlan {
  id: number;
  points: Vec2[]; // closed polygon (last edge implied), site-local meters
  level: number; // target surface elevation, meters AOD
  /**
   * 'flat' tips to a level platform. 'ramp' slopes: ground at the FIRST-placed
   * edge, rising linearly to `level` at the polygon's far extent — the way up
   * onto a platform (boss canon 2026-07-10). Constant strings, hashed state.
   */
  shape: 'flat' | 'ramp';
  /** ramp only: the ground sampled at the first edge's midpoint at plan time */
  rampLowG: number;
  volumeTotal: number; // m³, estimated at plan time
  volumeMoved: number; // m³ moved so far
}

/**
 * A QUARRY (SIM 14): a ring excavated DOWN through the real strata. The dig is
 * paced by what the crew cut THROUGH — workTotal (person-days) and stoneTotal
 * (m³ of building stone won) are read from the bed model at plan time and frozen
 * into the plan_cut command, exactly as the survey freezes (the sim core stays
 * bed-model-free; the save is self-contained). Stone is credited to the
 * stockpile when the pit is dug out — a generous inversion of the real ~0.29
 * recovery (research/DIGEST-2026-07-10-dig-rates-and-yield.md): production
 * exceeds removal, to reward great works.
 */
export interface CutPlan {
  id: number;
  points: Vec2[]; // the quarry ring, site-local meters
  depth: number; // meters excavated below the surface
  floorLevel: number; // target floor elevation AOD (lowest ground − depth), for render
  volumeTotal: number; // m³ removed (area × depth), sim-computed from the ring
  workTotal: number; // person-days to dig — MATERIAL-AWARE, frozen from the bed model
  workDone: number;
  stoneTotal: number; // m³ of building stone won (generous yield), frozen from the bed model
  stoneWon: boolean; // one-shot: the stockpile is credited on completion
}

/**
 * An ADIT (SIM 15): a drift driven from a hillside PORTAL into the ground at the
 * portal's grade. It SELF-DRAINS to the mouth, so it dewaters the rock above its
 * floor — winning building stone the open quarry can't reach (post drowned below
 * the regional water table, or under cover). Like the quarry, its economics are
 * read from the bed model + the surface at plan time and FROZEN into the plan_adit
 * command (the sim core stays bed-model- and water-free; the save is self-contained).
 * Stone is credited to the stockpile when the heading is holed through.
 */
export interface AditPlan {
  id: number;
  portal: Vec2; // the hillside mouth, site-local meters
  head: Vec2; // the inward end of the drive
  grade: number; // AOD elevation of the adit floor (the surface at the portal) — it drains to here
  workTotal: number; // person-days to drive — MATERIAL-AWARE, frozen from the bed model
  workDone: number;
  stoneTotal: number; // m³ of building stone won along the drive (generous yield), frozen
  stoneWon: boolean; // one-shot: the stockpile is credited on completion
}

/**
 * Enclosure recognition thresholds (SCOPE §6 — the plot is the plan). A wall's
 * GEOMETRY declares what it makes; the pencil mode is not sim data.
 * Boss canon 2026-07-09: "farms are made by building a low wall, .5m around a
 * piece of land" — 0.5 m is the canonical recipe; anything you can step over
 * (≤ 1 m) cordons land rather than defending it.
 */
export const FARM_WALL_MAX_H = 1.0; // meters: above this an enclosure is no field wall
export const FARM_MIN_AREA = 25; // m²: smaller closed rings are yards, not farms
export const FARM_CLOSE_EPS = 0.45; // meters: a gap under one stone length still closes
export const DOOR_GAP_MAX = 2.0; // meters: a person-width gap makes a doorway, not a breach
export const BUILDING_MIN_H = 2.0; // meters: below headroom a ring shelters nothing
export const GATE_W = 1.5; // meters: a field gate's clear width (foot + barrow; carts later)
export const GATE_HALF = 0.75; // meters: masonry keeps this far from a gate's center
export const GATE_MIN_SEG = 2.7; // meters: a segment shorter than this can't take a gate
export const ROOF_SNAP = 0.75; // meters: a roof corner must rest this close to a wall
export const ROOF_DECK = 0.25; // meters: a roof plate's thickness — a brick deck IS a floor

/**
 * Roof materials (boss canon 2026-07-10): wood and straw cap a void; FLAT
 * BRICK adds another layer — a completed brick roof counts as ground, so the
 * next storey's walls stand on it. Constant strings; they enter hashed state.
 */
export const ROOF_MATERIALS = ['wood', 'straw', 'brick'] as const;
export type RoofMaterial = (typeof ROOF_MATERIALS)[number];

/**
 * A building's roof, chosen at PLOT time (boss canon 2026-07-10, default
 * none): 'none' leaves the shell open to the sky; wood/straw dress the gable;
 * brick mints a REAL Roof record at completion — the deck the next storey
 * stands on. Constant strings; they enter hashed state.
 */
export const BUILDING_ROOFS = ['none', ...ROOF_MATERIALS] as const;
export type BuildingRoof = (typeof BUILDING_ROOFS)[number];

/** A roof plate spanning wall tops. Laborers build it after fills, before fields. */
export interface Roof {
  id: number;
  points: Vec2[]; // the spanned polygon; every vertex rests on a finished wall
  level: number; // meters AOD of the supporting wall tops (the highest)
  /**
   * null = UNCOVERED (boss canon 2026-07-10: the default is none): the span
   * is drawn but its covering awaits the designate_roof word, exactly as an
   * enclosure awaits its use. No covering, no decking — laborers pass it by.
   */
  material: RoofMaterial | null;
  area: number; // m², shoelace
  workTotal: number; // person-days of carpentry (≈ area)
  workDone: number;
}

/**
 * What a designated field plot is FOR (boss canon 2026-07-10: the closed low
 * ring asks its lord — farm, livestock, or fallow; all choices open today,
 * some may unlock later). Constant strings; they enter hashed state via
 * Farm.use and the designate command.
 */
export const FIELD_USES = ['farm', 'livestock', 'fallow'] as const;
export type FieldUse = (typeof FIELD_USES)[number];

/**
 * What a designated shell is FOR (boss canon 2026-07-10). The lord's word,
 * not the footprint's — the mason's vernacular reading (classify.ts) stays
 * advisory. Constant strings; they enter hashed state via Building.kind.
 */
export const BUILDING_KINDS = ['house', 'blacksmith', 'tower', 'tavern'] as const;
export type BuildingKind = (typeof BUILDING_KINDS)[number];

/** A designated field enclosure — the plot its lord put to a use. */
export interface Farm {
  id: number;
  wallId: number;
  /** farm (arable, tended), livestock (a paddock; herds later), or fallow (rested) */
  use: FieldUse;
  /** the enclosure ring (open form — no duplicate closing vertex) */
  points: Vec2[];
  area: number; // m², shoelace of the ring
  /**
   * Every gateway into this farm: the auto-gate carved on the first-placed
   * segment (boss canon 2026-07-10 — a farm always has its gate), any the
   * gate tool added, and a hand-drawn gap's midpoint. Kept in step with the
   * wall's gates by the add_gate/remove_gate handlers.
   */
  gates: Vec2[];
  /**
   * Person-days of tending, ARABLE ONLY (use 'farm'): a laborer with no earth
   * to move works the arable farm with the fewest workdays (boss canon
   * 2026-07-10: recognized farms put citizens to work). Pasture is grazed,
   * fallow rests — neither draws hands. The Lodge never puppets individuals —
   * this is recognition creating work, not an assignment UI. M4's granary
   * year converts workdays + seasons into yield; until then the counter is
   * the honest substrate.
   */
  workdays: number;
}

/** A designated building — its shell is an ordinary wall; the lord named it. */
export interface Building {
  id: number;
  wallId: number;
  /** constant string from BUILDING_KINDS — the designation, enters hashed state */
  kind: BuildingKind;
  /** the roof chosen at plot time — 'none' keeps the sky; brick minted a real deck */
  roof: BuildingRoof;
  area: number; // m² enclosed (the doorway's closing edge implied)
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
  /**
   * Daily work rate by trade: masons in stones laid, laborers in m³ of earth
   * moved (stubs; real pacing arrives with M2's quarry loop).
   */
  pace: number;
}

export type Command =
  | {
      kind: 'plan_wall';
      tick: number; // the tick at whose start this command applies
      points: Vec2[];
      height: number;
      /** absent in old logs/saves — defaults to 'sandstone' at the boundary */
      material?: Material;
    }
  | {
      kind: 'plan_fill';
      tick: number;
      points: Vec2[]; // polygon, ≥3 points
      height: number; // meters of fill above the highest sampled ground
      /** absent in old logs/saves — defaults to 'flat' at the boundary */
      shape?: 'flat' | 'ramp';
    }
  | {
      kind: 'plan_roof';
      tick: number;
      points: Vec2[]; // ≥3 vertices, each resting on a FINISHED wall
      // no material: a drawn span is UNCOVERED until designate_roof (SIM 11)
    }
  | {
      kind: 'plan_cut';
      tick: number;
      points: Vec2[]; // the quarry ring, ≥3
      depth: number; // meters to excavate below the surface
      /**
       * Bed-model-derived economics, computed at the command boundary (where the
       * bed model lives) and FROZEN into the log — so the sim core needs no bed
       * model and the save reproduces byte-identically regardless of later
       * beds.json regen. workTotal is material-aware person-days; stoneTotal is
       * the building stone won (generous yield). Both finite and ≥ 0.
       */
      workTotal: number;
      stoneTotal: number;
    }
  | {
      kind: 'plan_adit';
      tick: number;
      portal: Vec2; // the hillside mouth
      head: Vec2; // the inward end of the drive
      /**
       * Frozen at the command boundary (where the bed model, the surface and the
       * water table live): grade is the adit floor's AOD elevation (the drainage
       * level); workTotal is material-aware person-days to drive; stoneTotal is the
       * building stone won along the seam (generous yield). All finite; work/stone ≥ 0.
       */
      grade: number;
      workTotal: number;
      stoneTotal: number;
    }
  | {
      kind: 'add_gate';
      tick: number;
      wallId: number; // must be a farm's wall, complete and idle
      at: Vec2; // snapped to the nearest point ON the wall by the sim
    }
  | {
      kind: 'remove_gate';
      tick: number;
      wallId: number;
      at: Vec2; // the nearest gate within reach is taken down and walled up
    }
  | {
      kind: 'designate';
      tick: number;
      /** a wall in state.pending — the completed enclosure awaiting the word */
      wallId: number;
      /** must match the enclosure's class: FieldUse for a plot, BuildingKind for a shell */
      use: FieldUse | BuildingKind;
    }
  | {
      kind: 'designate_roof';
      tick: number;
      /** an UNCOVERED roof (material null) — the drawn span awaiting its covering */
      roofId: number;
      material: RoofMaterial;
    }
  | {
      kind: 'choose_roof';
      tick: number;
      /** a wall whose drawings await their roof (plans.roof === null) */
      wallId: number;
      roof: BuildingRoof;
    };

export type SimEvent =
  | { kind: 'wall_planned'; tick: number; wallId: number; stonesTotal: number }
  | { kind: 'stone_laid'; tick: number; stoneId: number; wallId: number; masonId: number }
  | { kind: 'wall_complete'; tick: number; wallId: number }
  | { kind: 'fill_planned'; tick: number; fillId: number; volumeTotal: number }
  | { kind: 'fill_complete'; tick: number; fillId: number }
  /** a quarry is marked out — the crew will dig it at the strata's pace (SIM 14) */
  | { kind: 'cut_planned'; tick: number; cutId: number; volumeTotal: number; workTotal: number }
  | { kind: 'cut_complete'; tick: number; cutId: number }
  /** building stone won from a finished quarry, credited to the stockpile */
  | { kind: 'stone_won'; tick: number; cutId: number; stone: number }
  /** an adit is marked out — the crew will drive it into the hill at the strata's pace (SIM 15) */
  | { kind: 'adit_planned'; tick: number; aditId: number; length: number; workTotal: number }
  | { kind: 'adit_complete'; tick: number; aditId: number }
  /** dewatered building stone won from a holed-through adit, credited to the stockpile */
  | { kind: 'adit_stone_won'; tick: number; aditId: number; stone: number }
  | { kind: 'roof_planned'; tick: number; roofId: number; workTotal: number }
  /** the covering chosen: decking may begin */
  | { kind: 'roof_covered'; tick: number; roofId: number; material: RoofMaterial }
  | { kind: 'roof_complete'; tick: number; roofId: number }
  /** a low ring closed and awaits the lord's word — the chronicle knows the day */
  | { kind: 'plot_enclosed'; tick: number; wallId: number; area: number }
  /** a building is PLOTTED — the drawings ask their roof and trade before the build */
  | { kind: 'shell_plotted'; tick: number; wallId: number; area: number }
  /** the drawings' first answer */
  | { kind: 'roof_chosen'; tick: number; wallId: number; roof: BuildingRoof }
  /** the drawings' second answer — the masons may take the wall up */
  | { kind: 'building_planned'; tick: number; wallId: number; buildingKind: BuildingKind }
  /** the word given: the plot is a farm, a paddock, or left fallow */
  | {
      kind: 'plot_designated';
      tick: number;
      plotId: number;
      wallId: number;
      use: FieldUse;
      area: number;
    }
  | { kind: 'gate_added'; tick: number; wallId: number; stonesRemoved: number }
  | { kind: 'gate_removed'; tick: number; wallId: number; stonesToRelay: number }
  /** the word given: the shell is a house, a smithy, a tower, or a tavern */
  | {
      kind: 'building_complete';
      tick: number;
      buildingId: number;
      wallId: number;
      buildingKind: BuildingKind;
    }
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
  fills: FillPlan[];
  /** quarries being dug through the strata (SIM 14) */
  cuts: CutPlan[];
  /** adits being driven into the hillsides, self-draining (SIM 15) */
  adits: AditPlan[];
  /**
   * Building stone won from finished quarries and not yet spent, m³ (SIM 14).
   * Accumulates for now — walls do not draw on it yet, so the generous-yield
   * production is a visible resource before the consumption loop lands.
   */
  stockpile: number;
  roofs: Roof[];
  /**
   * Wall ids of completed enclosures awaiting designation (SIM 10). Just the
   * ids: wall geometry is immutable, so class, ring, area and gap gate all
   * recompute from classifyRing at designation time — one predicate, nothing
   * copied that could drift. Completion order preserved (the card asks oldest
   * first). A designate command moves the wall from here to farms/buildings.
   */
  pending: number[];
  farms: Farm[];
  buildings: Building[];
  stones: PlacedStone[];
  /**
   * Chronicle source. Deterministically reproduced by replay, so it may live in
   * state for now; becomes an external sink/ring buffer when it grows real (M3).
   */
  events: SimEvent[];
}
