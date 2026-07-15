/**
 * The great wheel made VISIBLE (the plain-renders debt, the signature machine): when a stone wall
 * climbs past a hand's reach and the woodpile can spare the timber, the masons raise a GREAT WHEEL —
 * a timber treadwheel crane — and it cuts the lift's penalty thereafter (SIM 26). Until now that wheel
 * turned INVISIBLY: `wall.wheel` went true, the stone climbed faster, and nothing on the ground showed
 * why. Now a treadwheel crane stands beside every wall that raised one — the wheel a man would tread to
 * hoist the block, its frame, its jib and the dressed stone swinging on the rope.
 *
 * Pure presentation, derived from sim truth (which walls raised a wheel), never touching the sim. One
 * crane per wheeled wall, placed once. A THREE.Group holds the whole engine in a LOCAL frame (+x along
 * the wall, +z out from it, +y up) and is set on the ground and turned to the wall — so the geometry
 * reads the same however the wall runs. Chunky Townscaper timber; stands on the DISPLAYED surface.
 */
import * as THREE from 'three';
import type { WorldState } from '../sim/types';

export class WheelLayer {
  private seen = new Set<number>(); // wall ids that already have a crane
  private cranes: THREE.Group[] = [];
  private box = new THREE.BoxGeometry(1, 1, 1);
  private cyl = new THREE.CylinderGeometry(0.5, 0.5, 1, 8);
  private torus = new THREE.TorusGeometry(1.25, 0.16, 8, 20); // the treadwheel rim
  private timber = new THREE.MeshLambertMaterial({ color: 0x7a5a34 }); // the crane's oak
  private timber2 = new THREE.MeshLambertMaterial({ color: 0x8a6b45 }); // the wheel, a shade lighter
  private rope = new THREE.MeshLambertMaterial({ color: 0xb8a06e }); // the hoist line
  private stone = new THREE.MeshLambertMaterial({ color: 0x9a9488 }); // a dressed block on the hook

  constructor(
    private world: WorldState,
    private scene: THREE.Scene,
    private groundAt: (x: number, y: number) => number,
  ) {}

  update(): void {
    for (const wall of this.world.walls) {
      if (!wall.wheel || this.seen.has(wall.id)) continue;
      if (wall.points.length < 2) continue;
      this.seen.add(wall.id);
      this.raise(wall.points);
    }
  }

  setVisible(on: boolean): void {
    for (const c of this.cranes) c.visible = on;
  }

  private raise(points: readonly { x: number; y: number }[]): void {
    // the longest segment gives the wall's line; the crane stands at its midpoint, set OUT from the wall
    let ax = points[0]!.x;
    let ay = points[0]!.y;
    let bx = points[1]!.x;
    let by = points[1]!.y;
    let best = -1;
    for (let i = 0; i < points.length - 1; i++) {
      const p = points[i]!;
      const q = points[i + 1]!;
      const l = (q.x - p.x) ** 2 + (q.y - p.y) ** 2;
      if (l > best) {
        best = l;
        ax = p.x;
        ay = p.y;
        bx = q.x;
        by = q.y;
      }
    }
    const mx = (ax + bx) / 2;
    const my = (ay + by) / 2;
    const dx = bx - ax;
    const dy = by - ay;
    const len = Math.hypot(dx, dy) || 1;
    const ux = dx / len;
    const uy = dy / len; // along the wall
    const nx = -uy;
    const ny = ux; // the outward normal (one side; the crane stands off the wall)
    const OFF = 2.6;
    const cx = mx + nx * OFF;
    const cy = my + ny * OFF;
    const gy = this.groundAt(cx, cy);

    // a group in local coords: +x along the wall, +z OUT (toward the wall is -z), +y up. Turn it so
    // local +x lands along (ux, uy) in the world (THREE: x = worldX, z = worldY).
    const g = new THREE.Group();
    g.position.set(cx, gy, cy);
    g.rotation.y = Math.atan2(ux, uy);

    const slab = (mat: THREE.Material, w: number, h: number, d: number, x: number, y: number, z: number): void => {
      const m = new THREE.Mesh(this.box, mat);
      m.scale.set(w, h, d);
      m.position.set(x, y, z);
      m.frustumCulled = false;
      g.add(m);
    };
    const rod = (mat: THREE.Material, dia: number, l: number, x: number, y: number, z: number, rx = 0, rz = 0): void => {
      const m = new THREE.Mesh(this.cyl, mat);
      m.scale.set(dia, l, dia);
      m.position.set(x, y, z);
      m.rotation.set(rx, 0, rz);
      m.frustumCulled = false;
      g.add(m);
    };

    const H = 3.0; // the frame's height
    // four corner posts of a 1.7 (along) × 1.1 (out) housing
    for (const sx of [-0.85, 0.85]) {
      for (const sz of [-0.55, 0.55]) slab(this.timber, 0.16, H, 0.16, sx, H / 2, sz);
    }
    // base sills + top plates along the wall on both out-sides
    for (const sz of [-0.55, 0.55]) {
      slab(this.timber, 1.9, 0.16, 0.18, 0, 0.1, sz);
      slab(this.timber, 1.9, 0.16, 0.18, 0, H, sz);
    }
    // the two cross-plates over the top, tying the frame and bearing the axle
    for (const sx of [-0.85, 0.85]) slab(this.timber, 0.18, 0.16, 1.2, sx, H, 0);

    // the TREADWHEEL: a rim standing in the local YZ plane (axle along +x, the wall line), man-high
    const wy = 1.55;
    const wheel = new THREE.Mesh(this.torus, this.timber2);
    wheel.rotation.y = Math.PI / 2; // turn the rim's face from +z to +x — the axle now runs along the wall
    wheel.position.set(0, wy, 0);
    wheel.frustumCulled = false;
    g.add(wheel);
    // the axle down the middle, and two spoke-bars making the wheel's cross
    rod(this.timber, 0.12, 1.3, 0, wy, 0, 0, Math.PI / 2); // axle along local x (cylinder tipped onto x)
    slab(this.timber2, 0.1, 2.5, 0.1, 0, wy, 0); // a vertical spoke bar
    slab(this.timber2, 0.1, 0.1, 2.5, 0, wy, 0); // a horizontal spoke bar

    // the JIB reaching OVER the wall (toward local -z) and a touch up, the rope and a block on the hook
    slab(this.timber, 0.18, 0.18, 2.2, 0, H + 0.15, -0.9); // the jib beam out past the frame
    rod(this.rope, 0.04, 1.5, 0, H - 0.6, -1.85); // the hoist rope hanging from the jib's tip
    slab(this.stone, 0.55, 0.42, 0.55, 0, H - 1.5, -1.85); // a dressed block swinging up on the line

    g.frustumCulled = false;
    this.scene.add(g);
    this.cranes.push(g);
  }
}
