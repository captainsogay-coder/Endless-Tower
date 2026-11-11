// Procedural map layouts. Pure data (no DOM) so it can be validated in tests.
//
// A map is generated in an abstract (a, b) space and then oriented/flipped onto
// the world grid. Layout styles:
//   meander    – one winding road, monotonic along its main axis (never self-crosses)
//   serpentine – long back-and-forth sweeps that coil across the map
//   converge   – a meander plus 1–2 side entrances that merge into the main road
// Every route is a contiguous chain of PATH tiles from a map edge to the objective.

import { COLS, ROWS, TILE } from '../config.js';
import { createRng, createNoise2D, fbm } from '../core/rng.js';

export const TileType = Object.freeze({ GROUND: 0, PATH: 1, FEATURE: 2, BLOCKED: 3, OBJECTIVE: 4 });
export const tileIndex = (x, y) => y * COLS + x;
export const inBounds = (x, y) => x >= 0 && y >= 0 && x < COLS && y < ROWS;

export const LAYOUT_LABELS = {
  meander: 'Winding Road',
  serpentine: 'Serpent Coil',
  converge: 'Converging Paths',
};

const keyOf = (a, b) => a * 1024 + b;
const cheb = (ax, ay, bx, by) => Math.max(Math.abs(ax - bx), Math.abs(ay - by));

function weightedKey(weights, rng) {
  const entries = Object.entries(weights).map(([id, weight]) => ({ id, weight }));
  return rng.weighted(entries).id;
}

// ---------------------------------------------------------------- layouts

function meanderLayout(rng, A, B) {
  const tiles = [];
  let a = 0;
  let b = rng.int(3, B - 4);
  const goalA = A - rng.int(4, 6);
  tiles.push({ a, b });
  while (a < goalA) {
    let na = Math.min(goalA, a + rng.int(3, 7));
    if (goalA - na < 3) na = goalA;
    for (let i = a + 1; i <= na; i++) tiles.push({ a: i, b });
    a = na;
    if (a >= goalA) break;
    let nb = b;
    for (let guard = 0; guard < 24 && Math.abs(nb - b) < 3; guard++) nb = rng.int(2, B - 3);
    if (Math.abs(nb - b) < 3) continue;
    const s = Math.sign(nb - b);
    for (let j = b + s; j !== nb + s; j += s) tiles.push({ a, b: j });
    b = nb;
  }
  return tiles;
}

function serpentineLayout(rng, A, B) {
  const sweeps = B >= 30 ? rng.int(5, 6) : rng.int(3, 4);
  const b0 = rng.int(2, 3);
  const bN = B - 3 - rng.int(0, 1);
  const bs = [];
  for (let i = 0; i < sweeps; i++) bs.push(Math.round(b0 + ((bN - b0) * i) / (sweeps - 1)));
  const tiles = [{ a: 0, b: bs[0] }];
  let a = 0;
  let dir = 1;
  for (let i = 0; i < sweeps; i++) {
    const b = bs[i];
    const last = i === sweeps - 1;
    const target = last
      ? dir > 0 ? A - rng.int(4, 8) : rng.int(3, 7)
      : dir > 0 ? A - rng.int(3, 6) : rng.int(2, 5);
    for (let k = a + dir; k !== target + dir; k += dir) tiles.push({ a: k, b });
    a = target;
    if (!last) {
      for (let j = b + 1; j <= bs[i + 1]; j++) tiles.push({ a, b: j });
      dir = -dir;
    }
  }
  return tiles;
}

