# PROPOSAL — THE VISIBLE WORK (2026-07-16, v3 — answers folded in, critique-hardened)

*v1 scoped the boss's quality-of-life list and measured "time isn't advancing" to its true cause.
The boss answered all five questions; v2 folded them in on a four-agent census (skill priors, trade
blast radius, designation flow, test/canon surface). v3 is v2 run through a four-lens adversarial
critique (determinism · boss-intent · canon-consistency · research grounding, ~30 findings) — the
assignment pass is pinned against a proven oscillation, the skill step flips from penalty to bonus,
the roller road takes its honest medieval shape, and the save-compat consequence is surfaced instead
of buried. §1's diagnosis and measurements stand unchanged from v1.*

## 0. Dispositions (boss, 2026-07-16 — the answers)

Boss verbatim, message 1: **"the town should start off with 13 people"** (the count's provenance —
SCOPE §7's ~15 is superseded). Message 2 answers, by v1's question numbers:

| v1 §6 question | Boss's answer | Consequence |
|---|---|---|
| Q1 founders' trades | **"3 farmers and the rest unskilled. after a year of doing a job they gain a basic level of skill in it."** | Not a trade split — a SKILL SYSTEM. §3B′; the arc's biggest sim course |
| Q2 bubble policy | **yes** (always-on while incomplete) | D ships as recommended |
| Q3 buildings | **"roof should be selected at the time of building, as should the building type, with none being an option… if you select none it should be able to be selected later"** | SIM-12's "drawings before the build" blocker retires; at-plot pickers + the game's first re-designation surface. §3F′ |
| Q4 conveyor | **"it should replace it"** | The 🛷 toggle + `rollers` flag retire in the road's own bump (Course 4) — the toggle visibly persists until then **by design, not omission**. The FICTION keeps the sledge: research shows the honest medieval shape is a laid timber way the sledge RIDES (§3H) |
| Q5 timber | **"definitely incremental felling. wood should just drop where its felled."** | Incremental credit covers timber; logs visibly scatter AT the fell positions, and carriers fetch from there |

## 0b. Second dispositions (boss, 2026-07-16 — the §6 answers; the build is GO)

| §6 question | Boss's answer | Consequence |
|---|---|---|
| §6.4 saves | **"this game is so far in alpha no one is going to expect the saves to work for the next version"** | FLAG DAYS. Bump 35 unblocked; the guard's message is the whole contract. (A snapshot-fallback loader stays a later course if ever wanted) |
| §6.1 lived-in | **"occupants should just be data in the details of the building when you select it"** | No occupancy course — occupants ride the E card as data (deterministic render-side listing). Floors not asked for; irregular-ring roofs stay the Course-3 default |
| §6.2 symmetry | **"Extend to fields + spans now"** | F′ grows: ONE designation grammar — fields and roof-spans get at-plot answers + 'none' + choose-later alongside buildings |
| §6.3 the way | **"if the workers are moving faster the bricks reach their destination quicker… a more complicated ask because the workers would have to have a more complicated pathing"** | The re-freeze fork DISSOLVES: the way is a WORKER-SPEED model — haul becomes labor (people carrying along paths, faster on the way), which needs pathing. Course 4 is redesigned around that (proposal §H note) and sized accordingly |

**The enclosure reframe (boss, same message):** *"any enclosed space is a building. this would
include farms and quarries. the types of enclosures can determine what kinds of buildings that
enclosure can be."* — The designation grammar's mental model: ONE enclosure entity; its geometry
class (low ring / tall shell / span / working) determines its legal words. F′ + E implement this
for drawn enclosures + spans now; folding the QUARRY tools into the same grammar is recorded as
the stated direction for a later course (the cut/adit/pit tools already take rings/points — the
unification is UI grammar, not new sim).

**New item (boss, same message): THE CHEAT MENU** — *"something that lets you spawn physical
materials, objects, or people, at a point in space"* for testing. Built as **commands**
(`cheat_*` in the log) so replay-equals-live holds even for cheats; gated behind a Settings
toggle. Slotted after B′ (spawning people needs the new Person model). Slot: Course 1.5.

## 1. The diagnosis, measured (v1, unchanged — why building "feels slow")

The clock is healthy. Verified live (`__cc` probes on a fresh world at `97882da`):

- A 395-post wood palisade rose in **7 game-days**, 57 posts on day one. Ticks build.
- The speed transport (`acc += dt × speed`, ×1/×4/×16) and Sit-the-Season both pump `worldStep`
  correctly — the wiring was read end-to-end and is clean. No clock fix is needed or proposed.

What is not healthy is the shape of the stone economy at founding scale:

- A modest **8×8 m open cut** froze at **890 person-days** (12 m dry reach, 843 m³ yield); the
  founding party has **2 adult laborers** → ~445 game-days of digging.
- Stone credits **all-or-nothing at completion** — measured: the wall planned beside that quarry laid
  its **first stone 351 days later**, then finished all 395 stones in ~8 days.
- Nothing on screen shows the digging (no theater at the pit, no piles, no per-structure number).

A sat season advances the pit 20% with zero visible change anywhere. "Time is not advancing" is the
correct read of a world whose smallest quantum of visible progress is an entire quarry. The cure is
making the work **flow** and making the flow **visible** — every item below lands on one of the two.

## 2. The census (what the tree holds — v1 §2 + the v2 fleet, v3-corrected)

v1's table stands (the labor-ladder/theater mismatch, dead `floorAtShow`, the virtual carry anchor,
one-shot credit, per-structure progress recorded-but-unread, orchard trees already shipped, pasture
animals absent, rollers invisible). The binding priors:

