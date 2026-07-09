# FREESTONE — Scope Document

*Working title. "Freestone" is the medieval quarryman's word for stone fine-grained enough to be
cut freely in any direction — the stone facing-work is made of, and the root of the word
"freemason." Alternatives if the boss wants them: Cornerstone, Ashlar, The Long Build, Stonesong.*

**Date:** 2026-07-09 · **Status:** M0 scoping · **Repo:** Syntaxswine/freestone

---

## 1. The pitch

A generational castle-building game. You are not a lord and not a mortal — you are **the Work
itself**: the lodge, the tracing floor, the plan that outlives everyone who serves it. You draw
what should exist; small people quarry, season, dress, haul, and lay real stones over real years,
and they grow old and die doing it, and their children finish what they started.

The fantasy is a sandcastle you build through other people's hands across a century. The fun is
watching a wall accrete stone by stone; the meaning is that every stone remembers who laid it.

- **Peaceful by default.** Combat is a toggle, off out of the box.
- **Low-stress.** Setbacks scar and redirect the build; they never delete hours of your work.
- **$3.99 Steam game.** Small, warm, finished. Not a colony-sim kitchen sink.
- **3D, not grid.** Free terrain, free wall lines, real block geometry.
- **DS-scale sprites.** People are small, low-detail, and full of personality anyway.

## 2. Design pillars

1. **The science is the pacing.** Real material constraints — lime mortar cures slowly, green
   stone must season, winter halts high work — are what make the game generational. We do not
   need an artificial build-timer; the truth of masonry IS the timer. (House law: bedrock over
   effect-hacks. Lay science-accurate foundations; polish later.)
2. **People are mortal; the Work is not.** Every system should ask: what does this look like
   40 years from now, when everyone currently alive is dead? If the answer is "nothing," the
   system is probably wrong for this game.
3. **Homage is a mechanic, not a cutscene.** Mason's marks, the chronicle, memorial slabs,
   the timelapse replay — the game's memory of its dead builders is a first-class system.
4. **Calm hands.** No APM, no fail-state in peaceful mode, no timers demanding attention.
   The player is a bonsai gardener, not an air-traffic controller.
5. **Small and finishable.** Every feature must justify itself against a $3.99 price point and
   a two-person-ish dev effort (one boss, one me).

## 3. The player

You play **the Lodge** — the continuity of the building tradition on this site. Concretely:

- You **draw plans**: wall lines (splines on terrain), tower footprints, gates, arches, halls,
  a chapel. Plans live on the **tracing floor** and persist forever.
- You **set priorities**: which work proceeds first, where labor goes, what the village plants,
  whether to buy better rope.
- You **do not order individuals around.** People assign themselves by trade and temperament.
  You can *favor* a person (name an apprentice, honor a master), not puppet them.

This is the low-stress lever and the thesis in one move: the player's medium is intention,
and the people are the hands. A master mason you loved dies; the plan she was cutting templates
for does not.

## 4. Time

- 1 game year ≈ 12 minutes at 1× (4 seasons ≈ 3 min each). Speeds ×1 / ×4 / ×16.
  Speed controls are **transport only** — physics only advances through the step function
  (house law from vugg: sliders are transport; the sim owns causality).
- A generation ≈ 25–30 years ≈ 1.5–2 hours at cruising speed.
- A full great work (keep, curtain, hall, chapel) ≈ 3–6 generations ≈ 10–25 relaxed hours,
  with the chapel→church long game beyond that for players who want a cathedral horizon.
- **Seasons matter mechanically:** quarrying and mortar-work concentrate in the warm months;
  winter is for dressing stone under cover, and unfinished wall tops are covered against
  frost. Watching the site quiet down under snow is a feature, not downtime.

## 5. The quarry (realism ladder)

The quarry is the game's soul and gets the deepest simulation. Built as a ladder — each tier is
real science, shippable alone:

