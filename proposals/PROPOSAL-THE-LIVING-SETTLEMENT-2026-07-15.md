# PROPOSAL — THE LIVING SETTLEMENT

*2026-07-15 · a design bible, not code · Castle Cultivator (repo codename `freestone`)*

The design bible for the layer beneath the factory: **the woods, the mortal hands, the harvest
that grows them, and the trades that rest on their variety** — the renewable, living things a
castle is actually built *by*. It is the boss-picked WOODS arc grown to its honest size, because
you cannot spec a wood that regrows over generations without speccing the generation. Companion
to [PROPOSAL-LOGISTICS-2026-07-13.md](PROPOSAL-LOGISTICS-2026-07-13.md) (the carriage layer) and
[PROPOSAL-MINING-2026-07-11.md](PROPOSAL-MINING-2026-07-11.md) (the land); child of
[ROADMAP-THE-GENERATIONAL-FACTORY-2026-07-14.md](ROADMAP-THE-GENERATIONAL-FACTORY-2026-07-14.md)
(Beats 0–4 are what this bible details).

Every load-bearing number below was verified by fetching a source; the sharp ones are cited in
§11, and the honest dating risks are flagged there too. Nothing here is built. This is the plot.

---

## 0. The one line, and the one law

**A castle is built by a living settlement, and a living settlement is three renewable
populations on one clock: the wood, the people, and the harvest.** You spend them on the stone.

And they all obey **one law**:

> **Nothing persists unless you keep its base alive.**

- A coppice **stool** is near-immortal *because* it is cut — but only while the wood is kept a
  wood; abandon it and it goes to bare ground your grandson inherits.
- A **holding** shelters a household only while a niche exists for it; the line ends, the toft
  falls vacant, and the niche reopens for another.
- A **trade** works for its master's lifetime, but transmits to the next generation *only while
  its support base holds* — lose the horses and the smith still rings, but no new smith is
  raised, and when he dies the forge goes cold unless you rebuild what a smith rests on.

Three systems, one law. It is the [[user-builder-philosophy]] made mechanical: erosion is the
formation mechanism, and stewardship across time is the only permanence. This law is the reason
the game is generational and not merely long.

## 1. The one clock

Everything long runs on the same arithmetic — `TICKS_PER_YEAR` (365, already exported from
`types.ts`) — and **every long-clock system states its duration in the other's terms**, so the
player learns one intuition for deep time instead of five:

- a **generation** ≈ 25–30 years (SCOPE §4);
- a **coppice-with-standards cycle** ≈ underwood on ~7–8 years, standards on ~50 — so *"the wood
  you fell for the crane will stand again in your grandson's time"* is literally true;
- a **working life** ≈ survive to 25 and expect ~50 — a productive window of ~25–35 years,
  roughly one coppice-with-standards cycle.

This is Beat 0 (ONE CLOCK) discharged: the generation and the coppice are the same *kind* of
number, and `birthTick` and `regrowthTick` are siblings, not strangers. **Because a
25-year generation and a 50-year oak are unwatchable at ×1, the year-clock made real and a
fast-forward ("Sit the Season") are prerequisites for this whole bible** — see §9.

---

## 2. The woods

The boss-picked arc, and the first place the one law shows its face.

**Stands, not trees.** The 16,872 render canopies ([src/render/trees.ts]) are promoted to sim
**stands** partitioned into **cants** (also "panels" or "falls" — the real term for a coppice
section cut in one operation, historically ~0.5–3 ha). A new `plan_fell` command freezes a
`timberTotal` + a regrowth clock at the boundary, exactly as `plan_cut` freezes the quarry — the
sim core stays terrain-free, the save self-contained. `plan_fell` is a **drawing verb** (§9's
standing rule: every arc ships one), and the draw site is already marked in code: `layStones`'
`w.material === 'wood'` special case carries the comment *"the WOODS aren't a cost yet."*

**Two stocks on two clocks**, straight from verified silviculture:

- **Underwood / poles** — multi-stem growth cut short-rotation from a low stool (hazel ~7–8 yr,
  oak/hornbeam ~15–25 yr, birch ~3–4 yr). This is the fast crop: scaffold, hurdles, hearth fuel,
  charcoal, and **the cart** (§6). A fuel coppice regrows inside one lifespan.
