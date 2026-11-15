// Artwork for THE GHOST circle: an original take on feudal Japanese samurai
// and Mongol-era invaders. House style: light from the top-left, flat fills,
// one hue-tinted outline; colour is used sparingly – lacquer red, indigo,
// undyed linen, dark steel – so the gold of rank and the white of the Ghost
// read at a glance.
//
// People use the shared figure (castArt.js) with new helmets, hats, weapons
// and back layers. The horsemen, the brute and all four chase units have
// their own painters with an extra frame 3: their special-ability pose.

import { circle } from './canvas.js';
import { registerPainter, shadow, levelStripes } from './unitArt.js';
import { figure, since, special, sway, EXTRA_HATS, EXTRA_PROPS, EXTRA_BEHIND } from './castArt.js';

const TAU = Math.PI * 2;
function blob(ctx, fill, o, w = 1) {
  ctx.fillStyle = fill;
  ctx.fill();
  if (o) {
    ctx.strokeStyle = o;
    ctx.lineWidth = w;
    ctx.stroke();
  }
}
function ell(ctx, x, y, rx, ry, rot = 0) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, rot, 0, TAU);
}
function poly(ctx, pts) {
  ctx.beginPath();
  ctx.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
  ctx.closePath();
}
function glow(ctx, x, y, r, rgb, a = 0.45) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, `rgba(${rgb},${a})`);
  g.addColorStop(1, `rgba(${rgb},0)`);
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
}
/** A katana blade from (0,0) along +x, slightly curved, with a guard. */
function katana(ctx, len = 13, blade = '#e6eaef', o = '#2a2e36') {
  ctx.fillStyle = blade;
  ctx.strokeStyle = o;
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  ctx.moveTo(1.6, -0.7);
  ctx.quadraticCurveTo(len * 0.6, -1.6, len, -1.4);
  ctx.lineTo(len - 1.4, 0.2);
  ctx.quadraticCurveTo(len * 0.6, -0.2, 1.6, 0.7);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#c9a24a';
  ell(ctx, 1.4, 0, 0.8, 1.9);
  ctx.fill();
  ctx.fillStyle = '#1d1a1a';
  ctx.fillRect(-2.6, -0.6, 3.4, 1.2);
}

// ---------------------------------------------------------------- hats and helmets

