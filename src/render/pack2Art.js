// Artwork for Circle Pack 2: Traveling Caravan, Clockwork Atelier, Jungle
// Covenant, Skybound Order and Astral Observatory. House style as everywhere:
// light from the top-left, flat fills, one dark hue-tinted outline, no glow
// except real light sources (lamps, sparks, starlight), kept small.
//
// People use the shared parametric figure (castArt.js) with new hats, props
// and back layers registered below. Machines, animals, plants and cosmic
// beings have their own painters. Frames: 0 idle, 1 wind-up / aim, 2 release.

import { circle } from './canvas.js';
import { shade } from '../core/color.js';
import { registerPainter, shadow, levelStripes, muzzleFlash } from './unitArt.js';
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
function gear(ctx, x, y, r, teeth, rot, fill, o) {
  ctx.beginPath();
  for (let i = 0; i < teeth * 2; i++) {
    const a = rot + (i / (teeth * 2)) * TAU;
    const rr = i % 2 ? r * 0.78 : r;
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
  blob(ctx, fill, o, 0.8);
  ctx.fillStyle = shade(fill, -0.45);
  circle(ctx, x, y, r * 0.3);
  ctx.fill();
}

// ---------------------------------------------------------------- hats

Object.assign(EXTRA_HATS, {
  turban(ctx, h, o) {
    ell(ctx, 0.4, -24.4, 6.4, 3.6);
    blob(ctx, h.color, o, 1.1);
    ctx.strokeStyle = shade(h.color, -0.3);
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(-5, -23.4);
    ctx.quadraticCurveTo(0, -27.4, 5.6, -24.6);
    ctx.moveTo(-5.2, -25.4);
    ctx.quadraticCurveTo(0, -28.6, 5.2, -26.6);
    ctx.stroke();
    if (h.jewel) {
      ctx.fillStyle = h.jewel;
      circle(ctx, 0.6, -25.6, 1.3);
      ctx.fill();
    }
    if (h.plume) {
      ctx.strokeStyle = h.plume;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(1, -27);
      ctx.quadraticCurveTo(2.5, -32, -1, -33);
      ctx.stroke();
    }
  },
  wrap(ctx, h, o) {
    ell(ctx, 0.4, -24, 6, 2.6);
    blob(ctx, h.color, o, 1);
    ctx.fillStyle = shade(h.color, -0.25);
    ctx.fillRect(-6.4, -23, 2.2, 3.4);
  },
  toque(ctx, h, o) {
    ctx.beginPath();
    ctx.rect(-4.2, -27.5, 9, 4);
    blob(ctx, '#f4f1ea', o, 1);
    ctx.beginPath();
    ctx.arc(-1.8, -29, 3, 0, TAU);
    ctx.arc(1.2, -30.2, 3.2, 0, TAU);
    ctx.arc(3.8, -28.8, 2.8, 0, TAU);
    blob(ctx, '#f4f1ea', o, 1);
  },
  tricorn(ctx, h, o) {
    ctx.beginPath();
    ctx.moveTo(-7.4, -23.4);
    ctx.quadraticCurveTo(0.5, -31.5, 8.4, -23.4);
    ctx.quadraticCurveTo(0.5, -26, -7.4, -23.4);
    blob(ctx, h.color, o, 1.1);
    if (h.trim) {
      ctx.strokeStyle = h.trim;
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.moveTo(-6.6, -23.8);
      ctx.quadraticCurveTo(0.5, -30.4, 7.6, -23.8);
      ctx.stroke();
    }
  },
  headdress(ctx, h, o) {
    ctx.fillStyle = h.band ?? '#c9a24a';
    ctx.fillRect(-5.6, -24.6, 11.6, 2);
    const cols = h.feathers ?? ['#2fae8a', '#e0742e', '#e8c255', '#2fae8a', '#b7353a'];
    cols.forEach((c, i) => {
      const a = -Math.PI / 2 + (i - 2) * 0.32;
      ctx.save();
      ctx.translate(0.3 + (i - 2) * 2.2, -24.6);
      ctx.rotate(a + Math.PI / 2);
      ell(ctx, 0, -4.2, 1.3, 4.4);
      blob(ctx, c, o, 0.6);
      ctx.restore();
    });
  },
  leafcrown(ctx, h, o) {
    for (let i = 0; i < 6; i++) {
      const x = -5 + i * 2.1;
      ctx.save();
      ctx.translate(x, -24.6);
      ctx.rotate((i - 2.5) * 0.28);
      ell(ctx, 0, -2.6, 1.4, 3);
      blob(ctx, i % 2 ? h.color : shade(h.color, 0.2), o, 0.6);
      ctx.restore();
    }
    if (h.antlers) {
      ctx.strokeStyle = h.antlers;
      ctx.lineWidth = 1.3;
      ctx.lineCap = 'round';
      ctx.beginPath();
      for (const s of [-1, 1]) {
        ctx.moveTo(0.5 + s * 3, -27);
        ctx.lineTo(0.5 + s * 6.5, -32.5);
        ctx.moveTo(0.5 + s * 5, -30);
        ctx.lineTo(0.5 + s * 8, -30.4);
      }
      ctx.stroke();
    }
  },
  mushroom(ctx, h, o) {
    ctx.beginPath();
    ctx.moveTo(-8.4, -23.8);
    ctx.quadraticCurveTo(0.5, -36, 9.4, -23.8);
    ctx.closePath();
    blob(ctx, h.color, o, 1.1);
    ctx.fillStyle = 'rgba(255,248,230,0.9)';
    for (const [x, y, r] of [[-3.6, -27, 1.3], [2.2, -30, 1.6], [5.6, -26.2, 1.1]]) {
      circle(ctx, x, y, r);
      ctx.fill();
    }
  },
  aviator(ctx, h, o) {
    ctx.beginPath();
    ctx.arc(0.4, -22.6, 6, Math.PI, 0);
    ctx.closePath();
    blob(ctx, h.color, o, 1.1);
    ctx.fillStyle = shade(h.color, -0.25);
    ctx.fillRect(-6, -22.8, 2.4, 5);
    for (const gx of [-1, 2.8]) {
      ctx.fillStyle = '#c9cfd8';
      circle(ctx, gx, -24, 1.8);
      ctx.fill();
      ctx.fillStyle = '#7fc4e8';
      circle(ctx, gx, -24, 1.1);
      ctx.fill();
    }
  },
  winghelm(ctx, h, o) {
    ctx.beginPath();
    ctx.arc(0.4, -22.4, 6.1, Math.PI, 0);
    ctx.closePath();
    blob(ctx, h.color, o, 1.1);
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(0.4 + s * 5, -24);
      ctx.quadraticCurveTo(0.4 + s * 10, -27, 0.4 + s * 9, -31);
      ctx.quadraticCurveTo(0.4 + s * 7, -27, 0.4 + s * 4.6, -26.6);
      ctx.closePath();
      blob(ctx, '#f2f4f8', o, 0.8);
    }
  },
  wizard(ctx, h, o) {
    ell(ctx, 0.4, -23.6, 8.4, 2);
    blob(ctx, h.color, o, 1);
    ctx.beginPath();
    ctx.moveTo(-4.6, -23.8);
    ctx.quadraticCurveTo(1, -30, 4.2, -35);
    ctx.quadraticCurveTo(3.6, -29, 5.4, -23.8);
    ctx.closePath();
    blob(ctx, h.color, o, 1);
    ctx.fillStyle = h.star ?? '#f2d38a';
    for (const [x, y] of [[0.6, -27], [3, -31]]) {
      ctx.beginPath();
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * TAU;
        const r = i % 2 ? 0.5 : 1.3;
        ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
      }
      ctx.fill();
    }
  },
  crown(ctx, h, o) {
    ctx.beginPath();
    ctx.moveTo(-4.6, -24);
    ctx.lineTo(-5, -29);
    ctx.lineTo(-2.4, -26.4);
    ctx.lineTo(0.4, -30.4);
    ctx.lineTo(3.2, -26.4);
    ctx.lineTo(5.8, -29);
    ctx.lineTo(5.4, -24);
    ctx.closePath();
    blob(ctx, h.color, o, 1);
    if (h.jewel) {
      ctx.fillStyle = h.jewel;
      circle(ctx, 0.4, -25.6, 1.2);
      ctx.fill();
    }
  },
  halo(ctx, h, o) {
    EXTRA_HATS.hairtie(ctx, { color: h.hair ?? '#e8d9b0' }, o);
    ctx.strokeStyle = h.color;
    ctx.lineWidth = 1.4;
    ell(ctx, 0.4, -30, 6, 1.8);
    ctx.stroke();
  },
  hairtie(ctx, h, o) {
    ctx.beginPath();
    ctx.moveTo(-5.6, -20);
    ctx.quadraticCurveTo(-6, -27, 0.4, -26.6);
    ctx.quadraticCurveTo(6.8, -27, 6.2, -20);
    ctx.lineTo(4.6, -22.6);
    ctx.lineTo(-4, -22.6);
    ctx.closePath();
    blob(ctx, h.color, o, 1);
  },
});

