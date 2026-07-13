# PROPOSAL — MOVING STONE (the carriage layer)

*2026-07-13 · a design plan, not code · Castle Cultivator (repo codename `freestone`)*

Companion to [PROPOSAL-MINING-2026-07-11.md](PROPOSAL-MINING-2026-07-11.md). Mining answered
*where the land lets you take stone*. This answers *how dearly that stone reaches the wall* —
the "factory-game logistics" the boss noticed hiding between the quarry and the mason. Every
number below is drawn from a research pass whose load-bearing claims were adversarially
verified against real sources (79 agents, 56/67 claims supported; the appendix cites them).

Nothing here is built. This is the plot.

---

## 0. The one-line idea

**Carriage, not the stone, is the game — and the land already knows the price.** A wall is fed
by four stages in series — **WIN → HAUL → LIFT → LAY** — and advances only as fast as its
*slowest* stage, stalling honestly and *naming why* when a link starves. Each stage's rate is
a scalar the **boundary layer** computes from the terrain the player already reads for mining
(now extended from overburden + water to **+ slope + route + river + season**) and **freezes
into the command**, exactly as `plan_cut`/`plan_adit` freeze `workTotal`/`stoneTotal`. The
deterministic core never sees a road, a river, or a crane — it replays scalars and shuffles
blocks between buffers, byte-identical after any terrain/`beds.json` regen.

**Deep model, shallow controls.** The depth lives in the simulation and the field-guide
provenance; the coziness lives in the interface — **one bottleneck line and a handful of
siting-or-single-toggle moves**. No cart counts, no team rosters, no conveyor grid. The player
*reads the slowest stage and makes one legible move to relieve it.* That, plus the automatic
winter-haul / summer-lay rhythm, is the whole logistics game. It completes the standing M2
**consumption loop** (walls draw the stockpile) that this project has owed itself since SIM 14.

---

## 1. The WIN → HAUL → LIFT → LAY pipeline

Four stages, each an m³/day (or blocks/day) rate; real build speed is the `min()` of the four;
the HUD names the slowest.

- **WIN** — *exists (SIM 14/15).* Idle laborers × dig pace on the active quarry/adit, gated by
  overburden + water, frozen via `workTotal` from the bed model (post 0.8 vs drift 4.0
  m³/person-day). Today it dumps `stoneTotal` into one global stockpile on completion; the
  pipeline **meters** that credit into a pile *at the working*.
- **HAUL** — *new; the missing middle.* `main.ts` (which alone holds surface/water/beds) reads
  the **route** working→wall — path distance, net slope (downhill cheap), whether a navigable
  reach is touched, and any river/ravine the route must **cross** — and stamps a `haulRate` +
  a `method` word. It moves `min(haulRate, stockpile)` into a per-wall **face buffer**.
- **LIFT** — *new.* Once a wall crosses a height band, delivery to the working course is capped
  by a hoist rate: a free hand-**windlass** by default, a commissioned **treadwheel crane**
  (timber from the WOODS) raises the cap. **Rate is the throat, not capacity** — but a discrete
  **weight ceiling** rides alongside it so a showpiece monolith can exceed the windlass outright
  (§4). Moves `min(liftRate, faceBuffer)` up to the course.
- **LAY** — *exists, extended; the consumption-loop closure.* Masons × pace ÷ the dressing debt
  owed on rough-hauled stone, vertically capped (later) by the mortar-carbonation clock and the
  seasonal frost-halt. Masons now **draw** the delivered face stock and stall honestly when
  it's empty.

Whichever `min()` binds is the starved stage: its downstream buffer drains to zero while its
upstream buffer backs up — the honest starve signal, surfaced as **one monospace line**:

```
won 12 / hauled 4 (ox-cart, uphill) / lifted — / laid 6   → waits on HAUL
```

Nothing halts on an anomaly; a starve is just a slower wall and a legible prompt (passive
instrument, not a gate — the $3.99 tone holds).

---

