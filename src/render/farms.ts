/**
 * Field enclosures: when a plot is DESIGNATED (SIM 10 — the lord's word), the
 * land inside turns to its use. ARABLE farms till in strips and FOLLOW THE
 * YEAR; a LIVESTOCK paddock wears mottled pasture (dulling in winter); FALLOW
 * rests under tawny scrub and weeds. Render reads, never writes: every color
 * here is a pure function of world.tick, the plot's use, and its designation
 * day. An undesignated pending plot shows nothing — land is just land until
 * it is put to a use.
 *
 * The field is a quad grid clipped to the enclosure ring — a quad is included
 * only when all four corners are inside, so a strip of green survives between
 * the tillage and the wall. That strip is the HEADLAND, where the plough team
 * turned; the geometry's conservatism is historically honest for free.
 * Furrow bands run along the ring's longest edge (strips follow the plough
 * line, not the compass), colored per-quad for a chunky Townscaper read.
 *
 * The year (generic northern-England arable, ~1200s: winter ploughland,
 * spring sowing, August harvest, autumn stubble; a NEW field shows fresh
 * tillage for its first weeks whatever the month). PARTLY watchlist: the
 * precise Durham crop calendar — oats/barley weighting, two- vs three-field
 * course — is M4's research; today the year is dressing, not economy.
 */
import * as THREE from 'three';
import { pointInPolygon } from '../sim/step';
import { TICKS_PER_YEAR, type WorldState } from '../sim/types';

const CELL = 1.5; // meters per tillage quad
const STRIP_W = 2.0; // meters per furrow strip
const LIFT = 0.06; // above terrain, below the wall's first course
const MAX_QUADS = 60000; // absurd rings get coarser tillage, never a stall
const FRESH_DAYS = 45; // a new field reads as raw tillage this long

/** the year's look, in band order; FRESH overrides by age (arable only) */
const FRESH = 0;
const WINTER = 1;
const SPRING = 2;
const SUMMER = 3;
const GOLD = 4;
const STUBBLE = 5;
/** the other uses: pasture turns with the cold; fallow rests the year round */
const PASTURE_GREEN = 6;
const PASTURE_WINTER = 7;
const FALLOW_SCRUB = 8;
/** the variety tenants (SIM 24): an orchard leafs, then turns and fruits in autumn */
const ORCHARD_LEAF = 9;
const ORCHARD_TURN = 10;

function hash1(a: number): number {
  let x = Math.imul(a + 1, 0x85ebca6b) >>> 0;
  x = Math.imul(x ^ (x >>> 15), 0x27d4eb2f) >>> 0;
  return ((x ^ (x >>> 15)) >>> 0) / 4294967296;
}

function seasonBand(dayOfYear: number): number {
  if (dayOfYear < 60 || dayOfYear >= 305) return WINTER;
  if (dayOfYear < 121) return SPRING;
  if (dayOfYear < 213) return SUMMER;
  if (dayOfYear < 244) return GOLD;
  return STUBBLE;
}

