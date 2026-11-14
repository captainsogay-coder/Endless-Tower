import { test } from 'node:test';
import assert from 'node:assert/strict';
import { registerRoster, ROSTER } from '../src/units/roster.js';
import { getUnit } from '../src/units/unitRegistry.js';
import { sideTiers, isStale, unitSignature, CATEGORIES, CATEGORY_IDS, ratingText, ratingDetail, bestSide } from '../src/meta/sideTiers.js';
import { benchContext, measureUnit } from '../src/meta/sideTierBench.js';
import { SIDE_TIER_DATA } from '../src/units/sideTiers.data.js';

registerRoster();

test('every unit has five side tiers and none is out of date with its current definition', () => {
  assert.deepEqual(CATEGORY_IDS, ['dps', 'aoe', 'summon', 'empower', 'economy']);
  for (const def of ROSTER) {
    assert.ok(SIDE_TIER_DATA.units[def.id], `${def.id} rated`);
    assert.ok(!isStale(def), `${def.id} ratings are stale – run npm run ratings`);
    const r = sideTiers(def);
    assert.deepEqual(Object.keys(r).sort(), [...CATEGORY_IDS].sort());
    for (const c of CATEGORY_IDS) assert.ok(r[c] === null || (r[c] >= 1 && r[c] < 40), `${def.id}.${c} = ${r[c]}`);
    assert.ok(r.dps >= 1, `${def.id} deals damage`);
  }
});

test('re-measuring every unit reproduces the stored table exactly (deterministic bench)', () => {
  const ctx = benchContext();
  for (const def of ROSTER) assert.deepEqual(measureUnit(def, ctx).ratings, SIDE_TIER_DATA.units[def.id].ratings, def.id);
});

test('N/A means no contribution: summon only for units that create allies or drones, economy only for real income', () => {
  for (const def of ROSTER) {
    const r = sideTiers(def);
    const summons = !!def.summon || ['outlaw-leader', 'special-force-battalion', 'master-engineer'].includes(def.id);
    assert.equal(r.summon !== null, summons, `${def.id} summon ${r.summon}`);
  }
  const earners = ['colonel', 'fortress', 'bounty-hunter', 'dealer', 'pit-boss', 'high-roller', 'the-house', 'marshal', 'glorious-leader', 'gambler'];
  for (const id of earners) assert.ok(sideTiers(id).economy >= 1, `${id} earns`);
  // high damage is not income
  for (const id of ['fastest-hand', 'kings-champion', 'trebuchet', 'sheriff', 'gunslinger', 'royal-patrol']) assert.equal(sideTiers(id).economy, null, id);
  // pure single-target units have no area rating
  for (const id of ['cadet', 'crossbowman', 'royal-patrol', 'fastest-hand', 'bounty-hunter']) assert.equal(sideTiers(id).aoe, null, id);
});

test('ratings are independent of each other and of the overall tier', () => {
  const r = (id) => sideTiers(id);
  assert.ok(r('colonel').economy > r('colonel').dps && r('colonel').empower > r('colonel').dps, 'Colonel: support and economy over damage');
  assert.ok(r('bomber').aoe > r('bomber').dps, 'Bomber: area over single target');
  assert.ok(r('outlaw-leader').summon > r('outlaw-leader').dps, 'Outlaw Leader: summons over own damage');
  assert.ok(r('fastest-hand').dps > r('the-house').dps, 'a Tier XII duelist out-damages the Tier XV House on one target');
  assert.equal(r('fastest-hand').aoe, null);
  assert.ok(r('the-house').aoe > 10);
  assert.ok(r('general').empower > r('commander').empower && r('commander').empower > r('tank').empower, 'stronger/wider buffs rate higher');
  assert.ok(r('grand-captain').empower > r('village-captain').empower, '+12% dmg/+8% speed beats +10% damage');
  assert.ok(r('glorious-leader').economy > r('colonel').economy, 'more income rates higher');
  // faction-only buffs count less than the same strength map-wide
  assert.ok(r('siege-commander').empower < r('colonel').empower);
  // overall tier alone does not decide anything: some Tier I–III units beat a Tier X unit in DPS
  assert.ok(r('bandit').dps > r('master-engineer').dps);
});

test('Economy is net of the unit price and ranks real income, not damage', () => {
  const raw = (id) => SIDE_TIER_DATA.units[id].raw;
  for (const def of ROSTER) {
    const x = raw(def.id);
    assert.ok(Math.abs(x.net - (x.grossPerMin * 3 - def.price)) <= 2, `${def.id}: net = 3 min of income − price`);
  }
  const byEco = ROSTER.filter((d) => sideTiers(d).economy != null).sort((a, b) => raw(b.id).net - raw(a.id).net).map((d) => d.id);
  const byRating = ROSTER.filter((d) => sideTiers(d).economy != null).sort((a, b) => sideTiers(b).economy - sideTiers(a).economy || raw(b.id).net - raw(a.id).net).map((d) => d.id);
  assert.deepEqual(byRating, byEco, 'economy rating order = net coin order');
});

test('changing a unit invalidates its stored ratings, and re-measuring reflects the change', () => {
  const ctx = benchContext();
  const bandit = getUnit('bandit');
  const before = measureUnit(bandit, ctx).ratings;
  const sig = unitSignature(bandit);
  const saved = bandit.levels.map((L) => L.damage);
  try {
    for (const L of bandit.levels) L.damage *= 3;
    assert.notEqual(unitSignature(bandit), sig);
    assert.ok(isStale(bandit), 'stale after a balance change');
    const after = measureUnit(bandit, ctx).ratings;
    assert.ok(after.dps > before.dps + 2, `${before.dps} → ${after.dps}`);
    assert.equal(after.economy, before.economy);
  } finally {
    bandit.levels.forEach((L, i) => (L.damage = saved[i]));
  }
  assert.ok(!isStale(bandit));
  const marshal = getUnit('marshal');
  const coins = marshal.ability.coins;
  try {
    marshal.ability.coins = coins * 3;
    assert.ok(isStale(marshal));
    assert.ok(measureUnit(marshal, ctx).ratings.economy > sideTiers('marshal').economy);
  } finally {
    marshal.ability.coins = coins;
  }
});

test('presentation helpers: whole numbers, N/A, tooltips from measured numbers, best side', () => {
  assert.equal(ratingText(null), 'N/A');
  assert.equal(ratingText(0.4), '1');
  assert.equal(ratingText(7.5), '8');
  assert.equal(CATEGORIES.length, 5);
  assert.ok(CATEGORIES.every((c) => c.measures.length > 30 && /^#[0-9a-f]{6}$/i.test(c.color)));
  assert.match(ratingDetail(getUnit('bounty-hunter'), 'economy'), /coins\/min/);
  assert.match(ratingDetail(getUnit('cadet'), 'summon'), /N\/A/);
  assert.equal(bestSide(getUnit('glorious-leader')).id, 'economy');
  assert.equal(bestSide(getUnit('outlaw-leader')).id, 'summon');
});
