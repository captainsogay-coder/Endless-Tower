// Ghastly Wind, Starfall and Twilight of Gods: modifiers, periodic effects,
// boss caps, and that nothing outlives the weather.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/game/Game.js';
import { registerRoster } from '../src/units/roster.js';
import { WEATHERS, WEATHER_SETTINGS } from '../src/game/weather.js';

registerRoster();
const close = (a, b, eps = 1e-9) => Math.abs(a - b) < eps;
const W = { number: 1, alive: 0, plan: { scaling: { hp: 1, speed: 1, damage: 1, reward: 1 } } };

function setup(seed = 3) {
  const g = new Game({ seed, loadout: ['cadet'], weatherEnabled: true, mapEvents: false });
  g.coins = 1e9;
  g.towerHp = g.towerMaxHp = 1e12;
  let u = null;
  for (let y = 0; y < g.map.rows && !u; y++) for (let x = 0; x < g.map.cols && !u; x++) if (g.canPlace(x, y)) u = g.deploy('cadet', x, y);
  return { g, u };
}
const foe = (g, d, { boss = false, hp = 10000 } = {}) => {
  const e = g.spawnEnemy({ category: boss ? 'boss' : 'regular', route: 0, offset: d }, { ...W });
  e.hp = e.maxHp = hp;
  e.speed = 0;
  e.armor = 0;
  if (boss) e.bossTimer = 1e9;
  g.update(1e-4);
  return e;
};

test('three new weathers join the pool with the usual 20 s duration, labels, icons and explanations', () => {
  for (const id of ['ghastly', 'starfall', 'twilight']) {
    const w = WEATHERS[id];
    assert.ok(w.label && w.effects.length >= 2 && w.color && w.weight === 1);
  }
  assert.equal(WEATHER_SETTINGS.duration, 20);
  assert.equal(Object.keys(WEATHERS).length, 8);
});

test('Ghastly Wind: +15% range and enemies 10% slower, only while it lasts', () => {
  const { g, u } = setup();
  const r0 = u.stats.range;
  g.weather.start('ghastly');
  assert.ok(close(u.stats.range / r0, 1.15, 1e-9));
  assert.ok(close(g.eventEnemySpeed, 0.9));
  g.weather.stop();
  assert.ok(close(u.stats.range, r0, 1e-9) && g.eventEnemySpeed === 1, 'temporary: base stats untouched');
});

test('Starfall: +10% damage, a star every 4 s for 4% max HP – bosses 2%', () => {
  const { g, u } = setup(4);
  const d0 = u.stats.damage;
  const e = foe(g, 200);
  const stars = [];
  g.on('starfall', (s) => stars.push(s));
  g.weather.start('starfall');
  assert.ok(close(u.stats.damage / d0, 1.1, 1e-9));
  u.stats.damage = 0; // isolate the stars
  u.cooldown = 1e9;
  for (let i = 0; i < 4 * 30 + 1; i++) g.update(1 / 30);
  assert.equal(stars.length, 1);
  assert.ok(close(10000 - e.hp, 400, 1e-6), '4% of max HP');
  const g2 = setup(5).g;
  const b = foe(g2, 200, { boss: true });
  for (const x of g2.units) x.cooldown = 1e9;
  g2.weather.start('starfall');
  for (let i = 0; i < 4 * 30 + 1; i++) {
    g2.update(1 / 30);
    for (const x of g2.units) x.cooldown = 1e9;
  }
  assert.ok(close(10000 - b.hp, 200, 1e-6), 'bosses capped at 2%');
  g2.weather.stop();
  assert.ok(Object.keys(g2.weather.periodic).length === 0 || !g2.weather.current);
});

test('Twilight of Gods: +20% damage, +15% speed, enemies take +10%, and a pulse every 5 s', () => {
  const { g, u } = setup(6);
  const s0 = { ...u.stats };
  const e = foe(g, 220);
  g.weather.start('twilight');
  assert.ok(close(u.stats.damage / s0.damage, 1.2, 1e-9) && close(u.stats.rate / s0.rate, 1.15, 1e-9));
  const hp = e.hp;
  g.damageEnemy(e, 100, null);
  assert.ok(close(hp - e.hp, 110, 1e-9), 'enemies take +10%');
  const pulses = [];
  g.on('celestialPulse', (p) => pulses.push(p));
  for (const x of g.units) x.cooldown = 1e9;
  const before = e.hp;
  for (let i = 0; i < 5 * 30 + 1; i++) {
    g.update(1 / 30);
    for (const x of g.units) x.cooldown = 1e9;
  }
  assert.equal(pulses.length, 1);
  assert.ok(close(before - e.hp, 10000 * 0.03 * 1.1, 1e-6), '3% max HP (and the +10% applies)');
  g.weather.stop();
  assert.ok(close(u.stats.damage, s0.damage, 1e-9) && close(u.stats.rate, s0.rate, 1e-9));
  const hp2 = e.hp;
  g.damageEnemy(e, 100, null);
  assert.ok(close(hp2 - e.hp, 100, 1e-9), 'back to normal after it ends');
});
