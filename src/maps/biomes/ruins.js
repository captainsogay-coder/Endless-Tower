import { VIGNETTE_DECOR } from '../vignettes.js';
import { TILE, WORLD_W, WORLD_H } from '../../config.js';
import { TileType, tileIndex } from '../mapGenerator.js';
import { scatter, scatterWeighted, softBlob, dropShadow } from '../paint.js';
import { rgba, shade } from '../../core/color.js';
import { circle, drawGlow, polygon } from '../../render/canvas.js';
import { TAU } from '../../core/math.js';

const palette = {
  ground: '#5c6741',
  groundRamp: ['#4a5636', '#5c6741', '#727250', '#86805c'],
  groundVariants: ['#6f7a4f', '#45533a', '#7d7a58', '#566040', '#62704a'],
  path: '#b6a886',
  pathEdge: '#5b5343',
  pathCenter: '#d0c29f',
  feature: '#3b5f58',
  featureEdge: '#7b725c',
  featureDeep: '#30524c',
  featureShine: '#7fe3c8',
  bridge: '#8f846a',
  pad: '#8e8670',
  accent: '#ffd27a',
  light: '#ffe6a8',
  shadow: '#151a0c',
};

const RUNE = '#8fd3cf';

function glyph(ctx, x, y, s, seed) {
  ctx.beginPath();
  const k = Math.floor(seed * 1000);
  ctx.moveTo(x - s, y - s);
  ctx.lineTo(x + (k % 3 ? s : -s * 0.2), y + s * 0.2);
  ctx.moveTo(x, y - s);
  ctx.lineTo(x, y + s);
  if (k % 2) {
    ctx.moveTo(x - s * 0.6, y + s * 0.6);
    ctx.lineTo(x + s * 0.6, y + s * 0.6);
  } else {
    ctx.arc(x, y, s * 0.5, 0, TAU * 0.6);
  }
}