- **Oak standards** — the sparse big trees left standing *through* many underwood cuts, grown
  ~50 years to structural size. This is the slow crop: the great-wheel crane's timbers, roof
  beams, the big frames. A two-generation decision — a line inherits standing standards or bare
  ground. (Rackham's evidence: most medieval frame timber was *small*, felled at 40–80 rings, so
  ~50-year standards suffice — no 800-year oaks required.)

**Felling is not death — this is the whole point.** A regularly-coppiced stool lives *several
centuries*; an uncut hazel lives ~80 years. Coppicing makes the tree near-immortal, and regrowth
*is* how it lives. So the generational-regrowth clock the boss wants isn't a mechanic laid over
trees — it is the honest biology of a worked wood.

**The render ladder** (a worked wood is a **patchwork of age-classed panels**, never a uniform
forest that vanishes and pops back): a felled cant is an open coupe — low stumps/stools, brash on
suddenly-open ground, sky reaching the floor for the first time in a decade. By **year 1**, fresh
shoots ~1.5 m (a low green fuzz, *not* canopy). Mid-rotation the canopy re-closes and shades the
floor. Then full poles, ready to cut. Two visual registers coexist — underwood (many thin stems
from a low stool) versus standards (sparse single big trees). Pollards (cut above browse height,
~1.2–2 m by animal) read as a fat trunk-stub crown, justifying a "protect from grazing" beat.

**Over-cut is a scar, not a delete.** Clear-fell a stool to standards-only, or abandon a cant to
grazing, and it reseeds through scrub over *decades* (measured English succession: ~3 m of scrub
by 23 years, closed canopy by 53). The chronicle writes a dated ledger line — *"felled Year 12;
hazel returns Year 19; the oak, Year 74"* — and a later Lodge inherits the bare ground. Never a
fail; a debt.

**The sustainable-harvest read** (the one-law made a HUD line): each stand shows, in the genuine
period idiom, how much may be taken without waste — the 1356 Hayley Wood survey recorded *"of the
underwood there can be sold every year, without causing waste or destruction, 11 acres"* of 80.
A stand's readout is that sentence, live.

**Durham grounding is real.** Baal Hill Wood at Wolsingham in Weardale was the **Prince Bishops
of Durham's** own wood — the bishop's bailiff's park, upland oak-and-birch, a "Bishop's Oak" over
400 years old still standing — and Durham Wildlife Trust still coppices local woods (Baal Hill,
Edmondsley) on a 7–8-year hazel rotation with 2-year deer-guards. Weardale is already where the
bed model's Frosterley marble comes from. The gorge woods this castle burns and builds with are
the same lord's woods that fed the real one.

**Ships with:** the winter-felling season slot (felling is dormant-season work, so the woods
carry the year's first season-sensitivity — the carriage layer's winter two-stroke, half-built
here); the **countdown + return ledger lines** and the chronicle celebrating the Year-19 return
(a 20-year clock is invisible without its readouts — this is *minimum ship*, not polish); and a
**wood-pasture vs enclosed-coppice** designation word-card (the shipped designation grammar's
next tenant — graze-and-pollard vs enclose-and-coppice).

**Dating flags:** the "12 standards per acre" rule is Tudor (1544 statute) — use the *concept* of
scattered standards, not the number. Coppice-with-standards is attested "common since the 13th
century," so it is 1200s-safe in kind; exact medieval rotation year-counts are period-plausible,
not pinned.

---

## 3. The mortal hands

The spine the woods force. Today `state.people` is four founder stubs with id/name/trade/pace —
*"the real people sim arrives in M3"* — but it is already hashed sim state of the right shape, and
every labor loop (`moveEarth`, `layStones`) already iterates it, so production breathes with the
roster for free.

**The demographic pass** — one day a year, slotted into `worldStep`'s daily order (the seam at
`step.ts` ~line 63, beside `moveEarth`/`haulStone`/`layStones`): each named adult draws a seeded
survival roll on an age curve, deaths emit `person_died`, births and comings-of-age replace them
at a slow seeded trickle. People stay theater **except** that they are born, work, and die on the
record. Deaths without consequence would be Banished's "bare subtraction," so lifespans are
**staggered from commit one** (the verified cohort-death-wave failure) and every death lands
somewhere the player reads (the funeral, the chronicle, the trade it may end).