- **Skill bands are canon** (roadmap Beat 4): *green / journeyman / master*, total production spread
  capped **~15–25%**, smooth XP explicitly ruled out ("a shadow tech tree") — the year rule must be
  a discrete threshold. **Practice-gains-skill is canon** (Living Settlement §3: "a bound apprentice
  on the same work gains skill faster") — the boss's decree names the unbonded baseline rate.
- **Techniques are a separate layer** (SCOPE §7, boss-ACCEPTED-CORE): named tokens, bond-transmitted,
  dying untaught. A year of doing a job never grants a technique. Apprentice-raising of a specialist
  is double-gated (living master AND base); **arrival is base-gated** — a trade dead with its last
  master returns by migration on the base alone.
- **Favor, not puppet** (SCOPE §3): no job-assignment UI, ever. People assign themselves.
- **`pace` is a trade-relative unit** (mason 24–36 stones **laid**/day ≈ 0.81–1.22 m³/day at
  STONE_VOLUME — checks out against rubble-walling labor constants; laborer 3–5 m³/day loose earth) —
  a generalist model needs per-JOB base rates, not the shared scalar.
- **createWorld draws 2 rng values per founder** — founder count/trades move the tick-0 cursor and
  every stone's jitter; no inert seam exists. `FOUNDER_NAMES` holds 8 (13 would mint NaN-indexed
  'Unnamed'); the `i×3` stagger puts founder 13 at 58, inside the death curve.
- **Founding constants are tuned to 4 souls** (`FOUNDING_CAPACITY=4`, `FOUNDING_SHELTER=4`,
  `SMITH_MIN_POP=6`, seed grain) — 13 mouths unretuned is a year-one famine by arithmetic.
- **The designation flow** (SIM 12): plot → classify → `plans={roof:null,kind:null}` → `pending` →
  the ask-queue card → `choose_roof` then `designate` → completion mints the Building.
  `awaitsDrawings` holds carts, masons, and theater off the wall meanwhile. Fields share the
  machinery but pend at completion. **No re-designation surface exists** (all words one-shot;
  BACKLOG reserves rotation); no click-select beyond the memory suite.
