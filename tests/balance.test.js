import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/game/Game.js';
import { registerRoster, ROSTER } from '../src/units/roster.js';
import { getUnit } from '../src/units/unitRegistry.js';
import { levelStats, tableStats, maxLevel } from '../src/units/unitStats.js';
import { BALANCE, tokensForWave, waveBonusPerWave, waveDamageBonus } from '../src/balance.js';
import { dudePowerMultiplier } from '../src/units/defs/dude.js';

registerRoster();
const close = (a, b, eps = 1e-9) => Math.abs(a - b) < eps;

function arena(seed = 1, loadout = ROSTER.map((d) => d.id)) {
  const g = new Game({ seed, loadout, weatherEnabled: false });
  g.coins = 1e12;
  g.towerHp = g.towerMaxHp = 1e12;
  return g;
}
const tiles = (g) => {
  const out = [];
  for (let r = 0; r < g.map.rows; r++) for (let c = 0; c < g.map.cols; c++) if (g.canPlace(c, r)) out.push([c, r]);
  return out;
};

test('Tokens: 250 per wave, +5% (additive) per 10-wave milestone, configurable', () => {
  assert.deepEqual([1, 9, 10, 19, 20, 50, 100, 250].map((w) => tokensForWave(w)), [250, 250, 263, 263, 275, 313, 375, 563]);
  assert.equal(tokensForWave(100), Math.round(250 * (1 + 0.05 * 10)), 'additive, not compounding');
  assert.equal(tokensForWave(30, { base: 100, milestoneEvery: 5, milestoneBonus: 0.1 }), 160);
});

test('every completed wave pays its Tokens exactly once – single calls, multi-wave queues and Auto Skip', () => {
  for (const mode of ['queue', 'auto']) {
    const g = arena(3, ['dude']);
    const t = tiles(g).filter(([x, y]) => g.map.pathDist[y * g.map.cols + x] <= 2);
    for (const [x, y] of t.slice(0, 60)) {
      const u = g.deploy('dude', x, y);
      while (g.upgrade(u));
    }
    const paid = new Map();
    g.on('waveClear', (d) => paid.set(d.wave, (paid.get(d.wave) ?? 0) + d.tokens));
    if (mode === 'queue') g.callWaves(15);
    else {
      g.autoSkip = true;
      g.startNextWave();
    }
    for (let i = 0; i < 60 * 600 && g.stats.wavesCleared < 15; i++) g.update(1 / 60);
    g.autoSkip = false;
    assert.ok(g.stats.wavesCleared >= 15, `${mode}: ${g.stats.wavesCleared} waves cleared`);
    for (const [w, tok] of paid) assert.equal(tok, tokensForWave(w), `${mode}: wave ${w} paid once`);
    assert.equal(g.tokensEarned, [...paid.keys()].reduce((a, w) => a + tokensForWave(w), 0));
  }
});

test('global layer: +20% damage, +10% range, −10% cooldown on every unit (and any future unit)', () => {
  for (const def of ROSTER) {
    const t = tableStats(def, 0);
    const s = levelStats(def, 0);
    assert.ok(close(s.damage, t.damage * 1.2), `${def.id} damage`);
    assert.ok(close(s.range, t.range * 1.1), `${def.id} range`);
    assert.ok(close(s.rate, t.rate / 0.9), `${def.id} attack speed`);
  }
});

test('upgrades: every level of every unit is a meaningful step (≥ +20% DPS)', () => {
  for (const def of ROSTER) {
    for (let l = 1; l <= maxLevel(def); l++) {
      const a = levelStats(def, l - 1);
      const b = levelStats(def, l);
      const gain = (b.damage * b.rate) / (a.damage * a.rate) - 1;
      assert.ok(gain >= 0.2, `${def.id} Lv ${l}: +${Math.round(gain * 100)}% DPS`);
    }
  }
});

