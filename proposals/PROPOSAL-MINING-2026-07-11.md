# PROPOSAL — MINING: THE LAND DECIDES

*2026-07-11 · the design for how mining works in Castle Cultivator (repo codename
`freestone`). Written the day the boss looked at the freeform-tunnel sketch, said "lets
try something different — how would YOU implement mining," and then, at the water table:
"i love this idea, its far more interesting, lets keep pushing it." This proposal
SUPERSEDES the freeform-tunnel direction; it is the durable design the HANDOFF arcs
build against.*

---

## 1. The turn we took, and why

The first sketch was **draw tunnels in 3D** — toggle an underground mode, page through
depth layers, cut galleries by hand. It fought the medium. Selecting a *buried* volume
with a mouse is the genuinely hard problem (you can't click what you can't see), and it
isn't even how mining works — no collier freehand-carved the rock; they *followed a seam*
with an established method. The boss also hit the tell directly: "trouble selecting stuff
because rotate and place are the same button." When the interaction fights you before the
feature exists, the feature is wrong.

So the design turned the other way. **Mining is not sculpting negative space. It is
reading the cross-section and taking beds where the land makes them cheap.** The player
reads the geology — the underground view is the instrument — and commits a WORKING: a
method the land affords at a chosen spot. The working drives to the bed and wins it over
time, following the seam, like a real mine. The 3D-selection problem simply dissolves:
you never select buried space, you choose a method for a spot on the surface.

## 2. The two levers — the whole engine

Everything runs on two facts, both straight out of real Durham:

- **OVERBURDEN.** To reach a bed you move everything above it. A bed that outcrops is
  nearly free; the same bed downdip under thirty fathoms of cover costs a fortune in
  waste. This is *why* the cathedral's stone came from the Low Main Post where it crops
  out on the riverbank scarp — not from a pit sunk in the middle of Palace Green.
- **WATER.** Below the water table the ground is DROWNED — unworkable without drainage
  (an adit to let it run out) or, deeper, a pump. And the water table is a **subdued copy
  of the topography** (textbook first-order hydrogeology): it rides high under the hills
  and shallow in the valleys, grading toward the river base level. So the workable ground
  is the DRY WEDGE between the surface and the waterline — thick under the hills, thin in
  the valley — and chasing a good bed downdip eventually drowns it.

Those two levers, colliding with the real dipping strata, hand you the whole game for
free — nothing scripted:

- a **difficulty curve**: the easy, dry, shallow beds get worked out first; ambition
  drives you deeper, wetter, slower;
- a **generational + moral arc**: the first Lodge quarries the outcrop; later
  generations, the cheap stone gone, sink shafts, fight water, and eventually face the
  **Hutton under the cathedral** — the richest seam, beneath the very thing they must not
  undermine. The geology writes the difficulty *and* the moral weight. You dig into it;
  you don't author it.

## 3. The methods — a ladder of affordances

A method is not a tool the player selects from a menu in the abstract. It is an
**affordance the land grants** at a spot, given the era's technology. You point; the land
tells you what it permits; you commit a working.

| method | the land affords it when… | its limit |
|---|---|---|
| **outcrop quarry** | rock at/near the surface (rockhead ≈ 0), above the water table | cheapest; only at outcrops and the dry wedge |
| **bell pit** | a bed sits shallow, above the water table | quick, shallow; quits at water or roof failure |
| **adit / drift** | a bed outcrops on a slope | self-draining — reaches post under cover the quarry can't |
| **shaft + pump** | the bed is deep, below the water table | needs drainage technology — the late-game deep |

The progression is unlocked by geology *and* era: an early Lodge has the quarry and the
bell pit; the adit is the mature answer to cover; the pumped shaft is the industrial
reach that only a later generation's technology grants. The **forbidden Hutton** lives at
the top of the ladder — reachable, forbidden, a real management line a player can honor
or break.

## 4. The reading instrument

The underground view (toggle **U**) is the decision surface, not decoration:

- the hill ghosts translucent and the transcribed strata become **visible** — the
  60-borehole bed model, honest nearest-hole Voronoi cells (blocky because the *data* is);
