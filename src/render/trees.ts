/**
 * The woods (SCOPE §8d look, §5a site truth): Durham's gorge banks are
 * genuinely wooded and its plateau open, so trees grow where the slope is
 * steep and thin out on the flat — placement is TERRAIN ANALYSIS, not decor.
 * Townscaper-chunky: one icosahedron canopy blob + a stubby trunk, instanced,
 * sage greens with per-tree variation.
 *
 * Render-side only and deterministic (integer hashes on grid cells — the sim
 * rng is never touched). When the wood economy lands (BACKLOG), these become
 * countable timber; today the crew simply CLEARS them where work begins:
 * a planned wall or fill removes the trees in its path.
 */
import * as THREE from 'three';
import type { SiteData } from '../sim/site';
import { pointInPolygon, pointAt, polylineLength } from '../sim/step';
import { TIMBER_PER_TREE, type Vec2, type WorldState } from '../sim/types';

const GRID = 8.5; // meters between planting candidates — banks must read as WOODS
const SLOPE_WOODS = 0.32; // rise/run above which the banks wear their woods
const RIVER_BAND = 34; // meters AOD — below this is the Wear and its shingle
const CLEAR_R = 2.5; // meters cleared either side of new work
const CELL = 16; // spatial-hash cell size for clearing queries

function hash2(a: number, b: number): number {
  let x = (Math.imul(a + 1, 0x85ebca6b) ^ Math.imul(b + 1, 0xc2b2ae35)) >>> 0;
  x = Math.imul(x ^ (x >>> 15), 0x27d4eb2f) >>> 0;
  return ((x ^ (x >>> 15)) >>> 0) / 4294967296;
}

// shared scratch for (re)placing a tree's instance matrices — single-threaded
const _m = new THREE.Object3D();
const _tint = new THREE.Color();

interface Tree {
  x: number;
  y: number;
  alive: boolean;
}

export class TreeLayer {
  private trees: Tree[] = [];
  private grid = new Map<number, number[]>();
  private canopies: THREE.InstancedMesh;
  private trunks: THREE.InstancedMesh;
  private lastWallCount = 0;
  private lastFillCount = 0;
  private lastFarmCount = 0;
  private lastBuildingCount = 0;
  /** stand id → the tree indices it felled, so regrowth brings back exactly those */
  private feltStands = new Map<number, number[]>();
  count = 0;

  constructor(
    site: SiteData,
    private groundAt: (x: number, y: number) => number,
    scene: THREE.Scene,
  ) {
    // --- plant by terrain analysis ---
    const cx = site.extentX / 2;
    const cy = site.extentY / 2;
    for (let gy = 1; gy * GRID < site.extentY - GRID; gy++) {
      for (let gx = 1; gx * GRID < site.extentX - GRID; gx++) {
        const jx = (hash2(gx, gy * 7) - 0.5) * GRID * 0.9;
        const jy = (hash2(gx * 13, gy) - 0.5) * GRID * 0.9;
        const x = gx * GRID + jx;
        const y = gy * GRID + jy;
        const g = groundAt(x, y);
        if (g < RIVER_BAND) continue; // no trees in the Wear
        const dzx = groundAt(x + 6, y) - groundAt(x - 6, y);
        const dzy = groundAt(x, y + 6) - groundAt(x, y - 6);
        const slope = Math.sqrt(dzx * dzx + dzy * dzy) / 12;
        // keep the working green open around the founding camp
        const dc = Math.sqrt((x - cx) * (x - cx) + (y - cy) * (y - cy));
        if (dc < 120) continue;
        const roll = hash2(gx * 31, gy * 17);
        const p = slope > SLOPE_WOODS ? 0.95 : slope > 0.22 ? 0.3 : 0.012;
        if (roll < p) this.trees.push({ x, y, alive: true });
      }
    }
    this.count = this.trees.length;

    // --- spatial hash for clearing queries ---
    this.trees.forEach((t, i) => {
      const key = Math.floor(t.x / CELL) * 100000 + Math.floor(t.y / CELL);
      const bucket = this.grid.get(key);
      if (bucket) bucket.push(i);
      else this.grid.set(key, [i]);
    });

    // --- chunky instanced bodies ---
    const canopyGeo = new THREE.IcosahedronGeometry(1, 0);
    const canopyMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
    this.canopies = new THREE.InstancedMesh(canopyGeo, canopyMat, this.trees.length);
    const trunkGeo = new THREE.CylinderGeometry(0.14, 0.24, 1, 5);
    const trunkMat = new THREE.MeshLambertMaterial({ color: 0x76573c });
    this.trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, this.trees.length);
    this.canopies.frustumCulled = false;
    this.trunks.frustumCulled = false;

