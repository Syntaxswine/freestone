# CASTLE CULTIVATOR — Scope Document

*Title chosen 2026-07-09: **Castle Cultivator** — castle = mutual defense, cultivator =
mutual aid; you grow a castle rather than command one. The development codename "freestone"
(the quarryman's word for stone that cuts freely in any direction, root of "freemason")
survives in the repo and directory name until a rename is worth the link churn.*

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
- **The granary is the heart.** Government has two functions — mutual aid and mutual
  defense — and the granary embodies both: it answers the lean years, and it answers the
  siege. The village's first monumental work is a barn, not a keep.
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
6. **The granary is the government.** Mutual aid and mutual defense are the two functions of
   the commonwealth, and every civic mechanic must trace to one or both. The granary serves
   both at once, which is why it comes before the keep — aid before defense, in build order
   as in principle. (History's honest footnote, kept deliberately: institutional famine
   relief was rare in our era — relief was personal charity, like Charles the Good feeding
   Flanders in 1125. The game lets the village *institutionalize the ideal*; that is the
   fantasy, and we know it.)
7. **Beauty is in everyone's hands.** The player composes the great work; the people compose
   small works — a garden, a whittled boat, a daisy wheel scratched by the chapel door. The
   game never scores beauty and never announces it. Prosperity's true meter is what people
   make when no one commands them, and you learn it by walking.

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

### 5a. The site is real

Boss directive, two rounds: build on a real, extensively surveyed location — woods and
quarries near a castle site — and the discriminator is **subsurface truth**: core samples
and borehole data, not just LiDAR (LiDAR is uniform across England anyway).

**The data reality first** (fourth research pass): BGS serves 1M+ scanned borehole logs,
free to download under OGL — but they are raster scans of paper logs (hand-transcription
required); machine-readable AGS boreholes are rare (~10k nationally); detailed urban 3D
models exist only for London/Glasgow/Cardiff/Liverpool (viewer-free, download licensed —
though the viewer's *synthetic borehole* tool is exactly the query primitive our bed sim
needs, and a free UX reference). The Mining Remediation Authority's abandoned-mine
catalogue is a free GeoPackage. Physical core lives at the BGS National Geological
Repository (250 km of core; public open days). Same-size ~7 km boxes, queried live against
the BGS OGC API (2026-07-09):

| Site | scanned logs | AGS digital | stone on-site | water | medieval paper trail |
|---|---|---|---|---|---|
| **Durham** | 1,598 | 0 | ✅ Low Main Post | ✅✅ Wear gorge + mills | ✅✅ Boldon Book, Priory |
| Dudley | **7,079** | 0 | ✅ Wenlock reef limestone | ❌ hilltop, no river | thin |
| Nottingham | 2,470 | **93** | ❌ Castle Rock isn't building stone | ✅ Trent | ✅ royal castle, forest law |
| Kenilworth | 989 | 0 | ✅ Kenilworth Sandstone | ✅✅ buildable mere | ✅✅ our corpus |

**Recommendation: Durham** (Q8 to confirm). No site wins everything; Durham wins the game
we're making:
- **The beds have names, and miners named them**: the cathedral stands on the *Low Main
  Post* — "post" is the Durham pitmen's own word for sandstone, and beds are named for the
  coal seam beneath them (Low Main, Maudlin, Hutton). Our bed-exhaustion sim can speak the
  local dialect verbatim. The strata dip gently east — real geometry for the quarry game.
- **Bed exhaustion has a documented afterlife on this exact site**: the medieval Elvet Banks
  quarries, worked out, became the city's rubbish dumps and are now invisible under
  picturesque woodland — and quarrymen's tool grooves are still visible in the Low Main Post
  cliff by the river path. Our T3 patina arc, already performed by history.
- **A sacred forbidden bed**: the monks burned local coal but banned mining beneath the
  cathedral — the seam still sits intact under the peninsula. A real management decision we
  inherit as a mechanic.
- **Water and mills are superbly documented**: the Wear's incised meander is a natural moat
  on three sides, and the Boldon Book (c. 1183) attests the Bishop's Mill and its fellows
  at the weirs — the best-papered water infrastructure of any candidate.
- **The fantasy already happened here**: first stones 11 August 1093, cathedral essentially
  complete in ~40 years, stone dressed at the quarry because carriage was the cost, masons
  standing down each winter for the frost. Durham is our game played once, for real, and
  the fossil delight survives too — the cathedral's black *Frosterley Marble* columns are
  packed with visible corals, so zooming the walls still finds ancient life in the stone.
- **Caveats on record**: quarry provenance is traditional ("thought to be" Kepier), not
  petrographically proven; today's gorge woods are largely 18th-c. regrowth (ancient
  woodland survives at Frankland, downstream); no confirmed BGS 3D city model (worth an
  email); a small city sits on the peninsula — de-modernization pass, as anywhere.