/** the two furrow tones for a band, tinted per-farm by jitter j */
function bandTones(band: number, j: number): [THREE.Color, THREE.Color] {
  const c = (h: number, s: number, l: number): THREE.Color => new THREE.Color().setHSL(h, s, l);
  switch (band) {
    case WINTER: // bare ploughland under a grey sky
      return [c(0.06 + j * 0.02, 0.26, 0.3 + j * 0.05), c(0.075 + j * 0.02, 0.22, 0.36 + j * 0.05)];
    case SPRING: // brown earth, the first green rows
      return [c(0.07 + j * 0.02, 0.28, 0.36 + j * 0.05), c(0.25 + j * 0.04, 0.38, 0.44 + j * 0.06)];
    case SUMMER: // full growth, two greens
      return [c(0.22 + j * 0.03, 0.36, 0.4 + j * 0.06), c(0.24 + j * 0.04, 0.4, 0.46 + j * 0.06)];
    case GOLD: // August — the harvest standing
      return [c(0.11 + j * 0.02, 0.48, 0.52 + j * 0.06), c(0.125 + j * 0.02, 0.52, 0.58 + j * 0.06)];
    case STUBBLE: // cut straw and bared earth
      return [c(0.11 + j * 0.02, 0.3, 0.55 + j * 0.05), c(0.08 + j * 0.02, 0.25, 0.4 + j * 0.05)];
    case PASTURE_GREEN: // grazing in leaf — two greens, mottled not stripped
      return [c(0.28 + j * 0.03, 0.32, 0.42 + j * 0.05), c(0.26 + j * 0.03, 0.28, 0.48 + j * 0.05)];
    case PASTURE_WINTER: // the sward gone dull and thin
      return [c(0.2 + j * 0.02, 0.16, 0.38 + j * 0.04), c(0.17 + j * 0.02, 0.14, 0.44 + j * 0.04)];
    case FALLOW_SCRUB: // rested land — dun earth and weedy flecks
      return [c(0.1 + j * 0.02, 0.2, 0.42 + j * 0.05), c(0.2 + j * 0.03, 0.18, 0.4 + j * 0.05)];
    case ORCHARD_LEAF: // fruit trees in full leaf — a deep, close canopy green
      return [c(0.33 + j * 0.02, 0.42, 0.3 + j * 0.05), c(0.31 + j * 0.03, 0.46, 0.36 + j * 0.05)];
    case ORCHARD_TURN: // autumn — leaves russet, fruit hanging gold among them
      return [c(0.08 + j * 0.02, 0.44, 0.42 + j * 0.05), c(0.13 + j * 0.03, 0.5, 0.48 + j * 0.05)];
    default: // FRESH — just tilled, first sowing (the founding look)
      return [c(0.07 + j * 0.02, 0.3, 0.34 + j * 0.06), c(0.23 + j * 0.05, 0.3, 0.4 + j * 0.08)];
  }
}

interface FarmView {
  colorAttr: THREE.BufferAttribute;
  parities: Uint8Array; // one per quad: which of the band's two tones
  use: 'farm' | 'livestock' | 'pasture' | 'orchard' | 'fallow';
  establishedTick: number;
  jitter: number;
  shownBand: number;
}

export class FarmLayer {
  private built = 0;
  private views: FarmView[] = [];
  private mat = new THREE.MeshLambertMaterial({ vertexColors: true });

  constructor(
    private world: WorldState,
    private scene: THREE.Scene,
    private terrainGroundAt: (x: number, y: number) => number,
  ) {}

  update(): void {
    while (this.built < this.world.farms.length) {
      this.build(this.built);
      this.built += 1;
    }
    // the year turns: recolor any field whose band moved (cheap check per frame)
    for (let i = 0; i < this.views.length; i++) {
      const v = this.views[i]!;
      const band = this.bandFor(v);
      if (band !== v.shownBand) this.colorize(v, band);
    }
  }

  private bandFor(v: FarmView): number {
    if (v.use === 'fallow') return FALLOW_SCRUB; // rest knows no season
    if (v.use === 'livestock' || v.use === 'pasture') {
      // grazed sward (sheep or horse) keeps no crop calendar — only the cold shows
      return seasonBand(this.world.tick % TICKS_PER_YEAR) === WINTER
        ? PASTURE_WINTER
        : PASTURE_GREEN;
    }
    if (v.use === 'orchard') {
      // trees leaf most of the year, turn and fruit in the harvest season and the cold
      const s = seasonBand(this.world.tick % TICKS_PER_YEAR);
      return s === GOLD || s === STUBBLE || s === WINTER ? ORCHARD_TURN : ORCHARD_LEAF;
    }
    if (this.world.tick - v.establishedTick < FRESH_DAYS) return FRESH;
    return seasonBand(this.world.tick % TICKS_PER_YEAR);
  }