/** Side roads that enter from the swing-axis edges and merge into a straight run of the main road. */
function convergeBranches(main, rng, B, count) {
  const mainSet = new Set(main.map((t) => keyOf(t.a, t.b)));
  const goal = main[main.length - 1];
  const candidates = [];
  for (let i = Math.floor(main.length * 0.2); i < Math.floor(main.length * 0.72); i++) {
    const p = main[i - 1];
    const t = main[i];
    const n = main[i + 1];
    if (p && n && p.b === t.b && n.b === t.b) candidates.push(i);
  }
  rng.shuffle(candidates);
  const branches = [];
  for (const i of candidates) {
    if (branches.length >= count) break;
    const j = main[i];
    if (Math.abs(j.a - goal.a) < 4) continue;
    if (branches.some((br) => Math.abs(br.joinA - j.a) < 5)) continue;
    for (const edgeB of rng.shuffle([0, B - 1])) {
      if (Math.abs(j.b - edgeB) < 3) continue;
      const s = Math.sign(j.b - edgeB);
      const tiles = [];
      let ok = true;
      for (let b = edgeB; b !== j.b; b += s) {
        if (mainSet.has(keyOf(j.a, b)) || mainSet.has(keyOf(j.a - 1, b)) || mainSet.has(keyOf(j.a + 1, b))) {
          ok = false;
          break;
        }
        tiles.push({ a: j.a, b });
      }
      if (!ok) continue;
      branches.push({ tiles, joinIndex: i, joinA: j.a });
      break;
    }
  }
  return branches;
}

// ---------------------------------------------------------------- helpers

function simplify(points) {
  if (points.length <= 2) return points.slice();
  const out = [points[0]];
  for (let i = 1; i < points.length - 1; i++) {
    const p = out[out.length - 1];
    const c = points[i];
    const n = points[i + 1];
    const d1x = Math.sign(c.x - p.x);
    const d1y = Math.sign(c.y - p.y);
    const d2x = Math.sign(n.x - c.x);
    const d2y = Math.sign(n.y - c.y);
    if (d1x !== d2x || d1y !== d2y) out.push(c);
  }
  out.push(points[points.length - 1]);
  return out;
}

function buildRoute(tiles, entrance, goal) {
  const centers = tiles.map((t) => ({ x: t.x * TILE + TILE / 2, y: t.y * TILE + TILE / 2 }));
  const spawn = { x: centers[0].x + entrance.dir.x * TILE * 1.6, y: centers[0].y + entrance.dir.y * TILE * 1.6 };
  const edge = { x: centers[0].x + entrance.dir.x * TILE * 0.5, y: centers[0].y + entrance.dir.y * TILE * 0.5 };
  centers[centers.length - 1] = { x: goal.px, y: goal.py };
  const points = simplify([spawn, ...centers]);
  const cum = [0];
  for (let i = 1; i < points.length; i++) {
    cum.push(cum[i - 1] + Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y));
  }
  return {
    tiles,
    points,
    cum,
    length: cum[cum.length - 1],
    drawPoints: simplify([edge, ...centers]),
  };
}

function edgeDirection(t) {
  if (t.x === 0) return { x: -1, y: 0 };
  if (t.x === COLS - 1) return { x: 1, y: 0 };
  if (t.y === 0) return { x: 0, y: -1 };
  if (t.y === ROWS - 1) return { x: 0, y: 1 };
  return null;
}

function computePathDistance(grid) {
  const dist = new Uint8Array(COLS * ROWS).fill(255);
  const queue = [];
  for (let i = 0; i < grid.length; i++) {
    if (grid[i] === TileType.PATH) {
      dist[i] = 0;
      queue.push(i);
    }
  }
  for (let h = 0; h < queue.length; h++) {
    const i = queue[h];
    const x = i % COLS;
    const y = (i / COLS) | 0;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx;
        const ny = y + dy;
        if (!inBounds(nx, ny)) continue;
        const ni = tileIndex(nx, ny);
        if (dist[ni] !== 255) continue;
        dist[ni] = Math.min(254, dist[i] + 1);
        queue.push(ni);
      }
    }
  }
  return dist;
}

// ---------------------------------------------------------------- features