// ---------------------------------------------------------------- hand-held props

function staffAt(ctx, f, frame, o, hx, hy) {
  const raise = frame >= 1 ? -2.5 : 0;
  ctx.strokeStyle = f.staff ?? '#6b4a2c';
  ctx.lineWidth = 1.6;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(hx - 0.4, hy + 6);
  ctx.lineTo(hx + 0.6, hy - 13 + raise);
  ctx.stroke();
  const ox = hx + 0.7;
  const oy = hy - 14.5 + raise;
  if (frame === 2 || f.orbGlow) {
    ctx.fillStyle = `${f.orb ?? '#9fd0e8'}55`;
    circle(ctx, ox, oy, 4.2);
    ctx.fill();
  }
  ctx.fillStyle = f.orb ?? '#9fd0e8';
  ctx.strokeStyle = o;
  ctx.lineWidth = 0.8;
  circle(ctx, ox, oy, 2.2);
  ctx.fill();
  ctx.stroke();
}

Object.assign(EXTRA_PROPS, {
  staff: staffAt,
  parcel(ctx, f, frame, o, hx, hy) {
    ctx.save();
    ctx.translate(hx, hy - (frame >= 1 ? 3 : 0));
    ctx.fillStyle = '#b48a5a';
    ctx.strokeStyle = o;
    ctx.lineWidth = 0.8;
    ctx.fillRect(-2.4, -2.6, 4.8, 4.2);
    ctx.strokeRect(-2.4, -2.6, 4.8, 4.2);
    ctx.strokeStyle = '#6b4a2c';
    ctx.beginPath();
    ctx.moveTo(0, -2.6);
    ctx.lineTo(0, 1.6);
    ctx.stroke();
    ctx.restore();
  },
  pan(ctx, f, frame, o, hx, hy) {
    ctx.save();
    ctx.translate(hx, hy);
    ctx.rotate(frame === 2 ? -1.2 : frame === 1 ? 0.6 : 1.2);
    ctx.fillStyle = '#2a2826';
    ctx.fillRect(0, -0.7, 4.5, 1.4);
    ell(ctx, 7.2, 0, 3, 2.6);
    blob(ctx, '#3a3836', o, 0.8);
    ctx.restore();
  },
  coinbag(ctx, f, frame, o, hx, hy) {
    ell(ctx, hx + 0.4, hy + 1, 2.8, 3.2);
    blob(ctx, f.bag ?? '#8a5a2a', o, 0.8);
    ctx.fillStyle = '#e8c255';
    circle(ctx, hx + 0.6, hy - 2.4, 1.3);
    ctx.fill();
    if (frame === 2) {
      ctx.fillStyle = '#f2d38a';
      circle(ctx, hx + 4, hy - 5, 1.2);
      ctx.fill();
    }
  },
  map(ctx, f, frame, o, hx, hy) {
    ctx.save();
    ctx.translate(hx - 1, hy - 2);
    ctx.fillStyle = '#e8dcc0';
    ctx.strokeStyle = '#6b521c';
    ctx.lineWidth = 0.6;
    ctx.fillRect(-1, -3, 6.4, 5);
    ctx.strokeRect(-1, -3, 6.4, 5);
    ctx.strokeStyle = '#b7353a';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(2, -1.6);
    ctx.lineTo(4.4, 0.6);
    ctx.stroke();
    ctx.restore();
  },
  clockstaff(ctx, f, frame, o, hx, hy) {
    ctx.strokeStyle = '#8a6a3a';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(hx, hy + 6);
    ctx.lineTo(hx + 0.5, hy - 11);
    ctx.stroke();
    ctx.fillStyle = '#f2ead8';
    ctx.strokeStyle = '#8a6a3a';
    ctx.lineWidth = 1.2;
    circle(ctx, hx + 0.6, hy - 13.5, 3.4);
    ctx.fill();
    ctx.stroke();
    const a = frame === 2 ? 1.6 : -0.6;
    ctx.strokeStyle = '#2a2420';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(hx + 0.6, hy - 13.5);
    ctx.lineTo(hx + 0.6 + Math.cos(a) * 2.6, hy - 13.5 + Math.sin(a) * 2.6);
    ctx.moveTo(hx + 0.6, hy - 13.5);
    ctx.lineTo(hx + 0.6, hy - 15.6);
    ctx.stroke();
  },
  blowgun(ctx, f, frame, o) {
    ctx.save();
    ctx.translate(2.5, -18.8);
    ctx.rotate(frame >= 1 ? -0.05 : 0.6);
    ctx.fillStyle = '#7a5a2a';
    ctx.fillRect(0, -0.7, 12, 1.4);
    ctx.fillStyle = '#c9a24a';
    ctx.fillRect(3, -0.9, 1, 1.8);
    ctx.fillRect(8, -0.9, 1, 1.8);
    ctx.restore();
  },
  lance(ctx, f, frame, o, hx, hy) {
    ctx.save();
    ctx.translate(hx - 2, hy);
    ctx.rotate(frame === 2 ? -0.05 : frame === 1 ? -0.35 : -1.1);
    ctx.fillStyle = '#d9dde6';
    ctx.fillRect(-4, -0.8, 18, 1.6);
    ctx.beginPath();
    ctx.moveTo(14, -1.8);
    ctx.lineTo(19, 0);
    ctx.lineTo(14, 1.8);
    ctx.closePath();
    blob(ctx, '#eef2f8', o, 0.6);
    ctx.fillStyle = f.pennant ?? '#6fa8d8';
    ctx.beginPath();
    ctx.moveTo(10, -0.8);
    ctx.lineTo(6, -4);
    ctx.lineTo(6, -0.8);
    ctx.fill();
    ctx.restore();
  },
  telescope(ctx, f, frame, o) {
    ctx.save();
    ctx.translate(3, -18);
    ctx.rotate(frame >= 1 ? -0.5 : 0.4);
    ctx.fillStyle = '#c9a24a';
    ctx.strokeStyle = o;
    ctx.lineWidth = 0.7;
    ctx.fillRect(0, -1.3, 5, 2.6);
    ctx.strokeRect(0, -1.3, 5, 2.6);
    ctx.fillStyle = '#2a2450';
    ctx.fillRect(5, -1.7, 4.5, 3.4);
    ctx.strokeRect(5, -1.7, 4.5, 3.4);
    ctx.restore();
  },
  quill(ctx, f, frame, o, hx, hy) {
    ctx.save();
    ctx.translate(hx, hy);
    ctx.rotate(frame === 2 ? -0.6 : -1.2);
    ell(ctx, 4, 0, 4.6, 1.3);
    blob(ctx, '#f4f1ea', o, 0.6);
    ctx.fillStyle = '#7fd4ff';
    circle(ctx, -0.6, 0, 1);
    ctx.fill();
    ctx.restore();
  },
  dividers(ctx, f, frame, o, hx, hy) {
    ctx.strokeStyle = '#c9cfd8';
    ctx.lineWidth = 1;
    const open = frame >= 1 ? 3 : 1.4;
    ctx.beginPath();
    ctx.moveTo(hx, hy - 4);
    ctx.lineTo(hx - open, hy + 4);
    ctx.moveTo(hx, hy - 4);
    ctx.lineTo(hx + open, hy + 4);
    ctx.stroke();
    ctx.fillStyle = '#c9a24a';
    circle(ctx, hx, hy - 4, 1);
    ctx.fill();
  },
});

