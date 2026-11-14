// Whole-roster progression checks in real headless battles: tiers stay ahead at
// equal upgrade levels, bosses and swarms both reward tier, stacking is capped,
// and economy can't run away.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/game/Game.js';
import { registerRoster, ROSTER } from '../src/units/roster.js';
import { getUnit } from '../src/units/unitRegistry.js';
import { BENCH, ownCombat } from '../src/meta/sideTierBench.js';
import { BALANCE, TIERS, tierPower, waveDamageBonus } from '../src/balance.js';
import { levelStats, maxLevel } from '../src/units/unitStats.js';

registerRoster();
const ALL = ROSTER.map((d) => d.id);

function withBench(over, fn) {
  const saved = { ...BENCH };
  Object.assign(BENCH, over);
  try {
    return fn();
  } finally {
    Object.assign(BENCH, saved);
  }
}

const groups = (rows, key) => {
  const m = new Map();
  for (const r of rows) (m.get(r.tier) ?? m.set(r.tier, []).get(r.tier)).push(r[key] / (TIERS.roles[r.role] ?? 1));
  return [...m.entries()].sort((a, b) => a[0] - b[0]).map(([t, v]) => [t, v.reduce((a, b) => a + b, 0) / v.length]);
};

test('at equal upgrade level (all at max), tiers still climb – single target (bosses) and swarms alike', () => {
  const rows = withBench({ wave: 1, singleTime: 40, packTime: 40, level: 5 }, () => {
    const cadet = getUnit('cadet');
    const ref = ownCombat(cadet);
    return ROSTER.filter((d) => d.id !== 'dude').map((d) => {
      const def = getUnit(d.id);
      const m = ownCombat(def, ref);
      return { id: def.id, tier: def.tier, role: def.profile?.role ?? 'gunner', single: m.single / ref.single, pack: m.pack / ref.pack, value: m.value };
    });
  });
  for (const key of ['value', 'single', 'pack']) {
    // single-target averages compare single-target dealers (area specialists trade boss damage for area)
    // single-target averages compare single-target dealers, swarm averages compare area units:
    // each specialist trades the other for its strength
    const aoe = (r) => getUnit(r.id).profile?.splash > 0;
    const g = groups(key === 'single' ? rows.filter((r) => !aoe(r)) : key === 'pack' ? rows.filter(aoe) : rows, key);
    // averages rise tier over tier (bosses: single; swarms: pack)
    for (let i = 1; i < g.length; i++) assert.ok(g[i][1] > g[i - 1][1] * (key === 'value' ? 1.12 : 1), `${key}: T${g[i][0]} ${g[i][1].toFixed(2)} vs T${g[i - 1][0]} ${g[i - 1][1].toFixed(2)}`);
  }
  // fully upgraded, a higher tier pulls further ahead (better upgrade growth), never behind
  const v = (t) => groups(rows, 'value').find((x) => x[0] === t)[1];
  assert.ok(v(7) > 2.2 * v(4) && v(12) > 3 * v(7), `T4 ${v(4).toFixed(1)}, T7 ${v(7).toFixed(1)}, T12 ${v(12).toFixed(1)}`);
});

test('boss damage: every Tier VII+ damage dealer out-hits every Tier III one on a single tough target', () => {
  const rows = withBench({ wave: 1, singleTime: 40, packTime: 40 }, () => ROSTER.map((d) => ({ def: getUnit(d.id), single: ownCombat(getUnit(d.id)).single })));
  const gunners = rows.filter((r) => (r.def.profile?.role ?? 'gunner') === 'gunner');
  const bestT3 = Math.max(...gunners.filter((r) => r.def.tier === 3).map((r) => r.single));
  // AOE specialists trade boss damage for area; the guarantee is for single-target dealers
  for (const r of gunners.filter((x) => x.def.tier >= 7 && !(x.def.profile.splash > 0))) assert.ok(r.single > bestT3, `${r.def.id} ${r.single.toFixed(0)} vs best T3 ${bestT3.toFixed(0)}`);
});

