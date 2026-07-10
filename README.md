# Castle Cultivator

*(development codename `freestone` — the repo keeps it until a rename is worth the links)*

A generational castle-building game. You are the Work itself — the lodge, the plan that
outlives its builders. Small DS-scale people quarry, season, dress, and lay real stones over
real decades; they grow old and die doing it, and their children finish what they started.

- Peaceful by default; combat is an optional toggle.
- The granary is the heart: government is mutual aid + mutual defense, and the granary is
  both — it answers the lean years and it answers the siege. The first great work is a barn.
- Beauty is in everyone's hands: villagers make small works on their own — gardens, whittled
  toys, scratched daisy wheels, harvest feasts — and that, not a score, is what prosperity is.
- Realistic quarrying and masonry — the science *is* the pacing (lime mortar cures slowly;
  green stone must season; winter halts the walls).
- Hazards write the chronicle: famine, disease, construction accidents. They scar and
  redirect; they never delete your work.
- Homage as mechanics: mason's marks on every stone, memorial slabs, the Long Replay
  timelapse of a century of building.
- 3D terrain and real block geometry, billboarded sprite people, low-stress, $3.99 scale.

**Status:** M0 — scoping. Read [SCOPE.md](SCOPE.md) for the full design; [BACKLOG.md](BACKLOG.md)
for milestones and open threads.

**Stack:** TypeScript + Three.js + Vite; deterministic headless sim core with event-sourced
replay saves (the save IS the chronicle IS the timelapse IS the test fixture).

## Development

```
npm install
npm run dev     # vite on port 8745
npm test        # vitest: determinism / replay / provenance suite
npm run build   # tsc typecheck + vite build
```

The sim law lives in [src/sim/step.ts](src/sim/step.ts): physics advances only through
`worldStep`; the rng cursor lives in `WorldState.rng` and only `worldStep` moves it; UI
speed is transport. Saves are `{seed, commands}` — see [src/sim/save.ts](src/sim/save.ts);
`replay(save) === live` is enforced by [test/determinism.test.ts](test/determinism.test.ts).
The site is a data package ([src/sim/site.ts](src/sim/site.ts)); Durham terrain lands in
`data/site-durham/`.
