// Organic shapes for terrain: scalar fields sampled on a sub-tile grid and
// turned into filled regions / outlines with marching squares.
//
//   featureField – water/lava/ice/void: tile occupancy, blurred, plus noise,
//                  so shores follow the tiles but wander naturally.
//   roadField    – the road: distance from the route's centre line, plus a
//                  little noise, so verges are irregular instead of ruler-made.
//   isoFill / isoLines – Path2D of everything above a level, or its outline.
//
// Fields are computed once per map and cached on it.

import { TILE, COLS, ROWS } from '../config.js';
import { TileType, tileIndex } from './mapGenerator.js';
import { createNoise2D, fbm, createRng } from '../core/rng.js';

const RES = 4; // samples per tile edge (8 px at TILE = 32)

function grid() {
  const w = COLS * RES;
  const h = ROWS * RES;
  return { w, h, s: TILE / RES, data: new Float32Array((w + 1) * (h + 1)) };
}

function boxBlur(f, r) {
  if (r <= 0) return;
  const { w, h, data } = f;
  const W = w + 1;
  const H = h + 1;
  const tmp = new Float32Array(data.length);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      let s = 0;
      let n = 0;
      for (let k = -r; k <= r; k++) {
        const xx = Math.min(W - 1, Math.max(0, x + k));
        s += data[y * W + xx];
        n++;
      }
      tmp[y * W + x] = s / n;
    }
  }
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      let s = 0;
      let n = 0;
      for (let k = -r; k <= r; k++) {
        const yy = Math.min(H - 1, Math.max(0, y + k));
        s += tmp[yy * W + x];
        n++;
      }
      data[y * W + x] = s / n;
    }
  }
}

/** Blurred occupancy of `type` tiles with a noisy edge. 1 inside, 0 outside, 0.5 ≈ the tile border. */
export function featureField(map, type = TileType.FEATURE, { amp = 0.14, blur = 3 } = {}) {
  const key = `_ff${type}`;
  if (map[key]) return map[key];
  const f = grid();
  const W = f.w + 1;
  for (let y = 0; y <= f.h; y++) {
    for (let x = 0; x <= f.w; x++) {
      // sample at the cell centre nearest this corner (clamped at the map edge)
      const tx = Math.min(COLS - 1, Math.max(0, Math.floor((x - 0.5) / RES)));
      const ty = Math.min(ROWS - 1, Math.max(0, Math.floor((y - 0.5) / RES)));
      f.data[y * W + x] = map.grid[tileIndex(tx, ty)] === type ? 1 : 0;
    }
  }
  boxBlur(f, Math.floor(blur / 2));
  boxBlur(f, Math.ceil(blur / 2));
  const noise = createNoise2D(createRng(map.seed ^ 0x6a09e667).int(0, 1e9));
  for (let y = 0; y <= f.h; y++) {
    for (let x = 0; x <= f.w; x++) {
      const i = y * W + x;
      const v = f.data[i];
      if (v > 0.02 && v < 0.98) f.data[i] = v + amp * (fbm(noise, x * 0.09, y * 0.09, 3) - 0.5) * 2;
    }
  }
  map[key] = f;
  return f;
}

function segDist2(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const l2 = dx * dx + dy * dy || 1;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / l2));
  const qx = ax + dx * t - px;
  const qy = ay + dy * t - py;
  return qx * qx + qy * qy;
}

/**
 * Road field: value = 1 − distance / TILE (so the level for a half-width w
 * is 1 − w / TILE) with a slow wobble, cached on the map.
 */
export function roadField(map, { amp = 0.07 } = {}) {
  if (map._rf) return map._rf;
  const f = grid();
  const W = f.w + 1;
  const segs = [];
  for (const r of map.routes) {
    const pts = r.drawPoints;
    for (let i = 0; i + 1 < pts.length; i++) segs.push([pts[i].x, pts[i].y, pts[i + 1].x, pts[i + 1].y]);
  }
  const noise = createNoise2D(createRng(map.seed ^ 0x3c6ef372).int(0, 1e9));
  const reach = (TILE * 1.6) ** 2;
  for (let y = 0; y <= f.h; y++) {
    for (let x = 0; x <= f.w; x++) {
      const px = x * f.s;
      const py = y * f.s;
      let d2 = Infinity;
      for (const s of segs) {
        // cheap reject on the segment's bounding box
        if (px < Math.min(s[0], s[2]) - TILE * 1.6 || px > Math.max(s[0], s[2]) + TILE * 1.6) continue;
        if (py < Math.min(s[1], s[3]) - TILE * 1.6 || py > Math.max(s[1], s[3]) + TILE * 1.6) continue;
        const dd = segDist2(px, py, s[0], s[1], s[2], s[3]);
        if (dd < d2) d2 = dd;
      }
      const d = d2 > reach ? TILE * 1.6 : Math.sqrt(d2);
      f.data[y * W + x] = 1 - d / TILE + amp * (fbm(noise, x * 0.12, y * 0.12, 2) - 0.5) * 2;
    }
  }
  map._rf = f;
  return f;
}

