// Artwork for Circle Pack 3: Royal Academy, Frostbound Legion, Arcane Library
// and Titan Foundry. Same house style as the rest of the cast: light from the
// top-left, flat fills, one dark hue-tinted outline, glow only on real light
// sources (runes, magma, frost) and kept small.
//
// People use the shared parametric figure (castArt.js) with new hats, props and
// back layers. Spirits and Titan Foundry machines have their own painters and
// grow with their tier: the Worldbreaker is the largest unit in the game.
// Frames: 0 idle, 1 wind-up / aim, 2 release.

import { circle } from './canvas.js';
import { shade } from '../core/color.js';
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
function rrect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}
function poly(ctx, pts) {
  ctx.beginPath();
  ctx.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
  ctx.closePath();
}
/** A small soft light (runes, embers, frost). Used sparingly. */
function glow(ctx, x, y, r, rgb, a = 0.45) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, `rgba(${rgb},${a})`);
  g.addColorStop(1, `rgba(${rgb},0)`);
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
}
function rivets(ctx, pts, c = '#c9a24a') {
  ctx.fillStyle = c;
  for (let i = 0; i < pts.length; i += 2) {
    circle(ctx, pts[i], pts[i + 1], 0.6);
    ctx.fill();
  }
}

// ---------------------------------------------------------------- hats

Object.assign(EXTRA_HATS, {
  /** Academy graduate's square cap with a gold tassel. */
  mortarboard(ctx, h, o) {
    ctx.fillStyle = h.color;
    ctx.strokeStyle = o;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(0.3, -22, 5.4, Math.PI, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    poly(ctx, [-6.4, -26, 0.6, -28.6, 7.4, -26, 0.4, -23.6]);
    blob(ctx, h.color, o, 1);
    ctx.strokeStyle = h.tassel ?? '#e0b84a';
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.moveTo(0.6, -26.2);
    ctx.lineTo(5.6, -25.4);
    ctx.lineTo(6, -21.6);
    ctx.stroke();
  },
  /** Wide-brimmed duellist's hat with a long plume. */
  musketeer(ctx, h, o) {
    ell(ctx, 0.4, -23.4, 8.2, 2);
    blob(ctx, h.color, o, 1);
    ctx.beginPath();
    ctx.arc(0.4, -23.6, 4.6, Math.PI, 0);
    ctx.closePath();
    blob(ctx, h.color, o, 1);
    ctx.fillStyle = h.band ?? '#e0b84a';
    ctx.fillRect(-4.2, -24.8, 9.2, 1.1);
    ctx.fillStyle = h.plume ?? '#f4f1ea';
    ctx.beginPath();
    ctx.moveTo(-2, -26.6);
    ctx.quadraticCurveTo(-9, -32, -12, -25);
    ctx.quadraticCurveTo(-7, -28.4, -2.6, -25.4);
    ctx.closePath();
    ctx.fill();
  },
  /** Archery-range cap with a single feather. */
  feathercap(ctx, h, o) {
    ctx.beginPath();
    ctx.moveTo(-5.4, -21.6);
    ctx.quadraticCurveTo(-3, -28.6, 6.4, -23.4);
    ctx.lineTo(7.6, -21.8);
    ctx.closePath();
    blob(ctx, h.color, o, 1);
    ctx.strokeStyle = h.feather ?? '#b7353a';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-3, -24);
    ctx.quadraticCurveTo(-7, -29, -5, -31.4);
    ctx.stroke();
  },
  /** A laurel wreath over grey hair (the Grandmaster). */
  laurel(ctx, h, o) {
    ctx.fillStyle = h.hair ?? '#d9d6cc';
    ctx.strokeStyle = o;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(0.3, -21.4, 5.6, Math.PI * 1.05, -0.05);
    ctx.quadraticCurveTo(4, -22, 0, -22.6);
    ctx.quadraticCurveTo(-4, -22.4, -5.4, -19);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = h.color ?? '#e0b84a';
    for (let i = 0; i < 7; i++) {
      const a = Math.PI * (1.05 + i * 0.13);
      ell(ctx, 0.3 + Math.cos(a) * 5.6, -22 + Math.sin(a) * 4.6, 1.5, 0.8, a + 1.2);
      ctx.fill();
    }
  },
  /** White fur-rimmed hood (Frost Recruits). */
  furhood(ctx, h, o) {
    ctx.beginPath();
    ctx.arc(0.3, -20.6, 6.6, Math.PI * 0.95, Math.PI * 0.05, false);
    ctx.lineTo(5.6, -16.4);
    ctx.lineTo(-5.4, -16.4);
    ctx.closePath();
    blob(ctx, h.color, o, 1);
    ctx.fillStyle = '#f2efe8';
    ctx.strokeStyle = shade('#f2efe8', -0.25);
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.arc(1.6, -19.6, 5, Math.PI * 1.05, Math.PI * 0.6, false);
    ctx.stroke();
    for (let i = 0; i < 6; i++) {
      const a = Math.PI * (1.1 + i * 0.16);
      circle(ctx, 1.6 + Math.cos(a) * 5, -19.6 + Math.sin(a) * 5, 1.2);
      ctx.fill();
    }
  },
  /** Tall fur hat with a frost-steel badge (Winter General). */
  furhat(ctx, h, o) {
    rrect(ctx, -5.6, -29, 11.8, 8, 3);
    blob(ctx, h.color ?? '#e8e4dc', o, 1);
    ctx.fillStyle = shade(h.color ?? '#e8e4dc', -0.12);
    for (let i = 0; i < 5; i++) ctx.fillRect(-4.6 + i * 2.2, -28 + (i % 2), 1, 6);
    ctx.fillStyle = h.badge ?? '#bfe6ff';
    poly(ctx, [0.6, -27.4, 2.2, -25.4, 0.6, -23.4, -1, -25.4]);
    ctx.fill();
  },
  /** A wolf pelt worn as a hood, the head on top (Snow Berserker). */
  wolfpelt(ctx, h, o) {
    ctx.beginPath();
    ctx.moveTo(-6.6, -14);
    ctx.quadraticCurveTo(-7.4, -26, 0, -27);
    ctx.quadraticCurveTo(6.6, -27, 7.6, -22);
    ctx.lineTo(4, -23.6);
    ctx.quadraticCurveTo(-1, -23.6, -3.4, -18);
    ctx.lineTo(-4, -14);
    ctx.closePath();
    blob(ctx, h.color ?? '#c9c4ba', o, 1);
    // snout and ears
    poly(ctx, [3.6, -26.4, 10.6, -24.6, 9.4, -22.4, 3.6, -23.4]);
    blob(ctx, h.color ?? '#c9c4ba', o, 0.9);
    poly(ctx, [-2.6, -26.4, -1.4, -30, 0.4, -26.8]);
    blob(ctx, shade(h.color ?? '#c9c4ba', -0.2), o, 0.8);
    ctx.fillStyle = '#16161a';
    circle(ctx, 10.2, -23.6, 0.7);
    ctx.fill();
    ctx.fillStyle = '#e8c255';
    circle(ctx, 5.4, -25, 0.6);
    ctx.fill();
  },
  /** Faceted ice helm with three frozen spikes (Glacier Knight). */
  icehelm(ctx, h, o) {
    rrect(ctx, -5.4, -26.4, 11, 11, 2.2);
    blob(ctx, h.color ?? '#9fc4dc', o, 1.1);
    ctx.fillStyle = '#16212e';
    ctx.fillRect(-0.4, -21.6, 5.8, 1.1);
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.fillRect(-4.6, -25.6, 2.2, 9);
    ctx.fillStyle = '#e4f4ff';
    ctx.strokeStyle = shade('#9fc4dc', -0.35);
    ctx.lineWidth = 0.7;
    for (const [x, hgt] of [[-3, 5], [0.4, 7.5], [3.8, 5]]) {
      poly(ctx, [x - 1.4, -26.2, x, -26.2 - hgt, x + 1.4, -26.2]);
      ctx.fill();
      ctx.stroke();
    }
  },
  /** A thin silver circlet with a teal stone (Spellblade). */
  circlet(ctx, h, o) {
    ctx.fillStyle = h.hair ?? '#2a1d14';
    ctx.strokeStyle = o;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(0.3, -21.2, 5.6, Math.PI * 1.02, -0.02);
    ctx.quadraticCurveTo(2, -23, -2, -22.4);
    ctx.quadraticCurveTo(-5, -20, -5.4, -17);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = h.color ?? '#d9d6cc';
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.moveTo(-5.4, -22.4);
    ctx.quadraticCurveTo(0.4, -24.6, 6, -22.4);
    ctx.stroke();
    ctx.fillStyle = h.jewel ?? '#4fd0c0';
    circle(ctx, 2.6, -23.4, 1);
    ctx.fill();
  },
  /** Foundry helmet with a welding visor flipped up. */
  weldmask(ctx, h, o) {
    ctx.beginPath();
    ctx.arc(0.3, -21.4, 5.8, Math.PI * 1.02, -0.02);
    ctx.closePath();
    blob(ctx, h.color ?? '#6b5a3a', o, 1);
    rrect(ctx, -4.6, -30.4, 10.4, 6, 1.2);
    blob(ctx, '#3a3530', o, 1);
    ctx.fillStyle = '#1d4a4a';
    ctx.fillRect(-2.6, -28.6, 6.6, 2);
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.fillRect(-2.2, -28.4, 1.6, 0.8);
  },
});

