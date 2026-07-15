# HANDOFF — THE LIVING SETTLEMENT, the build

*2026-07-15 · the working handoff for building out
[PROPOSAL-THE-LIVING-SETTLEMENT-2026-07-15.md](PROPOSAL-THE-LIVING-SETTLEMENT-2026-07-15.md)
(the design bible) along the ladder in its §9, one course at a time. Updated between steps — the
newest status is the top of the ladder table. Read the bible for the WHY; this doc is the WHERE and
the WHAT-NEXT.*

Read first, always: the FOUNDATION keystone
[HANDOFF-FOUNDATION-2026-07-09.md](HANDOFF-FOUNDATION-2026-07-09.md) — the soul, the nine laws, the
maker's marks (mine is the **eleventh, ⏭**). Then the master plot
[ROADMAP-THE-GENERATIONAL-FACTORY-2026-07-14.md](ROADMAP-THE-GENERATIONAL-FACTORY-2026-07-14.md).
This arc discharges the roadmap's Beats 0–4.

---

## The ladder (§9 of the bible) — status

| step | course | state |
|---|---|---|
| **0** | **The year made real + Sit-the-Season** | ✅ **SHIPPED** (`02465ac`, SIM-neutral) |
| 1 | THE WOODS — stands, `plan_fell`, two stocks, regrowth clock, age-classed render | ▶ **NEXT** (SIM 19) |
| 2 | The living population — harvest engine + demographic pass | pending (likely one batched SIM bump) |
| 3 | The pyramid + carpenter's shop + the cart + granary cat | pending |
| 4 | Housing quality tiers (hovel/cottage/hall) | pending |
| 5 | Heavier accelerants + LIFT (rollers/sledge, windlass, great wheel) | pending |

**The build directive** (boss, 2026-07-15): *keep going until you complete the tasks the previous
builder scoped; write a handoff and a keystone between tasks.* So: build the ladder in order, a
handoff (this doc, updated) + a keystone (a maker's mark on the FOUNDATION) between each course.

## SIM-version ledger

- SIM 18 — the DRESS dial (before this arc).
- **Step 0 added no SIM version** — the calendar is a pure derivation, Sit-the-Season is transport;
  the baseline is byte-identical. **Step 1 THE WOODS will be SIM 19** — the first baseline move of
  this arc, and it must ride the two-commit discipline (inert record first, then the attributable
  bump + a re-authored baseline with its reason).

---

## Step 0 — DONE (the year made real + Sit-the-Season)

**What shipped** (commit `02465ac`, single commit, SIM-neutral):

- **The civic calendar** — `src/sim/types.ts`, right under `TICKS_PER_YEAR`/`SEASON_LENGTH`:
  `SEASONS` (`winter|spring|summer|autumn`, CONSTANT strings), `seasonOf(tick)`,
  `ticksUntilNextSeason(tick)`, `yearOf(tick)`, `dayOfYear(tick)`. All **pure functions of the
  absolute tick** — no state, never entered into the sim hash.
- **Sit the Season** — `src/render/main.ts`: a `⏭` button on the speed row sets `sitUntil = tick +
  ticksUntilNextSeason(tick)`; the frame loop pumps `worldStep` toward it within an `FF_BUDGET_MS`
  (8 ms) per-frame wall-clock budget, then clears `sitUntil`. A forecast rides the button while
  sitting. Any speed press (incl. pause) cancels it.
- **HUD** now reads `Year N · Season · day d` via the calendar helpers.
- **Test** — `test/calendar.test.ts` (6 tests, incl. the boundary invariant): 139 → **145 green**.

**The two laws this course established (carry them):**

1. **The calendar is a lens, not a load.** `seasonOf` etc. are pure functions of tick. They may be
   read anywhere (render, HUD), and may be *frozen at a command boundary* into hashed state as one
   of the `SEASONS` literals — but they must **never be called live inside `worldStep`** in a way
   that writes a recomputed float into the hash. Season-gating a command (the woods' winter felling)
   means: at plan time, read `seasonOf(world.tick)`, decide, freeze the CONSTANT string onto the
   command. That is the same pattern `plan_cut`/`plan_fell` use for everything else.
2. **The season bounds are the coarsening of `render/farms.ts seasonBand`.** If you ever change one,
   change both, or the HUD season and the field colours will disagree. Winter is deliberately the
   dormant/felling season (day <60 || ≥305).

**Verification note (a real constraint, not a shortcut):** the HUD repaint and the live FF pump are
driven by `requestAnimationFrame`, and a **backgrounded preview tab pauses rAF** (`visibilityState`
stays `hidden` even after `tabs_select`) — so `frame()` never runs and the "Year" line never paints
*in the automation browser*. This is the documented freestone preview limitation. Step 0 was proven
at the **kernel** instead: the shipped calendar functions were imported live off the dev server and
checked against real `__cc.world` ticks (0→winter, 60→spring, 121→summer, 321→winter), and the FF
advancement was exercised by pumping `worldStep` to the Sit target (321 → 425, landing *exactly* on
the boundary, winter→spring, Year 2 day 61). In the boss's visible browser, `frame()` runs and the
HUD paints normally. If you need a visual, drive it with `__cc.step` + the render-receiver trick.

---

## Step 1 — THE WOODS (NEXT, SIM 19)

The boss-picked arc; §2 of the bible. The first baseline move — **two commits.**

**The seams (from the census, verified in code):**

- **Render → sim promotion.** The 16,872 canopies live in `src/render/trees.ts` (render-only today,
  `trees.update(world)` in the frame loop). The woods become **sim stands partitioned into cants**;
  a new `plan_fell` command **freezes a `timberTotal` + a regrowth clock at the boundary**, exactly
  as `plan_cut` freezes the quarry (grep `plan_cut` / the `cuts` array for the pattern to mirror).
- **The draw site is already marked.** In `src/sim/step.ts`'s `layStones`, the `w.material === 'wood'`
  branch carries the comment *"the WOODS aren't a cost yet."* That is where timber stops being free.
- **The clock is already exported.** `TICKS_PER_YEAR` + the new `seasonOf` are the regrowth clock and
  the winter-felling gate; state every duration in the other's terms (§1). Two stocks: underwood/poles
  (~7–8 yr) and oak standards (~50 yr). Felling ≠ death — the stool regrows; over-cut is a dated scar.
- **`plan_fell` is the arc's drawing verb** (the roadmap's standing rule: one per arc). Ship also the
  age-classed render ladder (open coupe → 1.5 m shoots → re-closed canopy → poles), the
  sustainable-harvest HUD read (the 1356 Hayley Wood idiom), and the wood-pasture/coppice word-card.

**Discipline for step 1 (do not skip):** two commits (inert record, then SIM 19 + re-authored
baseline); isolate any new RNG the woods introduce so it does not cascade the masonry baseline
(§10 — the demographic day gets its own `seed+year` stream; the woods, if they consume rng, likewise);
red-specimen tests for the regrowth clock before the mechanism; verify at the kernel (`__cc.step`),
not the screenshot; push per completed step; add the twelfth maker's mark.

---

*Step 0 laid the level line. The year turns; now build the wood that heals as fast as you cut it.*
