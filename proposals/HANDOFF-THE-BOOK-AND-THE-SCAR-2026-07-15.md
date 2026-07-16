# HANDOFF — THE BOOK AND THE SCAR (2026-07-15)

*The session that opened the AMBITION era: the first two courses built ON the sealed frame,
not to repair it. A castle you can set down and take up again (the Lodge Book), and a land
that reads its own worth and shows the cost of ignoring it (the prospecting scar).*

> **Read the keystone first.** [HANDOFF-FOUNDATION-2026-07-09.md](HANDOFF-FOUNDATION-2026-07-09.md)
> holds the soul, the NINE LAWS, and now **THIRTY-ONE maker's marks + FOUR ⛬ seals**. Add your
> mark BELOW the last, never above, never overwrite. This document is the newest course's
> laws + traps + where-to-start; the FOUNDATION is the ground it stands on.

---

## The state, in numbers

- **SIM_VERSION 32** (unchanged this session — both courses were RENDER-ONLY).
- **188 tests green / 31 files** (was 184/30; +4 the Lodge Book format lock, `save.test.ts`).
- **The durham baseline (`baselines/durham-42.json`) is UNTOUCHED.** Neither course moved a
  value; both are inert on the canon (the 200-tick Durham run neither saves nor cuts).
- **31 maker's marks, 4 ⛬ seals. LIVE at syntaxswine.github.io/freestone.**
- HEAD `7274b47`. All pushed and deploying.

## What this session shipped

### 0. The correction that opened it (the grep-the-tree lesson, paid AGAIN)

The boss reopened with an "ask": a title screen + a mining tutorial. I flagged it as *never
built* — and was WRONG. A grep of the tree showed it had ALREADY SHIPPED months back
(`8943e2d`, tasks #51–57 all closed): `homescreen.ts`, `tutorial.ts`, the `#home`/`#gear`/
`#tutorial` markup, all there. **The plan file (`.claude/plans/wild-wiggling-eich.md`) was a
STALE record of work already done.** The lesson this house keeps re-teaching: *census the
tree before you build; the data — and often the whole feature — is already there.* It saved
a wasted rebuild and redirected the session to the roadmap's real next beat.

### 1. 📖 THE LODGE BOOK — Save & Load (Beat 3 V0) · `55ce8ed` + keystone `9bfb713`

The two "soon" stubs on the home screen, wired for real. **SIM-neutral, one commit** — the
event-sourced format already lived in `src/sim/save.ts` (`makeSave`/`replay`, the vugg house
law: *seed + command log fully determine a world*), so this was pure UI + localStorage.

- **Save** = `makeSave(world, commandLog)` → `stableStringify` → `localStorage['freestone_save']`.
  Event-sourced ⇒ TINY: a two-wall game is **236 bytes**. Offered only with a game in progress;
  flashes "Saved ✓"; the button hints "over Yr N" (an overwrite warning).
- **Load** rides New-Game's **ghost-free reload rails** — because the render layers bind to
  `world` at construction, a reload is the only clean world-swap. A one-shot
  `sessionStorage['freestone_load']` token → `boot()` rebuilds via `replay()` (which re-steps
  the log through the SAME `worldStep` the live loop uses, and guards SIM-version + site)
  instead of seeding fresh → autostarts into play. A failed guard surfaces WHY and falls back
  to the home; it never crashes.
- **Format lock**: `save.test.ts` (+4) — a world played the only legal way, saved and re-read
  the way localStorage would (`stableStringify`→`JSON.parse`), replays byte-for-byte (identical
  `hashState`, same tick); the copy can't corrupt the chronicle; the guards refuse a stale
  version and a wrong site.
- **Verified** end-to-end (the `__cc` probe): fresh boot → begin → wall → Save@600 → reload →
  a FRESH context returns at tick 600 with the wall and the log intact → continue → re-save@720.
  Console clean throughout.
- **Known limit (documented, not a bug):** no cross-version save migration yet — an event-sourced
  save from an OLDER engine can't be reopened. Surfaced with a clear message, a later course.
- **One slot** — the Lodge Book: a single continuing chronicle, fit for a game about generations.

### 2. ⛏ PROSPECTING CLARITY + THE SCAR — 2 of 3 · `f27e858` + keystone `7274b47`

The boss picked Save/Load with a *"but"* — prospecting wasn't CLEAR — and gave a sharp,
INVERTED three-part steer. Two-thirds shipped as one **render-only, SIM-neutral** course
(188 green). Validity is a render-side read of the SAME `quarryPlanAt` oracle `cutCommand`
already freezes, so **the hover-read and the cut can never disagree.**

- **The red warning (inverted, as the boss asked):** pick the Quarry tool (**Q**) and the
  planner ring goes **rust-red `#c0472e`** over ground that won't afford an open cut (drowned /
  too deep / no building stone), **quarry-grey `#8a8574`** where it will. You mark the HAZARD,
  not the affordance. And it only WARNS — the red **never blocks**. (`planner.ts` gains optional
  `cutValid?` / `onCutCursor?` deps; `main` supplies them from `quarryPlanAt`.)
