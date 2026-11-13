// Military Summoning Circle: canvas painters, the idle stage, and the reveal
// sequence. The motif is a requisition circle stencilled on a concrete floor
// under a hanging work lamp. Rings lock into place with mechanical clicks,
// perimeter lamps climb through the rarity colours, then a supply crate drops
// onto the circle and opens to reveal the unit.
//
// Rarity reads through *how many* lamps climb and *how high*, the weight of
// the landing and the sting, not through bloom.

import { getTier } from '../units/tiers.js';
import { getUnit } from '../units/unitRegistry.js';
import { unitPortrait } from './unitArt.js';
import { makeCanvas, circle } from './canvas.js';
import * as sfx from '../audio/sfx.js';

const TAU = Math.PI * 2;
const PAINT = '#c8b07c'; // faded stencil paint
// Per-circle floor art: paint colour, stencil text, extra ring.
// floorTint: colour washed over the slab; emblem: centre motif; stampText: rare stamp;
// beacon: rgb of the sweeping light during a rare blackout.
const CIRCLE_STYLES = {
  'military-circle': { paint: PAINT, text: 'REQUISITION · ENDLESS TOWER · FORWARD COMMAND · ', doubleRing: false, chevrons: 4 },
  'advanced-military-circle': { paint: '#c4574a', accent: '#d6b048', text: 'SPECIAL ASSETS · ADVANCED REQUISITION · RESTRICTED · ', doubleRing: true, chevrons: 6 },
  // dusty boards and a sheriff's star, branded into the floor
  'wild-west-circle': { paint: '#d9a066', accent: '#e8c255', text: 'WANTED · DEAD OR ALIVE · REWARD · FRONTIER · ', chevrons: 6, emblem: 'badge', floorTint: 'rgba(120,70,30,0.32)', planks: true, stampText: 'WANTED', beacon: '230,150,60' },
  // green felt and a roulette wheel
  'gambino-circle': { paint: '#d6b048', accent: '#b7353a', text: 'PLACE YOUR BETS · THE HOUSE ALWAYS WINS · ', doubleRing: true, chevrons: 8, emblem: 'roulette', floorTint: 'rgba(16,90,52,0.42)', stampText: 'JACKPOT', beacon: '230,190,70' },
  // hazard-striped launch pad (arcade sci-fi)
  'nuclear-war-circle': { paint: '#d9a12a', accent: '#2fb39a', text: 'ARCADE ARMAGEDDON · PREMIUM HARDWARE · LAUNCH CONTROL · ', doubleRing: true, chevrons: 3, emblem: 'atom', floorTint: 'rgba(20,50,40,0.3)', hazard: true, stampText: 'OMEGA CLEARANCE', beacon: '60,220,180' },
};
export const circleStyle = (bannerId) => CIRCLE_STYLES[bannerId] ?? CIRCLE_STYLES['military-circle'];
const STEEL = '#9aa1aa';
const LAMPS = 16;
const ease = (t) => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3);
const easeIn = (t) => Math.pow(Math.min(1, Math.max(0, t)), 2);

let floorPattern = null;
function floor(ctx, w, h) {
  if (!floorPattern) {
    const c = makeCanvas(256, 256);
    const g = c.getContext('2d');
    g.fillStyle = '#26282b';
    g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 2600; i++) {
      const v = Math.random();
      g.fillStyle = v > 0.5 ? `rgba(255,255,255,${0.02 + Math.random() * 0.03})` : `rgba(0,0,0,${0.05 + Math.random() * 0.06})`;
      g.fillRect(Math.random() * 256, Math.random() * 256, 1 + Math.random() * 2, 1 + Math.random() * 2);
    }
    // expansion joints in the slab
    g.strokeStyle = 'rgba(0,0,0,0.35)';
    g.lineWidth = 2;
    g.strokeRect(0, 0, 256, 256);
    floorPattern = c;
  }
  const p = ctx.createPattern(floorPattern, 'repeat');
  ctx.fillStyle = p;
  ctx.fillRect(0, 0, w, h);
}

