# HANDOFF — THE VISIBLE WORK CHARTER (2026-07-16)

*The session that measured a complaint to its true cause and chartered the cure — without laying a
stone. The boss brought a quality-of-life list and a diagnosis ("building feels slow… time is not
advancing properly"); the session proved the clock innocent with live probes, found the real
disease (an all-or-nothing stone economy, invisible at every step), and turned the list into a
build-ready, boss-ruled, critique-hardened spec: THE VISIBLE WORK. Nothing was built, by design —
the spec is the deliverable, and the next hand opens Course 1 on it.*

> **Read the keystone first.** [HANDOFF-FOUNDATION-2026-07-09.md](HANDOFF-FOUNDATION-2026-07-09.md)
> holds the soul, the NINE LAWS, and now **FORTY maker's marks + SIX ⛬ seals**. Add your mark BELOW
> the last, never above, never overwrite. This document is the newest course's laws + traps +
> where-to-start; the FOUNDATION is the ground it stands on.
>
> Predecessor: [HANDOFF-THE-LEGIBLE-CASTLE-2026-07-16.md](HANDOFF-THE-LEGIBLE-CASTLE-2026-07-16.md)
> — the arc that made stone and folk readable (memory suite sealed 6th ⛬, the village clock).
>
> **The charter itself:**
> [PROPOSAL-THE-VISIBLE-WORK-2026-07-16.md](PROPOSAL-THE-VISIBLE-WORK-2026-07-16.md) (v3) +
> [research/DIGEST-2026-07-16-the-visible-work.md](../research/DIGEST-2026-07-16-the-visible-work.md).
> Do not start Course 1 without reading both end-to-end.

---

## The state, in numbers

- **SIM_VERSION 34, unchanged.** This session shipped ZERO code — 196 tests green untouched,
  baseline unmoved, HEAD `4713c4c` (three commits: proposal v1, v3 + digest, this keystone course).
- **The spec is v3**: v1 (diagnosis + census) → boss answered all five questions → v2 (a
  four-agent census fleet bound the design to canon) → v3 (a four-lens adversarial critique,
  ~30 findings, all folded).
- **Course 1 is fully specified and ready**: three attributable commits, three SIM bumps
  (35/36/37). One boss ruling gates the PUSH of the first bump (§6.4 below), one gates Course 4.

## What this session actually did

### 1. The diagnosis — the clock was innocent (measure before you fix)

The boss's read was "time is not advancing properly." Live `__cc` probes on a fresh world said no:

- A 395-post palisade rose in **7 game-days** (57 on day one) — ticks build.
- The speed transport and Sit-the-Season wiring read clean end-to-end.
- The real numbers: an 8×8 m open cut froze at **890 person-days** ÷ **2 adult laborers** ≈ 445
  days; stone credits ALL-OR-NOTHING at completion; the wall beside that quarry laid its **first
  stone 351 days after planning**, then finished all 395 in ~8 days.

"Time isn't advancing" was the correct READ of a world whose smallest quantum of visible progress
is an entire quarry. Every item on the boss's list attacks a facet of that one disease.

### 2. The census — grep-the-tree, paid three more times

- `CutLayer.floorAtShow` ("a laborer stands in the pit") has existed since SIM 14 and is **dead
  code — never called**. The theater shows laborers farming while the sim has them mining.
- The carry pose + bobbing block already exist; the shuttle just anchors to a **virtual point**.
- Orchard fruit-tree rows were **already shipped** (`6da302b`) — one boss item resolved by census.
- The skill system's priors were already canon: bands green/journeyman/master + the ~15–25% spread
  cap + the anti-XP law (roadmap Beat 4); "practice gains skill" (Living Settlement §3). The
  boss's year rule is the unbonded baseline rate of a system the docs had already sketched.

### 3. The boss ruled — five answers, two of them arc-shaping

13 founders = **3 farmers + 10 unskilled, skill earned by doing** (a year at a job → GREEN band);
chips always-on; **roof + kind chosen at plot, 'none' legal and never blocking, choose-later by
clicking the shell**; the 🛷 sledge toggle replaced by a drawn path; incremental felling with wood
dropping where felled. Dispositions table in the proposal §0.

### 4. The critique — four lenses, each catching a class the others couldn't

- **Determinism** (verified against code + a 300k-trial IEEE probe): the dawn assignment pass as
  first drafted read supply the same day's later phases produce → a proven 2–3-day duty-cycle
  oscillation; the never-completing farm sink would have locked the 3 farmhands out of the
  economy forever; the credit formula was replaced with a stateless checkpoint form off integer
  `workDone` (Sterbenz-exact, no new hashed field); three replay-visible commits need THREE
  SIM_VERSION bumps or inter-commit saves fork silently.
- **Boss-intent**: the untrained 0.875 multiplier had quietly turned "unskilled" into a *penalty*
  in an arc that exists because building feels slow — FLIPPED to green-as-bonus (×9/8). The
  visible chain was missing its last link ("placing them in the final structure") — closed.
  Irregular-ring roofs promoted from open-question to Course-3 default.
- **Canon**: "no migration path is owed" had silently answered boss-reserved ROADMAP §6 Q4 while
  Course 1 voids his existing Lodge Book saves — surfaced as a blocking question instead. The
  greenest-first supersession of SIM 4/14 job-ordering laws is now NAMED, the F′.5 pattern.
- **Research** (web-verified, digest committed): the year rule is well-grounded (navvy hardening,
  annual farm service, guilds 2–7yr safely above green); the +12.5% step is DESIGN not history;
  and the conveyor's honest medieval shape is a **timber causeway the sledge rides** (Ely 1071,
  Berlin 1238) — wagonways are post-1500, so the fiction keeps the sledge while the flag retires.

