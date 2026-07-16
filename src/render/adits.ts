/**
 * Adit display (SIM 15): a drift driven INTO a hillside at the portal's grade, and
 * SELF-DRAINING — the method the red quarry warning points at ("drive an adit") for
 * post that lies drowned or too deep for an open cut. The sim core drives it one
 * person-day at a time and credits the dewatered stone once on holing-through; this
 * layer only READS that state.
 *
 * The drive is UNDERGROUND, so it renders as a GHOST line at grade (depthTest off —
 * an X-ray of the drift beneath the rising hill), boring inward as workDone grows,
 * from a dark mouth at the portal. When it holes through (stoneWon) the drift warms
 * to lamp-lit AMBER — the post struck and dewatered — and a spoil heap rises at the
 * mouth. Field-guide restraint: thin, low-saturation, the science is the spectacle.
 */
import * as THREE from 'three';
import type { AditPlan, WorldState } from '../sim/types';

// the driving drift: a faint warm ghost, drawn THROUGH the hill (depthTest off) so the
// underground drive reads at a glance. Amber once holed — the seam struck and dewatered.
const DRIFT_DRIVING = 0x6b5a44; // damp timber/rock, lamplit but unstruck
const DRIFT_HOLED = 0xd39a4e; // amber — the post won, the drift dewatered

function ghostLineMat(color: number): THREE.LineBasicMaterial {
  return new THREE.LineBasicMaterial({
    color,
    transparent: true,
    opacity: 0.7,
    depthTest: false, // the drift is under the hill — show it through, an X-ray
    depthWrite: false,
  });
}

interface AditView {
  group: THREE.Group;
  workShown: number;
  wonShown: boolean;
}

export class AditLayer {
  private views = new Map<number, AditView>();

  constructor(
    private world: WorldState,
    private scene: THREE.Scene,
    /** displayed terrain height (the decimated mesh) — spoil + the mouth sit on it */
    private terrainGroundAt: (x: number, y: number) => number,
  ) {}

  private progress(a: AditPlan): number {
    return a.workTotal > 0 ? Math.min(1, a.workDone / a.workTotal) : 1;
  }

  update(): void {
    for (const a of this.world.adits) {
      let v = this.views.get(a.id);
      if (!v) {
        v = { group: new THREE.Group(), workShown: -1, wonShown: false };
        this.views.set(a.id, v);
        this.scene.add(v.group);
      }
      if (v.workShown === a.workDone && v.wonShown === a.stoneWon) continue;
      v.workShown = a.workDone;
      v.wonShown = a.stoneWon;
      this.rebuild(a, v);
    }
  }

  private rebuild(a: AditPlan, v: AditView): void {
    for (const child of [...v.group.children]) {
      v.group.remove(child);
      const m = child as THREE.Mesh | THREE.Line;
      m.geometry?.dispose();
    }

    const prog = this.progress(a);
    const won = a.stoneWon;
    // the drift bores INWARD as it is driven: the working face advances from the portal
    // toward the head in proportion to the work done (level, at grade — self-draining).
    const fx = a.portal.x + (a.head.x - a.portal.x) * prog;
    const fy = a.portal.y + (a.head.y - a.portal.y) * prog;

    // the drift: a ghost line at grade from the mouth to the working face, through the hill
    const driftGeo = new THREE.BufferGeometry();
    driftGeo.setAttribute(
      'position',
      new THREE.BufferAttribute(
        new Float32Array([a.portal.x, a.grade, a.portal.y, fx, a.grade, fy]),
        3,
      ),
    );
    const drift = new THREE.Line(driftGeo, ghostLineMat(won ? DRIFT_HOLED : DRIFT_DRIVING));
    drift.frustumCulled = false;
    drift.renderOrder = 3; // over the terrain, with the other ghost overlays
    v.group.add(drift);

    // the mouth: a small dark opening set at the portal, on the hillside foot (at grade)
    const mouth = new THREE.Mesh(
      new THREE.BoxGeometry(2.4, 2.2, 0.6),
      new THREE.MeshBasicMaterial({ color: won ? DRIFT_HOLED : 0x2a2420 }),
    );
    // face the mouth along the drive so its dark opening looks into the hill
    const ang = Math.atan2(a.head.y - a.portal.y, a.head.x - a.portal.x);
    mouth.position.set(a.portal.x, a.grade + 1.0, a.portal.y);
    mouth.rotation.y = -ang;
    mouth.frustumCulled = false;
    v.group.add(mouth);

    // SPOIL at the mouth: waste rock driven out, rising with the work — the surface sign
    // that a drift is being cut here (the other half of the scar, like a quarry's heaps).
    if (prog > 0.06) {
      const h = 0.4 + 1.0 * prog;
      const back = 2.0; // just outside the mouth, on the downhill side (toward the portal-out)
      const ox = a.portal.x - Math.cos(ang) * back;
      const oy = a.portal.y - Math.sin(ang) * back;
      const spoil = new THREE.Mesh(
        new THREE.ConeGeometry(1.3, h, 7),
        new THREE.MeshLambertMaterial({ color: 0x4a4038, side: THREE.DoubleSide }),
      );
      spoil.position.set(ox, this.terrainGroundAt(ox, oy) + h / 2, oy);
      spoil.frustumCulled = false;
      v.group.add(spoil);
    }
  }
}