function arena(seed = 3) {
  const g = new Game({ seed, loadout: ALL, weatherEnabled: false });
  g.coins = 1e12;
  g.towerHp = g.towerMaxHp = 1e12;
  return g;
}
const freeTiles = (g) => {
  const out = [];
  for (let y = 0; y < g.map.rows; y++) for (let x = 0; x < g.map.cols; x++) if (g.canPlace(x, y)) out.push([x, y]);
  return out;
};

test('stacking is capped: every buff in the game + Nova weather + 1000 waves stays within the caps', () => {
  const g = arena();
  const t = freeTiles(g);
  const target = g.deploy('cadet', ...t[0]);
  const base = levelStats(getUnit('cadet'), 0);
  // every unit that buffs anything, upgraded to max
  let k = 1;
  for (const d of ROSTER) if (getUnit(d.id).buffs?.length) {
    const u = g.deploy(d.id, ...t[k++]);
    while (u && u.level < maxLevel(u.def)) g.upgrade(u);
  }
  g.stats.wavesCleared = 1000;
  g.weather.start('nova');
  g.refreshAll();
  const C = BALANCE.caps;
  const weather = 1.3;
  const add = Math.min(C.additiveDamage, waveDamageBonus(1, 1000));
  assert.ok(target.stats.damage <= base.damage * C.buffDamage * (1 + add) * weather + 1e-6, `${target.stats.damage} vs cap`);
  assert.ok(target.stats.rate <= base.rate * C.buffRate * (1 / 0.6) + 1e-6, 'attack speed capped (Nova is the only extra)');
  assert.ok(target.stats.range <= base.range * C.buffRange + 1e-6, 'range capped');
  // and the cap actually binds: without it the buffs alone would exceed ×1.8
  assert.ok(target.stats.damage / (base.damage * (1 + add) * weather) > 1.7);
  // a long run lifts a Tier I by at most +45%: it never catches a Tier IV
  assert.ok(waveDamageBonus(1, 1e9) === 0.45 && 1.45 * tierPower(1) < tierPower(4));
});

test('temporary effects stay temporary: weather and abilities leave no trace in stats', () => {
  const g = arena(4);
  const u = g.deploy('gunslinger', ...freeTiles(g)[0]);
  const before = { ...u.stats };
  g.weather.start('windy');
  assert.ok(u.stats.range > before.range);
  g.weather.stop();
  assert.deepEqual({ ...u.stats }, before);
});

test('economy cannot run away: coin multipliers capped at +50%, repeat earners pay 1/√k', () => {
  const g = arena(5);
  const t = freeTiles(g);
  for (const id of ['colonel', 'fortress', 'colonel']) g.deploy(id, ...t.shift());
  assert.ok(g.coinMult <= BALANCE.caps.unitCoinMult + 1e-9);
  const m = [0, 1, 2, 3].map(() => g.deploy('marshal', ...t.shift()));
  const paid = m.map((u) => {
    const c0 = g.coins;
    g.grantCoins(100, 0, 0, null, u);
    return g.coins - c0;
  });
  const one = paid[0];
  assert.ok(paid[1] < one && paid[2] < paid[1] && paid[3] < paid[2], paid.join(','));
  assert.ok(Math.abs(paid[3] / one - 0.5) < 0.02, '4th copy earns half');
  // four Marshals together earn less than 3× one Marshal
  assert.ok(paid.reduce((a, b) => a + b, 0) < 3 * one);
});

test('costs match power: higher tiers cost more to deploy and upgrade, low tiers stay affordable', () => {
  const avg = (t, f) => {
    const us = ROSTER.filter((d) => d.tier === t).map((d) => getUnit(d.id));
    return us.length ? us.reduce((a, d) => a + f(d), 0) / us.length : null;
  };
  const tiers = [...new Set(ROSTER.map((d) => d.tier))].sort((a, b) => a - b);
  for (let i = 1; i < tiers.length; i++) assert.ok(avg(tiers[i], (d) => d.price) > avg(tiers[i - 1], (d) => d.price), `T${tiers[i]} price`);
  const full = (d) => d.price + d.levels.slice(1).reduce((a, L) => a + L.cost, 0);
  assert.ok(avg(1, full) < 300 && avg(1, (d) => d.price) <= 30, 'Tier I: cheap to deploy and to max out (unchanged)');
  assert.ok(avg(15, full) > 25 * avg(1, full), 'a Tier XV is a real investment');
});
