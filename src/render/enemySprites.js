// Generic category silhouettes, pre-rendered per biome palette. Each category
// has a distinct, readable shape at a glance: small round minion, hooded
// regular, armoured hexagonal elite, crowned boss. Future roster variants can
// supply their own render() and bypass these.
import { listEnemyCategories } from '../enemies/enemyCategories.js';
import { makeCanvas, circle, polygon } from './canvas.js';
import { shade, rgba } from '../core/color.js';
import { TAU } from '../core/math.js';

const RES = 3;

function eyes(ctx, pal, x, y, spread, r) {
  ctx.fillStyle = rgba(pal.eye, 0.35);
  circle(ctx, x - spread, y, r * 2);
  ctx.fill();
  circle(ctx, x + spread, y, r * 2);
  ctx.fill();
  ctx.fillStyle = pal.eye;
  circle(ctx, x - spread, y, r);
  ctx.fill();
  circle(ctx, x + spread, y, r);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  circle(ctx, x - spread - r * 0.3, y - r * 0.3, r * 0.35);
  ctx.fill();
  circle(ctx, x + spread - r * 0.3, y - r * 0.3, r * 0.35);
  ctx.fill();
}

function bodyGradient(ctx, pal, r) {
  const g = ctx.createRadialGradient(-r * 0.35, -r * 0.45, r * 0.1, 0, 0, r * 1.1);
  g.addColorStop(0, shade(pal.body, 0.35));
  g.addColorStop(0.55, pal.body);
  g.addColorStop(1, shade(pal.body, -0.45));
  return g;
}