/** Level of the road field at a given half-width in px. */
export const roadLevel = (halfWidth) => 1 - halfWidth / TILE;

// ---------------------------------------------------------------- marching squares

const lerp = (a, b, lv) => (a === b ? 0.5 : (lv - a) / (b - a));

/** Filled region where field ≥ level, as one Path2D (no seams between cells). */
export function isoFill(f, level, dx = 0, dy = 0) {
  const path = new Path2D();
  const { w, h, s, data } = f;
  const W = w + 1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const a = data[y * W + x];
      const b = data[y * W + x + 1];
      const c = data[(y + 1) * W + x + 1];
      const d = data[(y + 1) * W + x];
      const ia = a >= level;
      const ib = b >= level;
      const ic = c >= level;
      const id = d >= level;
      if (!ia && !ib && !ic && !id) continue;
      const X = x * s + dx;
      const Y = y * s + dy;
      if (ia && ib && ic && id) {
        path.rect(X, Y, s, s);
        continue;
      }
      // walk corners and edges clockwise: tl, top, tr, right, br, bottom, bl, left
      const pts = [];
      if (ia) pts.push(X, Y);
      if (ia !== ib) pts.push(X + s * lerp(a, b, level), Y);
      if (ib) pts.push(X + s, Y);
      if (ib !== ic) pts.push(X + s, Y + s * lerp(b, c, level));
      if (ic) pts.push(X + s, Y + s);
      if (ic !== id) pts.push(X + s * (1 - lerp(c, d, level)), Y + s);
      if (id) pts.push(X, Y + s);
      if (id !== ia) pts.push(X, Y + s * (1 - lerp(d, a, level)));
      path.moveTo(pts[0], pts[1]);
      for (let i = 2; i < pts.length; i += 2) path.lineTo(pts[i], pts[i + 1]);
      path.closePath();
    }
  }
  return path;
}

/** Outline of the region where field ≥ level (for shorelines, rims, highlights). */
export function isoLines(f, level, dx = 0, dy = 0) {
  const path = new Path2D();
  const { w, h, s, data } = f;
  const W = w + 1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const a = data[y * W + x];
      const b = data[y * W + x + 1];
      const c = data[(y + 1) * W + x + 1];
      const d = data[(y + 1) * W + x];
      const X = x * s + dx;
      const Y = y * s + dy;
      const pts = [];
      if (a >= level !== b >= level) pts.push([X + s * lerp(a, b, level), Y]);
      if (b >= level !== c >= level) pts.push([X + s, Y + s * lerp(b, c, level)]);
      if (c >= level !== d >= level) pts.push([X + s * (1 - lerp(c, d, level)), Y + s]);
      if (d >= level !== a >= level) pts.push([X, Y + s * (1 - lerp(d, a, level))]);
      for (let i = 0; i + 1 < pts.length; i += 2) {
        path.moveTo(pts[i][0], pts[i][1]);
        path.lineTo(pts[i + 1][0], pts[i + 1][1]);
      }
    }
  }
  return path;
}

/** Field value at a world position (bilinear). */
export function sampleField(f, px, py) {
  const gx = Math.min(f.w - 1e-6, Math.max(0, px / f.s));
  const gy = Math.min(f.h - 1e-6, Math.max(0, py / f.s));
  const x = Math.floor(gx);
  const y = Math.floor(gy);
  const tx = gx - x;
  const ty = gy - y;
  const W = f.w + 1;
  const d = f.data;
  const top = d[y * W + x] * (1 - tx) + d[y * W + x + 1] * tx;
  const bot = d[(y + 1) * W + x] * (1 - tx) + d[(y + 1) * W + x + 1] * tx;
  return top * (1 - ty) + bot * ty;
}

/** Walks the outline at `level`, calling fn(x, y, nx, ny) roughly every `step` px (nx, ny points outward). */
export function alongEdge(f, level, step, fn) {
  const { w, h, s, data } = f;
  const W = w + 1;
  let acc = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const a = data[y * W + x];
      const b = data[y * W + x + 1];
      const d = data[(y + 1) * W + x];
      const crossX = a >= level !== b >= level;
      const crossY = a >= level !== d >= level;
      if (!crossX && !crossY) continue;
      acc += s;
      if (acc < step) continue;
      acc = 0;
      const px = crossX ? x * s + s * lerp(a, b, level) : x * s;
      const py = crossX ? y * s : y * s + s * lerp(a, d, level);
      // gradient points uphill (inside); outward normal is its opposite
      const gx = (sampleField(f, px + 2, py) - sampleField(f, px - 2, py));
      const gy = (sampleField(f, px, py + 2) - sampleField(f, px, py - 2));
      const len = Math.hypot(gx, gy) || 1;
      fn(px, py, -gx / len, -gy / len);
    }
  }
}
