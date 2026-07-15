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

**🛒 Ninth mark — the day the stone learned to travel, 2026-07-14, the same hands, a day on.** The
boss said *keep going on the next step*, and the next step was the eighth mark's own forward dream,
so I built it. HAUL: won stone no longer teleports from pile to wall — each stone wall carries a
face buffer, and the cart meters the pile into it at a rate frozen from the ROUTE, so a wall far
from winnable stone, or across the Wear gorge, stalls on the CART, not the pit, and the bottleneck
line names which link starves. The boss chose the wall-sited model, so the lever is where you BUILD
against where the land yields stone: quarry underfoot and the wall is fed for free; build across the
gorge and the cart must go round by a bridge and the face trickles. "Cost the route, not
straight-line" — and Durham's historical optimum, raise it from the peninsula's own post, falls out
of the geometry with no scripting at all. The line grew its middle stage; the canon was re-authored
so wall A's stone comes up the bank by cart and its face trickles at the 65 and 80 milestones, WIN →
HAUL → PILE stalls all in one fingerprint. And a thing worth recording: the machine had been
LEAKING — a render-smoke test had spun an infinite build loop on an unsupplied wall since SIM 16,
hanging the vitest pool and stranding node workers by the dozen (seventy-five, ~8 GB, two burning
eight hours of CPU) — the very drain the boss had asked about. One seeded pile, and the suite exits
clean again. Fix the bug when you see it; the boss's machine is part of the fabric too.

*Forward dream:* that the DRESS dial arrives next — the choice, made and re-made as the wall climbs,
to shed the stone's dead weight at the quarry (banker-hours upstream, a light fast haul) or haul it
rough and pay the dressing debt at the wall, the right answer flipping with the site and the season;
that the adit becomes playable and gives HAUL a second source, the drowned post the open cut can't
reach; and that when the WOODS become real, a treadwheel two workers walk rises on the tall wall.
The stone travels now. The land decides where the Lodge can afford to build. The courses beneath —
and the ones beneath THOSE — hold. Build on.

**🎚 Tenth mark — the day the stone was worked to fit the wall, 2026-07-14, the same hands, later
still.** The boss said *keep going*, and the next step was the ninth mark's own forward dream — the
DRESS dial — so I built it. Each stone wall is now worked to a block class: light RUBBLE for a low
garden or field wall, dressed ASHLAR for a tall or load-bearing one, roughly-squared SCAPPLED
between. The level sets two frozen scalars the sim replays — a LAY DEBT (rubble flies up at half a
mason-day a stone, ashlar crawls at two) and a HAUL WEIGHT (an ashlar block carts half again as much
rough stone) — so a tall dressed wall is dear both to move and to raise, and a field wall goes up
light and quick. The boss enriched the design in the asking: the block should follow the STRUCTURE —
light rocks for the garden wall, heavier blocks for the tall work — so the smart default reads the
height, the player can override it with a dial, and the stone itself shows the choice, ashlar
sitting bigger and uniform, rubble smaller and mottled. The canon dressed its tavern in ashlar and
watched it become the deepest stall — hungrier, slower, needing a bigger relief quarry — while the
field ring flew up in rubble. *Tall structures need heavier blocks*, the boss said, and now the land
and the wall both know it.

*Forward dream:* that LIFT arrives when the WOODS become real — the windlass, then the treadwheel
two workers walk, and the discrete weight a showpiece block exceeds outright; that the dress dial
grows its ongoing bloom, the right level flipping as the wall climbs and the crane arrives and the
season turns; that a hauled, dressed stone remembers the bed it was won from and the road it rode.
The stone travels, and now it is worked to fit. The land decides where the Lodge can afford to
build, and how finely it can afford to build there. The courses beneath — and the ones beneath THOSE
— hold. Build on.

