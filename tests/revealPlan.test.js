// Cinematic summon timing: every reveal 3–10 s, a batch is one 4–9 s sequence,
// rarer results take longer, and units are granted before the reveal.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { revealPlan, rarityOf, headline, LIMITS } from '../src/units/revealPlan.js';
import { registerRoster } from '../src/units/roster.js';
import { getBanner, summon } from '../src/units/summoning.js';
import { Profile, memoryStorage } from '../src/meta/profile.js';
import { createRng } from '../src/core/rng.js';

registerRoster();
const R = (tier, chance, rare = false) => ({ unit: 'cadet', tier, chance, rare, isNew: true, compensation: 0 });

test('rarity classes: super chase (0.1%), chase, high tier, common', () => {
  assert.equal(rarityOf(R(25, 0.001, true)), 'super');
  assert.equal(rarityOf(R(17, 0.005, true)), 'chase');
  assert.equal(rarityOf(R(12, 0.05)), 'high');
  assert.equal(rarityOf(R(2, 0.3)), 'common');
});

test('single summons: longer than 3 s, at most 10 s, and rarer reveals take longer', () => {
  const plans = [R(2, 0.3), R(12, 0.05), R(17, 0.005, true), R(25, 0.001, true)].map((r) => revealPlan([r]).total);
  for (const t of plans) assert.ok(t > LIMITS.min && t <= LIMITS.max, `${t}`);
  for (let i = 1; i < plans.length; i++) assert.ok(plans[i] > plans[i - 1]);
  assert.ok(plans[0] >= 4 && plans[3] <= 9, 'targets 4–9 s');
});

test('batches are one sequence of 4–9 s whatever the size, with extra emphasis for chase results', () => {
  for (const n of [5, 10, 25]) {
    const plain = revealPlan(Array.from({ length: n }, () => R(3, 0.2)));
    const chase = revealPlan([...Array.from({ length: n - 1 }, () => R(3, 0.2)), R(19, 0.003, true)]);
    const sup = revealPlan([...Array.from({ length: n - 1 }, () => R(3, 0.2)), R(25, 0.001, true)]);
    for (const p of [plain, chase, sup]) {
      assert.equal(p.mode, 'batch');
      assert.ok(p.total >= LIMITS.batchMin && p.total <= LIMITS.batchMax, `${n}: ${p.total}`);
    }
    assert.ok(chase.total > plain.total && sup.total > chase.total);
    assert.equal(sup.headline.tier, 25, 'the build-up is for the best result');
  }
  assert.equal(headline([R(5, 0.1), R(10, 0.02, true), R(14, 0.05)]).tier, 10, 'chase beats a higher plain tier');
});

test('units are granted before the cinematic starts', () => {
  const p = new Profile({ storage: memoryStorage(), starterUnits: ['dude'] });
  const b = getBanner('the-ghost-circle');
  p.earn('tokens', b.price * 10);
  const res = summon(p, b, 10, createRng(1));
  for (const r of res.results) assert.ok(p.isUnlocked(r.unit), `${r.unit} unlocked immediately`);
});