export default {
  id: 'ruins',
  name: 'Ancient Ruins',
  tagline: 'A forgotten empire still keeps its vigil',
  palette,
  pathRuts: false,
  // late-afternoon sun, low from the west
  lighting: { pos: { x: -320, y: 300 }, strength: 0.22, vignette: 0.45, grade: '#f5eedb' },
  atmosphere: { cloudShadows: 4 },
  enemyPalette: { body: '#8a2f3c', dark: '#360d16', eye: '#9ff7ff', glow: '#ff6b6b' },
  portalColor: '#6ff0ff',
  bossTitle: 'Warden of the Sunken Throne',
  bridgeStyle: 'stone',
  variants: [
    { id: 'old-capital', name: 'Old Capital' },
    { id: 'sunken-courts', name: 'Sunken Courts', layout: { featureDensity: 0.1 } },
    { id: 'overgrown-terraces', name: 'Overgrown Terraces', layout: { featureDensity: 0.03 }, palette: { groundRamp: ['#42552f', '#55693b', '#6a7a45', '#7d8550'] }, lighting: { strength: 0.16 } },
  ],
  layout: { styles: { meander: 3, serpentine: 2, converge: 3 }, featureDensity: 0.06, rivers: [0, 0], noiseScale: 0.2 },
  decor: [
    ...VIGNETTE_DECOR.ruins,
    { kind: 'colossus', landmark: true, count: [1, 1], fp: 3, fallbackFp: 2, minPathDist: 2, size: 1.6 },
    { kind: 'monument', count: [0, 1], fp: 2, minPathDist: 2, size: 1.1 },
    { kind: 'pillar', count: [9, 14], fp: 1, minPathDist: 1, size: 0.55, clump: 0.8 },
    { kind: 'toppled', count: [2, 4], fp: 2, minPathDist: 1, size: 1.0, clump: 0.6 },
    { kind: 'runeCircle', count: [2, 4], fp: 1, minPathDist: 1, size: 0.6 },
    { kind: 'overgrowth', count: [4, 7], fp: 1, minPathDist: 1, size: 0.6, clump: 0.5 },
  ],

  paintGroundDetail(ctx, map, rng, density) {
    // flagstone plazas – ancient floors peeking through the grass
    for (let n = 0; n < 4; n++) {
      const cx = rng.int(2, map.cols - 3);
      const cy = rng.int(2, map.rows - 3);
      const rad = rng.int(2, 3);
      for (let y = cy - rad; y <= cy + rad; y++) {
        for (let x = cx - rad; x <= cx + rad; x++) {
          if (x < 0 || y < 0 || x >= map.cols || y >= map.rows) continue;
          if (Math.hypot(x - cx, y - cy) > rad + rng.float(-0.5, 0.5)) continue;
          const t = map.grid[tileIndex(x, y)];
          if (t !== TileType.GROUND && t !== TileType.BLOCKED && t !== TileType.OBJECTIVE) continue;
          const edge = Math.hypot(x - cx, y - cy) / (rad + 0.5);
          for (let k = 0; k < 4; k++) {
            if (rng.chance(0.15 + edge * 0.45)) continue; // crumbles toward the edges
            const sx = x * TILE + (k % 2) * 16 + 1 + rng.float(-1, 1);
            const sy = y * TILE + Math.floor(k / 2) * 16 + 1 + rng.float(-1, 1);
            ctx.globalAlpha = 0.55 - edge * 0.2;
            ctx.fillStyle = shade('#a39b80', rng.float(-0.2, 0.08));
            ctx.beginPath();
            ctx.roundRect(sx, sy, 14, 14, 2);
            ctx.fill();
            ctx.fillStyle = 'rgba(40,35,20,0.25)';
            ctx.fillRect(sx + 1, sy + 12, 13, 2);
            ctx.globalAlpha = 1;
          }
        }
      }
    }
    scatterWeighted(map, rng, 2000, [TileType.GROUND, TileType.BLOCKED, TileType.OBJECTIVE], density, (x, y) => {
      ctx.strokeStyle = rgba(rng.pick(['#7f9a52', '#4b6236', '#9aae60']), rng.float(0.5, 0.85));
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + rng.float(-2, 2), y - rng.float(3, 6));
      ctx.moveTo(x + 2, y);
      ctx.lineTo(x + 2 + rng.float(-2, 2), y - rng.float(3, 6));
      ctx.stroke();
    });
    scatter(map, rng, 120, [TileType.GROUND], (x, y) => {
      ctx.fillStyle = shade('#a39b80', rng.float(-0.3, 0));
      polygon(ctx, x, y, rng.float(1.5, 3.5), 5, rng.float(0, TAU));
      ctx.fill();
    });
  },

  paintPathDetail(ctx, map, rng) {
    for (const route of map.routes) {
      for (const t of route.tiles) {
        if (map.bridge[tileIndex(t.x, t.y)]) continue;
        for (let k = 0; k < 4; k++) {
          const sx = t.x * TILE + 3 + (k % 2) * 13;
          const sy = t.y * TILE + 3 + Math.floor(k / 2) * 13;
          ctx.fillStyle = shade(palette.path, rng.float(-0.12, 0.1));
          ctx.fillRect(sx, sy, 12, 12);
          ctx.strokeStyle = 'rgba(70,60,40,0.35)';
          ctx.lineWidth = 1;
          ctx.strokeRect(sx + 0.5, sy + 0.5, 11, 11);
        }
      }
    }
  },

  paintDecor(ctx, d) {
    const r = d.r;
    switch (d.kind) {
      case 'colossus': {
        // Landmark: the toppled head of a colossal statue, half sunk in the turf.
        const a = d.seed * 0.8 - 0.4;
        ctx.save();
        ctx.translate(d.x, d.y);
        ctx.rotate(a);
        dropShadow(ctx, r * 0.35, r * 0.35, r * 1.15, r * 0.8, 0.35);
        const g = ctx.createLinearGradient(-r, -r, r, r);
        g.addColorStop(0, '#d6ccb0');
        g.addColorStop(1, '#8c846a');
        ctx.fillStyle = g;
        ctx.strokeStyle = '#4e4836';
        ctx.lineWidth = 1.5;
        // head mass
        ctx.beginPath();
        ctx.ellipse(0, 0, r * 0.95, r * 0.78, 0, 0, TAU);
        ctx.fill();
        ctx.stroke();
        // crown band
        ctx.fillStyle = '#b3a988';
        ctx.beginPath();
        ctx.ellipse(-r * 0.35, -r * 0.05, r * 0.5, r * 0.72, 0, Math.PI * 0.5, Math.PI * 1.5);
        ctx.fill();
        ctx.stroke();
        // face, turned up to the sky
        ctx.strokeStyle = 'rgba(60,50,30,0.75)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(r * 0.25, -r * 0.32);
        ctx.quadraticCurveTo(r * 0.38, -r * 0.4, r * 0.5, -r * 0.3);
        ctx.moveTo(r * 0.25, r * 0.12);
        ctx.quadraticCurveTo(r * 0.38, r * 0.04, r * 0.5, r * 0.14);
        ctx.moveTo(r * 0.62, -r * 0.12);
        ctx.lineTo(r * 0.8, -r * 0.05);
        ctx.lineTo(r * 0.62, r * 0.02);
        ctx.moveTo(r * 0.45, r * 0.38);
        ctx.quadraticCurveTo(r * 0.55, r * 0.46, r * 0.68, r * 0.36);
        ctx.stroke();
        // a long crack and moss
        ctx.strokeStyle = 'rgba(50,40,25,0.6)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(-r * 0.2, -r * 0.7);
        ctx.lineTo(-r * 0.05, -r * 0.3);
        ctx.lineTo(-r * 0.15, r * 0.1);
        ctx.stroke();
        softBlob(ctx, -r * 0.55, r * 0.4, r * 0.4, '#5f7a3a', 0.8);
        softBlob(ctx, r * 0.1, -r * 0.6, r * 0.25, '#5f7a3a', 0.6);
        ctx.restore();
        break;
      }
      case 'pillar': {
        dropShadow(ctx, d.x + r * 0.5, d.y + r * 0.6, r * 0.9, r * 0.5, 0.3);
        ctx.fillStyle = '#8a8270';
        circle(ctx, d.x, d.y, r * 0.86);
        ctx.fill();
        ctx.fillStyle = '#cfc5a8';
        circle(ctx, d.x, d.y, r * 0.7);
        ctx.fill();
        ctx.strokeStyle = 'rgba(80,70,50,0.6)';
        ctx.lineWidth = 1;
        for (let i = 0; i < 10; i++) {
          const a = (i / 10) * TAU;
          ctx.beginPath();
          ctx.moveTo(d.x + Math.cos(a) * r * 0.45, d.y + Math.sin(a) * r * 0.45);
          ctx.lineTo(d.x + Math.cos(a) * r * 0.7, d.y + Math.sin(a) * r * 0.7);
          ctx.stroke();
        }
        // broken top
        ctx.fillStyle = '#9b927a';
        ctx.beginPath();
        ctx.moveTo(d.x - r * 0.4, d.y - r * 0.1);
        ctx.lineTo(d.x + r * 0.1, d.y - r * 0.5);
        ctx.lineTo(d.x + r * 0.45, d.y + r * 0.1);
        ctx.lineTo(d.x, d.y + r * 0.3);
        ctx.closePath();
        ctx.fill();
        if (d.seed > 0.5) {
          ctx.strokeStyle = '#4f7a35';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(d.x, d.y, r * 0.78, d.seed * 6, d.seed * 6 + 2.4);
          ctx.stroke();
        }
        break;
      }
      case 'toppled': {
        const a = d.seed * Math.PI;
        ctx.save();
        ctx.translate(d.x, d.y);
        ctx.rotate(a);
        dropShadow(ctx, 4, 6, r * 1.15, r * 0.36, 0.3);
        const g = ctx.createLinearGradient(0, -r * 0.3, 0, r * 0.3);
        g.addColorStop(0, '#ddd3b6');
        g.addColorStop(1, '#8c846c');
        ctx.fillStyle = g;
        const segs = 3;
        for (let i = 0; i < segs; i++) {
          const x0 = -r * 1.1 + (i * r * 2.2) / segs + i * 2;
          ctx.fillRect(x0, -r * 0.28, (r * 2.2) / segs - 3, r * 0.56);
        }
        ctx.strokeStyle = 'rgba(80,70,50,0.4)';
        for (let k = -2; k <= 2; k++) {
          ctx.beginPath();
          ctx.moveTo(-r * 1.1, k * r * 0.1);
          ctx.lineTo(r * 1.1, k * r * 0.1);
          ctx.stroke();
        }
        ctx.restore();
        break;
      }
      case 'monument': {
        dropShadow(ctx, d.x + 6, d.y + 10, r * 1.1, r * 0.7, 0.4);
        ctx.fillStyle = '#6e6754';
        ctx.fillRect(d.x - r, d.y - r * 0.4, r * 2, r * 1.2);
        ctx.fillStyle = '#a49a7e';
        ctx.fillRect(d.x - r * 0.8, d.y - r * 0.95, r * 1.6, r * 1.3);
        ctx.fillStyle = '#c9bf9f';
        ctx.beginPath();
        ctx.moveTo(d.x - r * 0.55, d.y - r * 0.95);
        ctx.lineTo(d.x, d.y - r * 1.45);
        ctx.lineTo(d.x + r * 0.55, d.y - r * 0.95);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = 'rgba(60,50,30,0.5)';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(d.x - r * 0.8, d.y - r * 0.95, r * 1.6, r * 1.3);
        ctx.strokeStyle = 'rgba(60,40,20,0.6)';
        ctx.beginPath();
        ctx.moveTo(d.x + r * 0.3, d.y - r * 0.9);
        ctx.lineTo(d.x + r * 0.1, d.y - r * 0.4);
        ctx.lineTo(d.x + r * 0.35, d.y);
        ctx.stroke();
        break;
      }
      case 'runeCircle': {
        ctx.strokeStyle = 'rgba(40,40,30,0.5)';
        ctx.lineWidth = 3;
        circle(ctx, d.x, d.y, r * 0.85);
        ctx.stroke();
        ctx.fillStyle = 'rgba(60,60,45,0.4)';
        circle(ctx, d.x, d.y, r * 0.8);
        ctx.fill();
        break;
      }
      case 'overgrowth': {
        // a low shrub that has grown over fallen masonry
        const rr = Math.max(7, r * 0.7);
        dropShadow(ctx, d.x + 3, d.y + 4, rr * 1.1, rr * 0.7, 0.3);
        ctx.fillStyle = '#9b927a';
        ctx.fillRect(d.x - rr * 0.9, d.y + rr * 0.1, rr * 0.9, rr * 0.5);
        for (const [col, k, dx, dy] of [['#3d5a2a', 1, 0, 0], ['#4f7034', 0.78, -0.12, -0.12], ['#6a8a44', 0.45, -0.25, -0.28]]) {
          ctx.fillStyle = col;
          ctx.beginPath();
          for (let i = 0; i < 6; i++) {
            const a = (i / 6) * TAU + d.seed * 4;
            const x = d.x + rr * dx + Math.cos(a) * rr * 0.42 * k;
            const y = d.y + rr * dy + Math.sin(a) * rr * 0.36 * k;
            ctx.moveTo(x + rr * 0.45 * k, y);
            ctx.arc(x, y, rr * 0.45 * k, 0, TAU);
          }
          ctx.fill();
        }
        break;
      }
      default:
    }
  },

  createAmbient(map, rng, scene) {
    const runes = map.decor.filter((d) => d.kind === 'runeCircle' || d.kind === 'monument');
    const shafts = Array.from({ length: 4 }, () => ({ x: rng.float(-200, WORLD_W), w: rng.float(60, 120), ph: rng.float(0, TAU), sp: rng.float(0.05, 0.12) }));

    return {
      update() {},
      drawUnder(ctx, t) {
        for (const d of runes) {
          const pulse = 0.5 + 0.5 * Math.sin(t * 0.9 + d.seed * 12);
          const isMon = d.kind === 'monument';
          const cx = d.x;
          const cy = isMon ? d.y - d.r * 0.35 : d.y;
          drawGlow(ctx, isMon ? palette.accent : RUNE, cx, cy, d.r * 1.2, 0.08 + 0.08 * pulse);
          ctx.save();
          ctx.translate(cx, cy);
          ctx.strokeStyle = rgba(isMon ? palette.accent : RUNE, 0.45 + 0.3 * pulse);
          ctx.lineWidth = 1.3;
          if (isMon) {
            glyph(ctx, 0, 0, d.r * 0.22, d.seed);
            ctx.stroke();
          } else {
            ctx.rotate(t * 0.12 * (d.seed > 0.5 ? 1 : -1));
            circle(ctx, 0, 0, d.r * 0.68);
            ctx.stroke();
            for (let i = 0; i < 6; i++) {
              const a = (i / 6) * TAU;
              glyph(ctx, Math.cos(a) * d.r * 0.45, Math.sin(a) * d.r * 0.45, 2.4, d.seed + i * 0.13);
            }
            ctx.stroke();
          }
          ctx.restore();
        }
      },
      drawOver(ctx, t) {
        // soft late-afternoon light shafts, matching the low westerly key light
        const fx = scene.effects;
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        for (const s of shafts) {
          const x = s.x + Math.sin(t * s.sp + s.ph) * 50;
          const a = (0.025 + 0.012 * Math.sin(t * 0.3 + s.ph)) * fx;
          const g = ctx.createLinearGradient(x, 0, x + 260, WORLD_H);
          g.addColorStop(0, rgba(palette.light, a * 1.6));
          g.addColorStop(1, rgba(palette.light, 0));
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x + s.w, 0);
          ctx.lineTo(x + s.w + 300, WORLD_H);
          ctx.lineTo(x + 300, WORLD_H);
          ctx.closePath();
          ctx.fill();
        }
        ctx.restore();
      },
    };
  },
};
