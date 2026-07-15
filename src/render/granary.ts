/**
 * The granary comes alive (step 3b): each designated granary grows a small
 * YARD on its south face — a few plump grain sacks (the store spilling out)
 * and a CAT that prowls them. The cat is the mouser every real granary kept:
 * grain draws mice, mice draw the cat. Pure presentation — derived from sim
 * truth (which buildings are granaries) but never touching the sim; positions
 * are theater, the wander is driven by the render clock + an integer hash, not
 * the sim rng (SCOPE §11 law: render reads, never writes).
 *
 * Sprites and sacks stand on the DISPLAYED terrain surface (groundAt), not the
 * full-res site heights, so nothing buries its feet on steep ground.
 */
import * as THREE from 'three';
import type { SiteData } from '../sim/site';
import type { WorldState } from '../sim/types';

const FRAME_W = 20;
const FRAME_H = 16;
const FRAMES = 4; // 0 sit · 1 walk-a · 2 walk-b · 3 crouch/pounce
const CAT_H = 0.52; // world meters, shoulder-high plus the sitting stretch
const CAT_W = CAT_H * (FRAME_W / FRAME_H);

const WANDER_R = 3.0; // m the cat roams around its yard
const ARRIVE = 0.25; // m: close enough to a walk target to settle
const SIT_MIN = 3.0; // s a settled cat holds before moving on
const SIT_VAR = 5.0; // s of extra dwell, hash-varied
const POUNCE_CHANCE = 0.25; // a settle is sometimes a crouch at the sacks

interface CatPalette {
  c: string; // coat
  bel: string; // paler belly
  dk: string; // stripes / shadow / tail tip
  ey: string; // eye
}
// four coats a village cat actually wears — tabby, ginger, sooty, and grey-white
const COATS: CatPalette[] = [
  { c: '#7f7a6e', bel: '#b3ad9e', dk: '#565247', ey: '#9fae6a' },
  { c: '#b0743c', bel: '#dcc094', dk: '#83501f', ey: '#a7b86a' },
  { c: '#33302c', bel: '#45403a', dk: '#22201d', ey: '#c2b45a' },
  { c: '#c6c1b4', bel: '#e6e2d7', dk: '#8f897b', ey: '#8fae7a' },
];

function h2(a: number, b: number): number {
  let x = (Math.imul(a, 0x85ebca6b) ^ Math.imul(b + 1, 0xc2b2ae35)) >>> 0;
  x = Math.imul(x ^ (x >>> 15), 0x27d4eb2f) >>> 0;
  return ((x ^ (x >>> 15)) >>> 0) / 4294967296;
}

/** Draw one 20×16 side-profile cat pose, facing right; runtime UV-flips for left. */
function drawCat(ctx: CanvasRenderingContext2D, pose: number, p: CatPalette): void {
  const P = (x: number, y: number, w: number, hgt: number, col: string): void => {
    ctx.fillStyle = col;
    ctx.fillRect(x, y, w, hgt);
  };
  if (pose === 0) {
    // SIT — upright, seen from the side, head high, tail curling up behind
    P(6, 6, 6, 6, p.c); // upright chest
    P(7, 9, 4, 2, p.bel); // pale belly
    P(12, 8, 2, 4, p.c); // haunch
    P(7, 3, 5, 4, p.c); // head
    P(7, 2, 1, 1, p.c);
    P(11, 2, 1, 1, p.c); // two pricked ears
    P(10, 5, 1, 1, p.ey); // eye (facing right)
    P(6, 11, 2, 3, p.c);
    P(10, 11, 2, 3, p.c); // front legs planted
    P(13, 6, 2, 2, p.c); // tail curls up the back...
    P(14, 4, 1, 3, p.c);
    P(14, 3, 1, 1, p.dk); // ...to a dark tip
  } else if (pose === 3) {
    // CROUCH — flat and low, the pounce coiled, tail streaming back
    P(3, 9, 11, 4, p.c); // long low body
    P(4, 12, 9, 1, p.bel);
    P(12, 8, 5, 3, p.c); // head lowered, forward
    P(12, 7, 1, 1, p.c);
    P(16, 7, 1, 1, p.c); // ears
    P(15, 9, 1, 1, p.ey);
    P(4, 13, 2, 2, p.c);
    P(11, 13, 2, 2, p.c); // legs tucked under
    P(1, 10, 3, 1, p.c);
    P(0, 10, 1, 1, p.dk); // tail low, twitching
  } else {
    // WALK — two strides (1 and 2) differ only in the leg swing
    const a = pose === 1;
    P(3, 7, 11, 4, p.c); // long low body
    P(4, 10, 9, 1, p.bel); // thin pale underline
    P(11, 4, 6, 4, p.c); // head forward-right
    P(11, 3, 1, 1, p.c);
    P(15, 3, 1, 1, p.c); // two ears
    P(14, 6, 1, 1, p.ey); // eye
    // faint spine stripes for the tabby-ish coats (dk ≠ coat)
    P(5, 7, 1, 1, p.dk);
    P(8, 7, 1, 1, p.dk);
    // upright tail sweeping up off the rump (behind, to the left)
    P(2, 5, 2, 2, p.c);
    P(1, 3, 2, 2, p.c);
    P(1, 2, 1, 1, p.dk);
    // legs: front and rear swing opposite between the two strides
    P(a ? 12 : 11, 11, 2, 4, p.c); // front
    P(a ? 4 : 5, 11, 2, 4, p.c); // rear
    P(a ? 8 : 9, 11, 1, 3, p.dk); // the lifted mid leg, in shadow
  }
}