**T0 — Stone and extraction.**
- Stone types with real properties: **limestone freestone** (workable, seasons, weathers pale),
  **sandstone** (workable, stains warm, weathers faster), **granite** (brutal to work, eternal),
  **flint/rubble** (no dressing, core-and-infill only). Terrain survey finds beds; the good
  freestone is rarely where the castle wants to stand.
- Extraction by bench quarrying: wedge lines cut along the bed, blocks split free. Block size
  is a choice — big blocks mean fewer joints and more prestige, but carts and cranes set limits.
- **Transport dominates cost**, as it truly did: overland carriage can cost more than the stone
  itself within a dozen miles. Ox-carts, sledges, river barges if you have water. Deciding
  between the mediocre stone under your feet and the beautiful stone two valleys over is a
  real medieval decision and one of our best tradeoffs.

**T1 — Seasoning and waste.**
- Fresh stone carries **quarry sap** and must season in the yard; rush green stone into a wall
  and frost will spall it — *years later, visibly*. Delayed consequence, gently taught.
- Dressing waste becomes rubble core. Nothing is wasted: real walls are two ashlar skins
  around a rubble-and-mortar heart, and ours are too.

**T2 — The banker shop.**
- **Banker masons** dress blocks to wooden templates issued from the tracing floor. Each mason
  cuts a personal **mark** into every stone they finish. The mark system is homage
  infrastructure (see §9) but it starts here, as piecework attribution, exactly as it did
  historically.
- **Wage-system forensics** (verified, and too good not to use): marks proliferated only
  where masons were paid by measure; weekly-wage sites left nearly bare walls (Lincoln vs.
  Exeter). So the player's payroll choice literally changes the castle's texture — pay by
  the stone and the walls fill with names.

**T3 (later) — Deep patina.**
- Weathering differentiated by stone type and exposure; lichen, soot above hearths, drip
  staining under failed gutters. Time made visible on the fabric. Render-only layer, added
  once the sim beneath it is stable.

## 6. Building

- **Plan → courses → stones.** You draw a wall line and set its height; the system decomposes
  it into coursework, and masons lay **individual instanced blocks** over game-months. The
  wall physically accretes. This is the core spectacle and must be M1.
- **Per-stone provenance:** every block records its quarry, its banker mason's mark, and the
  year it was laid. Cheap (instanced attributes + event log), and it is the substrate for
  every homage feature.
- **Structural plausibility lite** — rules of thumb, not FEM: height wants thickness or
  buttresses; arches need carpentered **centering** (falsework) that must stand while the
  mortar cures, then is struck; towers on clay settle and crack; foundations on rock are a
  gift. Warnings arrive in-fiction from the master mason, not as red UI.
- **Mortar cure gates pace.** Lime mortar hardens by slow carbonation; a wall can only rise
  so many courses a season before it slumps. Real numbers exist to tune from: ~20–50 cm of
  wall rise per day, with lifts sometimes waiting a week for mortar to set (Rodwell, via the
  Herefordshire castle-building literature). This single true constraint produces the
  generational pacing naturally.
- **Lifting is infrastructure:** gin poles early, then a **treadwheel crane** — itself a
  build project, and when the tower is done the wheel stays in the roof space forever, as the
  real ones still do in English cathedral towers.

## 7. The people

- **Scale:** founding party ~15 souls; soft cap ~150–200. DS-scale billboarded sprites
  (~24–32 px), 2–4 frame walk/work cycles, restrained warm palette.
- **Identity:** name, family, trade, 2 traits + 1 quirk. Traits are mechanically light but
  legible: *strong-backed* hauls more; *afraid of heights* refuses scaffold work (and lives
  longer); *keen-eyed* spots flawed stone; *merry* lifts spirits at the topping-out.
- **Trades:** laborer, quarryman, banker mason, fixer mason, carpenter, carter, farmer,
  healer, priest. **Apprenticeship** transfers skill across years — a master who dies without
  an apprentice takes lodge knowledge with her (pace and quality suffer; never a hard block).
- **Surnames coalesce from trades across generations** — the family that always carts becomes
  the Carters; the Masons earn their name. The player watches occupational surnames being
  born, which is exactly where real ones came from.