## 2. Durham is the sharp case (the river is a MOAT, not a highway)

The naïve reading is "river = cheap route." Durham refutes it, and that refusal is the game.
The Wear at the peninsula sits **above its head of navigation** (tidal keels reached only the
Lambton/Fatfield reach, far downstream; first recorded Wear coal shipment 1396). So **no river
discount fires at the cathedral** — the water term reads *moat*. And because HAUL costs the
**route**, not straight-line distance, a bed just across the gorge is *not* cheap: the cart must
detour to a bridge (Framwellgate c.1120–28; Elvet begun 1160, still funded by indulgences into
the 1220s — multi-decade stone projects themselves). The cheapest read is therefore the
historical optimum, with **zero scripting**: quarry the ~10 m Low Main Post sandstone underfoot
(the peninsula's own bedrock), dress it at the pit, haul it a trivial downhill distance. The
Frosterley marble carried ~18 miles overland from Weardale (for the Nine Altars columns,
c.1280) is the concrete premium-import counter-note — *quarry local, import fine at a premium.*

> Correction carried from research: the actual medieval quarry workings are **Kepier**,
> **Quarryheads Lane**, and **Maudlin** — *not* Framwellgate/Elvet, which are a bridge and a
> district. (The bed model already knows the Maudlin name.)

This is "THE LAND DECIDES" grown from extraction to carriage: the terrain does the arithmetic,
and it can still say *no*.

---

## 3. Tiered element → gameplay table

### PLAYER-FACING LEVERS (the whole interaction surface — deliberately small)

| Real element | Simplified mechanic | Real constraint kept | Ties to | Freezes at the boundary as |
|---|---|---|---|---|
| **Dress-at-quarry** (scappling) — *the headline* | One three-notch dial per working: haul-rough ↔ scappled ↔ dress-at-pit. Dressing sheds dead weight before carriage but moves banker-hours upstream; rough hauls heavy, lays ~8× slower, pays the dressing debt *at the wall*. The right setting **flips with the site**. | Fine ashlar ~2 days/stone vs rough 4/day (~8× labour, Guédelon); >50% of marble is shed as quarry waste; carriage dominates delivered cost (Caernarvon 1285–6: £535 carriage vs £151 materials ≈3.5×; Reigate +180%, 1461). | `plan_cut`/`plan_adit`; **closes the consumption loop** | `dressLevel` splits `stoneTotal` into `haulMassPerM3` (→ HAUL) + `residualDressDays` (→ LAY). Default rough = byte-identical. |
| **Working siting = the haul verdict** | No new UI: placing a quarry/adit *also commits its haul*. The boundary reads the route working→wall and returns one `haulRate` + a plain label ("ox-cart, ¾ mi uphill"). | Overland ~doubles per ~10–12 mi (Salzman's 12-mile break-even); water ½ (river)–⅛ (sea) of land (Masschaele 8:4:1). | THE LAND DECIDES; the planned prospect-on-hover read | `main.ts` stamps `haulRate` + `method` from the route. Sim replays the cap; never sees a road. |
| **Commission-a-crane** — *the one LIFT choice* | Below a height band a free windlass (~6:1) is assumed and invisible. When a wall goes tall, **one cozy yes/no**: keep hauling by hand (cheap, capped) or commission a treadwheel crane (timber from the WOODS, higher rate; climbs with the build). Never a jib-placement puzzle. | Rate is the throat (~6 m/min); feet beat hands (2 treaders lift 6 t where 4 winch-men lift 3 t). | The WOODS (first real timber cost); the wall ladder; a **second vertical throat** | `hoist`/`set_hoist` freezes a `liftRate` cap + tier + a one-time timber draw. |
| **River landing / short causeway** — *the one optional capital work* | A deliberate investment that permanently drops a corridor's haul multiplier (reach a navigable water, or causeway across bog/steep). At Durham it **teaches by refusal** (the Wear won't carry). Blooms on future river/coastal sites; seed of the generational bridge. | Water ≈ ⅕–⅛ of land; the logistics **twin of the adit** (invest to change what the land affords). | The adit command pattern; WOODS + labour | `plan_landing`/`plan_causeway` freezes a `corridorMultiplier`; later routes that cross it freeze the cheaper value. Inert vs a landing-free world. |
| **The bottleneck line** — *read-and-relieve is the loop* | The whole system surfaces as **one field-guide line** naming the single slowest stage. The player's entire logistics loop: read the line, make one move. | Makes the honest stall legible instead of mysterious. | The field-guide HUD; the honest stall | Pure read of already-frozen scalars each tick — **zero new state, zero sim churn**. |

### FLAVOUR (modeled, animated, never micromanaged)

| Real element | Simplified mechanic | Kept | Ties to |
|---|---|---|---|
| **Auto-chosen haul method + sprite theater** (sledge / ox-cart / horse-cart / barge) | Player never picks a vehicle; slope+route+river+season pick the cheapest the land affords; it shows only as the walking sprite + method word. | Payload ladder lives *inside* the frozen rate; realistic medieval carts ~0.5–1 t (Langdon), *not* the enthusiast 6–8 t. | Upgrades the abstract stockpile↔station shuttle in `people.ts` |
| **Ox-vs-horse wired to the GRANARY** | A boggy winter run quietly favours the ox (grazes the commons, sure-footed in mud, ~25–30% cheaper, salvage as meat/hide); a long dry run favours the horse (oats + shoeing, more trips/day). The player reads the calendar, not a roster. | Langdon's real cost split (horse's penalty is oats, not shoeing); the des Noëttes "4× collar" myth **struck through** to the honest ~3×. | GRANARY (commons vs oats) + SEASONS |
| **The winter-haul inversion** | Emergent pacing: winter multiplies the sledge/frozen-ground branch of HAUL *up* while mortar-laying frost-halts — the loop flips itself, **HAUL in the cold, LAY in the warm**. A muddy winter is a gentle setback, never a fail. | Frozen ground bears loads that mire a cart (PNAS Forbidden City: ~1,500 men on bare ground → ~330 on ice). *(The "sledges were toll-exempt" claim was thinly sourced — dropped.)* | SEASONS + mortar frost-halt |
| **Scaffolding that auto-rises** | Platform climbs ~every 1.5 m, drawing timber + hemp from the WOODS, softly gating height — but **self-provisions**, never a hard block. Lashed-not-nailed → striking returns most timber (a thrift beat). | Medieval scaffold was lashed and recoverable. | WOODS; paces the vertical ladder |
| **Hoist visuals + lewis-vs-tongs** | The LIFT animates honestly (windlass crew → two treaders walking the wheel). Reeving (trispastos 3:1 / pentaspastos 5:1), the self-locking lewis vs self-tightening tongs, a filled lewis-hole in finished ashlar — **field-guide flavour**, not a lever in this cut. | Vitruvius X.2 ratios; ~20% friction; lewis = clean set but needs iron + a cut socket. | WOODS (rope) + future SMITH (iron); the mason's-mark homage |
| **Provenance of a hauled stone** | A dressed block remembers the bed it was won from and the route it rode (the ox-sledge over the frozen Wear). Feeds the mason's-mark homage + Long Replay. | Beauty, not a stat. | Provenance roadmap; homage-as-mechanics |

