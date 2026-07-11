# Castle Cultivator backlog

**🗿 Current handoff: [proposals/HANDOFF-HUSBANDRY-2026-07-10.md](proposals/HANDOFF-HUSBANDRY-2026-07-10.md)**
(reads the FOUNDATION keystone first — the soul, the nine laws, the maker's marks —
then the TOYBOX course; husbandry carries SIM 3–9's laws, traps, and next steps).

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
- [ ] M2 — Quarry loop: bed model FIRST from real logs (boss decision 2026-07-09:
      TRANSCRIBE FIRST). Census DONE: 900 boreholes in-box, 900 with scans
      (research/boreholes/index.json via tools/fetch-borehole-index.mjs); scan→PNG
      pipeline DONE (tools/fetch-borehole-scan.mjs); schema DONE from pilot reads
      (research/boreholes/TRANSCRIPTION-SCHEMA.md — pitman's vernacular dictionary,
      ffi units verbatim, arithmetic cross-check, confidence flags). NEXT: transcribe
      the priority tier (64 holes ≥30 m, ~200 pages — the real-hours spend); build
      tools/transcription-check.mjs with the first batch; then bed model, then
      mechanics. Bed exhaustion designed in from day one; Guédelon rates as calibration
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
- Wall ladder implementation (SCOPE §6, boss canon 2026-07-09): wythes/thickness/core
  parameters on WallPlan + slenderness height-gating + dry vs mortared pace. LAND IT WITH
  M2's quarry mechanics — thickness multiplies stone demand, so the two tune together;
  sim change → baseline regen discipline. Economy-core latent failure is an M4-hazard
  consumer of the same fields. PARTLY watchlist: medieval field-wall attestation
  (enclosure-era image vs 1200s practice) before enclosure content ships.
- Earthworks follow-ons (SIM 2 shipped 2026-07-09; ramps + roofs SIM 8 2026-07-10):
  true palisade geometry for wood (vertical posts, faster pace, no mortar cure) with
  the pace/economy pass; cut as well as fill (ditches — the spoil feeds the rampart,
  one command's dirt is the other's); building-footprint auto-fill ("fill the
  squares" — click inside a shell); material picker grows real stone kinds from the
  bed model. Roof follow-ons: pitched wood/straw geometry (today all decks are flat
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
  LEVEL COURSING: courses ride per-column ground so wall tops are wavy on slopes under
  a level eave — real masons build to level and step the foundation; belongs with M2's
  wall ladder. Overlapping/nested enclosures currently both count — revisit with M4
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
