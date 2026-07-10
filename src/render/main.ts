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

function terrainMesh(site: SiteData): THREE.Mesh {
  // Decimate to at most ~257 vertices per axis for the render mesh; the SIM always
  // samples the full-resolution heightAt, so this is a display decision only.
  const step = Math.max(1, Math.ceil(Math.max(site.width, site.height) / 257));
  const w = Math.ceil(site.width / step) + 1;
  const h = Math.ceil(site.height / step) + 1;
  const positions = new Float32Array(w * h * 3);
  let p = 0;
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      // clamp the last row/column to the site edge so decimation leaves no void strip
      const x = Math.min(i * step * site.cellSize, site.extentX);
      const y = Math.min(j * step * site.cellSize, site.extentY);
      positions[p++] = x;
      positions[p++] = site.heightAt(x, y);
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
  const mat = new THREE.MeshLambertMaterial({ color: 0x6b7b57 });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.receiveShadow = false;
  return mesh;
}

async function boot(): Promise<void> {
  const site = await loadSite();
  const world = createWorld(SEED, site.id);

  // Demo intent for the groundwork build: one L-shaped wall near map center,
  // planned on day 5. M1 proper replaces this with player wall-drawing.
  const cx = site.extentX / 2;
  const cy = site.extentY / 2;
  const commandLog: Command[] = [
    {
      kind: 'plan_wall',
      tick: 5,
      points: [
        { x: cx - 30, y: cy },
        { x: cx + 30, y: cy },
        { x: cx + 30, y: cy + 40 },
      ],
      height: 4,
    },
  ];
  const byTick = new Map<number, Command[]>();
  for (const cmd of commandLog) {
    const bucket = byTick.get(cmd.tick);
    if (bucket) bucket.push(cmd);
    else byTick.set(cmd.tick, [cmd]);
  }

  // --- three.js scene ---
  const app = document.getElementById('app')!;
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  app.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x101210);
  scene.fog = new THREE.Fog(0x101210, 400, 2500);

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
  controls.update();

  scene.add(new THREE.HemisphereLight(0xcfd8dc, 0x2f2a20, 0.9));
  const sun = new THREE.DirectionalLight(0xfff3d6, 1.4);
  sun.position.set(300, 400, -200);
  scene.add(sun);

  scene.add(terrainMesh(site));

  const stoneGeo = new THREE.BoxGeometry(STONE_LEN, COURSE_HEIGHT, STONE_DEPTH);
  const stoneMat = new THREE.MeshLambertMaterial({ color: 0xb9a88f });
  const stones = new THREE.InstancedMesh(stoneGeo, stoneMat, STONE_CAPACITY);
  stones.count = 0;
  // InstancedMesh culls by the base geometry's bounds (one 0.45 m box at the origin),
  // which would blink the whole wall out of existence — cull per-frame ourselves: never.
  stones.frustumCulled = false;
  scene.add(stones);

  // --- HUD ---
  const hud = document.getElementById('hud')!;
  const status = document.createElement('div');
  const buttons = document.createElement('div');
  const attribution = document.createElement('div');
  attribution.style.opacity = '0.6';
  attribution.textContent = site.attribution || `terrain: ${site.id}`;
  hud.append(status, buttons, attribution);

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

  // --- sim/render loop; speed is transport only ---
  const dummy = new THREE.Object3D();
  const tint = new THREE.Color();
  let lastStoneCount = 0;
  let acc = 0;
  let lastTime = performance.now();

  function syncStones(): void {
    for (let i = lastStoneCount; i < world.stones.length && i < STONE_CAPACITY; i++) {
      const s = world.stones[i]!;
      dummy.position.set(s.pos[0], s.pos[2], s.pos[1]);
      dummy.rotation.set(0, -s.yaw, 0);
      dummy.updateMatrix();
      stones.setMatrixAt(i, dummy.matrix);
      // Per-stone tonal variation so the wall reads as coursework, not extrusion.
      // Render-side only, keyed on the stone's id — the sim rng is never touched here.
      const t = ((s.id * 2654435761) >>> 0) / 4294967296;
      tint.setHSL(0.09 + t * 0.02, 0.22, 0.55 + (((s.id * 40503) % 97) / 97 - 0.5) * 0.12);
      stones.setColorAt(i, tint);
    }
    if (world.stones.length !== lastStoneCount) {
      stones.count = Math.min(world.stones.length, STONE_CAPACITY);
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

    const year = Math.floor(world.tick / TICKS_PER_YEAR) + 1;
    const day = (world.tick % TICKS_PER_YEAR) + 1;
    const laid = world.walls.reduce((n, w) => n + w.stonesLaid, 0);
    const total = world.walls.reduce((n, w) => n + w.stonesTotal, 0);
    status.textContent =
      `Year ${year}, day ${day} — stones ${laid}${total ? `/${total}` : ''} — ` +
      `souls ${world.people.length} — site ${site.id}`;

    controls.update();
    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }

  window.addEventListener('resize', sizeToWindow);

  // Dev handle for kernel-truth checks from the preview console (read-only by law).
  /** The one legal write path into the sim: append to the log AND the tick index. */
  function enqueue(cmd: Command): boolean {
    if (cmd.tick < world.tick) return false; // the past is written; refuse quietly
    commandLog.push(cmd);
    const bucket = byTick.get(cmd.tick);
    if (bucket) bucket.push(cmd);
    else byTick.set(cmd.tick, [cmd]);
    return true;
  }

  (window as unknown as Record<string, unknown>).__cc = {
    world,
    site,
    commandLog,
    camera,
    controls,
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
