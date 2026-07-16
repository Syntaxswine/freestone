/**
 * THE VISIBLE PILES (VISIBLE WORK Course 2): won stone STACKS beside each working's
 * spoil, felled logs SCATTER where the cant was cut ("wood should just drop where
 * its felled" — the boss's literal read), and a hauled wall's FACE shows the stone
 * the carts have brought. Representational, per the boss ("i dont think every block
 * needs to be shown… its more a representation"): a capped count of block meshes,
 * scaled by the working's own contribution × the GLOBAL stock's remaining fraction —
 * so piles visibly draw down as walls consume, with zero sim change (the stockpile
 * is ONE number; a true per-pile logistics model belongs to the timber way's course).
 * Render reads, never writes; deterministic on integer hashes, never the sim rng.
 */
import * as THREE from 'three';
import type { Stand, Vec2, WorldState } from '../sim/types';

const MAX_BLOCKS = 14; // the representational cap per pile
const MAX_LOGS = 10;
const BLOCK = { w: 0.55, h: 0.4, d: 0.4 }; // a dressed block, chest-high stacks
const LOG_LEN = 2.2;
const LOG_R = 0.16;

function hash1(a: number): number {
  let x = Math.imul(a + 1, 0x85ebca6b) >>> 0;
  x = Math.imul(x ^ (x >>> 15), 0x27d4eb2f) >>> 0;
  return ((x ^ (x >>> 15)) >>> 0) / 4294967296;
}

interface WorkingRef {
  id: number;
  centroid: Vec2;
  stoneTotal: number;
  workDone: number;
  workTotal: number;
}

export class PileLayer {
  private stoneMat = new THREE.MeshLambertMaterial({ color: 0xb9a88f }); // the sprite-block tone
  private stoneEdgeMat = new THREE.MeshLambertMaterial({ color: 0x9a8a72 });
  private logMat = new THREE.MeshLambertMaterial({ color: 0x6f5334 });
  private blockGeo = new THREE.BoxGeometry(BLOCK.w, BLOCK.h, BLOCK.d);
  private logGeo = new THREE.CylinderGeometry(LOG_R, LOG_R, LOG_LEN, 6);
  private groups = new Map<string, { group: THREE.Group; shown: number }>();

  constructor(
    private world: WorldState,
    private scene: THREE.Scene,
    private groundAt: (x: number, y: number) => number,
  ) {}

  /** every stone-winning working, its centroid + frozen economics */
  private workings(): WorkingRef[] {
    const out: WorkingRef[] = [];
    const centroidOf = (pts: readonly Vec2[]): Vec2 => {
      let cx = 0;
      let cy = 0;
      for (const p of pts) {
        cx += p.x;
        cy += p.y;
      }
      return { x: cx / pts.length, y: cy / pts.length };
    };
    for (const c of this.world.cuts) {
      out.push({ id: c.id, centroid: centroidOf(c.points), stoneTotal: c.stoneTotal, workDone: c.workDone, workTotal: c.workTotal });
    }
    for (const a of this.world.adits) {
      out.push({ id: a.id, centroid: a.portal, stoneTotal: a.stoneTotal, workDone: a.workDone, workTotal: a.workTotal });
    }
    for (const b of this.world.bellPits) {
      out.push({ id: b.id, centroid: b.at, stoneTotal: b.stoneTotal, workDone: b.workDone, workTotal: b.workTotal });
    }
    for (const s of this.world.shafts) {
      out.push({ id: s.id, centroid: s.at, stoneTotal: s.stoneTotal, workDone: s.workDone, workTotal: s.workTotal });
    }
    return out;
  }

  /** the pile stack a CARRIER walks to (Course 2's theater anchor): the nearest
   *  working with stone shown, or null */
  nearestStonePile(x: number, y: number): Vec2 | null {
    let best: Vec2 | null = null;
    let bd = Infinity;
    for (const w of this.workings()) {
      if (this.blocksShownFor(w) <= 0) continue;
      const p = this.pileSpot(w);
      const d = (p.x - x) ** 2 + (p.y - y) ** 2;
      if (d < bd) {
        bd = d;
        best = p;
      }
    }
    return best;
  }

  /** the stack sits just beyond the spoil, offset deterministically by id */
  private pileSpot(w: WorkingRef): Vec2 {
    const a = hash1(w.id) * Math.PI * 2;
    return { x: w.centroid.x + Math.cos(a) * 6.5, y: w.centroid.y + Math.sin(a) * 6.5 };
  }

