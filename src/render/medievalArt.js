// Artwork for the Village Militia, Town Guard and Siege Workshop units, in the
// house style (top-left light, flat fills, one dark outline). People use the
// shared parametric figure from castArt.js; siege engines have their own painters.
//
// Melee personalities wind up (frame 1) just before the hit and follow through
// (frame 2) on it; ranged ones draw/aim, then release.

import { circle } from './canvas.js';
import { shade } from '../core/color.js';
import { registerPainter, shadow, levelStripes } from './unitArt.js';
import { figure, since, special, sway } from './castArt.js';

const VILLAGE = { outline: '#1d1610' };
const GUARD = { outline: '#14151a', top: '#2f4a7a', pants: '#3a3f48', boots: '#1d1b18' };

const PEOPLE = {
  // ---- Village Militia: homespun, browns and greens
  farmer: { ...VILLAGE, skin: '#e2b08a', top: '#c9b48a', vest: '#6b5a3a', pants: '#5a4a32', boots: '#3a2a1a', hat: { type: 'straw', color: '#e3c879', band: '#a0522d' }, weapon: 'pitchfork', extras: ['stubble-none', 'smile'] },
  spearman: { ...VILLAGE, skin: '#d9a47c', top: '#7a6a4a', vest: '#4f5a36', pants: '#4a3f33', boots: '#2a1d14', hat: { type: 'kettle', color: '#8d8a84' }, weapon: 'spear', extras: [] },
  slingman: { ...VILLAGE, skin: '#e6b48f', top: '#8a9a5a', pants: '#5a4a32', boots: '#3a2a1a', hat: { type: 'messy', color: '#a0642a' }, weapon: 'sling', extras: ['smile'] },
  militiaArcher: { ...VILLAGE, skin: '#e0ad86', top: '#4f6a3a', pants: '#4a3f33', boots: '#2a1d14', hat: { type: 'hood', color: '#3f5a2e' }, weapon: 'bow', bandolier: false, extras: ['squint'] },
  villageCaptain: { ...VILLAGE, skin: '#d4a07a', top: '#7a2a2a', vest: '#6b5a3a', pants: '#4a3f33', boots: '#2a1d14', hat: { type: 'kettle', color: '#9aa1aa' }, weapon: 'sword', shield: '#8a6a3a', shieldMark: '#e3c879', belt: '#3b2a1a', extras: ['beard'], hairColor: '#5a3a1a', wide: true },
  villageHero: { ...VILLAGE, skin: '#e8b892', top: '#2f6a4a', coat: { color: '#b7353a', long: true }, pants: '#3a3f2e', boots: '#2a1d14', hat: { type: 'messy', color: '#d9a14a' }, weapon: 'sword', blade: '#f2efe6', hilt: '#e8c255', shield: '#2f6a4a', shieldShape: 'heater', shieldMark: '#e8c255', belt: '#3b2a1a', extras: ['smile'] },
  // ---- Town Guard: blue tabards, steel
  guardRecruit: { ...GUARD, skin: '#e2b08a', vest: '#e6e1d6', hat: { type: 'kettle', color: '#9aa1aa' }, weapon: 'sword', shield: '#2f4a7a', extras: [] },
  crossbowman: { ...GUARD, skin: '#d9a47c', vest: '#e6e1d6', hat: { type: 'coif', color: '#8d939e' }, weapon: 'crossbow', extras: ['squint'] },
  guardSergeant: { ...GUARD, skin: '#c99a74', vest: '#c9a24a', hat: { type: 'plume', color: '#9aa1aa', plume: '#b7353a' }, weapon: 'dualswords', extras: ['mustache'], hairColor: '#3a2618' },
  halberdier: { ...GUARD, skin: '#e0ad86', vest: '#e6e1d6', hat: { type: 'kettle', color: '#8d939e' }, weapon: 'halberd', extras: [] },
  royalPatrol: { ...GUARD, skin: '#e6b48f', top: '#2a3f6a', coat: { color: '#1f2f52', long: true }, hat: { type: 'plume', color: '#c9a24a', plume: '#e6e1d6' }, weapon: 'bow', extras: ['squint'] },
  grandCaptain: { ...GUARD, skin: '#d9a47c', top: '#24386a', coat: { color: '#c9a24a' }, hat: { type: 'plume', color: '#c9a24a', plume: '#2f4a7a' }, weapon: 'sword', shield: '#2f4a7a', shieldShape: 'heater', shieldMark: '#e8c255', medals: 3, extras: ['beard'], hairColor: '#8a8070', wide: true },
  kingsChampion: { ...GUARD, skin: '#e0ad86', top: '#8d939e', vest: '#b7353a', pants: '#6b707a', boots: '#3a3d42', hat: { type: 'greathelm', color: '#b9bec6', plume: '#e8c255', crown: '#e8c255' }, weapon: 'greatsword', blade: '#f2efe6', hilt: '#e8c255', sash: '#e8c255', extras: [], wide: true },
  // ---- Siege Workshop: leather aprons, brass
  apprenticeEngineer: { outline: '#1a1612', skin: '#e6b48f', top: '#8a7a5a', vest: '#5a3f2a', pants: '#4a3f33', boots: '#2a1d14', hat: { type: 'goggles', hair: '#a0642a' }, weapon: 'crossbow', extras: ['smile'] },
  bombardier: { outline: '#1a1612', skin: '#d9a47c', top: '#5a5a62', vest: '#3a3530', pants: '#3a3833', boots: '#24211d', hat: { type: 'goggles', hair: '#2a2420' }, weapon: 'bomb', scarf: '#b7353a', extras: ['stubble-none', 'squint'] },
  siegeCommander: { outline: '#1a1612', skin: '#e0aa82', top: '#5a3f2a', coat: { color: '#3a3530', long: true }, hat: { type: 'plume', color: '#6b5a3a', plume: '#c9a24a' }, weapon: 'scroll', belt: '#3b2a1a', extras: ['mustache'], hairColor: '#7a6a5a' },
  masterEngineer: { outline: '#1a1612', skin: '#e8b892', top: '#e6e1d6', vest: '#6b4a2c', coat: { color: '#3a2f25', long: true }, hat: { type: 'goggles', hair: '#d9d6cc' }, weapon: 'wrench', belt: '#c9a24a', extras: ['beard', 'smile'], hairColor: '#d9d6cc' },
};