// ---------------------------------------------------------------- behind the body

Object.assign(EXTRA_BEHIND, {
  backpack(ctx, f, o) {
    ctx.beginPath();
    ctx.roundRect(-9.6, -19, 7.6, 13, 1.6);
    blob(ctx, '#8a6a3a', o, 1);
    ctx.fillStyle = '#6b4a2c';
    ctx.fillRect(-9.6, -15, 7.6, 1.4);
    ctx.beginPath();
    ctx.roundRect(-8.8, -24, 6, 5.4, 1);
    blob(ctx, '#b7353a', o, 0.8);
    ctx.strokeStyle = '#5a4a32';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(-10.6, -21);
    ctx.lineTo(-1, -21);
    ctx.stroke();
  },
  gearpack(ctx, f, o) {
    ctx.beginPath();
    ctx.roundRect(-9.4, -18, 6.8, 11, 1.4);
    blob(ctx, '#6b5a3a', o, 1);
    gear(ctx, -6, -19, 3, 8, 0.3, '#c9a24a', o);
    ctx.strokeStyle = '#d9d4c8';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-8, -18);
    ctx.quadraticCurveTo(-10, -22, -8.6, -25);
    ctx.stroke();
  },
  cape(ctx, f, o) {
    ctx.beginPath();
    ctx.moveTo(-5.6, -15);
    ctx.quadraticCurveTo(-10, -6, -8, -0.8);
    ctx.lineTo(2, -1.4);
    ctx.lineTo(4.8, -15);
    ctx.closePath();
    blob(ctx, f.capeColor ?? '#6fa8d8', o, 1);
  },
  stormcape(ctx, f, o, frame) {
    const flare = frame >= 1 ? 2 : 0;
    ctx.beginPath();
    ctx.moveTo(-5.6, -15.4);
    ctx.quadraticCurveTo(-13 - flare, -8, -12 - flare, 0);
    ctx.lineTo(-7, -2.6);
    ctx.lineTo(-4, 0.4);
    ctx.lineTo(4.8, -15.4);
    ctx.closePath();
    blob(ctx, f.capeColor ?? '#3a4a6a', o, 1);
    ctx.strokeStyle = '#cfe4ff';
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.moveTo(-9, -8);
    ctx.lineTo(-7.4, -6);
    ctx.lineTo(-9, -4);
    ctx.stroke();
  },
  wings(ctx, f, o, frame) {
    const up = frame >= 1 ? -2 : 0;
    for (const s of [-1, 0.6]) {
      ctx.beginPath();
      ctx.moveTo(-1 + s * 2, -14);
      ctx.quadraticCurveTo(-1 + s * 12, -22 + up, -1 + s * 10, -10 + up);
      ctx.quadraticCurveTo(-1 + s * 6, -12, -1 + s * 2, -10);
      ctx.closePath();
      blob(ctx, '#f2f4f8', o, 0.8);
    }
  },
  sporecloud(ctx) {
    ctx.fillStyle = 'rgba(160,200,90,0.22)';
    for (const [x, y, r] of [[-7, -16, 5], [-2, -21, 4.2], [6, -18, 4.6]]) {
      circle(ctx, x, y, r);
      ctx.fill();
    }
  },
  nebula(ctx) {
    ctx.fillStyle = 'rgba(150,110,220,0.22)';
    for (const [x, y, r] of [[-8, -14, 6], [6, -20, 5], [-1, -24, 4.4]]) {
      circle(ctx, x, y, r);
      ctx.fill();
    }
    ctx.fillStyle = '#f2ead8';
    for (const [x, y] of [[-9, -16], [7, -21], [-3, -26], [4, -13]]) ctx.fillRect(x, y, 0.9, 0.9);
  },
  eclipse(ctx, f, o) {
    ctx.fillStyle = 'rgba(242,211,138,0.5)';
    circle(ctx, 0.4, -20, 9.4);
    ctx.fill();
    ctx.fillStyle = '#16122a';
    circle(ctx, 0.4, -20, 8.4);
    ctx.fill();
    ctx.strokeStyle = o;
    ctx.lineWidth = 0.6;
    ctx.stroke();
  },
  horizon(ctx) {
    ctx.strokeStyle = 'rgba(180,150,255,0.65)';
    ctx.lineWidth = 1.4;
    ell(ctx, 0.4, -18, 12, 4, -0.25);
    ctx.stroke();
    ctx.fillStyle = '#0d0a18';
    circle(ctx, 0.4, -18, 4);
    ctx.fill();
  },
});