test('wave scaling: T1–T3 +2%, T4–T6 +1%, T7+ none; linear from base damage, same for every copy, never compounding', () => {
  assert.deepEqual([1, 2, 3, 4, 5, 6, 7, 12, 19].map(waveBonusPerWave), [0.02, 0.02, 0.02, 0.01, 0.01, 0.01, 0, 0, 0]);
  assert.ok(close(waveDamageBonus(3, 100), 2) && close(waveDamageBonus(5, 100), 1) && waveDamageBonus(7, 100) === 0);
  const g = arena(4);
  const t = tiles(g);
  const ids = ['cadet', 'gunnerman', 'tank', 'colonel', 'general', 'fortress'];
  const units = ids.map((id, i) => g.deploy(id, ...t[i * 4]));
  const twin = g.deploy('cadet', ...t[30]);
  const base = units.map((u) => u.stats.damage);
  const waves = [1, 10, 25, 50, 100, 250];
  for (const w of waves) {
    while (g.stats.wavesCleared < w) g.completeWave({ plan: { wave: g.stats.wavesCleared + 1, reward: 0, isBoss: false } });
    units.forEach((u, i) => {
      const expect = base[i] * (1 + waveBonusPerWave(u.def.tier) * w);
      assert.ok(close(u.stats.damage, expect, 1e-6), `${u.def.id} at wave ${w}`);
    });
    assert.equal(twin.stats.damage, units[0].stats.damage, 'every copy identical');
  }
  // never written into base stats
  assert.ok(close(levelStats(getUnit('cadet'), 0).damage, tableStats(getUnit('cadet'), 0).damage * 1.2));
});

test('additive bucket: wave scaling and Dude Power add (not multiply); buffs and weather multiply once each', () => {
  const g = arena(5);
  const t = tiles(g);
  const dudes = [0, 1, 2, 3, 4].map((i) => g.deploy('dude', ...t[i]));
  const base = levelStats(getUnit('dude'), 0).damage;
  g.stats.wavesCleared = 50;
  g.refreshAll();
  const power = dudePowerMultiplier(5) - 1; // +40%
  assert.ok(close(dudes[0].stats.damage, base * (1 + 1.0 + power)), 'base × (1 + 100% wave + 40% Dude Power)');
  g.deploy('colonel', ...t[t.length - 1]);
  g.weather.start('nova');
  const colonel = 1.15;
  assert.ok(close(dudes[0].stats.damage, base * (1 + 1.0 + power) * colonel * 1.3), '× Colonel × Nova, once each');
  for (let i = 0; i < 5; i++) g.weather.start('nova');
  assert.ok(close(dudes[0].stats.damage, base * (1 + 1.0 + power) * colonel * 1.3), 'repeated weather never stacks');
  g.weather.stop();
  assert.ok(close(dudes[0].stats.damage, base * (1 + 1.0 + power) * colonel));
});

test('summoned allies inherit their summoner\'s wave scaling but no buffs', () => {
  const g = arena(6);
  const t = tiles(g);
  const b = g.deploy('special-force-battalion', ...t[0]);
  g.stats.wavesCleared = 40;
  g.refreshAll();
  const a = g.spawnAlly(b, 'battalion-soldier', { life: 10 });
  assert.ok(close(a.stats.damage, levelStats(a.def, 0).damage * (1 + 0.01 * 40)));
});

test('ability coins get +15%; economy bonuses get +15% of their bonus', () => {
  const g = arena(7);
  const c0 = g.coins;
  const got = g.grantCoins(100, 0, 0);
  assert.equal(got, 115);
  assert.equal(g.coins - c0, 115);
  g.deploy('colonel', ...tiles(g)[0]);
  assert.ok(close(g.coinMult, 1 + 0.15 * BALANCE.global.abilityCoinMult));
});

test('balance safeguards: Special Forces squad bonus is capped; no unit stat is infinite after 1000 waves', () => {
  const g = arena(8);
  const t = tiles(g);
  const sf = [];
  for (let i = 0; i < 40; i++) sf.push(g.deploy('special-forces', ...t[i]));
  assert.ok(close(getUnit('special-forces').passive.bonus(g.passiveContext(getUnit('special-forces'))), 3));
  g.stats.wavesCleared = 1000;
  g.refreshAll();
  for (const u of g.units) assert.ok(Number.isFinite(u.stats.damage) && u.stats.damage > 0);
});
