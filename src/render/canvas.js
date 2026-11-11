// Browser-only canvas helpers. Imported lazily by render-time code; never call at module load.
import { rgba } from '../core/color.js';

export function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(w));
  c.height = Math.max(1, Math.ceil(h));
  return c;
}

const glowCache = new Map();
/** Cached soft radial glow sprite; draw with drawImage(sprite, x - r, y - r, 2r, 2r). */
export function glowSprite(color, falloff = 0.55) {
  const key = color + falloff;
  let c = glowCache.get(key);
  if (c) return c;
  c = makeCanvas(64, 64);
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, rgba(color, 1));
  g.addColorStop(falloff * 0.5, rgba(color, 0.55));
  g.addColorStop(falloff, rgba(color, 0.18));
  g.addColorStop(1, rgba(color, 0));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  glowCache.set(key, c);
  return c;
}

export function drawGlow(ctx, color, x, y, r, alpha = 1, falloff) {
  if (alpha <= 0 || r <= 0) return;
  const s = glowSprite(color, falloff);
  const prev = ctx.globalAlpha;
  ctx.globalAlpha = prev * alpha;
  ctx.drawImage(s, x - r, y - r, r * 2, r * 2);
  ctx.globalAlpha = prev;
}

export function circle(ctx, x, y, r) {
  ctx.beginPath();
  ctx.arc(x, y, Math.max(0, r), 0, Math.PI * 2);
}

export function polygon(ctx, x, y, r, sides, rot = 0) {
  ctx.beginPath();
  for (let i = 0; i < sides; i++) {
    const a = rot + (i / sides) * Math.PI * 2;
    const px = x + Math.cos(a) * r;
    const py = y + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

export function roundedPolyline(ctx, pts, radius) {
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length - 1; i++) ctx.arcTo(pts[i].x, pts[i].y, pts[i + 1].x, pts[i + 1].y, radius);
  ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
}
