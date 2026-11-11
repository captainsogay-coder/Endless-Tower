import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getTier, defineTier } from '../src/units/tiers.js';
import { Summoner } from '../src/units/summoning.js';
import { registerUnit, getUnit, validateUnitDef } from '../src/units/unitRegistry.js';
import { ROSTER, registerRoster } from '../src/units/roster.js';
import { levelStats, upgradeCost, maxLevel, applyPassive } from '../src/units/unitStats.js';
import dude, { dudePowerMultiplier } from '../src/units/defs/dude.js';

registerRoster();

test('Dude is the first and only roster unit', () => {
  assert.deepEqual(ROSTER.map((d) => d.id), ['dude']);
  assert.deepEqual(validateUnitDef(dude), []);
  assert.equal(getUnit('dude').tier, 1);
});

test('Dude is cheap, short-ranged and low damage', () => {
  const s = levelStats(dude, 0);
  assert.ok(dude.price <= 20);
  assert.ok(s.range <= 2.5 * 32);
  assert.ok(s.damage <= 5);
});

test('Dude has five upgrade levels that each improve him', () => {
  assert.equal(maxLevel(dude), 5);
  const dps = (l) => levelStats(dude, l).damage * levelStats(dude, l).rate;
  for (let l = 0; l < 5; l++) {
    assert.ok(upgradeCost(dude, l) > 0);
    assert.ok(dps(l + 1) > dps(l), `level ${l + 1} is stronger`);
    assert.ok(levelStats(dude, l + 1).range >= levelStats(dude, l).range);
  }
  assert.equal(upgradeCost(dude, 5), null);
});

test('Dude Power follows Damage × [1 + 0.10 × (deployed − 1)]', () => {
  assert.equal(dudePowerMultiplier(1), 1);
  assert.ok(Math.abs(dudePowerMultiplier(2) - 1.1) < 1e-9);
  assert.ok(Math.abs(dudePowerMultiplier(4) - 1.3) < 1e-9);
  assert.ok(Math.abs(dudePowerMultiplier(101) - 11) < 1e-9);
  for (let l = 0; l <= 5; l++) {
    const s = applyPassive(dude, levelStats(dude, l), { deployed: 3 });
    assert.ok(Math.abs(s.damage - levelStats(dude, l).damage * 1.2) < 1e-9, 'passive holds at every level');
  }
});

test('tiers are unbounded and increase in power', () => {
  let prev = 0;
  for (const n of [1, 2, 3, 10, 50, 500, 5000]) {
    const t = getTier(n);
    assert.equal(t.index, n);
    assert.ok(t.power > prev);
    prev = t.power;
  }
  assert.throws(() => getTier(0));
  defineTier(42, { label: 'Custom' });
  assert.equal(getTier(42).label, 'Custom');
});

test('summoning infrastructure rolls registered unit types with valid odds', () => {
  const s = new Summoner({ seed: 1 });
  const odds = s.odds(10);
  assert.ok(Math.abs(odds.reduce((a, o) => a + o.chance, 0) - 1) < 1e-9);
  assert.equal(s.roll(10).id, 'dude');
});

test('invalid unit definitions are rejected', () => {
  assert.throws(() => registerUnit({ id: 'bad', name: 'Bad', tier: 0, price: 1, levels: [] }));
  assert.throws(() => registerUnit({ id: 'bad2', name: 'Bad', tier: 1, price: 1, levels: [{ damage: 1, range: 1, rate: 1 }, { damage: 2, range: 1, rate: 1 }] }));
});