function carveRivers(map, biome, rng) {
  const [minR, maxR] = biome.layout.rivers ?? [0, 0];
  const count = rng.int(minR, maxR);
  const { grid, bridge, goal, entrances } = map;
  for (let r = 0; r < count; r++) {
    let x0 = -1;
    for (let tries = 0; tries < 30; tries++) {
      const cand = rng.int(4, COLS - 6);
      if (Math.abs(cand - goal.x) < 6) continue;
      if (entrances.some((e) => (e.y === 0 || e.y === ROWS - 1) && Math.abs(e.x - cand) < 5)) continue;
      x0 = cand;
      break;
    }
    if (x0 < 0) continue;
    const width = rng.int(1, 2);
    const amp = rng.float(1.2, 3.5);
    const freq = rng.float(0.14, 0.3);
    const phase = rng.float(0, Math.PI * 2);
    const snapshot = grid.slice();
    const bridgeSnap = bridge.slice();
    let bridges = 0;
    let prev = null;
    for (let y = 0; y < ROWS; y++) {
      const cx = Math.round(x0 + Math.sin(y * freq + phase) * amp);
      const from = prev === null ? cx : Math.min(prev, cx);
      const to = prev === null ? cx : Math.max(prev, cx);
      for (let x = from; x <= to + width - 1; x++) {
        if (!inBounds(x, y)) continue;
        const i = tileIndex(x, y);
        if (grid[i] === TileType.PATH) {
          if (!bridge[i]) bridges++;
          bridge[i] = 1;
        } else if (grid[i] === TileType.GROUND && cheb(x, y, goal.x, goal.y) >= 3) {
          grid[i] = TileType.FEATURE;
        }
      }
      prev = cx;
    }
    // Rivers that run along the road instead of crossing it look wrong – undo them.
    if (bridges > 5) {
      grid.set(snapshot);
      bridge.set(bridgeSnap);
    }
  }
}

function placeFeatureBlobs(map, biome, rng, pathDist) {
  const L = biome.layout;
  const density = L.featureDensity ?? 0;
  if (density <= 0) return;
  const noise = createNoise2D(rng.int(0, 2 ** 30));
  const scale = L.noiseScale ?? 0.17;
  const edgeBias = L.edgeBias ?? 0;
  const { grid, goal, entrances } = map;
  const eligible = [];
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const i = tileIndex(x, y);
      if (grid[i] !== TileType.GROUND || pathDist[i] < 2) continue;
      if (cheb(x, y, goal.x, goal.y) < 3) continue;
      if (entrances.some((e) => cheb(x, y, e.x, e.y) < 3)) continue;
      const edge = Math.min(x, y, COLS - 1 - x, ROWS - 1 - y);
      const edgeness = 1 - Math.min(1, edge / 6);
      eligible.push({ i, v: fbm(noise, x * scale, y * scale, 3) + edgeBias * edgeness });
    }
  }
  eligible.sort((p, q) => q.v - p.v);
  const target = Math.min(eligible.length, Math.round(density * COLS * ROWS));
  for (let k = 0; k < target; k++) grid[eligible[k].i] = TileType.FEATURE;
  // Remove isolated single tiles – they read as noise rather than terrain.
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const i = tileIndex(x, y);
      if (grid[i] !== TileType.FEATURE) continue;
      let n = 0;
      if (x > 0 && grid[i - 1] === TileType.FEATURE) n++;
      if (x < COLS - 1 && grid[i + 1] === TileType.FEATURE) n++;
      if (y > 0 && grid[i - COLS] === TileType.FEATURE) n++;
      if (y < ROWS - 1 && grid[i + COLS] === TileType.FEATURE) n++;
      if (n === 0) grid[i] = TileType.GROUND;
    }
  }
}

function maxRadiusFromPath(map, cx, cy) {
  let best = Infinity;
  for (const route of map.routes) {
    for (const t of route.tiles) {
      const d = Math.hypot(t.x * TILE + TILE / 2 - cx, t.y * TILE + TILE / 2 - cy) - TILE * 0.62;
      if (d < best) best = d;
    }
  }
  const gx = map.goal.px - cx;
  const gy = map.goal.py - cy;
  return Math.max(6, Math.min(best, Math.hypot(gx, gy) - TILE * 1.6));
}