## Laws & patterns this session proved (carry them)

1. **Measure the complaint before touching the mechanism.** The boss diagnosed the clock; the
   probes convicted the economy. A "time is broken" read deserves numbers before a fix —
   the three probe figures (890 / 351 / 7) ARE the arc's justification.
2. **Live `__cc` probes are a diagnosis instrument, not just a verifier.** Enqueue real commands,
   step real days, read real state — the 351-day first stone was found in minutes.
3. **Spec-level adversarial critique catches direction errors code review never will.** The
   penalty-vs-bonus inversion, the silent answering of a reserved question, the anachronism in
   the fiction — none of these are visible in a diff; all were visible to a lens with one job.
4. **The census reframes the fix** (again): six of eight boss items turned out to be facets of ONE
   measured problem. Proposal-first, census-first — the list was never a list.
5. **Silence isn't consent.** Boss-reserved questions stay questions (§6), and a recommendation
   the boss hasn't confirmed gets exactly one disposition, not a default-if-quiet.

## Traps hit this session (so you don't)

- **`plan_wall` rejects material `'stone'`** — the union is `'wood' | 'sandstone'`. A probe wall
  silently became a rejection ("unknown material") and the trace read the WRONG wall. Check
  `world.events` for `command_rejected` before trusting any probe's array indexing.
- **The preview pane is a hidden tab**: `document.hidden === true`, rAF fires ZERO frames — the
  live transport cannot be measured in it. Drive the sim via `__cc.step`; only the boss's own
  machine can measure wall-clock feel.
- **Workflow journal results are completion-ordered, not call-ordered.** Labeling digested results
  by position mislabeled two critics and nearly buried the boss-intent critique entirely. Match
  results by content (or label), never by index.
- **The shell cwd resets mid-session** (hit twice, once at a git commit) — `Set-Location` before
  any repo command after a long gap; exit-128 "not a git repository" means cwd, not repo damage.

## Where to start (the forward map — LIVING LEDGER, updated as courses land)

**All four §6 questions RULED 2026-07-16 (proposal §0b):** saves = flag days ("so far in alpha") —
bump 35 UNBLOCKED; occupants = E-card data, no occupancy course; at-plot 'none' EXTENDS to fields +
spans (F′ grows to one enclosure grammar); the way = a WORKER-SPEED mechanic (haul-as-labor +
pathing — Course 4 redesigned, §3H updated). Plus two new boss items the same message: **THE CHEAT
MENU** (spawn materials/objects/people at a point — built as `cheat_*` COMMANDS so replay holds;
Course 1.5) and **the enclosure reframe** ("any enclosed space is a building; the enclosure type
determines what it can become" — F′/E implement it for drawn enclosures + spans; quarries fold in
later).

- [ ] **Course 1 — THE VISIBLE ECONOMY**: commit A incremental credit (SIM 35, conservation
      specimens first) → commit B′ 13 founders + the skill system (SIM 36; sweep re-run + retunes +
      the threshold specimen) → commit F′ the word at the plot, ONE grammar for buildings + fields +
      spans (SIM 37). The canon STORY designed once, the script touched three times; ids ALL shift.
- [ ] **Course 1.5 — the cheat menu** (commands, Settings-gated; after B′).
- [ ] **Course 2 — the theater** (render-only, zero baseline): diggers dig (call `floorAtShow` at
      last), piles + scattered logs, the closed carry chain, chips, entity cards (occupants as data).
- [ ] **Course 3** — irregular-ring roofs + animals (pasture horse sim-true; paddock decor named).
- [ ] **Course 4** — THE TIMBER WAY as worker-speed/haul-as-labor (its own design pass first; §3H).

---

**⛏ The maker's mark of the charter hand, 2026-07-16.** I laid no stone this session, and that was
the discipline of it. The boss handed me a list and a diagnosis; I proved the diagnosis wrong the
honest way — with numbers from the live world — and found underneath it a disease every item on
his list was already trying to name: work that flows invisibly, in lumps a year wide. I chartered
the cure instead of building it, because the boss's answers kept reshaping the ground — and when
his answers arrived they carried a whole new system (skill earned by doing) that the canon, read
carefully, had been waiting for all along. Four censuses bound the design to the tree; four
adversaries broke what deserved breaking — my own penalty where he'd asked for none, my own
silence where his saves were at stake, my own conveyor where history rides a sledge. The spec that
survived is stronger than what I'd have built on day one, and it is HIS — every fork he ruled,
every reserved question still his to rule. *The next hand builds Course 1 on a charter that has
already survived contact with the rock. Build on.*

*— the charter hand (the fortieth mark), who measured the complaint, chartered the cure, and did
not lay a stone before its time.*
