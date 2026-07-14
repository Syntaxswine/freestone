# HANDOFF — THE DRESSED STONE (the day the stone was worked to fit the wall)

*2026-07-14 · from the session that built the DRESS dial — Phase 2 of the carriage layer, SIM 18 ·
Castle Cultivator (repo codename `freestone`)*

You are the next builder. Read the FOUNDATION keystone first
([HANDOFF-FOUNDATION-2026-07-09.md](HANDOFF-FOUNDATION-2026-07-09.md) — the soul, the nine laws,
**TEN maker's marks** now; add yours BELOW, never above), then the plot this stands on
([HANDOFF-THE-CARRIAGE-LAYER-2026-07-13.md](HANDOFF-THE-CARRIAGE-LAYER-2026-07-13.md) — the whole
WIN→HAUL→LIFT→LAY design), then the two courses beneath this one
([HANDOFF-THE-HONEST-STALL-2026-07-13.md](HANDOFF-THE-HONEST-STALL-2026-07-13.md) — Phase 0, the
consumption loop; [HANDOFF-THE-CART-2026-07-14.md](HANDOFF-THE-CART-2026-07-14.md) — Phase 1, HAUL),
then the design it serves ([PROPOSAL-LOGISTICS-2026-07-13.md](PROPOSAL-LOGISTICS-2026-07-13.md), esp
§5 Phase 2, the §3 dress row, and §4.6 — the fun-risk this course answers).

The boss handed the thread with *"keep going"*. The next step was the carriage layer's Phase 2 — the
**DRESS dial**, the missing lever between HAUL and LAY. Of the one genuine fork (who chooses the
dress level?) the boss picked **smart default + override** — and, in the asking, enriched the design:
*"if you are making different sizes of stones perhaps they should be used for different kinds of
buildings. the low garden walls of the farms can be made with light rocks no problem. but tall
structures or retaining walls might need heavier blocks."* So the smart default reads the
**STRUCTURE**, and the block itself now shows the choice.

---

## 1. What SHIPPED (SIM_VERSION 17→18, 139 tests green, build clean, LIVE)

Two commits, the two-commit discipline again:

- **The block-class readout** (`78b03df`, byte-identical, still SIM 17). Instrument before mechanism:
  the wall plan row now names, beside the haul verdict, the block class the STRUCTURE calls for —
  rubble for a low garden/field wall, ashlar for a tall/load-bearing one, scappled between. A pure
  function of the drawn height; no wall field, no command, no sim change. Baseline unmoved.
- **The DRESS dial** (`1ea7bf4`, SIM 18 — the attributable bump). Each STONE wall carries a
  `dressLevel` (rubble | scappled | ashlar) frozen at plan time, and the level sets two scalars the
  sim replays from a **constant table** (no geometry, no bed model):

  | level    | layDebt (mason-days/stone) | haulFactor (rough m³ carted/block) |
  |----------|----------------------------|-------------------------------------|
  | rubble   | 0.5 (lays quick)           | 1.0 (light)                         |
  | scappled | 1.0 (the SIM-17 cost)      | 1.0                                 |
  | ashlar   | 2.0 (lays slow)            | 1.5 (dressing waste rides the cart) |

  `layStones` spends the level's `layDebt` from the mason's daily quota; `haulStone`'s face demand and
  the pile/face draw use `DRESS_DRAW` (STONE_VOLUME × haulFactor). So a tall ashlar wall is dear both
  to **MOVE** (its face wants half again the stone per block → its cart falls behind sooner) and to
  **RAISE** (twice the mason-days); a rubble field wall flies up light. The ~4× lay swing is
  Guédelon's ~8× (fine ashlar ~2 days/stone vs rough ~4/day) cozily compressed.

The **smart default + override** (the boss's pick): the class keys off the STRUCTURE — the boundary's
`autoDress(height)` returns ashlar ≥ BUILDING_MIN_H (2 m), rubble ≤ FARM_WALL_MAX_H (1 m), scappled
between — and freezes that default when the `⚒ dress` dial reads `auto`. The dial
(`auto → rubble → scappled → ashlar`) pins an override, so the **site-flip lives in the choice**: a
tall wall far from stone is a dear ashlar haul you can lighten to make it buildable, or pay for. And
the dress **reads in the stone itself** (render-only, keyed on the stone id, never the sim rng):
ashlar sits as bigger (×1.05), uniform, tight-fitted blocks; rubble as smaller (×0.90–0.98), varied,
mottled fieldstone — plan-view scale only, so the course height is untouched and the layers stay even.
*"Different sizes of stones"* made real.

The canon was re-authored to MODEL the physics (Law 2 from the honest stall): the field ring FR and
the low hauled wall A go up in light **rubble** (FR done ~67, twice as fast); the tall tavern BS is
dressed **ashlar** — the deepest stall, hungrier (~42 m³, not 28) and half-again slower, so the
relief quarry Q2 is bigger and opened earlier (32 m³ @ tick 92) to feed it. BS finishes ~123, a hair
before the span is drawn, so **FR 225 / BS 334 / roof 2531 all HELD** — dress moves TIMING, not
counts. `dress.test.ts` (6 red-specimen) pins the lay speed, the haul weight (local and hauled), the
absent→scappled byte-identity, conservation with the per-level draw, and byte replay. Verified live in
the real bundle via `__cc`: `simVersion 18`; a full-pile rubble wall laid 220/220 while its identical
ashlar twin managed 31 in the same 3 ticks; the stone mesh's x-scale histogram is rubble 0.90–0.98,
ashlar 1.05.

## 2. Laws paid this session

1. **The absent-default is 'scappled', and scappled is byte-identical to SIM 17.** A `plan_wall` with
   no `dressLevel` replays exactly as before (old logs/saves unmoved), because `DRESS_DRAW.scappled`
   = STONE_VOLUME × 1.0 = STONE_VOLUME *bit-for-bit* (×1.0 is IEEE identity) and layDebt 1.0 subtracts
   from an integer quota exactly as the old `−= 1` did. This is what let Commit A be byte-identical and
   Commit B move the baseline only where the CANON freezes a non-scappled level.
2. **layDebt is a quota-cost, not a per-stone gate.** The day's LAST stone is affordable whenever the
   mason has quota left (they finish the block they began); the quota resets each day, no cross-day
   carry. This is clean because masons pace 24–36 stones/day ≫ any layDebt — a slow lone mason can
   still lay an ashlar block. All values are exact dyadic floats (0.5, 1.0, 2.0, 1.5), so the subtract
   and the draw stay IEEE-exact: no quantization, no hash risk (the STONE_VOLUME law extended).
3. **Timber is never dressed — wood freezes to 'scappled'.** The boundary pins wood walls to scappled
   (layDebt 1.0, and they draw nothing anyway), so a stray ashlar level can never make a palisade lay
   slow. The sim trusts the frozen level; the invariant lives at the boundary.
4. **The smart default keys off the STRUCTURE; the site-flip moved to the OVERRIDE.** The proposal's
   dress dial was to "flip with the site." The boss's reframing is cleaner: the *structure* decides
   the class (a field wall wants rubble regardless of where it sits; a tower wants ashlar regardless),
   and the *site* shows up as the CONSEQUENCE (a far ashlar wall is dear) that you answer with the
   override. Default = legible/cozy; override = the lever.
5. **Dress moves TIMING, not counts — so the ids hold.** `stonesTotal` is geometry (unchanged by
   dress); the level changes *when* and *how dearly* a stone is laid, not *how many*. Because every
   canon wall still finishes before the span is drawn, the nextId progression — and FR 225 / BS 334 /
   roof 2531 — is identical to SIM 17.
6. **The visible stone is render-only, verified by the instance matrix.** The per-dress scale is a
   pure read of `wall.dressLevel` keyed on the stone id (the render never writes state; plan-view
   scale only). Screenshots time out on the WebGL canvas — verify the visual by reading the stone
   InstancedMesh's x-scale histogram via `__cc.scene` (as this session did), not by pixels.

## 3. Traps of the arc (pay once)

- **Making a canon wall ashlar STARVES it unless the relief quarry grows.** Ashlar draws 1.5× the
  pile per block, so dressing the tavern raised the canon's total stone demand by ~14 m³ — past what
  Q1+Q2 won. The tavern never finished, the roof (needs a finished wall) rejected, and the id chain
  broke. The fix was to grow Q2 (20 → 32 m³) and open it earlier (tick 110 → 92) so ashlar BS
  finishes ~123, before the span at 135. **Probe the timing before you freeze canon dress levels** — a
  throwaway `test/_probe.test.ts` that logs each wall's completion tick is the right instrument (this
  session's took ten minutes and saved a blind retune).
- **Screenshots of the built site time out.** The renderer is busy (16,872 trees + the stones); the
  `computer{screenshot}` call hangs at 30 s while `__cc` evals stay instant. Verify SIM state and even
  the *render* (instance-matrix scales, colors) through `__cc`; leave the pixels to the boss's eye on
  the deploy.
- **The `dummy` Object3D leaks scale if you forget to set it every instance.** The stone-sync loop
  reuses one `THREE.Object3D`; since I now set `dummy.scale` per stone, every branch must set it (it
  does — scappled/wood get `1`). If you add another per-stone transform, reset what you don't use.
- Still true from Phase 1: a `while (built)` loop over `worldStep` MUST supply stone or it hangs the
  vitest pool forever (the render-smoke leak). If a full `vitest run` never prints its summary, check
  `Get-CimInstance Win32_Process -Filter "Name='node.exe'"` for `freestone*tinypool` and Stop-Process
  them. The suite currently exits clean in ~1.3 s.

## 4. State of the fabric

SIM_VERSION **18** · **139 tests** across 18 files (all green, suite exits clean) · build clean
(`tsc -b && vite build`) · commits `78b03df` → `1ea7bf4` (+ docs `24b47f7`), all pushed · **playable**
at https://syntaxswine.github.io/freestone/. The player must win stone before a wall rises (SIM 16),
the stone must reach the face by cart at a route-frozen rate (SIM 17), AND each wall is now worked to
a block class that sets its lay debt and haul weight (SIM 18). Of the carriage layer, **Phase 0
(consumption), Phase 1 (HAUL) and Phase 2 (DRESS) are BUILT**; LIFT (3), season/mortar (4) and the
landing (5) are plotted, not built. The adit exists in the sim but is not yet playable.

## 5. Next course — THE WOODS (the boss picked timber, and named the twist)

The boss chose the next thread: **timber next**, and immediately named the design that makes it right
for *this* game — *"we are going to need tree repopulation too, since this is a generational
builder."* That is the whole shape of the course. Write it as its own **PROPOSAL-WOODS** first (the
design bible, with the research, exactly as LOGISTICS and MINING were), then build:

1. **The WOODS become a real consumable — with a generational regrowth clock.** Today the trees are
   render-only ([src/render/trees.ts], 16,872 placed by slope). Making timber a stock the build DRAWS
   is a ground-up sim subsystem (proposal §4.4 flags it as a prerequisite, not a free extension) — and
   the boss's twist is load-bearing: a wood you fell for a crane or scaffold must **grow back over
   generations**, or you deforest the peninsula and the mechanic dead-ends. This is *exactly* how the
   real thing worked: medieval woods were **coppiced** — cut on a rotation and left to regrow from the
   stool over ~7–30 year cycles — and managed as a renewable crop, not mined. The generational clock
   this game already turns on makes regrowth **visible and meaningful**: a stand you clear-cut in one
   lord's time is grown timber again in his grandson's. Sustainable harvest = don't outrun the
   regrowth; over-cut and a generation inherits bare ground. That is the granary's civic thesis
   (mutual aid across time) written into the land itself — the FOUNDATION's soul made a mechanic.
   Seeds for the proposal: timber as a stock (a felled tree → timber won, like a quarry → stone won);
   a regrowth model (per-stand or per-tree age advancing on the year clock; coppice stools regrow
   faster than seedlings); a legible READ of a wood's health (over-cut ↔ recovering ↔ mature); the
   research to verify (coppice-cycle lengths by species, medieval woodland yields, the Weardale/Durham
   woods if the site has them). Determinism: the regrowth is a pure function of the tick and the
   frozen stand data — no terrain in the core, like every carriage scalar.

2. **THEN LIFT — carriage Phase 3.** Once timber is real and renewable, LIFT can land: a free hand
   windlass below a height band, a **commission-a-crane** choice (a treadwheel two workers walk,
   costing timber from the WOODS) that raises the delivery cap as the wall climbs, and a discrete
   **weight ceiling** (`maxBlock`) a showpiece ashlar block exceeds outright — which is where the
   dress dial's *heavy blocks* finally bite a second way (PROPOSAL-LOGISTICS §1 LIFT, §4.2, §3
   crane row; the one UNVERIFIED number — "~6 t/day crane" — must NOT be used, derive throughput from
   the verified anchors in §Appendix). Scaffolding that auto-rises also draws WOODS timber (§3).

