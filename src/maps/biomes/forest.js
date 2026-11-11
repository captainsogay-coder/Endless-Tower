import { TILE } from '../../config.js';
import { TileType } from '../mapGenerator.js';
import { scatterWeighted, softBlob, dropShadow } from '../paint.js';
import { rgba } from '../../core/color.js';
import { circle, drawGlow } from '../../render/canvas.js';
import { TAU } from '../../core/math.js';

// Enchanted Forest — damp moss greens, warm bark, cyan bioluminescence used
// sparingly (mushrooms only). Dappled top-left light through the canopy.
const palette = {
  ground: '#3f6a3e',
  groundRamp: ['#2c4f33', '#3f6a3e', '#5a8146', '#6e8c4c'],
  groundVariants: ['#4b7a45', '#2c4f33'],
  path: '#9a8160',
  pathEdge: '#574530',
  pathCenter: '#bea47a',
  feature: '#2a6468',
  featureEdge: '#1f3d33',
  featureDeep: '#1f5158',
  featureShine: '#a6e0d6',
  bridge: '#7a5a3a',
  pad: '#6a7563',
  accent: '#a8d8a0',
  light: '#f3f0c8',
  shadow: '#0c1a10',
};

const CANOPY = ['#24452b', '#335f36', '#4a7a42'];

