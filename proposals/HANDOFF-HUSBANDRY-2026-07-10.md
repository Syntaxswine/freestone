# HANDOFF — THE HUSBANDRY COURSE

*2026-07-10 · from the farms-and-houses day · Castle Cultivator (repo codename `freestone`)*

You are the next builder. Read the FOUNDATION keystone first
([HANDOFF-FOUNDATION-2026-07-09.md](HANDOFF-FOUNDATION-2026-07-09.md) — the soul, the
nine laws, the maker's marks; add yours BELOW, never above), then the toybox course
([HANDOFF-TOYBOX-2026-07-09.md](HANDOFF-TOYBOX-2026-07-09.md) — its seven laws and the
receiver trick). This document is the course above both: the day the hill became a
HOLDING. Walls learned to be farms, shells learned to be houses with doors, the fields
learned the calendar, and the dirt learned to slope and to carry floors.

---

## 1. What this day built (SIM 2 → SIM 9, all pushed, 81/81 green)

The boss drove it in riffs, same as the toybox evening; every riff landed with the sim
law intact. In ladder order:

- **SIM 3 — enclosure recognition.** The plot is the plan, now in the sim itself: when
  a wall COMPLETES, its geometry declares what it made. Closed low ring (≤ 1 m, ≥ 25 m²,
  clean) → `farm_established`; near-closed tall ring (gap ≤ 2 m, ≥ 2 m high) →
  `building_complete`, kind from the shared classifier. The pencil got snap-to-close
  (16 SCREEN px, exact-copy closure, closing click commits). Recognition happens at
  completion so the chronicle records the day the field came to be.
- **SIM 4 — field work.** "Set citizens to work in the fields": an earthless laborer
  tends the farm with the fewest workdays (+1 person-day; ties go to the older farm).
  `Farm.workdays` is M4's yield substrate. The Lodge never puppets individuals — the
  field exists, so hands find it. Priority chain: earth > (later: carpentry >) fields >
  idleness, tested end to end.
- **SIM 5 — the knife edge.** The second review fleet proved the new overlap guard
  rejected the most careful HONEST closure (a fill ring closed within 3 cm read as
  self-overlap — an EXACT duplicate vertex too). `normalizedFillRing` drops the closure
  gesture before the guards judge the shape.
- **SIM 6 — gated farms + `classifyRing`.** A low ring with a person-width gap farms
  WITH A GATE (the gap's midpoint on `Farm.gates`). And the whole enclosure predicate
  became ONE exported pure function consumed by recognition AND the HUD — the parity
  law made structural.
- **SIM 7 — real gates.** The gate appears WITH the farm, carved into the FIRST-placed
  segment at PLAN time (builders leave openings; nobody knocks holes in finished work).
  `decomposeWall` returns buildable SLOTS — slot positions are pure geometry, stable
  under gate ops. The gate tool (G): `add_gate` knocks a span out of built masonry
  (exact arithmetic), `remove_gate` queues INFILL the masons re-lay through the daily
  loop — fresh stones, fresh provenance. Recognition became ONE-SHOT per wall.
- **SIM 8 — ramps + roofs.** `plan_fill` grew a `ramp` shape (slopes from the
  first-placed edge; `fillSurfaceAt` is one function shared by sim and render, so
  masonry climbs the same slope the eye sees; bills the honest wedge). `plan_roof`
  snaps corners onto FINISHED walls (support validated, constant rejections), laborers
  deck it after the earth; wood and straw cap the void, FLAT BRICK raises
  `effectiveGroundAt` by its 0.25 m — a brick deck IS the next storey's floor, and an
  upstairs wall grounds on it exactly. Plus the dirt-on-dirt bug: per-fill tint jitter
  gave stacked platforms their seams back.
- **SIM 9 — doors.** The same tool cuts DOORS on building walls (context decides the
  furniture: hurdle on a farm wall, plank door on a building — and every building's
  original doorway gap now wears the door it always implied).
- **Render-only courses:** the farming year (fields turn winter → spring → summer →
  August gold → stubble, purely from `world.tick`; fresh farms show raw tillage by age
  read from the chronicle's own event) and ⇧-snap (corners > own points > wall edges,
  screen-space radii — how new work joins old).
- **Two review fleets.** The first DIED on session usage limits mid-verify: 8 leads,
  zero verdicts — triaged by hand (five real, one refuted), and a dead agent's leftover
  scratch probe held a REAL exploit (the double-wound lap: collinear laps cross nothing
  properly while shoelace counts every lap — a 14,596 m² farm on ~7,700 m² of land).
  The second fleet ran full strength: 6 findings, 6 probe-confirmed, 4 distinct, all
  fixed. The fleet has still never returned empty-handed.

## 2. New laws paid for (each one cost something today)

1. **The pencil's promise IS the sim's predicate** — one exported function
   (`classifyRing`, `planGates`, `fillSurfaceAt`), imported by the HUD, never
   re-derived. Both fleets found parity drift; the refactor made the drift class
   impossible.
2. **Unverified ≠ refuted.** A fleet that dies on limits leaves LEADS, not verdicts —
   triage each by hand before believing any bucket. And read what dead agents left in
   the working tree: the scratch probe was treasure.
3. **Normalize the gesture BEFORE guarding.** A new guard can reject the honest gesture
   it never met (the 3 cm closure). When you add a validator, walk the UI's natural
   gestures through it first.
4. **Guard OVERLAPS, not just crossings.** Shoelace and even-odd are two measures; the
   bowtie lesson (proper crossings) missed collinear double-wound laps. Billed and
   granted geometry share one measure — `ringSelfOverlaps` (< 5 cm non-adjacent) plus
   the honest residual filed in BACKLOG (offset laps → M4 pays by tillage measure).
5. **Positions are geometry; buildability is state.** Slot centers never move when
   gates come and go — only WHICH slots build changes. That invariant is why gate ops
   on complete walls never shift standing stones, and why gate ops are legal ONLY on
   complete, idle walls.
6. **Recognition is one-shot per wall.** Anything that lets a wall re-complete (gate
   infill) would otherwise re-claim its land. Guard at the recognizer, test the cycle.
7. **A world array that can SHRINK needs a full re-upload.** Incremental instanced-mesh
   sync + `count--` kept drawing REMOVED stones and vanished innocent tail stones
   instead (the boss's two-gates screenshot diagnosed it in one look). Regrow AND
   shrink both reset the upload cursor.
8. **Deep-copy per command shape.** `makeSave` assumed every command carries `points`;
   the first `at`-shaped command crashed every save containing it. The replay test that
   caught it is the guard.
9. **Canon commands that need ids get PROBED ids.** Wall ids are deterministic —
   temp probe test → hardcode the literal → delete the probe → regen. Never
   hand-derive the id sequence.
10. **When the eye is unavailable, say so in the commit.** The extension bridge died
    mid-session; three courses shipped geometry-verified with the caveat stated
    plainly, and the boss's own screen served as the instrument. Honest > silent.

## 3. Traps of the day (pay once)

- **The preview harness can CHANGE SHAPE mid-session**: `preview_*` tools became
  ext-shaped (Chrome extension) after a server restart; with the extension
  disconnected there is no in-session eye. Headless alternatives that still bite:
  geometry unit tests + the render smoke pattern (`test/render-smoke.test.ts` —
  layers must build real THREE geometry from real sim state without throwing;
  three's math is node-safe).
- **The permission classifier flaps.** Shell tools block; Read/Grep/Edit/Write stay
  open. Write the commit message to the scratchpad with the Write tool while waiting,
  then one shell call when it recovers.
- **Concave farms break centroid anchoring** (C/U shapes: the vertex centroid sits in
  the hollow — 800/800 probe failures). Anchor on the longest EDGE and step inward;
  land beside the longest edge is the one region a legal enclosure guarantees.
- **vitest counts tell on stray files**: 45 tests became 49 because a dead fleet agent
  left `__scratch_adversarial.test.ts` in the tree. A test-count you didn't change is
  a working-tree census.

## 4. State of the fabric

SIM_VERSION 9 · 81 tests across 10 files (all green) · commits `a67d13d` → `c8f9054`,
all pushed. The player's surface: ⚒ wall (B) · ⌂ building (H) · ⛰ fill (F, flat/ramp
toggle) · 🚪 gate (G, context-aware) · ⛉ roof (R, wood/straw/brick) · material cycle ·
height ± · hold ⇧ to snap · snap-click the start point to close a ring. The world:
seasonal tilled fields with headlands, field hands walking furrows, hurdle gates and
plank doors, gable-roofed recognized buildings, hand-decked shells, ramps masonry can
climb, brick decks carrying second storeys, 16,872 trees that clear for work.
Everything event-sourced, everything replayable, the baseline canon exercising all of
it at seven milestones.

## 5. Next courses (in order, unless the boss redirects)

1. **THE TRANSCRIPTION TIER** — still the standing next real-hours phase (boss's
   "transcribe first", unchanged): 64 boreholes ≥ 30 m ≈ 200 pages of Victorian hand,
   Elvet (bgs_id 847814) + Kepier (847771) first; `node tools/fetch-borehole-scan.mjs
   <id>`; schema in research/boreholes/TRANSCRIPTION-SCHEMA.md; build
   tools/transcription-check.mjs WITH the first batch. Then the bed model, THEN quarry
   mechanics (M2).
2. **Farm/roof follow-ons** (BACKLOG, boss-paced): field hands pathing THROUGH gates,
   the plough team (oxen — the big theater upgrade), pitched wood/straw roof geometry,
   carpenters as a trade, cart gates (~2.5 m), ditches whose spoil feeds ramps.
3. **Wall ladder with M2** — thickness × stone demand tune together; level coursing
   (wavy wall tops under level eaves) belongs here.

## 6. Open questions for the boss

SCOPE §14 unchanged (era ~1200s, idle tolerance, chapel long game, tone ceiling), plus
new small ones: should cart gates (wider, ~2.5 m) arrive with carts or before? Do
gatehouses (gates on CURTAIN walls, M6) unlock the same tool or a grander one? Roof
span honesty — decks over 6.5 m currently build without complaint; should the master
mason warn like he does for buildings?

---

*The chronicle knows the day every field came to be. Keep it that way.*
