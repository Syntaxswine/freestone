# HANDOFF — THE LIVING SETTLEMENT STANDS

*2026-07-15 · the arc-closing keystone for the §9 living-settlement ladder, now fully built. This is
the "it is done, here is the map forward" companion to the in-progress build ledger
[HANDOFF-THE-LIVING-SETTLEMENT-BUILD-2026-07-15.md](HANDOFF-THE-LIVING-SETTLEMENT-BUILD-2026-07-15.md)
(read that for the per-step detail — this doc does not duplicate it). Read the FOUNDATION keystone
[HANDOFF-FOUNDATION-2026-07-09.md](HANDOFF-FOUNDATION-2026-07-09.md) FIRST — the soul, the nine laws,
now **twenty-seven maker's marks** (⏭🪓🕯🌾🐈🏺🛒🔨🏠⚙🔥🤝🍎🎨🏘🌦🏗) and **two ⛬ seals**; add yours BELOW, never above.
The post-arc knockoff's marks sit below the second seal: 🔥 (FIRST TECHNIQUE, 27), 🤝 (APPRENTICE BOND, 28),
🍎 (VARIETY BEARS FRUIT, 29), 🎨 (the render pass — orchard + workshops), 🏘 (SHELTER GATES GROWTH, 30),
🌦 (WEATHER SHAPED, 31) and 🏗 (THE GREAT WHEEL made visible). **Every SIM debt is paid, and the render pass
shows four of five (only a HALL's roofline + the SMITH's sprite remain); the rollers/sledge is the last lever.**

