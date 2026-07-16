# PROPOSAL — THE MINING-METHOD LADDER (#50), 2026-07-15

*Scoping the next mining course while the arc is warm. This is a PROPOSAL, not a build:
the method ladder is a load-bearing SIM system with real design choices, and mining design
is a thing the boss steers (he inverted the red warning; he set the water levers). It turns
the vague backlog line "#50 method gates (bell pit, shaft+pump, drainage)" into a concrete,
geology-grounded design + the smallest buildable next rung, ready for your steer.*

> Read after the two mining courses this session (the prospecting scar + the adit) and the
> FOUNDATION keystone. The engine already holds every lever this needs — reach, the water
> table, the bed model, and the plan-time freeze. This is about giving the miner the RUNGS
> between "strip it from the top" and "give up."

---

## 0. Where we are — the two rungs that already stand

The mining loop today has exactly two ways to win building stone, and one hard wall:

- **The open cut** (SIM 14/15): strip overburden and win the DRY post within a shallow reach.
  Gated by `reach = min(dryDepth, MAX_OPEN_REACH=12 m)` — it dies at the water table and at
  ~12 m of overburden. The red warning + the flood make its limits legible; the snap clings to
  its edge.
- **The adit** (SIM 15, made playable `e7d0019`): drive a level, self-draining drift INTO a
  hillside to reach post under cover the open cut can't — dewatering the rock above its floor.
  Gated by needing a HILLSIDE above the target (the drift must stay above its own drainage).

**The wall:** post that is *drowned* (below the water table) on *flat or low* ground, where
there's no hillside to drive an adit into and an open cut floods. Today the readout says
"drive an adit" even where you can't. That is the gap the ladder fills.

## 1. The real ladder (what history actually did)

The historical progression is driven by two problems — **overburden** (how much dead rock to
move to reach the seam) and **water** (the seam drowns below the table). Each rung answers one:

| Rung | Answers | Reaches | Cost shape | Gate in reality |
|---|---|---|---|---|
| **Open cut / quarry** ✅ | shallow, dry | outcrop → ~12 m dry | one-time strip | none (always available) |
| **Adit / drift** ✅ | under COVER, self-drains | post under a hill, above drainage | one-time drive | a hillside above the seam |
| **Bell pit** ← next | shallow post on FLAT ground | a bit past the open cut, still DRY | one-time sink, then abandon | none — but shallow + wasteful |
| **Shaft + pump** ← endgame | DROWNED / deep post | below the water table | ONGOING dewatering cost | a pumping engine (power) |

- **Bell pit:** a narrow vertical shaft sunk to a shallow seam, worked outward at the bottom
  until the unsupported roof threatens to collapse (the "bell"), then abandoned and re-sunk
  nearby. It moves far less overburden per m³ of stone than an open cut (a shaft, not a hole),
  so it reaches a little DEEPER before the digging cost dominates — but it still must stay above
  the water table (no pumping), and it's wasteful (pillars left, frequent re-sinking). *It is the
  flat-ground answer where the adit has no hill.*
- **Shaft + pump:** a deep shaft with continuous DEWATERING (bucket-and-chain → horse gin →,
  historically, the Newcomen engine). It is the only method that beats the water table — it wins
  DROWNED post the other three can't — but at an ONGOING cost: labour (or engine fuel) spent
  every working day to keep the sump down, not a one-time drive.

*(Citation status: this ladder is standard mining history [open-cast → adit → bell pit →
shaft-and-pump], but I have NOT re-verified specific figures against sources in this pass —
per the house rule not to fabricate citations. If we build the shaft-and-pump's pumping
economics, firm the dewatering-cost numbers against a real source first, like the dig-rate
DIGEST did for lithology pace.)*

## 2. How each rung maps onto the ENGINE we already have

The whole point: the levers already exist. No new physics — new FREEZES over the same reach +
water + beds, exactly like `cutCommand` and `aditCommand`.

- **Reach vs water is already the core.** `quarryPlanAt` computes `dryDepth` (from `water`) and
  `stone` (from `cutEconomics` over the bed column). A bell pit is a `cutEconomics` read with a
  DEEPER reach cap and a smaller footprint; a pumped shaft is a `cutEconomics` read with NO water
  gate (it pumps) but an ongoing cost.
