import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateMap, validateMap, TileType, tileIndex } from '../src/maps/mapGenerator.js';
import { listBiomes } from '../src/maps/biomes.js';
import { COLS, ROWS } from '../src/config.js';

const SEEDS = Array.from({ length: 40 }, (_, i) => 1 + i * 7919);

test('six biomes are registered', () => {
  const ids = listBiomes().map((b) => b.id).sort();
  assert.deepEqual(ids, ['forest', 'frozen', 'mechanical', 'ruins', 'sky', 'volcanic']);
});

test('every biome generates valid maps across many seeds', () => {
  for (const biome of listBiomes()) {
    for (const seed of SEEDS) {
      const map = generateMap(biome, seed);
      const v = validateMap(map);
      assert.ok(v.ok, `${biome.id}/${seed}: ${v.errors.join(', ')}`);
    }
  }
});

test('routes are walkable: contiguous path tiles from an edge to the objective', () => {
  for (const biome of listBiomes()) {
    const map = generateMap(biome, 123);
    for (const r of map.routes) {
      const first = r.tiles[0];
      assert.ok(first.x === 0 || first.y === 0 || first.x === COLS - 1 || first.y === ROWS - 1);
      for (const t of r.tiles) assert.equal(map.grid[tileIndex(t.x, t.y)], TileType.PATH);
      // Waypoints end exactly on the objective, in pixels.
      const end = r.points[r.points.length - 1];
      assert.equal(end.x, map.goal.px);
      assert.equal(end.y, map.goal.py);
      assert.ok(r.length > 300);
    }
  }
});

test('maps are deterministic for a seed and vary between seeds', () => {
  const b = listBiomes()[0];
  const a1 = generateMap(b, 99);
  const a2 = generateMap(b, 99);
  assert.deepEqual([...a1.grid], [...a2.grid]);
  const styles = new Set(SEEDS.map((s) => generateMap(b, s).layoutStyle));
  assert.ok(styles.size >= 2, 'layout styles should vary');
});

test('buildable terrain exists and decorations never sit on the road', () => {
  for (const biome of listBiomes()) {
    const map = generateMap(biome, 2024);
    assert.ok(map.buildableCount >= 150);
    for (const d of map.decor) for (const t of d.tiles) assert.notEqual(map.grid[tileIndex(t.x, t.y)], TileType.PATH);
  }
});

test('every realm places its recognisable landmark', () => {
  for (const biome of listBiomes()) {
    let found = 0;
    for (const seed of SEEDS.slice(0, 20)) if (generateMap(biome, seed).decor.some((d) => d.landmark)) found++;
    assert.ok(found >= 18, `${biome.id}: landmark placed in ${found}/20 maps`);
  }
});

test('battlefields rotate: no repeats of the last two realms, variants and layouts vary', async () => {
  const { chooseBattlefield, biomeWithVariant } = await import('../src/maps/rotation.js');
  const { createRng } = await import('../src/core/rng.js');
  const rng = createRng(77);
  const history = [];
  const combos = new Set();
  for (let i = 0; i < 60; i++) {
    const pick = chooseBattlefield(rng, history);
    const recent = history.slice(-2).map((h) => h.biome);
    assert.ok(!recent.includes(pick.biomeId), `battle ${i}: ${pick.biomeId} repeated within 2`);
    const biome = biomeWithVariant(pick.biomeId, pick.variantId);
    const map = generateMap(biome, rng.int(0, 1e9), { avoidStyles: pick.avoidStyles });
    assert.ok(validateMap(map).ok);
    if (history.length) assert.notEqual(map.layoutStyle, history[history.length - 1].style, 'layout style alternates');
    history.push({ biome: pick.biomeId, variant: pick.variantId, style: map.layoutStyle });
    combos.add(`${pick.biomeId}/${pick.variantId}/${map.layoutStyle}`);
  }
  assert.ok(combos.size > 25, `${combos.size} distinct combinations in 60 battles`);
});

test('every realm variant generates valid maps', async () => {
  const { biomeWithVariant } = await import('../src/maps/rotation.js');
  for (const b of listBiomes()) {
    assert.ok((b.variants ?? []).length >= 2, `${b.id} has variants`);
    for (const v of b.variants) for (const seed of [1, 2, 3, 4, 5]) assert.ok(validateMap(generateMap(biomeWithVariant(b.id, v.id), seed)).ok, `${b.id}/${v.id}`);
  }
});
