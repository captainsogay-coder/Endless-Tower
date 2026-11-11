import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/game/Game.js';
import { TileType, tileIndex } from '../src/maps/mapGenerator.js';
import { simulate } from '../scripts/simulate.js';
import { COLS, ROWS } from '../src/config.js';

function groundTiles(game) {
  const out = [];
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) if (game.map.grid[tileIndex(x, y)] === TileType.GROUND) out.push([x, y]);
  return out;
}

test('there is no unit placement cap: every buildable tile can hold a unit', () => {
  const game = new Game({ seed: 77 });
  const tiles = groundTiles(game);
  game.gold = game.summonCost * tiles.length;
  game.summon(tiles.length);
  for (const [x, y] of tiles) assert.ok(game.placeFromBench(game.bench[0].def.id, x, y));
  assert.equal(game.units.length, tiles.length);
  assert.equal(game.bench.length, 0);
});

test('units cannot be placed on roads, terrain features or occupied tiles', () => {
  const game = new Game({ seed: 5 });
  game.summon(3);
  const id = game.bench[0].def.id;
  const road = game.map.routes[0].tiles[3];
  assert.equal(game.placeFromBench(id, road.x, road.y), null);
  const [gx, gy] = groundTiles(game)[0];
  assert.ok(game.placeFromBench(id, gx, gy));
  assert.equal(game.placeFromBench(id, gx, gy), null);
});

test('recalling returns a unit to reserves and frees its tile', () => {
  const game = new Game({ seed: 6 });
  game.summon(1);
  const [x, y] = groundTiles(game)[0];
  const u = game.placeFromBench(game.bench[0].def.id, x, y);
  assert.ok(game.recallUnit(u));
  assert.equal(game.bench.length, 1);
  assert.ok(game.canPlace(x, y));
});

test('a full wave plays out: enemies spawn, fight, and the wave clears', () => {
  const game = new Game({ seed: 8 });
  let spawned = 0;
  game.on('spawn', () => spawned++);
  game.startNextWave();
  const total = game.currentPlan.total;
  for (let i = 0; i < 60 * 600 && game.phase === 'wave'; i++) game.update(1 / 60);
  assert.equal(spawned, total);
  assert.notEqual(game.phase, 'wave');
});

test('headless runs survive many waves without errors and with huge unit counts', () => {
  const { game } = simulate({ seed: 4242, maxWave: 40 });
  assert.ok(game.wave >= 10, `reached wave ${game.wave}`);
  assert.ok(game.stats.kills > 100);
});
