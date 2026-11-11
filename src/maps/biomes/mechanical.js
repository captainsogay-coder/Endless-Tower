import { TILE, WORLD_W, WORLD_H, COLS, ROWS } from '../../config.js';
import { TileType, sampleRoute } from '../mapGenerator.js';
import { scatter, softBlob, dropShadow } from '../paint.js';
import { rgba } from '../../core/color.js';
import { circle, drawGlow } from '../../render/canvas.js';
import { TAU } from '../../core/math.js';

const palette = {
  ground: '#3a3f47',
  groundVariants: ['#454b55', '#2e3239', '#4d4a44', '#282c32', '#3f444c'],
  path: '#5c6068',
  pathEdge: '#1b1e23',
  pathCenter: '#7a7e86',
  feature: '#2c7d34',
  featureEdge: '#16181c',
  featureDeep: '#46b83c',
  featureShine: '#e0ffb0',
  bridge: '#6b7078',
  pad: '#4a4f58',
  accent: '#ffb12b',
  light: '#ffd38a',
  shadow: '#07080a',
};

function gearPath(ctx, x, y, r, teeth, rot) {
  ctx.beginPath();
  const inner = r * 0.78;
  for (let i = 0; i < teeth * 2; i++) {
    const a0 = rot + (i / (teeth * 2)) * TAU;
    const a1 = rot + ((i + 1) / (teeth * 2)) * TAU;
    const rr = i % 2 ? inner : r;
    ctx.lineTo(x + Math.cos(a0) * rr, y + Math.sin(a0) * rr);
    ctx.lineTo(x + Math.cos(a1) * rr, y + Math.sin(a1) * rr);
  }
  ctx.closePath();
}

