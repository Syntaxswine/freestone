/**
 * Render layer: reads WorldState, never writes it. Player intent enters the sim
 * exclusively as Commands appended to the log; speed buttons are TRANSPORT ONLY —
 * they change how often worldStep is called, never what it does.
 *
 * Coordinate map: sim is (x east, y north, z up) in site-local meters.
 * Three.js is (x east, y up, z north): three.position.set(simX, simZ, simY),
 * and a sim yaw (about z-up, +x toward +y) becomes rotation.y = -yaw.
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import {
  bedModelFromJson,
  cutEconomics,
  emptyBedModel,
  type BedModel,
  type BedsJson,
} from '../sim/beds';
import { waterModelFromSite } from '../sim/water';
import { flatSite, siteFromHeightmap, type HeightmapJson, type SiteData } from '../sim/site';
import {
  awaitsDrawings,
  classifyRing,
  effectiveGroundAt,
  nearestOnPolyline,
  planGates,
  pointInPolygon,
  polygonArea,
  ringSelfIntersects,
  ringSelfOverlaps,
  worldStep,
} from '../sim/step';
import { createWorld } from '../sim/world';
import {
  BUILDING_MIN_H,
  COURSE_HEIGHT,
  DRESS_SPEC,
  FARM_MIN_AREA,
  FARM_WALL_MAX_H,
  ROOF_SNAP,
  STONE_DEPTH,
  STONE_LEN,
  STONE_VOLUME,
  AREA_PER_PERSON,
  FELL_TREES_PER_DAY,
  FOUNDING_CAPACITY,
  FOUNDING_STORAGE,
  GRANARY_STORAGE,
  GROWTH_THRESHOLD,
  houseTier,
  REGROWTH_TICKS,
  TICKS_PER_YEAR,
  TIMBER_PER_TREE,
  dayOfYear,
  seasonOf,
  ticksUntilNextSeason,
  yearOf,
  type BuildingKind,
  type BuildingRoof,
  type Command,
  type DressLevel,
  type FieldUse,
  type HaulMethod,
  type RoofMaterial,
  type Vec2,
} from '../sim/types';
import { BuildingLayer } from './buildings';
import { CutLayer } from './cuts';
import { UnderworldLayer } from './underworld';
import { FarmLayer } from './farms';
import { FillLayer } from './fills';
import { GateLayer } from './gates';
import { RoofLayer } from './roofs';
import { PeopleLayer } from './people';
import { GranaryLayer } from './granary';
import { describeFootprint, KIND_LABEL, WallPlanner } from './planner';
import { TreeLayer } from './trees';
import { createHomeScreen } from './homescreen';
import { createTutorial } from './tutorial';

const SEED = 'durham-first-wall';
const STONE_CAPACITY = 20000;
const SPEEDS = [0, 1, 4, 16] as const; // ticks (game days) per real second — transport only
const FF_BUDGET_MS = 8; // Sit-the-Season: max wall-clock spent stepping per frame

async function loadSite(): Promise<SiteData> {
  try {
    const res = await fetch(`${import.meta.env.BASE_URL}data/site-durham/heightmap.json`);
    if (!res.ok) throw new Error(`${res.status}`);
    const json = (await res.json()) as HeightmapJson;
    return siteFromHeightmap(json);
  } catch (err) {
    console.warn('site data unavailable, using flat placeholder:', err);
    return flatSite('flat-placeholder', 1000);
  }
}

async function loadBeds(): Promise<BedModel> {
  try {
    const res = await fetch(`${import.meta.env.BASE_URL}data/site-durham/beds.json`);
    if (!res.ok) throw new Error(`${res.status}`);
    return bedModelFromJson((await res.json()) as BedsJson);
  } catch (err) {
    console.warn('bed model unavailable — quarries will find unknown ground:', err);
    return emptyBedModel();
  }
}

interface TerrainDisplay {
  mesh: THREE.Mesh;
  /**
   * Height on the DECIMATED display surface — the ground the player's eye sees.
   * Preview overlays and sprite feet must sit on THIS, not site.heightAt: the two
   * differ by up to ~0.5 m where 16 m triangles cut across the 8 m data, and a
   * full-res height can land underneath the displayed mesh (buried previews).
   * The SIM keeps sampling full-res heightAt — this is presentation only.
   */
  groundAt: (x: number, y: number) => number;
  minH: number;
  maxH: number;
}