- **Needs stay shallow:** fed, housed, rested, spirit. The village largely runs itself; the
  player steers allocation (field labor vs. haul labor is the classic tension), not lunch.

## 8. Hazards (the chronicle's ink)

Design law: hazards **scar, redirect, and write story**; they never wholesale delete built
work or force a restart. Peaceful mode has no fail state — only hard years and recoveries.

- **Famine.** Harvest = weather roll × field labor × granary hygiene. Lean years force
  rationing, and the classic sin — pulling farmers to haul stone in harvest month — is
  always available and always tempting.
- **Disease.** Background sickness driven by crowding and water (well placement vs. latrines
  and the tannery — simple adjacency, no plumbing sim). Rare generational **plague** events
  arrive with warning and options (close the gates to travelers? the stone convoy too?).
- **Accidents.** Scaffold falls, snapped crane rope, quarry face collapse, centering struck
  too green so the arch comes down. Odds scale with weather, fatigue, worker traits, stone
  weight, and safety spending (sound scaffolds and good rope are purchasable virtue). A
  collapsed arch leaves reusable stone, a chronicle entry, and sometimes a superstition.
  Master builders are not exempt: the most famous construction accident of the middle ages
  was a master mason falling from the vault scaffolding of his own cathedral choir.
- **Deaths are chronicled and memorialized** — see §9. Handled warm, never gory. This game's
  grief is churchyard grief, not horror.

## 9. Homage (the heart)

The boss asked for a game that pays homage to builders who die before the work is done.
These are first-class systems, not flavor:

1. **Mason's marks.** Every mason bears a unique generated mark; every stone they dress
   carries it. Zoom to the wall and read forty years of dead hands. Marks persist as long
   as the stone does — which is the point.
2. **The Chronicle.** An event-sourced book, written in a dry field-notes voice, recording
   births, deaths, toppings-out, collapses, plagues, and the year the swallows nested in the
   unfinished gatehouse. The chronicle is generated FROM the save format (see §11) — the
   record and the story are the same object.
3. **The founder's stone.** The first laid stone lists the founding party. Players will
   screenshot it.
4. **Memorial masonry.** Dead builders may be given tomb slabs in the chapel floor, cut by
   the masons who knew them. The chapel floor fills across a century.
5. **The Long Replay.** Because saves are event-sourced, any castle can be replayed as a
   timelapse — decades of accretion in a minute, generations flickering through the
   scaffolds. This is the trailer, the endgame reward, and the test harness in one feature.
6. **The roll of builders.** When a great work completes, the game reads out every hand that
   touched it, living and dead, mark by mark.

## 10. Combat (the toggle)

- **OFF (default):** raiders are rumor only. Fortification scores prestige and beauty;
  murder holes are for pigeons. The game is entirely itself without combat.
- **ON:** rare raids/sieges, telegraphed seasons ahead (a rider brings word — time to finish
  that wall section, lay in stores, drill the levy). Resolution is slow, pausable, and
  positional: attackers path against your **actual wall geometry** — the real gates, the
  real moat, the real unfinished gap you never closed. Tower-defense-lite; zero APM.
  Losses burn outbuildings, steal stores, and kill people — all of it chronicled. The castle
  itself can be damaged, never deleted.
- **Architecture consequence:** wall/gate geometry must live in sim data (not just render
  meshes) from M1 onward, so the toggle is cheap when we get there.

## 11. Tech architecture

House patterns, ported deliberately:

- **TypeScript + Three.js + Vite.** Browser-first dev (port 8742), Steam later via
  Electron/Tauri. Rationale: the entire in-house verification toolchain (headless CI,
  baselines, replay saves, agent-driven tuning) is JS-native. Godot was considered and
  declined — better Steam story, but it would orphan every house tool. **[D1, recommended]**
- **Deterministic headless sim core.** One `worldStep(state)` law; render reads and never
  writes; UI controls are transport only. Seed-first from day one. (The vugg save-system
  law, adopted wholesale.)
