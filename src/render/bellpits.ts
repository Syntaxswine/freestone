/**
 * Bell-pit display (SIM 15, the method ladder's third rung): a narrow shaft sunk into flat
 * ground for deeper DRY post than an open cut reaches — the flat-ground answer where the adit
 * has no hill. The sim sinks it one person-day at a time and credits the dry stone once on
 * working-out; this layer only READS that state.
 *
 * The surface signature of a bell pit is unmistakable — a dark shaft MOUTH ringed by a heap of
 * upcast spoil (a field of them dimples the ground for centuries). So it renders as a dark
 * well-head that sinks as workDone grows, ringed by spoil cones that rise with it, capping to a
 * worked-out AMBER timber lid the day it holes its stone. Field-guide restraint: small, low-
 * saturation — the science is the spectacle.
 */
import * as THREE from 'three';
import type { BellPitPlan, WorldState } from '../sim/types';

const SHAFT_UNSTRUCK = 0x2a2420; // the dark mouth, unworked
const SHAFT_WORKED = 0xd39a4e; // amber timber lid — the dry post won (matches the adit's holed tone)
const SPOIL = 0x4a4038; // upcast waste rock, like the quarry's heaps

interface BellPitView {
  group: THREE.Group;
  workShown: number;
  wonShown: boolean;
}

export class BellPitLayer {
  private views = new Map<number, BellPitView>();

  constructor(
    private world: WorldState,
    private scene: THREE.Scene,
    /** displayed terrain height (the decimated mesh) — the mouth + spoil sit on it */
    private terrainGroundAt: (x: number, y: number) => number,
  ) {}

  private progress(b: BellPitPlan): number {
    return b.workTotal > 0 ? Math.min(1, b.workDone / b.workTotal) : 1;
  }

  update(): void {
    for (const b of this.world.bellPits) {
      let v = this.views.get(b.id);
      if (!v) {
        v = { group: new THREE.Group(), workShown: -1, wonShown: false };
        this.views.set(b.id, v);
        this.scene.add(v.group);
      }
      if (v.workShown === b.workDone && v.wonShown === b.stoneWon) continue;
      v.workShown = b.workDone;
      v.wonShown = b.stoneWon;
      this.rebuild(b, v);
    }
  }

  private rebuild(b: BellPitPlan, v: BellPitView): void {
    for (const child of [...v.group.children]) {
      v.group.remove(child);
      (child as THREE.Mesh).geometry?.dispose();
    }
    const prog = this.progress(b);
    const won = b.stoneWon;
    const g = this.terrainGroundAt(b.at.x, b.at.y);

    // the shaft MOUTH: a short dark cylinder well-head, sinking a little as the shaft deepens.
    // Capped AMBER (a timber lid over the worked-out shaft) once the stone is won.
    const collar = 1.1;
    const sink = 0.15 + 0.5 * prog; // the mouth recesses as it is sunk
    const mouth = new THREE.Mesh(
      new THREE.CylinderGeometry(collar, collar * 0.85, 0.5, 12),
      new THREE.MeshLambertMaterial({ color: won ? SHAFT_WORKED : SHAFT_UNSTRUCK, side: THREE.DoubleSide }),
    );
    mouth.position.set(b.at.x, g + 0.25 - sink, b.at.y);
    mouth.frustumCulled = false;
    v.group.add(mouth);

    // SPOIL: a ring of upcast heaps around the mouth, rising with the sinking — the bell pit's
    // signature dimpled ring. A few cones just outside the collar.
    if (prog > 0.05) {
      const h = 0.4 + 1.1 * prog;
      const n = 6;
      const rad = collar + 1.3;
      for (let i = 0; i < n; i++) {
        const a = (2 * Math.PI * i) / n + b.id; // rotate per-pit so rings don't line up
        const ox = b.at.x + Math.cos(a) * rad;
        const oy = b.at.y + Math.sin(a) * rad;
        const cone = new THREE.Mesh(
          new THREE.ConeGeometry(0.9, h, 7),
          new THREE.MeshLambertMaterial({ color: SPOIL, side: THREE.DoubleSide }),
        );
        cone.position.set(ox, this.terrainGroundAt(ox, oy) + h / 2, oy);
        cone.frustumCulled = false;
        v.group.add(cone);
      }
    }
  }
}