### DEFERRED (real, out of the first cut — sequenced behind stable infra)

| Real element | Mechanic in brief | Why deferred |
|---|---|---|
| **Mortar carbonation clock** (LAY time-gate) | Each course carries a cure day-clock; the course above can't load until it sets. Lay on green mortar → a cozy, recoverable slump. Non-hydraulic lime: skin in days, ~7-day min before easing, ~6 months full carbonation; **frost halts it**. | Wants the real calendar (M4). *But the consumption loop needs it for LAY to bite — see Q9.* |
| **Lime-kiln + mortar/sand/water chain** | Mortar as a *second* consumable the wall pulls; a sacrificial kiln (~3–4-day burn) turns ~2 t stone → 1 t lime with ~1.5–3 stères wood/m³; mortar is ~17–20% of ashlar, ~35–45% of rubble. | A whole second economy; needs WOODS-as-fuel real first. |
| **Centering / falsework strike** — *"ease the wedges"* | A keystone commits a timber centre that locks until the mortar carbonates; then the Lodge orders the strike (ease paired 1:5–1:10 wedges down uniformly). Early strike = warned, refused. | **Needs arches/vaults first** (refactor-vs-content). |
| **Channelling** — premium large-block mode | A slower WIN mode for lintels/quoins/monoliths: cut a ~6 m × ~3 m groove, split the block off the bed; gated on shallow dip. | Wants the LIFT weight-ceiling (§4) + a use for monoliths. |
| **Roads / harness tech + transshipment** | Collar / whippletree / nailed shoe as **modest** real gains (not the des Noëttes multiple); degrading capital roads with upkeep; per-handoff tolls (~370 pontage grants 1228–1440s). | Invites spreadsheet play; hold until the single lever proves too flat. |
| **Coastal imported-fine line + full bridge** | A sea supply line for showpiece ashlar at a flat, distance-free per-ton price (Tower of London: 9 shiploads of Purbeck, 1278); the bridge as a multi-generation great work. | Needs a river/coastal site to matter. |
| **Fire-setting — the science-honesty refusal** | Offered *only* where the cross-section holds genuinely hard rock. On Durham's soft bedded sandstone it reads as obviously wrong (smoke + wasted timber) — teaching by refusal that method must match lithology. | Freezes nothing at Durham; wants a future hard-rock scenario. |