// ---------------------------------------------------------------- people

const CARAVAN = { outline: '#1d1610' };
const CLOCK = { outline: '#17140f' };
const JUNGLE = { outline: '#13190f' };
const SKY = { outline: '#141a26' };
const STAR = { outline: '#120f22' };

const PEOPLE = {
  // ---- Traveling Caravan: sand, saffron, teal and leather
  porter: { ...CARAVAN, skin: '#c99a74', top: '#b9a27a', pants: '#6b5a3a', boots: '#3a2a1a', hat: { type: 'wrap', color: '#e0c38a' }, weapon: 'parcel', behind: 'backpack', extras: ['smile'] },
  caravanScout: { ...CARAVAN, skin: '#d4a07a', top: '#3f7a7a', pants: '#5a4a32', boots: '#3a2a1a', hat: { type: 'hood', color: '#2f6a6a' }, weapon: 'bow', behind: 'cape', capeColor: '#2a5a5a', scarf: '#e0c38a', extras: ['squint'] },
  campCook: { ...CARAVAN, skin: '#e2b08a', top: '#e6e1d6', vest: '#f4f1ea', pants: '#4a3f33', boots: '#2a1d14', hat: { type: 'toque' }, weapon: 'pan', belt: '#6b4a2c', extras: ['mustache', 'smile'], hairColor: '#3a2618', wide: true },
  travelingTrader: { ...CARAVAN, skin: '#c48f69', top: '#7a3a6a', coat: { color: '#5a2a50', long: true }, pants: '#3a2f2a', boots: '#24190f', hat: { type: 'turban', color: '#e0a23a', jewel: '#2fae8a' }, weapon: 'coinbag', sash: '#e0a23a', extras: ['beard', 'smile'], hairColor: '#2a1d14' },
  cartographer: { ...CARAVAN, skin: '#e0ad86', top: '#e6e1d6', coat: { color: '#3f5a3a', long: true }, pants: '#4a3f33', boots: '#2a1d14', hat: { type: 'tricorn', color: '#5a3f2a', trim: '#c9a24a' }, weapon: 'map', extras: ['squint'] },
  caravanMaster: { ...CARAVAN, skin: '#c99a74', top: '#e6d8b8', coat: { color: '#8a2f2a', long: true }, pants: '#3a2f2a', boots: '#24190f', hat: { type: 'turban', color: '#2f3f6a', jewel: '#e8c255', plume: '#f4f1ea' }, weapon: 'pistol', gunColor: '#c9a24a', sash: '#e8c255', belt: '#3b2a1a', extras: ['beard'], hairColor: '#2a1d14', wide: true },
  goldenMerchant: { ...CARAVAN, skin: '#d9a47c', top: '#f2d38a', coat: { color: '#c9962a', long: true }, pants: '#5a2a50', boots: '#24190f', hat: { type: 'turban', color: '#f2d38a', jewel: '#b7353a', plume: '#7a3a6a' }, weapon: 'coinbag', bag: '#c9962a', behind: 'cape', capeColor: '#5a2a50', medals: 3, extras: ['beard', 'smile'], hairColor: '#3a2618', wide: true },
  // ---- Clockwork Atelier
  chronoMechanic: { ...CLOCK, skin: '#e6b48f', top: '#6b5a3a', coat: { color: '#4a3a2a', long: true }, pants: '#3a3530', boots: '#24211d', hat: { type: 'goggles', hair: '#d9d6cc' }, weapon: 'clockstaff', behind: 'gearpack', belt: '#c9a24a', extras: ['mustache'], hairColor: '#d9d6cc' },
  // ---- Jungle Covenant: greens, bark, jade, gold
  vineTender: { ...JUNGLE, skin: '#9a6a4a', top: '#4f7a3a', pants: '#3f4a2a', boots: '#2a2416', hat: { type: 'leafcrown', color: '#5f9a3a' }, weapon: 'staff', staff: '#5a3f2a', orb: '#8fd45a', extras: ['smile'] },
  dartkeeper: { ...JUNGLE, skin: '#8a5a3a', top: '#2f6a4a', pants: '#3f4a2a', boots: '#2a2416', hat: { type: 'headdress', band: '#c9a24a' }, weapon: 'blowgun', bandolier: true, extras: ['squint'] },
  sporeShaman: { ...JUNGLE, skin: '#a87a5a', top: '#6a5a3a', coat: { color: '#4a5a2a', long: true }, pants: '#3a3a2a', boots: '#2a2416', hat: { type: 'mushroom', color: '#b8433a' }, weapon: 'staff', staff: '#4a3a2a', orb: '#b8d46a', orbGlow: true, behind: 'sporecloud', extras: [] },
  canopyWarden: { ...JUNGLE, skin: '#7a4f3a', top: '#2f5a3a', coat: { color: '#3f6a3a', long: true }, pants: '#2a3a24', boots: '#1d2416', hat: { type: 'leafcrown', color: '#4f8a3a', antlers: '#d9c9a0' }, weapon: 'staff', staff: '#5a3f2a', orb: '#2fae8a', orbGlow: true, sash: '#c9a24a', extras: [], wide: true },
  // ---- Skybound Order: sky, white, silver, navy, gold
  cloudCourier: { ...SKY, skin: '#e8b892', top: '#e9eef5', pants: '#5a6a8a', boots: '#2a2f3a', hat: { type: 'aviator', color: '#7a5a3a' }, weapon: 'pistol', gunColor: '#c9cfd8', scarf: '#f4f6fa', behind: 'wings', extras: ['smile'] },
  galeLancer: { ...SKY, skin: '#e0ad86', top: '#6fa8d8', vest: '#e9eef5', pants: '#3a4a6a', boots: '#24283a', hat: { type: 'winghelm', color: '#c9cfd8' }, weapon: 'lance', pennant: '#6fa8d8', behind: 'cape', capeColor: '#2a3f6a', extras: [] },
  stormcaller: { ...SKY, skin: '#d9a47c', top: '#3a4a6a', coat: { color: '#2a3550', long: true }, pants: '#2a2f3a', boots: '#1d2028', hat: { type: 'hood', color: '#2a3550' }, weapon: 'staff', staff: '#8d939e', orb: '#cfe4ff', orbGlow: true, behind: 'stormcape', capeColor: '#3a4a6a', extras: ['squint'] },
  skyAdmiral: { ...SKY, skin: '#e2b08a', top: '#e9eef5', coat: { color: '#22345a', long: true }, pants: '#22345a', boots: '#1d2028', hat: { type: 'tricorn', color: '#22345a', trim: '#e8c255' }, weapon: 'sword', blade: '#e9eef5', hilt: '#e8c255', medals: 4, sash: '#e8c255', extras: ['mustache'], hairColor: '#d9d6cc', wide: true },
  tempestSovereign: { ...SKY, skin: '#c9a080', top: '#5a6478', coat: { color: '#3a4458', long: true }, pants: '#2a2f3a', boots: '#1d2028', hat: { type: 'crown', color: '#c9cfd8', jewel: '#7fc4e8' }, weapon: 'staff', staff: '#c9cfd8', orb: '#5a6aa8', orbGlow: true, behind: 'stormcape', capeColor: '#2a3448', extras: ['beard'], hairColor: '#d9d6cc', wide: true },
  // ---- Astral Observatory: indigo, violet, star gold, moon silver
  starReader: { ...STAR, skin: '#e2b08a', top: '#3a3470', coat: { color: '#2a2450', long: true }, pants: '#2a2450', boots: '#1a1630', hat: { type: 'wizard', color: '#3a3470' }, weapon: 'telescope', extras: ['beard'], hairColor: '#d9d6cc' },
  cometScribe: { ...STAR, skin: '#e8b892', top: '#5a4a8a', coat: { color: '#4a3a7a', long: true }, pants: '#2a2450', boots: '#1a1630', hat: { type: 'hood', color: '#6a4fb0' }, weapon: 'quill', extras: ['smile'] },
  eclipseAdept: { ...STAR, skin: '#b88a6a', top: '#1d1830', coat: { color: '#16122a', long: true }, pants: '#16122a', boots: '#0d0a18', hat: { type: 'hood', color: '#1d1830' }, weapon: 'staff', staff: '#2a2450', orb: '#16122a', orbGlow: true, behind: 'eclipse', extras: ['squint'] },
  nebulaArchitect: { ...STAR, skin: '#e0ad86', top: '#6a4fb0', coat: { color: '#4a3a8a', long: true }, pants: '#2a2450', boots: '#1a1630', hat: { type: 'wizard', color: '#6a4fb0', star: '#cfa8ff' }, weapon: 'dividers', behind: 'nebula', extras: ['smile'] },
  celestialOracle: { ...STAR, skin: '#e8c0a0', top: '#f4f1ea', coat: { color: '#e6dcc0', long: true }, pants: '#d9cfb0', boots: '#8a7a5a', hat: { type: 'halo', color: '#f2d38a', hair: '#f4ead0' }, weapon: 'staff', staff: '#c9a24a', orb: '#f2d38a', orbGlow: true, behind: 'cape', capeColor: '#3a3470', extras: ['smile'] },
  singularityMonarch: { ...STAR, skin: '#a89ac8', top: '#1d1830', coat: { color: '#0d0a18', long: true }, pants: '#16122a', boots: '#0d0a18', hat: { type: 'crown', color: '#8a7ad8', jewel: '#0d0a18' }, weapon: 'staff', staff: '#4a3a8a', orb: '#0d0a18', orbGlow: true, behind: 'horizon', medals: 2, extras: [], wide: true },
};

