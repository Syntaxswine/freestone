/**
 * The workshops made VISIBLE (the plain-renders debt, 2026-07-15): a BLACKSMITH and a
 * CARPENTER'S YARD were bare shells; now each wears the tools of its trade on its south face.
 * The smithy gets a lit FORGE — a stone hearth with coals glowing hot, an anvil on its stump, a
 * dark hood — so the forge that speeds the dress (SIM 27, "the forge sharpens the irons") is
 * visibly ALIGHT. The carpenter's yard gets a stack of felled logs and a sawhorse — the timber
 * the cart draws (SIM 23), waiting to be worked.
 *
 * Pure presentation, derived from sim truth (which buildings are which trade), never touching the
 * sim. Static props placed ONCE when the workshop is designated (no per-frame animation). Chunky
 * Townscaper bodies on the DISPLAYED surface (groundAt), so nothing buries its feet on a slope.
 */
import * as THREE from 'three';
import type { WorldState } from '../sim/types';

function h2(a: number, b: number): number {
  let x = (Math.imul(a + 1, 0x85ebca6b) ^ Math.imul(b + 1, 0xc2b2ae35)) >>> 0;
  x = Math.imul(x ^ (x >>> 15), 0x27d4eb2f) >>> 0;
  return ((x ^ (x >>> 15)) >>> 0) / 4294967296;
}

export class WorkshopLayer {
  private seen = 0; // buildings processed (workshops claimed as we pass them)
  private props: THREE.Object3D[] = []; // every mesh we add, for the underground toggle
  private box = new THREE.BoxGeometry(1, 1, 1);
  private cyl = new THREE.CylinderGeometry(0.5, 0.5, 1, 8);
  private stone = new THREE.MeshLambertMaterial({ color: 0x8a8375 }); // the hearth's masonry
  private iron = new THREE.MeshLambertMaterial({ color: 0x33302c }); // anvil, hood — dark iron
  private wood = new THREE.MeshLambertMaterial({ color: 0x6f5334 }); // stump, sawhorse
  private logMat = new THREE.MeshLambertMaterial({ color: 0x8a6b45 }); // felled timber
  private coal = new THREE.MeshBasicMaterial({ color: 0xff6a12 }); // unlit → reads as glowing coals
  private ember = new THREE.MeshBasicMaterial({ color: 0xffd24a }); // a brighter heart to the fire

  constructor(
    private world: WorldState,
    private scene: THREE.Scene,
    private groundAt: (x: number, y: number) => number,
  ) {}

  update(): void {
    while (this.seen < this.world.buildings.length) {
      const b = this.world.buildings[this.seen]!;
      this.seen += 1;
      if (b.kind !== 'blacksmith' && b.kind !== 'carpentry') continue;
      const fp = this.footprint(b.wallId);
      if (!fp) continue;
      // a working spot on the south face, facing the default view, clear of the wall
      const bx = fp.cx + (h2(b.id, 3) - 0.5) * 1.0;
      const bz = fp.cy - (fp.rad + 1.7);
      if (b.kind === 'blacksmith') this.forge(bx, bz);
      else this.yard(b.id, bx, bz);
    }
  }

  /** hide the props with the woods while the eye is underground; bring them back on the surface */
  setVisible(on: boolean): void {
    for (const p of this.props) p.visible = on;
  }

  private footprint(wallId: number): { cx: number; cy: number; rad: number } | null {
    const wall = this.world.walls.find((w) => w.id === wallId);
    if (!wall || wall.points.length === 0) return null;
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
    return { cx, cy, rad };
  }

  /** one prop: a scaled unit box, its base set on the ground at (x, z) */
  private slab(mat: THREE.Material, w: number, h: number, d: number, x: number, gy: number, z: number): THREE.Mesh {
    const m = new THREE.Mesh(this.box, mat);
    m.scale.set(w, h, d);
    m.position.set(x, gy + h / 2, z);
    m.frustumCulled = false;
    this.scene.add(m);
    this.props.push(m);
    return m;
  }

  /** a scaled cylinder (default upright); ry/rz rotate it (a log lies with rz = π/2) */
  private post(mat: THREE.Material, dia: number, len: number, x: number, cy: number, z: number, rz = 0, ry = 0): THREE.Mesh {
    const m = new THREE.Mesh(this.cyl, mat);
    m.scale.set(dia, len, dia);
    m.position.set(x, cy, z);
    m.rotation.set(0, ry, rz);
    m.frustumCulled = false;
    this.scene.add(m);
    this.props.push(m);
    return m;
  }

  private forge(x: number, z: number): void {
    const g = this.groundAt(x, z);
    // the stone hearth, with hot coals glowing in its mouth and a brighter ember heart
    this.slab(this.stone, 0.9, 0.7, 0.7, x, g, z);
    this.slab(this.coal, 0.55, 0.16, 0.55, x, g + 0.7, z);
    this.slab(this.ember, 0.26, 0.12, 0.26, x, g + 0.78, z);
    // a dark iron hood on a back post, drawing the smoke up
    this.slab(this.iron, 0.8, 0.14, 0.55, x, g + 1.35, z - 0.05);
    this.slab(this.iron, 0.1, 0.65, 0.1, x + 0.34, g + 0.7, z - 0.28);
    // the anvil beside it, on a sawn-oak stump
    const ax = x + 1.05;
    this.post(this.wood, 0.34, 0.5, ax, g + 0.25, z);
    this.slab(this.iron, 0.44, 0.16, 0.2, ax, g + 0.5, z); // the body
    this.slab(this.iron, 0.22, 0.1, 0.14, ax + 0.28, g + 0.5, z); // the horn, tapering off one end
  }

  private yard(id: number, x: number, z: number): void {
    const g = this.groundAt(x, z);
    // a stack of felled logs — two on the ground, one riding on top (the cart's timber, unworked)
    const L = 1.7;
    this.post(this.logMat, 0.24, L, x - 0.14, g + 0.12, z, Math.PI / 2);
    this.post(this.logMat, 0.24, L, x + 0.14, g + 0.12, z, Math.PI / 2);
    this.post(this.logMat, 0.24, L, x, g + 0.36, z, Math.PI / 2);
    // a sawhorse a step to the side, a half-sawn beam across it
    const sx = x + 1.3;
    this.slab(this.wood, 0.1, 0.5, 0.1, sx - 0.4, g, z - 0.18);
    this.slab(this.wood, 0.1, 0.5, 0.1, sx - 0.4, g, z + 0.18);
    this.slab(this.wood, 0.1, 0.5, 0.1, sx + 0.4, g, z - 0.18);
    this.slab(this.wood, 0.1, 0.5, 0.1, sx + 0.4, g, z + 0.18);
    this.slab(this.wood, 1.4, 0.12, 0.12, sx, g + 0.5, z); // the crossbar
    this.slab(this.logMat, 1.5, 0.1, 0.28, sx + (h2(id, 9) - 0.5) * 0.4, g + 0.62, z); // the beam being sawn
  }
}