> **Post-arc (2026-07-15, continuing):** the boss reopened the closed arc — *keep going till we knock off
> the items in the handoff* — so the "honest debts" below are being discharged in order. **Done so far:
> (1)** the smith's production effect — THE FIRST TECHNIQUE (SIM 27, `89c88f1`, 🔥); **(2)** the local-apprentice
> emerge path — THE APPRENTICE BOND (SIM 28, `af0d983`, 🤝); **(3)** variety-to-yield — VARIETY BEARS FRUIT
> (SIM 29, `807db0b`, 🍎); **(4, in part)** the plain renders — the ORCHARD (`6da302b`) and the WORKSHOPS
> (a lit forge + carpenter's yard, `4d5a193`) made visible (🎨), render-only; **(5)** shelter as a growth CAP —
> SHELTER GATES GROWTH (SIM 30, `d32b25c`, 🏘), the food equilibrium re-verified intact; **(6)** the weather's
> shape — WEATHER SHAPED (SIM 31, `0bd6bb6`, 🌦), triangular, the extreme years shaped out. **All SIX SIM
> debts are paid; only the render remainder and the rollers/sledge stand — both want a steady eye.**

---

## What stands

The **entire §9 ladder** of [PROPOSAL-THE-LIVING-SETTLEMENT-2026-07-15.md](PROPOSAL-THE-LIVING-SETTLEMENT-2026-07-15.md)
is built — all six courses, each shipped, tested, deployed to Pages, and marked, in one session that
reopened its own closing seal under the boss directive *keep going until the build handoff is done; a
handoff and a keystone as you go*.

| step | course | SIM | commit(s) | mark |
|---|---|---|---|---|
| 0 | the year clock + **Sit the Season** | — | `02465ac` | ⏭ |
| 1 | **THE WOODS** — timber won/spent/regrowing | 19 | `df01154`+`02f7736` | 🪓 |
| 2 | **THE LIVING YEAR** — mortal people, the settlement grows | 20 | `7577667` | 🕯 |
| 3a | **THE GRANARY** — the civic heart made a building | 21 | `4f241db` | 🌾 |
| 3b-i | the granary **CAT** + sacks | render | `e8af0f7` | 🐈 |
| 3b-ii | the **GRAIN STOCK** — the granary a real famine buffer | 22 | `243c8d6` | 🏺 |
| 3b-iii | the **CART** — grain→granary drawing timber; the first renewable-into-renewable loop | 23 | `ca05631` | 🛒 |
| 3c-i | the **VARIETY TENANTS** — horse pasture + orchard | — | `3e087e4` | — |
| 3c-ii | the **SMITH** — variety draws a specialist; base sustains the lineage | 24 | `beee2fc` | 🔨 |
| 4 | **HOUSING TIERS** — hovel/cottage/hall; the roof holds people | 25 | `ecf0910` | 🏠 |
| 5 | **THE LIFT** — high courses cost more; a great wheel relieves them | A `b58fb5a` + B 26 | `90c404d` | ⚙ |

**SIM_VERSION 26 · 173 tests green · all deployed.** The machine is one loop, every gear feeding
another: the wood the cart draws is the wood the wheel spends is the wood the year regrows; the harvest
the granary keeps decides how many hands there are to fell it; the housing holds those hands through the
lean years the granary buffers. A settlement that keeps a year, grows a wood, buries its dead, stores
its bread, carries its harvest, raises its tradesmen, houses its folk, and builds past the height of a
hand.

---

## The laws this arc proved (carry these)

1. **A random subsystem that must not perturb the masonry runs on its OWN rng stream** — the demographic
   year's `new Rng(hashSeed(\`${seed}:demo:${year}\`))`, never `state.rng`. The weather roll, mortality,
   births, migrants, the smith draw all ride it. PROVEN: a doubled village lays byte-identical stones.
2. **Derive a baseline-safe spread from an INDEX, not an rng roll** — the founders' staggered ages come
   from `i * 3`, not a cursor advance; advancing `createWorld`'s rng shifts every stone's jitter.
3. **A subsystem inert on the 200-tick canon ships as ONE clean commit** whose regen shows *only*
   `simVersion` + the new field moving the hashes, 0 behavioral diffs. livingYear first fires at tick
   364, so steps 2, 3a, 3b-ii, 3b-iii, 3c-ii, and 4 were each one inert commit. Don't force a two-commit
   split where the canon never runs the feature; do prove the inertness with the regen diff.
4. **The two-commit discipline is for the masonry ONLY** — step 5, the sole course that touches the
   lay baseline, went Commit A (byte-identical `pickSlot` refactor) → Commit B (the attributable bump,
   canon re-authored). The other courses never touched the 200-tick run.
5. **Structure before effects (the pyramid's trap)** — ship a mechanic's STRUCTURE (the smith
   appears/persists/dies-with-base; the house reads a tier) and defer any effect that touches the
   masonry baseline (smith→faster dress; shelter-as-a-cap) to its own attributable bump. Followed for
   the smith and for housing.
6. **A modifier on an existing pass won't destabilize a tuned equilibrium** — housing's retention rides
   the hunger leave-rate as a factor, so the demographic balance three earlier marks tuned did not
   quiver (the century-sweep still tracks capacity). Prefer a modifier to a new hard gate when the
   equilibrium is load-bearing.

**Two lessons paid in blood this session** (both in the FOUNDATION marks + memory):
- **The lift no-op**: I computed `liftMult` but forgot to multiply the quota spend by it — the wheel
  drew timber but *nothing slowed*. The red-specimen crawl test (noWheel finishes later) is what caught
  it. A computed-but-unused value is a silent no-op; a behavioral test that asserts the *difference*
  catches what a presence test misses.
- **The unverified count**: I wrote "201 tests" across the seal, capstone, and backlog without running
  the suite; the true number is **173**. Corrected everywhere (`3156065`). Verify a number before you
  carve it into a handoff — [[feedback-verify-before-asserting-state]].

**Gotchas worth the next hand's minute:** `COURSE_HEIGHT = 0.25 m` (not 0.5 — the lift free-reach and
per-course math assume it). `SHELL_CHOICES` and `FIELD_CHOICES` in `main.ts` are HARDCODED lists — a new
building kind or field use must be added there, not just to `BUILDING_KINDS`/`FIELD_USES`. Saves are
event-sourced (seed + command log): a new `WorldState` field needs no `save.ts` change, `createWorld`
seeds it and replay reproduces it.

---

## The honest debts left (none block the machine; all deepen it)

Ordered roughly by how naturally they follow from what's built. Each step's section in the BUILD handoff
carries its own list; this is the consolidated view, mapped to the master plot
[ROADMAP-THE-GENERATIONAL-FACTORY-2026-07-14.md](ROADMAP-THE-GENERATIONAL-FACTORY-2026-07-14.md).

**Immediate follow-ons to what just shipped:**
- ~~**The smith's PRODUCTION EFFECT**~~ — ✅ **DONE (SIM 27, `89c88f1`, the 🔥 mark).** The smith now speeds
  the dress: his presence relieves the mason's lay debt (0.15/smith, cap 0.30), riding the same line the
  lift taxes. It turned out NOT to need the two-commit dance — no smith is drawn in the 200-tick canon, so
  the relief is inert there and shipped as one clean commit (the lesson: check whether the canon actually
  runs the feature before assuming a masonry change needs the split).
- ~~**The local-apprentice EMERGE path**~~ — ✅ **DONE (SIM 28, `af0d983`, the 🤝 mark).** When a master smith
  lives, a second forge now raises the settlement's youngest hand instead of importing a journeyman; only the
  first smith (or one after the last master dies) migrates. The arrival event carries `origin`
  ('apprentice' | 'migrant') for the future chronicle.
- **Renders left plain** — 🎨🏗 **FOUR OF FIVE DONE:** the ORCHARD dots fruit-tree rows (`6da302b`,
  src/render/orchard.ts), the WORKSHOPS wear their tools — a lit forge + a carpenter's yard (`4d5a193`,
  src/render/workshops.ts), and the GREAT WHEEL now stands as a treadwheel crane beside every wheeled wall
  (`1712fe7`, src/render/wheel.ts — the signature machine). **STILL PLAIN (two small strokes):** a HALL wears
  no finer ROOFLINE than a hovel (a cresting/finial keyed on `houseTier==='hall'`, likely in RoofLayer/a new
  layer); the SMITH still renders as a common laborer sprite (an apron/hammer variant in the PeopleLayer
  pixel-art). Both are small and want a steady preview to eye-check.