function placeDecor(map, biome, rng, pathDist) {
  const { grid, goal, entrances } = map;
  for (const spec of biome.decor ?? []) {
    const count = rng.int(spec.count[0], spec.count[1]);
    const fp = spec.fp ?? 1;
    const minPD = spec.minPathDist ?? 1;
    for (let n = 0; n < count; n++) {
      for (let tries = 0; tries < 80; tries++) {
        const x = rng.int(0, COLS - fp);
        const y = rng.int(0, ROWS - fp);
        const tiles = [];
        let ok = true;
        for (let dy = 0; dy < fp && ok; dy++) {
          for (let dx = 0; dx < fp && ok; dx++) {
            const tx = x + dx;
            const ty = y + dy;
            const i = tileIndex(tx, ty);
            if (spec.on === 'feature') {
              if (grid[i] !== TileType.FEATURE) ok = false;
            } else if (spec.on === 'cliff') {
              // Ground tile directly above a feature (void) tile.
              if (grid[i] !== TileType.GROUND || ty + 1 >= ROWS || grid[i + COLS] !== TileType.FEATURE) ok = false;
            } else if (grid[i] !== TileType.GROUND || pathDist[i] < minPD) {
              ok = false;
            }
            if (ok && cheb(tx, ty, goal.x, goal.y) < 3) ok = false;
            if (ok && entrances.some((e) => cheb(tx, ty, e.x, e.y) < 2)) ok = false;
            tiles.push({ x: tx, y: ty });
          }
        }
        if (!ok) continue;
        if (spec.on === 'cliff' && map.decor.some((d) => d.kind === spec.kind && Math.abs(d.tiles[0].x - x) < 2 && Math.abs(d.tiles[0].y - y) < 2)) continue;
        const cx = (x + fp / 2) * TILE;
        const cy = (y + fp / 2) * TILE;
        const blocks = spec.blocks ?? !spec.on;
        if (blocks) for (const t of tiles) grid[tileIndex(t.x, t.y)] = TileType.BLOCKED;
        map.decor.push({
          kind: spec.kind,
          x: cx,
          y: cy,
          fp,
          tiles,
          r: Math.min((spec.size ?? fp * 0.5) * TILE, maxRadiusFromPath(map, cx, cy)),
          seed: rng.next(),
        });
        break;
      }
    }
  }
}

// ---------------------------------------------------------------- generation

function tryGenerate(biome, seed, attempt) {
  const rng = createRng((seed ^ Math.imul(attempt + 1, 0x9e3779b1)) >>> 0);
  const simple = attempt >= 30;
  let style = simple ? 'meander' : weightedKey(biome.layout.styles, rng);
  const orientation = simple ? 'h' : rng.chance(style === 'serpentine' ? 0.35 : 0.3) ? 'v' : 'h';
  const A = orientation === 'h' ? COLS : ROWS;
  const B = orientation === 'h' ? ROWS : COLS;
  const main = style === 'serpentine' ? serpentineLayout(rng, A, B) : meanderLayout(rng, A, B);
  const branches = style === 'converge' ? convergeBranches(main, rng, B, rng.int(1, 2)) : [];
  if (style === 'converge' && branches.length === 0) style = 'meander';

  const flipX = rng.chance(0.5);
  const flipY = rng.chance(0.5);
  const toXY = ({ a, b }) => {
    let x = orientation === 'h' ? a : b;
    let y = orientation === 'h' ? b : a;
    if (flipX) x = COLS - 1 - x;
    if (flipY) y = ROWS - 1 - y;
    return { x, y };
  };
  const mainXY = main.map(toXY);
  const routeTiles = [mainXY, ...branches.map((br) => [...br.tiles.map(toXY), ...mainXY.slice(br.joinIndex)])];

  const grid = new Uint8Array(COLS * ROWS);
  for (const tiles of routeTiles) for (const t of tiles) grid[tileIndex(t.x, t.y)] = TileType.PATH;
  const g = mainXY[mainXY.length - 1];
  const goal = { x: g.x, y: g.y, px: g.x * TILE + TILE / 2, py: g.y * TILE + TILE / 2 };
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const x = goal.x + dx;
      const y = goal.y + dy;
      if (inBounds(x, y) && grid[tileIndex(x, y)] !== TileType.PATH) grid[tileIndex(x, y)] = TileType.OBJECTIVE;
    }
  }

  const entrances = routeTiles.map((tiles) => {
    const t = tiles[0];
    const dir = edgeDirection(t) ?? { x: -1, y: 0 };
    return { x: t.x, y: t.y, px: t.x * TILE + TILE / 2 + dir.x * TILE / 2, py: t.y * TILE + TILE / 2 + dir.y * TILE / 2, dir };
  });

  const map = {
    seed,
    biomeId: biome.id,
    cols: COLS,
    rows: ROWS,
    tile: TILE,
    layoutStyle: style,
    layoutLabel: LAYOUT_LABELS[style],
    orientation,
    grid,
    bridge: new Uint8Array(COLS * ROWS),
    pathDist: null,
    goal,
    entrances,
    routes: [],
    featureTiles: [],
    decor: [],
    buildableCount: 0,
  };
  map.routes = routeTiles.map((tiles, i) => ({ entrance: i, ...buildRoute(tiles, entrances[i], goal) }));

  carveRivers(map, biome, rng);
  const pathDist = computePathDistance(grid);
  placeFeatureBlobs(map, biome, rng, pathDist);
  placeDecor(map, biome, rng, pathDist);
  map.pathDist = pathDist;

  for (let i = 0; i < grid.length; i++) {
    if (grid[i] === TileType.FEATURE) map.featureTiles.push({ x: i % COLS, y: (i / COLS) | 0 });
    if (grid[i] === TileType.GROUND) map.buildableCount++;
  }
  return map;
}