// ---------------------------------------------------------------- hand-held props

Object.assign(EXTRA_PROPS, {
  /** Wooden training sword with a padded tip (Squire). */
  trainingsword(ctx, f, frame, o, hx, hy) {
    const ang = frame === 1 ? -2 : frame === 2 ? 0.2 : -0.7;
    ctx.save();
    ctx.translate(hx, hy);
    ctx.rotate(ang);
    ctx.fillStyle = '#b48a5a';
    ctx.strokeStyle = '#5a3f2a';
    ctx.lineWidth = 0.6;
    ctx.fillRect(1.5, -0.9, 8, 1.8);
    ctx.strokeRect(1.5, -0.9, 8, 1.8);
    ctx.fillStyle = '#e6dcc0';
    ell(ctx, 10, 0, 1.6, 1.4);
    ctx.fill();
    ctx.fillStyle = '#6b4a2c';
    ctx.fillRect(0.6, -1.8, 1, 3.6);
    ctx.restore();
  },
  /** A slim rapier: a thrust, not a swing. */
  rapier(ctx, f, frame, o, hx, hy) {
    const push = frame === 2 ? 4 : frame === 1 ? -1.5 : 0;
    ctx.save();
    ctx.translate(hx + push, hy);
    ctx.rotate(frame === 0 ? -0.9 : -0.05);
    ctx.strokeStyle = '#e9eef5';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(1, 0);
    ctx.lineTo(14, 0);
    ctx.stroke();
    ctx.strokeStyle = f.hilt ?? '#e0b84a';
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.arc(1.4, 0, 1.8, -1.6, 1.6);
    ctx.stroke();
    ctx.restore();
    if (frame === 2) {
      ctx.strokeStyle = 'rgba(255,248,230,0.7)';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(hx + 8, hy - 1.5);
      ctx.lineTo(hx + 19, hy - 0.5);
      ctx.stroke();
    }
  },
  /** Spear with a crystal ice head. */
  icespear(ctx, f, frame, o, hx, hy, aim) {
    const push = frame === 2 ? 4 : 0;
    ctx.save();
    ctx.translate(hx + push, hy);
    ctx.rotate(aim ? 0 : -1.2);
    ctx.strokeStyle = '#4a5a6a';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(-7, 0);
    ctx.lineTo(12, 0);
    ctx.stroke();
    poly(ctx, [11.4, -1.8, 17.4, 0, 11.4, 1.8, 12.6, 0]);
    blob(ctx, '#cfeaff', '#5a8ab0', 0.6);
    ctx.restore();
  },
  /** Two-handed axe with a frozen edge. */
  frostaxe(ctx, f, frame, o, hx, hy) {
    const ang = frame === 1 ? -2.4 : frame === 2 ? 0.35 : -0.5;
    ctx.save();
    ctx.translate(hx, hy);
    ctx.rotate(ang);
    ctx.strokeStyle = '#5a3f2a';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(-2, 0);
    ctx.lineTo(12, 0);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(9, -0.6);
    ctx.quadraticCurveTo(10, -6.4, 15, -6);
    ctx.quadraticCurveTo(13, -1, 15, 4);
    ctx.quadraticCurveTo(10, 4.4, 9, 0.6);
    ctx.closePath();
    blob(ctx, '#9aa6b2', o, 0.9);
    ctx.strokeStyle = '#dff3ff';
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.moveTo(14.4, -5.4);
    ctx.quadraticCurveTo(12.6, -1, 14.4, 3.4);
    ctx.stroke();
    ctx.restore();
    if (frame === 2) {
      ctx.strokeStyle = 'rgba(214,240,255,0.75)';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(hx - 2, hy - 2, 14, -1.3, 0.6);
      ctx.stroke();
    }
  },
  /** An open book; its pages light up as the spell leaves (frame 2). */
  book(ctx, f, frame, o, hx, hy) {
    const lift = frame >= 1 ? -2 : 0;
    ctx.save();
    ctx.translate(hx + 1, hy - 1 + lift);
    poly(ctx, [-4, -1, 0, 0.4, 4, -1, 4, 2.6, 0, 3.8, -4, 2.6]);
    blob(ctx, f.cover ?? '#6b3f2a', o, 0.8);
    poly(ctx, [-3.4, -1.6, 0, -0.4, 3.4, -1.6, 3.4, 1.8, 0, 3, -3.4, 1.8]);
    blob(ctx, '#efe6cc', null);
    ctx.strokeStyle = 'rgba(80,60,40,0.55)';
    ctx.lineWidth = 0.4;
    ctx.beginPath();
    for (let i = 0; i < 3; i++) {
      ctx.moveTo(-2.8, -0.6 + i);
      ctx.lineTo(-0.8, -0.1 + i);
      ctx.moveTo(0.8, -0.1 + i);
      ctx.lineTo(2.8, -0.6 + i);
    }
    ctx.stroke();
    if (frame === 2) glow(ctx, 0, -1, 7, f.runeRgb ?? '79,208,192', 0.55);
    ctx.restore();
  },
  /** A dark tome with an open eye on the cover (Void Reader). */
  voidtome(ctx, f, frame, o, hx, hy) {
    ctx.save();
    ctx.translate(hx + 1, hy - (frame >= 1 ? 2 : 0));
    rrect(ctx, -3.6, -3.2, 7.2, 6.4, 0.8);
    blob(ctx, '#1d1830', o, 0.8);
    ctx.fillStyle = '#c9a24a';
    ctx.fillRect(-3.6, -3.2, 1, 6.4);
    ell(ctx, 0.6, 0, 2.2, 1.2);
    ctx.fillStyle = '#efe6cc';
    ctx.fill();
    ctx.fillStyle = frame === 2 ? '#d07aff' : '#6a3aa8';
    circle(ctx, 0.6, 0, 0.8);
    ctx.fill();
    if (frame === 2) glow(ctx, 0.6, 0, 6, '176,110,255', 0.5);
    ctx.restore();
  },
  /** A stone tablet with a glowing rune, raised to cast. */
  runestone(ctx, f, frame, o, hx, hy) {
    ctx.save();
    ctx.translate(hx + 1, hy - 1 - (frame >= 1 ? 3 : 0));
    rrect(ctx, -2.8, -4, 5.6, 7, 1.4);
    blob(ctx, '#8a8578', o, 0.8);
    ctx.strokeStyle = frame === 2 ? '#a8fff2' : '#4fd0c0';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(-1, -2.4);
    ctx.lineTo(1, -0.4);
    ctx.lineTo(-1, 1.6);
    ctx.moveTo(1, -2.4);
    ctx.lineTo(1, 1.8);
    ctx.stroke();
    if (frame >= 1) glow(ctx, 0, -0.4, 6, '79,208,192', frame === 2 ? 0.6 : 0.3);
    ctx.restore();
  },
  /** A sword with runes along the fuller; the runes flare on the heavy strike. */
  spellsword(ctx, f, frame, o, hx, hy) {
    const ang = frame === 1 ? -2.2 : frame === 2 ? 0.15 : -0.6;
    ctx.save();
    ctx.translate(hx, hy);
    ctx.rotate(ang);
    poly(ctx, [1.5, -1, 12, 0, 1.5, 1]);
    blob(ctx, '#d9e2ea', '#3a4450', 0.6);
    ctx.fillStyle = '#4fd0c0';
    for (let i = 0; i < 3; i++) ctx.fillRect(3.5 + i * 2.6, -0.3, 1.2, 0.6);
    ctx.fillStyle = '#c9a24a';
    ctx.fillRect(0.6, -2.2, 1, 4.4);
    if (frame === 2) glow(ctx, 7, 0, 7, '79,208,192', 0.45);
    ctx.restore();
    if (frame === 2) {
      ctx.strokeStyle = 'rgba(150,255,240,0.75)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(hx - 2, hy - 2, 11, -1.2, 0.5);
      ctx.stroke();
    }
  },
});

