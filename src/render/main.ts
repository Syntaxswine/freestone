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
  aditEconomics,
  bedModelFromJson,
  cutEconomics,
  emptyBedModel,
  type BedModel,
  type BedsJson,
} from '../sim/beds';
import { waterModelFromSite } from '../sim/water';
import { flatSite, siteFromHeightmap, type HeightmapJson, type SiteData } from '../sim/site';
import {
  classifyRing,
  effectiveGroundAt,
  nearestOnPolyline,
  planGates,
  pointInPolygon,
  polygonArea,
  ringSelfIntersects,
  ringSelfOverlaps,
  routeCost,
  worldStep,
} from '../sim/step';
import { createWorld } from '../sim/world';
import { makeSave, replay, stableStringify, type SaveFile } from '../sim/save';
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
  ORCHARD_AREA_PER_PERSON,
  FELL_TREES_PER_DAY,
  FOUNDING_CAPACITY,
  FOUNDING_STORAGE,
  GRANARY_STORAGE,
  GROWTH_THRESHOLD,
  houseTier,
  REGROWTH_TICKS,
  TICKS_PER_YEAR,
  TIMBER_PER_TREE,
  WAY_MIN_LENGTH,
  WAY_TIMBER_PER_M,
  WAY_WORK_PER_M,
  WAY_MULT_FIRM,
  WAY_MULT_SOFT,
  WAY_SOFT_DEPTH,
  CARRIER_THROUGHPUT,
  dayOfYear,
  seasonOf,
  ticksUntilNextSeason,
  yearOf,
  ADULT_AGE,
  BUILDING_KINDS,
  DRESS_DRAW,
  FARM_AREA_PER_HAND,
  FIELD_USES,
  TIMBER_PER_POST,
  earthRateOf,
  layRateOf,
  type BuildingKind,
  type BuildingRoof,
  type Command,
  type DressLevel,
  type FieldUse,
  type HaulMethod,
  type Person,
  type RoofMaterial,
  type Vec2,
  type WorldState,
} from '../sim/types';
import { BuildingLayer } from './buildings';
import { CutLayer } from './cuts';
import { AditLayer } from './adits';
import { BellPitLayer } from './bellpits';
import { ShaftLayer } from './shafts';
import { TracingFloorLayer } from './tracingfloor';
import { UnderworldLayer } from './underworld';
import { FarmLayer } from './farms';
import { FillLayer } from './fills';
import { GateLayer } from './gates';
import { RoofLayer } from './roofs';
import { PeopleLayer } from './people';
import { PileLayer } from './piles';
import { WayLayer } from './ways';
import { AnimalLayer } from './animals';
import { GranaryLayer } from './granary';
import { OrchardLayer } from './orchard';
import { WorkshopLayer } from './workshops';
import { WheelLayer } from './wheel';
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
  // --- the Lodge Book (SIM 15 save/load) ---------------------------------------
  // A one-shot 'load' token, set before the reload in loadGame() below, tells THIS
  // boot to rebuild the world from the saved command log instead of a fresh seed.
  // replay() re-steps the log through the same worldStep the live loop uses, so a
  // loaded castle is byte-identical to the one saved — and the render layers (which
  // bind to `world` at construction, just below) simply bind to the advanced world.
  const SAVE_KEY = 'freestone_save';
  let loadedThisBoot = false;
  let loadError: string | null = null;
  let restoredCommands: readonly Command[] = [];
  let world: WorldState;
  {
    const loadReq = sessionStorage.getItem('freestone_load');
    sessionStorage.removeItem('freestone_load');
    let loaded: WorldState | null = null;
    if (loadReq) {
      try {
        const raw = localStorage.getItem(SAVE_KEY);
        if (!raw) throw new Error('the Lodge Book is empty');
        const save = JSON.parse(raw) as SaveFile;
        loaded = replay(save, site); // guards SIM-version + site; re-steps the log
        restoredCommands = save.commands;
      } catch (e) {
        loadError = (e as Error).message;
      }
    }
    if (loaded) {
      world = loaded;
      loadedThisBoot = true;
    } else {
      world = createWorld(SEED, site.id);
    }
  }

  // The command log holds the whole chronicle so continued play appends to it and the
  // next Save captures the full history. Fresh: empty (the first wall is the player's
  // own hand). Loaded: the restored log, re-bucketed for the tick index.
  const cx = site.extentX / 2;
  const cy = site.extentY / 2;
  const commandLog: Command[] = restoredCommands.slice();
  const byTick = new Map<number, Command[]>();
  for (const c of commandLog) {
    const bucket = byTick.get(c.tick);
    if (bucket) bucket.push(c);
    else byTick.set(c.tick, [c]);
  }

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
  // (SIM 32's 🛷 sledge TOGGLE retired in SIM 39 — the boss replaced the flag with the drawn
  //  way: "≡ way (Y)" in the row below. The sledge did not go away; it now rides a real road.)
  // THE WORD AT THE PLOT (SIM 37): choose the roof, the trade, and the field's use as
  // you draw — 'none' is legal, never blocks, and can be answered later on the plot
  const plotRoofBtn = document.createElement('button');
  plotRoofBtn.textContent = '⛉ roof: none';
  plotRoofBtn.title = 'the plotted building’s roof — chosen as you draw, or later at the plot (SIM 37)';
  const plotKindBtn = document.createElement('button');
  plotKindBtn.textContent = '⌂ trade: none';
  plotKindBtn.title = 'the plotted building’s trade — chosen as you draw, or later at the plot (SIM 37)';
  const plotUseBtn = document.createElement('button');
  plotUseBtn.textContent = '🌾 use: none';
  plotUseBtn.title = 'the closed field ring’s use — named as you draw, or later at the plot (SIM 37)';
  build2.append(fillBtn, gateBtn, matBtn, dressBtn, plotRoofBtn, plotKindBtn, plotUseBtn);
  build.after(build2);
  const build3 = document.createElement('div');
  const roofBtn = document.createElement('button');
  roofBtn.textContent = '⛉ roof (R)';
  const quarryBtn = document.createElement('button');
  quarryBtn.textContent = '⛏ quarry (Q)';
  const fellBtn = document.createElement('button');
  fellBtn.textContent = '🪓 fell (T)';
  // THE TIMBER WAY (SIM 38): the drawn causeway — replaces the 🛷 sledge TOGGLE (SIM 32) at
  // the boss's word ("the workers would have to have a more complicated pathing"): the road is
  // a thing you LAY on the ground where you choose, not a flag you tick on a wall.
  const wayBtn = document.createElement('button');
  wayBtn.textContent = '≡ way (Y)';
  wayBtn.title = 'lay a timber causeway — the road hands plank it, and the stone travels it faster';
  const aditBtn = document.createElement('button');
  aditBtn.textContent = '⛏ adit (A)';
  const bellBtn = document.createElement('button');
  bellBtn.textContent = '⛏ bell pit (P)';
  const shaftBtn = document.createElement('button');
  shaftBtn.textContent = '⛏ shaft+pump (S)';
  const shapeBtn = document.createElement('button');
  shapeBtn.textContent = '⬓ flat fill';
  // no roof-material picker: the covering is chosen on the card AFTER the
  // span is drawn, like every designation (boss canon 2026-07-10 — default none)
  const undergroundBtn = document.createElement('button');
  undergroundBtn.textContent = '☷ underground (U)';
  build3.append(roofBtn, quarryBtn, fellBtn, wayBtn, aditBtn, bellBtn, shaftBtn, shapeBtn, undergroundBtn);
  build2.after(build3);

  // --- the woods, the earthworks, the pencil and the people ---
  const trees = new TreeLayer(site, terrain.groundAt, scene);
  const fills = new FillLayer(world, scene, terrain.groundAt);
  const cuts = new CutLayer(world, scene, terrain.groundAt, water.tableAt); // water.tableAt: a drowned cut floods
  const adits = new AditLayer(world, scene, terrain.groundAt); // the self-draining drift, an X-ray at grade
  const bellPits = new BellPitLayer(world, scene, terrain.groundAt); // shaft-mouths + spoil rings on flat ground
  const shafts = new ShaftLayer(world, scene, terrain.groundAt); // deep pumped shafts — headframes over drowned post
  // the tracing floor (Beat 2): every plan ever drawn, scored faintly into the turf — a
  // palimpsest of setting-out lines read from the command log. Render-only, no click.
  const tracingFloor = new TracingFloorLayer(commandLog, scene, terrain.groundAt);
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
  const DROWNED_YIELD_FRAC = 0.15; // stone won from a drowned open cut — a token; the post is under water
  function cutCommand(points: Vec2[]): Command {
    const { cx, cy } = centroid(points);
    const area = Math.max(1, polygonArea(points));
    const plan = quarryPlanAt(cx, cy, area);
    if (plan.ok) {
      return {
        kind: 'plan_cut',
        tick: world.tick,
        points,
        depth: plan.depth,
        workTotal: plan.workDays,
        stoneTotal: plan.stone,
      };
    }
    // DIG ANYWAY (boss 2026-07-15): the red only WARNS — the player may cut drowned/too-deep
    // ground and find out why. The open cut goes to its full reach, FLOODS below the table
    // (cuts.ts pools the water), and wins only a token of stone (the post lies under water).
    const { workDays, stone } = cutEconomics(beds, cx, cy, MAX_OPEN_REACH, area);
    return {
      kind: 'plan_cut',
      tick: world.tick,
      points,
      depth: MAX_OPEN_REACH,
      workTotal: Math.max(1, workDays),
      stoneTotal: Math.round(stone * DROWNED_YIELD_FRAC * 1000) / 1000,
    };
  }
  // THE TIMBER WAY (SIM 38): the causeway's economics, read HERE and FROZEN into plan_way —
  // the same boundary discipline as the quarry, the adit and the fell. main.ts alone holds the
  // surface, so it WALKS the drawn run on the real ground (climbing the hills the crow flies
  // over) and freezes the metres; the sim core replays the scalar and never touches a height.
  function wayCommand(points: Vec2[]): Command | null {
    let length = 0;
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1]!;
      const b = points[i]!;
      // sample the leg so the length follows the LAND, not the map: a way over a rise is
      // longer (and dearer) than its plan-view line. Math.sqrt is IEEE-exact where hypot
      // is implementation-approximated — the law for anything entering hashed state.
      const flat = Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2);
      const steps = Math.max(1, Math.ceil(flat / 8));
      let px = a.x;
      let py = a.y;
      let pz = groundSim(a.x, a.y);
      for (let s = 1; s <= steps; s++) {
        const t = s / steps;
        const qx = a.x + (b.x - a.x) * t;
        const qy = a.y + (b.y - a.y) * t;
        const qz = groundSim(qx, qy);
        length += Math.sqrt((qx - px) ** 2 + (qy - py) ** 2 + (qz - pz) ** 2);
        px = qx;
        py = qy;
        pz = qz;
      }
    }
    length = Math.round(length * 1e6) / 1e6; // tidy the frozen scalar, like haulVerdict's round6
    if (!(length >= WAY_MIN_LENGTH)) return null; // a gesture, not a road — the plan row says why
    return {
      kind: 'plan_way',
      tick: world.tick,
      points,
      length,
      timberTotal: Math.round(length * WAY_TIMBER_PER_M * 1e6) / 1e6,
      workTotal: Math.max(1, Math.round(length * WAY_WORK_PER_M * 1e6) / 1e6),
      // what this road is worth is what the GROUND UNDER IT is: read here, frozen forever
      speedMult: waySpeedMult(points),
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

  // --- THE ROAD a wall's stone must travel. main.ts alone holds surface + water + beds, so
  //     it reads the route HERE and freezes it into plan_wall, exactly as quarryPlanAt freezes
  //     plan_cut — the sim replays the facts and never sees the terrain. "Cost the ROUTE, not
  //     straight-line" (PROPOSAL-LOGISTICS §4.1): a bed across the Wear is NOT near — the road
  //     detours to a bridge, so the gorge reads as a MOAT and the historical optimum (quarry
  //     the peninsula's own post) falls out of the geometry with zero scripting.
  //
  //     SIM 39 CHANGED WHAT IS FROZEN. It used to be a RATE (m³/day). A rate cannot answer the
  //     question the boss's ruling asks — if the player lays a WAY across this road next year,
  //     the carriers must get faster, and a frozen rate cannot know. So the boundary now freezes
  //     the road's FACTS (its two ends, the climb, the gorge detour) and the SIM does the labour
  //     arithmetic (routeCost/carryRate). HAUL_BASE_RATE and HAUL_SCALE retired with the rate. ---
  const HAUL_PROBE_AREA = 10; // m² — the affordance probe ("is dry post winnable here?")
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
  type FrozenHaul = { from: Vec2; to: Vec2; climb: number; detour: number; method: HaulMethod };
  const haulMemo = new Map<string, FrozenHaul | null>();
  // the ROAD for a wall, frozen at plan time. null = 'local' (dry post under the wall's own
  // feet — no carriers, the masons draw the pile directly). Otherwise the journey itself:
  // where the stone is won, where it must stand, and what the land charges between.
  function haulVerdict(points: Vec2[]): FrozenHaul | null {
    const { cx, cy } = centroid(points);
    const key = `${Math.round(cx / 4)},${Math.round(cy / 4)}`;
    const cached = haulMemo.get(key);
    if (cached !== undefined) return cached;
    let verdict: FrozenHaul | null;
    if (quarryPlanAt(cx, cy, HAUL_PROBE_AREA).ok) {
      verdict = null; // winnable underfoot — 'local', nothing to carry
    } else {
      const to = { x: round6(cx), y: round6(cy) };
      const src = nearestDryPost(cx, cy);
      if (!src) {
        // no dry post within reach — the dearest road the map allows: a source at the far
        // edge of the scan, so the sim's own arithmetic prices it without a special case
        verdict = {
          from: { x: round6(cx + HAUL_MAX_REACH), y: round6(cy) },
          to,
          climb: 0,
          detour: 1,
          method: 'ox-cart',
        };
      } else {
        const wallG = site.heightAt(cx, cy);
        const srcG = site.heightAt(src.x, src.y);
        const climb = Math.max(0, wallG - srcG); // hauling UP to the wall costs the hands dear
        const crosses = routeCrossesGorge(src.x, src.y, cx, cy, Math.min(wallG, srcG));
        const method: HaulMethod = crosses
          ? 'ox-cart over the bridge'
          : climb > src.dist * 0.15
            ? 'ox-cart uphill'
            : src.dist < 120
              ? 'sledge'
              : 'ox-cart';
        verdict = {
          from: { x: round6(src.x), y: round6(src.y) },
          to,
          climb: round6(climb),
          detour: crosses ? HAUL_BRIDGE_DETOUR : 1,
          method,
        };
      }
    }
    haulMemo.set(key, verdict);
    return verdict;
  }
  // --- WHAT A WAY IS WORTH (SIM 39): the boundary reads the GROUND the run crosses, because
  //     the evidence is unanimous that the multiplier is a property of what the road REPLACES
  //     (DIGEST-2026-07-17 §2: firm dry 1.0–1.2× / ordinary ~3× / mud 4–7× / marsh impassable).
  //     A causeway over hard dry ground is planks on rock; over the boggy flat by the Wear it
  //     is the difference between a road and no road. The proxy is DEPTH TO WATER — the water
  //     model is already the shared source the tint and the workings agree on (grep-the-tree,
  //     once more), and ground with the table at its ankles is exactly the ground that bogs. ---
  function waySpeedMult(points: Vec2[]): number {
    let sum = 0;
    let n = 0;
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1]!;
      const b = points[i]!;
      const legs = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 12));
      for (let s = 0; s <= legs; s++) {
        const t = s / legs;
        const x = a.x + (b.x - a.x) * t;
        const y = a.y + (b.y - a.y) * t;
        // metres from the surface down to the water table: 0 = standing bog, deep = dry ground
        const dry = Math.max(0, Math.min(WAY_SOFT_DEPTH, site.heightAt(x, y) - water.tableAt(x, y)));
        const soft = 1 - dry / WAY_SOFT_DEPTH; // 1 = fen, 0 = hard and dry
        sum += WAY_MULT_FIRM + soft * (WAY_MULT_SOFT - WAY_MULT_FIRM);
        n++;
      }
    }
    return n > 0 ? round6(sum / n) : WAY_MULT_FIRM;
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

  // --- THE PROSPECT READOUT (SIM 15): what the land under the Quarry cursor affords.
  //     Reuses quarryPlanAt — the SAME water+bed oracle cutCommand freezes — so the
  //     hover-read and the commit never disagree: ok ⇒ a green "winnable" line, else the
  //     reason it's drowned/too deep. The planner colours its ring red on !ok; this only
  //     WRITES the DOM. Pure render — no sim, no baseline. ---
  const prospectEl = document.getElementById('prospect') as HTMLElement;
  const PROSPECT_PROBE = HAUL_PROBE_AREA; // the same "is dry post winnable here?" probe the haul uses
  function prospectToScreen(x: number, y: number): { sx: number; sy: number } {
    const v = new THREE.Vector3(x, groundSim(x, y), y).project(camera);
    const rect = renderer.domElement.getBoundingClientRect();
    return { sx: rect.left + ((v.x + 1) / 2) * rect.width, sy: rect.top + ((1 - v.y) / 2) * rect.height };
  }
  function showProspect(p: Vec2 | null, atEdge?: boolean): void {
    if (!p) {
      prospectEl.style.display = 'none';
      return;
    }
    if (atEdge) {
      // magnetized to the workable SHORE — name the edge, not the reach flickering at the flip
      prospectEl.className = 'ok';
      prospectEl.textContent = '⛏ the workable edge · snapped — cut up to here';
    } else {
      const plan = quarryPlanAt(p.x, p.y, PROSPECT_PROBE);
      if (plan.ok) {
        const post = beds
          .nearestHole(p.x, p.y)
          ?.column.find((s) => s.m === 'sandstone' || s.m === 'limestone');
        prospectEl.className = 'ok';
        prospectEl.textContent = `⛏ ${post?.m ?? 'building stone'} · ${plan.reach.toFixed(0)} m dry · open cut ✓`;
      } else {
        prospectEl.className = 'bad';
        prospectEl.textContent = `⚠ ${plan.reason}`;
      }
    }
    const { sx, sy } = prospectToScreen(p.x, p.y);
    prospectEl.style.left = `${sx + 14}px`;
    prospectEl.style.top = `${sy + 14}px`;
    prospectEl.style.display = 'block';
  }

  // --- THE ADIT (SIM 15): a self-draining drift driven INTO the hillside at the portal's
  //     grade — the method the red quarry warning points at ("drive an adit"), winning post
  //     the open cut can't reach (drowned / too deep). Like the quarry + haul, the economics
  //     are READ here (only main holds beds + surface) and FROZEN into plan_adit; the sim core
  //     replays the scalars and never sees rock or water (the SIM 14 freeze law). The drive is
  //     LEVEL at grade = the surface under the mouth, so it drains back out to the portal. ---
  const aditSurface = (x: number, y: number): number => site.heightAt(x, y);
  function aditCommand(points: Vec2[]): Command | null {
    const portal = points[0];
    const head = points[1];
    if (!portal || !head) return null;
    const grade = site.heightAt(portal.x, portal.y); // drive level from the mouth — self-draining to here
    const econ = aditEconomics(beds, aditSurface, portal, head, grade);
    if (econ.length < 1) return null; // too short to be a drive — onConfirm refuses
    return {
      kind: 'plan_adit',
      tick: world.tick,
      portal,
      head,
      grade: round6(grade),
      workTotal: Math.max(1, round6(econ.workDays)),
      stoneTotal: round6(econ.stone), // may be 0 — a drive into barren cover wins none (dig-anyway)
    };
  }
  // THE ADIT READOUT: what the drive being drawn would win — reuses #prospect (only one
  // planner tool is active at a time). Reads the SAME aditEconomics cutCommand's sibling freezes.
  function showAdit(portal: Vec2 | null, head: Vec2 | null): void {
    if (!portal && !head) {
      prospectEl.style.display = 'none';
      return;
    }
    const anchor = head ?? portal!;
    if (!portal || !head) {
      prospectEl.className = 'ok';
      prospectEl.textContent = '⛏ adit · click the hillside mouth, then the head';
    } else {
      const grade = site.heightAt(portal.x, portal.y);
      const econ = aditEconomics(beds, aditSurface, portal, head, grade);
      const cover = Math.max(0, site.heightAt(head.x, head.y) - grade); // m of hill over the head
      if (econ.stone > 0.5) {
        prospectEl.className = 'ok';
        prospectEl.textContent = `⛏ adit · ${econ.stone.toFixed(0)} m³ post · ${econ.workDays.toFixed(0)} days · ${cover.toFixed(0)} m under cover · self-draining ✓`;
      } else {
        prospectEl.className = 'bad';
        prospectEl.textContent = '⚠ this drive stays in drift — aim into the rising hill for post';
      }
    }
    const { sx, sy } = prospectToScreen(anchor.x, anchor.y);
    prospectEl.style.left = `${sx + 14}px`;
    prospectEl.style.top = `${sy + 14}px`;
    prospectEl.style.display = 'block';
  }

  // --- THE BELL PIT (SIM 15, the method ladder's third rung): a narrow shaft sunk into FLAT
  //     ground for deeper DRY post than an open cut reaches — the flat-ground answer where the
  //     adit has no hill. Reaches to BELL_REACH (deeper than the open cut's 12 m) but stays above
  //     the water table (no pump), and is WASTEFUL (a resink penalty on the yield). Economics are
  //     READ here and FROZEN into plan_bell_pit, like the quarry and the adit. ---
  const BELL_REACH = 25; // m — a shaft reaches deeper dry than an open cut (less overburden per m³)
  const BELL_AREA = 4; // m² — the shaft footprint the yield is reckoned over (narrow)
  const BELL_YIELD_FRAC = 0.6; // the resink penalty: pillars left + frequent re-sinking waste the seam
  function bellPitReach(x: number, y: number): number {
    return Math.min(water.dryDepthAt(x, y), BELL_REACH); // dry AND within a shaft's reach
  }
  function bellPitCommand(at: Vec2): Command | null {
    const reach = bellPitReach(at.x, at.y);
    if (reach <= 1) return null; // drowned — a bell pit can't pump; the readout points at the shaft engine
    const { workDays, stone } = cutEconomics(beds, at.x, at.y, reach, BELL_AREA);
    const won = stone * BELL_YIELD_FRAC;
    if (won <= 0.5) return null; // no dry post in the shaft's reach here
    return {
      kind: 'plan_bell_pit',
      tick: world.tick,
      at,
      depth: round6(reach),
      workTotal: Math.max(1, round6(workDays)),
      stoneTotal: round6(won),
    };
  }
  // THE BELL-PIT READOUT: what the shaft under the cursor would win — reuses #prospect (one
  // planner tool active at a time), the SAME water + bed oracle bellPitCommand freezes.
  function showBellPit(at: Vec2 | null): void {
    if (!at) {
      prospectEl.style.display = 'none';
      return;
    }
    const reach = bellPitReach(at.x, at.y);
    if (reach <= 1) {
      prospectEl.className = 'bad';
      prospectEl.textContent = '⚠ drowned here — a bell pit can’t pump · wants a shaft engine (a later rung)';
    } else {
      const { stone } = cutEconomics(beds, at.x, at.y, reach, BELL_AREA);
      const won = stone * BELL_YIELD_FRAC;
      if (won <= 0.5) {
        prospectEl.className = 'bad';
        prospectEl.textContent = '⚠ no dry post in a shaft’s reach here';
      } else {
        const post = beds
          .nearestHole(at.x, at.y)
          ?.column.find((s) => s.m === 'sandstone' || s.m === 'limestone');
        const cheaper = water.dryDepthAt(at.x, at.y) <= MAX_OPEN_REACH ? ' · an open cut is cheaper' : '';
        prospectEl.className = 'ok';
        prospectEl.textContent = `⛏ bell pit · ${won.toFixed(0)} m³ ${post?.m ?? 'post'} · ${reach.toFixed(0)} m deep, dry ✓${cheaper}`;
      }
    }
    const { sx, sy } = prospectToScreen(at.x, at.y);
    prospectEl.style.left = `${sx + 14}px`;
    prospectEl.style.top = `${sy + 14}px`;
    prospectEl.style.display = 'block';
  }

  // --- THE SHAFT-AND-PUMP (SIM 15, the method ladder's FOURTH + last rung): a deep shaft that
  //     beats the WATER TABLE by continuous dewatering — the only method that wins DROWNED post
  //     the open cut / adit / bell pit can't. The pump is not free: the drowned depth carries a
  //     PUMP TAX in the frozen workTotal. Reaches deeper than a bell pit. Economics READ here and
  //     FROZEN into plan_shaft, like every working. Ungated for now (a later tech gate per
  //     PROPOSAL-THE-METHOD-LADDER §3 is a trivial condition on the tool, not on this mechanic). ---
  const SHAFT_REACH = 40; // m — a pumped shaft sinks deep, past the water table
  const SHAFT_AREA = 4; // m² — the shaft footprint the yield is reckoned over (narrow)
  const SHAFT_YIELD_FRAC = 0.7; // a controlled deep shaft wastes less of the seam than a re-sunk bell pit
  const PUMP_TAX_MULT = 2; // the pump's toll: the drowned fraction of the dig costs up to (1+MULT)× — a
  //                          LABELLED GAME CHOICE (the boss's generous-thumb style), not a sourced figure;
  //                          a later course can firm it (Newcomen coal, horse-gin capacity) — PROPOSAL §5 Q3.
  function shaftEcon(x: number, y: number): { workDays: number; won: number; drowned: number } {
    const { workDays, stone } = cutEconomics(beds, x, y, SHAFT_REACH, SHAFT_AREA);
    const dryDepth = water.dryDepthAt(x, y);
    const drowned = Math.max(0, SHAFT_REACH - dryDepth); // metres of shaft below the water table
    const pumped = workDays * (1 + PUMP_TAX_MULT * (drowned / SHAFT_REACH)); // the drowned dig, pump-taxed
    return { workDays: pumped, won: stone * SHAFT_YIELD_FRAC, drowned };
  }
  function shaftCommand(at: Vec2): Command | null {
    const { workDays, won } = shaftEcon(at.x, at.y);
    if (won <= 0.5) return null; // no post in a shaft's reach here — refuse (the readout says so)
    return {
      kind: 'plan_shaft',
      tick: world.tick,
      at,
      depth: SHAFT_REACH,
      workTotal: Math.max(1, round6(workDays)),
      stoneTotal: round6(won),
    };
  }
  // THE SHAFT READOUT: what a deep pumped shaft under the cursor would win — reuses #prospect, the
  // SAME water + bed oracle shaftCommand freezes. It never refuses for water (that is its purpose).
  function showShaft(at: Vec2 | null): void {
    if (!at) {
      prospectEl.style.display = 'none';
      return;
    }
    const { won, drowned } = shaftEcon(at.x, at.y);
    if (won <= 0.5) {
      prospectEl.className = 'bad';
      prospectEl.textContent = '⚠ no post in a shaft’s reach here — even a pump wins nothing';
    } else {
      const post = beds
        .nearestHole(at.x, at.y)
        ?.column.find((s) => s.m === 'sandstone' || s.m === 'limestone');
      prospectEl.className = 'ok';
      const pumpNote =
        drowned > 1
          ? ` · ${drowned.toFixed(0)} m pumped — drowned post won ✓`
          : ' · all dry here — a bell pit is cheaper';
      prospectEl.textContent = `⛏ shaft + pump · ${won.toFixed(0)} m³ ${post?.m ?? 'post'} · ${SHAFT_REACH} m deep${pumpNote}`;
    }
    const { sx, sy } = prospectToScreen(at.x, at.y);
    prospectEl.style.left = `${sx + 14}px`;
    prospectEl.style.top = `${sy + 14}px`;
    prospectEl.style.display = 'block';
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
    // prospecting (SIM 15): the ring warns RED where the land won't afford an open cut,
    // and the cursor's ground point feeds the prospect readout — both read quarryPlanAt
    cutValid: (x, y) => quarryPlanAt(x, y, PROSPECT_PROBE).ok,
    onCutCursor: showProspect,
    onAditCursor: showAdit, // the adit tool prices its drive in the same #prospect card
    onBellPit: (at) => {
      const cmd = bellPitCommand(at);
      if (cmd) enqueue(cmd); // a click sinks the shaft; a drowned/barren spot is refused (readout says why)
    },
    onBellPitCursor: showBellPit,
    onShaft: (at) => {
      const cmd = shaftCommand(at);
      if (cmd) enqueue(cmd); // a click sinks a deep pumped shaft; a postless spot is refused
    },
    onShaftCursor: showShaft,

    onConfirm: (mode, points, height, material) => {
      if (mode === 'cut') {
        // the cut always affords now — the red ring only WARNS; a drowned cut digs and floods
        const cmd = cutCommand(points);
        if (enqueue(cmd)) {
          tutorial.saw('quarry'); // tutorial step 3: a real quarry committed
          return true;
        }
        return false;
      }

      if (mode === 'adit') {
        // a drift into the hill — the readout priced it; a too-short drive won't commit
        const cmd = aditCommand(points);
        return cmd ? enqueue(cmd) : false;
      }
      if (mode === 'fell') {
        const cmd = fellCommand(points);
        return cmd ? enqueue(cmd) : false; // no standing timber — the plan row says why
      }
      if (mode === 'way') {
        const cmd = wayCommand(points);
        return cmd ? enqueue(cmd) : false; // too short to be a road — the plan row says why
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
      // THE WORD AT THE PLOT (SIM 37): attach the pickers' answers when the drawn
      // ring's class will take them — the pencil never sends a word the sim rejects
      const rc = classifyRing(points, height);
      const roofPick = PLOT_ROOFS[plotRoofI];
      const kindPick = PLOT_KINDS[plotKindI];
      const usePick = PLOT_USES[plotUseI];
      return enqueue({
        kind: 'plan_wall',
        tick: world.tick,
        points,
        height,
        material,
        dressLevel,
        // the road, frozen (SIM 39); absent ⇒ a local wall that draws the pile directly
        ...(hv ? { haul: hv } : {}),
        ...(rc?.kind === 'building' && roofPick ? { roof: roofPick } : {}),
        ...(rc?.kind === 'building' && kindPick ? { buildingKind: kindPick } : {}),
        ...(rc?.kind === 'farm' && usePick ? { use: usePick } : {}),
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
      wayBtn.classList.toggle('active', active && mode === 'way');
      aditBtn.classList.toggle('active', active && mode === 'adit');
      bellBtn.classList.toggle('active', active && mode === 'bellpit');
      shaftBtn.classList.toggle('active', active && mode === 'shaft');
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

  // THE PROGRESS CHIPS (Course 2, boss: "structures that are being built should show
  // their progress, even just a simple bubble… 0 / X blocks", always-on per his word;
  // multi-line when a work has more than one input). One reusable DOM chip per
  // incomplete entity, projected at its middle every frame; done work fades away.
  // Field-guide restraint: small, monospace, low-saturation. The mason verb is LAID
  // (dressing is absorbed upstream in the quarry yield — the research digest's law).
  const chipsBox = document.createElement('div');
  chipsBox.id = 'chips';
  chipsBox.style.cssText = 'position:fixed;left:0;top:0;pointer-events:none;z-index:5;';
  document.body.appendChild(chipsBox);
  const chipEls = new Map<string, HTMLDivElement>();
  const chipVec = new THREE.Vector3();
  function chip(key: string, x: number, y: number, z: number, lines: string[]): void {
    let el = chipEls.get(key);
    if (!el) {
      el = document.createElement('div');
      el.style.cssText =
        'position:absolute;transform:translate(-50%,-100%);font:11px ui-monospace,monospace;' +
        'color:#e8e0d0;background:rgba(24,22,18,0.72);border:1px solid rgba(232,224,208,0.25);' +
        'border-radius:3px;padding:2px 6px;white-space:pre;line-height:1.35;';
      chipsBox.appendChild(el);
      chipEls.set(key, el);
    }
    chipVec.set(x, z, y).project(camera);
    const text = lines.join('\n');
    if (el.textContent !== text) el.textContent = text;
    const behind = chipVec.z > 1;
    el.style.display = behind ? 'none' : '';
    if (!behind) {
      el.style.left = `${(chipVec.x * 0.5 + 0.5) * window.innerWidth}px`;
      el.style.top = `${(-chipVec.y * 0.5 + 0.5) * window.innerHeight}px`;
    }
  }
  function updateChips(): void {
    if (!started || home.isOpen()) {
      for (const [, el] of chipEls) el.style.display = 'none';
      return;
    }
    const live = new Set<string>();
    const mid = (pts: readonly Vec2[]): Vec2 => {
      let cx = 0;
      let cy = 0;
      for (const p of pts) {
        cx += p.x;
        cy += p.y;
      }
      return { x: cx / pts.length, y: cy / pts.length };
    };
    for (const w of world.walls) {
      if (w.stonesLaid >= w.stonesTotal) continue;
      const key = `w${w.id}`;
      live.add(key);
      const m = mid(w.points);
      const lines = [
        w.material === 'wood'
          ? `🪵 ${w.stonesLaid} / ${w.stonesTotal} posts`
          : `⚒ ${w.stonesLaid} / ${w.stonesTotal} stones laid`,
      ];
      // the stall, named AT the structure (the HUD's bottleneck line, brought home)
      if (w.material === 'wood' && world.timber < TIMBER_PER_POST) lines.push('waiting on timber');
      else if (w.material !== 'wood') {
        const draw = DRESS_DRAW[w.dressLevel];
        if (w.haul !== null && w.faceBuffer < draw) lines.push('waiting on the carry');
        else if (w.haul === null && world.stockpile < draw) lines.push('waiting on stone');
      }
      chip(key, m.x, m.y, groundSim(m.x, m.y) + w.height + 1.2, lines);
    }
    const workings: Array<{ key: string; at: Vec2; icon: string; done: number; total: number; stone: number; stoneTotal: number }> = [];
    for (const c of world.cuts) workings.push({ key: `c${c.id}`, at: mid(c.points), icon: '⛏', done: c.workDone, total: c.workTotal, stone: c.stoneTotal * Math.min(1, c.workDone / c.workTotal), stoneTotal: c.stoneTotal });
    for (const a of world.adits) workings.push({ key: `a${a.id}`, at: a.portal, icon: '⛏', done: a.workDone, total: a.workTotal, stone: a.stoneTotal * Math.min(1, a.workDone / a.workTotal), stoneTotal: a.stoneTotal });
    for (const b of world.bellPits) workings.push({ key: `b${b.id}`, at: b.at, icon: '⛏', done: b.workDone, total: b.workTotal, stone: b.stoneTotal * Math.min(1, b.workDone / b.workTotal), stoneTotal: b.stoneTotal });
    for (const s of world.shafts) workings.push({ key: `s${s.id}`, at: s.at, icon: '⛏', done: s.workDone, total: s.workTotal, stone: s.stoneTotal * Math.min(1, s.workDone / s.workTotal), stoneTotal: s.stoneTotal });
    for (const wk of workings) {
      if (wk.done >= wk.total) continue;
      live.add(wk.key);
      chip(wk.key, wk.at.x, wk.at.y, groundSim(wk.at.x, wk.at.y) + 2.2, [
        `${wk.icon} ${Math.floor(wk.done)} / ${Math.ceil(wk.total)} days`,
        `${wk.stone.toFixed(0)} of ${wk.stoneTotal.toFixed(0)} m³ won`,
      ]);
    }
    for (const s of world.stands) {
      if (!s.felling || s.workDone >= s.workTotal) continue;
      const key = `t${s.id}`;
      live.add(key);
      const m = mid(s.points);
      chip(key, m.x, m.y, groundSim(m.x, m.y) + 2.2, [
        `🪓 ${Math.floor(s.workDone)} / ${Math.ceil(s.workTotal)} days`,
        `${(s.timberTotal * Math.min(1, s.workDone / s.workTotal)).toFixed(0)} of ${s.timberTotal.toFixed(0)} m³ felled`,
      ]);
    }
    for (const f of world.fills) {
      if (f.volumeMoved >= f.volumeTotal) continue;
      const key = `f${f.id}`;
      live.add(key);
      const m = mid(f.points);
      chip(key, m.x, m.y, groundSim(m.x, m.y) + 2.2, [
        `⛰ ${f.volumeMoved.toFixed(0)} / ${f.volumeTotal.toFixed(0)} m³ of earth`,
      ]);
    }
    for (const r of world.roofs) {
      if (r.material === null || r.workDone >= r.workTotal) continue;
      const key = `r${r.id}`;
      live.add(key);
      const m = mid(r.points);
      chip(key, m.x, m.y, r.level + 1.4, [`⛉ ${r.workDone.toFixed(0)} / ${r.workTotal.toFixed(0)} decked`]);
    }
    // THE TIMBER WAY (SIM 38): a road being planked counts like every other work (Course 2's
    // always-on chip). It rides at the way's MIDPOINT and names the stall the road can have —
    // an empty woodpile — because a chip that only counts is half a chip.
    for (const w of world.ways) {
      if (w.workDone >= w.workTotal) continue; // a finished road needs no counter
      const key = `y${w.id}`;
      live.add(key);
      const m = w.points[Math.floor(w.points.length / 2)]!;
      const lines = [
        `≡ ${Math.round(w.length * Math.min(1, w.workDone / w.workTotal))} / ${Math.round(w.length)} m paved`,
        `${w.timberLaid.toFixed(1)} of ${w.timberTotal.toFixed(1)} m³ timber laid`,
      ];
      if (world.timber <= 0) lines.push('waiting on timber');
      chip(key, m.x, m.y, groundSim(m.x, m.y) + 1.6, lines);
    }
    for (const [key, el] of chipEls) {
      if (!live.has(key)) {
        el.remove();
        chipEls.delete(key); // finished work fades from the air
      }
    }
  }

  // THE VISIBLE PILES (Course 2): blocks stack beside the workings, logs drop where
  // felled, a hauled face shows its buffer — and the carriers pick up from REAL piles
  const piles = new PileLayer(world, scene, groundShow);
  const people = new PeopleLayer(
    world,
    site,
    scene,
    groundShow,
    (x, y) => cuts.floorAtShow(x, y), // the digger descends as the pit deepens
    piles,
  );
  // the granary comes alive: sacks + a prowling cat per designated store (3b)
  const granary = new GranaryLayer(world, site, scene, groundShow);
  // the orchard made visible: tidy rows of fruit trees on each designated orchard (render-only)
  const orchard = new OrchardLayer(world, scene, groundShow);
  // THE ANIMALS (Course 3): each pasture's draft horse (sim-true, SIM 29) + paddock
  // cows/pigs (decor-pending-the-herds-system, the granary-cat precedent)
  const animals = new AnimalLayer(world, scene, groundShow);
  // THE TIMBER WAY (SIM 38): the causeway's baulks, creeping forward as the road hands plank it
  const ways = new WayLayer(world, groundShow, scene);
  // the workshops made visible: a lit forge on each smithy, a log stack + sawhorse on each yard
  const workshops = new WorkshopLayer(world, scene, groundShow);
  // the great wheel made visible: a treadwheel crane beside every wall that raised one (SIM 26)
  const wheel = new WheelLayer(world, scene, groundShow);
  // SIM 36: the trades are fluid, so the crew-pace ETAs derive LIVE from the roster —
  // the whole adult villagery at its per-job rates (an optimistic "all hands" read; the
  // dawn pass splits them daily, but a boot-frozen sum lied the moment anyone churned).
  const adultVillagers = (): Person[] =>
    world.people.filter(
      (p) => p.trade === 'villager' && (world.tick - p.bornTick) / TICKS_PER_YEAR >= ADULT_AGE,
    );
  const paceSum = (): number =>
    Math.max(1, Math.round(adultVillagers().reduce((n, p) => n + layRateOf(p), 0)));
  const earthPace = (): number =>
    Math.max(1, Math.round(adultVillagers().reduce((n, p) => n + earthRateOf(p, 'digger'), 0)));

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
  // The Lodge Book (SIM 15 save/load). Save writes the event-sourced format to a
  // localStorage slot from the live world; Load rides New-Game's reload rails (the
  // render layers bind to `world` at construction) — a one-shot token, then boot()
  // replays the slot instead of seeding fresh. Both are pure UI: no sim change.
  function saveGame(): void {
    localStorage.setItem(SAVE_KEY, stableStringify(makeSave(world, commandLog)));
    home.noteSaved();
  }
  function loadGame(): void {
    if (!localStorage.getItem(SAVE_KEY)) return; // nothing kept (the button is disabled anyway)
    const inProgress = world.tick > 0 || commandLog.length > 0;
    if (inProgress && !window.confirm('Open the kept castle? The one in progress will be set aside.')) {
      return;
    }
    sessionStorage.setItem('freestone_load', '1');
    location.reload();
  }
  function savedInfo(): { year: number } | null {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    try {
      return { year: yearOf((JSON.parse(raw) as SaveFile).meta.savedAtTick) };
    } catch {
      return null;
    }
  }
  // THE CHEAT MENU (boss ask 2026-07-16, testing tool): Settings-gated; every cheat
  // is a COMMAND through enqueue, so the log stays the whole truth and a cheated
  // world replays byte-for-byte, cheats and all.
  const CHEAT_KEY = 'freestone_cheats';
  const getCheatsEnabled = (): boolean => localStorage.getItem(CHEAT_KEY) === 'on'; // default OFF
  const cheatRow = document.createElement('div');
  cheatRow.style.display = 'none';
  const cheatStone = document.createElement('button');
  cheatStone.textContent = '💠 +100 stone';
  const cheatTimber = document.createElement('button');
  cheatTimber.textContent = '💠 +50 timber';
  const cheatGrain = document.createElement('button');
  cheatGrain.textContent = '💠 +10 grain';
  const cheatSoul = document.createElement('button');
  cheatSoul.textContent = '💠 a villager';
  cheatRow.append(cheatStone, cheatTimber, cheatGrain, cheatSoul);
  build2.after(cheatRow);
  const refreshCheatRow = (): void => {
    cheatRow.style.display = getCheatsEnabled() ? '' : 'none';
  };
  refreshCheatRow();
  const setCheatsEnabled = (on: boolean): void => {
    localStorage.setItem(CHEAT_KEY, on ? 'on' : 'off');
    refreshCheatRow();
  };
  cheatStone.onclick = () => enqueue({ kind: 'cheat_give', tick: world.tick, stone: 100 });
  cheatTimber.onclick = () => enqueue({ kind: 'cheat_give', tick: world.tick, timber: 50 });
  cheatGrain.onclick = () => enqueue({ kind: 'cheat_give', tick: world.tick, grain: 10 });
  cheatSoul.onclick = () =>
    enqueue({
      kind: 'cheat_spawn_person',
      tick: world.tick,
      at: { x: site.extentX / 2, y: site.extentY / 2 }, // advisory — the diorama camps new souls
    });

  const home = createHomeScreen({
    onNewGame: newGame,
    onBack: resumeGame,
    onSave: saveGame,
    onLoad: loadGame,
    getTutorialEnabled,
    setTutorialEnabled,
    getCheatsEnabled,
    setCheatsEnabled,
    getSaveInfo: savedInfo,
  });
  (document.getElementById('gear') as HTMLElement).onclick = openHome;

  wallBtn.onclick = () => planner.toggle('wall');
  bldBtn.onclick = () => planner.toggle('building');
  fillBtn.onclick = () => planner.toggle('fill');
  gateBtn.onclick = () => planner.toggle('gate');
  roofBtn.onclick = () => planner.toggle('roof');
  quarryBtn.onclick = () => planner.toggle('cut');
  fellBtn.onclick = () => planner.toggle('fell');
  wayBtn.onclick = () => planner.toggle('way');
  aditBtn.onclick = () => planner.toggle('adit');
  bellBtn.onclick = () => planner.toggle('bellpit');
  shaftBtn.onclick = () => planner.toggle('shaft');

  // THE MASON'S MARK (Beat 2): each hand cut a personal mark, deterministic from the mason's id —
  // a central stave with id-selected branches on a 16-grid. Historically cut only on dressed ASHLAR,
  // so it appears on the card only there (and retroactively deepens the DRESS dial: ashlar buys names
  // in the wall). A tiny compass-and-straightedge glyph, never the sim rng — keyed on the id.
  const MARK_STROKES = [
    'M8 2L8 14', // the stave (always drawn)
    'M8 5L3 2',
    'M8 5L13 2',
    'M8 11L3 14',
    'M8 11L13 14',
    'M4 4L12 4',
    'M4 12L12 12',
    'M8 8L13 8',
  ];
  function masonMark(id: number): string {
    const bits = (id * 2654435761) >>> 0;
    let d = MARK_STROKES[0]!;
    for (let i = 1; i < MARK_STROKES.length; i++) if ((bits >>> i) & 1) d += MARK_STROKES[i];
    if (d === MARK_STROKES[0]) d += MARK_STROKES[1 + (bits % 4)]!; // never a bare stave
    return `<svg viewBox="0 0 16 16" width="13" height="13" style="vertical-align:-2px;margin-right:3px"><path d="${d}" fill="none" stroke="#efe6cf" stroke-width="1.4" stroke-linecap="round"/></svg>`;
  }

  // --- THE INSPECTION CARD (Beat 2, the memory suite's heart, render-only): a click on a laid stone,
  //     when no tool is out, opens what the record has always known but never shown — the HAND that laid
  //     it and the DAY (masonId + tickLaid, write-only since M1). The stone InstancedMesh's instanceId is
  //     the world.stones index (syncStones lays matrix[i] = stones[i]), so the raycast reads straight
  //     through to the record. Reuses #prospect (a tool is never out while inspecting). ---
  const inspectRay = new THREE.Raycaster();
  let inspectDownX = 0;
  let inspectDownY = 0;
  renderer.domElement.addEventListener('pointerdown', (ev) => {
    inspectDownX = ev.clientX;
    inspectDownY = ev.clientY;
  });

  /** click-time ground pick: a full mesh raycast (~4 ms) is fine ONCE per click —
   *  the pointermove path keeps its microsecond march; this is the lazy cousin */
  function groundPick(clientX: number, clientY: number): Vec2 | null {
    const rect = renderer.domElement.getBoundingClientRect();
    const nx = ((clientX - rect.left) / rect.width) * 2 - 1;
    const ny = -((clientY - rect.top) / rect.height) * 2 + 1;
    inspectRay.setFromCamera(new THREE.Vector2(nx, ny), camera);
    const hit = inspectRay.intersectObject(terrain.mesh)[0];
    if (!hit) return null;
    return { x: hit.point.x, y: hit.point.z }; // three (x, up, north) → sim (x, y)
  }

  /**
   * THE ENTITY CARDS (Course 2): the details a click on the LAND can speak — the
   * farm's expected yield (the livingYear arithmetic, labelled space-gated), a
   * building's biography + occupants-as-data (boss 0b: "occupants should just be
   * data in the details"), a working's progress + a stand's regrowth clock, and a
   * PENDING plot's open words. Pure reads; the render never writes.
   */
  function entityCardAt(x: number, y: number): string | null {
    for (const f of world.farms) {
      if (f.points.length >= 3 && pointInPolygon(x, y, f.points)) {
        if (f.use === 'farm') {
          const mouths = f.area / AREA_PER_PERSON;
          return `🌾 an arable farm · ${f.area.toFixed(0)} m² · feeds ~${mouths.toFixed(1)} mouths a year (space-gated — skill moves tending, not yield) · ${f.workdays.toFixed(1)} workdays tended · wants ${Math.ceil(f.area / FARM_AREA_PER_HAND)} hand(s) a day`;
        }
        if (f.use === 'orchard') {
          return `🍎 an orchard · ${f.area.toFixed(0)} m² · bears ~${(f.area / ORCHARD_AREA_PER_PERSON).toFixed(1)} mouths of fruit toward the harvest`;
        }
        if (f.use === 'pasture') return `🐎 a pasture · ${f.area.toFixed(0)} m² · keeps a draft horse that hauls surplus to the store`;
        if (f.use === 'livestock') return `🐄 a paddock · ${f.area.toFixed(0)} m² · grazed (herds are a later system)`;
        return `⚹ fallow · ${f.area.toFixed(0)} m² · the land rests`;
      }
    }
    for (const b of world.buildings) {
      const wall = world.walls.find((w) => w.id === b.wallId);
      if (!wall || wall.points.length < 3 || !pointInPolygon(x, y, wall.points)) continue;
      const kin = world.stones.filter((st) => st.wallId === b.wallId);
      let begun = Infinity;
      for (const st of kin) if (st.tickLaid < begun) begun = st.tickLaid;
      const tier = b.kind === 'house' ? ` · a ${houseTier(b.area, b.roof)}` : '';
      // occupants as DATA (0b Q1): a deterministic render-side listing — the youngest
      // souls by id-hash keep the house; real per-house binding is a later sim course
      const roll = world.people.filter((p) => (p.id * 2654435761 >>> 0) % Math.max(1, world.buildings.length) === world.buildings.indexOf(b)).map((p) => p.name);
      const folk = b.kind === 'house' && roll.length ? ` · home of ${roll.slice(0, 3).join(', ')}${roll.length > 3 ? '…' : ''}` : '';
      return `⌂ a ${b.kind}${tier} · roof: ${b.roof} · ${b.area.toFixed(0)} m² · ${kin.length} stones, begun Year ${Number.isFinite(begun) ? yearOf(begun) : '—'}${folk}`;
    }
    for (const id of world.pending) {
      const wall = world.walls.find((w) => w.id === id);
      if (!wall || wall.points.length < 3 || !pointInPolygon(x, y, wall.points)) continue;
      if (wall.plans !== null) {
        const open = [wall.plans.roof === null ? 'its roof' : '', wall.plans.kind === null ? 'its trade' : ''].filter(Boolean).join(' and ');
        return `⌂ an unnamed shell · still asking for ${open} — the word-card takes the answer`;
      }
      return `🌾 an enclosed plot · still asking for its use — the word-card takes the answer`;
    }
    for (const c of world.cuts) {
      if (pointInPolygon(x, y, c.points)) {
        const won = c.stoneTotal * Math.min(1, c.workDone / c.workTotal);
        return `⛏ an open cut · ${Math.floor(c.workDone)} of ${Math.ceil(c.workTotal)} days dug · ${won.toFixed(0)} of ${c.stoneTotal.toFixed(0)} m³ won${c.workDone >= c.workTotal ? ' · worked out' : ''}`;
      }
    }
    for (const st of world.stands) {
      if (st.points.length >= 3 && pointInPolygon(x, y, st.points)) {
        if (st.felling) return `🪓 a cant under the axe · ${Math.floor(st.workDone)} of ${Math.ceil(st.workTotal)} days`;
        if (st.feltTick >= 0) {
          const back = Math.max(0, Math.ceil((st.feltTick + REGROWTH_TICKS - world.tick) / TICKS_PER_YEAR));
          return `🌳 a felled coppice · the stool regrows — mature in ~${back} year(s)`;
        }
        return `🌳 a mature stand · ready to fell`;
      }
    }
    return null;
  }
  renderer.domElement.addEventListener('pointerup', (ev) => {
    if (ev.button !== 0 || planner.active) return; // a tool owns the click; inspect only when the pencil is down
    if (Math.hypot(ev.clientX - inspectDownX, ev.clientY - inspectDownY) > 6) return; // a drag (orbit/pan), not a click
    const rect = renderer.domElement.getBoundingClientRect();
    const nx = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
    const ny = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
    inspectRay.setFromCamera(new THREE.Vector2(nx, ny), camera);
    const instanceId = inspectRay.intersectObject(stones)[0]?.instanceId;
    const s = instanceId != null ? world.stones[instanceId] : undefined;
    if (!s) {
      // THE ENTITY CARDS (Course 2, on the memory suite's spine): a stone miss falls
      // through to the GROUND — click a farm, a building, a working, a stand, and the
      // record speaks its details (boss: "selectable… show you details" / "farms too…
      // expected yields"). Pure reads of recorded state + the livingYear arithmetic.
      const gp = groundPick(ev.clientX, ev.clientY);
      const line = gp ? entityCardAt(gp.x, gp.y) : null;
      if (line) {
        prospectEl.className = 'ok';
        prospectEl.textContent = line;
        prospectEl.style.left = `${ev.clientX + 14}px`;
        prospectEl.style.top = `${ev.clientY + 14}px`;
        prospectEl.style.display = 'block';
      } else {
        prospectEl.style.display = 'none';
      }
      return;
    }
    const mason = world.people.find((p) => p.id === s.masonId);
    const dress = world.walls.find((w) => w.id === s.wallId)?.dressLevel;
    const mat = world.walls.find((w) => w.id === s.wallId)?.material;
    prospectEl.className = 'ok';
    // "laid by Alwin the mason in the Year 7 — dressed ashlar sandstone": the wall read as a ledger at last
    let line = `⛏ ${dress ?? ''} ${mat ?? 'stone'} · laid by ${mason?.name ?? 'a lost hand'}${mason ? ` the ${mason.trade}` : ''} · Year ${yearOf(s.tickLaid)}`;
    // THE FOUNDER'S STONE (Beat 2): the first stone laid names the founding party (born before day one)
    if (instanceId === 0) {
      const founders = world.people.filter((p) => p.bornTick < 0).map((p) => p.name);
      if (founders.length) line += ` · ⛭ the founder's stone — the founding: ${founders.join(', ')}`;
    }
    // THE STRUCTURE BIOGRAPHY (Beat 2): the card reads the whole WALL the stone belongs to, not just
    // the one block — how many stones it holds and the year it was begun (its earliest laid stone).
    const kin = world.stones.filter((st) => st.wallId === s.wallId);
    if (kin.length > 1) {
      let begun = Infinity;
      for (const st of kin) if (st.tickLaid < begun) begun = st.tickLaid;
      line += ` · ▦ in a work of ${kin.length} stones, begun Year ${yearOf(begun)}`;
    }
    // dressed ASHLAR carries the mason's mark, drawn on the card (the DRESS dial deepened: ashlar
    // buys a named glyph in the wall). Other dress classes read as plain text. `line` is built from
    // fixed enums + the founder name-list — no HTML metacharacters, so innerHTML is safe here.
    if (dress === 'ashlar' && mason) prospectEl.innerHTML = `${masonMark(mason.id)}${line}`;
    else prospectEl.textContent = line;
    prospectEl.style.left = `${ev.clientX + 14}px`;
    prospectEl.style.top = `${ev.clientY + 14}px`;
    prospectEl.style.display = 'block';
  });
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
  // THE WORD AT THE PLOT (SIM 37): three cycling pickers, applied at commit when the
  // drawn ring's class matches (a roof on a field ring would reject — the pencil only
  // attaches words the sim will take). 'none' = unanswered = answer later at the plot.
  // 'none' here = UNANSWERED (the boss's re-answerable none): a deliberate no-roof is
  // simply a word never given — the building stands bare either way, and the plot
  // still takes the word later
  const PLOT_ROOFS = [null, 'wood', 'straw', 'brick'] as const;
  const PLOT_KINDS = [null, ...BUILDING_KINDS] as const;
  const PLOT_USES = [null, ...FIELD_USES] as const;
  let plotRoofI = 0;
  let plotKindI = 0;
  let plotUseI = 0;
  plotRoofBtn.onclick = () => {
    plotRoofI = (plotRoofI + 1) % PLOT_ROOFS.length;
    plotRoofBtn.textContent = `⛉ roof: ${PLOT_ROOFS[plotRoofI] ?? 'none'}`;
  };
  plotKindBtn.onclick = () => {
    plotKindI = (plotKindI + 1) % PLOT_KINDS.length;
    plotKindBtn.textContent = `⌂ trade: ${PLOT_KINDS[plotKindI] ?? 'none'}`;
  };
  plotUseBtn.onclick = () => {
    plotUseI = (plotUseI + 1) % PLOT_USES.length;
    plotUseBtn.textContent = `🌾 use: ${PLOT_USES[plotUseI] ?? 'none'}`;
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
    orchard.setVisible(!on); // and the planted orchard rows with them
    workshops.setVisible(!on); // and the forge/yard props
    wheel.setVisible(!on); // and the great-wheel cranes
    animals.setVisible(!on); // and the herds (Course 3)
    ways.setVisible(!on); // and the causeways (SIM 38)
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
  // CAMPAIGN PATINA (Beat 2, render-only): a stone weathers a little with its AGE (now − tickLaid),
  // so lifts laid years — or generations — apart read as banded colour: the castle's own archaeology,
  // built from data already recorded (tickLaid was write-only until now). Re-tinted only when the YEAR
  // turns (age evolves on a multi-year scale), never per-frame. PlacedStone.tickLaid, render reads state.
  const PATINA_YEARS = 18; // weathering saturates over ~a generation
  let patinaYear = -1;
  const FOUNDER_PROUD = 0.18; // m: the first stone laid sits slightly proud — the founder's stone (Beat 2)
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
    // colour stone i: its dress + material + id-variation, weathered by its AGE (the campaign patina).
    // Render-side only, keyed on the stone's id + tickLaid — the sim rng is never touched here.
    const applyPatina = (i: number): void => {
      const s = world.stones[i]!;
      const t = ((s.id * 2654435761) >>> 0) / 4294967296;
      const v = ((s.id * 40503) % 97) / 97 - 0.5;
      const dress = dressById.get(s.wallId);
      // Rubble is mottled mixed stone, ashlar a matched course: widen/narrow the spread.
      const spread = dress === 'ashlar' ? 0.55 : dress === 'rubble' ? 1.5 : 1;
      // the patina: 0 at laying → 1 at PATINA_YEARS old; darkens + greys the stone with its years
      const weather = Math.min(1, Math.max(0, (world.tick - s.tickLaid) / TICKS_PER_YEAR) / PATINA_YEARS);
      if (matById.get(s.wallId) === 'wood') {
        tint.setHSL(0.075 + t * 0.015, 0.42 - 0.1 * weather, 0.38 + v * 0.14 - 0.09 * weather); // weathered timber
      } else {
        // honey-toned Durham sandstone, greying + darkening a touch with the years (SCOPE §8d)
        tint.setHSL(0.085 + t * 0.02, 0.34 - 0.12 * weather, 0.68 + v * 0.1 * spread - 0.13 * weather);
      }
      stones.setColorAt(i, tint);
    };
    for (let i = lastStoneCount; i < world.stones.length; i++) {
      const s = world.stones[i]!;
      const v = ((s.id * 40503) % 97) / 97 - 0.5;
      // the DRESS LEVEL reads in the stone itself (SIM 18, render-only): dressed
      // ASHLAR sits as bigger, uniform, tight-fitted blocks; light RUBBLE as
      // smaller, rougher, more varied fieldstone; SCAPPLED between. Plan-view scale
      // only — course height (y) is untouched so the layers stay even — and keyed
      // on the stone id, never the sim rng (render reads state, never writes it).
      const dress = dressById.get(s.wallId);
      const planScale =
        dress === 'ashlar' ? 1.05 : dress === 'rubble' ? 0.94 + v * 0.08 : 1;
      // the FOUNDER'S STONE (Beat 2): the very first stone laid sits slightly proud
      dummy.position.set(s.pos[0], s.pos[2] + (i === 0 ? FOUNDER_PROUD : 0), s.pos[1]);
      dummy.rotation.set(0, -s.yaw, 0);
      dummy.scale.set(planScale, 1, planScale);
      dummy.updateMatrix();
      stones.setMatrixAt(i, dummy.matrix);
      applyPatina(i); // colour + campaign patina (a fresh stone is age 0 — full weathering comes with the years)
    }
    if (world.stones.length !== lastStoneCount) {
      stones.count = world.stones.length;
      stones.instanceMatrix.needsUpdate = true;
      if (stones.instanceColor) stones.instanceColor.needsUpdate = true;
      lastStoneCount = world.stones.length;
    }
    // CAMPAIGN PATINA re-weather: when the year turns, re-tint EVERY laid stone by its new age, so
    // the bands deepen as generations pass. Once a year, not per-frame (age moves on a slow clock).
    const yr = yearOf(world.tick);
    if (yr !== patinaYear && world.stones.length > 0) {
      patinaYear = yr;
      for (let i = 0; i < world.stones.length; i++) applyPatina(i);
      if (stones.instanceColor) stones.instanceColor.needsUpdate = true;
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
    adits.update();
    bellPits.update();
    shafts.update(); // was missing from the live frame — a shaft placed in play never entered the scene
    piles.update(); // Course 2: the visible piles (Law 6 — BOTH update sites)
    ways.update(); // SIM 38: the timber way (Law 6 — BOTH update sites)
    tracingFloor.update();
    roofs.update();
    farms.update();
    buildings.update();
    gates.update();
    trees.update(world);
    orchard.update();
    workshops.update();
    wheel.update();
    animals.update(dt, speed > 0); // Course 3 (Law 6 - both update sites)
    people.update(dt, speed > 0);
    granary.update(dt, speed > 0);
    updateCard();
    updateChips(); // Course 2: the always-on progress chips (Law 6 - both update sites)

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
      (w) => w.material !== 'wood' && w.stonesLaid < w.stonesTotal,
    );
    const pileDry = world.stockpile < STONE_VOLUME;
    // the carry behind: the pile has stone, yet a hauled wall's face can't afford a
    // block — that wall waits on the ROAD, not the pit
    const carryBehind = pileDry
      ? undefined
      : stoneWalls.find((w) => w.haul !== null && w.faceBuffer < STONE_VOLUME);
    const hasStoneEconomy =
      nQuarries > 0 || world.adits.length > 0 || world.stockpile >= 1 || stoneWalls.length > 0;
    const bind = pileDry
      ? '⚒ waits on the quarry'
      : carryBehind
        ? `⚒ waits on the carry (${carryBehind.haul!.method})`
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
        : ` — won ${Math.round(world.stockpile)} m³ · layers ${paceSum()}/day → ${bind}${wheeling ? ' · ⚙ the great wheel turns' : ''}${forging ? ' · 🔨 the forge sharpens the irons' : ''}`;
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
    // SIM 29: the orchard bears food too — the readout mirrors the sim's fuller formula, so
    // "harvest N mouths" stays TRUE once fruit joins the grain (else the HUD would understate it)
    const orchardArea = world.farms.reduce((a, f) => (f.use === 'orchard' ? a + f.area : a), 0);
    const nGranaries = world.buildings.reduce((n, b) => (b.kind === 'granary' ? n + 1 : n), 0);
    const fieldYield =
      FOUNDING_CAPACITY + arableArea / AREA_PER_PERSON + orchardArea / ORCHARD_AREA_PER_PERSON;
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
      (nCarts ? ` — ${nCarts} cart${nCarts > 1 ? 's' : ''}` : '') +
      // SIM 29: the pasture's draft horses haul surplus to the store too — legible beside the carts
      (nPasture ? ` — ${nPasture} draft horse${nPasture > 1 ? 's' : ''}` : '');
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
              `~${Math.ceil(vol / earthPace())} days of barrowing`,
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
            `plan: roof — ${area.toFixed(0)} m² · ~${Math.ceil(area / earthPace())} days of decking · ` +
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
        // the ROAD for where this wall sits (SIM 17; its labour since SIM 39): stone won on
        // the spot, or carried — dearer up a hill, dearest across the gorge to a bridge. The
        // number quoted is what ONE HAND delivers, read through the sim's own routeCost, so
        // the row already counts any WAY the player has laid across the route (the parity law:
        // the pencil's promise is the sim's own arithmetic, imported, never re-derived).
        let haul = '';
        if (ring && planner.material !== 'wood' && rc?.kind !== 'farm') {
          const hv = haulVerdict(ring);
          if (hv) {
            const cost = routeCost(world, hv);
            const perHand = cost > 0 ? CARRIER_THROUGHPUT / (2 * cost) : CARRIER_THROUGHPUT;
            haul = ` · ${hv.method}, a hand carries ~${perHand.toFixed(2)} m³/day to the face`;
          } else {
            haul = ' · stone won on the spot';
          }
        }
        setText(
          plan,
          s
            ? `plan: ${name}${s.length.toFixed(0)} m · ${s.courses} courses · ` +
                `${s.stonesTotal.toLocaleString()} ${stuff} · ~${Math.ceil(s.stonesTotal / paceSum())} days${warn}${dress}${haul}`
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
    tracingFloor,
    trees,
    orchard,
    workshops,
    wheel,
    ways, // SIM 38: the causeway layer — sleeperCount is the probe's handle
    animals, // SIM 41: pokeable so a hidden tab can pump the draft horses onto the road
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
      adits.update();
      bellPits.update();
      shafts.update();
      piles.update(); // Course 2: the visible piles (Law 6 — BOTH update sites)
      ways.update(); // SIM 38: plank a hidden tab's causeway (rAF is paused)
      tracingFloor.update();
      roofs.update();
      farms.update();
      buildings.update();
      gates.update();
      trees.update(world);
      orchard.update(); // plant a hidden tab's orchard rows (rAF is paused)
      workshops.update(); // set a hidden tab's forge/yard props
      wheel.update(); // raise a hidden tab's cranes
      animals.update(0, false); // Course 3 (Law 6 - both update sites)
      people.update(0, false); // sync a hidden tab's crowd — positions AND the age-tint (was missing)
      granary.update(0, false); // place a hidden tab's sacks/cat (rAF is paused)
      updateCard();
      updateChips(); // Course 2: the always-on progress chips (Law 6 — both update sites)
      return world.tick;
    },
  };

  // Title screen: a fresh load opens the home; a New-Game reset OR a Load returns with
  // a one-shot token and drops straight into play (see newGame() / loadGame()). A load
  // that failed its guard (version/site) surfaces why, then falls back to the home.
  if (loadError) window.alert(`Could not open the kept castle — ${loadError}.`);
  const autostart = sessionStorage.getItem('freestone_autostart');
  sessionStorage.removeItem('freestone_autostart');
  if (autostart || loadedThisBoot) beginGame();
  else home.open(false);

  requestAnimationFrame(frame);
}

void boot();