- **Replay law**: at-plot answers ride `plan_wall` as validated fields or replay forks from live.
- **The re-author surface batches**: incremental credit's ~8 files sit inside founders/skills'
  ~21-file surface; at-plot designation is mostly disjoint but shares the canon baseline (whose
  `choose_roof` t20 / `designate` t25, waiting-shell milestone, and hardcoded ids 334/225/2531
  retire or shift). Founder count shifts **every minted id**.
- **Incremental credit deletes the WIN stall as a phenomenon** — the canon's three-stall story must
  be re-DESIGNED (the trickle story), not just regenerated. HAUL and PILE stalls survive.
- **Save-compat (boss-visible):** this arc **invalidates existing Lodge Book saves** — the guard
  refuses them with a message, not a crash, but the boss is saving games TODAY. The save-forward
  promise (ROADMAP §6 Q4) remains his open call — surfaced in §6.4, not buried.

## 3. The spec

### A. Incremental credit — stone AND timber (SIM)

Stone flows as the work is done, in the **stateless checkpoint form** derived from the existing
integer `workDone` (no new hashed field):

```
day-k credit = stoneTotal·min(1, k/workTotal) − stoneTotal·min(1, (k−1)/workTotal)
```

Monotone and never-exceeds by construction; the final checkpoint is `stoneTotal·1` — **exactly**
`stoneTotal` (each subtraction Sterbenz-exact; probe-verified over 300k trials). The completion
event still fires once (chronicle unchanged). One law, five workings (cut, adit, bell pit, shaft,
fell). Guards: strict `===` conservation on single-working-from-zero specimens; `toBeCloseTo` only
where the shared pile interleaves mason draws; replay byte-equal. The credited-once tests are
REPLACED by these, not deleted.

### B′. THE SKILL SYSTEM — skill is earned by doing (SIM, the arc's heart)

**The model.** `Person.trade` narrows to `'villager' | 'smith'` (the smith's specialist pipeline
survives verbatim on a re-based predicate). A new hashed field, plain integer data:

```
Person.worked: { mason: days, digger: days, woodsman: days, farmhand: days }
```

- **Four skills** matching the sim's verb groups: **mason** (lay), **digger** (fills, decks, cut,
  adit, bell pit, shaft), **woodsman** (fell), **farmhand** (tend). Hauling is deliberately NOT a
  job this arc — it stays the cart's frozen rate; haul-as-labor lands with the timber way's
  per-pile logistics (§3H), and the C theater draws its visible carriers from the day's actual
  assignees so the body count never exceeds the census.
- **The year rule:** each day a villager's assigned job earns them **+1 worked day** — counted only
  on a day that produced at least one unit of actual work (an honest stall teaches nothing). At
  `≥ TICKS_PER_YEAR` worked days the villager holds the job's **green** band. Discrete threshold,
  no curve. Journeyman/master stay Beat 4's (the bond, boss-reserved).
- **The step is a BONUS, not a penalty** (critique-flipped): untrained hands work at **today's
  measured rates** — the arc that exists because building feels slow ships no slowdown — and green
  earns **×9/8 (1.125)** at the job. The envelope arithmetic, done: green +12.5% leaves 2.5–12.5
  points of the canon ~15–25% green→master spread for Beat 4's upper rungs (which also inherit the
  option to read the envelope as spanning from untrained — §6 need not decide today; the digest
  records the constant is design, deliberately conservative against the real ~50–100% craft wage
  premium). The multiplier is a constant dyadic factor; results are correctly rounded and
  deterministic; the only hashed consumer (farm.workdays accruing in eighths) is exact.
- **Pace redesign:** per-job base constants replace the trade-relative scalar — lay
  `(24 + vigor×12)` stones/day, earth `(3 + vigor×2)` m³/day — with ONE rng draw per person
  (`vigor`) at creation. Founders: **13 souls, 3 seeded `worked.farmhand = TICKS_PER_YEAR`** (green
  farmhands), 10 untrained. Names pool extended past 13 (constant strings); the age stagger becomes
  a fixed cycling table in the 20–36 band (no rng, no elder founders, no cohort wave).
