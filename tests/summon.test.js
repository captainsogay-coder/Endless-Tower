import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getBanner, MILITARY_CIRCLE, summon, summonCost, pull } from '../src/units/summoning.js';
import { Profile, memoryStorage } from '../src/meta/profile.js';
import { registerRoster, STARTER_UNITS } from '../src/units/roster.js';
import { createRng } from '../src/core/rng.js';
import { validatePlan, togglePlan } from '../src/meta/battlePlan.js';
import { getUnit } from '../src/units/unitRegistry.js';

registerRoster();
const banner = getBanner(MILITARY_CIRCLE);
const fresh = (tokens = 0, storage = memoryStorage()) => {
  const p = new Profile({ storage, starterUnits: STARTER_UNITS });
  p.earn('tokens', tokens);
  return p;
};

test('Military Summoning Circle: 150 Tokens per pull, x1/x5/x10/x25 priced exactly', () => {
  assert.equal(banner.currency, 'tokens');
  assert.equal(banner.price, 150);
  assert.deepEqual(banner.counts, [1, 5, 10, 25]);
  assert.deepEqual(banner.counts.map((n) => summonCost(banner, n)), [150, 750, 1500, 3750]);
  assert.deepEqual(banner.pool.map((p) => [p.unit, p.chance]), [['cadet', 0.5], ['gunnerman', 0.3], ['grenade-launcher', 0.15], ['tank', 0.05]]);
});

test('pull probabilities hold across many independent pulls', () => {
  const rng = createRng(12345);
  const n = 200000;
  const counts = {};
  for (let i = 0; i < n; i++) {
    const u = pull(banner, rng).unit;
    counts[u] = (counts[u] ?? 0) + 1;
  }
  for (const p of banner.pool) {
    const observed = counts[p.unit] / n;
    const sd = Math.sqrt((p.chance * (1 - p.chance)) / n);
    assert.ok(Math.abs(observed - p.chance) < 5 * sd, `${p.unit}: ${observed} vs ${p.chance}`);
  }
});

test('each multi-summon performs that many pulls and charges exactly price × count', () => {
  for (const n of [1, 5, 10, 25]) {
    const p = fresh(10000);
    const r = summon(p, banner, n, createRng(n));
    assert.ok(r.ok);
    assert.equal(r.results.length, n);
    assert.equal(r.cost, 150 * n);
    assert.equal(p.balance('tokens'), 10000 - 150 * n);
  }
});

test('insufficient Tokens: nothing is charged and nothing is pulled', () => {
  const p = fresh(749);
  const r = summon(p, banner, 5, createRng(1));
  assert.deepEqual(r, { ok: false, reason: 'insufficient', cost: 750 });
  assert.equal(p.balance('tokens'), 749);
  assert.deepEqual(p.data.unlocked, ['dude']);
  assert.equal(summon(p, banner, 3, createRng(1)).reason, 'invalid-count');
});

test('summoned units unlock permanently, duplicates do not duplicate plan entries', () => {
  const storage = memoryStorage();
  const p = fresh(150 * 200, storage);
  const rng = createRng(99);
  for (let i = 0; i < 8; i++) summon(p, banner, 25, rng);
  for (const id of ['cadet', 'gunnerman', 'grenade-launcher', 'tank']) assert.ok(p.isUnlocked(id), id);
  assert.equal(new Set(p.data.unlocked).size, p.data.unlocked.length, 'no duplicate unlocks');
  assert.ok(p.ownedCount('cadet') > 1, 'duplicates are counted');
  // Battle Plans accepts each type once
  for (const id of p.data.unlocked) togglePlan(p.plan, id);
  assert.equal(togglePlan(p.plan, 'cadet').removed, true);
  togglePlan(p.plan, 'cadet');
  const v = validatePlan(p.plan, { isKnown: (id) => !!getUnit(id), isUnlocked: (id) => p.isUnlocked(id) });
  assert.ok(v.ok);
  assert.equal(new Set(v.ids).size, v.ids.length);
  p.save();
  // persists across a restart
  const again = new Profile({ storage, starterUnits: STARTER_UNITS });
  assert.deepEqual(again.data.unlocked.sort(), p.data.unlocked.sort());
  assert.equal(again.balance('tokens'), p.balance('tokens'));
});

test('a locked unit cannot be put into battle', () => {
  const p = fresh(0);
  const v = validatePlan({ name: 'x', units: ['tank'] }, { isKnown: (id) => !!getUnit(id), isUnlocked: (id) => p.isUnlocked(id) });
  assert.equal(v.ok, false);
});
