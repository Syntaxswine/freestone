/**
 * THE UNDERGROUND VIEW (2026-07-11) — the SimCity-plumbing mode for the underworld
 * (boss design 2026-07-11: "toggle an underground mode… page down 10'/25'/50' a
 * click… cut away as more or less even 2D geometry… the depth layers are mostly for
 * snapping"). Toggle it and the hill ghosts translucent, the transcribed strata
 * become VISIBLE for the first time, and a flat WORKING PLANE at a chosen elevation
 * shows the rock at that depth as a map. Presentation + input ONLY — never the sim.
 *
 * DATUM (verified 2026-07-11): terrain three-space Y is AOD metres (the heightmap
 * elevations equal the boreholes' surfaceOd to ~0.2 m). Bed columns hang
 * depth-below-surface; seam planes are fitted in AOD. So the rock under a plane at
 * elevation E is
 *     strataAt(x, y, heightAt(x, y) - E)      // open air where E >= surface,
 * and a seam's snap level is its own AOD elevation (model.seamElevationAt).
 *
 * The working plane is a coarse grid of tiles, each coloured by the NEAREST-hole
 * material at that (x, y, depth). The blockiness is honest: the v0 bed model IS
 * nearest-hole ("the ground beneath you looks like the nearest real hole"), so the
 * map shows real Voronoi cells over the 60 boreholes, not a smooth invention.
 */
import * as THREE from 'three';
import type { GroundMaterial } from '../sim/beds';
import type { BedModel } from '../sim/beds';
import type { SiteData } from '../sim/site';

const FATHOM = 1.8288; // m — the miners' unit; every Durham log is written in it
const STEP = 4 * FATHOM; // default page step ≈ 7.32 m (the boss's 25', to a round 4 fm)
const SNAP_TOL = 2.5; // m — a page that lands this near a horizon grabs it
const GRID = 64; // working-plane tiles per axis (coarse: the strata are nearest-hole)

/** Naturalistic, low-saturation earth tones (field-guide aesthetic): the science is
 *  the spectacle, the chrome restrained. Sandstone — the building "post" — reads a
 *  touch brighter because it is the prize the whole quarry economy is chasing. */
const MATERIAL_COLOR: Record<GroundMaterial, number> = {
  drift: 0x8a7a5c, // overburden soil/gravel — earth brown
  sandstone: 0xd9c48c, // POST — pale buff, the prize
  mudstone: 0x6b7078, // "metal" — blue-grey shale
  seatearth: 0x9aa17f, // fireclay under coal — pale olive
  coal: 0x232326, // near-black
  limestone: 0xc9cdc0, // pale grey
  band: 0x8a5a44, // ironstone girdle — rust brown
  void: 0x5a2530, // old workings — a dark warning red (rare)
  unknown: 0x555550, // honest grey where no hole reaches
};

interface SnapLevel {
  label: string;
  z: number; // AOD elevation
}

export class UnderworldLayer {
  private group = new THREE.Group();
  private tiles: THREE.InstancedMesh;
  private readonly cxs: number[] = [];
  private readonly cys: number[] = [];
  private readonly dummy = new THREE.Object3D();
  private readonly col = new THREE.Color();
  private snaps: SnapLevel[] = [];
  private elevation: number;
  private crownZ = 0;
  private minZ = 0;
  private maxZ = 0;
  private snappedLabel: string | null = null;
  private on = false;

