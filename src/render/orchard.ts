/**
 * The orchard made VISIBLE (the plain-renders debt, 2026-07-15): a designated ORCHARD is no
 * longer just a canopy-green ground tint (FarmLayer's ORCHARD band) — it wears orderly ROWS of
 * fruit trees, the tidy planted grid that sets an orchard apart from the wild gorge woods (which
 * the field grubbed clear when it was enclosed). The trees leaf green through the growing year
 * and turn russet-gold in the harvest season and the cold, mirroring the field's own ORCHARD band,
 * so the plot that now bears food (SIM 29) finally LOOKS like the thing that bears it.
 *
 * Render-side only and DETERMINISTIC (integer hashes on the planting grid — the sim rng is never
 * touched, no world state is written). Chunky Townscaper bodies like the woods, but smaller and
 * regular: an orchard tree is a compact thing in a straight row, not a bank-side tangle.
 */
import * as THREE from 'three';
import { pointInPolygon } from '../sim/step';
import { TICKS_PER_YEAR, type Farm, type WorldState } from '../sim/types';

const SPACING = 3.5; // meters between planted trees — an orchard's tidy rows
const MARGIN = 1.5; // keep trees this far inside the wall (a headland; no canopy on the coping)
const LIFT = 0.04; // the trunk's base set just into the ground

/** the orchard's two looks, coarsened from the crop year (mirrors farms.ts bandFor orchard) */
function inLeaf(tick: number): boolean {
  const d = tick % TICKS_PER_YEAR;
  return d >= 60 && d < 213; // SPRING..SUMMER leaf; GOLD/STUBBLE/WINTER turn & bare
}

function hash2(a: number, b: number): number {
  let x = (Math.imul(a + 1, 0x85ebca6b) ^ Math.imul(b + 1, 0xc2b2ae35)) >>> 0;
  x = Math.imul(x ^ (x >>> 15), 0x27d4eb2f) >>> 0;
  return ((x ^ (x >>> 15)) >>> 0) / 4294967296;
}

// shared scratch — single-threaded render
const _m = new THREE.Object3D();
const _tint = new THREE.Color();

interface OrchardView {
  canopies: THREE.InstancedMesh;
  trunks: THREE.InstancedMesh;
  heads: number[]; // per-tree hash, kept so recolour reproduces each tree's own tint
  leaf: boolean; // which look is currently shown
  colored: boolean;
}

export class OrchardLayer {
  private built = 0; // farms processed so far (by index, like FarmLayer)
  private views: OrchardView[] = [];

  constructor(
    private world: WorldState,
    private scene: THREE.Scene,
    private groundAt: (x: number, y: number) => number,
  ) {}

  update(): void {
    // absorb any newly designated orchard (the field grubbed its wild trees clear; we plant rows)
    while (this.built < this.world.farms.length) {
      const farm = this.world.farms[this.built]!;
      if (farm.use === 'orchard') this.plant(farm);
      this.built += 1;
    }
    // the year turns: swap leaf ↔ turn tint when the season crosses (cheap check per frame)
    const leaf = inLeaf(this.world.tick);
    for (const v of this.views) if (!v.colored || v.leaf !== leaf) this.colorize(v, leaf);
  }

  /** hide the orchard with the woods while the eye is underground; bring it back on the surface */
  setVisible(on: boolean): void {
    for (const v of this.views) {
      v.canopies.visible = on;
      v.trunks.visible = on;
    }
  }

  private plant(farm: Farm): void {
    const ring = farm.points;
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    for (const p of ring) {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    }
    // an orderly grid on the world axes (a PLANTED orchard, not a wild bank), a small jitter so
    // it reads hand-set not CAD. A tree stands only where the grid point sits inside the ring AND
    // clear of the wall by MARGIN (sample the four compass points inset) — no canopy on the coping.
    const trees: { x: number; y: number }[] = [];
    const gx0 = Math.ceil(minX / SPACING);
    const gx1 = Math.floor(maxX / SPACING);
    const gy0 = Math.ceil(minY / SPACING);
    const gy1 = Math.floor(maxY / SPACING);
    for (let gy = gy0; gy <= gy1; gy++) {
      for (let gx = gx0; gx <= gx1; gx++) {
        const x = gx * SPACING + (hash2(gx, gy * 7) - 0.5) * SPACING * 0.4;
        const y = gy * SPACING + (hash2(gx * 13, gy) - 0.5) * SPACING * 0.4;
        if (
          !pointInPolygon(x, y, ring) ||
          !pointInPolygon(x + MARGIN, y, ring) ||
          !pointInPolygon(x - MARGIN, y, ring) ||
          !pointInPolygon(x, y + MARGIN, ring) ||
          !pointInPolygon(x, y - MARGIN, ring)
        ) {
          continue;
        }
        trees.push({ x, y });
      }
    }
    if (trees.length === 0) return; // an orchard thinner than a tree shows none

    const canopyGeo = new THREE.IcosahedronGeometry(1, 0);
    const canopyMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
    const canopies = new THREE.InstancedMesh(canopyGeo, canopyMat, trees.length);
    const trunkGeo = new THREE.CylinderGeometry(0.1, 0.16, 1, 5);
    const trunkMat = new THREE.MeshLambertMaterial({ color: 0x6f5334 });
    const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, trees.length);
    canopies.frustumCulled = false;
    trunks.frustumCulled = false;

    const heads: number[] = [];
    for (let i = 0; i < trees.length; i++) {
      const t = trees[i]!;
      const h1 = hash2(Math.round(t.x * 10), Math.round(t.y * 10));
      const h2 = hash2(Math.round(t.y * 10) + 1, Math.round(t.x * 10) + 1);
      heads.push(h2);
      const g = this.groundAt(t.x, t.y);
      const trunkH = 1.0 + h1 * 0.5; // short, orchard-pruned, not a forest bole
      const r = 0.8 + h2 * 0.5; // a compact head
      _m.position.set(t.x, g + LIFT + trunkH + r * 0.55, t.y);
      _m.rotation.set(0, h1 * Math.PI * 2, 0);
      _m.scale.set(r * (0.9 + h2 * 0.2), r * (0.82 + h1 * 0.18), r * (0.9 + h1 * 0.2));
      _m.updateMatrix();
      canopies.setMatrixAt(i, _m.matrix);
      _m.position.set(t.x, g + LIFT + trunkH / 2, t.y);
      _m.rotation.set(0, 0, 0);
      _m.scale.set(1, trunkH, 1);
      _m.updateMatrix();
      trunks.setMatrixAt(i, _m.matrix);
    }
    this.scene.add(canopies, trunks);
    const view: OrchardView = { canopies, trunks, heads, leaf: false, colored: false };
    this.views.push(view);
    this.colorize(view, inLeaf(this.world.tick));
  }

  private colorize(v: OrchardView, leaf: boolean): void {
    for (let i = 0; i < v.heads.length; i++) {
      const h = v.heads[i]!;
      if (leaf) {
        // fruit trees in full leaf — a deep, close canopy green (mirrors ORCHARD_LEAF)
        _tint.setHSL(0.31 + h * 0.04, 0.44, 0.3 + h * 0.06);
      } else {
        // autumn into winter — leaves russet, a few golden heads where fruit hangs (ORCHARD_TURN)
        _tint.setHSL(0.06 + h * 0.07, 0.5, 0.4 + h * 0.08);
      }
      v.canopies.setColorAt(i, _tint);
    }
    if (v.canopies.instanceColor) v.canopies.instanceColor.needsUpdate = true;
    v.leaf = leaf;
    v.colored = true;
  }
}
