# Castle Cultivator backlog

**🗿 Current handoff: [proposals/HANDOFF-THE-DRESSED-STONE-2026-07-14.md](proposals/HANDOFF-THE-DRESSED-STONE-2026-07-14.md)**
(reads the FOUNDATION keystone first — the soul, the nine laws, TEN maker's marks — then the
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