**The numbers** (1200s-honest; treat as order-of-magnitude, flagged in §11):

- household ~4.4–5.7 (simple conjugal family ~70–80% of households);
- female first marriage **late teens to early 20s** in the 1200s (Halesowen c.1300), *not* the
  mid-20s of the early-modern European Marriage Pattern; near-universal marriage;
- ~6–7 pregnancies yield ~2 survivors (child mortality dominates);
- adult working life ends in the 40s–50s and **scales with wealth** (~50 for a well-off holding,
  ~30 for a poor cottager) — the load-bearing number is adult expectancy (survive to 25 → ~50),
  a ~25–35-year productive window.

**Household formation is niche-gated, not house-gated** (Razi's land-availability throttle, which
is the *medieval* mechanism — the hard "own a house before you marry" rule is the *early-modern*
European Marriage Pattern and does not belong at 1200): a young adult needs a **viable holding** —
an inherited toft, a building plot carved from a parent's holding, assarted or cleared ground —
before a new household forms and starts bearing. No niche → the youth marries late, enters
**life-cycle service** in another household (a labor reservoir the Lodge can draw on), or
**emigrates**. Inheritance is male-leaning but *flexible* — "free bench" gives a widow the whole
holding for life, daughters can inherit, younger sons get carved plots or assart — not clean
primogeniture. And a holding falls vacant chiefly on **death without a willing heir**, which is
the map's own way of reopening niches: no Lodge bulldozing, the one law again.

**The clerk** (SCOPE §7 canon, and the right first body for aging): one role flag riding the
demographic pass, rendered at the HUD edge, aging in true game time — upright, gray, stooped, a
funeral the village attends, and the apprentice who shadowed him picks up the book in a new hand.
His function is calibration you can't get from numbers: he teaches the player how long a
generation *is*, before any mechanic charges them for it. Steal his trick for everyone —
**age-tint every folk sprite by `birthTick`** and the whole village becomes a clock. And bind
sprite to person: the day a named mason dies, his sprite stops appearing (Wildermyth's verified
law — attachment breaks when the screen contradicts the record).