Object.assign(EXTRA_HATS, {
  /** A tied topknot over a shaved crown (Starving Samurai). */
  topknot(ctx, h, o) {
    ctx.fillStyle = h.hair ?? '#1d1714';
    ctx.strokeStyle = o;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(0.3, -21, 5.6, Math.PI * 1.05, -0.05);
    ctx.quadraticCurveTo(3, -22.5, 0, -22.8);
    ctx.quadraticCurveTo(-4, -22.6, -5.4, -18.6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ell(ctx, -0.6, -27.4, 1.6, 2.6, -0.3);
    blob(ctx, h.hair ?? '#1d1714', o, 0.8);
    ctx.fillStyle = h.tie ?? '#e6dcc0';
    ctx.fillRect(-1.8, -25.6, 2.6, 0.9);
  },
  /** A wide conical straw hat (ronin, the Defected Lord). */
  jingasa(ctx, h, o) {
    ctx.beginPath();
    ctx.moveTo(-10.4, -20.6);
    ctx.quadraticCurveTo(0.4, -31.5, 11.2, -20.6);
    ctx.quadraticCurveTo(0.4, -18.4, -10.4, -20.6);
    blob(ctx, h.color ?? '#c9a96a', o, 1);
    ctx.strokeStyle = 'rgba(80,60,30,0.45)';
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    for (let i = -3; i <= 3; i++) {
      ctx.moveTo(0.4, -28);
      ctx.lineTo(0.4 + i * 3.1, -20.4);
    }
    ctx.stroke();
    if (h.cord) {
      ctx.strokeStyle = h.cord;
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.moveTo(-4, -20.6);
      ctx.quadraticCurveTo(0.4, -15, 5, -20.6);
      ctx.stroke();
    }
  },
  /** A samurai kabuto: bowl, flared neck guard, and a crest (maedate). */
  kabuto(ctx, h, o) {
    const c = h.color ?? '#2a2a30';
    ctx.beginPath();
    ctx.moveTo(-7.4, -18.2);
    ctx.quadraticCurveTo(-8.6, -20.4, -6, -21.4);
    ctx.lineTo(6.6, -21.4);
    ctx.quadraticCurveTo(9.2, -20.4, 8, -18.2);
    ctx.closePath();
    blob(ctx, h.lacquer ?? '#7a1f1f', o, 1);
    ctx.beginPath();
    ctx.arc(0.3, -21.4, 5.8, Math.PI, 0);
    ctx.closePath();
    blob(ctx, c, o, 1.1);
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    for (let i = 0; i < 4; i++) ctx.fillRect(-4 + i * 2.2, -26, 0.6, 4.4);
    // the crest: crescent or flame, gold
    ctx.fillStyle = h.crest ?? '#e0b84a';
    ctx.strokeStyle = '#6a4a1a';
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    if (h.crestShape === 'horns') {
      ctx.moveTo(-1, -26.4);
      ctx.quadraticCurveTo(-5.4, -28.4, -7.6, -31.4);
      ctx.quadraticCurveTo(-4, -29.4, 0.4, -27.6);
      ctx.quadraticCurveTo(5, -29.4, 8.4, -31.4);
      ctx.quadraticCurveTo(6.6, -28.4, 1.8, -26.4);
    } else {
      ctx.moveTo(-5, -30.4);
      ctx.quadraticCurveTo(0.4, -24.6, 5.8, -30.4);
      ctx.quadraticCurveTo(0.4, -26.8, -5, -30.4);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    if (h.mask) {
      // menpo: a lacquered half-mask
      ctx.fillStyle = h.mask;
      ctx.beginPath();
      ctx.moveTo(-1, -18.8);
      ctx.lineTo(5.6, -18.8);
      ctx.lineTo(5, -15.6);
      ctx.lineTo(0.4, -15);
      ctx.closePath();
      ctx.fill();
    }
  },
  /** A Mongol helmet: pointed steel bowl, fur rim, leather neck flaps, optional plume. */
  mongolhelm(ctx, h, o) {
    ctx.beginPath();
    ctx.moveTo(-5.4, -21);
    ctx.quadraticCurveTo(-4.6, -27.4, 0.4, -30.4);
    ctx.quadraticCurveTo(5.4, -27.4, 6.2, -21);
    ctx.closePath();
    blob(ctx, h.color ?? '#8d939e', o, 1.1);
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.fillRect(-2.6, -27, 1, 5.4);
    ell(ctx, 0.4, -21, 6.6, 1.8);
    blob(ctx, h.fur ?? '#6b4a2c', o, 0.9);
    ctx.fillStyle = h.flap ?? '#5a3a24';
    ctx.fillRect(-6, -21, 2.6, 5.4);
    if (h.plume) {
      ctx.strokeStyle = h.plume;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(0.4, -30.4);
      ctx.quadraticCurveTo(-3, -36, -6.4, -34.6);
      ctx.stroke();
    }
  },
  /** A fur-trimmed felt cap (Mongol Archer). */
  mongolcap(ctx, h, o) {
    ctx.beginPath();
    ctx.arc(0.4, -22, 5.6, Math.PI, 0);
    ctx.lineTo(4.4, -27.6);
    ctx.lineTo(-1, -28.4);
    ctx.closePath();
    blob(ctx, h.color ?? '#3f6a6a', o, 1);
    ell(ctx, 0.4, -21.4, 6.6, 1.9);
    blob(ctx, h.fur ?? '#8a6a44', o, 0.9);
  },
  /** A thief's headband and a scarf over the mouth (Desperate Thief). */
  thiefwrap(ctx, h, o) {
    ctx.fillStyle = h.hair ?? '#1d1714';
    ctx.strokeStyle = o;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(0.3, -21, 5.6, Math.PI * 1.05, -0.05);
    ctx.lineTo(4.4, -23);
    ctx.lineTo(-3, -22.4);
    ctx.lineTo(-5.6, -17);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = h.band ?? '#b7353a';
    ctx.fillRect(-5.4, -23.4, 11, 1.4);
    ctx.beginPath();
    ctx.moveTo(-5.4, -22.8);
    ctx.lineTo(-9.6, -20.6 + Math.sin(h.t ?? 0) * 0.6);
    ctx.lineTo(-9, -19.6);
    ctx.lineTo(-5.2, -21.6);
    ctx.fill();
    ctx.fillStyle = h.scarf ?? '#2a3550';
    ctx.beginPath();
    ctx.moveTo(-4.4, -18.6);
    ctx.lineTo(5.6, -18.8);
    ctx.lineTo(4.6, -15.2);
    ctx.lineTo(-4, -15.6);
    ctx.closePath();
    ctx.fill();
  },
});

// ---------------------------------------------------------------- weapons

Object.assign(EXTRA_PROPS, {
  /** A katana: raised high on the wind-up, a level cut on the release. */
  katana(ctx, f, frame, o, hx, hy) {
    const ang = frame === 1 ? -2.3 : frame === 2 ? 0.25 : -0.9;
    ctx.save();
    ctx.translate(hx, hy);
    ctx.rotate(ang);
    katana(ctx, f.bladeLen ?? 13, f.blade ?? '#e6eaef');
    ctx.restore();
    if (frame === 2) {
      ctx.strokeStyle = 'rgba(245,248,255,0.8)';
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.arc(hx - 2, hy - 2, 12, -1.3, 0.55);
      ctx.stroke();
    }
  },
  /** A curved Mongol sabre, swung in a wide arc. */
  mongolsaber(ctx, f, frame, o, hx, hy) {
    const ang = frame === 1 ? -2 : frame === 2 ? 0.4 : -0.5;
    ctx.save();
    ctx.translate(hx, hy);
    ctx.rotate(ang);
    ctx.fillStyle = '#d9d6cc';
    ctx.strokeStyle = '#3a3a40';
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    ctx.moveTo(1.6, -0.6);
    ctx.quadraticCurveTo(7, -2.6, 12, -3.6);
    ctx.quadraticCurveTo(8, -0.6, 1.6, 1);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#8a5a2a';
    ctx.fillRect(-1.8, -0.8, 3.2, 1.6);
    ctx.restore();
  },
  /** A short recurved horse bow (Mongol Archer, Commander). */
  horsebow(ctx, f, frame, o, hx, hy) {
    const draw = frame === 1 ? 2.4 : 0;
    ctx.strokeStyle = '#5a3a1a';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(hx + 1, hy - 7);
    ctx.quadraticCurveTo(hx + 4.6, hy - 5, hx + 3, hy);
    ctx.quadraticCurveTo(hx + 4.6, hy + 5, hx + 1, hy + 7);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(240,236,220,0.9)';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(hx + 1, hy - 7);
    ctx.lineTo(hx + 1 - draw, hy);
    ctx.lineTo(hx + 1, hy + 7);
    ctx.stroke();
    if (frame === 1) {
      ctx.strokeStyle = f.arrowTip ?? '#d9d6cc';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(hx + 1 - draw, hy);
      ctx.lineTo(hx + 9, hy);
      ctx.stroke();
      if (f.fireArrow) glow(ctx, hx + 9, hy, 4, '255,160,60', 0.7);
    }
  },
  /** Throwing knives, fanned in the hand (Desperate Thief). */
  kunai(ctx, f, frame, o, hx, hy) {
    ctx.save();
    ctx.translate(hx, hy);
    ctx.rotate(frame === 1 ? -1.6 : frame === 2 ? 0.2 : -0.6);
    for (let i = -1; i <= 1; i++) {
      ctx.save();
      ctx.rotate(i * 0.25);
      ctx.fillStyle = '#c9cfd8';
      poly(ctx, [1, -0.6, 7, 0, 1, 0.6]);
      ctx.fill();
      ctx.fillStyle = '#2a2420';
      ctx.fillRect(-1.4, -0.4, 2.4, 0.8);
      ctx.restore();
      if (frame === 2) break;
    }
    ctx.restore();
  },
  /** A club made from a temple door beam. */
  club(ctx, f, frame, o, hx, hy) {
    const ang = frame === 1 ? -2.4 : frame === 2 ? 0.5 : -0.4;
    ctx.save();
    ctx.translate(hx, hy);
    ctx.rotate(ang);
    ctx.fillStyle = '#6b4a2c';
    ctx.strokeStyle = o;
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(0, -1.2);
    ctx.lineTo(13, -3);
    ctx.lineTo(13, 3);
    ctx.lineTo(0, 1.2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#8d939e';
    for (const x of [6, 9.5, 12]) ctx.fillRect(x, -2.2, 0.9, 4.4);
    ctx.restore();
  },
});

// ---------------------------------------------------------------- back layers

Object.assign(EXTRA_BEHIND, {
  /** A sashimono: a tall back banner bearing a clan crest. */
  sashimono(ctx, f, o, frame) {
    const wave = frame >= 1 ? 1 : 0;
    ctx.strokeStyle = '#3a2a1a';
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.moveTo(-3, -13);
    ctx.lineTo(-3, -38);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-3, -37.4);
    ctx.lineTo(4.6 + wave, -37.6);
    ctx.lineTo(4.2, -26.4 - wave);
    ctx.lineTo(-3, -26.4);
    ctx.closePath();
    blob(ctx, f.banner ?? '#e6dcc0', o, 0.8);
    ctx.fillStyle = f.mon ?? '#7a1f1f';
    circle(ctx, 0.8, -32, 2.2);
    ctx.fill();
    ctx.fillStyle = f.banner ?? '#e6dcc0';
    circle(ctx, 0.8, -32, 1.1);
    ctx.fill();
  },
  /** A horse-tail war standard (tug), carried by Mongol officers. */
  tug(ctx, f, o) {
    ctx.strokeStyle = '#3a2a1a';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-6.5, 0);
    ctx.lineTo(-6.5, -38);
    ctx.stroke();
    ctx.fillStyle = '#c9a24a';
    poly(ctx, [-8, -38, -6.5, -42, -5, -38]);
    ctx.fill();
    ctx.strokeStyle = f.tail ?? '#2a2420';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      ctx.moveTo(-6.5, -37);
      ctx.quadraticCurveTo(-8 - i * 0.6, -33, -9 - i * 0.4, -28 + (i % 2));
    }
    ctx.stroke();
  },
});

