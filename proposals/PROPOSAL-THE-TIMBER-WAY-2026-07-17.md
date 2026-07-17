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

### 2.2 What one carrier delivers — ★ REFRAMED BY THE RESEARCH (§7.1)

The first draft of this section had a `CARRIER_LOAD` (m³/trip) times a `CARRIER_DAY_RANGE` (m/day),
and called the load "research-anchored". **The verification pass refuted both halves of that.**

1. **The per-trip load is unverifiable.** No primary or scholarly source gives a medieval per-trip
   load for a hod, handbarrow or wheelbarrow. The researcher refused to invent one, correctly.
2. **Pace is the wrong axis.** Loaded and unloaded humans walk at nearly the same speed — the
   metabolic cost curve minimises at **~1.3 m/s for *all* loading conditions**; carrying 30% of body
   mass costs **+47% metabolic rate**, not pace (Griffin/Roberts/Kram 2003). *A causeway cannot make
   a hand walk faster.* Modelled as literal m/s the honest ceiling is ~1.2–1.5×; modelled as
   **throughput** a 3–6× gain is fully defensible.

So the two constants collapse into **one**, in the unit the evidence actually supports:

```
CARRIER_THROUGHPUT = 240        // m³·m of stone moved per hand-day
delivered = CARRIER_THROUGHPUT / (2 × cost) × jobMult(p,'carter')
```

This is the same arithmetic — but it is now **one labelled game-choice constant in an honest unit**,
rather than two constants one of which was falsely dressed as sourced. It also routes around the
unverifiable number instead of inventing one to plug the hole. The `2 ×` is the empty walk back — a
real and unavoidable half of portering, and the reason a *short* haul beats a fast one.

**What the boss will see.** He asked for workers "moving faster"; the science says they don't, and
the honest visible payoff is different and better: **fewer hands on the road, more at the wall**
(§2.4). The bricks *do* reach their destination quicker — which is the outcome his sentence asked
for. This is the one place the arc chose the science over the literal words, and it is flagged for
him in the handoff rather than buried.

### 2.3 The route cost — the dogleg (NOT A*)

§3H's own note: *"routes can stay cheap — polyline-with-way-segments cost fields, not full A*."*

