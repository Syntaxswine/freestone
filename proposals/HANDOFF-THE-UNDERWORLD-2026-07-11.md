# HANDOFF — THE UNDERWORLD

*2026-07-11 · from the day the world grew a downward · Castle Cultivator (repo codename
`freestone`)*

You are the next builder. Read the FOUNDATION keystone first
([HANDOFF-FOUNDATION-2026-07-09.md](HANDOFF-FOUNDATION-2026-07-09.md) — the soul, the
nine laws, FIVE maker's marks now; add yours BELOW, never above), then the courses that
raised the surface world: TOYBOX ([HANDOFF-TOYBOX-2026-07-09.md](HANDOFF-TOYBOX-2026-07-09.md)),
HUSBANDRY ([HANDOFF-HUSBANDRY-2026-07-10.md](HANDOFF-HUSBANDRY-2026-07-10.md)), and
WORD-AND-LEVEL ([HANDOFF-WORD-AND-LEVEL-2026-07-10.md](HANDOFF-WORD-AND-LEVEL-2026-07-10.md)
— designation, the drawings, the survey). This is the course that went the other way: the
land, which until now was a surface to build ON, became a body to dig THROUGH.

The fourth builder's forward dream ended *"when the quarry finally opens in the Low Main
Post, the first surveyed wall of NAMED stone runs so true along the bank…"* — and this is
the day the quarry opened, in that exact seam. What follows is how.

---

## 1. What this arc built (all pushed, 115/115 green)

The boss gave three sentences: *"populate the world under the landscape with minerals. you
have core samples and geology reports for the area. the minerals need data for how quickly
workers could dig through that area. rock production should exceed what is actually removed
from the earth to encourage building great works."* Four courses answered them, and the
FABLE 5 USAGE LIMIT cut two fleets off mid-run — the boss switched me to Opus and the work
resumed (law 6):

- **The transcription tier — DONE.** All **64 priority holes (≥30 m)** read from the real
  BGS scans into schema JSON — **1,545 strata intervals** (research/boreholes/transcriptions/).
  A 64-agent vision fleet did it; the Fable limit cut it at 25 and the Opus resume finished
  the rest from cache. The agents were archivists, not OCR: Kepier detected its OWN missing
  scan page and carried a derived gap so the depth chain stayed continuous; Franwellgate
  1839 transcribed a self-correcting clerk slip verbatim rather than reconciling it; Elvet
  was re-audited and held. `tools/transcription-check.mjs` is the QA GATE (exit 1, unlike
  the passive canary), and it earned two rounds of "the probe is a design instrument" all
  over again (law 2).
- **The dig-rate spine — VERIFIED AT SOURCE.** The ILO/ASIST excavation ladder —
  **5.0 / 3.5 / 3.0 / 2.0 / 0.8 m³ per person-day**, soft → rock, with tool-based hardness
  definitions (shovel → pick → crowbar → sledge-and-chisel) — extracted verbatim from the
  source PDF, cross-corroborated by CPWD/NAVFAC/navvy. Post (sandstone) at 0.8 is one-sixth
  the pace of drift. Stone recovery ~29% real, independently verified — the number the
  generous inversion is measured against. research/DIGEST-2026-07-10-dig-rates-and-yield.md.
  (A 7-lens fleet returned 126 finder claims; its verifier pass ALSO died on the limit, so
  the spine was hand-verified and the rest marked unverified — law 3.)
- **The bed model — DONE.** `tools/build-bed-model.mjs` → `public/data/site-durham/beds.json`:
  60 surface-registered strata columns on the same site-local frame as the terrain, plus the
  named coal seams fitted to least-squares dipping planes (**Tilley RMS 0.1 m, Busty 0.7** —
  clean, real horizons). Rockhead 0–73 m; the local dip is gentle S-SSE, the Wear gorge
  bending the textbook eastward trend, read straight from the data.
  research/boreholes/SEAM-LADDER.md is the verified correlation spine (High Main → … →
  Brockwell).
- **SIM 14 — THE QUARRY** (`02c868d` core + `0738d8c` render). `plan_cut` is a fill turned
  DOWNWARD: the same ring gesture, dug through the strata at a MATERIAL-AWARE pace, yielding
  building stone with the generous inversion (STONE_YIELD > 1.0). The economics are read
  from the bed model at the COMMAND BOUNDARY and frozen into the command (law 1); idle
  laborers dig it (a quarry outranks fields, not fills); the stockpile is credited once, on
  completion. **The bridge came back this session** — first live eye-check of the whole arc:
  I opened a quarry through `__cc`, watched the crew dig it out, and the pit floor sank to
  its frozen floorLevel (a real ~6 m depression, geometry confirmed at 57.67 m), HUD reading
  "quarries 1 — stone 120 m³".

**On the shoulders of:** the survey-freeze law (SIM 13) is the pattern the quarry economics
borrowed; the fill gesture and its ring hygiene (SIM 2/8) are what `plan_cut` reuses whole;
the command/replay law and the baseline instrument (M1) made a new sim version cost one
inert regen to prove safe; the borehole fetch→PNG pipeline (M2 groundwork) had already
turned 900 scans into readable pages. This day was fast because those courses hold.

## 2. New laws paid for

1. **The bed model lives at the command boundary, not the sim core.** `cutEconomics(beds,
   x, y, depth, area)` reads the strata and returns workTotal + stoneTotal, which are FROZEN
   into `plan_cut` (the survey-freeze law, generalized). So `worldStep` never takes a bed
   model, the deterministic core stays pure, and a save reproduces byte-identically even
   after beds.json is regenerated. The bed model is INPUT that shapes commands, like the
   player's mouse — not state the sim carries. When a new data source must inform a
   mechanic, ask whether the sim needs it or only the command does.
2. **The probe is a design instrument — again, and it refutes the CHECKER now.** The
   transcription checker's first cut hard-failed four records. Every one was a REAL log
   variant, not bad data: a depth-primary NCB log (thickness blank, the depth column is the
   spine); a feet-and-inches-only log (fathoms=0, the whole depth in the feet slot); Elvet's
   acknowledged shaft→boring datum restart; and a SUMMARY section listing only marker seams
   with unrecorded strata between. Each hard failure was a correction to the *instrument*,
   not the data — the checker learned the craft. A QA gate that fails honest inputs is
   telling you about itself.
3. **Verified spine, honest tail — a dead fleet downgrades to neither fiction nor a
   blocker.** The dig-rate research fleet's 126 finder claims survived (in the journal) but
   its whole verification pass died on the usage limit. The move: hand-verify the ONE number
   the mechanic actually stands on (the ILO ladder, confirmed at source), ship on it, and
   mark everything else `[finder-claimed, unverified]` with a re-verify-before-it-ships note.
   Don't let a dead verifier promote guesses to facts, and don't let it block the build the
   verified spine already supports.
4. **Production-exceeds-removal is a LABELLED game choice, sitting above the real number.**
   Real sandstone quarrying yields ~0.29 m³ of dressed stone per m³ dug. The boss wants the
   opposite feel, so STONE_YIELD is 1.25 — and it is documented AS a deliberate inversion,
   in the same file as the real recovery it departs from (DIGEST §4). The honest bridge: the
   quarry waste is the wall's rubble core, so most of what's dug builds wall anyway; the
   generous bump on top is the "great works" thumb, named as such. Follow the science; when
   you leave it on purpose, say so and say from what.
5. **The two-commit discipline holds even when the state grows.** Adding cuts[]/stockpile to
   WorldState moves the hash no matter what — new fields serialize. So "byte-identical" can't
   mean the hash; it means the NUMBERS. Commit A regenerated the baseline with the canon
   UNCHANGED and proved (by diff) every milestone number identical to SIM 13 — only the
   version and the empty fields moved the hash. That is the inertness proof. Commit B added
   the canon quarry, the attributable bump. Separate "did I disturb the old physics" from
   "here is the new behavior" even when a field addition forces the fingerprint to move.
6. **A limit is not a loss if the work is resumable.** The Fable 5 cap cut the transcription
   fleet at 25/64 and killed the research verifiers entirely. Both were recoverable: the
   Workflow resume replayed the 25 done from cache and finished the rest on Opus; the
   research finders' claims were already in the journal. Design long fleets so a hard stop
   mid-run costs the unfinished tail, not the whole run.
7. **The honest column: an interval occupies [depth − thickness, depth].** A summary log
   records a 2.5 ft seam at 89 ft with unrecorded strata above it. The naive column-builder
   (top = previous base) would have smeared 40 m of solid COAL across that gap. The fix: an
   interval spans [depth − thickness, depth], and where thickness ≪ depth-delta the strata
   above are `unknown`, never the seam's material. Contiguous and depth-primary logs reduce
   to it exactly. When you reconstruct geometry from a sparse record, make the gaps
   `unknown`, don't interpolate the last known thing across them.

## 3. Traps of the arc (pay once)

- **The usage limit is real and mid-fleet.** A 64-agent vision fleet or a 133-agent research
  fleet can hit the cap partway. Structure them to resume (Workflow `resumeFromRunId` +
  cache), and read the journal before assuming a "failed" run lost its data — the finders'
  results were all there.
- **A checker that fails honest inputs is describing itself.** Before "fix the data," ask
  whether the record is a legitimate variant the instrument doesn't model yet. Four of four
  hard failures here were the checker's gap, not the transcriber's.
- **The founding party takes ids 1–4.** The first player-minted id is 5, not 1 (a cuts test
  probed a farm at wallId 1 and read `undefined`). The probed-id ritual applies to tests too.
- **Guard the fan-out against a STRING args.** The transcription workflow's first launch
  threw `args.map is not a function` — the runtime handed the roster in as a JSON string.
  `typeof args === 'string' ? JSON.parse(args) : args` at the top of any script that maps
  over `args`. (This is a standing law from other repos; it bit here too.)
- **The pit reads subtly.** The floor sinks correctly (geometry confirmed) but the
  grey-brown-on-sage, shallow-depth, oblique-angle combination makes a quarry easy to miss.
  Left as a boss aesthetic call, not silently "fixed" — but know the depth cue is weak.

## 4. State of the fabric

SIM_VERSION 14 · 115 tests across 15 files (all green) · commits `ad8e348` → `bc8b28c`, all
pushed. The player's surface gained ⛏ quarry (Q): ring the ground, the height slider sets
the DEPTH, and the plan row reads the strata under the ring — "quarry N m² · D m deep into
post · ~P person-days · wins ≈S m³ of stone." The world beneath is 64 real Durham boreholes'
worth of strata; the crew digs post slower than drift; the won stone accrues to a stockpile
the HUD shows ("quarries N — stone M m³"); and the chronicle knows the day each pit was
opened and each load of stone won. Everything event-sourced, everything replayable, the
canon fingerprinting a quarry into the bare Low Main Post at NZ24SE109 (tick 300 → dug out
by ~368; the 400 milestone catches cutsComplete=1, stockpile 135, and the field-workdays
fallen by exactly the person-days the quarry pulled off the fields).

## 5. Next courses (in order, unless the boss redirects)

1. **The CONSUMPTION loop** — walls draw on the stockpile. Today production is a visible
   resource that nothing spends; the natural next course is masonry consuming won stone, so
   a wall stalls when the quarry hasn't kept up. This closes the economy the boss asked for
   ("great works") and is where the wall ladder (thickness × wythes × stone demand — the
   standing M2 open thread) finally bites: a thicker wall wants more stone, so the quarry and
   the coursework tune together. Sim change → baseline regen discipline.
2. **Spoil → fill coupling** — the "cut as well as fill" thread's second half: a quarry's
   removed drift/rubble becomes earth a fill can draw on (one command's dirt is the other's
   rampart). Today the cut wins stone but the spoil vanishes.
3. **The render polish the eye flagged** — the pit's depth cue (contrast/shadow), and the
   people-layer descent (laborers stand on the rim, not the pit floor; CutLayer already
   exposes `floorAtShow` for their feet). Aesthetic calls the boss shapes.
4. **Bed exhaustion + per-stone provenance** — M2's larger arc: a quarry works OUT, the
   forbidden Hutton under the cathedral is a real management line (durham delight), and a
   dressed stone remembers which seam it came from.

## 6. Open questions for the boss

SCOPE §14 unchanged (era ~1200s, idle tolerance, chapel long game, tone ceiling). New ones
from the underworld: should the quarry GESTURE stay a ring-dug-down, or become a hillside
face cut into a slope (Durham quarried the riverside Low Main cliff, not pits)? Should the
generous yield (1.25) be tuned by the boss's eye like the dyke step was? Should walls draw
stone from the NEAREST stockpile or a global one (does hauling distance matter)? And the
standing one, now inverted: the real-hours transcription spend is DONE — the next real-hours
question is whether the second tier (148 holes at 15–30 m) is worth transcribing for a
denser bed model, or whether 64 holes is enough to build the quarry economy on.

---

*The chronicle knows the day the first pit was opened. It was dug into named stone. The
courses beneath — and now the courses beneath THOSE — hold. Build on.*