// ---------------------------------------------------------------- people

const JP = { outline: '#1a1414' };
const MG = { outline: '#1a1410' };
const PEOPLE = {
  starvingSamurai: { ...JP, skin: '#d9a47c', top: '#7a6a52', pants: '#3a3830', boots: '#2a2420', hat: { type: 'topknot', hair: '#1d1714', tie: '#c9b48a' }, weapon: 'katana', belt: '#3b2a1a', extras: ['stubble-none'] },
  mongolWarrior: { ...MG, skin: '#c48f69', top: '#8a3a2a', coat: { color: '#6b2f22', long: true }, pants: '#4a3a2a', boots: '#2a1d14', hat: { type: 'mongolhelm', color: '#8d939e', fur: '#6b4a2c' }, weapon: 'mongolsaber', shield: '#8a6a3a', shieldMark: '#c9a24a', belt: '#c9a24a', extras: ['mustache'], hairColor: '#1d1714' },
  mongolArcher: { ...MG, skin: '#c99a74', top: '#3f6a6a', coat: { color: '#2f5050', long: true }, pants: '#4a3a2a', boots: '#2a1d14', hat: { type: 'mongolcap', color: '#2f5050', fur: '#8a6a44' }, weapon: 'horsebow', behind: 'quiver', belt: '#c9a24a', extras: ['squint'] },
  ronin: { ...JP, skin: '#d4a07a', top: '#4a4a52', coat: { color: '#3a3a42', long: true }, pants: '#2a2a30', boots: '#1d1a1a', hat: { type: 'jingasa', color: '#b89a5a' }, weapon: 'katana', blade: '#f2f4f8', scarf: '#6b2a2a', extras: ['stubble-none'] },
  mongolCommander: { ...MG, skin: '#c48f69', top: '#a83a24', coat: { color: '#7a2a1a', long: true }, pants: '#3a2a1a', boots: '#24190f', hat: { type: 'mongolhelm', color: '#c9a24a', fur: '#3a2a1a', plume: '#b7353a' }, weapon: 'horsebow', fireArrow: true, arrowTip: '#ffb04a', behind: 'tug', medals: 2, sash: '#c9a24a', extras: ['beard'], hairColor: '#1d1714', wide: true },
  decoratedSamurai: { ...JP, skin: '#e0ad86', top: '#9a2a24', vest: '#2a2a30', pants: '#2a2430', boots: '#1d1a1a', hat: { type: 'kabuto', color: '#2a2a30', lacquer: '#9a2a24', crest: '#e0b84a' }, weapon: 'katana', behind: 'sashimono', banner: '#e6dcc0', mon: '#9a2a24', extras: [] },
  samuraiLord: { ...JP, skin: '#d9a47c', top: '#2a3a5a', coat: { color: '#1f2a44', long: true }, pants: '#1f2430', boots: '#16181f', hat: { type: 'kabuto', color: '#1d1d24', lacquer: '#2a3a5a', crest: '#e8c255', crestShape: 'horns' }, weapon: 'katana', bladeLen: 15, behind: 'sashimono', banner: '#1f2a44', mon: '#e8c255', sash: '#e8c255', medals: 2, extras: ['beard'], hairColor: '#3a2a20', wide: true },
  desperateThief: { ...JP, skin: '#e2b08a', top: '#2a3550', vest: '#4a3a2a', pants: '#2a2a30', boots: '#1d1a1a', hat: { type: 'thiefwrap', hair: '#1d1714', band: '#b7353a', scarf: '#2a3550' }, weapon: 'kunai', belt: '#6b4a2c', bandolier: true, extras: ['squint'] },
};

// ---------------------------------------------------------------- shared parts for the custom painters

