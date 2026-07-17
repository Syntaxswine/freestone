/**
 * THE ANIMALS (VISIBLE WORK Course 3, boss: "pastures should have animated horses,
 * cows, or pigs" — flagged low priority, delivered on the granary-cat pattern):
 *  - a PASTURE keeps its DRAFT HORSE — sim-true since SIM 29 (each pasture's horse
 *    hauls surplus to the store; the HUD already counted them, now the eye does).
 *    Since SIM 41 that horse hauls STONE too, so when the settlement is horse-hauling
 *    a wall its horse LEAVES the paddock and plods the haul route between pile and
 *    face — the sim's own errand made visible, THE VISIBLE WORK's thesis kept for the
 *    mechanic that bears its name. When nothing is hauling it ambles the paddock;
 *  - a PADDOCK (livestock) grazes a couple of cows/pigs — DECOR-PENDING-THE-HERDS
 *    system (BACKLOG reserves real herds; the sim holds no animal records yet, and
 *    the record on screen must never claim otherwise — these are the paddock's
 *    dressing, named as such, exactly like the granary cat).
 * Pixel billboards, two frames (graze/step), wandering on the render clock + integer
 * hashes — never the sim rng. Render reads, never writes.
 */
import * as THREE from 'three';
import type { Farm, Vec2, WorldState } from '../sim/types';
import { pointInPolygon } from '../sim/step';

const FRAME_W = 32;
const FRAME_H = 24;
const FRAMES = 2;

function hash2(a: number, b: number): number {
  let x = (Math.imul(a, 0x85ebca6b) ^ Math.imul(b + 1, 0xc2b2ae35)) >>> 0;
  x = Math.imul(x ^ (x >>> 15), 0x27d4eb2f) >>> 0;
  return ((x ^ (x >>> 15)) >>> 0) / 4294967296;
}

type Kind = 'horse' | 'cow' | 'pig';

