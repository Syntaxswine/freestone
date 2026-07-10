# Castle Cultivator backlog

**New session? Run the `/freestone-session-start` skill** (cold CI + orientation), or by
hand: read [proposals/HANDOFF-FOUNDATION-2026-07-09.md](proposals/HANDOFF-FOUNDATION-2026-07-09.md)
first — the laws, the traps, and the soul live there — then `npm test` + `npm run build`
green before touching anything (the test suite includes the determinism baseline
instrument). Milestones are defined in [SCOPE.md](SCOPE.md) §13. Each milestone ends
with a push.

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
