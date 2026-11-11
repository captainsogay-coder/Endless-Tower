// Unit artwork. Each unit definition names an art key; painters here draw the
// unit in world units around (0, 0) = the unit's feet. Frames are rendered once
// into cached sprites, so hundreds of copies cost one image blit each.
//
// House style (applies to every unit):
//  - light from the top-left, soft contact shadow below
//  - flat colour fills with a single dark, hue-tinted outline
//  - no glow; readability comes from silhouette and value contrast

import { makeCanvas, circle } from './canvas.js';
import { shade } from '../core/color.js';

const RES = 2;

// ---------------------------------------------------------------- DUDE
// An ordinary guy: messy hair, red tee, jeans. Throws pebbles.
const DUDE = {
  skin: '#e9b48a',
  hair: '#4a2f1d',
  tee: '#c8483a',
  jeans: '#3d4f73',
  shoes: '#2a2a2e',
  outline: '#1d1418',
};

function dude(ctx, { frame = 0, facing = 1, level = 0 } = {}) {
  const o = DUDE.outline;
  const throwing = frame === 1;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  // contact shadow
  ctx.fillStyle = 'rgba(20,14,24,0.32)';
  ctx.beginPath();
  ctx.ellipse(1.5, 0.5, 7.5, 3, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  ctx.scale(facing, 1);
  ctx.lineWidth = 1.4;
  ctx.strokeStyle = o;

  // legs
  ctx.fillStyle = DUDE.jeans;
  ctx.beginPath();
  ctx.roundRect(-4.2, -6.5, 3.6, 6.2, 1);
  ctx.roundRect(0.6, -6.5, 3.6, 6.2, 1);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = DUDE.shoes;
  ctx.beginPath();
  ctx.roundRect(-4.6, -1.4, 4.2, 2.2, 1);
  ctx.roundRect(0.6, -1.4, 4.4, 2.2, 1);
  ctx.fill();

  // back arm (the throwing arm when winding up)
  ctx.strokeStyle = o;
  ctx.lineWidth = 3.6;
  ctx.beginPath();
  if (throwing) {
    ctx.moveTo(4.5, -12.5);
    ctx.lineTo(7.5, -18.5);
  } else {
    ctx.moveTo(4.8, -12.5);
    ctx.lineTo(6, -7.5);
  }
  ctx.stroke();
  ctx.strokeStyle = DUDE.skin;
  ctx.lineWidth = 2.2;
  ctx.stroke();
  if (throwing) {
    ctx.fillStyle = '#8d8a84';
    circle(ctx, 8, -19.5, 1.6);
    ctx.fill();
    ctx.lineWidth = 0.8;
    ctx.strokeStyle = o;
    ctx.stroke();
  }

  // torso – plain tee
  ctx.lineWidth = 1.4;
  ctx.strokeStyle = o;
  ctx.fillStyle = DUDE.tee;
  ctx.beginPath();
  ctx.moveTo(-5.6, -14.6);
  ctx.quadraticCurveTo(0, -16.2, 5.6, -14.6);
  ctx.lineTo(5.2, -6);
  ctx.quadraticCurveTo(0, -5.2, -5.2, -6);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // light from the top-left
  ctx.fillStyle = shade(DUDE.tee, 0.18);
  ctx.beginPath();
  ctx.moveTo(-4.6, -14);
  ctx.quadraticCurveTo(-1, -15, 0.5, -14.9);
  ctx.lineTo(-0.5, -7);
  ctx.lineTo(-4.4, -7);
  ctx.closePath();
  ctx.fill();

  // front arm
  ctx.strokeStyle = o;
  ctx.lineWidth = 3.6;
  ctx.beginPath();
  ctx.moveTo(-4.8, -12.5);
  ctx.lineTo(-5.8, -7.4);
  ctx.stroke();
  ctx.strokeStyle = DUDE.skin;
  ctx.lineWidth = 2.2;
  ctx.stroke();

  // head
  ctx.lineWidth = 1.4;
  ctx.strokeStyle = o;
  ctx.fillStyle = DUDE.skin;
  circle(ctx, 0, -20, 5.4);
  ctx.fill();
  ctx.stroke();
  // messy hair
  ctx.fillStyle = DUDE.hair;
  ctx.beginPath();
  ctx.moveTo(-5.5, -20.5);
  ctx.quadraticCurveTo(-6, -26.5, 0, -26);
  ctx.quadraticCurveTo(4.5, -26.8, 5.6, -21.5);
  ctx.lineTo(3.5, -23);
  ctx.lineTo(1.5, -21.6);
  ctx.lineTo(-0.5, -23.2);
  ctx.lineTo(-2.8, -21.8);
  ctx.lineTo(-4.4, -22.6);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-1, -26);
  ctx.lineTo(-2.4, -28.2);
  ctx.lineTo(0.8, -26.2);
  ctx.fill();
  // face: looking toward the target side
  ctx.fillStyle = o;
  circle(ctx, 1.4, -19.6, 0.75);
  ctx.fill();
  circle(ctx, 3.8, -19.6, 0.75);
  ctx.fill();
  ctx.strokeStyle = shade(DUDE.skin, -0.45);
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(1.8, -17.2);
  ctx.lineTo(3.6, -17.4);
  ctx.stroke();
  ctx.restore();

  // upgrade level: small stripes on the ground, unflipped so they read the same
  if (level > 0) {
    ctx.fillStyle = '#f2e6c9';
    ctx.strokeStyle = 'rgba(20,14,24,0.7)';
    ctx.lineWidth = 0.8;
    const w = 2.2;
    const gap = 1.2;
    const total = level * w + (level - 1) * gap;
    for (let i = 0; i < level; i++) {
      const x = -total / 2 + i * (w + gap);
      ctx.beginPath();
      ctx.rect(x, 3.2, w, 2.4);
      ctx.fill();
      ctx.stroke();
    }
  }
}

