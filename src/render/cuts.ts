/**
 * Quarry display (SIM 14): one pit per cut whose floor SINKS from the terrain
 * toward the target floor level as workDone grows — the inverse of a fill's
 * rising mound. The sink is theater; the sim tracks person-days, not a shape.
 * Render reads, never writes.
 *
 * Rocky-earth tones, greyer and colder than a fill's brown dirt, so a quarry
 * reads as cut ground rather than tipped spoil. Each pit's tint is jittered by
 * its id (the stones' trick) so adjacent workings meet at a visible seam.
 */
import * as THREE from 'three';
import { pointInPolygon } from '../sim/step';
import type { CutPlan, WorldState } from '../sim/types';

const SKIRT_STEP = 3; // meters between pit-wall samples along an edge

function hash1(a: number): number {
  let x = Math.imul(a + 1, 0x85ebca6b) >>> 0;
  x = Math.imul(x ^ (x >>> 15), 0x27d4eb2f) >>> 0;
  return ((x ^ (x >>> 15)) >>> 0) / 4294967296;
}

interface CutView {
  group: THREE.Group;
  workShown: number;
  floorMat: THREE.MeshLambertMaterial;
  wallMat: THREE.MeshLambertMaterial;
}

interface BBox {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export class CutLayer {
  private views = new Map<number, CutView>();
  private bboxes = new Map<number, BBox>();

  constructor(
    private world: WorldState,
    private scene: THREE.Scene,
    private terrainGroundAt: (x: number, y: number) => number,
  ) {}

  private bbox(c: CutPlan): BBox {
    let b = this.bboxes.get(c.id);
    if (!b) {
      b = { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity };
      for (const p of c.points) {
        if (p.x < b.minX) b.minX = p.x;
        if (p.x > b.maxX) b.maxX = p.x;
        if (p.y < b.minY) b.minY = p.y;
        if (p.y > b.maxY) b.maxY = p.y;
      }
      this.bboxes.set(c.id, b);
    }
    return b;
  }

  private progress(c: CutPlan): number {
    return c.workTotal > 0 ? Math.min(1, c.workDone / c.workTotal) : 1;
  }

  /** displayed pit floor at a point: terrain sunk toward floorLevel by progress */
  private floorAt(c: CutPlan, x: number, y: number): number {
    const t = this.terrainGroundAt(x, y);
    if (c.floorLevel >= t) return t; // pit floor above ground — nothing to sink
    return t + (c.floorLevel - t) * this.progress(c);
  }

  /** current pit floor at a point (for sprite feet: a laborer stands in the pit) */
  floorAtShow(x: number, y: number): number {
    let low = Infinity;
    for (const c of this.world.cuts) {
      const b = this.bbox(c);
      if (x < b.minX || x > b.maxX || y < b.minY || y > b.maxY) continue;
      if (pointInPolygon(x, y, c.points)) {
        const f = this.floorAt(c, x, y);
        if (f < low) low = f;
      }
    }
    return low;
  }

  update(): void {
    for (const c of this.world.cuts) {
      let v = this.views.get(c.id);
      if (!v) {
        const j = hash1(c.id);
        v = {
          group: new THREE.Group(),
          workShown: -1,
          floorMat: new THREE.MeshLambertMaterial({
            // cold grey-brown quarry floor (rock dust), distinct from fill dirt
            color: new THREE.Color().setHSL(0.09 + j * 0.02, 0.14, 0.4 + j * 0.08),
            side: THREE.DoubleSide,
          }),
          wallMat: new THREE.MeshLambertMaterial({
            // the cut faces — a touch warmer/darker, the bedded stone exposed
            color: new THREE.Color().setHSL(0.08 + j * 0.02, 0.2, 0.34 + j * 0.08),
            side: THREE.DoubleSide,
          }),
        };
        this.views.set(c.id, v);
        this.scene.add(v.group);
      }
      if (v.workShown === c.workDone) continue;
      v.workShown = c.workDone;
      this.rebuild(c, v);
    }
  }

  private rebuild(c: CutPlan, v: CutView): void {
    for (const child of [...v.group.children]) {
      v.group.remove(child);
      (child as THREE.Mesh).geometry?.dispose();
    }

    // floor cap: earcut the ring, drop every vertex onto the sinking floor
    const shape = new THREE.Shape(c.points.map((p) => new THREE.Vector2(p.x, p.y)));
    const floorGeo = new THREE.ShapeGeometry(shape);
    floorGeo.rotateX(Math.PI / 2);
    const pos = floorGeo.getAttribute('position') as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      pos.setY(i, this.floorAt(c, pos.getX(i), pos.getZ(i)) - 0.02);
    }
    floorGeo.computeVertexNormals();
    const floorMesh = new THREE.Mesh(floorGeo, v.floorMat);
    floorMesh.frustumCulled = false;
    v.group.add(floorMesh);

    // pit walls: subdivided along each edge, from the terrain RIM down to the floor
    const verts: number[] = [];
    const idx: number[] = [];
    const n = c.points.length;
    let vtx = 0;
    for (let i = 0; i < n; i++) {
      const a = c.points[i]!;
      const b = c.points[(i + 1) % n]!;
      const seg = Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2);
      const steps = Math.max(1, Math.ceil(seg / SKIRT_STEP));
      for (let k = 0; k <= steps; k++) {
        const t = k / steps;
        const x = a.x + (b.x - a.x) * t;
        const y = a.y + (b.y - a.y) * t;
        verts.push(x, this.terrainGroundAt(x, y) + 0.05, y); // rim, just above turf
        verts.push(x, this.floorAt(c, x, y) - 0.02, y); // floor
        if (k > 0) {
          const o = vtx - 2;
          idx.push(o, o + 2, o + 1, o + 1, o + 2, o + 3);
        }
        vtx += 2;
      }
    }
    const wallGeo = new THREE.BufferGeometry();
    wallGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(verts), 3));
    wallGeo.setIndex(idx);
    wallGeo.computeVertexNormals();
    const walls = new THREE.Mesh(wallGeo, v.wallMat);
    walls.frustumCulled = false;
    v.group.add(walls);
  }
}
