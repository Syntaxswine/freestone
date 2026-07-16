/**
 * The tracing floor (roadmap Beat 2 — the memory suite's sixth reader, and the one
 * that needs no click): every plan the castle was ever drawn from, scored faintly
 * into the ground as a palimpsest of setting-out lines. A master mason scribed his
 * full-size geometry into a plaster tracing floor before a single stone was cut from
 * it; the scored lines stayed, layer on layer, a ghost of every drawing made there.
 *
 * The whole building site is that floor. This layer reads the COMMAND LOG — every
 * `plan_wall` (walls and buildings, an open run) and `plan_fill` (earthworks and
 * enclosures, a closed ring) the castle was raised from — and draws each footprint
 * as a pale, translucent line a hair above the turf. The standing stone reads first;
 * the ghost of its drawing whispers underneath. Render-only: it never touches the
 * sim, only the append-only log the sim replays from.
 *
 * All presentation sits on the DISPLAYED surface (terrain.groundAt), the house law,
 * so a scribe follows the hill instead of burying under the decimated mesh.
 */
import * as THREE from 'three';
import type { Command, Vec2 } from '../sim/types';

const STEP = 2.5; // meters between ground samples along a scored edge (so it follows the hill)
const LIFT = 0.04; // just above the turf — clear of z-fighting, below every built thing

// a single faint chalk-ochre, shared by every scribe: a line scored in plaster, not a
// thing that competes with the stone. depthWrite off so it never occludes; it only ever whispers.
const SCRIBE_MAT = new THREE.LineBasicMaterial({
  color: 0xdcc7a6,
  transparent: true,
  opacity: 0.2,
  depthWrite: false,
});

export class TracingFloorLayer {
  private group = new THREE.Group();
  private built = 0; // how many commandLog entries we've already scored

  constructor(
    private commandLog: Command[],
    private scene: THREE.Scene,
    private terrainGroundAt: (x: number, y: number) => number,
  ) {
    this.scene.add(this.group);
  }

  /** score any plans appended since last call. commandLog is append-only within a run;
   *  a load rebuilds a fresh layer over a fresh log (the reload rails), so this stays honest. */
  update(): void {
    for (let i = this.built; i < this.commandLog.length; i++) {
      const c = this.commandLog[i]!;
      if (c.kind === 'plan_wall') this.scribe(c.points, false);
      else if (c.kind === 'plan_fill') this.scribe(c.points, true);
    }
    this.built = this.commandLog.length;
  }

  /** one scored line: the footprint sampled along the ground, open for a run, closed for a ring */
  private scribe(points: Vec2[], closed: boolean): void {
    if (points.length < 2) return;
    const verts: number[] = [];
    const n = points.length;
    const edges = closed ? n : n - 1;
    for (let e = 0; e < edges; e++) {
      const a = points[e]!;
      const b = points[(e + 1) % n]!;
      const seg = Math.hypot(b.x - a.x, b.y - a.y);
      const steps = Math.max(1, Math.ceil(seg / STEP));
      // skip each edge's shared first vertex except on the very first edge, so the
      // polyline has no doubled points at the joints
      for (let k = e === 0 ? 0 : 1; k <= steps; k++) {
        const t = k / steps;
        const x = a.x + (b.x - a.x) * t;
        const y = a.y + (b.y - a.y) * t;
        verts.push(x, this.terrainGroundAt(x, y) + LIFT, y);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(verts), 3));
    const line = new THREE.Line(geo, SCRIBE_MAT);
    line.frustumCulled = false;
    this.group.add(line);
  }
}
