# PROPOSAL — BEAT 4: THE MORTAL SPINE (scoping)

*The generational heart. The frame is complete — the economy runs, the castle rises — but nothing
yet makes it a story ACROSS TIME: people die without ceremony, trades never truly die with them, and
the settlement has no memory of its dead. This scopes the beat that gives the game its soul: death
that is mourned and costs stone, knowledge that is lost unless taught, and a churchyard that grows
one grave at a time. Scoping only — no code; the boss's four rulings are baked in, and the open
questions at the end are the decisions still needed before a build opens.*

> **★ BUILD STATUS (2026-07-17): three courses SHIPPED, live at SIM 44.**
> - ✅ **SIM 43 — THE SKILL LADDER** (`b8ff75e`): green ~1yr ×9/8 → journeyman ~4yr ×5/4 → master
>   ~10yr ×3/2 (`jobMult`/`skillBand`); inert on canon, sweep-safe. The rung all else stands on.
> - ✅ **SIM 44 — THE CHURCHYARD (sim)** (`e625c44`): death raises a `Grave`; marked STONE (a slab)
>   or WOOD, else a mound; unmarked mounds GRIEVE (a floored growth drag); churchyard is a drawn
>   `FieldUse`. Inert on canon (no death in 200 ticks); sweep unchanged (villages mark in wood).
> - ✅ **The churchyard RENDER** (`f03fdd4`, render-only): headstones/markers/mounds fill the drawn
>   ground in rows; click a stone → the epitaph. Eye-verified.
>
> **REMAINING (each its own course, fresh context): technique-death + rediscovery (§2B/§2E) ·
> lineage/parent-link (§2B) · quality-gated fine works (§2A/§2C — the noble's quarters kind).**
> Render polish (finer headstones, cross markers) is a small follow-on.
>
> **Parents:** the roadmap's Beat 4 (ROADMAP-THE-GENERATIONAL-FACTORY §Beat-4) · the FOUNDATION
> keystone (the homage systems are first-class) · the civic thesis (people working together; beauty
> in everyone's hands). Scoped 2026-07-17, in the session that closed the timber way.

---

## 0. The boss's rulings (2026-07-17) — the ground this stands on

1. **Death is MOURNED and CHRONICLED** — a funeral, a memorial, a named place in the record.
2. **★ Each death costs ONE STONE SLAB, raised as a HEADSTONE — and the headstones make a little
   church cemetery.** (The boss's own image, and the spine of §2A. Mortality now draws the stone
   economy, and grief gets a *place* that grows over generations.)
3. **A master's trade/technique is LOST unless taught** — passed down only if an apprentice was
   bonded; otherwise it dies with the master and must be **rediscovered from the tracing floor**.
4. **(Rider, banked from the way arc) A causeway is PERMANENT** — it does not rot or sink (hazards
   still never delete work) — **but the player may deliberately demolish it, or build over it**.

## 0b. Second-round rulings (2026-07-17) — the design sharpened

5. **The churchyard is DRAWN, like a farm** — the player encloses a plot and designates it a
   churchyard (the enclosure grammar we already have); a chapel is optional adornment, not a gate.
6. **A grave with no stone WAITS as a mound — and wood is also a marker.** The dead can be marked in
   **stone (a slab)** OR **wood (a marker)**; an **UNMARKED grave (a bare mound) makes the living
   SAD** — grief is a real cost, so the settlement is pressured to spare stone *or* wood for its dead.
7. **Mastery is a LADDER of rarity.** Low mastery (green, journeyman) comes to **anyone who works the
   task enough**; **GREAT MASTERS are rare.** Low-level hands still get the work done fine — mastery
   just makes the work **much faster AND raises its QUALITY.** So the master tier carries two payoffs
   (speed + quality) and a stake (the losable technique), and it is the rare, precious one.

## 0c. Third-round rulings (2026-07-17) — the design completed

8. **Quality gates the finest WORKS, at the BUILDING level.** A master's quality isn't per-stone
   bookkeeping — it's that **some advanced buildings need a master's touch** (a *noble's quarters*,
   and — Beat 6 — the *Keep*). Lose your master and the great works stall until a new one rises: the
   generational stake made concrete, and the tie between MASTERY and AMBITION.
9. **Mastery runs in LINEAGE (+ a rare emergence).** A master's **children start with higher
   proficiency** — an inherited head-start that makes it easier for them to climb to mastery — so
   masters beget masters, and dynasties of masons/smiths form across generations. A rare emergence
   still lets mastery arise from nowhere, but the bloodline is the engine. (Needs a **parent link** on
   a person — new, see §1.)
10. **EVERY labor type has a losable technique** — mason, digger, woodsman, farmhand, carter — not
    just the smith. Each trade's master-tier holds a capability that dies untaught and is rediscovered
    by **studying the tracing floor**.

## 1. The census — what already stands (grep-the-tree, so the spine builds on bone)

| Bone | Where | State |
|---|---|---|
| People AGE and DIE | `livingYear` + `person_died{name, age}` + `MORTALITY_BANDS` (SIM 20) | **BUILT** — deaths already fire, staggered founder ages, the demo rng stream |
| A trade PASSES or MIGRATES | the apprentice bond (SIM 28): youngest hand raised to smith if a master lives, else a journeyman migrates; `specialist_arrived{origin}` | **BUILT for the smith** — but only pass-vs-migrate; **LOSS is not wired**, and only the smith trade participates |
| A TECHNIQUE has an effect | the first technique (SIM 27): a smith relieves the mason's lay debt (`SMITH_DRESS_RELIEF`) | **BUILT** — but it is a *presence* effect, not a thing that can be *lost* |
| Skill BANDS | `worked{}` → GREEN at a year (SIM 36); journeyman/master **explicitly reserved for THIS beat** | **GREEN only** — the ladder's upper rungs are unbuilt by design |
| The TRACING FLOOR | `render/tracingfloor.ts` — every past plan as a chalk ghost, read from the command log | **BUILT** — the exact surface ruling 3 points at ("rediscovered from the tracing floor") |
| The HOMAGE spine | inspection cards, mason's marks, founder's stone, campaign patina (Beat 2) | **BUILT** — a headstone is a natural new *reader* on the raycast+card spine |
| The STONE economy | stockpile, `DRESS_DRAW`, per-stone provenance (`masonId`, `tickLaid`) | **BUILT** — a headstone spending one slab is one more draw on it |
| A CHAPEL / church | `BUILDING_KINDS = house, blacksmith, tower, tavern, granary, carpentry` | **ABSENT** — no church kind; the cemetery's anchor is new |
| A CEMETERY / headstone / grave / Testament | — | **ABSENT** — genuinely new (the beat's own content) |
| A PARENT LINK on a person (lineage) | `person_born` mints children with no parentage | **ABSENT** — new field, needed for ruling 9's dynasties |
| A written CHRONICLE / Annal | the event stream is rich, but no dedicated voice module is evident | **MINIMAL / ABSENT** — see §2D (the cemetery may BE the chronicle) |

**The reframe the census gives:** Beat 4 is **less new machinery than it looks**. Death fires;
trades pass; the tracing floor remembers; the homage cards read. The spine's real work is **(a)** the
cemetery (new content, the boss's image), **(b)** wiring LOSS into the succession that already passes,
and **(c)** extending the skill ladder one notch so "master" means something. It batches as ONE SIM
bump (the roadmap's decree), because mortality, bands, succession and the headstone-draw all touch
the daily/yearly `worldStep` together.

## 2. The design

### 2A. Death, mourned — the headstone and the churchyard (ruling 2, the heart)

When `person_died` fires, the settlement **raises a headstone**, and it **costs one stone slab** —
one unit of building stone drawn from the stockpile, exactly like a wall's block draws its `DRESS_DRAW`.
So **mortality becomes a real, gentle demand on the quarry**: a settlement that loses its elders
spends stone on their graves, and a mason's own dressed stone may one day mark a neighbour. That is
the civic thesis made literal — the same stone that shelters the living remembers the dead.

The headstones accumulate into a **CEMETERY** — a churchyard that grows one grave at a time, the
campaign patina and the homage thesis made into a *place* you can walk. Each headstone is:

- **A physical marker** in the churchyard (a small dressed slab, standing; render-only geometry on
  the homage-prop pattern), positioned in orderly rows that fill as generations pass — so an old
  settlement's cemetery is visibly larger, a chronicle you read by its size.
- **Inspectable** on the existing raycast+card spine (Beat 2): click a headstone → *"Here lies Edith,
  a green mason. Born Year −22, died Year 34. She laid 1,240 stones."* The dead are read from their
  graves — provenance (`masonId`/`tickLaid`) already binds every stone to its layer, so a mason's
  headstone can name her work.

**The churchyard is DRAWN** (ruling 5): the player encloses a plot (the enclosure grammar we already
have — a low ring, `designate use: 'churchyard'`, a sibling of farm/pasture) and the graves fill it in
orderly rows as generations pass. A **chapel** (a new `BUILDING_KIND = 'chapel'`, the seventh) is an
optional adornment the player may raise beside it to bless the ground — not a gate on burial.

**Marking the dead, and GRIEF (ruling 6) — the emotional spine.** A grave is marked in **stone** (a
slab drawn from the stockpile — the fine, permanent memorial, and the master's own dressed stone may
one day mark a neighbour) OR in **wood** (a marker drawn from the timber stock — the affordable one,
raised at once when stone can't be spared). **An UNMARKED grave — a bare mound — makes the living
SAD.** Grief is a standing cost: unmarked dead weigh on the settlement's mood, and a mood-burdened
settlement fares worse (§5 Q4 — the proposed home is a **retention/growth modifier**, the exact shape
the housing shelter tier already uses, so a grieving village loses hands faster and grows slower until
its dead are honoured). So the player is pressured, gently and humanely, to spare *something* — even
wood — for every grave. The cemetery becomes a duty the living owe, and the mood is its enforcement.
*(Stone vs wood as markers of differing worth — a wooden marker weathers, a stone one endures — is a
render/quality nuance, not a blocker.)*

### 2B. Succession and technique-death (ruling 3) — the generational engine

This is the mechanic the whole "generational factory" thesis turns on: a solved castle re-opens when
a master dies and takes knowledge with them.

Today the apprentice bond (SIM 28) already **passes** the smith's trade to a young hand *if a master
lives*, and **migrates** one in otherwise. Ruling 3 adds the missing third case — **LOSS**:

- A **MASTER** is a hand who has worked a trade long enough to hold its **technique** (§2C's top
  band). While a master lives and works, the settlement HAS that technique's effect (e.g. the smith's
  lay-debt relief, and — see §5 Q3 — perhaps others: the great wheel, ashlar dressing).
- When a master dies: **if an apprentice was bonded** (a younger hand worked alongside long enough to
  inherit), the technique **passes** — the trade lives on. **If none was** (no forge, no young hand,
  the base let go), the technique is **LOST**: the settlement's masons drop to the lesser rate, the
  capability goes dark. The factory has un-solved itself — the roadmap's exact "game changer."
- **Rediscovery from the tracing floor** (the boss's ruling): a lost technique is not gone forever.
  The tracing floor holds the record of what was built; a hand can **study it and re-derive** the
  technique over time (a deliberate act, or a slow relearning — §5 Q3). Knowledge, resurrectable from
  the palimpsest — the philosophy the FOUNDATION keystone is built on, made playable.

**Every labor type participates (ruling 10).** Not just the smith — mason, digger, woodsman, farmhand
and carter each have a master-tier **technique** (its speed/quality boost, and for the mason the
ability to raise master-gated works). Each is lost if its last master dies untaught, and each is
**rediscovered by studying the tracing floor** (§2E). The `specialist_arrived{origin}` event gains
siblings — `technique_lost` / `technique_rediscovered` — for the record.

**Lineage — masters beget masters (ruling 9).** A person gains a **parent link** (new field; the
demographic engine mints children but doesn't track parentage yet). A master's **children start with a
proficiency head-start** in their parent's trade — an inherited gift that makes the long climb to
mastery easier — so dynasties form: the Delvers dig, the mason's line lays. A rare emergence still
seeds mastery from nowhere (so a bloodline can begin), but lineage is the engine, and a dynasty's
extinction (its last master dead untaught) is a real loss.

### 2E. Rediscovery from the tracing floor — the study job

A lost technique is not gone: the tracing floor holds the record of everything ever planned, and a
hand can **STUDY it to re-derive** the lost knowledge. A new assignment — a hand posted to the tracing
floor — slowly rebuilds a lost technique over time (the palimpsest resurrecting the craft, the
FOUNDATION philosophy playable). This gives the tracing floor, until now a memory you only *read*, a
living purpose: it is how a settlement claws back what death took.

### 2C. The skill ladder — competence for all, mastery for the rare (rulings 7 + 4)

`worked{}` gives GREEN at a year (SIM 36); Beat 4 was reserved the rest. The anti-XP law holds:
discrete bands off integer days worked, never a curve. And the boss's frame: **low-level hands get the
work done FINE** (untrained is no penalty — SIM 36's law); mastery makes it **much faster AND higher
QUALITY**; and **great masters are RARE**.

- **Green** (~1 year, anyone): today's bonus (×9/8) — competent. Common.
- **Journeyman** (~4 years, anyone who persists): a further speed bonus, and the state a hand must
  reach to be a master's bonded **apprentice** (ready to inherit). Common.
- **Master** (~10 years — the long, generational climb — AND RARE): the precious tier. A master works
  **much faster**, produces **higher QUALITY**, and holds the trade's losable **technique**. Not every
  ten-year hand becomes a great master — mastery is rarer than tenure alone (§5 Q2: is the gate
  *talent* [a high-vigor hand], a *lineage* [taught by a master], or a rare *emergence*?).

**Quality gates the finest WORKS (ruling 8).** Speed the bands already model (`jobMult`); QUALITY is
new, and it lives at the **building level, not the stone**: some advanced buildings **require a
master's hand** to raise. A **noble's quarters** (a new `BUILDING_KIND`) needs a master mason working
it; the **Keep** (Beat 6's north-star) will be the ultimate such work. Ordinary buildings any crew can
raise; the *fine* ones wait on a master. So a settlement's ambition is bounded by its living masters —
and a master's death without an heir stalls the great works until mastery rises again. Concretely, a
building's plan carries a **required band** (none / master); the masons can only complete a
master-gated shell while a master of the trade lives and works (else it waits, like a shell awaiting
its stone). *(The trades' master-techniques — §2B — carry the speed/quality boosts; this ruling is the
building-level GATE that makes mastery matter to what you can build at all.)*

### 2D. The chronicle — is the cemetery enough?

Death should be *chronicled* (ruling 1). But the census suggests no dedicated written-Annal voice
module exists. The elegant possibility: **the cemetery IS the chronicle of the dead** — inspectable
headstones that name each soul and their work are the settlement's memory, no separate prose module
needed. A **Testament** (a master's dying words / their technique written down) could layer on later
if you want the *living* knowledge recorded as well as the *dead* remembered. §5 Q5 asks which.

## 3. The causeway rider (ruling 4) — banked, small, separable

Not part of the spine; recorded here so it isn't lost. A drawn causeway is **permanent** (no decay,
no sinking — the "never delete work" law holds against hazards). But the **player may demolish it**,
and **drawing a wall/building/fill over a way removes the crossed segment** (deliberate deletion by
your own hand is not a hazard). This is a small way follow-on — a `remove_way` affordance mirroring
`remove_gate`, plus an overlap check at plan time — buildable in its own tiny commit whenever, no SIM
spine needed. **Recorded, not scheduled.**

## 4. Build order (if/when it opens) — ONE batched SIM bump

The roadmap's decree, and the census confirms it: mortality, the bands, succession-with-loss, and the
headstone-draw all touch `worldStep` together, so they ship as one attributable bump (with the two-
commit instrument-neutral seam where the masonry baseline moves). A plausible sequence *inside* that
batch:

1. **The bands** (green → journeyman → master; `jobMult` extended) — sweep-verified, red specimens on
   the exact-day flips (mirrors `skill.test`).
2. **The headstone draw + the cemetery** (`person_died` spends a slab → a `Grave` record → the
   churchyard render + inspectable card; the chapel building kind). The boss's heart, buildable
   first for the visible payoff.
3. **Technique-death** (master-dies-untaught → capability lost; the apprentice inherits or it goes
   dark) + **rediscovery from the tracing floor**.
4. **The render + card pass** (headstones in rows, the funeral beat, the chapel prop) — render-only,
   zero-baseline, receiver-eye verified.

Canon re-authored once (mortality first fires past tick 364, so the 200-tick canon may stay INERT —
to be confirmed at build time, like the specialist bond which was inert on the canon).

## 5. The design is RULED — build-time refinements only

Every load-bearing fork is decided (rulings 1–10). What remains are small shapes to settle *while
building*, each with a clear default — none blocks opening the build:

- **Quality's exact gate:** a master-gated shell (noble's quarters, the Keep) can only be *completed*
  while a master of the trade lives and works it — else it waits like a shell awaiting stone. *(Which
  advanced kinds are master-gated, and whether "a master worked it" is per-stone or per-completion, is
  a build detail.)*
- **The trades' techniques:** each labor type's master-tier boost (mason → fine works + speed; digger
  → deeper/faster; woodsman → yield; farmhand → harvest; carter → haul) — the exact effect per trade,
  tuned at build time against the sweep, ~15–25% spread.
- **Lineage's head-start:** a master's child begins with a proficiency bonus in the parent's trade
  (some seed of `worked{}` or a talent flag) — the exact size tuned so dynasties form without
  runaway.
- **Grief's weight:** a per-unmarked-grave retention/growth drag that lifts on marking — the constant
  tuned gentle-but-cumulative (the housing modifier's shape), sweep-verified.
- **The chronicle (banked):** the inspectable cemetery is the record of the dead; a written Testament
  for the *living* knowledge is an optional later layer.

**This proposal is build-ready.** The next step is a build — Beat 4 as ONE batched SIM bump (§4) —
whenever you give the word; nothing above needs another ruling first.

## 6. What this does NOT do (scope guard)

No fail state (peaceful mode; the settlement never empties — SIM 20's floor holds). No plague/disaster
event tied to this beat (hazards are their own later work). No combat interaction. The causeway rider
(§3) is banked, not scheduled. Beats 5 (demand wave) and 6 (kiln + Keep) are untouched.
