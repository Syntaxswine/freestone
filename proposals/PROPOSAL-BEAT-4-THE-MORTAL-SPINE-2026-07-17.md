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

This generalizes the bond beyond the smith: **any master trade** (mason, and whichever others hold a
technique) participates in pass / migrate / lose / rediscover. The `specialist_arrived{origin}` event
gains a sibling — `technique_lost` / `technique_rediscovered` — for the record.

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

**Quality — a new output dimension (ruling 7).** Speed the bands already model (`jobMult`); QUALITY is
new. A master's work is *better*, and the natural home is the game's own finish axis — the **dress
level** (rubble → scappled → ashlar) and its mason's-mark/patina aesthetic: a master lays **finer
stone** (reaches ashlar where a novice manages scappled), and their courses read cleaner and weather
prouder (§5 Q1 — does quality live in the *dress reached*, a *per-stone quality attribute* that feeds
the patina/marks, or *durability*?). The roadmap's ~15–25% spread cap governs the speed multipliers;
quality is the master's *distinct* reward, not just more speed.

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

## 5. Open questions — narrowed to what's still genuinely open

*Decided (rulings 1–7): churchyard drawn like a farm · death costs a slab · marked in stone OR wood ·
unmarked = grief · technique lost-unless-taught, rediscovered from the tracing floor · green ~1yr /
journeyman ~4yr / master ~10yr / low hands still fine · mastery = faster + higher quality · masters
rare · causeway permanent-but-demolishable. These four remain:*

1. **Where does QUALITY live?** A master's work is *better* — but mechanically, does that mean the
   master **reaches a finer dress level** (lays ashlar where a novice manages scappled), a **per-stone
   quality attribute** that feeds the patina + mason's-mark aesthetic (the wall visibly finer), or
   **durability** (a master's work weathers slower / stands prouder)? *Recommendation: the dress-level
   reach — it reuses the finish axis you already have and makes a master's hand visible in the stone.*
2. **What makes a great master RARE?** Beyond the ~10 years: is it a **talent gate** (only a
   high-vigor hand can climb to master), a **lineage** (you can only become a master by being taught
   by one — so the first master is precious and mastery can go extinct), or a rare **emergence** (a
   small yearly chance a long-serving journeyman *becomes* a master)? *Recommendation: talent + tenure
   — a hand needs both the years AND the gift, so masters are born of time and luck, and losing one
   hurts.*
3. **The technique set + rediscovery.** Which capabilities are losable **techniques** — just the
   smith's forge-relief, or a set (the great wheel, fine ashlar, …)? And is rediscovery from the
   tracing floor **automatic** (slowly relearned) or a **deliberate act** (a hand assigned to *study*
   the floor)? *Recommendation: a small set + a study job — legible, and it gives the tracing floor a
   living purpose.*
4. **How hard does GRIEF bite, and does it fade?** The proposed home is a **retention/growth
   modifier** (a grieving village loses hands faster + grows slower until its dead are marked — the
   shape housing already uses). Does an unmarked grave's grief **persist until marked** (a standing
   debt), or **fade over time** (raw grief that dulls even unmarked)? And how heavy — a gentle nudge,
   or a real bite? *Recommendation: persists until marked, gentle per-grave but cumulative — so a
   neglected churchyard genuinely weighs, but one bad year won't spiral.*

*(Banked, not blocking: the chronicle — whether the inspectable cemetery is enough as the record of
the dead, or you also want a written Testament for the living knowledge. Deferred to build time.)*

## 6. What this does NOT do (scope guard)

No fail state (peaceful mode; the settlement never empties — SIM 20's floor holds). No plague/disaster
event tied to this beat (hazards are their own later work). No combat interaction. The causeway rider
(§3) is banked, not scheduled. Beats 5 (demand wave) and 6 (kiln + Keep) are untouched.
