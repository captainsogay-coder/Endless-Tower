import { TILE, WORLD_W, WORLD_H } from '../../config.js';
import { TileType } from '../mapGenerator.js';
import { scatter, scatterWeighted, softBlob, dropShadow, isInterior, blobPoints } from '../paint.js';
import { rgba } from '../../core/color.js';
import { circle, drawGlow } from '../../render/canvas.js';
import { TAU } from '../../core/math.js';

const palette = {
  ground: '#d9e3ec',
  groundRamp: ['#bccbd9', '#d3dee8', '#e4ecf3', '#f0f4f8'],
  groundVariants: ['#c3d4e5', '#eef5fb', '#b1c5d9', '#e5eef7', '#cddcea'],
  path: '#8396ad',
  pathEdge: '#52637a',
  pathCenter: '#a3b6ca',
  feature: '#a9cde0',
  featureEdge: '#f4f9ff',
  featureDeep: '#8ab6d0',
  featureShine: '#ffffff',
  bridge: '#7d8fa6',
  pad: '#8fa3bb',
  accent: '#7fe0ff',
  light: '#eaf7ff',
  shadow: '#1e3350',
};

export default {
  id: 'frozen',
  name: 'Frozen Frontier',
  tagline: 'Where the wind itself has teeth',
  palette,
  lighting: { strength: 0.1, vignette: 0.32, grade: '#eef3fb' },
  atmosphere: { cloudShadows: 3 },
  enemyPalette: { body: '#3e2b63', dark: '#170e2e', eye: '#ff5fd2', glow: '#b06bff' },
  portalColor: '#5fd8ff',
  bossTitle: 'Warden of the White Silence',
  bridgeStyle: 'stone',
  layout: { styles: { meander: 3, serpentine: 3, converge: 2 }, featureDensity: 0.1, rivers: [0, 1], noiseScale: 0.14 },
  decor: [
    { kind: 'glacier', landmark: true, count: [1, 1], fp: 3, fallbackFp: 2, minPathDist: 2, size: 1.6 },
    { kind: 'pine', count: [12, 18], fp: 1, minPathDist: 1, size: 0.7, clump: 0.7 },
    { kind: 'pine', count: [3, 5], fp: 2, minPathDist: 2, size: 1.2, clump: 0.7 },
    { kind: 'iceCrystal', count: [4, 7], fp: 1, minPathDist: 1, size: 0.6, clump: 0.4 },
    { kind: 'snowRock', count: [3, 6], fp: 1, minPathDist: 1, size: 0.5 },
    { kind: 'iceShard', on: 'feature', count: [3, 7], size: 0.35 },
  ],

  paintGroundDetail(ctx, map, rng, density) {
    scatterWeighted(map, rng, 160, [TileType.GROUND, TileType.BLOCKED], density, (x, y) => softBlob(ctx, x, y, rng.float(14, 40), rng.pick(['#ffffff', '#b4c5d6']), 0.35));
    // wind-carved drift lines
    ctx.strokeStyle = 'rgba(140,165,195,0.35)';
    ctx.lineWidth = 1;
    scatter(map, rng, 260, [TileType.GROUND], (x, y) => {
      ctx.beginPath();
      ctx.moveTo(x - 6, y);
      ctx.quadraticCurveTo(x, y - 2, x + 7, y + 0.5);
      ctx.stroke();
    });
    scatter(map, rng, 700, [TileType.GROUND, TileType.OBJECTIVE], (x, y) => {
      ctx.fillStyle = rgba('#ffffff', rng.float(0.5, 1));
      ctx.fillRect(x, y, 1.2, 1.2);
    });
  },

  paintFeatures(ctx, map, pal) {
    const tiles = map.featureTiles;
    const blobs = blobPoints(map);
    const pass = (r, color, filter) => {
      ctx.fillStyle = color;
      ctx.beginPath();
      for (const t of blobs) {
        if (filter && !filter(t)) continue;
        const x = t.x * TILE + TILE / 2;
        const y = t.y * TILE + TILE / 2;
        ctx.moveTo(x + r, y);
        ctx.arc(x, y, r, 0, TAU);
      }
      ctx.fill();
    };
    pass(TILE * 0.9, 'rgba(90,120,160,0.25)');
    pass(TILE * 0.84, pal.featureEdge);
    pass(TILE * 0.72, pal.feature);
    pass(TILE * 0.74, pal.featureDeep, (t) => isInterior(map, t));
    // ice cracks
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.lineWidth = 0.8;
    for (const t of tiles) {
      if ((t.x * 7 + t.y * 13) % 3) continue;
      const x = t.x * TILE + TILE / 2;
      const y = t.y * TILE + TILE / 2;
      ctx.beginPath();
      ctx.moveTo(x - 10, y - 4);
      ctx.lineTo(x - 2, y + 1);
      ctx.lineTo(x + 3, y - 6);
      ctx.moveTo(x - 2, y + 1);
      ctx.lineTo(x + 6, y + 8);
      ctx.stroke();
    }
  },

  paintDecor(ctx, d) {
    const r = d.r;
    switch (d.kind) {
      case 'pine': {
        dropShadow(ctx, d.x + r * 0.35, d.y + r * 0.4, r * 0.95, r * 0.55, 0.22);
        const tiers = 4;
        for (let i = 0; i < tiers; i++) {
          const rr = r * (1 - i * 0.22);
          const cy = d.y - i * r * 0.1;
          const rot = d.seed * 2 + i * 0.35;
          // star-shaped bough layer
          ctx.fillStyle = ['#173b37', '#20504a', '#2b655b', '#3a7a6c'][i];
          ctx.beginPath();
          for (let k = 0; k < 18; k++) {
            const a = rot + (k / 18) * TAU;
            const rad = k % 2 ? rr * 0.68 : rr;
            ctx.lineTo(d.x + Math.cos(a) * rad, cy + Math.sin(a) * rad);
          }
          ctx.closePath();
          ctx.fill();
          // snow resting on the upper-left of each layer
          ctx.fillStyle = 'rgba(245,250,255,0.9)';
          ctx.beginPath();
          for (let k = 0; k < 18; k++) {
            const a = rot + (k / 18) * TAU;
            const rad = (k % 2 ? rr * 0.6 : rr * 0.9);
            ctx.lineTo(d.x - rr * 0.12 + Math.cos(a) * rad * 0.8, cy - rr * 0.14 + Math.sin(a) * rad * 0.62);
          }
          ctx.closePath();
          ctx.globalAlpha = 0.28;
          ctx.fill();
          ctx.globalAlpha = 1;
        }
        ctx.fillStyle = '#f5faff';
        circle(ctx, d.x - r * 0.04, d.y - r * 0.36, r * 0.12);
        ctx.fill();
        break;
      }
      case 'iceCrystal':
      case 'iceShard': {
        dropShadow(ctx, d.x + 3, d.y + 4, r * 0.8, r * 0.45, 0.2);
        const n = d.kind === 'iceShard' ? 3 : 5;
        for (let i = 0; i < n; i++) {
          const a = -Math.PI / 2 + (i - (n - 1) / 2) * 0.45 + (d.seed - 0.5) * 0.4;
          const len = r * (i === Math.floor(n / 2) ? 1.25 : 0.85);
          const w = r * 0.22;
          const bx = d.x + Math.cos(a + Math.PI / 2) * (i - (n - 1) / 2) * w * 0.8;
          const by = d.y;
          ctx.beginPath();
          ctx.moveTo(bx - Math.cos(a + Math.PI / 2) * w, by - Math.sin(a + Math.PI / 2) * w);
          ctx.lineTo(bx + Math.cos(a) * len, by + Math.sin(a) * len);
          ctx.lineTo(bx + Math.cos(a + Math.PI / 2) * w, by + Math.sin(a + Math.PI / 2) * w);
          ctx.closePath();
          const g = ctx.createLinearGradient(bx, by, bx + Math.cos(a) * len, by + Math.sin(a) * len);
          g.addColorStop(0, '#5ab7e6');
          g.addColorStop(1, '#e6fbff');
          ctx.fillStyle = g;
          ctx.fill();
          ctx.strokeStyle = 'rgba(255,255,255,0.8)';
          ctx.lineWidth = 0.8;
          ctx.stroke();
        }
        break;
      }
      case 'glacier': {
        // Landmark: a calved block of glacier ice, faceted and lit from the top-left.
        dropShadow(ctx, d.x + r * 0.25, d.y + r * 0.35, r * 1.15, r * 0.75, 0.25);
        const pts = [];
        const n = 9;
        for (let i = 0; i < n; i++) {
          const a = (i / n) * TAU + d.seed;
          const rr = r * (0.75 + 0.25 * Math.abs(Math.sin(d.seed * 17 + i * 2.3)));
          pts.push([d.x + Math.cos(a) * rr, d.y + Math.sin(a) * rr * 0.85]);
        }
        const top = [d.x - r * 0.12, d.y - r * 0.2];
        for (let i = 0; i < n; i++) {
          const p0 = pts[i];
          const p1 = pts[(i + 1) % n];
          const mid = Math.atan2((p0[1] + p1[1]) / 2 - d.y, (p0[0] + p1[0]) / 2 - d.x);
          const lit = Math.cos(mid + Math.PI * 0.75);
          ctx.fillStyle = lit > 0.3 ? '#e8f6ff' : lit > -0.3 ? '#a9d4ec' : '#6fa6c8';
          ctx.beginPath();
          ctx.moveTo(top[0], top[1]);
          ctx.lineTo(p0[0], p0[1]);
          ctx.lineTo(p1[0], p1[1]);
          ctx.closePath();
          ctx.fill();
        }
        ctx.strokeStyle = '#4d7a99';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
        ctx.closePath();
        ctx.stroke();
        ctx.strokeStyle = 'rgba(255,255,255,0.55)';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        for (const p of pts) {
          ctx.moveTo(top[0], top[1]);
          ctx.lineTo(p[0], p[1]);
        }
        ctx.stroke();
        // snow cap
        ctx.fillStyle = 'rgba(250,252,255,0.9)';
        ctx.beginPath();
        ctx.ellipse(top[0] - r * 0.05, top[1] - r * 0.05, r * 0.35, r * 0.22, -0.3, 0, TAU);
        ctx.fill();
        break;
      }
      case 'snowRock': {
        dropShadow(ctx, d.x + 3, d.y + 4, r * 0.9, r * 0.55, 0.25);
        ctx.fillStyle = '#5d6b7c';
        ctx.beginPath();
        ctx.ellipse(d.x, d.y, r * 0.85, r * 0.6, d.seed, 0, TAU);
        ctx.fill();
        ctx.fillStyle = '#f5faff';
        ctx.beginPath();
        ctx.ellipse(d.x - r * 0.1, d.y - r * 0.2, r * 0.7, r * 0.38, d.seed, 0, TAU);
        ctx.fill();
        break;
      }
      default:
    }
  },

  createAmbient(map, rng, scene) {
    const crystals = map.decor.filter((d) => d.kind === 'iceCrystal' || d.kind === 'iceShard');
    const flakes = Array.from({ length: Math.round(80 * scene.effects) }, () => ({
      x: rng.float(0, WORLD_W), y: rng.float(0, WORLD_H), vy: rng.float(14, 34), s: rng.float(0.8, 2.4), ph: rng.float(0, TAU),
    }));
    const streaks = Array.from({ length: Math.round(26 * scene.effects) }, () => ({ x: rng.float(0, WORLD_W), y: rng.float(0, WORLD_H), len: rng.float(30, 90), sp: rng.float(260, 420) }));
    let gust = 0;
    let gustTimer = rng.float(10, 16);
    let wind = 0;

    return {
      update(dt, t) {
        gustTimer -= dt;
        if (gustTimer <= 0) {
          gust = 4.5;
          gustTimer = rng.float(14, 24);
        }
        gust = Math.max(0, gust - dt);
        const target = gust > 0 ? Math.sin(Math.min(1, gust / 4.5) * Math.PI) : 0;
        wind += (target - wind) * Math.min(1, dt * 2);
        for (const f of flakes) {
          f.y += f.vy * (1 + wind * 0.6) * dt;
          f.x += (Math.sin(t * 0.8 + f.ph) * 8 + wind * 160) * dt;
          if (f.y > WORLD_H + 4) { f.y = -4; f.x = Math.random() * WORLD_W; }
          if (f.x > WORLD_W + 4) f.x = -4;
        }
        for (const s of streaks) {
          s.x += s.sp * dt * wind;
          if (s.x > WORLD_W + 100) { s.x = -100; s.y = Math.random() * WORLD_H; }
        }
      },
      drawUnder(ctx, t) {
        if (map.featureTiles.length) {
          ctx.save();
          ctx.clip(scene.featurePath);
          const band = ((t * 90) % (WORLD_W + WORLD_H + 400)) - 200;
          const g = ctx.createLinearGradient(band - 80, 0, band + 80, WORLD_H * 0.6);
          g.addColorStop(0, 'rgba(255,255,255,0)');
          g.addColorStop(0.5, 'rgba(255,255,255,0.35)');
          g.addColorStop(1, 'rgba(255,255,255,0)');
          ctx.fillStyle = g;
          ctx.fillRect(0, 0, WORLD_W, WORLD_H);
          ctx.restore();
        }
        for (const c of crystals) {
          const k = Math.sin(t * 1.7 + c.seed * 20);
          drawGlow(ctx, '#bfefff', c.x, c.y - c.r * 0.3, c.r * 1.3, 0.08 + 0.05 * k);
          if (k > 0.96) {
            ctx.strokeStyle = 'rgba(255,255,255,0.9)';
            ctx.lineWidth = 1;
            const sx = c.x + c.r * 0.2;
            const sy = c.y - c.r * 0.8;
            ctx.beginPath();
            ctx.moveTo(sx - 5, sy);
            ctx.lineTo(sx + 5, sy);
            ctx.moveTo(sx, sy - 5);
            ctx.lineTo(sx, sy + 5);
            ctx.stroke();
          }
        }
      },
      drawOver(ctx) {
        const fx = scene.effects;
        ctx.fillStyle = rgba('#ffffff', 0.6 * fx);
        for (const f of flakes) {
          ctx.beginPath();
          ctx.arc(f.x, f.y, f.s, 0, TAU);
          ctx.fill();
        }
        if (wind > 0.02) {
          ctx.strokeStyle = rgba('#ffffff', 0.18 * wind * fx);
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          for (const s of streaks) {
            ctx.moveTo(s.x, s.y);
            ctx.lineTo(s.x + s.len, s.y + s.len * 0.08);
          }
          ctx.stroke();
          ctx.fillStyle = rgba('#e8f4ff', 0.07 * wind * fx);
          ctx.fillRect(0, 0, WORLD_W, WORLD_H);
        }
      },
    };
  },
};