**Knowledge as a crop** (the technique system, seeded minimally — see §5, where it merges with
specialization): the one person-lever SCOPE §3 allows is `name_apprentice` (favor, not puppet); a
bound apprentice on the same work gains skill faster; coarse skill bands (green/journeyman/master,
~15–25% spread — *not* a smooth XP curve, which would be a shadow tech tree), and the **First
Technique** ("the true ashlar hand": its holder lays ashlar at 1.5 mason-days/stone instead of
DRESS's 2.0) transmitted only through the bond, dying untaught, named by the bottleneck line:
*"LAY slow — Alwin died unteaching."*

**The funeral protocol** (the no-fail law applied to mortality): on `person_died` the site rests
one day (capped one per season — burials waited), the chronicle writes, and if the dead was a
mason mid-wall his bound apprentice lays the master's next stone *in her hand* — **the dual-id
succession stone, the master's last beside the apprentice's first.** Succession as literal
masonry. Death is ink, never a penalty function.

---

## 4. The harvest — food is the power supply

The engine that grows the people. The boss's call, honored exactly: **food production is EASY and
SPACE-gated** — accuracy traded for ease, deliberately.

**Food is a function of field area.** More enclosed field → more food; the binding constraint is
the finite flat arable land, contested between fields, pasture, the quarry, the woods, and the
castle's own footprint. This trades the fiddly labor/harvest-timing knife-edge for a **land
tension** that suits a map-drawing builder — you decide how much of the valley feeds people versus
becomes the great work. And it loses less realism than it seems: arable **acreage genuinely was**
the binding medieval constraint on population, so space-gating is honest even while it's easy.
(An optional light labor factor — untended fields sag — can layer in later, default off per
"easy.")

**The space→mouths anchor:** a **virgate** (yardland, ~30 acres) fed a family of ~5–7; a real
manor (Elton, Cambs) ran ~1,872 arable acres for ~550 people (~3.4 all-in). Round to a clean,
generous **"~5 acres of field feeds a person,"** keep yields low (single-digit-to-teens
bushels/acre) so **more field area is always the lever**, and seed the map roughly ~35% arable /
25% pasture / 15% woodland / 25% waste so clearing woods for field trades against timber.

**The surplus ratio drives population.** S = food produced ÷ mouths to feed:

| S | band | effect |
|---|---|---|
| < 1.0 | hunger | the village thins (people leave, at the bottom starve — the hazard ladder) |
| 1.0 – 1.25 | holds | stable; no growth, no loss |
| ≥ 1.25 | grows | migrants + births, ramping to full growth by ~1.5× |

**The threshold: 1.25×, not 2×.** The boss's opener was 2× (100% surplus); I took it down because
with easy space-gated food a 2× bar would either trigger constantly or read as a tax. A **25%
surplus** makes growth a *deliberate over-plant* — you choose to give a bit more of the map to the
fields than the mouths strictly need — while a comfortable 1.0–1.25 hold band means you're never
punished for merely breaking even. (Historically 2× is a very high bar: seed corn eats ~a quarter
of the harvest at ~4:1 yield ratios, tithe another tenth — real surplus was thin, which is *why*
medieval population grew slowly. The game can drop the tithe and shrink the seed fraction for
ease; the threshold is a **knob for the century-sweep**, not a citation.)

**Two channels, two speeds** — both, deliberately:

- **Migration** — the *fast* valve: word of a full granary spreads and newcomers arrive as
  working adults, this season. Responsiveness. (Gated on food surplus *and* housing capacity, §5.)
- **Birth rate** — the *slow, generational* valve: surplus means earlier marriage, more
  surviving children, more households forming — but they don't lift a stone for ~15–25 years.
  Lineage. A migrant arrives a named stranger; a born child is a *line*.

**Food is the pressure; housing/niches are the capacity.** You need both. Surplus with no houses →
migrants pass by and the young emigrate for want of a holding (you feed people who leave); houses
with no surplus → the hearths go cold and tofts fall vacant. Government's two jobs — mutual aid
*and* the room to live it — become two dials that must move together.

**The soul note:** food surplus produces *life* (born and come), not wages. The granary embodies
mutual aid **and** is the population engine, one object, no contradiction — which is the civic
thesis done correctly (and it fixes the scoping's worry that "grain as payroll" would colonize
the granary's meaning). Abundance lets people *be*; that is the thesis as a birth rate.

---

## 5. The pyramid — variety supports skill

How the population engine's output becomes not just *more* people but *specialized* people — and
the game's whole progression system, which is a tech tree that is not a tech tree (wishlist
canon: no research nodes; knowledge lives in the settlement's own composition).

**The law:** *the division of labour is limited by the extent of the market* — Adam Smith,
verbatim (Wealth of Nations Bk I Ch.3). His own worked example **is** the country smith and
carpenter: *"a country smith [deals] in every sort of work that is made of iron... a country
carpenter in every sort of work that is made of wood,"* because a thin rural market cannot support
narrow specialists. So the gate on a specialist is **market extent = variety × population ×
reach**, and — the star lever, per the boss — a settlement that *broadens its base* (adds pasture,
horses, a wood, a second crop, a nicer house) unlocks a higher specialist *even at the same
headcount*, because a richer base is a bigger internal market.

**Two input axes** (distinct from the population engine's quantity axis):

- **Food/economic VARIETY** — distinct kinds of production present: crops, livestock, horses,
  later an orchard, a mill, a wood. (The shipped designation grammar — farm/livestock/fallow —
  is already the input; it grows two new tenants — **horse pasture** and **an orchard** — as
  step 3's variety types. The **fishpond is cut** (boss, 2026-07-15): a lord's stew-pond
  amenity that wants standing water, more manorial-luxury than base-layer.)
- **Housing QUALITY** — discrete tiers **hovel → cottage → hall** (the prosperity-decor canon
  §8c made *functional* instead of cosmetic; a specialist won't live in a hovel).

The **quantity** axis (space-gated food) makes *more* hands; the **variety** axis makes *better*
hands.

**The tiers** (start shallow — three — and grow toward the apex only as the cathedral horizon
arrives):

| tier | who | needs (the base beneath) |
|---|---|---|
| 0 | farmers · hands | land, food, shelter (everyone farms, bakes, brews) |
| 1 | **smith** · **carpenter** · **miller** | modest surplus + variety: smith wants horses+livestock+mixed crops+a cottage; carpenter wants the woods+a cottage; miller wants grain surplus+capital+a watercourse |
| 2 | master mason · wright | the smith + the carpenter + surplus + a **hall** |
| 3 | glazier · goldsmith · mercer | the richest base + the finest houses + **wider reach** (trade links, not just local surplus) |

**Higher tiers want wider reach, not only more surplus** — a real Kent manor sent buyers 300+ km
for *horses* while everyday crafts drew from ~10 km, so the apex trades naturally want trade links,
a clean late-game hook rather than "more of the same."

**Arrive AND emerge** (boss): a specialist arrives on the migration wind (fast, a named stranger)
*or* is raised from a local child under a master (slow, a lineage — the smith who is a farmer's
son is the one the chronicle loves). The diegetic generalist→specialist split is Smith's own
point: below threshold, one smith "deals in every sort of iron" (one sprite, many jobs — shoeing,
mending ploughs, nails, wagon iron); above it, the work splits into named specialists.

**The base sustains the lineage** (the boss's key refinement, and where this merges with the
technique system into ONE mechanic): a specialist whose support base decays **does not leave** —
he works his whole life, no punishment, no scar-of-idleness. What breaks is **transmission**: with
the base gone, no apprentice specializes and no new specialist is drawn, so **when he dies the
trade dies with him — the forge goes cold — unless you've rebuilt what a smith rests on.** Only
true catastrophe (starvation) makes anyone actually leave. So the support base does two jobs: it
**admits** a specialist (the pyramid) *and* it **sustains the lineage** (the trade reproduces only
while the base holds). A trade is exactly as permanent as the ground you keep under it — the one
law, now running through the trades exactly as it runs through the stool and the holding. This is
the technique-dies-untaught system generalized from a single technique to a whole trade, gated on
the base rather than merely on having an apprentice.

**Growth is the tutorial** (boss): you climb the pyramid by *diversifying your settlement*, and
each rung introduces the next layer of play in the order you can absorb it. **Everything starts at
the base** — hovels, fields, hands, the plainest work — and thickens slowly, which is not only
good onboarding but *historically exact*: c.1200 was the **start** of the commercialization boom,
and the dense specialist layer (the 1370s poll-tax towns full of chandlers and drapers) is a
13th-century thickening on a sparse base. Nothing artificially bars a fast player from climbing
quickly (speedrun-tolerant), but the natural gradient pulls everyone else up slowly, teaching by
doing. Deep-model-shallow-controls holds: the player just builds a varied, well-housed settlement,
and a quiet field-guide line whispers the next rung — *"a horse pasture would draw a smith"* — a
soft goal, never a quest marker.

**Reuse of shipped systems:** the designation grammar is the variety input; the blacksmith
designation finally gets its *reason to exist* (and the smith's EDGE mechanic its trigger); houses
gain a quality tier; and the **woodworking place** is a new Tier-1 building (§6), sibling to the
blacksmith.

**Dating flag:** the richest specialization data is 1377–81 poll tax (post-Black-Death), ~180
years after 1200 — use it as the *direction/end-state*, never the early-game density. Smith (1776)
supplies the *logic*, not a medieval attestation; central-place theory is a 20th-c. model
retro-applied. Watermills (~1 per 2 vills by Domesday, 1086) are a genuinely pre-1200-safe rung.
"Every village had a smith" is popular-history overstatement — the defensible claim is the smith
was the *most widespread* rural craft, present wherever enough plough/horse ironwork existed,
thinning out in small arable hamlets (which is exactly the gate).

---

## 6. The accelerants — timber's first payoff

Today HAUL is an abstract scalar frozen from the route ([HANDOFF-THE-CART-2026-07-14.md]); there
is no cart, no sled, no roller, no pulley *as an object* — they were promised as flavour and never
made real, so acceleration is currently *given* by the terrain, not *earned*. The reframe:
**timber's first job is the haulage kit you build from felled wood, and each piece raises the rate
you already shipped.** Raw material → tools → throughput — the factory-game core loop at hand-labor
scale.

**The cart is first** (boss), and it reorders the whole ladder around the player, not the physics:

- it is the cheapest and most relatable machine — **wood + a woodworking place** — and
- its **first job is grain → the granary**, so the accelerant concept ("build a thing from timber
  and it moves stuff faster") is taught on the *forgiving farm run*, at the base, long before a
  single ashlar block needs carting. The cart is the first accelerant **and** the first lesson —
  "growth is the tutorial" made literal (§5).
- it moves the *least* per load (~0.5–1 t: two-wheel cart ~0.5 t, four-wheel wagon ~1 t; ox team
  cheap and slow ~10–12 mi/day, horse team costlier and ~2× faster — both period-valid at ~1200,
  ox default, horse upgrade), so it sits at the **bottom** of the capability ladder.

**The first cart pulls all three living systems together at once:** the **woods** give its timber,
the **pyramid** gives the **carpenter** and his **woodworking place** (a new Tier-1 building,
gated on the woods being present), and the **granary/food loop** gives it its first errand. The
whole living settlement converges on one cart on the grain road — coherence that fell out because
the pieces are right, not because it was designed top-down.

**The ladder above the cart, by capability as the loads grow** (all built on site from local
timber, all frozen at plan time — the boundary reads *"what has the Lodge built?"* and freezes the
better rate):

| method | for | gain (relative) | timber/cost |
|---|---|---|---|
| bare drag | baseline | 1× | — |
| **cart** (first) | everyday loads, grain, moderate stone | payload × trips | cheap: poles + the woodworking place |
| rollers / sledge | outsized blocks a cart can't take | rollers ~1.5–2×; sledge-on-slicked/frozen ground ~5–7× (**seasonal** winter bonus) | cheap logs; the sledge's ice advantage is physics, not English practice |
| windlass / gin | lifting, entry | 6:1, ~0.75–1.5 t one man | iron-cheap, old, safe |
| **the great wheel** (treadwheel crane) | lifting tall, heavy | 14:1, ~doubles the load for half the crew, ~6 m/min | a 4 m+ **oak standard** — the real timber sink; *"the new machine arriving in your era"* |

The great wheel is first attested in France **~1225** (image ~1240) — right at the game's window,
so it is an *unlock* ("the new machine"), not a starting tool, and the windlass is the safe
baseline crane. Cranes were built on the ground and **moved up with the wall, bay to bay**, from
oak felled in the surrounding forest — *"the Lodge fells timber to raise its own machines"* is the
mechanic, not decoration. This is where the oak standards a prior generation left uncut finally
bite: LIFT (carriage Phase 3) is unlocked by the WOODS, and a showpiece ashlar block that exceeds
the windlass is the reason the great wheel — and the grandfather's oaks — had to exist.

**Honesty flag:** the ~7× sledge advantage is the Forbidden City ice-haul (16th-c. *China*,
~46 men vs ~330 for one block) — use it *only* as physics for the sledge/slick-ground mechanic,
never as attested English practice. Cart payloads are the conservative ~0.5–1 t (Langdon); reject
the "6–8 t ox-cart" figure (an AI-generated blog, contradicts scholarship).

---

## 7. The granary cat, and the decor the living settlement earns

The **payroll cat** is canon — SCOPE §8a names it *"the only predator we model"* — and it is
honest history: cats genuinely earned their keep at granaries controlling the mice and rats that
went for the stored grain, some literally provisioned on the manor accounts. So an **animated cat
prowling and lounging at the granary** is decor *and* a true field-guide detail *and* the warm
personality-beat the civic heart deserves. Render-only, a few frames, no sim weight; it belongs to
the "beauty in everyone's hands" small-works layer (§8b) and it goes on the granary specifically,
because that is where it belongs and where the eye already goes. It is the first of the ambient
small works the villagers make — the margins of the settlement kept visible and loved.

---

## 8. The closed wheel (how it all interlocks)

The systems are not a stack; they are a wheel, and food is the current:

- **Space-gated food** → *more* hands (population size);
- **varied farms + nicer houses** → *better* hands (specialists);
- **specialists** → better building: the smith keeps edges keen (faster dress), the **carpenter
  builds the cart and the crane** (faster haul + lift), the master mason carries the ashlar
  techniques, the **miller** wrings more food from the same grain — which loops back into the
  population engine;
- **better accelerants** → *fewer hands to move the same stone* → hands freed back to the fields
  → more food → more people again;
- the **woods** feed the accelerants, the kiln, the hearths, and regrow on the clock;
- and **the one law** runs through all of it: the stool, the holding, and the trade each persist
  only while you keep their base alive.

The castle is the one thing that does *not* cycle — it is what you spend the living settlement on.
(Conceptually, this is the three diagrams already shared, welded: the two regenerating populations
on one clock, the food-surplus engine that powers them, and the specialization pyramid that
refines them.)

---

## 9. Build order (staged, coupled, two-commit)

Bottom-up, because the base must be genuinely satisfying alone (§5) and because the two-commit SIM
discipline says land content on stable infra. Each arc ships a **drawing verb** and an
**onboarding moment** (the standing rules from the roadmap §4).

0. **The year made real + Sit-the-Season** *(prerequisite for everything generational)* — the
   season a pure function of tick (zero new state; `SEASON_LENGTH` already exported); a
   fast-forward that runs to the next honest interrupt (a wood comes of age, a death, a stall, a
   season turn), with player-configurable interrupt tiers (Dwarf Fortress), a forecast that turns
   dead air into anticipation (Timberborn), and a once-a-generation "the Lodge takes stock"
   heartbeat (Frostpunk) so a skipped decade always leaves a legible diff. Pausing must never
   advance the clock (Against the Storm). You cannot watch a coppice or a childhood without this.
1. **THE WOODS** (SIM 19) — stands, `plan_fell` (the drawing verb), the two stocks, the regrowth
   clock, the age-classed render ladder, the sustainable-harvest read, the winter-felling season
   slot, the wood-pasture/coppice word-card. The boss-picked arc.
2. **The living population** — the harvest engine (space-gated food → the 1.25× surplus ramp →
   migration + births) **and** the demographic pass (seeded staggered death, niche-gated
   household formation, vacancy-on-heirless-death), on the clock. This is what the woods' regrowth
   is *measured against* — the generations that make the Year-19 return mean something. Likely one
   batched SIM bump (roadmap §4: batch the spine, don't pay eight re-baselines). Rides in: the
   clerk, sprite-to-person binding, the funeral protocol, `name_apprentice` + coarse skill bands +
   the First Technique.
3. **The pyramid + the carpenter's shop + the cart** — specialization's first rung (variety +
   housing tiers → Tier-1 specialists, arrive-and-emerge, the base-sustains-the-lineage rule) and
   the first accelerant (the cart, grain→granary; the drawing verb is *build a cart* / *designate
   a woodworking place*). The granary cat lands here as its decor.
4. **Housing quality tiers** (hovel/cottage/hall) — the gate the higher specialists need, the
   prosperity-decor canon made functional.
5. **The heavier accelerants + LIFT** — rollers/sledge for outsized blocks, windlass → the great
   wheel — as the castle's stone grows tall and heavy (carriage Phase 3, unlocked by the WOODS'
   oak standards).

## 10. Determinism plan + the instrument

Every new frozen field ships **two commits** (byte-identical inert record first, then the
attributable bump; baseline re-authored with its reason). The demographic, regrowth, and surplus
passes are new RNG consumers in the annual step — **isolate the demographic day on its own derived
stream (`seed + year`)** so people-churn doesn't cascade into the masonry baselines (roadmap §6,
the generational lens's own flagged risk). And the tool is part of the deliverable: a **headless
century-sweep** (100 years × N seeds, reporting demographic and production distributions) to tune
the surplus threshold and growth rates, the mortality curve and its variance, the regrowth clocks,
the specialization thresholds, and the accelerant multipliers — because every one of those is a
knob, and none can be tuned by eye on a 400-tick baseline.

## 11. Honesty flags & the verified anchors

**Dating risks carried into the design** (do not let these silently gate a mechanic):

- The **European Marriage Pattern** (late marriage, high never-married %, strict neolocality) is
  early-modern; 1200s marriage was *earlier* and near-universal — use the land-availability
  throttle, not a hard house-gate.
- **Dense specialization** is 1370s poll-tax (post-plague) — start sparse, thicken over
  generations.
- **12 standards/acre** is Tudor (1544) — concept, not number.
- The **treadwheel crane** is ~1225 France — an unlock, not a starting tool.
- The **ice-haul** ~7× is Chinese physics — the sledge mechanic only, never English practice.
- Holding/yield/density numbers are order-of-magnitude, popularized from Dyer/Bennett via
  secondary compilations; the virgate, the ~10-acre subsistence floor, and coppice-with-standards
  are the solid 1200s anchors.
- The **1.25× surplus** is a chosen knob (the boss opened at 2×), not a citation; the *direction*
  (sustained surplus → growth via fertility + migration) is solid Malthusian demography.

**Verified at source** (the sharpest): Smith's thesis + his village-smith/carpenter example
(econlib, *Wealth of Nations* I.3); coppice cants/rotations/first-season 1.5 m regrowth and the
near-immortal stool (Woodland Trust, Wikipedia, Durham WT, englandarchive); Hayley Wood 1356
sustained-yield and ~2.5 m³/ha/yr (PMC5424077); Baal Hill / the Prince Bishops' Weardale wood
(Durham WT); the virgate ~30 a feeding ~5–7 and Elton ~3.4 a/person, yields ~4:1, seed ~¼, the
~35/25/15 land split (Wikipedia open-field / agricultural-economics); household ~4.4–5.7, 1200s
marriage age, ~6–7 pregnancies→~2 survivors, free bench / flexible inheritance, heirless vacancy
(erenow *Peasants Making History*; acoup family-formation); the cart ~0.5–1 t, ox vs horse, the
treadwheel 14:1 / doubles-load / ~6 m/min / ~1225 (greatnorthroad, Low-Tech Magazine, Wikipedia);
the ice-haul 46 vs ~330 men / ~7× (PMC3864354); the fast-forward patterns (CK3 paradoxwiki, DF
announcement tiers, Timberborn weather cycle, Against the Storm frozen-impatience). Full digests
in the session's four research workflows.

## 12. Open questions — RESOLVED (boss, 2026-07-15: "complete the tasks that were scoped out")

The boss's directive to **build the whole ladder in order** settles the three that gated the first
hammer; all four are now decisions of record, revisable but not blocking:

1. **The name — keep *the living settlement*.** The doc anchors here; "the woods" stays the name of
   step 1, its first and load-bearing arc. (The systems don't change either way.)
2. **Build order — the §9 ladder in order, starting step 0.** Not "woods first then population"
   vs. "one coupled release" but *both, sequenced*: step 0 (the year clock + Sit-the-Season) is the
   prerequisite that makes any generational clock watchable, so it ships first and SIM-neutral;
   then step 1 THE WOODS (SIM 19); then step 2 the living population it is measured against. Each
   step is its own ship with a handoff + keystone between (the goal's own rule).
3. **Migration's source — the bishop's estates and the neighbouring manors,** bounded by **food
   surplus × housing capacity** (no separate hard cap in the early game; §4's two dials *are* the
   bound). A soft **reach** gate arrives only at the pyramid's apex (§5 — the horse-buyer's 300 km),
   never at the base. Revisit if the century-sweep shows runaway influx.
4. **Food variety — build the new farm types as variety tenants: horse pasture and an orchard**
   as part of step 3; the **fishpond is cut**. Crops, livestock, and fallow are shipped; horses +
   orchard are the new designations the pyramid's variety axis reads. (Further types — a mill, the
   wood-pasture/coppice — arrive with their own systems.)

---

*The stone was learning to be won, carted, and dressed; now the game learns what does the winning
and the carting and the dressing — a wood that heals as fast as you cut it, a people who are born
and buried on the record, a harvest that decides how many hands there are to lift a stone, and the
plain fact that a smith, a stool, and a family all keep only what you keep the ground alive
beneath. The cart on the grain road is the smallest thing in this bible and it touches all of it:
felled timber, a carpenter raised from a farmer's son, a full granary with a cat asleep on its
step. Lay the base course true and everything above it — the pyramid, the crane, the keep — has
something living to rest on. Build on.*
