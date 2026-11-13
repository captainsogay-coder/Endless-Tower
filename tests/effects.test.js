import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/game/Game.js';
import { registerRoster } from '../src/units/roster.js';
import { TileType, tileIndex } from '../src/maps/mapGenerator.js';
import { COLS, ROWS, GAME_CONFIG } from '../src/config.js';
import { applyStatus, statusSpeedMultiplier, STATUSES } from '../src/game/effects.js';
import { levelStats } from '../src/units/unitStats.js';
import { getUnit } from '../src/units/unitRegistry.js';
import { Profile, memoryStorage } from '../src/meta/profile.js';

registerRoster();
const ALL = ['dude', 'cadet', 'gunnerman', 'grenade-launcher', 'tank'];
const ground = (g) => {
  const out = [];
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) if (g.map.grid[tileIndex(x, y)] === TileType.GROUND) out.push([x, y]);
  return out;
};
function fakeEnemy(game, x, y) {
  game.startNextWave();
  game.update(1); // spawn something
  const e = game.enemies[0];
  e.x = x;
  e.y = y;
  e.maxHp = e.hp = 1e9;
  return e;
}

test('Wounded slows by exactly 5%, refreshes instead of stacking, then wears off', () => {
  const e = { speed: 100 };
  applyStatus(e, 'wounded', 0);
  applyStatus(e, 'wounded', 1);
  assert.equal(statusSpeedMultiplier(e, 2), 0.95);
  assert.equal(statusSpeedMultiplier(e, 1 + STATUSES.wounded.duration + 0.01), 1);
});

test('Wounded enemies actually move 5% slower along the road', () => {
  const run = (wound) => {
    const g = new Game({ seed: 3, loadout: ALL });
    g.startNextWave();
    g.update(1);
    const e = g.enemies[0];
    const d0 = e.d;
    if (wound) applyStatus(e, 'wounded', g.time);
    for (let i = 0; i < 60; i++) g.update(1 / 60);
    return e.d - d0;
  };
  assert.ok(Math.abs(run(true) / run(false) - 0.95) < 1e-6);
});

test('Grenade Launcher wounds ~20% of enemies it hits', () => {
  const g = new Game({ seed: 4, loadout: ALL });
  g.coins = 1e6;
  const [x, y] = ground(g)[0];
  const u = g.deploy('grenade-launcher', x, y);
  let wounded = 0;
  const N = 4000;
  for (let i = 0; i < N; i++) {
    const e = { alive: true, invulnerable: false, hp: 1e9, maxHp: 1e9, armor: 0, shield: 0, radius: 8, x: 0, y: 0, d: 0, route: { length: 1 } };
    g.impact({ x: 0, y: 0, splash: 0, target: e, damage: 1, source: u });
    if (e.statuses?.wounded) wounded++;
  }
  assert.ok(Math.abs(wounded / N - 0.2) < 0.03, `wound rate ${wounded / N}`);
});

test('Tank shells leave flames that burn enemies standing in them, then expire', () => {
  const g = new Game({ seed: 5, loadout: ALL });
  g.coins = 1e6;
  const [x, y] = ground(g)[0];
  const tank = g.deploy('tank', x, y);
  const e = fakeEnemy(g, 300, 300);
  e.speed = 0;
  g.impact({ x: 300, y: 300, splash: 0, target: null, damage: 100, source: tank });
  assert.equal(g.hazards.length, 1);
  g.hash.clear();
  g.hash.insert(e);
  const hp0 = e.hp;
  for (let i = 0; i < 61; i++) g.updateHazards(1 / 60); // just past 1 s: four 0.25 s ticks
  assert.ok(Math.abs(hp0 - e.hp - 8) < 1e-6, `8 damage per second from a 100-damage shell, got ${hp0 - e.hp}`);
  g.updateHazards(5);
  assert.equal(g.hazards.length, 0, 'flames burn out');
});

