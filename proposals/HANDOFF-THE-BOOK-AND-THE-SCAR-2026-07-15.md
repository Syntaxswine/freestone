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

- **SIM_VERSION 34** (the bell pit bumped 32→33, the shaft-and-pump 33→34 — two sim courses this
  session; the snap + adit were render-only). New state each: an empty `bellPits:[]`, then `shafts:[]`.
- **196 tests green / 34 files** (+4 the Lodge Book lock, +4 `bellpit.test.ts`, +4 `shaft.test.ts`).
  The snap + adit added no unit test — input geometry, probe-verified.
- **The durham baseline MOVED TWICE — honestly.** Each sim course added one empty array field (+ the
  SIM_VERSION field), so the hash moved; DIFF-CONFIRMED pure serialisation BOTH times (only the milestone
  hashes + `simVersion`, no count/stockpile/position; the canon runs neither method, so its BEHAVIOUR is
  byte-identical). One commit + regen apiece.
- **34 maker's marks, 5 ⛬ seals. LIVE at syntaxswine.github.io/freestone.**
- HEAD `b098c4b`. All pushed and deploying.
- **THE MINING LADDER IS COMPLETE** — open cut ✅ → adit ✅ (`e7d0019`, 32nd) → bell pit ✅ (`6f35aab`,
  33rd, SIM 33) → shaft-and-pump ✅ (`b098c4b`, 34th, SIM 34). Prospecting 3/3 (`fc73bea` snap). The
  5th ⛬ seal punctuates the whole mining vision, now WHOLE.

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

### 2. ⛏ PROSPECTING CLARITY + THE SCAR — 3 of 3 ✅ · `f27e858` (warn+scar) + `fc73bea` (snap) + keystone `7274b47`

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
- **The edge snap** (`fc73bea`, `planner.ts` `cutSnap` — the boss's remaining third, 2026-07-15):
  while quarrying, the cursor magnetizes to the WORKABLE SHORE — the contour where `cutValid` flips
  (drowned / too deep / the building stone runs out) — so you cut clean up to the good ground.
  Black-box: `cutValid` as a boolean field, the nearest sign-change by a 16-ray march + bisection,
  verified in SCREEN space (pixels, not metres) exactly like `geoSnap`. Always-on in cut mode but
  bites only within `CUT_SNAP_PX` (14 px), reach capped at `CUT_SNAP_REACH_MAX` (20 m) so a zoomed-
  OUT view can't grab across the valley — the DIG-ANYWAY law holds (move past the shore, it's free).
  Snapped ⇒ the ring swells + reads CREAM, and the readout names it: *"the workable edge · snapped —
  cut up to here"*. A placed vertex clings too (the `onPointerUp` path).
- **Verified — the flood** (the `__cc` probe, WebGL screenshots time out): the ring flips grey↔red
  on the cursor across the map (both grounds present); of **49** grid cuts scattered on the 4 km
  map, the **12** over drowned ground flooded — each pond exactly at its local water table (≈28–34 m
  AOD) — and **200** spoil heaps rose; the dry ground correctly stayed dry.
- **Verified — the snap**: a boundary sweep CLINGS within reach then RELEASES to free in open ground
  (the cap binds at zoom-out, reachM 20); the real event path gives cream + 1.5× ring + "workable
  edge" AT an edge, red `#c0472e` + "no building stone" DEEP invalid, cream + "sandstone · 12 m dry ·
  open cut ✓" DEEP valid; a placed vertex lands ON the boundary; console clean. Field census (100×100):
  only **18%** of the 4 km map affords an open cut (invalid: ~46% drowned, ~36% no-stone, ~21% too-
  deep), `boundaryCellFrac 0.047` — edges tens of metres apart, so the snap reads clean, not choppy.

### 3. ⛏ THE ADIT MADE PLAYABLE · `e7d0019` + keystone (⛏ 32nd mark)

The method the red warning and the snap's readout both point at ("drive an adit") is now a tool.
**GREP-THE-TREE, a THIRD time:** the adit's whole SIM was ALREADY built and tested (6 green tests
in `adits.test.ts` — `aditEconomics` drives at grade material-aware + self-draining, `plan_adit`
freezes it, idle laborers hole it through and credit the dewatered stone ONCE, replay byte-exact).
Only the way to PLACE one and SEE it was missing — so this is **render + input only, inert on the
canon** (it drives no adit), the baseline UNTOUCHED, one commit, 188 green.

- **The tool** (`planner.ts`, hotkey **A** + HUD button): two clicks — the hillside MOUTH, then
  the HEAD (a second click ≥ `MIN_EDGE` commits; a too-short tap is refused). Drift-timber toned.
- **The freeze** (`main.ts` `aditCommand`, mirrors `cutCommand`): grade = the surface under the
  MOUTH, so the drift drives LEVEL and drains back out (self-draining). `aditEconomics(beds,
  site.heightAt, portal, head, grade)` is read here and FROZEN into `plan_adit`; the sim replays
  the scalars, never sees rock or water. `stoneTotal` may be 0 (a drive into barren cover — dig-anyway).
