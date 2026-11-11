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

// ---------------------------------------------------------------- shared soldier parts

function shadow(ctx, w = 7.5) {
  ctx.fillStyle = 'rgba(20,14,24,0.32)';
  ctx.beginPath();
  ctx.ellipse(1.5, 0.5, w, w * 0.4, 0, 0, Math.PI * 2);
  ctx.fill();
}

function limb(ctx, x0, y0, x1, y1, color, o, w = 2.2) {
  ctx.lineCap = 'round';
  ctx.strokeStyle = o;
  ctx.lineWidth = w + 1.4;
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.stroke();
  ctx.strokeStyle = color;
  ctx.lineWidth = w;
  ctx.stroke();
}

function legs(ctx, pants, boots, o, spread = 0) {
  ctx.lineWidth = 1.4;
  ctx.strokeStyle = o;
  ctx.fillStyle = pants;
  ctx.beginPath();
  ctx.roundRect(-4.4 - spread, -6.8, 3.8, 6.4, 1);
  ctx.roundRect(0.6 + spread, -6.8, 3.8, 6.4, 1);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = boots;
  ctx.beginPath();
  ctx.roundRect(-4.8 - spread, -1.6, 4.4, 2.6, 1);
  ctx.roundRect(0.6 + spread, -1.6, 4.6, 2.6, 1);
  ctx.fill();
}

function torso(ctx, color, o, wide = 0) {
  ctx.lineWidth = 1.4;
  ctx.strokeStyle = o;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(-5.8 - wide, -14.8);
  ctx.quadraticCurveTo(0, -16.4, 5.8 + wide, -14.8);
  ctx.lineTo(5.4 + wide, -5.8);
  ctx.quadraticCurveTo(0, -5, -5.4 - wide, -5.8);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = shade(color, 0.16);
  ctx.beginPath();
  ctx.moveTo(-4.8 - wide, -14.2);
  ctx.quadraticCurveTo(-1, -15.2, 0.5, -15.1);
  ctx.lineTo(-0.5, -6.8);
  ctx.lineTo(-4.6 - wide, -6.8);
  ctx.closePath();
  ctx.fill();
}

function head(ctx, skin, o) {
  ctx.lineWidth = 1.4;
  ctx.strokeStyle = o;
  ctx.fillStyle = skin;
  circle(ctx, 0, -20, 5.2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = o;
  circle(ctx, 1.5, -19.4, 0.7);
  ctx.fill();
  circle(ctx, 3.8, -19.4, 0.7);
  ctx.fill();
}

function levelStripes(ctx, level) {
  if (level <= 0) return;
  ctx.fillStyle = '#f2e6c9';
  ctx.strokeStyle = 'rgba(20,14,24,0.7)';
  ctx.lineWidth = 0.8;
  const w = 2.2;
  const gap = 1.2;
  const total = level * w + (level - 1) * gap;
  for (let i = 0; i < level; i++) {
    ctx.beginPath();
    ctx.rect(-total / 2 + i * (w + gap), 3.2, w, 2.4);
    ctx.fill();
    ctx.stroke();
  }
}

/** Flat, hard-edged muzzle flash (it is a light source, but stays crisp – no bloom). */
function muzzleFlash(ctx, x, y, size) {
  ctx.fillStyle = '#ffe9a8';
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const r = i % 2 ? size * 0.35 : size;
    ctx.lineTo(x + Math.cos(a) * r * (i % 4 === 0 ? 1.4 : 1), y + Math.sin(a) * r);
  }
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  circle(ctx, x, y, size * 0.3);
  ctx.fill();
}

// ---------------------------------------------------------------- CADET
// Young recruit: oversized helmet, olive fatigues, service rifle.
const CADET = { skin: '#e6b08a', helmet: '#5f6b3c', uniform: '#6f7c48', pants: '#525c36', boots: '#24221f', rifle: '#2c2a26', stock: '#6b4a2c', outline: '#1b1d14' };