test('Tank aura: allies in radius attack 10% faster, never stacking, removed with the Tank', () => {
  const g = new Game({ seed: 6, loadout: ALL });
  g.coins = 1e6;
  const tiles = ground(g);
  // find a dude tile with two free neighbours for tanks
  let spot = null;
  for (const [x, y] of tiles) {
    if (g.canPlace(x + 1, y) && g.canPlace(x - 1, y)) { spot = [x, y]; break; }
  }
  const d = g.deploy('dude', ...spot);
  const base = levelStats(getUnit('dude'), 0).rate;
  assert.equal(d.stats.rate, base);
  const t1 = g.deploy('tank', spot[0] + 1, spot[1]);
  assert.ok(Math.abs(d.stats.rate - base / 0.9) < 1e-9, 'one Tank: cooldown × 0.9');
  const t2 = g.deploy('tank', spot[0] - 1, spot[1]);
  assert.ok(Math.abs(d.stats.rate - base / 0.9) < 1e-9, 'two Tanks: still × 0.9');
  assert.ok(Math.abs(t1.stats.rate - levelStats(getUnit('tank'), 0).rate / 0.9) < 1e-9, 'tanks buff each other but not themselves');
  g.sell(t1);
  g.sell(t2);
  assert.equal(d.stats.rate, base, 'aura removed with the Tanks');
  const far = tiles.find(([x, y]) => Math.hypot(x - spot[0], y - spot[1]) > 5 && g.canPlace(x, y));
  const t3 = g.deploy('tank', ...far);
  assert.equal(d.stats.rate, base, 'out of range: no bonus');
  void t3;
});

test('exactly 100 Tokens per completed wave; none for a wave in progress or lost', () => {
  const g = new Game({ seed: 7, loadout: ['dude'] });
  const got = [];
  g.on('waveClear', (w) => got.push(w.tokens));
  g.coins = 1e6;
  const near = ground(g).filter(([x, y]) => g.map.pathDist[tileIndex(x, y)] <= 2);
  for (const [x, y] of near) g.deploy('dude', x, y);
  for (let w = 0; w < 3; w++) {
    g.startNextWave();
    for (let i = 0; i < 60 * 900 && g.phase === 'wave'; i++) g.update(1 / 60);
  }
  assert.deepEqual(got, [100, 100, 100]);
  assert.equal(g.tokensEarned, 300);
  assert.equal(GAME_CONFIG.tokensPerWave, 100);
  // A wave that is only partly done awards nothing.
  g.startNextWave();
  for (let i = 0; i < 30; i++) g.update(1 / 60);
  assert.equal(g.tokensEarned, 300);
  // Losing mid-wave awards nothing either.
  g.towerHp = 1;
  g.leak(g.enemies[0] ?? { towerDamage: 5, alive: true });
  assert.equal(g.phase, 'gameover');
  assert.equal(g.tokensEarned, 300);
});

test('Coins, Tokens and Gems are separate: coins live in the battle, tokens and gems in the profile', () => {
  const p = new Profile({ storage: memoryStorage(), starterUnits: ['dude'] });
  const g = new Game({ seed: 8, loadout: ['dude'] });
  p.earn('tokens', 100);
  const coins = g.coins;
  assert.equal(p.balance('tokens'), 100);
  assert.equal(p.balance('coins'), 0, 'profile holds no coins');
  g.deploy('dude', ...ground(g)[0]);
  assert.equal(p.balance('tokens'), 100, 'spending coins never touches tokens');
  assert.ok(g.coins < coins);
  assert.equal(p.spend('tokens', 101), false);
  assert.equal(p.balance('tokens'), 100);
  assert.equal(p.balance('gems'), 0, 'gems start at zero and are separate');
  p.earn('gems', 50);
  assert.equal(p.balance('tokens'), 100, 'earning gems never touches tokens');
  assert.equal(p.spend('gems', 51), false);
});