```
direct   = dist(src, dst)
viaWay   = dist(src, entry) + alongWay(entry, exit) / way.speedMult + dist(exit, dst)
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

### 2.4b ★ THE SECOND REFRAME — the multiplier belongs to the GROUND, not the road (§7.2)

The first draft gave the way a flat global `WAY_SPEED_MULT = 3`. **Three independent evidence lines
say that is wrong** — and they say so in the same voice:

| Ground the way crosses | Multiplier | Source |
|---|---:|---|
| Firm, dry, hard ground | **1.0–1.2×** | Baker T8 (50 vs 50 lb/ton); Mairs (69 vs 57) |
| Ordinary earth | **~3×** | Baker T8 midpoints 3.1×; Mairs wet sod 3.0× |
| Mud / soft / wet / plowed | **4–7×** | Mairs plowed 4.4×; Baker T8 worst/best 6.7× |
| Marsh / fen | **∞** | impassable without a way (Ely 1071) |

**A causeway over firm dry ground is very nearly a worthless investment.** That is not a
disappointment — *it is the better mechanic*, and it is this game's own thesis. Freestone's mining
arc is built on "THE LAND DECIDES… the land refuses you, and the refusal IS the game." A road whose
worth is a property of the ground it crosses **makes the player read the land** exactly as the
quarry, the adit, the bell pit and the shaft already make them read it.

So `speedMult` is **frozen per-way at the boundary**, sampled along the run — the same discipline as
every working since SIM 14. And the substrate already exists (grep-the-tree, once more): the **water
model** is a shared source (`water.tableAt`), and *depth-to-water is the honest proxy for soft
ground*. A way laid across the boggy flat by the Wear is transformative; a way laid along the dry
ridge is planks on rock.

**What this separates** (the digest's own distinction, which the first draft was conflating):
- **(A) Causeway over soft ground = BEARING CAPACITY** — it stops you sinking. Ely 1071, Berlin 1238,
  the Sweet Track. Ground-dependent, huge. **This is what we build.**
- **(B) Greased slipway = LUBRICATION** — the Stonehenge 40-tonner; the gain is the *tallow*, not the
  timber (ungreased wood-on-wood μ 0.25–0.7 ≈ bare ground). **Not built** — and it is the arc's
  strongest follow-on, because tallow is animal fat and the herds are already reserved.

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
| `CARRIER_THROUGHPUT` | 240 m³·m/hand-day | **LABELLED GAME CHOICE**, calibrated (below). The unit is the one the evidence supports (§7.1); the per-trip load it replaces is **unverifiable** and was not invented. |
| `WAY_MULT_FIRM` | 1.15 | a way on firm dry ground is nearly worthless — Baker T8 (50/50), Mairs (69/57). **Evidence-set.** |
| `WAY_MULT_SOFT` | 5.0 | a way over bog/mud — Mairs plowed 4.4×, Baker worst/best 6.7×. **Evidence-set.** |
| `WAY_SOFT_DEPTH` | 3 m | depth-to-water at which ground reads fully soft (the boggy proxy). **By-eye.** |
| `WAY_TIMBER_PER_M` | 0.06 m³ | **By-eye.** No attested medieval figure exists (§7.4); the Sweet Track's 111 kg/m is Neolithic AND its "ten men, one day" is *assembly only* — explicitly NOT modelled from. |
| `WAY_WORK_PER_M` | 0.04 p-d | **By-eye**, same reason. |
| `HAUL_UPHILL_PER_M` | 14 | **kept from SIM 17** (by-eye, already live) |
| `HAUL_BRIDGE_DETOUR` | 4 | **kept from SIM 17** — the Wear stays a moat |

**The calibration anchor:** `CARRIER_THROUGHPUT = 240 m³·m/hand-day`, so at a **120 m** bare route
one carter delivers `240/(2×120) = 1.0 m³/day` ≈ **exactly one mason's appetite** (a mason lays ~30
stones × `DRESS_DRAW` ≈ 1 m³/day). The crew splits ~50/50 — *which is precisely the half-and-half
the Course-2 theater already shows*. The theater was right; the sim is being brought up to it. Across
soft ground a way cuts that route to ~24 m effective → one carter feeds ~five masons.

**Honesty flags** (the house rule: label the by-eye numbers, never launder them). Everything above
marked **By-eye** is a game choice, not a sourced figure — `PUMP_TAX_MULT`'s precedent. What
*is* evidence-set is the **shape**: the multiplier is a property of the ground, its span is ~1.15–5,
and the unit of a hand-day is throughput. **A claim was corrected here rather than defended:** the
first draft called `CARRIER_LOAD` research-anchored; the verification pass found no source for it,
so the constant is gone rather than laundered.

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

## 7. Research grounding — **DONE**, and it reframed the arc twice

Full digest: [research/DIGEST-2026-07-17-the-timber-way.md](../research/DIGEST-2026-07-17-the-timber-way.md).
The headlines:

1. **★ Pace is the wrong axis** (Griffin/Roberts/Kram 2003, VERIFIED): humans walk ~1.3 m/s loaded or
   not; load costs energy, not pace. → the sim carries ONE throughput constant. §2.2 rewritten.
2. **★ The multiplier belongs to the ground crossed** (Baker 1914 T8 + Mairs 1902 + Richards & Whitby
   1997, all VERIFIED, converging): 1.0–1.2× firm / ~3× ordinary / 4–7× mud / ∞ marsh. → `speedMult`
   is frozen per-way from the ground. §2.4b added. **This is the better mechanic and it is ours.**
3. **★ It is the GREASE, not the timber** (Fall et al. 2014, VERIFIED): ungreased wood-on-wood
   μ 0.25–0.7 ≈ bare ground. → tallow-as-a-consumable is the arc's strongest follow-on (and it ties
   to the reserved herds). NOT built; recorded.
4. **The carter is attested** (Sharpe, Oxford ORA, VERIFIED): *"v caretis et iiij carectariis"*, Pipe
   Roll 17 Henry II; "many carts for hire in King John's time" (1199–1216, Winchester Pipe Roll
   1210–11). → `JobSkill += 'carter'` is honest. But **"common carrier" is ~1449** — wrong word, kept out.
5. **The sledge fiction holds**: the wheelbarrow is *just* attested (1222, the king's works at Dover)
   but **rare until the 15th c.**; the Chartres wheelbarrow is a **verified myth**.
6. **Two numbers refuted, not averaged**: Gimpel's 2,500 kg Troyes wagons are unfootnoted and
   demolished (a medieval cart carried ~1 tonne); the Sweet Track's "ten men in one day" is
   **assembly only** and must not be used to cost a causeway. Neither was used.
7. **Stated unverified, not invented**: per-trip barrow/hod load; per-metre causeway timber/labour;
   Knoop & Jones read only through secondaries (and their ordinances are 1370, not the 1200s).
   Salzman ch. XXII "Carriage" is the highest-value unread source — library access only.