---

## 4. The honest corrections & risks (from the adversarial critique)

The design has real load-bearing weaknesses. Naming them is part of the plot.

1. **HAUL must cost the ROUTE, not straight-line distance.** Straight-line under-costs a bed
   just across the Wear (reads it as near, when a cart must detour to a bridge). Durham's
   "quarry local" should emerge from **route geometry + crossings**, not a hand-zeroed river
   term. This is the single most important modeling correction.
2. **LIFT needs a discrete weight ceiling, not only a rate.** A pure-rate LIFT cannot express
   "this 8 t voussoir exceeds the windlass, full stop." Carry a `maxBlock` alongside `liftRate`
   so the showpiece-monolith case (and channelling) has a real seam.
3. **HAUL is `frozen route-cost × deterministic season(tick)`, not one frozen scalar.** Own it:
   the season factor is a pure function of the tick (no terrain in the core, determinism intact),
   so HAUL carries a small season-sensitivity, not a single number. Don't oversell "one scalar
   per stage."
4. **WOODS and SEASONS are render-only today** (TreeLayer; seasonal tints). Making them real
   consumable/sim state are **ground-up subsystems**, not free extensions — and this design
   leans on both for crane timber, scaffold, kiln fuel, winter-haul, frost-halt, and the cure
   clock. Sequence them as prerequisites, not afterthoughts.
5. **The one uncertain number:** a "~6 t/day crane throughput" figure traces to a single travel
   blog — **do not calibrate `liftRate` from it.** Derive throughput from the verified anchors
   (§Appendix): ~500 kg/lift (Guédelon, 2 men), 6 m/min lift rate, 2-treaders-6 t vs 4-winch-3 t.
6. **The biggest risk to FUN — "diagnosed once, then watched."** Each site yields one obvious
   fix (site close + downhill; dress-when-far; commission the crane when tall), after which
   logistics collapses into a one-time siting puzzle + passive waiting; the winter/summer
   two-stroke is emergent and *observed, not played*. **Mitigation to prototype early:** give
   the player an *ongoing* dial whose right answer **changes over the build** — the dress level
   shifting as the wall rises and the crane arrives; a seasonal supply choice that trades against
   the granary week to week — so there's a decision *every season*, not once per quarry. If the
   single lever tests flat, this is where depth is added, not in more terrain reads.