/** A horse in profile (facing +x): body, neck, head, legs mid-stride. */
function horse(ctx, { coat = '#6b4a2c', mane = '#2a1d14', o = '#1a1410', gallop = 0, armour = null, scale = 1 } = {}) {
  ctx.save();
  ctx.scale(scale, scale);
  // legs (two pairs, opposing phase)
  ctx.strokeStyle = coat;
  ctx.lineWidth = 2.4;
  ctx.lineCap = 'round';
  const legs = [[-8, gallop], [-5, -gallop], [6, -gallop], [9, gallop]];
  for (const [x, ph] of legs) {
    ctx.beginPath();
    ctx.moveTo(x, -9);
    ctx.lineTo(x + ph * 2.4, -4);
    ctx.lineTo(x + ph * 1.2, -0.4);
    ctx.stroke();
  }
  ctx.strokeStyle = o;
  ctx.lineWidth = 0.6;
  // body
  ell(ctx, 0, -11.4, 12, 5.4);
  blob(ctx, coat, o, 1.1);
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  ell(ctx, -2, -13.6, 7, 1.8);
  ctx.fill();
  if (armour) {
    ctx.beginPath();
    ctx.moveTo(-10, -14);
    ctx.quadraticCurveTo(0, -18, 10, -14);
    ctx.lineTo(9, -7.6);
    ctx.quadraticCurveTo(0, -5.6, -9, -7.6);
    ctx.closePath();
    blob(ctx, armour, o, 0.9);
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    for (let i = 0; i < 6; i++) ctx.fillRect(-8 + i * 3, -14, 0.8, 5.6);
  }
  // neck and head
  poly(ctx, [8, -14, 13, -22, 17, -21, 14, -11]);
  blob(ctx, coat, o, 1);
  ell(ctx, 17.4, -21.4, 4.4, 2.4, 0.5);
  blob(ctx, coat, o, 1);
  ctx.fillStyle = '#16120e';
  circle(ctx, 17, -22.4, 0.6);
  ctx.fill();
  // mane and tail
  ctx.strokeStyle = mane;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(9, -15);
  ctx.quadraticCurveTo(11, -21, 14.6, -23.4);
  ctx.moveTo(-11.6, -12);
  ctx.quadraticCurveTo(-16, -10 + gallop * 2, -15.6, -4);
  ctx.stroke();
  ctx.restore();
}

/** A rider's upper body (sitting), facing +x. Returns the hand position. */
function rider(ctx, { x = 0, y = -16, skin = '#c48f69', coat = '#8a3a2a', o = '#1a1410', scale = 1 } = {}) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  poly(ctx, [-4, 0, -4.6, -9, 4.4, -9, 4, 0]);
  blob(ctx, coat, o, 1);
  circle(ctx, 0.4, -12.6, 4);
  blob(ctx, skin, o, 1);
  ctx.restore();
}

// ---------------------------------------------------------------- custom painters

/** Mongol Horsemen: two riders on steppe horses, one drawing a bow at the gallop. */
function mongolHorsemen(ctx, { frame = 0, facing = 1, level = 0 } = {}) {
  const o = '#1a1410';
  shadow(ctx, 13);
  ctx.save();
  ctx.scale(facing, 1);
  const g = frame === 2 ? 1 : frame === 1 ? -0.6 : 0.4;
  // the second rider, behind and smaller
  ctx.save();
  ctx.translate(-7, -3);
  ctx.globalAlpha = 0.92;
  horse(ctx, { coat: '#4a3a2a', gallop: -g, scale: 0.72 });
  rider(ctx, { x: -1, y: -12, coat: '#3f6a6a', scale: 0.72 });
  ctx.restore();
  horse(ctx, { coat: '#8a5a32', gallop: g });
  rider(ctx, {});
  // helmet
  ctx.beginPath();
  ctx.moveTo(-3.6, -28.6);
  ctx.quadraticCurveTo(0.4, -35.6, 4.4, -28.6);
  ctx.closePath();
  blob(ctx, '#8d939e', o, 0.9);
  ell(ctx, 0.4, -28.6, 4.8, 1.4);
  blob(ctx, '#6b4a2c', o, 0.7);
  // the bow, drawn forward
  const draw = frame === 1 ? 3 : 0;
  ctx.strokeStyle = '#5a3a1a';
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.moveTo(8, -30);
  ctx.quadraticCurveTo(11.4, -25, 8, -18);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(240,236,220,0.9)';
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.moveTo(8, -30);
  ctx.lineTo(8 - draw, -24);
  ctx.lineTo(8, -18);
  ctx.stroke();
  if (frame === 3) {
    // the charge: dust and a lowered lance-line of riders
    ctx.fillStyle = 'rgba(200,180,140,0.55)';
    for (let i = 0; i < 5; i++) {
      ell(ctx, -16 - i * 4, -1 - (i % 2), 3 + i, 1.6 + i * 0.3);
      ctx.fill();
    }
  }
  ctx.restore();
  levelStripes(ctx, level);
}

/** Mongol Brute: a massive warrior in lamellar and furs, with the temple-door club. */
function mongolBrute(ctx, { frame = 0, facing = 1, level = 0 } = {}) {
  const o = '#1a1410';
  shadow(ctx, 11);
  ctx.save();
  ctx.scale(facing, 1);
  ctx.fillStyle = '#3a2a1a';
  ctx.fillRect(-6, -7, 4.6, 7);
  ctx.fillRect(1.6, -7, 4.6, 7);
  // torso: lamellar over a fur mantle
  ell(ctx, 0, -16, 10, 9.4);
  blob(ctx, '#5a4a3a', o, 1.2);
  ctx.fillStyle = '#7a6a54';
  for (let r = 0; r < 3; r++) for (let c = -3; c <= 3; c++) ctx.fillRect(c * 2.4 - 0.9, -21 + r * 3, 1.8, 2.4);
  ell(ctx, 0, -24, 11, 4);
  blob(ctx, '#8a6a44', o, 1);
  // head and helmet
  circle(ctx, 1, -29, 4.6);
  blob(ctx, '#b88a64', o, 1);
  ctx.beginPath();
  ctx.arc(1, -30, 5, Math.PI, 0);
  ctx.closePath();
  blob(ctx, '#6b6f78', o, 1);
  ctx.fillStyle = '#1d1714';
  ctx.beginPath();
  ctx.moveTo(-1, -27);
  ctx.quadraticCurveTo(2, -22, 5.4, -27);
  ctx.fill();
  // the club
  const ang = frame === 1 || frame === 3 ? -2.5 : frame === 2 ? 0.55 : -0.5;
  ctx.save();
  ctx.translate(8, -18);
  ctx.rotate(ang);
  ctx.fillStyle = '#6b4a2c';
  ctx.strokeStyle = o;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, -1.6);
  ctx.lineTo(17, -4.4);
  ctx.lineTo(17, 4.4);
  ctx.lineTo(0, 1.6);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#8d939e';
  for (const x of [8, 12.5, 16]) ctx.fillRect(x, -3.4, 1.1, 6.8);
  ctx.restore();
  if (frame === 2) {
    ctx.fillStyle = 'rgba(200,180,140,0.6)';
    for (let i = 0; i < 4; i++) {
      ell(ctx, 18 + i * 3, -1 - i, 2.4, 1.4);
      ctx.fill();
    }
  }
  ctx.restore();
  levelStripes(ctx, level);
}