function catTexture(kind: number): THREE.CanvasTexture {
  const pal = COATS[kind % COATS.length]!;
  const canvas = document.createElement('canvas');
  canvas.width = FRAME_W * FRAMES;
  canvas.height = FRAME_H;
  const ctx = canvas.getContext('2d')!;
  for (let f = 0; f < FRAMES; f++) {
    ctx.save();
    ctx.translate(f * FRAME_W, 0);
    drawCat(ctx, f, pal);
    ctx.restore();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.repeat.set(1 / FRAMES, 1);
  return tex;
}

interface Cat {
  yardX: number;
  yardY: number;
  sprite: THREE.Sprite;
  tex: THREE.CanvasTexture;
  x: number;
  y: number;
  z: number;
  tx: number;
  ty: number;
  facing: 1 | -1;
  shownFrame: number;
  shownFacing: 1 | -1;
  speed: number;
  seed: number;
  step: number; // retarget counter — the deterministic wander sequence
  mode: 'walk' | 'sit' | 'crouch';
  dwellEnd: number;
}

export class GranaryLayer {
  private seen = 0; // buildings processed (granaries claimed as we pass them)
  private cats: Cat[] = [];
  private clock = 0;
  private sackGeo = new THREE.SphereGeometry(0.5, 8, 6);
  private sackMats = [
    new THREE.MeshLambertMaterial({ color: 0xb8a06e }),
    new THREE.MeshLambertMaterial({ color: 0xa89060 }),
  ];
  private knotMat = new THREE.MeshLambertMaterial({ color: 0x6f5f3f });

  constructor(
    private world: WorldState,
    private site: SiteData,
    private scene: THREE.Scene,
    private groundAt: (x: number, y: number) => number,
  ) {}

  /** Claim any newly designated granaries (mirrors BuildingLayer's incremental pass). */
  private absorb(): void {
    while (this.seen < this.world.buildings.length) {
      const b = this.world.buildings[this.seen]!;
      this.seen += 1;
      if (b.kind !== 'granary') continue;
      const wall = this.world.walls.find((w) => w.id === b.wallId);
      if (!wall || wall.points.length === 0) continue;

      // centroid + bounding radius of the footprint → a yard on the south face
      let cx = 0;
      let cy = 0;
      for (const q of wall.points) {
        cx += q.x;
        cy += q.y;
      }
      cx /= wall.points.length;
      cy /= wall.points.length;
      let rad = 0;
      for (const q of wall.points) {
        const dd = Math.hypot(q.x - cx, q.y - cy);
        if (dd > rad) rad = dd;
      }
      const yardX = cx;
      const yardY = cy - (rad + 1.6); // south of the store, facing the default view

      // a little pile of sacks — the store spilling into the yard
      const sacks = 3 + Math.floor(h2(b.id, 2) * 2); // 3 or 4
      for (let i = 0; i < sacks; i++) {
        const ox = (h2(b.id, i * 3 + 1) - 0.5) * 1.4;
        const oy = (h2(b.id, i * 3 + 2) - 0.5) * 1.0;
        const sx = yardX + ox;
        const sy = yardY + oy;
        const g = this.groundAt(sx, sy);
        const sack = new THREE.Mesh(this.sackGeo, this.sackMats[i % 2]!);
        sack.scale.set(0.28, 0.42, 0.28);
        sack.position.set(sx, g + 0.42 * 0.5, sy);
        sack.frustumCulled = false;
        this.scene.add(sack);
        const knot = new THREE.Mesh(this.sackGeo, this.knotMat);
        knot.scale.set(0.12, 0.1, 0.12);
        knot.position.set(sx, g + 0.42 * 0.5 + 0.2, sy);
        knot.frustumCulled = false;
        this.scene.add(knot);
      }

      // the cat — one mouser per granary, coat by id
      const tex = catTexture(b.id);
      const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, alphaTest: 0.5 });
      const sprite = new THREE.Sprite(mat);
      sprite.center.set(0.5, 0.05); // anchor near the feet
      sprite.scale.set(CAT_W, CAT_H, 1);
      this.scene.add(sprite);
      const sx = yardX + (h2(b.id, 41) - 0.5) * 2;
      const sy = yardY + (h2(b.id, 43) - 0.5) * 2;
      this.cats.push({
        yardX,
        yardY,
        sprite,
        tex,
        x: sx,
        y: sy,
        z: this.groundAt(sx, sy),
        tx: sx,
        ty: sy,
        facing: 1,
        shownFrame: -1,
        shownFacing: 1,
        speed: 0.6 + h2(b.id, 7) * 0.35,
        seed: b.id * 131 + 7,
        step: 0,
        mode: 'sit',
        dwellEnd: 0,
      });
    }
  }

  /** dt in real seconds; simActive=false (paused) freezes the diorama. */
  update(dt: number, simActive: boolean): void {
    this.absorb();
    if (simActive) this.clock += dt;
    const step = simActive ? dt : 0;

    for (const cat of this.cats) {
      const dx = cat.tx - cat.x;
      const dy = cat.ty - cat.y;
      const d = Math.hypot(dx, dy);

      if (cat.mode === 'walk' && d < ARRIVE) {
        // settle: mostly a sit, sometimes a crouch to mouse the sacks
        cat.mode = h2(cat.seed, cat.step * 2 + 1) < POUNCE_CHANCE ? 'crouch' : 'sit';
        cat.dwellEnd = this.clock + SIT_MIN + h2(cat.seed, cat.step * 2) * SIT_VAR;
      } else if (cat.mode !== 'walk' && this.clock >= cat.dwellEnd) {
        // pick the next spot in the yard and pad over to it
        cat.step += 1;
        const ang = h2(cat.seed, cat.step * 5) * Math.PI * 2;
        const r = 0.6 + h2(cat.seed, cat.step * 5 + 1) * WANDER_R;
        cat.tx = cat.yardX + Math.cos(ang) * r;
        cat.ty = cat.yardY + Math.sin(ang) * r;
        cat.mode = 'walk';
      }

      let frame = cat.mode === 'crouch' ? 3 : 0;
      if (cat.mode === 'walk') {
        const stride = cat.speed * step;
        if (d > 0.001 && stride > 0) {
          const t = Math.min(stride / d, 1);
          cat.x += dx * t;
          cat.y += dy * t;
          if (Math.abs(dx) > 0.02) cat.facing = dx >= 0 ? 1 : -1;
        }
        frame = 1 + (Math.floor(this.clock * 3 * (0.6 + cat.speed)) % 2); // 1 or 2
      }

      const g = this.groundAt(cat.x, cat.y);
      cat.z += (g - cat.z) * Math.min(1, step * 4);

      if (frame !== cat.shownFrame || cat.facing !== cat.shownFacing) {
        cat.shownFrame = frame;
        cat.shownFacing = cat.facing;
        cat.tex.repeat.x = cat.facing / FRAMES;
        cat.tex.offset.x = (frame + (cat.facing < 0 ? 1 : 0)) / FRAMES;
      }
      cat.sprite.position.set(cat.x, cat.z, cat.y);
    }
  }
}
