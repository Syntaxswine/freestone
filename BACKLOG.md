# Freestone backlog

Milestones are defined in [SCOPE.md](SCOPE.md) §13. Each milestone ends with a push.

## Now
- [x] M0 — Scope document + research anchors (2026-07-09)
- [x] M0.5 — Granary/commons/small-works integration (2026-07-09): civic thesis (mutual aid +
      mutual defense) as pillars 6-7, new §8a (granary, Great Barn, seed corn, gleaning,
      commons, foraging year) + §8b (small works catalog, honest-dating filtered), siege
      rework (stores-vs-patience), tracing-floor palimpsest + page of unnamed hands (§9.7-8).
      Research: 6 agents, 78 claims, 18 skeptic checks → research/DIGEST-2026-07-09-*.md
- [ ] Boss review of SCOPE.md open questions (§14): title shortlist (Castle Architect /
      Stone by Stone / Freestone), player identity, era, combat flavor, idle tolerance,
      chapel long-game scope, Q7 tone ceiling (refeeding stays / expulsion refused)

## Next
- [ ] M1 — First Wall: terrain, camera, wall-line drawing, instanced stone accretion,
      stub workers. Acceptance: watching a wall grow for 5 minutes is *pleasant*.
- [ ] M1 groundwork: deterministic `worldStep` skeleton + seed-first RNG + event-log save
      format (before any rendering — the sim law comes first)

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
- Title decision at M7; shortlist and tradeoffs live in SCOPE §14.1.
- Occupational-surname coalescence (§7) — delightful, but confirm it doesn't complicate
  save-format identity; people need stable IDs independent of display names.
- Port decision Electron vs Tauri deferred to M7; nothing before then may depend on either.
