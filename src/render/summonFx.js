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
import { makeCanvas } from './canvas.js';
import * as sfx from '../audio/sfx.js';

const TAU = Math.PI * 2;
const PAINT = '#c8b07c'; // faded stencil paint
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
  ctx.globalAlpha = 0.55 + 0.35 * light;
  ctx.strokeStyle = PAINT;
  ctx.fillStyle = PAINT;
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
  stencilText(ctx, 'REQUISITION · ENDLESS TOWER · FORWARD COMMAND · ', R * 0.8, -(s.rotOuter ?? 0) * 0.5, R * 0.07);
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
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.moveTo(-R * 0.08, -R * 0.6);
    ctx.lineTo(0, -R * 0.5);
    ctx.lineTo(R * 0.08, -R * 0.6);
    ctx.lineTo(R * 0.08, -R * 0.55);
    ctx.lineTo(0, -R * 0.45);
    ctx.lineTo(-R * 0.08, -R * 0.55);
    ctx.closePath();
    ctx.fill();
    ctx.rotate(TAU / 4);
  }
  ctx.restore();
  // centre: star in a disc
  ctx.lineWidth = R * 0.02;
  ctx.beginPath();
  ctx.arc(0, 0, R * 0.26, 0, TAU);
  ctx.stroke();
  star(ctx, R * 0.2);
  ctx.fill();
  ctx.globalAlpha = 1;

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
export function paintCrate(ctx, x, y, size, open, stripe, img) {
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
  if (open < 0.02) {
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
    paintCircle(ctx, w, h, w / 2, h * 0.56, R, { rotOuter: this.t * 0.05, rotInner: -this.t * 0.08, lamps, light: 0.9 });
  }
}

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
  constructor({ canvas, results, onCard, onDone }) {
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
      this.draw();
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

  step(dt) {
    this.t += dt;
    const T = this.timing;
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
    if (tier >= 5 && this.t >= tLock) this.cue('alarm', () => sfx.alarm());
    if (this.t >= tCharge) this.cue('whoosh', () => sfx.whoosh(T.drop));
    if (this.t >= tDrop) this.cue('thud', () => sfx.thud(Math.min(2, tier / 2.5)));
    if (this.t >= tOpen) {
      this.cue('sting', () => sfx.sting(tier));
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
    const T = this.timing;
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
    for (let i = 0; i < LAMPS; i++) lamps.push(i < litCount ? (t >= tCharge ? tierColor : ladder[stage]) : null);

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
      light: t < tLock ? 0.5 + 0.5 * (1 - ease(t / tLock)) * 0.4 : t < tDrop ? 0.4 : 0.4 + 0.6 * ease((t - tDrop) / 0.4),
      sweep: t > tLock * 0.5 && t < tDrop ? t * (4 + tier) : null,
      sweepColor: ladder[stage],
      strobe: tier >= 5 && t > tLock && t < tDrop ? 0.5 + 0.5 * Math.sin(t * 18) : 0,
      shakeX,
      shakeY,
    });

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
      paintCrate(ctx, 0, 0, size, open, tierColor, portraitImage(def));
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
