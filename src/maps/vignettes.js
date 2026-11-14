// Inhabited set pieces: small, composed scenes placed beside the road so a
// realm reads as a place people use – a woodcutters' camp, a frontier
// outpost, a dig site, an ore cart, a maintenance shed, a sky mill. Each has
// a static painting (baked into the terrain) and an optional live layer
// (smoke, a flag, a lantern, turning sails) drawn every frame.
//
// House style as everywhere: light from the top-left, soft contact shadow,
// flat fills with one dark hue-tinted outline, no glow except real light
// sources (fire, lanterns), which stay small.

import { TAU } from '../core/math.js';
import { shade, rgba } from '../core/color.js';
import { circle } from '../render/canvas.js';

const INK = '#1c1712';
/** Set pieces are painted in a ±24 px box and drawn a little larger to fill their 2×2-tile plot. */
export const VIGNETTE_SCALE = 1.3;

function shadowEllipse(ctx, x, y, rx, ry, a = 0.28) {
  ctx.fillStyle = `rgba(10,8,12,${a})`;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, TAU);
  ctx.fill();
}

function box(ctx, x, y, w, h, color, lid = null) {
  shadowEllipse(ctx, x + w * 0.62, y + h * 0.9, w * 0.62, h * 0.38, 0.25);
  ctx.fillStyle = color;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1;
  ctx.fillRect(x, y, w, h);
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  ctx.fillStyle = lid ?? shade(color, 0.18);
  ctx.fillRect(x + 1, y + 1, w - 2, h * 0.35);
  ctx.strokeStyle = rgba(INK, 0.5);
  ctx.beginPath();
  ctx.moveTo(x + 1, y + h * 0.55);
  ctx.lineTo(x + w - 1, y + h * 0.55);
  ctx.stroke();
}

function log(ctx, x, y, len, ang, r = 2.4, bark = '#5e4128') {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ang);
  ctx.fillStyle = bark;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 0.9;
  ctx.fillRect(-len / 2, -r, len, r * 2);
  ctx.strokeRect(-len / 2, -r, len, r * 2);
  ctx.fillStyle = '#c9a774';
  circle(ctx, len / 2, 0, r * 0.95);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = 'rgba(90,60,30,0.6)';
  circle(ctx, len / 2, 0, r * 0.45);
  ctx.stroke();
  ctx.restore();
}

function tent(ctx, x, y, w, h, cloth, snow = false) {
  shadowEllipse(ctx, x + w * 0.2, y + h * 0.35, w * 0.7, h * 0.45, 0.3);
  // two roof planes seen from above: lit left, shaded right
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1;
  ctx.fillStyle = shade(cloth, 0.12);
  ctx.beginPath();
  ctx.moveTo(x - w / 2, y + h / 2);
  ctx.lineTo(x, y - h / 2);
  ctx.lineTo(x, y + h / 2);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = shade(cloth, -0.2);
  ctx.beginPath();
  ctx.moveTo(x + w / 2, y + h / 2);
  ctx.lineTo(x, y - h / 2);
  ctx.lineTo(x, y + h / 2);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // ridge pole and door flap
  ctx.strokeStyle = shade(cloth, -0.45);
  ctx.beginPath();
  ctx.moveTo(x, y - h / 2);
  ctx.lineTo(x, y + h / 2);
  ctx.stroke();
  ctx.fillStyle = shade(cloth, -0.5);
  ctx.beginPath();
  ctx.moveTo(x - 2.5, y + h / 2);
  ctx.lineTo(x, y + h / 2 - 5);
  ctx.lineTo(x + 2.5, y + h / 2);
  ctx.closePath();
  ctx.fill();
  if (snow) {
    ctx.fillStyle = 'rgba(248,252,255,0.85)';
    ctx.beginPath();
    ctx.moveTo(x - w * 0.42, y + h * 0.4);
    ctx.lineTo(x - 1, y - h * 0.42);
    ctx.lineTo(x - 1, y + h * 0.1);
    ctx.closePath();
    ctx.fill();
  }
}

