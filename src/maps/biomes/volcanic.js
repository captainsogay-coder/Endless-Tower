import { VIGNETTE_DECOR } from '../vignettes.js';
import { TILE, WORLD_W, WORLD_H } from '../../config.js';
import { TileType } from '../mapGenerator.js';
import { scatter, scatterWeighted, softBlob, dropShadow, paintFeatureLayers } from '../paint.js';
import { rgba } from '../../core/color.js';
import { circle, drawGlow } from '../../render/canvas.js';
import { TAU } from '../../core/math.js';

// Volcanic Wasteland — basalt greys warmed by lava light. The lava is the
// only saturated colour on the map; everything else stays muted.
const palette = {
  ground: '#2e2728',
  groundRamp: ['#1e1a1b', '#2b2425', '#3a2e2c', '#4a3732'],
  groundVariants: ['#3a2e2c', '#1e1a1b'],
  path: '#5c534e',
  pathEdge: '#1b1617',
  pathCenter: '#776a62',
  feature: '#d4521f',
  featureEdge: '#1a0b07',
  featureDeep: '#e57a30',
  featureShine: '#ffe2a0',
  bridge: '#4a4242',
  pad: '#3d3434',
  accent: '#e0874a',
  light: '#ff9a5a',
  shadow: '#0e0505',
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
  lighting: { pos: { x: 640, y: 352 }, strength: 0.06, vignette: 0.55, grade: '#f6e7dd' },
  enemyPalette: { body: '#cfc6ba', dark: '#4a3c36', eye: '#ff4d1a', glow: '#ffb27a' },
  portalColor: '#ff5a1f',
  bossTitle: 'Warden of the Molten Deep',
  bridgeStyle: 'stone',
  variants: [
    { id: 'cinder-flats', name: 'Cinder Flats' },
    { id: 'magma-fields', name: 'Magma Fields', layout: { featureDensity: 0.09, rivers: [2, 2] } },
    { id: 'ashen-plateau', name: 'Ashen Plateau', layout: { featureDensity: 0.03, rivers: [0, 1] }, lighting: { grade: '#ebe5e2', vignette: 0.45 }, palette: { groundRamp: ['#2a2626', '#383233', '#4a4241', '#5a5150'] } },
  ],
  layout: { styles: { meander: 3, serpentine: 2, converge: 2 }, featureDensity: 0.055, rivers: [1, 2], noiseScale: 0.2 },
  decor: [
    ...VIGNETTE_DECOR.volcanic,
    { kind: 'volcano', landmark: true, count: [1, 1], fp: 3, fallbackFp: 2, minPathDist: 2, size: 2.4 },
    { kind: 'rockSpire', count: [7, 11], fp: 1, minPathDist: 1, size: 0.62, clump: 0.6 },
    { kind: 'rockSpire', count: [3, 5], fp: 2, minPathDist: 2, size: 1.05 },
    { kind: 'obsidian', count: [4, 7], fp: 1, minPathDist: 1, size: 0.5, clump: 0.5 },
  ],

  paintGroundDetail(ctx, map, rng, density) {
    scatter(map, rng, 50, [TileType.GROUND], (x, y) => softBlob(ctx, x, y, rng.float(12, 30), '#000000', 0.22));
    scatterWeighted(map, rng, 1600, [TileType.GROUND, TileType.BLOCKED, TileType.OBJECTIVE], density, (x, y) => {
      ctx.fillStyle = rgba(rng.pick(['#4a3a38', '#141010', '#5a3a30']), rng.float(0.5, 0.9));
      circle(ctx, x, y, rng.float(0.8, 2.4));
      ctx.fill();
    });
  },

  paintFeatures(ctx, map, pal) {
    const tiles = map.featureTiles;
    // heat halo on surrounding rock
    for (const t of tiles) softBlob(ctx, t.x * TILE + TILE / 2, t.y * TILE + TILE / 2, TILE * 1.2, '#c4401a', 0.07);
    // basalt lip, cooling crust, molten surface, white-hot core
    paintFeatureLayers(ctx, map, [
      { level: 0.32, color: '#140604' },
      { level: 0.42, color: '#7a1e08' },
      { level: 0.54, color: pal.feature },
      { level: 0.84, color: pal.featureDeep },
      { level: 0.54, stroke: 'rgba(255,190,90,0.55)', width: 1.2 },
    ]);
    // cooled crust floating on the surface
    for (const t of tiles) {
      const n = (t.x * 928371 + t.y * 12345) % 7;
      if (n > 2) continue;
      const x = t.x * TILE + 8 + (n * 5) % 16;
      const y = t.y * TILE + 10 + (n * 7) % 12;
      ctx.fillStyle = 'rgba(40,14,8,0.55)';
      ctx.beginPath();
      ctx.ellipse(x, y, 5 + n, 3 + n * 0.6, n, 0, TAU);
      ctx.fill();
    }
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
    const ash = Array.from({ length: Math.round(36 * scene.effects) }, () => ({ x: rng.float(0, WORLD_W), y: rng.float(0, WORLD_H), vx: rng.float(8, 18), vy: rng.float(6, 14), s: rng.float(0.8, 2) }));
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
      flash = volcano ? 0.4 : 0;
      quake = volcano ? 0.6 : 0;
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
      },
      drawUnder(ctx, t) {
        if (map.featureTiles.length) {
          ctx.save();
          ctx.clip(scene.featurePath);
          ctx.globalCompositeOperation = 'lighter';
          for (const f of flows) {
            const x = f.t.x * TILE + 16 + Math.sin(t * 0.6 + f.ph) * 10;
            const y = f.t.y * TILE + 16 + Math.cos(t * 0.5 + f.ph) * 10;
            drawGlow(ctx, '#ffc26a', x, y, f.s * 2, 0.22 + 0.12 * Math.sin(t * 1.2 + f.ph));
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
          const glow = 0.3 + 0.15 * Math.sin(t * 0.9 + c.ph);
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
          drawGlow(ctx, '#e0642a', volcano.x, volcano.y, volcano.r * 0.6, pulse * 0.5);
          ctx.fillStyle = '#c4501f';
          circle(ctx, volcano.x, volcano.y, volcano.r * 0.24);
          ctx.fill();
          ctx.fillStyle = rgba('#f0a040', 0.55 + 0.2 * Math.sin(t * 1.5));
          circle(ctx, volcano.x - volcano.r * 0.03, volcano.y - volcano.r * 0.03, volcano.r * 0.14);
          ctx.fill();
        }
      },
      drawOver(ctx, t) {
        const fx = scene.effects;
        ctx.globalCompositeOperation = 'lighter';
        for (const e of embers) drawGlow(ctx, '#ff9a3a', e.x, e.y, e.s * 2.5, Math.min(1, e.life) * fx);
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = rgba('#a89f99', 0.25 * fx);
        for (const a of ash) ctx.fillRect(a.x, a.y, a.s, a.s);
        if (flash > 0) {
          ctx.fillStyle = rgba('#ff6a1a', flash * 0.06 * fx);
          ctx.fillRect(0, 0, WORLD_W, WORLD_H);
        }
      },
    };
  },
};
