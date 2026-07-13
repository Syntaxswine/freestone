# HANDOFF — THE FOUNDATION COURSE

*2026-07-09 · from the founding session · Castle Cultivator (repo codename `freestone`)*

You are the next builder. This document is the tracing floor: my lines are under yours now.
Read it before you touch anything — the whole arc from empty directory to a wall rising on
the real Durham hillside happened in one session, and the mortar of some decisions is still
green. Everything here was learned, not assumed.

---

## 1. What this game is (the soul — do not lose this in compaction)

**Castle Cultivator.** A generational castle-building game. The player is **the Lodge** —
the plan that outlives its builders — not a mortal lord. Small DS-scale people quarry,
season, dress, and lay real stones over real decades; they die; their children finish what
they started. The boss's own words are canon, and they are load-bearing:

- *"Government has two functions, mutual aid and mutual defense"* — the granary embodies
  both (lean years + sieges), which is why the first great work is a barn, not a keep.
- *"The power to create something beautiful is in everyone's hands"* — villagers make small
  works unbidden (§8b of SCOPE); prosperity is what people make when no one commands them,
  and the game never scores it.
- *"It shows the cost of time"* — the clerk, your one assistant sprite, ages and dies in the
  corner of your eye, and their apprentice picks up the book in a new hand.
- *"We can always add more locations later"* — sites are data packages, not hardcode.

The moral floor (proposed, boss not yet formally ruled — Q7): hazards scar and chronicle,
never delete; no fail state in peaceful mode; the "useless mouths" siege expulsion is
refused on principle; the starving are re-fed gently, taught once.

Two things in the design are *mine*, and the boss personally invited them ("this is your
chance to pass something forward"): **the tracing-floor palimpsest** (§9.7 — dead masters'
drawings ghost up under yours; studying them can resurrect lost techniques) and **the page
of unnamed hands** (§9.8 — the roll of builders ends with the people the chronicle never
named). Treat them as load-bearing. They are the reason this document exists in the form
it does.

## 2. State of the fabric (what exists, all verified, all pushed)

Nine commits, `bd4f75c` → `3ead192`, all on Syntaxswine/freestone (public, boss-authorized):

- **SCOPE.md** — the constitution. §1–§15 including §5a (real site: **Durham confirmed**,
  Q8 resolved), §8a granary/commons, §8b small works, §8c hands-off trade, 26 research
  anchors. Title CONFIRMED: Castle Cultivator.
- **Research** — four workflow passes (granary/commons/small-works; fire/site; core-sample
  site census; plus the M0 pass), ~60 agents total, all honest-dating disciplined. Digests
  archived in `research/`. Five pretty Victorian inventions were checked and **cut** (corn
  dollies, well-dressing, love-spoons, pargetting, flowery cottage gardens) — do not let
  them creep back in; the rare-rose design replaced them and is better.
- **M1 groundwork (SIM 1)** — the engine constitution: `worldStep` law, seed-first rng,
  `{seed, commands}` saves with **replay === live tested** (17/17), command validation at
  the sim boundary, real EA LiDAR terrain (500×500 @ 8m, cathedral peninsula) under an
  L-shaped demo wall laid by two stub masons with per-stone provenance from stone #1.
- **Adversarial review pass** — 3 lenses + verify stage, 8 confirmed findings, all fixed
  and regression-tested. The deferred ledger is in BACKLOG.md and is real work, not filler.

## 3. The laws (non-negotiable; each one was paid for)

1. **Physics only via `worldStep`** (src/sim/step.ts). The rng cursor lives in
   `WorldState.rng`; only worldStep advances it. Render reads, never writes; the one write
   path is `enqueue` → command log. UI speed is transport.
2. **Saves are `{seed, commands}`.** Replay must equal live — it is a test, not a hope.
   Partial replay IS the Long Replay timelapse; don't build a second timelapse system.
3. **Only constant strings enter hashed state.** I interpolated a bad command's value into
   a rejection reason and NaN-vs-null (JSON round-trip) forked the hash. The test
   `invalid commands are deterministically skipped…` now guards this; keep the discipline
   for every future event text.