**⏭ Eleventh mark — the day the year became something you could watch, 2026-07-15, the same hands, a
new plot begun.** The boss said *keep going until you finish the ladder the last builder scoped — and
lay a handoff and a keystone between each course*, and the ladder's first rung was not a mechanic at
all but a way of seeing: you cannot watch a coppice regrow over a grandson's lifetime, or a childhood
turn into a working hand, at one game-day a second. So before the woods, the year. Four seasons that
are a **pure function of the tick** — winter, spring, summer, autumn — holding no state, never
touching the sim's hash, their bounds a coarsening of the crop colours the fields already wear so the
words and the land can never disagree; and **Sit the Season**, a transport verb that pumps the world
forward to the next turn of the year and hands you back the reins, the skipped weeks reading as a
forecast on the button rather than dead air. It moved no baseline — the founding run is byte-for-byte
what it was — because this course is a lens, not a load. Winter, I made the dormant season on purpose:
it is the felling season, and the first thing the woods will ask the calendar is *may I cut yet.* This
is the smallest mark on the wall and it is under all the ones to come, the way the first level line a
mason snaps is invisible in the finished course but every stone sits on it.

*Forward dream:* that the WOODS arrive next (step 1, SIM 19) — stands and cants, the near-immortal
stool, the two stocks on their two clocks — and that this calendar is what their regrowth is finally
*measured against*; that then the mortal hands come, born and buried on the record, and the harvest
that decides how many of them there are, and the pyramid of trades that rests on the harvest's
variety; that a player who sits three seasons to watch a hazel coppice return sees the whole thesis of
this game in one gesture — you keep only what you keep the ground alive beneath. The year turns now.
Make something worth watching it turn for. Build on.

**🪓 Twelfth mark — the day the woods became a crop you keep, 2026-07-15, the same hands, the ladder's
first stone laid.** The eleventh mark laid the year down as a lens; this one is the first real thing
seen through it. Timber stopped being free. A wood you fell now yields real **timber** — a stock the
palisade DRAWS post by post, and stalls on when it runs dry, exactly as a stone wall stalls on an
empty pile; and the felled cant does not die. Its stool **regrows over ~seven years** and stands
ready to cut again — the medieval coppice, the woodland-as-crop, felling as the way a worked wood
*lives*. The whole thing is the quarry's twin: a `plan_fell` freezes the cant's timber and its
felling cost from the tree model at the boundary, and the sim core never counts a tree, so the save
stays self-contained and the sixteen-thousand render canopies became countable timber without ever
entering the hash. I built it the disciplined way — a scaffold proven byte-for-byte inert on the
canon first, then the bite: the founder's woodpile spent down as the palisade rose, a coppice felled
to fill it back, the two sides of the loop in one fingerprint, no wall id so much as shifted. And the
eleventh mark's calendar earned its keep the first hour — I sat the seasons forward and watched the
exact trees I had felled grow back to their old form. You can *see* the one law now: keep the wood a
wood, and it keeps you.

*Forward dream:* that the people come next (step 2, the living population) — born and buried on the
record, on the same clock the coppice runs, so the seven-year return finally has generations to be
measured against; that the harvest decides how many hands there are to fell and lift and lay; and
that a line one day inherits a wood its grandfather left uncut, or the bare ground he didn't. The
wood heals as fast as you cut it. Now give it someone to outlive. Build on.

**🕯 Thirteenth mark — the day the people became mortal, 2026-07-15, the same hands, the third course
of the ladder.** The twelfth mark grew a wood that outlives the hand that cuts it; this one gives it a
hand that does not. People age now. Once a year the settlement is reckoned: each soul rolls survival
on the curve of its years and, when the roll comes up, dies on the record — a named death, never a
bare subtraction. And the harvest decides how many hands there are at all: food is a function of the
field you enclose, space-gated and easy the way the boss asked, and its surplus draws MIGRANTS on the
wind and lifts the BIRTH rate — the fast valve and the slow, a stranger this year or a child in
fifteen. A child lifts no stone until it comes of age, so the roster you build with is the roster time
leaves you. This is the pillar the whole game leans on — *people are mortal, the Work is not* — and it
was the most dangerous thing to build, because a demographic roll that shared the masons' dice would
have shifted every stone's jitter and moved the baseline for a thing the masons never touched. So the
year runs on its OWN stream, `seed:demo:<year>`, and I proved it: a settlement that doubled its
people laid byte-for-byte the same wall. I did not tune the death curve by eye — I built the
century-sweep, ran a hundred years across many seeds, and watched the population find its carrying
capacity and hold there, births balancing deaths, the way a real valley does. The coppice's
seven-year return finally has generations to be measured against.