export default {
  id: 'mechanical',
  name: 'Mechanical Wasteland',
  tagline: 'The machines never stopped. Their makers did.',
  palette,
  enemyPalette: { body: '#d4683a', dark: '#5a2414', eye: '#7ff7ff', glow: '#ff9a5a' },
  portalColor: '#ffb12b',
  bossTitle: 'Warden of the Iron Heart',
  bridgeStyle: 'stone',
  layout: { styles: { meander: 3, serpentine: 3, converge: 2 }, featureDensity: 0.05, rivers: [0, 1], noiseScale: 0.22 },
  decor: [
    { kind: 'bigGear', count: [4, 7], fp: 2, minPathDist: 2, size: 1.05 },
    { kind: 'bigGear', count: [4, 7], fp: 1, minPathDist: 1, size: 0.6 },
    { kind: 'steamVent', count: [5, 8], fp: 1, minPathDist: 1, size: 0.5 },
    { kind: 'machine', count: [3, 5], fp: 2, minPathDist: 2, size: 1.0 },
    { kind: 'smokestack', count: [2, 4], fp: 1, minPathDist: 1, size: 0.6 },
  ],

  paintGroundDetail(ctx, map, rng) {
    // Riveted steel plates
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.lineWidth = 1.5;
    for (let y = 0; y <= ROWS; y += 2) {
      ctx.beginPath();
      ctx.moveTo(0, y * TILE);
      ctx.lineTo(WORLD_W, y * TILE);
      ctx.stroke();
    }
    for (let x = 0; x <= COLS; x += 2) {
      ctx.beginPath();
      ctx.moveTo(x * TILE, 0);
      ctx.lineTo(x * TILE, WORLD_H);
      ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    for (let y = 0; y <= ROWS; y += 2) {
      ctx.beginPath();
      ctx.moveTo(0, y * TILE + 1.5);
      ctx.lineTo(WORLD_W, y * TILE + 1.5);
      ctx.stroke();
    }
    for (let y = 0; y <= ROWS; y += 2) {
      for (let x = 0; x <= COLS; x += 2) {
        for (const [ox, oy] of [[5, 5], [-5, 5], [5, -5], [-5, -5]]) {
          ctx.fillStyle = 'rgba(160,170,185,0.5)';
          circle(ctx, x * TILE + ox, y * TILE + oy, 1.4);
          ctx.fill();
        }
      }
    }
    scatter(map, rng, 40, [TileType.GROUND], (x, y) => softBlob(ctx, x, y, rng.float(10, 26), '#0b0c0f', 0.45));
    scatter(map, rng, 60, [TileType.GROUND], (x, y) => softBlob(ctx, x, y, rng.float(8, 18), '#8a4a20', 0.25));
    // hazard stripes around objective
    const { px, py } = map.goal;
    ctx.save();
    ctx.beginPath();
    ctx.rect(px - TILE * 1.5, py - TILE * 1.5, TILE * 3, TILE * 3);
    ctx.rect(px - TILE * 1.3, py - TILE * 1.3, TILE * 2.6, TILE * 2.6);
    ctx.clip('evenodd');
    for (let k = -8; k < 8; k++) {
      ctx.fillStyle = k % 2 ? '#e0a020' : '#1b1b1b';
      ctx.beginPath();
      ctx.moveTo(px - TILE * 2 + k * 8, py - TILE * 2);
      ctx.lineTo(px - TILE * 2 + k * 8 + 8, py - TILE * 2);
      ctx.lineTo(px - TILE * 2 + k * 8 + 8 + TILE * 4, py + TILE * 2);
      ctx.lineTo(px - TILE * 2 + k * 8 + TILE * 4, py + TILE * 2);
      ctx.fill();
    }
    ctx.restore();
  },

  paintPathDetail(ctx, map) {
    // Twin rails along the track
    ctx.save();
    ctx.lineJoin = 'round';
    for (const route of map.routes) {
      const pts = route.drawPoints;
      for (const off of [-8, 8]) {
        ctx.strokeStyle = 'rgba(20,22,26,0.7)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        for (let i = 0; i < pts.length; i++) {
          const p = pts[i];
          const q = pts[Math.min(pts.length - 1, i + 1)];
          const pr = pts[Math.max(0, i - 1)];
          const dx = q.x - pr.x;
          const dy = q.y - pr.y;
          const len = Math.hypot(dx, dy) || 1;
          const nx = -dy / len;
          const ny = dx / len;
          if (i === 0) ctx.moveTo(p.x + nx * off, p.y + ny * off);
          else ctx.lineTo(p.x + nx * off, p.y + ny * off);
        }
        ctx.stroke();
        ctx.strokeStyle = 'rgba(190,200,215,0.45)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }
    ctx.restore();
  },

  paintDecor(ctx, d) {
    const r = d.r;
    switch (d.kind) {
      case 'bigGear': {
        dropShadow(ctx, d.x + 4, d.y + 6, r, r * 0.75, 0.4);
        ctx.fillStyle = '#1d2026';
        circle(ctx, d.x, d.y, r * 1.02);
        ctx.fill();
        break;
      }
      case 'steamVent': {
        ctx.fillStyle = '#202328';
        ctx.fillRect(d.x - r * 0.8, d.y - r * 0.8, r * 1.6, r * 1.6);
        ctx.strokeStyle = '#6b7078';
        ctx.lineWidth = 2;
        ctx.strokeRect(d.x - r * 0.8, d.y - r * 0.8, r * 1.6, r * 1.6);
        ctx.lineWidth = 1.5;
        for (let k = -2; k <= 2; k++) {
          ctx.beginPath();
          ctx.moveTo(d.x - r * 0.6, d.y + k * r * 0.25);
          ctx.lineTo(d.x + r * 0.6, d.y + k * r * 0.25);
          ctx.stroke();
        }
        break;
      }
      case 'machine': {
        dropShadow(ctx, d.x + 6, d.y + 8, r * 1.1, r * 0.8, 0.45);
        ctx.fillStyle = '#4c525c';
        ctx.fillRect(d.x - r, d.y - r * 0.85, r * 2, r * 1.7);
        ctx.fillStyle = '#5d6470';
        ctx.fillRect(d.x - r * 0.9, d.y - r * 0.75, r * 1.8, r * 0.5);
        ctx.fillStyle = '#2b2f36';
        ctx.fillRect(d.x - r * 0.75, d.y - r * 0.1, r * 0.9, r * 0.75);
        ctx.strokeStyle = '#7d8590';
        ctx.lineWidth = 1;
        ctx.strokeRect(d.x - r, d.y - r * 0.85, r * 2, r * 1.7);
        // pipes
        ctx.strokeStyle = '#8a6a3a';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(d.x + r * 0.3, d.y + r * 0.85);
        ctx.lineTo(d.x + r * 0.3, d.y + r * 0.2);
        ctx.lineTo(d.x + r * 0.8, d.y + r * 0.2);
        ctx.stroke();
        // rust
        softBlob(ctx, d.x - r * 0.5, d.y + r * 0.5, r * 0.4, '#a0501e', 0.4);
        break;
      }
      case 'smokestack': {
        dropShadow(ctx, d.x + 4, d.y + 6, r * 0.9, r * 0.6, 0.4);
        ctx.fillStyle = '#5a4a40';
        circle(ctx, d.x, d.y, r * 0.85);
        ctx.fill();
        ctx.fillStyle = '#121214';
        circle(ctx, d.x, d.y, r * 0.55);
        ctx.fill();
        ctx.strokeStyle = '#8a7a6a';
        ctx.lineWidth = 2;
        circle(ctx, d.x, d.y, r * 0.85);
        ctx.stroke();
        break;
      }
      default:
    }
  },

  createAmbient(map, rng, scene) {
    const gears = map.decor.filter((d) => d.kind === 'bigGear').map((d) => ({ d, dir: d.seed > 0.5 ? 1 : -1, sp: rng.float(0.3, 0.8), teeth: d.fp === 2 ? 14 : 9 }));
    const vents = map.decor.filter((d) => d.kind === 'steamVent' || d.kind === 'smokestack').map((d) => ({ d, timer: rng.float(0, 3), smoke: d.kind === 'smokestack' }));
    const machines = map.decor.filter((d) => d.kind === 'machine');
    const puffs = [];
    const bubbles = Array.from({ length: map.featureTiles.length ? 24 : 0 }, () => ({ t: rng.pick(map.featureTiles), ph: rng.float(0, 2) }));
    const sparks = [];
    let sparkTimer = 2;
    const tmp = { x: 0, y: 0, dx: 0, dy: 0 };

    return {
      update(dt) {
        for (const v of vents) {
          v.timer -= dt;
          if (v.timer <= 0) {
            const burst = v.smoke ? 1 : 4;
            for (let i = 0; i < burst * scene.effects; i++) {
              puffs.push({ x: v.d.x + rng.float(-4, 4), y: v.d.y, vx: rng.float(-6, 6) + 8, vy: -rng.float(14, 28), life: v.smoke ? 3 : 1.4, max: v.smoke ? 3 : 1.4, r: rng.float(5, 9), smoke: v.smoke });
            }
            v.timer = v.smoke ? rng.float(0.3, 0.6) : rng.float(2.5, 5);
          }
        }
        for (let i = puffs.length - 1; i >= 0; i--) {
          const p = puffs[i];
          p.life -= dt;
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.r += dt * 8;
          if (p.life <= 0) puffs.splice(i, 1);
        }
        sparkTimer -= dt;
        if (sparkTimer <= 0 && machines.length) {
          const m = rng.pick(machines);
          for (let i = 0; i < 10 * scene.effects; i++) {
            const a = rng.float(0, TAU);
            sparks.push({ x: m.x + m.r * 0.8, y: m.y - m.r * 0.5, vx: Math.cos(a) * rng.float(30, 80), vy: Math.sin(a) * rng.float(30, 80) - 30, life: rng.float(0.3, 0.7) });
          }
          sparkTimer = rng.float(1.5, 4);
        }
        for (let i = sparks.length - 1; i >= 0; i--) {
          const s = sparks[i];
          s.life -= dt;
          s.vy += 160 * dt;
          s.x += s.vx * dt;
          s.y += s.vy * dt;
          if (s.life <= 0) sparks.splice(i, 1);
        }
      },
      drawUnder(ctx, t) {
        if (map.featureTiles.length) {
          ctx.save();
          ctx.clip(scene.featurePath);
          for (const b of bubbles) {
            const k = ((t * 0.6 + b.ph) % 2) / 2;
            ctx.strokeStyle = rgba('#d8ffb0', (1 - k) * 0.7);
            ctx.lineWidth = 1.2;
            circle(ctx, b.t.x * TILE + 16 + Math.sin(b.ph * 9) * 8, b.t.y * TILE + 16 + Math.cos(b.ph * 7) * 8, 1.5 + k * 5);
            ctx.stroke();
          }
          ctx.restore();
          for (const b of bubbles) drawGlow(ctx, '#6dff4a', b.t.x * TILE + 16, b.t.y * TILE + 16, 22, 0.08);
        }
        for (const g of gears) {
          const { d } = g;
          const rot = t * g.sp * g.dir + d.seed * 10;
          const grad = ctx.createRadialGradient(d.x - d.r * 0.3, d.y - d.r * 0.3, 0, d.x, d.y, d.r);
          grad.addColorStop(0, '#b59a62');
          grad.addColorStop(1, '#6a5430');
          ctx.fillStyle = grad;
          gearPath(ctx, d.x, d.y, d.r * 0.95, g.teeth, rot);
          ctx.fill();
          ctx.strokeStyle = '#3a2e1a';
          ctx.lineWidth = 1.5;
          ctx.stroke();
          ctx.fillStyle = '#4a3c22';
          circle(ctx, d.x, d.y, d.r * 0.5);
          ctx.fill();
          ctx.fillStyle = '#2a2a2e';
          for (let i = 0; i < 4; i++) {
            const a = rot + (i / 4) * TAU;
            circle(ctx, d.x + Math.cos(a) * d.r * 0.3, d.y + Math.sin(a) * d.r * 0.3, d.r * 0.1);
            ctx.fill();
          }
          ctx.fillStyle = '#c9c2b0';
          circle(ctx, d.x, d.y, d.r * 0.14);
          ctx.fill();
        }
        for (const m of machines) {
          const on = Math.sin(t * 3 + m.seed * 20) > 0;
          drawGlow(ctx, on ? '#ff4a3a' : '#5aff7a', m.x + m.r * 0.6, m.y - m.r * 0.5, 9, 0.9);
          drawGlow(ctx, '#ffb12b', m.x - m.r * 0.6, m.y - m.r * 0.5, 7, 0.5 + 0.5 * Math.sin(t * 5 + m.seed));
          ctx.fillStyle = rgba('#7ff7ff', 0.5 + 0.3 * Math.sin(t * 2 + m.seed * 3));
          ctx.fillRect(m.x - m.r * 0.7, m.y - m.r * 0.05, m.r * 0.8, m.r * 0.12);
        }
        // Direction chevrons along every route: an at-a-glance read of enemy flow.
        ctx.fillStyle = rgba('#ffb12b', 0.28);
        for (const route of map.routes) {
          const spacing = 48;
          const offset = (t * 22) % spacing;
          let seg = 0;
          for (let dd = TILE * 1.6 + offset; dd < route.length - TILE; dd += spacing) {
            seg = sampleRoute(route, dd, tmp, seg);
            ctx.save();
            ctx.translate(tmp.x, tmp.y);
            ctx.rotate(Math.atan2(tmp.dy, tmp.dx));
            ctx.beginPath();
            ctx.moveTo(-4, -6);
            ctx.lineTo(3, 0);
            ctx.lineTo(-4, 6);
            ctx.lineTo(-1, 0);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
          }
        }
      },
      drawOver(ctx) {
        const fx = scene.effects;
        for (const p of puffs) {
          const a = (p.life / p.max) * (p.smoke ? 0.22 : 0.3) * fx;
          drawGlow(ctx, p.smoke ? '#4a4a50' : '#e8eef5', p.x, p.y, p.r * 1.6, a, 0.8);
        }
        ctx.globalCompositeOperation = 'lighter';
        for (const s of sparks) drawGlow(ctx, '#ffd36a', s.x, s.y, 3, Math.min(1, s.life * 3) * fx);
        ctx.globalCompositeOperation = 'source-over';
      },
    };
  },
};

