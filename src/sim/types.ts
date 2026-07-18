/**
 * Sim state and command/event vocabulary.
 *
 * Laws (SCOPE §11):
 * - WorldState is plain serializable data. No class instances, no functions, no Dates.
 * - Physics advances ONLY through worldStep. UI speed controls are transport.
 * - The save format is {meta, commands}: seed + command log fully determine a world.
 *   SimEvents are derived outcomes (the chronicle's source), reproduced by replay.
 */
// 18: THE DRESS DIAL — a wall's stone is no longer one fixed cost. Each stone
// wall carries a DRESS LEVEL (rubble | scappled | ashlar) frozen at plan time:
// rubble is light, undressed fieldstone that lays quick (a low garden wall);
// ashlar is squared, dressed blocks that lay slow and haul heavy (a tall or
// load-bearing wall); scappled is the roughly-squared middle. The level sets a
// LAY DEBT (mason-days per stone) and a HAUL FACTOR (rough m³ carted per stone),
// so a tall ashlar structure far from winnable stone is dear both to move and to
// raise, while a rubble field wall flies up. The boundary picks a smart default
// from the STRUCTURE (low→rubble, tall→ashlar) that the player can override; the
// sim replays only the constant-string level through a constant table (no new
// geometry), byte-identical when absent (⇒ 'scappled', the SIM-16/17 cost). —
// carriage layer Phase 2 (PROPOSAL-LOGISTICS §5), structure-keyed per boss pick
// 2026-07-14.
// 17: THE HAUL — won building stone no longer teleports from pile to wall. Each
// STONE wall carries a FACE BUFFER and a haulRate frozen at plan time from the
// ROUTE the boundary reads: the distance to the nearest DRY winnable post, the
// climb up to the wall, and any gorge the cart must detour across a bridge to
// cross. WIN fills the global pile (as before); HAUL meters that pile into each
// wall's face at its frozen rate; LAY draws the face. A wall far from winnable
// stone — or across the Wear — stalls on the CART, not the pit, and the
// bottleneck line names which link starves. On-the-spot walls (haulRate null,
// 'local') and timber draw the pile directly, exactly as in SIM 16. The route
// is frozen at the boundary; the sim core replays only the scalar (no beds,
// water or heights), byte-identical after any terrain regen. — carriage layer
// Phase 1 (PROPOSAL-LOGISTICS §5), wall-sited per boss pick 2026-07-14.
// 16: THE CONSUMPTION LOOP — masonry now DRAWS the stockpile. Each ashlar laid
// spends STONE_VOLUME (its own dressed m³) of won building stone; when the pile
// runs dry the masons STALL, honestly, until a quarry or adit wins more. The
// standing M2 economy closes at last: a wall rises only as fast as the land is
// made to yield, so mining and building are finally one loop, and a wall that
// outpaces the pit stops and NAMES why. (Still global + one-shot — the per-wall
// face buffer and metered haul are the carriage layer's Phase 1.)
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
// 19: THE WOODS — timber is a real WON, SPENT, and REGROWING resource. A
// `plan_fell` freezes a cant's mature timber + felling cost from the tree model
// at the boundary (like plan_cut freezes stone from the bed model); laborers fell
// it and win TIMBER to the global stock; building with wood DRAWS that stock (the
// palisade stops being free); and the felled stool REGROWS over a coppice rotation
// (~7 years) — felling is not death, it is how a worked wood lives. A mature stand
// is re-fellable (the `fell` command), the same yield again. The generational
// heart (PROPOSAL-THE-LIVING-SETTLEMENT §2).
// 20: THE LIVING YEAR — people are MORTAL and the settlement GROWS. Once a year
// (the demographic pass, on its OWN seed+year rng so people-churn never shifts the
// masonry jitter), each adult rolls survival on an age curve and dies on the
// record; and the HARVEST — food is a function of enclosed field AREA (space-gated,
// easy per boss) — sets a surplus ratio that draws MIGRANTS (fast) and lifts the
// BIRTH rate (slow, a lineage), or thins the village in hunger. Aging is real:
// a child born in-game does not lift a stone until it comes of age. §3 + §4.
// 21: THE GRANARY — the civic heart made a real building (BUILDING_KINDS gains
// 'granary'). It is the population engine's STORE: a granary's mutual-aid stock
// lets the settlement feed more mouths than its fields alone (GRANARY_CAPACITY
// each), so the food capacity reads the granaries beside the arable. Grounds §4's
// soul (the granary embodies mutual aid AND is the population engine, one object)
// and gives the cart a place to carry grain TO. Step 3a of the pyramid arc.
// 27: THE FIRST TECHNIQUE — the smith stops being decoration and does WORK. A smith
// at the forge keeps the masons' (and carpenters') irons sharp, so the crew DRESSES
// and LAYS faster: his presence relieves the mason's lay debt (SMITH_DRESS_RELIEF per
// smith, capped SMITH_RELIEF_MAX — tools speed the work, they never do it). Reads the
// existing people; no new state, no new command. INERT on the 200-tick canon (no smith
// is drawn until the first reckoning at tick 364), so it ships as one clean commit —
// only simVersion + the milestone hashes move. Roadmap Beat 4; the specialization
// pyramid's payoff (SIM 24 gave the smith a life, this gives him a purpose).
// 28: THE APPRENTICE BOND — the smith's trade passes DOWN, not only in on the wind. When a
// master smith already lives and another forge wants filling, the settlement's YOUNGEST hand is
// raised to it (a local child come of age, reassigned — no new body); only with NO master to
// learn from (the first smith, or after the last master dies) does a journeyman MIGRATE in. The
// `origin` on the arrival event ('apprentice' | 'migrant') carries the lineage for the chronicle.
// All in livingYear §4 — INERT on the 200-tick canon (never reckoned there), so one clean commit.
// 29: VARIETY BEARS FRUIT — the pyramid's variety tenants stop being decoration and start to PAY.
// An ORCHARD now bears food toward the harvest (its area over ORCHARD_AREA_PER_PERSON, a supplement to
// the grain staple), and a PASTURE keeps a draft HORSE that hauls more surplus to the store each year
// (HORSE_HAUL, grazing free on its own field). So the mixed farm the smith needed is now worth keeping
// for its own sake — diversity feeds and carries, not just varies. In livingYear §2 → INERT on canon.
// 30: SHELTER GATES GROWTH — housing stops being only a hunger-retention nudge (SIM 25) and becomes a real
// growth CAP: a settlement grows (births + migrants) only while it has ROOM to house more, tapering to zero
// as the mouths approach the shelter its roofs give. A founding hamlet still grows to ~FOUNDING_SHELTER +
// SHELTER_GROWTH_SLACK on the founders' first roofs, but past that you must BUILD HOUSES to grow — so the
// population settles at min(food capacity, shelter capacity), and housing finally MATTERS for growth, not
// just retention. In livingYear §3 → INERT on the 200-tick canon (never reckoned there). A conservative
// SLACK for now (the harshness is a knob); the century-sweep now houses its settlements so it still tunes FOOD.
// 31: WEATHER SHAPED — the harvest's yearly weather roll was UNIFORM on [WEATHER_MIN, WEATHER_MAX]; now it is
// the MEAN of two such rolls, a TRIANGULAR distribution peaked at the centre. Same mean (1.0), but ordinary
// years cluster near it and the extreme famine/glut years — the ones that drive the hunger churn (the sweep's
// high 'left' counts) — grow rarer. A gentler difficulty curve without a fixed harvest. Two demo-rng draws in
// livingYear §2 → INERT on the 200-tick canon (never reckoned there).
// 32: THE SLEDGE ON ROLLERS — the heavy-block HAUL accelerant, the lift's overland twin (step 5's scoped
// leftover). The lift relieved the vertical haul UP a tall wall (SIM 26); this relieves the OVERLAND haul
// across the ground: an OPT-IN wall lays timber rollers under a sledge and its won stone travels its route
// ROLLER_HAUL_BOOST times faster (the cart/sledge fills the face sooner). Opt-in per wall at plan time, so a
// wall that doesn't choose it — and the whole 200-tick canon, whose walls don't — hauls byte-for-byte as
// before: INERT on the canon, one clean commit. A rollers field defaulting false is the only new state.
// 33: THE BELL PIT — the method ladder's third rung (open cut → adit → BELL PIT → shaft+pump). A narrow shaft
// sunk into FLAT ground for deeper DRY post than an open cut reaches, where the adit has no hill. New state:
// a bellPits array (empty on the canon, which sinks none) + a plan_bell_pit command; idle laborers sink the
// oldest pit like a quarry, crediting the dry stone once on working-out. INERT on the canon behaviour — the
// only reason the durham hash moves is the new empty `bellPits:[]` field in the serialisation (diff-confirmed:
// nothing but the milestone hashes changed). One clean commit + a baseline regen.
// 34: THE SHAFT-AND-PUMP — the method ladder's fourth + last rung. A deep shaft that beats the WATER TABLE
// (continuous dewatering) to win DROWNED post the open cut / adit / bell pit can't; the drowned depth carries a
// PUMP TAX in workTotal. New state: a shafts array (empty on the canon, which sinks none) + a plan_shaft command;
// idle laborers sink the oldest shaft like a bell pit, crediting the dewatered stone once. INERT on the canon
// behaviour — the durham hash moves only for the new empty `shafts:[]` field + the SIM_VERSION bump. Regen.
// SIM 35 — THE VISIBLE FLOW (the VISIBLE WORK arc, commit A): every working (cut, adit, bell pit,
// shaft, felled stand) pays its yield AS THE WORK IS DONE — a stateless per-person-day checkpoint
// credit (total·min(1,k/W) − total·min(1,(k−1)/W), exact-total at completion) replaces the lump at
// working-out. The completion events + the stoneWon/feltTick flags still fire ONCE, so the chronicle
// and the worked-out render cues are unchanged. This retires the measured pathology behind "time is
// not advancing": a founding quarry paid nothing for ~445 days, then everything in a week. A
// BEHAVIORAL change everywhere a working exists — the canon re-authored + regenerated with it.
// SIM 36 — THE THIRTEEN + THE SKILL SYSTEM (commit B′, `dfa8728`): villager|smith, worked{}/
// lastJob/vigor, the dawn pass, green ×9/8. ⚠ HONEST RECORD: B′ shipped WITHOUT this bump (the
// constant still read 35) — the miss the critique warned would let cross-commit saves replay
// silently divergent. Repaired here by bumping straight past 36: every pre-F′ save (stamped 35,
// whether A-era or B′-era physics) is refused alike. Flag days are the boss-ruled contract.
//
// SIM 37 — THE WORD AT THE PLOT (commit F′; boss decree 2026-07-16): ONE enclosure grammar. A
// building-class ring may carry roof + trade on the plan itself; a field-class ring its use; a
// span its covering — and 'none' NEVER BLOCKS: awaitsDrawings is retired, the shell builds bare,
// pends, and takes its words later (designate/choose_roof on a completed shell mint the Building /
// update its roof / deck a late brick AT ANSWER-TICK). The 2026-07-10 "the masons lay not one
// stone until the drawings are answered" canon is SUPERSEDED (recorded in the charter + BACKLOG);
// the roof-before-trade ordering guard retires with it. New state: WallPlan.fieldUse.
//
// SIM 38 — THE TIMBER WAY, drawn (Course 4 commit A; boss decree 2026-07-16: "if the workers are
// moving faster the bricks reach their destination quicker"): a WAY is a timber causeway the player
// draws — laid plank-by-plank from its head, drawing TIMBER as it goes, worked by hands on the new
// CARTER skill (the road's own trade: it paves the road and, from SIM 39, drives it). This commit
// lands the way as STATE + TOOL + RENDER only: nothing reads it, haul is untouched, and the canon
// lays no way — so `find` returns undefined, hasWork('pave') is false, and BEHAVIOUR is byte-for-byte
// SIM 37. The baseline moves for PURE SERIALISATION alone (the new `ways:[]` array, the new
// `worked.carter:0` on every person, and this constant) — the bell-pit/shaft precedent: one clean
// commit + a regen, diff-confirmed to touch only the milestone hashes. New state: WayPlan + ways[].
//
// SIM 39 — THE HAUL BECOMES LABOR (Course 4 commit B — the attributable bump). The frozen
// haulRate scalar (SIM 17) is RETIRED, and with it the `rollers` flag + ROLLER_HAUL_BOOST (SIM 32)
// and the 🛷 toggle. Stone no longer arrives at a rate: it arrives on people's backs. CARRIERS are
// real hands with a real errand — load at the pile, walk the route, put down at the face, walk back
// — and the crew SPLITS ITSELF at dawn so that delivery balances consumption. A drawn WAY shortens
// the route's EFFECTIVE metres (the built prefix costs 1/WAY_SPEED_MULT), so each carrier delivers
// more, so FEWER hands are needed on the road and MORE stand at the wall. That is the boss's
// sentence made mechanism: "if the workers are moving faster the bricks reach their destination
// quicker." The boundary now freezes the road's FACTS (its two ends, the climb, the gorge detour)
// instead of its rate — terrain the sim cannot see — and the sim does the labour arithmetic, so a
// road drawn LATER can still shorten a wall's haul. A BEHAVIORAL change wherever a hauled wall
// exists: the canon's wall A is re-authored with it. New state: WallPlan.haul (HaulRoute | null).
//
// SIM 40 — THE STEADY SPLIT (Course 4, a balance fix a LIVE PROBE caught). SIM 39 shipped
// correct in the small — deterministic, conserving, the wall finishes — but WRONG in the
// dynamic: on a long road the carrier balance rounded UP to claim every hand (12.5 → 13 of a
// 13-hand crew), and since they all carried yesterday the stickiness step kept them on the road,
// so NOBODY laid and the wall rose only in a grotesque boom-bust (fill the whole face, then
// drain it) instead of the steady split the boss's story needs. The dawn pass now RESERVES a
// mason whenever a hauled face has stone to lay, computed against the hands actually free for the
// road (a green farmer with a field to tend never pads the reserve). No new state, no format
// change — but the balance is replay-visible (the canon's carry-bound wall A re-times), so by the
// charter's own law (a replay-visible change forks saves unless the version moves) it earns its
// bump. The fix's proof is the probe that found it: a bare road holds a steady 1-lay/12-carry, and
// a drawn way shifts it to 2-lay/11-carry and finishes the wall ~4× sooner — visibly, day by day.
//
// SIM 41 — THE OX GIVES WAY TO THE HORSE (a timber-way follow-on; DIGEST-2026-07-17 §6). A
// settlement that keeps PASTURES already has draft horses hauling grain to the granary (SIM 29,
// pastures × HORSE_HAUL); now those horses haul STONE too. A horse-drawn team moves it faster than
// a hand or an ox — VERIFIED at ~a doubling of hauling speed (Langdon & Claridge: ox 1½–2 mph →
// horse 3–4 mph, a 12th–13th-c. English development). So each pasture's horse carries like an extra
// carrier at HORSE_HAUL_MULT throughput, which — exactly like the way — means FEWER hands are needed
// on the road and MORE stand at the wall. Pastures become a lever on BOTH harvests: grain AND
// stone. No new saved state (draft horses are read from the pasture count, like the grain haul); the
// canon keeps no pasture so it is byte-identical (INERT) — but the behaviour is replay-visible
// wherever a pasture and a hauled wall coexist, so it earns its bump (the SIM-40 lesson).
//
// SIM 42 — THE WAY'S WORTH, RE-ANCHORED (a calibration fix the new way-worth readout CAUGHT). The
// readout (render+input, showing whether ground is worth a road as you draw it) revealed that on the
// real Durham terrain a causeway read "planks on rock" EVERYWHERE — the SIM-39 softness threshold
// (WAY_SOFT_DEPTH 3 m) inverted the digest's own bands, making firm the default when the evidence
// says ORDINARY earth is already ~3×. Durham's median depth-to-water is 13.5 m, so the whole map
// fell in the "firm" bucket and the Course-4 tool was near-inert on the ground it ships on. Re-
// anchored WAY_DRY_DEPTH to 26 m — pinned to the MAP's own median ground (→ ~3×, the evidence's
// ordinary earth) with the wet quarter climbing toward 5 and only the driest ridges at 1.15. No new
// state; INERT on the canon (no way); replay-visible (waySpeedMult freezes into plan_way), so it
// earns the bump. The readout was the instrument that found it — the prospecting-clarity lesson.
//
// SIM 43 — THE SKILL LADDER (Beat 4's first course; boss-ruled 2026-07-17, PROPOSAL-BEAT-4-THE-MORTAL-
// SPINE). jobMult grew from two states (untrained/green) to the full ladder: green ~1yr ×9/8,
// JOURNEYMAN ~4yr ×5/4, MASTER ~10yr ×3/2 — an accelerating climb, mastery "much faster" (the boss's
// word). Discrete bands off days worked (anti-XP). No new saved state; INERT on the canon (no hand
// reaches journeyman's 4 years inside the 200-tick baseline — max worked ≈565 days ≪ 1460), so the
// diff is version + hashes only, one clean commit + regen (the bell-pit pattern). The master's rarer
// rewards — the losable technique, the fine works only a master can raise, lineage, the churchyard —
// are the later Beat-4 increments; this is the ladder they all stand on.
export const SIM_VERSION = 43;
/**
 * A horse-drawn haulage team moves stone this many times faster than a hand or an ox (SIM 41).
 * The VERIFIED ~doubling of hauling speed at the ox→horse transition (Langdon & Claridge 2011,
 * on Langdon's *Horses, Oxen and Technological Innovation* — DIGEST-2026-07-17 §2). One draft
 * horse per PASTURE, the same asset that already hauls grain (HORSE_HAUL, SIM 29).
 */