- **Assignment — favor, not puppet, pinned against the oscillation** (critique-proven): ONE
  deterministic pass at the top of the day, **after `applyCommand`, before `moveEarth`** (same-tick
  plan-then-work semantics preserved), frozen for the day (the no-trade-change-within-a-day
  invariant `smithMult` leans on). The pass skips non-adults and smiths (`isAdult` at assignment
  time). Each villager, in `state.people` array order, takes their greenest job first **among jobs
  with bounded outstanding work**, else walks the global ladder (lay → fill → roof → dig → fell →
  farm) over a constant jobs tuple (never object-key iteration); **yesterday's job wins ties**
  (deterministic stickiness, so untrained hands actually accrue years instead of scattering).
  *Lay-has-work is a dawn-decidable predicate:* `stonesLaid < stonesTotal` ∧ not plans-blocked ∧
  (hauled: `faceBuffer + haulRate ≥ DRESS_DRAW`; local: `stockpile + the day's expected credit ≥
  DRESS_DRAW`) — never a read of supply that the same day's later phases produce (the proven
  2–3-day duty-cycle oscillation). *Farm work is bounded:* each farm wants `area/AREA_PER_HAND`
  hands per day, so tending saturates and surplus farmhands fall through the ladder — which also
  hands M4 its yield substrate. The pass ships as one pure exported `computeAssignments(state)` so
  the theater and HUD import the same truth (parity law); it is recomputed each tick and never
  enters hashed state.
- **Supersession, named** (the F′.5 pattern): greenest-first supersedes the SIM 4 / SIM 14 global
  ordering laws ("construction outranks fields", "a quarry outranks fields") **for skilled hands**
  — the boss's Q1 intent: farmers farm. Untrained hands keep the old ladder. The
  quarry-before-field fingerprint is re-designed, not just regenerated. Recorded in BACKLOG in the
  same pass. Likewise recorded: Q1 pulls the skill FLOOR out of Beat 4's decreed one-batch spine;
  the remaining spine (bond, journeyman/master, funeral, Testament) stays ONE bump.
- **The farmers visibly farm** (boss-intent guard): the sweep asserts the 3 green farmhands spend
  the majority of growing-season days at farm work under the year-one retune (fields sized to feed
  13 help); the E farm card states yield is space-gated (skill moves tending pace, not yield) so
  the card never implies a consequence the sim doesn't deliver. The sweep also asserts
  time-to-first-green for an untrained founder lands within ~1.5–2 game-years on a normal build
  program.