// Generic fallback for units without bespoke art: a neutral marker.
function fallback(ctx, { level = 0 } = {}) {
  ctx.fillStyle = 'rgba(20,14,24,0.32)';
  ctx.beginPath();
  ctx.ellipse(1.5, 0.5, 8, 3.2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#8a8f99';
  ctx.strokeStyle = '#22252b';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.roundRect(-6, -16, 12, 16, 3);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#f2e6c9';
  for (let i = 0; i < level; i++) ctx.fillRect(-6 + i * 2.6, 3, 2, 2);
}

const PAINTERS = { dude };

/** Bounds (in world px) of every unit sprite, relative to the feet. */
const BOX = { left: -14, right: 14, top: -32, bottom: 8 };

const cache = new Map();

export function unitSprite(artKey, frame, facing, level) {
  const key = `${artKey}|${frame}|${facing}|${level}`;
  let s = cache.get(key);
  if (s) return s;
  const w = BOX.right - BOX.left;
  const h = BOX.bottom - BOX.top;
  const c = makeCanvas(w * RES, h * RES);
  const ctx = c.getContext('2d');
  ctx.setTransform(RES, 0, 0, RES, -BOX.left * RES, -BOX.top * RES);
  (PAINTERS[artKey] ?? fallback)(ctx, { frame, facing, level });
  s = { img: c, ox: BOX.left, oy: BOX.top, w, h };
  cache.set(key, s);
  return s;
}

/** Draws a deployed unit. Feet sit slightly below the tile centre. */
export function drawUnit(ctx, u, t) {
  const frame = u.recoil > 0.35 ? 1 : 0;
  const s = unitSprite(u.def.art, frame, u.facing >= 0 ? 1 : -1, u.level);
  // a tiny idle sway, phase-shifted per unit so crowds don't move in lockstep
  const bob = frame ? 0 : Math.round(Math.sin(t * 2.2 + u.uid * 1.7) * 0.6 * 2) / 2;
  ctx.drawImage(s.img, u.x + s.ox, u.y + 9 + s.oy + bob, s.w, s.h);
}

/** Portrait for UI cards: returns a data URL of the unit art at the given size. */
export function unitPortrait(artKey, size = 96, level = 0) {
  const c = makeCanvas(size, size);
  const ctx = c.getContext('2d');
  const k = size / 40;
  ctx.setTransform(k, 0, 0, k, size / 2, size * 0.8);
  (PAINTERS[artKey] ?? fallback)(ctx, { frame: 0, facing: 1, level });
  return c.toDataURL();
}