  private colorize(v: FarmView, band: number): void {
    const [a, b] = bandTones(band, v.jitter);
    const arr = v.colorAttr.array as Float32Array;
    for (let q = 0; q < v.parities.length; q++) {
      const c = v.parities[q] === 0 ? a : b;
      for (let k = 0; k < 6; k++) {
        const o = (q * 6 + k) * 3;
        arr[o] = c.r;
        arr[o + 1] = c.g;
        arr[o + 2] = c.b;
      }
    }
    v.colorAttr.needsUpdate = true;
    v.shownBand = band;
  }

  private build(index: number): void {
    const farm = this.world.farms[index]!;
    const ring = farm.points;

    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    for (const p of ring) {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    }

    // strips run with the plough: along the ring's longest edge
    let ux = 1;
    let uy = 0;
    let best = 0;
    for (let i = 0; i < ring.length; i++) {
      const a = ring[i]!;
      const b = ring[(i + 1) % ring.length]!;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const l2 = dx * dx + dy * dy;
      if (l2 > best) {
        best = l2;
        const l = Math.sqrt(l2);
        ux = dx / l;
        uy = dy / l;
      }
    }
    const px = -uy; // strips index along the perpendicular
    const py = ux;

    const bboxQuads = ((maxX - minX) / CELL) * ((maxY - minY) / CELL);
    const cell = bboxQuads > MAX_QUADS ? Math.sqrt(((maxX - minX) * (maxY - minY)) / MAX_QUADS) : CELL;

    const positions: number[] = [];
    const parities: number[] = [];
    const g = this.terrainGroundAt;
    const gx0 = Math.floor(minX / cell);
    const gx1 = Math.ceil(maxX / cell);
    const gy0 = Math.floor(minY / cell);
    const gy1 = Math.ceil(maxY / cell);
    for (let gy = gy0; gy < gy1; gy++) {
      for (let gx = gx0; gx < gx1; gx++) {
        const x0 = gx * cell;
        const y0 = gy * cell;
        const x1 = x0 + cell;
        const y1 = y0 + cell;
        // all four corners inside, or the quad stays green — the headland
        if (
          !pointInPolygon(x0, y0, ring) ||
          !pointInPolygon(x1, y0, ring) ||
          !pointInPolygon(x1, y1, ring) ||
          !pointInPolygon(x0, y1, ring)
        ) {
          continue;
        }
        const cxq = (x0 + x1) / 2;
        const cyq = (y0 + y1) / 2;
        if (farm.use === 'farm') {
          // furrow strips follow the plough line
          const strip = Math.floor((px * (cxq - ring[0]!.x) + py * (cyq - ring[0]!.y)) / STRIP_W);
          parities.push(strip & 1);
        } else {
          // pasture and fallow mottle — nobody ploughed them
          parities.push(hash1(farm.id * 8191 + parities.length) < 0.5 ? 0 : 1);
        }
        const z00 = g(x0, y0) + LIFT;
        const z10 = g(x1, y0) + LIFT;
        const z11 = g(x1, y1) + LIFT;
        const z01 = g(x0, y1) + LIFT;
        // two triangles, wound +Y-up per the terrain convention (a,c,b)(b,c,d)
        positions.push(x0, z00, y0, x0, z01, y1, x1, z10, y0);
        positions.push(x1, z10, y0, x0, z01, y1, x1, z11, y1);
      }
    }
    if (positions.length === 0) return; // a farm thinner than a quad shows no tillage

    // the chronicle knows the day the plot was put to its use; the render asks it
    let established = 0;
    for (const e of this.world.events) {
      if (e.kind === 'plot_designated' && e.plotId === farm.id) {
        established = e.tick;
        break;
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3));
    const colorAttr = new THREE.BufferAttribute(new Float32Array(positions.length), 3);
    geo.setAttribute('color', colorAttr);
    geo.computeVertexNormals();
    const mesh = new THREE.Mesh(geo, this.mat);
    mesh.frustumCulled = false;
    this.scene.add(mesh);

    const view: FarmView = {
      colorAttr,
      parities: Uint8Array.from(parities),
      use: farm.use,
      establishedTick: established,
      jitter: hash1(farm.id),
      shownBand: -1,
    };
    this.views.push(view);
    this.colorize(view, this.bandFor(view));
  }
}
