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
  classifyRing,
  effectiveGroundAt,
  nearestOnPolyline,
  planGates,
  polygonArea,
  ringSelfIntersects,
  ringSelfOverlaps,
  worldStep,
} from '../sim/step';
import { createWorld } from '../sim/world';
import {
  BUILDING_MIN_H,
  COURSE_HEIGHT,
  FARM_MIN_AREA,
  FARM_WALL_MAX_H,
  ROOF_SNAP,
  STONE_DEPTH,
  STONE_LEN,
  TICKS_PER_YEAR,
  type BuildingKind,
  type BuildingRoof,
  type Command,
  type FieldUse,
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
import { describeFootprint, KIND_LABEL, WallPlanner } from './planner';
import { TreeLayer } from './trees';
import { createHomeScreen } from './homescreen';
import { createTutorial } from './tutorial';

const SEED = 'durham-first-wall';
const STONE_CAPACITY = 20000;
const SPEEDS = [0, 1, 4, 16] as const; // ticks (game days) per real second — transport only

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
  for (const s of SPEEDS) {
    const b = document.createElement('button');
    b.textContent = s === 0 ? '❚❚' : `×${s}`;
    b.onclick = () => {
      speed = s;
      for (const other of buttons.children) other.classList.remove('active');
      b.classList.add('active');
    };
    if (s === speed) b.classList.add('active');
    buttons.appendChild(b);
  }

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
  build2.append(fillBtn, gateBtn, matBtn);
  build.after(build2);
  const build3 = document.createElement('div');
  const roofBtn = document.createElement('button');
  roofBtn.textContent = '⛉ roof (R)';
  const quarryBtn = document.createElement('button');
  quarryBtn.textContent = '⛏ quarry (Q)';
  const shapeBtn = document.createElement('button');
  shapeBtn.textContent = '⬓ flat fill';
  // no roof-material picker: the covering is chosen on the card AFTER the
  // span is drawn, like every designation (boss canon 2026-07-10 — default none)
  const undergroundBtn = document.createElement('button');
  undergroundBtn.textContent = '☷ underground (U)';
  build3.append(roofBtn, quarryBtn, shapeBtn, undergroundBtn);
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
      return enqueue(
        mode === 'fill'
          ? { kind: 'plan_fill', tick: world.tick, points, height, shape: planner.fillShape }
          : mode === 'roof'
            ? { kind: 'plan_roof', tick: world.tick, points } // covering asked after
            : { kind: 'plan_wall', tick: world.tick, points, height, material },
      );
    },
    onModeChange: (active, mode) => {
      wallBtn.classList.toggle('active', active && mode === 'wall');
      bldBtn.classList.toggle('active', active && mode === 'building');
      fillBtn.classList.toggle('active', active && mode === 'fill');
      gateBtn.classList.toggle('active', active && mode === 'gate');
      roofBtn.classList.toggle('active', active && mode === 'roof');
      quarryBtn.classList.toggle('active', active && mode === 'cut');
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
    { use: 'fallow', label: '🌿 fallow' },
  ];
  const SHELL_CHOICES: { use: BuildingKind; label: string }[] = [
    { use: 'house', label: '⌂ house' },
    { use: 'blacksmith', label: '⚒ blacksmith' },
    { use: 'tower', label: '🗼 tower' },
    { use: 'tavern', label: '🍺 tavern' },
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
  shapeBtn.onclick = () => {
    shapeBtn.textContent = planner.cycleFillShape() === 'flat' ? '⬓ flat fill' : '◿ ramp fill';
  };
  matBtn.onclick = () => {
    const m = planner.cycleMaterial();
    matBtn.textContent = m === 'wood' ? '🪵 wood' : '🪨 sandstone';
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
    for (let i = lastStoneCount; i < world.stones.length; i++) {
      const s = world.stones[i]!;
      dummy.position.set(s.pos[0], s.pos[2], s.pos[1]);
      dummy.rotation.set(0, -s.yaw, 0);
      dummy.updateMatrix();
      stones.setMatrixAt(i, dummy.matrix);
      // Per-stone tonal variation so the wall reads as coursework, not extrusion.
      // Render-side only, keyed on the stone's id — the sim rng is never touched here.
      const t = ((s.id * 2654435761) >>> 0) / 4294967296;
      const v = (((s.id * 40503) % 97) / 97 - 0.5);
      if (matById.get(s.wallId) === 'wood') {
        tint.setHSL(0.075 + t * 0.015, 0.42, 0.38 + v * 0.14); // weathered timber
      } else {
        // honey-toned Durham sandstone in warm daylight (SCOPE §8d)
        tint.setHSL(0.085 + t * 0.02, 0.34, 0.68 + v * 0.1);
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
      acc += dt * speed;
      while (acc >= 1) {
        worldStep(world, site, byTick.get(world.tick) ?? []);
        acc -= 1;
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
    updateCard();

    const year = Math.floor(world.tick / TICKS_PER_YEAR) + 1;
    const day = (world.tick % TICKS_PER_YEAR) + 1;
    const laid = world.walls.reduce((n, w) => n + w.stonesLaid, 0);
    const total = world.walls.reduce((n, w) => n + w.stonesTotal, 0);
    const nFarms = world.farms.filter((f) => f.use === 'farm').length;
    const nPaddocks = world.farms.filter((f) => f.use === 'livestock').length;
    const nFallow = world.farms.filter((f) => f.use === 'fallow').length;
    const nAsks =
      world.pending.length + world.roofs.filter((r) => r.material === null).length;
    const nQuarries = world.cuts.length;
    const holdings =
      (nFarms ? ` — farms ${nFarms}` : '') +
      (nPaddocks ? ` — paddocks ${nPaddocks}` : '') +
      (nFallow ? ` — fallow ${nFallow}` : '') +
      (world.buildings.length ? ` — buildings ${world.buildings.length}` : '') +
      (nQuarries ? ` — quarries ${nQuarries}` : '') +
      (world.stockpile >= 1 ? ` — stone ${Math.round(world.stockpile)} m³` : '') +
      (nAsks ? ` — ${nAsks} awaiting the word` : '');
    setText(
      status,
      `Year ${year}, day ${day} — stones ${laid}${total ? `/${total}` : ''} — ` +
        `souls ${world.people.length}${holdings} — site ${site.id}`,
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
        setText(
          plan,
          s
            ? `plan: ${name}${s.length.toFixed(0)} m · ${s.courses} courses · ` +
                `${s.stonesTotal.toLocaleString()} ${stuff} · ~${Math.ceil(s.stonesTotal / Math.max(1, paceSum))} days${warn}`
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
            ? 'the hill is bare — ⚒ wall (B) · ⌂ building (H) · ⛰ fill (F) · ⛏ quarry (Q) · right-drag to look, wheel to zoom'
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