function terrainMesh(site: SiteData): TerrainDisplay {
  // Decimate to at most ~257 vertices per axis for the render mesh; the SIM always
  // samples the full-resolution heightAt, so this is a display decision only.
  const step = Math.max(1, Math.ceil(Math.max(site.width, site.height) / 257));
  const w = Math.ceil(site.width / step) + 1;
  const h = Math.ceil(site.height / step) + 1;
  const s = step * site.cellSize;
  const grid = new Float32Array(w * h);
  const positions = new Float32Array(w * h * 3);
  let p = 0;
  let minH = Infinity;
  let maxH = -Infinity;
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      // clamp the last row/column to the site edge so decimation leaves no void strip
      const x = Math.min(i * s, site.extentX);
      const y = Math.min(j * s, site.extentY);
      const z = site.heightAt(x, y);
      grid[j * w + i] = z;
      if (z < minH) minH = z;
      if (z > maxH) maxH = z;
      positions[p++] = x;
      positions[p++] = z;
      positions[p++] = y;
    }
  }
  const indices: number[] = [];
  for (let j = 0; j < h - 1; j++) {
    for (let i = 0; i < w - 1; i++) {
      const a = j * w + i;
      const b = a + 1;
      const c = a + w;
      const d = c + 1;
      // wind so face normals point +Y (up) given our x-east / z-north layout:
      // cross(c-a, b-a) = cross(+z, +x) = +y
      indices.push(a, c, b, b, c, d);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  const mat = new THREE.MeshLambertMaterial({ color: 0x90ac6e }); // sage, not moor-gloom
  const mesh = new THREE.Mesh(geo, mat);
  mesh.receiveShadow = false;

  const groundAt = (x: number, y: number): number => {
    // sample the exact triangulated surface: pick the cell, then the triangle
    // (a,c,b)/(b,c,d) the point falls in, matching the index winding above
    const xi = Math.min(Math.max(Math.floor(x / s), 0), w - 2);
    const yi = Math.min(Math.max(Math.floor(y / s), 0), h - 2);
    const x0 = Math.min(xi * s, site.extentX);
    const x1 = Math.min((xi + 1) * s, site.extentX);
    const y0 = Math.min(yi * s, site.extentY);
    const y1 = Math.min((yi + 1) * s, site.extentY);
    const tx = x1 > x0 ? Math.min(Math.max((x - x0) / (x1 - x0), 0), 1) : 0;
    const ty = y1 > y0 ? Math.min(Math.max((y - y0) / (y1 - y0), 0), 1) : 0;
    const A = grid[yi * w + xi]!;
    const B = grid[yi * w + xi + 1]!;
    const C = grid[(yi + 1) * w + xi]!;
    const D = grid[(yi + 1) * w + xi + 1]!;
    return tx + ty <= 1
      ? A + (B - A) * tx + (C - A) * ty
      : D + (C - D) * (1 - tx) + (B - D) * (1 - ty);
  };
  return { mesh, groundAt, minH, maxH };
}

async function boot(): Promise<void> {
  const site = await loadSite();
  const beds = await loadBeds();
  // the water table (boundary input, like the beds): shades the underground view AND
  // gates the workings, so the blue on the map and the stone in the ground agree
  const water = waterModelFromSite(site);
  const world = createWorld(SEED, site.id);

  // The command log starts EMPTY: the groundwork demo is gone, and the first
  // wall on this hill is drawn by the player's own hand.
  const cx = site.extentX / 2;
  const cy = site.extentY / 2;
  const commandLog: Command[] = [];
  const byTick = new Map<number, Command[]>();

  /** The one legal write path into the sim: append to the log AND the tick index. */
  function enqueue(cmd: Command): boolean {
    if (cmd.tick < world.tick) return false; // the past is written; refuse quietly
    commandLog.push(cmd);
    const bucket = byTick.get(cmd.tick);
    if (bucket) bucket.push(cmd);
    else byTick.set(cmd.tick, [cmd]);
    return true;
  }

  // The mining tutorial (declared early so the planner's onConfirm and the
  // underground hooks below can reach it). It only WATCHES; it never gates input.
  const tutorial = createTutorial();

  // --- three.js scene ---
  const app = document.getElementById('app')!;
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  app.appendChild(renderer.domElement);

  // The look (SCOPE §8d, Townscaper canon): a mild warm morning, never grim.
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xc3d7e0);
  scene.fog = new THREE.Fog(0xc3d7e0, 600, 3200);

  const camera = new THREE.PerspectiveCamera(
    55,
    window.innerWidth / window.innerHeight,
    0.1,
    5000,
  );
  const groundAtCenter = site.heightAt(cx, cy);
  camera.position.set(cx + 90, groundAtCenter + 70, cy - 120);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(cx, groundAtCenter, cy);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 12;
  controls.maxDistance = 1500;
  controls.maxPolarAngle = Math.PI * 0.47; // keep the eye above the hill
  controls.screenSpacePanning = false; // pan rides the ground plane; target.y never drifts
  // input split (2026-07-11): the LEFT button is the player's pencil ONLY. Orbit moved
  // to right-drag, pan to middle-drag, so a placement click can never be mistaken for a
  // camera drag (the boss's "rotate and place are the same button") — and left-drag is
  // freed for a future marquee select. Omitting LEFT disables its camera action (the
  // mousedown switch falls through to STATE.NONE). Wheel stays zoom in surface mode.
  controls.mouseButtons = { MIDDLE: THREE.MOUSE.PAN, RIGHT: THREE.MOUSE.ROTATE };
  controls.update();

  scene.add(new THREE.HemisphereLight(0xdcebf2, 0x8a9a6f, 1.0));
  const sun = new THREE.DirectionalLight(0xffe9c4, 1.3);
  sun.position.set(300, 400, -200);
  scene.add(sun);

  const terrain = terrainMesh(site);
  scene.add(terrain.mesh);

  const stoneGeo = new THREE.BoxGeometry(STONE_LEN, COURSE_HEIGHT, STONE_DEPTH);
  // white base: per-instance color MULTIPLIES material color, and a tan base
  // muddied every tint toward chocolate — the instance tint carries the color
  const stoneMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
  function makeStoneMesh(cap: number): THREE.InstancedMesh {
    const m = new THREE.InstancedMesh(stoneGeo, stoneMat, cap);
    m.count = 0;
    // InstancedMesh culls by the base geometry's bounds (one 0.45 m box at the origin),
    // which would blink the whole wall out of existence — cull per-frame ourselves: never.
    m.frustumCulled = false;
    return m;
  }
  // capacity GROWS with the build (player walls are unbounded); a hard cap here
  // silently froze the wall on screen while the sim kept laying
  let stoneCapacity = STONE_CAPACITY;
  let stones = makeStoneMesh(stoneCapacity);
  scene.add(stones);

  // --- HUD ---
  const hud = document.getElementById('hud')!;
  const status = document.createElement('div');
  const plan = document.createElement('div');
  plan.className = 'plan';
  const buttons = document.createElement('div');
  const build = document.createElement('div');
  const hint = document.createElement('div');
  hint.className = 'hint';
  const attribution = document.createElement('div');
  attribution.style.opacity = '0.6';
  attribution.textContent = site.attribution || `terrain: ${site.id}`;
  hud.append(status, plan, buttons, build, hint, attribution);

  let speed: (typeof SPEEDS)[number] = 1;
  // SIT THE SEASON (step 0): when set, the loop fast-forwards worldStep to this
  // target tick — the next season turn — then hands control back. Transport only;
  // it changes how often worldStep is called, never what it does. Any speed press
  // (pause included) cancels it, so pausing never advances the clock.
  let sitUntil: number | null = null;
  for (const s of SPEEDS) {
    const b = document.createElement('button');
    b.textContent = s === 0 ? '❚❚' : `×${s}`;
    b.onclick = () => {
      speed = s;
      sitUntil = null; // an explicit speed choice ends the sit
      for (const other of buttons.children) other.classList.remove('active');
      b.classList.add('active');
    };
    if (s === speed) b.classList.add('active');
    buttons.appendChild(b);
  }
  // the fast-forward button rides with the speed controls (it is a transport verb):
  // press to sit until the season turns, press again to stop short.
  const ffBtn = document.createElement('button');
  ffBtn.className = 'ff';
  ffBtn.textContent = '⏭ sit the season';
  ffBtn.title = 'Fast-forward to the next turn of the season';
  ffBtn.onclick = () => {
    if (!started) return; // nothing to sit through before a game begins
    sitUntil = sitUntil === null ? world.tick + ticksUntilNextSeason(world.tick) : null;
  };
  buttons.appendChild(ffBtn);

  const wallBtn = document.createElement('button');
  wallBtn.textContent = '⚒ wall (B)';
  const bldBtn = document.createElement('button');
  bldBtn.textContent = '⌂ building (H)';
  const hMinus = document.createElement('button');
  hMinus.textContent = '−';
  const hVal = document.createElement('span');
  hVal.style.margin = '0 6px 0 2px';
  const hPlus = document.createElement('button');
  hPlus.textContent = '+';
  build.append(wallBtn, bldBtn, hMinus, hVal, hPlus);
  const build2 = document.createElement('div');
  const fillBtn = document.createElement('button');
  fillBtn.textContent = '⛰ fill (F)';
  const gateBtn = document.createElement('button');
  gateBtn.textContent = '🚪 gate (G)';
  const matBtn = document.createElement('button');
  matBtn.textContent = '🪨 sandstone';
  const dressBtn = document.createElement('button');
  dressBtn.textContent = '⚒ dress: auto';
  build2.append(fillBtn, gateBtn, matBtn, dressBtn);
  build.after(build2);
  const build3 = document.createElement('div');
  const roofBtn = document.createElement('button');
  roofBtn.textContent = '⛉ roof (R)';
  const quarryBtn = document.createElement('button');
  quarryBtn.textContent = '⛏ quarry (Q)';
  const fellBtn = document.createElement('button');
  fellBtn.textContent = '🪓 fell (T)';
  const shapeBtn = document.createElement('button');
  shapeBtn.textContent = '⬓ flat fill';
  // no roof-material picker: the covering is chosen on the card AFTER the
  // span is drawn, like every designation (boss canon 2026-07-10 — default none)
  const undergroundBtn = document.createElement('button');
  undergroundBtn.textContent = '☷ underground (U)';
  build3.append(roofBtn, quarryBtn, fellBtn, shapeBtn, undergroundBtn);
  build2.after(build3);

  // --- the woods, the earthworks, the pencil and the people ---
  const trees = new TreeLayer(site, terrain.groundAt, scene);
  const fills = new FillLayer(world, scene, terrain.groundAt);
  const cuts = new CutLayer(world, scene, terrain.groundAt);
  // the underworld made VISIBLE (2026-07-11): a toggle-on strata map + working
  // plane the tunnel tool will draw on. View/input only — the sim never sees it.
  const underworld = new UnderworldLayer(scene, site, beds, water);
  // masonry grounds on COMPLETED fills (matches the sim's effectiveGroundAt);
  // feet may climb the rising mound
  const groundSim = (x: number, y: number): number =>
    Math.max(terrain.groundAt(x, y), fills.topAtSim(x, y));
  const groundShow = (x: number, y: number): number =>
    Math.max(terrain.groundAt(x, y), fills.topAtShow(x, y));
  // fields ground on the SIM-matching surface (terrain + completed platforms)
  // — a farm ringed on a finished fill tills the platform, not the buried
  // terrain beneath; roofs cap the as-built stones and need no ground at all
  const farms = new FarmLayer(world, scene, groundSim);
  const buildings = new BuildingLayer(world, scene);
  const gates = new GateLayer(world, scene, groundSim);
  const roofs = new RoofLayer(world, scene);
  // MINING (2026-07-11): a working is WATER- and BED-gated at the command boundary.
  // The OUTCROP QUARRY wins the DRY building stone within a shallow open-cut reach; if
  // the post at the ring is drowned or too deep, the land doesn't afford an open cut
  // (drive an adit later). The economics freeze into plan_cut — the sim never sees
  // water or beds, so a save replays byte-identically (the SIM 14 freeze law, now with
  // the water lever too). The height slider no longer sets quarry depth: the WATER does.
  const MAX_OPEN_REACH = 12; // m — an open cut only strips so much overburden
  type QuarryPlan =
    | { ok: true; depth: number; workDays: number; stone: number; reach: number }
    | { ok: false; reason: string };
  function centroid(points: Vec2[]): { cx: number; cy: number } {
    let cx = 0;
    let cy = 0;
    for (const p of points) {
      cx += p.x;
      cy += p.y;
    }
    return { cx: cx / points.length, cy: cy / points.length };
  }
  function quarryPlanAt(cx: number, cy: number, area: number): QuarryPlan {
    const dryDepth = water.dryDepthAt(cx, cy);
    const reach = Math.min(dryDepth, MAX_OPEN_REACH); // dry AND within open-cut reach
    const { workDays, stone } = cutEconomics(beds, cx, cy, Math.max(0, reach), Math.max(1, area));
    if (stone > 0.5 && reach > 0.5) return { ok: true, depth: reach, workDays, stone, reach };
    // not afforded — name why, from the shallowest building stone in the column
    const post = beds.nearestHole(cx, cy)?.column.find((s) => s.m === 'sandstone' || s.m === 'limestone');
    if (!post) return { ok: false, reason: 'no building stone in the ground here — only drift and metal' };
    if (post.top >= dryDepth)
      return {
        ok: false,
        reason: `the post here is drowned — ${post.top.toFixed(0)} m down, the water table at ${dryDepth.toFixed(0)} m · drive an adit`,
      };
    return {
      ok: false,
      reason: `the post here lies ${post.top.toFixed(0)} m down — too deep for an open cut · drive an adit`,
    };
  }
  function cutCommand(points: Vec2[]): Command | null {
    const { cx, cy } = centroid(points);
    const plan = quarryPlanAt(cx, cy, Math.max(1, polygonArea(points)));
    if (!plan.ok) return null; // onConfirm refuses; the plan row already says why
    return {
      kind: 'plan_cut',
      tick: world.tick,
      points,
      depth: plan.depth,
      workTotal: plan.workDays,
      stoneTotal: plan.stone,
    };
  }
  // THE FELL (SIM 19): a cant marked over woodland. Like the quarry, the economics
  // are read HERE (only the render holds the tree model) and FROZEN into plan_fell.
  function fellCommand(points: Vec2[]): Command | null {
    const { cx, cy } = centroid(points);
    // re-cut: a fell ring landing on an existing MATURE stand harvests it again (the
    // coppice's next rotation) rather than stacking a second cant on the same ground
    const mature = world.stands.find(
      (s) => !s.felling && s.feltTick < 0 && pointInPolygon(cx, cy, s.points),
    );
    if (mature) return { kind: 'fell', tick: world.tick, standId: mature.id };
    // a new cant: freeze its timber + felling cost from the tree model (the boundary
    // read; the sim never counts a tree), exactly as quarryPlanAt freezes plan_cut
    const timberTotal = trees.timberInPolygon(points);
    if (timberTotal <= 0) return null; // no standing timber here — onConfirm refuses
    const workTotal = Math.max(1, Math.ceil(timberTotal / TIMBER_PER_TREE / FELL_TREES_PER_DAY));
    return { kind: 'plan_fell', tick: world.tick, points, timberTotal, workTotal };
  }

  // --- THE HAUL (SIM 17): the route a wall's stone must travel. main.ts alone
  //     holds surface + water + beds, so it reads the route HERE and freezes a
  //     haulRate + method into plan_wall, exactly as quarryPlanAt freezes plan_cut
  //     — the sim replays the scalar and never sees the road. "Cost the ROUTE, not
  //     straight-line" (PROPOSAL-LOGISTICS §4.1): a bed across the Wear is NOT near
  //     — the cart must detour to a bridge, so the gorge reads as a MOAT and the
  //     historical optimum (quarry the peninsula's own post) falls out of the
  //     geometry with zero scripting. ---
  const HAUL_PROBE_AREA = 10; // m² — the affordance probe ("is dry post winnable here?")
  const HAUL_BASE_RATE = 12; // m³/day a cart lays at the doorstep (≫ masons need → never binds)
  const HAUL_SCALE = 120; // m of haul-route at which the delivered rate halves (mileage → map scale)
  const HAUL_UPHILL_PER_M = 14; // haul-route metres ADDED per metre the stone must climb to the wall
  const HAUL_BRIDGE_DETOUR = 4; // the Wear is a MOAT: a route that crosses the gorge detours to a bridge
  const HAUL_GORGE_DROP = 10; // m the land must dip below both ends for a route to "cross the gorge"
  const HAUL_MAX_REACH = 250; // m — past this from any dry post, haul is maximally dear (bounds the scan)
  const round6 = (v: number): number => Math.round(v * 1e6) / 1e6; // tidy the frozen scalar
  // the nearest place the land affords an OPEN CUT of dry building stone — the
  // source the carts draw from. Ring-search outward from the wall; the first
  // afforded radius wins (≈ nearest). Bounded + memoized, so the live preview
  // never re-scans a still gesture.
  function nearestDryPost(wx: number, wy: number): { x: number; y: number; dist: number } | null {
    const maxR = Math.min(HAUL_MAX_REACH, Math.max(site.extentX, site.extentY));
    for (let r = 16; r <= maxR; r += 16) {
      let best: { x: number; y: number; dist: number } | null = null;
      const n = Math.max(8, Math.round((2 * Math.PI * r) / 16));
      for (let k = 0; k < n; k++) {
        const a = (2 * Math.PI * k) / n;
        const sx = wx + r * Math.cos(a);
        const sy = wy + r * Math.sin(a);
        if (sx < 0 || sy < 0 || sx > site.extentX || sy > site.extentY) continue;
        if (quarryPlanAt(sx, sy, HAUL_PROBE_AREA).ok) {
          const d = Math.hypot(sx - wx, sy - wy);
          if (!best || d < best.dist) best = { x: sx, y: sy, dist: d };
        }
      }
      if (best) return best; // first radius with a hit — the nearest afforded post
    }
    return null; // no dry post within reach — the caller treats it as dearest
  }
  // does the straight route dip into the gorge? then a cart can't ford it — it
  // detours to a bridge (the moat). Sampled on the terrain heights.
  function routeCrossesGorge(ax: number, ay: number, bx: number, by: number, refLow: number): boolean {
    const steps = Math.max(4, Math.ceil(Math.hypot(bx - ax, by - ay) / 8));
    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      if (site.heightAt(ax + (bx - ax) * t, ay + (by - ay) * t) < refLow - HAUL_GORGE_DROP) return true;
    }
    return false;
  }
  const haulMemo = new Map<string, { haulRate: number; method: HaulMethod } | null>();
  // the haul VERDICT for a wall, frozen at plan time. null = 'local' (dry post
  // under the wall's own feet — no cart, draws the pile directly). Otherwise a
  // finite m³/day the cart delivers to the face + the field-guide word for it.
  function haulVerdict(points: Vec2[]): { haulRate: number; method: HaulMethod } | null {
    const { cx, cy } = centroid(points);
    const key = `${Math.round(cx / 4)},${Math.round(cy / 4)}`;
    const cached = haulMemo.get(key);
    if (cached !== undefined) return cached;
    let verdict: { haulRate: number; method: HaulMethod } | null;
    if (quarryPlanAt(cx, cy, HAUL_PROBE_AREA).ok) {
      verdict = null; // winnable underfoot — 'local', no cart
    } else {
      const src = nearestDryPost(cx, cy);
      if (!src) {
        // no dry post within reach — the dearest overland haul the map allows
        verdict = { haulRate: round6(HAUL_BASE_RATE / (1 + HAUL_MAX_REACH / HAUL_SCALE)), method: 'ox-cart' };
      } else {
        const wallG = site.heightAt(cx, cy);
        const srcG = site.heightAt(src.x, src.y);
        const climb = Math.max(0, wallG - srcG); // hauling UP to the wall costs the beasts
        const crosses = routeCrossesGorge(src.x, src.y, cx, cy, Math.min(wallG, srcG));
        let route = src.dist + HAUL_UPHILL_PER_M * climb;
        if (crosses) route *= HAUL_BRIDGE_DETOUR;
        const method: HaulMethod = crosses
          ? 'ox-cart over the bridge'
          : climb > src.dist * 0.15
            ? 'ox-cart uphill'
            : route < HAUL_SCALE
              ? 'sledge'
              : 'ox-cart';
        verdict = { haulRate: round6(HAUL_BASE_RATE / (1 + route / HAUL_SCALE)), method };
      }
    }
    haulMemo.set(key, verdict);
    return verdict;
  }

  // --- THE DRESS DIAL (SIM 18): the block class a wall's STRUCTURE calls for,
  //     the smart default when the dial is on 'auto'. A low garden or field wall
  //     is fine in light RUBBLE; a tall or load-bearing wall (a building shell, a
  //     retaining curtain) wants dressed ASHLAR; SCAPPLED between. Pure function of
  //     the drawn height — a building is always ≥ BUILDING_MIN_H, so height alone
  //     captures it. Shared by the plan-row readout and the plan_wall freeze, so
  //     the pencil's promise and the frozen level never drift. ---
  function autoDress(height: number): DressLevel {
    return height >= BUILDING_MIN_H ? 'ashlar' : height <= FARM_WALL_MAX_H ? 'rubble' : 'scappled';
  }

  // explicit annotation: onConfirm's closure reads planner.fillShape /
  // roofMaterial, so inference would otherwise chase its own tail
  const planner: WallPlanner = new WallPlanner({
    scene,
    camera,
    site,
    groundAt: groundSim,
    // the survey that COUNTS stones runs on the sim's own ground (SIM 13
    // parity law): the pencil's promise is the record's number exactly
    countGround: (x, y) => effectiveGroundAt(world, site, x, y),
    heightBounds: { min: terrain.minH, max: terrain.maxH + 10 }, // fills raise the roof
    dom: renderer.domElement,
    onConfirm: (mode, points, height, material) => {
      if (mode === 'cut') {
        const cmd = cutCommand(points);
        if (cmd && enqueue(cmd)) {
          tutorial.saw('quarry'); // tutorial step 3: a real quarry committed
          return true;
        }
        return false; // the land didn't afford an open cut — the plan row says why
      }
      if (mode === 'fell') {
        const cmd = fellCommand(points);
        return cmd ? enqueue(cmd) : false; // no standing timber — the plan row says why
      }
      if (mode === 'fill') {
        return enqueue({ kind: 'plan_fill', tick: world.tick, points, height, shape: planner.fillShape });
      }
      if (mode === 'roof') {
        return enqueue({ kind: 'plan_roof', tick: world.tick, points }); // covering asked after
      }
      // wall or building (both are plan_wall): freeze the HAUL verdict from the
      // route (SIM 17). Timber takes no cart; stone on winnable ground is 'local'.
      const hv = material === 'wood' ? null : haulVerdict(points);
      // freeze the DRESS LEVEL (SIM 18): the dial's override, or the structure's
      // smart default when 'auto'; timber is never dressed, so it takes the neutral
      // scappled (byte-identical to its SIM-17 lay). The sim replays the level.
      const dressLevel: DressLevel =
        material === 'wood'
          ? 'scappled'
          : planner.dress === 'auto'
            ? autoDress(height)
            : planner.dress;
      return enqueue({
        kind: 'plan_wall',
        tick: world.tick,
        points,
        height,
        material,
        dressLevel,
        ...(hv ? { haulRate: hv.haulRate, method: hv.method } : {}),
      });
    },
    onModeChange: (active, mode) => {
      wallBtn.classList.toggle('active', active && mode === 'wall');
      bldBtn.classList.toggle('active', active && mode === 'building');
      fillBtn.classList.toggle('active', active && mode === 'fill');
      gateBtn.classList.toggle('active', active && mode === 'gate');
      roofBtn.classList.toggle('active', active && mode === 'roof');
      quarryBtn.classList.toggle('active', active && mode === 'cut');
      fellBtn.classList.toggle('active', active && mode === 'fell');
    },
    // ⇧-snap magnetizes to every planned wall, building shell and field ring
    // (they are all WallPlans) — a live getter, the world grows mid-drawing;
    // height + build state ride along so roof mode can snap at the TOPS of
    // FINISHED walls only (the sim's support rule, mirrored)
    snapTargets: () =>
      world.walls.map((w) => ({
        points: w.points,
        height: w.height,
        complete: w.stonesLaid >= w.stonesTotal,
      })),
    // the gate tool, context-aware (boss canon 2026-07-10): a click near hung
    // furniture takes it down; a click near a FARM wall hangs a gate; near a
    // BUILDING wall it cuts a door — the sim validates and snaps for real
    onGate: (p) => {
      let gateWall: number | null = null;
      let gd = Infinity;
      for (const w of world.walls) {
        for (const g of w.gates) {
          const d = Math.hypot(p.x - g.x, p.y - g.y);
          if (d < gd) {
            gd = d;
            gateWall = w.id;
          }
        }
      }
      if (gateWall !== null && gd < 2.5) {
        enqueue({ kind: 'remove_gate', tick: world.tick, wallId: gateWall, at: { x: p.x, y: p.y } });
        return;
      }
      const owned = new Set<number>([
        ...world.farms.map((f) => f.wallId),
        ...world.buildings.map((b) => b.wallId),
        ...world.pending, // hang the gate before you name the field
      ]);
      let addWall: number | null = null;
      let wd = Infinity;
      for (const id of owned) {
        const w = world.walls.find((q) => q.id === id);
        if (!w) continue;
        const q = nearestOnPolyline(w.points, p);
        const d = Math.hypot(p.x - q.x, p.y - q.y);
        if (d < wd) {
          wd = d;
          addWall = w.id;
        }
      }
      if (addWall !== null && wd < 3) {
        enqueue({ kind: 'add_gate', tick: world.tick, wallId: addWall, at: { x: p.x, y: p.y } });
      }
    },
  });
  // --- the designation card (SIM 10): a completed enclosure asks its lord ---
  // Choices as data so later courses can gate entries behind unlocks (boss
  // canon 2026-07-10: "these options might unlock later") — today all stand.
  const FIELD_CHOICES: { use: FieldUse; label: string }[] = [
    { use: 'farm', label: '🌾 farm' },
    { use: 'livestock', label: '🐑 livestock' },
    { use: 'pasture', label: '🐎 pasture' }, // SIM 24: a horse paddock — variety toward a specialist
    { use: 'orchard', label: '🍎 orchard' }, // SIM 24: fruit — variety toward a specialist
    { use: 'fallow', label: '🌿 fallow' },
  ];
  const SHELL_CHOICES: { use: BuildingKind; label: string }[] = [
    { use: 'house', label: '⌂ house' },
    { use: 'blacksmith', label: '⚒ blacksmith' },
    { use: 'tower', label: '🗼 tower' },
    { use: 'tavern', label: '🍺 tavern' },
    { use: 'granary', label: '🏛 granary' }, // SIM 21: the civic heart — stores the harvest, feeds more
    { use: 'carpentry', label: '🪚 carpenter' }, // SIM 23: keeps a cart — carries grain to the granary, draws timber
  ];
  const ROOF_CHOICES: { material: RoofMaterial; label: string }[] = [
    { material: 'wood', label: '🪵 wood' },
    { material: 'straw', label: '🌾 straw' },
    { material: 'brick', label: '🧱 brick — a floor above' },
  ];
  // the drawings' roof palette: none stands FIRST (boss canon — the default)
  const BUILDING_ROOF_CHOICES: { roof: BuildingRoof; label: string }[] = [
    { roof: 'none', label: '— none (open sky)' },
    { roof: 'wood', label: '🪵 wood' },
    { roof: 'straw', label: '🌾 straw' },
    { roof: 'brick', label: '🧱 brick — a floor above' },
  ];
  const card = document.createElement('div');
  card.id = 'word-card';
  card.style.display = 'none';
  const cardTitle = document.createElement('div');
  const cardRow = document.createElement('div');
  card.append(cardTitle, cardRow);
  document.body.appendChild(card);
  const cardAnchor = new THREE.Vector3();
  let cardAsk = ''; // stage-scoped key — a plotted building asks TWICE under one id
  let cardBaseTitle = '';
  // an ask whose word is enqueued but not yet stepped: the card moves on
  // rather than asking twice. An entry stands only while world.tick <= its
  // tick — once stepped, the live pending lists are the truth again (so a
  // rejected word can never wedge an ask).
  const spoken = new Map<string, number>();

  function updateCard(): void {
    for (const [key, t] of spoken) {
      if (world.tick > t) spoken.delete(key);
    }
    // one queue of asks in creation order (wall and roof ids share the one
    // nextId sequence): pending walls — a plotted building asks its ROOF then
    // its TRADE (SIM 12, before the masons build), a completed field plot
    // asks its USE — plus uncovered spans asking their covering
    const asks: { key: string; id: number; stage: 'roof' | 'kind' | 'use' | 'cover' }[] = [];
    for (const id of world.pending) {
      const w = world.walls.find((q) => q.id === id);
      if (!w) continue;
      const stage = w.plans === null ? 'use' : w.plans.roof === null ? 'roof' : 'kind';
      asks.push({ key: `${id}:${stage}`, id, stage });
    }
    for (const r of world.roofs) {
      if (r.material === null) asks.push({ key: `${r.id}:cover`, id: r.id, stage: 'cover' });
    }
    const queue = asks.sort((a, b) => a.id - b.id).filter((a) => !spoken.has(a.key));
    const target = queue[0]; // the oldest asks first
    if (target === undefined) {
      card.style.display = 'none';
      cardAsk = '';
      return;
    }
    // the anchor polygon: the enclosure ring or the span itself
    const anchorPts =
      target.stage === 'cover'
        ? world.roofs.find((r) => r.id === target.id)?.points
        : world.walls.find((w) => w.id === target.id)?.points;
    if (!anchorPts) return; // unreachable: an ask ⇒ its record stands
    if (cardAsk !== target.key) {
      cardRow.textContent = '';
      const say = (label: string, word: () => Command): void => {
        const b = document.createElement('button');
        b.textContent = label;
        b.onclick = () => {
          enqueue(word());
          spoken.set(target.key, world.tick);
        };
        cardRow.appendChild(b);
      };
      if (target.stage === 'cover') {
        const roof = world.roofs.find((r) => r.id === target.id)!;
        cardBaseTitle = `the span is drawn — ${roof.area.toFixed(0)} m² · what covers it?`;
        for (const c of ROOF_CHOICES) {
          say(c.label, () => ({
            kind: 'designate_roof',
            tick: world.tick,
            roofId: target.id,
            material: c.material,
          }));
        }
      } else {
        const wall = world.walls.find((w) => w.id === target.id)!;
        // the one predicate names the class; the card only asks the question
        const rc = classifyRing(wall.points, wall.height);
        if (!rc) return; // unreachable: pending ⇒ classifiable
        if (target.stage === 'use') {
          cardBaseTitle = `the plot is enclosed — ${rc.area.toFixed(0)} m² · what is it for?`;
          for (const c of FIELD_CHOICES) {
            say(c.label, () => ({
              kind: 'designate',
              tick: world.tick,
              wallId: target.id,
              use: c.use,
            }));
          }
        } else if (target.stage === 'roof') {
          cardBaseTitle = `the building is plotted — ${rc.area.toFixed(0)} m² · what will the roof be?`;
          for (const c of BUILDING_ROOF_CHOICES) {
            say(c.label, () => ({
              kind: 'choose_roof',
              tick: world.tick,
              wallId: target.id,
              roof: c.roof,
            }));
          }
        } else {
          const reading = rc.kind === 'building' ? ` · the masons read ${KIND_LABEL[rc.reading]}` : '';
          cardBaseTitle = `and what is it?${reading} — the crew waits on the word`;
          for (const c of SHELL_CHOICES) {
            say(c.label, () => ({
              kind: 'designate',
              tick: world.tick,
              wallId: target.id,
              use: c.use,
            }));
          }
        }
      }
      cardAsk = target.key;
    }
    setText(cardTitle, cardBaseTitle + (queue.length > 1 ? ` · (1 of ${queue.length})` : ''));
    // anchor over the ask's middle, reprojected every frame; clamped so the
    // question never leaves the screen while it stands unanswered. A span
    // floats at its own deck level, an enclosure just above head height.
    let ax = 0;
    let ay = 0;
    for (const p of anchorPts) {
      ax += p.x;
      ay += p.y;
    }
    ax /= anchorPts.length;
    ay /= anchorPts.length;
    const az =
      target.stage === 'cover'
        ? world.roofs.find((r) => r.id === target.id)!.level + 1
        : groundSim(ax, ay) + 2.5;
    cardAnchor.set(ax, az, ay).project(camera);
    card.style.display = '';
    const sx = (cardAnchor.x * 0.5 + 0.5) * window.innerWidth;
    const sy = (-cardAnchor.y * 0.5 + 0.5) * window.innerHeight;
    const behind = cardAnchor.z > 1; // over the shoulder: park it, don't mirror it
    const cw = card.offsetWidth;
    const ch = card.offsetHeight;
    card.style.left = `${behind ? 8 : Math.min(Math.max(sx - cw / 2, 8), window.innerWidth - cw - 8)}px`;
    card.style.top = `${behind ? window.innerHeight - ch - 8 : Math.min(Math.max(sy - ch - 12, 8), window.innerHeight - ch - 8)}px`;
  }

  const people = new PeopleLayer(world, site, scene, groundShow);
  // the granary comes alive: sacks + a prowling cat per designated store (3b)
  const granary = new GranaryLayer(world, site, scene, groundShow);
  const paceSum = world.people
    .filter((p) => p.trade === 'mason')
    .reduce((n, p) => n + p.pace, 0);
  const earthPace = world.people
    .filter((p) => p.trade === 'laborer')
    .reduce((n, p) => n + p.pace, 0);

  // --- title screen + tutorial wiring (SIM 15 arc; UI only, the sim is untouched) ---
  let started = false; // a game has begun this session — gates stepping + the Back button
  const TUT_KEY = 'freestone_tutorial';
  const getTutorialEnabled = (): boolean => localStorage.getItem(TUT_KEY) !== 'off'; // default ON
  const setTutorialEnabled = (on: boolean): void =>
    localStorage.setItem(TUT_KEY, on ? 'on' : 'off');

  function beginGame(): void {
    home.close();
    planner.inputSuspended = false;
    started = true;
    if (getTutorialEnabled()) tutorial.start();
  }
  function openHome(): void {
    planner.exit(); // drop any active tool so returning is clean
    planner.inputSuspended = true;
    home.open(started); // offer "Back" only if a game is in progress
  }
  function resumeGame(): void {
    home.close();
    planner.inputSuspended = false;
  }
  function newGame(): void {
    // A reload is the only ghost-free reset (the render layers bind to `world` at
    // construction). A reset world autostarts via a one-shot token; a still-fresh
    // world (nothing drawn yet) just begins in place — no reload needed.
    if (world.tick > 0 || commandLog.length > 0) {
      if (!window.confirm('Start over? Unsaved progress will be lost.')) return;
      sessionStorage.setItem('freestone_autostart', '1');
      location.reload();
      return;
    }
    beginGame();
  }
  const home = createHomeScreen({
    onNewGame: newGame,
    onBack: resumeGame,
    getTutorialEnabled,
    setTutorialEnabled,
  });
  (document.getElementById('gear') as HTMLElement).onclick = openHome;

  wallBtn.onclick = () => planner.toggle('wall');
  bldBtn.onclick = () => planner.toggle('building');
  fillBtn.onclick = () => planner.toggle('fill');
  gateBtn.onclick = () => planner.toggle('gate');
  roofBtn.onclick = () => planner.toggle('roof');
  quarryBtn.onclick = () => planner.toggle('cut');
  fellBtn.onclick = () => planner.toggle('fell');
  shapeBtn.onclick = () => {
    shapeBtn.textContent = planner.cycleFillShape() === 'flat' ? '⬓ flat fill' : '◿ ramp fill';
  };
  matBtn.onclick = () => {
    const m = planner.cycleMaterial();
    matBtn.textContent = m === 'wood' ? '🪵 wood' : '🪨 sandstone';
  };
  // the DRESS DIAL button (SIM 18): auto → rubble → scappled → ashlar → auto. On
  // 'auto' the structure decides; the rest pin an override for the walls drawn next.
  const dressLabel = (d: 'auto' | DressLevel): string =>
    d === 'auto' ? '⚒ dress: auto' : `⚒ ${d}`;
  dressBtn.onclick = () => {
    dressBtn.textContent = dressLabel(planner.cycleDress());
  };
  hMinus.onclick = () => planner.setHeight(planner.height - 0.5);
  hPlus.onclick = () => planner.setHeight(planner.height + 0.5);

  /** assign only on change — the HUD repaints every frame otherwise */
  function setText(el: HTMLElement, text: string): void {
    if (el.textContent !== text) el.textContent = text;
  }

  // --- underground mode (SimCity-plumbing): ghost the hill, page the working
  //     plane through the strata. Presentation + input; the sim never sees it. ---
  const depthRuler = document.createElement('div');
  depthRuler.className = 'hint';
  depthRuler.style.display = 'none';
  hud.append(depthRuler);
  const terrainMat = (
    Array.isArray(terrain.mesh.material) ? terrain.mesh.material[0] : terrain.mesh.material
  ) as THREE.Material;
  const terrainGhost = {
    transparent: terrainMat.transparent,
    opacity: terrainMat.opacity,
    depthWrite: terrainMat.depthWrite,
  };
  function updateDepthRuler(): void {
    if (!underworld.active()) {
      depthRuler.style.display = 'none';
      return;
    }
    const r = underworld.readout();
    // tutorial step 2: the working plane is centred on dry building stone (not blue)
    if ((r.material === 'sandstone' || r.material === 'limestone') && !r.drowned)
      tutorial.saw('seam');
    const where = r.label ? `· ${r.label} seam` : r.material === 'open air' ? '· open air' : `· ${r.material}`;
    const water = r.material === 'open air' ? '' : r.drowned ? ' · DROWNED (needs drainage)' : ' · dry, workable';
    depthRuler.style.display = '';
    setText(
      depthRuler,
      `underground — ▼ ${r.fathoms.toFixed(1)} fathoms below the crown ${where}${water} · Page↑/↓ or wheel changes depth · U surfaces`,
    );
  }
  function setUnderground(on: boolean): void {
    if (on === underworld.active()) return;
    if (on) planner.exit(); // a surface pencil and the underground view don't mix yet
    underworld.setActive(on);
    controls.enableZoom = !on; // the wheel drives DEPTH underground, zoom on the surface
    if (on) {
      terrainMat.transparent = true;
      terrainMat.opacity = 0.16;
      terrainMat.depthWrite = false;
    } else {
      terrainMat.transparent = terrainGhost.transparent;
      terrainMat.opacity = terrainGhost.opacity;
      terrainMat.depthWrite = terrainGhost.depthWrite;
    }
    terrainMat.needsUpdate = true;
    trees.setVisible(!on); // the woods are surface clutter over a ghosted hill
    undergroundBtn.classList.toggle('active', on);
    if (on) tutorial.saw('underground'); // tutorial step 1
    updateDepthRuler();
  }
  undergroundBtn.onclick = () => setUnderground(!underworld.active());
  window.addEventListener('keydown', (ev) => {
    if (home.isOpen()) return; // the menu swallows game keys
    if ((ev.key === 'u' || ev.key === 'U') && !ev.ctrlKey && !ev.metaKey && !ev.altKey && !ev.repeat) {
      setUnderground(!underworld.active());
      return;
    }
    if (!underworld.active()) return;
    if (ev.key === 'PageDown') {
      ev.preventDefault();
      underworld.stepDepth(-1);
      updateDepthRuler();
    } else if (ev.key === 'PageUp') {
      ev.preventDefault();
      underworld.stepDepth(1);
      updateDepthRuler();
    }
  });
  renderer.domElement.addEventListener(
    'wheel',
    (ev) => {
      if (home.isOpen()) return;
      if (!underworld.active()) return; // surface: OrbitControls owns the wheel (zoom)
      ev.preventDefault();
      underworld.stepDepth(ev.deltaY > 0 ? -1 : 1); // scroll down digs deeper
      updateDepthRuler();
    },
    { passive: false },
  );

  // --- sim/render loop; speed is transport only ---
  const dummy = new THREE.Object3D();
  const tint = new THREE.Color();
  let lastStoneCount = 0;
  let acc = 0;
  let lastTime = performance.now();

  function syncStones(): void {
    if (world.stones.length > stoneCapacity) {
      // regrow and re-upload from stone 0 — the sim is the source of truth,
      // so a full rebuild is cheap, deterministic, and render-side only
      stoneCapacity = Math.max(stoneCapacity * 2, world.stones.length);
      scene.remove(stones);
      stones.dispose();
      stones = makeStoneMesh(stoneCapacity);
      scene.add(stones);
      lastStoneCount = 0;
    }
    if (world.stones.length < lastStoneCount) {
      // stones were REMOVED (a gate knocked out of a built wall): the array
      // shifted, so every surviving matrix past the cut is stale — shrinking
      // `count` alone kept drawing the old span and vanished the tail instead
      // (the boss's two-gates screenshot). Re-upload everything from 0.
      lastStoneCount = 0;
    }
    const matById = new Map(world.walls.map((w) => [w.id, w.material]));
    const dressById = new Map(world.walls.map((w) => [w.id, w.dressLevel]));
    for (let i = lastStoneCount; i < world.stones.length; i++) {
      const s = world.stones[i]!;
      const t = ((s.id * 2654435761) >>> 0) / 4294967296;
      const v = ((s.id * 40503) % 97) / 97 - 0.5;
      // the DRESS LEVEL reads in the stone itself (SIM 18, render-only): dressed
      // ASHLAR sits as bigger, uniform, tight-fitted blocks; light RUBBLE as
      // smaller, rougher, more varied fieldstone; SCAPPLED between. Plan-view scale
      // only — course height (y) is untouched so the layers stay even — and keyed
      // on the stone id, never the sim rng (render reads state, never writes it).
      const dress = dressById.get(s.wallId);
      const planScale =
        dress === 'ashlar' ? 1.05 : dress === 'rubble' ? 0.94 + v * 0.08 : 1;
      dummy.position.set(s.pos[0], s.pos[2], s.pos[1]);
      dummy.rotation.set(0, -s.yaw, 0);
      dummy.scale.set(planScale, 1, planScale);
      dummy.updateMatrix();
      stones.setMatrixAt(i, dummy.matrix);
      // Per-stone tonal variation so the wall reads as coursework, not extrusion.
      // Render-side only, keyed on the stone's id — the sim rng is never touched here.
      // Rubble is mottled mixed stone, ashlar a matched course: widen/narrow the spread.
      const spread = dress === 'ashlar' ? 0.55 : dress === 'rubble' ? 1.5 : 1;
      if (matById.get(s.wallId) === 'wood') {
        tint.setHSL(0.075 + t * 0.015, 0.42, 0.38 + v * 0.14); // weathered timber
      } else {
        // honey-toned Durham sandstone in warm daylight (SCOPE §8d)
        tint.setHSL(0.085 + t * 0.02, 0.34, 0.68 + v * 0.1 * spread);
      }
      stones.setColorAt(i, tint);
    }
    if (world.stones.length !== lastStoneCount) {
      stones.count = world.stones.length;
      stones.instanceMatrix.needsUpdate = true;
      if (stones.instanceColor) stones.instanceColor.needsUpdate = true;
      lastStoneCount = world.stones.length;
    }
  }

  let viewW = 0;
  let viewH = 0;
  let viewDpr = 0;
  function sizeToWindow(): void {
    const dpr = Math.min(window.devicePixelRatio, 2);
    if (window.innerWidth === viewW && window.innerHeight === viewH && dpr === viewDpr) return;
    viewW = window.innerWidth;
    viewH = window.innerHeight;
    viewDpr = dpr;
    camera.aspect = viewW / viewH;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(dpr);
    renderer.setSize(viewW, viewH);
  }

  function frame(now: number): void {
    sizeToWindow(); // emulated viewports don't always fire resize events
    const dt = Math.min((now - lastTime) / 1000, 0.25);
    lastTime = now;
    // step only while actually playing: not before New Game, not behind the home menu
    if (started && !home.isOpen()) {
      if (sitUntil !== null) {
        // SIT THE SEASON: pump worldStep toward the target within a wall-clock
        // budget so the frame stays responsive and the render shows the year
        // blurring past, until the season turns (or a future honest interrupt —
        // a death, a wood coming of age — is OR'd into the stop test here).
        const budgetEnd = performance.now() + FF_BUDGET_MS;
        while (world.tick < sitUntil && performance.now() < budgetEnd) {
          worldStep(world, site, byTick.get(world.tick) ?? []);
        }
        if (world.tick >= sitUntil) sitUntil = null; // arrived; hand control back
        acc = 0;
      } else {
        acc += dt * speed;
        while (acc >= 1) {
          worldStep(world, site, byTick.get(world.tick) ?? []);
          acc -= 1;
        }
      }
    } else {
      acc = 0; // don't bank elapsed time into a lurch on resume
    }
    syncStones();
    fills.update();
    cuts.update();
    roofs.update();
    farms.update();
    buildings.update();
    gates.update();
    trees.update(world);
    people.update(dt, speed > 0);
    granary.update(dt, speed > 0);
    updateCard();

    const year = yearOf(world.tick);
    const day = dayOfYear(world.tick) + 1;
    const season = seasonOf(world.tick);
    // the fast-forward forecast: name the season being sat toward and the days
    // left, so skipped time reads as anticipation rather than dead air
    if (sitUntil !== null) {
      const left = Math.max(0, sitUntil - world.tick);
      const into = seasonOf(sitUntil);
      ffBtn.textContent = `⏭ → ${into.charAt(0).toUpperCase()}${into.slice(1)} · ${left}d ✕`;
    } else {
      ffBtn.textContent = '⏭ sit the season';
    }
    const laid = world.walls.reduce((n, w) => n + w.stonesLaid, 0);
    const total = world.walls.reduce((n, w) => n + w.stonesTotal, 0);
    const nFarms = world.farms.filter((f) => f.use === 'farm').length;
    const nPaddocks = world.farms.filter((f) => f.use === 'livestock').length;
    const nPasture = world.farms.filter((f) => f.use === 'pasture').length;
    const nOrchard = world.farms.filter((f) => f.use === 'orchard').length;
    const nFallow = world.farms.filter((f) => f.use === 'fallow').length;
    const nAsks =
      world.pending.length + world.roofs.filter((r) => r.material === null).length;
    const nQuarries = world.cuts.length;
    // THE BOTTLENECK LINE (carriage layer): the WIN→HAUL→LAY read, naming the stage
    // that BINDS. WIN — the pile is dry, the quarry lags. HAUL — the pile has stone
    // but a cart is behind and a wall's FACE is dry (SIM 17). LAY — supply keeps up
    // and the masons are the throat. The per-wall haul verdict is read on the plan
    // row as a wall is drawn; here the one line names which link starves.
    const stoneWalls = world.walls.filter(
      (w) => w.material !== 'wood' && w.stonesLaid < w.stonesTotal && !awaitsDrawings(w),
    );
    const pileDry = world.stockpile < STONE_VOLUME;
    // a cart behind: the pile has stone, yet a hauled wall's face can't afford a
    // block — that wall waits on the road, not the pit
    const cartBehind = pileDry
      ? undefined
      : stoneWalls.find((w) => w.haulRate !== null && w.faceBuffer < STONE_VOLUME);
    const hasStoneEconomy =
      nQuarries > 0 || world.adits.length > 0 || world.stockpile >= 1 || stoneWalls.length > 0;
    const bind = pileDry
      ? '⚒ waits on the quarry'
      : cartBehind
        ? `⚒ waits on the cart (${cartBehind.method})`
        : 'the masons lay';
    // THE LIFT (SIM 26): a great wheel is turning at a wall climbing high
    const wheeling = stoneWalls.some((w) => w.wheel && w.stonesLaid < w.stonesTotal);
    // THE FIRST TECHNIQUE (SIM 27): a smith at the forge is sharpening the crew's irons,
    // speeding the dress — shown only while stone is actually being laid, so the player
    // sees WHY the wall climbs faster once the specialization pyramid draws a smith
    const forging =
      world.people.some((p) => p.trade === 'smith') &&
      stoneWalls.some((w) => w.stonesLaid < w.stonesTotal);
    const supply = !hasStoneEconomy
      ? ''
      : stoneWalls.length === 0
        ? ` — won ${Math.round(world.stockpile)} m³`
        : ` — won ${Math.round(world.stockpile)} m³ · masons ${paceSum}/day → ${bind}${wheeling ? ' · ⚙ the great wheel turns' : ''}${forging ? ' · 🔨 the forge sharpens the irons' : ''}`;
    // THE WOODS read (SIM 19): the timber stock, and the coppice's return clock
    const felling = world.stands.filter((s) => s.felling).length;
    const regrowing = world.stands.filter((s) => !s.felling && s.feltTick >= 0);
    const soonestReturn = regrowing.reduce(
      (min, s) => Math.min(min, s.feltTick + REGROWTH_TICKS - world.tick),
      Infinity,
    );
    const woods =
      (world.timber >= 1 || world.stands.length > 0 ? ` — timber ${Math.round(world.timber)} m³` : '') +
      (felling ? ` — felling ${felling}` : '') +
      (regrowing.length && Number.isFinite(soonestReturn)
        ? ` — a cant returns in ~${Math.max(1, Math.round(soonestReturn / TICKS_PER_YEAR))}y`
        : '');
    // THE HARVEST read (SIM 22): the FIELDS' yield in mouths (the growth signal —
    // migrants + births track it) and the GRAIN STORE that buffers the lean years,
    // out of the granaries' cap. Mirrors the sim's own formula (mean weather).
    const arableArea = world.farms.reduce((a, f) => (f.use === 'farm' ? a + f.area : a), 0);
    const nGranaries = world.buildings.reduce((n, b) => (b.kind === 'granary' ? n + 1 : n), 0);
    const fieldYield = FOUNDING_CAPACITY + arableArea / AREA_PER_PERSON;
    const surplus = fieldYield / Math.max(1, world.people.length);
    const nCarts = world.buildings.reduce((n, b) => (b.kind === 'carpentry' ? n + 1 : n), 0);
    const grainCap = FOUNDING_STORAGE + nGranaries * GRANARY_STORAGE;
    const foodState =
      surplus >= GROWTH_THRESHOLD
        ? 'growing'
        : surplus >= 1
          ? 'holding'
          : world.grain > 0.5
            ? 'on stores'
            : 'hungry';
    const harvest =
      ` — harvest ${Math.round(fieldYield)} mouths (${surplus.toFixed(2)}× ${foodState})` +
      ` — grain ${Math.round(world.grain)}/${grainCap}` +
      (nCarts ? ` — ${nCarts} cart${nCarts > 1 ? 's' : ''}` : '');
    // housing by tier (SIM 25) — legible in the count as well as the roofline
    let nHovel = 0;
    let nCottage = 0;
    let nHall = 0;
    for (const b of world.buildings) {
      if (b.kind !== 'house') continue;
      const tier = houseTier(b.area, b.roof);
      if (tier === 'hall') nHall++;
      else if (tier === 'cottage') nCottage++;
      else nHovel++;
    }
    const housing = [
      nHall ? `${nHall} hall${nHall > 1 ? 's' : ''}` : '',
      nCottage ? `${nCottage} cottage${nCottage > 1 ? 's' : ''}` : '',
      nHovel ? `${nHovel} hovel${nHovel > 1 ? 's' : ''}` : '',
    ]
      .filter(Boolean)
      .join(', ');
    const holdings =
      (nFarms ? ` — farms ${nFarms}` : '') +
      (nPaddocks ? ` — paddocks ${nPaddocks}` : '') +
      (nPasture ? ` — pasture ${nPasture}` : '') +
      (nOrchard ? ` — orchards ${nOrchard}` : '') +
      (nFallow ? ` — fallow ${nFallow}` : '') +
      (housing ? ` — ${housing}` : '') +
      (world.buildings.length ? ` — buildings ${world.buildings.length}` : '') +
      (nQuarries ? ` — quarries ${nQuarries}` : '') +
      supply +
      woods +
      harvest +
      (nAsks ? ` — ${nAsks} awaiting the word` : '');
    const nSmiths = world.people.reduce((n, p) => (p.trade === 'smith' ? n + 1 : n), 0);
    const souls = `souls ${world.people.length}${nSmiths ? ` (${nSmiths} smith${nSmiths > 1 ? 's' : ''})` : ''}`;
    setText(
      status,
      `Year ${year} · ${season.charAt(0).toUpperCase()}${season.slice(1)} · day ${day} — ` +
        `stones ${laid}${total ? `/${total}` : ''} — ` +
        `${souls}${holdings} — site ${site.id}`,
    );

    setText(hVal, `h ${planner.height.toFixed(1)} m`);
    if (planner.active) {
      if (planner.mode === 'fill') {
        const ring = planner.previewPolyline();
        if (ring.length >= 4) {
          // mirror the sim's own volume math (area × (gMax − gMean + height),
          // sampled at vertices + centroid) or slopes get quoted flat-rate
          const open = ring.slice(0, -1);
          const area = polygonArea(open);
          let cx = 0;
          let cy = 0;
          for (const p of open) {
            cx += p.x;
            cy += p.y;
          }
          cx /= open.length;
          cy /= open.length;
          let gMax = groundSim(cx, cy);
          let gSum = gMax;
          for (const p of open) {
            const g = groundSim(p.x, p.y);
            if (g > gMax) gMax = g;
            gSum += g;
          }
          const gMean = gSum / (open.length + 1);
          // mirror the sim exactly: a ramp bills the wedge — mean surface is
          // halfway between the toe (first-edge ground) and the crest level
          const level = gMax + planner.height;
          let meanSurf = level;
          if (planner.fillShape === 'ramp') {
            const a = open[0]!;
            const b = open[1]!;
            const gLow = groundSim((a.x + b.x) / 2, (a.y + b.y) / 2);
            meanSurf = (gLow + level) / 2;
          }
          const vol = Math.max(1, area * (meanSurf - gMean));
          setText(
            plan,
            `plan: ${planner.fillShape === 'ramp' ? 'ramp' : 'fill'} ${area.toFixed(0)} m² · ≈${vol.toFixed(0)} m³ of earth · ` +
              `~${Math.ceil(vol / Math.max(1, earthPace))} days of barrowing`,
          );
        } else {
          setText(plan, 'plan: click the ground to ring the fill');
        }
        setText(
          hint,
          planner.fillShape === 'ramp'
            ? 'click: ring the ground (the FIRST side laid is the low end) · right-click/Backspace: undo · double-click/Enter: tip the dirt · Esc: put the pencil down'
            : 'click: ring the ground · right-click/Backspace: undo · double-click/Enter: tip the dirt · hold ⇧: snap to walls · Esc: put the pencil down',
        );
      } else if (planner.mode === 'gate') {
        setText(plan, `plan: gates — ${world.farms.reduce((n, f) => n + f.gates.length, 0)} hung`);
        setText(
          hint,
          'click a field wall: hang a gate · click a building: cut a door · click one: take it down · Esc: put the tool down',
        );
      } else if (planner.mode === 'cut') {
        const ring = planner.previewPolyline();
        if (ring.length >= 4) {
          const open = ring.slice(0, -1);
          const area = polygonArea(open);
          const { cx, cy } = centroid(open);
          const q = quarryPlanAt(cx, cy, Math.max(1, area));
          if (q.ok) {
            setText(
              plan,
              `plan: outcrop quarry ${area.toFixed(0)} m² · win the dry post to ${q.reach.toFixed(1)} m · ` +
                `~${Math.ceil(q.workDays)} person-days · wins ≈${Math.round(q.stone)} m³ of stone`,
            );
          } else {
            setText(plan, `plan: ✗ ${q.reason}`);
          }
        } else {
          setText(plan, 'plan: ring the ground for an outcrop quarry — win the dry building stone (the water sets the floor)');
        }
        setText(
          hint,
          'click: ring the ground · right-click/Backspace: undo · double-click/Enter: open the quarry · Esc: put the tool down',
        );
      } else if (planner.mode === 'fell') {
        const ring = planner.previewPolyline();
        if (ring.length >= 4) {
          const open = ring.slice(0, -1);
          const area = polygonArea(open);
          const { cx, cy } = centroid(open);
          const mature = world.stands.find(
            (s) => !s.felling && s.feltTick < 0 && pointInPolygon(cx, cy, s.points),
          );
          const timber = trees.timberInPolygon(open);
          if (mature) {
            setText(
              plan,
              `plan: re-cut this coppice — the stool has regrown, ≈${Math.round(mature.timberTotal)} m³ again`,
            );
          } else if (timber > 0) {
            const days = Math.max(1, Math.ceil(timber / TIMBER_PER_TREE / FELL_TREES_PER_DAY));
            setText(
              plan,
              `plan: fell the cant ${area.toFixed(0)} m² · ~${days} person-days · wins ≈${Math.round(timber)} m³ of timber · regrows in ~7 years`,
            );
          } else {
            setText(plan, 'plan: ✗ no standing timber here — nothing to fell');
          }
        } else {
          setText(plan, 'plan: ring a wooded cant to fell it — win its timber; the stool regrows over the years');
        }
        setText(
          hint,
          'click: ring the woods · right-click/Backspace: undo · double-click/Enter: fell the cant · Esc: put the tool down',
        );
      } else if (planner.mode === 'roof') {
        const poly = planner.previewPolyline();
        if (poly.length >= 4) {
          const open = poly.slice(0, -1);
          const area = polygonArea(open);
          // mirror the sim's support rule so the promise can't outrun the deck
          let held = true;
          for (const v of open) {
            let ok = false;
            for (const w of world.walls) {
              if (w.stonesLaid < w.stonesTotal) continue;
              const q = nearestOnPolyline(w.points, v);
              if (Math.hypot(v.x - q.x, v.y - q.y) <= ROOF_SNAP) {
                ok = true;
                break;
              }
            }
            if (!ok) {
              held = false;
              break;
            }
          }
          setText(
            plan,
            `plan: roof — ${area.toFixed(0)} m² · ~${Math.ceil(area / Math.max(1, earthPace))} days of decking · ` +
              `the covering is asked when the span is drawn` +
              (held ? '' : ' · corners must rest on finished walls'),
          );
        } else {
          setText(plan, 'plan: click wall corners to span the void');
        }
        setText(
          hint,
          'click: corners (snap to walls) · right-click/Backspace: undo · double-click/Enter: raise the deck · Esc: put the tool down',
        );
      } else {
        // the ring/auto-gate read comes FIRST so the stone count the plan row
        // promises is decomposed with the same gates the sim will carve
        const ring = planner.previewRing();
        const rc = ring ? classifyRing(ring, planner.height) : null;
        const autoGates = ring ? planGates(ring, planner.height) : [];
        // the count's datum follows the class: buildings level, walls step
        const s = planner.stats(
          autoGates,
          planner.mode === 'building' || rc?.kind === 'building' ? 'level' : 'stepped',
        );
        const fp = planner.footprint();
        const what = fp ? describeFootprint(fp.front, fp.depth) : null;
        let name = what && fp ? `${what.label} — ${fp.front.toFixed(0)}×${fp.depth.toFixed(0)} m · ` : '';
        let warn = what?.note ? ` · ${what.note}` : '';
        // the pencil must not promise what the sim won't recognize: below
        // headroom the shell completes as a wall, not a building
        if (planner.mode === 'building' && planner.height < BUILDING_MIN_H) {
          warn += ` · too low to shelter — raise it to ${BUILDING_MIN_H} m`;
        }
        // the pencil's promise IS the sim's predicate — classifyRing,
        // imported, never re-derived (the second fleet's parity law). Since
        // SIM 10 the promise is the ASKING: a closed plot or a raised shell
        // awaits its lord's word, so the pencil says so
        if (rc?.kind === 'farm') {
          name = `a gated plot — ${rc.area.toFixed(0)} m² · asks its use when it closes · `;
        } else if (rc?.kind === 'building') {
          name = `a building (reads ${KIND_LABEL[rc.reading]}) — ${rc.area.toFixed(0)} m² · asks roof + trade when plotted · `;
        } else if (ring && !ringSelfIntersects(ring) && !ringSelfOverlaps(ring)) {
          // an honest near-ring the sim will NOT claim: say why, pencil in hand
          const f = ring[0]!;
          const l = ring[ring.length - 1]!;
          const gap = Math.hypot(l.x - f.x, l.y - f.y);
          const area = polygonArea(ring);
          if (gap <= 2 && area >= FARM_MIN_AREA) {
            warn = ` · rings ${area.toFixed(0)} m² — ≤ ${FARM_WALL_MAX_H} m farms it; ≥ ${BUILDING_MIN_H} m with a doorway gap shelters it`;
          }
        }
        const stuff = planner.material === 'wood' ? 'timbers' : 'stones';
        // THE DRESS DIAL (SIM 18): the block class this wall's stone is worked to —
        // the structure's smart default (low→rubble, tall→ashlar) unless the dial
        // pins an override. Rubble is light and lays quick; ashlar is dressed, lays
        // slow and hauls heavy; scappled the neutral middle. The pencil shows what
        // the wall will be built of and its cost, so the trade is legible before it
        // is committed. A far ashlar wall is dear both to move and to raise.
        let dress = '';
        if (ring && planner.material !== 'wood') {
          const lvl = planner.dress === 'auto' ? autoDress(planner.height) : planner.dress;
          const spec = DRESS_SPEC[lvl];
          const eff =
            spec.layDebt < 1
              ? 'light, lays quick'
              : spec.layDebt > 1
                ? `dressed, lays ${spec.layDebt}× slower${spec.haulFactor > 1 ? ' + hauls heavy' : ''}`
                : 'roughly squared';
          dress = ` · ${lvl}${planner.dress === 'auto' ? '' : ' (set)'} — ${eff}`;
        }
        // the HAUL verdict for where this wall sits (SIM 17): stone won on the
        // spot, or carted — dearer up a hill, dearest across the gorge to a bridge
        let haul = '';
        if (ring && planner.material !== 'wood' && rc?.kind !== 'farm') {
          const hv = haulVerdict(ring);
          haul = hv
            ? ` · ${hv.method}, ~${hv.haulRate.toFixed(1)} m³/day to the face`
            : ' · stone won on the spot';
        }
        setText(
          plan,
          s
            ? `plan: ${name}${s.length.toFixed(0)} m · ${s.courses} courses · ` +
                `${s.stonesTotal.toLocaleString()} ${stuff} · ~${Math.ceil(s.stonesTotal / Math.max(1, paceSum))} days${warn}${dress}${haul}`
            : 'plan: click the ground to start the line',
        );
        setText(
          hint,
          planner.mode === 'building'
            ? 'click: two front corners · move: pull the depth · click: raise it · hold ⇧: snap to walls · Esc: put the pencil down'
            : 'click: place · right-click/Backspace: undo · double-click/Enter: lay it · hold ⇧: snap to walls · Esc: put the pencil down',
        );
      }
    } else {
      setText(plan, '');
      // a committed command applies at the start of its tick — while paused it is
      // real but invisible, and the HUD must not claim the hill is bare
      let pending: Command | undefined;
      for (let i = commandLog.length - 1; i >= 0; i--) {
        if (commandLog[i]!.tick >= world.tick) {
          pending = commandLog[i];
          break;
        }
      }
      const noun =
        pending?.kind === 'plan_fill'
          ? 'fill'
          : pending?.kind === 'plan_roof'
            ? 'roof'
            : pending?.kind === 'plan_cut'
              ? 'quarry'
              : pending?.kind === 'designate' ||
                  pending?.kind === 'designate_roof' ||
                  pending?.kind === 'choose_roof'
                ? 'word'
                : 'wall';
      setText(
        hint,
        pending
          ? speed === 0
            ? noun === 'word'
              ? 'the word is given — press ×1 and it is so'
              : `${noun} committed — press ×1 to break ground`
            : noun === 'fill'
              ? 'fill committed — the barrows roll'
              : noun === 'roof'
                ? 'roof committed — the deck goes up'
                : noun === 'quarry'
                  ? 'quarry committed — the crew digs into the rock'
                  : noun === 'word'
                    ? 'the word is given'
                    : 'wall committed — the crew takes it up'
          : world.walls.length === 0 && world.fills.length === 0 && world.cuts.length === 0
            ? 'the hill is bare — ⚒ wall (B) · ⌂ building (H) · ⛰ fill (F) · ⛏ quarry (Q) · 🪓 fell (T) · right-drag to look, wheel to zoom'
            : '',
      );
    }

    // keep the eye inside the site box; shift the camera by the same delta so the
    // clamp never pumps the orbit radius while damping replays the pan
    const tcx = Math.min(Math.max(controls.target.x, 0), site.extentX);
    const tcz = Math.min(Math.max(controls.target.z, 0), site.extentY);
    camera.position.x += tcx - controls.target.x;
    camera.position.z += tcz - controls.target.z;
    controls.target.x = tcx;
    controls.target.z = tcz;
    controls.update();
    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }

  window.addEventListener('resize', sizeToWindow);

  // Dev handle for kernel-truth checks from the preview console (read-only by law).
  (window as unknown as Record<string, unknown>).__cc = {
    world,
    site,
    commandLog,
    camera,
    controls,
    planner,
    people,
    granary,
    fills,
    roofs,
    farms,
    buildings,
    trees,
    underworld,
    home,
    tutorial,
    water,
    quarryPlanAt,
    renderer,
    scene, // renderer+scene exposed so a hidden tab can render one frame on demand
    enqueue, // pushing to __cc.commandLog directly does nothing — this is the way in
    /** dev-only manual stepper (hidden tabs pause rAF); still goes through the law */
    step: (n: number) => {
      for (let i = 0; i < n; i++) worldStep(world, site, byTick.get(world.tick) ?? []);
      // sync every world-driven display layer, or hidden-tab renders show stale scenes
      syncStones();
      fills.update();
      cuts.update();
      roofs.update();
      farms.update();
      buildings.update();
      gates.update();
      trees.update(world);
      granary.update(0, false); // place a hidden tab's sacks/cat (rAF is paused)
      updateCard();
      return world.tick;
    },
  };

  // Title screen: a fresh load opens the home; a New-Game reset returns with a
  // one-shot token and drops straight into play (see newGame()).
  const autostart = sessionStorage.getItem('freestone_autostart');
  sessionStorage.removeItem('freestone_autostart');
  if (autostart) beginGame();
  else home.open(false);

  requestAnimationFrame(frame);
}

void boot();
