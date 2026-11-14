// Shared terrain painters used by every biome. Biomes supply palettes and
// override/extend individual steps. All of this paints the *static* terrain
// layer once per map (cached to an offscreen canvas).

import { TILE, COLS, ROWS, WORLD_W, WORLD_H } from '../config.js';
import { TileType, tileIndex, inBounds } from './mapGenerator.js';
import { rgba, shade } from '../core/color.js';
import { createNoise2D, fbm } from '../core/rng.js';
import { circle, roundedPolyline, makeCanvas } from '../render/canvas.js';
import { VIGNETTES, VIGNETTE_SCALE } from './vignettes.js';
import { featureField, roadField, roadLevel, isoFill, isoLines, sampleField, alongEdge } from './contour.js';

export const tc = (t) => t * TILE + TILE / 2;

export function softBlob(ctx, x, y, r, color, alpha) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, rgba(color, alpha));
  g.addColorStop(1, rgba(color, 0));
  ctx.fillStyle = g;
  circle(ctx, x, y, r);
  ctx.fill();
}

export function isType(map, x, y, type) {
  return inBounds(x, y) && map.grid[tileIndex(x, y)] === type;
}

/**
 * Points used to paint feature shapes: every feature tile plus the midpoint
 * between each pair of touching feature tiles. Filling circles at both gives
 * smooth, organic outlines instead of a scalloped chain of tile circles.
 * Coordinates are in (fractional) tile units.
 */
export function blobPoints(map) {
  if (map._blobPoints) return map._blobPoints;
  const out = [...map.featureTiles];
  for (const t of map.featureTiles) {
    for (const [dx, dy] of [[1, 0], [0, 1], [1, 1], [-1, 1]]) {
      if (isType(map, t.x + dx, t.y + dy, TileType.FEATURE)) out.push({ x: t.x + dx / 2, y: t.y + dy / 2, mid: true, a: t, b: { x: t.x + dx, y: t.y + dy } });
    }
  }
  map._blobPoints = out;
  return out;
}

/** True when all 8 neighbours are feature tiles (used for the deep centre of pools). */
export function isInterior(map, t) {
  if (t.mid) return isInterior(map, t.a) && isInterior(map, t.b);
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (!isType(map, t.x + dx, t.y + dy, TileType.FEATURE)) return false;
  return true;
}

export function forEachTile(map, type, fn) {
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) if (map.grid[tileIndex(x, y)] === type) fn(x, y);
}

/** Random point on a tile matching predicate (by tile type list), for scattering details. */
export function scatter(map, rng, count, types, fn) {
  for (let n = 0; n < count; n++) {
    const x = rng.int(0, COLS - 1);
    const y = rng.int(0, ROWS - 1);
    if (!types.includes(map.grid[tileIndex(x, y)])) continue;
    fn(x * TILE + rng.float(2, TILE - 2), y * TILE + rng.float(2, TILE - 2), x, y);
  }
}

/**
 * Rejection-sampled scatter: detail density follows weight(px, py) in [0, 1],
 * so grass, pebbles and flowers gather in natural patches instead of an even dusting.
 */
export function scatterWeighted(map, rng, count, types, weight, fn) {
  for (let n = 0; n < count; n++) {
    const px = rng.float(0, WORLD_W);
    const py = rng.float(0, WORLD_H);
    const x = Math.floor(px / TILE);
    const y = Math.floor(py / TILE);
    if (!types.includes(map.grid[tileIndex(x, y)])) continue;
    if (rng.next() > weight(px, py)) continue;
    fn(px, py, x, y);
  }
}

/**
 * Natural ground: a low-frequency noise field mapped onto the biome's ground
 * ramp, drawn at low resolution and smoothly upscaled, plus finer mottling
 * and grain. No two patches of ground repeat.
 */
