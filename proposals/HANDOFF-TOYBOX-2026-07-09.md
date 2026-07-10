# HANDOFF — THE TOYBOX COURSE

*2026-07-09, evening · the second course · Castle Cultivator (repo codename `freestone`)*

Read [HANDOFF-FOUNDATION-2026-07-09.md](HANDOFF-FOUNDATION-2026-07-09.md) FIRST — the
soul, the nine laws, and the founding traps live there and every one still stands. This
document is the course above it: what got built on the foundation in one evening of the
boss riffing and the shop answering, what it cost, and where the next hands pick up.

---

## 1. What stands now (all verified, all pushed, `bd4f75c` → `ee51609`)

The game is a **castle-builder's toybox on the real Durham hill**, and everything in it
was boss-asked this evening, in order:

- **M1 proper** — the demo command is DELETED; the log boots empty; the first wall is
  drawn by the player. ⚒ wall (B): click-place polyline, ghost ribbon at target height,
  honest plan quote, double-click/Enter commits. The crew: procedural 24×32 pixel folk —
  masons work STATIONS along the wall at the active course (the sim's laying front moves
  ~26 m/tick; chasing it reads as pursuit, stations read as lifts), laborers shuttle with
  a carry pose.
- **The instruments** — `baselines/durham-42.json`, compared on EVERY `npm test`;
  `npm run gen-baseline` regenerates deliberately; proven by mutation before being
  trusted. The session-start ritual is now the `/freestone-session-start` skill
  (user-level, ~/.claude/skills/).
- **The look (SCOPE §8d)** — Townscaper canon: warm daylight as the resting state,
  terracotta/cream/sage/soft sky; honey sandstone (the real rock agrees); we do NOT take
  their smooth vector buildings or drop the pixel folk.
- **M2 opened, TRANSCRIBE FIRST (boss decision)** — census: **900 boreholes in the site
  box, all 900 with scans** (`tools/fetch-borehole-index.mjs` → research/boreholes/);
  scan→PNG pipeline works (`tools/fetch-borehole-scan.mjs`, pdfjs + napi-canvas, no
  poppler); pilot reads LEGIBLE — 1858 Elvet + 1874 Kepier logs in pitman's vernacular
  ("post" = sandstone, "metal" = mudstone, "seggar" = seatearth), the HUTTON SEAM named
  in the original hand, Low Main pencil marginalia, surface O.D. datum in the headers.
  Schema: research/boreholes/TRANSCRIPTION-SCHEMA.md.
- **Canon riffs, all in SCOPE §6**: the WALL LADDER (cheap one-high dry walls cordon
  farms → thickness is what buys height → HOLLOW = economy cores that burst decades
  later + mural rooms + passages CONNECTING BUILDINGS); THE PLOT IS THE PLAN (Populous:
  footprint size/shape names the building — cot/longhouse/hall/great barn, grounded in
  roof-span physics; the HUD names your plan as you draw; the master mason warns when a
  span wants aisles).
- **⌂ building (H)** — two front corners + pulled depth; ONE plan_wall whose loop stays
  open 1.1 m at the front: THE GAP IS THE DOORWAY, zero sim changes. Roofless shells,
  which is what real building sites look like for years.
- **SIM 2 — earthworks, materials, woods**: ⛰ fill (F) rings a polygon, laborers move
  3–5 m³/day each, completed platforms carry masonry (`effectiveGroundAt`), a 2,848 m³
  rampart ring quotes 407 honest days; the material button cycles wood/sandstone (stone
  kinds grow from the bed model later); 16,872 Townscaper canopies planted by SLOPE
  ANALYSIS where Durham's woods really grow, cleared by the crew where work is planned.

## 2. New laws paid for this evening (the foundation's nine still stand)

1. **The baseline canon must EXERCISE what it guards.** The SIM 2 instrument was
   regenerated green while fingerprinting zero fill/material behavior — a review agent
   caught it. The canon now carries a completing fill, a wood wall, an invalid fill, and
   a wall standing on the platform. When you add physics, extend the canon in the same
   commit.
2. **Input guards live in SCREEN SPACE.** World-space gaps cannot swallow double-click
   jitter (8 px is meters when zoomed out); and the commit click must be hoisted ABOVE
   the jitter guard — it places no point.