/**
 * The Defected Lord: a samurai in dark lacquer under a Mongol fur mantle and a
 * red-corded straw hat – both worlds on one man. Fights with a long blade held
 * low and reversed; frame 3 is his flurry: the blade a blur of five arcs.
 */
function defectedLord(ctx, { frame = 0, facing = 1, level = 0 } = {}) {
  const o = '#151214';
  shadow(ctx, 9);
  ctx.save();
  ctx.scale(facing, 1);
  // legs: wide, low stance
  ctx.fillStyle = '#2a2430';
  poly(ctx, [-6, 0, -4.6, -9, -1, -9, -2.4, 0]);
  ctx.fill();
  poly(ctx, [2.4, 0, 1.2, -9, 4.8, -9, 6.6, 0]);
  ctx.fill();
  // lacquered body
  poly(ctx, [-5.6, -9, -6, -19, 5.8, -19, 5.4, -9]);
  blob(ctx, '#2a2a34', o, 1.1);
  ctx.fillStyle = '#8a2424';
  for (let r = 0; r < 3; r++) ctx.fillRect(-5, -17.6 + r * 3, 10, 0.9);
  // the fur mantle of the other side, over one shoulder
  ctx.beginPath();
  ctx.moveTo(-7.4, -20);
  ctx.quadraticCurveTo(-10, -13, -8.6, -6);
  ctx.lineTo(-4, -8);
  ctx.lineTo(-2, -20.6);
  ctx.closePath();
  blob(ctx, '#7a5a3a', o, 1);
  ctx.fillStyle = '#a8865a';
  for (let i = 0; i < 4; i++) ctx.fillRect(-8.6 + i * 1.6, -20.4, 1.1, 2);
  // head and hat
  circle(ctx, 0.4, -22.4, 4.4);
  blob(ctx, '#d4a07a', o, 1);
  ctx.fillStyle = '#1d1714';
  ctx.fillRect(1.2, -22.8, 1.4, 0.7);
  ctx.fillRect(3.2, -22.8, 1.4, 0.7);
  ctx.beginPath();
  ctx.moveTo(-10.4, -24.6);
  ctx.quadraticCurveTo(0.4, -35, 11.2, -24.6);
  ctx.quadraticCurveTo(0.4, -22.4, -10.4, -24.6);
  blob(ctx, '#6b5a3a', o, 1);
  ctx.strokeStyle = '#b7353a';
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.moveTo(-4, -24.6);
  ctx.quadraticCurveTo(0.4, -18.6, 5, -24.6);
  ctx.stroke();
  // the reversed long blade
  const hx = 5.4;
  const hy = -14;
  ctx.save();
  ctx.translate(hx, hy);
  const ang = frame === 1 ? 2.6 : frame === 2 ? -0.35 : 2.2;
  ctx.rotate(ang);
  katana(ctx, 15, '#dfe4ea');
  ctx.restore();
  if (frame === 2 || frame === 3) {
    ctx.strokeStyle = 'rgba(255,236,236,0.8)';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.arc(hx, hy, 13, 0.4, 1.9);
    ctx.stroke();
  }
  if (frame === 3) {
    // the flurry: five crossing arcs in his colours
    for (let i = 0; i < 5; i++) {
      ctx.strokeStyle = i % 2 ? 'rgba(183,53,58,0.75)' : 'rgba(240,240,250,0.85)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(hx + 3, hy - 2, 9 + i * 1.6, -1.6 + i * 0.5, -0.2 + i * 0.5);
      ctx.stroke();
    }
  }
  ctx.restore();
  levelStripes(ctx, level);
}

/**
 * The Honourable Lord: an elder commander in full o-yoroi with a golden
 * crescent crest and a white jinbaori. Stands squarely, blade held upright
 * before him; strikes in one long, measured cut. Frame 3 is his technique:
 * the blade raised to the sky, his banners lit.
 */