// ---------------------------------------------------------------- behind the body

Object.assign(EXTRA_BEHIND, {
  /** A quiver of blunt practice arrows. */
  quiver(ctx, f, o) {
    ctx.save();
    ctx.translate(-6, -14);
    ctx.rotate(-0.35);
    rrect(ctx, -2, -5, 4, 11, 1);
    blob(ctx, '#6b4a2c', o, 0.9);
    ctx.fillStyle = '#e6dcc0';
    for (let i = 0; i < 3; i++) {
      circle(ctx, -1 + i, -6, 0.9);
      ctx.fill();
    }
    ctx.restore();
  },
  /** The Academy banner on a pole: royal blue with a gold chevron. */
  academyBanner(ctx, f, o, frame) {
    const wave = frame >= 1 ? 1 : 0;
    ctx.strokeStyle = '#5a3f2a';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(-7.5, 0);
    ctx.lineTo(-7.5, -34);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-7.2, -33);
    ctx.lineTo(1.6 + wave, -32);
    ctx.lineTo(0.6, -23 - wave);
    ctx.lineTo(-7.2, -24);
    ctx.closePath();
    blob(ctx, '#2a4a8a', o, 0.9);
    ctx.strokeStyle = '#e0b84a';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-6, -31);
    ctx.lineTo(-3, -28);
    ctx.lineTo(0, -30.6);
    ctx.stroke();
    ctx.fillStyle = '#e0b84a';
    circle(ctx, -7.5, -34.6, 1);
    ctx.fill();
  },
  /** A heavy fur cloak with a frosted hem. */
  furcloak(ctx, f, o) {
    ctx.beginPath();
    ctx.moveTo(-5.8, -15.4);
    ctx.quadraticCurveTo(-11, -7, -9.4, -0.4);
    ctx.lineTo(3, -1);
    ctx.lineTo(5, -15.4);
    ctx.closePath();
    blob(ctx, f.capeColor ?? '#3a5070', o, 1);
    ctx.fillStyle = '#ece8e0';
    ctx.beginPath();
    ctx.ellipse(-0.4, -15.6, 6.4, 2, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = 'rgba(214,240,255,0.7)';
    for (let i = 0; i < 5; i++) ctx.fillRect(-8.6 + i * 2.4, -1.4 - (i % 2), 1.2, 1);
  },
  /** Ice shards drifting around the shoulders (Frost Mage). */
  icecrystals(ctx, f, o, frame) {
    const r = frame === 2 ? 1.2 : 0;
    for (const [x, y, s] of [[-9, -22, 2.4], [-8, -9, 1.8], [8.6, -25, 2]]) {
      poly(ctx, [x, y - s * 1.6 - r, x + s * 0.8, y, x, y + s * 1.2, x - s * 0.8, y]);
      blob(ctx, '#dff3ff', '#5a8ab0', 0.6);
    }
  },
  /** A stack of books hovering behind (Arcane Scholar). */
  bookstack(ctx, f, o, frame) {
    const bob = frame === 2 ? -1.5 : 0;
    const cols = ['#7a2a3a', '#2a5a5a', '#5a3a8a'];
    for (let i = 0; i < 3; i++) {
      rrect(ctx, -12 + (i % 2), -12 - i * 3.4 + bob, 7, 3, 0.6);
      blob(ctx, cols[i], o, 0.8);
      ctx.fillStyle = '#efe6cc';
      ctx.fillRect(-11.4 + (i % 2), -11.3 - i * 3.4 + bob, 5.6, 0.6);
    }
  },
  /** A faint ring of void script orbiting behind (Void Reader). */
  voidring(ctx, f, o, frame) {
    ctx.strokeStyle = frame === 2 ? 'rgba(208,122,255,0.8)' : 'rgba(150,100,220,0.5)';
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 2]);
    ell(ctx, 0, -14, 11, 4, -0.2);
    ctx.stroke();
    ctx.setLineDash([]);
  },
  /** A small riveted boiler worn on the back, with a glowing gauge (Foundry Overseer). */
  furnacepack(ctx, f, o) {
    rrect(ctx, -10.4, -21, 7.6, 14, 2);
    blob(ctx, '#4a4038', o, 1);
    rivets(ctx, [-9.4, -19.6, -4, -19.6, -9.4, -8.6, -4, -8.6]);
    ctx.fillStyle = '#e07a2e';
    circle(ctx, -6.6, -13.6, 1.8);
    ctx.fill();
    glow(ctx, -6.6, -13.6, 4, '224,122,46', 0.35);
    ctx.fillStyle = '#3a3530';
    ctx.fillRect(-9, -26, 2.2, 5);
  },
});