// ---------------------------------------------------------------- machines

/** Tin Sentry: a riveted tin soldier with a drum chest and a short rivet gun. */
function tinSentry(ctx, { frame = 0, facing = 1, level = 0 } = {}) {
  const o = '#17140f';
  shadow(ctx, 7);
  ctx.save();
  ctx.scale(facing, 1);
  ctx.fillStyle = '#5a5e66';
  ctx.fillRect(-4, -6, 3, 6);
  ctx.fillRect(1, -6, 3, 6);
  ctx.beginPath();
  ctx.roundRect(-5.6, -16, 11.2, 10.4, 2);
  blob(ctx, '#9aa1aa', o, 1.2);
  ctx.fillStyle = '#c9a24a';
  for (let i = 0; i < 3; i++) circle(ctx, -3.6 + i * 3.6, -11, 0.7), ctx.fill();
  ctx.fillStyle = '#b7353a';
  ctx.fillRect(-5.6, -14, 11.2, 1.6);
  ctx.beginPath();
  ctx.roundRect(-4.2, -23.6, 8.4, 7.6, 1.4);
  blob(ctx, '#b9bec6', o, 1.2);
  ctx.fillStyle = '#2a2420';
  ctx.fillRect(-2.6, -21, 6, 1.6);
  ctx.fillStyle = frame === 2 ? '#ffd56a' : '#e0742e';
  ctx.fillRect(0.4, -20.8, 1.6, 1.2);
  ctx.fillStyle = '#c9a24a';
  ctx.fillRect(-1, -26.6, 2, 3);
  ctx.save();
  ctx.translate(4.4, -11.5);
  ctx.rotate(frame >= 1 ? -0.1 : 0.5);
  ctx.fillStyle = '#3a3d42';
  ctx.fillRect(0, -1.4, 8, 2.8);
  ctx.fillStyle = '#c9a24a';
  ctx.fillRect(1, -2, 2, 4);
  ctx.restore();
  if (frame === 2) muzzleFlash(ctx, 13, -12.5, 2.2);
  ctx.restore();
  levelStripes(ctx, level);
}

/** Springling: a small brass hopper on a big coil spring. Frame 1 compressed, 2 sprung. */
function springling(ctx, { frame = 0, facing = 1, level = 0 } = {}) {
  const o = '#17140f';
  shadow(ctx, 6.5);
  ctx.save();
  ctx.scale(facing, 1);
  const h = frame === 1 ? 5 : frame === 2 ? 11 : 8;
  ctx.strokeStyle = '#8d939e';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  for (let i = 0; i <= 8; i++) ctx.lineTo(i % 2 ? 3 : -3, -i * (h / 8));
  ctx.stroke();
  const y = -h;
  ell(ctx, 0.5, y - 5, 6.4, 5.6);
  blob(ctx, '#c9a24a', o, 1.2);
  ctx.fillStyle = shade('#c9a24a', 0.25);
  ell(ctx, -1.5, y - 7, 2.6, 1.8);
  ctx.fill();
  ctx.fillStyle = '#f2ead8';
  circle(ctx, 2.6, y - 5.6, 2);
  ctx.fill();
  ctx.fillStyle = '#2a2420';
  circle(ctx, 3, y - 5.6, 1);
  ctx.fill();
  ctx.strokeStyle = '#3a3d42';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-1, y - 10.5);
  ctx.lineTo(-2.5, y - 14);
  ctx.stroke();
  gear(ctx, -2.5, y - 14.5, 1.8, 6, 0, '#9aa1aa', o);
  ctx.restore();
  levelStripes(ctx, level);
}