---

## 5. Phased build order (two-commit determinism discipline)

Every new frozen field ships as **two commits**: first the byte-identical inert record (default
reproduces seed-42 output; baseline unmoved), then the attributable commit with the real number
and its provenance in the message.

- **Phase 0 — Close the loop with what exists.** Make LAY *draw* the (still-global, still
  one-shot) stockpile so walls stall honestly on supply. No terrain reads yet. This is the
  standing thread; land it on stable mining infra first.
- **Phase 1 — HAUL + the bottleneck line.** Boundary `haulRate` (route + slope + river) +
  `method` + a per-wall face buffer; meter WIN→stockpile→face. Ship the one field-guide line.
- **Phase 2 — the DRESS dial.** Split `stoneTotal` into `haulMassPerM3` + `residualDressDays`;
  wire the ~8× Guédelon swing into HAUL weight and LAY debt.
- **Phase 3 — LIFT.** Windlass floor + commission-a-crane + `maxBlock` ceiling; first real WOODS
  timber cost; the vertical throat. *(Requires WOODS-as-consumable — a prerequisite build.)*
- **Phase 4 — Season inversion + mortar carbonation LAY-cap.** Couple to the M4 granary-year:
  winter eases the sledge branch, frost halts LAY, the cure clock gates course height.
  *(Requires SEASONS-as-sim-state.)*
- **Phase 5 — the landing/causeway capital work.** The adit-twin corridor multiplier; earns its
  keep on the first river/coastal site.
- **Beyond, as content demands:** centering (needs arches), lime-kiln chain, channelling,
  roads/harness tech, coastal line + bridge, fire-setting refusal. Each is a boundary-frozen
  scalar on the same seams — ~0 core churn to add later.

---

## 6. Open questions for the boss

1. **Distance RESCALE.** The verified ~12-mile land break-even dwarfs the ~500 m peninsula. We
   must compress the *mileage* to map scale (a by-eye knob like `WATER_SUBDUED`) while keeping
   the *ratio* faithful (8:4:1 exact). Confirm: faithful ratio, compressed distance?
2. **Metered vs one-shot delivery; buffer granularity.** Rate-limit WIN→stockpile? Per-wall face
   buffer (honest "*this* wall waits on haul," more `WorldState`) or one delivered-rate gating
   all masons (cheaper to prove inert, coarser signal)?
3. **Dress as lever vs readout.** Keep the manual dial as the satisfying decision, or *derive*
   the right level from the route and merely *show* it (pushing harder toward minimal)?
4. **Crane: prompt vs auto-commission** when the WOODS can afford it?
5. **Does the river/landing earn its place *at Durham*** at all, given the honest answer is
   "quarry local"? Keep it as teaching-by-refusal, or cut until a river/coastal site ships?
6. **Shared banker-hours vs typed labour.** Is dressing one labour pool split WIN↔LAY (the clean
   "dress dial relocates the machine upstream" move), or does that fight the
   quarryman-vs-banker-mason typed-labour direction SCOPE points toward?
