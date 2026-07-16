# PROPOSAL — THE VISIBLE WORK (2026-07-16)

*Scoping the boss's quality-of-life list. Census first, per the house law — and the census reframed
the list: these are not eight separate wishes. Six of them are facets of ONE measured problem — the
stone economy is invisible and all-or-nothing — and the other two (buildings, conveyors) are design
forks that want the boss's steer before code. Nothing here is built; this is the spec.*

> Boss's words (2026-07-16): visible mining · blocks pile at the quarry · people visibly carrying
> pile→structure · a reusable progress bubble (multi-line for multi-material) · start with 13 people ·
> "building feels slow… time is not advancing properly" · buildings need a fundamental rework, more
> like farms, selectable with details · farms selectable with expected yields · pastures get animated
> animals · rollers reimagined as conveyors on a pre-planned path.

---

## 1. The diagnosis, measured (why building "feels slow")

The clock is healthy. Verified live this session (`__cc` probe on a fresh world):

- A 395-post wood palisade rose in **7 game-days**, 57 posts on day one. Ticks build.
- The speed transport (`acc += dt × speed`, ×1/×4/×16) and Sit-the-Season both pump `worldStep`
  correctly — the wiring was read end-to-end and is clean.

What is NOT healthy is the shape of the stone economy at founding scale:

- A modest **8×8 m open cut** froze at **890 person-days** of work (12 m dry reach, 843 m³ yield).
- The founding party has **2 adult laborers** → 445 game-days ≈ **1¼ game-years** of digging.
- Stone is credited **all-or-nothing on completion** (`stoneWon`, one lump at `workDone ≥ workTotal`).
- Measured: the stone wall planned beside that quarry laid its **first stone 351 days later** — then
  finished all 395 stones in ~8 days.

So the player experience is: a whole sat season advances the pit by 20% with **zero visible change
anywhere** — pile 0, wall 0, no one visibly digging (§2), no progress number. Then a year later
everything happens in a week. "Time is not advancing properly" is the correct *read* of a world whose
smallest quantum of visible progress is an entire quarry. The fix is not the clock; it is making the
work **flow** and making the flow **visible**. Every item in the boss's list lands on one of those two.

## 2. The census (what the tree already holds, what's missing)

| Item | Sim truth | Render truth |
|---|---|---|
| Labor ladder | fills → roofs → **cut → adit → bell pit → shaft → fell** → fields (moveEarth) | theater knows ONLY fills/roofs, fields, wall-shuttle. **Every mining assignment renders as a lie** (the laborer visibly tends a field while the sim has him digging) |
| Digger-in-pit | — | `CutLayer.floorAtShow` ("for sprite feet: a laborer stands in the pit") **exists and is dead code — never called** |
| Carrying | — | carry pose + bobbing block EXIST (people.ts), but the shuttle runs from a **virtual point near the wall's start**, not from any real pile |
| Stone credit | one lump at completion, all five methods (cut/adit/bell pit/shaft; fell for timber likewise) | pile is a HUD number; nothing stacks at the working |
| Founders | **4, hardcoded** (2 masons + 2 laborers); each draws rng (name+pace) → founder count moves the masonry jitter cursor | — |
| Per-structure progress | walls carry stonesLaid/stonesTotal, workings carry workDone/workTotal — all recorded, unread in-world | HUD has the global bottleneck line + supply gauge; **no per-structure readout** |
| Selection | farm yield arithmetic lives in livingYear (area/AREA_PER_PERSON, orchard supplement, pasture horses); houseTier reads a building | inspection card raycasts **stones only**; farms/buildings/workings not clickable |
| Buildings | recognition → designation → kind; housing tiers gate growth; smith works | bones + gable (4-corner rings only; irregular = roofless shell) + props (forge/yard/cat/cresting). **No interior, no occupants, not selectable** |
| Pasture animals | pasture ⇒ 1 draft horse (SIM 29, hauls surplus) | **ground tint only** — the horse exists as arithmetic, never as a sprite. The granary CAT is the shipped pattern to copy |
| Orchard trees | — | **ALREADY SHIPPED** (`6da302b`, 24th mark): fruit-tree rows, green summer / russet autumn — deployed. (Boss note "orchards should have trees": resolved; worth a look at the live site) |
| Rollers | per-wall boolean, ×2 haul boost, opt-in toggle | invisible — no path, no moving stone |

## 3. The spec

### A. Incremental stone credit — the bedrock fix (SIM bump)

