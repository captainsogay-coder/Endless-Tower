// Default visual for units that don't provide their own render(): a pedestal
// tinted by tier with an orb that aims at targets. Used by prototype proxies.
import { getTier } from '../units/tiers.js';
import { makeCanvas, circle, polygon, drawGlow } from './canvas.js';
import { shade } from '../core/color.js';
import { TAU } from '../core/math.js';

const RES = 2;
const cache = new Map();

function baseSprite(tierIndex) {
  let s = cache.get(tierIndex);
  if (s) return s;
  const tier = getTier(tierIndex);
  const half = 16;
  const c = makeCanvas(half * 2 * RES, half * 2 * RES);
  const ctx = c.getContext('2d');
  ctx.setTransform(RES, 0, 0, RES, half * RES, half * RES);
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.ellipse(1.5, 4, 13, 9, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#20232b';
  polygon(ctx, 0, 1, 13.5, 6, Math.PI / 6);
  ctx.fill();
  const g = ctx.createLinearGradient(0, -12, 0, 12);
  g.addColorStop(0, '#6c7280');
  g.addColorStop(1, '#3a3e48');
  ctx.fillStyle = g;
  polygon(ctx, 0, 0, 12, 6, Math.PI / 6);
  ctx.fill();
  ctx.strokeStyle = tier.color;
  ctx.lineWidth = 2;
  polygon(ctx, 0, 0, 10, 6, Math.PI / 6);
  ctx.stroke();
  ctx.fillStyle = shade(tier.color, -0.5);
  circle(ctx, 0, 0, 6.5);
  ctx.fill();
  // tier pips (up to 6, then a number badge is drawn live)
  const pips = Math.min(6, tierIndex);
  ctx.fillStyle = tier.color;
  for (let i = 0; i < pips; i++) {
    const a = Math.PI / 2 + ((i - (pips - 1) / 2) * 0.32);
    circle(ctx, Math.cos(a) * 12.6, Math.sin(a) * 12.6, 1.4);
    ctx.fill();
  }
  s = { img: c, half };
  cache.set(tierIndex, s);
  return s;
}

const orbCache = new Map();
/** Orb + halo pre-composed per tier, so each unit costs two image blits per frame. */
function orbSprite(tierIndex) {
  let s = orbCache.get(tierIndex);
  if (s) return s;
  const tier = getTier(tierIndex);
  const half = 13;
  const c = makeCanvas(half * 2 * RES, half * 2 * RES);
  const ctx = c.getContext('2d');
  ctx.setTransform(RES, 0, 0, RES, half * RES, half * RES);
  drawGlow(ctx, tier.prismatic ? '#ffffff' : tier.color, 0, 0, 12, 0.6);
  ctx.fillStyle = tier.color;
  circle(ctx, 0, 0, 4.6);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  circle(ctx, -1.4, -1.4, 1.5);
  ctx.fill();
  s = { img: c, half };
  orbCache.set(tierIndex, s);
  return s;
}

export function drawDefaultUnit(ctx, u, t) {
  const s = baseSprite(u.tier);
  ctx.drawImage(s.img, u.x - s.half, u.y - s.half, s.half * 2, s.half * 2);
  const o = orbSprite(u.tier);
  const kick = u.recoil * 2.5;
  const ox = u.x + Math.cos(u.angle) * (3 - kick);
  const oy = u.y - 2 + Math.sin(u.angle) * (3 - kick);
  const size = o.half * (1 + u.recoil * 0.35);
  ctx.drawImage(o.img, ox - size, oy - size, size * 2, size * 2);
  if (u.tier > 6) {
    const tier = getTier(u.tier);
    ctx.font = 'bold 8px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = `hsl(${(t * 90 + u.tier * 40) % 360},90%,70%)`;
    ctx.fillText(tier.short, u.x, u.y + 10);
  }
}