function honourableLord(ctx, { frame = 0, facing = 1, level = 0 } = {}) {
  const o = '#151418';
  shadow(ctx, 10);
  ctx.save();
  ctx.scale(facing, 1);
  // twin sashimono banners
  for (const [x, c] of [[-6, '#f2efe6'], [-3.4, '#1f2a44']]) {
    ctx.strokeStyle = '#3a2a1a';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, -14);
    ctx.lineTo(x, -42);
    ctx.stroke();
    poly(ctx, [x, -41.6, x - 6, -41.6, x - 6, -30, x, -30]);
    blob(ctx, c, o, 0.8);
    ctx.fillStyle = '#e8c255';
    circle(ctx, x - 3, -36, 1.5);
    ctx.fill();
  }
  if (frame === 3) glow(ctx, -6, -36, 12, '255,236,170', 0.5);
  // hakama
  poly(ctx, [-7, 0, -5.6, -10, 6, -10, 7.6, 0]);
  blob(ctx, '#2a2a34', o, 1);
  // lacquered o-yoroi with gold lacing
  poly(ctx, [-6.6, -10, -7.2, -21, 7, -21, 6.4, -10]);
  blob(ctx, '#3a3a46', o, 1.2);
  ctx.fillStyle = '#e8c255';
  for (let r = 0; r < 4; r++) ctx.fillRect(-6.2, -19.6 + r * 2.6, 12.4, 0.7);
  // white jinbaori (surcoat) over the shoulders
  ctx.beginPath();
  ctx.moveTo(-8.4, -21.4);
  ctx.lineTo(-9, -8);
  ctx.lineTo(-6, -8);
  ctx.lineTo(-5.6, -20);
  ctx.closePath();
  blob(ctx, '#f2efe6', o, 0.9);
  // sode (shoulder plates)
  for (const sx of [-1, 1]) {
    poly(ctx, [sx * 5, -21.4, sx * 9.4, -20.4, sx * 9, -15, sx * 5.4, -16]);
    blob(ctx, '#2a2a34', o, 0.9);
  }
  // head: grey beard, kabuto with crescent
  circle(ctx, 0.4, -24.6, 4.4);
  blob(ctx, '#d9a47c', o, 1);
  ctx.fillStyle = '#d9d6cc';
  ctx.beginPath();
  ctx.moveTo(-2.6, -22.6);
  ctx.quadraticCurveTo(1.4, -17.4, 4.6, -22.6);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(0.4, -26, 5.6, Math.PI, 0);
  ctx.closePath();
  blob(ctx, '#1d1d24', o, 1.1);
  ctx.beginPath();
  ctx.moveTo(-6.6, -24.4);
  ctx.quadraticCurveTo(0.4, -22.4, 7.4, -24.4);
  ctx.lineTo(8.4, -22);
  ctx.lineTo(-7.6, -22);
  ctx.closePath();
  blob(ctx, '#3a3a46', o, 0.9);
  ctx.fillStyle = '#e8c255';
  ctx.strokeStyle = '#6a4a1a';
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  ctx.moveTo(-6, -36);
  ctx.quadraticCurveTo(0.4, -27, 6.8, -36);
  ctx.quadraticCurveTo(0.4, -31, -6, -36);
  ctx.fill();
  ctx.stroke();
  // the blade: upright at rest, overhead on the wind-up, a level cut, raised to the sky (3)
  const ang = frame === 1 ? -2.5 : frame === 2 ? 0.1 : frame === 3 ? -1.57 : -1.3;
  ctx.save();
  ctx.translate(6, -15);
  ctx.rotate(ang);
  katana(ctx, 16, '#f4f6fa');
  ctx.restore();
  if (frame === 2) {
    ctx.strokeStyle = 'rgba(250,246,230,0.85)';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(6, -24);
    ctx.lineTo(24, -14);
    ctx.stroke();
  }
  if (frame === 3) glow(ctx, 6, -31, 10, '255,246,210', 0.6);
  ctx.restore();
  levelStripes(ctx, level);
}

/**
 * The Great Khan: the largest rider in the game – an armoured warhorse in
 * lamellar barding, the Khan in gold-scaled armour and a fur-trimmed crown
 * helm, a great bow in one hand. Frame 3: he stands in the stirrups and
 * raises the bow to call the sky of arrows.
 */
function greatKhan(ctx, { frame = 0, facing = 1, level = 0 } = {}) {
  const o = '#120e0c';
  shadow(ctx, 18);
  ctx.save();
  ctx.scale(facing, 1);
  // a standard-bearer's tug behind him
  ctx.strokeStyle = '#3a2a1a';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(-10, -18);
  ctx.lineTo(-10, -60);
  ctx.stroke();
  ctx.strokeStyle = '#f2efe6';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  for (let i = 0; i < 7; i++) {
    ctx.moveTo(-10, -58);
    ctx.quadraticCurveTo(-12 - i * 0.7, -52, -13 - i * 0.5, -44 + (i % 2) * 2);
  }
  ctx.stroke();
  horse(ctx, { coat: '#2a2220', mane: '#f2efe6', armour: '#8a2a1a', gallop: frame === 2 ? 0.6 : 0.2, scale: 1.45 });
  const sy = frame === 3 ? -36 : -32;
  // the Khan: gold lamellar, red silk, fur collar
  ctx.save();
  ctx.translate(0, sy);
  poly(ctx, [-6.4, 0, -7, -14, 7, -14, 6.4, 0]);
  blob(ctx, '#a8781e', o, 1.2);
  ctx.fillStyle = '#e8c255';
  for (let r = 0; r < 4; r++) for (let c = -2; c <= 2; c++) ctx.fillRect(c * 2.6 - 1, -12.6 + r * 3, 2, 2.2);
  ell(ctx, 0, -14, 8, 2.8);
  blob(ctx, '#a07a4a', o, 1);
  ctx.fillStyle = '#9a1f1a';
  poly(ctx, [-6.6, -4, -10, 6, -4, 4]);
  ctx.fill();
  circle(ctx, 0.4, -18.4, 5);
  blob(ctx, '#b88a64', o, 1);
  ctx.fillStyle = '#1d1714';
  ctx.beginPath();
  ctx.moveTo(-3, -16);
  ctx.quadraticCurveTo(0.6, -10, 5, -16);
  ctx.lineTo(3, -14);
  ctx.quadraticCurveTo(0.6, -12.6, -1.4, -14.6);
  ctx.fill();
  ctx.fillRect(1.6, -19.4, 1.4, 0.8);
  ctx.fillRect(3.6, -19.4, 1.4, 0.8);
  // crown helm: gold spike, fur rim, red plume
  ctx.beginPath();
  ctx.moveTo(-5, -21);
  ctx.quadraticCurveTo(-4, -28, 0.4, -31);
  ctx.quadraticCurveTo(5, -28, 6, -21);
  ctx.closePath();
  blob(ctx, '#d9a530', o, 1.1);
  ell(ctx, 0.4, -21, 6.8, 2);
  blob(ctx, '#5a3a24', o, 0.9);
  ctx.strokeStyle = '#b7353a';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(0.4, -31);
  ctx.quadraticCurveTo(-4, -38, -9, -36);
  ctx.stroke();
  // the great bow
  const bx = 9;
  const by = frame === 3 ? -24 : -10;
  const draw = frame === 1 ? 4 : 0;
  ctx.strokeStyle = '#4a2a14';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(bx, by - 11);
  ctx.quadraticCurveTo(bx + 5.4, by - 6, bx + 3, by);
  ctx.quadraticCurveTo(bx + 5.4, by + 6, bx, by + 11);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(240,236,220,0.9)';
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  ctx.moveTo(bx, by - 11);
  ctx.lineTo(bx - draw, by);
  ctx.lineTo(bx, by + 11);
  ctx.stroke();
  if (frame === 3) glow(ctx, bx + 2, by - 6, 16, '255,200,110', 0.45);
  ctx.restore();
  ctx.restore();
  levelStripes(ctx, level);
}

