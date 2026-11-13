import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/game/Game.js';
import { registerRoster } from '../src/units/roster.js';
import { GAME_CONFIG } from '../src/config.js';

registerRoster();
const run = (g, seconds, step = 1 / 30) => {
  for (let t = 0; t < seconds && g.phase !== 'gameover'; t += step) g.update(step);
};

test('calling 100 waves queues them, releases them staggered, and runs them concurrently', () => {
  const g = new Game({ seed: 11, loadout: ['dude'], weatherEnabled: false });
  g.towerMaxHp = g.towerHp = 1e12; // survive the flood
  assert.equal(g.callWaves(100), 100);
  assert.deepEqual(g.activeWaveNumbers(), [1], 'first wave starts immediately');
  assert.equal(g.queuedWaveNumbers().length, 99);
  assert.deepEqual(g.queuedWaveNumbers().slice(0, 3), [2, 3, 4]);
  run(g, GAME_CONFIG.waveStagger * 10 + 0.01);
  assert.ok(g.activeWaveNumbers().length >= 10, `${g.activeWaveNumbers().length} waves active together`);
  // enemies from different waves coexist
  run(g, 5);
  const waves = new Set(g.enemies.map((e) => e.wave.number));
  assert.ok(waves.size >= 5, `enemies from ${waves.size} different waves on the field`);
  assert.equal(g.wave, Math.max(...g.activeWaveNumbers()));
});

test('each concurrent wave keeps its own scaling and pays its own reward when cleared', () => {
  const g = new Game({ seed: 12, loadout: ['dude'], weatherEnabled: false });
  g.towerMaxHp = g.towerHp = 1e12;
  const cleared = [];
  g.on('waveClear', (w) => cleared.push(w));
  g.callWaves(3);
  run(g, 2);
  const byWave = new Map();
  for (const e of g.enemies) if (e.category === 'regular') byWave.set(e.wave.number, e.maxHp / e.cat.hp);
  for (const [n, mult] of byWave) assert.ok(Math.abs(mult - g.activeWaves.find((w) => w.number === n).plan.scaling.hp) < 1e-9);
  // let everything leak through: waves still complete and pay out once each
  run(g, 400);
  assert.deepEqual(cleared.map((c) => c.wave).sort((a, b) => a - b), [1, 2, 3]);
  assert.ok(cleared.every((c) => c.tokens === 250));
  assert.equal(g.tokensEarned, 750);
  assert.equal(g.phase, 'build');
});

test('Auto Skip calls the next wave as soon as the newest has finished spawning', () => {
  const g = new Game({ seed: 13, loadout: ['dude'], weatherEnabled: false });
  g.towerMaxHp = g.towerHp = 1e12;
  g.autoSkip = true;
  run(g, 0.1);
  assert.deepEqual(g.activeWaveNumbers(), [1], 'Auto Skip starts the first wave without waiting');
  run(g, 120);
  assert.ok(g.wave >= 4, `reached wave ${g.wave}`);
  assert.ok(g.activeWaveNumbers().length >= 2, 'later waves overlap earlier ones');
  g.autoSkip = false;
  const w = g.wave;
  run(g, 60);
  assert.equal(g.wave, w, 'turning it off stops calling waves');
});

test('several boss waves at once: every boss gets its own intro and arrives', () => {
  const g = new Game({ seed: 14, loadout: ['dude'], weatherEnabled: false });
  g.towerMaxHp = g.towerHp = 1e12;
  let arrived = 0;
  g.on('bossArrived', () => arrived++);
  // jump the director to its boss cadence by calling enough waves
  g.callWaves(30);
  run(g, 120);
  const bossWaves = g.activeWaves.concat([]).length; // keep running regardless
  void bossWaves;
  assert.ok(arrived >= 2, `${arrived} bosses arrived`);
  assert.ok(g.enemies.every((e) => e.intro >= 1 || e.invulnerable));
});

test('large-scale AOE combat stays correct and fast with thousands of enemies', () => {
  const g = new Game({ seed: 15, loadout: ['dude', 'grenade-launcher'], weatherEnabled: false });
  g.towerMaxHp = g.towerHp = 1e12;
  g.coins = 1e9;
  g.callWaves(60);
  const t0 = performance.now();
  let peak = 0;
  // let a crowd build up, then open fire with a wall of AOE units
  for (let i = 0; i < 30 * 25; i++) {
    g.update(1 / 30);
    peak = Math.max(peak, g.enemies.length);
  }
  for (let y = 0; y < g.map.rows; y++) for (let x = 0; x < g.map.cols; x++) if (g.map.pathDist[y * g.map.cols + x] <= 2) g.deploy('grenade-launcher', x, y);
  for (let i = 0; i < 30 * 20; i++) g.update(1 / 30);
  const ms = performance.now() - t0;
  assert.ok(peak > 1000, `peak ${peak} enemies`);
  assert.ok(g.stats.kills > 500);
  assert.ok(ms < 20000, `40 s of combat simulated in ${ms.toFixed(0)} ms`);
  // wave bookkeeping matches reality
  for (const w of g.activeWaves) assert.equal(w.alive, g.enemies.filter((e) => e.wave === w).length);
});
