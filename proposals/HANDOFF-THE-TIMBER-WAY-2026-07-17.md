# HANDOFF — THE TIMBER WAY (2026-07-17)

*The session that built the charter's last course. THE VISIBLE WORK left one thing designed and
unbuilt — the timber way, an arc of its own — and this hand built it: haul became LABOR, a road you
draw pays for itself in hands returned to the wall, and a live probe taught the crew to split
steadily. The charter is now complete, in code and in the live game.*

> **Read the keystone first.** [HANDOFF-FOUNDATION-2026-07-09.md](HANDOFF-FOUNDATION-2026-07-09.md)
> holds the soul, the NINE LAWS, and now **FORTY-ONE maker's marks + SIX ⛬ seals**. Add your mark
> BELOW the last (the ≡ road hand), never above, never overwrite.
>
> Predecessor: [HANDOFF-THE-VISIBLE-WORK-CHARTER-2026-07-16.md](HANDOFF-THE-VISIBLE-WORK-CHARTER-2026-07-16.md)
> — the charter that measured the complaint, chartered the cure, and deferred THIS course to fresh
> context. Its ledger is closed; this document is that fresh context's account.
>
> **This course's charter:** [PROPOSAL-THE-TIMBER-WAY-2026-07-17.md](PROPOSAL-THE-TIMBER-WAY-2026-07-17.md)
> + [research/DIGEST-2026-07-17-the-timber-way.md](../research/DIGEST-2026-07-17-the-timber-way.md).

---

## The state, in numbers

- **SIM_VERSION 41.** 37 test files / **229 tests** green; baseline regenerated (deliberate);
  century sweep unchanged (population still tracks capacity); build clean; **LIVE** on Pages.