function lantern(ctx, x, y) {
  ctx.fillStyle = INK;
  ctx.fillRect(x - 1.6, y - 2.5, 3.2, 4.5);
  ctx.fillStyle = '#f2c46a';
  ctx.fillRect(x - 1, y - 1.8, 2, 3);
}

function fireRing(ctx, x, y) {
  shadowEllipse(ctx, x + 1, y + 1.5, 6.5, 4, 0.2);
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * TAU;
    ctx.fillStyle = i % 2 ? '#7f786c' : '#9a9286';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    ctx.ellipse(x + Math.cos(a) * 5, y + Math.sin(a) * 3.6, 1.8, 1.4, a, 0, TAU);
    ctx.fill();
    ctx.stroke();
  }
  ctx.fillStyle = '#2a1a12';
  ctx.beginPath();
  ctx.ellipse(x, y, 3.4, 2.3, 0, 0, TAU);
  ctx.fill();
}

// ---------------------------------------------------------------- live layers

/** Rising smoke: a few puffs on a loop – grows, drifts with the wind, fades. */
function smoke(ctx, x, y, t, { seed = 0, wind = 0, color = '#c9c2b6', scale = 1 } = {}) {
  for (let i = 0; i < 4; i++) {
    const k = (t * 0.22 + i / 4 + seed) % 1;
    const px = x + k * (8 + wind * 24) * scale + Math.sin(k * 6 + seed * 9) * 2;
    const py = y - k * 26 * scale;
    ctx.fillStyle = rgba(color, 0.32 * (1 - k) * Math.min(1, k * 5));
    circle(ctx, px, py, (2 + k * 6) * scale);
    ctx.fill();
  }
}

