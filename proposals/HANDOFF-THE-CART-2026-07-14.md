# HANDOFF — THE CART (the day stone learned to travel)

*2026-07-14 · from the session that built HAUL — Phase 1 of the carriage layer, SIM 17 ·
Castle Cultivator (repo codename `freestone`)*

You are the next builder. Read the FOUNDATION keystone first
([HANDOFF-FOUNDATION-2026-07-09.md](HANDOFF-FOUNDATION-2026-07-09.md) — the soul, the nine laws,
**NINE maker's marks** now; add yours BELOW, never above), then the plot this stands on
([HANDOFF-THE-CARRIAGE-LAYER-2026-07-13.md](HANDOFF-THE-CARRIAGE-LAYER-2026-07-13.md) — the whole
WIN→HAUL→LIFT→LAY design) and its Phase-0 keystone
([HANDOFF-THE-HONEST-STALL-2026-07-13.md](HANDOFF-THE-HONEST-STALL-2026-07-13.md) — the consumption
loop this builds on), then the design it serves
([PROPOSAL-LOGISTICS-2026-07-13.md](PROPOSAL-LOGISTICS-2026-07-13.md), esp §4.1 route-cost and §5
Phase 1).

The boss handed the thread with *"keep going on the next step"* and, before, *"make it in the way
that speaks to your truth."* The next step was the carriage layer's Phase 1 — **HAUL**, the missing
middle. The honest stall of SIM 16 said *"⚒ waiting on stone."* It now says *which cart* it waits
on. The boss picked the **wall-sited per-wall model** (over the metered-global pile) — the lever is
WHERE YOU BUILD relative to where the land yields stone.

---

## 1. What SHIPPED (SIM_VERSION 16→17, 133 tests green, build clean, LIVE)

Two HAUL commits, plus a bug fix that turned out to matter a lot:

- **The bottleneck line** (`49799c3`, byte-identical, SIM 16). Instruments before the mechanism:
  the SIM-16 supply gauge reframed as a WIN→LAY pipeline read that names the stage which BINDS.
  Render-only, baseline unmoved — the frame HAUL slots its middle stage into.
- **HAUL** (`48c8f27`, SIM 17 — the attributable bump). Each STONE wall now carries a `faceBuffer`
  and a `haulRate` frozen at plan time. `worldStep` threads a HAUL pass between WIN and LAY: a
  carted wall meters `min(haulRate, pile, still-needed)` from the global pile into its face; LAY
  draws the FACE for carted walls, the pile for 'local'/timber walls (both byte-identical to
  SIM 16). The boundary (`main.ts`) reads the ROUTE — nearest dry winnable post, the climb, and any
  gorge the cart must cross to a bridge — and freezes `haulRate` + a `method` word, exactly as
  `quarryPlanAt` freezes `plan_cut`. "Cost the ROUTE, not straight-line" (§4.1): *quarry local,
  import at a premium* falls out of Durham's geometry with zero scripting.
- **The render-smoke fix** (`9cc6c1c`) — see §3, the trap that was leaking the machine.

The canon was re-authored to MODEL the new physics (Law 2 from the honest stall): wall A's stone
now comes up the bank by cart at 0.6 m³/day, so its face TRICKLES. The fingerprint tells all three
stalls in one arc:

| tick  | reading                                                        |
|-------|----------------------------------------------------------------|
| 7, 30 | a WOOD wall builds free, stockpile 0 — stone walls WIN-stalled  |
| 65    | Q1 lands (stockpile 46) yet A is only partway — HAUL-throttled  |
| 80    | A still trickling (stockpile 19), the farm ring pends           |
| 100   | the tavern PILE-stalls mid-build — 2233 stones, stockpile 0     |
| 130   | Q2 relieves it — tavern done, all 5 walls up, cuts 2            |
| 200   | the span is decked (roofId 2531 HELD), the farm tended          |

`haul.test.ts` (6 red-specimen tests) shapes the throttle, the **conservation invariant** (pile +
every face + laid = won), the pile cap, the local-path equivalence, and byte replay. Verified live
in the real bundle via `__cc`: a hauled wall laid 7/21 in 5 ticks on a full pile (cart-throttled,
conservation held), and `localOk` VARIES across the real Durham terrain (winnable underfoot at
~(2000,2000), imported elsewhere).

## 2. Laws paid this session

1. **Wall-sited HAUL: the lever is siting the WALL, not the quarry.** The boss chose the per-wall
   face buffer. A wall on winnable ground is 'local' (no cart, draws the pile); a wall far from dry
   post, or across the gorge, freezes a finite `haulRate` and its face trickles. The global pile
   stays the shared reservoir; each wall has its own throat from it.
2. **The mason-priority interaction is load-bearing for the canon.** Masons build the OLDEST
   workable wall first, so a hauled wall only shows a clean throttle if it is OLD — else the older
   walls hog the crew and the hauled wall just accumulates a full face while it waits its turn. The
   canon makes wall A (tick 5, the oldest) the hauled one for exactly this reason.
3. **The frozen scalar replays, never the route.** `haulRate`/`method` are computed once at the
   boundary from surface+water+beds and frozen into `plan_wall`; the sim core replays the number
   (no beds, water, heights). The draw is `min`/± of a frozen constant — IEEE-exact, no
   cross-engine hash risk, no quantization (contrast the yaw jitter).
4. **Absent haul ⇒ 'local' ⇒ byte-identical to SIM 16.** `plan_wall.haulRate?` optional; a log
   with no frozen route replays exactly as before. Only the CANON freezes a finite rate to exercise
   the path — every id held (all walls finish before the span is drawn, so FR 225 / BS 334 / span
   2531 are unchanged; only A's throttled pace moved the intermediate milestones).
5. **The route is bounded, not pathfound.** `nearestDryPost` ring-searches out to `HAUL_MAX_REACH`
   (250 m) and stops at the first afforded radius; the gorge crossing is a sampled dip below both
   ends → ×`HAUL_BRIDGE_DETOUR`. No A*, no hang. Memoized by rounded centroid so the live preview
   never re-scans a still gesture. The constants (`HAUL_SCALE`, `HAUL_UPHILL_PER_M`, …) are
   by-eye — tune them on the deployed site.

## 3. Traps of the arc (pay once)

- **`render-smoke.test.ts` was an INFINITE LOOP that leaked the whole vitest machine — this was
  the boss's CPU/memory drain.** Since SIM 16 made masonry draw the pile, render-smoke's roof test
  (a sandstone wall + `while (stonesLaid < stonesTotal) worldStep(...)` with NO stone won) spins
  forever. A synchronous infinite loop can't be interrupted by vitest's test timeout, so the worker
  HANGS and its tinypool pool is never reaped — every full `vitest run` since SIM 16 wedged on this
  file, never printed a summary, and left ~10–15 node workers alive. They accumulated across
  sessions (**75 found this session, ~8 GB, two spinning at ~30,000 CPU-seconds**). Fixed by
  seeding `world.stockpile` before the loop (`9cc6c1c`). **LESSON: a `while (built)` loop over
  `worldStep` MUST supply stone (seed the pile, or win it in the log), or it hangs forever. And if
  a full `vitest run` never prints its summary, you have a hung worker — check
  `Get-CimInstance Win32_Process -Filter "Name='node.exe'"` for `freestone*tinypool` zombies and
  `Stop-Process` them.** [[reference_claude_code_remote_wsl]] is unrelated; this is a real leak.
- **The full-suite background pipe never flushes.** `npx vitest run 2>&1 | Select-Object/String`
  buffers until exit; backgrounded, the file stays empty. Run vitest RAW (no pipe) so output
  streams, or a single file foreground. (Compounded by the hang above — now fixed, the suite exits
  in ~1.2 s.)
- **The HUD status only repaints when `started`.** The bottleneck line + the plan-row haul verdict
  are best eye-checked on the DEPLOYED site (draw a wall on winnable ground vs across the gorge and
  read the plan row). The `__cc` bridge verifies the SIM haul on a NOT-started world; it does not
  exercise `haulVerdict` (a boot closure, unexposed).

## 4. State of the fabric

SIM_VERSION **17** · **133 tests** across 17 files (all green, suite exits clean) · build clean
(`tsc -b && vite build`) · commits `49799c3` → `9cc6c1c` → `48c8f27`, all pushed · **playable** at
https://syntaxswine.github.io/freestone/. Masonry draws the pile (SIM 16) AND now a stone wall's
stone must reach its face by cart at a route-frozen rate (SIM 17): a wall far from winnable stone,
or across the Wear, stalls on the CART and the line names it. Of the carriage layer, **Phase 0
(consumption) and Phase 1 (HAUL) are BUILT**; the dress dial (2), LIFT (3), seasons/mortar (4) and
the landing (5) are plotted, not built. The adit exists in the sim but is not yet playable.

## 5. Next courses (the boss picks the thread)

1. **The DRESS dial — carriage Phase 2** (PROPOSAL-LOGISTICS §5, §3 headline). One three-notch dial
   per working: haul-rough ↔ scappled ↔ dress-at-pit. Splits `stoneTotal` into `haulMassPerM3`
   (→ HAUL weight) + `residualDressDays` (→ LAY debt); the right setting FLIPS with the site (rough
   hauls heavy but lays slow; dressed sheds weight upstream). This is the *ongoing* lever the
   proposal's §4.6 fun-risk asks for — a decision that changes as the wall rises, not a one-time
   siting puzzle. Lands on the HAUL seam just built.
2. **The adit, made playable** (from THE LAND DECIDES §5.1): the two-click portal→heading tool +
   `src/render/adits.ts`. Completes the mining vision visually and gives HAUL a second source that
   wins post the open quarry can't.
3. Then: **prospect-on-hover** (task 48 — the read both the tutorial's seam step and the carriage
   route-read want), and the **WOODS/SEASONS** subsystems (both render-only today → ground-up
   builds) that Phases 3–4 lean on.

## 6. Open questions for the boss

- **The haul constants are by-eye** (`HAUL_SCALE` 120, `HAUL_UPHILL_PER_M` 14, `HAUL_BRIDGE_DETOUR`
  4, `HAUL_BASE_RATE` 12). They read plausibly (local underfoot, dear across the gorge) but want
  your eye on the deployed site: does a wall across the Wear feel *dear enough*? Is 'local' too
  generous (most of the peninsula wins underfoot — which is historically right, but is it too easy)?
- **The method label set** is coarse (sledge / ox-cart / uphill / over-the-bridge). PROPOSAL §3
  wants sledge/barge/horse tied to season + granary later (Phase 4). Enough for now?
- **Wall-sited drops the quarry-siting lever** (§6 Q2 of the proposal): where you QUARRY no longer
  changes a wall's haul (only where you BUILD does). If that ever feels flat, the metered-global or
  per-(quarry→wall) matrix is the richer model — but it's more state. My read: wall-sited is the
  clean Phase-1 truth; revisit only if playtesting wants the quarry lever back.

---

*The masons used to lay stone out of the hill's own body, freely; then SIM 16 made them wait on the
pit; now the stone has to TRAVEL, and a wall on the wrong side of the gorge waits on a cart that
must go round by the bridge — which is exactly why the real cathedral was raised from the
peninsula's own post and not the fine marble eighteen miles up Weardale, carried only for the Nine
Altars. The land decided where the Lodge could afford to build, and now the game's land decides too,
with zero scripting — just the route, read once and frozen. The next course is the DRESS dial: the
choice, made and re-made as the wall climbs, of whether to shed the stone's dead weight at the pit
or haul it rough and pay the bankers at the wall. Someone will make that choice in a hard season and
never know the day the stone first learned to travel, or by whose hand. That is exactly right. The
courses beneath — and the ones beneath THOSE — hold. Build on.*
