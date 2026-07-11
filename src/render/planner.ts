/**
 * Wall-drawing tool. Pure render/input layer: it builds a polyline by picking
 * ground points on the displayed heightfield (analytic ray march — see
 * marchGround), previews it as a ground-snapped line + translucent ribbon,
 * and on confirm hands the points to onConfirm — whose only legal act is
 * enqueue({kind:'plan_wall', ...}). The planner itself never touches WorldState.
 *
 * Input grammar (also shown in the HUD hint):
 *   WALL (B):      click places points · right-click/Backspace undoes ·
 *                  double-click/Enter commits · Esc puts the pencil down
 *   BUILDING (H):  two clicks set the front corners · the cursor pulls the
 *                  depth · a third click (or Enter) raises the shell
 *   FILL (F):      click rings a polygon (≥3) · double-click/Enter tips the
 *                  dirt — laborers fill it to the drawn height over the days
 * Click-vs-drag is discriminated by pointer travel so OrbitControls keeps
 * owning drags; a "click" is a press that moved < 6 px and lasted < 500 ms.
 */
import * as THREE from 'three';
import { classifyFootprint, type FootprintKind } from '../sim/classify';
import type { SiteData } from '../sim/site';
import { polylineLength, surveyWall } from '../sim/step';
import { MATERIALS, ROOF_DECK, ROOF_SNAP, type Material, type Vec2 } from '../sim/types';

const MIN_POINT_GAP = 0.6; // meters: clicks closer than this to the last point are ignored
const SNAP_PX = 16; // screen px: a wall click this near the FIRST point closes the ring
const GEO_SNAP_PX = 16; // screen px: ⇧-snap radius for corners (wall vertices, own points)
const EDGE_SNAP_PX = 12; // screen px: ⇧-snap radius for a point ON a wall segment
const SAMPLE_STEP = 2; // meters between preview samples along each segment
const MAX_SAMPLES = 2048;
const MAX_POINTS = 128;
const LINE_LIFT = 0.12; // meters above ground so the preview never z-fights the terrain
const DOOR_W = 1.1; // meters left open at the front-edge middle — the gap IS the doorway
const MIN_EDGE = 2.0; // a building front shorter than this won't close into a loop
const MIN_DEPTH = 1.2; // a building shallower than this won't commit

export interface PlannerDeps {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  site: SiteData;
  /**
   * Height of the DISPLAYED terrain surface (the decimated mesh). All preview
   * geometry sits on this — full-res site.heightAt can land UNDER the drawn mesh
   * and bury the preview. The committed command carries only (x, y); the sim
   * still lays stones from its own full-res heights.
   */
  groundAt: (x: number, y: number) => number;
  /**
   * The SIM's own ground (effectiveGroundAt), for the survey that counts
   * stones (SIM 13 parity law: the promised count is the record's, and the
   * record is surveyed on full-res sim ground, not the decimated display).
   * Absent (tests), the display ground serves.
   */
  countGround?: (x: number, y: number) => number;
  heightBounds: { min: number; max: number };
  dom: HTMLElement;
  /** the one exit: hand the plan to the command log; return false to keep drawing */
  onConfirm: (mode: PlannerMode, points: Vec2[], height: number, material: Material) => boolean;
  onModeChange?: (active: boolean, mode: PlannerMode) => void;
  /** gate mode's exit: a picked ground point — the resolver decides add/remove */
  onGate?: (point: Vec2) => void;
  /**
   * Existing geometry the ⇧-snap magnetizes to (wall plans with their height
   * and build state). A getter, not a snapshot: the world grows while the
   * pencil is out. Roof mode snaps at wall TOPS and only to COMPLETE walls
   * (the sim's support rule, mirrored — boss finding 2026-07-10: the roof
   * tool snapped to the bottom of walls).
   */
  snapTargets?: () => readonly SnapWall[];
}

/** a wall plan as the snap sees it */
export interface SnapWall {
  points: readonly Vec2[];
  height: number;
  complete: boolean;
}

export type PlannerMode = 'wall' | 'building' | 'fill' | 'gate' | 'roof' | 'cut';