/**
 * The Ghost Warrior: a samurai in weathered dark-indigo armour under a
 * hooded white-grey cloak, a pale ghost-mask (original design: a plain
 * lacquered half-mask with two thin red lines), a long white scarf that
 * trails in the wind. Idle: the hand rests on the sheathed blade. Strike: a
 * single draw-cut. Frame 3 – Ghost Stance: low, blade drawn back, the cloak
 * streaming and pale mist rising.
 */
function ghostWarrior(ctx, { frame = 0, facing = 1, level = 0 } = {}) {
  const o = '#0f1218';
  shadow(ctx, 9);
  ctx.save();
  ctx.scale(facing, 1);
  const low = frame === 3 ? 2 : 0;
  if (frame === 3) {
    // pale mist curling off him
    for (let i = 0; i < 5; i++) glow(ctx, -6 + i * 3, -6 - i * 5, 7, '220,228,240', 0.28);
  }
  // the trailing scarf
  ctx.strokeStyle = '#eef0f2';
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-2, -20 + low);
  ctx.quadraticCurveTo(-10, -22 + low + (frame === 3 ? -3 : 0), -16, -16 + low);
  ctx.stroke();
  // legs
  ctx.fillStyle = '#1f2433';
  if (frame === 3) {
    poly(ctx, [-8, 0, -5, -8, -1, -8, -3.6, 0]);
    ctx.fill();
    poly(ctx, [2, 0, 1, -8, 5, -8, 8.6, 0]);
    ctx.fill();
  } else {
    poly(ctx, [-5, 0, -4, -9, -0.6, -9, -1.6, 0]);
    ctx.fill();
    poly(ctx, [1.6, 0, 0.8, -9, 4.4, -9, 5.4, 0]);
    ctx.fill();
  }
  // the cloak: hooded, pale grey, flaring behind
  const flare = frame === 3 ? 4 : frame === 2 ? 2 : 0;
  ctx.beginPath();
  ctx.moveTo(-5.6, -21 + low);
  ctx.quadraticCurveTo(-10 - flare, -12, -9 - flare, -3);
  ctx.lineTo(-3, -5);
  ctx.lineTo(4.6, -9 + low);
  ctx.lineTo(5.6, -21 + low);
  ctx.closePath();
  blob(ctx, '#c9ccd2', o, 1);
  ctx.fillStyle = 'rgba(20,24,40,0.18)';
  poly(ctx, [-6, -18 + low, -8.6 - flare, -4, -5, -5]);
  ctx.fill();
  // armour: indigo lacquer with silver lacing, visible at the front
  poly(ctx, [-2, -20 + low, -1.6, -9 + low, 5, -9 + low, 5.2, -20 + low]);
  blob(ctx, '#232c4a', o, 1);
  ctx.fillStyle = '#c9cfd8';
  for (let r = 0; r < 3; r++) ctx.fillRect(-1.6, -18 + low + r * 3, 6.6, 0.7);
  // hooded head with the pale mask
  ctx.beginPath();
  ctx.arc(0.6, -24 + low, 5.6, Math.PI * 0.95, Math.PI * 2.05);
  ctx.lineTo(5.4, -19 + low);
  ctx.lineTo(-4.4, -19 + low);
  ctx.closePath();
  blob(ctx, '#aeb3bb', o, 1);
  ctx.beginPath();
  ctx.moveTo(-0.6, -25.6 + low);
  ctx.quadraticCurveTo(3, -27 + low, 5.6, -25 + low);
  ctx.lineTo(5.2, -20.4 + low);
  ctx.quadraticCurveTo(2.4, -19.4 + low, -0.4, -21 + low);
  ctx.closePath();
  blob(ctx, '#e8e6e0', o, 0.8);
  ctx.strokeStyle = '#a82a2a';
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  ctx.moveTo(1.4, -24.2 + low);
  ctx.lineTo(4.6, -23.6 + low);
  ctx.moveTo(1.6, -22.4 + low);
  ctx.lineTo(4.4, -21.8 + low);
  ctx.stroke();
  ctx.fillStyle = '#0f1218';
  ctx.fillRect(2.6, -24.8 + low, 1.6, 0.6);
  // the blade
  const hx = 4.6;
  const hy = -13 + low;
  ctx.save();
  ctx.translate(hx, hy);
  if (frame === 0) {
    // sheathed at the hip, hand on the hilt
    ctx.rotate(0.35);
    ctx.fillStyle = '#16181f';
    ctx.fillRect(-12, -0.9, 13, 1.8);
    ctx.fillStyle = '#c9a24a';
    ell(ctx, 1.2, 0, 0.8, 1.8);
    ctx.fill();
    ctx.fillStyle = '#2a2420';
    ctx.fillRect(1.6, -0.6, 3.6, 1.2);
  } else {
    ctx.rotate(frame === 1 ? 0.6 : frame === 2 ? -0.2 : 2.8);
    katana(ctx, 15, '#f4f8ff');
  }
  ctx.restore();
  if (frame === 2) {
    // the draw-cut: one clean pale line
    ctx.strokeStyle = 'rgba(240,246,255,0.9)';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(hx - 4, hy + 4);
    ctx.lineTo(hx + 20, hy - 6);
    ctx.stroke();
  }
  ctx.restore();
  levelStripes(ctx, level);
}

// ---------------------------------------------------------------- personalities

const ranged = (release = 0.1) => (u, t) => {
  const s = since(u, t);
  if (s < release) return { frame: 2 };
  if (u.hasTarget) return { frame: 1 };
  return { frame: 0, dy: sway(u, t, 0.6) };
};
const melee = (hold = 0.12) => (u, t) => {
  const s = since(u, t);
  if (s < hold) return { frame: 2, dx: 1 };
  if (u.hasTarget && u.cooldown < 0.22) return { frame: 1, dx: -0.5 };
  return { frame: 0, dy: sway(u, t) };
};
const caster = (u, t) => (special(u, t) < 0.6 ? { frame: 2, dy: -0.5 } : ranged(0.12)(u, t));

