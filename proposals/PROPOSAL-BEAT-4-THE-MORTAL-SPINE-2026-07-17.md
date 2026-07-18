# PROPOSAL — BEAT 4: THE MORTAL SPINE (scoping)

*The generational heart. The frame is complete — the economy runs, the castle rises — but nothing
yet makes it a story ACROSS TIME: people die without ceremony, trades never truly die with them, and
the settlement has no memory of its dead. This scopes the beat that gives the game its soul: death
that is mourned and costs stone, knowledge that is lost unless taught, and a churchyard that grows
one grave at a time. Scoping only — no code; the boss's four rulings are baked in, and the open
questions at the end are the decisions still needed before a build opens.*

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

**The chapel** anchors the churchyard: a new `BUILDING_KIND = 'chapel'` (the seventh), a small
building the player raises, around which the graves gather. *(Whether the chapel is REQUIRED before
burials, or the churchyard can grow on its own and the chapel merely blesses it — §5 Q1.)*

**When stone is short:** a death always happens; the grave should not. The honest options (§5 Q2): the
grave WAITS as a pending mound until a slab can be spared; or a temporary wooden marker stands until
stone comes; or the poorest dead simply get a mound and no stone. This wants your ruling — it decides
whether the cemetery is a *duty the living owe* (graves queue, pressuring the quarry) or a *grace they
afford* (only the honoured get stone).

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

This generalizes the bond beyond the smith: **any master trade** (mason, and whichever others hold a
technique) participates in pass / migrate / lose / rediscover. The `specialist_arrived{origin}` event
gains a sibling — `technique_lost` / `technique_rediscovered` — for the record.

### 2C. The skill ladder, one rung higher (green → journeyman → master)

`worked{}` gives GREEN at a year (SIM 36); Beat 4 was reserved the rest. The anti-XP law holds:
discrete bands off integer days worked, never a curve.

- **Green** (~1 year): today's bonus (×9/8) — competent.
- **Journeyman** (~N years): a further bonus, and the state a hand must reach to be a master's
  bonded **apprentice** (ready to inherit).
- **Master** (~M years): holds the trade's **technique** — the thing that lives or dies with them.

The roadmap's ~15–25% band-spread cap governs the multipliers so the ladder never runs away. *(The
exact years-to-journeyman and years-to-master, and the multipliers, are §5 Q4.)*

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

## 5. Open questions — the decisions still needed before a build opens

1. **The chapel & the churchyard.** Must the player build a **chapel** before the dead can be buried
   (graves wait for it), or does the churchyard grow on its own and the chapel is an optional blessing
   that gathers/adorns it? And does the player **draw the churchyard's ground** (like a farm), or does
   it emerge beside the chapel / the settlement centre?
2. **When stone is short.** A death with no slab to spare → the grave **waits** (a pending mound that
   pressures the quarry, a duty owed), a **wooden marker** until stone comes, or **no stone** for the
   poorest (only the honoured get a headstone)?
3. **What is a "technique," and how is it rediscovered?** Just the smith's relief, or a set (the great
   wheel, ashlar dressing, …)? And is rediscovery from the tracing floor **automatic** over time
   (knowledge slowly relearned) or a **deliberate act** (a hand assigned to *study* the floor)?
4. **The bands' pacing.** Roughly how many years to **journeyman**, and to **master**? And how big are
   their bonuses (within the ~15–25% spread cap)?
5. **The chronicle.** Is the **cemetery** (inspectable headstones) enough as the chronicle-of-the-dead,
   or do you also want a written **Annal/Testament** — the living knowledge recorded, not only the
   dead remembered?

## 6. What this does NOT do (scope guard)

No fail state (peaceful mode; the settlement never empties — SIM 20's floor holds). No plague/disaster
event tied to this beat (hazards are their own later work). No combat interaction. The causeway rider
(§3) is banked, not scheduled. Beats 5 (demand wave) and 6 (kiln + Keep) are untouched.
