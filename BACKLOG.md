# Castle Cultivator backlog

**🗿 Current handoff: [proposals/HANDOFF-THE-BOOK-AND-THE-SCAR-2026-07-15.md](proposals/HANDOFF-THE-BOOK-AND-THE-SCAR-2026-07-15.md)**
— the AMBITION opener (the first courses built ON the sealed frame): 📖 THE LODGE BOOK (Save/Load, `55ce8ed`) and
⛏ THE PROSPECTING SCAR (red warning + readout + dig-anyway + flood + **the edge snap `fc73bea` — now 3/3 ✅**), and
**⛏ THE ADIT** (`e7d0019`, 32nd), **⛏ THE BELL PIT** (`6f35aab`, 33rd, SIM 33), and **⛏ THE SHAFT-AND-PUMP**
(`b098c4b`, 34th, SIM 34) — **THE MINING LADDER IS WHOLE** (open cut→adit→bell pit→shaft+pump), sealed with a 5th ⛬.
All LIVE. It carries their laws + traps + the forward map (only the shaft's GATE is a boss toggle now; then the
roadmap's cathedral beats); read the FOUNDATION keystone (39 marks + SIX ⛬ seals) FIRST. The prior arc-closing keystone (the §9 ladder + the post-arc
debt-knockoff, all sealed) is
[HANDOFF-THE-LIVING-SETTLEMENT-STANDS-2026-07-15.md](proposals/HANDOFF-THE-LIVING-SETTLEMENT-STANDS-2026-07-15.md)
+ its companion
[HANDOFF-THE-LIVING-SETTLEMENT-BUILD-2026-07-15.md](proposals/HANDOFF-THE-LIVING-SETTLEMENT-BUILD-2026-07-15.md).
Built course by course under the boss's directive *keep going until the ladder is done; a handoff + a
keystone between tasks*. **Step 0 —
the year made real + Sit-the-Season — SHIPPED `02465ac` (SIM-neutral). Step 1 — THE WOODS —
SHIPPED SIM 19 (`df01154` inert scaffold + `02f7736` the bite): timber is a real WON/SPENT/REGROWING
resource — a `plan_fell` freezes a cant's timber from the tree model (quarry-twin), the palisade
DRAWS it and stalls dry, the felled stool regrows over ~7 years and re-cuts, a 🪓 fell (T) tool +
the coppice returning its exact trees; 150 tests. Step 2 — THE LIVING YEAR — SHIPPED SIM 20
(`7577667`): people are MORTAL and the settlement GROWS — an annual demographic pass (on its OWN
`seed:demo:<year>` rng, so people-churn never shifts the masonry jitter) rolls survival on an age
curve, and the space-gated HARVEST sets a surplus that draws migrants + lifts births, or thins the
village in hunger; children age and lift no stone until grown; a `century-sweep` tuning tool confirms
population tracks carrying capacity; 158 tests. **THE ENTIRE §9 LADDER IS NOW BUILT (2026-07-15,
steps 0–5):** 3a THE GRANARY (SIM 21 `4f241db`); **3b** the granary CAT + sacks (render `e8af0f7`),
the GRAIN STOCK — granary made a real famine buffer, harvest×weather PRODUCED/EATEN/STORED (SIM 22
`243c8d6`), the CART — grain→granary drawing timber, the woods' first payoff + first
renewable-into-renewable loop (SIM 23 `ca05631`); **3c** the VARIETY TENANTS pasture+orchard
(SIM-neutral `3e087e4`) + the SMITH — variety draws a specialist, base-sustains-the-lineage (SIM 24
`beee2fc`); **step 4** HOUSING TIERS hovel/cottage/hall, the roof holds people in hunger (SIM 25
`ecf0910`); **step 5** THE LIFT — high courses cost more, a great wheel drawing timber relieves them,
on the two-commit discipline (A `b58fb5a` + B SIM 26 `90c404d`). **POST-ARC (2026-07-15, continuing): the
boss reopened the closed arc — *keep going till we knock off the items in the handoff* — so the honest debts
are being discharged in order.** **DONE: (1) THE FIRST TECHNIQUE (SIM 27 `89c88f1`, 🔥)** — a smith at the
forge relieves the mason's lay debt (0.15/smith, cap 0.30), riding the very line the lift taxes; HUD says
*the forge sharpens the irons*. **(2) THE APPRENTICE BOND (SIM 28 `af0d983`, 🤝)** — under a living master a
second forge raises the settlement's youngest hand (a local, no new body) instead of importing a journeyman;
only the first smith (or one after the last master dies) migrates; arrival event gains
`origin: apprentice|migrant` for the chronicle. **(3) VARIETY BEARS FRUIT (SIM 29 `807db0b`, 🍎)** — an
orchard bears food toward the harvest (area/ORCHARD_AREA_PER_PERSON, a supplement to grain) and each pasture
keeps a draft horse that hauls more surplus to the store (HORSE_HAUL, grazing free); HUD fieldYield widened
to include the orchard + shows "N draft horses". All three inert on the canon (livingYear never reckons in
200 ticks) → one clean commit each, NOT the two-commit dance (the lesson: check whether the canon RUNS the
feature first). **(4) THE RENDER PASS — COMPLETE (🎨🏗👥)** — render-only, no sim, all six strokes: the ORCHARD
dots fruit-tree rows (`6da302b`), the WORKSHOPS wear a lit forge + a carpenter's yard (`4d5a193`), the GREAT
WHEEL is a treadwheel crane on every wheeled wall (`1712fe7`, 🏗), the SMITH is distinct — cap, apron, tongs,
kept to his forge (`77796e5`, which also fixed the PeopleLayer so souls drawn AFTER boot finally appear), and
the HALL wears a cresting + finials where a hovel stays plain (`8ca79b6`); all receiver-trick verified.
**(5) SHELTER GATES GROWTH (SIM 30 `d32b25c`, 🏘)** — housing now GATES growth (growthRoom on births +
migrants), so population settles at min(food, shelter); a no-house hamlet caps at ~FOUNDING_SHELTER +
SHELTER_GROWTH_SLACK (~10). The century-sweep now HOUSES its settlements so it still tunes FOOD; the food
equilibrium re-verified intact (cap 20→20, cap 50→51). Inert on canon → one commit.
**(6) WEATHER SHAPED (SIM 31 `0bd6bb6`, 🌦)** — the harvest's yearly weather is now the MEAN of two uniform
rolls (triangular, peaked at 1.0), so the extreme famine/glut years grow rarer without shifting the mean;
the churn read harsh once SIM 30 added the shelter wall. Inert on canon → one commit; +1 distributional test.
**(7) THE SLEDGE ON ROLLERS (SIM 32 `0b86d83`, 🛷)** — the last debt, the lift's overland twin: an OPT-IN
`rollers` flag boosts a HAULED wall's delivered rate ×ROLLER_HAUL_BOOST(2); opt-in so the canon (walls don't
choose it) is byte-identical → inert one commit; a `🛷 sledge` toggle in the build bar; +2 tests.
**THIRTY-NINE maker's marks (⏭🪓🕯🌾🐈🏺🛒🔨🏠⚙🔥🤝🍎🎨🏘🌦🏗👥🛷📖⛏⛏⛏⛏🪨📜✍📐⏳) + SIX ⛬ seals; 196 tests green; SIM 34; live. THE MINING LADDER IS WHOLE; THE MEMORY SUITE (Beat 2) COMPLETE (6th ⛬, the castle remembers); THE VILLAGE CLOCK (⛏ 39th, folk tinted by age — the render-only slice of Beat 4, built ahead). The render-only well is DRY — stone AND folk legible; what remains is the boss's SPINE (one batched SIM bump, emotional/vision-locked) + Beats 5/6 + shaft GATE — NOT a blind build. §6 questions + the century-sweep numbers are ready for him.**
**★ EVERY HONEST DEBT PAID — the whole post-arc knockoff (SIM 27–32 + the six-stroke render pass) is COMPLETE,
sealed by a third ⛬.** Nothing remains on the STANDS ledger; what's next is AMBITION — the roadmap's untouched
beats (Beat 2 memory suite, Beat 3 Lodge Book save/load + Annal, Beat 5 demand wave, Beat 6 kiln + Keep).
**AMBITION (2026-07-15, post-debt — building ON the frame now, 📖):** the boss reopened with the title-screen +
mining-tutorial "ask", which a tree-grep showed was ALREADY SHIPPED (`8943e2d`, tasks #51–57) — the lesson
re-paid: census the tree before building. So the real work became roadmap **Beat 3 · V0 — THE LODGE BOOK
(Save/Load), SHIPPED `55ce8ed` (SIM-neutral, one commit, 184→188).** The two "soon" home-screen stubs are wired
for real: Save = makeSave→stableStringify→localStorage (event-sourced ⇒ 236 B for a 2-wall game); Load rides
New-Game's ghost-free reload rails — a one-shot `freestone_load` token, boot() replays via replay() (guards
SIM-version + site) instead of seeding fresh, then autostarts. A format-lock test (`save.test.ts`, +4) proves a
byte-identical round-trip; verified end-to-end in preview (save@600 → reload → restored@600 → continue →
re-save@720, console clean). Known limit: no cross-version save migration yet (surfaced with a message, not a
crash — a later course). **PROSPECTING CLARITY + THE SCAR (⛏ 31st mark) — 3/3 ✅ COMPLETE (render-only,
SIM-neutral, 188 green, inert on the canon): the RED WARNING (invalid ground → rust-red ring `#c0472e`,
boss-INVERTED — warn the HAZARD not the affordance; the red never blocks) + the field-guide READOUT (`⛏ sandstone
· 12 m dry · open cut ✓` / `⚠ <why>`, both reading quarryPlanAt) + DIG-ANYWAY (cutCommand no longer refuses a
drowned cut — dig it and find out) + THE FLOOD (a cut whose floor dips below the water table pools the
underworld's drowned blue) + SPOIL heaps ringing the rim [`f27e858`] + **THE EDGE SNAP** [`fc73bea`]: the Quarry
cursor magnetizes to the workable SHORE (where `cutValid` flips — a black-box sign-change march + bisection,
screen-verified like `geoSnap`, capped 20 m so a zoom-out can't grab across the valley; always-on but bites only
within 14 px, so dig-anyway holds). Preview-verified: ring grey↔red on the cursor; 12/49 grid cuts flooded at their
local water table (≈28–34 m AOD); 200 spoil cones; the snap CLINGS-then-RELEASES across a boundary sweep, cream+swell
+"workable edge" readout at an edge, red+"no building stone" deep-invalid, a placed vertex lands ON the boundary.**
**THE ADIT (⛏ 32nd mark) — #49 DONE `e7d0019` (render-only, inert on canon, one commit, 188 green): made PLAYABLE.
Its whole sim was ALREADY built + tested (aditEconomics + plan_adit + driving + one-time credit, 6 tests in
adits.test.ts) — grep-the-tree, a THIRD time. Added the TOOL (planner.ts, two-click mouth→head, hotkey A + HUD
button), the FREEZE (main.ts aditCommand: grade = surface under the mouth → level, self-draining; freezes plan_adit
like cutCommand freezes plan_cut), the READOUT (showAdit reuses #prospect: "235 m³ post · 19 m cover · self-
draining ✓" / "aim into the rising hill for post"), and the RENDER (new src/render/adits.ts: an X-ray ghost drift
at grade boring in from a dark mouth, spoil rising, AMBER on holing-through). Verified via the real tool (__cc):
45 m drive → workDone 276 ≥ 275.9, stockpile +234.8 once, adit_planned/complete/stone_won fired, drift drew amber.**
**THE METHOD LADDER (#50) — rung 3 the BELL PIT ✅ BUILT `6f35aab` (⛏ 33rd mark, SIM 33): open cut ✅→adit ✅→BELL
PIT ✅→shaft+pump. Scoped in [PROPOSAL-THE-METHOD-LADDER-2026-07-15.md](proposals/PROPOSAL-THE-METHOD-LADDER-2026-07-15.md),
then built on its recommended defaults (the loop said keep going; geology carried the design). SIM: plan_bell_pit +
bellPits array + guarded idle-laborer sinking (credit once) + bellpit.test.ts (+4→192); the FIRST sim course of the
session → one clean commit + honest baseline regen (pure serialisation, diff-confirmed only 8 hashes moved; SIM_VERSION
32→33). TOOL: single-click shaft, hotkey P + HUD. FREEZE: bellPitCommand, depth=min(dryDepth,25), stone×0.6 resink
penalty. READOUT: "35 m³ sandstone · 25 m deep, dry ✓" / refuses drowned ("wants a shaft engine") + postless. RENDER:
bellpits.ts — dark shaft mouth + spoil ring, worked-out AMBER. Verified __cc: 35 m³ drive, stockpile +35 once.
**#93 the SHAFT-AND-PUMP ✅ BUILT `b098c4b` (⛏ 34th mark, SIM 34) — THE LADDER IS WHOLE:** a deep pumped shaft that
beats the water table for DROWNED post at a labelled pump-tax (dear: 235 person-days for 53 m³ vs a bell pit's ~84
for 35); plan_shaft + shafts array + guarded sinking + shaft.test.ts (+4→196); honest baseline regen (pure
serialisation, SIM 33→34). Single-click tool (hotkey S), headframe render (eye-verified). Readout teaches the
ladder. The one fork left = whether to GATE it behind an earned pumping engine (a 1-line toggle, the boss's
progression call — NOT built, per PROPOSAL §3).**

**THE MEMORY SUITE (roadmap Beat 2) — OPENED: ⛏ 35th mark 🪨 CAMPAIGN PATINA `1fadac4` (render-only, ZERO baseline,
196 green untouched):** stones weather by AGE (now − tickLaid) — a year-throttled re-tint greys/darkens each block, so
lifts laid years/generations apart read as banded colour (the castle's archaeology in its own fabric). Verified via the
receiver trick (1121-stone wall fresh vs aged 20y = visibly greyer). **KEY REFRAME:** Beat 2 is GREP-THE-TREE, not
boss-vision — tickLaid/masonId recorded since M1, write-only/unread; the readers are all render-only + buildable. **⛏ 36th mark 📜 THE INSPECTION CARD `7404162`** (render-only, ZERO baseline, the suite's HEART): click a laid stone
(no tool out) → the raycast reads the stone InstancedMesh (instanceId === world.stones index) → masonId→person,
tickLaid→year, wallId→dress+material → a card "laid by Edith the mason · Year 1"; a miss clears it. Verified via a
real dispatched click. The raycast + card are now the suite's SPINE. NEXT readers hang off it: founder's stone (proud
+ founding party on the card), mason's marks (glyph from id, ashlar, on the card), structure biography (card widened
stone→wall), tracing-floor ghosts (no click needed) — all ROADMAP §Beat-2. The PRIOR
course's handoff (carriage/dress):
[HANDOFF-THE-DRESSED-STONE-2026-07-14.md](proposals/HANDOFF-THE-DRESSED-STONE-2026-07-14.md)
(reads the FOUNDATION keystone first — the soul, the nine laws, now FOURTEEN maker's marks — then the
carriage-layer PLOT: HANDOFF-THE-CARRIAGE-LAYER, its phase keystones HANDOFF-THE-HONEST-STALL (Phase 0)
and HANDOFF-THE-CART (Phase 1), and the design PROPOSAL-LOGISTICS. Carriage **Phase 1 — SIM 17, HAUL** (won stone travels pile→face by
cart at a route-frozen rate; **wall-sited**, so the lever is where you BUILD; "cost the route, not
straight-line" → Durham's *quarry local* falls out of the geometry) AND **Phase 2 — SIM 18, the
DRESS dial** are both SHIPPED. DRESS: each stone wall is worked to a block class that flips with the
STRUCTURE — light RUBBLE for a low garden/field wall, dressed ASHLAR for a tall/load-bearing one,
SCAPPLED between — setting a LAY DEBT (rubble quick 0.5, ashlar 2× slow) and a HAUL WEIGHT (ashlar
carts 1.5×), so a tall dressed wall is dear to MOVE and to RAISE; a smart default reads the height,
a dial (⚒ auto → rubble → scappled → ashlar) overrides, and the stone shows it (ashlar bigger &
uniform, rubble smaller & mottled). Boss pick + insight: *tall structures need heavier blocks*. Canon
re-authored — the ashlar tavern is the deepest stall (hungry + slow, a bigger relief quarry), the
rubble field ring flies up; **139 tests**; build clean; LIVE. The ninth (🛒) and tenth (🎚) marks
record the two days. **NEXT (boss picked timber): THE WOODS — make timber a real consumable with a
GENERATIONAL regrowth clock (coppice rotation; a wood felled for the crane grows back over
generations, or a line inherits bare ground — the granary's civic thesis written into the land).
The prerequisite for LIFT (Phase 3); write PROPOSAL-WOODS first. OR the adit made playable.**
**THE MASTER PLOT (step-back scoping, 2026-07-14):
[proposals/ROADMAP-THE-GENERATIONAL-FACTORY-2026-07-14.md](proposals/ROADMAP-THE-GENERATIONAL-FACTORY-2026-07-14.md)
— six beats (One Clock → WOODS → memory suite → save/Annal/Bell → the batched SPINE bump →
wall ladder wave → kiln/LIFT/Keep), the thesis (generational clocks re-open a solved factory —
the genre gap), the standing rules (a drawing verb per arc; batch SIM bumps; status on the
entity; M4 is mutual-aid-first; one chronicle voice), and the cut ledger. Read it before
picking any post-WOODS course.**
**THE WOODS DESIGN BIBLE (2026-07-15):
[proposals/PROPOSAL-THE-LIVING-SETTLEMENT-2026-07-15.md](proposals/PROPOSAL-THE-LIVING-SETTLEMENT-2026-07-15.md)
— the boss-picked WOODS arc grown to its honest size (you can't spec a wood that regrows over
generations without speccing the generation). ONE LAW: nothing persists unless you keep its base
alive (the coppice stool, the holding, the trade). Covers the woods (stands/cants, poles vs oak
standards, near-immortal stool, age-classed render, Baal Hill/Weardale grounding), the mortal
hands (annual demographic pass, niche-gated households, funeral protocol), the harvest (food EASY
+ SPACE-gated per boss; 1.25× surplus → migration + births), the specialization PYRAMID (variety
+ housing tiers gate specialists; arrive-AND-emerge; the base-sustains-the-lineage rule that folds
in the technique system), the accelerants (the CART first — grain→granary, needs wood + a
woodworking place; the great-wheel crane as the WOODS' oak-standard sink), and the granary cat
(canon payroll cat, decor). 4 research passes cited; build order + determinism plan + dating
flags + 4 open boss questions (name, build order, migration source, new farm types) in §12.
Boss said "lets lay down this foundation." NEXT: boss answers §12, then build step 0/1.**
The carriage layer plot — **WIN→HAUL→LIFT→LAY**, each a scalar frozen at the survey boundary; the
wall builds at min() and stalls honestly; "deep model, shallow controls"; Durham's Wear = a MOAT
not a highway → quarry local. Plot:
[HANDOFF-THE-CARRIAGE-LAYER-2026-07-13.md](proposals/HANDOFF-THE-CARRIAGE-LAYER-2026-07-13.md) +
[PROPOSAL-LOGISTICS-2026-07-13.md](proposals/PROPOSAL-LOGISTICS-2026-07-13.md).
Mining still teed up: [proposals/HANDOFF-THE-LAND-DECIDES-2026-07-11.md](proposals/HANDOFF-THE-LAND-DECIDES-2026-07-11.md)
(the adit made playable) + [proposals/PROPOSAL-MINING-2026-07-11.md](proposals/PROPOSAL-MINING-2026-07-11.md).)

**New session? Run the `/freestone-session-start` skill** (cold CI + orientation), or by
hand: the current handoff above, then `npm test` + `npm run build` green before touching
anything (the suite includes the determinism baseline instrument). Milestones are defined
in [SCOPE.md](SCOPE.md) §13. Each milestone ends with a push.

## Now
- [x] M0 — Scope document + research anchors (2026-07-09)
- [x] M0.5 — Granary/commons/small-works integration (2026-07-09): civic thesis (mutual aid +
      mutual defense) as pillars 6-7, new §8a (granary, Great Barn, seed corn, gleaning,
      commons, foraging year) + §8b (small works catalog, honest-dating filtered), siege
      rework (stores-vs-patience), tracing-floor palimpsest + page of unnamed hands (§9.7-8).
      Research: 6 agents, 78 claims, 18 skeptic checks → research/DIGEST-2026-07-09-*.md
- [x] Title RESOLVED 2026-07-09: **Castle Cultivator** (repo keeps codename `freestone`)
- [x] Wishlist dispositions integrated (2026-07-09): technique system CORE (§7), clerk (§7),
      farm animals not wildlife (§7), bell + construction chime (§6), hands-off trade +
      prosperity tiers (§8c), eel easter egg (§8a), fire + firefighting + curfew bell (§8),
      real-site directive (§5a). Parked: name-erosion, traveling masons. Research pass 3
      (fire/Kenilworth/Guédelon): 9 agents, 38 claims → anchors 21-23.
- [x] Q8 RESOLVED 2026-07-09: **DURHAM confirmed** by boss ("start with this one; more
      locations later") → sites are data packages loaded by id, future locations = content
- [x] M1 groundwork SHIPPED (2026-07-09): deterministic `worldStep` core + seed-first RNG +
      command-log save/replay + scaffold (TS/Three/Vite, port 8745) + REAL Durham terrain
      (EA LiDAR 1m → 500×500@8m, public/data/site-durham/) + adversarial review pass
      (3 lenses + verify; 8 confirmed findings fixed, 17/17 tests)
- [x] M1 proper SHIPPED (2026-07-09): player wall-drawing UI (B / ⚒ wall: click-place
      polyline, ghost ribbon, double-click/Enter commits via enqueue; demo command
      DELETED — the log boots empty), procedural pixel-sprite crew (masons work stations
      along the wall at the active course; laborers shuttle blocks stockpile↔station),
      camera manners. Adversarial review: 20 confirmed findings → 13 distinct, all fixed
      + re-verified live (growable stone mesh, screen-space dblclick guard, UV-space
      sprite mirroring, displayed-surface grounding, analytic ground picking, paused-
      commit feedback, orbit-clamp compensation, key guards)

## Deferred from groundwork review (do before the systems they guard ship)
- Save meta should carry a CONTENT FINGERPRINT of the site heightmap (id equality is
  necessary-not-sufficient — a regenerated heightmap with the same id would still fork
  replay). Do when the load-game UI lands (M3).
- Cross-engine determinism: Math.hypot/atan2 eliminated or quantized in sim state; if the
  sim ever computes more transcendental math, keep the rule — implementation-approximated
  functions never write raw into state.
- events[] grows unboundedly in state — move to external chronicle sink/ring buffer at M3.
- [ ] Boss review of remaining SCOPE.md open questions (§14): player identity, era, combat
      flavor, idle tolerance, chapel long-game scope, Q7 tone ceiling (refeeding stays /
      expulsion refused)

## Next
- [x] Instruments before M2 SHIPPED (2026-07-09): baselines/durham-42.json — canonical
      400-tick run on real Durham terrain (2 walls + 1 deliberately-invalid command),
      state hashes at 6 milestone ticks, compared on EVERY `npm test` (cold-CI folds
      into the standing ritual); `npm run gen-baseline` regenerates deliberately.
      Instrument proven: a 0.035→0.036 yaw-jitter mutation fails the first milestone
      with a clear message while all other tests stay green
- [x] SIM 3 — farms + houses from enclosure geometry (2026-07-10, boss: "first things
      first, farms and houses. farms are made by building a low wall, .5m around a piece
      of land"): recognition at wall completion (closed low ring ≥25 m² = farm;
      near-closed tall ring = building, kind from the shared classifier), snap-to-close
      pencil (screen-space, closing click commits), tilled fields with honest headland,
      gable roofs (thatch/slate), HUD names the farm before a stone is laid. Canon
      extended + baseline regenerated (SIM 2→3). SCOPE §6 enclosure-recognition canon.
- [x] SIM 4 — field work (2026-07-10, boss: "you can set citizens to work in the
      fields"): a laborer with no earth to move tends the farm with the fewest
      workdays (+1 person-day; construction outranks fields outranks idleness);
      Farm.workdays = M4's yield substrate; field-hand theater walks the furrows.
      Plus the review fleet's double-wound-lap exploit guarded (ringSelfOverlaps in
      recognition + fill validation). Baseline regenerated (SIM 3→4). Review-fleet
      fixes: snap-commit stale cursor, HUD height honesty, eave-from-as-built-stones,
      buildings grub their interiors. SECOND fleet (6/6 confirmed by probe) → SIM 5:
      fill closure normalized before the guards (the 3 cm knife edge; canon now also
      fingerprints fills-outrank-fields via the tick-320 hand-closed fill), HUD gate
      mirrors ringSelfOverlaps, fieldRow anchors on the longest edge not the centroid
      (C-farms: 800/800 rows landed in the hollow), closedRing() tolerant like the sim.
- [x] SIM 10 — designation (2026-07-10, boss: "a pop up should appear with options of
      what can fill it… farm, livestock, or fallow… buildings should offer… house,
      blacksmith, tower, tavern"): recognition ASKS — a completed enclosure pends
      (state.pending = wallIds only; class/ring/area recompute from classifyRing at
      the word, nothing copied that can drift) and the designate command answers.
      Arable-only tending (paddock wd 0 in canon), gates legal on pending walls
      ("hang the gate before you name the field"), the word-card asks at the plot
      (choices are data, unlock-ready), pasture/fallow coats, tower keeps the sky,
      classifyFootprint demoted to the mason's advisory READING. Canon: stones
      byte-identical at every milestone; workdays −4 exact; events +3 exact;
      pending=1 fingerprinted at ticks 200/260. Baseline regen SIM 9→10. 88 tests.
- [x] SIM 11 — roofs join the designation grammar (2026-07-10, boss: "roof type
      should be selected like building type… with default being none"): plan_roof
      mints the span with material NULL (uncovered — nobody decks bare air, tested
      thirty idle days exactly); designate_roof names the covering (roof_covered
      event); the word-card runs ONE ask queue (pending enclosures + uncovered
      spans in creation order, span card floats at deck level); the roof-material
      cycle button retired. Canon: span uncovered through the 260 milestone
      (roofsUncovered=1 beside pending=1), bricked @382, 48/48 by 400; stones and
      workdays byte-identical to SIM 10; events +1. Regen SIM 10→11. 93 tests.
- [x] SIM 12 — drawings before the build (2026-07-10, boss: "when you plot the
      building it should ask what the roof will be before they build, after you
      select the roof then it asks you to select building type"): a plotted
      building pends from the PLOT (WallPlan.plans {roof, kind}); masons lay
      nothing until BOTH answers land, in order (choose_roof none-first, then
      designate the trade — 'the roof is chosen before the trade'); wood/straw
      dress the gable in the choice's tones, none keeps the sky, BRICK mints a
      REAL Roof span at completion (a floor above, tested at 3+0.25 exactly);
      tower/blacksmith render special-cases retired. Plus the FIT (boss
      screenshot: "roofs are not sitting on the structure properly"): eave sinks
      a course into the masonry + 0.55 m fascia skirt; the flat deck's band
      skirts down likewise. Canon: milestone 320 added; 200 fingerprints the
      WAITING shell (stones −708), 260 the crew MID-BUILD, 320 the uncovered
      span. Regen SIM 11→12. 96 tests.
- [x] SIM 13 — LEVEL COURSING (2026-07-10, boss: "what if we leveled the stone
      wall before the roof is added so regardless of height the layers are
      even"): every wall SURVEYED at plan time (surveyWall, frozen — sim +
      pencil share it, counts exact) onto one horizontal slab grid; TWO honest
      datums — buildings level to ONE flat bearing (stepped, partly buried
      footings billed), plain walls STEP their tops with the land like hillside
      dykes (the probe caught the single-datum bill: the gorge-bank field ring
      at 1921 stones vs its honest 629). Gate ops per-column; roofs bear on
      wall.levelTop flush by law; flat ground reduces EXACTLY to the old
      arithmetic (flat suites untouched). Canon regen SIM 12→13 (+812 footing
      stones site-wide; workdays 110=2×(200−145) exact). 97 tests. The old
      "LEVEL COURSING belongs with M2's wall ladder" open thread is PAID —
      what remains for M2 is thickness/wythes × stone demand.
- [x] THE UNDERWORLD FOUNDATION SHIPPED (2026-07-10/11, boss: "populate the world
      under the landscape with minerals… data for how quickly workers could dig
      through that area. rock production should exceed what is actually removed
      from the earth to encourage building great works"):
      · **Transcription tier DONE** — all 64 priority holes (≥30 m) read into
        schema JSON, 1545 intervals (research/boreholes/transcriptions/). A 64-agent
        vision fleet (Fable limit cut it at 25, resumed on Opus); rigorous — Kepier
        caught a missing scan page, Franwellgate a self-correcting clerk slip.
        tools/transcription-check.mjs is the QA gate (identity, running-sum,
        monotonic depth, final-vs-index, classification), honoring the real log
        variants (depth-primary, feet-inches, datum restarts, summary sections).
      · **Dig-rate research VERIFIED** — the ILO excavation ladder 5.0/3.5/3.0/2.0/
        0.8 m³/person-day (soft→rock) extracted verbatim from source + recovery
        ~29% verified; research/DIGEST-2026-07-10-dig-rates-and-yield.md. 7-lens
        fleet, 126 finder claims (verifier pass died on the limit → spine
        hand-verified; rest marked unverified).
      · **Bed model DONE** — tools/build-bed-model.mjs → public/data/site-durham/
        beds.json: 60 surface-registered strata columns (honest [depth−thickness,
        depth] intervals with unknown gaps) + named coal seams fitted to dipping
        planes (Tilley RMS 0.1 m, Busty 0.7); rockhead 0–73 m; local dip gentle
        S-SSE. SEAM-LADDER.md is the verified correlation spine.
      · **SIM 14 — THE QUARRY** (`02c868d` core + `0738d8c` render): plan_cut, a
        fill turned downward. Material-aware pace + generous stone yield read from
        the bed model and FROZEN into the command (sim core stays bed-free, saves
        self-contained — the SIM 13 survey pattern). Idle laborers dig it (a quarry
        outranks fields, not fills); the stockpile is credited once, on completion.
        src/sim/beds.ts (DIG_RATE, STONE_YIELD > 1.0), src/render/cuts.ts (the pit).
        Two-commit discipline: inert regen proved byte-identical numbers, then the
        canon quarry (tick 300 into bare Low Main Post) fingerprints it — 400
        milestone cutsComplete=1, stockpile 135, farmWorkdays 463→328 (the
        quarry-before-field law). Eye-checked LIVE (bridge back). 115 tests.
      SIM 14 follow-ons: pit reads subtly (contrast/depth cue — boss aesthetic
      call); people stand on the rim not the pit floor (people-layer descent);
      walls don't draw the stockpile yet (the CONSUMPTION loop — the natural next
      course); quarry gesture/depth/yield all open to the boss's riff. Bed
      exhaustion + per-stone provenance + wall ladder (thickness×wythes) remain
      M2's larger arc; Guédelon rates stand as calibration.
- [x] MINING = THE LAND DECIDES (2026-07-11, boss: "lets try something different, i'd like
      to see how you would implement mining" → at the water table: "far more interesting,
      keep pushing it"): the freeform-tunnel sketch RETIRED. Mining is READING the
      cross-section and taking beds where the land makes them cheap, gated by OVERBURDEN +
      WATER, worked by a ladder of methods the land affords. Design bible:
      proposals/PROPOSAL-MINING-2026-07-11.md; arc keystone: HANDOFF-THE-LAND-DECIDES.
      Shipped `b12f005`→`a39f77f`, 122 tests:
      · **input split** (`b12f005`): orbit→right-drag, LEFT is a pure pencil (the boss's
        "rotate and place are the same button"); left-drag freed for a future marquee.
      · **underground scaffold** (`8059182`): toggle U, ghosted hill, the strata VISIBLE, a
        working plane paged in fathoms with seam snap-horizons; datum reconciled (terrain
        Y = AOD; `seamElevationAt` added to beds.ts).
      · **Tilley fix** (`9f6e82e`): the new view PROBED the bed model — Tilley plotted below
        Busty (a 5-pick clustered-fit extrapolation); leverage guard nulls a plane
        extrapolating past its control at the site CENTRE (the Maudlin pattern). Surgical —
        only Tilley changed.
      · **the water table** (`e817826`): src/sim/water.ts, a subdued copy of the topography
        (`WATER_SUBDUED` 0.5); drowned rock washed blue — the map becomes a decision.
      · **the water-gated outcrop quarry** (`7f4dac3`): wins the DRY post within a shallow
        open-cut reach, refuses drowned/too-deep ("drive an adit"); only ~20% of the site
        affords it. Boundary-only — the sim never moved (baseline byte-identical).
      · **SIM 15 the adit — CORE** (`a39f77f`): self-draining drift (aditEconomics,
        plan_adit, the drive-and-credit loop); INERT-proven (two-commit discipline),
        self-draining claim unit-tested. NOT yet playable — the canon fingerprint + the
        two-click portal→heading tool + the portal-and-gallery render (src/render/adits.ts)
        are the immediate next course.
- [x] PLAYABLE ON THE WEB + THE FRONT DOOR (2026-07-11/12): the game left the local dev
      server and grew an entrance.
      · **GitHub Pages deploy** (`9e450a4`): push master → Actions builds the vite bundle →
        Pages at https://syntaxswine.github.io/freestone/. dist/ stays gitignored (CI builds
        fresh); base '/freestone/' for build, '/' for dev. THE SUBPATH LAW — new runtime
        fetches use import.meta.env.BASE_URL (an absolute /data or /assets 404s under the
        repo path). See memory project_freestone_pages_deploy.
      · **the front door** (`8943e2d`, boss: "make a tutorial for how mining works" + a title
        screen): home screen (full-art over HomeScreen.png, rescued from the build-wiped
        dist/ into public/assets/) — New Game (wired; reset = one-shot sessionStorage token +
        reload, the only ghost-free reset since layers bind to `world` at construction),
        Settings (wired; tutorial on/off in localStorage), Save/Load (spec'd stubs vs
        save.ts, disabled "soon"), Back (conditional). A gear (⚙) opens the home mid-game and
        PAUSES (frame gates on `started && !home.isOpen()`). The MINING TUTORIAL
        (src/render/tutorial.ts): an intro explainer → a persistent checklist (look
        underground → find a dry seam → quarry an outcrop) ticking off REAL events, ending on
        an adit tease. UI + input only — no SIM_VERSION bump, 122 tests green.
      · Known: the depth readout is SITE-CENTRE only (underworld.ts) — the seam step reads
        the centre column, not where you point; completable (dry sandstone at the centre) and
        it teaches the dry/drowned reading, but tying the readout to the camera is the pending
        prospect-on-hover course (task 48). Save/Load persistence + difficulty/economy
        settings are the natural follow-ons.
- [x] THE LIVING SETTLEMENT — step 3a: THE GRANARY, SIM 21 (2026-07-15, `4f241db`): the civic heart
      made a REAL building — the keystone a mid-step realization demanded (the bible's cart carries
      grain→the granary + the cat sits AT it, but no granary existed; SIM 20's harvest was an abstract
      ratio). `BUILDING_KINDS` gains `'granary'` (offered on the designation card, 🏛); the harvest
      (step.ts livingYear) reads it — capacity = founding floor + arable/AREA_PER_PERSON + granaries ×
      GRANARY_CAPACITY(5) — so a granary is a POPULATION LEVER (§4's soul grounded: mutual aid AND the
      population engine, one object). INERT on the canon (no granary designated → count 0; the pass
      doesn't run in 200 ticks; SIM_VERSION 20→21 + hashes the only move; 0 non-hash diffs).
      population.test.ts proves it (a granary flips a 6-mouth village hunger→growth over 5y); 159
      tests. Fourteenth mark (🌾). DEFERRED (the honest 3a minimum, immediate follow-ons): a distinct
      granary RENDER (plain shell today), the granary CAT (§7, boss-requested — now has a home), a real
      grain STOCK/flow, then 3b the CART (grain→granary, draws timber) + 3c the pyramid.
- [x] THE LIVING SETTLEMENT — step 2: THE LIVING YEAR, SIM 20 (2026-07-15, `7577667`): people are
      MORTAL and the settlement GROWS — §3 the mortal hands + §4 the harvest, what the woods' regrowth
      is finally measured against. **The demographic pass** (`livingYear`, worldStep's daily order,
      the last day of each year) runs on its OWN rng stream `seed:demo:<year>` so people-churn NEVER
      advances the masonry jitter cursor (§10 isolation — PROVEN: a settlement that doubled its people
      laid byte-identical stones): MORTALITY (age-curve survival rolls → person_died); the HARVEST
      (food capacity = founding floor + arable area/AREA_PER_PERSON; S = capacity/mouths, space-gated +
      easy per boss); BIRTHS (continuous, replacement→growth above BIRTH_FLOOR_S → person_born, a
      child); MIGRANTS (surplus-only fast valve → person_arrived); HUNGER (S<1.0 → person_left, never
      empties). AGING is real — `Person.bornTick`, the labor loops gate on isAdult (children don't dig
      or lay); founders begin STAGGERED (22/25/28/31, a FIXED spread, NOT rng — that would shift the
      jitter). INERT on the canon (the pass first fires tick 364, so the 200-tick canon never enters:
      0 non-hash diffs, 8/8 hashes from bornTick alone). **century-sweep** (`npm run sweep`,
      tools/century-sweep.mjs) = the tuning instrument — confirmed population TRACKS carrying capacity
      (cap 4→~4, 20→~20, 50→~50; births≈deaths at equilibrium; migrants taper as it fills). HUD: a food
      read. population.test.ts (6, incl. rng-isolation + byte replay) + century-sweep.test.ts → **158
      tests**; verified live via __cc (founders staggered; hold held; a seeded surplus grew 4→9 via
      migrants AND births, children born + aging). Thirteenth mark (🕯). LAWS: the demographic year
      runs on its OWN rng stream, never state.rng; a fixed stagger not an rng roll for founding ages;
      don't tune by eye (the sweep sets the knobs). DEFERRED (step 3): the clerk, sprite↔person
      binding, funeral-rest, name_apprentice + skill bands + First Technique, niche-gated households.
- [x] THE LIVING SETTLEMENT — step 1: THE WOODS, SIM 19 (2026-07-15, `df01154` inert scaffold +
      `02f7736` the bite): timber is a real WON/SPENT/REGROWING resource — the generational heart.
      **Scaffold** proven byte-identical inert on the canon (0 non-hash milestone diffs; only the new
      `stands: []` / `timber: 30` fields moved the hashes). **The bite**: a `plan_fell` freezes a
      cant's timberTotal/workTotal from the tree model at the boundary (`trees.timberInPolygon`) like
      plan_cut freezes stone from the bed model; a laborer fells the oldest stand under the axe
      (`moveEarth`, ranked under the adit), crediting `state.timber`; a WOOD wall DRAWS the stock
      (`TIMBER_PER_POST`/post) and STALLS dry (the "WOODS aren't a cost yet" seam retired); the felled
      stool REGROWS after `REGROWTH_TICKS` (~7 yr, `regrowWoods`) and re-cuts via the `fell` command
      (refused until grown). Tool: `🪓 fell (T)` ground-ring (planner `fell` mode) — draw over woods →
      plan_fell, over a mature regrown stand → re-cut; `trees.ts` clears the coppice and restores the
      EXACT trees on maturity. HUD: timber stock + "a cant returns in ~Ny". Canon re-authored (timber
      30→10 as wall B builds, →40 on a tick-137 coppice fell; ZERO wallId ripple — the late-fell
      trick). `woods.test.ts` 5 red specimens; **150 tests**; verified live via __cc (a 3 m³ cant
      felled → stock +3 → 3 trees cleared → matured → trees back to 16,872). Twelfth mark (🪓). LAWS:
      the woods are the quarry's twin; felling≠death (deterministic `placeTree` regrow); a late
      id-minting canon command = zero ripple. DEFERRED (noted in the handoff): the 2nd stock (oak
      standards, → step 5), the winter-felling season gate, the shoot-stage render ladder, the
      wood-pasture/coppice word-card, bare-ground-from-over-cut.
- [x] THE LIVING SETTLEMENT — step 0: THE YEAR MADE REAL + SIT THE SEASON (2026-07-15, SIM-neutral,
      `02465ac`): the prerequisite for the generational ladder — you cannot watch a coppice or a
      childhood at ×1. **The civic calendar** (`src/sim/types.ts`) — `SEASONS` (winter|spring|summer|
      autumn, CONSTANT strings) + `seasonOf`/`ticksUntilNextSeason`/`yearOf`/`dayOfYear`, all PURE
      functions of the tick (no state, never hashed; bounds = coarsening of farms.ts `seasonBand` so
      HUD & fields agree; winter = the dormant felling season). **Sit the Season** (`main.ts`) — a
      ⏭ transport verb that pumps `worldStep` to the next season turn within an 8 ms/frame budget,
      forecast on the button, any speed press cancels (pause never advances). HUD now `Year · Season ·
      day`. **No SIM_VERSION bump — baseline byte-identical**; +6 calendar tests → **145 green**.
      Verified at the kernel (rAF is paused in a backgrounded preview tab, so the HUD paint is proven
      by importing the shipped fns against real `__cc` ticks + pumping to the Sit target 321→425,
      landing exactly, winter→spring). Handoff: HANDOFF-THE-LIVING-SETTLEMENT-BUILD-2026-07-15.
      NEXT: step 1 THE WOODS, SIM 19 (the first baseline move of the arc — two commits).
- [x] SIM 18 — THE DRESS DIAL (carriage Phase 2, 2026-07-14): each stone wall is worked to a block
      class — rubble | scappled | ashlar — frozen at plan time, setting a LAY DEBT + a HAUL WEIGHT.
      · **the physics** (`78b03df` plan-row readout, byte-identical → `1ea7bf4` SIM 18): DRESS_SPEC —
        rubble {lay 0.5, haul 1.0}, scappled {1.0, 1.0} (the SIM-17 cost, absent-default → byte-
        identical), ashlar {2.0, 1.5}. layStones spends the level's layDebt from the mason quota;
        haulStone + the face/pile draw use DRESS_DRAW (STONE_VOLUME × haulFactor). All exact dyadic
        floats → IEEE-exact, no hash risk. A tall ashlar wall is dear to MOVE (face wants 1.5×/block,
        cart falls behind) AND to RAISE (2× mason-days); a rubble field wall flies up light.
      · **smart default + override** (boss pick + insight 2026-07-14): the class keys off the
        STRUCTURE — boundary autoDress(height): ≤1 m → rubble, ≥2 m → ashlar, else scappled — frozen
        when the dial reads 'auto'; a HUD dial (⚒ auto→rubble→scappled→ashlar) pins an override. The
        stone SHOWS the level (render-only, s.id-keyed): ashlar ×1.05 uniform, rubble ×0.90–0.98
        varied, plan-view scale only (course height untouched). *Tall structures need heavier blocks.*
      · **canon re-authored**: FR (field ring) + A (low hauled) go up rubble (FR done ~67, 2× fast);
        the tall tavern BS is ashlar — the deepest stall (hungry ~42 m³ + 2× slow), fed by a bigger,
        earlier relief Q2 (32 m³ @ t92), finishes ~123; FR 225 / BS 334 / roof 2531 HELD (dress moves
        TIMING, not counts). dress.test.ts: 6 red-specimen (lay speed, haul weight local+hauled,
        absent→scappled, conservation, byte replay). Verified live via __cc (bundle simVersion 18,
        rubble 220/220 vs ashlar 31 in 3 ticks; stone-mesh x-scale rubble 0.90–0.98, ashlar 1.05).
      · SIM_VERSION 17→18, **139 tests**, build clean, LIVE. Next: LIFT (Phase 3, needs WOODS) or adit.
- [x] SIM 17 — HAUL (carriage Phase 1, 2026-07-14): won stone no longer teleports pile→wall —
      each stone wall carries a FACE BUFFER + a haulRate frozen at plan time from the ROUTE.
      · **the metering** (`49799c3` bottleneck line → `48c8f27` SIM 17): worldStep threads a HAUL
        pass between WIN and LAY — a carted wall meters min(haulRate, pile, still-needed) into its
        face; LAY draws the FACE (carted) or the pile ('local'/timber, byte-identical to SIM 16).
        Wall-sited per boss pick: the lever is where you BUILD. Boundary (main.ts) freezes haulRate
        + method from the route (nearest dry post + climb + ×4 across the gorge to a bridge) —
        "cost the ROUTE, not straight-line" (§4.1), so Durham's *quarry local* falls out of geometry.
      · **canon re-authored** so wall A's face trickles (0.6 m³/day): WIN (t7/30) → HAUL (A partway
        at t65/80, full pile) → PILE stall (tavern 2233 at t100) → Q2 relief (t130) → span decked
        (t200, roofId 2531 HELD). haul.test.ts: 6 red-specimen (throttle, conservation
        pile+face+laid=won, pile cap, local-path equivalence, byte replay). Verified live via __cc.
      · SIM_VERSION 16→17, **133 tests**, build clean, LIVE. Next: DRESS dial (Phase 2) or the adit.
      · ALSO FIXED (`9cc6c1c`): render-smoke's roof test spun an INFINITE loop on an unsupplied wall
        since SIM 16, hanging the vitest pool → ~75 lingering node workers (~8 GB, two at ~30k
        CPU-s) — the boss's CPU/memory drain. Seeded the pile; the suite exits clean, 0 zombies.
- [x] SIM 16 — THE CONSUMPTION LOOP (carriage Phase 0, 2026-07-13): masonry now DRAWS the
      stockpile — the standing M2 economy the whole mining arc was for; the honest stall the
      sixth AND seventh maker's marks both dreamed of, made real.
      · **the loop** (`6dc4791` supply gauge → `73da767` SIM 16): a laid ashlar spends
        STONE_VOLUME (0.03375 m³) of won building stone; a dry pile STALLS the masons (HUD:
        ⚒ *waiting on stone*); timber draws no stone (the WOODS = carriage Phase 3). Global +
        one-shot; no terrain reads. Instruments-first (the gauge byte-identical), then the
        attributable bump — SIM 16 inherently moves the baseline, so no inert intermediate.
      · **canon re-authored** to tell the stall's story (baselines/durham-42.json): founding
        quarry Q1 → the stone walls build → the tavern STALLS mid-build (2233/2515, stockpile
        0) → relief quarry Q2 → it finishes. Every wall-building test now wins its stone through
        the LOG (a founding quarry) or a seeded pile, so replay-equals-live and "the log alone
        determines the world" hold unbroken.
      · SIM_VERSION 15→16, **127 tests**, build clean, LIVE. Next: HAUL (Phase 1) or the adit
        made playable.
- [ ] M1 design data (from the honest eye-check; polish, not bugs): scaffold sprite once
      walls pass ~2 m; per-station stone piles so laborers read on long walls; billboard
      sprites don't face the work; cursor ring is world-sized (0.65 m) and vanishes at
      high zoom; laborer hand-off has no receiving animation

## Later (ordered)
- [ ] M2 — Quarry loop end-to-end with per-stone provenance
- [ ] M3 — Generations: people, trades, apprenticeship, marks, chronicle skeleton
- [ ] M4 — The granary year: harvest→sheaves→threshing→granary + seed corn, foraging
      calendar, gleaning, famine / disease / accidents / winter, Great Barn tutorial work;
      tuned by headless sweep
- [ ] M5 — Homage & small works: chronicle book, mark inspection, memorials, Long Replay,
      tracing-floor palimpsest, page of unnamed hands, small-works system (§8b)
- [ ] M6 — Combat toggle
- [ ] M7 — Weathering, audio, Steam packaging

## Open threads
- THE GENERATIONAL FACTORY roadmap (step-back scoping 2026-07-14, boss: "scope out ways to
  improve the game and move it towards the goal of a generational factory castle maker"):
  proposals/ROADMAP-THE-GENERATIONAL-FACTORY-2026-07-14.md — produced by a 13-agent pass
  (2 censuses, 4 verify-at-source research agents, 5 design lenses → 43 candidates, 2
  adversarial critics), synthesized to six beats. Beat 0 = ONE CLOCK (write generation +
  coppice rotations on the same TICKS_PER_YEAR arithmetic INTO PROPOSAL-WOODS before any
  WOODS code — a constraint that expires if skipped). Beat 1 = WOODS (SIM 19: stands/cants,
  two timber classes poles~7–20yr / oak standards ~50yr, Hayley-Wood sustainable-harvest
  read, winter-felling season slot, countdown+return ledger lines as minimum ship). Beat 2 =
  memory suite (render-only, zero baseline: merged inspection stack, founder's stone,
  campaign patina, tracing-floor ghosts). Beat 3 = Lodge Book save/load (THE GATE — 10–25 h
  great works are impossible without persistence) + Annal V0 (one chronicle voice module;
  absorbs year page/season reckoning/years-with-names) + Bell + Sit-the-Season (one
  interrupt-tier table, two consumers) + construction chime. Beat 4 = THE SPINE as ONE
  batched SIM bump (mortality pass w/ staggered lifespans, coarse skill bands + apprentice
  bond, the First Technique wired to DRESS lay-debt, funeral protocol + dual-id succession
  stone, Testament, clerk, sprite-to-person binding, century-sweep tuning tool, household/
  surname data riders). Beat 5 = demand wave (wall ladder + SPOIL + provenance Lots + ditch
  & bank w/ terrain-concavity spike first + economy-core rider). Beat 6 = kiln (coal-fired
  lime — the seams' second customer) + two-stroke amplitudes + LIFT + the Keep as north star.
  Cuts: weathering-sim (patina covers it), charters, ride-the-cart, hollow-way rebate,
  appraisal, EDGE-as-smooth-scalar. Four boss questions open in §6 (spine timing, generation
  felt-length, over-cut scar tone, save-compat promise).
- MOVING STONE — the carriage layer (proposed 2026-07-13, boss: "there are a lot of factory-game
  logistics involved with moving the stone… cranes, pulleys, log rollers"): design plotted in
  proposals/PROPOSAL-LOGISTICS-2026-07-13.md (research pass: 79 agents, 56/67 claims verified).
  Idea: a WIN→HAUL→LIFT→LAY throughput pipeline, each stage a scalar frozen at the survey
  boundary from slope+route+river+season; the wall builds at min() of the four and stalls
  honestly (this CLOSES the standing consumption loop). "Deep model, shallow controls": the
  only levers are the dress-at-quarry dial, working siting, commission-a-crane, an optional
  river landing, and the one bottleneck line. Durham teaches by refusal — the Wear sits above
  its head of navigation (a MOAT, not a highway), so the cheap read is "quarry the Low Main
  Post underfoot," exactly as history did. **Phase 0 (LAY draws the pile) ✅ SHIPPED SIM 16
  (`73da767`); Phase 1 (HAUL — a route-frozen per-wall face buffer, wall-sited) ✅ SHIPPED SIM 17
  (`48c8f27`)** — a wall far from winnable stone, or across the gorge, stalls on the CART, and the
  bottleneck line names the link. Next: the DRESS dial (Phase 2, the ongoing lever whose right
  answer flips with the site) or the adit made playable. HARD
  PREREQUISITES flagged in the proposal: WOODS and SEASONS are render-only today → real
  consumable/sim-state are ground-up subsystems; HAUL must cost the ROUTE (with river
  crossings), not straight-line; the "6 t/day crane" number is the one UNVERIFIED figure (don't
  calibrate from it); biggest fun-risk = "diagnosed once then watched" → needs an ONGOING dial
  whose right answer changes as the wall rises. 9 open questions for the boss in §6.
- Wall ladder implementation (SCOPE §6, boss canon 2026-07-09): wythes/thickness/core
  parameters on WallPlan + slenderness height-gating + dry vs mortared pace. LAND IT WITH
  M2's quarry mechanics — thickness multiplies stone demand, so the two tune together;
  sim change → baseline regen discipline. Economy-core latent failure is an M4-hazard
  consumer of the same fields. PARTLY watchlist: medieval field-wall attestation
  (enclosure-era image vs 1200s practice) before enclosure content ships.
- Earthworks follow-ons (SIM 2 shipped 2026-07-09; ramps + roofs SIM 8 2026-07-10):
  true palisade geometry for wood (vertical posts, faster pace, no mortar cure) with
  the pace/economy pass; cut as well as fill — the CUT half is now the MINING arc
  (THE LAND DECIDES, 2026-07-11): the quarry is water/bed-gated (win the dry post,
  refuse the drowned) and SIM 15's self-draining ADIT reaches post under cover — see
  proposals/PROPOSAL-MINING-2026-07-11.md. Still open: the SPOIL coupling (one
  command's dirt feeding the other's rampart); building-
  footprint auto-fill ("fill the squares" — click inside a shell); material picker
  grows real stone kinds from the bed model (now that beds.json holds them). Roof follow-ons: pitched wood/straw geometry (today all decks are flat
  plates; the auto-gable on recognized buildings stays separate), roof-on-roof for
  towers, carpenters as a trade distinct from laborers, deck timber from the woods
  when the timber economy lands, span honesty (>6.5 m wants posts — the aisle rule
  applied to decks). Ramp follow-ons: ramp direction picker (today first-side-low),
  switchback ramps, spoil accounting shared with ditches.
- Designation follow-ons (SIM 10 shipped 2026-07-10, boss: "a pop up should appear
  with options of what can fill it… these options might unlock later"): the choice
  lists in main.ts (FIELD_CHOICES/SHELL_CHOICES) are data — an `enabled`/unlock flag
  is one field when progression lands; RE-designation (rotation! fallow→arable is the
  three-field course — needs a gesture on a designated plot and M4 rules for what
  changing use mid-year costs); herds for paddocks (the paddock exists, empty and
  honest, until animals are a system); building kinds gaining FUNCTION with trades
  (blacksmith with M2's tool economy, tavern with M3 people, tower with M6 defense —
  today kind is label + roof dressing; tower keeps the sky for crenellation later);
  card polish if the boss wants it: Esc to dismiss + a reopen chip (today the card
  stands until answered, non-modal); pending plots keep their trees until the word
  (deliberate: land is just land until put to a use).
- Farms/houses follow-ons (SIM 3 shipped 2026-07-10): crop ECONOMY belongs to M4
  (harvest/sheaves/gleaning; the seasonal field LOOK shipped render-only 2026-07-10 —
  PARTLY: precise Durham crop calendar, oats/barley weighting, two- vs three-field
  course are M4 research; also work honesty — winter is hedging/ditching, not arable
  tending year-round); gates SHIPPED IN FULL (SIM 7): auto-gate carved on the
  first-placed segment at plan time, masonry skips real openings, hurdle gates
  rendered, the gate tool (G) knocks gates into / walls them out of built field
  walls — next: field hands and later herds path THROUGH the gate, animals kept
  in/out, CART gates (~2.5 m — GATE_W is a 1.5 m foot gate) when carts exist,
  gates on non-farm walls = the M6 gatehouse course;
  a plough team (oxen!) for the spring band is the big theater upgrade; building
  OCCUPANCY belongs to M3 people; gradual field clearing + grubbing
  labor when the timber economy lands (today trees vanish on establishment);
  roof CARPENTRY as a real timber phase with days and materials (today the roof pops at
  wall completion); roofs for irregular (non-4-corner) shells — hip/straight-skeleton;
  LEVEL COURSING SHIPPED (SIM 13, 2026-07-10): buildings level to one datum, plain
  walls step — see the SIM 13 ledger entry; M2's remaining share is thickness/wythes.
  Overlapping/nested enclosures currently both count — revisit with M4
  land use. A hoe/tool sprite frame for field hands (today they pace the rows with
  walk frames). One-measure invariant at M4 yield time: an OFFSET double lap (laps
  >5 cm apart) still evades the overlap guard and inflates farm.area vs what tillage
  draws — when yields land, pay by the tillage (even-odd) measure, not recorded area.
- Trees → timber economy (render-side TreeLayer shipped 2026-07-09): when the wood
  material gets a cost, the gorge woods become the supply — felling as a sim command,
  cleared trees counted, regrowth over decades; coppicing is the honest medieval
  practice to research. Wood-material walls should eventually consume felled timber.
  **NOW FULLY SPEC'D: proposals/PROPOSAL-THE-LIVING-SETTLEMENT-2026-07-15.md** (the woods
  + the life/death spine they force + the harvest that grows the people + the specialization
  pyramid + the cart-first accelerant ladder). Coppicing researched (poles ~7–8yr / oak
  standards ~50yr; near-immortal stool; Baal Hill/Weardale = the Prince Bishops' real worked
  wood). Build order in §9, open boss questions in §12.
- Verify any research anchors marked PARTLY/UNVERIFIED in SCOPE.md §15 before the
  corresponding mechanic ships (house law: cross-check research disagreements). Known PARTLY
  from the second pass: winter-foraging thinness, villagers-shelter-in-castle framing
  ("attested in emergencies", not "customary"), the word "banker mason" itself (practice
  medieval, term possibly later), bell "me fecit" dating, the ~50% wild-taxa archaeobotany
  figure (snippet-level only).
- Title resolved (Castle Cultivator); rename of repo/dir deferred until worth the link churn.
- Wishlist items #1/#7 (technique tokens, person mobility) should shape M3's people-sim data
  layout even if the features land later; #2 (real beds) belongs in M2's design from day one
  — cheap to found, expensive to retrofit.
- M1/M2 site work (once Q8 confirmed): pull EA LiDAR 1 m DTM + BGS 50k mapping for the
  chosen site; de-modernization pass; download + hand-transcribe the borehole log scans in
  the map box into the bed model (budget real hours — they're raster scans); grab the Mining
  Remediation Authority abandoned-mine GeoPackage; study the BGS GeoIndex synthetic-borehole
  viewer as the UX reference for our bed-query tool; email BGS Data Services asking whether
  an unlisted LithoFrame model covers the site (cheap per-km² if so).
- Harvested from rejected sites: carvable-undercroft mechanic + crown-hole unknown-void
  hazard (Nottingham); fossil-in-the-dressed-stone zoom detail (Dudley's reef limestone →
  ours via Durham's Frosterley Marble); medieval mine workings as unrecorded voids (MRA).
- Fire honest gaps: no in-window bucket chains (tubs + hooks only); no "bells rung backwards";
  never quote "3,000 dead in 1212" as fact (Stow 1603 legend).
- Occupational-surname coalescence (§7) — delightful, but confirm it doesn't complicate
  save-format identity; people need stable IDs independent of display names.
- Port decision Electron vs Tauri deferred to M7; nothing before then may depend on either.