const ANIM = {
  starvingSamurai: (u, t) => {
    // a tired sway at rest; a sudden, clean cut
    const s = since(u, t);
    if (s < 0.1) return { frame: 2, dx: 1.5 };
    if (u.hasTarget && u.cooldown < 0.2) return { frame: 1 };
    return { frame: 0, dy: Math.sin(t * 0.9 + u.uid) * 0.6, dx: Math.sin(t * 0.45 + u.uid) * 0.3 };
  },
  mongolWarrior: melee(0.14),
  mongolArcher: ranged(0.1),
  ronin: (u, t) => {
    // the duelist's stillness, then the three-cut combination
    if (special(u, t) < 0.35) return { frame: Math.floor((t - u.lastSpecial) * 12) % 2 ? 2 : 1, dx: 1.5 };
    return melee(0.1)(u, t);
  },
  mongolCommander: (u, t) => (special(u, t) < 0.8 ? { frame: 1, dy: -0.6 } : ranged(0.12)(u, t)),
  decoratedSamurai: (u, t) => (special(u, t) < 0.4 ? { frame: 2, dx: 3 } : melee(0.12)(u, t)),
  samuraiLord: (u, t) => (special(u, t) < 0.6 ? { frame: 2, dy: 0.5 } : caster(u, t)),
  desperateThief: (u, t) => {
    // agile: quick hops at rest, a crouched throw, a spinning volley
    if (special(u, t) < 0.45) return { frame: 2, dy: -Math.abs(Math.sin((t - u.lastSpecial) * 14)) * 3, flip: Math.floor((t - u.lastSpecial) * 8) % 2 === 1 };
    const s = since(u, t);
    if (s < 0.08) return { frame: 2, dy: 0.6 };
    if (u.hasTarget && u.cooldown < 0.2) return { frame: 1, dy: 0.8 };
    return { frame: 0, dy: -Math.max(0, Math.sin(t * 3.2 + u.uid)) * 1.4 };
  },
  mongolHorsemen: (u, t) => {
    if (special(u, t) < 0.8) return { frame: 3, dx: Math.min(1, (t - u.lastSpecial) * 3) * 4 };
    const s = since(u, t);
    if (s < 0.1) return { frame: 2 };
    return { frame: u.hasTarget ? 1 : 0, dy: Math.abs(Math.sin(t * 6 + u.uid)) * -0.8 };
  },
  mongolBrute: (u, t) => {
    if (special(u, t) < 0.5) return { frame: (t - u.lastSpecial) < 0.25 ? 3 : 2, dy: (t - u.lastSpecial) < 0.25 ? -1 : 0.8 };
    const s = since(u, t);
    if (s < 0.22) return { frame: 2, dy: 0.6 };
    if (u.hasTarget && u.cooldown < 0.5) return { frame: 1, dy: -0.4 };
    return { frame: 0, dy: Math.sin(t * 1.2 + u.uid) * 0.5 };
  },
  // ---- chase units: each its own idle, attack and special
  defectedLord: (u, t) => {
    // idle: blade held low and reversed, weight shifting – never quite settled
    if (special(u, t) < 0.6) return { frame: 3, dx: Math.sin((t - u.lastSpecial) * 30) * 1.2 };
    const s = since(u, t);
    if (s < 0.12) return { frame: 2, dx: 2 };
    if (u.hasTarget && u.cooldown < 0.25) return { frame: 1, dx: -1 };
    return { frame: 0, dx: Math.sin(t * 0.7 + u.uid) * 0.8, flip: Math.sin(t * 0.23 + u.uid) > 0.93 };
  },
  honourableLord: (u, t) => {
    // idle: perfectly still, blade upright; the technique: the blade raised to the sky
    if (special(u, t) < 0.9) return { frame: 3, dy: -0.4 };
    const s = since(u, t);
    if (s < 0.16) return { frame: 2 };
    if (u.hasTarget && u.cooldown < 0.35) return { frame: 1 };
    return { frame: 0 };
  },
  greatKhan: (u, t) => {
    // idle: the warhorse stamps and tosses its head; the volley: he rises in the stirrups
    if (u.volleying || special(u, t) < 1.6) return { frame: 3, dy: -1 };
    const s = since(u, t);
    if (s < 0.14) return { frame: 2 };
    if (u.hasTarget && u.cooldown < 0.4) return { frame: 1 };
    return { frame: 0, dy: Math.max(0, Math.sin(t * 1.6 + u.uid)) * -0.8 };
  },
  ghostWarrior: (u, t) => {
    // Ghost Stance: low, blade drawn back, mist rising; techniques flicker between cut frames
    if (special(u, t) < 0.5) return { frame: Math.floor((t - u.lastSpecial) * 16) % 2 ? 2 : 3, dx: 2 };
    if (u.stanceUntil > t) {
      const s = since(u, t);
      return { frame: s < 0.08 ? 2 : 3 };
    }
    const s = since(u, t);
    if (s < 0.08) return { frame: 2, dx: 2.5 };
    if (u.hasTarget && u.cooldown < 0.15) return { frame: 1 };
    return { frame: 0, dy: Math.sin(t * 0.8 + u.uid) * 0.4 };
  },
};

for (const [key, f] of Object.entries(PEOPLE)) registerPainter(key, figure(f), ANIM[key]);
const PAINTERS = {
  mongolHorsemen: [mongolHorsemen, { left: -26, right: 26, top: -40, bottom: 8 }],
  mongolBrute: [mongolBrute, { left: -22, right: 32, top: -38, bottom: 8 }],
  defectedLord: [defectedLord, { left: -22, right: 26, top: -38, bottom: 8 }],
  honourableLord: [honourableLord, { left: -22, right: 28, top: -46, bottom: 8 }],
  greatKhan: [greatKhan, { left: -34, right: 34, top: -64, bottom: 10 }],
  ghostWarrior: [ghostWarrior, { left: -22, right: 28, top: -38, bottom: 8 }],
};
for (const [key, [p, box]] of Object.entries(PAINTERS)) registerPainter(key, p, ANIM[key], { box });

export const GHOST_ART_KEYS = [...Object.keys(PEOPLE), ...Object.keys(PAINTERS)];