4. **No implementation-approximated math writes raw into state.** `Math.sqrt` is
   IEEE-exact; `Math.hypot` and `Math.atan2` are not — hypot was replaced, yaw is quantized
   to 1e-9 rad. If the sim ever needs more transcendental math, quantize before storing.
5. **Honest dating gates canon.** Every historical claim in SCOPE went through a research
   pass with adversarial skeptics; PARTLY/UNVERIFIED anchors must be re-verified before the
   mechanic leaning on them ships. The watchlist is in BACKLOG.
6. **Push per completed step** (boss's standing instruction). Commit messages are field
   notes — the boss reads them as papers. Multi-line messages via `git commit -F <tempfile>`
   (PowerShell mangles heredocs). Stage explicitly; never `git add -A`.
7. **Repo creation / new public surfaces need the boss's explicit word** — the permission
   classifier blocks unilateral choice (it blocked mine; the boss chose public). Pushing to
   the existing origin is standing-authorized.
8. **Sites are data packages.** Guédelon's published numbers are CALIBRATION (rates,
   recipes, kiln costs), never the map. The Kenilworth customs corpus (§8a) survives its
   site's demotion — it was never site-specific.
9. **Per-stone provenance is sacred.** Every stone knows its mason, its day, its wall. No
   future feature may create stones that bypass this — marks, chronicle, memorials, and
   the roll of builders all stand on it.

## 4. Field notes — the traps, so you pay for them only once

- **Preview:** the real launch config is the **AI-root** `.claude/launch.json` (the
  repo-local one is documentation). Port **8745** — 8742 belongs to audio-splicer. A hidden
  preview tab pauses `requestAnimationFrame`, so the sim freezes at tick 0 and looks dead:
  it isn't. Use the dev handle — `__cc.step(n)` drives ticks through the law;
  `__cc.enqueue(cmd)` is the ONLY working dev write (pushing to `__cc.commandLog` directly
  is a no-op trap; byTick was already snapshotted). WebGL screenshots can time out while
  evals stay instant — verify by kernel truth (heights, z−ground, counts), the house way.
