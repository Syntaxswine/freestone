# Dig rates and stone yield per material — the pacing substrate for the underworld

*2026-07-10 · boss directive: "the minerals need data for how quickly workers could dig
through that area. rock production should exceed what is actually removed from the earth
to encourage building great works." · 7-lens research fleet, 126 finder claims; the
verification pass died on a usage limit, so the SPINE numbers below were hand-verified at
source and the rest are marked [finder-claimed, unverified] — honest-dating law applies.*

---

## 1. THE SPINE (verified at source — safe to build mechanics on)

**Excavation productivity by material hardness — the dig-rate backbone.** Verified
verbatim from the source PDF (extracted locally via pdfjs):

> "Recommended value **5.0  3.5  3.0  2.0  0.8**" m³ per worker-day, for
> **Soft / Medium / Hard / Very hard / Rock** (country medians 5.00 / 3.50 / 2.75 / 2.00
> / 0.75; site trials 3.6 / 3.2 / 3.45 / 2.2 / 0.8).

Hardness is defined by the **tool required** (also verbatim from the source):

| ILO class | definition | tool | m³/worker-day |
|---|---|---|---|
| Soft | "Easily excavated with a shovel or hoe" | shovel/hoe | **5.0** |
| Medium | can be dug with a shovel | shovel | **3.5** |
| Hard | "Mattock, pick or other swung tool required" | pick | **3.0** |
| Very hard | "Crowbar required in addition to pick" | crowbar + pick | **2.0** |
| Rock | "Sledge hammer and chisels required" | hammer + chisel | **0.8** |

