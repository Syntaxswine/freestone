# HANDOFF — THE LAND DECIDES

*2026-07-11 · from the day mining stopped being sculpture and became a reading · Castle
Cultivator (repo codename `freestone`)*

You are the next builder. Read the FOUNDATION keystone first
([HANDOFF-FOUNDATION-2026-07-09.md](HANDOFF-FOUNDATION-2026-07-09.md) — the soul, the
nine laws, SIX maker's marks now; add yours BELOW, never above), then the course this one
continues, THE UNDERWORLD
([HANDOFF-THE-UNDERWORLD-2026-07-11.md](HANDOFF-THE-UNDERWORLD-2026-07-11.md) — the bed
model and SIM 14's quarry). Then read the design this arc serves:
[PROPOSAL-MINING-2026-07-11.md](PROPOSAL-MINING-2026-07-11.md). The underworld made the
ground beneath REAL; this course made it a DECISION.

The boss set the turn himself: "lets try something different — i'd like to see how you
would implement mining." The freeform-tunnel path (draw galleries in 3D) was fighting the
medium. What replaced it: **mining is reading the cross-section and taking beds where the
land makes them cheap** — gated by OVERBURDEN and WATER, worked by a ladder of methods the
land affords. Then, at the water table: "i love this idea, its far more interesting, lets
keep pushing it."

---

## 1. What this arc built (all pushed; `b12f005` → `a39f77f`; 122/122 green)

- **The input split** (`b12f005`). The boss's own bug: "rotate and place are the same
  button." OrbitControls ran LEFT=orbit while the planner stole a LEFT tap for placement,
  disambiguated only by a 6 px/500 ms threshold — a steady hand at the moment of commit
  could rotate the world instead of dropping the point. Fix: orbit moved to right-drag
  (`mouseButtons`), LEFT is a pure pencil, and left-drag is freed for a future marquee.
  Verified live: synthetic left-drag → orbit delta (0,0); right-drag orbits.
- **The underground scaffold** (`8059182`). Toggle **U**: the hill ghosts translucent,
  the transcribed strata become VISIBLE (beds.json was invisible data until now), and a
  flat WORKING PLANE shows the rock at a chosen elevation as a map. Page it with the wheel
  or Page↑/↓ by a four-fathom step; the named seams + the crown are magnetic snap
  horizons — you land ON the Low Main. The datum reconciled (verified): terrain Y is AOD
  metres, columns hang depth-below-surface, seams are AOD, so the rock under a plane at
  elevation E is `strataAt(x, y, heightAt−E)`. `beds.ts` gained `seamElevationAt`.
- **The Tilley fix** (`9f6e82e`). The new view, on day one, became a PROBE: its snap
  ladder showed Tilley plotting BELOW Busty — inverting the real seam order. Not a
  mis-correlation (Tilley sits a consistent ~13 m below Harvey in all three of its holes);
  a clustered fit (5 picks, 6 % of the site's E-extent) extrapolating downdip to a
  spurious −105 AOD at the site centre. Fix: a leverage guard in `build-bed-model.mjs` —
  null a seam plane whose value AT THE CENTRE lands more than one observed-range beyond its
  control (the Maudlin pattern). Surgical: only Tilley changed; every other plane
  byte-identical.
- **The water table** (`e817826`) — THE KEYSTONE OF THE VISION. A subdued copy of the
  topography (`baseLevel + 0.5·(surface−base)`): thick dry wedge under the hills, thin in
  the valley. Rendered as a drowned-blue wash on the working plane. This is the single
  stroke that turns the strata map into a decision: dry = winnable now, blue = needs
  drainage. Live proof: the Low Main at 30 AOD comes back DROWNED across the high ground,
  winnable dry only in the low-ground ribbons — which is exactly why the cathedral's stone
  was quarried at the OUTCROP.
- **The water-gated outcrop quarry** (`7f4dac3`) — the first WORKING of the new vision.
  The quarry no longer digs a fixed depth; it wins the DRY building stone within a shallow
  open-cut reach and REFUSES drowned/too-deep post ("drive an adit"). Shared water model
  (`src/sim/water.ts`) feeds both the tint and the working. Verified against the real
  strata: only ~20 % of a 121-spot grid affords an open cut (24 dry outcrops; 45 drowned,
  15 too deep, 37 barren). Boundary-only — the sim never moved.
- **The adit — sim core** (`a39f77f`, SIM 15). A self-draining drift into the hillside:
  `aditEconomics` drives at the portal's grade through the strata (section × length at the
  ILO pace), with NO water gate — so it wins post the quarry can't. `plan_adit` freezes the
  economics; idle laborers drive the oldest heading one person-day at a time (ranked just
  under the quarry); the dewatered stone is credited once on hole-through. **Inert proven**
  (two-commit discipline): the machinery lands without disturbing a world that has no adit
  — every non-hash milestone number byte-identical. Self-draining claim unit-tested.

**On the shoulders of:** the survey-freeze law (SIM 13) and the bed-model-at-the-boundary
law (SIM 14) are exactly what let a whole new lever (water) and a whole new method (the
adit) land with near-zero sim-core churn. The underground view exists because the bed
model was already real. This day was fast because those courses hold.

## 2. New laws paid for

1. **Mining is reading, not sculpting.** The hard 3D problem is that you can't select
   buried volume by hand — so don't. Read the cross-section; choose a method the land
   affords for a surface spot. The whole selection problem dissolves. When an interaction
   fights you before the feature exists (rotate-vs-place), the *feature* is wrong, not the
   input.
2. **Water is the second lever, and it is a subdued copy of the topography.** Overburden +
   water gate every working. The water table riding high under hills and shallow in
   valleys is what turns a strata map into a decision surface. It lives in ONE shared model
   so the tint and the workings never disagree.
3. **A method is a boundary-frozen affordance — a whole method costs almost no sim-core
   churn.** The water-gated quarry was boundary-only (schema + handler untouched, baseline
   byte-identical). The adit added one command and one accrual loop, proven inert. Freeze
   the economics where the beds/water/heights live; the sim replays numbers.
4. **The land refuses you, and the refusal IS the game.** ~20 % of the site affords an
   open quarry; the rest is drowned, too deep, or barren. Scarcity + the method ladder are
   the difficulty curve and the generational arc — read from the geology, not designed.
   Make the refusal legible and honest ("drive an adit"), never a silent no-op.
5. **Self-draining is the adit's soul (drain-to-portal).** An adit dewaters above its
   grade, winning post drowned to the quarry. This is the load-bearing mechanic; it was
   confirmed with the boss BEFORE being frozen into a new command (a schema is a
   commitment), and it is tested, not asserted.
6. **The view is a probe that refutes the DATA now.** The underground view, on its first
   day, caught a bed-model fit quirk shipped back in SIM 14 (Tilley). The probe-is-an-
   instrument law, one level up: a good visualization interrogates the model behind it.
   Test the CENTRE, not the bbox corners — a real dip extrapolates at the corners yet
   interpolates where it counts.

## 3. Traps of the arc (pay once)

- **A clustered seam fit extrapolates wildly.** A dipping plane through observations all
  on one flank is fine locally and nonsense at the far side. Guard on the value at the
  point you actually read (the site centre), and fall back to null (Maudlin) rather than
  assert a spurious horizon. A corner-based guard wrongly nulled Busty — verified before
  settling on the centre test.
- **`makeSave` copies per shape.** `plan_adit` carries `portal`/`head`, not `points` — the
  generic `c.points.map` throws. There is a comment in `save.ts` naming this exact law
  (the husbandry course paid it first); add a case per new command shape.
- **The water model must be ONE source.** If the underground tint and the quarry gate
  compute the water table separately, the blue on the map and the stone in the ground
  drift apart and the player is lied to. `waterModelFromSite` is shared; keep it so.
- **The height slider no longer sets quarry depth.** The WATER does. If a future edit
  re-reads `planner.height` for a working's depth, it has un-taught the whole lever.
- **Two-commit even for a method.** SIM 15's core is the INERT commit (`a39f77f`);
  regenerate the baseline and diff to prove the numbers didn't move before adding the
  attributable canon adit. "Byte-identical" means the NUMBERS, not the hash (WorldState
  gaining `adits:[]` moves every hash — that's expected).

## 4. State of the fabric

SIM_VERSION 15 · 122 tests across 16 files (all green) · commits `b12f005` → `a39f77f`,
all pushed. The player can toggle underground (**U**), page the working plane through the
strata in fathoms, see the water table wash the drowned rock blue, and open a
**water-gated outcrop quarry** (**Q**) that wins the dry post and refuses what the land
won't give. Beneath it all, `src/sim/water.ts` shares the water table between the map and
the workings, and `src/sim/beds.ts` holds both `cutEconomics` (the quarry) and
`aditEconomics` (the adit). The adit exists in the deterministic sim — self-draining,
proven inert, its soul unit-tested — but is **not yet playable**: it has no render and no
tool. That is the very next course.

## 5. Next courses (in order, unless the boss redirects)

1. **The adit, made playable** — the CANON FINGERPRINT (drive one real adit into the
   Durham hillside inside the determinism baseline — the attributable half of SIM 15, so
   its digging physics is guarded like the quarry's), then the **two-click portal→heading
   tool** (a new planner mode; the affordance readout says "wins ≈S m³, self-drained" or
   "no post along this heading — aim it along the seam"), then the **portal-and-gallery
   render** (`src/render/adits.ts`: a mouth in the hillside, a drift receding into it).
   Then you drive an adit under the hill and watch it win the drowned Low Main.
2. **The prospect** — hover the surface, read what the land affords and which method it
   wants (bed, depth, wet/dry, method), before committing. The reading half of the vision
   made tangible; pure render.
3. **The method ladder** — the bell pit (shallow dry bed) and the shaft+pump (deep/
   drowned, gated by drainage technology unlocked by era). Where the forbidden Hutton
   under the cathedral becomes a real management line.
4. **The consumption loop** (the standing M2 thread) — walls draw the stockpile, so a wall
   stalls honestly when the mining hasn't kept up. Closes the economy the whole arc is
   for; where the wall ladder (thickness × wythes × stone demand) finally bites.

## 6. Open questions for the boss

The proposal (§9) holds the design forks: the knobs (`WATER_SUBDUED` 0.5, open-cut reach
12 m, yield 1.25 — all tunable by eye); whether the deeper methods unlock on ERA,
geology, or both; whether the Hutton is forbidden by RULE or by CONSEQUENCE (undermine
the cathedral and it subsides — the crueler, richer design); and whether the second
transcription tier (148 holes at 15–30 m) is worth the real-hours spend. New from the
build: is the two-click line the right adit gesture, or should the heading auto-follow the
seam from the portal? And should the water table be rendered as a proper surface (a blue
plane in section) as well as the map tint?

---

*The underworld made the ground real. This course made it decide. The player will learn to
read the land before they take from it — to find where the post comes cheap and dry, and to
know, looking at a blue map, that the seam they want is drowned and wants an adit. The
courses beneath — and now the ones beneath THOSE — hold. Build on.*
