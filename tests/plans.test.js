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

import { filterRoster, SORT_MODES } from '../src/meta/rosterOrder.js';
import { sideTiers, ratingKey } from '../src/meta/sideTiers.js';
import { listCirclesByPrice, getBanner } from '../src/units/summoning.js';

const everything = () => {
  const p = fresh();
  for (const d of ROSTER) p.recordSummon(d.id);
  return p;
};

test('Auto Pick with a priority: ranks by that side tier first (N/A last), then overall tier; owned, unique, max 12', () => {
  const p = everything();
  const owned = p.data.unlocked.map(getUnit);
  for (const cat of ['dps', 'aoe', 'summon', 'empower', 'economy']) {
    const plan = autoBuildPlan(owned, { ...ctx(p), primary: cat });
    assert.equal(plan.length, 12);
    assert.equal(new Set(plan).size, 12);
    const keys = plan.map((id) => ratingKey(sideTiers(id)[cat]));
    for (let i = 1; i < keys.length; i++) assert.ok(keys[i] <= keys[i - 1], `${cat} order at ${i}`);
    const best = Math.max(...owned.map((d) => ratingKey(sideTiers(d)[cat])));
    assert.equal(keys[0], best, `${cat}: the strongest owned unit comes first`);
    // nothing left out beats the weakest pick in that category
    const cut = keys.at(-1);
    for (const d of owned) if (!plan.includes(d.id)) assert.ok(ratingKey(sideTiers(d)[cat]) <= cut, `${d.id} skipped in ${cat}`);
  }
  // rated units come before N/A ones; N/A slots are filled by overall strength
  const summon = autoBuildPlan(owned, { ...ctx(p), primary: 'summon' });
  const rated = owned.filter((d) => sideTiers(d).summon != null).length;
  assert.ok(summon.slice(0, rated).every((id) => sideTiers(id).summon != null));
  const filler = summon.slice(rated).map(getUnit);
  for (let i = 1; i < filler.length; i++) assert.ok(filler[i].tier <= filler[i - 1].tier);
});

test('Auto Pick secondary priority breaks ties and orders the N/A remainder; no priority = original Auto Build', () => {
  const p = everything();
  const owned = p.data.unlocked.map(getUnit);
  const econDps = autoBuildPlan(owned, { ...ctx(p), primary: 'economy', secondary: 'dps' });
  const earners = owned.filter((d) => sideTiers(d).economy != null).length;
  const rest = econDps.slice(earners).map((id) => sideTiers(id).dps);
  for (let i = 1; i < rest.length; i++) assert.ok(rest[i] <= rest[i - 1], 'after the earners, highest DPS first');
  assert.deepEqual(autoBuildPlan(owned, { ...ctx(p), primary: 'economy', secondary: 'economy' }), autoBuildPlan(owned, { ...ctx(p), primary: 'economy' }));
  assert.deepEqual(autoBuildPlan(owned, { ...ctx(p), primary: null }), autoBuildPlan(owned, ctx(p)), 'balanced = classic Auto Build');
  // only owned units, even with priorities
  const few = fresh();
  few.recordSummon('colonel');
  assert.deepEqual([...autoBuildPlan(few.data.unlocked.map(getUnit), { ...ctx(few), primary: 'economy', secondary: 'empower' })].sort(), ['cadet', 'colonel', 'dude']);
  assert.equal(autoBuildPlan(few.data.unlocked.map(getUnit), { ...ctx(few), primary: 'economy' })[0], 'colonel');
});

test('collection filters: side tier, circle, ownership; sorting by any side tier keeps pinned first', () => {
  const p = fresh();
  for (const id of ['colonel', 'bomber', 'trebuchet', 'farmer']) p.recordSummon(id);
  const all = ROSTER.map((d) => getUnit(d.id));
  const circleOf = (id) => listCirclesByPrice().find((b) => b.pool.some((e) => e.unit === id)) ?? null;
  const f = (o) => filterRoster(all, { isOwned: (id) => p.isUnlocked(id), circleOf, ...o }).map((d) => d.id);
  assert.deepEqual(f({ side: 'economy', ownership: 'owned' }), ['colonel']);
  assert.ok(f({ side: 'aoe', ownership: 'locked' }).every((id) => sideTiers(id).aoe != null && !p.isUnlocked(id)));
  assert.deepEqual(f({ circle: 'starter' }), ['dude']);
  assert.deepEqual(f({ circle: 'siege-workshop-circle' }), getBanner('siege-workshop-circle').pool.map((e) => e.unit).filter((id) => f({}).includes(id)));
  assert.equal(f({}).length, all.length);
  assert.ok(SORT_MODES.includes('economy') && SORT_MODES.includes('tier'));
  p.toggleFavorite('farmer');
  const owned = p.data.unlocked.map(getUnit);
  for (const mode of SORT_MODES) {
    const order = sortRoster(owned, { ...ctx(p), mode }).map((d) => d.id);
    assert.equal(order[0], 'farmer', `${mode}: pinned first`);
  }
  const byAoe = sortRoster(owned, { ...ctx(p), mode: 'aoe' }).slice(1).map((d) => ratingKey(sideTiers(d).aoe));
  for (let i = 1; i < byAoe.length; i++) assert.ok(byAoe[i] <= byAoe[i - 1]);
});

test('circles are listed by Token price, cheapest first, stable for equal prices, all Tokens', () => {
  const list = listCirclesByPrice();
  assert.equal(list.length, 8);
  for (let i = 1; i < list.length; i++) assert.ok(list[i].price >= list[i - 1].price);
  assert.deepEqual(list.map((b) => b.price), [100, 150, 250, 250, 300, 300, 400, 500]);
  // equal prices keep registration order: Advanced (registered first) before Town Guard; Wild West before Gambino
  assert.deepEqual(list.map((b) => b.id).slice(2, 6), ['advanced-military-circle', 'town-guard-circle', 'wild-west-circle', 'gambino-circle']);
  assert.ok(list.every((b) => b.currency === 'tokens'));
});

test('profile keeps sort, filters and Auto Pick priorities, and sanitises junk', () => {
  const storage = memoryStorage();
  const p = fresh(storage);
  p.data.rosterSort = 'economy';
  p.data.rosterFilter = { ownership: 'owned', circle: 'gambino-circle', side: 'aoe' };
  p.data.autoPick = { primary: 'economy', secondary: 'dps' };
  p.save();
  const q = fresh(storage);
  assert.equal(q.data.rosterSort, 'economy');
  assert.deepEqual(q.data.rosterFilter, { ownership: 'owned', circle: 'gambino-circle', side: 'aoe' });
  assert.deepEqual(q.data.autoPick, { primary: 'economy', secondary: 'dps' });
  storage.setItem('endless-tower/profile/v1', JSON.stringify({ ...q.data, rosterSort: 'gems', rosterFilter: { ownership: 'x', side: 'magic' }, autoPick: { primary: 'gold' } }));
  const r = fresh(storage);
  assert.equal(r.data.rosterSort, 'tier');
  assert.deepEqual(r.data.rosterFilter, { ownership: 'all', circle: 'all', side: null });
  assert.deepEqual(r.data.autoPick, { primary: null, secondary: null });
});