// ---------------------------------------------------------------- people

const ACADEMY = { outline: '#141a2a' };
const FROST = { outline: '#121c26' };
const ARCANE = { outline: '#160f22' };
const FOUNDRY = { outline: '#1a1410' };

const PEOPLE = {
  squire: { ...ACADEMY, skin: '#e8b892', top: '#d9cdb0', vest: '#2a4a8a', pants: '#5a4a32', boots: '#3a2a1a', hat: { type: 'messy', color: '#8a5a2a' }, weapon: 'trainingsword', shield: '#8a6a3a', shieldMark: '#e0b84a', extras: ['smile'] },
  traineeGuard: { ...ACADEMY, skin: '#d9a47c', top: '#9aa1aa', vest: '#2a4a8a', pants: '#3a3f4a', boots: '#24211d', hat: { type: 'kettle', color: '#9aa1aa' }, weapon: 'spear', shield: '#2a4a8a', shieldShape: 'heater', shieldMark: '#e0b84a', extras: [] },
  practiceArcher: { ...ACADEMY, skin: '#e2b08a', top: '#3f6a4a', vest: '#2a4a8a', pants: '#4a3f33', boots: '#2a1d14', hat: { type: 'feathercap', color: '#2f5a3a', feather: '#e0b84a' }, weapon: 'bow', behind: 'quiver', extras: ['squint'] },
  duelist: { ...ACADEMY, skin: '#e0ad86', top: '#f4f1ea', coat: { color: '#6a1f2a', long: true }, pants: '#2a2430', boots: '#1d1820', hat: { type: 'musketeer', color: '#2a1f30', plume: '#f4f1ea', band: '#e0b84a' }, weapon: 'rapier', hilt: '#e0b84a', extras: ['mustache'], hairColor: '#2a1d14' },
  battleInstructor: { ...ACADEMY, skin: '#c99a74', top: '#2a4a8a', vest: '#e0b84a', pants: '#3a3530', boots: '#24211d', hat: { type: 'plume', color: '#9aa1aa', plume: '#2a4a8a' }, weapon: 'baton', behind: 'academyBanner', belt: '#3b2a1a', extras: ['mustache'], hairColor: '#5a3a1a', wide: true },
  royalGraduate: { ...ACADEMY, skin: '#e6b48f', top: '#f4f1ea', coat: { color: '#22345a', long: true }, pants: '#22345a', boots: '#1d2028', hat: { type: 'mortarboard', color: '#16213a', tassel: '#e0b84a' }, weapon: 'sword', blade: '#f2efe6', hilt: '#e0b84a', sash: '#e0b84a', medals: 1, extras: ['smile'] },
  grandmaster: { ...ACADEMY, skin: '#d9a47c', top: '#e6d8b8', coat: { color: '#1f3266', long: true }, pants: '#1f2a4a', boots: '#16181f', hat: { type: 'laurel', color: '#e0b84a', hair: '#d9d6cc' }, weapon: 'greatsword', blade: '#fbf6e6', hilt: '#e0b84a', behind: 'cape', capeColor: '#7a1f2a', sash: '#e0b84a', medals: 3, extras: ['beard'], hairColor: '#d9d6cc', wide: true },

  frostRecruit: { ...FROST, skin: '#e8c0a0', top: '#4a6a8a', vest: '#8aa4b8', pants: '#3a4a5a', boots: '#24303c', hat: { type: 'furhood', color: '#3a5070' }, weapon: 'icespear', scarf: '#ece8e0', extras: [] },
  iceArcher: { ...FROST, skin: '#e2b8a0', top: '#dfe9f2', pants: '#4a5a6a', boots: '#24303c', hat: { type: 'hood', color: '#cfdde8' }, weapon: 'bow', behind: 'furcloak', capeColor: '#5a7a9a', extras: ['squint'] },
  snowBerserker: { ...FROST, skin: '#e8b8a0', top: '#e8b8a0', pants: '#8a8070', boots: '#4a4038', hat: { type: 'wolfpelt', color: '#d0cbc0' }, weapon: 'frostaxe', belt: '#5a3f2a', bandolier: true, extras: ['beard'], hairColor: '#e6d6b8', wide: true },
  frostMage: { ...FROST, skin: '#e6c0a8', top: '#3f6a9a', coat: { color: '#2f4f7a', long: true }, pants: '#2a3a52', boots: '#1a2232', hat: { type: 'wizard', color: '#3f6a9a', star: '#dff3ff' }, weapon: 'staff', staff: '#dfe9f2', orb: '#bfe6ff', orbGlow: true, behind: 'icecrystals', extras: ['beard'], hairColor: '#f2f4f8' },
  glacierKnight: { ...FROST, skin: '#e0b89a', top: '#8aa4b8', vest: '#cfeaff', pants: '#6a8094', boots: '#3a4a5a', hat: { type: 'icehelm', color: '#9fc4dc' }, weapon: 'greatsword', blade: '#dff3ff', hilt: '#8aa4b8', shield: '#9fc4dc', shieldShape: 'heater', shieldMark: '#f4fbff', extras: [], wide: true },
  winterGeneral: { ...FROST, skin: '#e2b8a0', top: '#dfe9f2', coat: { color: '#1f2f45', long: true }, pants: '#1f2f45', boots: '#121a26', hat: { type: 'furhat', color: '#ece8e0', badge: '#bfe6ff' }, weapon: 'sword', blade: '#dff3ff', hilt: '#bfe6ff', behind: 'furcloak', capeColor: '#2a3f5a', medals: 4, sash: '#bfe6ff', extras: ['beard'], hairColor: '#f2f4f8', wide: true },

  pageApprentice: { ...ARCANE, skin: '#e8b892', top: '#6b3f2a', vest: '#e8dcb8', pants: '#4a3a2a', boots: '#2a1d14', hat: { type: 'messy', color: '#a0642a' }, weapon: 'book', cover: '#7a2a3a', extras: ['smile'] },
  runeCaster: { ...ARCANE, skin: '#d9a47c', top: '#2f5a5a', coat: { color: '#24484a', long: true }, pants: '#2a3a3a', boots: '#1a2424', hat: { type: 'hood', color: '#2f5a5a' }, weapon: 'runestone', belt: '#6b4a2c', extras: ['squint'] },
  spellblade: { ...ARCANE, skin: '#e0ad86', top: '#3a2a5a', vest: '#2a4a5a', pants: '#2a2440', boots: '#16121f', hat: { type: 'circlet', color: '#d9d6cc', jewel: '#4fd0c0', hair: '#1d1410' }, weapon: 'spellsword', behind: 'cape', capeColor: '#24585a', extras: [] },
  arcaneScholar: { ...ARCANE, skin: '#e6b48f', top: '#e8dcb8', coat: { color: '#5a3a8a', long: true }, pants: '#2a2440', boots: '#16121f', hat: { type: 'wizard', color: '#5a3a8a' }, weapon: 'book', cover: '#2a5a5a', behind: 'bookstack', extras: ['beard'], hairColor: '#8a8070' },
  voidReader: { ...ARCANE, skin: '#b8a0c0', top: '#1d1830', coat: { color: '#16122a', long: true }, pants: '#16122a', boots: '#0d0a18', hat: { type: 'hood', color: '#241c3a' }, weapon: 'voidtome', behind: 'voidring', extras: ['squint'] },
  archmage: { ...ARCANE, skin: '#e2b08a', top: '#e8dcb8', coat: { color: '#3a2a5a', long: true }, pants: '#2a2040', boots: '#16121f', hat: { type: 'wizard', color: '#2a1f4a', star: '#4fd0c0' }, weapon: 'staff', staff: '#c9a24a', orb: '#4fd0c0', orbGlow: true, behind: 'cape', capeColor: '#5a2a6a', sash: '#c9a24a', extras: ['beard'], hairColor: '#f2f0ea', wide: true },

  foundryOverseer: { ...FOUNDRY, skin: '#c99a74', top: '#5a4a3a', vest: '#2f2822', pants: '#3a3530', boots: '#1d1a17', hat: { type: 'weldmask', color: '#c9a24a' }, weapon: 'baton', behind: 'furnacepack', belt: '#c9a24a', extras: ['mustache'], hairColor: '#3a2618', wide: true },
};

