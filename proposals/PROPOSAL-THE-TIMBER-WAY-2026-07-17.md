# PROPOSAL — THE TIMBER WAY (Course 4 of THE VISIBLE WORK)

*The last course of the charter, opened on fresh context as the charter demanded. The boss ruled the
way from a rate-multiplier into a **worker-speed** mechanic; this is the arc that makes haul into
labor, gives the road its own trade, and retires the frozen cart.*

> **Parents:** [PROPOSAL-THE-VISIBLE-WORK-2026-07-16.md](PROPOSAL-THE-VISIBLE-WORK-2026-07-16.md) §3H
> (the design pass) · [HANDOFF-THE-VISIBLE-WORK-CHARTER-2026-07-16.md](HANDOFF-THE-VISIBLE-WORK-CHARTER-2026-07-16.md)
> (the ledger that deferred it) · [PROPOSAL-LOGISTICS-2026-07-13.md](PROPOSAL-LOGISTICS-2026-07-13.md)
> (the carriage layer: WIN → HAUL → LIFT → LAY) ·
> [research/DIGEST-2026-07-16-the-visible-work.md](../research/DIGEST-2026-07-16-the-visible-work.md)
> (the causeway's attestation boundary).

---

## 0. The boss's ruling — the words this arc must obey

> **"the rollers i imagined more like conveyer belts, they rapidly transfer the stone along a pre
> planned path."** *(2026-07-16, the original ask)*

> **"if the workers are moving faster the bricks reach their destination quicker. i think this is a
> more complicated ask because the workers would have to have a more complicated pathing."**
> *(2026-07-16, the §6.3 ruling that reshaped it)*

Two sentences, and the second is a **rejection of the easy fix**. A rate multiplier on a frozen
scalar would have satisfied the first sentence and betrayed the second: the boss did not ask for
stone to *arrive* faster, he asked for **the workers to move faster**, and named the price himself
("more complicated pathing"). He is buying the mechanism, not the effect — this is
[[feedback-bedrock-over-effect-hacks]] in his own voice.

The research boundary (digest, 2026-07-16) already ruled the fiction: a **timber causeway** the
sledge rides (Ely 1071, Berlin 1238) — **not** a conveyor, not a wagonway (post-1500). The boss's
word "conveyor belt" describes the *feel he wants* (rapid, along a pre-planned path), and the
causeway delivers that feel honestly. We keep the feel and drop the anachronism.

## 1. The census — what stands today (grep-the-tree, paid again)

| Thing | Where | Fate |
|---|---|---|
| `WallPlan.haulRate: number \| null` | `types.ts:363` | **RETIRES** — the frozen scalar is the thing being replaced |
| `WallPlan.faceBuffer: number` | `types.ts:364` | **STAYS** — the stone standing at the face is real, and it is what carriers fill |
| `WallPlan.method: HaulMethod` | `types.ts:365` | **STAYS** — the field-guide word for the route ('sledge', 'ox-cart over the bridge'); constant strings, and the HUD's bottleneck line reads it |
| `WallPlan.rollers: boolean` (SIM 32) | `types.ts:388` | **RETIRES** — the way *is* the rollers, drawn instead of toggled |
| `ROLLER_HAUL_BOOST = 2` | `types.ts:716` | **RETIRES** with it |
| `haulStone(state)` | `step.ts:1859` | **REWRITTEN** — meters a frozen rate today; becomes carrier labor |
| `HAUL_BASE_RATE / _SCALE / _UPHILL_PER_M / _BRIDGE_DETOUR / _GORGE_DROP / _MAX_REACH` | `main.ts:562-567` | **SPLIT** — the terrain reads (`nearestDryPost`, climb, gorge) survive; the rate arithmetic dies |
| `haulVerdict()` → `{haulRate, method}` | `main.ts:606` | **REFROZEN** — freezes terrain FACTS (source, climb, detour), not a rate |
| `🛷 sledge` button | `main.ts:406-408` | **RETIRES** — replaced by the way tool |
| `PileLayer.nearestStonePile()` | `piles.ts:78` | **PROMOTED** — the theater's pile anchor becomes the carrier's real errand |
| `masonCount = ceil(layCount/2)` | `people.ts:146` | **RETIRES** — the render's half-and-half guess becomes the sim's own split |
| `computeAssignments()` | `step.ts:1160` | **EXTENDED** — gains `carry` + `pave` |
| `sledge.test.ts` (18 refs) | `test/` | **DELETED** with the flag |
| `haul.test.ts` (14 refs) | `test/` | **RE-AUTHORED** — same conservation law, new mechanism |
| canon wall **A** (`haulRate: 0.6, method: 'ox-cart uphill'`) | `baseline.test.ts:92` | **RE-AUTHORED** — the canon's only hauled wall; the story it tells must become the carriers' |

**The reframe the census forces (again — [[feedback-proposal-first-reframes]]):** the theater built
in Course 2 *already contains this course's answer*. `people.ts` splits the lay crew half into
masons and half into CARRIERS who walk to a real `nearestStonePile()` and hand off at a station. It
is pantomime — the sim's stone teleports at a frozen rate while the sprites act out a journey. **The
course is not "build carriers". It is "make the sim believe the theater."** The half-and-half guess
becomes an honest, computed split; the walk becomes the delivery; the pile becomes the source. When
this lands, `people.ts` gets *simpler*, not richer.

## 2. The model — haul as labor

### 2.1 The chain, restated

`WIN` (diggers) → **`CARRY` (carters)** → `LAY` (masons). Today the middle link is a scalar; after
this it is people. Every link is now hands, and the wall stalls on whichever link is short — the
carriage layer's founding thesis (PROPOSAL-LOGISTICS §4) finally true all the way down.

### 2.2 What one carrier delivers

```
tripsPerDay  = CARRIER_DAY_RANGE / (2 × cost)        // there and back
delivered    = CARRIER_LOAD × tripsPerDay × jobMult(p,'carter')
```

`cost` is the route's **effective metres** (§2.3). The `2 ×` is the empty walk back — a real and
unavoidable half of portering, and the reason a *short* haul is worth so much more than a fast one.

### 2.3 The route cost — the dogleg (NOT A*)

§3H's own note: *"routes can stay cheap — polyline-with-way-segments cost fields, not full A*."*

```
direct   = dist(src, dst)
viaWay   = dist(src, entry) + alongWay(entry, exit) / WAY_SPEED_MULT + dist(exit, dst)
cost     = min(direct, viaWay) × haulDetour + HAUL_UPHILL_PER_M × haulClimb
```

where `entry`/`exit` are the closest points on the **built** way to source and destination. Cheap
(O(segments)), deterministic, and it makes *where you draw the way* the whole decision: a way laid
between the quarry and the work pays; a way laid across a meadow does nothing. The player is drawing
a **road**, and the road is doing what roads do.

`min(direct, viaWay)` matters: a carrier is never made *worse off* by a way existing. Nobody detours
onto a road that costs them.

### 2.4 The crew splits itself — and this is the boss's mechanic

The dawn pass balances the chain: for a hauled wall, hands divide so that delivery ≈ consumption.

```
consumePerMason  = layRate × DRESS_DRAW[dress]      // m³/day a mason eats
deliverPerCarter = CARRIER_LOAD × CARRIER_DAY_RANGE / (2 × cost)
carriers / crew  = consumePerMason / (consumePerMason + deliverPerCarter)
```

**Lay a way → `cost` falls → `deliverPerCarter` rises → fewer hands on the road → more hands on the
wall → the wall goes up faster.** That is *exactly* the boss's sentence — "if the workers are moving
faster the bricks reach their destination quicker" — arrived at by mechanism rather than by fiat. And
it is **visible**: the crowd on the road thins and the crowd on the wall thickens. You can watch the
road pay for itself.

This also kills the oscillation the charter's determinism critique caught: the split is a **ratio of
dawn-decidable rates**, never a reaction to yesterday's buffer. No feedback, no duty cycle.

### 2.5 The way itself

A `WayPlan`: a drawn polyline, a width implied, `timberTotal` + `workTotal` frozen at the boundary
from its length and the ground it crosses. It is **built incrementally from its head** (the arc's own
law — nothing credits in a lump): `builtLength = length × workDone/workTotal`, and only the built
prefix discounts. You watch the road creep toward the quarry, and the haul quickens as it goes. It
**draws timber as it lays** — the woods' next customer after the great wheel, and the first
renewable-into-logistics loop.

### 2.6 The carter — the road's own trade

`JobSkill += 'carter'`; `Assignment += 'carry' | 'pave'`, both `JOB_OF → 'carter'`. A year on the
road greens a carter (×9/8, the same bonus band as every other trade — SIM 36's law). The road hands
lay the road and drive it: one trade, one groove. **The Carter surname finally has its substrate**
(§3H's ask), and the skill taxonomy stays flat — no new band rules, no XP.

## 3. The numbers (calibration + honesty flags)

The anchor is the existing crew arithmetic: a mason lays `LAY_RATE_BASE 24 + vigor×12` stones/day and
each draws `DRESS_DRAW` m³ (rubble `0.03375`, ashlar `0.050625`) — so **a mason eats ≈0.8–1.0 m³/day**.

| Constant | Value | Basis |
|---|---:|---|
| `CARRIER_LOAD` | 0.02 m³ | ≈48 kg of sandstone — a hod/handbarrow load. Research-anchored (§7). |
| `CARRIER_DAY_RANGE` | 12000 m | effective metres a road hand covers in a working day (loaded out, empty back, loading time absorbed). **By-eye, calibrated** (below). |
| `WAY_SPEED_MULT` | 3 | boss wants ≥3× visibly; §7 tests whether the evidence bears it. |
| `WAY_TIMBER_PER_M` | *pending §7* | m³ of timber per metre of causeway |
| `WAY_WORK_PER_M` | *pending §7* | person-days per metre |
| `HAUL_UPHILL_PER_M` | 14 | **kept from SIM 17** (by-eye, already live) |
| `HAUL_BRIDGE_DETOUR` | 4 | **kept from SIM 17** — the Wear stays a moat |

**The calibration anchor:** `CARRIER_LOAD × CARRIER_DAY_RANGE = 240 m·m³`, so at a **120 m** bare
route one carter delivers `240/(2×120) = 1.0 m³/day` ≈ **exactly one mason's appetite**. The crew
splits ~50/50 — *which is precisely the half-and-half the Course-2 theater already shows*. The
theater was right; the sim is being brought up to it. On a way, that same route costs ~40 m
effective → one carter feeds ~three masons.

**Honesty flags** (the house rule: label the by-eye numbers, never launder them):
`CARRIER_DAY_RANGE` is a **game choice** calibrated to the split above, not a sourced figure.
`WAY_SPEED_MULT` is a **design target** the boss set (≥3×); §7 says what the evidence actually
supports, and if the evidence is weaker the constant stays but wears the flag — a labelled
game-choice, like `PUMP_TAX_MULT`.

## 4. Build order + discipline

**Commit A — SIM 38, THE WAY (behaviourally INERT):** `WayPlan` + `ways: []` + `plan_way` + the
`pave` assignment + `carter` in `JobSkill` + the `≡ way` tool + `render/ways.ts`. The canon lays no
way ⇒ `hasWork('pave')` is false and `find` returns undefined ⇒ **byte-identical behaviour**. The
baseline moves for **pure serialisation only** (`ways:[]`, `worked.carter:0` on every person,
`SIM_VERSION`) — the **bell-pit/shaft precedent** (memory: "ONE commit + regen, NOT the two-commit
dance — no separable behaviour change"). Proof: `git diff baselines/durham-42.json` shows **only**
milestone hashes + simVersion — no count, no stockpile, no position.

**Commit B — SIM 39, THE HAUL BECOMES LABOR (the attributable bump):** `carry` + `wayCost` +
`haulFrom/haulClimb/haulDetour` replacing `haulRate`; `rollers`/`ROLLER_HAUL_BOOST`/🛷 retire;
`haulStone` rewritten; boundary refrozen; `people.ts` simplified onto the real assignment; canon
re-authored; `haul.test.ts` re-authored; `sledge.test.ts` deleted.

Two commits, two bumps — **each replay-visible, so each owns a SIM_VERSION** (the charter's own
lesson, learned the hard way when B′ shipped without its bump).

## 5. Red specimens (write them first — they shape the mechanism)

1. **Conservation** — `stockpile + Σ faceBuffer + laid×draw === won`, through a full carry cycle.
   The SIM-17 law, unchanged by the mechanism. Strict `===` (stone from zero is exact).
2. **A way pays** — same wall, same seed, same crew: with a way along the route it completes
   **strictly sooner**, and the delivered m³/day is ≥3× the bare-ground rate.
3. **A way off the route pays nothing** — a way drawn across an irrelevant meadow leaves the
   completion tick **identical** (`min(direct, viaWay)` never detours a carrier).
4. **The split shifts** — with a way, `computeAssignments` puts strictly **fewer** hands on `carry`
   and strictly **more** on `lay` for the same wall. (The boss's sentence, as an assertion.)
5. **Local walls take no carrier** — a wall winnable underfoot (`haulFrom === null`) assigns zero
   carriers and draws the pile directly: the SIM-16 path, untouched.
6. **Incremental way** — a half-built way discounts only its built prefix; `builtLength` tracks
   `workDone/workTotal`.
7. **The carter greens** — a hand carrying for `GREEN_DAYS` flips to ×9/8 on the exact day.
8. **Replay === live** — byte-identical through a save round-trip with ways in the log.
9. **No oscillation** — a steady world's carry-crew size is stable day over day (the critique's
   duty-cycle, pinned).

## 6. Open questions for the boss (ask, don't assume — the charter's law 5)

1. **Does a way need to be *connected* to anything?** Today's design lets a way be drawn anywhere and
   helps any route that finds it useful. The alternative — a way must touch a working and a plot to
   count — is more "planned" but fights the pencil. *Recommendation: free-drawn, the dogleg decides.*
2. **Should a way decay?** A timber causeway rots; the generational thesis would say a road is a base
   you must keep alive ("nothing persists unless you keep its base alive" — Living Settlement's ONE
   LAW). *Recommendation: NOT in this arc — ship the way, let decay be its own later course, since
   upkeep touches the whole generational clock.*
3. **Grain too?** The cart (SIM 23) moves grain to the granary on a separate abstract rate. A way
   between field and granary logically ought to help it. *Recommendation: NOT in this arc — the
   grain flow is a different subsystem; land the stone road first.*

None of these block the build; each has a recommendation and exactly one disposition.

## 7. Research grounding — *(pending: verification pass in flight)*

Digest to be committed alongside. Questions out: per-trip loads for hod/handbarrow/wheelbarrow on a
1200s site; wheelbarrow attestation in England by ~1200; the **key number** — the measured advantage
of a timber causeway / greased slipway over bare or soft ground (does the evidence bear ≥3×?);
timber + labour per metre of causeway; and whether a *carter* is honestly a distinct trade at a
1200s building site. Anything unverified ships **labelled**, never laundered.