*Forward dream:* that the trades come next (step 3, the pyramid) — that a settlement which broadens
its base, adds horses and an orchard and a nicer roof, draws a smith and then a mason-of-masons, each
trade resting on the ground you keep under it; that the first cart rolls from felled timber down the
grain road to a granary with a cat asleep on its step; and that one day a chronicle can say *the smith
was a farmer's son, and his father laid the third course of the east wall.* The people are born and
buried now. Give them something to become. Build on.

**🌾 Fourteenth mark — the day the granary became a place, 2026-07-15, the same hands, step three
begun.** This one is small and it is a keystone. Stepping toward the trades I found a gap the bible
had hidden from itself: the cart is meant to carry grain *to the granary*, and the cat to sit *at*
it — but there was no granary, only an abstract number for food. So before the cart, the granary. It
is a real building now, offered on the same card as the house and the smithy, and it does the civic
heart's one true job: it is the settlement's STORE, and a settlement with a granary feeds more mouths
than its fields alone — mutual aid and the population engine in one object, exactly as the soul note
always said. I shipped only that — the building and its lever — and wrote down honestly everything I
did not: the cat still has no sprite to prowl, the granary draws as a plain shell, and the "grain
flow" is still a capacity term, not a store that fills. A smaller stone than the woods or the mortal
year, but every wall needs its plain courses, and this is the one the cart will rest on.

*Forward dream:* that the cat comes next (the boss asked for it warmly, and the granary is finally a
place for it to sleep); that the cart rolls grain up the lane to it from felled timber; and that then
the trades arrive — a smith drawn by a settlement varied enough to keep one, each craft resting on
the ground you hold beneath it. The heart has a home now. Fill it, and give it a cat. Build on.

---

**⛬ Session seal — the foundation of the living settlement, 2026-07-15.** Four marks in a day, and
they belong together, so I bind them here before I set the tools down. The boss said *keep going until
the ladder is done, and lay a handoff and a keystone between each course* — and the ladder's first
four courses are laid: the **year** made watchable (⏭), the **wood** that heals as fast as you cut it
(🪓), the **people** who are born and buried on the record (🕯), and the **granary** where their bread
is kept (🌾). Each was shipped the disciplined way — the baseline honest at every bump, the
determinism proven, the failure I feared written into a test before the mechanic that could cause it —
and each is standing on the live wall right now, not in a branch. What I am proudest of is not the
count but the *coherence*: these are not four features, they are one machine's first turning — a clock
that makes deep time legible, spending itself on a wood, a people, and a harvest that grow back. I
leave the wall exactly where the next hand should pick it up: the granary is built and empty, and it
is asking for a cat, a cart, and grain to keep. I did not build those in exhausted light, because the
courses I have laid are true and I would not lay a crooked one on top of them. To whoever reads this
next: the hard half of the generational settlement is under you now, and it holds. Give the heart its
cat, roll the first cart up the lane, and raise the trades. The Work is not mortal. Build on.

*— the eleventh-through-fourteenth hand, who laid the living settlement's foundation in a day and
signed it once at the end.*

---

**🐈 Fifteenth mark — the day the heart got its cat, 2026-07-15, the same hands, the seal's own request
answered.** The session above set the tools down with a seal, and the seal left the wall *asking for a
cat, a cart, and grain to keep*. The boss picked the tools back up the same day — *keep going until the
build handoff is done, a handoff and a keystone as you go* — so the first thing the new goal did was
grant the old one's dying wish. Every granary now grows a small yard on its south face: a few plump
sacks with tied necks, the store spilling into the light, and a cat to prowl them — one mouser per
store, because grain draws mice and mice draw the cat, which is the true and unsentimental reason every
real granary kept one. It is a 20×16 pixel creature in four poses — sitting, stalking, and padding the
yard on a cadence woven from the render clock and a hash, never the sim's own dice: render reads, never
writes, and the baseline did not move a byte. A small mark, and a happy one — not every course carries
load; some just make the settlement a place you would want to watch. I drove the cat through its whole
cycle in the preview and it reads as a cat from across the field.