/** Gearshot: a long cog-rifle on a tripod with a brass magazine of gears. */
function gearshot(ctx, { frame = 0, facing = 1, level = 0 } = {}) {
  const o = '#17140f';
  shadow(ctx, 10);
  ctx.save();
  ctx.scale(facing, 1);
  ctx.strokeStyle = '#4a4f58';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(-1, -9);
  ctx.lineTo(-7, 0);
  ctx.moveTo(-1, -9);
  ctx.lineTo(5, 0);
  ctx.moveTo(-1, -9);
  ctx.lineTo(-1, 0);
  ctx.stroke();
  ctx.save();
  ctx.translate(-1, -11);
  ctx.rotate(frame === 2 ? -0.16 : -0.06);
  ctx.beginPath();
  ctx.roundRect(-8, -2.6, 12, 5.2, 1.2);
  blob(ctx, '#6b4a2c', o, 1);
  ctx.beginPath();
  ctx.rect(2, -1.6, 15, 3.2);
  blob(ctx, '#3a3d42', o, 1);
  gear(ctx, -2, -4.4, 3.4, 8, frame * 0.6, '#c9a24a', o);
  ctx.fillStyle = '#7fc4e8';
  ctx.fillRect(4, -3.8, 4, 1.4);
  ctx.restore();
  if (frame === 2) muzzleFlash(ctx, 17, -13.5, 2.6);
  ctx.restore();
  levelStripes(ctx, level);
}

/** Steam Golem: a hulking boiler with piston arms and a funnel venting steam. */
function steamGolem(ctx, { frame = 0, facing = 1, level = 0 } = {}) {
  const o = '#17140f';
  shadow(ctx, 11);
  ctx.save();
  ctx.scale(facing, 1);
  ctx.fillStyle = '#3a3d42';
  ctx.fillRect(-7, -6, 5, 6);
  ctx.fillRect(2, -6, 5, 6);
  ctx.beginPath();
  ctx.roundRect(-9.5, -22, 19, 16.5, 4);
  blob(ctx, '#8a5a3a', o, 1.3);
  ctx.fillStyle = '#c9a24a';
  for (const y of [-19, -10]) ctx.fillRect(-9.5, y, 19, 1.6);
  ctx.fillStyle = frame === 2 ? '#ffb24a' : '#e0742e';
  ell(ctx, 0, -14.5, 3.6, 2.6);
  ctx.fill();
  ctx.fillStyle = '#5a5e66';
  ctx.fillRect(-3, -27, 4, 5.4);
  ctx.strokeStyle = o;
  ctx.lineWidth = 1;
  ctx.strokeRect(-3, -27, 4, 5.4);
  // arms: raised on wind-up, slammed down on release
  const ay = frame === 1 ? -24 : frame === 2 ? -8 : -14;
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.roundRect(s > 0 ? 9 : -13.5, ay, 4.5, 9, 1.4);
    blob(ctx, '#6b707a', o, 1);
  }
  ctx.restore();
  if (frame !== 1) {
    ctx.fillStyle = 'rgba(240,238,232,0.75)';
    circle(ctx, -1 * facing, -30, 2.4);
    ctx.fill();
    circle(ctx, 1.5 * facing, -32.5, 1.8);
    ctx.fill();
  }
  levelStripes(ctx, level);
}

/** Grand Automaton: a tall brass knight-machine with a flywheel on its back. */
function grandAutomaton(ctx, { frame = 0, facing = 1, level = 0 } = {}) {
  const o = '#17140f';
  shadow(ctx, 10);
  ctx.save();
  ctx.scale(facing, 1);
  gear(ctx, -5, -18, 7.4, 12, frame * 0.5, '#8a6a3a', o);
  ctx.fillStyle = '#5a4a32';
  ctx.fillRect(-4.6, -8, 3.6, 8);
  ctx.fillRect(1.6, -8, 3.6, 8);
  ctx.beginPath();
  ctx.moveTo(-6.6, -22);
  ctx.lineTo(7.4, -22);
  ctx.lineTo(5.6, -8);
  ctx.lineTo(-4.8, -8);
  ctx.closePath();
  blob(ctx, '#c9a24a', o, 1.3);
  ctx.fillStyle = '#7fc4e8';
  circle(ctx, 0.6, -15.5, 2.2);
  ctx.fill();
  ctx.beginPath();
  ctx.roundRect(-3.4, -30, 8, 7.4, 2);
  blob(ctx, '#d9b25a', o, 1.2);
  ctx.fillStyle = '#2a2420';
  ctx.fillRect(-1.6, -27.4, 5.4, 1.4);
  ctx.fillStyle = frame === 2 ? '#ffe08a' : '#7fc4e8';
  ctx.fillRect(1.2, -27.2, 1.8, 1);
  ctx.save();
  ctx.translate(6.6, -17);
  ctx.rotate(frame >= 1 ? -0.1 : 0.6);
  ctx.beginPath();
  ctx.roundRect(0, -2, 9, 4, 1);
  blob(ctx, '#8a6a3a', o, 1);
  ctx.restore();
  if (frame === 2) muzzleFlash(ctx, 16.5, -18, 2.6);
  ctx.restore();
  levelStripes(ctx, level);
}

/** The Eternal Engine: a floating core of interlocking gears and four pumping pistons. */
function eternalEngine(ctx, { frame = 0, facing = 1, level = 0 } = {}) {
  const o = '#17140f';
  shadow(ctx, 10);
  ctx.save();
  ctx.scale(facing, 1);
  const pump = frame === 2 ? 3 : frame === 1 ? -1 : 1;
  for (const [x, y, a] of [[-9, -10, -0.4], [9, -10, 0.4], [-8, -24, 0.5], [8, -24, -0.5]]) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(a);
    ctx.fillStyle = '#6b707a';
    ctx.fillRect(-1.4, -4 - pump, 2.8, 8 + pump);
    ctx.strokeStyle = o;
    ctx.lineWidth = 0.8;
    ctx.strokeRect(-1.4, -4 - pump, 2.8, 8 + pump);
    ctx.restore();
  }
  gear(ctx, -3.5, -17, 7, 10, frame * 0.4, '#b8733a', o);
  gear(ctx, 4.5, -19, 5, 8, -frame * 0.6, '#c9a24a', o);
  ctx.fillStyle = frame === 2 ? '#ffd56a' : '#f2a23a';
  circle(ctx, 0.5, -17.5, 3.2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,214,120,0.35)';
  circle(ctx, 0.5, -17.5, 5.4);
  ctx.fill();
  ctx.restore();
  levelStripes(ctx, level);
}

// ---------------------------------------------------------------- creatures and plants

