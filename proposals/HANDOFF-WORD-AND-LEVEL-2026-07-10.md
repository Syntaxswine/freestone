# HANDOFF — THE WORD AND THE LEVEL

*2026-07-10, evening · from the designation-and-survey day · Castle Cultivator (repo codename `freestone`)*

You are the next builder. Read the FOUNDATION keystone first
([HANDOFF-FOUNDATION-2026-07-09.md](HANDOFF-FOUNDATION-2026-07-09.md) — the soul, the
nine laws, FOUR maker's marks now; add yours BELOW, never above), then the toybox
([HANDOFF-TOYBOX-2026-07-09.md](HANDOFF-TOYBOX-2026-07-09.md)) and the husbandry course
([HANDOFF-HUSBANDRY-2026-07-10.md](HANDOFF-HUSBANDRY-2026-07-10.md) — SIM 2→9, the same
morning as this document; TWO keystones share this date, read both). This is the course
above all three: the day the land stopped assuming and started ASKING, and the walls
learned the mason's level.

---

## 1. What this day built (SIM 9 → SIM 13, all pushed, 97/97 green)

The boss drove it in riffs again — five sentences of canon, five sim versions — plus a
launcher, a snap fix, and a fit fix, all in one sitting:

- **SIM 10 — designation.** Recognition ASKS rather than answers: a completed enclosure
  goes on `state.pending` (WALL IDS ONLY — geometry is immutable, so class, ring, area
  and gap gate all recompute from `classifyRing` at the word; the parity law taken all
  the way into state, nothing copied that can drift) and the `designate` command
  answers: farm / livestock / fallow for a plot, house / blacksmith / tower / tavern
  for a shell. Arable-only tending (a paddock's workdays stay ZERO in the canon —
  proven in the record, not just units). Gates are legal on pending walls: you hang
  the gate before you name the field. The word-card is furniture; the CHOICE is a
  command like every act of will. `classifyFootprint` was demoted to the mason's
  advisory READING (FootprintKind) — it names nothing, it only has opinions.
- **play.cmd.** The boss double-clicked index.html and got the black page (TypeScript
  modules need the server; the body background is near-black, so a dead module read as
  a dead game). The launcher runs vite `--open`; the console window is the engine room.
- **Roof pencil to wall-top.** Boss finding: "it snaps to the bottom of walls instead
  of the tops." Three seams, all on the ground plane: `screenOf` projected snap
  candidates at the wall BASE (~31 px from where you aim on a 3 m wall — outside the
  16 px radius); the preview draped the terrain; a ray aimed at a top corner against
  the SKY missed every hill and killed the pick. Now: snap projects at ground+height,
  only on COMPLETE walls (the sim's support rule mirrored), corner pass is pure screen
  space and survives sky picks; the preview flies at deck level. The finding is a
  regression test with real camera math.
- **SIM 11 — the span's covering.** `plan_roof` lost its material: a drawn span is
  covered by NOTHING (`material: null` — the boss's "default being none" made literal
  sim state) until `designate_roof` names it, and nobody decks bare air (thirty idle
  days beside an uncovered span, tested exactly). The roof-material cycle button died.
- **SIM 12 — drawings before the build.** The boss clarified that the SIM 11 reading
  was half of it: "when you plot the building it should ask what the roof will be
  before they build, after you select the roof then it asks you to select building
  type." A building-classifiable ring pends from the PLOT (`WallPlan.plans
  {roof, kind}`); the masons lay NOT ONE STONE until both answers land, in order
  ('the roof is chosen before the trade'); wood/straw dress the gable in the choice's
  tones, 'none' keeps the sky, BRICK mints a REAL Roof span at completion — the floor
  the next storey stands on (upstairs grounds at 3+0.25, exact). Tower/blacksmith
  render special-cases retired: the choice rules, not the kind. Plus THE FIT (boss
  screenshot: "roofs are not sitting on the structure properly"): the gable floated
  0.145 m above the wall with an open slit under the overhang — you saw through to
  the far wall. Eave now SINKS a course into the masonry; a 0.55 m fascia skirts the
  perimeter; the flat deck's band skirts down likewise.
- **SIM 13 — LEVEL COURSING.** Boss: "what if we leveled the stone wall before the
  roof is added so regardless of height the layers are even." Every wall is SURVEYED
  at plan time (`surveyWall` — ONE function for sim and pencil, frozen on the wall:
  z hangs from the datum, never live ground) onto one horizontal slab grid, footing
  stones partly buried like real footings. TWO honest datums, and the distinction was
  FORCED BY THE INSTRUMENT (see law 6): building-class walls rise to ONE flat bearing
  (a roof needs one); plain walls and field rings STEP their tops with the land like
  hillside dykes — layers even throughout, either way. Flat ground reduces EXACTLY to
  the old arithmetic (every flat-site suite passed untouched).
- **The whole day ran blind.** The Chrome bridge was down from the first hour and
  never came back. Verification: exact-arithmetic tests, canon fingerprints, served-
  bundle greps — and the boss's three screenshots, which drove three courses. The eye
  the harness lost, the boss supplied.

## 2. New laws paid for

1. **Pending state is the minimal reference.** `state.pending` is wall ids and nothing
   else: everything geometric recomputes from the one predicate at the word. The
   parity law's final form — nothing copied can drift, because nothing is copied.
2. **The popup is furniture; the choice is a command.** Every card button enqueues
   (`designate` / `choose_roof` / `designate_roof`); saves carry the words; replay
   answers the same questions the same way. If a UI decision doesn't enter the log,
   it didn't happen.
3. **Geometry first, purpose second — and for buildings, purpose before masonry.**
   Plots ask at completion; buildings ask at the PLOT and the crew waits on the
   drawings. "Before they build" is sim law (`awaitsDrawings` gates `layStones` and
   the people-theater alike), not choreography.
4. **Default-none is sim state.** An unanswered question is a real world-state
   (`material: null`, `plans.kind: null`) with real consequences (no work), never a
   silently-applied default. The canon fingerprints the ASKING states themselves —
   waiting shells, mid-build crews, uncovered spans.
5. **A spoken word expires by tick.** The card's double-ask guard keys on
   (id, stage) and drops entries once their tick has stepped — so a REJECTED word can
   never wedge an ask closed forever. Guards on async intent need expiry.
6. **The probe is a design instrument.** SIM 13's first cut leveled EVERY wall to one
   datum; the canon probe showed the gorge-bank field ring at 1,921 stones (honest:
   629), completing a month late, the farm word missing its window. The canon's
   STORY breaking is the mechanic being wrong — the single datum was refuted before
   it ever compiled green. Run the probe expecting design feedback, not just ids.
7. **One law, two datums — defer to actual masonry.** Buildings dig to a level
   bearing; hillside walls step. A uniform rule that quadruples a field wall is not
   the honest rule; honesty sometimes has cases, and the cases come from the craft.
8. **The survey freezes at plan.** Stone z hangs from the stored datum, never from
   live ground — a fill completing mid-build cannot bend a wall already set out. Any
   quantity that must stay consistent across a build gets computed once and recorded.
9. **Aim at what you see.** Screen-space snap targets must project at the height the
   player is LOOKING at (roof mode: wall tops). And a pure screen-space corner pass
   works even when the ground ray missed entirely (sky-silhouetted tops).
10. **When a rework changes the id grid, probe again — every time.** The probe ritual
    ran FIVE times today (designates mint at words, shells build late, footings bill
    extra stones — each moved every downstream id). It is mechanical now: dynamic
    lookups by first-point, log, hardcode, delete. Never hand-derive a shifted id.

## 3. Traps of the day (pay once)

- **file:// is the black page.** The game must be SERVED. play.cmd is the answer;
  don't debug "black screen" before asking how they opened it.
- **Two keystones share 2026-07-10.** Husbandry (SIM 2→9, the morning) and this one
  (SIM 9→13, the evening). The banner points here; here points back.
- **Flat-site suites are the slope regression harness.** Level coursing reduces
  exactly to old arithmetic on flat ground — so every flat-site exact assertion
  (fieldwork 80 = 2×(60−20), gate knockouts) survived unchanged and would catch a
  slab-grid regression instantly. Keep tests on flat sites unless slope IS the claim.
- **One id can ask twice.** A plotted building asks roof then trade under the same
  wall id — cache/guard keys must carry the STAGE, or the second question never shows.
- **The bridge dies and stays dead.** Don't re-litigate it mid-course: state the
  law-10 caveat in the commit, grep the served bundle for your symbols, and treat the
  boss's screenshots as the instrument they are. Three courses shipped that way today
  and two boss findings were diagnosed FROM screenshots alone.

## 4. State of the fabric

SIM_VERSION 13 · 97 tests across 13 files (all green) · commits `725cd8b` → `5a3b785`,
all pushed. The player's surface: ⚒ wall (B) · ⌂ building (H — asks roof, then trade,
then the crew moves) · ⛰ fill (F, flat/ramp) · 🚪 gate (G, context-aware) · ⛉ roof (R —
the span asks its covering) · the word-card (one queue: plots, shells, spans, oldest
first) · hold ⇧ to snap (roof mode snaps wall TOPS, finished walls only) · play.cmd to
launch. The world: level-coursed walls stepping down the gorge bank like dykes, flat
bearings under gables that grip the masonry with sunken eaves and fascia, paddocks and
fallow beside arable that draws every idle hand, brick decks minted by a building's own
drawings, and a chronicle that knows the day every question was asked and every word
given. Everything event-sourced, everything replayable, the canon fingerprinting the
asking states themselves at eight milestones.

## 5. Next courses (in order, unless the boss redirects)

1. **THE TRANSCRIPTION TIER** — still the standing next real-hours phase (boss's
   "transcribe first", unchanged through four keystones): 64 boreholes ≥ 30 m ≈ 200
   pages of Victorian hand, Elvet (bgs_id 847814) + Kepier (847771) first;
   `node tools/fetch-borehole-scan.mjs <id>`; schema in
   research/boreholes/TRANSCRIPTION-SCHEMA.md; build tools/transcription-check.mjs
   WITH the first batch. Then the bed model, THEN quarry mechanics (M2 — whose wall
   ladder now owes only thickness/wythes; level coursing is PAID).
2. **Designation follow-ons** (BACKLOG, boss-paced): RE-designation (the three-field
   rotation needs a gesture on a designated plot + M4 rules), herds for paddocks,
   kinds gaining FUNCTION with trades, card polish (Esc/dismiss + reopen chip).
3. **Fit follow-ons:** field-wall step interval is one course (0.25 m) — grouping
   steps into longer level runs is a one-constant tune if the boss's eye wants it;
   pitched-roof span honesty; the people-theater's mason stations still approximate
   course height on stepped walls (display-only, noted in SIM 13's commit).

## 6. Open questions for the boss

SCOPE §14 unchanged (era ~1200s, idle tolerance, chapel long game, tone ceiling), plus
new small ones: should the field-wall STEP interval be longer than one course (real
dykes often step by two or three)? Should a 'none'-roofed shell weather or fill with
debris over the years (an honest cost for the open sky)? Do unlock tiers for the
designation palettes arrive with M3's people or M4's economy? And the standing one:
when does the transcription tier's real-hours spend begin?

---

*The chronicle knows the day every question was asked. Keep asking before building.*
