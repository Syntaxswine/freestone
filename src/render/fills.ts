/**
 * Earthworks display: one dirt body per fill whose surface RISES from the
 * terrain toward the flat target level as volumeMoved grows (per-vertex lerp,
 * so a fresh fill hugs the ground instead of appearing as an instant slab).
 * The rise is theater; the SIM only grounds masonry on COMPLETED fills — see
 * effectiveGroundAt. Render reads, never writes.
 *
 * Two ground queries:
 *  - topAtSim:  completed fills only — matches the sim's effectiveGroundAt,
 *               so planner previews sit exactly where stones will actually go
 *  - topAtShow: the current displayed surface — puppets climb the rising mound
 * Both bbox-precheck each fill before the polygon test: these run inside the
 * pointermove ray march (hundreds of samples per event), so the common case
 * of "pointer nowhere near a fill" must stay O(fills) integer compares.
 */
import * as THREE from 'three';
import { fillSurfaceAt, pointInPolygon } from '../sim/step';
import type { FillPlan, WorldState } from '../sim/types';

const SKIRT_STEP = 3; // meters between skirt bottom samples along an edge

function hash1(a: number): number {
  let x = Math.imul(a + 1, 0x85ebca6b) >>> 0;
  x = Math.imul(x ^ (x >>> 15), 0x27d4eb2f) >>> 0;
  return ((x ^ (x >>> 15)) >>> 0) / 4294967296;
}

interface FillView {
  group: THREE.Group;
  volumeShown: number;
  /**
   * Per-fill earth tones (boss bug report 2026-07-10: dirt on dirt turned
   * invisible — every fill shared ONE material, so stacked platforms read as
   * a single brown void). Each fill's tint is jittered by its id, the same
   * trick the stones use, so layers meet at a visible seam.
   */
  topMat: THREE.MeshLambertMaterial;
  sideMat: THREE.MeshLambertMaterial;
}

interface BBox {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export class FillLayer {
  private views = new Map<number, FillView>();
  private bboxes = new Map<number, BBox>();

  constructor(
    private world: WorldState,
    private scene: THREE.Scene,
    private terrainGroundAt: (x: number, y: number) => number,
  ) {}

  private bbox(f: FillPlan): BBox {
    let b = this.bboxes.get(f.id);
    if (!b) {
      b = { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity };
      for (const p of f.points) {
        if (p.x < b.minX) b.minX = p.x;
        if (p.x > b.maxX) b.maxX = p.x;
        if (p.y < b.minY) b.minY = p.y;
        if (p.y > b.maxY) b.maxY = p.y;
      }
      this.bboxes.set(f.id, b);
    }
    return b;
  }

  private progress(f: FillPlan): number {
    return f.volumeTotal > 0 ? Math.min(1, f.volumeMoved / f.volumeTotal) : 1;
  }

  /** displayed surface at a point: terrain lerped toward the FINISHED surface
   *  (flat level, or the ramp's slope — fillSurfaceAt is the sim's own fn) */
  private surfaceAt(f: FillPlan, x: number, y: number): number {
    const t = this.terrainGroundAt(x, y);
    const target = fillSurfaceAt(f, x, y);
    if (target <= t) return t;
    return t + (target - t) * this.progress(f);
  }

  /** completed fills only — the surface the SIM grounds masonry on */
  topAtSim(x: number, y: number): number {
    let top = -Infinity;
    for (const f of this.world.fills) {
      if (f.volumeMoved < f.volumeTotal || f.level <= top) continue;
      const b = this.bbox(f);
      if (x < b.minX || x > b.maxX || y < b.minY || y > b.maxY) continue;
      if (pointInPolygon(x, y, f.points)) {
        const s = fillSurfaceAt(f, x, y);
        if (s > top) top = s;
      }
    }
    return top;
  }

  /** any fill's current displayed surface — for feet, not for masonry */
  topAtShow(x: number, y: number): number {
    let top = -Infinity;
    for (const f of this.world.fills) {
      const b = this.bbox(f);
      if (x < b.minX || x > b.maxX || y < b.minY || y > b.maxY) continue;
      if (pointInPolygon(x, y, f.points)) {
        const t = this.surfaceAt(f, x, y);
        if (t > top) top = t;
      }
    }
    return top;
  }

  update(): void {
    for (const f of this.world.fills) {
      let v = this.views.get(f.id);
      if (!v) {
        const j = hash1(f.id);
        v = {
          group: new THREE.Group(),
          volumeShown: -1,
          topMat: new THREE.MeshLambertMaterial({
            color: new THREE.Color().setHSL(0.07 + j * 0.025, 0.3, 0.42 + j * 0.12),
            side: THREE.DoubleSide,
          }),
          sideMat: new THREE.MeshLambertMaterial({
            color: new THREE.Color().setHSL(0.065 + j * 0.02, 0.28, 0.36 + j * 0.1),
            side: THREE.DoubleSide,
          }),
        };
        this.views.set(f.id, v);
        this.scene.add(v.group);
      }
      if (v.volumeShown === f.volumeMoved) continue;
      v.volumeShown = f.volumeMoved;
      this.rebuild(f, v);
    }
  }

  private rebuild(f: FillPlan, v: FillView): void {
    for (const child of [...v.group.children]) {
      v.group.remove(child);
      (child as THREE.Mesh).geometry?.dispose();
    }

    // top cap: earcut the polygon, then displace every vertex onto the rising
    // surface — terrain-conforming at progress 0, flat at the level when done
    const shape = new THREE.Shape(f.points.map((p) => new THREE.Vector2(p.x, p.y)));
    const topGeo = new THREE.ShapeGeometry(shape);
    topGeo.rotateX(Math.PI / 2);
    const pos = topGeo.getAttribute('position') as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      pos.setY(i, this.surfaceAt(f, pos.getX(i), pos.getZ(i)) + 0.02);
    }
    topGeo.computeVertexNormals();
    const topMesh = new THREE.Mesh(topGeo, v.topMat);
    topMesh.frustumCulled = false;
    v.group.add(topMesh);

    // skirts: subdivided along each edge so long edges over uneven ground
    // don't leave daylight underneath — bottoms track the terrain per sample
    const bottoms: number[] = [];
    const idx: number[] = [];
    const n = f.points.length;
    let vtx = 0;
    for (let i = 0; i < n; i++) {
      const a = f.points[i]!;
      const b = f.points[(i + 1) % n]!;
      const seg = Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2);
      const steps = Math.max(1, Math.ceil(seg / SKIRT_STEP));
      for (let k = 0; k <= steps; k++) {
        const t = k / steps;
        const x = a.x + (b.x - a.x) * t;
        const y = a.y + (b.y - a.y) * t;
        bottoms.push(x, this.terrainGroundAt(x, y) - 0.2, y);
        bottoms.push(x, this.surfaceAt(f, x, y) + 0.02, y);
        if (k > 0) {
          const o = vtx - 2;
          idx.push(o, o + 2, o + 1, o + 1, o + 2, o + 3);
        }
        vtx += 2;
      }
    }
    const skirtGeo = new THREE.BufferGeometry();
    skirtGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(bottoms), 3));
    skirtGeo.setIndex(idx);
    skirtGeo.computeVertexNormals();
    const skirt = new THREE.Mesh(skirtGeo, v.sideMat);
    skirt.frustumCulled = false;
    v.group.add(skirt);
  }
}
