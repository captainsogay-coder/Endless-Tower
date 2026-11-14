import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { registerRoster, ROSTER } from '../src/units/roster.js';
import { levelStats, maxLevel } from '../src/units/unitStats.js';
import { TIERS, tierPower, tierPrice, tierDamageGrowth, profileDps, BALANCE } from '../src/balance.js';

registerRoster();
const TARGET = { 1: 1, 2: 1.5, 3: 2.1, 4: 2.8, 5: 3.6, 6: 4.5, 7: 5.5, 8: 6.6, 9: 7.8, 10: 9.1, 11: 10.5, 12: 12, 13: 13.7, 14: 15.5, 15: 17.5 };

test('tier power budget follows the table and keeps growing (controlled) past T15', () => {
  for (const [t, v] of Object.entries(TARGET)) assert.equal(tierPower(Number(t)), v);
  let prevStep = tierPower(15) - tierPower(14);
  for (let t = 16; t <= 30; t++) {
    const step = tierPower(t) - tierPower(t - 1);
    assert.ok(step > prevStep && step < prevStep + 0.5, `T${t} step ${step}`);
    prevStep = step;
  }
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

test('measured battlefield value (real simulation, abilities included): tiers climb and match the budget', () => {
  const script = fileURLToPath(new URL('../scripts/balance.mjs', import.meta.url));
  const out = execFileSync(process.execPath, [script, 'tiers', '0', '--json'], { encoding: 'utf8' }).trim().split('\n').pop();
  const res = JSON.parse(out);
  const tiers = [...new Set(res.map((r) => r.tier))].sort((a, b) => a - b);
  const avg = (t) => res.filter((r) => r.tier === t).reduce((a, r) => a + r.value, 0) / res.filter((r) => r.tier === t).length;
  for (let i = 1; i < tiers.length; i++) assert.ok(avg(tiers[i]) > avg(tiers[i - 1]), `T${tiers[i]} (${avg(tiers[i]).toFixed(2)}) > T${tiers[i - 1]} (${avg(tiers[i - 1]).toFixed(2)})`);
  for (const t of tiers) {
    const target = tierPower(t);
    assert.ok(Math.abs(avg(t) / target - 1) < 0.15, `T${t} average ${avg(t).toFixed(2)} vs target ${target}`);
  }
  // unit by unit: within ±25% of the tier target (Dude is weak alone by design: Dude Power)
  for (const r of res) if (r.id !== 'dude') assert.ok(Math.abs(r.value / tierPower(r.tier) - 1) < 0.25, `${r.id}: ${r.value.toFixed(2)} vs ${tierPower(r.tier)}`);
  // every T3 beats every T1 in measured value
  const best1 = Math.max(...res.filter((r) => r.tier === 1).map((r) => r.value));
  for (const r of res.filter((x) => x.tier === 3)) assert.ok(r.value > best1, r.id);
});
