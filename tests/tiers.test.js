import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { registerRoster, ROSTER } from '../src/units/roster.js';
import { levelStats, maxLevel } from '../src/units/unitStats.js';
import { TIERS, tierPower, tierPrice, tierDamageGrowth, profileDps, BALANCE } from '../src/balance.js';

registerRoster();
const TARGET = { 1: 1, 2: 1.6, 3: 2.4, 4: 3.4, 5: 4.7, 6: 6.3, 7: 8.3, 8: 10.8, 9: 13.8, 10: 17.5, 11: 22, 12: 27.5, 13: 34, 14: 42, 15: 51 };

test('tier power curve: every tier is a real step (+20–60%), T7 ≈ 2.4× T4, T12 ≈ 3.3× T7, ×1.2 per tier past T15', () => {
  for (const [t, v] of Object.entries(TARGET)) assert.equal(tierPower(Number(t)), v);
  for (let t = 2; t <= 30; t++) {
    const step = tierPower(t) / tierPower(t - 1);
    assert.ok(step >= 1.18 && step <= 1.65, `T${t} step ×${step.toFixed(2)}`);
  }
  assert.ok(tierPower(7) / tierPower(4) > 2.3 && tierPower(12) / tierPower(7) > 3.2);
  assert.ok(Math.abs(tierPower(17) / tierPower(16) - 1.2) < 1e-9);
});

test('price follows power (≈ power^1.05): a Tier XIX costs ~130× a Tier I for ~105× the power – nearly the same value per coin', () => {
  const eff = (t) => tierPower(t) / tierPrice(t);
  for (let t = 2; t <= 20; t++) assert.ok(tierPrice(t) > tierPrice(t - 1));
  // power per coin drifts down only slightly with tier (one tile, better upgrades, and the same efficiency)
  assert.ok(eff(19) / eff(1) > 0.75, `T19 efficiency ${(eff(19) / eff(1)).toFixed(2)} of T1`);
  // early game stays cheap
  assert.ok(tierPrice(1) === 20 && tierPrice(3) < 55 && tierPrice(5) < 110);
});

test('every unit is generated from its tier profile (no hand-picked stat tables)', () => {
  for (const def of ROSTER) {
    assert.ok(def.profile && def.profile.tier === def.tier, `${def.id} has a tier profile`);
    const L0 = def.levels[0];
    const expected = profileDps(def.tier, def.profile) / (def.profile.rate * def.profile.hits);
    assert.ok(Math.abs(L0.damage - expected) / expected < 0.05, `${def.id} damage comes from the budget`);
  }
});

test('same profile, higher tier: more damage, and upgrades grow faster', () => {
  for (const profile of [{ range: 100 }, { range: 150, splash: 40 }, { range: 120, role: 'support' }]) {
    for (let t = 2; t <= 20; t++) assert.ok(profileDps(t, profile) > profileDps(t - 1, profile), `T${t}`);
  }
  for (let t = 2; t <= 20; t++) assert.ok(tierDamageGrowth(t) >= tierDamageGrowth(t - 1));
  assert.ok(tierDamageGrowth(1) > 1.15);
});

/** Raw stat value without abilities or passives: single-target DPS, and a crowd model for splash. */
function rawValue(def, level = 0) {
  const s = levelStats(def, level);
  const hits = def.profile.hits;
  const single = s.damage * s.rate * hits;
  const tiles = s.splash / 32;
  const crowd = single * (1 + BALANCE.splashFalloff * Math.min(8, Math.PI * tiles * tiles));
  return Math.sqrt(single * crowd);
}

test('raw combat stats: every T3 unit beats every T1 unit, at level 0 and at max level', () => {
  const t1 = ROSTER.filter((d) => d.tier === 1);
  const t3 = ROSTER.filter((d) => d.tier === 3);
  for (const lv of [0, 5]) {
    const best1 = Math.max(...t1.map((d) => rawValue(d, lv)));
    for (const d of t3) assert.ok(rawValue(d, lv) > best1, `${d.id} Lv ${lv}: ${rawValue(d, lv).toFixed(1)} vs best T1 ${best1.toFixed(1)}`);
  }
});