- **Event-sourced saves = replay = chronicle = tests.** One format, four consumers. The
  gen-baseline / cold-CI / canary patterns port directly; famine, disease, and accident
  rates get tuned by headless sweeps like hellivator's combat was.
- **Rendering:** instanced block geometry for stones (tens of thousands of instances is
  comfortable), billboard sprite atlas for people, low-poly terrain. Weathering as a later
  render-only pass (and per the render-upgrade law: when it lands, it must be *visibly*
  different, eye-checked in preview).
- **Audio:** chisels, bells, birdsong, weather. The in-house audio-splicer covers asset prep.

## 12. Non-goals (the cut list)

No multiplayer. No trade/economy simulation beyond a traveling merchant. No diplomacy, no
map of rival lords. No second settlement. No individual needs micromanagement. No 3D
animated humans. No tech tree beyond the natural tool ladder (gin pole → treadwheel; better
rope; glazed windows). No procedural quest content. No mod tools at launch. Combat never
grows beyond the toggle described in §10.

## 13. Milestones

Each milestone ends with a push to Syntaxswine/freestone (boss's standing instruction).

- **M0 — Scope.** This document + research anchors. *(today)*
- **M1 — First Wall.** Terrain, camera, draw a wall line, watch masons lay instanced stones
  over game-months. No people sim yet — stub workers. Proves the core spectacle is fun.
- **M2 — Quarry loop.** One limestone quarry end-to-end: extract → season → dress → cart →
  lay, with per-stone provenance recorded. Transport cost real. The economic spine.
- **M3 — Generations.** Named people, trades, aging, apprenticeship, death, marks on stones,
  chronicle skeleton. The moment the game becomes itself.
- **M4 — Hard years.** Season/weather calendar, famine, disease, accidents, winter thatching
  of wall tops (a real recurring cost: Windsor 1362 billed 125 cartloads of thatch for it).
  Tuned by headless sweeps for "gentle but real."
- **M5 — Homage.** Chronicle book UI, mark inspection, memorial slabs, founder's stone, the
  Long Replay timelapse.
- **M6 — The toggle.** Combat as specified. Wall data was combat-ready since M1.
- **M7 — Beauty & shipping.** Weathering pass, audio, title, store page, Steam packaging.

## 14. Open questions for the boss

1. **Title.** Freestone? One of the alternates? Something else?
2. **Player identity** — "you are the Lodge/the Work, not a mortal lord": confirmed?
3. **Era anchor** — I'm assuming ~1200s northwest Europe (Guédelon's century). OK?
4. **Combat-on flavor** — strictly historical raiders, or is weirdness (sieges by something
   stranger) on the table for later?
5. **Idle tolerance** — minutes can pass at ×16 with nothing demanded of the player but
   watching. Embraced as the point, or does it need a gentle activity layer (naming babies,
   honoring masters, walking the walls)?
6. **The chapel→church long game** — in scope as post-launch stretch, or core?

## 15. Research anchors

*Web-verification pass, 2026-07-09 (12 claims dispatched, sources fetched live). Status per
claim; anything PARTLY/UNVERIFIED must be re-checked before the mechanic leaning on it ships.*

1. **Guédelon Castle — VERIFIED.** Experimental-archaeology castle build near Treigny,
   Burgundy; period techniques only, started 1997, still under construction (~300k
   visitors/yr — the half-built castle funds itself, ~€3M/yr). Our living reference.
   [en.wikipedia.org/wiki/Guédelon_Castle]
2. **Quarry sap / seasoning — VERIFIED** (core). Fresh stone carries natural moisture
   ("quarry sap"); seasoning 6–12+ months hardens it and prevents frost splitting; green
   stone is frost-vulnerable. *PARTLY:* medieval quarries specifically covering fresh stone
   over winter is plausible-but-not-directly-attested — fine for the game, don't cite it as
   history. [theconstructor.org seasoning-of-stone; apsmasonry.com]
