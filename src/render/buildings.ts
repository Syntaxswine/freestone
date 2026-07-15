/**
 * Roofs: a building wears the roof its DRAWINGS chose (SIM 12 — the roof is
 * the plot's first answer, before the masons build): wood or straw dresses a
 * gable in that material's tones; 'none' keeps the sky; brick is a REAL deck
 * (a Roof record the laborers build — RoofLayer draws it, not this).
 * Render reads, never writes; the gable appears the day the shell completes
 * (honest gable carpentry as its own labor phase stays in BACKLOG).
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
import { COURSE_HEIGHT, houseTier, type Vec2, type WorldState } from '../sim/types';

const OVERHANG = 0.35; // meters of eave past the wall face
const PITCH = 0.5; // ridge rise per meter of half-span (0.5 = 45°)
/**
 * The roof GRIPS the wall (boss finding 2026-07-10 — "roofs are not sitting
 * on the structure properly"): the eave plane sinks a course INTO the
 * masonry (a real roof bears on the wall plate; the top course disappears
 * under the edge), and a fascia skirt hangs below the whole perimeter so a
 * wavy wall top on sloped ground never shows daylight under the eave.
 */
const EAVE_SINK = 0.25; // one course below the highest stone top
const FASCIA = 0.55; // meters of skirt below the eave line

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
  ) {}

  update(): void {
    while (this.built < this.world.buildings.length) {
      this.build(this.built);
      this.built += 1;
    }
  }

  private build(index: number): void {
    const b = this.world.buildings[index]!;
    // the drawings rule: 'none' keeps the sky, brick is RoofLayer's real deck
    if (b.roof !== 'wood' && b.roof !== 'straw') return;
    const wall = this.world.walls.find((w) => w.id === b.wallId);
    if (!wall) return;
    const corners = reduceCorners(wall.points);
    if (corners.length !== 4) return; // an irregular shell keeps the sky for now

    // eaves cap what was actually BUILT: the highest as-laid stone top of this
    // wall. Ground math would mix the decimated display surface with the sim's
    // full-res stone heights (up to ~0.5 m apart) and let top courses pierce
    // the roof; the stones themselves are the one honest datum. The building
    // is recognized only at completion, so every stone is already in state.
    let topZ = -Infinity;
    for (const s of this.world.stones) {
      if (s.wallId === wall.id && s.pos[2] > topZ) topZ = s.pos[2];
    }
    if (topZ === -Infinity) return; // no stones, no roof (unreachable past recognition)
    const eaveZ = topZ + COURSE_HEIGHT / 2 - EAVE_SINK;

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

    // the chosen covering's tones: golden thatch or weathered planking
    const j = hash1(b.id);
    const color =
      b.roof === 'straw'
        ? new THREE.Color().setHSL(0.1 + j * 0.02, 0.38, 0.52 + j * 0.08)
        : new THREE.Color().setHSL(0.075 + j * 0.02, 0.36, 0.4 + j * 0.07);

    // two slope quads + two gable triangles + a fascia skirt around the
    // perimeter, non-indexed for crisp facets
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
    // the skirt: eave line down to eaveZ − FASCIA on every perimeter edge
    const lowZ = eaveZ - FASCIA;
    const ring = [s0, s1, s2, s3];
    for (let i = 0; i < 4; i++) {
      const a = ring[i]!;
      const b = ring[(i + 1) % 4]!;
      positions.push(
        ...v(a, eaveZ), ...v(b, eaveZ), ...v(b, lowZ),
        ...v(a, eaveZ), ...v(b, lowZ), ...v(a, lowZ),
      );
    }
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

    // A HALL (SIM 25 tier — a great floor under a fine roof) wears a finer ROOFLINE than a hovel:
    // a cresting cap runs the ridge and a finial rises at each gable peak, so the great house reads
    // across the settlement, not only in the count. Only halls; a hovel or cottage keeps its plain gable.
    if (b.kind === 'house' && houseTier(b.area, b.roof) === 'hall') {
      const crestMat = new THREE.MeshLambertMaterial({ color: color.clone().multiplyScalar(0.72) });
      const rdx = g1.x - g0.x;
      const rdy = g1.y - g0.y;
      const rlen = Math.sqrt(rdx * rdx + rdy * rdy) || 1;
      // the ridge cap — a slim beam a hair proud of the ridge line (g0 → g1 at ridgeZ)
      const cap = new THREE.Mesh(new THREE.BoxGeometry(rlen, 0.14, 0.16), crestMat);
      cap.position.set((g0.x + g1.x) / 2, ridgeZ + 0.07, (g0.y + g1.y) / 2);
      cap.rotation.y = Math.atan2(-rdy / rlen, rdx / rlen); // align the beam's length to the ridge
      cap.frustumCulled = false;
      this.meshes.push(cap);
      this.scene.add(cap);
      // a finial post + knob at each gable peak
      for (const g of [g0, g1]) {
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.5, 0.14), crestMat);
        post.position.set(g.x, ridgeZ + 0.28, g.y);
        post.frustumCulled = false;
        this.meshes.push(post);
        this.scene.add(post);
        const knob = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.16, 0.24), crestMat);
        knob.position.set(g.x, ridgeZ + 0.56, g.y);
        knob.frustumCulled = false;
        this.meshes.push(knob);
        this.scene.add(knob);
      }
    }
  }
}
