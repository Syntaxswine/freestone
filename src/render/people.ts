/**
 * Ambient people layer: billboard sprites whose behavior is DERIVED from sim
 * truth (which wall is unfinished, which course is active) plus render-side
 * theater (walking, hammering, shuttling). Positions here are presentation
 * state and never enter the sim — render reads, never writes (SCOPE §11 law).
 *
 * Masons work STATIONS: fixed fractions along the wall line, at the active
 * course height. The sim's exact laying front advances a full day's quota per
 * tick (~25+ m along the wall), far faster than a sprite can walk — chasing it
 * reads as pursuit, not masonry. Stations read as crews working their own
 * lifts, which is also where M2's banker-section realism is headed.
 *
 * Sprites stand on the DISPLAYED terrain surface (groundAt), not full-res
 * site.heightAt — the two differ enough on steep ground to bury feet.
 */
import * as THREE from 'three';
import type { SiteData } from '../sim/site';
import { awaitsDrawings, decomposeWall, pointAt, pointInPolygon, polylineLength } from '../sim/step';
import {
  COURSE_HEIGHT,
  TICKS_PER_YEAR,
  type Farm,
  type Person,
  type Vec2,
  type WallPlan,
  type WorldState,
} from '../sim/types';
import { FRAMES, personTexture, SPRITE_H, SPRITE_W } from './pixelart';

const ARRIVE = 0.35; // meters: close enough to a walk target to stop
const WORK_RADIUS = 1.6; // meters: close enough to the station to work / hand off
const TOGGLE_DWELL = 1.2; // seconds a laborer spends at either end of the shuttle

// SIM 20 gave every soul a birthTick; make the crowd a CLOCK by fading each sprite toward the grey
// of age (render-only — the stone-patina trick, now for folk). A young hand reads vivid, an elder
// muted; the whole village becomes the player's gut-gauge for how long a generation runs (roadmap
// Beat 4's clerk trick, "stolen for everyone"). A whisper — the science is the spectacle.
const AGE_ELDER_YEARS = 50; // an elder by here — the tint reaches its cap (fills the adult range)
const AGE_TINT_MAX = 0.7; // how far toward the grey of age an elder's sprite fades (readable, tunable)
const AGE_GREY = new THREE.Color(0.63, 0.6, 0.52); // the warm grey of years
const AGE_YOUNG = new THREE.Color(1, 1, 1); // texture unchanged — youth reads as drawn

interface Puppet {
  person: Person;
  sprite: THREE.Sprite;
  tex: THREE.CanvasTexture;
  x: number;
  y: number; // sim coords (x east, y north)
  z: number; // eased elevation (feet)
  speed: number; // m/s, per-person
  facing: 1 | -1;
  frame: number;
  shownFrame: number;
  shownFacing: 1 | -1;
  offSide: number;
  /** laborers: true while walking a block toward the wall */
  carrying: boolean;
  lastToggle: number;
  tradeIndex: number;
  shownAge: number; // last age-band tinted (5-year bands), so we retint rarely
}

interface WorkSite {
  wall: WallPlan;
  course: number;
  length: number;
}

function hash2(a: number, b: number): number {
  let x = (Math.imul(a, 0x85ebca6b) ^ Math.imul(b + 1, 0xc2b2ae35)) >>> 0;
  x = Math.imul(x ^ (x >>> 15), 0x27d4eb2f) >>> 0;
  return ((x ^ (x >>> 15)) >>> 0) / 4294967296;
}

export class PeopleLayer {
  private puppets: Puppet[] = [];
  private byId = new Map<number, Puppet>();
  private clock = 0;
  private lastStoneCount = 0;
  private lastLaidClock = -10;
  private campX: number;
  private campY: number;
  private masonCount: number;

  constructor(
    private world: WorldState,
    private site: SiteData,
    private scene: THREE.Scene,
    private groundAt: (x: number, y: number) => number,
  ) {
    this.campX = site.extentX / 2;
    this.campY = site.extentY / 2;
    this.masonCount = 1;
    this.absorb(); // give the founding party their sprites (and, thereafter, any who arrive)
  }