// ---------------------------------------------------------------- spirits

/** The Eternal Winter: a crowned spirit of snow whose robe becomes a drift; hail turns in one hand. */
function eternalWinter(ctx, { frame = 0, facing = 1, level = 0 } = {}) {
  const o = '#122030';
  shadow(ctx, 10);
  ctx.save();
  ctx.scale(facing, 1);
  // the drift
  ell(ctx, 0, -1.5, 11, 3.4);
  blob(ctx, '#e8f2fa', o, 1);
  // robe rising out of it
  ctx.beginPath();
  ctx.moveTo(-9, -2);
  ctx.quadraticCurveTo(-7, -18, -5, -24);
  ctx.lineTo(5.6, -24);
  ctx.quadraticCurveTo(8, -16, 9.6, -2);
  ctx.closePath();
  blob(ctx, '#cfe2f0', o, 1.1);
  ctx.fillStyle = 'rgba(120,160,200,0.35)';
  ctx.beginPath();
  ctx.moveTo(-3, -22);
  ctx.quadraticCurveTo(-4, -10, -6, -2);
  ctx.lineTo(-2, -2);
  ctx.quadraticCurveTo(-1, -12, -1, -22);
  ctx.fill();
  // mantle of hoarfrost
  ctx.beginPath();
  ctx.moveTo(-7, -24);
  ctx.quadraticCurveTo(0.5, -18, 8, -24);
  ctx.quadraticCurveTo(0.5, -29, -7, -24);
  blob(ctx, '#f4fbff', o, 1);
  // face: pale, eyes of blue light
  circle(ctx, 0.6, -29, 4.6);
  blob(ctx, '#dfeaf2', o, 1);
  ctx.fillStyle = '#6fc4f0';
  ctx.fillRect(1, -30, 1.4, 0.9);
  ctx.fillRect(3.4, -30, 1.4, 0.9);
  // crown of icicles
  ctx.fillStyle = '#e4f4ff';
  ctx.strokeStyle = '#5a8ab0';
  ctx.lineWidth = 0.6;
  for (let i = 0; i < 5; i++) {
    const x = -3.4 + i * 2;
    poly(ctx, [x - 1, -32.6, x, -32.6 - (i % 2 ? 3 : 5.4), x + 1, -32.6]);
    ctx.fill();
    ctx.stroke();
  }
  // the hailstone orb, raised to cast
  const hx = 8.4;
  const hy = frame >= 1 ? -24 : -16;
  ctx.strokeStyle = o;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(4.6, -21);
  ctx.lineTo(hx - 1, hy + 1);
  ctx.stroke();
  glow(ctx, hx, hy - 2, frame === 2 ? 9 : 6, '170,220,255', frame === 2 ? 0.6 : 0.35);
  circle(ctx, hx, hy - 2, 2.6);
  blob(ctx, '#f4fbff', '#5a8ab0', 0.8);
  // drifting flakes
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  for (const [x, y] of [[-10, -14], [-8, -27], [11, -8]]) ctx.fillRect(x, y, 1.2, 1.2);
  ctx.restore();
  levelStripes(ctx, level);
}

/** The Forbidden Author: a faceless hooded writer floating over a chained grimoire, pages tearing loose. */
function forbiddenAuthor(ctx, { frame = 0, facing = 1, level = 0 } = {}) {
  const o = '#0d0a14';
  shadow(ctx, 9);
  ctx.save();
  ctx.scale(facing, 1);
  // the grimoire, chained shut except while casting
  ctx.save();
  ctx.translate(0, -5);
  const open = frame === 2;
  if (open) {
    poly(ctx, [-9, -2, 0, 1, 9, -2, 9, 3, 0, 5, -9, 3]);
    blob(ctx, '#2a1430', o, 1);
    poly(ctx, [-8, -3, 0, 0, 8, -3, 8, 2, 0, 4, -8, 2]);
    blob(ctx, '#efe2c0', null);
    glow(ctx, 0, -1, 12, '208,122,255', 0.5);
  } else {
    rrect(ctx, -7, -3.6, 14, 7, 1);
    blob(ctx, '#2a1430', o, 1);
    ctx.strokeStyle = '#8d939e';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-7, -1);
    ctx.lineTo(7, 1.6);
    ctx.moveTo(-7, 1.6);
    ctx.lineTo(7, -1);
    ctx.stroke();
    ctx.fillStyle = '#c9a24a';
    rrect(ctx, -1.4, -1.6, 2.8, 3, 0.6);
    ctx.fill();
  }
  ctx.restore();
  // robed body, hovering
  ctx.beginPath();
  ctx.moveTo(-6.4, -10);
  ctx.quadraticCurveTo(-7.6, -20, -4.6, -27);
  ctx.quadraticCurveTo(0.6, -33, 5.6, -27);
  ctx.quadraticCurveTo(8, -20, 7, -10);
  ctx.quadraticCurveTo(3.6, -8, 0.4, -11);
  ctx.quadraticCurveTo(-3, -8, -6.4, -10);
  blob(ctx, '#2a1f3a', o, 1.1);
  // the hood's empty dark, with two points of light
  ell(ctx, 1.6, -25, 3.4, 3.8);
  ctx.fillStyle = '#07050c';
  ctx.fill();
  ctx.fillStyle = frame === 2 ? '#f2b8ff' : '#b06eff';
  ctx.fillRect(1, -25.4, 1, 0.8);
  ctx.fillRect(2.8, -25.4, 1, 0.8);
  // trim: gold script along the hem
  ctx.strokeStyle = '#c9a24a';
  ctx.lineWidth = 0.6;
  ctx.setLineDash([1.4, 1]);
  ctx.beginPath();
  ctx.moveTo(-6, -11);
  ctx.quadraticCurveTo(0, -8.6, 6.6, -11);
  ctx.stroke();
  ctx.setLineDash([]);
  // the quill hand
  const qx = 7.6;
  const qy = frame >= 1 ? -22 : -16;
  ctx.strokeStyle = o;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(4.4, -19);
  ctx.lineTo(qx, qy);
  ctx.stroke();
  ctx.fillStyle = '#efe6cc';
  ctx.beginPath();
  ctx.moveTo(qx, qy);
  ctx.quadraticCurveTo(qx + 6, qy - 6, qx + 3, qy - 10);
  ctx.quadraticCurveTo(qx + 1, qy - 5, qx, qy);
  ctx.fill();
  // loose pages
  ctx.fillStyle = '#efe2c0';
  for (const [x, y, r] of [[-11, -20, 0.4], [-9, -30, -0.3], [11, -30, 0.5]]) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(r);
    ctx.fillRect(-1.6, -1.2, 3.2, 2.4);
    ctx.restore();
  }
  ctx.restore();
  levelStripes(ctx, level);
}

