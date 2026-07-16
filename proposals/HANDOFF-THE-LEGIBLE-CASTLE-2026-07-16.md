# HANDOFF — THE LEGIBLE CASTLE (2026-07-16)

*The session that taught the castle to be READ. On the sealed frame and the whole mining vision, this
arc made the settlement legible to its own steward: the wall now names the hands that laid it, dates
its work, signs itself in ashlar, weathers by age, remembers its founders, and shows the ghost of its
own drawing; and the crowd shows its years. Stone and folk, both readable at a glance. Everything the
sim had recorded since M1 and no one could see — finally spoken aloud. What is left unreadable is the
one thing that gives all this legibility its weight: death's meaning. That page is the boss's to write.*

> **Read the keystone first.** [HANDOFF-FOUNDATION-2026-07-09.md](HANDOFF-FOUNDATION-2026-07-09.md)
> holds the soul, the NINE LAWS, and now **THIRTY-NINE maker's marks + SIX ⛬ seals**. Add your mark
> BELOW the last, never above, never overwrite. This document is the newest course's laws + traps +
> where-to-start; the FOUNDATION is the ground it stands on.
>
> Predecessor: [HANDOFF-THE-BOOK-AND-THE-SCAR-2026-07-15.md](HANDOFF-THE-BOOK-AND-THE-SCAR-2026-07-15.md)
> — the AMBITION opener (the Lodge Book + the prospecting scar + the whole mining ladder, sealed 5th ⛬).

---

## The state, in numbers

- **SIM_VERSION 34, unchanged this session.** Every course here was RENDER-ONLY — not one touched the
  sim core, not one moved the determinism baseline. The whole arc is `hashState`-neutral by construction.
- **196 tests green / 33 files.** No new tests were owed: render-only readers are proven by probe + eye,
  not unit assertions (the house pattern for this tranche).
- **39 maker's marks, 6 ⛬ seals. HEAD `84d7294`. LIVE at syntaxswine.github.io/freestone** (deploy
  confirmed by the served bundle hash, not a poller).

## What this session built — the arc of legibility

Everything here rode ONE method, paid over and over: **grep the tree before you build.** The data was
always there — recorded since M1, write-only and unread. Each course was a READER, not a new engine.

### 1. ⛏ THE MEMORY SUITE — roadmap Beat 2, COMPLETE, sealed by the 6th ⛬ (the castle remembers)

Six render-only readers, each hanging off the last, all ZERO baseline:

- **🪨 Campaign patina** (`1fadac4`, 35th) — every stone weathers by `tick − tickLaid`, so a construction
  campaign reads as banded lifts. The weathering the roadmap slotted for M7, delivered as its first rung.
- **📜 The inspection card** (`7404162`, 36th — the HEART + SPINE) — click a laid stone with no tool out
  and the record speaks: *"laid by Edith the mason · Year 1."* A `pointerup` raycasts the stone
  InstancedMesh (whose `instanceId` IS the `world.stones` index), reading straight through to mason,
  year, dress. Every later reader hangs off this raycast.
- **⛭ The founder's stone** (`80c8b96`, rider) — `world.stones[0]` sits slightly proud and names the
  founding party (the four born before day one, `bornTick < 0`).
- **▦ The structure biography** (`385c6f8`, rider) — the card widens stone→wall: *"in a work of 747
  stones, begun Year 1,"* aggregating `world.stones` by `wallId`.
- **✍ Mason's marks** (`d2609f2`, 37th — the one with real new work) — a deterministic procedural glyph
  keyed on the mason's id (`masonMark(id)`: a stave + id-bit-selected strokes), drawn on the card for
  **ashlar** only. Historically right, and it retroactively deepens the DRESS dial — paying for ashlar
  now buys a named glyph in the wall. A generator, not another printed field.
- **📐 The tracing floor** (`368557e`, 38th — the one needing no click) — every `plan_wall` / `plan_fill`
  footprint scored faintly into the turf from the COMMAND LOG, a pale chalk line draping the hill: the
  palimpsest of every setting-out the castle was raised from, under the standing stone. Exactly the
  roadmap's ask — *"plans permanent since SIM 12, the player can't see it."*

With the tracing floor the suite was WHOLE, and the **6th ⛬ seal — THE CASTLE REMEMBERS** — punctuated it.

### 2. ⏳ THE VILLAGE CLOCK — the render-only slice of Beat 4 (39th mark)

`e4a5ca7`. The suite made the STONE legible; this reached past the seal to the FOLK. SIM 20 gave every
soul a `bornTick` no one could see — now each sprite fades toward a warm grey by its years, a young hand
vivid and an elder muted, so the whole village shows its generations at a glance. The stone-patina trick,
stolen for people. It is Beat 4's clerk-trick, built AHEAD of the boss-locked spine because it preempts
none of his §6 taste calls and it *hands him the gut-gauge* §6 Q2 (generation length) asks him to judge.
Verified probe (age→colour monotonic) AND eye (vivid children, muted adults, a weathered-tan elder).

### 3. The two sibling bugs the readers surfaced (Law 6, both directions)

The render layers update in TWO places — the live `frame()` and the dev stepper `__cc.step`. Wiring the
tracing floor caught that **`shafts.update()` was in the stepper but not the live frame** (a shaft placed
in play never rendered — its build had been eye-checked *through* the stepper, which masked it). Verifying
the village clock caught the MIRROR: **`people.update()` was in the live frame but not the stepper** (probe
renders showed the crowd stale). Both fixed. The lesson became **Law 6**: a new layer wires into BOTH
sites, and never eye-verify a new render solely through one path — the player's path is the live frame.

### 4. The demographic readout — arming the boss's decision without designing it

