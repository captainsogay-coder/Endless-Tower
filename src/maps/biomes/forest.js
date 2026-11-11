import { TILE, WORLD_W, WORLD_H } from '../../config.js';
import { TileType } from '../mapGenerator.js';
import { scatter, softBlob, dropShadow } from '../paint.js';
import { rgba } from '../../core/color.js';
import { circle, drawGlow } from '../../render/canvas.js';
import { TAU } from '../../core/math.js';

const palette = {
  ground: '#2c5a3a',
  groundVariants: ['#3f7a4a', '#22452e', '#4b8a50', '#1d3a28', '#356b44'],
  path: '#a3845a',
  pathEdge: '#4d3b27',
  pathCenter: '#d2b382',
  feature: '#1d6d78',
  featureEdge: '#173f39',
  featureDeep: '#134c58',
  featureShine: '#8af0e8',
  bridge: '#7d5733',
  pad: '#5b6f5a',
  accent: '#9effc4',
  light: '#e2ffb8',
  shadow: '#06140c',
};

export default {
  id: 'forest',
  name: 'Enchanted Forest',
  tagline: 'Ancient boughs hum with forgotten magic',
  palette,
  enemyPalette: { body: '#7a45b8', dark: '#2a1446', eye: '#ffe066', glow: '#d39bff' },
  portalColor: '#b56bff',
  bossTitle: 'Warden of the Deepwood',
  layout: { styles: { meander: 3, serpentine: 2, converge: 3 }, featureDensity: 0.07, rivers: [0, 1] },
  decor: [
    { kind: 'ancientTree', count: [7, 11], fp: 2, minPathDist: 2, size: 2.1 },
    { kind: 'ancientTree', count: [3, 6], fp: 1, minPathDist: 2, size: 1.25 },
    { kind: 'mushrooms', count: [6, 10], fp: 1, minPathDist: 1, size: 0.5 },
    { kind: 'mossStone', count: [3, 6], fp: 1, minPathDist: 1, size: 0.5 },
    { kind: 'lilypad', on: 'feature', count: [5, 10], size: 0.4 },
  ],

  paintGroundDetail(ctx, map, rng) {
    // moss patches
    scatter(map, rng, 90, [TileType.GROUND, TileType.OBJECTIVE], (x, y) => softBlob(ctx, x, y, rng.float(10, 26), rng.pick(['#5c9c4c', '#2f6a3a']), 0.35));
    // grass tufts
    scatter(map, rng, 1500, [TileType.GROUND, TileType.BLOCKED, TileType.OBJECTIVE], (x, y) => {
      ctx.strokeStyle = rgba(rng.pick(['#6fb25a', '#3d7a3e', '#8fd06a', '#2c5a32']), rng.float(0.5, 0.9));
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      for (let k = 0; k < 3; k++) {
        ctx.moveTo(x + k * 2 - 2, y);
        ctx.quadraticCurveTo(x + k * 2 - 2 + rng.float(-2, 2), y - 3, x + k * 2 - 2 + rng.float(-3, 3), y - rng.float(4, 7));
      }
      ctx.stroke();
    });
    // flowers
    scatter(map, rng, 160, [TileType.GROUND], (x, y) => {
      const c = rng.pick(['#ff9bd2', '#9fd8ff', '#fff3a8', '#e6b3ff']);
      ctx.fillStyle = c;
      for (let k = 0; k < 4; k++) {
        circle(ctx, x + Math.cos((k / 4) * TAU) * 1.8, y + Math.sin((k / 4) * TAU) * 1.8, 1.4);
        ctx.fill();
      }
      ctx.fillStyle = '#fff8d0';
      circle(ctx, x, y, 0.9);
      ctx.fill();
    });
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
          cg.addColorStop(0, '#b6fff5');
          cg.addColorStop(1, '#2bb3c9');
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
        ctx.fillStyle = '#58a046';
        ctx.beginPath();
        ctx.ellipse(d.x - r * 0.15, d.y - r * 0.2, r * 0.6, r * 0.35, d.seed, 0, TAU);
        ctx.fill();
        break;
      }
      case 'lilypad': {
        ctx.fillStyle = '#3f9a4c';
        ctx.beginPath();
        ctx.moveTo(d.x, d.y);
        ctx.arc(d.x, d.y, r * 0.55, d.seed * TAU + 0.4, d.seed * TAU + TAU - 0.2);
        ctx.closePath();
        ctx.fill();
        if (d.seed > 0.55) {
          ctx.fillStyle = '#ffb6e1';
          circle(ctx, d.x + 2, d.y - 2, 3);
          ctx.fill();
        }
        break;
      }
      default:
    }
  },

  createAmbient(map, rng, scene) {
    const trees = map.decor.filter((d) => d.kind === 'ancientTree').map((d) => ({
      d,
      lobes: Array.from({ length: 7 }, (_, i) => ({
        a: (i / 7) * TAU + d.seed * 4,
        dist: d.r * rng.float(0.35, 0.55),
        rad: d.r * rng.float(0.42, 0.6),
        ph: rng.float(0, TAU),
      })),
      lights: Array.from({ length: 4 }, () => ({ a: rng.float(0, TAU), dist: d.r * rng.float(0.2, 0.7), ph: rng.float(0, TAU) })),
    }));
    const shrooms = map.decor.filter((d) => d.kind === 'mushrooms');
    const flies = Array.from({ length: Math.round(46 * scene.effects) }, () => ({
      x: rng.float(0, WORLD_W), y: rng.float(0, WORLD_H), ph: rng.float(0, TAU), sp: rng.float(6, 16), a: rng.float(0, TAU),
    }));
    const leaves = Array.from({ length: Math.round(14 * scene.effects) }, () => ({
      x: rng.float(0, WORLD_W), y: rng.float(0, WORLD_H), vy: rng.float(8, 18), vx: rng.float(-6, 6), rot: rng.float(0, TAU), ph: rng.float(0, TAU),
    }));
    const ripples = Array.from({ length: 10 }, () => ({ t: rng.pick(map.featureTiles.length ? map.featureTiles : [{ x: 0, y: 0 }]), ph: rng.float(0, 3) }));

    return {
      update(dt, t) {
        for (const f of flies) {
          f.a += Math.sin(t * 0.7 + f.ph) * dt * 1.5;
          f.x += Math.cos(f.a) * f.sp * dt;
          f.y += Math.sin(f.a) * f.sp * dt;
          if (f.x < -10) f.x = WORLD_W + 10; else if (f.x > WORLD_W + 10) f.x = -10;
          if (f.y < -10) f.y = WORLD_H + 10; else if (f.y > WORLD_H + 10) f.y = -10;
        }
        for (const l of leaves) {
          l.y += l.vy * dt;
          l.x += (l.vx + Math.sin(t + l.ph) * 10) * dt;
          l.rot += dt * 1.4;
          if (l.y > WORLD_H + 10) { l.y = -10; l.x = Math.random() * WORLD_W; }
        }
      },
      drawUnder(ctx, t) {
        // water ripples
        if (map.featureTiles.length) {
          ctx.save();
          ctx.clip(scene.featurePath);
          ctx.strokeStyle = rgba(palette.featureShine, 0.35);
          ctx.lineWidth = 1.2;
          for (const r of ripples) {
            const k = ((t * 0.35 + r.ph) % 3) / 3;
            ctx.globalAlpha = 1 - k;
            ctx.beginPath();
            ctx.ellipse(r.t.x * TILE + TILE / 2, r.t.y * TILE + TILE / 2, 3 + k * 16, 2 + k * 9, 0, 0, TAU);
            ctx.stroke();
          }
          ctx.restore();
        }
        // mushroom glow
        for (const s of shrooms) drawGlow(ctx, '#5ff7ff', s.x, s.y, s.r * 2.4, 0.25 + 0.15 * Math.sin(t * 2 + s.seed * 10));
        // swaying canopies
        for (const tr of trees) {
          const { d } = tr;
          for (let layer = 0; layer < 3; layer++) {
            const col = ['#1f4a2b', '#2f6d3a', '#4f9a4a'][layer];
            const scale = [1, 0.82, 0.55][layer];
            ctx.fillStyle = col;
            ctx.beginPath();
            for (const lb of tr.lobes) {
              const sway = Math.sin(t * 0.8 + lb.ph + layer) * 1.8;
              const x = d.x + Math.cos(lb.a) * lb.dist * scale + sway - layer * d.r * 0.06;
              const y = d.y + Math.sin(lb.a) * lb.dist * scale - layer * d.r * 0.08;
              ctx.moveTo(x + lb.rad * scale, y);
              ctx.arc(x, y, lb.rad * scale, 0, TAU);
            }
            ctx.fill();
          }
          for (const lt of tr.lights) {
            const x = d.x + Math.cos(lt.a) * lt.dist;
            const y = d.y + Math.sin(lt.a) * lt.dist - d.r * 0.1;
            const a = 0.45 + 0.35 * Math.sin(t * 1.6 + lt.ph);
            drawGlow(ctx, '#c8ff8a', x, y, 7, a);
          }
        }
      },
      drawOver(ctx, t) {
        const fx = scene.effects;
        for (const f of flies) {
          const a = (0.3 + 0.35 * Math.sin(t * 3 + f.ph * 3)) * fx;
          drawGlow(ctx, '#e7ff8a', f.x, f.y, 6, a);
        }
        ctx.fillStyle = rgba('#d6a64a', 0.55 * fx);
        for (const l of leaves) {
          ctx.save();
          ctx.translate(l.x, l.y);
          ctx.rotate(l.rot);
          ctx.beginPath();
          ctx.ellipse(0, 0, 3.2, 1.6, 0, 0, TAU);
          ctx.fill();
          ctx.restore();
        }
      },
    };
  },
};

