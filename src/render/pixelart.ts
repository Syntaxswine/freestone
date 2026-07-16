/**
 * Procedural DS-scale pixel sprites, drawn once at boot on a canvas.
 * 24x32 px per frame, 4 frames: 0 stand · 1 walk-a · 2 walk-b (mirror) · 3 work/carry.
 *
 * Render-side only: palette choice keys on the person's id through an integer
 * hash — presentation never touches the sim rng (SCOPE §11 law).
 */
import * as THREE from 'three';
import type { Person } from '../sim/types';

export const FRAME_W = 24;
export const FRAME_H = 32;
export const FRAMES = 4;

/** person height in world meters; width keeps the 24:32 pixel aspect */
export const SPRITE_H = 1.7;
export const SPRITE_W = SPRITE_H * (FRAME_W / FRAME_H);

// muted medieval dye palette (field-guide restraint): undyed wool, walnut,
// madder, woad, weld, murrey — nothing brighter than the stone
const TUNICS = ['#8a7d66', '#6e5a44', '#96524a', '#4e6274', '#8c845a', '#715a66'];
const HOODS = ['#5c5142', '#4a3f33', '#6b4a42', '#3c4a58', '#665f44'];
const SKINS = ['#c9a789', '#b08d6e', '#96775c'];
const HOSE = '#55503f';
const SHOE = '#3b332a';
const BELT = '#4a3a28';
const APRON = '#6d5b41'; // mason's leather apron
const CAP = '#c9c2b0'; // mason's coif, pale with stone dust
const STONE = '#b9a88f';
const STONE_EDGE = '#9a8a72';
const HAFT = '#7a5f3a';
const IRON = '#8f9399';
const EYE = '#2b2620';
const SMITH_APRON = '#4a3728'; // the smith's heavy leather apron — darker than the mason's
const SMITH_CAP = '#33302b'; // a close sooty cap, no hood
const TONGS = '#6a6e74'; // the smith's iron tongs
const EMBER = '#ff7a1e'; // the hot bloom gripped in them

function hashId(n: number): number {
  let x = (n ^ 0x9e3779b9) >>> 0;
  x = Math.imul(x ^ (x >>> 16), 0x45d9f3b) >>> 0;
  x = Math.imul(x ^ (x >>> 16), 0x45d9f3b) >>> 0;
  return (x ^ (x >>> 16)) >>> 0;
}

/**
 * The figure's COSTUME (SIM 36): trades no longer exist below the smith, so the look
 * is a presentation choice — 'hand' is the hooded villager, 'mason' the capped-and-
 * aproned layer (worn by ASSIGNMENT once Course 2's retexture lands), 'smith' the
 * sooty specialist. Kept apart from Person['trade'] on purpose.
 */
export type Costume = 'hand' | 'mason' | 'smith';

interface Look {
  skin: string;
  tunic: string;
  hood: string;
  costume: Costume;
}