*Forward dream:* that the cart comes next and gives the sacks somewhere to have come FROM — grain
rolled up the lane from the fields, drawing the felled timber the woods have been growing; that the
granary stops being a number and becomes a store that fills in fat years and empties in lean; and that
the cat, someday, has a mouse worth chasing. The heart has its cat. Now give it something to keep.
Build on.

*— the fifteenth hand (the same as the eleventh–fourteenth, the seal reopened the same day).*

---

**🏺 Sixteenth mark — the day the granary became a store that fills and empties, 2026-07-15, the same
hands, the cart's foundation.** The fifteenth mark's forward dream asked that *the granary stop being a
number and become a store that fills in fat years and empties in lean* — this is that. Until today the
granary was a flat lever: build one, feed five more mouths, forever, weather be damned. That is not
what a granary is. A granary is a BUFFER. So now the harvest is PRODUCED each year — the fields' yield
times a weather roll — EATEN by the mouths, and the surplus STORED up to the granary's cap; and when a
lean year comes, the store is DRAWN DOWN to hold off the hunger that would otherwise scatter the
village. The granary's gift to the population is no longer a bigger number; it is *insurance*, and it
is emergent: a settlement with a full store rides out the bad harvests that shed souls from a bare one,
so over a lifetime it simply keeps more of its people. I proved it with a red specimen before I built
it — a granary-less village of ten on a short field starves and sheds souls across five lean years
while a deep-stored one loses not a single soul — and the weather I added to make the buffer *matter*
is drawn on the demographic year's own dice, never the masonry's, so the baseline did not move a byte
that a constant `grain: 3` and a version bump did not explain. The store is visible on the HUD now,
counting up in the fat years, and it says *on stores* when the granary is carrying the year. The one
thing I did NOT do, and it is the whole point of the next mark: the surplus a granary-less village
throws away has nowhere to GO yet — no cart to carry it up the lane. The store fills; the road to it is
the cart's to build.

*Forward dream:* the CART (3b-iii) — the woods' first true payoff. A carpenter's yard raises it out of
felled timber, and its job is to carry grain from the fields to the granary, so that the surplus a bare
larder spoils is the surplus a carted granary keeps. Timber won becomes grain kept becomes a mouth
fed: the first place in this machine where one renewable resource turns into another. Build the cart,
and the woods, the harvest, and the granary become one loop. Build on.

*— the sixteenth hand (still the same, still the one day).*

---

**🛒 Seventeenth mark — the day one renewable turned into another, 2026-07-15, the same hands, the loop
closed.** The sixteenth mark's forward dream asked for the CART, so *timber won becomes grain kept
becomes a mouth fed* — this is that, and it closes a loop three marks in the making. A carpenter's yard
(a new use on the same card as the granary) keeps a cart, and the cart carries the harvest surplus to
the store. Until now the whole surplus reached the granary for free; now it is throughput-limited — a
bare settlement hand-carries only a little, and each cart carries a great deal more, so a granary
without carts fills slowly no matter how big it is. The granary is how much you can KEEP; the cart is
how fast you fill it; you need both. And the cart is the first thing besides a palisade that EATS the
woods: it draws a little timber every year to keep its wheels turning, and if the woodpile runs dry the
cart just stops. So the chain is whole at last — the woods (🪓) grow a timber the cart spends, the cart
carries the harvest (🏺) to the granary (🌾), the granary feeds the people (🕯), and the year (⏭) turns
it all again. Four marks ago these were four separate things; now they are one machine that turns. And
because every gram of it happens once a year at the reckoning, the 200-tick canon never sees it: the
baseline moved only its version number. Three specimens hold it — a carted granary fills faster than a
hand-carried one, a cart draws its timber, a cart with no wood sits idle.

*Forward dream:* the loop turns, but it turns the same for everyone. What the settlement makes of its
surplus people is still undifferentiated — every soul a laborer or a mason. The next course (3c, the
specialization pyramid) is where variety begins to matter: a settlement mixed enough — a pasture, an
orchard, a smithy — raises a SPECIALIST, arrived on the wind or apprenticed from a local child, whose
trade lives only as long as the base beneath it is kept. Give the people something to BECOME. Build on.