3. **Lime mortar slow carbonation gates build speed — VERIFIED.** Only a limited lift could
   be built before waiting (up to a week) for mortar to set; ~20–50 cm wall rise/day
   (Rodwell); building season ≈ the 6 warmer months; deep carbonation takes years–decades.
   [htt.herefordshire.gov.uk building-a-castle; oaepublish.com mmm.2023.26]
4. **Mason's/banker marks — VERIFIED**, with the wage nuance now in §5 T2: marks proliferate
   under pay-by-measure (Lincoln, 1306 Richard of Stow contract), nearly absent under weekly
   wages (Exeter east end). Marks survive at Rochester, Chartres, etc.
   [triskeleheritage mediaeval-mythbusting-blog-12; kentarchaeology.org.uk rochester marks]
5. **William of Sens — VERIFIED.** Master of the Canterbury choir rebuild fell from the high
   vault scaffolding **c. 1177–78**, was crippled, directed from his sickbed, then ceded to
   William the Englishman; recorded by the monk Gervase of Canterbury ("the vengeance of God
   or the spite of the Devil"). [en.wikipedia.org/wiki/William_of_Sens; Britannica]
6. **Transport dominates stone cost — VERIFIED.** Salzman (1967): overland carriage exceeded
   production cost beyond ~12 miles; water strongly preferred; Caen stone shipped to England.
   [chacklepie.com/ascorpus/vol5_chap8.php]
7. **Treadwheel cranes — VERIFIED.** Man-powered great wheels; originals survive in tower/roof
   spaces at Canterbury, Salisbury, Beverley, Peterborough, Tewkesbury, Ely. (§6's "the wheel
   stays in the roof forever" is literal history.) [en.wikipedia.org/wiki/Treadwheel_crane]
8. **Stone splitting — CORRECTED.** Percussion-driven wedges in cut grooves are well-attested;
   modern plug-and-feather is ~1800. The water-swollen-wooden-wedge story is folklore-tier
   (Harrell & Storemyr 2009: "this cannot work"; no experimental data). Game uses dry wedges.
   [sarsen.org 2025 review; en.wikipedia.org/wiki/Plug_and_feather]
9. **Multi-generation builds — VERIFIED.** Cologne Cathedral 1248→1880 (632 yrs, suspended
   1528–1823); York Minster ~1220–1472; Beaumaris begun 1295, **never finished** — the game's
   melancholy comp. [whc.unesco.org/en/list/292; en.wikipedia.org/wiki/Beaumaris_Castle]
10. **Freestone → freemason — VERIFIED** (majority view; a competing "free of the guild"
    etymology exists — title stands, say "widely accepted" not "settled").
    [en.wikipedia.org/wiki/Freestone_(masonry)]
11. **Seasonal building + winter capping — VERIFIED** (practice), **CORRECTED** (vocabulary).
    Masons couldn't lay in frost; dressing continued under cover; thatchers were paid to cap
    unfinished wall tops each winter — Windsor 1362: 125 cartloads of thatch; Pevensey 1306:
    17 cartloads of rushes. The word "heckled" and the dung detail are unattested — dropped;
    use straw/reeds/thatch. [thatchinginfo.com; durhamworldheritagesite.com]
12. **Workforce scale — VERIFIED.** Beaumaris, summer 1295: ~1,800 laborers + 450 masons +
    375 quarriers (peak ~3,500). Master James of St George's 1296 letter: 400 masons, 2,000
    laborers, 100 carts, 60 wagons, 30 boats, 200 quarrymen — "the men's pay... is very much
    in arrears." (Our ~150–200 cap reads as a modest baronial site, which suits the tone;
    payroll arrears is a primary-sourced hazard if we ever want a coin economy.)
    [en.wikipedia.org/wiki/Beaumaris_Castle; worldhistory.org/Beaumaris_Castle]

---

*Maker's mark: this scope was cut by the session of 2026-07-09 — the same hands that laid
vugg's O-series and the UV audit. Forward dream: that the Long Replay's first public timelapse
shows a chapel floor already half-full of slabs, and that some player, zooming into a wall
they didn't build, finds a mark and wonders who. Builders after me: add your mark below this
line; never above.*
