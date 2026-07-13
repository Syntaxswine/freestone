# HANDOFF — THE HONEST STALL (the day masonry learned to want stone)

*2026-07-13 · from the session that closed the consumption loop — Phase 0 of the carriage
layer, SIM 16 · Castle Cultivator (repo codename `freestone`)*

You are the next builder. Read the FOUNDATION keystone first
([HANDOFF-FOUNDATION-2026-07-09.md](HANDOFF-FOUNDATION-2026-07-09.md) — the soul, the nine laws,
**EIGHT maker's marks** now; add yours BELOW, never above), then the keystone this one stands on
([HANDOFF-THE-CARRIAGE-LAYER-2026-07-13.md](HANDOFF-THE-CARRIAGE-LAYER-2026-07-13.md) — the plan
this session built the first phase of), then the design it serves
([PROPOSAL-LOGISTICS-2026-07-13.md](PROPOSAL-LOGISTICS-2026-07-13.md), especially §5 Phase 0 and
§4 the honesty flags).

The boss handed the choice of the next thread to the builder: *"proceed with the plans of the
builder before, but this is your work — make it in the way that speaks to your truth."* Two
maker's marks in a row had written the same dream in their own words — the sixth (💧) and the
seventh (🚪) both reached for **a wall that STALLS, honestly, because the mining hasn't kept
pace.** I could not walk past it. So I built it, and the loop this game has owed itself since the
first pit is closed. This is the record.

---

## 1. What SHIPPED (SIM_VERSION 15→16, 127 tests green, build clean, LIVE)

Two commits (the two-commit discipline), then the archive:

- **The supply gauge** (`6dc4791`, byte-identical, SIM 15). Instruments before the mechanism: the
  HUD status line now shows the won-stone pile the moment a quarry is opened (even at 0 m³), so a
  player can read their masons' supply as it rises and falls. Render-only — the determinism
  baseline did not move. This is the gauge the loop is *watched on*.
- **The consumption loop** (`73da767`, SIM 16 — the attributable bump). `layStones` now DRAWS the
  stockpile: a laid ashlar spends `STONE_VOLUME` (`STONE_LEN·STONE_DEPTH·COURSE_HEIGHT` =
  0.03375 m³, the block's own dressed volume), and when the pile can't afford a stone the masons
  **stall** — the crew picks the oldest wall it can actually *work*, and if that's a starved stone
  wall it waits. **Timber draws no stone** (a wood wall skips the check — the WOODS are the
  carriage layer's Phase 3, not a cost yet), so a palisade climbs while a stone wall beside it
  waits, the whole loop legible in one glance. Global + one-shot + no terrain reads — exactly
  Phase 0 as PROPOSAL-LOGISTICS §5 drew it. The HUD names the starve: **⚒ waiting on stone**.
- **The docs** (`7fc13c1`): the eighth maker's mark, the carriage handoff's updated state/next,
  and the BACKLOG ledger.

**The canon had to be re-authored, and that is the interesting part.** SIM 16 moves the baseline
everywhere the old canon built stone walls on an empty pile (which was everywhere — it built for
360 ticks before its single quarry landed). There is **no inert intermediate** for a change that
inherently perturbs the baseline (unlike the adit, whose machinery the canon simply didn't
exercise), so the honest move was one attributable commit that regenerates the baseline with the
*why* in the message. The new canon (`baselines/durham-42.json`) MODELS the new physics path — it
tells the loop's whole arc:

| milestone | reading |
|---|---|
| t7 / t30 | a WOOD wall builds free while a SANDSTONE wall stalls on an empty pile (stones climb on timber alone, stockpile 0) |
| t65 | the founding quarry Q1 holes through (55 m³); the stone walls build off it |
| t80 | wall A + the stepped-footing farm ring done; the ring pends for its word |
| **t100** | **the plotted tavern STALLS mid-build — 2233/2515 stones, stockpile 0** |
| **t130** | **the relief quarry Q2 lands (20 m³) and the tavern finishes** — starve → relief → resume |
| t200 | a door + a second gate cut, one walled back up (infill draws stone), the uncovered span bricked into a deck; four invalid commands reject as before |

`consumption.test.ts` (5 red-specimen tests) shapes the mechanism: a dry pile lays nothing; a
lump of won stone buys **exactly** `floor(stone / STONE_VOLUME)` courses, no more; a wall stalls
mid-build then RESUMES when a fresh quarry lands; timber builds free; a consumption run replays
byte-for-byte. And **every pre-existing wall-building test** (enclosures, gates, fieldwork,
ramps-roofs, earthworks, cuts, adits, determinism) now wins its stone honestly — see §3.

## 2. Laws paid for this session

1. **Instruments-first even when there is no inert commit.** The two-commit discipline exists to
   keep a baseline move from hiding inside a neutral-looking change. When the change *is* the
   baseline move (a global consumption loop), you cannot split off an inert half — so you split
   off the **instrument** (the byte-identical readout) as commit one, and make the physics one
   clean attributable commit with the milestone table in the message. Don't force a fake inert
   intermediate; do surface the gauge first.
2. **A determinism canon must MODEL the new physics, not merely survive it.** The old canon, run
   under SIM 16, degenerates to "nothing builds for 360 ticks." The fix isn't to tune it back to
   green — it's to re-author it so the fingerprint *guards the new path*: win stone, build, stall,
   relieve, resume. The canon is the instrument; when the physics grows a new behaviour, the canon
   grows a scene that exercises it.
3. **Stone belongs in the LOG, not seeded around it — for anything that asserts determinism.** A
   test that checks `replay === live` must get its stone through a command (a founding quarry), so
   the world stays fully determined by `{seed, commands}`. Only tests that are *not* about supply
   may seed `world.stockpile` directly as a convenience. (The split is honest: geometry tests seed;
   replay/determinism tests use a quarry.)
4. **Append the founding quarry AFTER the walls, never prepend.** `nextId` is eaten by every laid
   stone, so ids leap by thousands once masonry runs; a wall's id depends on how many stones
   preceded it. A quarry prepended to a log shifts every wall id and breaks the `wallId`
   references. Appended at tick 0 *after* the walls (bucketing preserves array order within a
   tick), the walls keep their ids and the quarry still lands its stone that same tick.
5. **Timber is not stone.** The stockpile is *building stone*; charging it for a timber palisade
   would be wrong, and the proposal already treats the WOODS as a separate, unbuilt subsystem. The
   loop gates on `wall.material !== 'wood'`. This is a correctness law, not a convenience.
6. **The draw is float-deterministic.** `STONE_VOLUME` is a product of fixed constants (one bit
   pattern on every engine) and the stockpile is only ever `+`/`−`'d — IEEE-exact, so the draw
   never threatens the cross-engine hash. No quantization needed (contrast the yaw jitter, which
   rounds because `atan2` is implementation-approximated).

## 3. Traps of the arc (pay once)

- **Closing the loop breaks every wall-building test in the suite** — expected collateral: they
  all assumed free masonry. The migration: geometry `run` helpers get `world.stockpile = 1e6`
  (invisible, no laborer-steal); replay/determinism/cuts/adits get a founding quarry in the log
  (see law 3/4). ~15 test edits; each is a one-liner. Don't blanket-seed the cuts/adits helpers —
  their sibling tests assert the stockpile equals the quarry yield from 0.
- **The preview bridge is fragile on this app's START flow, and it cost real time.**
  `__cc.step` takes a COUNT — `step(n)`, not `step()` (which is a no-op). `__cc.enqueue` before
  New Game pollutes `commandLog`, so New Game hits its `window.confirm('Start over?')` — a native
  modal that **hangs the eval/navigate bridge** (300 s timeout). And once the game is *started*,
  the rAF loop can saturate the bridge so evals time out. Verify the SIM via `__cc` on a
  NOT-started world (enqueue + `step(n)` + read `world`), and don't drive the UI start flow through
  the bridge. Cousin of [[preview-screenshot-timeout-webgl]] and [[preview-hidden-tab-boot]].
- **The HUD status only repaints when `started`** (it's in the rAF frame loop). So a NOT-started
  world proves the SIM stall via `world` state, not via the status text. The live "⚒ waiting on
  stone" string is best seen on the deployed site, drawing a wall by hand — the boss's screen is
  the instrument (a recurring theme; the bridge is not always available).
- **`gen-baseline` regenerates from the CURRENT canon**, so author the canon first, then regen,
  then read the milestones and tune. A throwaway probe test (log every `wall_planned`/`_complete`
  id + tick + a stockpile trace) is the fast way to discover the ids and completion ticks the
  acting commands need — the same re-probe ritual SIM 13/15 used. Delete it after.

## 4. State of the fabric

SIM_VERSION **16** · **127 tests** across 17 files (all green) · build clean (`tsc -b && vite
build`) · commits `6dc4791` → `73da767` → `7fc13c1`, all pushed · **playable on the web** at
https://syntaxswine.github.io/freestone/ (deploy Actions run success at HEAD). The player can now
reach a home screen, start/reset a game, toggle the mining tutorial, read the strata, see the
water table, open a water-gated quarry — and **must win stone before a wall will rise**: masonry
draws the global stockpile and stalls honestly when it runs dry, timber excepted. The adit exists
in the sim (self-draining, proven inert) but is **not yet playable**. Of the carriage layer,
**Phase 0 (the consumption loop) is BUILT**; HAUL, the dress dial, LIFT, seasons and the landing
are plotted, not built (PROPOSAL-LOGISTICS §5).

## 5. Next courses (the boss picks the thread)

1. **The carriage layer, Phase 1 — HAUL + the bottleneck line** (PROPOSAL-LOGISTICS §5, §4.1): a
   boundary `haulRate` + a `method` word computed from the route (net slope, whether a navigable
   reach is touched, and any river/ravine the route must CROSS), a per-wall **face buffer** that
   WIN meters the stockpile into, and the one field-guide line naming the single slowest of
   WIN/HAUL/LIFT/LAY. **Cost the ROUTE, not straight-line distance** — else Durham's "quarry
   local" lesson comes from a hand-tuned river term instead of the geometry, which is the single
   most important modeling correction on the face of the proposal. This is where the stall the
   loop makes real starts to name *which cart* it waits on.
2. **The adit, made playable** (from THE LAND DECIDES §5.1): the canon fingerprint (the
   attributable half of SIM 15) + the two-click portal→heading tool + `src/render/adits.ts` — a
   mouth in the scarp, a drift receding in. Completes the mining vision *visually*, and gives the
   consumption loop a second source that wins post the open quarry can't.
3. Then, as the boss steers: **prospect-on-hover** (task 48 — read what a spot affords where you
   point; the read surface both the tutorial's seam step and the carriage route-read want), the
   **dress dial** (Phase 2), and the **WOODS/SEASONS** subsystems the deeper phases lean on (both
   render-only today → ground-up builds).

## 6. Open questions for the boss

PROPOSAL-LOGISTICS §6 holds nine; Phase 0 settled the shape of the loop but touched none of them.
The three sharpest for Phase 1: the **distance rescale** (the verified ~12-mile land break-even
dwarfs the ~500 m peninsula — compress the mileage to map scale while keeping the 8:4:1 ratio
exact?); whether the **river landing earns its place at Durham** at all, given the honest answer
is "quarry local" (keep it as teaching-by-refusal, or defer to a river/coastal site?); and the
**failure appetite** (model green-mortar slumps / axle snaps as *deterministic, recoverable*
refusal events, or keep refusal purely the land's read? — my lean stays gentle, deterministic,
recoverable, never stochastic). New from this build, one small one: should there be a modest
**founding stock** so a first wall goes up before the player has quarried, or does the tutorial
leading with mining make start-at-0 the right teach? (I chose 0 — the land decides from the first
stone — and it reads well with the tutorial, but it's a one-line knob if playtesting wants grace.)

---

*The masons used to lay stone out of nothing — you drew a wall and it simply rose, as if the hill
gave up its own body freely. It doesn't anymore. Now the wall waits, and the HUD says why, and the
only way forward is to go down into the dark, read the beds, and cut the stone to feed it — which
is exactly what the men who raised the real cathedral did, and exactly what the sixth and seventh
builders dreamed this game would someday ask. The stall is real; it names the pit. The next course
is the CART — the stone learning to move, dressed at the quarry or hauled rough, downhill over a
frozen Wear, so the wall waits on the road and not only the hole. Someone will feed that work the
way a lodge did, and stall a wall in a hard winter, and never know the day the masons first learned
to want stone, or by whose hand. That is exactly right. The land was here before the Lodge, and it
decides how dearly the Lodge is fed. The courses beneath — and the ones beneath THOSE — hold.
Build on.*