test('prices rise with tier (Colonel is deliberately cheap); upgrades cost more at higher tiers', () => {
  const byTier = new Map();
  for (const d of ROSTER) if (d.id !== 'colonel') (byTier.get(d.tier) ?? byTier.set(d.tier, []).get(d.tier)).push(d.price);
  const tiers = [...byTier.keys()].sort((a, b) => a - b);
  for (let i = 1; i < tiers.length; i++) {
    const avg = (t) => byTier.get(t).reduce((a, b) => a + b, 0) / byTier.get(t).length;
    assert.ok(avg(tiers[i]) > avg(tiers[i - 1]), `T${tiers[i]} costs more than T${tiers[i - 1]}`);
  }
  for (let t = 2; t <= 19; t++) assert.ok(tierPrice(t) > tierPrice(t - 1));
  for (const d of ROSTER) for (let l = 1; l <= maxLevel(d); l++) assert.ok(d.levels[l].cost > (d.levels[l - 1].cost ?? 0), `${d.id} Lv ${l} cost rises`);
  void TIERS;
});

import { BENCH, ownCombat } from '../src/meta/sideTierBench.js';
import { getUnit } from '../src/units/unitRegistry.js';

/** Own fighting value of every unit in a real headless battle (wave 1, level 0), relative to the Cadet. */
function measureOwn() {
  const saved = { wave: BENCH.wave, s: BENCH.singleTime, p: BENCH.packTime };
  Object.assign(BENCH, { wave: 1, singleTime: 40, packTime: 40 });
  try {
    const ref = ownCombat(getUnit('cadet'));
    return ROSTER.map((d) => {
      const def = getUnit(d.id);
      const role = def.profile?.role ?? 'gunner';
      return { id: def.id, tier: def.tier, role, value: ownCombat(def, ref).value, target: tierPower(def.tier) * (TIERS.roles[role] ?? 1) };
    });
  } finally {
    Object.assign(BENCH, { wave: saved.wave, singleTime: saved.s, packTime: saved.p });
  }
}

test('measured own combat value (real simulation, damage abilities included) matches each tier budget × role share', () => {
  const res = measureOwn().filter((r) => r.id !== 'dude'); // Dude is weak alone by design (Dude Power scales with copies)
  for (const r of res) assert.ok(Math.abs(r.value / r.target - 1) < 0.1, `${r.id}: ${r.value.toFixed(2)} vs ${r.target.toFixed(2)}`);
  const tiers = [...new Set(res.map((r) => r.tier))].sort((a, b) => a - b);
  // tier averages compare role-normalised power (a support unit's own share is smaller by design)
  const share = (r) => TIERS.roles[r.role] ?? 1;
  const avg = (t) => res.filter((r) => r.tier === t).reduce((a, r) => a + r.value / share(r), 0) / res.filter((r) => r.tier === t).length;
  for (let i = 1; i < tiers.length; i++) assert.ok(avg(tiers[i]) > avg(tiers[i - 1]) * 1.15, `T${tiers[i]} clearly above T${tiers[i - 1]}`);
  assert.ok(avg(7) > 2 * avg(4), `T7 ${avg(7).toFixed(1)} vs T4 ${avg(4).toFixed(1)}`);
  assert.ok(avg(12) > 3 * avg(7), `T12 ${avg(12).toFixed(1)} vs T7 ${avg(7).toFixed(1)}`);
  // direct combat: any unit two or more tiers higher out-fights any lower unit, whatever the roles
  for (const hi of res) for (const lo of res) if (hi.tier - lo.tier >= 2) assert.ok(hi.value > lo.value, `${hi.id} (T${hi.tier}) vs ${lo.id} (T${lo.tier})`);
});

test('baseline stats alone (no abilities) rise with tier: every unit beats every unit 3+ tiers below it', () => {
  const raw = ROSTER.map((d) => ({ id: d.id, tier: d.tier, v: rawValue(d) }));
  for (const hi of raw) for (const lo of raw) if (hi.tier - lo.tier >= 3) assert.ok(hi.v > lo.v, `${hi.id} T${hi.tier} ${hi.v.toFixed(1)} vs ${lo.id} T${lo.tier} ${lo.v.toFixed(1)}`);
});
