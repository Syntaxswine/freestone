# ROADMAP — THE GENERATIONAL FACTORY (the step-back scoping)

*2026-07-14 · a scoping document, not code · Castle Cultivator (repo codename `freestone`)*

The boss asked for the step back: *"scope out ways to improve the game and move it towards the
goal of a generational factory castle maker."* This document is that scoping — produced by a
13-agent pass (2 codebase/docs censuses, 4 web-research agents verifying sources by fetching
them, 5 independent design lenses producing 43 candidate directions, 2 adversarial critics
judging every one against the house laws and the fun/scope tests), then synthesized. It plays
the role for the whole game that PROPOSAL-LOGISTICS played for the carriage layer: the master
plot the next several arcs hang from. Nothing here is code. The boss steers; this is the map.

---

## 0. The one-line thesis

**The generational clock is the anti-stasis mechanism the whole builder genre is missing — and
this game already owns the deed to it.**

The verified genre post-mortems all fail the same way: Banished is "a great game for the first
15 hours" and then "your town is essentially indestructible... routine" — the production web,
solved once, never re-opens. Manor Lords' critical consensus: "there just aren't enough
production lines or tiers to keep you occupied beyond a few in-game years." Manor Lords has **no
aging at all** — families are frozen three-person workforce units. The factory genre's own
canon (Factorio FFF-309) says a system stays interesting only while it pays real costs in space
and time.

The three words of the boss's goal are not three features — they are **one mechanism**:
generational clocks (coppice regrowth, masters aging and dying untaught, mortar curing,
fabric weathering) are what **re-open a solved factory without deleting work**, and the castle
is the artifact that accretes meaning from each re-opening. A dying master mason leaves a
*technique-shaped hole in the production chain* — Massive Chalice's verified design lesson
("the sniper-shaped hole in your squad... forcing players to adapt was the number one goal
of the aging system") fused with the honest stall we already ship. GENERATIONAL is the factory's
renewal mechanism. FACTORY is the generation's meaning. CASTLE is the ledger both write into.

Nobody in the genre does this. That is the game.

## 1. Where we stand (the census)

**Built and live (SIM 18):** the stone chain three phases deep — WIN (water-gated quarry off a
real bed model) → HAUL (route-frozen cart rates, per-wall face buffers) → DRESS (rubble/
scappled/ashlar lay-debt + haul-weight) → LAY (consumption, honest stalls, the bottleneck
line). Enclosure grammar, designation word-cards, level coursing, gates/ramps/fills/roofs,
front door + mining tutorial. 139 tests, determinism baseline, event-sourced saves with
replay===live proven.

**Render-only (not yet sim):** trees (16,872 placed by slope), seasons (field tints),
**people** (pure theater — no individuals, no aging, no names in the record beyond four
founder stubs).

**Promised, unbuilt:** LIFT / seasons+mortar / landing (carriage 3–5); M3 generations; M4
granary year; M5 homage; the technique system (wishlist CORE); the wall ladder (thickness/
wythes); the adit's UI. **And the silent gate: save/load is spec'd stubs only — SCOPE §4
prices a great work at 10–25 relaxed hours, which is arithmetically impossible without
persistence.**

**The architecture is ready.** The census confirmed every seam: `Person[]` is already hashed
sim state with id/name/trade/pace; `PlacedStone.masonId + tickLaid` already binds every stone
to a hand and a day (write-only today — nothing reads it); `TICKS_PER_YEAR`/`SEASON_LENGTH`
are exported constants waiting for a consumer; the stockpile pattern (reservoir + metered
transfer + constant-table draw) is the template every new chain copies; `layStones` carries
the literal comment "the WOODS aren't a cost yet" at the exact seam timber plugs into;
`GROUND_MATERIALS` already holds limestone and coal ("fuel, not stone — a later resource").
The game has been quietly pre-paying this roadmap for weeks.

## 2. What the research verified (the sharpest anchors)

*Fetched and confirmed at source by the research fleet; full citations in §7.*

**Generational precedents.** Massive Chalice: turnover is fun when it forces adaptation,
punishing when it's bare subtraction; softeners are heirloom objects + a mentor channel (our
marks + apprenticeship, already canon). It deliberately HID genetic detail to prevent eugenics
min-maxing — keep our people-legibility coarse. CK2: "the dynasty is what you really play" —
our Lodge-as-player already is this. Against the Storm: "the city is your avatar," and a
settlement ends at ~2 h *at the moment of mastery* — a generation should close with a
harvest-like beat, not drift. Wildermyth: attachment to procedural people breaks on "acting
out of character" — **the record on screen must never contradict the sim** (when a named mason
dies, his sprite must stop appearing). Banished's two named failure modes to design against:
cohort death-waves the player must actuarially hand-manage (stagger lifespans from commit one)
and aging-without-legacy reading as chore.