7. **Failure appetite.** Model axle snaps / green-mortar slumps as *deterministic*, recoverable
   refusal events (consistent with the land's ~20% refusal), or keep refusal purely the land's
   read? *(Lean: gentle, deterministic, recoverable — never stochastic.)*
8. **Feed & season: frozen-at-plan vs live.** Fold ox/horse feed + winter discount into the
   frozen `haulRate` (granary+season sampled at plan time, staleness accepted like the survey),
   or make feed a live consumption the wall can stall on (spreadsheet risk)?
9. **Mortar clock now or with M4?** The consumption loop *wants* the cure cap immediately for LAY
   to feel honest; the calendar *wants* M4. Ship HAUL/LIFT first and layer the clock in Phase 4?

---

## 7. Appendix — the verified anchors (real, cited)

*(56 of 67 load-bearing claims verified supported; the sharpest below. Full digest in the
session's workflow output.)*

- **Overland break-even ~12 miles** — beyond it, carriage exceeds the stone's own cost; stone
  price ~doubles per ~10–12 mi. *Salzman, Building in England Down to 1540 (1967), p. 119.*
- **Land : river : sea ≈ 8 : 4 : 1** — river ~½, sea ~⅛ of road, per ton-mile. *Masschaele,
  "Transport Costs in Medieval England," Econ. Hist. Rev. 46:2 (1993).* (Grain c.1300: 1.5d land
  vs 0.5d water per ton-mile, 3:1.)
- **Caernarvon 1285–6: carriage £535 vs materials £151 (≈3.5×).** *Herefordshire Through Time /
  A.J. Taylor royal accounts.* **Reigate 1461: carriage +180%.** *London Bridge accounts.*
- **Dressing ~8× labour:** fine ashlar ~2 days/stone vs rough 4/day. *Guédelon, Archaeology
  Magazine Sep/Oct 2025.* **>50% of marble shed as quarry waste.** *Tazzini et al., Sustainability
  2024.*
- **Treadwheel:** ~14:1 wheel-to-drum; a ~50 kgf walker lifts ~0.7 t on the wheel alone, ~3.5 t
  *with a 5:1 pentaspastos block*; **2 treaders lift 6 t where 4 winch-men lift 3 t** (feet beat
  hands); **rate is the limiter, ~6 m/min.** *Low-Tech Magazine (2010) / Matthies, Tech. & Culture
  33.3 (1992) / Dienel & Meighörner (1997).* Guédelon squirrel-cage: **~500 kg with 2 men**
  (500–1,000 kg range). Salisbury wheel ~3.3 m; Harwich double-wheel 16 ft, 1667.
- **Non-hydraulic lime:** skin in days, ~7-day min before easing centering, **~6 months** full
  carbonation, **frost halts the set**; ~2 t stone → 1 t lime; ~1.5–3 stères wood/m³; mortar
  ~17–20% of ashlar, ~35–45% of rubble. *Cultrone et al. (2005); Guédelon lime burn, Archéopages.*
- **Winter haul:** frozen ground/ice dramatically cuts draught (Forbidden City: ~1,500 men on
  bare ground → ~330 on ice). *Li et al., PNAS 2013.* Masonry season ~Candlemas–All Saints;
  winter day ~8¾ h vs summer ~12¼ h. *Knoop & Jones, The Mediaeval Mason.*
- **Draft animals:** medieval carts realistically ~0.5–1 t (*Langdon 1982/1986*); ox ~25–30%
  cheaper to keep than horse (penalty is oats, not shoeing); the des Noëttes "collar = 4×" is a
  **discredited** experiment — honest gain ~3×.
- **Durham:** Wear tidal navigation ends downstream at Lambton/Fatfield — the peninsula is above
  it; bulk masonry is local Low Main Post sandstone (~10 m bed, near-zero haul; quarries
  **Kepier / Quarryheads Lane / Maudlin**), fine Frosterley marble hauled ~18 mi overland from
  Weardale (Nine Altars, c.1280). Cathedral body built ~1093–1133. Bridges Framwellgate
  c.1120–28, Elvet begun 1160 (65+ yr build).
- **Guédelon (experimental archaeology):** ~40 pros / ~70 staff / 11 trades / ~600 volunteers;
  ~30,000 t of on-site iron-rich sandstone, horse-cart haul; began 1997, ~25-yr plan now
  2030–2035 (the "experimental-archaeology tax").

---

*Design note on faithfulness: every gameplay number is a frozen boundary constant surfaced as
field-guide provenance; the terrain, water, beds, river, and season live only at the
survey-freeze boundary, so the sim core stays a deterministic scalar-replayer and a whole new
method costs ~0 core churn. The coziness is protected because the depth is printed and read,
never fiddled. Follow the science; the rocks — and the carts — catch up.*