const SHAPES = {
  minion(ctx, r, pal) {
    ctx.fillStyle = pal.dark;
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + (i - 2) * 0.5;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a - 0.2) * r * 0.85, Math.sin(a - 0.2) * r * 0.85);
      ctx.lineTo(Math.cos(a) * r * 1.35, Math.sin(a) * r * 1.35);
      ctx.lineTo(Math.cos(a + 0.2) * r * 0.85, Math.sin(a + 0.2) * r * 0.85);
      ctx.fill();
    }
    ctx.fillStyle = pal.dark;
    circle(ctx, 0, 0, r * 1.08);
    ctx.fill();
    ctx.fillStyle = bodyGradient(ctx, pal, r);
    circle(ctx, 0, 0, r);
    ctx.fill();
    eyes(ctx, pal, 0, -r * 0.1, r * 0.36, r * 0.2);
  },
  regular(ctx, r, pal) {
    ctx.fillStyle = pal.dark;
    ctx.beginPath();
    ctx.ellipse(0, r * 0.15, r * 1.12, r * 1.02, 0, 0, TAU);
    ctx.fill();
    // shoulder plates
    ctx.fillStyle = shade(pal.body, -0.25);
    ctx.beginPath();
    ctx.ellipse(-r * 0.75, r * 0.15, r * 0.42, r * 0.36, -0.4, 0, TAU);
    ctx.ellipse(r * 0.75, r * 0.15, r * 0.42, r * 0.36, 0.4, 0, TAU);
    ctx.fill();
    ctx.fillStyle = bodyGradient(ctx, pal, r);
    ctx.beginPath();
    ctx.moveTo(0, -r * 1.05);
    ctx.quadraticCurveTo(r * 0.95, -r * 0.7, r * 0.82, r * 0.5);
    ctx.quadraticCurveTo(0, r * 1.05, -r * 0.82, r * 0.5);
    ctx.quadraticCurveTo(-r * 0.95, -r * 0.7, 0, -r * 1.05);
    ctx.fill();
    // visor
    ctx.fillStyle = pal.dark;
    ctx.beginPath();
    ctx.ellipse(0, -r * 0.18, r * 0.58, r * 0.26, 0, 0, TAU);
    ctx.fill();
    eyes(ctx, pal, 0, -r * 0.18, r * 0.26, r * 0.13);
  },
  elite(ctx, r, pal) {
    ctx.fillStyle = pal.dark;
    // horns
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(s * r * 0.45, -r * 0.6);
      ctx.quadraticCurveTo(s * r * 1.2, -r * 1.0, s * r * 0.95, -r * 1.45);
      ctx.quadraticCurveTo(s * r * 0.9, -r * 0.95, s * r * 0.2, -r * 0.75);
      ctx.fill();
    }
    polygon(ctx, 0, 0, r * 1.12, 6, Math.PI / 6);
    ctx.fill();
    ctx.fillStyle = bodyGradient(ctx, pal, r);
    polygon(ctx, 0, 0, r, 6, Math.PI / 6);
    ctx.fill();
    ctx.strokeStyle = shade(pal.body, -0.4);
    ctx.lineWidth = r * 0.08;
    polygon(ctx, 0, 0, r * 0.68, 6, Math.PI / 6);
    ctx.stroke();
    for (let i = 0; i < 6; i++) {
      const a = Math.PI / 6 + (i / 6) * TAU;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * r * 0.68, Math.sin(a) * r * 0.68);
      ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      ctx.stroke();
    }
    // glowing core
    const g = ctx.createRadialGradient(0, r * 0.05, 0, 0, r * 0.05, r * 0.45);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(0.35, pal.glow);
    g.addColorStop(1, rgba(pal.glow, 0));
    ctx.fillStyle = g;
    circle(ctx, 0, r * 0.05, r * 0.45);
    ctx.fill();
    eyes(ctx, pal, 0, -r * 0.4, r * 0.22, r * 0.1);
  },
  boss(ctx, r, pal) {
    // crown spikes
    ctx.fillStyle = pal.dark;
    const spikes = 9;
    for (let i = 0; i < spikes; i++) {
      const a = -Math.PI / 2 + ((i - (spikes - 1) / 2) / spikes) * Math.PI * 1.25;
      const len = i % 2 ? 1.25 : 1.5;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a - 0.14) * r * 0.85, Math.sin(a - 0.14) * r * 0.85);
      ctx.lineTo(Math.cos(a) * r * len, Math.sin(a) * r * len);
      ctx.lineTo(Math.cos(a + 0.14) * r * 0.85, Math.sin(a + 0.14) * r * 0.85);
      ctx.fill();
    }
    ctx.fillStyle = pal.glow;
    for (let i = 0; i < spikes; i += 2) {
      const a = -Math.PI / 2 + ((i - (spikes - 1) / 2) / spikes) * Math.PI * 1.25;
      circle(ctx, Math.cos(a) * r * 1.42, Math.sin(a) * r * 1.42, r * 0.07);
      ctx.fill();
    }
    ctx.fillStyle = pal.dark;
    circle(ctx, 0, 0, r * 1.08);
    ctx.fill();
    ctx.fillStyle = bodyGradient(ctx, pal, r);
    circle(ctx, 0, 0, r);
    ctx.fill();
    // armour bands
    ctx.strokeStyle = shade(pal.body, -0.45);
    ctx.lineWidth = r * 0.07;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.78, Math.PI * 0.15, Math.PI * 0.85);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.55, Math.PI * 0.2, Math.PI * 0.8);
    ctx.stroke();
    // maw
    ctx.fillStyle = pal.dark;
    ctx.beginPath();
    ctx.ellipse(0, r * 0.32, r * 0.42, r * 0.18, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = rgba(pal.glow, 0.85);
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath();
      ctx.moveTo(i * r * 0.14 - r * 0.05, r * 0.2);
      ctx.lineTo(i * r * 0.14, r * 0.34);
      ctx.lineTo(i * r * 0.14 + r * 0.05, r * 0.2);
      ctx.fill();
    }
    eyes(ctx, pal, 0, -r * 0.2, r * 0.34, r * 0.13);
    eyes(ctx, pal, 0, -r * 0.48, 0.001, r * 0.1);
  },
};

export function buildEnemySprites(pal) {
  const out = {};
  for (const cat of listEnemyCategories()) {
    const r = cat.radius;
    const half = r * 1.6 + 3;
    const size = half * 2;
    const img = makeCanvas(size * RES, size * RES);
    const ctx = img.getContext('2d');
    ctx.setTransform(RES, 0, 0, RES, half * RES, half * RES);
    (SHAPES[cat.silhouette] ?? SHAPES.regular)(ctx, r, pal);
    const flash = makeCanvas(size * RES, size * RES);
    const fctx = flash.getContext('2d');
    fctx.drawImage(img, 0, 0);
    fctx.globalCompositeOperation = 'source-in';
    fctx.fillStyle = '#ffffff';
    fctx.fillRect(0, 0, flash.width, flash.height);
    out[cat.id] = { img, flash, half };
  }
  return out;
}
