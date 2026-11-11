import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { getTier, defineTier } from '../src/units/tiers.js';
import { Summoner } from '../src/units/summoning.js';
import { registerUnit, clearUnits, hasRoster } from '../src/units/unitRegistry.js';
import { ROSTER } from '../src/units/roster.js';

afterEach(() => clearUnits());

test('the shipped roster is empty – no units are pre-designed', () => {
  assert.equal(ROSTER.length, 0);
  assert.equal(hasRoster(), false);
});

test('tiers are unbounded and increase in power', () => {
  let prev = 0;
  for (const n of [1, 2, 3, 10, 50, 500, 5000]) {
    const t = getTier(n);
    assert.equal(t.index, n);
    assert.ok(t.power > prev);
    assert.ok(t.label.length > 0 && t.color.startsWith('#'));
    prev = t.power;
  }
  assert.throws(() => getTier(0));
});

test('tiers can be customised without touching other systems', () => {
  defineTier(42, { label: 'Custom', power: 7 });
  assert.equal(getTier(42).label, 'Custom');
  assert.equal(getTier(42).power, 7);
});

test('summon odds favour low tiers, sum to 1, and the ceiling rises endlessly', () => {
  const s = new Summoner({ seed: 1 });
  for (const wave of [1, 10, 50, 200]) {
    const odds = s.odds(wave);
    const sum = odds.reduce((a, o) => a + o.chance, 0);
    assert.ok(Math.abs(sum - 1) < 1e-9);
    for (let i = 1; i < odds.length; i++) assert.ok(odds[i].chance < odds[i - 1].chance);
  }
  assert.ok(s.maxTier(200) > s.maxTier(1));
});

test('with an empty roster, summons yield tiered prototype proxies', () => {
  const s = new Summoner({ seed: 9 });
  const tiers = new Set();
  for (let i = 0; i < 400; i++) {
    const u = s.roll(40);
    assert.ok(u.def.isProxy);
    tiers.add(u.tier);
  }
  assert.ok(tiers.size >= 3);
});

test('registered units replace proxies and respect tiers', () => {
  registerUnit({ id: 'test-a', name: 'Test A', tier: 1, stats: { damage: 1, range: 64, rate: 1 } });
  registerUnit({ id: 'test-b', name: 'Test B', tier: 2, stats: { damage: 2, range: 64, rate: 1 } });
  const s = new Summoner({ seed: 3 });
  const seen = new Set();
  for (let i = 0; i < 300; i++) {
    const u = s.roll(30);
    assert.ok(!u.def.isProxy);
    seen.add(u.def.id);
  }
  assert.deepEqual([...seen].sort(), ['test-a', 'test-b']);
  assert.throws(() => registerUnit({ id: 'bad', name: 'Bad', tier: 0, stats: {} }));
});