**The medieval building economy.** The building season is real and mortar-shaped: Candlemas
(2 Feb) to All Saints (1 Nov), because non-hydraulic lime mortar dies in frost; unfinished
wall-heads were straw-capped for winter. Walls rose 20–50 cm/day with cure pauses — tall walls
are slow even with infinite stone. Lime is a genuine mini-factory: ~2 t limestone → 1 t lime
per fuel-hungry multi-day burn (experimental archaeology: ~300 kg wood per 1,000 kg charge,
partial calcination common) — and burning **sea-coal for lime is THE attested 13th-century
coal use**: our transcribed coal seams are the kiln's second fuel, so the mining arc pays
twice. The smithy is a maintenance loop, not a producer: Guédelon runs 4 smiths per 16 masons,
Vale Royal 7 per 40 — ~1:4–6, mostly re-steeling and sharpening. Transport dominance now has
teeth: Caernarvon 1285–6 paid £535 carriage on £151 of materials; Vale Royal employed **more
carters (33) than masons (40)** hauling 30+ cartloads/day over 9 miles; land:river ≈ 3:1 per
ton-mile. Putlog scaffolds cost little timber — **the wall carries its own scaffold**, and the
filled sockets are how archaeologists date walls today.

**The woodland (feeds PROPOSAL-WOODS directly).** Coppice rotation is set by the *product*:
hazel ~7–8 yr (hurdles), oak/hornbeam 15–25 yr (fuel/materials), oak standards for structural
timber grown *through* several coppice cycles — a 1544 statute fixed 12 standards per acre.
A cut stool throws ~1.5 m of regrowth in its FIRST season (regeneration is visible fast; the
harvest is what takes years). Yields were low and honest: ~2.5 m³/ha/yr. **Sustained yield was
an explicit medieval concept**: the 1356 Hayley Wood survey records "of the underwood there
can be sold every year, without causing waste or destruction, 11 acres" of 80 — a built-in
sustainable-harvest cap, in period language. Rackham's evidence (unverified-at-source but
consistent): medieval frames used mostly SMALL trees (~9–15 in) — so ~50-year standards
suffice for crane and roof timber; no 800-year oaks required. Felling is winter work
(dormancy), so THE WOODS wants the season derivation from day one. When local wood ran short,
the historical fallbacks were peat, imports — and Newcastle sea-coal, i.e. **timber scarcity
historically routed into exactly the coal seams we already model.** A "Forest of Weardale"
is documented in Durham records.

**Factory design at hand-labor scale.** Factorio FFF-363: machine status in tooltips went
"basically unnoticed by everyone" — **status must live ON the entity** (a dry pile must LOOK
dry; a waiting mason leans on the wall; the crew theater IS the diagnostic instrument).
FFF-309: never ship the optimal plan as a button (smart defaults yes, auto-planners no — the
dress dial got this right). The genre's pleasure: "the factory is always talking" — watching
the failure teaches the fix. Manor Lords proves slow ox-logistics pays off as *sense of place
and watchable labor* — the automation-dopamine substitute at our scale. Songs of Syx / Shining
Rock: the player is a planner; mastery is building systems that no longer need you. Workers &
Resources' warning: maximal logistics honesty without onboarding reads as hostility — every
new chain needs its mining-tutorial moment. Ostriv (realism-first) still converged on named
alerts: realism does not exempt a game from naming the stall.

## 3. The plan — six beats

Merged from both critics' sequencing (they agreed almost line-for-line), honoring the
boss-picked WOODS as next and the refactor-vs-content house rule. Costs: S/M/L per item;
each beat is roughly an arc of the size we've been shipping.

