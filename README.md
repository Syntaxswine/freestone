# Freestone *(working title)*

A generational castle-building game. You are the Work itself — the lodge, the plan that
outlives its builders. Small DS-scale people quarry, season, dress, and lay real stones over
real decades; they grow old and die doing it, and their children finish what they started.

- Peaceful by default; combat is an optional toggle.
- Realistic quarrying and masonry — the science *is* the pacing (lime mortar cures slowly;
  green stone must season; winter halts the walls).
- Hazards write the chronicle: famine, disease, construction accidents. They scar and
  redirect; they never delete your work.
- Homage as mechanics: mason's marks on every stone, memorial slabs, the Long Replay
  timelapse of a century of building.
- 3D terrain and real block geometry, billboarded sprite people, low-stress, $3.99 scale.

**Status:** M0 — scoping. Read [SCOPE.md](SCOPE.md) for the full design; [BACKLOG.md](BACKLOG.md)
for milestones and open threads.

**Stack (planned):** TypeScript + Three.js + Vite; deterministic headless sim core with
event-sourced replay saves (the save IS the chronicle IS the timelapse IS the test fixture).