- a flat **working plane** at a chosen elevation shows the rock at that depth as a map;
  page it with the wheel or Page↑/↓ by a **four-fathom** step (the miners' own unit), and
  it snaps to the named seams and the crown — you land ON the Low Main, not "layer 6";
- the **water table** washes drowned rock blue: the dry wedge is winnable now, the blue
  wants an adit or a pump. This single stroke turns a pretty strata map into a decision.

The eventual companion is the **PROSPECT** — hover a spot on the surface and read what it
affords (which bed, how deep, wet or dry, and which method the land wants there) before
you commit. Reading is the gameplay; the working is the commitment.

## 5. The interaction philosophy — and the tradeoff, named

This makes mining the pleasure of **reading, choosing, and racing the water** — not the
tactile pleasure of **sculpting tunnels** by hand. That is a real fork, and it is chosen:
the read-and-choose game is truer to how the land gives up its stone, it reuses the
underground view instead of fighting 3D selection, and it scales into a generational arc.
If a future direction ever wants the sculpting pleasure back, it is a *different* game and
should be built as one, not smuggled in.

## 6. How it sits in the deterministic sim

The house law holds unbroken: **physics advances only through `worldStep`; a working is a
command with FROZEN economics.** When the player commits a working, the render/boundary
layer — which has the bed model, the surface, and the water table — computes the
method's reach, person-days, and stone yield and freezes them into the command. The sim
core replays those numbers; it never sees beds, heights, or a water table. So:

- a save is self-contained and replays byte-identically regardless of later `beds.json`
  regen (the SIM 13 survey-freeze law, now carrying water too);
- **a whole new method costs almost no sim-core churn.** The water-gated quarry was
  boundary-only (the sim handler and schema never moved — baseline byte-identical). The
  adit added one command and one accrual loop, proven inert against a world with no adit.

The water table lives in ONE place (`src/sim/water.ts`, `waterModelFromSite`) shared by
the tint and the workings, so the blue on the map and the stone in the ground can never
disagree.

## 7. What is built (2026-07-11)

- **The water table** — `src/sim/water.ts`, rendered as the drowned-blue wash in the
  underground view. `WATER_SUBDUED = 0.5` is a knob for the boss's eye.
- **The water-gated outcrop quarry** — the quarry now wins the DRY building stone within
  a shallow open-cut reach and REFUSES drowned/too-deep post ("drive an adit"). Verified
  against the real strata: only ~20% of the site affords an open cut. Boundary-only.
- **The adit — sim core** (SIM 15) — self-draining drift, `aditEconomics`, `plan_adit`,
  the drive-and-credit loop; proven inert; the self-draining claim unit-tested (wins deep
  post an open cut can't). **Not yet playable** — the portal-and-gallery render and the
  two-click tool are the immediate next course.

## 8. Roadmap (in order, unless the boss redirects)

1. **The adit, made playable** — the canon fingerprint (guard its digging physics in the
   determinism baseline) + the two-click portal→heading tool + the portal-and-gallery
   render. Then you can stand on the surface, drive an adit under the hill, and watch it
   win the drowned Low Main the quarry refused you.
2. **The prospect** — hover the land, read what it affords and which method it wants.
3. **The method ladder** — the bell pit (shallow dry bed) and the shaft+pump (deep/
   drowned bed, gated by drainage technology unlocked by era). Where the forbidden Hutton
   becomes a real choice.
4. **The consumption loop** — walls draw on the stockpile, so a wall stalls, honestly,
   because the mining hasn't kept up. This closes the economy the whole arc is for; it is
   where the wall ladder (thickness × wythes × stone demand — the standing M2 thread)
   finally bites.
5. **Provenance** — a dressed stone remembers which seam it was won from; a mason's mark
   on the cathedral traces down to the bed. Bed exhaustion: a working works OUT.

## 9. Open design questions for the boss

- **The knobs:** `WATER_SUBDUED` (0.5 — thicker or thinner dry wedge?), the open-cut
  reach (12 m), the generous stone yield (1.25) — all tunable by eye like the dyke step.
- **Unlock model:** do the deeper methods gate on ERA/technology, on geology alone, or
  both? (The proposal assumes both: the land must afford it AND the age must have the
  means.)
- **The Hutton:** forbidden by rule (a hard line), or forbidden by consequence
  (undermine the cathedral and it subsides)? The second is the richer, crueler design.
- **The second transcription tier:** 148 more holes at 15–30 m would densify the bed
  model — worth the real-hours transcription, or is 64 holes enough to build the whole
  method economy on?

---

*The land was here before the Lodge, and it decides where the Lodge may take its stone.
Read it, choose your method, race the water. Build on.*