- **The readout:** a field-guide card (`#prospect`) trails the cursor — `⛏ sandstone · 12 m dry
  · open cut ✓` on good ground, `⚠ the post here is drowned … drive an adit` on bad (the reason
  the oracle already speaks). `showProspect` in `main.ts`.
- **Dig anyway:** `cutCommand` no longer refuses a drowned/too-deep cut — the red warned; now
  let the architects find out why. An invalid cut digs to `MAX_OPEN_REACH`, wins only a token of
  stone (`DROWNED_YIELD_FRAC` 0.15), and **floods**.
- **The flood + spoil** (`cuts.ts` reads `water.tableAt`): a cut whose sinking floor dips below
  the water table **fills to the table — a pond of the underworld's own drowned blue** (`0x3d5f78`).
  *The warning and its consequence are the SAME picture.* Waste heaps ring the rim, rising with
  the digging.
- **Verified** (the `__cc` probe, WebGL screenshots time out): the ring flips grey↔red on the
  cursor across the map (both grounds present); of **49** grid cuts scattered on the 4 km map, the
  **12** over drowned ground flooded — each pond exactly at its local water table (≈28–34 m AOD) —
  and **200** spoil heaps rose; the dry ground correctly stayed dry.

---

## Laws & patterns this session proved (carry them)

1. **Render-side validity, one oracle.** A tool's "is this legal?" read and the command it
   freezes must call the SAME function (`quarryPlanAt`), or the pencil's promise and the record
   drift. This is the SIM-13 parity law, applied to prospecting.
2. **The flood-at-table pattern.** A cut's pond reuses the EXACT `THREE.Shape` → `ShapeGeometry`
   → `rotateX(Math.PI/2)` → set-Y that renders the pit floor — only Y is a constant (the table)
   instead of per-vertex. If the floor renders, the pond renders. Mirror proven geometry.
3. **Reload is the only ghost-free world-swap.** Render layers bind to `world` at construction.
   New Game and Load both reload + autostart via a one-shot token; never mutate `world` in place.
4. **Inert-on-canon ⇒ one commit.** Both courses touched render/UI only (or a render-side helper
   like `cutCommand`); the canon neither saves nor cuts, so the baseline can't move. Check the
   canon RUNS the feature before reaching for the two-commit dance.
5. **Census the tree before you build.** (§0 above.) A stale plan file is not proof of unbuilt
   work; grep the code + the task ledger first.

## Traps hit this session (so you don't)

- **`cc.cuts` is NOT on `__cc`.** To verify the flood I scattered cuts and scanned
  `cc.scene.traverse` for meshes of color `0x3d5f78`, and read extent from
  `cc.planner.deps.site`. The CutLayer's own `waterTableAt` (its 4th ctor arg) decides the flood
  — you don't need to compute the valley yourself; scatter cuts and let it flood the drowned ones.
- **A dry-ground test won't flood.** A depth-12 cut on a thick dry wedge (dryDepth > 12) never
  reaches the table — correct, but it means your FIRST flood test must be on genuinely drowned
  ground (thin dry wedge / the valley), or you'll wrongly think the flood is broken.
- **The classifier had a rough patch.** Browser-tool calls failed intermittently for a stretch;
  read-only work (Read/Grep/Bash) kept going. Retry the browser bridge; it returns.
- (Carried from FOUNDATION, still true: `import.meta.env.BASE_URL` for `/freestone/` runtime
  fetches; `COURSE_HEIGHT` 0.25 m; `main.ts` card-lists hardcoded; the vitest `while(built)` hang.)

---

## Where I'd start (the forward map)

1. **The snap — prospecting's remaining third** (the boss's soft *"probably"*). While drawing a
   quarry ring, magnetize the cursor to the **edge of the valid (dry) area** so you cut clean up
   to the good ground's boundary. It is the HARDEST of the three — the valid/invalid boundary is
   an implicit contour where `water.dryDepthAt == cut depth` — so it wants its own focused course
   (march the `dryDepth` gradient from the cursor, bisect to the boundary, snap in screen space
   like the existing `geoSnap`). SIM-neutral, `planner.ts`.
2. **A free win: tune the flood's LOOK.** It renders and floods correctly, but the blue's opacity
   (0.62) and the spoil mounds were verified by probe, not by a screenshot (WebGL screenshots
   time out). First real eye on the live deploy may want a one-line tweak.
3. **The adit — the tutorial's promise, nearer than it reads.** `adits.test.ts` AND a `plan_adit`
   command ALREADY stand (`save.ts` even deep-copies it). Driving a self-draining drift into a
   drowned/too-deep seam is the METHOD the red warning points at ("drive an adit"). Census what's
   already built before scoping (the grep-the-tree law).
4. **The roadmap's untouched beats** (`ROADMAP-THE-GENERATIONAL-FACTORY`): Beat 2 the memory /
   homage suite (the boss's cathedral heart), Beat 5 the demand wave, Beat 6 the kiln + the Keep.

The frame is sealed and whole; the first cathedral stones are laid on it. Build on.

*— the thirtieth-and-thirty-first hand, who kept the castle in a book and taught the land to
warn — two courses on the boss's word, "lets go, i trust you," and did not ship a stone unseen
that a probe could see.*