function stencilText(ctx, text, r, rot, size) {
  ctx.save();
  ctx.rotate(rot);
  ctx.font = `700 ${size}px "Barlow Condensed", "Arial Narrow", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const chars = [...text];
  const step = TAU / chars.length;
  chars.forEach((ch, i) => {
    ctx.save();
    ctx.rotate(i * step);
    ctx.translate(0, -r);
    ctx.fillText(ch, 0, 0);
    ctx.restore();
  });
  ctx.restore();
}

function star(ctx, r) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? r * 0.42 : r;
    ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  ctx.closePath();
}

/**
 * Paints the circle. state: { rotOuter, rotInner, lamps: [color|null],
 * sweep (radians|null), sweepColor, light (0..1), shakeX, shakeY, strobe }.
 */
export function paintCircle(ctx, w, h, cx, cy, R, s) {
  floor(ctx, w, h);
  const st = s.style ?? CIRCLE_STYLES['military-circle'];
  if (st.floorTint) {
    ctx.fillStyle = st.floorTint;
    ctx.fillRect(0, 0, w, h);
  }
  if (st.planks) {
    // weathered floorboards
    ctx.strokeStyle = 'rgba(0,0,0,0.28)';
    ctx.lineWidth = 2;
    const gap = Math.max(18, R * 0.16);
    for (let y = (cy % gap) - gap; y < h; y += gap) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
  }
  // overhead work lamp: a warm pool of light on the slab
  const light = s.light ?? 1;
  const pool = ctx.createRadialGradient(cx, cy - R * 0.1, R * 0.2, cx, cy, R * 2.1);
  pool.addColorStop(0, `rgba(255,236,200,${0.2 * light})`);
  pool.addColorStop(0.6, `rgba(255,236,200,${0.06 * light})`);
  pool.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = pool;
  ctx.fillRect(0, 0, w, h);
  // vignette into darkness
  const vg = ctx.createRadialGradient(cx, cy, R * 0.9, cx, cy, Math.max(w, h) * 0.75);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, `rgba(4,4,6,${0.55 + 0.35 * (1 - light)})`);
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, w, h);
  if (s.strobe > 0) {
    ctx.fillStyle = `rgba(190,40,30,${s.strobe * 0.12})`;
    ctx.fillRect(0, 0, w, h);
  }

  ctx.save();
  ctx.translate(cx + (s.shakeX ?? 0), cy + (s.shakeY ?? 0));
  if (st.hazard) {
    // hazard band around the pad
    ctx.save();
    ctx.globalAlpha = 0.5 + 0.3 * light;
    ctx.beginPath();
    ctx.arc(0, 0, R * 1.2, 0, TAU);
    ctx.arc(0, 0, R * 1.14, 0, TAU, true);
    ctx.clip();
    for (let i = 0; i < 48; i++) {
      ctx.fillStyle = i % 2 ? '#d9a12a' : '#1c1d1f';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, R * 1.3, (i / 48) * TAU + (s.rotOuter ?? 0), ((i + 1) / 48) * TAU + (s.rotOuter ?? 0));
      ctx.fill();
    }
    ctx.restore();
  }
  ctx.globalAlpha = 0.55 + 0.35 * light;
  ctx.strokeStyle = st.paint;
  ctx.fillStyle = st.paint;
  if (st.doubleRing) {
    ctx.lineWidth = R * 0.012;
    ctx.beginPath();
    ctx.arc(0, 0, R * 1.035, 0, TAU);
    ctx.stroke();
  }
  // outer ring + rotating tick bezel
  ctx.lineWidth = R * 0.028;
  ctx.beginPath();
  ctx.arc(0, 0, R, 0, TAU);
  ctx.stroke();
  ctx.save();
  ctx.rotate(s.rotOuter ?? 0);
  for (let i = 0; i < 72; i++) {
    const long = i % 6 === 0;
    ctx.lineWidth = long ? R * 0.016 : R * 0.008;
    ctx.beginPath();
    ctx.moveTo(0, -R * 0.965);
    ctx.lineTo(0, -R * (long ? 0.88 : 0.92));
    ctx.stroke();
    ctx.rotate(TAU / 72);
  }
  ctx.restore();
  stencilText(ctx, st.text, R * 0.8, -(s.rotOuter ?? 0) * 0.5, R * 0.07);
  // inner dashed ring
  ctx.lineWidth = R * 0.014;
  ctx.setLineDash([R * 0.05, R * 0.035]);
  ctx.lineDashOffset = (s.rotInner ?? 0) * R;
  ctx.beginPath();
  ctx.arc(0, 0, R * 0.68, 0, TAU);
  ctx.stroke();
  ctx.setLineDash([]);
  // four chevrons pointing in
  ctx.save();
  ctx.rotate(s.rotInner ?? 0);
  for (let i = 0; i < st.chevrons; i++) {
    ctx.beginPath();
    ctx.moveTo(-R * 0.08, -R * 0.6);
    ctx.lineTo(0, -R * 0.5);
    ctx.lineTo(R * 0.08, -R * 0.6);
    ctx.lineTo(R * 0.08, -R * 0.55);
    ctx.lineTo(0, -R * 0.45);
    ctx.lineTo(-R * 0.08, -R * 0.55);
    ctx.closePath();
    ctx.fill();
    ctx.rotate(TAU / st.chevrons);
  }
  ctx.restore();
  // centre: star in a disc
  ctx.lineWidth = R * 0.02;
  ctx.beginPath();
  ctx.arc(0, 0, R * 0.26, 0, TAU);
  ctx.stroke();
  if (st.accent) ctx.fillStyle = st.accent;
  if (st.emblem === 'roulette') {
    ctx.save();
    ctx.rotate((s.rotInner ?? 0) * 3);
    for (let i = 0; i < 18; i++) {
      ctx.fillStyle = i === 0 ? '#2f8a4a' : i % 2 ? '#b7353a' : '#16161a';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, R * 0.24, (i / 18) * TAU, ((i + 1) / 18) * TAU);
      ctx.fill();
    }
    ctx.fillStyle = '#d6b048';
    circle(ctx, 0, 0, R * 0.07);
    ctx.fill();
    ctx.restore();
  } else if (st.emblem === 'atom') {
    ctx.strokeStyle = st.accent;
    ctx.lineWidth = R * 0.018;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.ellipse(0, 0, R * 0.21, R * 0.075, (s.rotInner ?? 0) + (i * Math.PI) / 3, 0, TAU);
      ctx.stroke();
    }
    ctx.fillStyle = st.accent;
    circle(ctx, 0, 0, R * 0.045);
    ctx.fill();
  } else if (st.emblem === 'badge') {
    // six-pointed sheriff star with ball tips
    ctx.beginPath();
    for (let i = 0; i < 12; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 6;
      const rr = i % 2 ? R * 0.1 : R * 0.21;
      ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    ctx.closePath();
    ctx.fill();
    for (let i = 0; i < 6; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 3;
      circle(ctx, Math.cos(a) * R * 0.22, Math.sin(a) * R * 0.22, R * 0.025);
      ctx.fill();
    }
  } else {
    star(ctx, R * 0.2);
    ctx.fill();
  }
  if (st.accent && !st.emblem) {
    // rank bars above the star on the advanced circle
    for (let i = 0; i < 2; i++) ctx.fillRect(-R * 0.09, -R * 0.36 - i * R * 0.05, R * 0.18, R * 0.025);
  }
  ctx.globalAlpha = 1;
  if (s.stamp > 0) {
    // CLASSIFIED stamp slammed across the circle (rare results)
    const k = Math.min(1, s.stamp);
    ctx.save();
    ctx.rotate(-0.18);
    ctx.scale(1 + (1 - k) * 0.6, 1 + (1 - k) * 0.6);
    ctx.globalAlpha = k * 0.9;
    const stampCol = s.stampColor ?? '#d9533f';
    ctx.strokeStyle = stampCol;
    ctx.lineWidth = R * 0.025;
    ctx.strokeRect(-R * 0.62, -R * 0.13, R * 1.24, R * 0.26);
    ctx.fillStyle = stampCol;
    ctx.font = `800 ${R * 0.17}px "Barlow Condensed", "Arial Narrow", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `800 ${R * (((s.stampText ?? st.stampText ?? 'CLASSIFIED').length > 11) ? 0.12 : 0.17)}px "Barlow Condensed", "Arial Narrow", sans-serif`;
    ctx.fillText(s.stampText ?? st.stampText ?? 'CLASSIFIED', 0, R * 0.01);
    ctx.restore();
  }

  // radar sweep (only while charging)
  if (s.sweep != null) {
    const g = ctx.createConicGradient ? ctx.createConicGradient(s.sweep - 0.9, 0, 0) : null;
    if (g) {
      g.addColorStop(0, 'rgba(0,0,0,0)');
      g.addColorStop(0.14, hexA(s.sweepColor ?? STEEL, 0.22));
      g.addColorStop(0.145, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, 0, R * 0.96, 0, TAU);
      ctx.fill();
    }
  }

  if (s.beacon != null) {
    // rotating red emergency beacon: a single sweeping wedge of light
    const g = ctx.createConicGradient ? ctx.createConicGradient(s.beacon, 0, 0) : null;
    const bc = s.beaconColor ?? st.beacon ?? '210,50,35';
    if (g) {
      g.addColorStop(0, `rgba(${bc},0.28)`);
      g.addColorStop(0.08, `rgba(${bc},0)`);
      g.addColorStop(0.5, `rgba(${bc},0)`);
      g.addColorStop(0.58, `rgba(${bc},0.28)`);
      g.addColorStop(0.581, `rgba(${bc},0)`);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, 0, R * 2.4, 0, TAU);
      ctx.fill();
    }
  }
  // perimeter lamps: housing + lens (lit lenses are real light sources)
  const lamps = s.lamps ?? [];
  for (let i = 0; i < LAMPS; i++) {
    const a = (i / LAMPS) * TAU - Math.PI / 2;
    const x = Math.cos(a) * R * 1.1;
    const y = Math.sin(a) * R * 1.1;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(a + Math.PI / 2);
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(-R * 0.035 + 2, -R * 0.03 + 3, R * 0.07, R * 0.06);
    ctx.fillStyle = '#3a3d42';
    ctx.fillRect(-R * 0.035, -R * 0.03, R * 0.07, R * 0.06);
    const c = lamps[i];
    ctx.fillStyle = c ?? '#1b1d20';
    ctx.fillRect(-R * 0.024, -R * 0.018, R * 0.048, R * 0.036);
    ctx.restore();
    if (c) {
      const g = ctx.createRadialGradient(x, y, 0, x, y, R * 0.14);
      g.addColorStop(0, hexA(c, 0.28));
      g.addColorStop(1, hexA(c, 0));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, R * 0.14, 0, TAU);
      ctx.fill();
    }
  }
  ctx.restore();
}