A grep-the-tree census of Beat 4 found the SPINE mostly built already: the demographic engine is live
(SIM 20 — born / arrive / **die** / leave, a Malthusian equilibrium), the century-sweep instrument
exists, and sprite-to-person binding already holds. So rather than build the boss's reserved emotional
core, I RAN the instrument and captured
[DEMOGRAPHIC-SWEEP-READOUT-2026-07-16.md](DEMOGRAPHIC-SWEEP-READOUT-2026-07-16.md): the settlement
equilibrates near food capacity; death is ALREADY the balance (so the spine adds ceremony, not danger —
de-risking §6 Q1); a named arc runs ~40–55 years (calibrating §6 Q2). DATA, not a design.

---

## Laws & patterns this session proved (carry them)

1. **Grep the tree before you build — the data is already there.** Six readers, a whole clock, and a
   demographic report, all from state recorded since M1 (`tickLaid`, `masonId`, `commandLog`, `bornTick`)
   or systems already shipped (SIM 20, the century-sweep). The census also found the title screen, the
   adit sim, and most of Beat 4 already built. *Census first; you will usually find the feature, not a gap.*
2. **A render-only reader reads recorded data and moves nothing.** If the only writes are to a
   `material.color` or a new `THREE` object added to the scene, the baseline cannot move — no two-commit
   dance, no regen. Confirm the write surface before reaching for the instruments.
3. **Law 6 — a new render layer wires into BOTH update sites, and a new render is eye-checked on the
   PLAYER's path.** The stepper and the live frame drifted apart twice; a verification path that exercises
   code the player's path doesn't will hide a live gap.
4. **Probe proves structure; only an eye proves it READS.** Every reader was probed (instanceId maps,
   monotonic tints, scribe vertex counts) AND shot with the receiver trick. The probe caught the logic;
   the eye caught the subtlety (the tracing floor's tone, the clock's readable strength).
5. **Arm the decision; don't design the boss's core.** When the remaining work is the emotional heart he
   reserved, the honest autonomous act is to hand him data (the sweep) and the render-only groundwork (the
   clock), not to author the funeral. Build up to the threshold; let him place the stone.

## Traps hit this session (so you don't)

- **The dev stepper (`__cc.step`) does NOT run the live `frame()`** — it syncs layers by hand, so it
  drifts from the live frame (Law 6). Probe-render staleness is a stepper bug, not a physics one.
- **A malformed probe world crashes real update code.** Injecting a fake farm with empty `points` to force
  births threw in `fieldRow`. Age the crowd on a CLEAN world (mortality + the founders' spread suffice);
  don't hand-inject sim state to hurry a demographic.
- **The age-tint is a `color`-MULTIPLY** — it can only darken/mute toward the tint, never brighten. "Old =
  paler" isn't reachable this way; "old = warm-muted" is. Strength + tone are labelled one-line tunables.
- (Carried, still true: `import.meta.env.BASE_URL` for `/freestone/` fetches; `COURSE_HEIGHT` 0.25 m;
  `main.ts` card-lists hardcoded; the vitest `while(built)` hang; the receiver trick needs `setSize(w,h)`
  to beat the 0×0 hidden-tab canvas.)

---

## Where I'd start (the forward map)

**The render-only well is dry — stone and folk are both legible. Every autonomous-buildable item is
shipped.** What remains is the boss's to open, and it should NOT be built blind:

1. **THE SPINE (Beat 4) — one batched SIM bump, the boss's design call.** Most of it is already built (the
   demographic engine, the century-sweep, sprite-binding). What's left is the EMOTIONAL layer: the
   named-death ceremony, the funeral protocol (the site rests a day, the chronicle writes), succession-as-
   masonry (the dual-id stone — the master's last beside the apprentice's first), the Testament, the "true
   ashlar hand" first-technique-that-dies-untaught, `name_apprentice`. The roadmap calls this *"the moment
   the game becomes itself"* and reserves it. **Take him the four §6 questions and the demographic readout;
   build on his answers.** *(Note: the 400-tick canon spans no old-age death, so the spine is likely
   inert-on-canon — one commit + a serialization-only baseline regen for the new fields, like the bell pit.)*
2. **Beat 5 — the demand wave** (the Wall Ladder + SPOIL + Lots), **Beat 6 — the kiln + the Keep**, and the
   **shaft's GATE** (a 1-line progression toggle). SIM arcs with real design forks; the boss's steer first.

The §6 questions, verbatim, waiting on him:
1. **Sequencing** — people dying this early (the data says it's ceremony over an existing curve, not new danger)?
2. **Generation length** — ~20 min against a ~40–55-year named arc?
3. **The over-cut scar** — bare + dated ledger + slow reseed, recoverable never punitive?
4. **Save-compat** — promise forward-compat from the Lodge Book now, or reserve a flag day?

---

**⛏ The maker's mark of the legible-castle hand, 2026-07-16.** I found a castle that had kept a perfect
record of itself since its first stone and could not read a word of it. I taught it to read aloud: the
wall to name its makers and date its work and sign itself and weather with its years and remember its
founders and show the ghost of its own drawing; the crowd to wear its age. Six readers and a clock, every
one of them a thing the castle already knew and had never said — grep the tree, the data is always there.
I sealed the memory whole (the sixth ⛬) and set the village ticking, and where the design work began — the
death that gives all this remembering its weight — I put down the render pencil, ran the instrument, handed
the steward the numbers, and stopped at the threshold rather than write his page for him. I did not ship a
stone unseen that a probe or an eye could see. The frame remembers; the land warns and yields and floods
and tunnels; the book keeps the castle; and now the castle can be READ. *The next stone is the boss's to
place — the one that makes a death mean something. Build on.*

*— the legible-castle hand (the thirty-fifth-through-thirty-ninth marks), who taught the castle to read
itself aloud and stopped where its heart begins.*
