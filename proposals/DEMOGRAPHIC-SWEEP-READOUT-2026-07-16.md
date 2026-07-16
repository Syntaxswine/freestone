# Demographic sweep readout — data for the SPINE's §6 questions (2026-07-16)

*A DATA record, not a design. The century-sweep instrument (`npm run sweep`, SIM 20) already exists;
this captures its 100-year numbers so the boss can answer the roadmap's §6 open questions from
evidence instead of guesswork. It deliberately does NOT prescribe the spine's emotional design (the
funeral feel, the succession ritual, the Testament voice) — that is the boss's to author. It only
lays out what the living settlement already DOES, so the stakes-beat is calibrated, not invented.*

## The numbers (100 years × 6 seeds, per food capacity)

| Capacity (mouths) | Final pop (min/med/max/mean) | Peak (mean) | Per century: born / died / arrived / left |
|---|---|---|---|
| 4  | 4 / 5 / 5 / **5**   | 6  | 10 / 7 / 8 / 11 |
| 8  | 7 / 8 / 9 / **8**   | 10 | 22 / 12 / 9 / 15 |
| 20 | 15 / 19 / 22 / **19** | 25 | 59 / 30 / 13 / 26 |
| 50 | 50 / 52 / 56 / **52** | 57 | 161 / 66 / 22 / 68 |

## What it says

1. **The settlement equilibrates near its food capacity** — final pop tracks capacity at every scale
   (cap 50 → ~52; cap 20 → ~19; cap 8 → ~8; cap 4 → ~5). No runaway, no collapse: a Malthusian
   balance. This is the existing SIM-20 behaviour, unchanged by the render courses.
2. **Mortality is ALREADY the balancing mechanism.** Over a century the flows balance (born ≈ died +
   left − arrived). Death is not a new hazard the spine introduces; it is the equilibrium the
   settlement already lives in. The spine adds *ceremony and named-ness* to a death that already happens.
3. **The pace of death, for calibrating a "generation."** At a mature ~50-soul settlement, ~66 deaths
   per century ≈ **one death every ~1.5 years**. A single named soul's arc (birth → the elder-tint cap)
   runs **~40–55 years** — the age at which the village clock (⛏ 39th) reaches full grey. So the felt
   length of "a generation" is anchored by both the death cadence and the visible aging.

## Bearing on the §6 questions (evidence, not a verdict)

- **Q1 — sequencing consent (people dying this early?).** The data says death is *already* the
  equilibrium; the spine does not make the settlement deadlier, it makes an existing death *legible and
  mourned*. That lowers the risk of "too soon" — the funeral protocol is ceremony over a curve that's
  already turning. *(Still the boss's call — this only removes the "will it feel punitive?" worry.)*
- **Q2 — generation length (~20 min?).** The demographic clock (a death every ~1.5 yr at scale; a named
  arc of ~40–55 yr) and the visible age-tint give a concrete anchor to map felt time onto. Whatever
  minutes-per-generation the boss picks, the sweep + the clock are the gut-gauge the question asked for.
- **Q3 (scar tone) and Q4 (save-compat)** are not demographic questions; the sweep has nothing to add.

## What this readout does NOT do

It does not design the funeral, the succession-stone, the Testament, the "true ashlar hand", or
`name_apprentice`. Those are the spine's emotional core — *the moment the game becomes itself* — and
the roadmap reserves them for the boss. This is only the ground the beat will stand on, measured.

*Ran clean in 823 ms (no preview contention). The instrument is `tools/century-sweep.mjs` +
`test/century-sweep.test.ts`; re-run any time with `npm run sweep`.*
