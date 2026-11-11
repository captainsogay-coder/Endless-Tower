import { TILE, WORLD_W, WORLD_H } from '../../config.js';
import { TileType } from '../mapGenerator.js';
import { scatter, softBlob, dropShadow, isInterior } from '../paint.js';
import { rgba } from '../../core/color.js';
import { circle, drawGlow } from '../../render/canvas.js';
import { TAU } from '../../core/math.js';

const palette = {
  ground: '#2a2022',
  groundVariants: ['#3b2a2a', '#1b1516', '#4a2c24', '#2f2627', '#3a2420'],
  path: '#5f514b',
  pathEdge: '#1a1314',
  pathCenter: '#806760',
  feature: '#ff6a1a',
  featureEdge: '#2a0d06',
  featureDeep: '#ffb02e',
  featureShine: '#fff1a0',
  bridge: '#4d4242',
  pad: '#3d3232',
  accent: '#ff9a4a',
  light: '#ff7b2e',
  shadow: '#120505',
};

function jagged(ctx, x, y, r, seed, points = 7) {
  ctx.beginPath();
  for (let i = 0; i < points; i++) {
    const a = (i / points) * TAU + seed;
    const rr = r * (0.65 + 0.35 * Math.abs(Math.sin(seed * 13 + i * 2.1)));
    if (i === 0) ctx.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    else ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
}

export default {
  id: 'volcanic',
  name: 'Volcanic Wasteland',
  tagline: 'The earth splits and bleeds fire',
  palette,
  enemyPalette: { body: '#cfc6ba', dark: '#4a3c36', eye: '#ff4d1a', glow: '#ffb27a' },
  portalColor: '#ff5a1f',
  bossTitle: 'Warden of the Molten Deep',
  bridgeStyle: 'stone',
  layout: { styles: { meander: 3, serpentine: 2, converge: 2 }, featureDensity: 0.055, rivers: [1, 2], noiseScale: 0.2 },
  decor: [
    { kind: 'volcano', count: [1, 1], fp: 3, minPathDist: 3, size: 2.2 },
    { kind: 'rockSpire', count: [8, 13], fp: 1, minPathDist: 1, size: 0.62 },
    { kind: 'rockSpire', count: [3, 5], fp: 2, minPathDist: 2, size: 1.05 },
    { kind: 'obsidian', count: [5, 9], fp: 1, minPathDist: 1, size: 0.5 },
  ],

  paintGroundDetail(ctx, map, rng) {
    scatter(map, rng, 70, [TileType.GROUND], (x, y) => softBlob(ctx, x, y, rng.float(12, 30), '#000000', 0.25));
    scatter(map, rng, 900, [TileType.GROUND, TileType.BLOCKED, TileType.OBJECTIVE], (x, y) => {
      ctx.fillStyle = rgba(rng.pick(['#4a3a38', '#141010', '#5a3a30']), rng.float(0.5, 0.9));
      circle(ctx, x, y, rng.float(0.8, 2.4));
      ctx.fill();
    });
  },

  paintFeatures(ctx, map, pal) {
    const tiles = map.featureTiles;
    const pass = (r, color, filter) => {
      ctx.fillStyle = color;
      ctx.beginPath();
      for (const t of tiles) {
        if (filter && !filter(t)) continue;
        const x = t.x * TILE + TILE / 2;
        const y = t.y * TILE + TILE / 2;
        ctx.moveTo(x + r, y);
        ctx.arc(x, y, r, 0, TAU);
      }
      ctx.fill();
    };
    // heat halo on surrounding rock
    for (const t of tiles) softBlob(ctx, t.x * TILE + TILE / 2, t.y * TILE + TILE / 2, TILE * 1.3, '#ff4a10', 0.08);
    pass(TILE * 0.86, '#140604');
    pass(TILE * 0.74, '#7a1e08');
    pass(TILE * 0.64, pal.feature);
    pass(TILE * 0.66, pal.featureDeep, (t) => isInterior(map, t));
  },

  paintDecor(ctx, d) {
    const r = d.r;
    switch (d.kind) {
      case 'volcano': {
        dropShadow(ctx, d.x + 6, d.y + 10, r * 1.05, r * 0.85, 0.45);
        const g = ctx.createRadialGradient(d.x, d.y, r * 0.2, d.x, d.y, r);
        g.addColorStop(0, '#5a2a1a');
        g.addColorStop(0.5, '#3a2422');
        g.addColorStop(1, '#1e1415');
        ctx.fillStyle = g;
        jagged(ctx, d.x, d.y, r, d.seed * 5, 14);
        ctx.fill();
        // ridges
        ctx.strokeStyle = 'rgba(0,0,0,0.35)';
        ctx.lineWidth = 2;
        for (let i = 0; i < 10; i++) {
          const a = (i / 10) * TAU + d.seed;
          ctx.beginPath();
          ctx.moveTo(d.x + Math.cos(a) * r * 0.32, d.y + Math.sin(a) * r * 0.32);
          ctx.lineTo(d.x + Math.cos(a + 0.1) * r * 0.9, d.y + Math.sin(a + 0.1) * r * 0.9);
          ctx.stroke();
        }
        ctx.fillStyle = '#140604';
        circle(ctx, d.x, d.y, r * 0.34);
        ctx.fill();
        break;
      }
      case 'rockSpire': {
        dropShadow(ctx, d.x + 4, d.y + 6, r * 0.95, r * 0.7, 0.4);
        ctx.fillStyle = '#2a2122';
        jagged(ctx, d.x, d.y, r, d.seed * 9, 7);
        ctx.fill();
        ctx.fillStyle = '#463536';
        jagged(ctx, d.x - r * 0.12, d.y - r * 0.15, r * 0.62, d.seed * 9 + 1, 6);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,120,40,0.55)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(d.x, d.y, r * 0.8, 0.2, 1.4);
        ctx.stroke();
        break;
      }
      case 'obsidian': {
        dropShadow(ctx, d.x + 3, d.y + 4, r * 0.8, r * 0.5, 0.35);
        for (let i = 0; i < 3; i++) {
          const a = d.seed * 6 + i * 2.1;
          ctx.fillStyle = i === 1 ? '#3b2f4a' : '#1d1824';
          ctx.beginPath();
          ctx.moveTo(d.x + Math.cos(a) * r * 0.2, d.y + Math.sin(a) * r * 0.2);
          ctx.lineTo(d.x + Math.cos(a + 0.4) * r, d.y + Math.sin(a + 0.4) * r);
          ctx.lineTo(d.x + Math.cos(a - 0.3) * r * 0.7, d.y + Math.sin(a - 0.3) * r * 0.7);
          ctx.closePath();
          ctx.fill();
        }
        ctx.strokeStyle = 'rgba(190,160,255,0.5)';
        ctx.lineWidth = 1;
        ctx.stroke();
        break;
      }
      default:
    }
  },

  createAmbient(map, rng, scene) {
    const volcano = map.decor.find((d) => d.kind === 'volcano');
    // glowing ground cracks
    const cracks = [];
    for (let n = 0; n < 26; n++) {
      const x = rng.int(0, map.cols - 1);
      const y = rng.int(0, map.rows - 1);
      if (map.grid[y * map.cols + x] !== TileType.GROUND) continue;
      const pts = [{ x: x * TILE + rng.float(4, 28), y: y * TILE + rng.float(4, 28) }];
      let a = rng.float(0, TAU);
      for (let k = 0; k < rng.int(3, 6); k++) {
        a += rng.float(-0.9, 0.9);
        const p = pts[pts.length - 1];
        pts.push({ x: p.x + Math.cos(a) * rng.float(6, 12), y: p.y + Math.sin(a) * rng.float(6, 12) });
      }
      cracks.push({ pts, ph: rng.float(0, TAU) });
    }
    const flows = Array.from({ length: map.featureTiles.length ? 40 : 0 }, () => ({ t: rng.pick(map.featureTiles), ph: rng.float(0, TAU), s: rng.float(5, 12) }));
    const embers = [];
    const ash = Array.from({ length: Math.round(70 * scene.effects) }, () => ({ x: rng.float(0, WORLD_W), y: rng.float(0, WORLD_H), vx: rng.float(8, 18), vy: rng.float(6, 14), s: rng.float(0.8, 2) }));
    const rising = Array.from({ length: Math.round(26 * scene.effects) }, () => ({ x: rng.float(0, WORLD_W), y: rng.float(0, WORLD_H), vy: rng.float(12, 30), ph: rng.float(0, TAU) }));
    let eruptTimer = rng.float(6, 10);
    let flash = 0;
    let quake = 0;

    const erupt = () => {
      const src = volcano ?? (map.featureTiles.length ? { x: rng.pick(map.featureTiles).x * TILE + 16, y: 0 } : null);
      if (!src) return;
      const sx = volcano ? volcano.x : src.x;
      const sy = volcano ? volcano.y : rng.pick(map.featureTiles).y * TILE + 16;
      const count = Math.round((volcano ? 70 : 24) * scene.effects);
      for (let i = 0; i < count; i++) {
        const a = rng.float(0, TAU);
        const sp = rng.float(20, volcano ? 120 : 50);
        embers.push({ x: sx, y: sy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - rng.float(10, 40), life: rng.float(0.8, 2.2), max: 2.2, s: rng.float(1.5, 3.5) });
      }
      flash = volcano ? 0.5 : 0.2;
      quake = volcano ? 0.6 : 0;
      scene.shake?.(volcano ? 3 : 1);
    };

    return {
      update(dt, t) {
        eruptTimer -= dt;
        if (eruptTimer <= 0) {
          erupt();
          eruptTimer = rng.float(12, 20);
        }
        flash = Math.max(0, flash - dt);
        quake = Math.max(0, quake - dt);
        for (let i = embers.length - 1; i >= 0; i--) {
          const e = embers[i];
          e.life -= dt;
          e.vx *= 0.985;
          e.vy = e.vy * 0.985 + 30 * dt;
          e.x += e.vx * dt;
          e.y += e.vy * dt;
          if (e.life <= 0) embers.splice(i, 1);
        }
        for (const a of ash) {
          a.x += a.vx * dt;
          a.y += a.vy * dt;
          if (a.x > WORLD_W + 5) a.x = -5;
          if (a.y > WORLD_H + 5) a.y = -5;
        }
        for (const r of rising) {
          r.y -= r.vy * dt;
          r.x += Math.sin(t * 2 + r.ph) * 6 * dt;
          if (r.y < -5) { r.y = WORLD_H + 5; r.x = Math.random() * WORLD_W; }
        }
      },
      drawUnder(ctx, t) {
        if (map.featureTiles.length) {
          ctx.save();
          ctx.clip(scene.featurePath);
          ctx.globalCompositeOperation = 'lighter';
          for (const f of flows) {
            const x = f.t.x * TILE + 16 + Math.sin(t * 0.6 + f.ph) * 10;
            const y = f.t.y * TILE + 16 + Math.cos(t * 0.5 + f.ph) * 10;
            drawGlow(ctx, '#ffd36a', x, y, f.s * 2, 0.35 + 0.25 * Math.sin(t * 1.5 + f.ph));
          }
          ctx.globalCompositeOperation = 'source-over';
          ctx.fillStyle = 'rgba(60,15,5,0.45)';
          for (const f of flows) {
            const x = f.t.x * TILE + 16 + Math.cos(t * 0.3 + f.ph * 2) * 12;
            const y = f.t.y * TILE + 16 + Math.sin(t * 0.25 + f.ph) * 12;
            ctx.beginPath();
            ctx.ellipse(x, y, f.s * 0.6, f.s * 0.35, f.ph, 0, TAU);
            ctx.fill();
          }
          ctx.restore();
        }
        ctx.lineCap = 'round';
        for (const c of cracks) {
          const glow = 0.35 + 0.35 * Math.sin(t * 1.3 + c.ph);
          ctx.strokeStyle = rgba('#ff7a2a', glow);
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(c.pts[0].x, c.pts[0].y);
          for (const p of c.pts) ctx.lineTo(p.x, p.y);
          ctx.stroke();
          ctx.strokeStyle = rgba('#ffe08a', glow * 0.8);
          ctx.lineWidth = 0.8;
          ctx.stroke();
        }
        if (volcano) {
          const pulse = 0.55 + 0.25 * Math.sin(t * 2) + quake;
          drawGlow(ctx, '#ff7a1a', volcano.x, volcano.y, volcano.r * 0.9, pulse);
          ctx.fillStyle = rgba('#ffcc55', 0.8);
          circle(ctx, volcano.x, volcano.y, volcano.r * 0.22);
          ctx.fill();
        }
      },
      drawOver(ctx, t) {
        const fx = scene.effects;
        ctx.globalCompositeOperation = 'lighter';
        for (const e of embers) drawGlow(ctx, '#ff9a3a', e.x, e.y, e.s * 2.5, Math.min(1, e.life) * fx);
        for (const r of rising) drawGlow(ctx, '#ff7a2a', r.x, r.y, 3, (0.4 + 0.3 * Math.sin(t * 4 + r.ph)) * fx);
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = rgba('#b9aea8', 0.35 * fx);
        for (const a of ash) ctx.fillRect(a.x, a.y, a.s, a.s);
        if (flash > 0) {
          ctx.fillStyle = rgba('#ff6a1a', flash * 0.12 * fx);
          ctx.fillRect(0, 0, WORLD_W, WORLD_H);
        }
      },
    };
  },
};