function hexA(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

/** Supply crate seen from above; `open` 0..1 folds the four lids outward. */
export function paintCrate(ctx, x, y, size, open, stripe, img, armored = false) {
  const s = size / 2;
  ctx.save();
  ctx.translate(x, y);
  // contact shadow
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.fillRect(-s + size * 0.06, -s + size * 0.08, size, size);
  // interior
  ctx.fillStyle = '#1e1913';
  ctx.fillRect(-s, -s, size, size);
  if (img && open > 0.05) {
    const k = 0.75 + 0.35 * ease(open);
    ctx.globalAlpha = Math.min(1, open * 2);
    ctx.drawImage(img, -s * k, -s * k * 1.15, size * k, size * k);
    ctx.globalAlpha = 1;
  }
  // lids: each hinges on an outer edge and folds outward onto the floor
  const lid = (rot) => {
    ctx.save();
    ctx.rotate(rot);
    const out = Math.sin(ease(open) * Math.PI / 2);
    const depth = size * 0.48 * out;
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.moveTo(-s + 2, -s);
    ctx.lineTo(s + 2, -s);
    ctx.lineTo(s * 0.92 + 4, -s - depth + 4);
    ctx.lineTo(-s * 0.92 + 4, -s - depth + 4);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-s, -s);
    ctx.lineTo(s, -s);
    ctx.lineTo(s * 0.92, -s - depth);
    ctx.lineTo(-s * 0.92, -s - depth);
    ctx.closePath();
    ctx.fillStyle = '#7a6140';
    ctx.fill();
    ctx.strokeStyle = '#2e2416';
    ctx.lineWidth = Math.max(1, size * 0.02);
    ctx.stroke();
    // inner face planks
    ctx.strokeStyle = '#5b4830';
    ctx.lineWidth = Math.max(1, size * 0.012);
    for (let k = 1; k < 3; k++) {
      ctx.beginPath();
      ctx.moveTo(-s * 0.95, -s - (depth * k) / 3);
      ctx.lineTo(s * 0.95, -s - (depth * k) / 3);
      ctx.stroke();
    }
    ctx.restore();
  };
  if (open < 0.02 && armored) {
    // armoured steel container with hazard edging (rare results only)
    ctx.fillStyle = '#3b4046';
    ctx.fillRect(-s, -s, size, size);
    ctx.save();
    ctx.beginPath();
    ctx.rect(-s, -s, size, size);
    ctx.rect(-s * 0.84, -s * 0.84, size * 0.84, size * 0.84);
    ctx.clip('evenodd');
    for (let i = -8; i < 8; i++) {
      ctx.fillStyle = i % 2 ? '#d9a12a' : '#1c1d1f';
      ctx.beginPath();
      ctx.moveTo(-s + i * size * 0.14, -s);
      ctx.lineTo(-s + (i + 1) * size * 0.14, -s);
      ctx.lineTo(-s + (i + 1) * size * 0.14 + size, s);
      ctx.lineTo(-s + i * size * 0.14 + size, s);
      ctx.fill();
    }
    ctx.restore();
    ctx.strokeStyle = '#121315';
    ctx.lineWidth = Math.max(1.5, size * 0.025);
    ctx.strokeRect(-s, -s, size, size);
    ctx.fillStyle = stripe;
    ctx.save();
    star(ctx, s * 0.36);
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = '#9aa1aa';
    for (const [px, py] of [[-0.6, -0.6], [0.6, -0.6], [-0.6, 0.6], [0.6, 0.6]]) circle(ctx, px * s, py * s, size * 0.025), ctx.fill();
  } else if (open < 0.02) {
    // closed crate: planks, steel corners, stencilled star and rarity stripe
    ctx.fillStyle = '#7a6140';
    ctx.fillRect(-s, -s, size, size);
    ctx.strokeStyle = '#4d3c26';
    ctx.lineWidth = Math.max(1, size * 0.015);
    for (let i = 1; i < 5; i++) {
      ctx.beginPath();
      ctx.moveTo(-s, -s + (i * size) / 5);
      ctx.lineTo(s, -s + (i * size) / 5);
      ctx.stroke();
    }
    ctx.fillStyle = stripe;
    ctx.fillRect(-s, -s * 0.12, size, s * 0.24);
    ctx.fillStyle = '#d7c79c';
    ctx.save();
    star(ctx, s * 0.32);
    ctx.globalAlpha = 0.85;
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = '#3b3e44';
    const c = size * 0.12;
    for (const [px, py] of [[-s, -s], [s - c, -s], [-s, s - c], [s - c, s - c]]) ctx.fillRect(px, py, c, c);
    ctx.strokeStyle = '#2e2416';
    ctx.lineWidth = Math.max(1.5, size * 0.025);
    ctx.strokeRect(-s, -s, size, size);
  } else {
    for (let i = 0; i < 4; i++) lid((i * Math.PI) / 2);
  }
  ctx.restore();
}