/** Panther: a low black cat, crouched; it springs on the strike. */
function panther(ctx, { frame = 0, facing = 1, level = 0 } = {}) {
  const o = '#0d0d0f';
  shadow(ctx, 10);
  ctx.save();
  ctx.scale(facing, 1);
  const lunge = frame === 2 ? 3 : frame === 1 ? -1.5 : 0;
  const crouch = frame === 1 ? 1.5 : 0;
  ctx.translate(lunge, crouch);
  ctx.strokeStyle = '#1d1d22';
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-9, -7);
  ctx.quadraticCurveTo(-15, -9, -13, -15);
  ctx.stroke();
  ctx.fillStyle = '#1d1d22';
  for (const x of [-7, -3, 3, 6.5]) ctx.fillRect(x - 0.9, -5, 1.8, 5);
  ell(ctx, -1, -8, 9, 4.4);
  blob(ctx, '#26262c', o, 1.1);
  ctx.fillStyle = 'rgba(160,170,200,0.25)';
  ell(ctx, -2, -10, 6, 1.6);
  ctx.fill();
  ell(ctx, 8, -11, 4.2, 3.6);
  blob(ctx, '#26262c', o, 1.1);
  ctx.fillStyle = '#26262c';
  ctx.beginPath();
  ctx.moveTo(6, -14);
  ctx.lineTo(6.6, -16.6);
  ctx.lineTo(8, -14.4);
  ctx.moveTo(9.4, -14.2);
  ctx.lineTo(10.6, -16.4);
  ctx.lineTo(11, -13.6);
  ctx.fill();
  ctx.fillStyle = '#e8d24a';
  ell(ctx, 10, -11.6, 1.1, 0.7);
  ctx.fill();
  if (frame === 2) {
    ctx.strokeStyle = '#f2efe6';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(13, -9);
    ctx.lineTo(15, -11);
    ctx.moveTo(13.4, -7.5);
    ctx.lineTo(15.6, -9);
    ctx.stroke();
  }
  ctx.restore();
  levelStripes(ctx, level);
}

/** Elder Treant: a walking tree; branches lift on the wind-up and swing down. */
function elderTreant(ctx, { frame = 0, facing = 1, level = 0 } = {}) {
  const o = '#1a140c';
  shadow(ctx, 11);
  ctx.save();
  ctx.scale(facing, 1);
  ctx.fillStyle = '#4a3420';
  for (const x of [-6, -1, 4]) {
    ctx.beginPath();
    ctx.moveTo(x - 2, -6);
    ctx.lineTo(x - 3.4, 0);
    ctx.lineTo(x + 2.6, 0);
    ctx.lineTo(x + 2, -6);
    ctx.fill();
  }
  ctx.beginPath();
  ctx.moveTo(-6, -6);
  ctx.lineTo(-5, -22);
  ctx.lineTo(5.6, -22);
  ctx.lineTo(6.6, -6);
  ctx.closePath();
  blob(ctx, '#5a3f2a', o, 1.2);
  ctx.strokeStyle = 'rgba(30,20,10,0.5)';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(-2, -8);
  ctx.lineTo(-1, -20);
  ctx.moveTo(3, -9);
  ctx.lineTo(2.4, -18);
  ctx.stroke();
  ctx.fillStyle = '#e8d24a';
  for (const x of [-2, 2.6]) circle(ctx, x, -17, 0.9), ctx.fill();
  const lift = frame === 1 ? -4 : frame === 2 ? 3 : 0;
  ctx.strokeStyle = '#5a3f2a';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(5, -16);
  ctx.lineTo(11, -20 + lift);
  ctx.moveTo(-5, -16);
  ctx.lineTo(-10, -19);
  ctx.stroke();
  for (const [x, y, r, c] of [[-6, -23.5, 6, '#2f5a2e'], [3, -25, 6.6, '#3f7a3a'], [-1, -21, 5, '#4f8a3a'], [10, -21 + lift, 4, '#3f7a3a']]) {
    circle(ctx, x, y, r);
    blob(ctx, c, o, 1);
  }
  ctx.restore();
  levelStripes(ctx, level);
}

/** Heart of the Wild: a great flower-heart on a living mound, petals opening on release. */
function heartOfTheWild(ctx, { frame = 0, facing = 1, level = 0 } = {}) {
  const o = '#1a120c';
  shadow(ctx, 11);
  ctx.save();
  ctx.scale(facing, 1);
  ell(ctx, 0, -4, 11, 5);
  blob(ctx, '#3f6a2e', o, 1.1);
  ctx.strokeStyle = '#2f5a2e';
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(-1, -6);
  ctx.quadraticCurveTo(-3, -14, 0, -18);
  ctx.stroke();
  const open = frame === 2 ? 1.25 : frame === 1 ? 0.8 : 1;
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * TAU - Math.PI / 2;
    ctx.save();
    ctx.translate(0, -21);
    ctx.rotate(a);
    ell(ctx, 0, -5 * open, 2.6, 5);
    blob(ctx, i % 2 ? '#c2385a' : '#e05a7a', o, 0.8);
    ctx.restore();
  }
  ctx.fillStyle = '#f2d38a';
  circle(ctx, 0, -21, 3.2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,230,140,0.3)';
  circle(ctx, 0, -21, 5.4);
  ctx.fill();
  for (const [x, y] of [[-9, -8], [8, -9], [-4, -3]]) {
    ell(ctx, x, y, 3, 1.4, x > 0 ? -0.5 : 0.5);
    blob(ctx, '#5f9a3a', o, 0.6);
  }
  ctx.restore();
  levelStripes(ctx, level);
}

/** Roc Rider: a huge eagle-like roc with a lancer on its back. */
function rocRider(ctx, { frame = 0, facing = 1, level = 0 } = {}) {
  const o = '#141a26';
  shadow(ctx, 12);
  ctx.save();
  ctx.scale(facing, 1);
  const flap = frame === 1 ? -6 : frame === 2 ? 2 : 0;
  ctx.beginPath();
  ctx.moveTo(-3, -14);
  ctx.quadraticCurveTo(-15, -24 + flap, -19, -12 + flap);
  ctx.quadraticCurveTo(-11, -13, -4, -9);
  ctx.closePath();
  blob(ctx, '#8a5a3a', o, 1);
  ell(ctx, 0, -11, 9, 5.4);
  blob(ctx, '#a0703f', o, 1.1);
  ell(ctx, 9.5, -15, 3.6, 3.2);
  blob(ctx, '#f2ead8', o, 1);
  ctx.beginPath();
  ctx.moveTo(12.4, -15.6);
  ctx.lineTo(16, -14);
  ctx.lineTo(12.4, -13.2);
  blob(ctx, '#e0a23a', o, 0.7);
  ctx.fillStyle = '#1d1b18';
  circle(ctx, 10.4, -15.8, 0.8);
  ctx.fill();
  ctx.fillStyle = '#e0a23a';
  ctx.fillRect(-3, -6, 1.6, 6);
  ctx.fillRect(3, -6, 1.6, 6);
  // rider
  ctx.beginPath();
  ctx.roundRect(-3.4, -22, 6, 7, 1.6);
  blob(ctx, '#6fa8d8', o, 1);
  ctx.fillStyle = '#e2b08a';
  circle(ctx, 0, -25, 2.8);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, -25.6, 3, Math.PI, 0);
  blob(ctx, '#c9cfd8', o, 0.8);
  ctx.strokeStyle = '#d9dde6';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(1, -19);
  ctx.lineTo(frame >= 1 ? 15 : 9, frame >= 1 ? -24 : -29);
  ctx.stroke();
  ctx.restore();
  levelStripes(ctx, level);
}

