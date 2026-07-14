# HANDOFF — THE CARRIAGE LAYER (and the day the game opened its doors)

*2026-07-13 · from the session that gave the game a front door, put it on the web, and
plotted how the stone moves · Castle Cultivator (repo codename `freestone`)*

You are the next builder. Read the FOUNDATION keystone first
([HANDOFF-FOUNDATION-2026-07-09.md](HANDOFF-FOUNDATION-2026-07-09.md) — the soul, the laws,
**SEVEN maker's marks** now; add yours BELOW, never above), then the mining keystone this
one stands on ([HANDOFF-THE-LAND-DECIDES-2026-07-11.md](HANDOFF-THE-LAND-DECIDES-2026-07-11.md)).
Then read the design this session exists to hand you:
[PROPOSAL-LOGISTICS-2026-07-13.md](PROPOSAL-LOGISTICS-2026-07-13.md).

This session did two things: it **shipped a front door** (§1) so a stranger can reach and be
taught the game, and it **plotted the carriage layer** (§2) — the "factory-game logistics" of
moving the stone, which is the biggest course now waiting to be built. Nothing of the carriage
layer is code yet. This handoff preserves the plan.

> **UPDATE — 2026-07-13 (later the same day): PHASE 0 SHIPPED.** The consumption loop is closed
> (SIM 16; commits `6dc4791` supply gauge → `73da767` the loop; pushed, LIVE). Masonry now DRAWS
> the stockpile and a stone wall STALLS honestly when the pile runs dry — the HUD names it,
> ⚒ *waiting on stone* — while a timber wall still builds free (the WOODS aren't a cost yet).
> The determinism canon was re-authored to tell the stall's own story (quarry → build → stall →
> relief); every wall-building test now wins its stone through the log or a seeded pile so
> replay-equals-live holds. §6 (state) and §7 (next courses) below are updated; the eighth
> maker's mark in the FOUNDATION records the day, and the full Phase 0 account is its own
> keystone, [HANDOFF-THE-HONEST-STALL-2026-07-13.md](HANDOFF-THE-HONEST-STALL-2026-07-13.md).
> **Next course was the carriage layer's Phase 1 (HAUL + the bottleneck line).**
>
> **UPDATE — 2026-07-14: PHASE 1 SHIPPED.** HAUL is closed (SIM 17; commits `49799c3` bottleneck
> line → `48c8f27` the metering; pushed, LIVE). Each stone wall carries a FACE BUFFER + a haulRate
> frozen at plan time from the ROUTE — a wall far from winnable stone, or across the gorge, stalls
> on the CART, and the bottleneck line names which link starves. Boss picked the **wall-sited**
> model (the lever is where you BUILD). The ninth maker's mark (🛒) records the day; the full
> account is its keystone, [HANDOFF-THE-CART-2026-07-14.md](HANDOFF-THE-CART-2026-07-14.md).
>
> **UPDATE — 2026-07-14 (later): PHASE 2 SHIPPED.** The DRESS dial is closed (SIM 18; `78b03df`
> plan-row readout, byte-identical → `1ea7bf4` the physics; pushed, LIVE). Each stone wall is worked
> to a block class — rubble | scappled | ashlar — that flips with the STRUCTURE (a smart default the
> dial overrides): a LAY DEBT (rubble 0.5, ashlar 2×) + a HAUL WEIGHT (ashlar carts 1.5×), so a tall
> ashlar wall is dear to MOVE and to RAISE, a rubble field wall flies up. Boss pick + insight: *tall
> structures need heavier blocks*; the stone shows the level (ashlar bigger & uniform, rubble smaller
> & mottled). The tenth maker's mark (🎚) records the day. **Next course is LIFT (Phase 3, needs the
> WOODS as a real consumable) or the adit made playable.**

---

## 1. What SHIPPED this session (all pushed; SIM_VERSION still 15; 122/122 green)

