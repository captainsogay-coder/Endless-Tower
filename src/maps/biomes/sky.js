import { TILE, WORLD_W, WORLD_H, COLS, ROWS } from '../../config.js';
import { TileType, tileIndex } from '../mapGenerator.js';
import { scatterWeighted, dropShadow, isType, blobPoints } from '../paint.js';
import { rgba } from '../../core/color.js';
import { circle, drawGlow, makeCanvas } from '../../render/canvas.js';
import { TAU } from '../../core/math.js';

const palette = {
  ground: '#78b257',
  groundRamp: ['#5a9246', '#71a952', '#8cbc62', '#9fc56e'],
  groundVariants: ['#8fd469', '#5fa346', '#a2dd78', '#579640', '#7fc85e'],
  path: '#dcc490',
  pathEdge: '#8a6e45',
  pathCenter: '#f1dfb2',
  feature: '#000000',
  featureEdge: '#000000',
  featureDeep: '#000000',
  featureShine: '#ffffff',
  bridge: '#9b6b3e',
  pad: '#c9b98d',
  accent: '#9fe8ff',
  light: '#fff4d6',
  shadow: '#1d3d5c',
};

const CLIFF = '#7a5a3c';
const CLIFF_DARK = '#4a3424';

export default {
  id: 'sky',
  name: 'Sky Islands',
  tagline: 'Shattered lands adrift above the clouds',
  palette,
  lighting: { strength: 0.12, vignette: 0.22, grade: '#fbf8ee' },
  atmosphere: { cloudShadows: 3 },
  enemyPalette: { body: '#4b3a8c', dark: '#1f1648', eye: '#ffef7a', glow: '#a58cff' },
  portalColor: '#ffd56a',
  bossTitle: 'Warden of the Endless Sky',
  layout: { styles: { meander: 3, serpentine: 1, converge: 3 }, featureDensity: 0.3, edgeBias: 0.8, rivers: [0, 0], noiseScale: 0.16 },
  decor: [
    { kind: 'skyShrine', landmark: true, count: [1, 1], fp: 3, fallbackFp: 2, minPathDist: 2, size: 1.4 },
    { kind: 'cloudTree', count: [8, 12], fp: 1, minPathDist: 1, size: 0.75, clump: 0.7 },
    { kind: 'cloudTree', count: [2, 4], fp: 2, minPathDist: 2, size: 1.25, clump: 0.7 },
    { kind: 'waterfall', on: 'cliff', count: [3, 6], size: 0.5 },
    { kind: 'floatingRock', on: 'feature', count: [5, 8], size: 0.4 },
  ],

  paintGroundDetail(ctx, map, rng, density) {
    scatterWeighted(map, rng, 2200, [TileType.GROUND, TileType.BLOCKED, TileType.OBJECTIVE], density, (x, y) => {
      ctx.strokeStyle = rgba(rng.pick(['#8fc066', '#57904a', '#a3cd78']), rng.float(0.5, 0.85));
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + rng.float(-2, 2), y - rng.float(3, 6));
      ctx.stroke();
    });
    scatterWeighted(map, rng, 200, [TileType.GROUND], (x, y) => density(x, y) ** 2, (x, y) => {
      ctx.fillStyle = rng.pick(['#f4f1e4', '#efd98a', '#d9b8d0']);
      circle(ctx, x, y, 1.6);
      ctx.fill();
    });
  },

  paintFeatures(ctx, map) {
    const tiles = map.featureTiles;
    const blobs = blobPoints(map);
    // Cut the void out of the land.
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    for (const t of blobs) {
      const x = t.x * TILE + TILE / 2;
      const y = t.y * TILE + TILE / 2;
      ctx.moveTo(x + TILE * 0.72, y);
      ctx.arc(x, y, TILE * 0.72, 0, TAU);
    }
    ctx.fill();
    // Grass rim highlight
    ctx.globalCompositeOperation = 'source-atop';
    ctx.strokeStyle = 'rgba(220,255,170,0.55)';
    ctx.lineWidth = 3;
    for (const t of tiles) {
      const x = t.x * TILE + TILE / 2;
      const y = t.y * TILE + TILE / 2;
      ctx.beginPath();
      ctx.arc(x, y, TILE * 0.74, 0, TAU);
      ctx.stroke();
    }
    // Cliff faces hang beneath land, drawn only into transparent void.
    ctx.globalCompositeOperation = 'destination-over';
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const i = tileIndex(x, y);
        if (map.grid[i] === TileType.FEATURE) continue;
        if (y + 1 < ROWS && map.grid[i + COLS] !== TileType.FEATURE) continue;
        const px = x * TILE;
        const py = y * TILE + TILE;
        // Heights are a function of the absolute x so neighbouring tiles join into one rock band.
        const hAt = (gx) => 26 + 14 * Math.abs(Math.sin(gx * 1.7 + y * 3.1)) + 8 * Math.sin(gx * 0.43 + y);
        const g = ctx.createLinearGradient(0, py - 10, 0, py + 48);
        g.addColorStop(0, CLIFF);
        g.addColorStop(0.55, CLIFF_DARK);
        g.addColorStop(1, '#2a1d14');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(px - 8, py - 14);
        ctx.lineTo(px + TILE + 8, py - 14);
        ctx.lineTo(px + TILE + 8, py + hAt(x + 1.25) * 0.7);
        ctx.lineTo(px + TILE, py + hAt(x + 1));
        ctx.lineTo(px + TILE * 0.5, py + hAt(x + 0.5) * 1.15);
        ctx.lineTo(px, py + hAt(x));
        ctx.lineTo(px - 8, py + hAt(x - 0.25) * 0.7);
        ctx.closePath();
        ctx.fill();
      }
    }
    ctx.restore();
  },

  paintDecor(ctx, d, rng, map) {
    const r = d.r;
    switch (d.kind) {
      case 'cloudTree': {
        dropShadow(ctx, d.x + r * 0.3, d.y + r * 0.4, r * 0.9, r * 0.55, 0.25);
        ctx.fillStyle = '#6b4a30';
        ctx.fillRect(d.x - r * 0.1, d.y - r * 0.1, r * 0.2, r * 0.5);
        const cols = ['#3f8f4a', '#5fb35a', '#8fd877'];
        for (let l = 0; l < 3; l++) {
          ctx.fillStyle = cols[l];
          for (let i = 0; i < 5; i++) {
            const a = (i / 5) * TAU + d.seed * 4;
            circle(ctx, d.x + Math.cos(a) * r * 0.35 * (1 - l * 0.3) - l * 2, d.y - r * 0.2 + Math.sin(a) * r * 0.3 * (1 - l * 0.3) - l * 3, r * (0.42 - l * 0.08));
            ctx.fill();
          }
        }
        if (d.seed > 0.6) {
          ctx.fillStyle = '#ffd1e8';
          for (let i = 0; i < 5; i++) {
            circle(ctx, d.x + Math.cos(i * 1.9 + d.seed * 9) * r * 0.45, d.y - r * 0.25 + Math.sin(i * 1.9) * r * 0.35, 1.8);
            ctx.fill();
          }
        }
        break;
      }
      case 'skyShrine': {
        // Landmark: a ring of weathered pillars on a stone dais around an old bell.
        dropShadow(ctx, d.x + r * 0.2, d.y + r * 0.3, r * 1.15, r * 0.8, 0.28);
        ctx.fillStyle = '#c9c2ad';
        ctx.strokeStyle = '#6d6553';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * TAU + Math.PI / 8;
          ctx.lineTo(d.x + Math.cos(a) * r, d.y + Math.sin(a) * r);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#ddd7c4';
        circle(ctx, d.x, d.y, r * 0.62);
        ctx.fill();
        ctx.strokeStyle = '#a39a82';
        ctx.lineWidth = 1;
        ctx.stroke();
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * TAU;
          const px = d.x + Math.cos(a) * r * 0.82;
          const py = d.y + Math.sin(a) * r * 0.82;
          dropShadow(ctx, px + 2, py + 3, 4, 2.5, 0.3);
          ctx.fillStyle = '#e6e0cd';
          ctx.strokeStyle = '#6d6553';
          circle(ctx, px, py, 3.6);
          ctx.fill();
          ctx.stroke();
        }
        // bronze bell, seen from above
        ctx.fillStyle = '#9a7a3e';
        ctx.strokeStyle = '#4e3a18';
        circle(ctx, d.x, d.y, r * 0.22);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#c4a061';
        circle(ctx, d.x - r * 0.06, d.y - r * 0.06, r * 0.1);
        ctx.fill();
        break;
      }
      case 'shrine': {
        dropShadow(ctx, d.x + 3, d.y + 5, r, r * 0.6, 0.3);
        ctx.fillStyle = '#e8e2d0';
        circle(ctx, d.x, d.y, r * 0.85);
        ctx.fill();
        ctx.strokeStyle = '#b8ad8f';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = '#9fe8ff';
        circle(ctx, d.x, d.y, r * 0.3);
        ctx.fill();
        break;
      }
      case 'waterfall': {
        // a small spring pool on the lip of the cliff
        const x = d.tiles[0].x * TILE + TILE / 2;
        const y = d.tiles[0].y * TILE + TILE * 0.55;
        ctx.fillStyle = '#4fb3e8';
        ctx.beginPath();
        ctx.ellipse(x, y, 9, 6, 0, 0, TAU);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.beginPath();
        ctx.ellipse(x - 2, y - 2, 4, 2, 0, 0, TAU);
        ctx.fill();
        void map;
        void rng;
        break;
      }
      default:
    }
  },

  createAmbient(map, rng, scene) {
    let sky = null;
    const buildSky = () => {
      sky = makeCanvas(WORLD_W / 2, WORLD_H / 2);
      const c = sky.getContext('2d');
      const g = c.createLinearGradient(0, 0, 0, sky.height);
      g.addColorStop(0, '#4f97de');
      g.addColorStop(0.6, '#9fd0f5');
      g.addColorStop(1, '#e3f3ff');
      c.fillStyle = g;
      c.fillRect(0, 0, sky.width, sky.height);
      const sun = c.createRadialGradient(sky.width * 0.8, sky.height * 0.1, 0, sky.width * 0.8, sky.height * 0.1, sky.width * 0.4);
      sun.addColorStop(0, 'rgba(255,250,220,0.8)');
      sun.addColorStop(1, 'rgba(255,250,220,0)');
      c.fillStyle = sun;
      c.fillRect(0, 0, sky.width, sky.height);
    };
    const clouds = Array.from({ length: 10 }, (_, i) => ({
      x: rng.float(-200, WORLD_W), y: rng.float(0, WORLD_H), sp: rng.float(5, 14), scale: rng.float(0.6, 1.4), depth: i < 5 ? 0.5 : 1,
      puffs: Array.from({ length: 6 }, () => ({ dx: rng.float(-60, 60), dy: rng.float(-14, 14), r: rng.float(26, 50) })),
    }));
    const distant = Array.from({ length: 4 }, () => ({ x: rng.float(0, WORLD_W), y: rng.float(40, WORLD_H - 40), r: rng.float(18, 40), ph: rng.float(0, TAU) }));
    const rocks = map.decor.filter((d) => d.kind === 'floatingRock');
    const falls = map.decor.filter((d) => d.kind === 'waterfall').map((d) => {
      const tx = d.tiles[0].x;
      let ty = d.tiles[0].y + 1;
      let len = 0;
      while (ty < ROWS && isType(map, tx, ty, TileType.FEATURE)) { ty++; len++; }
      return { x: tx * TILE + TILE / 2, y: d.tiles[0].y * TILE + TILE, len: Math.max(1.2, len) * TILE + 30, ph: rng.float(0, TAU) };
    });

    return {
      update(dt) {
        for (const c of clouds) {
          c.x += c.sp * c.depth * dt;
          if (c.x - 120 > WORLD_W) { c.x = -160; c.y = Math.random() * WORLD_H; }
        }
      },
      drawBackground(ctx, t) {
        if (!sky) buildSky();
        ctx.drawImage(sky, 0, 0, WORLD_W, WORLD_H);
        for (const di of distant) {
          const y = di.y + Math.sin(t * 0.3 + di.ph) * 4;
          ctx.fillStyle = 'rgba(110,140,170,0.35)';
          ctx.beginPath();
          ctx.ellipse(di.x, y, di.r * 1.6, di.r * 0.5, 0, 0, Math.PI);
          ctx.lineTo(di.x, y + di.r * 1.3);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = 'rgba(150,190,150,0.35)';
          ctx.beginPath();
          ctx.ellipse(di.x, y, di.r * 1.6, di.r * 0.4, 0, 0, TAU);
          ctx.fill();
        }
        for (const c of clouds) {
          for (const p of c.puffs) drawGlow(ctx, '#ffffff', c.x + p.dx * c.scale, c.y + p.dy * c.scale, p.r * c.scale, c.depth === 1 ? 0.75 : 0.45, 0.8);
        }
      },
      drawUnder(ctx, t) {
        for (const f of falls) {
          const w = 10;
          const g = ctx.createLinearGradient(0, f.y, 0, f.y + f.len);
          g.addColorStop(0, 'rgba(120,200,255,0.95)');
          g.addColorStop(1, 'rgba(220,245,255,0)');
          ctx.fillStyle = g;
          ctx.fillRect(f.x - w / 2, f.y - 4, w, f.len);
          ctx.strokeStyle = 'rgba(255,255,255,0.75)';
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          for (let k = 0; k < 4; k++) {
            const off = ((t * 70 + k * 23 + f.ph * 20) % f.len);
            ctx.moveTo(f.x - 3 + k * 2, f.y + off);
            ctx.lineTo(f.x - 3 + k * 2, f.y + off + 10);
          }
          ctx.stroke();
          for (let k = 0; k < 3; k++) drawGlow(ctx, '#ffffff', f.x + Math.sin(t * 2 + k * 2 + f.ph) * 8, f.y + f.len * 0.85, 12, 0.3);
        }
        for (const r of rocks) {
          const y = r.y + Math.sin(t * 0.9 + r.seed * 10) * 4;
          const s = r.r;
          ctx.fillStyle = 'rgba(0,0,0,0.12)';
          ctx.beginPath();
          ctx.ellipse(r.x, r.y + 14, s * 0.9, s * 0.3, 0, 0, TAU);
          ctx.fill();
          ctx.fillStyle = CLIFF_DARK;
          ctx.beginPath();
          ctx.moveTo(r.x - s, y);
          ctx.lineTo(r.x + s, y);
          ctx.lineTo(r.x, y + s * 1.6);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = '#7fc85e';
          ctx.beginPath();
          ctx.ellipse(r.x, y, s, s * 0.42, 0, 0, TAU);
          ctx.fill();
        }
      },
      drawOver() {},
    };
  },
};