export const HORSE_HAUL_MULT = 2;

export const TICKS_PER_YEAR = 365; // 1 tick = 1 game day
export const SEASON_LENGTH = 91; // rough quarter-year, refined in M4

/**
 * THE CIVIC CALENDAR (step 0 of PROPOSAL-THE-LIVING-SETTLEMENT §1) — the one
 * clock the whole living settlement reads. Four seasons, a PURE FUNCTION of the
 * absolute tick: it holds no state, never enters the sim hash, and is safe to
 * call from render, the HUD, and — frozen at a command boundary, never recomputed
 * live inside worldStep — any future season-gated command (the woods' winter
 * felling first). The bounds are the COARSENING of the shipped farm crop calendar
 * (render/farms.ts `seasonBand`), so the HUD season and the field colours can
 * never disagree: a long northern winter, a short spring, a long summer running
 * through harvest, a short autumn after the stubble.
 *
 * CONSTANT strings: if a season ever rides into hashed state it must do so as one
 * of these literals, chosen at a boundary — never as a recomputed float.
 */
export const SEASONS = ['winter', 'spring', 'summer', 'autumn'] as const;
export type Season = (typeof SEASONS)[number];

/**
 * Day-of-year (0-based) at which each season BEGINS, in calendar order from the
 * year's start (deep winter): spring 60, summer 121, autumn 244, winter-return
 * 305. Kept in step with `seasonOf`'s bounds below and with farms.ts's bands.
 */
const SEASON_STARTS = [60, 121, 244, 305] as const;

/** Day of year (0..364) for an absolute tick; safe for negative ticks. */
export function dayOfYear(tick: number): number {
  return ((tick % TICKS_PER_YEAR) + TICKS_PER_YEAR) % TICKS_PER_YEAR;
}