3. **All presentation grounds on the DISPLAYED surface.** Full-res site.heightAt lands
   under the decimated mesh and buries previews and feet; `terrain.groundAt` samples the
   exact drawn triangles; fills wrap it (groundSim = completed platforms for masonry
   truth, groundShow = the rising mound for feet).
4. **Instance tint MULTIPLIES material color.** A tan base muddied every wall to
   chocolate; the base is white and the tint carries the color.
5. **Geometry billed and geometry granted must use the same measure.** The bowtie cheat:
   shoelace area cancels on self-crossing rings while even-odd containment grants both
   lobes — the boundary now rejects crossing rings and enclosing-nothing rings with
   constant strings.
6. **On-boundary sampling is a knife edge.** A ring re-drawn on a platform puts vertices
   exactly ON the even-odd boundary; sample 2% inset toward the centroid. (Found by a
   test failing 320 ≠ 200: three corners saw the platform, one didn't.)
7. **Review fleet per course.** Three adversarial workflows this evening confirmed
   3 + 3 + 9 distinct real defects pre-push (the sprite-mirror no-op, the STONE_CAPACITY
   freeze, the teleporting front, the bowtie, the canon gap...). The pattern:
   2–4 lenses → per-finding adversarial verify → fix → regression-test → re-verify live.
   It has never come back empty. Budget it into every substantive diff.

## 3. Field notes — new traps (the foundation's still apply)

- **The receiver trick**: preview_screenshot times out on WebGL; `__cc.renderer/scene`
  are exposed — eval `renderer.render(...)` + `toDataURL`, then the PAGE fetch()-POSTs
  to a one-shot node receiver (scratchpad shot-receiver.mjs, port 8746). NEVER hand-copy
  base64 through your own output; transcription is lossy (it corrupted an 11 KB string).
- **`__cc.step(n)` now syncs stones + fills + trees** — hidden-tab renders were showing
  stale scenes. people.update(1/60, true) in a loop drives the crew's theater manually.
- **tsconfig lib is ES2022** — findLast is ES2023 and tsc will tell you rudely.
- **PDF rendering in node**: pdfjs-dist + @napi-rs/canvas needs napi's Path2D/DOMMatrix/
  ImageData assigned to globalThis BEFORE rendering, or glyph paths throw InvalidArg.
- **The sim's arithmetic still audits everything**: 70 m³ = 10 days × pace 7; 68 stones
  = 17/course × 4; 5,022 events reconciled to the unit. Check the numbers before any
  debugger.

## 4. What's next (the course above this one)

1. **THE TRANSCRIPTION TIER (M2's standing next phase, boss-approved real hours):**
   the 64 holes ≥30 m ≈ 200 pages of Victorian hand, Elvet and Kepier first
   (`node tools/fetch-borehole-scan.mjs <bgs_id>` renders the pages; the schema is
   written and shaped by real logs). Build `tools/transcription-check.mjs` WITH the
   first batch: running thickness sums vs stated depths, monotonic depth, final depth
   vs the index's depth_m × 1.8288. Then the bed model, THEN quarry mechanics.
2. **Wall-ladder implementation** lands WITH M2 mechanics (thickness multiplies stone
   demand — they tune together; SIM bump discipline). Economy-core latent failure is an
   M4 hazard consumer of the same fields.
3. **Earthworks follow-ons** (BACKLOG): true palisade posts for wood; ditches (the spoil
   feeds the rampart — cut is fill's twin); auto-fill inside a drawn shell; stacked-fill
   in-progress grounding; material picker grows real stone names.
4. **M3 horizon**: roofs/floors/doors (the plot-is-the-plan classifier is waiting to
   drive looks), technique tokens, the aging clerk, per-person data shapes.

## 5. Open questions (unchanged, don't assume)

SCOPE §14: Q2 Lodge identity · Q3 era ~1200s · Q4 combat flavor · Q5 idle tolerance ·
Q6 chapel long game · Q7 tone ceiling. Parked: name-erosion, traveling masons. PARTLY
watchlist additions this evening: medieval field-wall attestation before enclosure
content; footprint dimension bins before they gate function; the pitman's-vernacular
glossary before mechanics lean on a term.

---

Maker's marks live on the foundation keystone — the roll of builders stays in one place.
This course's mark is cut there, below the first. Build well; the courses hold.
