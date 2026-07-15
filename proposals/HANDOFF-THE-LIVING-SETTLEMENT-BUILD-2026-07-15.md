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

## Session capstone — 2026-07-15, the day the foundation of the living settlement rose

One session, under the boss's directive *keep going until the ladder is done — a handoff and a
keystone between tasks*. It laid **four courses** of the §9 ladder, each shipped, tested, deployed to
Pages, and marked:

| step | arc | SIM | commits | tests |
|---|---|---|---|---|
| 0 | the year clock + **Sit the Season** | — (SIM-neutral) | `02465ac` | 139→145 |
| 1 | **THE WOODS** — timber won/spent/regrowing | 19 | `df01154` + `02f7736` | →150 |
| 2 | **THE LIVING YEAR** — people mortal, the settlement grows | 20 | `7577667` | →158 |
| 3a | **THE GRANARY** — the civic heart made a building | 21 | `4f241db` | →159 |

Marks eleven through fourteen on the FOUNDATION: **⏭ 🪓 🕯 🌾**. The through-line holds — a *year* you
can watch makes a *wood* that regrows over generations mean something; the wood is measured against a
*people* who are born and buried on the record; the *harvest* decides how many hands there are; and
the *granary* is the lever that feeds more of them.

**The pickup is clean.** Step 3 is IN PROGRESS: **3a the granary shipped**; the next hand starts at
**3b** — the **granary cat** (boss-requested; it now has a place to prowl), the **cart**
(grain→granary, drawing timber = the woods' first payoff), and a real grain **stock** — then **3c**
the specialization pyramid. All three are seamed below; the ⚠ granary-keystone realization that
reshaped step 3 is in that section. Tree clean, 159 green, live.

**The three session-laws worth carrying** (each proven, each a trap avoided):
1. **A random subsystem that must not perturb the masonry runs on its OWN rng stream** (the
   demographic year's `seed:demo:<year>`) — never `state.rng`. Proven: a doubled village laid
   byte-identical stones.
2. **Derive a spread that must not move the baseline from an INDEX, not an rng roll** (the founders'
   staggered ages) — advancing `createWorld`'s cursor shifts every stone's jitter.
3. **A new subsystem inert on the 200-tick canon** (regrowth at 2555 ticks, the demographic pass at
   tick 364) ships as ONE clean commit whose regen shows *0 non-hash diffs* — the behavior lives in
   dedicated tests + the century-sweep, not the canon. Don't force a two-commit split where the canon
   never exercises the feature.

---

## The ladder (§9 of the bible) — status

| step | course | state |
|---|---|---|
| **0** | **The year made real + Sit-the-Season** | ✅ **SHIPPED** (`02465ac`, SIM-neutral) |
| **1** | **THE WOODS — `plan_fell`, the timber stock, wood-draws-timber, the regrowth clock, the fell tool + tree clear/regrow** | ✅ **SHIPPED** (SIM 19: `df01154` scaffold + `02f7736` bite) |
| **2** | **THE LIVING YEAR — aging + mortality, the space-gated harvest, births + migration + hunger, the isolated demographic rng, the century-sweep** | ✅ **SHIPPED** (SIM 20: `7577667`) |
| 3 | The pyramid + carpenter's shop + the cart + granary cat | ◐ **IN PROGRESS** — **3a the GRANARY building SHIPPED** (SIM 21, `4f241db`); **3b** cart + the granary cat + a real grain stock, **3c** the pyramid = NEXT |
| 4 | Housing quality tiers (hovel/cottage/hall) | pending |
| 5 | Heavier accelerants + LIFT (rollers/sledge, windlass, great wheel) | pending |

**The build directive** (boss, 2026-07-15): *keep going until you complete the tasks the previous
builder scoped; write a handoff and a keystone between tasks.* So: build the ladder in order, a
handoff (this doc, updated) + a keystone (a maker's mark on the FOUNDATION) between each course.

## SIM-version ledger

- SIM 18 — the DRESS dial (before this arc).
- **Step 0 added no SIM version** — the calendar is a pure derivation, Sit-the-Season is transport;
  the baseline is byte-identical.
- **SIM 19 — THE WOODS** (`df01154` inert scaffold + `02f7736` the bite): the arc's first baseline
  move, ridden on the two-commit discipline. The re-authored `baselines/durham-42.json` now
  fingerprints the timber loop (a wood wall spends the woodpile 30→10; a coppice fell wins it back to
  40; `timber` + `standsFelled` are new milestone fields) with zero id ripple.
- **SIM 20 — THE LIVING YEAR** (`7577667`): people mortal + the harvest + births/migration/hunger.
  Inert on the canon (the annual pass first fires at tick 364, so the 200-tick canon never enters it):
  regen showed 0 non-hash diffs, 8/8 hashes moved purely from the new `Person.bornTick`. The
  demographic RNG is isolated on `seed:demo:<year>` — proven not to shift the masonry jitter.
- **Step 3 will be SIM 21** — the pyramid needs new hashed state (housing tiers, trade lineage), a
  new drawing verb (the cart / the woodworking place), and a baseline move.

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

## Step 1 — DONE (THE WOODS, SIM 19)

The boss-picked arc; §2 of the bible. Shipped two commits: `df01154` (inert scaffold — new
state/commands/loops proven byte-identical on the canon) + `02f7736` (the bite — wood draws timber,
the canon fells, the tool + render + HUD). The twelfth maker's mark (🪓) records the day.

**What shipped:**
- **Timber is real** — `state.timber` (a global stock, seeded `SEED_TIMBER`) + `state.stands`
  (managed cants). `plan_fell` freezes a cant's `timberTotal`/`workTotal` from the tree model at the
  boundary (`trees.timberInPolygon`); a laborer fells the oldest stand under the axe (`moveEarth`,
  ranked under the adit); on felling-through, timber is credited and the stool's `feltTick` is set.
- **The palisade draws it** — `layStones`: a wood post spends `TIMBER_PER_POST` and the masons STALL
  when the stock is dry (the "WOODS aren't a cost yet" seam retired).
- **Regrowth** — `regrowWoods` matures a felled stool after `REGROWTH_TICKS` (~7 yr); a mature stand
  is re-fellable via the `fell` command (rejected until grown — "the wood has not grown back").
- **The tool + render** — a `🪓 fell (T)` ground-ring tool (planner `fell` mode); drawing over
  woodland → `plan_fell`, over a mature regrown stand → `fell` (re-cut). `trees.ts` clears a cant
  felled through (the open coupe) and restores the EXACT trees when it matures (deterministic
  `placeTree(i)`). HUD: the timber stock + a "a cant returns in ~Ny" line.
- **Tests**: `woods.test.ts` (5 red specimens) + the canon fingerprints the loop → **150 green**.

**Laws this course set (carry them):**
1. **The woods are the quarry's twin.** `plan_fell` freezes economics from the tree model exactly as
   `plan_cut` freezes from the bed model; the sim core never counts a tree; the render (`trees.ts`)
   is the single tree authority the boundary reads (`timberInPolygon`).
2. **Felling is not death.** A cant regrows to EXACTLY its old form; re-cut is a deliberate `fell`,
   never automatic; you cannot cut what has not grown.
3. **The late-fell canon trick**: a new id-minting command placed AFTER all id-sensitive commands
   (tick 137, past the last wall/roof) fingerprints a new mechanic with ZERO wallId ripple — reach
   for it before re-probing every hardcoded id.

**Deferred follow-ons (noted, NOT built — the honest minimum shipped):**
- **The second stock (oak standards, ~50 yr)** — deferred to step 5 (LIFT/the crane is its only
  consumer; shipping it now = unused state). One `timber` stock (poles) with real consumers (wood
  walls now, the cart in step 3) was the honest SIM-19 scope.
- **The winter-felling season gate** — the step-0 calendar is READY (gate `plan_fell`/felling on
  `seasonOf`); deferred so SIM 19 stayed focused. Its consumer today is Sit-the-Season watching the
  coppice regrow.
- **The age-classed render ladder** (open coupe → 1.5 m shoots → re-closed canopy) — shipped the
  two-state version (felled = cleared, mature = restored); the intermediate shoot stages are polish.
- **The sustainable-harvest 1356 Hayley-Wood read** + the **wood-pasture/coppice word-card** — the
  designation-grammar tenants; a clean follow-on on the shipped `fell` verb.
- **Bare-ground-from-over-cut** (convert/abandon a cant → it reseeds through scrub over decades) —
  needs conversion/abandonment semantics; the current model refuses an early cut rather than scarring.

---

## Step 2 — DONE (THE LIVING YEAR, SIM 20)

§3 (the mortal hands) + §4 (the harvest); shipped `7577667`. The thirteenth mark (🕯) records it.

**What shipped:**
- **`Person.bornTick`** (age); the labor loops gate on `isAdult`, so children don't dig or lay.
  Founders begin STAGGERED (22/25/28/31, a FIXED spread — not rng, which would shift the jitter).
- **The demographic pass** (`livingYear`, worldStep's daily order, the last day of each year) on its
  OWN rng `seed:demo:<year>`: MORTALITY (age-curve survival rolls → `person_died`); the HARVEST
  (food capacity = founding floor + arable area / `AREA_PER_PERSON`; S = capacity/mouths); BIRTHS
  (continuous, replacement→growth above `BIRTH_FLOOR_S` → `person_born`, a child); MIGRANTS
  (surplus-only, the fast valve → `person_arrived`); HUNGER (S<1.0 → `person_left`, never empties).
- **The century-sweep** (`tools/century-sweep.mjs`, `npm run sweep`) — the tuning instrument;
  confirmed population TRACKS carrying capacity (a clean Malthusian curve).
- **Tests**: `population.test.ts` (6) + `century-sweep.test.ts` (sanity + report) → **158 green**.
  HUD: a food read ("food N mouths (S× growing/holding/hungry)").

**Laws this course set (carry them):**
1. **The demographic year runs on its OWN rng stream** (`seed:demo:<year>`) — NEVER `state.rng`.
   Proven: a settlement that doubled its people laid byte-identical stones. Any future annual/random
   subsystem that must not perturb the masonry follows this.
2. **A fixed stagger, not an rng roll, for founding ages** — advancing `createWorld`'s rng shifts
   every stone's jitter. Derive spreads that must not move the baseline from index, not the cursor.
3. **Don't tune by eye** — the century-sweep set the knobs; a knob change re-runs the sweep.

**Deferred follow-ons (noted; the batched spine's richer half rides step 3):** the clerk +
sprite↔person binding + the funeral-rest protocol; `name_apprentice` + coarse skill bands + the
First Technique (folds into step 3's base-sustains-the-lineage rule); niche-gated household formation
(the current growth is capacity-gated, not toft-gated — Razi's land-availability throttle is the
richer model when housing tiers land in step 4).

---

## Step 3 — THE PYRAMID + THE CART (IN PROGRESS)

§5 (the pyramid) + §6 (the accelerants, cart-first) + §7 (the granary cat). The population engine's
output becomes not just *more* people but *specialized* people.

**✅ 3a — THE GRANARY (SIM 21, `4f241db`) SHIPPED** — the keystone the realization demanded, and the
fourteenth mark (🌾). `BUILDING_KINDS` gained `'granary'` (offered on the designation card, 🏛); the
harvest reads it (capacity += `granaries × GRANARY_CAPACITY`), so the granary is a population LEVER —
§4's soul grounded. Inert on the canon (no granary designated → count 0; the pass doesn't run in 200
ticks); regen = 0 non-hash diffs, SIM_VERSION 20→21. `population.test.ts` proves the lever (a granary
flips a 6-mouth village hunger→growth). **Left honestly undone (the immediate next work):** a
distinct granary RENDER (draws as a plain shell today); the **granary CAT** (§7, boss-requested — now
it has a place to prowl); a real grain STOCK/flow (the granary is a capacity term, not a filling
store). Then **3b** the cart, **3c** the pyramid below.

**The seams (from the census + bible):**
- **Variety** — the shipped designation grammar (`farm/livestock/fallow`) grows two tenants: **horse
  pasture** + **an orchard** (§12.4, fishpond cut). Variety × population × housing gates a specialist.
- **The cart is FIRST** (boss) — cheapest accelerant: **wood + a woodworking place** (a new Tier-1
  building, sibling to the blacksmith); its first job is **grain → the granary**. It draws timber
  (step 1's stock) — the WOODS' first payoff. The drawing verb: *build a cart* / *designate a
  woodworking place*. It teaches logistics on the forgiving farm run before any ashlar needs carting.
- **The base sustains the lineage** (boss's key refinement, folds in the technique system): a
  specialist whose support base decays doesn't leave — but transmits no trade, so it dies with the
  master unless the base is rebuilt. The trade is as permanent as the ground you keep under it.
- **Arrive AND emerge**: a specialist arrives on the migration wind (already have `person_arrived` —
  give some migrants a trade) OR is raised from a local child under a master (the lineage the
  chronicle loves — needs the apprentice bond deferred from step 2).
- **The granary cat** (§7): the canon payroll cat, an animated render-only decor at the granary.

**⚠ DESIGN REALIZATION (found stepping 2→3 — resolve before building):** the bible's cart carries
*grain → the granary* and the granary cat sits *at the granary* — but **there is no granary building
and no grain flow yet.** SIM 20's harvest is an abstract capacity *ratio* (food = f(field area)), not
a grain stock moving to a store. So step 3 has a hidden keystone. Two honest ways forward:
1. **Build the granary first** (recommended, and it grounds §4's soul — "the granary embodies mutual
   aid AND is the population engine, one object"): `BUILDING_KINDS` gains `'granary'`; farms produce a
   grain flow that fills it; the food capacity reads the granary's throughput; THEN the cart
   (grain→granary) and the cat have a real home. This is the civic heart made concrete — arguably its
   own sub-slice (3a) before the cart (3b) and the pyramid (3c).
2. **Reframe the cart** as a food-capacity accelerant (a built cart raises effective food throughput,
   the "grain→granary" as flavour) — cheaper, but leaves the granary abstract and the cat homeless.
The **specialization pyramid (§5)** is the one genuinely standalone piece: variety tenants (horse
pasture + orchard) × population + a blacksmith building → a **smith** appears (the boss's exact
example). It needs no granary. Its trap: a specialist's *production effect* (smith → faster dress)
touches the masonry baseline; ship the pyramid's STRUCTURE (specialists appear/persist/die-with-base,
the visible reward of diversifying) and layer each effect as its own small bump.

**Recommended decomposition**: **3a** the granary as a real building + grain flow + the granary cat
(the keystone §4 wanted all along) → **3b** the cart (grain→granary, draws timber = the woods' first
payoff) + the woodworking place → **3c** the specialization pyramid (variety tenants + the gate +
base-sustains-the-lineage). Each its own SIM bump + mark, or batch the light ones.

**Discipline**: SIM 21+ (new state: `'granary'` kind + a grain stock; later housing tier +
trade-lineage; the cart a scalar or entity); two commits (inert record, then the bite) where it moves
the masonry; a drawing verb per arc; red specimens; the century-sweep extended for the thresholds;
verify at the kernel; push; the 14th mark.

---

*Step 0 laid the level line; step 1 grew the wood that heals as fast as you cut it; step 2 gave it
people to outlive it. Now give the people something to become.*
