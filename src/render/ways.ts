/**
 * THE TIMBER WAY, made visible (SIM 38). A causeway of transverse baulks — a corduroy/plank
 * road — laid along the drawn run and creeping forward as the road hands plank it: the way
 * is BUILT FROM ITS HEAD, so only `length × workDone/workTotal` of it is road, and the eye
 * sees exactly what the sim believes (SIM 39 reads the same prefix for its speed).
 *
 * The fiction is research-bounded (DIGEST-2026-07-16): a timber causeway the sledge rides is
 * honestly medieval (Ely 1071, Berlin 1238). No rails, no wheels, no conveyor — those are
 * post-1500 and stay out of the picture as well as out of the flavour text.
 *
 * Render reads state, never writes; sleeper jitter comes from integer hashes, never the sim
 * rng. Sleepers ride the shared displayed surface (`groundAt`), never full-res site heights —
 * the house law, or the road buries itself in the hill.
 */
import * as THREE from 'three';
import type { WayPlan, WorldState } from '../sim/types';

const SLEEPER_GAP = 0.9; // m between transverse baulks
const SLEEPER = { w: 2.2, h: 0.12, d: 0.38 }; // a baulk: two paces wide, ankle high
const RAISE = 0.06; // the road sits ON the turf, a hand's breadth proud
const MAX_SLEEPERS = 4000; // the instance cap — REGROWS (a hard cap once froze a wall at 20k)

function hash1(a: number): number {
  let x = Math.imul(a + 1, 0x85ebca6b) >>> 0;
  x = Math.imul(x ^ (x >>> 15), 0x27d4eb2f) >>> 0;
  return ((x ^ (x >>> 15)) >>> 0) / 4294967296;
}

export class WayLayer {
  private mesh: THREE.InstancedMesh;
  private cap = MAX_SLEEPERS;
  private shown = -1;
  private lastKey = '';
  private dummy = new THREE.Object3D();

  constructor(
    private world: WorldState,
    private groundAt: (x: number, y: number) => number,
    private scene: THREE.Scene,
  ) {
    const geo = new THREE.BoxGeometry(SLEEPER.w, SLEEPER.h, SLEEPER.d);
    const mat = new THREE.MeshLambertMaterial({ color: 0x8a6a45 }); // seasoned oak baulk
    this.mesh = new THREE.InstancedMesh(geo, mat, this.cap);
    this.mesh.count = 0;
    this.mesh.castShadow = false;
    this.mesh.receiveShadow = true;
    this.scene.add(this.mesh);
  }

  setVisible(v: boolean): void {
    this.mesh.visible = v;
  }

  /** the BUILT prefix of a way: the road is laid from its head, so this IS what exists */
  static builtLength(w: WayPlan): number {
    return w.length * Math.min(1, w.workDone / w.workTotal);
  }

  update(): void {
    // a cheap key: re-lay the sleepers only when a way's built length actually moves
    const key = this.world.ways.map((w) => `${w.id}:${Math.round(w.workDone * 100)}`).join('|');
    if (key === this.lastKey) return;
    this.lastKey = key;

    const placements: { x: number; y: number; yaw: number; id: number; i: number }[] = [];
    for (const way of this.world.ways) {
      let laid = WayLayer.builtLength(way);
      if (laid <= 0) continue;
      // walk the run in PLAN, spending the built length as we go — the same head-first
      // order the crew planks it in, so a half-built way stops halfway along the drawing
      let carried = 0; // distance since the last sleeper
      let n = 0;
      for (let s = 1; s < way.points.length && laid > 0; s++) {
        const a = way.points[s - 1]!;
        const b = way.points[s]!;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const legLen = Math.sqrt(dx * dx + dy * dy);
        if (legLen <= 0) continue;
        const yaw = Math.atan2(dx, dy); // render-only trig: never enters sim state
        const walk = Math.min(legLen, laid);
        for (let d = SLEEPER_GAP - carried; d <= walk; d += SLEEPER_GAP) {
          const t = d / legLen;
          placements.push({ x: a.x + dx * t, y: a.y + dy * t, yaw, id: way.id, i: n++ });
        }
        carried = (carried + walk) % SLEEPER_GAP;
        laid -= walk;
      }
    }

    // the cap REGROWS rather than silently truncating the road
    if (placements.length > this.cap) {
      this.cap = Math.max(placements.length, this.cap * 2);
      this.scene.remove(this.mesh);
      this.mesh.dispose();
      const old = this.mesh;
      this.mesh = new THREE.InstancedMesh(old.geometry, old.material, this.cap);
      this.mesh.receiveShadow = true;
      this.scene.add(this.mesh);
      this.shown = -1;
    }

    // any array that can SHRINK must re-upload from 0 (the two-gates lesson: an
    // incremental upload + count-- kept drawing removed matrices)
    for (let i = 0; i < placements.length; i++) {
      const p = placements[i]!;
      const j = hash1(p.id * 7919 + p.i);
      this.dummy.position.set(p.x, this.groundAt(p.x, p.y) + RAISE, p.y);
      this.dummy.rotation.set(0, p.yaw + (j - 0.5) * 0.06, 0); // hand-laid, not machined
      this.dummy.scale.set(1 + (j - 0.5) * 0.08, 1, 1);
      this.dummy.updateMatrix();
      this.mesh.setMatrixAt(i, this.dummy.matrix);
    }
    this.mesh.count = placements.length;
    this.mesh.instanceMatrix.needsUpdate = true;
    this.shown = placements.length;
  }

  /** the count on screen — the probe's handle (screenshots time out; instances don't) */
  get sleeperCount(): number {
    return this.shown;
  }
}