  /**
   * Keep the crowd in step with the sim's own roster (SIM 20+): the layer used to sprite ONLY the
   * founders it saw at boot, so every child born, migrant arrived and smith raised afterwards walked
   * invisibly. Now each new soul gets a sprite and each who has died or left leaves the diorama.
   */
  private absorb(): void {
    const live = new Set<number>();
    for (const person of this.world.people) {
      live.add(person.id);
      if (!this.byId.has(person.id)) this.addPuppet(person);
    }
    for (const [id, pup] of this.byId) {
      if (live.has(id)) continue;
      this.scene.remove(pup.sprite); // a soul gone from the roster leaves the ground
      const i = this.puppets.indexOf(pup);
      if (i >= 0) this.puppets.splice(i, 1);
      this.byId.delete(id);
    }
    // masons set the station count; re-index each trade by array order so posts stay assigned
    this.masonCount = Math.max(1, this.puppets.reduce((n, p) => n + (p.person.trade === 'mason' ? 1 : 0), 0));
    let m = 0;
    let l = 0;
    for (const pup of this.puppets) pup.tradeIndex = pup.person.trade === 'mason' ? m++ : l++;
  }

  private addPuppet(person: Person): void {
    const tex = personTexture(person);
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, alphaTest: 0.5 });
    const sprite = new THREE.Sprite(mat);
    sprite.center.set(0.5, 0.02); // anchor at the feet
    sprite.scale.set(SPRITE_W, SPRITE_H, 1);
    this.scene.add(sprite);
    const sx = this.campX + (hash2(person.id, 11) - 0.5) * 10;
    const sy = this.campY + (hash2(person.id, 23) - 0.5) * 10;
    const pup: Puppet = {
      person,
      sprite,
      tex,
      x: sx,
      y: sy,
      z: this.groundAt(sx, sy),
      speed: 1.1 + hash2(person.id, 5) * 0.6,
      facing: 1,
      frame: 0,
      shownFrame: -1,
      shownFacing: 1,
      offSide: 0.9,
      carrying: false,
      lastToggle: -10,
      tradeIndex: 0,
      shownAge: -1,
    };
    this.puppets.push(pup);
    this.byId.set(person.id, pup);
  }

  /** The active wall and its current course, straight from sim truth. */
  private workSite(): WorkSite | null {
    // drawings-awaiting walls draw no masons (layStones' own filter)
    const wall = this.world.walls.find((w) => w.stonesLaid < w.stonesTotal && !awaitsDrawings(w));
    if (!wall) return null;
    const { stonesPerCourse } = decomposeWall(wall.points, wall.height, wall.gates);
    const course = Math.floor(wall.stonesLaid / stonesPerCourse);
    return { wall, course, length: polylineLength(wall.points) };
  }

  /**
   * A furrow row for one field hand: runs with the plough (the ring's longest
   * edge — matching the tillage strips), anchored ON that edge and stepped
   * INWARD, never at the vertex centroid: for a C- or U-shaped farm the
   * centroid sits in the unfarmed hollow, and the second fleet proved 800/800
   * centroid rows landed outside. Land beside the longest edge is the one
   * region a legal enclosure guarantees. Pure theater derived from sim truth —
   * the sim only counts the workday; where in the field it was spent is
   * presentation.
   */
  private fieldRow(farm: Farm, idx: number): { a: Vec2; b: Vec2 } {
    const ring = farm.points;
    let ei = 0;
    let best = 0;
    for (let i = 0; i < ring.length; i++) {
      const a = ring[i]!;
      const b = ring[(i + 1) % ring.length]!;
      const l2 = (b.x - a.x) ** 2 + (b.y - a.y) ** 2;
      if (l2 > best) {
        best = l2;
        ei = i;
      }
    }
    const a0 = ring[ei]!;
    const b0 = ring[(ei + 1) % ring.length]!;
    const el = Math.sqrt(best) || 1;
    const ux = (b0.x - a0.x) / el;
    const uy = (b0.y - a0.y) / el;
    let px = -uy;
    let py = ux;
    const mx = (a0.x + b0.x) / 2;
    const my = (a0.y + b0.y) / 2;
    // point the perpendicular into the field
    if (!pointInPolygon(mx + px * 1.2, my + py * 1.2, ring)) {
      px = -px;
      py = -py;
    }
    // walk inward to this hand's row, stopping at the far side of the land
    const want = 1.2 + hash2(farm.id, idx * 13 + 1) * 10;
    let dep = 1.2;
    for (let d = 1.2; d <= want; d += 0.8) {
      if (!pointInPolygon(mx + px * d, my + py * d, ring)) break;
      dep = d;
    }
    const cx = mx + px * dep;
    const cy = my + py * dep;
    let half = el * 0.38;
    const mk = (s: number): Vec2 => ({ x: cx + ux * s, y: cy + uy * s });
    let a = mk(-half);
    let b = mk(half);
    for (
      let k = 0;
      k < 6 && !(pointInPolygon(a.x, a.y, ring) && pointInPolygon(b.x, b.y, ring));
      k++
    ) {
      half *= 0.6;
      a = mk(-half);
      b = mk(half);
    }
    return { a, b };
  }

  /** A mason's post: the midpoint of their share of the wall, offset to one side. */
  private station(ws: WorkSite, masonIndex: number): { x: number; y: number; z: number } {
    const frac = (2 * masonIndex + 1) / (2 * this.masonCount);
    const at = pointAt(ws.wall.points, frac * ws.length);
    const sin = Math.sin(at.yaw);
    const cos = Math.cos(at.yaw);
    return {
      x: at.x - sin * 0.9,
      y: at.y + cos * 0.9,
      z: this.groundAt(at.x, at.y) + ws.course * COURSE_HEIGHT,
    };
  }

  /** dt in real seconds; simActive=false (paused) freezes the whole diorama. */
  update(dt: number, simActive: boolean): void {
    this.absorb(); // keep the crowd in step with the sim's roster — new souls, and the departed
    if (simActive) this.clock += dt;
    const step = simActive ? dt : 0;

    if (this.world.stones.length !== this.lastStoneCount) {
      this.lastStoneCount = this.world.stones.length;
      this.lastLaidClock = this.clock;
    }
    const laying = this.clock - this.lastLaidClock < 1.0;

    const ws = this.workSite();
    // laborers serve the earth first, then the deck — the sim's own order
    const fill = this.world.fills.find((f) => f.volumeMoved < f.volumeTotal) ?? null;
    // uncovered spans (material null) are not work — moveEarth's own filter
    const deck =
      this.world.roofs.find((r) => r.material !== null && r.workDone < r.workTotal) ?? null;
    const haul: { points: Vec2[] } | null = fill ?? deck;
    // hands walk only the ARABLE fields — moveEarth's own filter (pasture is
    // grazed, fallow rests; theater must not show work the sim doesn't do)
    const arable = this.world.farms.filter((f) => f.use === 'farm');

    for (const p of this.puppets) {
      // --- pick this puppet's target ---
      let tx: number;
      let ty: number;
      let tz: number | null = null; // null → stand on the ground
      let inField = false;
      if (ws && p.person.trade === 'mason') {
        const st = this.station(ws, p.tradeIndex);
        tx = st.x;
        ty = st.y;
        tz = st.z;
      } else if (haul && p.person.trade === 'laborer') {
        // barrow dirt (or deck timber) from a point outside the ring to the middle
        let cx = 0;
        let cy = 0;
        for (const q of haul.points) {
          cx += q.x;
          cy += q.y;
        }
        cx /= haul.points.length;
        cy /= haul.points.length;
        if (p.carrying) {
          tx = cx + (hash2(p.person.id, 3) - 0.5) * 4;
          ty = cy + (hash2(p.person.id, 7) - 0.5) * 4;
        } else {
          const v0 = haul.points[0]!;
          let ox = v0.x - cx;
          let oy = v0.y - cy;
          const ol = Math.sqrt(ox * ox + oy * oy) || 1;
          ox /= ol;
          oy /= ol;
          tx = v0.x + ox * 6 + (p.tradeIndex % 2) * 2;
          ty = v0.y + oy * 6;
        }
      } else if (p.person.trade === 'laborer' && arable.length > 0) {
        // the fields: sim truth says an earthless laborer tends a farm
        // (moveEarth's fallback) — walk the furrows of "their" farm,
        // pacing row ends like the shuttle paces its two stations
        const farm = arable[p.tradeIndex % arable.length]!;
        const row = this.fieldRow(farm, p.tradeIndex);
        const end = p.carrying ? row.b : row.a; // carrying doubles as "which end"
        inField = true;
        tx = end.x;
        ty = end.y;
      } else if (ws && p.person.trade === 'laborer') {
        // shuttle blocks between a stockpile near the wall's start and the
        // station of "their" mason (round-robin by index)
        const start = pointAt(ws.wall.points, 0);
        const sin = Math.sin(start.yaw);
        const cos = Math.cos(start.yaw);
        if (p.carrying) {
          const st = this.station(ws, p.tradeIndex % this.masonCount);
          const away = 1.4 + (p.tradeIndex % 2) * 0.8; // hand off short of the mason
          tx = st.x - sin * away;
          ty = st.y + cos * away;
        } else {
          tx = start.x - sin * 3.5 - cos * 1.5;
          ty = start.y + cos * 3.5 + sin * 1.5;
        }
      } else if (p.person.trade === 'smith') {
        // the smith keeps to his forge — he stands by the blacksmith he serves (where the lit
        // forge prop stands), shuffling a little, not idling at the founding camp with the rest
        const smithy = this.world.buildings.find((b) => b.kind === 'blacksmith');
        const wall = smithy ? this.world.walls.find((w) => w.id === smithy.wallId) : undefined;
        if (wall && wall.points.length > 0) {
          let cx = 0;
          let cy = 0;
          for (const q of wall.points) {
            cx += q.x;
            cy += q.y;
          }
          cx /= wall.points.length;
          cy /= wall.points.length;
          const slice = Math.floor(this.clock / 6) + p.person.id;
          tx = cx + (hash2(p.person.id, slice) - 0.5) * 2;
          ty = cy - 3 + (hash2(p.person.id, slice + 1) - 0.5) * 1.4; // just south, at the forge
        } else {
          tx = this.campX + (hash2(p.person.id, 1) - 0.5) * 8;
          ty = this.campY + (hash2(p.person.id, 2) - 0.5) * 8;
        }
      } else {
        // no active wall: set the block down and idle around camp
        p.carrying = false;
        const slice = Math.floor(this.clock / 9) + p.person.id;
        tx = this.campX + (hash2(p.person.id, slice) - 0.5) * 12;
        ty = this.campY + (hash2(p.person.id, slice + 1) - 0.5) * 12;
      }

      // --- walk toward it ---
      const dx = tx - p.x;
      const dy = ty - p.y;
      const d = Math.sqrt(dx * dx + dy * dy);
      // theater, not simulation: distant works pull the crew faster, so a wall
      // drawn across the survey box reads as "setting out", not a nine-minute hike
      const stride = Math.max(p.speed, d / 10) * step;
      const walking = d > ARRIVE && stride > 0;
      if (walking) {
        const t = Math.min(stride / d, 1);
        p.x += dx * t;
        p.y += dy * t;
        if (Math.abs(dx) > 0.02) p.facing = dx >= 0 ? 1 : -1;
      } else if (
        d <= WORK_RADIUS &&
        (ws !== null || haul !== null || inField) &&
        p.person.trade === 'laborer' &&
        simActive &&
        this.clock - p.lastToggle > TOGGLE_DWELL
      ) {
        p.carrying = !p.carrying; // arrived: pick up / hand off / turn the row
        p.lastToggle = this.clock;
      }

      // --- elevation: ground while traveling, course height at the station ---
      const ground = this.groundAt(p.x, p.y);
      const goalZ = tz !== null && d < WORK_RADIUS ? tz : ground;
      p.z += (goalZ - p.z) * Math.min(1, step * 4); // step, not dt: pause freezes this too

      // --- pick a frame ---
      let frame = 0;
      if (walking) {
        frame =
          p.person.trade === 'laborer' && p.carrying && !inField
            ? 3 // carry pose while hauling — in the field there is no block
            : 1 + (Math.floor(this.clock * 4 * p.speed) % 2);
      } else if (p.person.trade === 'mason' && ws && d < WORK_RADIUS && laying && simActive) {
        frame = Math.floor(this.clock * 3) % 2 === 0 ? 3 : 0; // hammer swing
      } else if (p.person.trade === 'smith' && d < WORK_RADIUS && simActive) {
        frame = Math.floor(this.clock * 2.5) % 3 === 0 ? 3 : 0; // strikes the anvil now and then
      }
      // mirror in UV space: the sprite shader takes length() of the scale
      // columns, so a negative sprite.scale.x is a silent no-op
      if (frame !== p.shownFrame || p.facing !== p.shownFacing) {
        p.shownFrame = frame;
        p.shownFacing = p.facing;
        p.tex.repeat.x = p.facing / FRAMES;
        p.tex.offset.x = (frame + (p.facing < 0 ? 1 : 0)) / FRAMES;
      }
      p.frame = frame;

      // carried blocks bob a little; sim → three: (x, up, north)
      const bob =
        p.person.trade === 'laborer' && p.carrying && walking && !inField
          ? Math.abs(Math.sin(this.clock * 6 + p.person.id)) * 0.05
          : 0;
      p.sprite.position.set(p.x, p.z + bob, p.y);

      // the village clock: fade this sprite toward the grey of age by its years (render-only,
      // reads bornTick; banded in 5-year steps so a retint is rare). Founders start middle-aged
      // (bornTick < 0), a newborn reads vivid — the crowd shows its generations at a glance.
      const ageYears = (this.world.tick - p.person.bornTick) / TICKS_PER_YEAR;
      const band = Math.max(0, Math.floor(ageYears / 5));
      if (band !== p.shownAge) {
        p.shownAge = band;
        const f = Math.min(1, Math.max(0, ageYears) / AGE_ELDER_YEARS) * AGE_TINT_MAX;
        (p.sprite.material as THREE.SpriteMaterial).color.copy(AGE_YOUNG).lerp(AGE_GREY, f);
      }
    }
  }
}