export function paintGroundBase(ctx, map, pal, rng, noise) {
  const ramp = pal.groundRamp ?? [shade(pal.ground, -0.12), pal.ground, shade(pal.ground, 0.1)];
  const W = COLS * 3;
  const H = ROWS * 3;
  const c = makeCanvas(W, H);
  const g = c.getContext('2d');
  const img = g.createImageData(W, H);
  const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const cols = ramp.map(hex);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const v = Math.min(0.999, Math.max(0, (fbm(noise, x * 0.045, y * 0.045, 4) - 0.25) * 2));
      const f = v * (cols.length - 1);
      const i0 = Math.floor(f);
      const t = f - i0;
      const a = cols[i0];
      const b = cols[Math.min(cols.length - 1, i0 + 1)];
      const o = (y * W + x) * 4;
      img.data[o] = a[0] + (b[0] - a[0]) * t;
      img.data[o + 1] = a[1] + (b[1] - a[1]) * t;
      img.data[o + 2] = a[2] + (b[2] - a[2]) * t;
      img.data[o + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(c, 0, 0, WORLD_W, WORLD_H);
  ctx.restore();
  const fine = createNoise2D(rng.int(0, 1e9));
  for (let i = 0; i < 900; i++) {
    const x = rng.float(0, WORLD_W);
    const y = rng.float(0, WORLD_H);
    const v = fine(x * 0.05, y * 0.05);
    softBlob(ctx, x, y, rng.float(6, 16), v > 0.5 ? shade(pal.ground, 0.14) : shade(pal.ground, -0.18), 0.12 + Math.abs(v - 0.5) * 0.25);
  }
  for (let i = 0; i < 2200; i++) {
    ctx.fillStyle = rgba(rng.chance(0.5) ? '#ffffff' : '#000000', rng.float(0.025, 0.06));
    ctx.fillRect(rng.float(0, WORLD_W), rng.float(0, WORLD_H), rng.float(1, 2), rng.float(1, 2));
  }
  paintRelief(ctx, map, pal, noise, map.reliefStrength ?? 1);
}

/**
 * Relief: a height field (rolling noise, the road cut into the ground, pools
 * sitting in hollows) lit from the top-left like the rest of the scene. Gives
 * the ground real slopes and banks instead of a flat colour wash.
 */
export function paintRelief(ctx, map, pal, noise, strength = 1) {
  const W = COLS * 4;
  const H = ROWS * 4;
  const rf = roadField(map);
  const ff = map.featureTiles.length ? featureField(map) : null;
  const h = new Float32Array((W + 2) * (H + 2));
  for (let y = 0; y < H + 2; y++) {
    for (let x = 0; x < W + 2; x++) {
      const px = (x - 0.5) * 8;
      const py = (y - 0.5) * 8;
      let v = fbm(noise, px * 0.0036 + 13, py * 0.0036 + 29, 4) * 1.4;
      const road = Math.max(0, sampleField(rf, px, py) + 0.15);
      v -= 0.16 * Math.min(1, road * road);
      if (ff) v -= 0.22 * Math.min(1, Math.max(0, sampleField(ff, px, py)));
      h[y * (W + 2) + x] = v;
    }
  }
  const c = makeCanvas(W, H);
  const g = c.getContext('2d');
  const img = g.createImageData(W, H);
  const sh = pal.shadow ? [parseInt(pal.shadow.slice(1, 3), 16), parseInt(pal.shadow.slice(3, 5), 16), parseInt(pal.shadow.slice(5, 7), 16)] : [10, 8, 14];
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y + 1) * (W + 2) + x + 1;
      const gx = h[i + 1] - h[i - 1];
      const gy = h[i + W + 2] - h[i - W - 2];
      // facing the top-left light = brighter; facing away = shadowed
      const s = (gx + gy) * 9 * strength;
      const o = (y * W + x) * 4;
      if (s > 0) {
        img.data[o] = 255;
        img.data[o + 1] = 250;
        img.data[o + 2] = 235;
        img.data[o + 3] = Math.min(40, s * 40);
      } else {
        img.data[o] = sh[0];
        img.data[o + 1] = sh[1];
        img.data[o + 2] = sh[2];
        img.data[o + 3] = Math.min(60, -s * 60);
      }
    }
  }
  g.putImageData(img, 0, 0);
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(c, 0, 0, WORLD_W, WORLD_H);
  ctx.restore();
}

/**
 * Feature shapes (water, lava, ice…) as nested contour bands of one noisy
 * field: a damp/scorched margin, the bank, the surface, the deep middle and a
 * thin shoreline highlight. Biomes pass their own band colours.
 */