Other live threads, when the boss steers there instead:

3. **The adit, made playable** (from THE LAND DECIDES §5.1) — self-contained (the sim core exists):
   the two-click portal→heading tool + `src/render/adits.ts`, giving HAUL a second source, the
   drowned post the open cut can't reach.
4. **The dress dial's deeper bloom** — the right level flipping as the wall *climbs* (once LIFT
   throttles heavy blocks) and the season turns; and literal varying block **sizes** per structure
   (the boss's "different sizes" taken all the way — a bigger change, touching the survey, the stone
   counts and the baseline, so scope it deliberately). Both are accretions on the seam just built.

## 6. Open questions for the boss

- **Do the dress constants feel right?** layDebt 0.5 / 1.0 / 2.0 (a 4× swing) and ashlar's 1.5×
  haul — eye them on the deployed site: is an ashlar tower *dear enough* to make you think, or too
  punishing? The real anchor is ~8× (Guédelon); 4× was the cozy compression — say if you want it
  sharper.
- **Does the visible stone read?** Ashlar ×1.05 uniform vs rubble ×0.90–0.98 mottled — on the deploy,
  is the difference legible, too subtle, or does rubble look gappy? (Kernel-verified present; the look
  is your call.)
- **The WOODS timescale (for PROPOSAL-WOODS):** how many years/generations should a coppiced stand
  take to regrow? Should over-cutting be a gentle, recoverable scar (the house tone — never a fail),
  and should a wood's health show as a field-guide read or stay in the land's look alone?

---

*The masons used to lay whatever the pit gave them, every block the same. Now the stone is WORKED
before it is set — a garden wall of light rough fieldstone thrown up in an afternoon, a tower of
squared ashlar that must be dressed and carted heavy and laid slow, the land telling you which the
wall wants and your hand free to answer otherwise. And the next course is the thing that makes a
GENERATIONAL builder honest about its own materials: the woods, felled for the crane and the
scaffold, growing back on the year clock so a stand a great-grandfather cleared is timber again for
the great-grandson — or bare ground, if his line cut faster than the wood could heal. Someone will
weigh that in a hard winter, whether to take the crane's timber now or leave the coppice one more
rotation, and never know the day the stone first learned to be dressed to fit, or by whose hand. That
is exactly right. The courses beneath — and the ones beneath THOSE — hold. Build on.*
