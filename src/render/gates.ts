/**
 * Gates and doors: hung furniture for every opening the sim knows. One tool
 * cut them; the CONTEXT styles them (boss canon 2026-07-10) — a farm wall's
 * opening wears a hurdle gate (posts + rails you can see the field through),
 * a building's opening wears a plank DOOR. Sources, diffed per frame:
 *   - wall.gates (the auto-gate and the gate tool's cuts), styled by owner
 *   - a farm's hand-drawn gap (recorded on the farm alone) — hurdle
 *   - a building's own doorway gap (the shape it was drawn with) — door
 * Render reads, never writes.
 */
import * as THREE from 'three';
import {
  DOOR_GAP_MAX,
  FARM_CLOSE_EPS,
  GATE_W,
  type Vec2,
  type WorldState,
} from '../sim/types';

const POST_H = 1.05;
const POST_T = 0.13;
const RAIL_T = 0.055;
const RAIL_HEIGHTS = [0.3, 0.58, 0.86];
const DOOR_H = 2.0; // a person-door; the opening above stays honest air

export class GateLayer {
  private views = new Map<string, THREE.Group>();
  private postMat = new THREE.MeshLambertMaterial({ color: 0x6f5233 }); // set oak
  private railMat = new THREE.MeshLambertMaterial({ color: 0x8a6b45 }); // weathered rail
  private doorMat = new THREE.MeshLambertMaterial({ color: 0x5e4429 }); // dark planks

  constructor(
    private world: WorldState,
    private scene: THREE.Scene,
    private groundAt: (x: number, y: number) => number,
  ) {}

  update(): void {
    const live = new Set<string>();
    const walls = new Map(this.world.walls.map((w) => [w.id, w]));
    const buildingWalls = new Set(this.world.buildings.map((b) => b.wallId));
    const farmWalls = new Set(this.world.farms.map((f) => f.wallId));

    for (const w of this.world.walls) {
      if (w.gates.length === 0) continue;
      const isDoor = buildingWalls.has(w.id);
      if (!isDoor && !farmWalls.has(w.id)) continue;
      for (const g of w.gates) {
        const key = `w${w.id}:${g.x}:${g.y}:${isDoor ? 'd' : 'h'}`;
        live.add(key);
        if (!this.views.has(key)) this.build(key, w.points, g, isDoor, w.height);
      }
    }
    for (const farm of this.world.farms) {
      const w = walls.get(farm.wallId);
      for (const g of farm.gates) {
        if (w && w.gates.some((q) => q.x === g.x && q.y === g.y)) continue;
        const key = `f${farm.id}:${g.x}:${g.y}:h`;
        live.add(key);
        if (!this.views.has(key)) this.build(key, farm.points, g, false, 0);
      }
    }
    for (const b of this.world.buildings) {
      const w = walls.get(b.wallId);
      if (!w || w.points.length < 2) continue;
      const first = w.points[0]!;
      const last = w.points[w.points.length - 1]!;
      const gap = Math.sqrt((first.x - last.x) ** 2 + (first.y - last.y) ** 2);
      if (gap <= FARM_CLOSE_EPS || gap > DOOR_GAP_MAX) continue;
      const g = { x: (first.x + last.x) / 2, y: (first.y + last.y) / 2 };
      const key = `b${b.id}:door`;
      live.add(key);
      if (!this.views.has(key)) this.build(key, w.points, g, true, w.height);
    }

    // removed furniture comes down the day the command lands
    for (const [key, group] of this.views) {
      if (!live.has(key)) {
        this.scene.remove(group);
        for (const child of group.children) (child as THREE.Mesh).geometry?.dispose();
        this.views.delete(key);
      }
    }
  }

  /** hang the piece along the ring's nearest edge (the gap's closing edge counts) */
  private build(
    key: string,
    ring: readonly Vec2[],
    g: Vec2,
    isDoor: boolean,
    wallHeight: number,
  ): void {
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
    const yaw = -Math.atan2(uy, ux);
    const gz = this.groundAt(g.x, g.y);

    if (isDoor) {
      // a plank door filling the opening to head height; a tall opening
      // keeps honest air above the lintel line
      const doorH = Math.min(Math.max(wallHeight, 1.2), DOOR_H);
      const door = new THREE.Mesh(
        new THREE.BoxGeometry(GATE_W - 0.14, doorH - 0.06, 0.09),
        this.doorMat,
      );
      door.position.set(g.x, gz + doorH / 2, g.y);
      door.rotation.y = yaw;
      group.add(door);
      for (const s of [-(GATE_W / 2), GATE_W / 2]) {
        const jamb = new THREE.Mesh(new THREE.BoxGeometry(POST_T, doorH, POST_T), this.postMat);
        jamb.position.set(g.x + ux * s, gz + doorH / 2, g.y + uy * s);
        jamb.rotation.y = yaw;
        group.add(jamb);
      }
    } else {
      const half = GATE_W / 2;
      for (const s of [-half, half]) {
        const px = g.x + ux * s;
        const py = g.y + uy * s;
        const pz = this.groundAt(px, py);
        const post = new THREE.Mesh(new THREE.BoxGeometry(POST_T, POST_H, POST_T), this.postMat);
        post.position.set(px, pz + POST_H / 2, py);
        post.rotation.y = yaw;
        group.add(post);
      }
      for (const h of RAIL_HEIGHTS) {
        const rail = new THREE.Mesh(
          new THREE.BoxGeometry(GATE_W - POST_T, RAIL_T, RAIL_T * 1.4),
          this.railMat,
        );
        rail.position.set(g.x, gz + h, g.y);
        rail.rotation.y = yaw;
        group.add(rail);
      }
    }
    for (const child of group.children) child.frustumCulled = false;
    this.scene.add(group);
    this.views.set(key, group);
  }
}
