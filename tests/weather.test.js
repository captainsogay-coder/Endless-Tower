import { test } from 'node:test';
import assert from 'node:assert/strict';
import { WeatherSystem, WEATHERS, WEATHER_SETTINGS } from '../src/game/weather.js';
import { Game } from '../src/game/Game.js';
import { registerRoster } from '../src/units/roster.js';
import { createRng } from '../src/core/rng.js';
import { levelStats } from '../src/units/unitStats.js';
import { getUnit } from '../src/units/unitRegistry.js';

registerRoster();

test('weather rolls 1% once per second while clear and lasts exactly 20 s', () => {
  const w = new WeatherSystem(createRng(5));
  let starts = 0;
  let clearSeconds = 0;
  const durations = [];
  let began = null;
  w.onChange = (cur) => {
    if (cur) {
      starts++;
      began = t;
    } else durations.push(t - began);
  };
  let t = 0;
  const dt = 0.05;
  for (let i = 0; i < 2_000_000 / 20; i++) {
    const wasClear = !w.current;
    t += dt;
    w.update(dt);
    if (wasClear) clearSeconds += dt;
  }
  const rate = starts / clearSeconds;
  assert.ok(Math.abs(rate - 0.01) < 0.002, `observed ${rate.toFixed(4)} starts per clear second`);
  for (const d of durations) assert.ok(Math.abs(d - WEATHER_SETTINGS.duration) < dt + 1e-9, `duration ${d}`);
  const seen = new Set();
  const w2 = new WeatherSystem(createRng(9));
  w2.onChange = (c) => c && seen.add(c.id);
  for (let i = 0; i < 400000; i++) w2.update(0.25);
  assert.deepEqual([...seen].sort(), Object.keys(WEATHERS).sort(), 'all five weathers occur');
});

test('disabled weather never starts and toggling off ends the current weather', () => {
  const w = new WeatherSystem(createRng(1), { enabled: false });
  for (let i = 0; i < 100000; i++) w.update(0.5);
  assert.equal(w.current, null);
  w.setEnabled(true);
  w.start('rainy');
  w.setEnabled(false);
  assert.equal(w.current, null);
});

test('weather buffs apply to derived stats only and vanish afterwards', () => {
  const g = new Game({ seed: 3, loadout: ['cadet'] });
  g.coins = 1e6;
  const u = g.deploy('cadet', ...findTile(g));
  const base = { ...levelStats(getUnit('cadet'), 0) };
  const expect = { nova: [1.3, 1 / 0.6, 1], windy: [1.15, 1 / 0.9, 1.2], thunderstorm: [1.25, 1, 1.15], rainy: [1, 1 / 0.8, 1], aurora: [1, 1, 1] };
  for (const [id, [dm, rm, gm]] of Object.entries(expect)) {
    g.weather.start(id);
    assert.ok(Math.abs(u.stats.damage - base.damage * dm) < 1e-9, `${id} damage`);
    assert.ok(Math.abs(u.stats.rate - base.rate * rm) < 1e-9, `${id} rate`);
    assert.ok(Math.abs(u.stats.range - base.range * gm) < 1e-9, `${id} range`);
    g.weather.start(id); // re-triggering never stacks
    assert.ok(Math.abs(u.stats.damage - base.damage * dm) < 1e-9, `${id} no stacking`);
    g.weather.stop();
    assert.deepEqual({ d: u.stats.damage, r: u.stats.rate, g: u.stats.range }, { d: base.damage, r: base.rate, g: base.range }, `${id} reverts`);
  }
  assert.deepEqual(levelStats(getUnit('cadet'), 0), base, 'definition untouched');
});

test('coin gain: Rainy +10%, Aurora +35%, applied to kills and wave rewards', () => {
  const g = new Game({ seed: 4, loadout: ['dude'] });
  for (const [id, m] of [['rainy', 1.1], ['aurora', 1.35], ['nova', 1]]) {
    g.weather.start(id);
    const c0 = g.coins;
    g.gainCoins(100);
    assert.equal(g.coins - c0, Math.round(100 * m));
  }
});

test('thunderstorm strikes a random enemy every 3 s for AOE damage of 7% max HP', () => {
  const g = new Game({ seed: 6, loadout: ['dude'], weatherEnabled: false });
  g.towerMaxHp = g.towerHp = 1e9;
  g.startNextWave();
  for (let i = 0; i < 60 * 6; i++) g.update(1 / 60);
  const strikes = [];
  g.on('lightning', (l) => strikes.push({ ...l, hp: l.target.hp }));
  g.weather.start('thunderstorm');
  for (const e of g.enemies) e.hp = e.maxHp = 1e6;
  const t0 = g.time;
  for (let i = 0; i < 60 * 9.5; i++) g.update(1 / 60);
  assert.equal(strikes.length, 3, '3 strikes in 9.5 s');
  const { target } = strikes[0];
  const base = WEATHER_SETTINGS.lightningBaseDamage * target.wave.plan.scaling.hp;
  assert.ok(1e6 - target.hp >= base + 0.07 * 1e6 - 1e-6 || !target.alive);
  void t0;
});

function findTile(g) {
  for (let y = 0; y < g.map.rows; y++) for (let x = 0; x < g.map.cols; x++) if (g.canPlace(x, y)) return [x, y];
  return null;
}
