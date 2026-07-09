# Freestone backlog

Milestones are defined in [SCOPE.md](SCOPE.md) §13. Each milestone ends with a push.

## Now
- [x] M0 — Scope document + research anchors (2026-07-09)
- [ ] Boss review of SCOPE.md open questions (§14): title, player identity, era, combat
      flavor, idle tolerance, chapel long-game scope

## Next
- [ ] M1 — First Wall: terrain, camera, wall-line drawing, instanced stone accretion,
      stub workers. Acceptance: watching a wall grow for 5 minutes is *pleasant*.
- [ ] M1 groundwork: deterministic `worldStep` skeleton + seed-first RNG + event-log save
      format (before any rendering — the sim law comes first)

## Later (ordered)
- [ ] M2 — Quarry loop end-to-end with per-stone provenance
- [ ] M3 — Generations: people, trades, apprenticeship, marks, chronicle skeleton
- [ ] M4 — Hard years: famine / disease / accidents / winter, tuned by headless sweep
- [ ] M5 — Homage layer: chronicle book, mark inspection, memorials, Long Replay
- [ ] M6 — Combat toggle
- [ ] M7 — Weathering, audio, Steam packaging

## Open threads
- Verify any research anchors marked PARTLY/UNVERIFIED in SCOPE.md §15 before the
  corresponding mechanic ships (house law: cross-check research disagreements).
- Occupational-surname coalescence (§7) — delightful, but confirm it doesn't complicate
  save-format identity; people need stable IDs independent of display names.
- Port decision Electron vs Tauri deferred to M7; nothing before then may depend on either.