/** The whole year number (Year 1 = ticks 0..364), for display. */
export function yearOf(tick: number): number {
  return Math.floor(tick / TICKS_PER_YEAR) + 1;
}

/** The season of an absolute tick — pure, allocation-free, hash-neutral. */
export function seasonOf(tick: number): Season {
  const d = dayOfYear(tick);
  if (d < 60 || d >= 305) return 'winter';
  if (d < 121) return 'spring';
  if (d < 244) return 'summer';
  return 'autumn';
}

/**
 * Whole days from `tick` until the NEXT season change — always in 1..365. This
 * is the honest interrupt Sit-the-Season runs to, and the forecast it shows;
 * `seasonOf(tick + ticksUntilNextSeason(tick))` is the season being entered.
 */
export function ticksUntilNextSeason(tick: number): number {
  const d = dayOfYear(tick);
  for (const b of SEASON_STARTS) {
    if (d < b) return b - d;
  }
  return TICKS_PER_YEAR - d + SEASON_STARTS[0]!; // wrap through the year's end to spring
}

/** Ashlar block dimensions, meters. Course height per Guédelon's 20–35 cm range. */
export const STONE_LEN = 0.45;
export const STONE_DEPTH = 0.3;
export const COURSE_HEIGHT = 0.25;

/**
 * The won building stone one laid ashlar draws from the stockpile, m³ (SIM 16):
 * the block's own dressed volume, and the SCAPPLED (neutral) draw. The quarry/adit
 * yield is already GENEROUS (production exceeds removal — boss directive
 * 2026-07-10), so charging the true block volume is honest and not punishing.
 * Since SIM 18 the DRESS DIAL scales this per wall (DRESS_DRAW): an ashlar wall
 * carts half again as much rough stone per block (dressing waste rides the cart),
 * rubble/scappled draw exactly this. 0.45 × 0.3 × 0.25 = 0.03375 m³. Product of
 * fixed constants → one bit pattern on every engine, and plain subtraction is
 * IEEE-exact, so the draw never threatens the cross-engine hash (no quantization
 * needed); the per-level scale is a constant multiply, exactly rounded.
 */
export const STONE_VOLUME = STONE_LEN * STONE_DEPTH * COURSE_HEIGHT;

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

/**
 * How a wall's stone reaches its face (SIM 17) — the field-guide WORD for the journey,
 * chosen at the boundary from the road it froze and carried on HaulRoute.method, so the
 * bottleneck line can name what the hands are doing. 'local' is stone won on the spot: no
 * road at all (WallPlan.haul is null) and the masons draw the pile directly. Constant
 * strings — they enter hashed state exactly like Material.
 *
 * The words are era-honest (DIGEST-2026-07-17 §4): a CARTER with a cart is attested from
 * the 12th century ("v caretis et iiij carectariis", Pipe Roll 17 Henry II) and a medieval
 * cart carried about a TONNE — not the 2.5 t Gimpel claims, which is unfootnoted and
 * demolished. The wheelbarrow is only just attested by 1222 (the king's works at Dover) and
 * stayed rare until the 15th c., so it is NOT the stone-mover here; the sledge is.
 */
export const HAUL_METHODS = [
  'local', // quarried underfoot — no road, no carry: the masons draw the pile directly
  'sledge', // short, flat or downhill — the cheap overland haul (and what a WAY is built for)
  'ox-cart', // overland
  'ox-cart uphill', // climbing to the wall costs the hands dear
  'ox-cart over the bridge', // the route must cross the gorge — the Wear is a MOAT
] as const;
export type HaulMethod = (typeof HAUL_METHODS)[number];

/**
 * THE DRESS DIAL (SIM 18): how finely a wall's stone is worked, and thus how
 * dearly it moves and rises. A CONSTANT-string field-guide term stored per wall
 * and chosen at the boundary (a smart default from the structure; the player may
 * override). Real mason's vocabulary:
 * - 'rubble'   — undressed fieldstone, laid nearly as-won: light to haul, quick
 *                to lay. The honest choice for a low garden or field wall.
 * - 'scappled' — roughly squared with the hammer: the neutral middle, and the
 *                absent-default so old logs/saves (SIM 16/17) replay byte-for-byte.
 * - 'ashlar'   — finely dressed, squared, coursed blocks: they lay slow (fine
 *                setting) and haul heavy (bigger worked stone, waste carted). What
 *                a tall or load-bearing wall wants. Constant strings — they enter
 *                hashed state via WallPlan.dressLevel, like Material and HaulMethod.
 */
export const DRESS_LEVELS = ['rubble', 'scappled', 'ashlar'] as const;
export type DressLevel = (typeof DRESS_LEVELS)[number];

/**
 * What each dress level costs, as two frozen scalars the sim replays through this
 * CONSTANT table (no geometry, no bed model):
 * - layDebt: mason-days spent per stone laid. Rubble 0.5 (quick stacking),
 *   scappled 1.0 (the SIM-16/17 rate — byte-identical), ashlar 2.0 (dressed and
 *   finely set). A ~4× swing, the cozy compression of Guédelon's ~8× (fine ashlar
 *   ~2 days/stone vs rough ~4/day). All exact dyadic floats → no hash risk.
 * - haulFactor: rough won stone drawn from the pile (and carted to the face) per
 *   stone LAID, as a multiple of STONE_VOLUME. Rubble/scappled 1.0 (laid near its
 *   won volume); ashlar 1.5 (the dressing waste rides the cart, shed at the wall).
 *   Makes a far ashlar wall stall on its cart sooner — "heavier blocks cost more
 *   to move" (boss, 2026-07-14).
 */
export const DRESS_SPEC: Record<DressLevel, { layDebt: number; haulFactor: number }> = {
  rubble: { layDebt: 0.5, haulFactor: 1.0 },
  scappled: { layDebt: 1.0, haulFactor: 1.0 },
  ashlar: { layDebt: 2.0, haulFactor: 1.5 },
};

/**
 * The won stone one laid stone draws from the pile/face, m³, PER DRESS LEVEL:
 * STONE_VOLUME × the level's haulFactor, precomputed at module load as a product
 * of fixed constants so it is one bit pattern on every engine (the STONE_VOLUME
 * law extended). Rubble/scappled = STONE_VOLUME exactly (the SIM 16/17 draw);
 * ashlar carts half again as much rough stone per finished block. DRESS_SPEC is
 * the single source of haulFactor; this table is its volume form for the hot loop.
 */
export const DRESS_DRAW: Record<DressLevel, number> = {
  rubble: STONE_VOLUME * DRESS_SPEC.rubble.haulFactor,
  scappled: STONE_VOLUME * DRESS_SPEC.scappled.haulFactor,
  ashlar: STONE_VOLUME * DRESS_SPEC.ashlar.haulFactor,
};

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
   * THE DRAWINGS (SIM 12; unblocked SIM 37): non-null exactly when the plotted ring
   * classifies as a building. The answers may ride the plan itself (the at-plot word),
   * or come LATER — a null never blocks the masons any more (boss decree 2026-07-16
   * supersedes the 2026-07-10 "asked at plot, crew waits" canon): the shell builds
   * bare and pends until its words are given. A null is 're-answerable'; an answered
   * word is one-shot (re-designation stays the reserved M4 rotation course).
   */
  plans: { roof: BuildingRoof | null; kind: BuildingKind | null } | null;
  /**
   * THE FIELD'S AT-PLOT WORD (SIM 37): a farm-class ring may carry its use on the
   * plan; the day the ring completes, the land is designated without pending. Null ⇒
   * the completed plot pends and asks, exactly as SIM 10 built it.
   */
  fieldUse: FieldUse | null;
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
  /**
   * THE HAUL (SIM 17; became LABOR in SIM 39). `haul` is the ROAD this wall's stone
   * travels — its two ends and the terrain against it, frozen at plan time from what
   * only the boundary can see. NULL means the stone is won underfoot ('local') — no
   * carry, the masons draw the pile directly, exactly as in SIM 16 — and every timber
   * wall is local too (the woodpile needs no road).
   *
   * SIM 39 replaced the frozen `haulRate` here: a rate cannot be re-read when the
   * player lays a ROAD across it, and the boss ruled the mechanic to be worker-speed
   * ("if the workers are moving faster the bricks reach their destination quicker").
   * So the boundary freezes the FACTS and the sim does the labour — see carryRate().
   *
   * `faceBuffer` is the won stone standing AT the face, not yet laid: the CARRIERS
   * fill it (never past what the wall still needs), LAY draws it a block at a time.
   */
  haul: HaulRoute | null;
  faceBuffer: number;
  /**
   * THE LIFT (SIM 26): a GREAT WHEEL has been raised for this wall — a timber
   * treadwheel crane that relieves the height penalty on its upper courses. Set true
   * the first time the wall climbs past the free reach WITH the timber to build one
   * (it draws WHEEL_TIMBER); stays raised. Absent in old logs ⇒ false, byte-identical.
   */
  wheel: boolean;
  /**
   * THE DRESS LEVEL (SIM 18), frozen at plan time: how finely this wall's stone
   * is worked (DRESS_LEVELS). Sets the LAY DEBT (mason-days per stone, DRESS_SPEC)
   * and the per-stone DRAW from the pile/face (DRESS_DRAW) — so an ashlar wall
   * lays slow and carts heavy, a rubble wall flies up light. Absent in old
   * logs/saves ⇒ 'scappled' at plan time (the SIM-16/17 cost), byte-identical.
   */
  dressLevel: DressLevel;
  // (SIM 32's opt-in `rollers` flag RETIRED in SIM 39 — the boss's ruling replaced the
  //  toggle with a road you draw: the way IS the rollers, laid where you choose.)
}