function cadet(ctx, { frame = 0, facing = 1, level = 0 } = {}) {
  const C = CADET;
  const o = C.outline;
  shadow(ctx);
  ctx.save();
  ctx.scale(facing, 1);
  legs(ctx, C.pants, C.boots, o);
  if (frame === 1) {
    // shouldered and firing: rifle level, pointing forward
    torso(ctx, C.uniform, o);
    ctx.fillStyle = C.rifle;
    ctx.strokeStyle = o;
    ctx.lineWidth = 0.8;
    ctx.fillRect(-1, -14.2, 15, 2.2);
    ctx.fillStyle = C.stock;
    ctx.fillRect(-3, -14.4, 4, 2.8);
    limb(ctx, -4, -12.5, 3, -12.6, C.uniform, o, 2.4);
    limb(ctx, 4.6, -12.5, 8, -12.8, C.uniform, o, 2.4);
    muzzleFlash(ctx, 15.8, -13.1, 3);
  } else {
    torso(ctx, C.uniform, o);
    // rifle carried diagonally across the chest
    ctx.save();
    ctx.translate(0, -11);
    ctx.rotate(-0.75);
    ctx.fillStyle = C.rifle;
    ctx.fillRect(-7, -1, 15, 2);
    ctx.fillStyle = C.stock;
    ctx.fillRect(-8.5, -1.3, 4, 2.6);
    ctx.restore();
    limb(ctx, -4.8, -12.5, -2.5, -9, C.uniform, o, 2.4);
    limb(ctx, 4.8, -12.5, 3.6, -14.6, C.uniform, o, 2.4);
  }
  // belt
  ctx.fillStyle = '#3a3320';
  ctx.fillRect(-5.3, -7.6, 10.6, 1.4);
  head(ctx, C.skin, o);
  // helmet: wide dome with a rim, slightly too big
  ctx.fillStyle = C.helmet;
  ctx.strokeStyle = o;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.ellipse(0.4, -22.6, 6.6, 4.6, 0, Math.PI, 0);
  ctx.lineTo(7.2, -21.6);
  ctx.lineTo(-6.4, -21.6);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = shade(C.helmet, 0.2);
  ctx.beginPath();
  ctx.ellipse(-1.6, -24.6, 2.6, 1.4, -0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  levelStripes(ctx, level);
}

// ---------------------------------------------------------------- GUNNERMAN
// Broad-shouldered machine gunner: cap, ammo belt, belt-fed gun at the hip.
const GUN = { skin: '#c99a74', cap: '#3d4529', vest: '#4b5532', shirt: '#59643d', pants: '#3f4730', boots: '#1f1d1a', gun: '#2a2b2d', brass: '#c9a24a', outline: '#16180f' };

function gunnerman(ctx, { frame = 0, facing = 1, level = 0 } = {}) {
  const G = GUN;
  const o = G.outline;
  const kick = frame === 2 ? -1 : 0; // alternating recoil frames while firing
  shadow(ctx, 9);
  ctx.save();
  ctx.scale(facing, 1);
  ctx.translate(kick, 0);
  legs(ctx, G.pants, G.boots, o, 0.8);
  torso(ctx, G.vest, o, 1.6);
  // ammo belt across the chest
  ctx.strokeStyle = '#2b2416';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-6, -14.5);
  ctx.lineTo(5, -7);
  ctx.stroke();
  ctx.fillStyle = G.brass;
  for (let i = 0; i < 6; i++) ctx.fillRect(-5.5 + i * 1.9, -14 + i * 1.25, 1.1, 1.8);
  // the gun, held low at the hip
  ctx.fillStyle = G.gun;
  ctx.strokeStyle = o;
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.roundRect(-3, -10.8, 12, 4, 1);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#3c3e41';
  ctx.fillRect(9, -9.6, 7.5, 1.8); // barrel
  ctx.fillStyle = '#1a1b1d';
  for (let i = 0; i < 3; i++) ctx.fillRect(9.8 + i * 2.2, -9.9, 0.9, 2.4); // jacket holes
  ctx.fillStyle = '#4a3a26';
  ctx.fillRect(-5.5, -10.4, 3.5, 3.2); // stock
  ctx.fillStyle = G.brass;
  ctx.fillRect(1, -6.8, 3, 2.2); // feed box
  limb(ctx, -5, -12.8, -2.6, -8.6, G.shirt, o, 2.8);
  limb(ctx, 5.6, -12.8, 6.4, -9, G.shirt, o, 2.8);
  if (frame >= 1) muzzleFlash(ctx, 17.2, -8.7, frame === 1 ? 3.6 : 2.6);
  head(ctx, G.skin, o);
  // soft cap with a short brim, worn low
  ctx.fillStyle = G.cap;
  ctx.strokeStyle = o;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.ellipse(0, -23.2, 5.6, 3.4, 0, Math.PI, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillRect(1, -23.4, 6, 1.6);
  // headset strap
  ctx.strokeStyle = '#222';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(0, -20, 5.6, Math.PI * 1.05, Math.PI * 1.35);
  ctx.stroke();
  ctx.restore();
  levelStripes(ctx, level);
}

// ---------------------------------------------------------------- GRENADIER
// Khaki fatigues, heavy pack of grenades, stubby launcher on the shoulder.
const GREN = { skin: '#dcae86', hair: '#2f2418', uniform: '#8b7d55', pants: '#6c6142', boots: '#25221d', pack: '#55603a', tube: '#3b3f35', outline: '#1d1a12' };

function grenadier(ctx, { frame = 0, facing = 1, level = 0 } = {}) {
  const R = GREN;
  const o = R.outline;
  const recoil = frame === 1;
  shadow(ctx, 8.5);
  ctx.save();
  ctx.scale(facing, 1);
  if (recoil) ctx.translate(-1.5, 0.5);
  // backpack with grenades
  ctx.fillStyle = R.pack;
  ctx.strokeStyle = o;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.roundRect(-9.5, -16, 6, 10, 1.5);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#4f6b34';
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.ellipse(-6.5, -14 + i * 3, 1.6, 1.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  legs(ctx, R.pants, R.boots, o, 0.4);
  torso(ctx, R.uniform, o, 0.6);
  head(ctx, R.skin, o);
  // short hair + goggles pushed up
  ctx.fillStyle = R.hair;
  ctx.beginPath();
  ctx.ellipse(0, -23, 5.4, 3, 0, Math.PI, 0);
  ctx.fill();
  ctx.fillStyle = '#6f7a80';
  ctx.strokeStyle = o;
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.roundRect(-3.6, -24.4, 7.6, 2.4, 1);
  ctx.fill();
  ctx.stroke();
  // launcher: fat short tube with a drum, angled up over the shoulder
  ctx.save();
  ctx.translate(2, -14);
  ctx.rotate(recoil ? -0.75 : -0.5);
  ctx.fillStyle = R.tube;
  ctx.strokeStyle = o;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(-4, -2.4, 15, 4.8, 1.2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#2a2d26';
  circle(ctx, 0.5, 2.6, 2.6);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#15161a';
  ctx.fillRect(10.2, -1.7, 1.2, 3.4);
  if (recoil) {
    ctx.fillStyle = 'rgba(200,196,186,0.85)';
    circle(ctx, 14, 0, 2.8);
    ctx.fill();
    circle(ctx, 17, -1.2, 2);
    ctx.fill();
  }
  ctx.restore();
  limb(ctx, -4.8, -12.6, -1, -11.4, R.uniform, o, 2.4);
  limb(ctx, 5, -12.6, 4.6, -15.6, R.uniform, o, 2.4);
  ctx.restore();
  levelStripes(ctx, level);
}

// ---------------------------------------------------------------- TANK
// Top-down hull (pre-rendered) + turret (pre-rendered, rotated per frame).
const TANK = { hull: '#5d6a3b', hullDark: '#424b2a', track: '#2a2a28', turret: '#6b7944', outline: '#1a1d12' };

function tankHull(ctx) {
  const T = TANK;
  ctx.fillStyle = 'rgba(20,14,24,0.35)';
  ctx.beginPath();
  ctx.roundRect(-14, -9, 31, 22, 4);
  ctx.fill();
  // tracks
  ctx.fillStyle = T.track;
  ctx.strokeStyle = T.outline;
  ctx.lineWidth = 1.2;
  for (const y of [-12, 7]) {
    ctx.beginPath();
    ctx.roundRect(-16, y, 32, 6, 2.5);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = '#4a4a46';
    ctx.lineWidth = 0.8;
    for (let x = -14; x < 15; x += 3) {
      ctx.beginPath();
      ctx.moveTo(x, y + 0.8);
      ctx.lineTo(x, y + 5.2);
      ctx.stroke();
    }
    ctx.strokeStyle = T.outline;
    ctx.lineWidth = 1.2;
  }
  // hull
  ctx.fillStyle = T.hull;
  ctx.beginPath();
  ctx.moveTo(-14, -8);
  ctx.lineTo(12, -8);
  ctx.lineTo(16, -4);
  ctx.lineTo(16, 4);
  ctx.lineTo(12, 8);
  ctx.lineTo(-14, 8);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = shade(T.hull, 0.14);
  ctx.fillRect(-13, -7, 24, 4);
  ctx.fillStyle = T.hullDark;
  ctx.fillRect(-14, -3, 3, 6); // engine deck grille
  ctx.strokeStyle = 'rgba(20,20,10,0.6)';
  ctx.lineWidth = 0.6;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(-13.5, -2 + i * 2);
    ctx.lineTo(-11.5, -2 + i * 2);
    ctx.stroke();
  }
  // stencilled star on the deck
  ctx.fillStyle = 'rgba(232,224,196,0.75)';
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const r = i % 2 ? 1.2 : 2.8;
    ctx.lineTo(9 + Math.cos(a) * r, -5 + Math.sin(a) * r);
  }
  ctx.closePath();
  ctx.fill();
}

function tankTurret(ctx) {
  const T = TANK;
  ctx.fillStyle = 'rgba(20,14,24,0.3)';
  circle(ctx, 1.5, 2, 8);
  ctx.fill();
  // barrel (points along +x)
  ctx.fillStyle = '#3e4527';
  ctx.strokeStyle = T.outline;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(4, -1.5, 15, 3, 0.8);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#2c3120';
  ctx.fillRect(17, -2.1, 3, 4.2); // muzzle brake
  // turret body
  ctx.fillStyle = T.turret;
  ctx.beginPath();
  ctx.moveTo(-7, -6);
  ctx.lineTo(4, -6);
  ctx.lineTo(8, -2.5);
  ctx.lineTo(8, 2.5);
  ctx.lineTo(4, 6);
  ctx.lineTo(-7, 6);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = shade(T.turret, 0.16);
  ctx.fillRect(-6, -5, 9, 3);
  // commander hatch
  ctx.fillStyle = '#4c5730';
  circle(ctx, -2.5, 1.5, 2.6);
  ctx.fill();
  ctx.stroke();
}

function tank(ctx, { level = 0 } = {}) {
  // composite used for portraits and fallbacks
  ctx.save();
  ctx.translate(0, -10);
  ctx.scale(0.9, 0.9);
  tankHull(ctx);
  ctx.rotate(-0.35);
  tankTurret(ctx);
  ctx.restore();
  levelStripes(ctx, level);
}

const PAINTERS = { dude, cadet, gunnerman, grenadier, tank };


/** Bounds (in world px) of every unit sprite, relative to the feet. */
const BOX = { left: -21, right: 21, top: -32, bottom: 8 };

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

const partCache = new Map();
function partSprite(key, painter, half) {
  let s = partCache.get(key);
  if (s) return s;
  const c = makeCanvas(half * 2 * RES, half * 2 * RES);
  const ctx = c.getContext('2d');
  ctx.setTransform(RES, 0, 0, RES, half * RES, half * RES);
  painter(ctx);
  s = { img: c, half };
  partCache.set(key, s);
  return s;
}

/**
 * Per-unit animation personalities. Each picks a frame and offsets from the
 * unit's state (recoil 1→0 after a shot, time since last shot, facing).
 */
const ANIMS = {
  // Dude: underarm throw, lazy sway.
  dude(u, t) {
    const frame = u.recoil > 0.35 ? 1 : 0;
    return { frame, dy: frame ? 0 : Math.round(Math.sin(t * 2.2 + u.uid * 1.7) * 1.2) / 2 };
  },
  // Cadet: snaps to the shoulder for a split second; when idle, glances around.
  cadet(u, t) {
    if (u.recoil > 0.7) return { frame: 1, dx: -0.5 };
    const idle = t - (u.lastFire ?? -99) > 2.5;
    const glance = idle && Math.sin(t * 0.7 + u.uid * 2.3) > 0.82;
    return { frame: 0, flip: glance, dy: Math.round(Math.sin(t * 1.6 + u.uid) * 0.8) / 2 };
  },
  // Gunnerman: vibrates between two recoil frames while the gun runs.
  gunnerman(u, t) {
    const firing = t - (u.lastFire ?? -99) < 0.35;
    if (firing) return { frame: Math.floor(t * 30 + u.uid) % 2 ? 1 : 2, dx: Math.floor(t * 30) % 2 ? -0.5 : 0 };
    return { frame: 0, dy: Math.round(Math.sin(t * 1.2 + u.uid) * 1) / 2 };
  },
  // Grenadier: heavy kick-back on each lob, then settles; shifts weight when idle.
  grenadier(u, t) {
    if (u.recoil > 0.25) return { frame: 1, dx: -1.2 * u.recoil };
    return { frame: 0, dx: Math.sin(t * 0.9 + u.uid) > 0.95 ? 0.5 : 0 };
  },
};

/** Draws a deployed unit. Feet sit slightly below the tile centre. */
export function drawUnit(ctx, u, t) {
  if (u.def.art === 'tank') return drawTank(ctx, u, t);
  const anim = (ANIMS[u.def.art] ?? ANIMS.dude)(u, t);
  let facing = u.facing >= 0 ? 1 : -1;
  if (anim.flip) facing = -facing;
  const s = unitSprite(u.def.art, anim.frame, facing, u.level);
  ctx.drawImage(s.img, u.x + s.ox + (anim.dx ?? 0) * facing, u.y + 9 + s.oy + (anim.dy ?? 0), s.w, s.h);
}

/** Tank: hull, then a turret that tracks its target, with barrel recoil and engine idle. */
function drawTank(ctx, u, t) {
  const hull = partSprite('tank-hull', tankHull, 20);
  const turret = partSprite('tank-turret', tankTurret, 22);
  const idle = Math.sin(t * 38 + u.uid) * 0.3; // engine shimmy
  const x = u.x;
  const y = u.y + 1;
  ctx.drawImage(hull.img, x - hull.half, y - hull.half + idle, hull.half * 2, hull.half * 2);
  ctx.save();
  ctx.translate(x - 1, y - 1 + idle);
  ctx.rotate(u.angle);
  ctx.translate(-u.recoil * 3, 0);
  ctx.drawImage(turret.img, -turret.half, -turret.half, turret.half * 2, turret.half * 2);
  if (u.recoil > 0.8) muzzleFlash(ctx, 21, 0, 4);
  ctx.restore();
  if (u.level > 0) {
    ctx.save();
    ctx.translate(x, y + 6);
    levelStripes(ctx, u.level);
    ctx.restore();
  }
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