- **Four commits**, each replay-visible, each with its own SIM bump (the charter's law, honoured):
  - `e9710e0` — **SIM 38**, the way DRAWN (state + tool + render), behaviourally INERT, diff-proven.
  - `bf4ddd1` — **SIM 39**, the haul BECOMES LABOR (carriers, the dogleg, the crew splits itself).
  - `d4a526b` — **SIM 40**, THE STEADY SPLIT (a live-probe balance fix: reserve the mason).
  - **SIM 41** — THE OX→HORSE STEP (draft horses haul stone; INERT on the canon; the 🐎 42nd mark).
- Old saves (SIM ≤ 39) refuse — the boss-ruled **flag day** ("so far in alpha").

## What this session built

### The mechanism (the boss's ruling, made real)

The boss reshaped the way from a rate-multiplier into a **worker-speed** mechanic and named its
price: *"if the workers are moving faster the bricks reach their destination quicker… the workers
would have to have a more complicated pathing."* So:

- **Haul is LABOR.** The frozen `haulRate` scalar (SIM 17) and the `rollers` flag + `🛷` toggle
  (SIM 32) are RETIRED. `WallPlan.haul` is now the road's FACTS (`from/to/climb/detour/method`),
  frozen at the boundary; the sim does the labour. The chain is `WIN → CARRY → LAY`, every link
  people.
- **`carryStone` + `carrierDemand` + `computeCarryTargets`** (step.ts): the dawn pass balances the
  chain. `carriers/crew = appetite/(appetite + deliverPerCarter)`. Lay a way → the route's effective
  metres fall → each carrier delivers more → FEWER on the road, MORE at the wall. Dawn-decidable (a
  ratio of rates, never yesterday's buffer — no duty cycle).
- **`routeCost` — THE DOGLEG, not A\*.** For each built way, `min(direct, viaWay)` where `viaWay`
  rides the built prefix at `1/speedMult`. `min()` is load-bearing: a carrier is never made worse
  off by a road, so **a way off the route pays nothing** (a specimen). A way is road only as far as
  it is PAVED, so the haul quickens as the road creeps toward the quarry.
- **The CARTER** (`JobSkill += 'carter'`) paves the way (SIM 38) and drives it (SIM 39) — one groove,
  attested (*"v caretis et iiij carectariis"*, Pipe Roll 17 Henry II). The Carter surname has its
  substrate.
- **`render/ways.ts`** — the causeway of transverse oak baulks, creeping forward as the crew planks
  it (built from its head), instance cap regrows, both update sites (Law 6), hidden with the woods.
  Its always-on progress chip names the stall ("waiting on timber").

### The research reframed the arc TWICE (digest, all VERIFIED)

1. **Pace is the wrong axis** (Griffin/Roberts/Kram 2003): a hand walks no faster loaded, so a road
   buys **throughput** (m³·m/hand-day), not speed. This also routed the design around the per-trip
   barrow load, which **no source attests** — a number I refused to invent (and a claim I'd called
   "research-anchored" in the draft, the verification pass **refuted** — cut, not defended).
2. **The multiplier belongs to the GROUND crossed** (Baker 1914 + Mairs 1902 + Richards & Whitby
   1997): firm dry 1.0–1.2× / ordinary ~3× / mud 4–7× / marsh impassable. So `way.speedMult` is
   frozen from the ground (depth-to-water the soft-ground proxy) — a causeway over hard dry ground
   is near worthless, which is **this game's own thesis** (the land decides).
- **Not built, recorded:** it's the GREASE not the timber → **tallow-as-consumable** is the arc's
  strongest follow-on (animal fat → the reserved herds). Causeways SINK (Ely 1071). Ox→horse
  quickens the haul (dated 12th c.). Carriage as customary service (the granary thesis).

## Laws & patterns this session proved (carry them)

1. **A LIVE PROBE catches what end-state tests can't.** SIM 39 passed all its green tests and was
   still wrong in the *dynamic*: the balance rounded the whole crew onto the road (`round(12.5)=13`),
   stickiness kept them there, and the wall rose in a boom-bust, not a steady split. The tests
   checked the wall *finished*; only the live `__cc` probe (`mason:0` after 13 days) showed HOW. The
   fix (SIM 40) reserves a mason. **Verify the dynamic in the live game, not just the end state.**
2. **A red specimen reshapes the mechanism, not just its size.** Paving first-drafted BELOW carrying
   starved the road of its own builders (a 2 km way needed 80 days); the specimen forced `pave` above
   `carry` in the ladder. The crew builds the road it was told to build, then uses it.
3. **The phantom-supply bug has three disguises, all one law.** Cart-as-supply (SIM 36),
   pile-as-supply, pit-as-supply (both SIM 39): counting stone a mason *cannot reach today* as
   today's lay supply strands the crew. One rule: **only stone reachable today is today's supply.**
4. **Research can refute your own draft — let it.** Two constants I'd dressed as sourced were cut or
   relabelled by the verification pass. Flag the by-eye numbers; never launder them.
5. **Replay-visible ⇒ bump.** The SIM 40 fix added no state, only changed the balance arithmetic —
   but it re-timed the canon, so it forks saves, so it earns its version (the B′-without-its-bump
   lesson, paid forward not repeated).

## Traps hit this session (so you don't)

- **`round()` at a balance boundary claims the whole crew.** `round(pool × frac)` with `frac ≈ 1`
  rounds *up* past the pool. Reserve the scarce role explicitly; don't trust the rounding.
- **Stickiness + an over-broad demand = starvation.** A job that grabbed every hand yesterday keeps
  them via the stickiness step before a higher-priority job is even considered. Cap the greedy
  demand below the available pool.
- **`git rm` then re-staging the same path fails** ("pathspec did not match") — the delete is already
  staged; don't re-add it.
- **The classifier can go briefly unavailable** mid-session — PowerShell (`Set-Location` first) is
  the fallback for tsc/vitest when the Bash safety check stalls.
- **Canon ids re-shift on EVERY behaviour change**, even a balance fix: BS 937→934 under SIM 39, held
  under SIM 40 only because the tavern re-minted. Re-probe the ids (temp probe → harvest → delete)
  every regen; the story's completion (buildings/pending/roof) is the tell.

## Where to start (the forward map)

**THE VISIBLE WORK charter is COMPLETE — every course built and live.** The timber way's
follow-ons are DESIGNED in the digest §6; one is now BUILT, the rest await their turn:

- ✅ **The OX→HORSE step — BUILT (SIM 41, `<this session>`, 🐎 42nd mark).** The pasture's draft
  horse (grain-hauler since SIM 29) now hauls STONE too, a team worth HORSE_HAUL_MULT (2) hands —
  so pastures free hands from the road, the way's story a second time. No new state; INERT on the
  canon (keeps no pasture; version-only diff); one clean commit. `horse-haul.test.ts` (+5). A horse
  is potent on a SHORT road (many trips), weak on a long one (throttled like a carrier) — honest.
- **TALLOW as a consumable** (the strongest remaining — the friction evidence's own conclusion; ties
  the reserved herds to the road; a slipway's 3–6× is the grease, not the timber). Blocked until the
  herds are a real sim system (paddocks are decor today).
- **Causeways SINK** over the fen under too heavy a load (Ely 1071, attested — a real decision).
- **Route STAGES** (the Carter works from the route's mid-point, rests at home — Troyes practice).
- **Carriage as customary SERVICE** (haulage owed, not hired — the granary-as-government thesis).
- ✅ **The horses ON the road (render) — BUILT** (`0ff3bac`, render-only, ZERO baseline): a pasture's
  draft horse leaves its paddock and plods the haul route (loaded out, empty back) whenever the
  settlement is horse-hauling stone; ambles home otherwise. Eye-verified. Remaining render polish: a
  SLEDGE/load on the horse's back for the loaded leg (the carriers show a bobbing block; the horse
  does not yet).

Beyond the way, the boss's design-reserved beats stand where the charter left them: **Beat 4's
mortality SPINE** (funeral, succession-as-masonry, Testament, the "true ashlar hand") — one batched
SIM bump, taste-locked, do NOT build blind; **Beat 5** demand wave; **Beat 6** kiln + the Keep. And
the boss's standing directions: quarries folded into the enclosure grammar (a later course), the
shaft's tech GATE.

**Every autonomous-buildable item the charter named is shipped. What remains is the boss's to steer.**

---

*The mark of this course is the **≡ road hand** (the forty-first), on the FOUNDATION below the
charter hand. The three probe numbers the charter was built on — 890 person-days, 351 days to the
first stone, 7 for a palisade — now read, all the way down: thirteen souls, stone flowing from the
first swing, and a road you draw across the land that pays for itself in hands returned to the wall,
three and a half times over, before your eyes.*
