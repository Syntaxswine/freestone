# HANDOFF — THE LIVING SETTLEMENT STANDS

*2026-07-15 · the arc-closing keystone for the §9 living-settlement ladder, now fully built. This is
the "it is done, here is the map forward" companion to the in-progress build ledger
[HANDOFF-THE-LIVING-SETTLEMENT-BUILD-2026-07-15.md](HANDOFF-THE-LIVING-SETTLEMENT-BUILD-2026-07-15.md)
(read that for the per-step detail — this doc does not duplicate it). Read the FOUNDATION keystone
[HANDOFF-FOUNDATION-2026-07-09.md](HANDOFF-FOUNDATION-2026-07-09.md) FIRST — the soul, the nine laws,
now **twenty maker's marks** (⏭🪓🕯🌾🐈🏺🛒🔨🏠⚙) and **two ⛬ seals**; add yours BELOW, never above.*

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
- **The smith's PRODUCTION EFFECT** — the smith exists and persists but does no WORK yet. Wiring it to
  the DRESS lay-debt (a smith speeds the dressing/laying) IS the roadmap's Beat-4 *First Technique*, and
  it touches the masonry → its own two-commit bump. The single most natural next course.
- **The local-apprentice EMERGE path** — only the migrant smith comes; raising a smith from a local
  child under a master is the lineage the chronicle wants (roadmap Beat 4's apprentice bond).
- **Renders left plain**: the carpenter's yard and the great wheel have no geometry of their own; the
  smith renders as a laborer sprite; the orchard is a ground tint, not fruit-tree canopies (the
  TreeLayer pattern would dot it); a per-tier ROOFLINE flourish for a hall (its cresting/finial).
- **Variety-not-yet-yield**: the orchard bears no fruit toward the harvest, the horse pulls no cart
  toward the haul — both are variety markers awaiting an effect bump.
- **Shelter as a hard CAP** — housing is a retention nudge today; the roadmap's fuller reading has
  shelter gate GROWTH (build houses to grow), which needs the century-sweep re-tuned to account for it.
- **Step 5's rollers/sledge** — the heavy-block *haul* accelerant was scoped in the course title; the
  LIFT was the substantial deliverable, the sledge is a clean extension of the SIM-17 haul model.
- **Weather distribution shape** — uniform [0.7, 1.3]; a peaked shape (mean-of-two-uniforms) would make
  extreme years rarer if the churn ever reads harsh.

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

If the goal stays *deepen the generational factory*, the cleanest next course is **the smith's First
Technique** — the smith already stands at his forge; give him something to DO (speed the dress), on the
two-commit discipline the lift just modelled. It closes the loop the specialization pyramid opened and
it is small, attributable, and self-contained.

If the goal is *make what's built KEEPABLE and legible*, **the Lodge Book (save/load, Beat 3)** is the
roadmap's own named GATE, and **the memory suite (Beat 2)** is the render-only, zero-baseline, high-soul
work the boss's philosophy has been waiting for — either is a safe, satisfying arc.

Whatever comes next: the frame is whole and true, every gear cut. The Work is not mortal. Make the gears
bite harder. Build on.

---

## Maker's marks

The living-settlement ladder is written on the FOUNDATION as marks **eleven through twenty**
(⏭🪓🕯🌾🐈🏺🛒🔨🏠⚙), bracketed by two ⛬ seals — the first closing its hard foundation, the second, the
same day, closing the whole ladder that stands on it. The next hand's mark goes below the second seal.

*— the eleventh-through-twentieth hand, who laid the living settlement's foundation and then, the same
day the seal was meant to close it, built the whole ladder that stands on it. The settlement stands.*