**Runners-up, honestly**: **Dudley** is the pure-data maximalist (7× Kenilworth's boreholes,
a castle built of fossil-reef limestone in a UNESCO Geopark, 13th-c. deer-park landscape) —
but it's a dry hilltop, and a granary-and-mill game without water is missing a limb.
**Nottingham** uniquely offers machine-readable AGS data plus ~1,000 recorded man-made caves
in carvable sandstone — but Castle Rock is friable non-building stone (the medieval castle
was built of stone brought in), which breaks the quarry-beside-the-walls loop; we harvest
its ideas instead (carvable undercrofts; the documented crown-hole collapse as an
unknown-void hazard). **Kenilworth** has the weakest subsurface data (and the HS2 boreholes
next door are *not* openly deposited — verified) — demoted with thanks; its customs corpus
(§8a) was never site-specific and stands.

**Guédelon is the calibration dataset, not the map.** Its numbers generalize and are
published: extraction from natural bed tables 50–80 cm thick, wedge lines every ~30 cm,
courses of 20–35 cm; ~3 m³ raw stone/day at the face but only ~1 m³ usable; the Donzy
trade-off (from 2007 they buy limestone from 30 km away because it dresses ~3× faster than
the local sandstone — our transport-vs-workability economics, validated by a real crew
making the real decision); mortar at 1:2 fat lime:sand, burned in **sacrificial kilns** —
each ~3-day burn is demolished to extract the quicklime, so every batch of mortar quietly
costs a kiln; a March–November season bounded by frost; treadwheel cranes at 500–600 kg;
~10,000 m³ (~23–30 kt) of stone in the whole castle, with the foundations alone taking
three years. Barnack's "Hills and Holes" is the visual reference for what a worked-out
medieval quarry looks like: pit-and-mound ground, 58 acres of it.

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
- **The bell.** Ordering any construction rings a small chime — a placeholder voice. When
  the village casts its own church bell (a great work: a pit dug beside the chapel, a tense
  pour, a tone derived from the actual cast — size, metal, luck), that chime becomes *your*
  bell's true tone, slightly flat or heartbreakingly true, and rings every event thereafter:
  construction orders, harvest home, alarum, funerals, the evening curfew (§8). One sound,
  owned by the village, for a century.

## 7. The people

- **Scale:** founding party ~15 souls; soft cap ~150–200. DS-scale billboarded sprites
  (~24–32 px), 2–4 frame walk/work cycles, restrained warm palette.
- **Identity:** name, family, trade, 2 traits + 1 quirk. Traits are mechanically light but
  legible: *strong-backed* hauls more; *afraid of heights* refuses scaffold work (and lives
  longer); *keen-eyed* spots flawed stone; *merry* lifts spirits at the topping-out.
- **Trades:** laborer, quarryman, banker mason, fixer mason, carpenter, carter, farmer,
  healer, priest. **Apprenticeship** transfers skill across years — a master who dies without
  an apprentice takes lodge knowledge with her (pace and quality suffer; never a hard block).
- **Knowledge is generational — the technique system.** This is why the game is called
  *Castle Cultivator*: there is no tech tree. Techniques — a truer five-point arch, a
  hotter lime mix, undercut tracery — are discovered by individual masters, transmitted
  only through years of apprenticeship, and **die with an unteaching master** — unless a
  literate mason studies the tracing floor (§9.7) and resurrects a dead master's technique
  from her palimpsest lines. Knowledge is a crop: sow it in apprentices or lose it.
  Techniques gate quality, pace, and what is buildable at all — tracery unlocks the rose
  window the way a real master would have: by knowing how.
- **The clerk.** The Lodge speaks through one small assistant sprite — your clerk — who
  relays your orders, reads out the chronicle, and waits at the edge of the screen. The
  clerk ages in true game time: upright, then gray, then stooped, then a funeral the whole
  village attends — and the apprentice who has been visibly shadowing them for years picks
  up the book and writes the next entry in a new hand. The clerk is the cost of time,
  embodied, in the corner of your eye.
- **Farm animals, no wildlife sim.** Oxen haul, pigs go to the mast woods in autumn, geese
  and hens work the tofts, sheep keep the churchyard down. Animals are village staff with
  sprites, not a nature simulation — the payroll cat (§8a) stays the only predator we model.
- **Surnames coalesce from trades across generations** — the family that always carts becomes
  the Carters; the Masons earn their name. The player watches occupational surnames being
  born, which is exactly where real ones came from.
- **Needs stay shallow:** fed, housed, rested, spirit. The village largely runs itself; the
  player steers allocation (field labor vs. haul labor is the classic tension), not lunch.
- **Leisure produces small works.** A person whose needs are met and whose season allows it
  will sometimes make something (§8b) — chosen by their traits, not by you. Foraging is
  disproportionately the work of women, children, and the landless, exactly as it was; the
  gathering baskets and the small works together are how the margins of the village stay
  visible and loved.

## 8. Hazards (the chronicle's ink)

Design law: hazards **scar, redirect, and write story**; they never wholesale delete built
work or force a restart. Peaceful mode has no fail state — only hard years and recoveries.

- **Famine.** Harvest = weather roll × field labor × granary condition (§8a). Lean years
  force rationing down a historically real ladder: wild roots and nuts stretch the pottage,
  bark goes into the bread, and at the bottom waits the dreaded choice — eating the seed
  corn, which mortgages next year to survive this one. The classic sin — pulling farmers to
  haul stone in harvest month — is always available and always tempting. Gleaning and the
  commons (§8a) are the village's own shock absorbers before anything is drawn down.