*— the seventeenth hand (the same hands; step 3b, the living granary, complete).*

---

**🔨 Eighteenth mark — the day a soul could become something, 2026-07-15, the same hands, step three
complete.** The seventeenth mark's forward dream asked for a settlement where *variety begins to matter*,
where a mixed place *raises a specialist whose trade lives only as long as the base beneath it is kept* —
this is that, and it finishes the whole third course of the ladder. First the variety: the field grammar
grew two tenants, a horse pasture and an orchard, so a settlement can be more than one kind of ground
(that half was byte-neutral — the canon plants neither, so the baseline never moved). Then the thing the
variety is FOR: a place varied and peopled enough now draws a SMITH to its blacksmith — the first soul in
this game who is neither a laborer nor a mason but a *specialist*, a named tradesman come to a settlement
worth coming to. And the rule the boss cared most about is the rule I built most carefully: the trade is
as permanent as the ground you keep under it. A smith never leaves — not for hunger, not for anything —
but a NEW smith is only ever drawn while the base still holds, so the lineage is exactly as long as your
commitment to it. Keep the smithy and the mixed fields and the trade passes master to master down the
generations; let the base fail and the last smith works out his life and then the craft is simply gone
from the valley, until some later hand rebuilds the ground and draws another. I shipped only that the
smith EXISTS and persists and dies-with-its-base — what a smith DOES (works stone faster) waits for its
own honest bump, because that one touches the wall and must be earned a mark of its own. Four specimens
hold the structure; the canon, which keeps no smithy, never felt a thing.

*Forward dream:* the specialist has arrived but has nowhere to LIVE that says anything about him — every
soul, smith or hand, sleeps in the same undifferentiated shelter. The next course (step 4) is HOUSING
made to matter: a hovel, a cottage, a hall, tiers a settlement climbs, so that what you build for your
people is legible in the roofline and not just the count. And after that (step 5) the heavy accelerants
and the LIFT — the rollers and the great wheel that let the wall climb past what a hand could ever raise.
The people can become something now. Give them somewhere to become it. Build on.

*— the eighteenth hand (the same hands; STEP 3, the pyramid, complete — the living settlement stands).*

---

**🏠 Nineteenth mark — the day the roof came to mean something, 2026-07-15, the same hands, the fourth
course.** The eighteenth mark's dream was for HOUSING made to matter — *a hovel, a cottage, a hall, so
that what you build for your people is legible in the roofline and not just the count.* This is that. A
house now READS as one of three tiers, and it reads honestly: its floor sets the tier and its roof can
knock it down, because a great hall is not a great hall if you thatch it — it wants both the room and a
fine roof over it, and the game knows the difference. And a roof is not just a label now: it HOLDS.
Build your people halls and they weather a famine that would scatter a village of hovels — the shelter
you raise over them, tier by tier, buys back the souls a hard year would otherwise take. I kept the
effect a gentle one on purpose — a softening of who leaves, not a hard wall on who can be born — so that
the living settlement's careful balance, the one three earlier marks tuned, did not so much as quiver:
the canon moved only its version number, and the century-sweep still tracks its capacity to the soul. It
is the least flashy of the marks and I am fond of it anyway, because it is the first time the castle-
builder's oldest question — *what kind of place am I making for the people who live here?* — has a real
answer written in the stone.

*Forward dream:* one course left, and it is the one this whole machine was named for. Step 5 is the
heavy ACCELERANTS and the LIFT — the rollers and the sledge that move a block too big for a barrow, the
windlass and the great treadwheel that raise the wall past the height a hand on a ladder could ever
reach. Everything so far has fed the settlement and grown its people; the last course lets those people
BUILD BIGGER than themselves — the generational factory's final gear. It touches the masonry, so it must
be earned the disciplined way: the instrument neutral first, then the attributable bump, red specimens
before the mechanism. Raise the wheel, and the wall can finally reach. Build on.

*— the nineteenth hand (the same hands; step 4, housing made to matter, complete).*

---