/** Structural validation: every route is a contiguous PATH chain from a map edge to the objective. */
export function validateMap(map) {
  const errors = [];
  if (!map.routes.length) errors.push('no routes');
  for (const [ri, route] of map.routes.entries()) {
    const tiles = route.tiles;
    if (!edgeDirection(tiles[0])) errors.push(`route ${ri} does not start on an edge`);
    const end = tiles[tiles.length - 1];
    if (end.x !== map.goal.x || end.y !== map.goal.y) errors.push(`route ${ri} does not reach the objective`);
    const seen = new Set();
    for (let i = 0; i < tiles.length; i++) {
      const t = tiles[i];
      if (!inBounds(t.x, t.y)) errors.push(`route ${ri} leaves the map`);
      else if (map.grid[tileIndex(t.x, t.y)] !== TileType.PATH) errors.push(`route ${ri} tile ${i} is not a path tile`);
      const k = keyOf(t.x, t.y);
      if (seen.has(k)) errors.push(`route ${ri} revisits a tile`);
      seen.add(k);
      if (i > 0) {
        const p = tiles[i - 1];
        if (Math.abs(p.x - t.x) + Math.abs(p.y - t.y) !== 1) errors.push(`route ${ri} breaks at tile ${i}`);
      }
    }
    if (!(route.length > 0)) errors.push(`route ${ri} has no length`);
  }
  if (map.buildableCount < 150) errors.push(`too little buildable space (${map.buildableCount})`);
  return { ok: errors.length === 0, errors };
}

export function generateMap(biome, seed) {
  for (let attempt = 0; attempt < 40; attempt++) {
    const map = tryGenerate(biome, seed >>> 0, attempt);
    if (validateMap(map).ok) return map;
  }
  throw new Error(`Failed to generate a valid map for biome "${biome.id}" (seed ${seed})`);
}

/** Position on a route at distance d. Writes into out to avoid allocation; returns segment index. */
export function sampleRoute(route, d, out, segHint = 0) {
  const { points, cum } = route;
  let s = Math.min(segHint, points.length - 2);
  while (s < points.length - 2 && d > cum[s + 1]) s++;
  while (s > 0 && d < cum[s]) s--;
  const a = points[s];
  const b = points[s + 1];
  const len = cum[s + 1] - cum[s] || 1;
  const t = Math.max(0, Math.min(1, (d - cum[s]) / len));
  out.x = a.x + (b.x - a.x) * t;
  out.y = a.y + (b.y - a.y) * t;
  out.dx = (b.x - a.x) / len;
  out.dy = (b.y - a.y) / len;
  return s;
}