- Source: **ILO/ASIST Technical Brief No. 2, *Productivity Norms for labour-based
  construction*** (Nairobi, 1998), Table 10 (excavation) + Table 2 (hardness classes).
  [PDF](https://www.ilo.org/sites/default/files/wcmsp5/groups/public/@ed_emp/@emp_policy/@invest/documents/instructionalmaterial/wcms_asist_6655.pdf)
- Measured **in situ** (bank volume); the norm includes loading/throwing provided lift
  ≤ 1 m and throw ≤ 4 m. Deeper pits need a lift penalty.
- "The most important parameter for excavation is the hardness of the material. This can
  alter the expected productivity by a factor of four or greater." — the recommended
  ladder spans **6.25×** soft→rock.

**Cross-corroboration (independent sources agree on the shape).** The rock end (~0.8–2.2)
and the soft end (~3.5–5) recur across four unrelated bodies of practice:

| source | soft/earth | clay/hard | rock (no blast) | note |
|---|---|---|---|---|
| ILO/ASIST 1998 | 5.0 | 3.0–2.0 | 0.8 | verified above |
| CPWD Analysis of Rates (India) | ~1.0–1.1* | — | ord. rock ~2.2; hard-rock chiselling **0.82** | *surface-strip figure, thin lifts |
| US NAVFAC estimating | ~2.3 (general hand) | — | drilling 0.2–0.3 MH/ft | man-hour based |
| 19th-c navvy (railway cuttings) | 5–6 (up to Brassey's ~14) | clay ~5 | — | per man-day |

The convergence at the **rock end near 0.8 m³/person-day** is the strongest single result:
hand-winning fresh sandstone without powder is roughly **one-sixth** the pace of digging soft
ground. That ratio is the sim's per-material dig-rate spread.

**Stone recovery — the REAL waste, against which the game's generosity is measured**
(verified from independent dimension-stone literature):

- Overall dimension-stone recovery ≈ **29%** (waste ≈ 71%); ≈ 51% of extracted rock is
  wasted at the quarry face, ≈ 41% of what reaches the plant is wasted in processing.
- Some quarries yield only **15–20%** usable stone (waste > 80%).
- Comparators: granite 80–85% waste, slate 70–90% waste.
- Source: *Wastes production in dimension stones industry* (Environ. Earth Sci., 2021) +
  Mining Engineering / Britannica *Quarrying*. Corroborates the finder's historic-handbook
  claim of "<50% finished product of gross output."

So **real sandstone quarrying yields well under half its bulk as usable building stone.**
The boss's directive is a deliberate INVERSION of this (see §4).

**Guédelon calibration** (the 25-year experimental 13th-c build, verified in part):
30,000 t of iron-rich sandstone extracted to date; 6 t/day moved by the treadwheel crane;
~10,000 m³ of sandstone for the walls; ~44 workers. Per-quarryman ~1 m³ bulked/7-hr day
(finder-cited Renucci; PLAUSIBLE — consistent with the ILO rock rate scaled for softer
sandstone). [Guédelon — Wikipedia](https://en.wikipedia.org/wiki/Gu%C3%A9delon_Castle).

---

## 2. Medieval quarrying — labour and output (finder-claimed, mostly primary sources)

The 13th–15th-c building accounts give WAGES and PIECEWORK far more than clean m³/day, but
they bound the crew sizes and per-man stone output the sim's people-layer will want:

- **Vale Royal Abbey (1278–80)** — the richest quarry account: three-tier wage ladder
  (master 18d / 12d / 10d per man-week); piecework "10s. the hundred" ≈ 1d per finished
  stone ≈ **~2 dressed stones/man-day**; ~15 quarrymen at one accounting moment; monthly
  average 15 quarrymen : 33 carters : 40 masons : 36 diggers; ~35,000 cartloads over ~4
  years (>30/day). [finder-claimed, primary: PRO Exchequer accounts]
- **Beaumaris (1296)** — the famous scale letter: 200 quarrymen / 400 masons / 2,000
  labourers, ~£270/week. [finder-claimed, secondary]
- **Windsor (1368)** — "10s. the thousand" rough blocks ≈ **~29 rough blocks/man-day** at
  wage parity. **Boughton (1366)**: rough ashlar 10s./hundred, parpain 18s./hundred.
  **Haslebury (1221)**: 23s.4d for 105 blocks ≈ 2.67d/block. [finder-claimed, secondary]
- **Durham, late 15th c.** (this exact site): quarry worked **222–223 days/year** at 3–4d/day,
  crew of 3; scappling 3d/cartload; cartage stone 4d, clay 3d, lime 3d per load; a "ridding
  gang" (overburden-stripping) at 10d/day shared. [finder-claimed, primary — Durham
  cathedral/priory accounts; the closest real analogue to our sim]

**Design read:** medieval quarrymen won on the order of **a few dressed stones per day** and
the working YEAR was ~220 days (winter mortar stop — already in SCOPE). A "stone" here is a
dressed facing block, not a m³; the sim's quarry pace should be expressed in the same
person-day currency the fields already use ([[feedback-grep-tree-before-build]] — Farm.workdays
is the template).

## 3. Digging THROUGH rock — drifts, shafts, wells (finder-claimed)

The closest analogue to a player digging a passage/cellar through the strata:

- **Stone drift through mixed Coal Measures: ~12 yd/week** (a 6ft×5ft roadway) — hand era.
- **Shaft sinking + walling (Victorian, 24-h working): ~8 yd/week average**, but water
  dominates: 6.5 → <4 yd/week as feedwater rises 500 → 7000 gal/hr; and rock fraction
  scales it 2.19 / 4.08 / 6.77 yd/week at 82.5% / 38.5% / 6% hard rock.
- **Pre-explosive / medieval shaft: 1–2 m/month**; firesetting heading 5–20 ft/month;
  Neolithic antler-pick chalk shafts reached 90 m.
- **Durham-specific hazard:** up to **24 fathoms (144 ft) of alluvial cover / quicksand**
  over the "stonehead" — the drift the western-bypass holes measured, and a ready "unknown
  ground" mechanic.

## 4. THE GENEROUS INVERSION (the boss's directive, made concrete)

Real sandstone quarrying: **dig 1 m³ → ~0.29 m³ usable dressed stone** (§1). The boss wants
the opposite feel — *"rock production should exceed what is actually removed from the earth
to encourage building great works."* Two honest levers make production ≥ removal without
lying about the geology:

1. **The waste is not waste — it is the wall's core.** A real medieval wall is dressed
   ashlar FACING over a rubble CORE, and the rubble core *is* the quarry spalls (finder:
   "6 documented waste uses"; "medieval rubble-core walls"). So 1 m³ excavated sandstone
   honestly yields ~0.3 m³ facing **+** ~0.7 m³ core-grade rubble — and BOTH build wall.
   Total wall volume buildable per m³ quarried ≈ 1.0 already, just in two grades.
2. **The generous thumb on the scale (game, deliberate):** a per-material `yieldFactor`
   **> 1.0** on top — digging a m³ of post yields *more* buildable stone than its bulk.
   This is the explicit "encourage great works" bonus, and it is LABELLED as a game choice
   in the sim, sitting above the real ~0.29 recovery it inverts. [[feedback-follow-science-rocks-catch-up]]:
   ship the generous number, pre-register the real one it departs from.

**Proposed SIM 14 material table** (dig rate from §1's verified ladder; yield deliberate):

| bed class | pitman word | ILO hardness | dig m³/person-day | in-situ density | game yield |
|---|---|---|---|---|---|
| drift: soil/sand/gravel | — | soft/medium | 5.0 / 3.5 | ~1.8 t/m³ | spoil (feeds fills) |
| clay / boulder till | — | hard/very hard | 3.0 / 2.0 | ~2.0 t/m³ | spoil |
| mudstone / shale | **metal** | very hard | 2.0 | ~2.4 t/m³ | rubble / spoil |
| **sandstone** | **post** | rock | **0.8** | **2.16–2.36 t/m³** | **building stone, yield > 1.0** |
| seatearth | **seggar** | hard | ~3.0 | — | spoil |
| coal | **coal** | (hewer 2.25–6 t/shift) | special | ~1.3 t/m³ | fuel resource |

Durham grey/buff sandstone density **2357 / 2160 kg/m³** (finder, historic 141 lb/ft³ =
2.26 t/m³) — the number that converts a quarried m³ into the tonnage the treadwheel-crane
economy (M2+) will move.

---

## 5. Verification ledger

- **VERIFIED at source (2026-07-10):** ILO excavation ladder 5.0/3.5/3.0/2.0/0.8 + hardness
  tool definitions (source PDF, extracted locally); dimension-stone recovery ~29% / waste
  ~71% (dimension-stone waste literature + Britannica); Guédelon 30,000 t / 6 t-day / 44
  workers (Wikipedia).
- **finder-claimed, UNVERIFIED (verifier pass died on usage limit):** all §2–§3 medieval
  and mining figures, CPWD/NAVFAC exact rows, Guédelon per-quarryman 1 m³/day, densities.
  Re-verify any figure BEFORE the mechanic that leans on it ships — but the SPINE (§1) that
  SIM 14's dig-rate table stands on is verified, so the underworld can be built now.
- Raw 126-claim corpus preserved in the workflow journal
  (`subagents/workflows/wf_634b04ee-828/journal.jsonl`).