- **The readout** (`showAdit`, reuses `#prospect`): "adit · 235 m³ post · 19 m under cover · self-
  draining ✓", or "this drive stays in drift — aim into the rising hill for post".
- **The render** (new `src/render/adits.ts`, mirrors `CutLayer`): the drive is underground, so it's
  a GHOST line at grade (`depthTest` off — an X-ray of the drift under the rising hill), boring in
  from a dark mouth with a SPOIL heap rising, warming to lamp-lit AMBER on holing-through.
- **Verified** (the `__cc` probe, the REAL tool): a 45 m drive up a 14 m slope, driven by idle
  laborers to `workDone 276 ≥ workTotal 275.9`, `stoneWon`; the stockpile gained the frozen
  `234.8` m³ EXACTLY ONCE; `adit_planned → adit_complete → adit_stone_won` all fired; the drift drew
  AMBER + mouth + spoil; the barren downhill drive warned; console clean; build clean; 188 green.

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

- ✅ **The snap — prospecting's remaining third** — DONE (`fc73bea`, §2/§3). The valid/invalid
  boundary turned out to be a COMPOSITE contour (water shore + Voronoi stone-presence + reach),
  not the single `dryDepth` contour the first sketch guessed — so a BLACK-BOX boolean sign-change
  march beat a gradient march.
- ✅ **The adit — the miner's tunnel** — DONE (`e7d0019`, §3, ⛏ 32nd mark). Its whole SIM was
  already built + tested; only the tool + render were missing — render-only, inert on canon.

1. ✅ **The mining LOOKS — EYE-VERIFIED (`46e8a39`).** The receiver-trick screenshot works after all
   (the page renders to an offscreen-SIZED canvas + POSTs the pixels — `setSize(w,h)` beats the 0×0
   hidden-tab canvas that blanks `toDataURL`; a WebGLRenderTarget needs the `THREE` module, which
   isn't global, but sizing the default canvas suffices). It CAUGHT a real bug: the bell-pit shaft
   MOUTH sat below ground (`grade+0.25−sink`) and vanished under the spoil — fixed to a raised
   WELL-HEAD (ring wall + amber/dark cap) that reads at a glance. The adit's X-ray drift was
   eyeballed too — a clean thin line, NOT garish (the `depthTest`-off worry didn't bear out); left
   as is. The FLOOD was GEOMETRY-verified too (its plane sits at Y = the water table exactly,
   `floodAtTable:true`; unchanged this session, probe-verified prior) — it is correct; a shallow
   drowned cut just makes an inherently subtle pond, and its blue's PROMINENCE (opacity 0.62) is a
   genuinely boss-subjective one-liner. **The receiver trick is proven — use it, not just the probe.**
2. ✅ **The method LADDER (#50) — rung 3, the BELL PIT, is BUILT** (`6f35aab`, ⛏ 33rd mark, SIM 33).
   Scoped in [PROPOSAL-THE-METHOD-LADDER](PROPOSAL-THE-METHOD-LADDER-2026-07-15.md), then the loop
   said keep going and geology carried the design, so I built its recommended next rung: a single-
   click shaft (hotkey P) that wins 12–25 m dry post on flat ground where the adit has no hill,
   resink-penalised, refusing when drowned ("wants a shaft engine"). The FIRST sim course here — one
   clean commit + an honest baseline regen (pure serialisation, diff-confirmed).

2b. ✅ **The SHAFT-AND-PUMP (rung 4) — BUILT (`b098c4b`, ⛏ 34th mark, SIM 34). THE LADDER IS WHOLE.**
    The resolving insight: the shaft's only fork is its GATING, and a gate is a one-line condition on
    the tool, not the mechanic — so I built the mechanic (a deep pumped shaft that beats the water table
    for DROWNED post, at a labelled pump-tax that makes it dear) and left ONE thing for the boss: whether
    to GATE it behind an earned pumping engine (a generational tech milestone — his progression call, a
    trivial add). The pump-tax number is a labelled game-choice, not yet sourced (PROPOSAL §5 Q3, if he
    wants it firmed). Readout teaches the ladder ("all dry — a bell pit is cheaper" / "N m pumped —
    drowned post won ✓"). Render: a headframe with winding gear, eye-verified.
3. **The roadmap's untouched beats** (`ROADMAP-THE-GENERATIONAL-FACTORY`): Beat 2 the memory /
   homage suite (the boss's cathedral heart), Beat 5 the demand wave, Beat 6 the kiln + the Keep.

The frame is sealed and whole; the mining vision — read the land, warn, cut, flood, and now
tunnel under cover — stands complete on it. Build on.

*— the thirtieth-through-thirty-second hand, who kept the castle in a book, taught the land to
warn, and gave the miner his tunnel — looping on the boss's word "keep working the handoff," and
did not ship a stone unseen that a probe could see.*