- **Disease.** Background sickness driven by crowding and water (well placement vs. latrines
  and the tannery — simple adjacency, no plumbing sim). Rare generational **plague** events
  arrive with warning and options (close the gates to travelers? the stone convoy too?).
- **Accidents.** Scaffold falls, snapped crane rope, quarry face collapse, centering struck
  too green so the arch comes down. Odds scale with weather, fatigue, worker traits, stone
  weight, and safety spending (sound scaffolds and good rope are purchasable virtue). A
  collapsed arch leaves reusable stone, a chronicle entry, and sometimes a superstition.
  Master builders are not exempt: the most famous construction accident of the middle ages
  was a master mason falling from the vault scaffolding of his own cathedral choir.
- **Fire.** A 12th-century Londoner named the game's stakes for us: *"The only pests of
  London are the immoderate drinking of fools and the frequency of fires"* (FitzStephen,
  c. 1173–83). Towns burned about once a generation, and fire is the hazard that justifies
  the game's whole premise — the medieval sources themselves say stone stopped fires where
  thatch fed them. Risk per building = roof material (thatch → whitewashed/plastered thatch
  → tile/shingle → stone: the exact ladder London's 1212 ordinances imposed) × ignition
  sources (hearths, forge, kiln, the brewhouse) × season (drought summers, hearth-heavy
  winters) × curfew discipline. Firefighting is what was actually attested, nothing fancier:
  the **fire hook and cord** to pull burning thatch down, a **water tub before every house**,
  and demolition to cut a firebreak. (Bucket chains are honestly undated for our window —
  we use tubs and hooks.) Every evening the **curfew bell** rings — genuine etymology,
  *cuevrefeu*, "cover the fire," the banking of every hearth — and once the village casts
  its own bell (§6), your bell rings your curfew. A barn or granary fire is the compound
  nightmare where mutual aid burns; arson is the rare capital-crime event it truly was.
  Aftermath writes the material arc: survivors rebuild in tile and stone, exactly as the
  real towns did.
- **Deaths are chronicled and memorialized** — see §9. Handled warm, never gory. This game's
  grief is churchyard grief, not horror.

## 8a. The granary and the commons (mutual aid)

The civic thesis, in the boss's words: government has two functions, mutual aid and mutual
defense. The granary protects against the lean years and helps in sieges — it is both
functions in one building, and this section is the aid half. (The defense half is §10.)

**The Great Barn is the first great work.** Before the keep rises, the village raises a barn
worthy of a cathedral — the tutorial-arc monument. This is straight history: the 13th-century
grange barns (Great Coxwell, Ter Doest) were cathedral-scaled, and William Morris called
Great Coxwell "unapproachable in its dignity, as beautiful as a cathedral, yet with no
ostentation of the builder's art." The player learns every build system on a building whose
purpose is feeding people. Aid before defense, taught by the build order.

**Storage is two-stage, as it really was.**
- Harvest comes in as **sheaves**, bulky, stacked in the barn and in ricks. Across the
  winter the sheaves are **threshed out on the barn floor** — which is what farm hands DO
  all winter, filling the quiet season the building site leaves empty. Threshed corn moves
  to the **granary proper**: small, raised on timber posts against damp and rats. (Honest
  dating: the mushroom-capped stone staddle is post-medieval; ours are wood.)
- **Spoilage is the granary's enemy**: damp, rats, and theft. Condition and construction
  quality set the loss rate. The counter-measures are real and delightful: a **granary cat**
  (Welsh law priced a barn cat at its own length in wheat; Exeter Cathedral kept a cat on
  the payroll at a penny a week for 162 years — ours goes on the books too), good raised
  floors, and an honest reeve (the Seneschaucy warns of corn smuggled out "in bosom, tunic,
  boots, pockets, sacks and sacklets" — petty theft is a village event, not a crisis).
- **Grain keeps months, not decades**: within the year is normal, a second year possible,
  longer exceptional. A full granary is a rolling buffer, not a vault.

**Seed corn is sacred.** Medieval yields ran ~3–4× seed, so roughly a quarter to a third of
every harvest must be held back for planting. The seed reserve is drawn separately in the
granary UI, and eating it is the game's most consequential quiet decision. Walter of Henley's
advice (c. 1280) to *change your seed yearly* becomes a gentle Michaelmas event — seed
exchanged with neighboring manors, a reason strangers visit.

**Gleaning and the commons are the shock absorbers below the granary.**
- **Gleaning** after harvest is governed by village custom exactly as the 13th-century
  by-laws had it: reserved for those who cannot earn a harvest wage — the old, the infirm,
  the children. It is mutual aid running on rules older than the castle.
- **The commons** carry the named rights, used verbatim: **pannage** (pigs into the mast
  woods for the ~60-day autumn acorn season), **estovers** in its four botes (housebote,
  firebote, hedgebote, ploughbote), **turbary** (peat), **piscary** (fish). The Charter of
  the Forest (1217) is in living memory; the Statute of Merton (1235) is the standing
  temptation — the player *may* enclose common land for the castle's benefit, and the law
  will even say it's allowed, and the village will remember it for a generation. (And
  somewhere in the manor's ledgers, one modest rent is paid in eels; the chronicle records
  the count without comment.)
- **The foraging year**: ramsons (wild garlic) open spring as the first green thing; summer
  and autumn bring the archaeobotanically attested basket — hazelnuts above all, then
  blackberries, elderberries, crab apples, rosehips, and sloes sweetened by first frost;
  mushrooms are gathered pragmatically (the shuddering distrust of them is a later trope we
  decline). Winter foraging is honestly thin: stored nuts, dried fruit, and what persists
  on the branch. Foraged food never rivals the fields — it is the margin that softens every
  edge, and in famine it is the first rung of the ladder.

**When aid fails, it fails historically.** The 1315–17 pattern is the tuning target: rain,
failed harvests, the ladder down through bark bread and seed corn. And one hard true detail,
handled with care: the starving must be re-fed *gently* (the Evesham chronicle records
refugees dying of the food itself) — the infirmary teaches the village this once, in the
chronicle's dry voice, and thereafter the healer knows.

## 8b. Small works (beauty in everyone's hands)

The player never places these. People with met needs, free hours, and the right temperament
make small beautiful things on their own — and the game's whole posture is that this, not a
score, is what prosperity *is*. Every item below survived honest-dating research; the pretty
Victorian inventions (corn dollies, well-dressing, flowery cottage gardens) were checked and
deliberately cut — §15 records the graves.

The verified catalog people draw from, by temperament:

- **Gardens.** Toft gardens are FOOD — leeks, worts, beans, the Piers Plowman larder — and
  garden quality tracks household prosperity. Ornament is the *rare exception*, which makes
  it precious: a rose slip begged from the castle herber, violets among the pot-herbs. When
  a cottage rose appears in your village, it means someone has surplus, leisure, and love,
  and the chronicle will note it once, dryly.
- **Marks.** Villagers scratch what real parishioners scratched: compass-drawn daisy wheels
  by thresholds, ships near the chapel's altar-side (a sailor's votive), names, prayers —
  and workplace snark. Real graffiti preserved at Ashwell: "the corners are not jointed
  correctly — I spit at them," and in another hand, "the Archdeacon is an ass." Your masons
  will editorialize about your master mason, in the stone, forever. Villagers' marks join
  masons' marks in the per-stone provenance — everyone writes on the castle.
