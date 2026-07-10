/**
 * Wooden field gates: one hurdle gate hung in every gateway a farm owns —
 * the auto-gate carved when the ring closed, any the gate tool added, and a
 * hand-drawn gap. Render reads, never writes: the layer diffs world.farms'
 * gate lists each frame (gates come and go via add_gate/remove_gate) and
 * keeps one small mesh group per gateway, oriented along the wall line.
 */
import * as THREE from 'three';
import { GATE_W, type Vec2, type WorldState } from '../sim/types';

const POST_H = 1.05;
const POST_T = 0.13;
const RAIL_T = 0.055;
const RAIL_HEIGHTS = [0.3, 0.58, 0.86];

export class GateLayer {
  private views = new Map<string, THREE.Group>();
  private postMat = new THREE.MeshLambertMaterial({ color: 0x6f5233 }); // set oak
  private railMat = new THREE.MeshLambertMaterial({ color: 0x8a6b45 }); // weathered rail

  constructor(
    private world: WorldState,
    private scene: THREE.Scene,
    private groundAt: (x: number, y: number) => number,
  ) {}

  update(): void {
    const live = new Set<string>();
    for (const farm of this.world.farms) {
      for (const g of farm.gates) {
        const key = `${farm.id}:${g.x}:${g.y}`;
        live.add(key);
        if (!this.views.has(key)) this.build(key, farm.points, g);
      }
    }
    // a removed gate comes down the day the command lands
    for (const [key, group] of this.views) {
      if (!live.has(key)) {
        this.scene.remove(group);
        for (const child of group.children) (child as THREE.Mesh).geometry?.dispose();
        this.views.delete(key);
      }
    }
  }

  /** hang the hurdle along the ring's nearest edge (the gap's closing edge counts) */
  private build(key: string, ring: readonly Vec2[], g: Vec2): void {
    let ux = 1;
    let uy = 0;
    let bd = Infinity;
    const n = ring.length;
    for (let i = 0; i < n; i++) {
      const a = ring[i]!;
      const b = ring[(i + 1) % n]!; // wraps: the closing edge is a candidate
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const l2 = dx * dx + dy * dy;
      if (l2 === 0) continue;
      const t = Math.min(1, Math.max(0, ((g.x - a.x) * dx + (g.y - a.y) * dy) / l2));
      const qx = a.x + dx * t;
      const qy = a.y + dy * t;
      const d = (g.x - qx) ** 2 + (g.y - qy) ** 2;
      if (d < bd) {
        bd = d;
        const l = Math.sqrt(l2);
        ux = dx / l;
        uy = dy / l;
      }
    }

    const group = new THREE.Group();
    const half = GATE_W / 2;
    for (const s of [-half, half]) {
      const px = g.x + ux * s;
      const py = g.y + uy * s;
      const gz = this.groundAt(px, py);
      const post = new THREE.Mesh(new THREE.BoxGeometry(POST_T, POST_H, POST_T), this.postMat);
      post.position.set(px, gz + POST_H / 2, py);
      post.rotation.y = -Math.atan2(uy, ux);
      group.add(post);
    }
    const gz = this.groundAt(g.x, g.y);
    for (const h of RAIL_HEIGHTS) {
      const rail = new THREE.Mesh(
        new THREE.BoxGeometry(GATE_W - POST_T, RAIL_T, RAIL_T * 1.4),
        this.railMat,
      );
      rail.position.set(g.x, gz + h, g.y);
      rail.rotation.y = -Math.atan2(uy, ux);
      group.add(rail);
    }
    for (const child of group.children) child.frustumCulled = false;
    this.scene.add(group);
    this.views.set(key, group);
  }
}