// ---------------------------------------------------------------- stage

/** The idle banner stage: slow rotation, steel lamps cycling. */
export class SummonStage {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.t = 0;
    this.running = false;
  }

  start() {
    if (this.running) return;
    this.running = true;
    let last = performance.now();
    const loop = (now) => {
      if (!this.running) return;
      this.t += Math.min(0.1, (now - last) / 1000);
      last = now;
      this.draw();
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  stop() {
    this.running = false;
  }

  draw() {
    const c = this.canvas;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = c.clientWidth;
    const h = c.clientHeight;
    if (!w || !h) return;
    if (c.width !== Math.round(w * dpr) || c.height !== Math.round(h * dpr)) {
      c.width = Math.round(w * dpr);
      c.height = Math.round(h * dpr);
    }
    const ctx = this.ctx;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const R = Math.min(w, h) * 0.33;
    const lamps = [];
    const lit = Math.floor(this.t * 2) % LAMPS;
    for (let i = 0; i < LAMPS; i++) lamps.push(i === lit || i === (lit + LAMPS / 2) % LAMPS ? STEEL : null);
    paintCircle(ctx, w, h, w / 2, h * 0.56, R, { rotOuter: this.t * 0.05, rotInner: -this.t * 0.08, lamps, light: 0.9, style: circleStyle(this.banner?.id) });
  }
}

// ---------------------------------------------------------------- rare shows
// Signature reveals for the rarest units. They only decorate the sequence:
// the result was decided before the animation started.

const lerp = (a, b, k) => a + (b - a) * k;

function sunsetWash(ctx, w, h, a) {
  const g = ctx.createLinearGradient(0, h, 0, 0);
  g.addColorStop(0, `rgba(230,120,40,${0.32 * a})`);
  g.addColorStop(1, `rgba(120,40,30,${0.12 * a})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

function coinShower(ctx, cx, h, R, t, n, color = '#e8c255') {
  for (let i = 0; i < n; i++) {
    const seed = (i * 97.13) % 1;
    const x = cx + (((i * 53) % 100) / 100 - 0.5) * R * 3.2;
    const y = -20 + ((t * (220 + ((i * 31) % 120)) + i * 37) % (h + 40));
    const flip = Math.abs(Math.sin(t * 8 + i));
    ctx.fillStyle = color;
    ctx.strokeStyle = '#8a6a1a';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(x, y, 5 + seed * 2, (5 + seed * 2) * flip + 0.6, 0, 0, TAU);
    ctx.fill();
    ctx.stroke();
  }
}

const SLOT_SYMBOLS = ['7', '♣', 'BAR', '♦', '★', '♥'];

const RARE_SHOWS = {
  // FASTEST HAND IN THE WEST: a sundown standoff. A revolver cylinder spins in the
  // silence, then six shots ring out around the circle before the crate lands.
  'fastest-hand': {
    stamp: 'HIGH NOON',
    stampColor: '#e8c255',
    beaconColor: '230,150,60',
    cues(seq, t, ph) {
      if (t >= ph.quiet) seq.cue('cylinder', () => sfx.cylinder(12));
      for (let i = 0; i < 6; i++) if (t >= ph.slam + i * 0.09) seq.cue(`bang${i}`, () => sfx.shot('golden', 1));
    },
    draw(ctx, { cx, cy, R, w, h, t, ph }) {
      if (t > ph.quiet) sunsetWash(ctx, w, h, Math.min(1, (t - ph.quiet) / 0.6));
      if (t > ph.quiet && t < ph.slam + 0.2) {
        const k = Math.min(1, (t - ph.quiet) / (ph.slam - ph.quiet));
        const rot = (1 - Math.pow(1 - k, 3)) * TAU * 5;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(rot);
        ctx.globalAlpha = t > ph.slam ? 1 - (t - ph.slam) / 0.2 : 1;
        ctx.fillStyle = '#4a4850';
        ctx.strokeStyle = '#141216';
        ctx.lineWidth = 3;
        circle(ctx, 0, 0, R * 0.34);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#141216';
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * TAU;
          circle(ctx, Math.cos(a) * R * 0.2, Math.sin(a) * R * 0.2, R * 0.07);
          ctx.fill();
        }
        ctx.fillStyle = '#c9a24a';
        circle(ctx, 0, 0, R * 0.05);
        ctx.fill();
        ctx.restore();
      }
      for (let i = 0; i < 6; i++) {
        const tt = t - (ph.slam + i * 0.09);
        if (tt < 0) continue;
        const a = -Math.PI / 2 + (i / 6) * TAU;
        const x = cx + Math.cos(a) * R * 0.86;
        const y = cy + Math.sin(a) * R * 0.86;
        ctx.fillStyle = '#141216';
        circle(ctx, x, y, R * 0.03);
        ctx.fill();
        if (tt < 0.14) {
          ctx.fillStyle = `rgba(255,233,168,${1 - tt / 0.14})`;
          ctx.beginPath();
          for (let j = 0; j < 8; j++) {
            const b = (j / 8) * TAU;
            const rr = (j % 2 ? 0.35 : 1) * R * 0.12;
            ctx.lineTo(x + Math.cos(b) * rr, y + Math.sin(b) * rr);
          }
          ctx.fill();
        }
      }
    },
  },
  // THE HOUSE: the circle becomes a slot machine. Three reels stop one by one on
  // 7-7-7, the lamps flood gold and coins pour down.
  'the-house': {
    stamp: 'JACKPOT',
    stampColor: '#e8c255',
    beaconColor: '230,190,70',
    cues(seq, t, ph) {
      for (let i = 0; i < 3; i++) if (t >= ph.reel(i)) seq.cue(`reel${i}`, () => sfx.reelStop(1 + i * 0.25));
      if (t >= ph.slam) seq.cue('jackpot', () => sfx.coins(true));
      if (t >= ph.slam + 0.4) seq.cue('jackpot2', () => sfx.coins(true));
    },
    draw(ctx, { cx, cy, R, w, h, t, ph }) {
      if (t > ph.quiet && t < ph.tDrop) {
        const fw = R * 1.3;
        const fh = R * 0.46;
        const x0 = cx - fw / 2;
        const y0 = cy - R * 0.62;
        ctx.fillStyle = '#5a1f2a';
        ctx.strokeStyle = '#d6b048';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.roundRect(x0 - 10, y0 - 10, fw + 20, fh + 20, 10);
        ctx.fill();
        ctx.stroke();
        for (let i = 0; i < 3; i++) {
          const rx = x0 + (i * fw) / 3 + 4;
          const rw = fw / 3 - 8;
          ctx.fillStyle = '#f4efe6';
          ctx.fillRect(rx, y0, rw, fh);
          ctx.save();
          ctx.beginPath();
          ctx.rect(rx, y0, rw, fh);
          ctx.clip();
          const stopped = t >= ph.reel(i);
          const spin = stopped ? 0 : (t * (9 + i * 2)) % SLOT_SYMBOLS.length;
          ctx.font = `800 ${fh * 0.62}px "Barlow Condensed", sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          for (let k = -1; k <= 1; k++) {
            const idx = stopped ? 0 : (Math.floor(spin) + k + SLOT_SYMBOLS.length) % SLOT_SYMBOLS.length;
            const off = stopped ? k * fh : (k - (spin % 1)) * fh;
            const sym = SLOT_SYMBOLS[idx];
            ctx.fillStyle = sym === '7' ? '#c4392b' : '#1d1b1a';
            if (!stopped || k === 0) ctx.fillText(sym, rx + rw / 2, y0 + fh / 2 + off);
          }
          ctx.restore();
          if (stopped && t - ph.reel(i) < 0.2) {
            ctx.strokeStyle = '#ffe9a8';
            ctx.lineWidth = 3;
            ctx.strokeRect(rx, y0, rw, fh);
          }
        }
      }
      if (t >= ph.slam) coinShower(ctx, cx, h, R, t - ph.slam, 46);
    },
  },
  'high-roller': {
    stamp: 'HIGH ROLLER',
    stampColor: '#e8c255',
    beaconColor: '230,190,70',
    cues(seq, t, ph) {
      if (t >= ph.slam) seq.cue('coins', () => sfx.coins(true));
    },
    draw(ctx, { cx, h, R, t, ph }) {
      if (t >= ph.slam) coinShower(ctx, cx, h, R, t - ph.slam, 22, '#b7353a');
    },
  },
  // NUCLEAR WARHEAD (arcade): a launch countdown, then a teal flash.
  'nuclear-warhead': {
    stamp: 'GROUND ZERO',
    stampColor: '#2fb39a',
    beaconColor: '60,220,180',
    cues(seq, t, ph) {
      for (let i = 0; i < 3; i++) if (t >= lerp(ph.quiet, ph.slam, i / 3)) seq.cue(`count${i}`, () => sfx.click(1.6 - i * 0.2));
      if (t >= ph.slam) seq.cue('boom', () => sfx.explosion(4, 1));
    },
    draw(ctx, { cx, cy, R, w, h, t, ph }) {
      if (t > ph.quiet && t < ph.slam) {
        const k = (t - ph.quiet) / (ph.slam - ph.quiet);
        const n = 3 - Math.floor(k * 3);
        ctx.font = `800 ${R * 0.7}px "Barlow Condensed", sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = `rgba(159,245,221,${0.4 + 0.6 * (1 - ((k * 3) % 1))})`;
        ctx.fillText(String(n), cx, cy);
      }
      if (t >= ph.slam && t < ph.slam + 0.5) {
        ctx.fillStyle = `rgba(200,255,240,${0.6 * (1 - (t - ph.slam) / 0.5)})`;
        ctx.fillRect(0, 0, w, h);
      }
    },
  },
  // ANTIMATTER WARHEAD (arcade): space folds into the centre, then bursts violet.
  'antimatter-warhead': {
    stamp: 'SINGULARITY',
    stampColor: '#b79cff',
    beaconColor: '150,110,240',
    cues(seq, t, ph) {
      if (t >= ph.quiet) seq.cue('implode', () => sfx.implode(ph.slam - ph.quiet));
      if (t >= ph.slam) seq.cue('boom', () => sfx.explosion(4, 1));
    },
    draw(ctx, { cx, cy, R, w, h, t, ph }) {
      if (t > ph.quiet && t < ph.slam) {
        const k = (t - ph.quiet) / (ph.slam - ph.quiet);
        for (let i = 0; i < 5; i++) {
          const q = 1 - (((k * 2 + i / 5) % 1));
          ctx.strokeStyle = `rgba(183,156,255,${0.7 * (1 - q)})`;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(cx, cy, R * 1.6 * q, 0, TAU);
          ctx.stroke();
        }
        ctx.fillStyle = '#0c0814';
        circle(ctx, cx, cy, R * 0.08 * (1 + k));
        ctx.fill();
      }
      if (t >= ph.slam && t < ph.slam + 0.5) {
        ctx.fillStyle = `rgba(220,200,255,${0.6 * (1 - (t - ph.slam) / 0.5)})`;
        ctx.fillRect(0, 0, w, h);
      }
    },
  },
};

/** Phase times of the current reveal, shared by the rare shows. */
function phases(T) {
  const tLock = T.lock;
  const tCharge = tLock + T.charge;
  const tDrop = tCharge + T.drop;
  return {
    tLock,
    tCharge,
    tDrop,
    tOpen: tDrop + T.open,
    quiet: tLock * 0.6,
    slam: tLock + T.charge * 0.7,
    reel: (i) => tLock + T.charge * (0.25 + i * 0.2),
  };
}

export const hasRareShow = (unitId) => !!RARE_SHOWS[unitId];

// ---------------------------------------------------------------- reveal

const portraitImages = new Map();
function portraitImage(def) {
  let img = portraitImages.get(def.id);
  if (!img) {
    img = new Image();
    img.src = unitPortrait(def.art, 256);
    portraitImages.set(def.id, img);
  }
  return img;
}

/**
 * Plays the reveal for a list of results ({ unit, tier, isNew, chance }).
 * Calls onCard(result, index) when a unit is revealed and onDone() at the end.
 */
export class RevealSequence {
  constructor({ canvas, results, onCard, onDone, banner }) {
    this.style = circleStyle(banner?.id);
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.results = results;
    this.onCard = onCard;
    this.onDone = onDone;
    this.multi = results.length > 1;
    this.i = 0;
    this.t = 0;
    this.done = false;
    this.cardShown = false;
    this.cues = new Set();
    for (const r of results) portraitImage(getUnit(r.unit));
    this.timing = this.multi ? { lock: 0.4, charge: 0.45, drop: 0.3, open: 0.3, dwell: 0.9 } : { lock: 0.9, charge: 1.0, drop: 0.45, open: 0.5, dwell: Infinity };
    // rare results always get the long, distinct sequence – even inside a multi-summon
    this.rareTiming = { lock: 1.2, charge: 1.9, drop: 0.6, open: 0.7, dwell: this.multi ? 2.2 : Infinity };
  }

  get current() {
    return this.results[this.i];
  }

  start() {
    let last = performance.now();
    const loop = (now) => {
      if (this.done) return;
      this.step(Math.min(0.05, (now - last) / 1000));
      last = now;
      try {
        this.draw();
      } catch (err) {
        // A drawing problem must never strand the player mid-reveal: skip to the results.
        console.error(err);
        this.finish();
        return;
      }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  /** Advance to the next unit (click), or finish. */
  next() {
    if (this.i >= this.results.length - 1) return this.finish();
    this.i++;
    this.t = 0;
    this.cardShown = false;
    this.cues.clear();
  }

  skip() {
    this.finish();
  }

  finish() {
    if (this.done) return;
    this.done = true;
    this.onDone?.();
  }

  cue(name, fn) {
    if (this.cues.has(name)) return;
    this.cues.add(name);
    fn();
  }

  timingFor(r) {
    return r.rare ? this.rareTiming : this.timing;
  }

  step(dt) {
    this.t += dt;
    const T = this.timingFor(this.current);
    const r = this.current;
    const tier = r.tier;
    const locks = 2 + Math.min(5, tier);
    const tLock = T.lock;
    const tCharge = tLock + T.charge;
    const tDrop = tCharge + T.drop;
    const tOpen = tDrop + T.open;
    // ring locks
    for (let k = 0; k < locks; k++) {
      const at = (k / locks) * (tLock + T.charge * 0.8);
      if (this.t >= at) this.cue(`lock${k}`, () => sfx.click(1 + k * 0.08));
    }
    if (this.t >= tLock * 0.5) this.cue('hum', () => sfx.hum(T.charge + tLock * 0.5, tier / 5));
    const show = r.rare ? RARE_SHOWS[r.unit] : null;
    show?.cues(this, this.t, phases(T));
    if ((tier >= 5 || r.rare) && this.t >= tLock) this.cue('alarm', () => sfx.alarm(r.rare));
    if (this.t >= tCharge) this.cue('whoosh', () => sfx.whoosh(T.drop));
    if (this.t >= tDrop) this.cue('thud', () => sfx.thud(Math.min(2, tier / 2.5)));
    if (this.t >= tOpen) {
      this.cue('sting', () => sfx.sting(tier, r.rare));
      if (!this.cardShown) {
        this.cardShown = true;
        this.onCard?.(r, this.i);
      }
      if (this.t >= tOpen + T.dwell) this.next();
    }
  }

  draw() {
    const c = this.canvas;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = c.clientWidth;
    const h = c.clientHeight;
    if (!w || !h) return;
    if (c.width !== Math.round(w * dpr) || c.height !== Math.round(h * dpr)) {
      c.width = Math.round(w * dpr);
      c.height = Math.round(h * dpr);
    }
    const ctx = this.ctx;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const T = this.timingFor(this.current);
    const r = this.current;
    const def = getUnit(r.unit);
    const tier = r.tier;
    const tierColor = getTier(tier).color;
    const R = Math.min(w, h) * 0.26;
    const cx = w / 2;
    const cy = h * 0.4;
    const t = this.t;
    const tLock = T.lock;
    const tCharge = tLock + T.charge;
    const tDrop = tCharge + T.drop;
    const tOpen = tDrop + T.open;

    // Lamps climb the rarity ladder: steel, then each tier colour up to the result.
    const ladder = [STEEL];
    for (let k = 2; k <= tier; k++) ladder.push(getTier(k).color);
    const progress = Math.min(1, t / (tCharge * 0.95));
    const litCount = Math.round(progress * LAMPS);
    const stage = Math.min(ladder.length - 1, Math.floor(progress * ladder.length));
    const lamps = [];
    // Rare: lamps black out and a red beacon sweeps, then every lamp slams on in the tier colour.
    const rare = !!r.rare;
    const show = rare ? RARE_SHOWS[r.unit] : null;
    const blackout = rare && t > tLock * 0.6 && t < tLock + T.charge * 0.7;
    for (let i = 0; i < LAMPS; i++) {
      if (rare) lamps.push(blackout ? null : t >= tLock + T.charge * 0.7 ? tierColor : i < litCount ? ladder[0] : null);
      else lamps.push(i < litCount ? (t >= tCharge ? tierColor : ladder[stage]) : null);
    }
    if (rare && t >= tLock + T.charge * 0.7) this.cue('slam', () => sfx.thud(0.6));

    // landing shake scales with rarity
    let shakeX = 0;
    let shakeY = 0;
    if (t >= tDrop && t < tDrop + 0.25) {
      const k = (1 - (t - tDrop) / 0.25) * (2 + tier * 1.5);
      shakeX = (Math.random() * 2 - 1) * k;
      shakeY = (Math.random() * 2 - 1) * k;
    }
    const locks = 2 + Math.min(5, tier);
    const lockStep = Math.min(locks, Math.floor((t / (tLock + T.charge * 0.8)) * locks));
    paintCircle(ctx, w, h, cx, cy, R, {
      rotOuter: lockStep * (TAU / 24) + (t < tCharge ? Math.sin(t * 30) * 0.004 : 0),
      rotInner: -lockStep * (TAU / 16),
      lamps,
      light: blackout ? 0.12 : t < tLock ? 0.5 + 0.5 * (1 - ease(t / tLock)) * 0.4 : t < tDrop ? 0.4 : 0.4 + 0.6 * ease((t - tDrop) / 0.4),
      sweep: !rare && t > tLock * 0.5 && t < tDrop ? t * (4 + tier) : null,
      beacon: blackout ? t * 5 : null,
      stamp: rare && t >= tLock + T.charge * 0.7 ? (t - (tLock + T.charge * 0.7)) / 0.25 : 0,
      style: this.style,
      stampText: show?.stamp,
      stampColor: show?.stampColor,
      beaconColor: show?.beaconColor,
      sweepColor: ladder[stage],
      strobe: tier >= 5 && t > tLock && t < tDrop ? 0.5 + 0.5 * Math.sin(t * 18) : 0,
      shakeX,
      shakeY,
    });

    show?.draw(ctx, { cx, cy, R, w, h, t, ph: phases(T) });

    // the crate falls from above the lamp and lands on the star
    if (t >= tCharge) {
      const size = R * 0.62;
      const fall = ease(Math.min(1, (t - tCharge) / T.drop));
      const scale = 1 + (1 - fall) * 1.6;
      const shadowA = 0.2 + 0.5 * fall;
      ctx.fillStyle = `rgba(0,0,0,${shadowA * 0.5})`;
      ctx.beginPath();
      ctx.ellipse(cx + 6, cy + 10, size * 0.62 * (0.6 + 0.4 * fall), size * 0.5 * (0.6 + 0.4 * fall), 0, 0, TAU);
      ctx.fill();
      ctx.save();
      ctx.translate(cx + shakeX, cy + shakeY - (1 - fall) * h * 0.25);
      ctx.scale(scale, scale);
      const open = t >= tDrop ? ease((t - tDrop) / T.open) : 0;
      paintCrate(ctx, 0, 0, size, open, tierColor, portraitImage(def), rare);
      ctx.restore();
      // dust ring on landing
      if (t >= tDrop && t < tDrop + 0.6) {
        const k = (t - tDrop) / 0.6;
        ctx.strokeStyle = `rgba(200,190,170,${0.35 * (1 - k)})`;
        ctx.lineWidth = 4 * (1 - k) + 1;
        ctx.beginPath();
        ctx.ellipse(cx, cy + size * 0.1, size * (0.6 + k * 0.9), size * (0.45 + k * 0.6), 0, 0, TAU);
        ctx.stroke();
      }
      // rarity spotlight cone from the lamp once open
      if (t >= tOpen - T.open * 0.4) {
        const k = ease((t - (tOpen - T.open * 0.4)) / 0.5);
        const g = ctx.createLinearGradient(cx, 0, cx, cy + size);
        g.addColorStop(0, hexA(tierColor, 0));
        g.addColorStop(1, hexA(tierColor, 0.1 + 0.04 * tier * k));
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(cx - size * 0.15, 0);
        ctx.lineTo(cx + size * 0.15, 0);
        ctx.lineTo(cx + size * 0.75, cy + size * 0.55);
        ctx.lineTo(cx - size * 0.75, cy + size * 0.55);
        ctx.closePath();
        ctx.globalAlpha = k;
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    }
  }
}
