# Borehole transcription schema (M2 transcribe-first)

*2026-07-09 · decision of record: the boss chose TRANSCRIBE FIRST — the bed model is
built from the real logs before quarry mechanics are written.*

## The census (tools/fetch-borehole-index.mjs → index.json)

**900 boreholes inside the site box, all 900 with scans.** Depth ladder: 347 under 5 m ·
319 at 5–15 m · 148 at 15–30 m · 44 at 30–60 m · 11 at 60–120 m · 9 at ≥120 m. The deep
end is the Victorian coal record: Elvet Landsale Colliery 1858, Kepier Colliery 1874,
Framwellgate 1839, Houghall 1880 — shaft-sinkings that cross and NAME the seams.

## What the pilot pages taught (Elvet NZ24SE35 p1, Kepier NZ24SE9 p1)

- **Legible.** Both hands read clearly at 2.5× render scale (tools/fetch-borehole-scan.mjs).
- **Header carries the datum**: "Surface Level ___ O.D." (feet above Ordnance Datum) —
  this is what ties beds across holes into surfaces. Record it verbatim; some are
  approximate ("c. 180'").
- **Columns**: Thickness and Depth-from-Surface, each in fathoms / feet / inches.
  Transcribe BOTH — they cross-check (running thickness sum must equal stated depth;
  a mismatch is a transcription error or the original clerk's slip — flag, don't silently
  fix).
- **Lithology is North-East pitman's vernacular** (transcribe verbatim, classify
  separately):

  | verbatim | normalized class | note |
  |---|---|---|
  | post | sandstone | THE building-stone word; "white post", "grey post" |
  | metal | mudstone/shale | "grey metal", "blue metal", "black metal" |
  | girdle | thin hard band | "post girdles" = sandstone stringers in mudstone |
  | seggar | seatearth/fireclay | under coal; the Kepier log brackets COAL/seggar/COAL |
  | COAL | coal | often with a seam name: "COAL (Hutton)" |
  | soil / gravel / sand / clay | drift | the overburden story |
  | strong / mild / soft | induration modifier | keep as modifier field |
  | "with water" | aquifer note | record as annotation — wells matter to the sim |

  (Dictionary is standard NE-coalfield usage; run a citation pass before the bed model
  ships mechanics that lean on a specific term — honest-dating law applies to glossaries
  too.)
- **Marginal annotations are seam correlations** by later BGS geologists (pencil: "LM"
  = Low Main, "TGT", "BLM", horizon queries). Capture them — they are the correlation
  shortcuts a bed model wants.
- **Named seams observed on page 1s alone**: Hutton (both records — braced explicitly in
  the Kepier log).

## The record (research/boreholes/transcriptions/<reference>.json)

```json
{
  "bgs_id": 847771,
  "reference": "NZ24SE9",
  "name": "LORENCE (FLORENCE) PIT, KEPIER COLLIERY",
  "easting": 428538,
  "northing": 543857,
  "surface_od_ft": { "value": 145, "qualifier": "as written" },
  "year": 1874,
  "pages": 4,
  "units": "fathoms/feet/inches, transcribed verbatim — convert ONLY downstream",
  "intervals": [
    {
      "i": 1,
      "verbatim": "Soil",
      "class": "drift",
      "modifiers": [],
      "thickness_ffi": [0, 2, 0],
      "depth_ffi": [0, 2, 0],
      "seam": null,
      "annotations": [],
      "confidence": "clear"
    }
  ],
  "seam_marks": [{ "seam": "Hutton", "at_interval": 7, "how": "braced in original" }],
  "transcriber": "session + date",
  "notes": "anything the schema cannot hold"
}
```

- `confidence`: `clear` | `probable` (best reading given) | `illegible` (interval kept,
  reading null). Never guess silently.
- `depth_ffi` as written even when the clerk's arithmetic is wrong; put the discrepancy
  in `notes`.
- A checker tool (`tools/transcription-check.mjs`, to build with the first batch) will
  verify: running thickness sum vs stated depths, monotonic depth, final depth vs the
  index's `depth_m` (× 1 fathom = 1.8288 m), and every interval classified or flagged.

## Batch plan

1. **Priority tier — the 64 holes ≥30 m** (they cross multiple named beds; the 9 deepest
   are the seam-naming shaft sections). These build the bedrock model: bed surfaces,
   dips, the Low Main Post story.
2. **Second tier — 148 holes at 15–30 m**: bed refinement + the top of rock.
3. **Shallow holes (<15 m, 666 of them)**: one-line overburden transcriptions only
   (drift thickness → the "how deep is rock beneath the turf" map that decides where a
   quarry can open).

Budget honestly: the priority tier is ~200 pages of Victorian hand at maybe 8–12 pages
an hour of careful transcription. That is the real-hours spend the boss approved.