function flame(ctx, x, y, t, s = 1) {
  const f = 0.8 + 0.2 * Math.sin(t * 17) * Math.sin(t * 7.3);
  ctx.fillStyle = 'rgba(255,170,70,0.16)';
  circle(ctx, x, y, 9 * s);
  ctx.fill();
  ctx.fillStyle = '#d4521f';
  ctx.beginPath();
  ctx.ellipse(x, y - 1.5 * s * f, 2.6 * s, 3.4 * s * f, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#f6c45a';
  ctx.beginPath();
  ctx.ellipse(x, y - 1 * s * f, 1.3 * s, 2 * s * f, 0, 0, TAU);
  ctx.fill();
}

/** A small pennant on a pole that ripples with the wind. */
function pennant(ctx, x, y, t, color, wind = 0, len = 10) {
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x, y - 16);
  ctx.stroke();
  const amp = 1.2 + wind * 2;
  ctx.fillStyle = color;
  ctx.strokeStyle = shade(color, -0.45);
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(x, y - 16);
  const L = len * (1 + wind * 0.2);
  for (let i = 0; i <= 6; i++) {
    const u = i / 6;
    ctx.lineTo(x + u * L, y - 16 + Math.sin(t * 5 - u * 4) * amp * u - u * 0.5);
  }
  for (let i = 6; i >= 0; i--) {
    const u = i / 6;
    ctx.lineTo(x + u * L, y - 11 + Math.sin(t * 5 - u * 4) * amp * u - u * 2.5);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

// ---------------------------------------------------------------- set pieces

export const VIGNETTES = {
  /** Forest: woodcutters' camp – tent, fire ring with log seats, a woodpile and a chopping stump. */
  camp: {
    paint(ctx, d) {
      const { x, y } = d;
      tent(ctx, x - 12, y - 8, 22, 18, '#7d6b45');
      fireRing(ctx, x + 9, y + 6);
      log(ctx, x + 9, y - 2, 11, 0.1);
      log(ctx, x + 18, y + 8, 10, 1.4);
      for (let i = 0; i < 4; i++) log(ctx, x - 16 + (i % 2) * 2, y + 11 - i * 2.4, 12, 0, 2);
      ctx.fillStyle = '#6b4c2e';
      circle(ctx, x - 22, y + 3, 3.4);
      ctx.fill();
      ctx.strokeStyle = INK;
      ctx.stroke();
      ctx.fillStyle = '#c9a774';
      circle(ctx, x - 22, y + 3, 2.4);
      ctx.fill();
      ctx.strokeStyle = '#3a2a1a';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(x - 22, y + 2);
      ctx.lineTo(x - 18, y - 2);
      ctx.stroke();
    },
    live(ctx, d, t, w) {
      flame(ctx, d.x + 9, d.y + 6, t + d.seed * 10);
      smoke(ctx, d.x + 9, d.y + 2, t, { seed: d.seed, wind: w });
    },
  },
  /** Frozen: frontier outpost – snowed tent, supply crates, a sled and a pennant. */
  outpost: {
    paint(ctx, d) {
      const { x, y } = d;
      tent(ctx, x - 8, y - 6, 22, 18, '#8a4b3a', true);
      box(ctx, x + 6, y + 2, 9, 8, '#7a5a38');
      box(ctx, x + 14, y + 5, 7, 6, '#6a4c30');
      ctx.fillStyle = 'rgba(248,252,255,0.85)';
      ctx.fillRect(x + 7, y + 2.5, 7, 2);
      // sled: runners and a strapped load
      ctx.strokeStyle = '#4a3420';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(x - 22, y + 12);
      ctx.lineTo(x - 6, y + 12);
      ctx.quadraticCurveTo(x - 3, y + 12, x - 3, y + 9);
      ctx.moveTo(x - 22, y + 16);
      ctx.lineTo(x - 6, y + 16);
      ctx.quadraticCurveTo(x - 3, y + 16, x - 3, y + 13);
      ctx.stroke();
      box(ctx, x - 19, y + 10, 11, 7, '#5f6a73');
    },
    live(ctx, d, t, w) {
      pennant(ctx, d.x + 20, d.y - 2, t + d.seed * 7, '#b8433a', w);
    },
  },
  /** Ruins: an excavation – tarp over the trench, crates of finds, a ladder and a lantern. */
  dig: {
    paint(ctx, d) {
      const { x, y } = d;
      shadowEllipse(ctx, x + 2, y + 3, 20, 11, 0.22);
      ctx.fillStyle = '#5a4a36';
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1;
      ctx.fillRect(x - 16, y - 7, 26, 13);
      ctx.strokeRect(x - 15.5, y - 6.5, 25, 12);
      ctx.fillStyle = '#3b3024';
      ctx.fillRect(x - 13, y - 4, 20, 7);
      // grid strings over the trench
      ctx.strokeStyle = 'rgba(235,225,200,0.6)';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      for (let i = 1; i < 4; i++) {
        ctx.moveTo(x - 13 + i * 5, y - 4);
        ctx.lineTo(x - 13 + i * 5, y + 3);
      }
      ctx.moveTo(x - 13, y - 0.5);
      ctx.lineTo(x + 7, y - 0.5);
      ctx.stroke();
      // ladder
      ctx.strokeStyle = '#8a6a44';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x + 4, y - 9);
      ctx.lineTo(x + 6, y + 4);
      ctx.moveTo(x + 8, y - 9);
      ctx.lineTo(x + 10, y + 4);
      for (let i = 0; i < 4; i++) {
        ctx.moveTo(x + 4.4 + i * 0.5, y - 7 + i * 3);
        ctx.lineTo(x + 8.4 + i * 0.5, y - 7 + i * 3);
      }
      ctx.stroke();
      box(ctx, x + 13, y - 2, 8, 7, '#8b6b45');
      box(ctx, x + 13, y + 7, 7, 6, '#7a5c3a');
      // tarp on two poles
      ctx.fillStyle = 'rgba(184,152,96,0.92)';
      ctx.strokeStyle = INK;
      ctx.beginPath();
      ctx.moveTo(x - 20, y - 12);
      ctx.lineTo(x - 4, y - 14);
      ctx.lineTo(x - 6, y - 4);
      ctx.lineTo(x - 21, y - 3);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    },
    live(ctx, d, t) {
      const k = 0.85 + 0.15 * Math.sin(t * 9 + d.seed * 20) * Math.sin(t * 3.1);
      ctx.fillStyle = `rgba(255,200,110,${0.1 * k})`;
      circle(ctx, d.x + 17, d.y - 8, 10);
      ctx.fill();
      lantern(ctx, d.x + 17, d.y - 8);
    },
  },
  /** Volcanic: an ore cart left on a short spur of track, glowing ore, a lantern on a post. */
  mineCart: {
    paint(ctx, d) {
      const { x, y } = d;
      ctx.strokeStyle = '#2a2420';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(x - 24, y + 1);
      ctx.lineTo(x + 20, y + 1);
      ctx.moveTo(x - 24, y + 8);
      ctx.lineTo(x + 20, y + 8);
      ctx.stroke();
      ctx.strokeStyle = '#4a3a2c';
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i < 9; i++) {
        ctx.moveTo(x - 22 + i * 5, y - 1);
        ctx.lineTo(x - 22 + i * 5, y + 10);
      }
      ctx.stroke();
      shadowEllipse(ctx, x + 2, y + 7, 12, 5, 0.35);
      ctx.fillStyle = '#5b5f63';
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x - 9, y - 6);
      ctx.lineTo(x + 9, y - 6);
      ctx.lineTo(x + 7, y + 6);
      ctx.lineTo(x - 7, y + 6);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#2a2420';
      for (let i = 0; i < 6; i++) {
        circle(ctx, x - 5 + (i % 3) * 5, y - 4 + Math.floor(i / 3) * 3, 2.2);
        ctx.fill();
      }
      ctx.fillStyle = '#e0742e';
      circle(ctx, x - 1, y - 3, 1.2);
      ctx.fill();
      circle(ctx, x + 4, y - 1, 1);
      ctx.fill();
    },
    live(ctx, d, t) {
      const k = 0.7 + 0.3 * Math.sin(t * 2.3 + d.seed * 9);
      ctx.fillStyle = `rgba(240,120,50,${0.12 * k})`;
      circle(ctx, d.x + 1, d.y - 2, 9);
      ctx.fill();
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(d.x + 16, d.y - 2);
      ctx.lineTo(d.x + 16, d.y - 14);
      ctx.stroke();
      lantern(ctx, d.x + 16, d.y - 15);
    },
  },
  /** Mechanical: a maintenance shed with a roof vent, oil drums and a rotating beacon. */
  shed: {
    paint(ctx, d) {
      const { x, y } = d;
      shadowEllipse(ctx, x + 4, y + 6, 20, 12, 0.3);
      ctx.fillStyle = '#5c6670';
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1;
      ctx.fillRect(x - 16, y - 12, 26, 20);
      ctx.strokeRect(x - 15.5, y - 11.5, 25, 19);
      // corrugated roof
      ctx.strokeStyle = 'rgba(20,24,28,0.45)';
      ctx.beginPath();
      for (let i = 0; i < 8; i++) {
        ctx.moveTo(x - 14 + i * 3.2, y - 11);
        ctx.lineTo(x - 14 + i * 3.2, y + 7);
      }
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      ctx.fillRect(x - 15, y - 11, 25, 5);
      ctx.fillStyle = '#3a4046';
      ctx.fillRect(x - 6, y - 6, 7, 7);
      ctx.strokeStyle = INK;
      ctx.strokeRect(x - 5.5, y - 5.5, 6, 6);
      // drums
      for (const [dx, dy, c] of [[15, 0, '#a2412f'], [19, 6, '#3f6e8c'], [14, 9, '#a2412f']]) {
        shadowEllipse(ctx, x + dx + 1, y + dy + 2, 4, 2.4, 0.25);
        ctx.fillStyle = c;
        circle(ctx, x + dx, y + dy, 3.4);
        ctx.fill();
        ctx.stroke();
        ctx.strokeStyle = rgba('#000000', 0.35);
        circle(ctx, x + dx, y + dy, 2);
        ctx.stroke();
        ctx.strokeStyle = INK;
      }
    },
    live(ctx, d, t) {
      const a = t * 3 + d.seed * 6;
      const bx = d.x - 12;
      const by = d.y - 9;
      ctx.fillStyle = 'rgba(255,170,60,0.18)';
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.arc(bx, by, 14, a - 0.3, a + 0.3);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#f2a23a';
      circle(ctx, bx, by, 2.2);
      ctx.fill();
      ctx.strokeStyle = INK;
      ctx.lineWidth = 0.8;
      ctx.stroke();
      smoke(ctx, d.x - 2, d.y - 2, t, { seed: d.seed, color: '#9aa3ab', scale: 0.8 });
    },
  },
  /** Sky: a small post mill whose sails turn with the wind. */
  windmill: {
    paint(ctx, d) {
      const { x, y } = d;
      shadowEllipse(ctx, x + 5, y + 8, 13, 8, 0.3);
      ctx.fillStyle = '#d8cdb4';
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x - 9, y + 8);
      ctx.lineTo(x - 6, y - 10);
      ctx.lineTo(x + 6, y - 10);
      ctx.lineTo(x + 9, y + 8);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = 'rgba(0,0,0,0.12)';
      ctx.fillRect(x + 1, y - 10, 6, 18);
      ctx.fillStyle = '#7a4a2e';
      ctx.beginPath();
      ctx.moveTo(x - 8, y - 9);
      ctx.lineTo(x, y - 16);
      ctx.lineTo(x + 8, y - 9);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#4a3a2c';
      ctx.fillRect(x - 2, y + 2, 4, 6);
      box(ctx, x + 11, y + 4, 7, 6, '#b48a4a');
    },
    live(ctx, d, t, w) {
      const a = t * (0.8 + w * 2) + d.seed * 6;
      const hx = d.x;
      const hy = d.y - 8;
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1;
      for (let i = 0; i < 4; i++) {
        const ang = a + (i / 4) * TAU;
        const c = Math.cos(ang);
        const s = Math.sin(ang);
        ctx.fillStyle = '#efe6d0';
        ctx.beginPath();
        ctx.moveTo(hx + c * 2, hy + s * 2);
        ctx.lineTo(hx + c * 15 - s * 2.5, hy + s * 15 + c * 2.5);
        ctx.lineTo(hx + c * 15 + s * 1.5, hy + s * 15 - c * 1.5);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
      ctx.fillStyle = INK;
      circle(ctx, hx, hy, 1.6);
      ctx.fill();
    },
  },
};

/** Decor spec entries that place the set pieces (merged into each biome's decor list). */
export const VIGNETTE_DECOR = {
  forest: [{ kind: 'camp', count: [1, 2], fp: 2, minPathDist: 1, maxPathDist: 2, size: 1 }],
  frozen: [{ kind: 'outpost', count: [1, 2], fp: 2, minPathDist: 1, maxPathDist: 2, size: 1 }],
  ruins: [{ kind: 'dig', count: [1, 2], fp: 2, minPathDist: 1, maxPathDist: 2, size: 1 }],
  volcanic: [{ kind: 'mineCart', count: [1, 2], fp: 2, minPathDist: 1, maxPathDist: 2, size: 1 }],
  mechanical: [{ kind: 'shed', count: [1, 2], fp: 2, minPathDist: 1, maxPathDist: 2, size: 1 }],
  sky: [{ kind: 'windmill', count: [1, 2], fp: 2, minPathDist: 1, maxPathDist: 2, size: 1 }],
};