export default {
  id: 'forest',
  name: 'Enchanted Forest',
  tagline: 'Ancient boughs hum with forgotten magic',
  palette,
  lighting: { strength: 0.16, vignette: 0.42, grade: '#eef3e2' },
  atmosphere: { cloudShadows: 4 },
  enemyPalette: { body: '#7448a6', dark: '#2a1446', eye: '#f2d65c', glow: '#c39ae8' },
  portalColor: '#9b6bd1',
  bossTitle: 'Warden of the Deepwood',
  variants: [
    { id: 'deepwood', name: 'Deepwood' },
    { id: 'mossy-hollow', name: 'Mossy Hollow', layout: { featureDensity: 0.11, rivers: [1, 1] }, lighting: { strength: 0.12, grade: '#e4ecd8' } },
    { id: 'sunlit-glade', name: 'Sunlit Glade', layout: { featureDensity: 0.035, rivers: [0, 0] }, lighting: { strength: 0.22, grade: '#f6f2dc' }, palette: { groundRamp: ['#3a5f35', '#517c42', '#6d9150', '#86a05a'] } },
  ],
  layout: { styles: { meander: 3, serpentine: 2, converge: 3 }, featureDensity: 0.07, rivers: [0, 1] },
  decor: [
    { kind: 'elderTree', landmark: true, count: [1, 1], fp: 3, fallbackFp: 2, minPathDist: 2, size: 2.7 },
    { kind: 'ancientTree', count: [6, 9], fp: 2, minPathDist: 2, size: 2.0, clump: 0.6 },
    { kind: 'ancientTree', count: [4, 7], fp: 1, minPathDist: 2, size: 1.2, clump: 0.6 },
    { kind: 'mushrooms', count: [4, 7], fp: 1, minPathDist: 1, size: 0.5, clump: 0.4 },
    { kind: 'mossStone', count: [3, 5], fp: 1, minPathDist: 1, size: 0.5, clump: 0.3 },
    { kind: 'lilypad', on: 'feature', count: [5, 9], size: 0.4 },
  ],

  paintGroundDetail(ctx, map, rng, density) {
    // grass grows thick in patches and thins out elsewhere
    scatterWeighted(map, rng, 2600, [TileType.GROUND, TileType.BLOCKED, TileType.OBJECTIVE], density, (x, y) => {
      ctx.strokeStyle = rgba(rng.pick(['#6c9a52', '#3e6b3c', '#7fa85a', '#2f5734']), rng.float(0.45, 0.85));
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      for (let k = 0; k < 3; k++) {
        ctx.moveTo(x + k * 2 - 2, y);
        ctx.quadraticCurveTo(x + k * 2 - 2 + rng.float(-2, 2), y - 3, x + k * 2 - 2 + rng.float(-3, 3), y - rng.float(4, 7));
      }
      ctx.stroke();
    });
    // flowers only where grass is lush, in a restrained palette
    scatterWeighted(map, rng, 260, [TileType.GROUND], (x, y) => Math.pow(density(x, y), 2), (x, y) => {
      ctx.fillStyle = rng.pick(['#e8d9a8', '#c9a7d6', '#e7e3d4']);
      circle(ctx, x, y, 1.3);
      ctx.fill();
    });
    // fallen leaves near nothing in particular – bare soil patches instead
    scatterWeighted(map, rng, 60, [TileType.GROUND], (x, y) => 1 - density(x, y), (x, y) => softBlob(ctx, x, y, rng.float(8, 18), '#5a4a32', 0.18));
  },

  paintDecor(ctx, d, rng) {
    const r = d.r;
    switch (d.kind) {
      case 'ancientTree': {
        dropShadow(ctx, d.x + r * 0.15, d.y + r * 0.25, r * 1.0, r * 0.8, 0.35);
        ctx.strokeStyle = '#4a3220';
        ctx.lineCap = 'round';
        const roots = 6 + Math.floor(d.seed * 4);
        for (let i = 0; i < roots; i++) {
          const a = (i / roots) * TAU + d.seed * 3;
          ctx.lineWidth = r * 0.12;
          ctx.beginPath();
          ctx.moveTo(d.x, d.y);
          ctx.quadraticCurveTo(d.x + Math.cos(a + 0.4) * r * 0.5, d.y + Math.sin(a + 0.4) * r * 0.5, d.x + Math.cos(a) * r * 0.85, d.y + Math.sin(a) * r * 0.85);
          ctx.stroke();
        }
        const tg = ctx.createRadialGradient(d.x - r * 0.1, d.y - r * 0.1, 0, d.x, d.y, r * 0.38);
        tg.addColorStop(0, '#8a6440');
        tg.addColorStop(1, '#3b2616');
        ctx.fillStyle = tg;
        circle(ctx, d.x, d.y, r * 0.36);
        ctx.fill();
        break;
      }
      case 'elderTree': {
        // Landmark: a vast old tree inside a ring of standing stones.
        dropShadow(ctx, d.x + r * 0.2, d.y + r * 0.28, r * 1.05, r * 0.85, 0.32);
        for (let i = 0; i < 9; i++) {
          const a = (i / 9) * TAU + d.seed;
          const sx = d.x + Math.cos(a) * r * 1.08;
          const sy = d.y + Math.sin(a) * r * 1.08;
          dropShadow(ctx, sx + 2, sy + 3, 4.5, 2.5, 0.35);
          ctx.fillStyle = '#8c8a80';
          ctx.strokeStyle = '#3b3a34';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.roundRect(sx - 3.5, sy - 5, 7, 8, 1.5);
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = '#6e8f4e';
          ctx.fillRect(sx - 3.5, sy - 5, 7, 2);
        }
        ctx.strokeStyle = '#4a3220';
        ctx.lineCap = 'round';
        for (let i = 0; i < 11; i++) {
          const a = (i / 11) * TAU + d.seed * 2;
          ctx.lineWidth = r * 0.1;
          ctx.beginPath();
          ctx.moveTo(d.x, d.y);
          ctx.quadraticCurveTo(d.x + Math.cos(a + 0.5) * r * 0.45, d.y + Math.sin(a + 0.5) * r * 0.45, d.x + Math.cos(a) * r * 0.8, d.y + Math.sin(a) * r * 0.8);
          ctx.stroke();
        }
        const tg = ctx.createLinearGradient(d.x - r * 0.4, d.y - r * 0.4, d.x + r * 0.4, d.y + r * 0.4);
        tg.addColorStop(0, '#7c5a3a');
        tg.addColorStop(1, '#3a2617');
        ctx.fillStyle = tg;
        circle(ctx, d.x, d.y, r * 0.4);
        ctx.fill();
        break;
      }
      case 'mushrooms': {
        const n = 3 + Math.floor(d.seed * 3);
        for (let i = 0; i < n; i++) {
          const a = (i / n) * TAU + d.seed * 5;
          const px = d.x + Math.cos(a) * r * 0.45;
          const py = d.y + Math.sin(a) * r * 0.45;
          const s = r * (0.35 + ((i * 37) % 10) / 30);
          dropShadow(ctx, px + 2, py + 3, s, s * 0.6, 0.3);
          ctx.fillStyle = '#efe2c4';
          ctx.fillRect(px - s * 0.18, py - s * 0.1, s * 0.36, s * 0.7);
          const cg = ctx.createRadialGradient(px - s * 0.3, py - s * 0.4, 0, px, py - s * 0.2, s);
          cg.addColorStop(0, '#bfe9e2');
          cg.addColorStop(1, '#3f9aa6');
          ctx.fillStyle = cg;
          ctx.beginPath();
          ctx.ellipse(px, py - s * 0.15, s, s * 0.62, 0, 0, TAU);
          ctx.fill();
          ctx.fillStyle = 'rgba(255,255,255,0.7)';
          circle(ctx, px - s * 0.3, py - s * 0.3, s * 0.12);
          ctx.fill();
        }
        break;
      }
      case 'mossStone': {
        dropShadow(ctx, d.x + 3, d.y + 4, r * 0.9, r * 0.6, 0.35);
        ctx.fillStyle = '#6c7468';
        ctx.beginPath();
        ctx.ellipse(d.x, d.y, r * 0.85, r * 0.62, d.seed, 0, TAU);
        ctx.fill();
        ctx.fillStyle = '#5f8a46';
        ctx.beginPath();
        ctx.ellipse(d.x - r * 0.15, d.y - r * 0.2, r * 0.6, r * 0.35, d.seed, 0, TAU);
        ctx.fill();
        break;
      }
      case 'lilypad': {
        ctx.fillStyle = '#4b8a4a';
        ctx.beginPath();
        ctx.moveTo(d.x, d.y);
        ctx.arc(d.x, d.y, r * 0.55, d.seed * TAU + 0.4, d.seed * TAU + TAU - 0.2);
        ctx.closePath();
        ctx.fill();
        if (d.seed > 0.55) {
          ctx.fillStyle = '#e9d6dc';
          circle(ctx, d.x + 2, d.y - 2, 3);
          ctx.fill();
        }
        break;
      }
      default:
    }
  },


  createAmbient(map, rng, scene) {
    const trees = map.decor.filter((d) => d.kind === 'ancientTree' || d.kind === 'elderTree').map((d) => {
      const elder = d.kind === 'elderTree';
      const n = elder ? 10 : 7;
      return {
        d,
        elder,
        lobes: Array.from({ length: n }, (_, i) => ({
          a: (i / n) * TAU + d.seed * 4,
          dist: d.r * rng.float(0.35, 0.55),
          rad: d.r * rng.float(0.42, 0.58),
          ph: rng.float(0, TAU),
        })),
      };
    });
    const shrooms = map.decor.filter((d) => d.kind === 'mushrooms');
    // fireflies belong to the mushroom groves, not the whole map
    const flies = [];
    for (const s of shrooms) for (let i = 0; i < 2; i++) flies.push({ s, a: rng.float(0, TAU), ph: rng.float(0, TAU), rad: rng.float(10, 22) });
    // leaves fall from canopies and land nearby
    const leaves = [];
    const spawnLeaf = () => {
      if (!trees.length) return;
      const tr = rng.pick(trees);
      leaves.push({ x: tr.d.x + rng.float(-tr.d.r, tr.d.r) * 0.7, y: tr.d.y + rng.float(-tr.d.r, tr.d.r) * 0.6, life: 0, max: rng.float(2.5, 4), rot: rng.float(0, TAU), vx: rng.float(-6, 6) });
    };
    let leafTimer = 0;
    const ripples = Array.from({ length: map.featureTiles.length ? 8 : 0 }, () => ({ t: rng.pick(map.featureTiles), ph: rng.float(0, 3) }));

    return {
      update(dt, t) {
        leafTimer -= dt;
        if (leafTimer <= 0 && leaves.length < 10 * scene.effects) {
          spawnLeaf();
          leafTimer = rng.float(0.4, 1.2);
        }
        for (let i = leaves.length - 1; i >= 0; i--) {
          const l = leaves[i];
          l.life += dt;
          l.y += 7 * dt;
          l.x += (l.vx + Math.sin(t * 2 + l.rot) * 6) * dt;
          l.rot += dt * 1.6;
          if (l.life > l.max) leaves.splice(i, 1);
        }
        for (const f of flies) f.a += dt * 0.6;
      },
      drawUnder(ctx, t) {
        if (ripples.length) {
          ctx.save();
          ctx.clip(scene.featurePath);
          ctx.strokeStyle = rgba(palette.featureShine, 0.3);
          ctx.lineWidth = 1;
          for (const r of ripples) {
            const k = ((t * 0.3 + r.ph) % 3) / 3;
            ctx.globalAlpha = 1 - k;
            ctx.beginPath();
            ctx.ellipse(r.t.x * TILE + TILE / 2, r.t.y * TILE + TILE / 2, 3 + k * 14, 2 + k * 8, 0, 0, TAU);
            ctx.stroke();
          }
          ctx.restore();
        }
        for (const s of shrooms) drawGlow(ctx, '#7fd6d0', s.x, s.y, s.r * 2, 0.12 + 0.05 * Math.sin(t * 1.5 + s.seed * 10));
        for (const tr of trees) {
          const { d } = tr;
          for (let layer = 0; layer < 3; layer++) {
            const scale = [1, 0.8, 0.52][layer] * (tr.elder ? 0.86 : 1);
            ctx.fillStyle = tr.elder ? ['#1f3d27', '#2e5532', '#46703f'][layer] : CANOPY[layer];
            ctx.beginPath();
            for (const lb of tr.lobes) {
              const sway = Math.sin(t * 0.7 + lb.ph + layer) * (tr.elder ? 1 : 1.6);
              const x = d.x + Math.cos(lb.a) * lb.dist * scale + sway - layer * d.r * 0.07;
              const y = d.y + Math.sin(lb.a) * lb.dist * scale - layer * d.r * 0.09;
              ctx.moveTo(x + lb.rad * scale, y);
              ctx.arc(x, y, lb.rad * scale, 0, TAU);
            }
            ctx.fill();
          }
        }
      },
      drawOver(ctx, t) {
        const fx = scene.effects;
        for (const f of flies) {
          const x = f.s.x + Math.cos(f.a + f.ph) * f.rad;
          const y = f.s.y - 6 + Math.sin(f.a * 1.3 + f.ph) * f.rad * 0.5;
          const a = (0.35 + 0.3 * Math.sin(t * 2.4 + f.ph * 3)) * fx;
          ctx.fillStyle = rgba('#e9f2a6', a);
          ctx.fillRect(x - 1, y - 1, 2, 2);
        }
        for (const l of leaves) {
          const a = Math.min(1, l.life * 3, (l.max - l.life) * 2) * 0.8 * fx;
          ctx.save();
          ctx.translate(l.x, l.y);
          ctx.rotate(l.rot);
          ctx.fillStyle = rgba('#b88b45', a);
          ctx.beginPath();
          ctx.ellipse(0, 0, 3, 1.5, 0, 0, TAU);
          ctx.fill();
          ctx.restore();
        }
      },
    };
  },
};