export function paintFeatureLayers(ctx, map, layers) {
  if (!map.featureTiles.length) return;
  const f = featureField(map);
  for (const L of layers) {
    if (L.stroke) {
      ctx.strokeStyle = L.stroke;
      ctx.lineWidth = L.width ?? 1;
      ctx.lineCap = 'round';
      ctx.stroke(isoLines(f, L.level, L.dx ?? 0, L.dy ?? 0));
    } else {
      ctx.fillStyle = L.color;
      ctx.fill(isoFill(f, L.level, L.dx ?? 0, L.dy ?? 0));
    }
  }
}

export function paintFeatureBlobs(ctx, map, pal) {
  paintFeatureLayers(ctx, map, [
    { level: 0.3, color: rgba(pal.shadow ?? '#000000', 0.16), dy: 3 },
    { level: 0.36, color: rgba(pal.featureEdge, 0.45) },
    { level: 0.42, color: pal.featureEdge },
    { level: 0.52, color: pal.feature },
    { level: 0.82, color: pal.featureDeep },
    { level: 0.52, stroke: rgba(pal.featureShine ?? '#ffffff', 0.35), width: 1, dy: 1.5 },
  ]);
}

/** Clip path of the feature surface (water shimmer, lava glow…). */
export function featurePath(map) {
  return map.featureTiles.length ? isoFill(featureField(map), 0.5) : new Path2D();
}

/**
 * The road: one noisy distance field gives irregular verges, a darker
 * shoulder, the worn surface and a lighter crown; wheel ruts follow the
 * route. Biomes can turn ruts off (rails, paving).
 */
export function paintPath(ctx, map, pal, { ruts = true } = {}) {
  const f = roadField(map);
  const fill = (half, color, dy = 0) => {
    ctx.fillStyle = color;
    ctx.fill(isoFill(f, roadLevel(half), 0, dy));
  };
  fill(TILE * 0.62, rgba(pal.shadow ?? '#140e18', 0.16), 2.5);
  fill(TILE * 0.54, pal.pathEdge);
  fill(TILE * 0.46, pal.path);
  fill(TILE * 0.14, rgba(pal.pathCenter, 0.2));
  if (!ruts) return;
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  for (const route of map.routes) {
    const pts = route.drawPoints;
    for (const off of [-TILE * 0.2, TILE * 0.2]) {
      const o = offsetLine(pts, off);
      ctx.strokeStyle = rgba(shade(pal.path, -0.4), 0.32);
      ctx.lineWidth = 2.2;
      ctx.setLineDash([22, 5, 11, 7]);
      roundedPolyline(ctx, o, TILE * 0.45);
      ctx.stroke();
      ctx.strokeStyle = rgba(shade(pal.path, 0.25), 0.25);
      ctx.lineWidth = 0.8;
      ctx.translate(0, 1.2);
      roundedPolyline(ctx, o, TILE * 0.45);
      ctx.stroke();
      ctx.translate(0, -1.2);
    }
  }
  ctx.setLineDash([]);
  ctx.restore();
}

function offsetLine(pts, off) {
  return pts.map((p, i) => {
    const q = pts[Math.min(pts.length - 1, i + 1)];
    const r = pts[Math.max(0, i - 1)];
    const dx = q.x - r.x;
    const dy = q.y - r.y;
    const len = Math.hypot(dx, dy) || 1;
    return { x: p.x - (dy / len) * off, y: p.y + (dx / len) * off };
  });
}

/**
 * Where ground meets road: little tufts/lumps of the surrounding ground
 * spill over the verge so the two materials interlock instead of meeting at
 * a clean cut.
 */