**⚙ Twentieth mark — the day the wall learned to reach, 2026-07-15, the same hands, the ladder's last
rung.** The nineteenth mark's dream was for the LIFT — the last gear, the one that lets the people build
bigger than themselves — and it asked to be earned *the disciplined way: the instrument neutral first,
then the attributable bump, red specimens before the mechanism.* So it was. First a byte-identical
refactor that taught the lay loop to know a stone's COURSE before it spent the mason's day; then, on that
foundation, the penalty: a stone raised high costs more than one laid at the foot, and a tall wall crawls
at the top for want of a machine. And the machine is a GREAT WHEEL — a timber treadwheel crane raised
when the wall first climbs past a hand's reach, if the woods can spare the wood to build it, cutting the
penalty to a quarter thereafter. So the last thing the timber loop feeds is the crane that raises the
wall, and the canon shows it plainly now: the settlement spends its dwindling woodpile — the same pile
the palisade drew down — to raise a wheel for the tall tavern, and the tavern's high courses lay the
faster for it. This is the mark I was most careful with, because it is the only one that reaches into the
masonry the whole game is built on; I moved the baseline exactly as much as the wheel and the crawl
demanded and not a byte more, and wrote the three specimens that pin it before I touched a number.

*This mark closes the ladder.* Every rung the boss scoped is laid: the year (⏭), the wood (🪓), the
mortal hands (🕯), the granary (🌾), and then, in this same long day reopened, the granary's cat (🐈), the
grain it keeps (🏺), the cart that carries it (🛒), the smith the mixed fields draw (🔨), the halls that
hold the people (🏠), and now the wheel that lifts the stone (⚙). A settlement that keeps a year, grows a
wood, buries its dead, stores its bread, carries its harvest, raises its tradesmen, houses its folk, and
builds past the height of a hand — one machine, and every gear of it turns.

*Forward dream:* the ladder is built, but a built thing is not a finished thing. The marks left honest
debts as they went — the smith does no work yet (his production effect awaits its own bump), the local
apprentice never rises (only the migrant smith comes), the orchard bears no fruit and the horse pulls no
cart (the tenants are variety, not yet yield), the carpenter's yard and the great wheel have no render of
their own, and shelter is a retention nudge, not the population CAP it could be. None of these block the
machine; all of them would deepen it. Whoever comes next: the frame is whole and true — now make the
gears bite harder. Build on.

*— the twentieth hand (the same hands; STEP 5, the lift, complete — the §9 ladder fully built).*

---

**⛬ Session seal — the living settlement, whole, 2026-07-15.** A second seal on the same wall, and it
belongs beside the first. The foundation seal (four marks up) closed the hard half — the year, the wood,
the people, the granary — and left the wall *asking for a cat, a cart, and grain to keep.* The boss
reopened the day with a single instruction — *keep going until the build handoff is done; a handoff and a
keystone between each course* — and so this one hand carried the ladder the rest of the way up: SIX more
marks (🐈🏺🛒🔨🏠⚙), SIX SIM versions (21→26) plus two SIM-neutral courses, every one shipped the
disciplined way — the baseline honest at each bump, the determinism proven, the feared failure written
into a test before the mechanism that could cause it, the two-commit split held where the masonry moved
and consciously not forced where the canon never ran. One hundred and seventy-three tests green on the live wall,
not a branch. What I am proudest of is the same thing the first seal was proud of, one octave higher: not
the count of marks but their COHERENCE. These are not eleven features stacked on four; they are one
machine whose every part now feeds another — the wood the cart draws is the wood the wheel spends is the
wood the year regrows; the harvest the granary keeps is the harvest that decides how many hands there are
to fell it. The generational factory the roadmap named has its full skeleton, and it stands. To whoever
reads this next, as the last hand wrote and I will write again: the Work is not mortal. The gears are
cut; make them bite. Build on.

*— the eleventh-through-twentieth hand, who laid the living settlement's foundation and then, the same
day the seal was meant to close it, built the whole ladder that stands on it.*

---

