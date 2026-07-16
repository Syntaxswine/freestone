/**
 * Shaft-and-pump display (SIM 15, the method ladder's fourth + last rung): a deep shaft with
 * continuous dewatering — the only method that beats the water table, winning DROWNED post the
 * open cut, adit and bell pit can't. The sim sinks it one person-day at a time (the pump tax
 * baked into its workTotal) and credits the dewatered stone once on working-out; this layer
 * only READS that state.
 *
 * A deep shaft's surface signature is its HEADFRAME — the winding gear over the mouth — so it
 * renders as a tall dark timber frame above a well-head, ringed by a broad spoil heap, capping
 * to worked-out AMBER the day it holes its stone. Taller + heavier than a bell pit's low
 * well-head, so the two rungs read apart at a glance. Field-guide restraint holds.
 */
import * as THREE from 'three';
import type { ShaftPlan, WorldState } from '../sim/types';

const FRAME = 0x2e2620; // the headframe timber, dark
const WORKED = 0xd39a4e; // amber — the dewatered post won (matches the bell pit + adit holed tone)
const RIM = 0x3a322a; // the well-head stone rim
const SPOIL = 0x4a4038; // upcast waste, like the quarry + bell-pit heaps

interface ShaftView {
  group: THREE.Group;
  workShown: number;
  wonShown: boolean;
}

export class ShaftLayer {
  private views = new Map<number, ShaftView>();

  constructor(
    private world: WorldState,
    private scene: THREE.Scene,
    private terrainGroundAt: (x: number, y: number) => number,
  ) {}

  private progress(s: ShaftPlan): number {
    return s.workTotal > 0 ? Math.min(1, s.workDone / s.workTotal) : 1;
  }

  update(): void {
    for (const s of this.world.shafts) {
      let v = this.views.get(s.id);
      if (!v) {
        v = { group: new THREE.Group(), workShown: -1, wonShown: false };
        this.views.set(s.id, v);
        this.scene.add(v.group);
      }
      if (v.workShown === s.workDone && v.wonShown === s.stoneWon) continue;
      v.workShown = s.workDone;
      v.wonShown = s.stoneWon;
      this.rebuild(s, v);
    }
  }

  private rebuild(s: ShaftPlan, v: ShaftView): void {
    for (const child of [...v.group.children]) {
      v.group.remove(child);
      (child as THREE.Mesh).geometry?.dispose();
    }
    const prog = this.progress(s);
    const won = s.stoneWon;
    const g = this.terrainGroundAt(s.at.x, s.at.y);

    // the well-head rim (a shaft's mouth), dark stone, sitting on the turf
    const collar = 1.5;
    const wall = new THREE.Mesh(
      new THREE.CylinderGeometry(collar, collar * 0.85, 0.9, 14, 1, true),
      new THREE.MeshLambertMaterial({ color: RIM, side: THREE.DoubleSide }),
    );
    wall.position.set(s.at.x, g + 0.45, s.at.y);
    wall.frustumCulled = false;
    v.group.add(wall);

    // the CAP across the mouth: AMBER dewatered post once worked out, else the dark OPEN shaft
    const cap = new THREE.Mesh(
      new THREE.CylinderGeometry(collar * 0.85, collar * 0.85, 0.14, 14),
      new THREE.MeshLambertMaterial({ color: won ? WORKED : 0x15110d, side: THREE.DoubleSide }),
    );
    cap.position.set(s.at.x, g + 0.85, s.at.y);
    cap.frustumCulled = false;
    v.group.add(cap);

    // the HEADFRAME: a tall dark timber tower over the mouth — the winding gear, a deep shaft's
    // signature. It rises as the shaft is sunk (the frame goes up with the depth).
    const fh = 2.2 + 2.0 * prog; // frame height grows with the sinking
    const frameMat = new THREE.MeshLambertMaterial({ color: FRAME, side: THREE.DoubleSide });
    for (const dx of [-collar * 0.7, collar * 0.7]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.22, fh, 0.22), frameMat);
      leg.position.set(s.at.x + dx, g + fh / 2, s.at.y);
      // lean the legs inward slightly (an A-frame)
      leg.rotation.z = dx < 0 ? -0.14 : 0.14;
      leg.frustumCulled = false;
      v.group.add(leg);
    }
    // the head beam across the top (carries the winding wheel)
    const beam = new THREE.Mesh(new THREE.BoxGeometry(collar * 1.5, 0.26, 0.3), frameMat);
    beam.position.set(s.at.x, g + fh, s.at.y);
    beam.frustumCulled = false;
    v.group.add(beam);
    // the winding wheel — a small disc on the beam (amber once the post is won, else timber)
    const wheel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.42, 0.42, 0.12, 12).rotateZ(Math.PI / 2),
      new THREE.MeshLambertMaterial({ color: won ? WORKED : FRAME, side: THREE.DoubleSide }),
    );
    wheel.position.set(s.at.x, g + fh - 0.1, s.at.y + 0.2);
    wheel.frustumCulled = false;
    v.group.add(wheel);

    // SPOIL: a broad ring of upcast heaps (a deep shaft brings up a lot), rising with the sinking
    if (prog > 0.05) {
      const h = 0.45 + 1.0 * prog;
      const n = 7;
      const rad = collar + 1.9;
      for (let i = 0; i < n; i++) {
        const a = (2 * Math.PI * i) / n + s.id;
        const ox = s.at.x + Math.cos(a) * rad;
        const oy = s.at.y + Math.sin(a) * rad;
        const cone = new THREE.Mesh(
          new THREE.ConeGeometry(0.85, h, 7),
          new THREE.MeshLambertMaterial({ color: SPOIL, side: THREE.DoubleSide }),
        );
        cone.position.set(ox, this.terrainGroundAt(ox, oy) + h / 2, oy);
        cone.frustumCulled = false;
        v.group.add(cone);
      }
    }
  }
}