export function paintPathWear(ctx, map, pal, rng, colors = null) {
  const f = roadField(map);
  const cols = colors ?? [shade(pal.ground, -0.18), shade(pal.ground, -0.06), shade(pal.ground, 0.08)];
  alongEdge(f, roadLevel(TILE * 0.54), 5, (x, y, nx, ny) => {
    if (rng.next() < 0.35) return;
    const tx = Math.floor(x / TILE);
    const ty = Math.floor(y / TILE);
    if (map.bridge[tileIndex(Math.min(COLS - 1, Math.max(0, tx)), Math.min(ROWS - 1, Math.max(0, ty)))]) return;
    const n = rng.int(1, 3);
    for (let k = 0; k < n; k++) {
      const sx = x + (rng.next() - 0.5) * 5 - nx * rng.float(0, 2.5);
      const sy = y + (rng.next() - 0.5) * 5 - ny * rng.float(0, 2.5);
      ctx.fillStyle = rng.pick(cols);
      ctx.beginPath();
      ctx.ellipse(sx, sy, rng.float(1.2, 2.8), rng.float(0.9, 1.8), rng.float(0, Math.PI), 0, Math.PI * 2);
      ctx.fill();
    }
  });
}

export function paintPathGrain(ctx, map, pal, rng, density = 7) {
  for (const route of map.routes) {
    for (const t of route.tiles) {
      for (let k = 0; k < density; k++) {
        const x = t.x * TILE + rng.float(4, TILE - 4);
        const y = t.y * TILE + rng.float(4, TILE - 4);
        ctx.fillStyle = rgba(rng.chance(0.5) ? shade(pal.path, -0.3) : shade(pal.path, 0.25), rng.float(0.25, 0.6));
        circle(ctx, x, y, rng.float(0.8, 2.2));
        ctx.fill();
      }
    }
  }
}

/** Direction of the road through a path tile: 'h', 'v' or 'corner'. */
export function pathAxis(map, x, y) {
  const h = isType(map, x - 1, y, TileType.PATH) || isType(map, x + 1, y, TileType.PATH);
  const v = isType(map, x, y - 1, TileType.PATH) || isType(map, x, y + 1, TileType.PATH);
  if (h && !v) return 'h';
  if (v && !h) return 'v';
  return x === 0 || x === COLS - 1 ? 'h' : 'v';
}

export function paintBridges(ctx, map, pal, style = 'wood') {
  forEachTile(map, TileType.PATH, (x, y) => {
    if (!map.bridge[tileIndex(x, y)]) return;
    const axis = pathAxis(map, x, y);
    ctx.save();
    ctx.translate(tc(x), tc(y));
    if (axis === 'v') ctx.rotate(Math.PI / 2);
    const w = TILE * 1.08;
    const h = TILE * 0.96;
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(-w / 2, -h / 2 + 4, w, h);
    if (style === 'stone') {
      ctx.fillStyle = pal.bridge;
      ctx.fillRect(-w / 2, -h / 2, w, h);
      ctx.strokeStyle = shade(pal.bridge, -0.35);
      ctx.lineWidth = 1;
      for (let i = 0; i < 3; i++) {
        ctx.strokeRect(-w / 2 + (i * w) / 3 + 1, -h / 2 + 1, w / 3 - 2, h / 2 - 2);
        ctx.strokeRect(-w / 2 + ((i + 0.5) * w) / 3 - w / 6 + 1, 1, w / 3 - 2, h / 2 - 2);
      }
    } else {
      const planks = 6;
      for (let i = 0; i < planks; i++) {
        ctx.fillStyle = i % 2 ? pal.bridge : shade(pal.bridge, 0.1);
        ctx.fillRect(-w / 2 + (i * w) / planks + 0.5, -h / 2, w / planks - 1, h);
      }
    }
    ctx.fillStyle = shade(pal.bridge, -0.45);
    ctx.fillRect(-w / 2, -h / 2 - 2, w, 4);
    ctx.fillRect(-w / 2, h / 2 - 2, w, 4);
    ctx.restore();
  });
}

export function paintObjectivePad(ctx, map, pal) {
  const { px, py } = map.goal;
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  circle(ctx, px, py + 4, TILE * 1.45);
  ctx.fill();
  const g = ctx.createRadialGradient(px, py, TILE * 0.3, px, py, TILE * 1.45);
  g.addColorStop(0, shade(pal.pad ?? pal.pathEdge, 0.35));
  g.addColorStop(1, shade(pal.pad ?? pal.pathEdge, -0.1));
  ctx.fillStyle = g;
  circle(ctx, px, py, TILE * 1.4);
  ctx.fill();
  ctx.strokeStyle = 'rgba(20,14,24,0.35)';
  ctx.lineWidth = 1.5;
  circle(ctx, px, py, TILE * 1.4);
  ctx.stroke();
  ctx.restore();
}

