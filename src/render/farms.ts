/**
 * Farm fields: when the sim establishes a farm (a completed closed low ring —
 * SIM 3), the land inside turns to tilled strips. Render reads, never writes.
 *
 * The field is a quad grid clipped to the enclosure ring — a quad is included
 * only when all four corners are inside, so a strip of green survives between
 * the tillage and the wall. That strip is the HEADLAND, where the plough team
 * turned; the geometry's conservatism is historically honest for free.
 * Furrow bands run along the ring's longest edge (strips follow the plough
 * line, not the compass), colored per-quad for a chunky Townscaper read.
 */
import * as THREE from 'three';
import { pointInPolygon } from '../sim/step';
import type { WorldState } from '../sim/types';

const CELL = 1.5; // meters per tillage quad
const STRIP_W = 2.0; // meters per furrow strip
const LIFT = 0.06; // above terrain, below the wall's first course
const MAX_QUADS = 60000; // absurd rings get coarser tillage, never a stall

function hash1(a: number): number {
  let x = Math.imul(a + 1, 0x85ebca6b) >>> 0;
  x = Math.imul(x ^ (x >>> 15), 0x27d4eb2f) >>> 0;
  return ((x ^ (x >>> 15)) >>> 0) / 4294967296;
}

export class FarmLayer {
  private built = 0;
  private meshes: THREE.Mesh[] = [];
  private mat = new THREE.MeshLambertMaterial({ vertexColors: true });

  constructor(
    private world: WorldState,
    private scene: THREE.Scene,
    private terrainGroundAt: (x: number, y: number) => number,
  ) {}

  update(): void {
    while (this.built < this.world.farms.length) {
      this.build(this.built);
      this.built += 1;
    }
  }

  private build(index: number): void {
    const farm = this.world.farms[index]!;
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

    // strips run with the plough: along the ring's longest edge
    let ux = 1;
    let uy = 0;
    let best = 0;
    for (let i = 0; i < ring.length; i++) {
      const a = ring[i]!;
      const b = ring[(i + 1) % ring.length]!;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const l2 = dx * dx + dy * dy;
      if (l2 > best) {
        best = l2;
        const l = Math.sqrt(l2);
        ux = dx / l;
        uy = dy / l;
      }
    }
    const px = -uy; // strips index along the perpendicular
    const py = ux;

    const bboxQuads = ((maxX - minX) / CELL) * ((maxY - minY) / CELL);
    const cell = bboxQuads > MAX_QUADS ? Math.sqrt(((maxX - minX) * (maxY - minY)) / MAX_QUADS) : CELL;

    const j = hash1(farm.id);
    const tilled = new THREE.Color().setHSL(0.07 + j * 0.02, 0.3, 0.34 + j * 0.06);
    const sown = new THREE.Color().setHSL(0.23 + j * 0.05, 0.3, 0.4 + j * 0.08);

    const positions: number[] = [];
    const colors: number[] = [];
    const g = this.terrainGroundAt;
    const gx0 = Math.floor(minX / cell);
    const gx1 = Math.ceil(maxX / cell);
    const gy0 = Math.floor(minY / cell);
    const gy1 = Math.ceil(maxY / cell);
    for (let gy = gy0; gy < gy1; gy++) {
      for (let gx = gx0; gx < gx1; gx++) {
        const x0 = gx * cell;
        const y0 = gy * cell;
        const x1 = x0 + cell;
        const y1 = y0 + cell;
        // all four corners inside, or the quad stays green — the headland
        if (
          !pointInPolygon(x0, y0, ring) ||
          !pointInPolygon(x1, y0, ring) ||
          !pointInPolygon(x1, y1, ring) ||
          !pointInPolygon(x0, y1, ring)
        ) {
          continue;
        }
        const cxq = (x0 + x1) / 2;
        const cyq = (y0 + y1) / 2;
        const strip = Math.floor((px * (cxq - ring[0]!.x) + py * (cyq - ring[0]!.y)) / STRIP_W);
        const c = (strip & 1) === 0 ? tilled : sown;
        const z00 = g(x0, y0) + LIFT;
        const z10 = g(x1, y0) + LIFT;
        const z11 = g(x1, y1) + LIFT;
        const z01 = g(x0, y1) + LIFT;
        // two triangles, wound +Y-up per the terrain convention (a,c,b)(b,c,d)
        positions.push(x0, z00, y0, x0, z01, y1, x1, z10, y0);
        positions.push(x1, z10, y0, x0, z01, y1, x1, z11, y1);
        for (let k = 0; k < 6; k++) colors.push(c.r, c.g, c.b);
      }
    }
    if (positions.length === 0) return; // a farm thinner than a quad shows no tillage

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3));
    geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(colors), 3));
    geo.computeVertexNormals();
    const mesh = new THREE.Mesh(geo, this.mat);
    mesh.frustumCulled = false;
    this.meshes.push(mesh);
    this.scene.add(mesh);
  }
}