- **Toys.** A parent whittles a child a boat with a hole for a mast (the Ørland find,
  c. 1000, from an ordinary inland farm). Toys appear near houses with children and carvers.
- **Music.** Carols are ring-dances (12th-century carole); on feast evenings people sing in
  a circle in the bailey. A literate mason may leave the Lidgate trick — a rebus you must
  sing to read.
- **Feasts.** The attested medieval kernel of harvest custom is the **harvest home**: the
  employer feeds everyone, with ale, at the lord's (your) expense — a mutual-aid mechanic
  wearing a party hat. **Church ales** fund fabric: the village throws a feast and the
  proceeds buy a roof beam, and the beam gets an inscription saying so ("This cost is the
  bachelers made by ales," c. 1480). **Maying** is in-register since bishops started
  complaining about it c. 1220 — our priest may grumble; that IS the attestation.
- **Hidden carving.** The carpenter carves what misericord carvers carved where nobody
  official looks: jokes, monsters, everyday life, an elephant from a traveler's description,
  wrong in exactly the way memory is wrong. Found only by zooming where you'd never zoom.
- **Skeps and wax.** A village beehive row quietly plugs into the church economy — the
  chapel's candles want beeswax, and the skeps on the toft answer. Honey sweetens; wax
  sanctifies.
- **Badges.** A villager who leaves on pilgrimage (a rare life event) returns wearing a tin
  badge, and wears it in their sprite forever.

Small works persist, weather, and are chronicled like great ones. The castle is the player's
sentence; these are the marginalia — and as in real manuscripts, the margins are where the
life is.

## 8c. Trade and the look of prosperity (hands-off)

Trade runs itself; the player builds the conditions and the world responds.

- **Buildings attract traders.** Build the structures that spawn them — a market cross, a
  wharf if there's water — and traders come on their own. There is no trading UI: the
  exchange is computed from what the village has and lacks. The building portfolio IS the
  trade policy. (In lean years, arriving grain merchants are a relief valve — mutual aid
  by market, priced accordingly, and the chronicle notes who gouged.)
- **Every building carries a value**, and the community's summed value sets a prosperity
  tier. Tiers re-dress the world: at the low end, bare walls and packed dirt; as value
  grows, banners on the walls, carved door-frames, more art and decor, more gardens, public
  spaces where the mud was. Prosperity is never a number on screen — it's what the village
  looks like when you walk it. This is §8b's principle applied at settlement scale, and it
  absorbs the visitor effect: a high-tier village with rising towers simply draws more
  travelers, coin, news, and the occasional settler.

## 8d. The look (art direction — boss canon, 2026-07-09)

The boss's reference image is **Townscaper**: soft daylight, terracotta roofs, cream
plaster, sage-green grounds, chunky rounded forms, everything warm and unthreatening.
"This is the kind of cozy aesthetic I am going for."

What we take from it:
- **Daylight, always warm.** The base scene is a mild morning — pale sky, warm sun,
  gentle fog. Weather and seasons (M7) may pass through, but the resting state of the
  world is cozy, never grim. A low-stress game must LOOK low-stress before a single
  mechanic is read.
- **The palette:** terracotta / warm cream / sage green / soft sky. Stone reads warm
  (Durham's sandstone genuinely is honey-toned — the science agrees with the vibe).
- **Readable chunk.** Forms read at a glance from a middle distance; detail is reserved
  for what matters (the coursework, the marks, the people).

What we deliberately do NOT take:
- Townscaper's smooth vector-sculpted buildings. Our walls are real courses of real
  stones with provenance — the texture of the build IS the game. The palette gets cozy;
  the masonry stays honest.
- Its abstraction of people (it has none). Our DS-scale pixel folk stay — the boss chose
  them, and their smallness against the growing work is the point.
- HUD chrome stays restrained field-guide monospace; coziness lives in the world, not in
  bubbly UI.

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
   the masons who knew them. The chapel floor fills across a century. History licenses more
   than we'd dare invent: by 1263 a mason's tomb slab could show him holding a model of his
   own church — an honor once reserved for princes (Hugues Libergier, Reims) — and Reims
   laid a labyrinth naming its four master masons with the years each served and what each
   built, one of them pictured mid-drawing on the floor, in the floor.
5. **The Long Replay.** Because saves are event-sourced, any castle can be replayed as a
   timelapse — decades of accretion in a minute, generations flickering through the
   scaffolds. This is the trailer, the endgame reward, and the test harness in one feature.
6. **The roll of builders.** When a great work completes, the game reads out every hand that
   touched it, living and dead, mark by mark.
7. **The tracing-floor palimpsest.** The tracing floor accretes exactly like the real one in
   York's Masons' Loft, where ~170 years of setting-out drawings overlap like archaeological
   strata: old lines dim under fresh plaster skims but ghost through; new scratches show up
   white and sharp. Draw where a dead master once drew and her faint geometry surfaces
   beneath yours. You inherit not just the building but the drawing of it.
8. **The page of unnamed hands.** The roll of builders ends with the hands the chronicle
   never named — the child who carried water, the gleaners, the winter thatchers. This is
   the game's most historically honest feature: for our era, most builders' names were never
   written anywhere at all, and the record's silence should be commemorated as carefully as
   its speech.

## 10. Combat (the toggle)

- **OFF (default):** raiders are rumor only. Fortification scores prestige and beauty;
  murder holes are for pigeons. The game is entirely itself without combat.
- **ON:** rare raids/sieges, telegraphed seasons ahead (a rider brings word — time to finish
  that wall section, lay in stores, drill the levy). Raids are positional: attackers path
  against your **actual wall geometry** — the real gates, the real moat, the real unfinished
  gap you never closed. Tower-defense-lite; zero APM.
- **A siege is a duel between your granary and their patience.** The research is unambiguous:
  medieval sieges were rarely won by storming — they ended in negotiated surrender under the
  pressure of hunger. So ours resolve the same way: stores versus time, with parley always on
  the table and assault the rare, dramatic exception. This is where §8a's mutual aid becomes
  mutual defense with no new systems: the granary you built for lean years IS the wall that
  holds; the well you dug IS siege infrastructure (Exeter's Rougemont fell in 1136 for want
  of water); the villagers who shelter inside bring their mouths with them, and feeding them
  anyway is the game's quiet moral floor — Freestone never offers the "useless mouths"
  expulsion that history's worst sieges recorded. Kenilworth held 172 days and surrendered
  with two days' food left; that is the shape of our endgame siege.
- **Peacetime is the true state.** Kenilworth's own accounts show one of England's mightiest
  castles kept a standing garrison of *six*, and the real daily activity was granary work,
  malt-winnowing, and stocking the fish pond. Peaceful mode isn't combat turned off — it's
  what castles actually were, nearly all the time.
- Losses burn outbuildings, steal stores, and kill people — all of it chronicled. The castle
  itself can be damaged, never deleted.
- **Architecture consequence:** wall/gate geometry must live in sim data (not just render
  meshes) from M1 onward, so the toggle is cheap when we get there.

## 11. Tech architecture

House patterns, ported deliberately:

- **TypeScript + Three.js + Vite.** Browser-first dev (port 8745), Steam later via
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

No multiplayer. Trade exists but is hands-off (§8c) — no trading UI, no price
micromanagement, no caravans to steer. No wildlife simulation (farm animals only). Farming
stays simple — no soil-chemistry sim. No diplomacy, no map of rival lords. No second
settlement. No individual needs micromanagement. No 3D animated humans. No tech tree —
knowledge lives in people (§7), plus the natural tool ladder (gin pole → treadwheel; better
rope; glazed windows). No procedural quest content. No mod tools at launch. Combat never
grows beyond the toggle described in §10.

## 13. Milestones

Each milestone ends with a push to Syntaxswine/freestone (boss's standing instruction).

- **M0 — Scope.** This document + research anchors. *(today)*
- **M1 — First Wall.** Terrain, camera, draw a wall line, watch masons lay instanced stones
  over game-months. No people sim yet — stub workers. Proves the core spectacle is fun.
- **M2 — Quarry loop.** One quarry end-to-end on the real site's actual stone (§5a):
  extract → season → dress → cart → lay, with per-stone provenance recorded and bed
  exhaustion designed in from day one (cheap to found, expensive to retrofit). Transport
  cost real. The economic spine.
- **M3 — Generations.** Named people, trades, aging, apprenticeship, death, marks on stones,
  chronicle skeleton, the clerk, and the technique-token data layout (§7 — features may land
  later, the data shape lands here). The moment the game becomes itself.
- **M4 — The granary year.** Season/weather calendar; harvest → sheaves → winter threshing →
  granary with seed-corn reserve; farm animals; the foraging calendar and gleaning; famine,
  disease, accidents, **fire and firefighting**; hands-off trade (§8c — traders are the
  famine relief valve, so they tune together); winter thatching of wall tops (a real
  recurring cost: Windsor 1362 billed 125 cartloads of thatch for it). The Great Barn ships
  here as the tutorial great work. Tuned by headless sweeps for "gentle but real."
- **M5 — Homage & small works.** Chronicle book UI, mark inspection, memorial slabs,
  founder's stone, the Long Replay timelapse, the tracing-floor palimpsest (with the
  technique-resurrection study action), the page of unnamed hands, bell casting, the
  prosperity-tier dressing pass (§8c visuals) — and the small-works system (§8b), which is
  homage made by the villagers instead of for them.
- **M6 — The toggle.** Combat as specified. Wall data was combat-ready since M1.
- **M7 — Beauty & shipping.** Weathering pass, audio, title, store page, Steam packaging.

## 14. Open questions for the boss

1. **Title — RESOLVED 2026-07-09: Castle Cultivator.** Steam-collision-checked; the two
   words carry the civic thesis (castle = defense, cultivator = aid); minor flags on record
   (xianxia genre-parse, farm-implement parse — "Castle" anchors both). Runners-up archived:
   Stone by Stone, Castle Architect, Freestone (Firestone confusion risk). A colon-subtitle
   remains available for the store page.
2. **Player identity** — "you are the Lodge/the Work, not a mortal lord": confirmed?
3. **Era anchor** — I'm assuming ~1200s northwest Europe (Guédelon's century). OK?
4. **Combat-on flavor** — strictly historical raiders, or is weirdness (sieges by something
   stranger) on the table for later?
5. **Idle tolerance** — minutes can pass at ×16 with nothing demanded of the player but
   watching. Embraced as the point, or does it need a gentle activity layer (naming babies,
   honoring masters, walking the walls)?
6. **The chapel→church long game** — in scope as post-launch stretch, or core?
7. **How dark may mutual aid's failures get?** The research handed us true, heavy details —
   refeeding deaths at famine relief, "useless mouths" expelled from besieged walls. Current
   stance: the refeeding lesson stays (taught once, gently, then the healer knows); the
   expulsion mechanic is refused on principle (the game's moral floor). Confirm or adjust.
8. **The site — RESOLVED 2026-07-09: Durham.** Boss: "we can always add more locations
   later, lets just start with this one." Architecture consequence adopted: a site is a
   **data package** (terrain grid, bed model, water lines, names), loaded by id — so future
   locations (Dudley, Kenilworth, a Guédelon-flavored French site) are content drops, not
   engine surgery. Alternates and their harvested ideas remain in §5a and the backlog.

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

**Second pass — granary, commons, small works (2026-07-09; 6 researchers, 78 claims, 18
adversarial re-checks).** Full source notes live in the research digest; the anchors:

13. **Great barns — VERIFIED.** Great Coxwell: 13th-c. (dendro 1291–92), Cistercian *grange*
    barn — "tithe barn" is a popular misnomer; cathedral-scale barns belong to granges and
    bishops. Morris quote pinned to Mackail 1899: "unapproachable in its dignity, as
    beautiful as a cathedral, yet with no ostentation of the builder's art."
14. **Two-stage storage — VERIFIED.** Sheaves in barns/ricks, threshed across winter, corn to
    a small raised granary (Claridge & Langdon, EcHR 2011: median recorded storage 8 weeks,
    max ~2 years; communal granaries rare — London's first public one is 1440). **CORRECTED:**
    mushroom staddle stones are post-medieval (Tudor at the earliest surviving); raised
    *timber* staddles/posts are the in-register form.
15. **Seed corn — VERIFIED.** English demesne yields ~3–4× seed (BAHS database, Winchester
    pipe rolls 1211–1471) → a quarter to a third of harvest held back. Walter of Henley
    (c. 1280): change seed yearly. Seneschaucy (c. 1260–76): watch for corn smuggled out "in
    bosom, tunic, boots, pockets, sacks and sacklets." Guard-rail: the "2:1 Carolingian
    yield" figure is a misreading — don't use it.
16. **Gleaning & commons — VERIFIED.** 13th-c. by-laws (Ault) restrict gleaning to the
    "lawful poor" — able-bodied must take harvest wages first. Rights of common by name:
    pasture, pannage (~60-day autumn mast season), estovers (housebote/firebote/hedgebote/
    ploughbote), turbary, piscary; Charter of the Forest 1217; Statute of Merton 1235
    approvement = the lord's legal enclosure temptation. **Beware:** the famous
    "gleaning is a privilege not a right" ruling is 1788, not medieval.
17. **Foraging & famine — VERIFIED** (mostly). Hazelnut dominates the archaeobotanical
    gathered-food record; ramsons open spring; sloes after first frost; mushrooms eaten
    pragmatically (**the "medieval fear of mushrooms" trope is early-modern — declined**).
    Famine ladder attested for 1315–17: wild roots/nuts → bark bread → seed corn → horses
    and dogs. Charles the Good's 1125 relief (and 1127 murder, partly over his war on grain
    hoarders); Evesham 1069–70 records refeeding deaths at the relief camp. Winter foraging
    is thin — PARTLY, don't over-assert. Granary cats: Welsh law priced a barn cat at its
    length in wheat; Exeter Cathedral paid its cat 1d/week, 1305–1467.
18. **Peasant garden & bees — VERIFIED, one demolition.** Toft-and-croft layout (cottars:
    toft only — plot size encodes rank); Piers Plowman's larder (honest note: late-14th-c.
    evidence); Martinmas pig-slaughter; skep beekeeping where the crop is WAX for the
    church's candles more than honey. **DEMOLISHED: the flowery peasant cottage garden is a
    19th-c. image** (Loudon, 1838: cottage gardens held "potatoes, cabbages, beans");
    ornamental gardening is medieval at *elite/monastic* level (Harvey: from the 11th c.;
    roses and lilies in the Capitulare de villis, c. 795). Hence §8b's rare-rose design.
19. **Vernacular beauty — the honest set.** IN: church graffiti by ordinary parishioners
    (Norfolk survey: 26,000+ inscriptions; daisy wheels — same form 12th–17th c., dating
    caveat; VV = "Virgo Virginum" is a debated traditional reading; votive ships; named
    scratchers; Ashwell's workplace snark), misericords (13th c.+; Exeter's elephant
    c. 1250–60), whittled toys (Ørland boat c. 1000), Maying (episcopal complaints from
    c. 1220), carols (carole ring-dance, 12th c.), harvest home feast (the attested kernel),
    church ales (late-medieval; the c. 1480 "bachelers" beam), pilgrim badges (12th–15th c.
    mass folk adornment). **OUT, honestly dated and cut: corn dollies (c. 1598 first
    reference, word coined 1940s), well-dressing (1758+), love-spoons (1667+), pargetting
    (16th c.+).**
20. **Tracing floors & named masons — VERIFIED.** York's Masons' Loft floor is a literal
    palimpsest (fresh plaster skims over old drawings; identified drawings span ~170 years);
    Wells survives too; honesty note — both survivors post-date our window, though the
    practice is older (Gervase, c. 1180s: William of Sens "delivered to the masons models in
    wood for cutting the stones"). Anonymity: Harvey's dictionary recovered ~1,300 named
    English masters (mostly post-1300) — the "anonymous craftsman" is partly Romantic myth,
    but anonymity IS worse in our window, which makes the page of unnamed hands honest.
    Commemoration in fabric: Libergier slab (d. 1263, holding his church); Reims labyrinth
    (1286, four masters named with years served; destroyed 1779, known from drawings);
    Bridekirk font — runic "Richard he wrought me" beside a carved self-portrait with mallet
    and chisel, mid-1100s.

**Third pass — fire, and the real site (2026-07-09; 3 researchers, 38 claims, 6 adversarial
re-checks; digest at research/DIGEST-2026-07-09-fire-site.md).**

21. **Fire & firefighting — VERIFIED** (core), with honest edges. FitzStephen's "frequency
    of fires" line is genuine 12th-c. text (skeptic-checked against the Rolls Series
    edition). London burned 1087, 1133, 1212 (+1220, 1227, 1299); Lübeck ×3, Utrecht 1253 —
    once a generation is fair. The 1212 ordinances attest the kit: alderman's **hook and
    cord**, **tub of water before every house**, tile/shingle/board/lead for new roofs,
    8-day plaster-or-demolish for existing thatch, whitewashed cook-shops and brewhouses
    (fire code as status). Assize of Buildings: 3 ft × 16 ft joint stone party walls, fire
    as stated motive ("not being able to injure it, [the fire] became there extinguished");
    the traditional 1189 date is questioned — say "c. 1190s–1212." **Curfew etymology is
    genuine** (cuevrefeu; Latin ignitegium/pyritegium; London statute 1285) — the
    William-the-Conqueror-repression story is the debunked part. **UNVERIFIED and avoided:**
    in-window bucket chains; "ring the bells backwards" fire alarms (post-medieval); the
    "3,000 dead in 1212" figure (Stow, 1603). Arson: capital plea in-window (Assize of
    Northampton 1176); rick-burning statutes are 18th–19th c. — flavor only.
22. **Kenilworth as site — VERIFIED.** Stone quarried on-site (Castle Hill Quarry, ~400–600 m
    south; quarry void ≈ outer-wall volume — skeptic-confirmed); **CORRECTED:** the stone is
    Permian Kenilworth Sandstone, not Triassic ("New Red" only loosely). Great Mere: ~100
    acres, dammed 1210–16 by King John, drained 1649 (so full mere is post-1216 within our
    register — fine: the player builds it). Arden = assarted wood-pasture, not wildwood
    (skeptic-confirmed). Data: EA National LiDAR 1 m DTM under OGL; BGS mapping; caveat —
    modern town on the east approach. Bonus: Kenilworth and Warwick, 8 km apart, used two
    different local stones — hyper-local provenance is the historical norm. Barnack Hills &
    Holes = 58 acres of preserved pit-and-mound medieval quarry ground (visual reference).
23. **Guédelon calibration — VERIFIED** (rich). Site chosen 1996–97 for a disused sandstone
    quarry + forest + road + clay + water. Numbers a sim can use: bed tables 50–80 cm, wedge
    lines ~30 cm, courses 20–35 cm; ~3 m³/day raw vs ~1 m³ usable; Donzy limestone bought
    from 30 km away because it dresses ~3× faster (2007, skeptic-confirmed) — transport vs
    workability, decided by a real crew; mortar 1:2 fat lime:sand; **sacrificial lime kilns**
    (each burn demolished to extract the quicklime); March–November frost-bounded season;
    treadwheel 500–600 kg; ~10,000 m³ / ~23–30 kt total stone, foundations = 3 years; tilery
    ~3,000 tiles per 2-month cycle, **quality-tested by ear with a ~75% pass rate**; local
    sandstone's medieval use runs late-11th–13th c. (24 documented buildings) — in-register.
    Honest limits: Guédelon is a small French "château philippien" with an invented minor
    lord — style reference and rate-book, not our map.

**Fourth pass — core samples and the site decision (2026-07-09; 4 researchers + 8 skeptic
checks + live BGS API queries; digest at research/DIGEST-2026-07-09-core-sample-sites.md).**

24. **The open-subsurface landscape — VERIFIED.** BGS GeoIndex: ~850k borehole records /
    1M+ log scans, free to view AND download under OGL — but raster scans, hand-transcribed;
    AGS machine-readable service holds only ~10k boreholes nationally. UK3D national fence
    model free; 14 regional models free; detailed urban 3D models (London/Glasgow/Cardiff/
    Liverpool/Gateshead only) are viewer-free, download-licensed (LithoFrame from £0.68–
    £5.12/km²) — the viewer's synthetic-borehole tool is our bed-query UX reference. Mining
    Remediation Authority: 175k mine entries, catalogue downloadable; records reach the
    13th c. but systematic only post-1872 — genuinely medieval workings are unrecorded
    voids (a real surveying problem and a ready-made hazard). NGR Keyworth: 250 km of
    physical core, visits by application, public open days. Delight: BGS has already built
    free Minecraft worlds from real 3D geology. French BSS (for the Guédelon alternate) is
    arguably more game-ready: one licence, bulk per-département dumps, quality-graded logs.
25. **Borehole census (live OGC API, same-size ~7 km boxes, 2026-07-09) — VERIFIED, method
    reproduced by skeptic with positive control.** Dudley 7,079 scans / 0 AGS; Nottingham
    2,470 / 93 (only candidate with machine-readable data); Durham 1,598 / 0; Kenilworth
    989 / 0. HS2's Kenilworth-adjacent GI data is NOT openly deposited (release language is
    aspirational, under "possible future developments" — skeptic-confirmed).