/**
 * THE ROAD a wall's stone travels (SIM 39) — frozen at the command boundary, which alone
 * holds the surface, the water and the beds. The sim replays these facts and never sees
 * the terrain that produced them; what it computes from them is LABOUR (carryRate()).
 *
 * Why facts and not a rate: a rate cannot answer the question the boss's ruling asks. If
 * the player lays a WAY across this road a year from now, the carriers must get faster —
 * so the sim has to be able to re-cost the journey, which means it needs the journey.
 */
export interface HaulRoute {
  /** the pile the carriers load at: the nearest place the land affords dry winnable post */
  from: Vec2;
  /** the face they carry to: the centre of the work at plan time */
  to: Vec2;
  /** metres the stone must CLIMB from pile to face — hauling uphill costs the hands dear */
  climb: number;
  /**
   * the route's detour multiplier. The Wear is a MOAT (PROPOSAL-LOGISTICS §4.1: "cost the
   * ROUTE, not straight-line"): a road that must cross the gorge goes round by a bridge, so
   * Durham's historical optimum — quarry the peninsula's own post — falls out of the
   * geometry with zero scripting. 1 for an honest overland road.
   */
  detour: number;
  /** the field-guide word for the journey (HAUL_METHODS) — what the bottleneck line names */
  method: HaulMethod;
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
  stoneWon: boolean; // one-shot: completion events + the worked-out render cue (stone FLOWS per person-day since SIM 35)
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
  stoneWon: boolean; // one-shot: completion events + the worked-out render cue (stone FLOWS per person-day since SIM 35)
}

/**
 * THE BELL PIT (SIM 15, the method ladder's third rung) — a narrow vertical shaft sunk to
 * a shallow seam and worked outward at the bottom until the roof threatens, then abandoned
 * for a fresh sinking nearby. It reaches DEEPER dry post than an open cut (a shaft moves far
 * less overburden than a hole) but stays ABOVE the water table (no pump) and is WASTEFUL (a
 * resink penalty on the yield — pillars left, frequent re-sinking). The flat-ground answer
 * where the adit has no hill. Like the quarry and the adit, its economics are frozen at the
 * command boundary; the sim core stays bed-model- and water-free.
 */
export interface BellPitPlan {
  id: number;
  at: Vec2; // the shaft mouth, site-local metres (a bell pit is a POINT, not a ring)
  depth: number; // metres the shaft sinks — the dry reach, frozen from the water table + overburden
  workTotal: number; // person-days to sink + work, MATERIAL-AWARE, frozen from the bed model
  workDone: number;
  stoneTotal: number; // m³ of building stone won (generous yield, less the resink penalty), frozen
  stoneWon: boolean; // one-shot: completion events + the worked-out render cue (stone FLOWS per person-day since SIM 35)
}

/**
 * THE SHAFT-AND-PUMP (SIM 15, the method ladder's FOURTH and last rung). A deep shaft with
 * continuous DEWATERING — the only method that beats the water table, winning DROWNED post the
 * open cut, adit and bell pit can't. The pump is not free: the drowned depth carries a PUMP TAX
 * baked into workTotal (the crew pumps while they sink). Reaches deeper than the bell pit. Like
 * every working, its economics are frozen at the command boundary; the sim core stays water-free.
 * (Availability is ungated for now — a later tech gate, per PROPOSAL-THE-METHOD-LADDER §3, is a
 * trivial condition on the tool, not a change to this mechanic.)
 */
export interface ShaftPlan {
  id: number;
  at: Vec2; // the shaft mouth, site-local metres (a point, like the bell pit)
  depth: number; // metres the shaft sinks — deep, past the water table (it pumps)
  workTotal: number; // person-days to sink + PUMP, MATERIAL-AWARE + the drowned pump tax, frozen
  workDone: number;
  stoneTotal: number; // m³ of dewatered building stone won (generous yield), frozen
  stoneWon: boolean; // one-shot: completion events + the worked-out render cue (stone FLOWS per person-day since SIM 35)
}

/**
 * THE TIMBER WAY (SIM 38) — a causeway of timber the crew lays across the ground so the
 * stone travels it faster. The player DRAWS it (an open polyline, like a wall), the road
 * hands PAVE it plank by plank from its head, and it draws TIMBER as it lays — the woods'
 * customer after the great wheel, and the first renewable spent on logistics.
 *
 * The fiction is research-bounded (DIGEST-2026-07-16): a timber causeway the SLEDGE rides
 * is honestly medieval (Ely 1071, Berlin 1238; greased baulks moved 40-tonne blocks).
 * Wheels-on-rails and conveyor belts are post-1500 and stay out — the boss's "conveyor
 * belt" named the FEEL he wanted (rapid, along a pre-planned path), and the causeway
 * delivers that feel without the anachronism.
 *
 * Laid from the HEAD, incrementally (the VISIBLE WORK arc's own law — nothing credits in a
 * lump): `builtLength = length × workDone/workTotal`, and only the built prefix is road.
 * You watch the way creep toward the quarry and the haul quicken as it goes.
 *
 * In SIM 38 NOTHING READS THIS: the way is drawn, paved, and rendered, and haul is
 * untouched. SIM 39 gives it its bite.
 */
export interface WayPlan {
  id: number;
  points: Vec2[]; // the drawn polyline, site-local metres — an open run, like a wall
  length: number; // m of route, frozen at the boundary (the sim never re-walks the terrain)
  timberTotal: number; // m³ of timber the whole way draws, frozen from length
  timberLaid: number; // m³ actually drawn from the stock so far — paving STALLS when the woodpile is dry
  workTotal: number; // person-days to pave it, frozen from length
  workDone: number;
  /**
   * WHAT THIS ROAD IS WORTH (SIM 39): a metre of this way's BUILT prefix costs a carrier
   * 1/speedMult metres of effort. FROZEN AT THE BOUNDARY from the ground the run crosses —
   * WAY_MULT_FIRM over hard dry ground (planks on rock, near worthless) up to WAY_MULT_SOFT
   * across bog (the difference between a road and no road). The evidence is unanimous that
   * this is a property of what the road REPLACES, not of the road (DIGEST-2026-07-17 §2), and
   * that makes the way one more thing the land decides — draw it where the ground is bad.
   * Absent in a SIM-38 way ⇒ WAY_MULT_FIRM (the conservative floor; such saves are refused
   * anyway by the version guard, but the floor keeps the default honest).
   */
  speedMult: number;
}
/**
 * m³ of timber per metre of causeway. A way is a corduroy/plank road roughly 2 m wide on
 * transverse baulks; 0.06 m³/m ≈ a 2 m × 0.03 m plank bed per metre — modest, because the
 * point of the way is that it is AFFORDABLE enough to be worth drawing. A by-eye GAME
 * CHOICE calibrated to the woodpile the settlement actually holds (SEED_TIMBER 30, a cant
 * yields a few m³), NOT a sourced figure — labelled, per the house rule.
 */
export const WAY_TIMBER_PER_M = 0.06;
/** person-days to pave one metre of way — laying baulks + planks. By-eye game choice. */
export const WAY_WORK_PER_M = 0.04;
/** m — shorter than this is a gesture, not a road (the boundary refuses it) */
export const WAY_MIN_LENGTH = 8;

/**
 * THE WOODS (SIM 19). Timber is won by FELLING, spent by BUILDING, and REGROWN on
 * a rotation — the generational heart. Numbers are GENEROUS, like the quarry yield
 * (boss directive: production rewards great works), so the loop is forgiving.
 */
export const TIMBER_PER_TREE = 1.0; // m³ of timber a mature render-tree yields when felled (generous)
/**
 * The timber one wood-wall unit (a post) draws from the stock — the palisade's
 * real cost since SIM 19. Reuses STONE_VOLUME's exact-dyadic bit pattern (product
 * of fixed constants → one value on every engine; plain subtraction is IEEE-exact,
 * so the draw never threatens the cross-engine hash), a small generous cost.
 */
export const TIMBER_PER_POST = STONE_VOLUME;
export const FELL_TREES_PER_DAY = 12; // trees a laborer fells in a person-day (sets workTotal)
export const REGROWTH_TICKS = 7 * TICKS_PER_YEAR; // the coppice rotation — ~7 years to a re-cut
export const SEED_TIMBER = 30; // the founder's woodpile: a first palisade before the first fell

/**
 * A STAND (SIM 19): a managed cant of woodland, felled for timber and REGROWING on
 * a rotation. `plan_fell` freezes its mature timber (`timberTotal`) and felling
 * cost (`workTotal`) from the tree model at the boundary — so the sim core stays
 * tree-free and the save is self-contained, exactly as the quarry freezes from the
 * bed model. Laborers fell it like a quarry is dug; on the day it is felled
 * through, TIMBER is credited to the global stock and the stool begins to regrow.
 * Felling is NOT death: once regrown (feltTick + REGROWTH_TICKS), the mature stand
 * is re-fellable (the `fell` command), the same yield again — the coppice-as-crop.
 */
export interface Stand {
  id: number;
  points: Vec2[]; // the cant ring, site-local meters
  timberTotal: number; // m³ won at a full fell (generous), frozen from the tree model
  workTotal: number; // person-days to fell, frozen from the tree count
  workDone: number; // felling progress on the current cut
  /**
   * The crew is actively cutting this stand now (workDone climbs to workTotal).
   * True from plan_fell / a `fell` re-cut until the cant is felled through.
   */
  felling: boolean;
  /**
   * -1 while the crop STANDS (virgin, or regrown and mature — ready to fell). Set
   * to the tick on the day the cant is felled through; the stool is then regrowing
   * and matures again at feltTick + REGROWTH_TICKS, whereupon it resets to -1. The
   * phase is derived: `felling` → being cut; else `feltTick >= 0` → regrowing; else
   * mature. You cannot cut what has not grown (a `fell` on a regrowing stand rejects).
   */
  feltTick: number;
}