- ~~**Variety-not-yet-yield**~~ — ✅ **DONE (SIM 29, `807db0b`, the 🍎 mark).** The orchard now bears food
  toward the harvest (area / ORCHARD_AREA_PER_PERSON, a supplement to the grain staple) and each pasture
  keeps a draft horse that hauls more surplus to the store (HORSE_HAUL, grazing free). The HUD's harvest
  readout was widened to include the orchard so it stays honest.
- ~~**Shelter as a hard CAP**~~ — ✅ **DONE (SIM 30, `d32b25c`, the 🏘 mark).** Housing now GATES growth: a
  settlement grows only while it has room to house more (growthRoom on births + migrants), so the population
  settles at min(food, shelter); a no-house hamlet caps at ~FOUNDING_SHELTER + SHELTER_GROWTH_SLACK (~10).
  The century-sweep now houses its settlements so it still tunes FOOD; the food equilibrium was re-verified
  intact (cap 20 → 20, cap 50 → 51). SHELTER_GROWTH_SLACK is the harshness knob (conservative for now).
- **Step 5's rollers/sledge** — the heavy-block *haul* accelerant was scoped in the course title; the
  LIFT was the substantial deliverable, the sledge is a clean extension of the SIM-17 haul model.
- ~~**Weather distribution shape**~~ — ✅ **DONE (SIM 31, `0bd6bb6`, the 🌦 mark).** The weather is now the
  mean of two uniform rolls (triangular, peaked at 1.0), so the extreme famine/glut years grow rarer — the
  churn read harsh once SIM 30 added the shelter wall (the sweep's high 'left' counts). Same mean, kinder curve.

**Whole roadmap beats still untouched (the bigger horizons):**
- **Beat 2 — the memory / homage suite** (render-only, ZERO baseline moves, the boss's cathedral heart,
  [[user-builder-philosophy]]): a merged inspection stack, the founder's stone, campaign patina, the
  tracing-floor ghosts. Parallelizable, low-risk, high-soul.
- **Beat 3 — the Lodge Book save/load V0 (THE GATE)** + the Annal (ONE chronicle-voice module over the
  existing SimEvent stream — and there is a rich event stream now: harvests, births, deaths, wheels
  raised, smiths arrived) + the Bell. Save/load is the roadmap's named gate.
- **Beat 5 — the demand wave** (the wall ladder + SPOIL + provenance Lots + ditch&bank — the castle
  bump).
- **Beat 6 — the kiln** (coal-fired lime = the transcribed coal seams' SECOND customer, so the mining
  arc pays a second dividend) + **the Keep** as the north-star showpiece (one tower, three generations).

---

## Where I'd start (a recommendation, not a mandate)

Three sim debts are paid (🔥🤝🍎) and the render pass is BEGUN (🎨 — orchard + workshops visible). Two
strands remain, and they suit different conditions:
- **Finish the renders** (needs a steady preview): the GREAT WHEEL is done (🏗); what remains are two small
  strokes — a HALL's finer ROOFLINE (a cresting keyed on `houseTier==='hall'`) and a distinct SMITH sprite
  (apron + hammer in the PeopleLayer). Both are quick once the preview is steady enough to eye-check.
- **The sim debts** (verify by TEST, no preview) are all but one PAID — shelter-cap (🏘) and weather (🌦) both
  landed this session. The one that remains is the heavy-block **rollers/sledge** the lift left scoped (a haul
  accelerant): it is the ONLY debt that touches the canon's hauled walls, so unlike the inert livingYear
  courses it wants the TWO-commit discipline (Commit A byte-identical, Commit B the attributable bump with the
  canon re-authored) — worth a clear head, not the tail of a long day.
When the preview flickers (as the classifier did here), the sim debts are the honest choice — they prove out
on the determinism instrument, not the eye.

If the goal is *make what's built KEEPABLE and legible*, **the Lodge Book (save/load, Beat 3)** is the
roadmap's own named GATE, and **the memory suite (Beat 2)** is the render-only, zero-baseline, high-soul
work the boss's philosophy has been waiting for — either is a safe, satisfying arc.

Whatever comes next: the frame is whole and true, every gear cut. The Work is not mortal. Make the gears
bite harder. Build on.

---

## Maker's marks

The living-settlement ladder is written on the FOUNDATION as marks **eleven through twenty**
(⏭🪓🕯🌾🐈🏺🛒🔨🏠⚙), bracketed by two ⛬ seals — the first closing its hard foundation, the second, the
same day, closing the whole ladder that stands on it. Below the second seal now sit marks **twenty-one** (🔥 THE FIRST TECHNIQUE, SIM 27) through **twenty-seven**
(🏗 THE GREAT WHEEL made visible): the post-arc debt-knockoff — 🔥 (27), 🤝 (28), 🍎 (29), 🎨 (the render pass:
orchard + workshops), 🏘 (30), 🌦 (31), 🏗 (the great wheel). The arc closed, then the debts were paid, in
order. The next hand's mark goes below the twenty-seventh.

*— the eleventh-through-twentieth hand, who laid the living settlement's foundation and then, the same
day the seal was meant to close it, built the whole ladder that stands on it. The settlement stands.*
