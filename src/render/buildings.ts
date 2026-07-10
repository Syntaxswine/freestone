/**
 * Roofs: when the sim completes a building (SIM 3 — a near-closed tall ring
 * with a doorway gap), a gable roof rises over the shell. Render reads, never
 * writes; the roof appears the day the walls top out (honest carpentry — a
 * timber phase with real days — is a later course, noted in BACKLOG).
 *
 * Geometry: the ring reduced to its 4 true corners (shared sim helper) gives
 * eaves; the ridge runs between the midpoints of the SHORT edges at a 45°
 * pitch, gables closing both ends. Irregular rings (no 4-corner reduction)
 * stay roofless shells for now. Small buildings wear thatch, great ones stone
 * slate — PARTLY watchlist: roofing materials want a citation pass before
 * they become canon rather than dressing.
 */
import * as THREE from 'three';
import { reduceCorners } from '../sim/classify';
import type { Vec2, WorldState } from '../sim/types';

const OVERHANG = 0.35; // meters of eave past the wall face
const PITCH = 0.5; // ridge rise per meter of half-span (0.5 = 45°)

function hash1(a: number): number {
  let x = Math.imul(a + 1, 0x85ebca6b) >>> 0;
  x = Math.imul(x ^ (x >>> 15), 0x27d4eb2f) >>> 0;
  return ((x ^ (x >>> 15)) >>> 0) / 4294967296;
}

export class BuildingLayer {
  private built = 0;
  private meshes: THREE.Mesh[] = [];

  constructor(
    private world: WorldState,
    private scene: THREE.Scene,
    /** the SIM-matching ground (terrain + completed platforms) — eaves sit on it */
    private groundAt: (x: number, y: number) => number,
  ) {}

  update(): void {
    while (this.built < this.world.buildings.length) {
      this.build(this.built);
      this.built += 1;
    }
  }

  private build(index: number): void {
    const b = this.world.buildings[index]!;
    const wall = this.world.walls.find((w) => w.id === b.wallId);
    if (!wall) return;
    const corners = reduceCorners(wall.points);
    if (corners.length !== 4) return; // an irregular shell keeps the sky for now

    // eaves: the tallest corner's wall top (courses ride per-column ground)
    let eaveZ = -Infinity;
    for (const c of corners) {
      const z = this.groundAt(c.x, c.y) + wall.height;
      if (z > eaveZ) eaveZ = z;
    }
    eaveZ += 0.03;

    // overhang: push each corner outward from the footprint's center
    const cx = (corners[0]!.x + corners[1]!.x + corners[2]!.x + corners[3]!.x) / 4;
    const cy = (corners[0]!.y + corners[1]!.y + corners[2]!.y + corners[3]!.y) / 4;
    const ov: Vec2[] = corners.map((c) => {
      const dx = c.x - cx;
      const dy = c.y - cy;
      const d = Math.sqrt(dx * dx + dy * dy) || 1;
      return { x: c.x + (dx / d) * OVERHANG, y: c.y + (dy / d) * OVERHANG };
    });

    // ridge spans the midpoints of the SHORT edge pair
    const elen = (i: number): number => {
      const a = corners[i]!;
      const c = corners[(i + 1) % 4]!;
      return Math.sqrt((c.x - a.x) ** 2 + (c.y - a.y) ** 2);
    };
    const l02 = (elen(0) + elen(2)) / 2; // edges c0c1, c2c3
    const l13 = (elen(1) + elen(3)) / 2; // edges c1c2, c3c0
    const span = Math.min(l02, l13);
    const ridgeZ = eaveZ + span * PITCH;
    const mid = (a: Vec2, c: Vec2): Vec2 => ({ x: (a.x + c.x) / 2, y: (a.y + c.y) / 2 });
    // gables sit on the short edges; slopes hang off the long ones
    const [g0, g1, s0, s1, s2, s3] =
      l02 <= l13
        ? [mid(ov[0]!, ov[1]!), mid(ov[2]!, ov[3]!), ov[1]!, ov[2]!, ov[3]!, ov[0]!]
        : [mid(ov[1]!, ov[2]!), mid(ov[3]!, ov[0]!), ov[2]!, ov[3]!, ov[0]!, ov[1]!];

    // thatch for the small, stone slate for the grand (dressing, not canon)
    const j = hash1(b.id);
    const color =
      b.kind === 'hall' || b.kind === 'great_barn'
        ? new THREE.Color().setHSL(0.58 + j * 0.03, 0.06, 0.5 + j * 0.08)
        : new THREE.Color().setHSL(0.1 + j * 0.02, 0.38, 0.52 + j * 0.08);

    // two slope quads + two gable triangles, non-indexed for crisp facets
    const v = (p: Vec2, z: number): number[] => [p.x, z, p.y];
    const positions = [
      // slope from edge s0→s1 up to the ridge g1→g0
      ...v(s0, eaveZ), ...v(s1, eaveZ), ...v(g1, ridgeZ),
      ...v(s0, eaveZ), ...v(g1, ridgeZ), ...v(g0, ridgeZ),
      // slope from edge s2→s3 up to the ridge g0→g1
      ...v(s2, eaveZ), ...v(s3, eaveZ), ...v(g0, ridgeZ),
      ...v(s2, eaveZ), ...v(g0, ridgeZ), ...v(g1, ridgeZ),
      // gable ends
      ...v(s1, eaveZ), ...v(s2, eaveZ), ...v(g1, ridgeZ),
      ...v(s3, eaveZ), ...v(s0, eaveZ), ...v(g0, ridgeZ),
    ];
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3));
    geo.computeVertexNormals();
    const mesh = new THREE.Mesh(
      geo,
      new THREE.MeshLambertMaterial({ color, side: THREE.DoubleSide }),
    );
    mesh.frustumCulled = false;
    this.meshes.push(mesh);
    this.scene.add(mesh);
  }
}