// ---------------------------------------------------------------- siege engines

function plank(ctx, x, y, w, h, c, o) {
  ctx.fillStyle = c;
  ctx.strokeStyle = o;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 0.8);
  ctx.fill();
  ctx.stroke();
}

function wheel(ctx, x, y, r, o) {
  ctx.fillStyle = '#5a3f2a';
  ctx.strokeStyle = o;
  ctx.lineWidth = 1;
  circle(ctx, x, y, r);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = '#3a2a1a';
  ctx.beginPath();
  ctx.moveTo(x - r, y);
  ctx.lineTo(x + r, y);
  ctx.moveTo(x, y - r);
  ctx.lineTo(x, y + r);
  ctx.stroke();
}

/** Ballista: a giant crossbow on a wheeled frame. Frame 1 drawn, 2 loosed. `s` scales (mini-ballista). */
function ballistaPainter(s = 1, brass = false) {
  return (ctx, { frame = 0, facing = 1, level = 0 } = {}) => {
    const o = '#1d1610';
    shadow(ctx, 12 * s);
    ctx.save();
    ctx.scale(facing * s, s);
    plank(ctx, -10, -7, 18, 4, '#7a5a3a', o);
    wheel(ctx, -7, -2, 3, o);
    wheel(ctx, 5, -2, 3, o);
    // stock
    ctx.save();
    ctx.translate(-1, -11);
    ctx.rotate(-0.12);
    plank(ctx, -9, -1.6, 20, 3.2, brass ? '#9a7a3a' : '#8a6a4a', o);
    // bow arms
    ctx.strokeStyle = '#3a2a1a';
    ctx.lineWidth = 1.8;
    const draw = frame === 1 ? -3 : frame === 2 ? 1 : 0;
    ctx.beginPath();
    ctx.moveTo(9, -8);
    ctx.quadraticCurveTo(12 + draw * 0.3, 0, 9, 8);
    ctx.stroke();
    ctx.strokeStyle = '#e6e1d6';
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    ctx.moveTo(9, -8);
    ctx.lineTo(4 + draw, 0);
    ctx.lineTo(9, 8);
    ctx.stroke();
    if (frame !== 2) {
      // loaded bolt
      ctx.fillStyle = '#4a4850';
      ctx.fillRect(4 + draw, -0.6, 12, 1.2);
      ctx.beginPath();
      ctx.moveTo(16 + draw, -1.6);
      ctx.lineTo(19 + draw, 0);
      ctx.lineTo(16 + draw, 1.6);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
    if (brass) {
      ctx.fillStyle = '#c9a24a';
      circle(ctx, -8, -12, 1.4);
      ctx.fill();
    }
    ctx.restore();
    if (s >= 1) levelStripes(ctx, level);
  };
}

/** Catapult: wheeled frame with a throwing arm. Frame 1 cocked back, 2 thrown. */
function catapult(ctx, { frame = 0, facing = 1, level = 0 } = {}) {
  const o = '#1d1610';
  shadow(ctx, 13);
  ctx.save();
  ctx.scale(facing, 1);
  plank(ctx, -12, -7, 22, 4, '#7a5a3a', o);
  wheel(ctx, -8, -2, 3.2, o);
  wheel(ctx, 6, -2, 3.2, o);
  plank(ctx, -2, -16, 3, 10, '#6b4a2c', o); // upright
  ctx.save();
  ctx.translate(0, -14);
  ctx.rotate(frame === 1 ? -0.9 : frame === 2 ? 0.9 : -0.2);
  plank(ctx, -14, -1.2, 18, 2.4, '#8a6a4a', o);
  if (frame !== 2) {
    ctx.fillStyle = '#5a3f2a';
    ctx.beginPath();
    ctx.ellipse(-13, -2, 3, 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#8d877c';
    circle(ctx, -13, -3.4, 2.4);
    ctx.fill();
  }
  ctx.restore();
  ctx.restore();
  levelStripes(ctx, level);
}

/** Trebuchet: tall A-frame, counterweight box and a long sling arm. */
function trebuchet(ctx, { frame = 0, facing = 1, level = 0 } = {}) {
  const o = '#1d1610';
  shadow(ctx, 16);
  ctx.save();
  ctx.scale(facing, 1);
  plank(ctx, -15, -5, 30, 4, '#6b4a2c', o);
  // A-frame
  ctx.strokeStyle = '#5a3f2a';
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(-9, -3);
  ctx.lineTo(0, -26);
  ctx.lineTo(9, -3);
  ctx.stroke();
  ctx.strokeStyle = o;
  ctx.lineWidth = 0.8;
  ctx.stroke();
  ctx.save();
  ctx.translate(0, -26);
  const ang = frame === 1 ? 0.7 : frame === 2 ? -1.1 : 0.35;
  ctx.rotate(ang);
  plank(ctx, -20, -1, 26, 2, '#8a6a4a', o); // long arm
  // counterweight box on the short end
  plank(ctx, 4, -1, 6, 8, '#4a4850', o);
  // sling at the long end
  ctx.strokeStyle = '#8a6a4a';
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  ctx.moveTo(-20, 0);
  ctx.lineTo(-22, frame === 2 ? -6 : 6);
  ctx.stroke();
  if (frame !== 2) {
    ctx.fillStyle = '#8d877c';
    circle(ctx, -22, 7, 2.4);
    ctx.fill();
  }
  ctx.restore();
  ctx.restore();
  levelStripes(ctx, level);
}

// ---------------------------------------------------------------- personalities

/** Melee: wind up as the next blow comes due (anticipation), strike, recover. */
const melee = (hold = 0.12) => (u, t) => {
  const s = since(u, t);
  if (s < hold) return { frame: 2, dx: 1 };
  if (u.hasTarget && u.cooldown < 0.22) return { frame: 1, dx: -0.5 };
  return { frame: 0, dy: sway(u, t) };
};
/** Ranged: draw/aim while a target is in range, release on the shot. */
const ranged = (release = 0.1) => (u, t) => {
  const s = since(u, t);
  if (s < release) return { frame: 2 };
  if (u.hasTarget) return { frame: 1 };
  return { frame: 0, dy: sway(u, t, 0.6) };
};
/** Engines: cocked while loaded and a target is in range, thrown on the shot. */
const engine = (u, t) => {
  const s = since(u, t);
  if (s < 0.35) return { frame: 2 };
  return { frame: u.hasTarget && u.cooldown < 1 ? 1 : 0 };
};

const ANIM = {
  farmer: melee(),
  spearman: melee(0.14),
  slingman: (u, t) => {
    const s = since(u, t);
    if (s < 0.12) return { frame: 2 };
    if (u.hasTarget) return { frame: 1, dy: Math.floor(t * 12) % 2 ? -0.5 : 0 }; // whirling
    return { frame: 0, dy: sway(u, t) };
  },
  militiaArcher: ranged(0.12),
  villageCaptain: melee(),
  villageHero: (u, t) => (special(u, t) < 0.2 || (u.shots ?? 0) % 10 === 0 && since(u, t) < 0.2 ? { frame: 2, dx: 1.5, dy: -1 } : melee()(u, t)),
  guardRecruit: melee(),
  crossbowman: ranged(0.15),
  guardSergeant: melee(0.08),
  halberdier: melee(0.16),
  royalPatrol: ranged(0.1),
  grandCaptain: melee(),
  kingsChampion: (u, t) => (special(u, t) < 0.3 ? { frame: 2, dx: 2, dy: -1 } : melee(0.16)(u, t)),
  apprenticeEngineer: ranged(0.12),
  ballista: engine,
  miniBallista: engine,
  catapult: engine,
  bombardier: (u, t) => {
    const s = since(u, t);
    if (s < 0.15) return { frame: 2 };
    if (u.hasTarget && u.cooldown < 0.4) return { frame: 1 };
    return { frame: 0, dy: sway(u, t) };
  },
  siegeCommander: (u, t) => ({ frame: since(u, t) < 0.4 ? 1 : 0, dy: sway(u, t, 0.5) }),
  trebuchet: engine,
  masterEngineer: (u, t) => (special(u, t) < 0.8 ? { frame: 1, dy: -0.5 } : ranged(0.15)(u, t)),
};

for (const [key, f] of Object.entries(PEOPLE)) registerPainter(key, figure(f), ANIM[key]);
registerPainter('ballista', ballistaPainter(1), ANIM.ballista);
registerPainter('miniBallista', ballistaPainter(0.72, true), ANIM.miniBallista);
registerPainter('catapult', catapult, ANIM.catapult);
registerPainter('trebuchet', trebuchet, ANIM.trebuchet);

void shade;
export const MEDIEVAL_ART_KEYS = [...Object.keys(PEOPLE), 'ballista', 'miniBallista', 'catapult', 'trebuchet'];
