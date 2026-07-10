/**
 * Roof decks (SIM 8): a completed plan_roof becomes a plate spanning its wall
 * tops — timber planking, thatch, or flat brick (the brick deck is the next
 * storey's floor; the sim's effectiveGroundAt already says so). The plate
 * appears when the carpentry completes; while the work is open the laborers'
 * barrow theater is the progress bar. Render reads, never writes.
 */
import * as THREE from 'three';
import { ROOF_DECK, type Roof, type WorldState } from '../sim/types';

function hash1(a: number): number {
  let x = Math.imul(a + 1, 0x85ebca6b) >>> 0;
  x = Math.imul(x ^ (x >>> 15), 0x27d4eb2f) >>> 0;
  return ((x ^ (x >>> 15)) >>> 0) / 4294967296;
}

function deckColor(roof: Roof): THREE.Color {
  const j = hash1(roof.id);
  switch (roof.material) {
    case 'straw':
      return new THREE.Color().setHSL(0.1 + j * 0.02, 0.4, 0.55 + j * 0.06);
    case 'brick':
      return new THREE.Color().setHSL(0.085 + j * 0.02, 0.22, 0.66 + j * 0.06);
    default: // wood planking
      return new THREE.Color().setHSL(0.075 + j * 0.02, 0.38, 0.42 + j * 0.08);
  }
}

export class RoofLayer {
  private built = new Set<number>();

  constructor(
    private world: WorldState,
    private scene: THREE.Scene,
  ) {}

  update(): void {
    for (const roof of this.world.roofs) {
      if (roof.workDone < roof.workTotal || this.built.has(roof.id)) continue;
      this.built.add(roof.id);
      this.build(roof);
    }
  }

  private build(roof: Roof): void {
    const color = deckColor(roof);
    const topMat = new THREE.MeshLambertMaterial({ color, side: THREE.DoubleSide });
    const edgeMat = new THREE.MeshLambertMaterial({
      color: color.clone().multiplyScalar(0.82),
      side: THREE.DoubleSide,
    });
    const group = new THREE.Group();

    // the deck's top plate
    const shape = new THREE.Shape(roof.points.map((p) => new THREE.Vector2(p.x, p.y)));
    const topGeo = new THREE.ShapeGeometry(shape);
    topGeo.rotateX(Math.PI / 2);
    const pos = topGeo.getAttribute('position') as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) pos.setY(i, roof.level + ROOF_DECK);
    topGeo.computeVertexNormals();
    const top = new THREE.Mesh(topGeo, topMat);
    group.add(top);

    // the edge band, wall-top to deck-top, around the ring
    const n = roof.points.length;
    const verts: number[] = [];
    const idx: number[] = [];
    for (let i = 0; i < n; i++) {
      const a = roof.points[i]!;
      const b = roof.points[(i + 1) % n]!;
      const o = verts.length / 3;
      verts.push(a.x, roof.level, a.y);
      verts.push(a.x, roof.level + ROOF_DECK, a.y);
      verts.push(b.x, roof.level, b.y);
      verts.push(b.x, roof.level + ROOF_DECK, b.y);
      idx.push(o, o + 2, o + 1, o + 1, o + 2, o + 3);
    }
    const edgeGeo = new THREE.BufferGeometry();
    edgeGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(verts), 3));
    edgeGeo.setIndex(idx);
    edgeGeo.computeVertexNormals();
    group.add(new THREE.Mesh(edgeGeo, edgeMat));

    for (const child of group.children) child.frustumCulled = false;
    this.scene.add(group);
  }
}