- **The freeze pattern is the template.** Each method is a command whose economics are READ at
  plan time (main holds beds + water + surface) and FROZEN, so the sim replays scalars and never
  sees rock or water (the SIM 14 freeze law). `plan_cut`, `plan_adit` — and next `plan_bell_pit`,
  `plan_shaft`.
- **The one genuinely new idea is the ONGOING cost** (the pump). Everything so far freezes a
  one-time `workTotal` + `stoneTotal`. A pump spends labour PER TICK while the shaft is worked —
  a small standing drain on idle laborers (or a built engine's fuel). That's the one new sim
  concept, and it's what makes "drowned post" a real, costed choice rather than free.

## 3. The gating — how the ladder unlocks

Two honest options; my recommendation is a hybrid:

- **(A) By the seam, not the age** (always available, self-gating by economics): every method is
  always offered; the readout prices it, and the geology decides which is worth it (a bell pit on
  a hill is silly when an adit is cheaper; a pump is dear but the only way to drowned post). This
  is the most "follow the science" — the land, not a tech tree, tells you the method. It needs no
  new progression system.
- **(B) By a technique / built structure** (a tech gate): the shaft-and-pump waits on a PUMPING
  ENGINE — a built thing (an engine house) or a smith's technique (SIM 27 already models a
  learned technique). This adds generational progression (the boss's cathedral heart) — you can't
  drown-mine until the settlement has learned to pump.

**Recommendation:** (A) for the bell pit — it needs no new tech, it's just a deeper dry cut, ship
it self-gated by economics. (B) for the shaft-and-pump — the pump SHOULD be an earned capability
(a built engine house or a technique), because "you can now beat the water table" is exactly the
kind of generational milestone the roadmap wants, and the ongoing pumping cost wants a source
(the engine) to hang on.

## 4. The smallest buildable next rung — THE BELL PIT

If you want to keep building rather than wait: the **bell pit** is the clean next course, and it
needs no new sim concept (no pump, no ongoing cost) — it's a deeper, narrower, dry cut on flat
ground. Scope:

- **A `plan_bell_pit` command** (or reuse `plan_cut` with a `method` field — TBD, your call):
  economics = `cutEconomics` at a deeper reach cap (`BELL_REACH`, say ~20 m) over a small
  footprint, STILL water-gated (`min(dryDepth, BELL_REACH)`), with a labour penalty for the
  wasted re-sinking (a lower yield-per-m³ than the open cut, honest to the pillars left).
- **A two-click-or-ring tool** (like the quarry) + a readout ("bell pit · N m³ post · M m deep ·
  dry ✓" / "drowned — wants a pumped shaft"), + a render (a small dark shaft-mouth + spoil ring,
  mirroring the adit's mouth). Render-only parts inert on canon; the command is the SIM bump →
  the two-commit dance (instrument-neutral first, then the attributable baseline move) + a
  red-specimen `bellpit.test.ts`.
- **Verification:** a bell pit wins post between the open-cut floor (12 m) and BELL_REACH on dry
  flat ground where the open cut's overburden cost was too high; it still floods/refuses when
  drowned (the pump's job). The `__cc` probe + a sim test, as ever.

The **shaft-and-pump** is the bigger, later course (it needs the ongoing-cost concept + the
gating structure) — the endgame rung, worth its own proposal once the bell pit lands and you've
steered the gating (A vs B).

## 5. Open questions for your steer

1. **Command shape:** one `plan_cut` with a `method: 'open'|'bell'|'shaft'` field, or separate
   `plan_bell_pit`/`plan_shaft` commands? (I lean separate — cleaner freezes, like `plan_adit`.)
2. **Gating:** confirm (A) economics-only for the bell pit, (B) an earned engine/technique for the
   pump? Or all-(A) "the land decides"?
3. **The pump's ongoing cost:** labour-per-tick off the idle pool, or a fuel draw off a built
   engine house (a new building)? This is the one new sim concept and wants your call + a sourced
   number before it ships.
4. **Scope now:** build the bell pit as the next course, or hold the whole ladder for a session
   you want to steer live?

---

*— scoped by the thirty-second hand, still looping, who found the next rung is a real design and
brought it to the boss's bench rather than guessing its shape. The engine is ready; the ladder
wants your eye.*