/**
 * THE LIVING YEAR (SIM 20 — PROPOSAL-THE-LIVING-SETTLEMENT §3 + §4). People age,
 * die, are born, arrive and leave; the harvest decides how many there are. Every
 * number here is an ORDER-OF-MAGNITUDE knob (§11 dating flags), tuned by the
 * headless century-sweep, never a citation.
 */
export const ADULT_AGE = 15; // years: a child lifts no stone until it comes of age
export const FOUNDER_AGE = 22; // years: the founding party begins as young adults

/**
 * Per-YEAR probability of death, by the age band the person falls in (1200s-honest
 * order of magnitude: survive to adulthood and expect ~50; the productive window is
 * ~25–35 years). Children share the youngest rate. Staggered from commit one via
 * FOUNDER_AGE's seeded spread — the verified cohort-death-wave failure (Banished).
 */
export const MORTALITY_BANDS: readonly { untilAge: number; annual: number }[] = [
  { untilAge: 45, annual: 0.008 }, // young + prime adult — death is rare
  { untilAge: 55, annual: 0.03 }, // the body slows
  { untilAge: 65, annual: 0.08 }, // old
  { untilAge: Infinity, annual: 0.2 }, // the last years
];

/**
 * THE HARVEST (§4): food is SPACE-gated and EASY (boss). Food CAPACITY, in mouths,
 * is a founding floor (stores + foraging, before any field) plus enclosed arable
 * AREA over AREA_PER_PERSON. The binding constraint is FLAT ARABLE LAND, contested
 * with the quarry, the woods and the great work — a land tension that suits a
 * map-drawing builder. GAME-scaled, not the literal ~5-acre virgate (drawn fields
 * are small), so a modest farm feeds several — "easy, hindered mostly by space".
 */
export const AREA_PER_PERSON = 200; // m² of enclosed arable that feeds one mouth
// SIM 36: the founding party is 13 (boss: "the town should start off with 13 people" — the
// extra labor mines and hauls), so the founding floor feeds them: wagon stores + the commons
// around a new-founded settlement. Re-verified by the century-sweep (don't tune by eye).
export const FOUNDING_CAPACITY = 13; // the base yearly harvest, in mouth-years, before any field
// THE ORCHARD BEARS (SIM 29): fruit, nuts and cider are a SUPPLEMENT to the grain staple, so an orchard
// feeds fewer mouths per m² than arable — more land for the same food. A settlement that plants orchards
// broadens its food base beyond the one crop the weather can fail.
export const ORCHARD_AREA_PER_PERSON = 300; // m² of orchard that bears one mouth's food (< arable's yield)

/**
 * THE GRAIN STOCK (SIM 22): the harvest is no longer an instantaneous ratio — grain is
 * PRODUCED each year (the base + the arable, times the weather), EATEN by the mouths,
 * and the surplus STORED up to the granaries' cap. A granary is the STORE: it holds this
 * many mouth-years of grain beyond a bare settlement's own larder, and in a lean year
 * that buffer is DRAWN DOWN to hold off hunger. So the granary's population lever is now
 * emergent and honest — it does not grow food, it carries the fat years into the lean, so
 * a buffered village survives the bad harvests that would thin an unbuffered one. The
 * numbers the century-sweep tunes.
 */
export const FOUNDING_STORAGE = 8; // mouth-years a bare settlement keeps (scaled to the 13-soul founding, SIM 36)
export const GRANARY_STORAGE = 10; // mouth-years each built granary adds to the store
export const SEED_GRAIN = 8; // the founder's starting larder (a full base store)

/**
 * The harvest varies year to year with the WEATHER — a multiplier on production drawn on
 * the demographic year's OWN rng stream (never state.rng, so it can't shift the masonry).
 * Mean ~1.0; a lean year bites, a fat year fills the store. This variance is what makes
 * the granary buffer MATTER: with a fixed harvest a stock just fills to cap and sits. These are the BOUNDS;
 * SIM 31 draws the year's weather as the MEAN of two uniform rolls over them — a triangular distribution
 * peaked at the midpoint, so the extremes are approached but rarely reached (see livingYear §2).
 */
export const WEATHER_MIN = 0.7;
export const WEATHER_MAX = 1.3;

/**
 * THE CART (SIM 23): the woods' first payoff. A CARPENTER'S YARD (a BuildingKind) keeps a
 * cart, and the cart's job is to carry the harvest surplus from the fields to the granary.
 * How much surplus reaches the store each year is THROUGHPUT-limited: a bare settlement
 * hand-carries only BASE_HAUL mouth-years; each maintained cart adds CART_HAUL more. So a
 * granary without carts fills SLOWLY (the surplus a bare larder can't carry in time spoils),
 * and carts are what actually FILL it — granary = how much you can KEEP, cart = how fast you
 * fill it. A cart draws CART_UPKEEP timber a year to stay in repair (wheels, axles): the
 * woods feed the carts feed the granary feed the people — the first renewable-into-renewable
 * loop. Run the woodpile dry and the carts sit idle. Numbers the century-sweep tunes.
 */
export const BASE_HAUL = 2; // mouth-years of surplus hand-carried to the store each year (no cart)
export const CART_HAUL = 6; // extra mouth-years each maintained cart carries a year
export const CART_UPKEEP = 2; // m³ timber a cart draws a year to stay in repair
// THE HORSE HAULS (SIM 29): a PASTURE keeps a draft horse, and a horse moves more grain than a hand-pushed
// cart — sledge, pannier or shaft. It grazes free on its own field, so unlike the cart it draws no timber
// upkeep; the pasture IS its keep. Each pasture adds this to the year's haul capacity.
export const HORSE_HAUL = 8; // extra mouth-years each pasture's draft horse carries to the store a year

/**
 * The surplus ratio S = the year's HARVEST (produced) / mouths sets the demographic
 * weather. GROWTH (births + migrants) tracks S — the FIELDS' abundance, the sustainable
 * signal, so a settlement never breeds off its hoard. HUNGER is gated separately, on the
 * POST-BUFFER ratio (produced + grain drawn from the store): a granary with grain to
 * spend holds off the emigration a lean year would otherwise force. So below 1.0 a village
 * THINS only if its store can't cover the gap; 1.0–1.25 HOLDS; at/above GROWTH_THRESHOLD
 * it GROWS, ramping to full by GROWTH_FULL. The boss opened at 2×; 1.25 makes growth a
 * deliberate over-plant while a comfortable hold band never punishes breaking even.
 * Two speeds, both: MIGRANTS the fast valve (working adults this year), BIRTHS the
 * slow (a lineage that lifts no stone for ~15 years). Knobs for the sweep.
 */
export const GROWTH_THRESHOLD = 1.25; // S at/above which MIGRANTS are drawn (the fast valve)
export const GROWTH_FULL = 1.5; // S at which births + migration are at full tilt
export const MIGRANTS_PER_YEAR_FULL = 2; // adults drawn per year at full-tilt surplus (FAST)
/**
 * BIRTHS are the CONTINUOUS valve — unlike migration they scale from a floor, so a
 * HOLD-band settlement (S ~1.0–1.25) roughly REPLACES its dead (births ≈ deaths, no
 * death-spiral), a surplus grows it, and hunger (S < BIRTH_FLOOR_S) suppresses it.
 * The per-adult chance ramps clamp((S − BIRTH_FLOOR_S)/(GROWTH_FULL − BIRTH_FLOOR_S))
 * × BIRTH_RATE_FULL.
 */
export const BIRTH_FLOOR_S = 0.9; // below this surplus, fertility collapses toward zero
export const BIRTH_RATE_FULL = 0.2; // births per adult per year at full tilt (a lineage)
export const HUNGER_LEAVE_RATE = 0.12; // fraction who emigrate per year of hunger (S < 1.0)

/**
 * THE SPECIALIZATION PYRAMID (SIM 24, 3c): a settlement VARIED enough — this many
 * distinct productive tenants + workshops (farm / livestock / pasture / orchard /
 * blacksmith / carpentry; fallow doesn't count) — and populous enough to spare a
 * hand from the fields, draws a SPECIALIST to a workshop it holds. The first is the
 * SMITH, drawn to a blacksmith. The trade is as permanent as the base you keep under
 * it: a smith stays for life and never leaves in hunger, but a NEW one is only ever
 * drawn while the base holds — so lose the smithy or the variety and the trade dies
 * out with the last master, and rebuild the base and it returns. One smith per smithy.
 */
export const VARIETY_FOR_SMITH = 3; // distinct tenants + workshops before a smith is drawn
export const SMITH_MIN_POP = 6; // souls before the settlement can spare one for a trade

/**
 * THE FIRST TECHNIQUE (SIM 27): the smith's PRODUCTION EFFECT — the payoff of the
 * specialization pyramid. A smith at the forge keeps the crew's edge tools (the mason's
 * chisel, the carpenter's adze) sharp and tempered, and sharp irons DRESS and LAY stone
 * faster. Each smith present relieves the mason's lay debt by SMITH_DRESS_RELIEF, saturating
 * at SMITH_RELIEF_MAX — a conservative claim: tools speed the work, they never do it, so the
 * relief can never drive a stone to lay itself. With no smith the factor is exactly 1, and the
 * 200-tick canon (no smith drawn until the first reckoning at tick 364) never enters the relief.
 */
export const SMITH_DRESS_RELIEF = 0.15; // each smith cuts the lay debt by this fraction
export const SMITH_RELIEF_MAX = 0.3; // but the crew's smiths together can speed it no more than this

/**
 * HOUSING QUALITY (SIM 25, step 4): a house is a HOVEL, a COTTAGE, or a HALL — its TIER
 * read from its floor and its roof (size sets the base; a mean roof, thatch or none,
 * knocks a grand floor down a notch, for a great hall needs both the room AND a fine roof
 * over it). Better housing SHELTERS more and HOLDS its people: a well-housed settlement
 * loses far fewer souls to a hard year. What you build for your people is legible in the
 * roofline, not just the count. (Shelter as a hard growth CAP is a later, tuned bump; today
 * its effect is retention.)
 */
