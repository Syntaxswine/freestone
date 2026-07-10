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
import { flatSite, siteFromHeightmap, type HeightmapJson, type SiteData } from '../sim/site';
import { worldStep } from '../sim/step';
import { createWorld } from '../sim/world';
import { COURSE_HEIGHT, STONE_DEPTH, STONE_LEN, TICKS_PER_YEAR, type Command } from '../sim/types';
import { PeopleLayer } from './people';
import { WallPlanner } from './planner';

const SEED = 'durham-first-wall';
const STONE_CAPACITY = 20000;
const SPEEDS = [0, 1, 4, 16] as const; // ticks (game days) per real second — transport only

async function loadSite(): Promise<SiteData> {
  try {
    const res = await fetch('/data/site-durham/heightmap.json');
    if (!res.ok) throw new Error(`${res.status}`);
    const json = (await res.json()) as HeightmapJson;
    return siteFromHeightmap(json);
  } catch (err) {
    console.warn('site data unavailable, using flat placeholder:', err);
    return flatSite('flat-placeholder', 1000);
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
  const hMinus = document.createElement('button');
  hMinus.textContent = '−';
  const hVal = document.createElement('span');
  hVal.style.margin = '0 6px 0 2px';
  const hPlus = document.createElement('button');
  hPlus.textContent = '+';
  build.append(wallBtn, hMinus, hVal, hPlus);

  // --- the pencil and the people ---
  const planner = new WallPlanner({
    scene,
    camera,
    site,
    groundAt: terrain.groundAt,
    heightBounds: { min: terrain.minH, max: terrain.maxH },
    dom: renderer.domElement,
    onConfirm: (points, height) =>
      enqueue({ kind: 'plan_wall', tick: world.tick, points, height }),
    onModeChange: (active) => wallBtn.classList.toggle('active', active),
  });
  const people = new PeopleLayer(world, site, scene, terrain.groundAt);
  const paceSum = world.people.reduce((n, p) => n + p.pace, 0);

  wallBtn.onclick = () => planner.toggle();
  hMinus.onclick = () => planner.setHeight(planner.height - 0.5);
  hPlus.onclick = () => planner.setHeight(planner.height + 0.5);

  /** assign only on change — the HUD repaints every frame otherwise */
  function setText(el: HTMLElement, text: string): void {
    if (el.textContent !== text) el.textContent = text;
  }

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
    for (let i = lastStoneCount; i < world.stones.length; i++) {
      const s = world.stones[i]!;
      dummy.position.set(s.pos[0], s.pos[2], s.pos[1]);
      dummy.rotation.set(0, -s.yaw, 0);
      dummy.updateMatrix();
      stones.setMatrixAt(i, dummy.matrix);
      // Per-stone tonal variation so the wall reads as coursework, not extrusion.
      // Render-side only, keyed on the stone's id — the sim rng is never touched here.
      const t = ((s.id * 2654435761) >>> 0) / 4294967296;
      // honey-toned Durham sandstone in warm daylight (SCOPE §8d)
      tint.setHSL(0.085 + t * 0.02, 0.34, 0.68 + (((s.id * 40503) % 97) / 97 - 0.5) * 0.1);
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
    acc += dt * speed;
    while (acc >= 1) {
      worldStep(world, site, byTick.get(world.tick) ?? []);
      acc -= 1;
    }
    syncStones();
    people.update(dt, speed > 0);

    const year = Math.floor(world.tick / TICKS_PER_YEAR) + 1;
    const day = (world.tick % TICKS_PER_YEAR) + 1;
    const laid = world.walls.reduce((n, w) => n + w.stonesLaid, 0);
    const total = world.walls.reduce((n, w) => n + w.stonesTotal, 0);
    setText(
      status,
      `Year ${year}, day ${day} — stones ${laid}${total ? `/${total}` : ''} — ` +
        `souls ${world.people.length} — site ${site.id}`,
    );

    setText(hVal, `h ${planner.height.toFixed(1)} m`);
    if (planner.active) {
      const s = planner.stats();
      setText(
        plan,
        s
          ? `plan: ${s.length.toFixed(0)} m · ${s.courses} courses · ` +
              `${s.stonesTotal.toLocaleString()} stones · ~${Math.ceil(s.stonesTotal / Math.max(1, paceSum))} days`
          : 'plan: click the ground to start the line',
      );
      setText(
        hint,
        'click: place · right-click/Backspace: undo · double-click/Enter: lay it · Esc: put the pencil down',
      );
    } else {
      setText(plan, '');
      // a committed command applies at the start of its tick — while paused it is
      // real but invisible, and the HUD must not claim the hill is bare
      const pending = commandLog.some((c) => c.tick >= world.tick);
      setText(
        hint,
        pending
          ? speed === 0
            ? 'wall committed — press ×1 to break ground'
            : 'wall committed — the crew takes it up'
          : world.walls.length === 0
            ? 'the hill is bare — press ⚒ wall (or B) and draw the first line'
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
    renderer,
    scene, // renderer+scene exposed so a hidden tab can render one frame on demand
    enqueue, // pushing to __cc.commandLog directly does nothing — this is the way in
    /** dev-only manual stepper (hidden tabs pause rAF); still goes through the law */
    step: (n: number) => {
      for (let i = 0; i < n; i++) worldStep(world, site, byTick.get(world.tick) ?? []);
      syncStones();
      return world.tick;
    },
  };

  requestAnimationFrame(frame);
}

void boot();