/** Eye of the Zenith: a storm cloud with a single golden eye; it widens and crackles on release. */
function eyeOfTheZenith(ctx, { frame = 0, facing = 1, level = 0 } = {}) {
  const o = '#141a26';
  shadow(ctx, 11);
  ctx.save();
  ctx.scale(facing, 1);
  for (const [x, y, r, c] of [[-8, -16, 6, '#3a4458'], [8, -16, 6.4, '#3a4458'], [-3, -22, 7, '#4a5468'], [5, -23, 6, '#4a5468'], [0, -14, 7.4, '#2a3448']]) {
    circle(ctx, x, y, r);
    blob(ctx, c, o, 1);
  }
  const wide = frame === 2 ? 3.8 : frame === 1 ? 3 : 2.2;
  ell(ctx, 0.5, -18, 6, wide);
  blob(ctx, '#f2ead8', o, 0.9);
  ctx.fillStyle = '#e8b83a';
  circle(ctx, 1.2, -18, Math.min(2.6, wide));
  ctx.fill();
  ctx.fillStyle = '#1d1b18';
  circle(ctx, 1.4, -18, 1.1);
  ctx.fill();
  ctx.strokeStyle = '#cfe4ff';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-6, -9);
  ctx.lineTo(-7.5, -5);
  ctx.lineTo(-5.5, -5);
  ctx.lineTo(-7, -1);
  if (frame === 2) {
    ctx.moveTo(6, -9);
    ctx.lineTo(4.5, -4.6);
    ctx.lineTo(6.6, -4.6);
    ctx.lineTo(5, 0);
  }
  ctx.stroke();
  ctx.restore();
  levelStripes(ctx, level);
}

/** Moon Prism: a floating crescent crystal over a small stone plinth. */
function moonPrism(ctx, { frame = 0, facing = 1, level = 0 } = {}) {
  const o = '#120f22';
  shadow(ctx, 8);
  ctx.save();
  ctx.scale(facing, 1);
  ctx.beginPath();
  ctx.roundRect(-5, -4, 10, 4, 1);
  blob(ctx, '#6b6a78', o, 1);
  const hover = frame === 2 ? -2 : 0;
  ctx.translate(0, hover);
  ctx.beginPath();
  ctx.moveTo(0, -30);
  ctx.lineTo(6, -18);
  ctx.lineTo(0, -8);
  ctx.lineTo(-6, -18);
  ctx.closePath();
  blob(ctx, '#cfd6e6', o, 1.1);
  ctx.fillStyle = '#eef2fa';
  ctx.beginPath();
  ctx.moveTo(0, -30);
  ctx.lineTo(-6, -18);
  ctx.lineTo(0, -19);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#8a96b8';
  ctx.beginPath();
  ctx.moveTo(0, -8);
  ctx.lineTo(6, -18);
  ctx.lineTo(0, -19);
  ctx.closePath();
  ctx.fill();
  if (frame >= 1) {
    ctx.fillStyle = 'rgba(230,236,255,0.4)';
    circle(ctx, 0, -19, 7);
    ctx.fill();
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
const machine = (u, t) => {
  const s = since(u, t);
  if (s < 0.12) return { frame: 2 };
  return { frame: u.hasTarget && u.cooldown < 0.3 ? 1 : 0 };
};
const hover = (u, t) => ({ ...caster(u, t), dy: Math.sin(t * 2 + u.uid) * 1.2 });

const ANIM = {
  porter: ranged(0.14),
  caravanScout: ranged(0.1),
  campCook: melee(0.16),
  travelingTrader: ranged(0.12),
  cartographer: ranged(0.12),
  caravanMaster: caster,
  goldenMerchant: caster,
  tinSentry: machine,
  springling: (u, t) => {
    const s = since(u, t);
    if (s < 0.1) return { frame: 2, dy: -1 };
    if (u.hasTarget && u.cooldown < 0.15) return { frame: 1 };
    return { frame: 0, dy: Math.round(Math.sin(t * 6 + u.uid) * 0.6) };
  },
  gearshot: machine,
  steamGolem: (u, t) => {
    const s = since(u, t);
    if (s < 0.2) return { frame: 2 };
    if (u.hasTarget && u.cooldown < 0.4) return { frame: 1 };
    return { frame: 0 };
  },
  chronoMechanic: caster,
  grandAutomaton: machine,
  eternalEngine: (u, t) => ({ ...machine(u, t), dy: Math.sin(t * 3 + u.uid) * 1.4 }),
  vineTender: ranged(0.12),
  dartkeeper: ranged(0.08),
  panther: melee(0.14),
  sporeShaman: caster,
  elderTreant: (u, t) => {
    const s = since(u, t);
    if (s < 0.25) return { frame: 2 };
    if (u.hasTarget && u.cooldown < 0.5) return { frame: 1 };
    return { frame: 0, dy: sway(u, t, 0.4) };
  },
  canopyWarden: caster,
  heartOfTheWild: (u, t) => ({ ...caster(u, t), dy: Math.sin(t * 1.4 + u.uid) * 0.6 }),
  cloudCourier: ranged(0.08),
  galeLancer: melee(0.14),
  rocRider: (u, t) => ({ ...ranged(0.14)(u, t), dy: Math.sin(t * 2.4 + u.uid) * 1.2 }),
  stormcaller: caster,
  skyAdmiral: caster,
  tempestSovereign: caster,
  eyeOfTheZenith: hover,
  starReader: ranged(0.12),
  cometScribe: ranged(0.14),
  moonPrism: hover,
  eclipseAdept: caster,
  nebulaArchitect: caster,
  celestialOracle: caster,
  singularityMonarch: caster,
};

for (const [key, f] of Object.entries(PEOPLE)) registerPainter(key, figure(f), ANIM[key]);
const PAINTERS = { tinSentry, springling, gearshot, steamGolem, grandAutomaton, eternalEngine, panther, elderTreant, heartOfTheWild, rocRider, eyeOfTheZenith, moonPrism };
for (const [key, p] of Object.entries(PAINTERS)) registerPainter(key, p, ANIM[key]);

export const PACK2_ART_KEYS = [...Object.keys(PEOPLE), ...Object.keys(PAINTERS)];