export const COTTAGE_AREA = 30; // m² of floor: at/above this a house is a cottage, not a hovel
export const HALL_AREA = 80; // m²: at/above this, with a fine roof, it is a hall
export const FOUNDING_SHELTER = 13; // souls the founders' first roofs shelter (the 13-soul founding, SIM 36)
export const HOVEL_SHELTER = 3;
export const COTTAGE_SHELTER = 6;
export const HALL_SHELTER = 12; // souls each tier houses
export const RETENTION_MAX = 0.6; // a fully-housed settlement loses this fraction fewer to hunger
// SHELTER GATES GROWTH (SIM 30): the settlement grows only while it has ROOM to house more. Growth (births +
// migrants) rides a factor that is full while the shelter comfortably exceeds the mouths and tapers to zero as
// the mouths approach it — but with this much SLACK above the current shelter, so a founding hamlet on its
// first roofs (FOUNDING_SHELTER) still grows to ~FOUNDING_SHELTER + SHELTER_GROWTH_SLACK before it must build
// houses. Conservative for now; raise it to soften the gate, lower it to bite sooner.
export const SHELTER_GROWTH_SLACK = 6; // souls of growth headroom above the current shelter

/**
 * THE LIFT (SIM 26, step 5 — the final course): a stone laid high up costs more of the
 * mason's day than one laid at the foot, for the block must be RAISED. Courses up to
 * LIFT_FREE_COURSES are free (a hand can lift to shoulder height); above that the lay
 * debt grows LIFT_PER_COURSE per course. A GREAT WHEEL — a timber treadwheel crane —
 * relieves it: the first time a wall climbs past the free reach WITH the wood to raise
 * one, it draws WHEEL_TIMBER and cuts the penalty to WHEEL_RELIEF of itself thereafter.
 * So the wall reaches higher, faster, at the price of the woods — the generational
 * factory's last gear. (Wood palisades are set, not stacked, and take no lift.)
 */
export const LIFT_FREE_COURSES = 6; // courses a hand raises unaided (~1.5 m, at 0.25 m/course)
export const LIFT_PER_COURSE = 0.05; // extra lay-debt fraction per course above the free reach
export const WHEEL_TIMBER = 8; // m³ a great wheel draws to be raised for a wall
export const WHEEL_RELIEF = 0.25; // the wheel cuts the height penalty to this fraction
// ─── THE CARRY (SIM 39): what one road hand moves in a day ───────────────────────────────
// The chain is WIN (diggers) → CARRY (carters) → LAY (masons), and every link is people now.
// A carrier's day is trips: load at the pile, walk the route, put down at the face, walk back
// empty. The empty walk back is half the day and cannot be wished away — it is why a SHORT
// haul is worth so much more than a fast one, and why the road is drawn where the stone is.
//
// ★ THE UNIT IS THROUGHPUT, NOT PACE — and that is the RESEARCH's correction, not a convenience
// (DIGEST-2026-07-17 §1; Griffin/Roberts/Kram, J. Appl. Physiol. 2003, VERIFIED). Loaded and
// unloaded humans walk at nearly the same speed: the metabolic cost curve minimises at ~1.3 m/s for
// ALL loading conditions, and carrying 30% of body mass costs +47% METABOLIC RATE, not pace. A
// causeway cannot make a hand WALK faster. So a hand-day is a budget of m³·m — stone moved times
// metres moved — and the road buys throughput, which the evidence supports at 3–6×, rather than
// speed, which it caps near 1.2×. The first draft of this constant was a LOAD (m³/trip) times a
// RANGE (m/day) and called the load research-anchored; the verification pass found NO source for a
// medieval per-trip hod/barrow load, so the two collapsed into this one honest number rather than
// keep an invented one. A LABELLED GAME CHOICE — nothing here is sourced but the unit and the shape.
//
// CALIBRATION: 240 makes one carter on a 120 m bare road deliver 240/(2×120) = 1.0 m³/day — almost
// exactly one mason's daily appetite (~30 stones × DRESS_DRAW ≈ 1 m³). So an ordinary hauled wall
// splits its crew about half to the road and half to the wall: precisely the half-and-half the
// Course-2 theater had been MIMING before the sim believed it. The theater was right all along.
export const CARRIER_THROUGHPUT = 240; // m³·m of stone one hand moves in a working day

// ─── WHAT A WAY IS WORTH (SIM 39) — a property of the GROUND IT CROSSES ──────────────────
// ★ The second research correction (DIGEST-2026-07-17 §2). The first draft gave the way a flat
// global ×3. THREE independent evidence lines refuse that, and converge instead on a SPAN whose
// value is set by what the road replaces:
//     firm dry ground  1.0–1.2×   (Baker 1914 Table 8: plank 30–50 vs earth 50–200 lb/ton, so a
//                                  DRY HARD earth road is already as good as planks; Mairs 1902's
//                                  measured wagon: 69 vs 57 lb/ton = 1.2×)
//     ordinary earth   ~3×        (Baker midpoints 3.1×; Mairs wet sod 3.0×)
//     mud/soft/plowed  4–7×       (Mairs plowed 4.4×; Baker worst-earth/best-plank 6.7×)
//     marsh/fen        impassable (Ely 1071 — the causeway is the ONLY road)
// So a causeway over firm dry ground is very nearly a WORTHLESS investment — and that is the better
// mechanic, because it is this game's own thesis: the land decides, and reading it is the game. The
// per-way multiplier is frozen at the boundary from the ground the run crosses (the boundary alone
// holds the water model, whose depth-to-surface is the honest proxy for soft ground).
// NOT MODELLED (and the digest says why): the LUBRICANT. Ungreased wood-on-wood is μ 0.25–0.7 —
// about bare ground (Fall et al., PRL 112, 175502, 2014) — so it is the TALLOW that buys the
// slipway's 3–6×, not the timber. Tallow as a consumable (animal fat → the reserved herds) is this
// arc's strongest follow-on, recorded in the digest, deliberately not built here.
export const WAY_MULT_FIRM = 1.15; // a way on hard dry ground: planks on rock, near worthless
export const WAY_MULT_SOFT = 5.0; // a way across bog: the difference between a road and no road
// ⚠ THE WAY-WORTH READOUT (SIM 42) CAUGHT THIS. depth-to-water is the softness proxy: shallow =
// wet ground (a road earns its keep), deep = firm dry ground (planks on rock). The SIM-39 value
// (3 m) INVERTED the digest's own bands — it made FIRM the default (any ground with the table >3 m
// down read ×1.15), so on the real Durham terrain, whose MEDIAN depth-to-water is 13.5 m, a
// causeway was near-worthless EVERYWHERE and the whole Course-4 tool was inert on the map. The
// evidence (DIGEST-2026-07-17 §2) says ORDINARY earth is already ~3× and only genuinely hard-dry
// ground is ~1.15. So this is re-anchored to the MAP's own typical ground: at Durham's median
// depth (13.5 m) the mult now lands ~3.0 (ordinary earth, per the evidence); the wet quarter climbs
// toward 5 (a real road); only the driest ridges (past this depth) fall to firm 1.15. Calibrated to
// the terrain + the evidence, not by eye.
export const WAY_DRY_DEPTH = 26; // m of depth-to-water at which ground reads FULLY firm/dry
/**
 * A causeway's worth at ONE point, from the depth to the water table there (SIM 39, re-anchored
 * SIM 42): shallow = wet ground a road earns its keep on (→ WAY_MULT_SOFT), deep = firm dry ground
 * a road barely helps (→ WAY_MULT_FIRM at WAY_DRY_DEPTH and beyond). The boundary averages this
 * along the drawn run. Pure fn of the depth — extracted so a TEST can pin the evidence's bands
 * (ordinary earth ~3×, firm ~1.15, bog ~5) against the SIM-39 re-inversion that shipped once and
 * was caught only by the live map, not a test (DIGEST-2026-07-17 §2). depthToWater < 0 (a flooded
 * cell) clamps to the wettest.
 */
export function wayMultForDepth(depthToWater: number): number {
  const dry = Math.max(0, Math.min(WAY_DRY_DEPTH, depthToWater));
  const soft = 1 - dry / WAY_DRY_DEPTH; // 1 = fen, 0 = hard and dry (past WAY_DRY_DEPTH)
  return WAY_MULT_FIRM + soft * (WAY_MULT_SOFT - WAY_MULT_FIRM);
}
/**
 * Haul-route metres ADDED per metre the stone must climb to the face — hauling UP is dear.
 * Carried over from SIM 17's boundary (where it was by-eye and already live) into the sim,
 * because the sim does the route arithmetic now. Still by-eye; still labelled.
 */
export const HAUL_UPHILL_PER_M = 14;

export type HouseTier = 'hovel' | 'cottage' | 'hall';

/** A house's tier from its floor area and roof — the shared sim/render derivation. */
export function houseTier(area: number, roof: BuildingRoof): HouseTier {
  const bySize: HouseTier = area >= HALL_AREA ? 'hall' : area >= COTTAGE_AREA ? 'cottage' : 'hovel';
  if (roof !== 'none' && roof !== 'straw') return bySize; // a fine roof keeps the size-tier
  // a mean roof (thatch or open) knocks the tier down one notch
  return bySize === 'hall' ? 'cottage' : 'hovel';
}

