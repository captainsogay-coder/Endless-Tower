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
    assert.equal(p.balance('tokens'), 10000 - 150 * n + r.compensation, 'charged exactly price × count (duplicates then refunded)');
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

import { ADVANCED_MILITARY_CIRCLE, duplicateCompensation, summonValueInTokens, SUMMON_CONFIG } from '../src/units/summoning.js';

test('Advanced Military Circle: 250 Tokens, exact odds including 0.5% Fortress', () => {
  const adv = getBanner(ADVANCED_MILITARY_CIRCLE);
  assert.equal(adv.price, 250);
  assert.deepEqual(adv.pool.map((p) => [p.unit, p.chance]), [['special-forces', 0.4], ['drone', 0.3], ['commander', 0.1], ['colonel', 0.12], ['general', 0.075], ['fortress', 0.005]]);
  const rng = createRng(2024);
  const n = 1_000_000;
  const counts = {};
  for (let i = 0; i < n; i++) {
    const u = pull(adv, rng).unit;
    counts[u] = (counts[u] ?? 0) + 1;
  }
  for (const p of adv.pool) {
    const sd = Math.sqrt((p.chance * (1 - p.chance)) / n);
    assert.ok(Math.abs(counts[p.unit] / n - p.chance) < 5 * sd, `${p.unit}: ${counts[p.unit] / n}`);
  }
});

test('duplicates pay 30% of the circle value in Tokens, consistently across x1 and multi-summons', () => {
  assert.equal(duplicateCompensation(banner), 45);
  assert.equal(duplicateCompensation(getBanner(ADVANCED_MILITARY_CIRCLE)), 75);
  const p = fresh(0);
  p.data.wallet.tokens = 150 * 25 * 4;
  const rng = createRng(77);
  let paid = 0;
  for (const n of [1, 5, 10, 25]) {
    const before = p.balance('tokens');
    const r = summon(p, banner, n, rng);
    const dupes = r.results.filter((x) => !x.isNew).length;
    assert.equal(r.compensation, dupes * 45);
    assert.ok(r.results.every((x) => x.compensation === (x.isNew ? 0 : 45)));
    assert.equal(p.balance('tokens'), before - 150 * n + dupes * 45);
    paid += r.compensation;
  }
  assert.ok(paid > 0);
});

test('a duplicate within the same multi-summon counts once as new, then as duplicate', () => {
  const p = fresh(150 * 25);
  const r = summon(p, banner, 25, createRng(1));
  const firstCadet = r.results.findIndex((x) => x.unit === 'cadet');
  assert.equal(r.results[firstCadet].isNew, true);
  assert.ok(r.results.slice(firstCadet + 1).filter((x) => x.unit === 'cadet').every((x) => !x.isNew && x.compensation === 45));
});

test('duplicate compensation is 30% of the Token price for every circle', () => {
  for (const [price, comp] of [[150, 45], [250, 75], [300, 90], [500, 150]]) {
    assert.equal(summonValueInTokens({ price }), price);
    assert.equal(duplicateCompensation({ price }), Math.round(price * SUMMON_CONFIG.duplicateCompensation));
    assert.equal(duplicateCompensation({ price }), comp);
  }
});

test('results at or below 1% are flagged rare; the flag never changes the outcome', () => {
  const adv = getBanner(ADVANCED_MILITARY_CIRCLE);
  const p = fresh(250 * 25 * 40);
  const rng = createRng(5);
  let fortress = 0;
  let rareFlags = 0;
  for (let i = 0; i < 40; i++) {
    for (const r of summon(p, adv, 25, rng).results) {
      if (r.unit === 'fortress') fortress++;
      if (r.rare) rareFlags++;
      assert.equal(r.rare, r.chance <= 0.01);
    }
  }
  assert.equal(rareFlags, fortress);
});
