// Shared terrain painters used by every biome. Biomes supply palettes and
// override/extend individual steps. All of this paints the *static* terrain
// layer once per map (cached to an offscreen canvas).

import { TILE, COLS, ROWS, WORLD_W, WORLD_H } from '../config.js';
import { TileType, tileIndex, inBounds } from './mapGenerator.js';
import { rgba, shade } from '../core/color.js';
import { circle, roundedPolyline } from '../render/canvas.js';

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

/** True when all 8 neighbours are feature tiles (used for the deep centre of pools). */
export function isInterior(map, t) {
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

export function paintGroundBase(ctx, map, pal, rng) {
  ctx.fillStyle = pal.ground;
  ctx.fillRect(0, 0, WORLD_W, WORLD_H);
  for (let i = 0; i < 150; i++) {
    softBlob(ctx, rng.float(-40, WORLD_W + 40), rng.float(-40, WORLD_H + 40), rng.float(30, 140), rng.pick(pal.groundVariants), rng.float(0.18, 0.45));
  }
  // Fine grain
  for (let i = 0; i < 2600; i++) {
    ctx.fillStyle = rgba(rng.chance(0.5) ? '#ffffff' : '#000000', rng.float(0.02, 0.06));
    ctx.fillRect(rng.float(0, WORLD_W), rng.float(0, WORLD_H), rng.float(1, 2.5), rng.float(1, 2.5));
  }
}

/** Organic union-of-circles painting for feature tiles (water, lava, ice…). */
export function paintFeatureBlobs(ctx, map, pal) {
  const tiles = map.featureTiles;
  if (!tiles.length) return;
  const pass = (r, color, filter, dy = 0) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    for (const t of tiles) {
      if (filter && !filter(t)) continue;
      ctx.moveTo(tc(t.x) + r, tc(t.y) + dy);
      ctx.arc(tc(t.x), tc(t.y) + dy, r, 0, Math.PI * 2);
    }
    ctx.fill();
  };
  pass(TILE * 0.9, rgba(pal.featureEdge, 0.35), null, 3);
  pass(TILE * 0.84, pal.featureEdge);
  pass(TILE * 0.7, pal.feature);
  pass(TILE * 0.78, pal.featureDeep, (t) => isInterior(map, t));
}

export function featurePath(map, r = TILE * 0.7) {
  const p = new Path2D();
  for (const t of map.featureTiles) {
    p.moveTo(tc(t.x) + r, tc(t.y));
    p.arc(tc(t.x), tc(t.y), r, 0, Math.PI * 2);
  }
  return p;
}

export function paintPath(ctx, map, pal) {
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'butt';
  const routes = map.routes.map((r) => r.drawPoints);
  const stroke = (width, color, dy = 0) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    for (const pts of routes) {
      ctx.save();
      ctx.translate(0, dy);
      roundedPolyline(ctx, pts, TILE * 0.55);
      ctx.stroke();
      ctx.restore();
    }
  };
  stroke(TILE * 1.12, 'rgba(0,0,0,0.28)', 4);
  stroke(TILE * 1.04, pal.pathEdge);
  stroke(TILE * 0.84, pal.path);
  stroke(TILE * 0.4, rgba(pal.pathCenter, 0.35));
  ctx.restore();
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
  softBlob(ctx, px, py, TILE * 2.6, pal.accent, 0.22);
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
  ctx.strokeStyle = rgba(pal.accent, 0.7);
  ctx.lineWidth = 2;
  circle(ctx, px, py, TILE * 1.28);
  ctx.stroke();
  ctx.setLineDash([4, 6]);
  circle(ctx, px, py, TILE * 1.05);
  ctx.stroke();
  ctx.restore();
}

/** Cohesive lighting pass: tinted key light + vignette. Uses source-atop so transparent areas stay clear. */
export function paintLighting(ctx, pal, lightPos = { x: WORLD_W * 0.3, y: WORLD_H * 0.2 }) {
  ctx.save();
  ctx.globalCompositeOperation = 'source-atop';
  const lg = ctx.createRadialGradient(lightPos.x, lightPos.y, 0, lightPos.x, lightPos.y, WORLD_W * 0.8);
  lg.addColorStop(0, rgba(pal.light, 0.16));
  lg.addColorStop(1, rgba(pal.light, 0));
  ctx.fillStyle = lg;
  ctx.fillRect(0, 0, WORLD_W, WORLD_H);
  const vg = ctx.createRadialGradient(WORLD_W / 2, WORLD_H / 2, WORLD_H * 0.45, WORLD_W / 2, WORLD_H / 2, WORLD_W * 0.72);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, rgba(pal.shadow ?? '#000000', 0.42));
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
  paintGroundBase(ctx, map, pal, rng);
  biome.paintGroundDetail?.(ctx, map, rng);
  (biome.paintFeatures ?? paintFeatureBlobs)(ctx, map, pal, rng);
  paintPath(ctx, map, pal);
  (biome.paintPathDetail ?? ((c, m, r) => paintPathGrain(c, m, pal, r)))(ctx, map, rng);
  paintBridges(ctx, map, pal, biome.bridgeStyle);
  paintObjectivePad(ctx, map, pal);
  for (const d of map.decor) biome.paintDecor?.(ctx, d, rng, map);
  paintLighting(ctx, pal, biome.lightPos);
}