function animalTexture(kind: Kind, seed: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = FRAME_W * FRAMES;
  canvas.height = FRAME_H;
  const ctx = canvas.getContext('2d')!;
  const body =
    kind === 'horse'
      ? ['#6b4a34', '#4a3324', '#7d5a40'][seed % 3]!
      : kind === 'cow'
        ? ['#e8e0d0', '#5a4a3a', '#c9b8a0'][seed % 3]!
        : ['#d8a090', '#c08878'][seed % 2]!;
  const dark = '#2b2620';
  for (let f = 0; f < FRAMES; f++) {
    const ox = f * FRAME_W;
    const P = (x: number, y: number, w: number, h: number, c: string): void => {
      ctx.fillStyle = c;
      ctx.fillRect(ox + x, y, w, h);
    };
    if (kind === 'horse') {
      P(6, 8, 18, 8, body); // barrel
      P(20, 3, 6, 8, body); // neck up
      P(24, 2, 6, 4, body); // head
      P(29, 4, 2, 2, dark); // muzzle
      P(20, 1, 2, 3, dark); // mane tuft
      P(4, 8, 3, 6, body); // haunch
      P(2, 9, 3, 2, body); // tail root
      P(1, 10, 2, 5, dark); // tail
      // legs: frame 1 steps
      const step = f === 1 ? 2 : 0;
      P(8, 16, 2, 7, body);
      P(12 + step, 16, 2, 7, body);
      P(18, 16, 2, 7, body);
      P(22 - step, 16, 2, 7, body);
    } else if (kind === 'cow') {
      P(5, 9, 20, 9, body);
      P(23, 5, 6, 7, body); // head low, grazing-ish
      P(24, 3, 1, 3, dark); // horn
      P(27, 3, 1, 3, dark);
      P(3, 9, 3, 4, body);
      P(2, 10, 1, 6, dark); // tail
      // patches on the pale coats
      if (seed % 3 === 0) {
        P(9, 10, 4, 4, '#5a4a3a');
        P(17, 12, 4, 4, '#5a4a3a');
      }
      const step = f === 1 ? 2 : 0;
      P(7, 18, 2, 5, body);
      P(11 + step, 18, 2, 5, body);
      P(18, 18, 2, 5, body);
      P(22 - step, 18, 2, 5, body);
    } else {
      P(8, 12, 16, 7, body); // low round pig
      P(22, 10, 6, 6, body);
      P(27, 12, 2, 2, '#a06858'); // snout
      P(6, 12, 3, 4, body);
      P(5, 12, 1, 2, body); // curl of tail (a pixel's gesture)
      const step = f === 1 ? 1 : 0;
      P(10, 19, 2, 4, body);
      P(13 + step, 19, 2, 4, body);
      P(19, 19, 2, 4, body);
      P(22 - step, 19, 2, 4, body);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.repeat.set(1 / FRAMES, 1);
  return tex;
}

interface Beast {
  farmId: number;
  sprite: THREE.Sprite;
  tex: THREE.CanvasTexture;
  x: number;
  y: number;
  tx: number;
  ty: number;
  seed: number;
  shownFrame: number;
  facing: 1 | -1;
}

export class AnimalLayer {
  private beasts: Beast[] = [];
  private clock = 0;
  private visibleFlag = true;

  constructor(
    private world: WorldState,
    private scene: THREE.Scene,
    private groundAt: (x: number, y: number) => number,
  ) {}

  /** hide the herds with the woods while the eye is underground */
  setVisible(on: boolean): void {
    this.visibleFlag = on;
    for (const b of this.beasts) b.sprite.visible = on;
  }

  private spawnFor(farm: Farm, kind: Kind, count: number): void {
    for (let i = 0; i < count; i++) {
      const seed = farm.id * 7 + i;
      const tex = animalTexture(kind, seed);
      const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, alphaTest: 0.5 });
      const sprite = new THREE.Sprite(mat);
      sprite.center.set(0.5, 0.05);
      const h = kind === 'horse' ? 1.5 : kind === 'cow' ? 1.3 : 0.85;
      sprite.scale.set(h * (FRAME_W / FRAME_H), h, 1);
      sprite.visible = this.visibleFlag;
      this.scene.add(sprite);
      const at = this.spotIn(farm, seed, 0);
      this.beasts.push({
        farmId: farm.id,
        sprite,
        tex,
        x: at.x,
        y: at.y,
        tx: at.x,
        ty: at.y,
        seed,
        shownFrame: -1,
        facing: 1,
      });
    }
  }

  /** a deterministic point INSIDE the ring (rejection-sample by hash, capped) */
  private spotIn(farm: Farm, seed: number, slice: number): Vec2 {
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    for (const p of farm.points) {
      minX = Math.min(minX, p.x);
      maxX = Math.max(maxX, p.x);
      minY = Math.min(minY, p.y);
      maxY = Math.max(maxY, p.y);
    }
    for (let k = 0; k < 8; k++) {
      const x = minX + hash2(seed, slice * 17 + k) * (maxX - minX);
      const y = minY + hash2(seed, slice * 23 + k + 101) * (maxY - minY);
      if (farm.points.length >= 3 && pointInPolygon(x, y, farm.points)) return { x, y };
    }
    return { x: (minX + maxX) / 2, y: (minY + maxY) / 2 };
  }

  /** the route the draft horses haul today (SIM 41): the oldest active hauled STONE wall's
   *  road (pile → face). Null when nothing is being horse-hauled, so the horses stay home.
   *  Render-only read of sim data — the same oldest-first order the sim serves. */
  private horseHaulRoute(): { from: Vec2; to: Vec2 } | null {
    const pastures = this.world.farms.some((f) => f.use === 'pasture');
    if (!pastures) return null;
    for (const w of this.world.walls) {
      if (w.haul === null || w.material === 'wood') continue;
      if (w.stonesLaid >= w.stonesTotal) continue;
      return { from: w.haul.from, to: w.haul.to };
    }
    return null;
  }

  update(dt: number, simActive: boolean): void {
    // absorb new pastures/paddocks (one-shot per farm — farms never un-designate today)
    const have = new Set(this.beasts.map((b) => b.farmId));
    for (const f of this.world.farms) {
      if (have.has(f.id) || f.points.length < 3) continue;
      if (f.use === 'pasture') {
        this.spawnFor(f, 'horse', 1); // sim-true: SIM 29's draft horse, one per pasture
      } else if (f.use === 'livestock') {
        // decor-pending-the-herds-system (the granary-cat precedent, named honestly)
        this.spawnFor(f, hash2(f.id, 5) < 0.5 ? 'cow' : 'pig', 2);
      }
    }
    if (simActive) this.clock += dt;
    const haulRoute = this.horseHaulRoute(); // SIM 41: are the horses out on the road?
    let horseSlot = 0;
    for (const b of this.beasts) {
      const farm = this.world.farms.find((f) => f.id === b.farmId);
      if (!farm) continue;
      // SIM 41 — THE HORSE AT WORK: while the settlement is horse-hauling stone, each pasture's
      // horse plods the route between pile and face (a triangle wave: loaded out, empty back),
      // spread along the road by its slot so a team reads as a team. Otherwise it ambles home.
      if (farm.use === 'pasture' && haulRoute) {
        const lane = horseSlot++;
        const phase = (this.clock * 0.06 + lane * 0.31) % 1;
        const t = phase < 0.5 ? phase * 2 : 2 - phase * 2; // pile(0) → face(1) → pile(0)
        const off = (hash2(b.seed, lane) - 0.5) * 6; // fan the team off the centre line
        b.tx = haulRoute.from.x + (haulRoute.to.x - haulRoute.from.x) * t + off;
        b.ty = haulRoute.from.y + (haulRoute.to.y - haulRoute.from.y) * t + off;
        const dx = b.tx - b.x;
        const dy = b.ty - b.y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d > 0.4 && simActive) {
          const step = Math.min((dt * 1.1) / d, 1); // a working horse steps out (faster than a graze)
          b.x += dx * step;
          b.y += dy * step;
          if (Math.abs(dx) > 0.02) b.facing = dx >= 0 ? 1 : -1;
        }
        const frame = simActive ? Math.floor(this.clock * 2 + b.seed) % 2 : 0;
        if (frame !== b.shownFrame) {
          b.shownFrame = frame;
          b.tex.repeat.x = b.facing / FRAMES;
          b.tex.offset.x = (frame + (b.facing < 0 ? 1 : 0)) / FRAMES;
        }
        b.sprite.position.set(b.x, this.groundAt(b.x, b.y), b.y);
        continue;
      }
      // amble to a fresh spot every ~9 s of watched time
      const slice = Math.floor(this.clock / 9) + b.seed;
      const want = this.spotIn(farm, b.seed, slice);
      b.tx = want.x;
      b.ty = want.y;
      const dx = b.tx - b.x;
      const dy = b.ty - b.y;
      const d = Math.sqrt(dx * dx + dy * dy);
      const walking = d > 0.4 && simActive;
      if (walking) {
        const t = Math.min(((simActive ? dt : 0) * 0.55) / d, 1);
        b.x += dx * t;
        b.y += dy * t;
        if (Math.abs(dx) > 0.02) b.facing = dx >= 0 ? 1 : -1;
      }
      const frame = walking ? (Math.floor(this.clock * 2 + b.seed) % 2) : 0;
      if (frame !== b.shownFrame) {
        b.shownFrame = frame;
        b.tex.repeat.x = b.facing / FRAMES;
        b.tex.offset.x = (frame + (b.facing < 0 ? 1 : 0)) / FRAMES;
      }
      b.sprite.position.set(b.x, this.groundAt(b.x, b.y), b.y);
    }
  }
}