function drawFigure(
  ctx: CanvasRenderingContext2D,
  look: Look,
  pose: 'stand' | 'walk' | 'work',
): void {
  const P = (x: number, y: number, w: number, h: number, c: string): void => {
    ctx.fillStyle = c;
    ctx.fillRect(x, y, w, h);
  };

  // head + headgear (face rows stay visible under both)
  if (look.costume === 'mason') {
    P(9, 4, 6, 3, CAP);
  } else if (look.costume === 'smith') {
    P(9, 4, 6, 3, SMITH_CAP); // a close sooty cap, bare of the hood
  } else {
    P(9, 4, 6, 3, look.hood);
    P(8, 6, 8, 2, look.hood); // hood drape over the shoulders
  }
  P(9, 7, 6, 5, look.skin);
  P(10, 9, 1, 1, EYE);
  P(13, 9, 1, 1, EYE);

  // torso + skirt of the tunic
  P(7, 12, 10, 6, look.tunic);
  if (look.costume === 'mason') P(9, 13, 6, 5, APRON);
  else if (look.costume === 'smith') P(8, 12, 8, 6, SMITH_APRON); // a full, heavy apron chest to belt
  P(7, 17, 10, 1, BELT);
  P(8, 18, 8, 4, look.tunic);

  // arms + legs by pose
  if (pose === 'work') {
    if (look.costume === 'mason') {
      // left arm steadies, right arm raised with the hammer
      P(5, 12, 2, 6, look.tunic);
      P(5, 18, 2, 1, look.skin);
      P(16, 8, 2, 4, look.tunic);
      P(17, 6, 1, 3, look.skin);
      P(18, 5, 1, 4, HAFT);
      P(17, 3, 3, 2, IRON);
    } else if (look.costume === 'smith') {
      // the smith strikes: right arm raised with the hammer, left holds tongs and a hot bloom
      P(16, 8, 2, 4, look.tunic);
      P(17, 6, 1, 3, look.skin);
      P(18, 5, 1, 4, HAFT);
      P(17, 3, 3, 2, IRON); // the hammer, poised
      P(5, 13, 2, 5, look.tunic);
      P(5, 17, 2, 1, look.skin); // the left arm, forward
      P(2, 17, 4, 1, TONGS); // the tongs reaching to the anvil
      P(1, 16, 1, 2, EMBER); // the iron glowing in their grip
    } else {
      // both hands on a carried block at the chest
      P(8, 13, 1, 3, look.skin);
      P(15, 13, 1, 3, look.skin);
      P(9, 11, 6, 4, STONE);
      P(9, 14, 6, 1, STONE_EDGE);
    }
    P(9, 22, 3, 7, HOSE);
    P(13, 22, 3, 7, HOSE);
    P(8, 29, 4, 2, SHOE);
    P(13, 29, 4, 2, SHOE);
  } else if (pose === 'walk') {
    // arms swing opposite the split legs
    P(4, 13, 2, 6, look.tunic);
    P(4, 19, 2, 1, look.skin);
    P(18, 12, 2, 6, look.tunic);
    P(18, 18, 2, 1, look.skin);
    P(7, 22, 3, 7, HOSE);
    P(14, 22, 3, 7, HOSE);
    P(6, 29, 4, 2, SHOE);
    P(14, 29, 4, 2, SHOE);
  } else {
    P(5, 12, 2, 6, look.tunic);
    P(5, 18, 2, 1, look.skin);
    P(17, 12, 2, 6, look.tunic);
    P(17, 18, 2, 1, look.skin);
    P(9, 22, 3, 7, HOSE);
    P(13, 22, 3, 7, HOSE);
    P(8, 29, 4, 2, SHOE);
    P(13, 29, 4, 2, SHOE);
  }
}

/**
 * One 4-frame sheet per person; NearestFilter keeps the pixels honest. The costume
 * defaults from the trade (smith wears the apron, everyone else the hood); Course 2's
 * retexture-on-assignment passes 'mason' for the day's layers.
 */
export function personTexture(person: Person, costume?: Costume): THREE.CanvasTexture {
  const h = hashId(person.id);
  const look: Look = {
    skin: SKINS[h % SKINS.length]!,
    tunic: TUNICS[(h >>> 3) % TUNICS.length]!,
    hood: HOODS[(h >>> 7) % HOODS.length]!,
    costume: costume ?? (person.trade === 'smith' ? 'smith' : 'hand'),
  };

  const canvas = document.createElement('canvas');
  canvas.width = FRAME_W * FRAMES;
  canvas.height = FRAME_H;
  const ctx = canvas.getContext('2d')!;

  const poses: Array<'stand' | 'walk' | 'work'> = ['stand', 'walk', 'walk', 'work'];
  for (let f = 0; f < FRAMES; f++) {
    ctx.save();
    if (f === 2) {
      // walk-b is walk-a mirrored (the face is symmetric, so this is free)
      ctx.translate(f * FRAME_W + FRAME_W, 0);
      ctx.scale(-1, 1);
    } else {
      ctx.translate(f * FRAME_W, 0);
    }
    drawFigure(ctx, look, poses[f]!);
    ctx.restore();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.repeat.set(1 / FRAMES, 1);
  return tex;
}