Stone (and felled timber) flows to the stockpile **as the work is done**, not as a lump at the end:
each person-day of digging credits `stoneTotal / workTotal` m³ (same for adit/bell pit/shaft/fell).
This is what real workings do — blocks come off the face from day one — and it is the substrate every
visible item below stands on: piles that grow daily, carriers with something to carry, bubbles that
tick. The one-shot `stoneWon` flag retires into "the completion event still fires once" (chronicle
unchanged); conservation pins it (sum of increments === stoneTotal exactly at completion — credit the
*remainder* on the last day so float drift can't leak stone).

- Baseline: a REAL behavior change — the canon quarry starts feeding its wall a season early. Canon
  re-authored to tell the new story (the trickle replaces the cliff), honest regen, red specimens
  first (conservation, no-double-credit, replay byte-equal). SIM_VERSION bump.
- Old saves: version guard already surfaces a message instead of crashing (Lodge Book law) — flag it.

### B. Thirteen founders (SIM bump — batch with A)

`createWorld` founds 13, not 4. Notes the census forces:

- Each founder draws rng for name + pace, so the count itself moves the masonry jitter cursor — the
  canon re-authors anyway; batching B with A costs **one** re-author instead of two (the roadmap's
  standing batch-SIM-bumps rule).
- `FOUNDER_NAMES` holds 8 names — needs 13+ (constant strings from a fixed list, Law 3-safe).
- The age stagger must change: today's `22 + i×3` puts founder #13 at 58 — inside the death curve's
  teeth. Spec: a fixed repeating spread in the 20–36 band (still no rng), so no cohort wave and no
  founder starts elderly.
- Trade split is a boss call (§6 Q1). Recommendation: **3 masons / 10 laborers** — the measured
  bottleneck is winning+hauling, not laying (masons finished 395 stones in 8 days once fed).
- Re-run the century-sweep after: founding size feeds the demographic equilibrium's approach path
  (not its ceiling — capacity math is unchanged — but verify, don't assume).

### C. The visible work — theater catches up to the sim (render-only, ZERO baseline)

1. **Diggers dig.** PeopleLayer learns the rest of moveEarth's ladder: laborers the sim has at a
   cut/adit/bell pit/shaft/fell visibly go there and swing. The assignment is derived from the same
   sim truth moveEarth reads (deterministic, no rng). The dead `floorAtShow` finally gets its caller —
   diggers stand ON the sinking pit floor, exactly what it was built for.
2. **Blocks pile at the working.** A representational stack of dressed blocks beside the spoil cones
   (the granary-sacks pattern: N block meshes ∝ stone won so far, capped — "not every block, a
   representation"). Depletion read: the global pile is ONE number in the sim, so each working's stack
   scales by `(its stone won) × (global stockpile / total won)` — piles visibly draw down as walls
   consume, zero sim change. (A true per-pile logistics model is a real sim course — noted in §5 as
   the conveyor's natural sibling, not smuggled in here.)
3. **Carriers carry from the pile.** The existing shuttle re-anchors: pick-up end = the nearest
   working's block pile (or the wall's face-buffer stack for hauled walls) instead of the virtual
   point. Same carry pose, same bob — the road just becomes real. The wall face gets its own small
   stack showing `faceBuffer` (the cart's deliveries made visible).

### D. The progress bubble (render-only, reusable)

One chip component, anchored at an entity's centroid, projected per-frame (the #prospect-card DOM
pattern — crisp, field-guide monospace, no WebGL text):

- Wall: `⚒ 128 / 395 stones` (+ `waiting on stone/cart/timber` when stalled — the stall named AT the
  structure, not only in the HUD).
- Working: `⛏ 184 / 890 days · 174 m³ won` — the number the boss sat a season staring for.
- Multi-input structures get multi-line: a wood-roofed stone building shows stone AND roof workdays;
  a palisade shows timber. Lines are data (`{icon, done, total, unit}[]`) so any future consumer
  (kiln, Keep) rides free.
- Show policy is a boss taste call (§6 Q2). Recommendation: chip visible while incomplete, fading
  when idle-complete; full detail on select (E). Always-on for every entity would clutter the hill.

### E. Selection — the inspection card grows up (render-only)

The Beat-2 raycast already owns the click. Extend the miss path: stone hit → stone card (unchanged);
else ground hit → point-in-polygon over farms / buildings / workings / stands →

- **Farm card:** use, area, **expected yield in mouths** (the livingYear arithmetic finally surfaced:
  arable/AREA_PER_PERSON, orchard supplement, pasture's draft horse), workdays, season state.
- **Building card:** kind, house tier (hovel/cottage/hall + what knocks it down), begun year + stones
  (the biography, already built), roof, occupants (see F).
- **Working card:** the D bubble's detail + the prospect readout's teaching line.
- **Stand card:** regrowth countdown ("a cant returns in ~4y").

One card system, per-entity data providers. This answers BOTH "buildings selectable with details"
and "farms selectable with expected yields" on the memory suite's existing spine.

### F. Buildings as living spaces — the design fork (boss steer BEFORE code)

The bones are fine (boss's own words). What's missing decomposes into four candidate layers — which
of these is the itch? (§6 Q3):

1. **The floor** — designation paints the INTERIOR the way a farm tills: rush floor + hearth for a
   house, cobbles + clutter for a workshop, so a building reads lived-in from above even roofless or
   irregular. (Render-only; the farm precedent is exactly this.)
2. **Roofs for irregular rings** — today only clean 4-corner rings gable; everything else is a
   roofless shell (long-standing backlog: hip/straight-skeleton). Likely a big visual win per effort.
3. **Occupants** — souls bound to houses ("home of Edith & family"). A render-side deterministic
   assignment ships cheap and feeds the E card; REAL per-house occupancy (who sleeps where, walks
   home at dusk) is a sim course with demographic hooks — worth its own proposal if wanted.
4. **Function props at the door** (the workshops pattern extended: a garden plot behind a cottage, a
   bench by the hall).

Recommendation: 1 + 2 first (they change what the eye lands on), 3-render + E card beside them, 3-sim
deferred.

### G. Pasture animals (render-only, boss-flagged low priority)

Animated horse on each pasture, cow/pig on each paddock — the granary-cat pattern verbatim (few-pose
pixel sprite, render-clock cadence + hash, never sim rng, hidden underground, both update sites per
Law 6). Counts read sim truth (pasture ⇒ its draft horse; paddock herd size is cosmetic until herds
are a system — BACKLOG stands). Orchards: already have trees; nothing to do.

### H. Rollers → conveyors on a pre-planned path (design fork, boss steer)

Today's sledge is a per-wall ×2 toggle — invisible and placeless. The boss's picture (a drawn path
that rapidly moves stone along it) is a different, better mechanic — a **roller road**: a polyline
entity drawn like a wall, costing timber to lay, and any wall whose haul route rides it hauls at the
boosted rate; the render shows blocks sliding down it (the theater C already needs moving blocks).
Real design questions before code (§6 Q4): does it REPLACE the toggle (breaking: existing saves'
`rollers` walls) or absorb it (toggle = "this wall lays its own rollers", road = shared
infrastructure)? Does the route-freezing boundary (haulRate frozen at plan time) re-freeze when a
road is laid later — or do only walls planned AFTER the road benefit (the honest survey-boundary
answer, and it teaches plan-your-logistics)? Sized: sim course + tool + render ≈ the adit's weight.

## 4. Already resolved / already true (so nothing is rebuilt)

- Orchard fruit-tree rows — shipped `6da302b`, live.
- Carry pose + block bob — shipped; only the anchor is wrong (C.3 fixes).
- The stall named on the HUD (`⚒ waiting on stone`) + bottleneck line — shipped; D moves it to the
  structure.
- The village clock (folk age tints), stone patina, inspection card — the whole legibility spine E
  extends.
- Speed transport + Sit-the-Season — verified working; no clock fix needed or proposed.

## 5. Build order + discipline

1. **Course 1 (ONE batched SIM bump): A + B.** Red specimens first (credit conservation, no double
   credit, founder count, replay byte-equal), canon re-authored once to tell the trickle's story,
   honest regen, century-sweep re-run. Two-commit only if an inert seam exists; the credit change is
   inherently behavioral, so likely one attributable commit like SIM 16.
2. **Course 2 (render-only, zero baseline): C + D + E** — in that order; C gives D and E something
   true to point at. Law 6 (both update sites), receiver-trick eye checks, probe + eye both.
3. **Course 3: F.1 + F.2 + G** after the boss picks F's layers.
4. **Course 4: H** once its two forks are chosen; PROPOSAL-LOGISTICS §4.1 (route costing) is the
   substrate to extend, and C.2's noted per-pile logistics limit is the same design surface — decide
   them together.

## 6. Open questions for the boss

1. **Founders' trades** — 13 souls: 3 masons / 10 laborers (recommended — the measured bottleneck is
   winning, not laying)? Or another split?
2. **Bubble policy** — chip always-on while incomplete (recommended), or only on hover/select?
3. **Buildings** — of §F's four layers (floor / irregular roofs / occupants / door-props), which are
   the itch? Recommended start: floor + irregular roofs.
4. **Conveyor forks** — replace the sledge toggle or keep both (toggle = self-laid rollers, road =
   shared infrastructure)? And do existing walls re-freeze onto a new road, or only walls planned
   after it (recommended: only after — the survey-boundary law, and it teaches planning)?
5. **Timber too?** — incremental credit for felling as well as stone (recommended: yes, same law,
   one discipline)?

---

*Census + measurements by the fortieth hand, 2026-07-16. The probe scripts ran against a live `__cc`
on a fresh world at HEAD `97882da`; the 890-person-day quarry, the 351-day first stone, and the
7-day palisade are reproducible numbers, not impressions.*