export class WallPlanner {
  active = false;
  mode: PlannerMode = 'wall';
  height = 4;
  /** applies to wall/building plans; fills are always dirt */
  material: Material = 'sandstone';
  /** fill plans: a flat platform, or a ramp rising from the first-placed edge */
  fillShape: 'flat' | 'ramp' = 'flat';
  points: Vec2[] = [];
  private cursor: Vec2 | null = null;
  private readonly deps: PlannerDeps;
  private readonly raycaster = new THREE.Raycaster();
  private readonly group = new THREE.Group();
  private readonly line: THREE.Line;
  private readonly ribbon: THREE.Mesh;
  private readonly markers: THREE.Points;
  private readonly cursorRing: THREE.Mesh;
  private readonly linePos: THREE.BufferAttribute;
  private readonly ribbonPos: THREE.BufferAttribute;
  private readonly markerPos: THREE.BufferAttribute;
  /** true while the cursor sits on a snap target (drives the ring feedback) */
  snapped = false;
  private downX = 0;
  private downY = 0;
  private downT = 0;
  private downButton = -1;
  /** screen position/time of the last ACCEPTED point, to swallow double-click jitter */
  private lastAddX = 0;
  private lastAddY = 0;
  private lastAddT = -1e9;

  constructor(deps: PlannerDeps) {
    this.deps = deps;

    const lineGeo = new THREE.BufferGeometry();
    this.linePos = new THREE.BufferAttribute(new Float32Array(MAX_SAMPLES * 3), 3);
    lineGeo.setAttribute('position', this.linePos);
    lineGeo.setDrawRange(0, 0);
    this.line = new THREE.Line(
      lineGeo,
      new THREE.LineBasicMaterial({ color: 0xd8d3c4 }),
    );

    const ribbonGeo = new THREE.BufferGeometry();
    this.ribbonPos = new THREE.BufferAttribute(new Float32Array(MAX_SAMPLES * 2 * 3), 3);
    ribbonGeo.setAttribute('position', this.ribbonPos);
    const idx = new Uint32Array((MAX_SAMPLES - 1) * 6);
    for (let i = 0; i < MAX_SAMPLES - 1; i++) {
      const b = i * 2;
      idx.set([b, b + 1, b + 2, b + 1, b + 3, b + 2], i * 6);
    }
    ribbonGeo.setIndex(new THREE.BufferAttribute(idx, 1));
    ribbonGeo.setDrawRange(0, 0);
    this.ribbon = new THREE.Mesh(
      ribbonGeo,
      new THREE.MeshBasicMaterial({
        color: 0xd8d3c4,
        transparent: true,
        opacity: 0.16,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    );

    const markerGeo = new THREE.BufferGeometry();
    this.markerPos = new THREE.BufferAttribute(new Float32Array(MAX_POINTS * 3), 3);
    markerGeo.setAttribute('position', this.markerPos);
    markerGeo.setDrawRange(0, 0);
    this.markers = new THREE.Points(
      markerGeo,
      new THREE.PointsMaterial({ color: 0xf0ead6, size: 6, sizeAttenuation: false }),
    );

    this.cursorRing = new THREE.Mesh(
      new THREE.RingGeometry(0.45, 0.65, 24).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({
        color: 0xf0ead6,
        transparent: true,
        opacity: 0.8,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    );
    this.cursorRing.visible = false;

    // preallocated buffers start as zeros at the origin — computed bounds would be
    // nonsense, and the handoff's law stands: never let culling blink the UI out
    for (const obj of [this.line, this.ribbon, this.markers, this.cursorRing]) {
      obj.frustumCulled = false;
      this.group.add(obj);
    }
    this.group.visible = false;
    deps.scene.add(this.group);

    deps.dom.addEventListener('pointerdown', this.onPointerDown);
    deps.dom.addEventListener('pointerup', this.onPointerUp);
    deps.dom.addEventListener('pointermove', this.onPointerMove);
    deps.dom.addEventListener('dblclick', this.onDblClick);
    window.addEventListener('keydown', this.onKeyDown);
  }

  toggle(mode: PlannerMode = 'wall'): void {
    if (this.active && this.mode === mode) {
      this.exit();
      return;
    }
    if (this.active) this.exit();
    this.mode = mode;
    this.enter();
  }

  cycleMaterial(): Material {
    const i = MATERIALS.indexOf(this.material);
    this.material = MATERIALS[(i + 1) % MATERIALS.length]!;
    return this.material;
  }

  cycleFillShape(): 'flat' | 'ramp' {
    this.fillShape = this.fillShape === 'flat' ? 'ramp' : 'flat';
    return this.fillShape;
  }

  enter(): void {
    if (this.active) return;
    this.active = true;
    this.group.visible = true;
    // the pencil shows what it draws: cream for masonry, earth for fill,
    // timber for the roof deck
    const tone =
      this.mode === 'fill'
        ? 0x9b7a52
        : this.mode === 'roof'
          ? 0xb08968
          : this.mode === 'cut'
            ? 0x8a8574 // quarry grey — cut ground, not tipped dirt
            : 0xd8d3c4;
    (this.line.material as THREE.LineBasicMaterial).color.setHex(tone);
    (this.ribbon.material as THREE.MeshBasicMaterial).color.setHex(tone);
    document.body.classList.add('planning');
    this.deps.onModeChange?.(true, this.mode);
  }

  exit(): void {
    if (!this.active) return;
    this.active = false;
    this.points = [];
    this.cursor = null;
    this.cursorRing.visible = false;
    this.group.visible = false;
    document.body.classList.remove('planning');
    this.rebuild();
    this.deps.onModeChange?.(false, this.mode);
  }

  setHeight(h: number): void {
    // floor 0.5: the field wall (boss canon 2026-07-09 — farms are made by a
    // low wall around a piece of land; two courses you can step over)
    this.height = Math.min(8, Math.max(0.5, Math.round(h * 2) / 2));
    if (this.active) this.rebuild();
  }

  /** committed points plus the cursor when it meaningfully extends the line */
  private rawPolyline(): Vec2[] {
    const poly = [...this.points];
    if (this.active && this.cursor) {
      const last = poly[poly.length - 1];
      if (!last || dist2d(last, this.cursor) > MIN_POINT_GAP) poly.push(this.cursor);
    }
    return poly;
  }

  /**
   * The polyline the preview shows. Wall mode: the raw line. Building mode:
   * the doorway loop (see buildingLoop). Fill mode: the raw ring CLOSED back
   * to its first point for display — the command carries the open polygon.
   */
  previewPolyline(): Vec2[] {
    if (this.mode === 'building') return this.buildingLoop();
    const poly = this.rawPolyline();
    if ((this.mode === 'fill' || this.mode === 'roof' || this.mode === 'cut') && poly.length >= 3) {
      return [...poly, poly[0]!];
    }
    return poly;
  }

  /**
   * Building mode: two committed corners define the front edge; the cursor
   * pulls the depth out to either side. The rectangle deliberately stays OPEN
   * for DOOR_W at the front-edge middle — the gap IS the doorway, so one
   * ordinary plan_wall builds a roofless shell a person can walk into, with
   * zero sim changes. Roofs, floors and framed doors are later carpentry.
   */
  /** the live front edge + signed cursor depth, shared by loop and footprint */
  private buildingFrame(): {
    A: Vec2; B: Vec2; len: number; ux: number; uy: number; px: number; py: number; depth: number;
  } | null {
    const A = this.points[0];
    const B = this.points[1];
    if (!A || !B) return null;
    const ex = B.x - A.x;
    const ey = B.y - A.y;
    const len = Math.sqrt(ex * ex + ey * ey);
    if (len < MIN_EDGE) return null;
    const ux = ex / len;
    const uy = ey / len;
    const px = -uy; // perpendicular — depth grows to whichever side the cursor is on
    const py = ux;
    const c = this.cursor;
    let depth = c ? (c.x - A.x) * px + (c.y - A.y) * py : 0;
    // The cursor is clamped by pick(), but the DERIVED back corners (A+p·depth,
    // B+p·depth) are not — cap the depth so both stay inside the same
    // [1, extent-1] box, or a building could be committed hanging off the world.
    if (depth !== 0) {
      const s = Math.sign(depth);
      const qx = px * s;
      const qy = py * s;
      let m = Math.abs(depth);
      const { site } = this.deps;
      for (const K of [A, B]) {
        if (qx > 1e-12) m = Math.min(m, (site.extentX - 1 - K.x) / qx);
        else if (qx < -1e-12) m = Math.min(m, (1 - K.x) / qx);
        if (qy > 1e-12) m = Math.min(m, (site.extentY - 1 - K.y) / qy);
        else if (qy < -1e-12) m = Math.min(m, (1 - K.y) / qy);
      }
      depth = s * Math.max(0, m);
    }
    return { A, B, len, ux, uy, px, py, depth };
  }

  private buildingLoop(): Vec2[] {
    const A = this.points[0];
    const B = this.points[1];
    if (!A) return [];
    if (!B) return this.cursor ? [A, this.cursor] : [A];
    const f = this.buildingFrame();
    if (!f || Math.abs(f.depth) < MIN_DEPTH) return [A, B];
    const half = Math.min(DOOR_W, f.len * 0.4) / 2;
    const mx = (A.x + B.x) / 2;
    const my = (A.y + B.y) / 2;
    return [
      { x: mx + f.ux * half, y: my + f.uy * half }, // door jamb, B side
      { x: B.x, y: B.y },
      { x: B.x + f.px * f.depth, y: B.y + f.py * f.depth },
      { x: A.x + f.px * f.depth, y: A.y + f.py * f.depth },
      { x: A.x, y: A.y },
      { x: mx - f.ux * half, y: my - f.uy * half }, // door jamb, A side
    ];
  }

  /**
   * Wall mode: the raw polyline being drawn/hovered, once it has enough
   * points to possibly ring. The HUD feeds this STRAIGHT into the sim's own
   * classifyRing (the second fleet's parity law) — the planner does no gap or
   * closure judgment of its own, so farms, gated farms and hand-drawn
   * buildings all name themselves exactly when the sim would claim them.
   */
  previewRing(): Vec2[] | null {
    if (this.mode !== 'wall') return null;
    const poly = this.rawPolyline();
    return poly.length >= 4 ? poly : null;
  }

  /** live building dimensions (front × depth, meters) once the loop is real */
  footprint(): { front: number; depth: number } | null {
    if (this.mode !== 'building') return null;
    const f = this.buildingFrame();
    if (!f || Math.abs(f.depth) < MIN_DEPTH) return null;
    return { front: f.len, depth: Math.abs(f.depth) };
  }

  /**
   * Pass the plan's auto-gates so the promised stone count is the sim's own:
   * the SAME survey the sim will freeze at plan time (SIM 13), run on the
   * sim's own ground — level courses, stepped footings, honest extra stones
   * downhill.
   */
  stats(
    gates: readonly Vec2[] = [],
    datum: 'level' | 'stepped' = 'stepped',
  ): { length: number; courses: number; stonesTotal: number } | null {
    const poly = this.previewPolyline();
    if (poly.length < 2) return null;
    const ground = this.deps.countGround ?? this.deps.groundAt;
    const { courses, stonesTotal } = surveyWall(poly, this.height, gates, ground, datum);
    return { length: polylineLength(poly), courses, stonesTotal };
  }

  confirm(): void {
    if (!this.active) return;
    // commit exactly what the preview shows — ribbon and stats both come from
    // the same polyline, so the rubber-band cursor point is part of the plan
    // (fill and roof commit the OPEN ring; the display's closing point is not data)
    const ringMode = this.mode === 'fill' || this.mode === 'roof' || this.mode === 'cut';
    const poly = ringMode ? this.rawPolyline() : this.previewPolyline();
    if (poly.length < 2) return;
    if (this.mode === 'building' && poly.length < 6) return; // no loop, no shell
    if (ringMode && poly.length < 3) return; // no ring, no fill/deck
    const ok = this.deps.onConfirm(
      this.mode,
      poly.map((p) => ({ x: p.x, y: p.y })),
      this.height,
      this.material,
    );
    if (ok) this.exit();
  }

  private addPoint(p: Vec2): void {
    if (this.points.length >= MAX_POINTS) return;
    const last = this.points[this.points.length - 1];
    // building mode: the second corner must give a legal front edge — a front
    // in the 0.6–2 m crack would otherwise dead-end (the loop can never close,
    // and every commit gesture silently no-ops while the hint says "raise it")
    const gap =
      this.mode === 'building' && this.points.length === 1 ? MIN_EDGE : MIN_POINT_GAP;
    if (last && dist2d(last, p) < gap) return;
    this.points.push(p);
    this.rebuild();
  }

  private undoPoint(): void {
    if (this.points.length === 0) {
      this.exit();
      return;
    }
    this.points.pop();
    this.rebuild();
  }

  /** pointer → ground point on the displayed surface; returns clamped site-local (x, y) */
  private pick(ev: PointerEvent | MouseEvent): Vec2 | null {
    const rect = this.deps.dom.getBoundingClientRect();
    const nx = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
    const ny = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(new THREE.Vector2(nx, ny), this.deps.camera);
    const hit = this.marchGround(this.raycaster.ray);
    if (!hit) return null;
    const { site } = this.deps;
    return {
      x: Math.min(Math.max(hit.x, 1), site.extentX - 1),
      y: Math.min(Math.max(hit.y, 1), site.extentY - 1),
    };
  }

  /**
   * World point → screen px, for screen-space snap tests. `z` overrides the
   * ground lookup: roof mode projects wall corners at their TOPS, so aiming
   * at the visible top corner is aiming at the snap target (projecting at the
   * base put the target meters below the cursor on any tall wall).
   */
  private screenOf(p: Vec2, z?: number): { x: number; y: number } | null {
    const v = new THREE.Vector3(p.x, z ?? this.deps.groundAt(p.x, p.y), p.y).project(
      this.deps.camera,
    );
    if (v.z > 1) return null; // behind the eye
    const rect = this.deps.dom.getBoundingClientRect();
    return {
      x: rect.left + ((v.x + 1) / 2) * rect.width,
      y: rect.top + ((1 - v.y) / 2) * rect.height,
    };
  }

  /**
   * The deck height a roof corner would take at p: the TOP of the finished
   * wall holding it (display surface + wall height, max across holders), or
   * null when nothing within ROOF_SNAP holds it — the sim's own level rule,
   * mirrored on the display surface.
   */
  private roofTopAt(p: Vec2): number | null {
    const walls = this.deps.snapTargets?.() ?? [];
    let top: number | null = null;
    for (const w of walls) {
      if (!w.complete) continue;
      for (let i = 1; i < w.points.length; i++) {
        const q = nearestOnSeg(p, w.points[i - 1]!, w.points[i]!);
        if (dist2d(p, q) <= ROOF_SNAP) {
          const t = this.deps.groundAt(q.x, q.y) + w.height;
          if (top === null || t > top) top = t;
          break; // this wall holds it; try the next wall
        }
      }
    }
    return top;
  }

  /**
   * Wall mode: a pointer near the FIRST point closes the ring — enclosures are
   * how farms are made (boss canon 2026-07-09). The snap radius is SCREEN
   * SPACE (input-guard law: pixels, not meters — 8 px is meters of ground when
   * zoomed out), and the snapped point is an EXACT copy of the first, so the
   * closure is unambiguous at any zoom (the sim itself closes anything within
   * FARM_CLOSE_EPS; the snap just makes the gesture certain).
   */
  private startSnap(ev: { clientX: number; clientY: number }): Vec2 | null {
    if (this.mode !== 'wall' || this.points.length < 3) return null;
    const first = this.points[0]!;
    const s = this.screenOf(first);
    if (!s) return null;
    const d = Math.hypot(ev.clientX - s.x, ev.clientY - s.y);
    return d < SNAP_PX ? { x: first.x, y: first.y } : null;
  }

  /**
   * ⇧-held geometry snap (boss request 2026-07-10): while shift is down, the
   * pick magnetizes to existing walls — CORNERS first (wall vertices, plus the
   * points already placed this drawing), else the nearest point ON a wall
   * segment. This is how new work joins old: a wall taken up from a corner, a
   * building set flush against the field ring (the hollow-walls-connect canon
   * needs walls that actually meet). Radii are SCREEN SPACE (input-guard law);
   * a corner outranks an edge so joints land on joints. Returns the pick
   * untouched when shift is up or nothing is in range.
   */
  geoSnap(
    ev: { clientX: number; clientY: number; shiftKey: boolean },
    picked: Vec2 | null,
  ): Vec2 | null {
    this.snapped = false;
    if (!ev.shiftKey) return picked;
    const roof = this.mode === 'roof';
    // roof corners rest on FINISHED walls (the sim's support rule) — while
    // roofing, only complete walls magnetize, and they magnetize at their
    // TOPS; every other mode joins work at the ground line as before
    const walls = (this.deps.snapTargets?.() ?? []).filter((w) => !roof || w.complete);

    // corner pass: exact copies, so joints share coordinates, not almosts.
    // Pure screen space — it works even when the ground pick MISSED (a wall
    // top aimed at against the sky flies the ray over every hill behind it).
    let bestV: Vec2 | null = null;
    let bestVd = GEO_SNAP_PX;
    const tryVertex = (q: Vec2, z?: number): void => {
      const s = this.screenOf(q, z);
      if (!s) return;
      const d = Math.hypot(ev.clientX - s.x, ev.clientY - s.y);
      if (d < bestVd) {
        bestVd = d;
        bestV = q;
      }
    };
    for (const w of walls) {
      for (const q of w.points) {
        tryVertex(q, roof ? this.deps.groundAt(q.x, q.y) + w.height : undefined);
      }
    }
    for (const q of this.points) tryVertex(q, roof ? (this.roofTopAt(q) ?? undefined) : undefined);
    if (bestV !== null) {
      this.snapped = true;
      const v: Vec2 = bestV;
      return { x: v.x, y: v.y };
    }
    if (!picked) return null; // sky pick and no corner in reach — nothing to hold

    // edge pass: nearest world point on any segment, then verified in pixels
    // (at the top plane while roofing, same as the corners)
    let bestE: Vec2 | null = null;
    let bestEh = 0;
    let bestEw = Infinity;
    for (const w of walls) {
      const line = w.points;
      for (let i = 1; i < line.length; i++) {
        const q = nearestOnSeg(picked, line[i - 1]!, line[i]!);
        const dw = dist2d(picked, q);
        if (dw < bestEw) {
          bestEw = dw;
          bestE = q;
          bestEh = w.height;
        }
      }
    }
    if (bestE !== null) {
      const e: Vec2 = bestE;
      const s = this.screenOf(e, roof ? this.deps.groundAt(e.x, e.y) + bestEh : undefined);
      if (s && Math.hypot(ev.clientX - s.x, ev.clientY - s.y) < EDGE_SNAP_PX) {
        this.snapped = true;
        return e;
      }
    }
    return picked;
  }

  /**
   * Analytic ray-vs-heightfield: fixed march + bisection over groundAt. A stock
   * Mesh.raycast against the 125k-triangle terrain measures ~4 ms per cast and
   * pointermove fires this constantly; the march is microseconds.
   */
  private marchGround(ray: THREE.Ray): Vec2 | null {
    const { site, groundAt, heightBounds } = this.deps;
    const o = ray.origin;
    const d = ray.direction;
    const slab = (min: number, max: number, oo: number, dd: number): [number, number] => {
      if (Math.abs(dd) < 1e-12) return oo >= min && oo <= max ? [0, Infinity] : [1, 0];
      const a = (min - oo) / dd;
      const b = (max - oo) / dd;
      return a < b ? [a, b] : [b, a];
    };
    const [x0, x1] = slab(0, site.extentX, o.x, d.x);
    const [y0, y1] = slab(heightBounds.min - 20, heightBounds.max + 20, o.y, d.y);
    const [z0, z1] = slab(0, site.extentY, o.z, d.z);
    const t0 = Math.max(0, x0, y0, z0);
    const t1 = Math.min(x1, y1, z1);
    if (!(t1 > t0)) return null; // the ray never enters the site box (sky click)
    const above = (t: number): number =>
      o.y + d.y * t - groundAt(o.x + d.x * t, o.z + d.z * t);
    if (above(t0) <= 0) return null; // eye under the hill — refuse rather than guess
    const STEP = 2; // meters of ray per sample; small enough not to skip a crest
    let ta = t0;
    for (;;) {
      const tb = Math.min(ta + STEP, t1);
      if (above(tb) <= 0) {
        let lo = ta;
        let hi = tb;
        for (let i = 0; i < 24; i++) {
          const mid = (lo + hi) / 2;
          if (above(mid) > 0) lo = mid;
          else hi = mid;
        }
        const t = (lo + hi) / 2;
        return { x: o.x + d.x * t, y: o.z + d.z * t };
      }
      if (tb >= t1) return null;
      ta = tb;
    }
  }

  private rebuild(): void {
    const { groundAt } = this.deps;
    const poly = this.previewPolyline();

    // ground-following samples along the whole preview polyline; when the wall is
    // longer than the sample budget, widen the step so the preview always spans
    // the FULL line (a silently truncated ribbon reads as a shorter plan)
    const totalLen = polylineLength(poly);
    const budget = Math.max(1, MAX_SAMPLES - 1 - poly.length);
    const stride = Math.max(SAMPLE_STEP, totalLen / budget);
    const samples: Vec2[] = [];
    for (let i = 0; i < poly.length && samples.length < MAX_SAMPLES; i++) {
      const p = poly[i]!;
      if (i === 0) {
        samples.push(p);
        continue;
      }
      const a = poly[i - 1]!;
      const seg = dist2d(a, p);
      const n = Math.max(1, Math.ceil(seg / stride));
      for (let k = 1; k <= n && samples.length < MAX_SAMPLES; k++) {
        const t = k / n;
        samples.push({ x: a.x + (p.x - a.x) * t, y: a.y + (p.y - a.y) * t });
      }
    }

    // roof mode: the deck is FLAT at the highest supporting wall top (the
    // sim's own level rule) — the pencil flies at deck height instead of
    // draping the floor (boss finding 2026-07-10). Until a corner is held,
    // there is no level and the preview stays on the ground, honestly.
    const roofLevel =
      this.mode === 'roof'
        ? poly.reduce<number | null>((lvl, p) => {
            const t = this.roofTopAt(p);
            return t !== null && (lvl === null || t > lvl) ? t : lvl;
          }, null)
        : null;
    // a roof previews as a thin deck band, not a wall body; a QUARRY previews as
    // a thin ground marker (the pit sinks only once the crew digs — a tall band
    // would read as building UP, the opposite of a cut)
    const bandTop = this.mode === 'roof' ? ROOF_DECK : this.mode === 'cut' ? 0.05 : this.height;
    // a BUILDING ribbon tops out at the SURVEYED level datum (SIM 13): the
    // pencil promises the one flat bearing its roof will need. Plain walls
    // STEP with the land, which the old per-column ribbon already reads as.
    const levelTop =
      this.mode === 'building' && poly.length >= 2
        ? surveyWall(poly, this.height, [], this.deps.groundAt, 'level').levelTop
        : null;

    for (let i = 0; i < samples.length; i++) {
      const s = samples[i]!;
      const g = roofLevel ?? groundAt(s.x, s.y);
      this.linePos.setXYZ(i, s.x, g + LINE_LIFT, s.y);
      // ribbon base follows the terrain (the stepped footing); the top is level
      this.ribbonPos.setXYZ(i * 2, s.x, g + 0.05, s.y);
      this.ribbonPos.setXYZ(i * 2 + 1, s.x, levelTop ?? g + bandTop, s.y);
    }
    this.linePos.needsUpdate = true;
    this.ribbonPos.needsUpdate = true;
    this.line.geometry.setDrawRange(0, samples.length);
    this.ribbon.geometry.setDrawRange(0, Math.max(0, samples.length - 1) * 6);

    for (let i = 0; i < this.points.length; i++) {
      const p = this.points[i]!;
      this.markerPos.setXYZ(i, p.x, (roofLevel ?? groundAt(p.x, p.y)) + 0.25, p.y);
    }
    this.markerPos.needsUpdate = true;
    this.markers.geometry.setDrawRange(0, this.points.length);
  }

  private onPointerDown = (ev: PointerEvent): void => {
    this.downX = ev.clientX;
    this.downY = ev.clientY;
    this.downT = performance.now();
    this.downButton = ev.button;
  };

  private onPointerUp = (ev: PointerEvent): void => {
    if (!this.active || ev.button !== this.downButton) return;
    const moved = Math.hypot(ev.clientX - this.downX, ev.clientY - this.downY);
    const held = performance.now() - this.downT;
    if (moved >= 6 || held >= 500) return; // that was a camera drag, not a click
    if (ev.button === 0) {
      if (this.mode === 'gate') {
        // the gate tool places no points: a click is the whole gesture
        const p = this.pick(ev);
        if (p) this.deps.onGate?.(p);
        return;
      }
      if (this.mode === 'building' && this.points.length >= 2) {
        // the third click doesn't place a point — where it lands IS the depth.
        // It runs BEFORE the jitter guard below: that guard protects point
        // placement from double-click slop, and swallowing the commit click
        // (zoomed out, 8 px can be meters of depth) left the tool mute.
        const commit = this.pick(ev);
        if (commit) {
          this.cursor = this.geoSnap(ev, commit); // ⇧ sets the back wall flush too
          this.confirm();
        }
        return;
      }
      // ring it and it's real: a click on the start point closes the ring AND
      // commits in one gesture. Like the building commit above, this runs
      // BEFORE the jitter guard — a closing click is a commit, not a placement.
      const snap = this.startSnap(ev);
      if (snap) {
        if (this.points.length < MAX_POINTS) {
          // the click IS the cursor: a stale rubber-band point (the last
          // pointermove can be 16 px = meters away when zoomed out) would be
          // appended by rawPolyline() past the closure, silently un-closing
          // the ring the player just closed
          this.cursor = snap;
          this.points.push(snap);
          this.rebuild();
          this.confirm();
        }
        return;
      }
      // the second click of a double-click must be a no-op IN SCREEN SPACE: a few
      // pixels of jitter can be many meters of ground when zoomed out, so a
      // world-space gap check cannot swallow it
      const jitter = Math.hypot(ev.clientX - this.lastAddX, ev.clientY - this.lastAddY);
      if (performance.now() - this.lastAddT < 500 && jitter < 8) return;
      const picked = this.pick(ev);
      // ⇧-held clicks land ON the old work; roof clicks always do — and a
      // roof click may miss the GROUND entirely (a top corner against the
      // sky) yet still land on a corner, so the snap runs even on a sky pick
      const snapEv =
        this.mode === 'roof'
          ? { clientX: ev.clientX, clientY: ev.clientY, shiftKey: true }
          : ev;
      if (!picked && this.mode !== 'roof') return;
      const p = this.geoSnap(snapEv, picked);
      if (!p) return;
      const before = this.points.length;
      this.addPoint(p);
      if (this.points.length > before) {
        this.lastAddX = ev.clientX;
        this.lastAddY = ev.clientY;
        this.lastAddT = performance.now();
      }
    } else if (ev.button === 2) {
      this.undoPoint();
    }
  };

  private onPointerMove = (ev: PointerEvent): void => {
    if (!this.active) return;
    // hovering the start point previews the closure: the cursor (and so the
    // ribbon) snaps onto the first point, and the HUD can name the enclosure;
    // otherwise ⇧ magnetizes the pick to existing walls (geoSnap)
    const start = this.startSnap(ev);
    if (start) {
      this.cursor = start;
      this.snapped = true;
    } else {
      const picked = this.pick(ev);
      // roof corners MUST rest on walls, so snapping is always on in roof
      // mode — and it runs even when the ground pick missed (sky-silhouetted
      // wall tops), because the corner pass is pure screen space
      const snapEv =
        this.mode === 'roof'
          ? { clientX: ev.clientX, clientY: ev.clientY, shiftKey: true }
          : ev;
      this.cursor = picked || this.mode === 'roof' ? this.geoSnap(snapEv, picked) : null;
    }
    if (this.cursor) {
      // the ring rides the deck plane while roofing — the same top the snap
      // projected, so what swells is what you aimed at
      const g =
        this.mode === 'roof'
          ? (this.roofTopAt(this.cursor) ?? this.deps.groundAt(this.cursor.x, this.cursor.y))
          : this.deps.groundAt(this.cursor.x, this.cursor.y);
      this.cursorRing.position.set(this.cursor.x, g + 0.1, this.cursor.y);
      this.cursorRing.visible = true;
      // the ring answers the held ⇧: swollen and solid while magnetized
      this.cursorRing.scale.setScalar(this.snapped ? 1.5 : 1);
      (this.cursorRing.material as THREE.MeshBasicMaterial).opacity = this.snapped ? 1 : 0.8;
    } else {
      this.cursorRing.visible = false;
    }
    this.rebuild();
  };

  private onDblClick = (): void => {
    // the double-click's second click was swallowed by the screen-space guard in
    // onPointerUp, and the cursor sits on the last point (within MIN_POINT_GAP),
    // so previewPolyline() === the drawn points — confirm commits exactly those
    this.confirm();
  };

  private onKeyDown = (ev: KeyboardEvent): void => {
    const clean = !ev.ctrlKey && !ev.metaKey && !ev.altKey && !ev.repeat;
    if ((ev.key === 'b' || ev.key === 'B') && clean) {
      this.toggle('wall');
      return;
    }
    if ((ev.key === 'h' || ev.key === 'H') && clean) {
      this.toggle('building');
      return;
    }
    if ((ev.key === 'f' || ev.key === 'F') && clean) {
      this.toggle('fill');
      return;
    }
    if ((ev.key === 'g' || ev.key === 'G') && clean) {
      this.toggle('gate');
      return;
    }
    if ((ev.key === 'r' || ev.key === 'R') && clean) {
      this.toggle('roof');
      return;
    }
    if ((ev.key === 'q' || ev.key === 'Q') && clean) {
      this.toggle('cut');
      return;
    }
    if (!this.active) return;
    if (ev.key === 'Escape') this.exit();
    else if (ev.key === 'Enter') {
      // without preventDefault the browser re-activates whichever HUD button
      // still holds focus, un-toggling the mode right after we confirm
      ev.preventDefault();
      this.confirm();
    } else if (ev.key === 'Backspace') {
      ev.preventDefault();
      this.undoPoint();
    }
  };
}

function dist2d(a: Vec2, b: Vec2): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/** closest point to p on segment ab */
function nearestOnSeg(p: Vec2, a: Vec2, b: Vec2): Vec2 {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const l2 = dx * dx + dy * dy;
  const t = l2 === 0 ? 0 : Math.min(1, Math.max(0, ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2));
  return { x: a.x + dx * t, y: a.y + dy * t };
}

/** the mason's vernacular — labels for the READING, not the designation */
export const KIND_LABEL: Record<FootprintKind, string> = {
  shed: 'a shed',
  cot: 'a cot',
  longhouse: 'a longhouse',
  great_barn: 'a great barn',
  hall: 'a hall',
  house: 'a house',
};

/**
 * The plot is the plan (SCOPE §6, boss canon via Populous): footprint size and
 * shape name the building. The bins live in sim/classify.ts — shared with the
 * sim's own recognition, so the pencil's promise and the record always agree.
 */
export function describeFootprint(front: number, depth: number): { label: string; note?: string } {
  const long = Math.max(front, depth);
  const span = Math.min(front, depth);
  const kind = classifyFootprint(front * depth, long, span);
  const note =
    span > 6.5 ? 'the master mason: that span wants aisles — or a forest of a roof' : undefined;
  return { label: KIND_LABEL[kind], note };
}