### Beat 0 — THIS WEEK, before a line of WOODS code: **One Clock**
A constraint, not a feature, and it expires if unwritten: define the generation (25–30 y) and
the coppice rotations on the SAME `TICKS_PER_YEAR` arithmetic, and write PROPOSAL-WOODS with
Person-aging as an explicit sibling. Every long-clock system states its duration in the
other's terms — "the wood you felled for the crane will stand again in your grandson's time."
Two timber classes fall out of the verified silviculture: **underwood/poles** (~7–20 yr —
scaffold, hurdles, fuel, charcoal) and **oak standards** (~50 yr — the crane's great timbers,
roof beams). A fuel coppice regrows inside one lifespan; the standards are a two-generation
decision. One mental model for long time, learned once. *(Cost: a paragraph. Risk: only that
it's skipped.)*

### Beat 1 — THE WOODS (SIM 19, boss-picked)
Promote the render trees into sim **stands** (cants), not individuals: `plan_fell` freezes
`timberTotal` + regrowth clock at the boundary, exactly as `plan_cut` does. Two stocks on two
clocks (poles/standards); the Hayley-Wood sustainable-harvest read on every stand ("of this
wood, N acres a year without waste"); over-cutting scars — a line inherits bare ground and a
dated ledger line ("felled Year 12; hazel returns Year 19; oak, Year 74"), never a fail. Ship
WITH: the winter-felling season slot (season = pure function of tick — the two-stroke's first
half, zero new state), the countdown/return ledger lines, and the chronicle celebrating the
Year-19 return (a 20-year clock inside one session is invisible without its readouts — both
critics flagged this as minimum-ship, not polish). The research gift nobody ordered:
**wood-pasture vs enclosed coppice as a designation word-card** — the shipped designation
grammar receiving its next tenant for free. *(M. The first generational mechanic in the game,
arriving through the factory door.)*

### Beat 2 — the memory suite (render-only, ZERO baseline moves, parallelizable with Beat 1)
Everything already recorded, finally readable. **One merged inspection system** (three lenses
pitched it independently): click a stone → field-guide card (hand, day, dress, later bed);
click a structure → its biography (begun Year 3, 412 stones, the gate walled up Year 22);
mason's mark glyphs (deterministic compass-and-straightedge from the id) drawn on the CARD
now, on stone faces later behind a zoom-LOD; **marks only on ashlar** — historically right,
and it retroactively deepens the shipped DRESS dial (paying for ashlar buys names in the
wall). Plus: the **founder's stone** (first stone of the first wall, slightly proud,
inspection lists the founding party — already named in world.ts); **campaign patina**
(per-instance color by `tick − tickLaid`: construction campaigns readable as banded lifts —
buildings archaeology for free, designed as M7 weathering's first rung); **tracing-floor
ghosts** (prior-era plans render as dimmed scratches under fresh lines — the palimpsest law
made visible; plans have been permanent since SIM 12 and the player can't see it). *(All S–M,
no SIM bump anywhere. This is what makes generation-1 play retroactively meaningful before
anyone dies.)*

### Beat 3 — attention + time infrastructure (before anyone dies)
- **The Lodge Book — save/load V0. THE GATE.** Autosave every season to IndexedDB + export/
  import a `.lodge` file + "open at the latest bell" on the home screen. Both critics
  elevated this to "not a feature, a gate": fifty-hour generational play is physically
  impossible today, and save.ts + the home-screen stubs already exist. Plain save first; the
  load-screen year-scrubber (the Long Replay's first face — never a second timelapse system)
  second, gated on hash-verified keyframes. *(S for V0.)*
- **The Annal — Chronicle V0.** ONE derivation module over the existing SimEvent stream, one
  page per year, dry annal voice (the genuine ~1200s form), notability filter that dares to
  leave quiet years nearly blank. It absorbs (the critics were unanimous): the year page, the
  season reckoning, **years-with-names** ("the Year of the Long Stall" — logistics disasters
  become proper nouns; graceful fallback to plain numbers), and chronicler-attribution fields
  (pennies now, the clerk's changing hand at M3). The shipped events already make literature:
  "the west wall stood forty days for want of stone." Built BEFORE mortality so deaths land
  in a book that exists. *(M — the voice is the work; one voice module shared with the
  biography cards or the register fractures.)*
- **The Bell + Sit-the-Season.** One event-tier table, two consumers. TOLL / CHIME / SILENCE,
  hard no-toasts rule; clicking the bell jumps to the cause and names it. "Sit the season":
  run at max until an interrupt fires (bottleneck flip, rejection, completion, death, season
  boundary) — the button says what it's waiting for. Converts "diagnosed once then watched"
  head-on: a 25-year generation compresses to ~20 minutes of honest decisions. Sliders stay
  transport; interrupts derive render-side from shipped events. Plus the wishlist's
  **construction chime** (ambient tap-tap-tap thickening with crew, going quiet at a stall —
  the honest stall reaching the ear before any panel opens). *(S–M.)*

### Beat 4 — THE SPINE (one batched SIM bump — the moment the game becomes itself)
The fun/scope critic's sharpest catch: eight separate "two-commit discipline" pitches =
eight re-baselines; **batch the spine as ONE bump.** In it:
- **The Mortality Pass**: one demographic day per year in worldStep's daily order — birthTick,
  seeded survival on an age curve with variance baked in from commit one (the Banished
  cohort-wave lesson), arrivals at a slow seeded trickle. People stay theater EXCEPT that they
  are born, work, and die on the record. Every labor loop already iterates `state.people` —
  production breathes with the roster for free.
- **Coarse skill bands + the apprentice bond**: green/journeyman/master (~15–25% total
  spread — the house-soul critic is right that a smooth XP curve is a shadow tech tree;
  knowledge lives in NAMED things), and `name_apprentice` — the one person-lever SCOPE §3
  allows (favor, not puppet).
- **The First Technique**: the namesake system seeded at minimum scope — ONE token ("the true
  ashlar hand": holder lays ashlar at 1.5 lay-debt instead of 2.0), transmitted only through
  the bond, dies untaught, and the bottleneck line names it: "LAY slow — Alwin died
  unteaching." One token, one number, one death is the whole proof. Resurrection from the
  tracing floor stays M5 — the death it resurrects has to happen first.
- **The funeral protocol**: on death the site rests a day (capped one/season — burials
  waited), the chronicle writes, and a mason's bound apprentice lays the master's next stone
  in her hand — **the dual-id stone, the master's last beside the apprentice's first**:
  succession as literal masonry. Death is ink, never a penalty function.
- **The Testament**: at succession the Lodge writes ONE line of intent into the book (a
  command, deterministic, replayed); the next succession reads it back verbatim over the
  funeral. Player-authored goals at near-zero content cost — the reason to return for
  generation 5 is your own promise, waiting.
- **The clerk**: role flag + succession riding the pass; ages visibly in the corner —
  the player's gut-calibration for how long a generation IS. (Steal its trick for everyone:
  age-tinting all folk sprites by birthTick makes the whole village a clock.)
- **Sprite-to-person binding** (the house-soul critic's catch): the day a named mason dies,
  HIS sprite must stop appearing — Wildermyth's law; shipping mortality without it
  contradicts the record on screen.
- **The century-sweep tool**: headless 100-year × N-seed runs reporting demographic/
  production distributions — mortality curves, skill spread, and funeral clustering are
  untunable without it, and the house law says the tool is part of the deliverable.
- Data-layout riders (HANDOFF-FOUNDATION §5 discipline, pennies now): householdId /
  house-binding fields, surname-coalescence record (the Carters christened only after 2+
  generations of trade persistence), chronicler attribution.

*(The big one — L in aggregate, ONE re-baseline. Every death lands in an existing book, tolls
an existing bell, on a player who has already read dead hands in stone.)*

### Beat 5 — the demand wave (the castle bump)
- **The Wall Ladder** (boss canon, the highest-leverage castle feature): thickness/wythes on
  WallPlan + the slenderness refusal voiced in-fiction ("that height wants three feet of
  wall") — a DEMAND explosion, not a new system: every shipped chain finally strains.
  Single-wythe stays the protected byte-identical default (all current calibrations were
  tuned at 0.3 m).
- **SPOIL** (grep-the-tree: WIN and DRESS constants already imply the waste tonnage): a
  second low-grade reservoir feeding fills, causeway cores, and wall HEARTING — the real
  rubble core between ashlar skins; auto-spent, never hand-placed. Lands WITH the ladder,
  where it bites. (Render heaps can ship earlier, cheap.)
- **Lots — provenance through the pile** (two lenses found the same leak independently):
  FIFO lot-quantities tagged {source, bed} through stockpile → face → stone. The inspection
  card gains its best line, and **bed exhaustion becomes visible in the fabric — a tint band
  mid-wall where the old cut worked out**: a generation boundary readable forever; the castle
  as geological map of its own making. Lot-quantities, never per-stone through the pile.
- **Ditch and Bank**: one plan, two coupled earthworks (conservation of dirt — motte-and-
  bailey IS this coupling). The Durham answer is irresistible: the Wear moats three sides
  free, so ONE ditch across the neck completes the enceinte — the site teaches castle
  geometry by refusing to need more. **Spike the terrain-concavity render first** — a ditch
  that reads as a texture smear betrays the LiDAR honesty. Also the panel's only new DRAWING
  verb (see §4).
- **The economy core** rider (skimped core bulges on your heir — the DRESS dial's dark
  sibling): data shape lands with the ladder; the choice surfaces only once an honest
  temptation exists (two works competing for scarce stone).

### Beat 6 — the converter, the crane, the keep (the horizon)
**Phase 4 wearing its true name**: the coal-fired lime kiln (the first *transformer* node —
limestone + WOODS fuel OR seam coal → batch burn → lime → mortar; LAY draws mortar per dress
class; the building season frost-gates it; the same cross-section read now finds stone AND
kiln fuel, so the adit earns its second reason). The winter two-stroke's full amplitudes
(stock-ahead-of-the-flip — a decision whose right answer changes with the calendar, forever).
**LIFT** (Phase 3, unlocked by WOODS): windlass floor, commission-a-crane costing a prior
generation's oak standards, the `maxBlock` weight ceiling where heavy ashlar bites a second
way. And **the Keep as north star, not a work item**: one tower, three generations —
undercroft → floor + crane raised → great chamber → battlements — the integration test of
everything above. Its function TODAY is the checklist question both critics endorsed: *does
this feed the keep?*

## 4. Standing rules this scoping surfaced

1. **The pencil must not starve.** The panel produced ~40 readouts and exactly ONE new
   drawing verb (the ditch). The player's creative verb is drawing plans; readouts make the
   castle meaningful, verbs make it grow. **Every arc ships at least one new plan type.**
   (Candidates queued: ditch/bank, the fell gesture, the kiln, the landing, bridge, well,
   dovecote-scale small works.)
2. **Batch SIM bumps.** Eight polite little bumps = eight re-baselines + eight RNG-cascade
   audits. The spine is one bump; Lots rides the ladder's bump.
3. **Status lives ON the entity** (FFF-363, verified): the crew theater is promoted from
   decoration to instrument — a dry pile looks dry, a waiting mason leans, a dull chisel
   chips slower. If a state can't be seen at the site, it isn't shipped.
4. **The mutual-aid half of M4 is design-primary.** The house-soul critic's hardest finding:
   the civic thesis got colonized by the factory — five lenses, zero ideas for gleaning,
   famine relief, the widow's portion, the granary as why people STAY. "Grain is the payroll"
   has the right math and the wrong soul: the granary keeps people because it keeps THEM;
   the roster valve is *who the community can carry*. Write M4's proposal from the commons
   side first, the economics second.
5. **One chronicle-voice module.** Five pitches independently budgeted prose templates; write
   the voice once (Annal), let every surface (cards, biographies, epithets, testaments) read
   from it, or the register fractures.
6. **Each new chain gets its onboarding moment** (the Workers & Resources warning): WOODS,
   kiln, and mortality each extend the tutorial checklist when they land.

## 5. Cut / parked ledger (with why)

- **Weathering-as-sim / the pointing round** — the chore trap by its own admission; campaign
  patina delivers ~70% of the visible-age fantasy at S cost, render-only. Revisit at M7 where
  it was always scheduled, after mortar makes "repoint vs rebuild thicker" a real decision.
- **Charters / license to crenellate** — quest-smell risk, L content cost, needs a citation
  pass; the Testament gives sandbox-averse players a spine for free using their own words.
  One line kept in the M6 notes (the Bishop of Durham as palatine authority is genuinely the
  local constitution — a fine late-game texture).
- **Ride the Cart** — value hostage to route-render density that doesn't exist; the concept
  survives as one line in the LIFT plan (the camera rides the crane's first lift).
- **The hollow-way rate rebate** — the LOGISTICS proposal already declined roads once for
  spreadsheet risk; the *render* memory (corridors visibly wearing into sunken lanes) may
  ship cheap whenever; the re-survey rebate waits for demonstrated replanning appetite.
- **The master mason's appraisal** — deferred until ditch + ladder give it a pencil to point
  at; its best beat ("the gap by the old cut has stood unclosed nine years") folds into the
  Annal as a standing-errand line.
- **Mural circulation** — a design note in the Wall Ladder proposal; the graph read
  fast-follows wythes; walkable interiors wait for the Keep arc.
- **Smith's EDGE** — good anchor (1:4 smiths:masons), reshaped to discrete legible states
  (keen/dulling/dull, honest 0.7× floor) and gated on its visibility channels existing;
  sequenced after WOODS (charcoal) + the works ledger. An invisible multiplier is the tax
  this game exists to refuse.
- **Hearths/households as live sim** — fields land with the spine (pennies); the living
  feature waits for M4 where a hearth is the granary's demand unit.

## 6. Open questions for the boss

1. **Sequencing consent.** WOODS is yours and stays Beat 1. The scoping says the spine
   (mortality + apprenticeship + first technique) is the single highest-value SIM arc after
   it — earlier than the M3 slot the old milestone ladder implied. Comfortable with people
   dying that soon, given the funeral protocol ships in the same bump?
2. **Generation length.** SCOPE §4's 25–30 years ≈ 1.5–2 h at cruising speed predates
   Sit-the-Season. With interrupts compressing dead air, a generation could run shorter in
   felt time. Does ~20 minutes of decisions per generation sound right, or do you want time
   heavier than that?
3. **The over-cut scar.** How bare may a line's inheritance get? The proposal's instinct:
   bare ground + a dated ledger line + slow natural reseed (decades) — recoverable, never
   punitive. Confirm the tone.
4. **Save format promise.** Once the Lodge Book ships, saves become something players keep.
   Are we ready to promise save-forward-compatibility from that point (replay guards
   SIM-version already), or do we reserve the right to break saves until some later flag day?

## 7. Verified sources (fetched by the research fleet)

Precedents: Game Developer on Massive Chalice's bloodline system; Game Developer on CK2's
design; Game Developer on Against the Storm; GDC Vault #1027614 (Wildermyth, emotional
investment in procedural characters); technical.ly interview with Tarn Adams; Wikipedia +
Steam community threads on Banished's aging/cohort waves; indiegamepicks interview with Jake
(Songs of Syx); TheGamer on Manor Lords population mechanics.
Medieval chains: Herefordshire Through Time (lime kilns; Caernarvon carriage £535 vs £151
materials); EXARC experimental lime burn; buildingconservation.com (lime basics); April
Munday, *A Writer's Perspective* (building season Candlemas–All Saints; land 1.5d vs water
0.5d per ton-mile; packhorse/cart/ox day-rates); Building.co.uk on Guédelon (crew: 16 masons,
4 smiths, 7 carpenters, frost shutdowns); Wikipedia + British History Online (Vale Royal
accounts: 35,000 cartloads, 33 carters vs 40 masons, per-journey cartage prices); Wikipedia
(putlog holes); tracingthepast.org.uk (centering reuse, stonelaying labor mix).
Woodland: Woodland Trust + NCFED + Wikipedia (coppice rotations by species, 1544 twelve-
standards statute, first-season regrowth); PMC5424077 (medieval yields ~2.5 m³/ha/yr; Hayley
Wood 1356 sustained-yield survey; rotation lengthening over centuries). Marked unverified:
Rackham small-timber counts; Weardale forest records; sea-coal fallback (medievalists.net);
Guédelon forge details — **each must pass the citation ritual before gating a mechanic.**
Factory design: Factorio FFF-309, FFF-337, FFF-363; Game Foundry genre analysis; Shining
Rock devlog (Designing the AI); The Game Fanatics (Banished review); PCGamesN (Manor Lords
review); Wikipedia (Workers & Resources); GameRant (Satisfactory CEO interview); Ostriv
devlog.

---

*The step back shows one shape. The factory is three phases deep and honest; the memory is
recorded and unread; the people are painted and unborn; and the clocks that would make all
three one game are exported constants nobody consumes yet. The next courses don't add a genre
— they wind the clocks: the woods first (the boss already chose it, and it smuggles the year
into the sim through the factory door), then the readers of the record, then the gate of
persistence, then the spine of mortal hands. A wall is already a ledger of days and hands
that no one can open. Open it, and every stone laid since M1 becomes the first generation's
testimony. Build on.*
