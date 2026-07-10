/**
 * Wall-drawing tool. Pure render/input layer: it builds a polyline by picking
 * ground points on the displayed heightfield (analytic ray march — see
 * marchGround), previews it as a ground-snapped line + translucent ribbon,
 * and on confirm hands the points to onConfirm — whose only legal act is
 * enqueue({kind:'plan_wall', ...}). The planner itself never touches WorldState.
 *
 * Input grammar (also shown in the HUD hint):
 *   click        place a point            right-click / Backspace   undo a point
 *   double-click / Enter   commit the wall        Esc               put the pencil down
 * Click-vs-drag is discriminated by pointer travel so OrbitControls keeps
 * owning drags; a "click" is a press that moved < 6 px and lasted < 500 ms.
 */
import * as THREE from 'three';
import type { SiteData } from '../sim/site';
import { decomposeWall, polylineLength } from '../sim/step';
import type { Vec2 } from '../sim/types';

const MIN_POINT_GAP = 0.6; // meters: clicks closer than this to the last point are ignored
const SAMPLE_STEP = 2; // meters between preview samples along each segment
const MAX_SAMPLES = 2048;
const MAX_POINTS = 128;
const LINE_LIFT = 0.12; // meters above ground so the preview never z-fights the terrain

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
  heightBounds: { min: number; max: number };
  dom: HTMLElement;
  /** the one exit: hand the polyline to the command log; return false to keep drawing */
  onConfirm: (points: Vec2[], height: number) => boolean;
  onModeChange?: (active: boolean) => void;
}

export class WallPlanner {
  active = false;
  height = 4;
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

  toggle(): void {
    if (this.active) this.exit();
    else this.enter();
  }

  enter(): void {
    if (this.active) return;
    this.active = true;
    this.group.visible = true;
    document.body.classList.add('planning');
    this.deps.onModeChange?.(true);
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
    this.deps.onModeChange?.(false);
  }

  setHeight(h: number): void {
    this.height = Math.min(8, Math.max(1, Math.round(h * 2) / 2));
    if (this.active) this.rebuild();
  }

  /** committed points plus the cursor, when it meaningfully extends the line */
  previewPolyline(): Vec2[] {
    const poly = [...this.points];
    if (this.active && this.cursor) {
      const last = poly[poly.length - 1];
      if (!last || dist2d(last, this.cursor) > MIN_POINT_GAP) poly.push(this.cursor);
    }
    return poly;
  }

  stats(): { length: number; courses: number; stonesTotal: number } | null {
    const poly = this.previewPolyline();
    if (poly.length < 2) return null;
    const { courses, stonesTotal } = decomposeWall(poly, this.height);
    return { length: polylineLength(poly), courses, stonesTotal };
  }

  confirm(): void {
    if (!this.active) return;
    // commit exactly what the preview shows — ribbon and stats both come from
    // previewPolyline(), so the rubber-band cursor point is part of the plan
    const poly = this.previewPolyline();
    if (poly.length < 2) return;
    const ok = this.deps.onConfirm(
      poly.map((p) => ({ x: p.x, y: p.y })),
      this.height,
    );
    if (ok) this.exit();
  }

  private addPoint(p: Vec2): void {
    if (this.points.length >= MAX_POINTS) return;
    const last = this.points[this.points.length - 1];
    if (last && dist2d(last, p) < MIN_POINT_GAP) return;
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

    for (let i = 0; i < samples.length; i++) {
      const s = samples[i]!;
      const g = groundAt(s.x, s.y);
      this.linePos.setXYZ(i, s.x, g + LINE_LIFT, s.y);
      // ribbon top follows the terrain the way the sim lays courses: per-column ground
      this.ribbonPos.setXYZ(i * 2, s.x, g + 0.05, s.y);
      this.ribbonPos.setXYZ(i * 2 + 1, s.x, g + this.height, s.y);
    }
    this.linePos.needsUpdate = true;
    this.ribbonPos.needsUpdate = true;
    this.line.geometry.setDrawRange(0, samples.length);
    this.ribbon.geometry.setDrawRange(0, Math.max(0, samples.length - 1) * 6);

    for (let i = 0; i < this.points.length; i++) {
      const p = this.points[i]!;
      this.markerPos.setXYZ(i, p.x, groundAt(p.x, p.y) + 0.25, p.y);
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
      // the second click of a double-click must be a no-op IN SCREEN SPACE: a few
      // pixels of jitter can be many meters of ground when zoomed out, so a
      // world-space gap check cannot swallow it
      const jitter = Math.hypot(ev.clientX - this.lastAddX, ev.clientY - this.lastAddY);
      if (performance.now() - this.lastAddT < 500 && jitter < 8) return;
      const p = this.pick(ev);
      if (p) {
        const before = this.points.length;
        this.addPoint(p);
        if (this.points.length > before) {
          this.lastAddX = ev.clientX;
          this.lastAddY = ev.clientY;
          this.lastAddT = performance.now();
        }
      }
    } else if (ev.button === 2) {
      this.undoPoint();
    }
  };

  private onPointerMove = (ev: PointerEvent): void => {
    if (!this.active) return;
    this.cursor = this.pick(ev);
    if (this.cursor) {
      const g = this.deps.groundAt(this.cursor.x, this.cursor.y);
      this.cursorRing.position.set(this.cursor.x, g + 0.1, this.cursor.y);
      this.cursorRing.visible = true;
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
    if ((ev.key === 'b' || ev.key === 'B') && !ev.ctrlKey && !ev.metaKey && !ev.altKey && !ev.repeat) {
      this.toggle();
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
