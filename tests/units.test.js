import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getTier, defineTier } from '../src/units/tiers.js';
import { registerUnit, getUnit, validateUnitDef } from '../src/units/unitRegistry.js';
import { ROSTER, registerRoster } from '../src/units/roster.js';
import { levelStats, upgradeCost, maxLevel, applyPassive } from '../src/units/unitStats.js';
import dude, { dudePowerMultiplier } from '../src/units/defs/dude.js';

registerRoster();

test("roster: Dude plus every circle's units, all valid", () => {
  assert.deepEqual(ROSTER.map((d) => d.id).slice(0, 11), ['dude', 'cadet', 'gunnerman', 'grenade-launcher', 'tank', 'special-forces', 'drone', 'commander', 'colonel', 'general', 'fortress']);
  assert.equal(ROSTER.length, 11 + 8 + 7 + 9 + 6 + 7 + 7);
  assert.equal(new Set(ROSTER.map((d) => d.id)).size, ROSTER.length, 'unique ids');
  for (const d of ROSTER) assert.deepEqual(validateUnitDef(d), [], d.id);
  assert.deepEqual(validateUnitDef(dude), []);
  assert.equal(getUnit('dude').tier, 1);
});

test('Dude is cheap, short-ranged and low damage', () => {
  const s = levelStats(dude, 0);
  assert.ok(dude.price <= 20);
  assert.ok(s.range <= 2.5 * 32);
  const c = levelStats(getUnit('cadet'), 0);
  assert.ok(s.damage * s.rate < c.damage * c.rate, 'weaker alone than the Cadet (Dude Power makes up for it in numbers)');
  assert.ok(dude.price < getUnit('cadet').price);
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

test('invalid unit definitions are rejected', () => {
  assert.throws(() => registerUnit({ id: 'bad', name: 'Bad', tier: 0, price: 1, levels: [] }));
  assert.throws(() => registerUnit({ id: 'bad2', name: 'Bad', tier: 1, price: 1, levels: [{ damage: 1, range: 1, rate: 1 }, { damage: 2, range: 1, rate: 1 }] }));
});

test('new units match their brief', () => {
  const s0 = (id) => levelStats(getUnit(id), 0);
  const dps = (id) => s0(id).damage * s0(id).rate;
  assert.deepEqual(['cadet', 'gunnerman', 'grenade-launcher', 'tank'].map((id) => getUnit(id).tier), [1, 2, 3, 5]);
  assert.ok(dps('cadet') > dps('dude') && s0('cadet').range > s0('dude').range, 'Cadet beats Dude on DPS and range');
  assert.ok(dps('gunnerman') > dps('cadet') && s0('gunnerman').range > s0('cadet').range, 'Gunnerman: DPS focus, good range');
  assert.ok(s0('grenade-launcher').splash > 0 && s0('grenade-launcher').rate < 0.7 && s0('grenade-launcher').rate < s0('cadet').rate / 2, 'Grenade: small AoE, slow cooldown');
  assert.ok(s0('tank').damage > s0('grenade-launcher').damage && s0('tank').range > s0('grenade-launcher').range, 'Tank out-hits the grenadier');
  assert.ok(s0('tank').splash > 0 && getUnit('tank').impactHazard && getUnit('tank').buffs?.length);
  for (const d of ROSTER) assert.equal(maxLevel(d), 5, `${d.id} has 5 upgrade levels`);
});