    for (let i = 0; i < this.trees.length; i++) this.placeTree(i);
    scene.add(this.canopies, this.trunks);
  }

  /**
   * Write tree i's canopy + trunk instance matrices and colour. DETERMINISTIC from
   * the tree's index (integer hashes), so a felled tree regrows to exactly its old
   * form. Does not flag needsUpdate — the constructor uploads once via scene.add;
   * regrowth flags it after (restoreTree).
   */
  private placeTree(i: number): void {
    const t = this.trees[i]!;
    const h1 = hash2(i, 5);
    const h2 = hash2(i, 11);
    const g = this.groundAt(t.x, t.y);
    const trunkH = 1.0 + h1 * 1.2;
    const r = 1.2 + h2 * 1.6;
    _m.position.set(t.x, g + trunkH + r * 0.62, t.y);
    _m.rotation.set(0, h1 * Math.PI * 2, 0);
    _m.scale.set(r * (0.9 + h2 * 0.25), r * (0.78 + h1 * 0.2), r * (0.9 + h1 * 0.25));
    _m.updateMatrix();
    this.canopies.setMatrixAt(i, _m.matrix);
    // sage range, a few warmer heads among them (SCOPE §8d palette)
    _tint.setHSL(0.24 + h2 * 0.06, 0.32 + h1 * 0.1, 0.42 + h2 * 0.14);
    this.canopies.setColorAt(i, _tint);
    _m.position.set(t.x, g + trunkH / 2, t.y);
    _m.rotation.set(0, 0, 0);
    _m.scale.set(1, trunkH, 1);
    _m.updateMatrix();
    this.trunks.setMatrixAt(i, _m.matrix);
  }

  /** hide the woods while the eye is underground (surface clutter over a ghosted
   *  hill), and bring them back on the surface. Pure display — the sim is untouched. */
  setVisible(on: boolean): void {
    this.canopies.visible = on;
    this.trunks.visible = on;
  }

  private removeTree(i: number): void {
    const t = this.trees[i]!;
    if (!t.alive) return;
    t.alive = false;
    this.count -= 1;
    const zero = new THREE.Matrix4().makeScale(0, 0, 0);
    this.canopies.setMatrixAt(i, zero);
    this.trunks.setMatrixAt(i, zero);
    this.canopies.instanceMatrix.needsUpdate = true;
    this.trunks.instanceMatrix.needsUpdate = true;
  }

  private nearIndices(x: number, y: number, r: number): number[] {
    const out: number[] = [];
    const c0x = Math.floor((x - r) / CELL);
    const c1x = Math.floor((x + r) / CELL);
    const c0y = Math.floor((y - r) / CELL);
    const c1y = Math.floor((y + r) / CELL);
    for (let cxi = c0x; cxi <= c1x; cxi++) {
      for (let cyi = c0y; cyi <= c1y; cyi++) {
        const bucket = this.grid.get(cxi * 100000 + cyi);
        if (bucket) out.push(...bucket);
      }
    }
    return out;
  }

  clearAlong(points: readonly Vec2[]): void {
    const len = polylineLength(points);
    const n = Math.max(1, Math.ceil(len / 2));
    for (let k = 0; k <= n; k++) {
      const at = pointAt(points, (k / n) * len);
      for (const i of this.nearIndices(at.x, at.y, CLEAR_R)) {
        const t = this.trees[i]!;
        const d = Math.sqrt((t.x - at.x) ** 2 + (t.y - at.y) ** 2);
        if (d < CLEAR_R) this.removeTree(i);
      }
    }
  }

  clearInPolygon(points: readonly Vec2[]): void {
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    for (const p of points) {
      minX = Math.min(minX, p.x);
      maxX = Math.max(maxX, p.x);
      minY = Math.min(minY, p.y);
      maxY = Math.max(maxY, p.y);
    }
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    const r = Math.sqrt((maxX - cx) ** 2 + (maxY - cy) ** 2) + CLEAR_R;
    for (const i of this.nearIndices(cx, cy, r)) {
      const t = this.trees[i]!;
      if (t.alive && pointInPolygon(t.x, t.y, points)) this.removeTree(i);
    }
  }

  /**
   * m³ of timber the LIVE trees in this ring hold (SIM 19): the boundary freezes
   * plan_fell economics from this, exactly as the quarry freezes from the bed model.
   * Already-cleared ground (a wall, an earlier fell) holds no more timber.
   */
  timberInPolygon(points: readonly Vec2[]): number {
    let n = 0;
    for (const i of this.indicesIn(points)) {
      const t = this.trees[i]!;
      if (t.alive && pointInPolygon(t.x, t.y, points)) n += 1;
    }
    return n * TIMBER_PER_TREE;
  }

  /** clear the live trees inside the ring, returning their indices (to regrow later) */
  private clearInPolygonTracked(points: readonly Vec2[]): number[] {
    const cleared: number[] = [];
    for (const i of this.indicesIn(points)) {
      const t = this.trees[i]!;
      if (t.alive && pointInPolygon(t.x, t.y, points)) {
        this.removeTree(i);
        cleared.push(i);
      }
    }
    return cleared;
  }

  /** candidate tree indices whose spatial-hash cell overlaps the ring's bounds */
  private indicesIn(points: readonly Vec2[]): number[] {
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    for (const p of points) {
      minX = Math.min(minX, p.x);
      maxX = Math.max(maxX, p.x);
      minY = Math.min(minY, p.y);
      maxY = Math.max(maxY, p.y);
    }
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    const r = Math.sqrt((maxX - cx) ** 2 + (maxY - cy) ** 2) + CLEAR_R;
    return this.nearIndices(cx, cy, r);
  }

  /** regrow a felled tree to exactly its old form (SIM 19 — felling is not death) */
  private restoreTree(i: number): void {
    const t = this.trees[i]!;
    if (t.alive) return;
    t.alive = true;
    this.count += 1;
    this.placeTree(i);
    this.canopies.instanceMatrix.needsUpdate = true;
    this.trunks.instanceMatrix.needsUpdate = true;
    if (this.canopies.instanceColor) this.canopies.instanceColor.needsUpdate = true;
  }

  /** the crew clears the line the day the work is planned */
  update(world: WorldState): void {
    while (this.lastWallCount < world.walls.length) {
      this.clearAlong(world.walls[this.lastWallCount]!.points);
      this.lastWallCount += 1;
    }
    while (this.lastFillCount < world.fills.length) {
      this.clearInPolygon(world.fills[this.lastFillCount]!.points);
      this.lastFillCount += 1;
    }
    // a new farm grubs its field (instant for now — gradual clearing joins
    // the timber economy, see BACKLOG)
    while (this.lastFarmCount < world.farms.length) {
      this.clearInPolygon(world.farms[this.lastFarmCount]!.points);
      this.lastFarmCount += 1;
    }
    // a completed building clears its interior — the wall line was cleared at
    // plan time, but a canopy INSIDE the ring would pierce the new roof
    while (this.lastBuildingCount < world.buildings.length) {
      const b = world.buildings[this.lastBuildingCount]!;
      const wall = world.walls.find((w) => w.id === b.wallId);
      if (wall) this.clearInPolygon(wall.points);
      this.lastBuildingCount += 1;
    }
    // THE WOODS (SIM 19): a cant felled THROUGH opens to an empty coupe; when its
    // stool regrows (matures) the exact trees come back — felling is not death.
    for (const stand of world.stands) {
      const felled = !stand.felling && stand.feltTick >= 0; // cut through, regrowing
      if (felled && !this.feltStands.has(stand.id)) {
        this.feltStands.set(stand.id, this.clearInPolygonTracked(stand.points));
      } else if (!felled && stand.feltTick < 0 && this.feltStands.has(stand.id)) {
        for (const i of this.feltStands.get(stand.id)!) this.restoreTree(i);
        this.feltStands.delete(stand.id);
      }
    }
  }
}