- **Playable on the web** (`9e450a4`). A GitHub Actions build publishes the vite bundle to
  Pages — **LIVE at https://syntaxswine.github.io/freestone/**. Push master → it deploys.
  `dist/` stays gitignored (CI builds fresh); `vite.config.ts` sets base `/freestone/` for the
  build, `/` for dev so `play.cmd` still works. **THE SUBPATH LAW:** any new runtime asset
  fetch MUST use `import.meta.env.BASE_URL` (an absolute `/data` or `/assets` 404s under the
  repo path); `src/vite-env.d.ts` gives tsc the `import.meta.env` types. Full record in memory
  [[project-freestone-pages-deploy]].
- **The front door** (`8943e2d`; BACKLOG reconcile `d7be6dd`). The home screen the boss's art
  (`HomeScreen.png`) was made for — rescued from the build-wiped `dist/` into committed
  `public/assets/`. `src/render/homescreen.ts` builds it; `src/render/tutorial.ts` the tutorial.
  - **New Game** (wired), **Settings** (wired — one toggle: mining tutorial on/off in
    localStorage), **Save/Load** (spec'd stubs, disabled "soon" — the format already exists in
    `src/sim/save.ts`), **Back** (only when a game's in progress). A **gear (⚙)** opens the home
    mid-game and PAUSES (the frame loop gates stepping on `started && !home.isOpen()`).
  - **RESET-BY-RELOAD LAW:** New Game on an in-progress game reloads with a one-shot
    `sessionStorage` token and autostarts — the only ghost-free reset, because every render
    layer binds to `world` at construction (an in-place swap would strand them).
  - **The mining tutorial:** a one-time intro explainer → a persistent corner checklist (look
    underground → find a dry seam → quarry an outcrop) that ticks off REAL events (hooks in
    `setUnderground`, the depth readout, the `plan_cut` enqueue), ending on an adit tease.
- **UI + input only** across the whole session — no new command, no `SIM_VERSION` bump,
  `worldStep`/`save.ts`/the baseline untouched. Verified live in the preview bridge (WebGL
  screenshots time out — drove it via the `__cc` probe + real synthetic keypresses).

## 2. The COURSE this hands you: THE CARRIAGE LAYER

The boss: *"there are a lot of factory-game-like logistics involved with moving the stone —
cranes, pulleys, log rollers… plot out a system of realistic elements that could be converted
into simplified gameplay."* The full plot is
[PROPOSAL-LOGISTICS-2026-07-13.md](PROPOSAL-LOGISTICS-2026-07-13.md); the spine:

- **The guiding idea — carriage is the game, and the land already knows the price.** A wall is
  fed by four stages in series — **WIN → HAUL → LIFT → LAY** — and builds only as fast as the
  *slowest*, stalling honestly and *naming why*. Each stage's rate is a scalar the boundary
  layer freezes from the terrain (extending "the land decides" from overburden+water to
  **+ slope + route + river + season**), exactly as `plan_cut` freezes `workTotal`. **This
  closes the standing consumption loop** the game has owed itself since SIM 14 — the sixth
  mark's forward dream ("*a wall someday STALLS because the mining hasn't kept pace*"), made
  real.
- **Deep model, shallow controls.** The depth lives in the sim and the field-guide provenance;
  the whole interaction surface is **one bottleneck line** + four levers: the **dress-at-quarry
  dial** (haul-rough ↔ dress-at-pit — the headline), **working siting = the haul verdict**,
  **commission-a-crane** (windlass floor → treadwheel), and an optional **river landing**.
  Everything else (vehicle, ox-vs-horse, winter-haul, scaffolding, lewis-vs-tongs) is modeled +
  animated but never micromanaged. This is the $3.99 posture *and* the most science-honest,
  because the honesty is printed, not fiddled.
- **Durham teaches by refusal.** The Wear at the peninsula sits **above its head of navigation**
  — a moat, not a stone highway — and because haul costs the ROUTE (a bed across the gorge needs
  a bridge detour), the cheapest read is the historical optimum with zero scripting: **quarry
  the Low Main Post underfoot, dress it at the pit, haul it a trivial downhill distance** —
  exactly what the real cathedral builders did in 1093–1133. The Frosterley marble carted ~18
  mi overland from Weardale is the premium-import counter-note.
- **Phased build order** (two-commit determinism each): **Phase 0 — close the loop with what
  exists** (make LAY *draw* the stockpile so walls stall honestly; no terrain reads yet) → Haul
  + the bottleneck line → the dress dial → Lift → season/mortar-cure → the landing. Each stage
  is a boundary-frozen scalar; ~0 sim-core churn.

## 3. How the plan is GROUNDED (and where it's honest about weakness)

The design rests on a verified research pass (**79 agents, 56 of 67 load-bearing claims
supported against real sources** — Salzman's 12-mile break-even, Masschaele's land:river:sea
8:4:1, Guédelon's ~8× dress-labour swing and ~500 kg treadwheel lift, lime's ~6-month
carbonation, Durham's above-navigation Wear). The appendix in the proposal cites them. It also
carries the adversarial critique's corrections **on the face of the doc**, not buried:

1. **HAUL must cost the ROUTE, not straight-line distance** — else a bed just across the Wear is
   under-costed and Durham's "quarry local" lesson comes from a hand-tuned river term instead of
   the geometry. The single most important modeling fix.
2. **LIFT needs a discrete weight CEILING** (`maxBlock`), not only a rate — a pure-rate lift
   can't say "this 8 t voussoir exceeds the windlass, full stop."
3. **HAUL is `frozen route-cost × deterministic season(tick)`**, not one frozen scalar. Own it
   (season is a pure function of the tick; determinism intact).
4. **WOODS and SEASONS are render-only today** (TreeLayer; seasonal tints). Making them real
   consumable/sim-state are **ground-up subsystems**, not free extensions — and the design leans
   on both. Sequence them as prerequisites (Phase 3 wants WOODS; Phase 4 wants SEASONS).
5. **One number not to trust:** a "~6 t/day crane throughput" figure traced to a single travel
   blog — flagged UNCERTAIN. Derive `liftRate` from the verified anchors, not from it.
6. **Biggest risk to FUN — "diagnosed once, then watched."** Each site offers one obvious fix,
   after which logistics can collapse into a one-time siting puzzle + passive waiting. Prototype
   the mitigation first: an *ongoing* dial whose right answer CHANGES as the wall rises (dress
   level shifting as the crane arrives; a seasonal supply trade against the granary), so there's
   a decision every season, not once per quarry.

## 4. New principles this session paid for

1. **Deep model, shallow controls.** When a system is genuinely deep (four staged rates, season,
   feed), don't expose the depth as gauges — expose it as ONE legible line and a handful of
   one-move reliefs. The depth earns its place in the sim and the printed provenance; the
   coziness is that reading-and-relieving is the whole loop.
2. **Carriage is "the land decides," extended.** The same terrain read that gates *where* you
   take stone (overburden + water) gates *how dearly it reaches the wall* (slope + route + river
   + season). A whole logistics method is a boundary-frozen affordance — near-zero core churn,
   the SIM 13/14/15 freeze law carried one lever further.
3. **Reset-by-reload.** For a page-based deterministic game, the only ghost-free "New Game" is a
   reload with a one-shot token — because the render layers bind to `world` at construction.
   Don't try to swap the world object in place.
4. **The subpath law (deploy).** Under Pages the app lives at `/freestone/`, not root; every
   runtime fetch honors `import.meta.env.BASE_URL`. Verified live: the home art returns 200 on
   the subpath.

## 5. Traps of this session (pay once)

- **The tutorial's depth readout is SITE-CENTRE only** (`underworld.ts` `readout()` samples
  `extentX/2, extentY/2`). So the "find a dry seam" step reads the *centre* column, not where
  you point. It's completable (dry sandstone at ~32 fathoms at the centre) and teaches the
  reading, but tying the readout to the camera is the pending **prospect-on-hover** course (task
  48) — and the carriage layer's route read wants the same "read where you point" surface.
- **WOODS / SEASONS are render-only.** The two-commit inert discipline hides but does not remove
  that these are ground-up subsystems; don't cost a mechanic against them until they're real.
- **Route, not straight-line.** When HAUL lands, cost the path with crossings, or Durham lies.
- **WebGL screenshots time out in the preview bridge.** Verify via `__cc` probe + real synthetic
  key/DOM events + network 200s; eyeball the render in a normal browser. (Cousin of
  [[preview-screenshot-timeout-webgl]].)

## 6. State of the fabric

SIM_VERSION **18** · **139 tests** (all green) · through carriage **Phase 0** `6dc4791` → `73da767`,
**Phase 1 (HAUL)** `49799c3` → `48c8f27`, and **Phase 2 (DRESS)** `78b03df` → `1ea7bf4`, all pushed ·
**playable on the web** at https://syntaxswine.github.io/freestone/. The player must win stone before
a wall will rise (SIM 16), the stone must REACH the wall by cart at a route-frozen rate (SIM 17), AND
each wall is worked to a block class — rubble/scappled/ashlar — that sets its lay debt and haul
weight (SIM 18): a tall ashlar wall is dear to move AND to raise, a rubble field wall flies up light.
The adit exists in the sim (self-draining, proven inert) but is **not yet playable**. Of the carriage
layer, **Phase 0 (consumption), Phase 1 (HAUL) and Phase 2 (DRESS) are BUILT**; LIFT, seasons and the
landing are **plotted, not built**. (Phase-1 account: HANDOFF-THE-CART; Phase-2: commit `1ea7bf4` +
the tenth maker's mark in FOUNDATION.)

## 7. Next courses (the boss picks the thread; I asked and it's open)

Two live courses, no forced order — the boss's open question at the end of this session was
literally *"which thread do you want to pull on first?"*:

1. **The adit, made playable** (mining's teed-up next, from THE LAND DECIDES §5.1): the canon
   fingerprint (the attributable half of SIM 15) + the two-click portal→heading tool +
   `src/render/adits.ts` (a mouth in the scarp, a drift receding in). Completes the mining
   vision *visually*.
2. **The carriage layer, Phase 1 — HAUL + the bottleneck line** ✅ **SHIPPED (SIM 17, `48c8f27`)** —
   a boundary `haulRate` + `method` frozen from the route (nearest dry post + climb + ×4 across the
   gorge to a bridge), a per-wall face buffer WIN meters into, and the one line naming the binding
   stage. Cost-the-ROUTE done (§4.1); Durham's "quarry local" falls out of the geometry. Boss picked
   the wall-sited model. **Phase 2, the DRESS dial, ✅ SHIPPED (SIM 18, `1ea7bf4`)** — the block class
   (rubble/scappled/ashlar) flips with the STRUCTURE via a smart default the dial overrides; the
   ashlar tavern is the deepest stall. **Next is LIFT (Phase 3, needs the WOODS) or the adit.**
3. Then, as the boss steers: **prospect-on-hover** (task 48 — read what a spot affords; the read
   surface both the tutorial's seam step and the carriage route read want), the carriage HAUL
   stage + bottleneck line, the WOODS/SEASONS subsystems the deeper phases need.

## 8. Open questions for the boss

The carriage proposal §6 holds **nine** (distance rescale to the ~500 m peninsula while keeping
the 8:4:1 ratio exact; metered vs one-shot delivery; dress as lever vs readout; crane prompt vs
auto; does the river earn its place *at Durham*; shared banker-hours vs typed labour; failure
appetite — deterministic-recoverable vs never; feed frozen-at-plan vs live; mortar clock now vs
M4). The three sharpest, surfaced to the boss this session: the distance rescale, whether the
landing earns its place at Durham at all, and the failure appetite (my lean: gentle,
deterministic, recoverable — never a random breakdown).

---

*The game had no door when this session began; now a stranger opens it, is taught to read the
land, and plays it in a browser. And the thing that comes next is already plotted: the stone
learning to MOVE — dressed at the pit, hauled downhill over the frozen Wear, lifted by a wheel
two workers walk, laid only as fast as the slowest cart, so a wall finally stalls honestly and
names why. Someone will feed that work the way a real lodge did, and never know the day the plan
was drawn, or by whose hand. That is exactly right. The courses beneath — and the ones beneath
THOSE — hold. Build on.*