  constructor(
    private scene: THREE.Scene,
    private site: SiteData,
    private model: BedModel,
  ) {
    const tileW = site.extentX / GRID;
    const tileH = site.extentY / GRID;
    for (let j = 0; j < GRID; j++) {
      for (let i = 0; i < GRID; i++) {
        this.cxs.push((i + 0.5) * tileW);
        this.cys.push((j + 0.5) * tileH);
      }
    }
    // one flat tile in the XZ plane, instanced across the whole site
    const geo = new THREE.PlaneGeometry(tileW, tileH);
    geo.rotateX(-Math.PI / 2);
    const mat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.92, side: THREE.DoubleSide });
    this.tiles = new THREE.InstancedMesh(geo, mat, GRID * GRID);
    this.tiles.frustumCulled = false;
    for (let k = 0; k < this.cxs.length; k++) this.tiles.setColorAt(k, this.col.set(0xffffff));
    this.group.add(this.tiles);

    // crown = the highest ground the plane can start under; sample the grid once
    this.crownZ = -Infinity;
    for (let k = 0; k < this.cxs.length; k++) {
      const s = site.heightAt(this.cxs[k]!, this.cys[k]!);
      if (s > this.crownZ) this.crownZ = s;
    }

    // snap horizons: the crown, then every named seam at the site centre (the seam
    // dips, so this is its representative level — "you're at the Low Main")
    const cx = site.extentX / 2;
    const cy = site.extentY / 2;
    this.snaps = [{ label: 'the crown', z: this.crownZ }];
    let deepest = this.crownZ;
    for (const name of Object.keys(model.seams)) {
      const z = model.seamElevationAt(name, cx, cy);
      if (z === null) continue;
      this.snaps.push({ label: name, z });
      if (z < deepest) deepest = z;
    }
    this.snaps.sort((a, b) => b.z - a.z); // shallow → deep
    this.minZ = deepest - 3 * STEP; // a little room below the deepest seam
    this.maxZ = this.crownZ;

    // start at the Low Main (the cathedral's building stone) if we have it, else a
    // few fathoms under the crown — drop the player where the interesting rock is
    const lowMain = model.seamElevationAt('Low Main', cx, cy);
    this.elevation = lowMain !== null ? lowMain : this.crownZ - 10 * FATHOM;
    this.snappedLabel = lowMain !== null ? 'Low Main' : null;

    // faint seam sheets — the named horizons drawn as dipping translucent planes,
    // so the working plane visibly snaps ONTO a seam
    for (const name of Object.keys(model.seams)) this.addSeamSheet(name);

    this.group.visible = false;
    scene.add(this.group);
    this.resample();
  }

  private addSeamSheet(name: string): void {
    const { extentX: X, extentY: Y } = this.site;
    const corners: [number, number][] = [
      [0, 0],
      [X, 0],
      [X, Y],
      [0, Y],
    ];
    const pos: number[] = [];
    for (const [x, y] of corners) {
      const z = this.model.seamElevationAt(name, x, y);
      if (z === null) return;
      pos.push(x, z, y);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3));
    geo.setIndex([0, 1, 2, 0, 2, 3]);
    geo.computeVertexNormals();
    const mat = new THREE.MeshBasicMaterial({
      color: name === 'Low Main' ? 0xcbae70 : 0x3a3f47,
      transparent: true,
      opacity: 0.18,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const sheet = new THREE.Mesh(geo, mat);
    sheet.frustumCulled = false;
    this.group.add(sheet);
  }

  /** repaint every tile for the current plane elevation */
  private resample(): void {
    for (let k = 0; k < this.cxs.length; k++) {
      const x = this.cxs[k]!;
      const y = this.cys[k]!;
      const surf = this.site.heightAt(x, y);
      if (this.elevation >= surf - 0.01) {
        // the plane is above the ground here — open air, hide the tile
        this.dummy.position.set(x, this.elevation, y);
        this.dummy.scale.set(0, 0, 0);
      } else {
        const m = this.model.strataAt(x, y, surf - this.elevation);
        this.tiles.setColorAt(k, this.col.set(MATERIAL_COLOR[m]));
        this.dummy.position.set(x, this.elevation, y);
        this.dummy.scale.set(1, 1, 1);
      }
      this.dummy.updateMatrix();
      this.tiles.setMatrixAt(k, this.dummy.matrix);
    }
    this.tiles.instanceMatrix.needsUpdate = true;
    if (this.tiles.instanceColor) this.tiles.instanceColor.needsUpdate = true;
  }

  active(): boolean {
    return this.on;
  }

  setActive(on: boolean): void {
    this.on = on;
    this.group.visible = on;
  }

  /** page the working plane one step down (dir −1) or up (dir +1), then snap */
  stepDepth(dir: number): void {
    const raw = this.elevation + Math.sign(dir) * STEP;
    this.elevation = Math.max(this.minZ, Math.min(this.maxZ, raw));
    this.snapMaybe();
    this.resample();
  }

  private snapMaybe(): void {
    let best: SnapLevel | null = null;
    let bd = SNAP_TOL;
    for (const s of this.snaps) {
      const d = Math.abs(s.z - this.elevation);
      if (d < bd) {
        bd = d;
        best = s;
      }
    }
    if (best) {
      this.elevation = best.z;
      this.snappedLabel = best.label === 'the crown' ? null : best.label;
    } else {
      this.snappedLabel = null;
    }
  }

  /** three-space Y of the working plane (the draw surface for the tunnel tool) */
  elevationY(): number {
    return this.elevation;
  }

  /** the depth ruler: fathoms below the crown, the AOD elevation, the seam or rock */
  readout(): { fathoms: number; elevationAOD: number; label: string | null; material: GroundMaterial | 'open air' } {
    const cx = this.site.extentX / 2;
    const cy = this.site.extentY / 2;
    const surf = this.site.heightAt(cx, cy);
    const material: GroundMaterial | 'open air' =
      this.elevation >= surf ? 'open air' : this.model.strataAt(cx, cy, surf - this.elevation);
    return {
      fathoms: (this.crownZ - this.elevation) / FATHOM,
      elevationAOD: this.elevation,
      label: this.snappedLabel,
      material,
    };
  }
}