- **Demographic retunes, sweep-proven:** `FOUNDING_CAPACITY`/`FOUNDING_SHELTER` → 13,
  `SMITH_MIN_POP` re-examined, seed grain sized lean-but-survivable; `npm run sweep` re-run and the
  equilibrium claims re-verified (don't tune by eye).
- **Determinism specimens:** the band flip itself is invisible to the 200-tick canon, so the B′
  commit carries a threshold-crossing specimen — a person seeded `worked.digger =
  TICKS_PER_YEAR − 1`, one assigned day flips the band, the rate change lands on the exact tick,
  replay byte-equal. The provenance suite re-states as "every stone remembers its layer," with the
  id set built from everyone ever minted (founders + born/arrived events), never end-of-run
  survivors (the latent 400-tick death flake). *(Parenthetical for T2: layer-provenance stands
  until the banker shop splits dresser from layer — the mark then follows the dresser per SCOPE.)*
- **Surnames keep their substrate:** the decreed surname-coalescence rider ("trade persistence,
  2+ generations") loses `trade` as its signal and gains a richer one — dominant `worked{}` job
  across generations (the family whose digging dominates becomes the Delvers; Mason / Woodman /
  Farmer / Smith all reachable). The Carter has no substrate under ANY current design (carting is
  never person-work) — flagged for whenever haul-as-labor lands.
- **Render/HUD ride-alongs:** costume follows the day's assignment (retexture on change, banded
  like the age-tint); the boot-frozen `paceSum`/`earthPace` HUD derivations become live imports of
  `computeAssignments`; the smith keeps his apron.

**What this deliberately does NOT touch:** techniques, the bond, journeyman/master, funerals,
Testament, succession — Beat 4's boss-reserved spine. The year rule is the spine's floor. (Naming
note: shipped SIM 27 already answers to THE FIRST TECHNIQUE in the mark ledger; the roadmap's
unshipped ashlar token needs a distinct name when it comes.)

### C. The visible work — theater catches up (render-only, ZERO baseline)

1. **Diggers dig, fellers fell.** PeopleLayer learns the whole assignment truth (importing
   `computeAssignments`): villagers the sim has at a working visibly go there and swing; the dead
   `floorAtShow` finally gets its caller (diggers stand ON the sinking pit floor).
2. **Piles at the working.** Representational stacks beside the spoil (granary-sacks pattern): won
   blocks at cuts/adits/pits/shafts; **felled logs scattered at the fell positions within the
   stand** (the boss's literal "wood drops where it's felled"). Depletion reads by the global-share
   trick (per-working stack ∝ its contribution × the global stock's remaining fraction) — zero sim
   change; true per-pile logistics is deferred to the timber-way course, where it belongs.
3. **Carriers carry, and the chain CLOSES at the wall** (boss: "placing them in the final
   structure"): pick-up = the nearest working's blocks / stand's logs, drop-off = the mason's
   station; the mason draws from the face stack and **the wall's next stone appears with the
   swing** — mine → pile → carry → place, watchable end-to-end. Hauled walls show a small
   face-buffer stack (the cart's deliveries visible).

### D. The progress bubble (render-only, always-on per boss)

One chip component (the #prospect DOM pattern, field-guide monospace), anchored at the entity,
visible while incomplete, fading when done. The mason verb is pinned **laid** (dressing is a
0.5–4 stones/day craft absorbed upstream in the quarry yield — a chip that said "cut and laid"
would be off by an order of magnitude):

- Wall: `⚒ 128 / 395 stones` + the stall named at the structure (`waiting on stone / cart / timber`).
- Working: `⛏ 184 / 890 days · 174 m³ won` — the number the boss sat a season staring for.
- Multi-input = multi-line (data-driven `{icon, done, total, unit}[]`; the kiln and Keep ride free).

### E. Selection — the inspection card grows up (render-only)

Extend the memory-suite raycast's miss path: ground hit → point-in-polygon → entity card:

- **Farm:** use, area, expected yield in mouths (the livingYear arithmetic surfaced, labelled
  space-gated), workdays, tending hands + their bands, season state.
- **Building:** kind (or *unnamed*), house tier, begun year + stones (the biography), roof,
  **[choose the roof] / [name the trade] actions when unanswered** (§F′).
- **Working / stand:** the D chip's detail + the prospect readout's teaching line / regrowth
  countdown.
- **Person (stretch, cheap):** name, age, bands held — the skill system made legible.

### F′. The word moves to the plot — 'none' builds, the card answers later (SIM)

1. **At-plot pickers.** Building mode gains roof + kind pickers in the build bar (default
   **none**); answers ride `plan_wall` as validated optional fields (the replay law — the command
   is the truth). New constant reject strings cover the new fields, including roof/kind on a
   non-building ring (reject with a constant string, never silently drop the player's word).
2. **'None' never blocks.** `awaitsDrawings` retires; a shell with unanswered words builds as bare
   bones. **Plumbing pinned:** none-at-plot stores `plans.roof = null` (re-answerable); completion
   coalesces null → 'none' on the minted record where a kind exists; no Building is minted for
   kind-none — the shell pends non-blockingly, exactly as fields pend today.
3. **Choose later by selecting it.** Clicking the shell (E card) offers the unanswered words — the
   game's first designation-mutating surface, shaped so field rotation (BACKLOG's reserved M4
   RE-designation) can later ride it. A later roof word updates BOTH `wall.plans.roof` and
   `Building.roof`, mints the brick deck at answer-tick (deterministic new id at a new tick), and
   the houseTier/shelter shift it causes is **intended** — naming a roof changes what the house is
   worth to the people in it.
4. **Fields and spans keep their asks this course** (the boss spoke of buildings) — but the E card
   also answers a pending FIELD by click (gesture unified, card kept), and the span tool's
   covering-ask gains 'none' for symmetry (an uncovered deck is already a legal state). §6.2 for
   the boss's taste, not blocking.
5. **The sweep:** the blocking-behavior tests re-author (~8 enclosure assertions +
   gates/ramps-roofs mechanical); the retired rejection strings go with them; the 2026-07-10
   "asked at plot, crew waits" canon comments in types.ts/step.ts/BACKLOG are superseded — swept in
   the same pass, handoffs left untouched (history is not rewritten; the supersession is recorded
   here and in BACKLOG).

### G. Pasture animals (render-only, boss-flagged low priority)

The pasture HORSE is sim-true (SIM 29's draft horse rendered — the record on screen). Paddock
cow/pig have NO sim substrate (herds are BACKLOG-reserved) — they ship, if shipped, explicitly as
**decor-pending-the-herds-system** (the granary-cat precedent, named as such in the commit), or
hold for the herds course. Granary-cat pattern throughout; Law 6 both update sites. Orchards
already have trees; nothing to do.

### H. THE TIMBER WAY — carriers move faster on a laid way (SIM, its own later arc; §0b Q3 redesign)

The boss's ruling reshaped this from a rate-multiplier to a **worker-speed** mechanic: *"if the
workers are moving faster the bricks reach their destination quicker… the workers would have to
have a more complicated pathing."* So the way's course IS the haul-as-labor course: carriers
become real labor with routes (per-pile logistics — pick up at a working's pile, walk a path, put
down at the face), and a drawn timber way multiplies CARRIER SPEED on its segments. The fiction
stays research-honest: a **timber causeway** (corduroy/plank way; Ely 1071, Berlin 1238;
greased-baulk slipways proven for 40-ton blocks) that the SLEDGE rides — wheels-on-rails and
conveyor imagery are post-1500 and stay out of the flavor. The frozen-`haulRate` model, the
`rollers` flag, and the 🛷 toggle all retire together when this lands (Q4's "replace"). Carriers
on the way visibly outpace off-way walkers (≥3×) so "rapid" is a property. Pathing note for the
design: routes can stay cheap — polyline-with-way-segments cost fields, not full A* over terrain —
but that call belongs to the course's own proposal. Sized as its own arc (it touches haul, the
theater, and the skill taxonomy — a `carter` job becomes honest here, and the Carter surname gains
its substrate).

## 4. Already resolved / already true

Orchard trees (`6da302b`); the carry pose + bobbing block exist (wrong anchor — C.3 re-aims it);
**mason-at-the-wall theater exists** (stations, hammer swing while stone is laid) — C.3's new links
close the boss's chain around it; the HUD stall line + bottleneck line exist (D moves them to the
structure); the legibility spine (inspection card) is what E extends; the clock needs no fix.

## 5. Build order + discipline (critique-corrected)

**Course 1 — THE VISIBLE ECONOMY, one arc, three attributable commits, THREE SIM_VERSION bumps
(35/36/37):** every commit is replay-visible, and the guard forks saves on version inequality
alone — a batch sharing one bump would let a save written under commit-A physics replay silently
divergent under commit-B physics. Deploy=push makes intermediate states live, so each commit
stands alone: its own SIM bump, its own canon-script touch (ids re-probed, vocabulary edited), its
own `gen-baseline` regen. The canon STORY — a 13-soul founding, a quarry that trickles from its
first week, a wall that rises as the pit deepens, a bare shell click-named mid-build — is designed
once; the SCRIPT is touched three times. The standing two-commit law (instrument-neutral seam
first where one exists) may expand the sequence to as many as six commits; budgeted, not
discovered mid-arc.

1. **A** incremental credit (stone + timber) — conservation specimens first.
2. **B′** 13 founders + the skill system — sweep re-run + retunes + the threshold specimen inside.
3. **F′** the word at the plot + none-builds + the choose-later command — **grown per §0b Q2 to ONE
   enclosure grammar: buildings AND fields AND roof-spans** all take at-plot answers, 'none' legal,
   answer-later by the word on the entity.

**Course 1.5 — THE CHEAT MENU** (§0b new item): `cheat_give` (stone/timber/grain to the stocks),
`cheat_spawn_person` (a villager at a point), `cheat_grow` (a working/wall completed a day's worth
instantly?) — exact verb set kept small; every cheat is a COMMAND in the log (replay-equals-live
holds for cheats too), validated at the boundary, gated behind a Settings toggle. After B′ (people
spawning needs the new Person shape).

**Course 2 — render-only, zero baseline:** C (theater + piles + the closed chain) → D (chips) →
E (cards + F′'s choose-later UI half + **occupants as card data** per §0b Q1). Law 6 both update
sites; receiver-trick eye checks; probe + eye.

**Course 3 — render-only:** **roofs for irregular rings** (the census's own "biggest visual win," and
the boss called buildings broken; a designated dwelling must stop looking like a roofless shell) +
G (animals).

**Course 4 —** H, REDESIGNED per §0b Q3: the timber way as a **worker-speed** mechanic — haul
becomes labor (carriers physically move stone along routes; the way multiplies their speed on its
segments), which requires pathing + per-pile logistics. The frozen-haulRate model retires WITH the
sledge flag when this lands. Sized as its own arc; design section §3H updated in place.

## 6. What remains open for the boss — ALL FOUR ANSWERED (see §0b)

~~1 lived-in layers~~ → occupants are E-card data; irregular roofs stay the Course-3 default.
~~2 symmetry~~ → extend to fields + spans NOW (F′ scope grown).
~~3 the way's re-freeze~~ → dissolved into the worker-speed model (Course 4 redesigned: haul-as-labor
+ pathing; the way makes carriers faster along it).
~~4 save-forward~~ → flag days ("so far in alpha no one is going to expect the saves to work").

Still genuinely reserved for later words: painted interior floors (never asked for — dropped from
the default map); quarries folded into the enclosure grammar (stated direction, later course);
Beat 4's spine (bond, journeyman/master, funeral, Testament — untouched by this arc).

## 7. Research grounding (the digest, honest about strength)

Recorded in `research/DIGEST-2026-07-16-the-visible-work.md`: the year rule is the best-grounded
piece (navvy hardening "up to a year"; annual farm-service contracts as the labor quantum; guild
apprenticeships 2–7 years safely ABOVE green). The +12.5% green step is **design, not history**
(the wage record can't quantify a within-laborer gap; the real craft premium was ~50–100%, the
canon band cap deliberately compresses it). The timber way's attestation boundary (causeway yes,
rails no) and the laid-vs-dressed rate distinction are in the digest so future sessions don't
"correct" them backwards.

---

*v1 census + measurements by the fortieth hand; v2 dispositions folded the same day on a four-agent
census fleet; v3 hardened by a four-lens adversarial critique (determinism — the dawn-oscillation
and farm-sink proofs; boss-intent — the penalty flip and the closed chain; canon — the envelope
arithmetic and the save-compat surfacing; research — the causeway boundary). The three probe
numbers (890-person-day quarry, 351-day first stone, 7-day palisade) remain the arc's reason.*