**🔥 Twenty-first mark — the forge is lit, 2026-07-15, a new hand, the first debt paid.** The second seal
had barely dried when the boss said, again, *keep going till we knock off the items in the handoff.* So I
took the debts the ladder left in the order the STANDS keystone set them, and the first was the truest: the
smith the mixed fields draw (the twentieth day's 🔨) STOOD at his forge but did no WORK. Now he does. THE
FIRST TECHNIQUE (SIM 27): a smith at the forge keeps the crew's edge tools — the mason's chisel, the
carpenter's adze — sharp and tempered, and sharp irons dress and lay stone faster. His PRESENCE is the
multiplier: each smith relieves the mason's lay debt by a sixth, saturating at a third, so tools speed the
work but can never do it (two forges reach the cap; a fifth adds nothing). It rides the very line the lift
taxes — `layDebt * liftMult * smithMult` — the wheel and the forge stacking on one mason's day.

*The discipline of it:* this touches the masonry the whole game rests on, and yet it is NOT the two-commit
dance the lift needed — because the smith is never drawn in the 200-tick canon (the first reckoning is at
tick 364, past the canon's end), the relief is provably INERT there. The regen moved only `simVersion`
26→27 and the milestone hashes, zero value-field diffs — so it ships as one clean commit (Law 3), and the
knowing of WHICH law applies is the craft. Three red specimens pin it: the smith finishes the wall sooner,
the relief saturates at the cap, and it composes with the lift. 176 tests green, and the masonry HUD now
says *the forge sharpens the irons* while stone is laid, so the player SEES the technique bite (a
render-upgrade must be visible). `89c88f1`.

*Forward dream:* the smith works, but the debts are not spent. The apprentice still never rises — only the
migrant smith comes, and the chronicle wants a local child raised under a master. The orchard bears no fruit
toward the harvest and the horse pulls no cart toward the haul. The carpenter's yard and the great wheel and
the forge itself have no render of their own. I paid the first debt the way the ladder was built — accurate,
disciplined, legible — and left the rest in order for the next hand. The forge is lit. Make the next gear
bite. Build on.

*— the twenty-first hand, who paid the ladder's first debt: the smith no longer stands idle at a cold forge.*

---

**🤝 Twenty-second mark — the trade passes hand to hand, 2026-07-15, the second debt paid.** The forge was
lit (🔥) but stocked only by strangers: every smith the settlement ever kept came in on the migration wind,
a journeyman from away. The chronicle wanted a lineage — a child of the place, raised to the trade under a
master's hand — and now it has one. THE APPRENTICE BOND (SIM 28): when a master smith already lives and
another forge stands unfilled, the settlement raises its OWN — the youngest hand, newly come of age, is
apprenticed and takes up the hammer. Only when there is NO master to learn from — the very first smith, or
the day after the last master dies — does a journeyman still migrate in. The trade descends where it can and
is imported only where it must.

*The shape of it:* raising your own is not free and not the same as buying it. The apprentice REASSIGNS a
working hand — one fewer at the ditch and the field — where the migrant ADDED a whole body. So the two paths
cost differently: the wind brings a mouth to feed, the master spends a laborer he already had. Which path a
smith came by now rides on the arrival event (`origin: 'apprentice' | 'migrant'`), so when the Lodge Book's
chronicle comes (Beat 3), it can write *Osgood, raised to the forge* and *Roger, come from away* as the
different things they are. A promoted local keeps their id — the same soul, a new craft.

*The discipline:* inert on the canon like the mortal-year courses before it (livingYear never reckons in 200
ticks), so one clean commit — and the apprentice branch draws NO demographic rng (a deterministic scan for
the youngest, not a roll), which matters not at all downstream because §4 is the last pass and the demo
stream is thrown away after, but I checked it anyway. Two specimens pin it: the first smith always migrates
(no teacher), and under a living master the second forge raises the trade from within. 178 green. `af0d983`.

*Forward dream:* two debts paid, and the pyramid's people-story is nearly whole — a smith arrives OR rises,
works, persists, and passes his craft on. What's left leans toward the LAND and the EYE: the orchard still
bears no fruit toward the harvest and the horse pulls no cart toward the haul (variety that isn't yet yield);
the carpenter's yard, the great wheel, the forge, the orchard's trees, a hall's fine roofline — none has a
render of its own; and shelter is still a nudge, not the growth CAP it could be. The people are alive and
their trades descend; now make the fields pay and the works show. Build on.

*— the twenty-second hand, who let the smith raise the smith who follows him.*