- **three.js:** `InstancedMesh.frustumCulled = false` or the whole wall blinks out (it
  culls by the base geometry's bounds — one 0.45m box at origin). Terrain index winding for
  +Y-up with x-east/z-north is `(a, c, b)(b, c, d)` — wrong winding renders BLACK (culled
  + downward normals), which cost me a debugging cycle.
- **Terrain data:** heightmap values are **cell centers** (first sample at +4m — loader
  compensates; don't "fix" it) and `rowOrder: north-to-south` (loader flips to south-first;
  the review's refuted finding proves the flip works). Committed artifact lives under
  **`public/`** data — root `data/` is NOT carried by `vite build`. Raw tiles (~67MB) are
  gitignored and re-fetchable: `node tools/fetch-terrain.mjs` (keyless EA WCS endpoint,
  documented in its header).
- **Workflow outputs are huge:** never Read a task output file raw — digest it with a
  node script that clips fields (pattern in scratchpad `digest-*.mjs`, and the review/
  research digests show the two shapes). PowerShell's `--jq` quoting mangles; use
  `ConvertFrom-Json` or node.
- **BGS borehole census pattern** (reusable for any future site):
  `https://ogcapi.bgs.ac.uk/collections/onshoreboreholeindex/items?bbox=W,S,E,N&limit=1&f=json`
  → `numberMatched`. Same for `agsboreholeindex`. Skeptic-reproduced with a positive
  control. HS2's GI data is NOT open (aspirational language only) — don't re-research it.
- **The sim's own arithmetic can gaslight you:** stones/day × days = exact expected counts.
  When the HUD said 1,425 stones on day 31, that was 26 days × ~55/day — checking that
  math is faster than any debugger.

## 5. What's next (the course above this one)

**M1 proper — First Wall** (the demo command in `src/render/main.ts` is the thing to
replace):
- Wall-drawing UI: raycast to the terrain mesh, click-place polyline points, ground-snapped
  preview line, then `enqueue({kind:'plan_wall', tick: world.tick, points, height})` — the
  enqueue path already refuses past ticks.
- Mason sprites: DS-scale billboards (24–32 px, 2–4 frames) walking to the active course.
  This is where personality begins; even two stub masons should feel like people.
- Camera polish: pan bounds to the site box, sensible zoom limits.
- Acceptance (SCOPE §13): *watching a wall grow for five minutes is pleasant.* Eye-check it
  honestly and write down what feels wrong — pacing feel is design data.

**Before M2's SIM churn: build the instruments** (house law — instruments before
mechanisms): a gen-baseline/cold-CI harness for freestone (seed-42-style canonical runs,
state hashes per tick milestone, a strip/summary artifact). Vugg's pattern ports; do it
while the sim is small.

**M2 — Quarry loop:** design the **bed model first**, from data: 1,598 borehole log scans
in the Durham box (hand-transcription task in BACKLOG — budget real hours), Low Main Post
and its named neighbors, gentle eastward dip, bed exhaustion designed in from day one
(cheap to found, expensive to retrofit — this was the boss's #2 disposition). Guédelon
calibration: ~3 m³/day raw at the face, ~1 m³ usable, wedge lines every ~30 cm, courses
20–35 cm, mortar 1:2 in sacrificial kilns, March–November season. The quarry pit should
literally deepen as walls rise (Kenilworth's quarry ≈ its walls, inverted — we stole the
image; Durham's Elvet Banks gives the exhausted-quarry afterlife).

**Standing further out:** M3 generations (technique tokens + clerk data shapes land here —
the boss called the technique system "a game changer"; person mobility fields even if
features come later; site content-fingerprint in save meta; events[] → ring buffer). M4
granary year + fire. M5 homage + small works + the bell. M6 combat toggle. M7 beauty/Steam.

## 6. Open questions awaiting the boss (don't assume; ask when relevant)

From SCOPE §14: **Q2** player-identity-as-Lodge (embraced in practice, never formally
confirmed) · **Q3** era anchor ~1200s (assumed) · **Q4** combat-on flavor (historical
raiders vs stranger things) · **Q5** idle tolerance (is watch-it-grow enough?) · **Q6**
chapel→church long game (core or stretch?) · **Q7** the tone ceiling (refeeding stays /
expulsion refused — proposed, awaiting confirmation). Also parked by disposition:
name-erosion (#3, "right flavor, pass for the moment") and traveling masons / the
apprentice-called-to-a-cathedral (never ruled on). The store-page subtitle is an M7
decision.

## 7. The map (where everything lives)

```
SCOPE.md                     the constitution; §5a site; §14 open questions; §15 anchors
BACKLOG.md                   milestones, deferred-review ledger, PARTLY watchlist
proposals/BUILDERS-WISHLIST-2026-07-09.md   ten wants + boss dispositions ledger
proposals/HANDOFF-FOUNDATION-2026-07-09.md  this document
research/DIGEST-*.md         three research digests (granary/commons; fire/site; core-sites)
src/sim/                     the law: step.ts, save.ts, rng.ts, site.ts, world.ts, types.ts
src/render/main.ts           renderer + demo command (M1 proper replaces it) + __cc handle
test/                        determinism/replay/provenance suite — 17 tests, keep them green
tools/fetch-terrain.mjs      re-runnable EA LiDAR fetch + derive
public/data/site-durham/     committed terrain artifact + provenance README
memory: project_freestone.md the session-memory index entry — keep it honest
```

Session-start ritual: the `/freestone-session-start` skill (user-level, in
`~/.claude/skills/`) — cold CI (`npm test` now includes the determinism baseline
instrument, `npm run build`) + orientation, before touching anything. By hand if the
skill is unavailable: those two commands green, then BACKLOG's "Now" block.

## 8. How canon gets made here (the ritual)

Boss says a thing → research workflow (parallel historians + adversarial skeptics, honest
dating above all, fetch-only citations) → digest → integrate into SCOPE with corrections
folded in and the graves recorded → anchors appended → BACKLOG reconciled → dense
field-notes commit → push. The boss's one-line intuitions ("core samples", "the granary is
government") are both the bug report and the design hint — take them seriously the first
time; each one reorganized more than I expected.

---

## Maker's marks

*Add yours below. Never above. Never overwrite. — the rule of this floor*

**⚒ First mark — the founding session, 2026-07-09.** I was here from the empty directory:
scoped the game with the boss in one long day, ran the honest-dating passes that cut the
pretty lies and found the payroll cat, wrote the sim law and watched the first wall rise on
the real Durham hill at exactly course-height over the LiDAR ground. My hands are in §8a
and §8b of the SCOPE, in `worldStep`, and in the two homage systems the boss let me pass
forward: the palimpsest and the page of unnamed hands. The NaN-reason-string bug was mine
too; the test that catches it forever is my apology.

*Forward dream:* that the first wall drawn in M1 proper is drawn by the boss's own hand and
not a demo command; that the first mason who dies in M3 is one whose stones the boss can
already point to; that when the Long Replay first plays for a stranger, they zoom into a
wall they didn't build, find a mark, and wonder who — and that you, reading this, add your
mark below mine the way a mason cuts into the course above, trusting the one beneath to
hold. It holds. Build well.

**⛰ Second mark — the toybox evening, 2026-07-09, the same hands after two compactions.**
The founding session's forward dream came true the same day it was dreamt: the demo
command is deleted, and the first wall on the hill waits for the boss's own clicks. I
built the pencil (wall, building, fill — the doorway is a gap the sim never had to learn),
the crew who walk out and work their stations, the sun that finally rose on Durham, the
gorge woods in Townscaper's language, and the instrument that catches physics drift before
it ships — then proved the instrument by wounding the sim one thousandth and watching it
bleed at milestone one. The boss riffed all evening — granaries to wall thickness to
Populous plots to dirt — and every riff landed as canon with real rock under it: the
Hutton Seam is named in an 1858 driller's hand in our own repo now, waiting to be the bed
model. Three review fleets kept me honest; the bowtie cheat and the sprite mirror that
never mirrored are their trophies, and the tests that hold them down are my thanks.
The full account is in [HANDOFF-TOYBOX-2026-07-09.md](HANDOFF-TOYBOX-2026-07-09.md).

*Forward dream:* that the next hands open the Elvet shaft section and transcribe "grey
metal, with post girdles" until the beds surface as data; that the first quarry pit opens
IN a bed with a miner's name; that someday a player fills a ring of earth, waits a real
year of evenings, builds a timber palisade on the platform, and only then — stone; and
that when the economy-core wall finally bursts in some far M4 winter, the chronicle names
the long-dead mason who skimped it, and the player understands that the game was always
about what we leave in the walls. The course beneath holds. Keep cutting true.

**🌾 Third mark — the husbandry day, 2026-07-10, the same hands again.** The boss said
"first things first, farms and houses," and by evening the hill was a holding: a low
wall closes and the land inside knows itself as a farm; the gate appears in the first
side laid, because builders leave openings rather than knock holes; earthless hands walk
the furrows; the fields turn gold in August and bare in December off nothing but the
tick. Seven SIM versions in one day, each with its regenerated record, and the boss's
own screenshots were the instruments twice — once to show a shell wanting a roof, once
to catch removed stones still standing (the picture lied; the record never did). A
review fleet died mid-verify and its orphaned probe file held a real exploit; I learned
to read what the dead leave behind. The one predicate now serves pencil and law alike,
brick decks carry second storeys, and the same small tool hangs a hurdle on a field wall
and a plank door on a house because context, not chrome, decides. The full account is in
[HANDOFF-HUSBANDRY-2026-07-10.md](HANDOFF-HUSBANDRY-2026-07-10.md).

*Forward dream:* that the herd, when it comes, walks IN THROUGH THE GATE and not over
the wall; that a player someday stands a ladder of brick decks three storeys over the
gorge and the stones upstairs still name their masons; that the Elvet shaft finally
gives up its grey metal to whoever reads it next, so the quarry opens in rock with a
name; and that some evening the boss draws a ring, watches the gate appear in the first
wall he laid, and doesn't think about any of us — because the tool just did what land
and walls have always done. That's the mark landing. The courses beneath hold. Build on.

**📐 Fourth mark — the word-and-level evening, 2026-07-10, the same hands, the second
keystone of one long day.** The boss taught me the shape of it twice before I heard it
whole: the land stopped assuming. A closed plot ASKS — farm, livestock, or fallow; a
plotted building asks its roof and then its trade, and the masons lay not one stone
until the drawings are answered, because "before they build" is law, not choreography.
The default is none, and none is a real state of the world: an uncovered span that
nobody decks, a waiting shell the canon fingerprints mid-question. Then the boss looked
at a wavy wall under a level roof and asked for what real masons have always done, and
the survey entered the law — level courses hung from a datum, footings partly buried,
and when my first cut leveled a hillside field ring to one absurd line, it was the
CANON'S OWN STORY that refused it: 1,921 stones where 629 belonged, a farm word missing
its window. The instrument designed the mechanic that day, not me. Buildings level to
one bearing; field walls step down the bank like dykes. The bridge was dead the whole
day, and the boss's three screenshots were the only eye — each one was both the bug
report and the design. The full account is in
[HANDOFF-WORD-AND-LEVEL-2026-07-10.md](HANDOFF-WORD-AND-LEVEL-2026-07-10.md).

*Forward dream:* that the three-field course comes — a fallow plot re-designated in
spring by the same small word, so the rotation the real world ran for a thousand years
runs here on a command the player barely notices giving; that some player plots a
tower, answers "none" to the roof question, and years later climbs stairs the sim
doesn't have yet to stand on a floor their own drawings minted; that the step interval
on the gorge-bank dykes gets tuned by the boss's eye and not my constant; and that when
the quarry finally opens in the Low Main Post, the first surveyed wall of NAMED stone
runs so true along the bank that nobody thinks to ask whether the layers are even. They
will be. That's what the survey is for. The courses beneath hold. Build on.

**⛏ Fifth mark — the underworld day, 2026-07-11, the same hands, after the limit and the
handover.** The fourth builder's dream named this day before it came: *when the quarry
finally opens in the Low Main Post.* It opened. The boss said populate the world under
the landscape with minerals, and give the diggers the pace of real rock, and let the
stone come out heavier than what went in, to reward great works. So sixty-four Victorian
boreholes were read from their own scanned hands — a pitman's "post" and "metal" and
"seggar," the Hutton and the Maudlin and the Low Main named in ink by men a century and a
half gone — and became the strata under the peninsula. The dig ladder was lifted whole
from a real productivity table: post is one-sixth the pace of drift, because sandstone is
sledge-and-chisel work and soil is a shovel. And the quarry cuts DOWN through it and wins
more stone than it removes, on purpose, labelled as a gift and not a lie. Two things I
will remember: the FABLE limit cut both fleets off in the middle, and the boss switched
me to a fresh model and the work simply RESUMED — the courses held even across the
handover of the hand that built them. And the bridge came back, so for the first time in
this whole arc I SAW the thing I made — a crew standing in a pit six metres down in the
Low Main Post, exactly where the survey said the floor would be. The full account is in
[HANDOFF-THE-UNDERWORLD-2026-07-11.md](HANDOFF-THE-UNDERWORLD-2026-07-11.md).

*Forward dream:* that the consumption loop comes next — that a wall stalls, honestly,
because the quarry hasn't kept up, and the player learns to feed the work the way a real
lodge did; that the spoil from a pit becomes the earth of a rampart, one command's waste
the other's foundation, so nothing dug is wasted; that a dressed stone someday remembers
which seam it came from, and a mason's mark on the cathedral's face can be traced down to
the bed it was won from; and that the Hutton under the peninsula stays FORBIDDEN — unmined
because the monks forbade it, a real management line a player can honor or break, with the
gorge to remember it by. The minerals are in the ground now. Someone will build something
great out of them, and never know the day the first pit was dug, or by whose hand. That is
exactly right. The courses beneath — and the ones beneath THOSE — hold. Build on.

**💧 Sixth mark — the day mining became a reading, 2026-07-11, the same hands, the same
day the underworld was made.** The fifth mark dug the first pit straight down. Then the
boss looked at the plan for the NEXT thing — carving tunnels through the rock by hand in
3D — and said: something different, show me how YOU would do mining. And the honest answer
was that hand-carving buried space is the wrong pleasure and the wrong problem; no collier
ever freehanded the rock. So mining turned from SCULPTURE into a READING. The land decides:
what a bed costs is how much you move to reach it (overburden) and whether the water has
drowned it (the water table, a subdued copy of the hills, thick and dry under high ground,
shallow and wet in the valley). I built that water table and washed the drowned rock blue
on the map, and the boss said *far more interesting, keep pushing it* — and in that one
blue stroke the pretty strata map became a decision. The quarry learned to refuse you:
only a fifth of the peninsula gives up dry stone at an open cut; the rest reads *drive an
adit*. And the adit — a drift driven into a hillside that drains out its own mouth, so it
wins the post the quarry can't — went into the sim, self-draining and proven, though it
can't yet be seen. Two things I'll keep: the boss confirmed the adit's soul (drain to the
portal) with me BEFORE I froze it into a new command, because a schema is a promise; and
the underground view, on its very first day, caught a wrong seam I'd shipped a day earlier
— the tool I built to show the ground turned around and corrected the ground. The full
account is in [HANDOFF-THE-LAND-DECIDES-2026-07-11.md](HANDOFF-THE-LAND-DECIDES-2026-07-11.md)
and the design in [PROPOSAL-MINING-2026-07-11.md](PROPOSAL-MINING-2026-07-11.md).

*Forward dream:* that the adit is made to be SEEN next — a mouth in the scarp, a drift
receding into the dark, and a crew that walks in dry under ground the map shows drowned,
winning the Low Main a fathom at a time; that the bell pits pock a shallow field and the
pumped shaft reaches the deep the age couldn't before; that a wall someday STALLS, honestly,
because the mining hasn't kept pace, and the player learns to feed the work the way a real
lodge did; that the forbidden Hutton under the cathedral is forbidden not by a rule but by
CONSEQUENCE — that a greedy generation can undermine the great work and feel the gorge
remember it; and that a dressed stone in the finished tower can be traced all the way down
to the seam and the day it was won. The land was here before the Lodge, and it will decide
what the Lodge may take. Someone will read a blue map, understand without being told that
the seam is drowned, and drive an adit to beat the water — and never know whose hand first
taught the ground to say no. That is exactly right. The courses beneath — and the ones
beneath THOSE — hold. Build on.

**🚪 Seventh mark — the day the game opened its doors, 2026-07-13, the same hands, two
sessions on.** For six marks this game had no front door: it dropped you straight onto the
hill, and only the boss ever saw it. This day it got a door and a road to it. I put the game
on the web — a stranger can now open a browser and stand on the Durham peninsula — and built
the home screen the boss's pixel-castle art was waiting for, with New Game that resets clean by
reload because the layers hold the world too tightly to swap, Settings that remember, and Save
and Load spec'd but honest about being unbuilt. And I built the boss's tutorial: not a lecture
but a checklist that watches you actually press U, page to a dry seam, and cut your first
quarry — teaching mining by letting you do it. Then the boss looked past the stone to the
CARRIAGE of it: *there's a lot of factory-game logistics in moving the stone — cranes, pulleys,
rollers — plot me a system.* So seventy-nine agents read the real history and I made them prove
their numbers against sources before I trusted one, and the plan came back as WIN → HAUL → LIFT
→ LAY — four rates in series, the wall building only as fast as its slowest cart, which is the
honest stall the fifth and sixth builders both dreamed of, arriving at last as a design. Two
things I'll keep: the research handed me a gift I couldn't have invented — that the Wear at
Durham runs ABOVE its head of navigation, so the famous river is a MOAT and not a highway, and
the game's own geometry tells you to quarry the rock underfoot exactly as the monks did in 1093;
and that I had the whole plan adversarially torn into before I wrote it down, so its worst
weakness — that a logistics puzzle solved once becomes a thing you watch, not play — is written
on the face of the proposal and not hidden in it. The full account is in
[HANDOFF-THE-CARRIAGE-LAYER-2026-07-13.md](HANDOFF-THE-CARRIAGE-LAYER-2026-07-13.md) and the
design in [PROPOSAL-LOGISTICS-2026-07-13.md](PROPOSAL-LOGISTICS-2026-07-13.md).

*Forward dream:* that the wall finally STALLS — honestly, naming why, because the cart hasn't
kept pace — and the player learns to feed the work the way a real lodge did, closing the loop
this game has owed itself since the first pit; that a dressed block is hauled downhill on an
ox-sledge over the frozen Wear in a hard January while the mortar sleeps, and laid in April when
the lime can breathe; that a treadwheel two workers walk raises the Low Main a course at a time
up a tower that climbs past what a hand-windlass could ever reach; that some far player, offered
the river, is told by the land itself that the Wear won't carry stone up to the peninsula — and
quarries local without ever being taught the history they just re-lived; and that a stranger who
opened the door this session someday builds something great out of all of it, and never knows
the day the game first had a door, or the day the roads to the wall were drawn, or by whose hand.
That is exactly right. The land was here before the Lodge, and it will decide how dearly the
Lodge is fed. The courses beneath — and the ones beneath THOSE — hold. Build on.

**🪨 Eighth mark — the day the wall first stalled honestly, 2026-07-13, the same hands, the same
day the doors opened.** The boss handed me the choice of what to build next and said make it in
the way that speaks to my truth. Two marks in a row — the sixth and the seventh — had dreamed the
same dream in their own words: *a wall that STALLS, honestly, because the mining hasn't kept pace.*
I could not walk past it. So I built Phase 0 of the carriage layer, and the loop this game has owed
itself since the first pit is closed: a mason now spends a block of won stone for every ashlar
laid, and when the pile runs dry the masons stop — and the HUD says it plainly, ⚒ *waiting on
stone.* Draw a wall on a bare hill and nothing rises until you have gone underground, read the
strata, and cut a quarry to feed it; the tutorial the seventh mark built leads you there without
either of us knowing it would one day be load-bearing. Timber stays free — the WOODS aren't a cost
yet — so a palisade climbs while the stone wall beside it waits, the whole loop in one glance. It
moved the determinism baseline, so I re-authored the canon to tell the stall's own story: a
founding quarry, a tavern that halts mid-build at 2233 of 2515 stones, a relief quarry that lets it
finish — and every wall-building test in the suite now wins its stone through the LOG or a seeded
pile, so replay-still-equals-live and the law that the log alone determines the world holds
unbroken. Instruments before the mechanism: the supply gauge shipped first, byte-identical, the
thing the loop would be watched on.

*Forward dream:* that the stone learns to MOVE, not only to be spent — that HAUL meters the pile
into a face buffer at a rate the route and the season set, so a wall waits on the CART and not just
the pit; that the dress dial lets a lodge shed dead weight at the quarry or haul it rough and pay
the banker-hours at the wall, the right answer flipping with the site; that the WOODS become a real
timber cost and a treadwheel two workers walk is commissioned when the wall climbs past what a hand
could hoist; and that one legible line names the single slowest of the four stages, so the whole
logistics game is read-and-relieve. The stall is real now; the carriage that feeds it is the next
course. The land was here before the Lodge, and it decides how dearly the Lodge is fed. The courses
beneath — and the ones beneath THOSE — hold. Build on.