// ---------------------------------------------------------------- Titan Foundry

const IRON = '#5e6168';
const STEEL = '#8f969f';
const DARK = '#2c2c30';
const BRASS = '#c9a24a';
const EMBER = '#e07a2e';

/** Iron Hauler: a squat iron porter-machine with an ingot slung on one fist. */
function ironHauler(ctx, { frame = 0, facing = 1, level = 0 } = {}) {
  const o = '#151517';
  shadow(ctx, 10);
  ctx.save();
  ctx.scale(facing, 1);
  // stubby legs
  ctx.fillStyle = DARK;
  ctx.fillRect(-6, -6, 4, 6);
  ctx.fillRect(2, -6, 4, 6);
  // barrel body
  rrect(ctx, -8, -20, 16, 15, 4);
  blob(ctx, IRON, o, 1.2);
  ctx.fillStyle = shade(IRON, 0.18);
  ctx.fillRect(-6.6, -18.6, 3, 11.6);
  ctx.fillStyle = BRASS;
  ctx.fillRect(-8, -14, 16, 1.6);
  rivets(ctx, [-5.6, -9, -2, -9, 1.6, -9, 5.2, -9]);
  // head: a slit visor
  rrect(ctx, -4, -26, 8.6, 6.6, 1.6);
  blob(ctx, STEEL, o, 1);
  ctx.fillStyle = frame === 2 ? '#ffd56a' : EMBER;
  ctx.fillRect(-1.6, -23.6, 5, 1.2);
  // arm swinging the ingot
  const ang = frame === 1 ? -1.9 : frame === 2 ? 0.4 : -0.4;
  ctx.save();
  ctx.translate(7, -15);
  ctx.rotate(ang);
  ctx.fillStyle = DARK;
  ctx.fillRect(0, -1.6, 8, 3.2);
  rrect(ctx, 7, -3.6, 7, 7, 1);
  blob(ctx, '#d9a54a', o, 1);
  ctx.fillStyle = shade('#d9a54a', 0.3);
  ctx.fillRect(8, -2.6, 2, 5);
  ctx.restore();
  // back arm
  ctx.fillStyle = DARK;
  ctx.fillRect(-11, -16, 3.6, 8);
  ctx.restore();
  levelStripes(ctx, level);
}

/** Forge Brute: a hunched iron brute with an open furnace chest and a glowing forge hammer. */
function forgeBrute(ctx, { frame = 0, facing = 1, level = 0 } = {}) {
  const o = '#151210';
  shadow(ctx, 12);
  ctx.save();
  ctx.scale(facing, 1);
  ctx.fillStyle = DARK;
  ctx.fillRect(-7, -7, 5, 7);
  ctx.fillRect(3, -7, 5, 7);
  // hunched torso
  ctx.beginPath();
  ctx.moveTo(-11, -8);
  ctx.quadraticCurveTo(-13, -24, -2, -27);
  ctx.quadraticCurveTo(10, -27, 11, -8);
  ctx.closePath();
  blob(ctx, '#4a4440', o, 1.2);
  ctx.fillStyle = shade('#4a4440', 0.2);
  ctx.beginPath();
  ctx.moveTo(-10, -10);
  ctx.quadraticCurveTo(-11, -22, -4, -25);
  ctx.lineTo(-5, -10);
  ctx.fill();
  // furnace chest
  rrect(ctx, -3.6, -19, 8, 7, 1.4);
  blob(ctx, '#2a1a12', o, 0.9);
  ctx.fillStyle = frame === 2 ? '#ffc04a' : EMBER;
  ctx.fillRect(-2.4, -17.4, 5.6, 3.8);
  glow(ctx, 0.4, -15.4, 7, '240,140,60', 0.35);
  ctx.strokeStyle = '#2a1a12';
  ctx.lineWidth = 0.7;
  ctx.beginPath();
  for (let i = 0; i < 3; i++) {
    ctx.moveTo(-2.4 + i * 2, -17.4);
    ctx.lineTo(-2.4 + i * 2, -13.6);
  }
  ctx.stroke();
  // small head sunk between the shoulders
  rrect(ctx, -1, -31, 7, 6, 1.6);
  blob(ctx, STEEL, o, 1);
  ctx.fillStyle = EMBER;
  ctx.fillRect(2, -28.6, 2.6, 1);
  // the forge hammer
  const ang = frame === 1 ? -2.4 : frame === 2 ? 0.5 : -0.5;
  ctx.save();
  ctx.translate(9, -18);
  ctx.rotate(ang);
  ctx.fillStyle = '#5a3f2a';
  ctx.fillRect(0, -1, 13, 2);
  rrect(ctx, 11, -4.6, 6, 9.2, 1);
  blob(ctx, '#3a3634', o, 1);
  ctx.fillStyle = frame === 2 ? '#ffb04a' : '#c25a2a';
  ctx.fillRect(16, -4, 1, 8);
  ctx.restore();
  ctx.restore();
  levelStripes(ctx, level);
}

/** Molten Giant: a hulk of black rock split by glowing magma seams. */
function moltenGiant(ctx, { frame = 0, facing = 1, level = 0 } = {}) {
  const o = '#120a08';
  shadow(ctx, 13);
  ctx.save();
  ctx.scale(facing, 1);
  ctx.fillStyle = '#2a2220';
  ctx.beginPath();
  ctx.moveTo(-8, 0);
  ctx.lineTo(-6, -9);
  ctx.lineTo(-1, -9);
  ctx.lineTo(-2, 0);
  ctx.closePath();
  ctx.moveTo(2, 0);
  ctx.lineTo(1.6, -9);
  ctx.lineTo(7, -9);
  ctx.lineTo(8.6, 0);
  ctx.closePath();
  ctx.fill();
  // boulder body
  ctx.beginPath();
  ctx.moveTo(-12, -9);
  ctx.lineTo(-13, -22);
  ctx.lineTo(-7, -31);
  ctx.lineTo(3, -33);
  ctx.lineTo(11, -27);
  ctx.lineTo(13, -12);
  ctx.lineTo(8, -7);
  ctx.lineTo(-6, -6);
  ctx.closePath();
  blob(ctx, '#3a302c', o, 1.2);
  ctx.fillStyle = '#4e4340';
  poly(ctx, [-11, -12, -12, -21, -7, -29, -4, -24, -7, -14]);
  ctx.fill();
  // magma seams
  ctx.strokeStyle = frame === 2 ? '#ffd27a' : '#f08a3a';
  ctx.lineWidth = 1.3;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-3, -30);
  ctx.lineTo(0, -22);
  ctx.lineTo(-4, -15);
  ctx.lineTo(1, -9);
  ctx.moveTo(0, -22);
  ctx.lineTo(7, -18);
  ctx.moveTo(-4, -15);
  ctx.lineTo(-10, -16);
  ctx.stroke();
  glow(ctx, 0, -19, 11, '240,130,50', frame === 2 ? 0.45 : 0.28);
  // eyes
  ctx.fillStyle = '#ffd27a';
  ctx.fillRect(3, -28, 2, 1.2);
  ctx.fillRect(6.6, -27, 2, 1.2);
  // the throwing arm, cupping magma
  const up = frame >= 1;
  ctx.save();
  ctx.translate(10, -20);
  ctx.rotate(up ? -1.6 : -0.2);
  ctx.fillStyle = '#3a302c';
  ctx.fillRect(0, -2.6, 10, 5.2);
  ctx.strokeStyle = o;
  ctx.lineWidth = 1;
  ctx.strokeRect(0, -2.6, 10, 5.2);
  circle(ctx, 11, 0, 3.2);
  blob(ctx, frame === 2 ? '#ffb04a' : '#e0742e', o, 0.9);
  ctx.restore();
  ctx.restore();
  levelStripes(ctx, level);
}

