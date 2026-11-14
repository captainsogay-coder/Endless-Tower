import { test } from 'node:test';
import assert from 'node:assert/strict';
import { registerRoster, ROSTER } from '../src/units/roster.js';
import { getUnit } from '../src/units/unitRegistry.js';
import { Profile, memoryStorage } from '../src/meta/profile.js';
import { sortRoster, autoBuildPlan, planDiff, combatScore } from '../src/meta/rosterOrder.js';
import { createPlan, togglePlan, MAX_PLAN_TYPES } from '../src/meta/battlePlan.js';

registerRoster();
const fresh = (storage = memoryStorage()) => new Profile({ storage, starterUnits: ['dude', 'cadet'] });
const ctx = (p, mode) => ({ isFavorite: (id) => p.isFavorite(id), acquiredIndex: (id) => p.acquiredIndex(id), mode });

test('favorites: owned types only, toggle on/off, persist across reloads, never touch the plan', () => {
  const storage = memoryStorage();
  const p = fresh(storage);
  p.recordSummon('ballista');
  p.recordSummon('ballista'); // two copies: still one favorite (types, not copies)
  p.data.plan = createPlan('Mine', ['dude']);
  p.save();
  assert.equal(p.toggleFavorite('trebuchet'), null, 'unowned units cannot be pinned');
  assert.equal(p.toggleFavorite('ballista'), true);
  assert.equal(p.toggleFavorite('cadet'), true);
  assert.deepEqual(p.data.favorites, ['ballista', 'cadet']);
  assert.deepEqual(p.data.plan.units, ['dude'], 'pinning never uses a plan slot');
  const again = fresh(storage);
  assert.deepEqual(again.data.favorites, ['ballista', 'cadet'], 'persisted');
  assert.equal(again.toggleFavorite('ballista'), false, 'unpin any time');
  assert.deepEqual(fresh(storage).data.favorites, ['cadet']);
  storage.setItem('endless-tower/profile/v1', JSON.stringify({ ...JSON.parse(storage.getItem('endless-tower/profile/v1')), favorites: ['cadet', 'cadet', 7], rosterSort: 'nonsense' }));
  const sane = fresh(storage);
  assert.deepEqual(sane.data.favorites, ['cadet']);
  assert.equal(sane.data.rosterSort, 'tier');
});

test('roster sort: pinned first in both modes; tier mode is tier desc then strength; acquired mode keeps acquisition order', () => {
  const p = fresh();
  for (const id of ['farmer', 'trebuchet', 'slingman', 'ballista', 'guard-recruit']) p.recordSummon(id);
  const owned = p.data.unlocked.map(getUnit);
  p.toggleFavorite('farmer');
  p.toggleFavorite('slingman');
  const byTier = sortRoster(owned, ctx(p, 'tier')).map((d) => d.id);
  assert.deepEqual(byTier.slice(0, 2), ['slingman', 'farmer'], 'pinned first (T2 before T1)');
  const rest = byTier.slice(2).map(getUnit);
  for (let i = 1; i < rest.length; i++) {
    const [a, b] = [rest[i - 1], rest[i]];
    assert.ok(a.tier > b.tier || (a.tier === b.tier && combatScore(a) >= combatScore(b)), `${a.id} before ${b.id}`);
  }
  assert.equal(rest[0].id, 'trebuchet');
  const byAcq = sortRoster(owned, ctx(p, 'acquired')).map((d) => d.id);
  assert.deepEqual(byAcq, ['farmer', 'slingman', 'dude', 'cadet', 'trebuchet', 'ballista', 'guard-recruit']);
});

test('Auto Build: owned only, tier desc, combat score, then acquisition; unique; capped at 12', () => {
  const p = fresh();
  const all = ROSTER.map((d) => d.id);
  for (const id of all) p.recordSummon(id);
  const plan = autoBuildPlan(p.data.unlocked.map(getUnit), ctx(p));
  assert.equal(plan.length, MAX_PLAN_TYPES);
  assert.equal(new Set(plan).size, plan.length);
  const defs = plan.map(getUnit);
  for (let i = 1; i < defs.length; i++) {
    const [a, b] = [defs[i - 1], defs[i]];
    assert.ok(a.tier > b.tier || (a.tier === b.tier && combatScore(a) >= combatScore(b)), `${a.id} before ${b.id}`);
  }
  const cutoff = defs.at(-1);
  for (const d of ROSTER) {
    if (plan.includes(d.id)) continue;
    assert.ok(d.tier < cutoff.tier || (d.tier === cutoff.tier && combatScore(d) <= combatScore(cutoff)), `${d.id} should not beat ${cutoff.id}`);
  }
  assert.ok(!plan.includes('mini-ballista'), 'never temporary allies');
});

test('Auto Build: fewer than 12 owned fills only what exists; duplicate copies count once; ties go to acquisition order', () => {
  const p = fresh();
  p.recordSummon('farmer');
  p.recordSummon('farmer');
  const plan = autoBuildPlan([...p.data.unlocked.map(getUnit), getUnit('farmer')], ctx(p));
  assert.deepEqual([...plan].sort(), ['cadet', 'dude', 'farmer']);
  const twin = { ...getUnit('farmer'), id: 'farmer-b' };
  const idx = { farmer: 5, 'farmer-b': 2 };
  assert.deepEqual(autoBuildPlan([getUnit('farmer'), twin], { acquiredIndex: (id) => idx[id] }), ['farmer-b', 'farmer']);
  assert.deepEqual(autoBuildPlan([], ctx(p)), []);
});

test('planDiff reports added, replaced and kept units; Undo restores the saved plan exactly', () => {
  assert.deepEqual(planDiff(['a', 'b', 'c'], ['c', 'd']), { added: ['d'], removed: ['a', 'b'], kept: ['c'] });
  const storage = memoryStorage();
  const p = fresh(storage);
  p.recordSummon('ballista');
  const plan = createPlan('Manual', []);
  assert.equal(togglePlan(plan, 'cadet').ok, true);
  p.data.plan = plan;
  p.data.planBackup = createPlan(plan.name, plan.units);
  p.data.plan = createPlan(plan.name, autoBuildPlan(p.data.unlocked.map(getUnit), ctx(p)));
  p.save();
  const r = fresh(storage);
  assert.deepEqual(r.data.planBackup.units, ['cadet'], 'backup persists for Undo');
  assert.equal(r.data.plan.units[0], 'ballista');
  assert.equal(r.balance('tokens'), 0);
  assert.deepEqual(r.data.owned, p.data.owned, 'Auto Build never changes ownership');
});