  /** blocks to show: contribution won so far × the global stock's remaining fraction */
  private blocksShownFor(w: WorkingRef): number {
    const wonSoFar = w.stoneTotal * Math.min(1, w.workDone / w.workTotal);
    const totalWon = this.workings().reduce(
      (n, o) => n + o.stoneTotal * Math.min(1, o.workDone / o.workTotal),
      0,
    );
    if (totalWon <= 0 || wonSoFar <= 0) return 0;
    const remainingFrac = Math.min(1, Math.max(0, this.world.stockpile / totalWon));
    const share = wonSoFar * remainingFrac;
    // ~3 m³ per shown block reads as a real mason's stack without counting lies
    return Math.min(MAX_BLOCKS, Math.floor(share / 3));
  }

  private syncStack(key: string, at: Vec2, blocks: number, kind: 'stone' | 'logs', seed: number): void {
    let g = this.groups.get(key);
    if (!g) {
      g = { group: new THREE.Group(), shown: -1 };
      this.groups.set(key, g);
      this.scene.add(g.group);
    }
    if (g.shown === blocks) return;
    g.shown = blocks;
    for (const child of [...g.group.children]) g.group.remove(child);
    const ground = this.groundAt(at.x, at.y);
    for (let i = 0; i < blocks; i++) {
      if (kind === 'stone') {
        // coursed stacking: rows of 4, jittered by id so two piles never twin
        const row = Math.floor(i / 4);
        const col = i % 4;
        const j = hash1(seed * 31 + i);
        const m = new THREE.Mesh(this.blockGeo, i % 5 === 4 ? this.stoneEdgeMat : this.stoneMat);
        m.position.set(
          at.x + (col - 1.5) * (BLOCK.w + 0.06) + (j - 0.5) * 0.08,
          ground + BLOCK.h / 2 + row * BLOCK.h,
          at.y + (j - 0.5) * 0.2,
        );
        m.rotation.y = (j - 0.5) * 0.2;
        m.frustumCulled = false;
        g.group.add(m);
      } else {
        // felled logs lie WHERE they dropped: scattered around the spot, not stacked
        const a = hash1(seed * 47 + i) * Math.PI * 2;
        const r = 1.5 + hash1(seed * 53 + i) * 5.5;
        const lx = at.x + Math.cos(a) * r;
        const ly = at.y + Math.sin(a) * r;
        const m = new THREE.Mesh(this.logGeo, this.logMat);
        m.position.set(lx, this.groundAt(lx, ly) + LOG_R, ly);
        m.rotation.z = Math.PI / 2;
        m.rotation.y = hash1(seed * 61 + i) * Math.PI;
        m.frustumCulled = false;
        g.group.add(m);
      }
    }
  }

  update(): void {
    const live = new Set<string>();
    // block stacks at every working that has WON stone still standing in the stock
    for (const w of this.workings()) {
      const key = `w${w.id}`;
      live.add(key);
      this.syncStack(key, this.pileSpot(w), this.blocksShownFor(w), 'stone', w.id);
    }
    // felled logs scatter across the cant; they fade as the global woodpile is spent
    for (const s of this.world.stands) {
      const key = `s${s.id}`;
      const dropped = s.timberTotal * Math.min(1, s.workDone / Math.max(1e-9, s.workTotal));
      const frac = this.timberRemainingFrac();
      const logs = Math.min(MAX_LOGS, Math.floor((dropped * frac) / 1.2));
      if (logs > 0 || this.groups.has(key)) {
        live.add(key);
        this.syncStack(key, this.standCentroid(s), logs, 'logs', s.id);
      }
    }
    // a hauled wall's FACE stack: the cart's deliveries made visible
    for (const wall of this.world.walls) {
      if (wall.haulRate === null || wall.material === 'wood') continue;
      const key = `f${wall.id}`;
      const start = wall.points[0]!;
      const blocks = Math.min(6, Math.floor(wall.faceBuffer / 0.15));
      if (blocks > 0 || this.groups.has(key)) {
        live.add(key);
        this.syncStack(key, { x: start.x - 2.5, y: start.y - 2.5 }, blocks, 'stone', wall.id + 7);
      }
    }
    // workings gone from the world (never happens today) or emptied piles linger at 0
    for (const [key, g] of this.groups) {
      if (!live.has(key) && g.group.children.length > 0) {
        for (const child of [...g.group.children]) g.group.remove(child);
        g.shown = -1;
      }
    }
  }

  private timberRemainingFrac(): number {
    const dropped = this.world.stands.reduce(
      (n, s) => n + s.timberTotal * Math.min(1, s.workDone / Math.max(1e-9, s.workTotal)),
      0,
    );
    if (dropped <= 0) return 0;
    return Math.min(1, Math.max(0, this.world.timber / dropped));
  }

  private standCentroid(s: Stand): Vec2 {
    let cx = 0;
    let cy = 0;
    for (const p of s.points) {
      cx += p.x;
      cy += p.y;
    }
    return { x: cx / s.points.length, y: cy / s.points.length };
  }
}