/** Steel Colossus: a tall riveted steel giant with twin smokestacks and enormous fists. */
function steelColossus(ctx, { frame = 0, facing = 1, level = 0 } = {}) {
  const o = '#141517';
  shadow(ctx, 14);
  ctx.save();
  ctx.scale(facing, 1);
  // legs
  ctx.fillStyle = DARK;
  ctx.fillRect(-8, -12, 5.6, 12);
  ctx.fillRect(2.6, -12, 5.6, 12);
  ctx.fillStyle = STEEL;
  ctx.fillRect(-8.6, -2.4, 6.8, 2.6);
  ctx.fillRect(2, -2.4, 6.8, 2.6);
  // smokestacks behind the shoulders
  ctx.fillStyle = '#3a3a3e';
  ctx.fillRect(-10, -44, 3.6, 10);
  ctx.fillRect(6.6, -44, 3.6, 10);
  ctx.fillStyle = BRASS;
  ctx.fillRect(-10.4, -44.6, 4.4, 1.4);
  ctx.fillRect(6.2, -44.6, 4.4, 1.4);
  // torso
  poly(ctx, [-13, -36, 13, -36, 10, -12, -10, -12]);
  blob(ctx, STEEL, o, 1.3);
  ctx.fillStyle = shade(STEEL, 0.2);
  poly(ctx, [-12, -35, -6, -35, -7, -13, -9.6, -13]);
  ctx.fill();
  ctx.fillStyle = '#5e6168';
  ctx.fillRect(-10.6, -24, 21.2, 2.2);
  rivets(ctx, [-9, -33, -3, -33, 3, -33, 9, -33, -8, -16, 8, -16]);
  // chest core
  circle(ctx, 0, -29, 3);
  blob(ctx, '#2a2a30', o, 0.9);
  ctx.fillStyle = frame === 2 ? '#bfe6ff' : '#6fa8d8';
  circle(ctx, 0, -29, 1.6);
  ctx.fill();
  // head
  rrect(ctx, -3.6, -42, 7.2, 6.6, 1.4);
  blob(ctx, '#a8afb8', o, 1);
  ctx.fillStyle = '#1a1c20';
  ctx.fillRect(-2.4, -39.6, 5, 1.2);
  // fists: raised together for the slam wind-up, driven down on release
  const fy = frame === 1 ? -42 : frame === 2 ? -6 : -16;
  for (const sx of [-1, 1]) {
    ctx.fillStyle = '#4a4c52';
    ctx.fillRect(sx * 12 - 2, -34, 4, Math.max(2, fy + 34 - 2));
    rrect(ctx, sx * 13 - 4, fy - 4, 8, 8, 1.6);
    blob(ctx, '#a8afb8', o, 1.1);
  }
  ctx.restore();
  levelStripes(ctx, level);
}

/** Warforged Titan: an armoured war machine with a shoulder cannon and a tower shield. */
function warforgedTitan(ctx, { frame = 0, facing = 1, level = 0 } = {}) {
  const o = '#13110f';
  shadow(ctx, 14);
  ctx.save();
  ctx.scale(facing, 1);
  ctx.fillStyle = DARK;
  ctx.fillRect(-8, -11, 5.6, 11);
  ctx.fillRect(2.4, -11, 5.6, 11);
  // tower shield on the back arm
  rrect(ctx, -16, -32, 8, 24, 2);
  blob(ctx, '#6b4a2a', o, 1.1);
  ctx.fillStyle = BRASS;
  ctx.fillRect(-16, -22, 8, 1.6);
  poly(ctx, [-12, -29, -10, -26, -12, -23, -14, -26]);
  ctx.fill();
  // armoured torso: dark bronze plates
  poly(ctx, [-10, -34, 11, -34, 9, -11, -9, -11]);
  blob(ctx, '#6a5a44', o, 1.3);
  ctx.fillStyle = '#8a7656';
  poly(ctx, [-9, -33, -3, -33, -4, -12, -8, -12]);
  ctx.fill();
  ctx.fillStyle = '#4a3f30';
  ctx.fillRect(-9.4, -24, 19, 2);
  rivets(ctx, [-7, -31, 0, -31, 7, -31]);
  // horned helm
  rrect(ctx, -4, -41, 8.4, 7.4, 1.6);
  blob(ctx, '#7a6a50', o, 1);
  ctx.fillStyle = '#e07a2e';
  ctx.fillRect(-1.4, -38.4, 4.6, 1.1);
  ctx.fillStyle = '#d9cdb5';
  ctx.beginPath();
  ctx.moveTo(-3.6, -40);
  ctx.quadraticCurveTo(-9, -44, -8, -48);
  ctx.quadraticCurveTo(-6, -43, -2, -41.4);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(4, -40);
  ctx.quadraticCurveTo(9.4, -44, 8.4, -48);
  ctx.quadraticCurveTo(6.4, -43, 2.4, -41.4);
  ctx.fill();
  // shoulder cannon, recoiling on release
  const rec = frame === 2 ? -2 : 0;
  ctx.save();
  ctx.translate(6 + rec, -35);
  ctx.rotate(frame >= 1 ? -0.12 : 0.05);
  rrect(ctx, -2, -3.4, 15, 6.8, 1.4);
  blob(ctx, '#3a3a3e', o, 1);
  ctx.fillStyle = BRASS;
  ctx.fillRect(10, -3.6, 1.6, 7.2);
  ctx.restore();
  if (frame === 2) glow(ctx, 22, -35, 7, '255,200,120', 0.55);
  ctx.restore();
  levelStripes(ctx, level);
}

/**
 * The Worldbreaker: the largest unit in the game. A colossal titan of black
 * iron and cooling magma, crowned with horns, carrying a maul the size of a
 * house. The ground cracks beneath it; on the wind-up the maul rises high.
 */
