import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/game/Game.js';
import { TileType, tileIndex } from '../src/maps/mapGenerator.js';
import { simulate } from '../scripts/simulate.js';
import { COLS, ROWS, GAME_CONFIG } from '../src/config.js';
import { registerRoster } from '../src/units/roster.js';
import { registerUnit } from '../src/units/unitRegistry.js';
import { levelStats } from '../src/units/unitStats.js';
import dude from '../src/units/defs/dude.js';

registerRoster();
registerUnit({ id: 'test-plain', name: 'Plain', tier: 1, price: 10, levels: [{ damage: 10, range: 64, rate: 1 }] });

function groundTiles(game) {
  const out = [];
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) if (game.map.grid[tileIndex(x, y)] === TileType.GROUND) out.push([x, y]);
  return out;
}

test('unlimited copies: every buildable tile can hold a Dude (no 12-unit cap)', () => {
  const game = new Game({ seed: 77, loadout: ['dude'] });
  const tiles = groundTiles(game);
  game.coins = dude.price * tiles.length;
  for (const [x, y] of tiles) assert.ok(game.deploy('dude', x, y));
  assert.equal(game.units.length, tiles.length);
  assert.ok(game.units.length > 12);
  assert.equal(game.deployedCount('dude'), tiles.length);
});

test('deploying costs the unit price and needs coins, a free tile and a plan slot', () => {
  const game = new Game({ seed: 5, loadout: ['dude'] });
  const [gx, gy] = groundTiles(game)[0];
  const g0 = game.coins;
  assert.ok(game.deploy('dude', gx, gy));
  assert.equal(game.coins, g0 - dude.price);
  assert.equal(game.deploy('dude', gx, gy), null, 'occupied');
  const road = game.map.routes[0].tiles[3];
  assert.equal(game.canDeploy('dude', road.x, road.y), 'blocked');
  const [hx, hy] = groundTiles(game)[1];
  assert.equal(game.canDeploy('test-plain', hx, hy), 'not-in-plan', 'only plan units are deployable');
  game.coins = 0;
  assert.equal(game.canDeploy('dude', hx, hy), 'coins');
});

test('Dude Power counts deployed Dudes and updates on deploy and sell', () => {
  const game = new Game({ seed: 9, loadout: ['dude', 'test-plain'] });
  game.coins = 1e6;
  const tiles = groundTiles(game);
  const base = levelStats(dude, 0).damage;
  const a = game.deploy('dude', ...tiles[0]);
  assert.equal(a.stats.damage, base);
  const b = game.deploy('dude', ...tiles[1]);
  const c = game.deploy('dude', ...tiles[2]);
  const d = game.deploy('dude', ...tiles[3]);
  for (const u of [a, b, c, d]) assert.ok(Math.abs(u.stats.damage - base * 1.3) < 1e-9);
  // other unit types do not count
  const plain = game.deploy('test-plain', ...tiles[4]);
  assert.equal(plain.stats.damage, 10);
  assert.ok(Math.abs(a.stats.damage - base * 1.3) < 1e-9);
  game.sell(d);
  for (const u of [a, b, c]) assert.ok(Math.abs(u.stats.damage - base * 1.2) < 1e-9);
  assert.equal(game.deployedCount('dude'), 3);
});

test('upgrades raise level and stats, keep Dude Power, and stop at level 5', () => {
  const game = new Game({ seed: 10, loadout: ['dude'] });
  game.coins = 1e6;
  const tiles = groundTiles(game);
  const u = game.deploy('dude', ...tiles[0]);
  game.deploy('dude', ...tiles[1]);
  const info = game.upgradeInfo(u);
  assert.equal(info.nextLevel, 1);
  assert.ok(info.next.damage > info.current.damage);
  const g = game.coins;
  assert.ok(game.upgrade(u));
  assert.equal(game.coins, g - info.cost);
  for (let i = 0; i < 4; i++) assert.ok(game.upgrade(u));
  assert.equal(u.level, 5);
  assert.equal(game.upgrade(u), false);
  assert.ok(game.upgradeInfo(u).maxed);
  assert.ok(Math.abs(u.stats.damage - levelStats(dude, 5).damage * 1.1) < 1e-9);
});

test('selling refunds part of everything spent on the unit', () => {
  const game = new Game({ seed: 11, loadout: ['dude'] });
  game.coins = 1000;
  const u = game.deploy('dude', ...groundTiles(game)[0]);
  game.upgrade(u);
  const spent = dude.price + dude.levels[1].cost;
  const before = game.coins;
  const refund = game.sell(u);
  assert.equal(refund, Math.floor(spent * GAME_CONFIG.sellRefund));
  assert.equal(game.coins, before + refund);
  assert.ok(game.canPlace(u.col, u.row));
});

test('Dudes attack automatically and damage registers', () => {
  const game = new Game({ seed: 8, loadout: ['dude'] });
  game.coins = 1e6;
  const near = groundTiles(game).filter(([x, y]) => game.map.pathDist[tileIndex(x, y)] === 1);
  for (const [x, y] of near.slice(0, 30)) game.deploy('dude', x, y);
  let fired = 0;
  game.on('fire', () => fired++);
  game.startNextWave();
  for (let i = 0; i < 60 * 600 && game.phase === 'wave'; i++) game.update(1 / 60);
  assert.ok(fired > 0);
  assert.ok(game.stats.kills > 0);
  assert.ok(game.stats.damage > 0);
  assert.notEqual(game.phase, 'wave');
});

test('headless runs survive many waves with large Dude armies', () => {
  const { game } = simulate({ seed: 4242, maxWave: 40 });
  assert.ok(game.wave >= 30, `reached wave ${game.wave}`);
  assert.ok(game.units.length > 50);
});