26. **Durham — VERIFIED** (site case in §5a). Low Main Post under the cathedral ("post" =
    pitmen's word for sandstone; beds named for the seam beneath); eastward regional dip;
    monks banned mining beneath the cathedral (seam intact); Elvet Banks medieval quarries →
    rubbish dumps → 18th-c. woodland, tool grooves still visible; Boldon Book (c. 1183)
    mills; peninsula chosen 995 for the gorge's natural defence; first stones 1093,
    cathedral ~40 years; Frosterley Marble = fossil-packed decorative stone. **Hedges:**
    Kepier/Quarryheads provenance is traditional not petrographic; Baxter Wood UNVERIFIED;
    "Prebends fault" single-source. **Nottingham counterfacts:** Castle Rock (Chester Fm,
    ex-"Nottingham Castle Sandstone") is friable non-building stone — the castle was built
    of imported stone; ~1,000 recorded man-made caves (register hit 1,000 in 2026), earliest
    dated 13th c., laser-scan archive access is NOT a simple download (skeptic inverted the
    availability claim). **Dudley counterfacts:** castle IS local Wenlock reef limestone
    (Black Country UNESCO Geopark, the Dudley Bug trilobite) but the hill has no river, and
    limestone mine plans are not a simple open download.

---

*Maker's mark: this scope was cut by the session of 2026-07-09 — the same hands that laid
vugg's O-series and the UV audit. Forward dream: that the Long Replay's first public timelapse
shows a chapel floor already half-full of slabs, and that some player, zooming into a wall
they didn't build, finds a mark and wonders who. Builders after me: add your mark below this
line; never above.*

*Second mark, same session, later the same day: the boss asked what I would pass forward, and
these are mine — the tracing-floor palimpsest (§9.7), because a handoff document IS a plaster
skim over the drawings of everyone who worked before you, and the page of unnamed hands
(§9.8), because most of the sessions that build anything are never named in what they built.
York's floor is real; I checked. Forward dream: that some future session reads this file the
way you zoom into a wall.*