/** Souls a house of this tier shelters. */
export function tierShelter(tier: HouseTier): number {
  return tier === 'hall' ? HALL_SHELTER : tier === 'cottage' ? COTTAGE_SHELTER : HOVEL_SHELTER;
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
export const FIELD_USES = ['farm', 'livestock', 'pasture', 'orchard', 'fallow'] as const;
export type FieldUse = (typeof FIELD_USES)[number];

/**
 * What a designated shell is FOR (boss canon 2026-07-10). The lord's word,
 * not the footprint's — the mason's vernacular reading (classify.ts) stays
 * advisory. Constant strings; they enter hashed state via Building.kind.
 */
export const BUILDING_KINDS = ['house', 'blacksmith', 'tower', 'tavern', 'granary', 'carpentry'] as const;
export type BuildingKind = (typeof BUILDING_KINDS)[number];

/** A designated field enclosure — the plot its lord put to a use. */
export interface Farm {
  id: number;
  wallId: number;
  /**
   * The plot's use: farm (arable, tended), livestock (a sheep paddock), pasture (a horse
   * paddock), orchard (fruit), or fallow (rested). The two new tenants (SIM 24, 3c) are
   * VARIETY: a settlement mixed enough raises a specialist (3c-ii). Only 'farm' is arable;
   * their own produce (orchard fruit, horse haulage) is a later effect bump.
   */
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

/**
 * THE SKILL SYSTEM's job taxonomy (SIM 36 — boss decree 2026-07-16: "after a year of
 * doing a job they gain a basic level of skill in it"): the four labor skills, one per
 * verb group the sim actually runs. Skill is a DISCRETE band read off integer days
 * worked (the roadmap's anti-XP law — never a curve): a year of the work makes a hand
 * GREEN at it. Journeyman/master stay Beat 4's (the apprentice bond, boss-reserved),
 * and TECHNIQUES remain a separate, bond-borne layer — practice never grants one.
 */
// SIM 38 adds the CARTER — the road's own trade. A carter PAVES the timber way and (SIM 39) DRIVES
// it, carrying won stone from the pile to the wall's face: one groove for the whole road, so a year
// on it greens both halves of the work. This is the substrate the Carter surname always wanted.
export type JobSkill = 'mason' | 'digger' | 'woodsman' | 'farmhand' | 'carter';
export const JOB_SKILLS: readonly JobSkill[] = ['mason', 'digger', 'woodsman', 'farmhand', 'carter'];
// THE SKILL LADDER (SIM 36 green; SIM 43 the rest — Beat 4, boss-ruled 2026-07-17). Discrete bands
// off integer days WORKED at a job (the anti-XP law — never a curve). Low mastery comes to anyone who
// works the task enough (green, journeyman); a MASTER is the long, generational climb (~10 years),
// and mastery makes the work MUCH FASTER — an accelerating ladder, each rung a bigger step than the
// last. Untrained hands still work fine (1.0, no penalty — SIM 36's law holds). Dyadic-exact
// multipliers (÷8, ÷4, ÷2 — one bit pattern on every engine, no cross-engine hash risk). The FELT
// "much faster" is bounded here to keep the economy stable; a master's rarer rewards — the losable
// TECHNIQUE and the fine WORKS only a master can raise (noble's quarters, the Keep) — are the later
// Beat-4 increments, and carry the deeper stakes. Reaching master in ONE trade is naturally rare
// (mortality + the dawn pass's job-switching), and lineage (a later increment) makes it run in
// families.
export const GREEN_DAYS = TICKS_PER_YEAR; // ~1 year — competent, common
export const JOURNEYMAN_DAYS = 4 * TICKS_PER_YEAR; // ~4 years — skilled, and ready to be a master's apprentice
export const MASTER_DAYS = 10 * TICKS_PER_YEAR; // ~10 years — the rare, generational climb
export const GREEN_MULT = 1.125; // ×9/8 — a BONUS over today's rates (untrained = 1.0)
export const JOURNEYMAN_MULT = 1.25; // ×5/4
export const MASTER_MULT = 1.5; // ×3/2 — "much faster" (dyadic; the ladder accelerates 1.125 → 1.25 → 1.5)

/**
 * Per-job base day rates (SIM 36): the old Person.pace was ONE scalar whose unit was
 * the trade (stones/day for masons, m³/day for laborers) — a generalist can't reuse
 * it. Every villager now works every job at a per-JOB base rate scaled by their
 * inherent VIGOR (one creation draw), times the job's skill band multiplier.
 */
export const LAY_RATE_BASE = 24; // stones laid/day at vigor 0 (the old mason floor)
export const LAY_RATE_SPREAD = 12; // + vigor × this (the old 24–36 range)
export const EARTH_RATE_BASE = 3; // m³ of loose earth moved/day at vigor 0 (the old laborer floor)
export const EARTH_RATE_SPREAD = 2; // + vigor × this (the old 3–5 range)
/** m² of arable one hand tends per day — farm work is BOUNDED daily demand, so tending
 *  saturates and surplus hands fall through the ladder (it can never swallow the crew) */
export const FARM_AREA_PER_HAND = 500;

export interface Person {
  id: number;
  name: string;
  /**
   * Since SIM 36 every working soul is a VILLAGER — a generalist who lays, digs,
   * fells and tends by the day's assignment, skilled by doing (worked/GREEN_DAYS).
   * The SPECIALIST trades stand apart: the smith (SIM 24) is drawn by the base,
   * never made by practice, and neither digs nor lays.
   */
  trade: 'villager' | 'smith';
  /** inherent vigor 0..1 (one creation draw): scales every job's base rate */
  vigor: number;
  /**
   * Integer DAYS WORKED at each job — the skill biography (SIM 36). A day counts
   * only if the assignment produced at least one unit of real work (an honest
   * stall teaches nothing). At GREEN_DAYS the hand holds the job's GREEN band.
   * Also the surname-coalescence rider's substrate (a family whose digging
   * dominates for generations becomes the Delvers).
   */
  worked: Record<JobSkill, number>;
  /**
   * Yesterday's job (SIM 36) — deterministic stickiness in the dawn assignment
   * pass (ties go to the work you did yesterday, so hands settle into grooves
   * and actually accrue their year). Constant strings only; null = no groove yet.
   */
  lastJob: JobSkill | null;
  /**
   * The tick this person was born (SIM 20). Age in years = (tick − bornTick) /
   * TICKS_PER_YEAR. Founders begin ~FOUNDER_AGE (a seeded spread, so they do not
   * all die in one cohort wave); a child born in-game carries the current tick and
   * lifts no stone until it is ADULT_AGE. Negative for founders (born before tick 0).
   */
  bornTick: number;
}

/** the job's skill multiplier for this hand (SIM 36 green; SIM 43 the full ladder): 1.0 untrained,
 *  ×9/8 green, ×5/4 journeyman, ×3/2 master — read off integer days worked, highest band first */
export function jobMult(p: Person, job: JobSkill): number {
  const d = p.worked[job];
  if (d >= MASTER_DAYS) return MASTER_MULT;
  if (d >= JOURNEYMAN_DAYS) return JOURNEYMAN_MULT;
  if (d >= GREEN_DAYS) return GREEN_MULT;
  return 1;
}
/** the hand's skill BAND at a job (SIM 43) — the field-guide word, for the HUD/cards and for the
 *  Beat-4 layers (a MASTER holds the trade's technique + can raise its fine works). */
export type SkillBand = 'untrained' | 'green' | 'journeyman' | 'master';
export function skillBand(p: Person, job: JobSkill): SkillBand {
  const d = p.worked[job];
  if (d >= MASTER_DAYS) return 'master';
  if (d >= JOURNEYMAN_DAYS) return 'journeyman';
  if (d >= GREEN_DAYS) return 'green';
  return 'untrained';
}
/** stones this hand can lay in a day (the mason job) */
export function layRateOf(p: Person): number {
  return (LAY_RATE_BASE + p.vigor * LAY_RATE_SPREAD) * jobMult(p, 'mason');
}
/** m³ of earth this hand can move in a day, under the given job's skill */
export function earthRateOf(p: Person, job: JobSkill): number {
  return (EARTH_RATE_BASE + p.vigor * EARTH_RATE_SPREAD) * jobMult(p, job);
}

export type Command =
  | {
      kind: 'plan_wall';
      tick: number; // the tick at whose start this command applies
      points: Vec2[];
      height: number;
      /** absent in old logs/saves — defaults to 'sandstone' at the boundary */
      material?: Material;
      /**
       * THE ROAD this wall's stone travels, frozen at the boundary (SIM 17; became the
       * route's FACTS rather than its rate in SIM 39). Absent ⇒ an on-the-spot 'local'
       * wall that draws the pile directly (the SIM-16 path). Present ⇒ the two ends of
       * the journey plus the terrain against it — the sim core never sees the surface
       * that produced them, but it CAN re-cost the journey when a way is laid across it,
       * which is the whole reason a rate could not survive the boss's ruling.
       */
      haul?: { from: Vec2; to: Vec2; climb: number; detour: number; method: HaulMethod };
      /**
       * THE DRESS LEVEL (SIM 18), frozen at the boundary: a smart default from the
       * structure (low→rubble, tall→ashlar) or the player's override. Absent ⇒
       * 'scappled', so old logs replay byte-for-byte. A constant string; the sim
       * looks up its cost in the DRESS_SPEC / DRESS_DRAW constant tables.
       */
      dressLevel?: DressLevel;
      // (SIM 32's `rollers?` RETIRED in SIM 39 — replaced by the drawn way, per the boss's ruling.)
      /**
       * THE WORD AT THE PLOT (SIM 37, boss decree 2026-07-16): a building-class ring may
       * carry its ROOF and its TRADE on the plan itself — answered as it is drawn, no card
       * stop. Absent ⇒ unanswered ('none'), which never blocks: the shell builds bare and
       * the word can be given later (the game's first choose-later surface). On a
       * FIELD-class ring, `use` names the land the day the ring completes. Mismatched
       * words (a roof on a field ring, a use on a shell) reject with constant reasons.
       */
      roof?: BuildingRoof;
      buildingKind?: BuildingKind;
      use?: FieldUse;
    }
  | {
      kind: 'plan_fill';
      tick: number;
      points: Vec2[]; // polygon, ≥3 points
      height: number; // meters of fill above the highest sampled ground
      /** absent in old logs/saves — defaults to 'flat' at the boundary */
      shape?: 'flat' | 'ramp';
    }
  /**
   * THE CHEAT MENU (boss ask 2026-07-16, testing tool): cheats are COMMANDS, so the
   * log stays the whole truth and replay-equals-live holds even for a cheated world.
   * Settings-gated in the UI; the sim takes them from any log. Pure vocabulary — no
   * new state — so a canon with no cheats is byte-identical.
   */
  | {
      kind: 'cheat_give';
      tick: number;
      stone?: number; // m³ added to the stockpile
      timber?: number; // m³ added to the woodpile
      grain?: number; // mouth-years added to the store (capped by the granaries, like a harvest)
    }
  | {
      kind: 'cheat_spawn_person';
      tick: number;
      /** advisory spawn point for the diorama; the sim keeps no positions */
      at: Vec2;
    }
  | {
      kind: 'plan_roof';
      tick: number;
      points: Vec2[]; // ≥3 vertices, each resting on a FINISHED wall
      /**
       * SIM 37: the covering may be chosen as the span is drawn (the at-plot word).
       * Absent ⇒ UNCOVERED until designate_roof (the SIM 11 default, byte-identical
       * for old logs) — an uncovered deck is a legal state and nobody decks bare air.
       */
      material?: RoofMaterial;
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
      kind: 'plan_bell_pit';
      tick: number;
      at: Vec2; // the shaft mouth (a bell pit is a point)
      /**
       * Frozen at the command boundary: depth is the dry reach the shaft sinks to;
       * workTotal is material-aware person-days to sink + work; stoneTotal is the building
       * stone won, LESS the resink penalty (generous). All finite; depth/work/stone ≥ 0.
       */
      depth: number;
      workTotal: number;
      stoneTotal: number;
    }
  | {
      kind: 'plan_shaft';
      tick: number;
      at: Vec2; // the shaft mouth (a point)
      /**
       * Frozen at the command boundary: depth is how deep the shaft sinks (past the water
       * table — it pumps); workTotal is material-aware person-days to sink PLUS the drowned
       * pump tax; stoneTotal is the dewatered stone won (generous). All finite; ≥ 0.
       */
      depth: number;
      workTotal: number;
      stoneTotal: number;
    }
  | {
      kind: 'plan_way';
      tick: number;
      points: Vec2[]; // the drawn run, ≥2 — an open polyline, like a wall
      /**
       * THE TIMBER WAY (SIM 38), frozen at the command boundary (which alone holds the
       * surface): `length` is the route's metres ON THE GROUND — the boundary walks the
       * terrain so the sim core never has to; timberTotal + workTotal are its timber and
       * person-day cost, read off that length. All finite, > 0; NaN/Infinity arrive as
       * null from a save and are refused.
       */
      length: number;
      timberTotal: number;
      workTotal: number;
      /**
       * What the road is worth, frozen from the GROUND IT CROSSES (SIM 39, the research's
       * own correction): WAY_MULT_FIRM..WAY_MULT_SOFT. Absent ⇒ the conservative firm floor.
       */
      speedMult?: number;
    }
  | {
      kind: 'plan_fell';
      tick: number;
      points: Vec2[]; // the cant ring, ≥3
      /**
       * Timber economics FROZEN at the command boundary (where the tree model
       * lives): timberTotal is m³ of timber won at a full fell (generous), workTotal
       * is person-days to fell (from the tree count). Both finite, ≥ 0; NaN/Infinity
       * arrive as null from a save. The sim core never counts a tree.
       */
      timberTotal: number;
      workTotal: number;
    }
  | {
      kind: 'fell';
      tick: number;
      /** a MATURE stand (regrown, standing) to re-cut — the coppice's next harvest */
      standId: number;
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
  /** THE LIFT (SIM 26): a great wheel was raised for a wall climbing past the free reach */
  | { kind: 'wheel_raised'; tick: number; wallId: number; timber: number }
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
  /** a bell pit is marked out — the crew will sink + work it (SIM 15, the method ladder) */
  | { kind: 'bell_pit_planned'; tick: number; bellPitId: number; depth: number; workTotal: number }
  | { kind: 'bell_pit_complete'; tick: number; bellPitId: number }
  /** dry building stone won from a worked-out bell pit, credited to the stockpile */
  | { kind: 'bell_pit_stone_won'; tick: number; bellPitId: number; stone: number }
  /** a shaft is marked out — the crew will sink + PUMP it (SIM 15, method ladder rung 4) */
  | { kind: 'shaft_planned'; tick: number; shaftId: number; depth: number; workTotal: number }
  | { kind: 'shaft_complete'; tick: number; shaftId: number }
  /** dewatered building stone won from a worked-out shaft, credited to the stockpile */
  | { kind: 'shaft_stone_won'; tick: number; shaftId: number; stone: number }
  /** a timber way is drawn — the road hands will pave it, plank by plank (SIM 38) */
  | { kind: 'way_planned'; tick: number; wayId: number; length: number; workTotal: number }
  /** the way is paved to its far end — the whole run is road now (SIM 38) */
  | { kind: 'way_complete'; tick: number; wayId: number }
  /** a cant is marked for felling — the crew will fell it and win its timber (SIM 19) */
  | { kind: 'fell_planned'; tick: number; standId: number; timberTotal: number; workTotal: number }
  /** a mature stand is re-cut — the coppice's next harvest on the rotation */
  | { kind: 'fell_recut'; tick: number; standId: number }
  /** the cant is felled through: its timber is credited to the global stock */
  | { kind: 'timber_won'; tick: number; standId: number; timber: number }
  /** the stool has regrown — the stand is mature and fellable again */
  | { kind: 'stand_regrown'; tick: number; standId: number }
  /** THE LIVING YEAR (SIM 20): a child is born to the settlement — a lineage begins */
  | { kind: 'person_born'; tick: number; personId: number; name: string }
  /** a working adult arrives on the migration wind — word of a full granary spread */
  | { kind: 'person_arrived'; tick: number; personId: number; name: string }
  /** a named soul dies on the record — chronicled, never a bare subtraction */
  | { kind: 'person_died'; tick: number; personId: number; name: string; age: number }
  /** hunger drove a soul to leave for another manor */
  | { kind: 'person_left'; tick: number; personId: number; name: string }
  /**
   * THE SPECIALIST (SIM 24): a settlement varied enough drew a tradesperson to a
   * workshop it holds — the first is the smith, to the blacksmith.
   */
  | { kind: 'specialist_arrived'; tick: number; personId: number; name: string; trade: 'smith'; origin: 'apprentice' | 'migrant' }
  /**
   * THE GRAIN STOCK (SIM 22): the year's harvest reckoned — produced (weather-varied),
   * eaten by the mouths, and what stands in the store after (a lean year draws it down).
   */
  | { kind: 'harvest'; tick: number; year: number; weather: number; produced: number; eaten: number; stored: number }
  /** THE CHEAT MENU: stocks appeared by decree (logged, so replay carries the cheat too) */
  | { kind: 'cheat_given'; tick: number }
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
  /** bell pits being sunk into flat ground for deeper dry post (SIM 15, method ladder rung 3) */
  bellPits: BellPitPlan[];
  /** deep pumped shafts winning drowned post below the water table (SIM 15, method ladder rung 4) */
  shafts: ShaftPlan[];
  /** managed woodland cants, felled for timber and regrowing on a rotation (SIM 19) */
  stands: Stand[];
  /**
   * Timber causeways the crew is paving, or has paved (SIM 38). A way's BUILT prefix
   * (length × workDone/workTotal) is road: from SIM 39 a carrier whose route can ride it
   * moves WAY_SPEED_MULT times faster along it, so fewer hands are needed on the road and
   * more stand at the wall. Empty on the 2026-07-10 canon, which draws none.
   */
  ways: WayPlan[];
  /**
   * Building stone won from finished quarries and adits and not yet spent, m³
   * (SIM 14). Masonry DRAWS it since SIM 16: each stone laid spends its dress
   * level's draw (DRESS_DRAW — STONE_VOLUME for rubble/scappled, half again for
   * ashlar since SIM 18), and the masons stall when it runs dry — the honest
   * consumption loop the whole mining arc was for. It FLOWS in per person-day since
   * SIM 35; still one GLOBAL pile. Since SIM 39 the CARRY stage is people walking this
   * pile into each stone wall's per-wall faceBuffer (SIM 17 metered it at a frozen rate);
   * 'local' and timber walls draw the pile directly — no road, no carry — so the pile
   * remains the shared reservoir every link of WIN → CARRY → LAY meets at.
   */
  stockpile: number;
  /**
   * Timber won from felled stands and not yet spent, m³ (SIM 19) — the wood
   * analogue of the stone stockpile. Building with wood DRAWS it (TIMBER_PER_POST a
   * post) and the masons stall when it runs dry; felling a cant credits it. Seeded
   * with a founder's woodpile (SEED_TIMBER) so a first palisade stands before the
   * first fell. One GLOBAL stock, like the stockpile.
   */
  timber: number;
  /**
   * Grain in the settlement's store, in mouth-years (SIM 22). Each year's harvest is
   * PRODUCED, the mouths EAT one apiece, and the surplus is STORED here up to the
   * granaries' cap (FOUNDING_STORAGE + granaries × GRANARY_STORAGE); a lean year draws
   * it down to hold off hunger. One GLOBAL stock, like the stockpile and the timber.
   * Seeded with the founder's larder (SEED_GRAIN). Only livingYear touches it — once a
   * year — so it is inert on any run shorter than a year.
   */
  grain: number;
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