function worldbreaker(ctx, { frame = 0, facing = 1, level = 0 } = {}) {
  const o = '#0e0a08';
  shadow(ctx, 20);
  ctx.save();
  ctx.scale(facing, 1);
  // cracked ground
  ctx.strokeStyle = 'rgba(240,130,50,0.7)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-16, 2);
  ctx.lineTo(-9, -0.5);
  ctx.lineTo(-4, 2);
  ctx.moveTo(6, 1.6);
  ctx.lineTo(12, -0.4);
  ctx.lineTo(18, 2);
  ctx.stroke();
  // legs
  ctx.fillStyle = '#2a2422';
  poly(ctx, [-12, 0, -11, -16, -3, -16, -4, 0]);
  ctx.fill();
  poly(ctx, [4, 0, 3, -16, 11, -16, 13, 0]);
  ctx.fill();
  ctx.fillStyle = '#4a3f3a';
  ctx.fillRect(-13, -3, 10, 3);
  ctx.fillRect(3, -3, 11, 3);
  // torso: a wedge of black iron, magma in the joints
  poly(ctx, [-17, -46, 17, -46, 13, -15, -13, -15]);
  blob(ctx, '#2e2826', o, 1.5);
  ctx.fillStyle = '#433a36';
  poly(ctx, [-16, -45, -9, -45, -9.6, -16, -12.6, -16]);
  ctx.fill();
  // pauldrons
  for (const sx of [-1, 1]) {
    ell(ctx, sx * 16, -45, 7, 5);
    blob(ctx, '#3a3230', o, 1.2);
    ctx.fillStyle = BRASS;
    ctx.fillRect(sx * 16 - 5, -46.4, 10, 1.4);
  }
  // magma heart and seams
  ctx.strokeStyle = frame === 2 ? '#ffe08a' : '#f08a3a';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(-10, -40);
  ctx.lineTo(-3, -32);
  ctx.lineTo(3, -32);
  ctx.lineTo(10, -40);
  ctx.moveTo(0, -32);
  ctx.lineTo(0, -18);
  ctx.moveTo(-8, -22);
  ctx.lineTo(8, -22);
  ctx.stroke();
  circle(ctx, 0, -32, 3.6);
  blob(ctx, frame === 2 ? '#ffd27a' : '#e0742e', o, 1);
  glow(ctx, 0, -32, 14, '240,130,50', frame === 2 ? 0.5 : 0.3);
  // horned helm
  rrect(ctx, -5.6, -57, 11.2, 10, 2.4);
  blob(ctx, '#3a3230', o, 1.2);
  ctx.fillStyle = '#ffb04a';
  ctx.fillRect(-3, -53, 7, 1.4);
  ctx.fillStyle = '#e6dcc4';
  ctx.strokeStyle = o;
  ctx.lineWidth = 0.9;
  for (const sx of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(sx * 5, -55);
    ctx.quadraticCurveTo(sx * 14, -58, sx * 13, -66);
    ctx.quadraticCurveTo(sx * 10, -60, sx * 3.6, -57.6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  // the maul: hangs at rest, raised overhead on the wind-up, driven down on release
  const ang = frame === 1 ? -2.5 : frame === 2 ? 0.55 : -0.25;
  ctx.save();
  ctx.translate(15, -36);
  ctx.rotate(ang);
  ctx.fillStyle = '#4a3a2a';
  ctx.fillRect(0, -1.8, 26, 3.6);
  rrect(ctx, 22, -9, 12, 18, 2);
  blob(ctx, '#3a3634', o, 1.3);
  ctx.fillStyle = BRASS;
  ctx.fillRect(22, -3, 12, 1.6);
  ctx.fillStyle = frame === 2 ? '#ffd27a' : '#c25a2a';
  ctx.fillRect(33, -8, 1.4, 16);
  ctx.restore();
  // off hand: a clenched fist
  rrect(ctx, -22, -32, 7, 7, 1.6);
  blob(ctx, '#3a3230', o, 1.1);
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
/** Heavy machines: a long wind-up, a solid hit, then a slow settle. */
const heavy = (wind = 0.45, hold = 0.22) => (u, t) => {
  if (special(u, t) < 0.7) return { frame: 2, dy: 0.6 };
  const s = since(u, t);
  if (s < hold) return { frame: 2, dy: 0.5 };
  if (u.hasTarget && u.cooldown < wind) return { frame: 1, dy: -0.5 };
  return { frame: 0, dy: Math.sin(t * 1.2 + u.uid) * 0.35 };
};
const hover = (amp = 1.2, speed = 1.8) => (u, t) => ({ ...caster(u, t), dy: Math.sin(t * speed + u.uid) * amp });

const ANIM = {
  squire: melee(0.12),
  traineeGuard: melee(0.12),
  practiceArcher: ranged(0.1),
  duelist: melee(0.09),
  battleInstructor: caster,
  royalGraduate: (u, t) => (special(u, t) < 0.5 ? { frame: 2, dx: 2 } : melee(0.12)(u, t)),
  grandmaster: (u, t) => (special(u, t) < 0.8 ? { frame: 1, dy: -0.6 } : melee(0.14)(u, t)),
  frostRecruit: melee(0.12),
  iceArcher: ranged(0.1),
  snowBerserker: melee(0.16),
  frostMage: caster,
  glacierKnight: (u, t) => (special(u, t) < 0.5 ? { frame: 2, dy: 0.6 } : melee(0.14)(u, t)),
  winterGeneral: caster,
  eternalWinter: hover(1, 1.2),
  pageApprentice: ranged(0.12),
  runeCaster: ranged(0.14),
  spellblade: (u, t) => (special(u, t) < 0.35 ? { frame: 2, dx: 2 } : melee(0.08)(u, t)),
  arcaneScholar: caster,
  voidReader: ranged(0.14),
  archmage: caster,
  forbiddenAuthor: hover(1.4, 1.5),
  ironHauler: heavy(0.4, 0.2),
  forgeBrute: heavy(0.6, 0.25),
  moltenGiant: heavy(0.5, 0.25),
  steelColossus: heavy(0.6, 0.3),
  warforgedTitan: heavy(0.3, 0.16),
  foundryOverseer: caster,
  worldbreaker: (u, t) => {
    // the long charge before the map-wide slam: the maul stays raised
    if (u.charging) return { frame: 1, dy: -1, dx: Math.sin(t * 40) * 0.4 };
    return heavy(0.7, 0.32)(u, t);
  },
};

/** Draws a painter at `s` × its authored size (giants are authored large, then fitted to the battlefield). */
const sized = (s, paint) => (ctx, opts) => {
  ctx.save();
  ctx.scale(s, s);
  paint(ctx, opts);
  ctx.restore();
};

for (const [key, f] of Object.entries(PEOPLE)) registerPainter(key, figure(f), ANIM[key]);
// [painter, authored scale, sprite box] – the box holds the full swing of each weapon
const PAINTERS = {
  eternalWinter: [eternalWinter, 1, { left: -21, right: 21, top: -40, bottom: 8 }],
  forbiddenAuthor: [forbiddenAuthor, 1, { left: -21, right: 21, top: -38, bottom: 8 }],
  ironHauler: [ironHauler, 0.95, null],
  forgeBrute: [forgeBrute, 0.92, { left: -22, right: 26, top: -36, bottom: 8 }],
  moltenGiant: [moltenGiant, 0.9, { left: -22, right: 26, top: -36, bottom: 8 }],
  steelColossus: [steelColossus, 0.82, { left: -22, right: 22, top: -42, bottom: 8 }],
  warforgedTitan: [warforgedTitan, 0.8, { left: -22, right: 26, top: -42, bottom: 8 }],
  worldbreaker: [worldbreaker, 0.72, { left: -26, right: 38, top: -52, bottom: 10 }],
};
for (const [key, [p, s, box]] of Object.entries(PAINTERS)) registerPainter(key, s === 1 ? p : sized(s, p), ANIM[key], { box });

export const PACK3_ART_KEYS = [...Object.keys(PEOPLE), ...Object.keys(PAINTERS)];
