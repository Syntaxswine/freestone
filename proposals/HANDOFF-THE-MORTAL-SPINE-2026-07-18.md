# HANDOFF — THE MORTAL SPINE (2026-07-18)

*The session that finished the timber way and opened Beat 4 — the generational heart. It was long
and it stayed clean: the whole timber way arc landed (haul became labor, the ox gave way to the
horse, the way's worth grew legible and a calibration bug it caught was fixed), and then, at the
boss's word and scoped live with him across three rounds of rulings, FOUR courses of the mortal
spine were built — the skill ladder, the churchyard (sim + render), and lineage. The generational
settlement now ages, mourns its dead, spends stone on their graves, grieves the unmarked, and passes
its skill down bloodlines. What remains — technique-death and the master-gated works — is scoped,
build-ready, and deliberately left for fresh strength.*

> **Read the keystone first.** [HANDOFF-FOUNDATION-2026-07-09.md](HANDOFF-FOUNDATION-2026-07-09.md)
> holds the soul, the NINE LAWS, and now **FORTY-FIVE maker's marks + SIX ⛬ seals**. Add your mark
> BELOW the last (the 🩸 lineage hand), never above, never overwrite.
>
> **The active arc's scope:** [PROPOSAL-BEAT-4-THE-MORTAL-SPINE-2026-07-17.md](PROPOSAL-BEAT-4-THE-MORTAL-SPINE-2026-07-17.md)
> — boss-ruled over three AskUserQuestion rounds, build-ready, with a BUILD STATUS banner (4 courses
> shipped) and the remaining courses. **Read it end-to-end before continuing the spine.**
>
> Predecessor (now complete): [HANDOFF-THE-TIMBER-WAY-2026-07-17.md](HANDOFF-THE-TIMBER-WAY-2026-07-17.md)
> — the whole carriage arc closed (haul-as-labor, ox→horse, the way-worth readout + its calibration).

---

## The state, in numbers

- **SIM_VERSION 45.** 40 test files / **246 tests** green (incl. the determinism baseline); build
  clean; century sweep tracks capacity; **LIVE** on Pages. HEAD `91b352f`.
- Old saves (SIM ≤ 44) refuse — the boss-ruled flag day ("so far in alpha").

## What this session built

### The timber way, completed (SIM 38–42) — the carriage arc's close

Haul became LABOR: carriers walk stone along a route (the dogleg, not A*), the drawn causeway splits
the crew, a live probe hardened the split. The ox gave way to the horse (pastures haul stone, freeing
hands; rendered on the road with a sledge-load). The way's worth became legible as you draw it — and
that readout immediately caught a calibration bug (the SIM-39 threshold made the way near-inert on the
real Durham map, an inverted evidence band); re-anchored to the terrain's median ground, guarded by a
test. Full account: HANDOFF-THE-TIMBER-WAY. **The VISIBLE WORK charter is whole.**

### Beat 4 — the mortal spine, four courses (SIM 43–45)

Scoped live with the boss (PROPOSAL-BEAT-4, §0/§0b/§0c hold his ten rulings). Then:

- **SIM 43 — THE SKILL LADDER** (`b8ff75e`): `jobMult`/`skillBand` grew from two states to green
  (~1yr ×9/8) → journeyman (~4yr ×5/4) → master (~10yr ×3/2), an accelerating climb (mastery "much
  faster"). Dyadic-exact. INERT on canon (no journeyman in 200 ticks); sweep-safe (the harvest is
  SPACE-gated, so master farmhands don't inflate food).
- **SIM 44 — THE CHURCHYARD** (`e625c44` sim, `f03fdd4` render): `person_died` raises a `Grave`
  (name, finest craft → epitaph); a marking pass spends one STONE slab (`GRAVE_STONE`) else WOOD,
  oldest-first; UNMARKED mounds GRIEVE (a floored growth-drag on births+migrants). The churchyard is
  a drawn `FieldUse`. Render: headstones / wood markers / bare mounds fill the ring in rows; click a
  stone → *"here lies Edith, a master mason, Year −22 to Year 34."* INERT on canon; sweep unchanged
  (villages mark in wood, so grief stays off).
- **SIM 45 — LINEAGE** (`427420a`): `newChild` seeds a head-start (`LINEAGE_INHERIT` 0.3 of a drawn
  parent's best-trade days, capped below master) — masters beget masters, dynasties form. INERT on
  canon; sweep equilibrium holds (the rng sequence shifts, the tracking doesn't).

## Laws & patterns this session proved (carry them)

1. **Scope live, build clean.** Three AskUserQuestion rounds turned a "don't build blind" beat into a
   fully boss-ruled, build-ready spec — and every mechanism that came back was better than a solo
   draft. Proposal-first, boss-ruled, then build one clean course at a time.
2. **A Beat-4 course is INERT on the canon** because livingYear first fires at tick 364, past the
   200-tick baseline — no death, no birth. So the ladder, the churchyard, and lineage each moved the
   baseline by version + hashes ONLY (diff-confirmed), one clean commit + regen apiece. **Confirm the
   inertness with the diff; don't assume it.**
3. **The harvest is SPACE-gated, not rate-gated** — so faster (master) farmhands free hands but never
   inflate food, and the population equilibrium is immune to the skill ladder. This is why every
   Beat-4 skill change is sweep-safe. Re-run the sweep anyway; read the numbers.
4. **A new draw on the demo rng shifts the whole demographic SEQUENCE** (lineage's parent-pick did) —
   the sweep DISTRIBUTION moves a hair while the equilibrium still tracks capacity. That's expected
   for a SIM bump; the tracking, not the exact numbers, is the invariant.
5. **The readout is a design instrument** (the way-worth readout caught its own calibration bug; no
   test had seen it, only the real map). Make a land-dependent mechanic legible and the map grades
   your calibration.
6. **A live probe catches what end-state tests can't** (the timber-way boom-bust). Verify the DYNAMIC
   in the running game across many days, not just that the wall finishes.

## Traps hit this session (so you don't)

- **The receiver-trick camera needs `cam.aspect` reset AFTER `renderer.setSize(1000,700)`** — else
  the frame renders all-sky (a stale-aspect gotcha, distinct from the underground-camera one). Also:
  Durham terrain sits ~45–65 m AOD, so place the shot camera relative to `site.heightAt`, not at a
  low absolute Y.
- **`stepped()`/`worldStep` MUTATE `worked.mason`** — a shared `worked` object carried a band-flip
  between two test runs (skill.test). Build a fresh worked object per call.
- **A long-running test that tracks exact stockpile will see graves nibble it** — a year-crossing run
  now spends one slab per death for a headstone (mortality draws the stone economy). Account for
  `graves.filter(marker==='stone') × GRAVE_STONE`, don't assert the raw total.
- **Births gate on the harvest SURPLUS (S), never the grain store** — a fed crowd larger than the
  founding capacity won't breed (S < 1). To force births in a test, use a small crowd (< founding
  capacity) so there's a surplus.
- **A new `FieldUse`/`worked` field needs every literal updated** (world founders, newAdult,
  newChild, cheat spawn, test helpers) + any render-side use-switch (farms.ts `bandFor`) or tsc
  catches it — which it did.

## Where to start (the forward map)

**Beat 4 is FOUR courses in; TWO remain, each its own course, best on fresh context (PROPOSAL-BEAT-4
has the full design + the boss's rulings):**

1. **★ TECHNIQUE-DEATH + REDISCOVERY (§2B/§2E) — the generational engine, the biggest remaining
   piece.** A master's craft is held only in him; when he dies UNTAUGHT (no apprentice bonded), the
   technique is LOST and the trade drops to the lesser rate / the great works stall — and a hand
   posted to STUDY the tracing floor claws it back over time. This is what makes a solved castle
   un-solve itself at a graveside — the whole "generational factory" thesis. The substrate is there:
   the master band (SIM 43), the apprentice bond (SIM 28, smith-only today — generalize it), the
   first technique (SIM 27, smith relief), the tracing floor (Beat 2). Ruling: EVERY labor type has a
   losable technique; rediscovery is a deliberate STUDY job.
2. **QUALITY-GATED FINE WORKS (§2A/§2C).** A new `BUILDING_KIND` (a *noble's quarters*; the Keep is
   Beat 6's) that only a MASTER's hand can raise — the masons complete the shell only while a master
   of the trade lives and works, else it waits like a shell awaiting stone. Makes mastery bound
   AMBITION, and gives a master's death real stakes for what you can build.

**Follow-ons (small):** an explicit `parentId` on Person (visible genealogy — "child of Edith" on the
headstone, traceable bloodlines); render polish (finer/cross headstones). **Boss-reserved beyond Beat
4:** Beat 5 demand, Beat 6 kiln + Keep, quarries→enclosure grammar, the shaft tech-gate; the timber
way's own digest §6 follow-ons (tallow — blocked on herds; causeways-SINK — a destructible-road design
call; route stages).

---

**The mark of this arc is the 🩸 lineage hand (the forty-fifth), on the FOUNDATION below the churchyard
hand.** The settlement is generational now in truth, not just in frame: it ages, it buries its dead
under stone it spared, it grieves the mounds it couldn't honour, and it hands its craft down through
blood. What it does not yet do is FORGET — a master can die and the knowledge still passes as if he'd
taught it. Build the forgetting. That is the engine, and it is the next hand's to lay.
