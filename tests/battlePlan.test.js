import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createPlan, addToPlan, removeFromPlan, togglePlan, validatePlan, MAX_PLAN_TYPES } from '../src/meta/battlePlan.js';
import { Profile, memoryStorage, PROFILE_KEY } from '../src/meta/profile.js';

const ids = Array.from({ length: 14 }, (_, i) => `u${i}`);
const env = { isKnown: (id) => ids.includes(id) || id === 'dude', isUnlocked: () => true };

test('a plan holds at most 12 distinct unit types', () => {
  assert.equal(MAX_PLAN_TYPES, 12);
  const p = createPlan('Test');
  for (let i = 0; i < 12; i++) assert.ok(addToPlan(p, ids[i]).ok);
  assert.deepEqual(addToPlan(p, ids[12]), { ok: false, reason: 'full' });
  assert.equal(p.units.length, 12);
});

test('duplicates are rejected and toggling selects / deselects', () => {
  const p = createPlan('Test');
  assert.ok(addToPlan(p, 'dude').ok);
  assert.deepEqual(addToPlan(p, 'dude'), { ok: false, reason: 'duplicate' });
  assert.ok(togglePlan(p, 'dude').removed);
  assert.equal(p.units.length, 0);
  assert.ok(!togglePlan(p, 'dude').removed);
  assert.ok(removeFromPlan(p, 'dude').ok);
  assert.equal(removeFromPlan(p, 'dude').ok, false);
});

test('validation requires at least one known, unlocked unit', () => {
  assert.equal(validatePlan(createPlan('x'), env).ok, false);
  assert.deepEqual(validatePlan(createPlan('x', ['dude']), env), { ok: true, errors: [], ids: ['dude'] });
  const v = validatePlan({ name: 'x', units: ['dude', 'ghost'] }, env);
  assert.equal(v.ok, false);
  assert.deepEqual(v.ids, ['dude']);
  const locked = validatePlan(createPlan('x', ['dude']), { ...env, isUnlocked: () => false });
  assert.equal(locked.ok, false);
});

test('profile persists the plan and unlocks, and repairs bad data', () => {
  const storage = memoryStorage();
  const p1 = new Profile({ storage, starterUnits: ['dude'] });
  assert.ok(p1.isUnlocked('dude'));
  addToPlan(p1.plan, 'dude');
  p1.plan.name = 'Night Shift';
  p1.recordBattle(17);
  const p2 = new Profile({ storage, starterUnits: ['dude'] });
  assert.deepEqual(p2.plan.units, ['dude']);
  assert.equal(p2.plan.name, 'Night Shift');
  assert.equal(p2.data.bestWave, 17);
  storage.setItem(PROFILE_KEY, '{broken');
  const p3 = new Profile({ storage, starterUnits: ['dude'] });
  assert.deepEqual(p3.plan.units, []);
  assert.ok(p3.isUnlocked('dude'));
});
