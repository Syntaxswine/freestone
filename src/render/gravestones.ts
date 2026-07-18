/**
 * THE CHURCHYARD, made visible (SIM 44, Beat 4). The settlement's dead, laid to rest in the
 * ground the player drew: one marker per grave, filling the churchyard in orderly rows as the
 * generations pass — so an old settlement's cemetery is visibly larger, a chronicle you read by
 * its size. A STONE grave stands as an upright grey headstone; a WOOD one as a brown marker; an
 * unmarked grave is a bare low MOUND — the ungrieved dead, visibly waiting for the stone the
 * living owe them.
 *
 * Render reads state, never writes; plot jitter comes from integer hashes, never the sim rng.
 * Markers ride the shared displayed surface (`groundAt`). The graves accrue in world.graves in
 * death order, and each takes the next plot — the palimpsest of the dead, in the ground.
 */
import * as THREE from 'three';
import { pointInPolygon } from '../sim/step';
import type { Grave, Vec2, WorldState } from '../sim/types';

const PLOT = 1.7; // m between graves — orderly rows
const RAISE = 0.04;
const MAX = 3000; // instance cap per marker kind — REGROWS (never a hard freeze)

function hash1(a: number): number {
  let x = Math.imul(a + 1, 0x85ebca6b) >>> 0;
  x = Math.imul(x ^ (x >>> 15), 0x27d4eb2f) >>> 0;
  return ((x ^ (x >>> 15)) >>> 0) / 4294967296;
}

/** which grave (by id) sits at a given world plot — the inspection card reads this back */
export interface GravePlot {
  graveId: number;
  x: number;
  y: number;
}

export class GraveyardLayer {
  private stone: THREE.InstancedMesh;
  private wood: THREE.InstancedMesh;
  private mound: THREE.InstancedMesh;
  private dummy = new THREE.Object3D();
  private lastKey = '';
  private visibleFlag = true;
  /** the world position of each grave's marker — for the raycast inspection card */
  private placed: GravePlot[] = [];

  constructor(
    private world: WorldState,
    private groundAt: (x: number, y: number) => number,
    private scene: THREE.Scene,
  ) {
    // a headstone: an upright slab; a wooden marker: a slimmer post; a mound: a low earth hump
    this.stone = this.makeMesh(new THREE.BoxGeometry(0.5, 0.7, 0.14), 0xb8b4ad); // weathered stone
    this.wood = this.makeMesh(new THREE.BoxGeometry(0.18, 0.6, 0.18), 0x6f5334); // dark timber post
    this.mound = this.makeMesh(new THREE.BoxGeometry(0.8, 0.18, 1.3), 0x6b5a44); // bare turned earth
  }

  private makeMesh(geo: THREE.BufferGeometry, color: number): THREE.InstancedMesh {
    const mat = new THREE.MeshLambertMaterial({ color });
    const m = new THREE.InstancedMesh(geo, mat, MAX);
    m.count = 0;
    m.receiveShadow = true;
    this.scene.add(m);
    return m;
  }

  setVisible(v: boolean): void {
    this.visibleFlag = v;
    this.stone.visible = v;
    this.wood.visible = v;
    this.mound.visible = v;
  }

  /** the plots of the churchyard — a deterministic grid inside the drawn ring, row by row, so
   *  graves fill it in orderly rows. Null churchyard ⇒ no plots (the dead have no drawn ground). */
  private plots(): Vec2[] {
    const yard = this.world.farms.find((f) => f.use === 'churchyard');
    if (!yard || yard.points.length < 3) return [];
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    for (const p of yard.points) {
      minX = Math.min(minX, p.x);
      maxX = Math.max(maxX, p.x);
      minY = Math.min(minY, p.y);
      maxY = Math.max(maxY, p.y);
    }
    const out: Vec2[] = [];
    // inset a little so headstones don't sit on the wall; walk rows south→north, west→east
    for (let y = minY + PLOT; y <= maxY - PLOT * 0.5; y += PLOT) {
      for (let x = minX + PLOT; x <= maxX - PLOT * 0.5; x += PLOT) {
        if (pointInPolygon(x, y, yard.points)) out.push({ x, y });
      }
    }
    return out;
  }

  update(): void {
    const key = `${this.world.graves.length}:${this.world.graves.reduce((n, g) => n + (g.marker === 'none' ? 0 : g.marker === 'wood' ? 1 : 2), 0)}:${this.world.farms.filter((f) => f.use === 'churchyard').length}`;
    if (key === this.lastKey) return;
    this.lastKey = key;

    const plots = this.plots();
    this.placed = [];
    const rows: { mesh: THREE.InstancedMesh; items: { g: Grave; at: Vec2 }[] }[] = [
      { mesh: this.stone, items: [] },
      { mesh: this.wood, items: [] },
      { mesh: this.mound, items: [] },
    ];
    // each grave takes the next plot in death order (world.graves is append-only at death)
    for (let i = 0; i < this.world.graves.length && i < plots.length; i++) {
      const g = this.world.graves[i]!;
      const at = plots[i]!;
      this.placed.push({ graveId: g.id, x: at.x, y: at.y });
      const bucket = g.marker === 'stone' ? rows[0]! : g.marker === 'wood' ? rows[1]! : rows[2]!;
      bucket.items.push({ g, at });
    }
    for (const { mesh, items } of rows) {
      for (let i = 0; i < items.length; i++) {
        const { g, at } = items[i]!;
        const j = hash1(g.id);
        const gy = this.groundAt(at.x, at.y);
        // a marker stands on the ground; a mound sits flush. lean each a hair, hand-set not machined
        const isMound = g.marker === 'none';
        const h = g.marker === 'stone' ? 0.35 : g.marker === 'wood' ? 0.3 : 0.09;
        this.dummy.position.set(at.x, gy + (isMound ? RAISE : h + RAISE), at.y);
        this.dummy.rotation.set(0, (j - 0.5) * 0.25, isMound ? 0 : (j - 0.5) * 0.08);
        this.dummy.updateMatrix();
        mesh.setMatrixAt(i, this.dummy.matrix);
      }
      mesh.count = items.length;
      mesh.instanceMatrix.needsUpdate = true;
    }
  }

  /** the grave nearest a picked ground point within a headstone's reach — for the inspection
   *  card (click a headstone → the epitaph). Null if the pick is not on a grave. */
  graveAt(x: number, y: number): Grave | null {
    let best: GravePlot | null = null;
    let bd = PLOT * PLOT; // within one plot's reach
    for (const p of this.placed) {
      const d = (p.x - x) ** 2 + (p.y - y) ** 2;
      if (d < bd) {
        bd = d;
        best = p;
      }
    }
    return best ? (this.world.graves.find((g) => g.id === best!.graveId) ?? null) : null;
  }
}