/**
 * Lighting & grade. Each realm has its own key light (position, colour,
 * strength), a colour grade multiplied over everything to bind the palette,
 * and a vignette. Grade/light use source-atop so transparent voids stay clear.
 */
export function paintLighting(ctx, pal, lighting = {}) {
  const L = { pos: { x: WORLD_W * 0.15, y: -WORLD_H * 0.1 }, strength: 0.14, vignette: 0.35, ...lighting };
  ctx.save();
  ctx.globalCompositeOperation = 'source-atop';
  if (L.grade) {
    // multiply, restricted to existing pixels via a temp canvas
    const g = makeCanvas(ctx.canvas.width, ctx.canvas.height);
    const gc = g.getContext('2d');
    gc.drawImage(ctx.canvas, 0, 0);
    gc.globalCompositeOperation = 'multiply';
    gc.fillStyle = L.grade;
    gc.fillRect(0, 0, g.width, g.height);
    gc.globalCompositeOperation = 'destination-in';
    gc.drawImage(ctx.canvas, 0, 0);
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    ctx.drawImage(g, 0, 0);
    ctx.restore();
  }
  const lg = ctx.createRadialGradient(L.pos.x, L.pos.y, 0, L.pos.x, L.pos.y, WORLD_W * 0.95);
  lg.addColorStop(0, rgba(pal.light, L.strength));
  lg.addColorStop(1, rgba(pal.light, 0));
  ctx.fillStyle = lg;
  ctx.fillRect(0, 0, WORLD_W, WORLD_H);
  const vg = ctx.createRadialGradient(WORLD_W / 2, WORLD_H / 2, WORLD_H * 0.5, WORLD_W / 2, WORLD_H / 2, WORLD_W * 0.72);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, rgba(pal.shadow ?? '#000000', L.vignette));
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, WORLD_W, WORLD_H);
  ctx.restore();
}

export function dropShadow(ctx, x, y, rx, ry, alpha = 0.3) {
  ctx.fillStyle = `rgba(0,0,0,${alpha})`;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
}

/** Full static terrain pass. Biome hooks are optional overrides. */
export function paintTerrain(ctx, map, biome, rng) {
  const pal = biome.palette;
  const noise = createNoise2D(rng.int(0, 1e9));
  // Detail density field shared by the biome's scatter passes (patches, not dustings).
  const density = (px, py) => Math.max(0, Math.min(1, (fbm(noise, px * 0.012 + 40, py * 0.012 + 40, 3) - 0.3) * 2.2));
  map.reliefStrength = biome.lighting?.relief ?? 1;
  paintGroundBase(ctx, map, pal, rng, noise);
  biome.paintGroundDetail?.(ctx, map, rng, density);
  (biome.paintFeatures ?? paintFeatureBlobs)(ctx, map, pal, rng);
  paintPath(ctx, map, pal, { ruts: biome.pathRuts !== false });
  (biome.paintPathDetail ?? ((c, m, r) => paintPathGrain(c, m, pal, r)))(ctx, map, rng);
  paintPathWear(ctx, map, pal, rng, biome.vergeColors);
  paintBridges(ctx, map, pal, biome.bridgeStyle);
  paintObjectivePad(ctx, map, pal);
  // set pieces have their own painters; swaying plants are drawn live by MapScene
  const sway = new Set(biome.swayKinds ?? []);
  for (const d of map.decor) {
    if (sway.has(d.kind)) continue;
    if (VIGNETTES[d.kind]) {
      ctx.save();
      ctx.translate(d.x, d.y);
      ctx.scale(VIGNETTE_SCALE, VIGNETTE_SCALE);
      ctx.translate(-d.x, -d.y);
      VIGNETTES[d.kind].paint(ctx, d, pal);
      ctx.restore();
    }
    else biome.paintDecor?.(ctx, d, rng, map);
  }
  paintLighting(ctx, pal, biome.lighting);
}
