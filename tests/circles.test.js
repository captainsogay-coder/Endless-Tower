import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/game/Game.js';
import { registerRoster, ROSTER } from '../src/units/roster.js';
import { getUnit, validateUnitDef } from '../src/units/unitRegistry.js';
import { levelStats, maxLevel } from '../src/units/unitStats.js';
import { applyStatus, statusSpeedMultiplier, statusDamageTakenMultiplier } from '../src/game/effects.js';
import { getBanner, summon, pull, WILD_WEST_CIRCLE, GAMBINO_CIRCLE, NUCLEAR_WAR_CIRCLE, duplicateCompensation, compensationCurrency, isRare } from '../src/units/summoning.js';
import { Profile, memoryStorage } from '../src/meta/profile.js';
import { createRng } from '../src/core/rng.js';
import { GAME_CONFIG } from '../src/config.js';

registerRoster();
const ALL = ROSTER.map((d) => d.id);

const close = (a, b, eps = 1e-9) => Math.abs(a - b) < eps;

/** A battle with endless coins, no weather and a sturdy Tower. */
function arena(seed = 1) {
  const g = new Game({ seed, loadout: ALL, weatherEnabled: false });
  g.coins = 1e12;
  g.towerMaxHp = g.towerHp = 1e12;
  return g;
}

const FAKE_WAVE = { number: 1, alive: 0, plan: { scaling: { hp: 1, speed: 1, damage: 1, reward: 1 } } };

/** A stationary enemy `d` px along route 0. */
function foe(g, d = 260, hp = 1e9) {
  const e = g.spawnEnemy({ category: 'regular', route: 0, offset: d }, { ...FAKE_WAVE });
  e.hp = e.maxHp = hp;
  e.speed = 0;
  e.armor = 0;
  g.update(1e-4);
  return e;
}

/** Free tiles sorted by distance to (x, y). */
function near(g, x, y) {
  const out = [];
  for (let r = 0; r < g.map.rows; r++) for (let c = 0; c < g.map.cols; c++) if (g.canPlace(c, r)) out.push([c, r, Math.hypot(c * 32 + 16 - x, r * 32 + 16 - y)]);
  return out.sort((a, b) => a[2] - b[2]).map(([c, r]) => [c, r]);
}

/** Deploys next to the enemy. Normal attacks are held unless `fire` (abilities still tick). */
function place(g, id, e, k = 0, { fire = false } = {}) {
  const t = near(g, e.x, e.y)[k];
  const u = g.deploy(id, t[0], t[1]);
  if (!fire) u.cooldown = 1e9;
  return u;
}

/** Captures projectiles fired by `u` (optionally only after `fn` runs). */
function shots(g, u) {
  const list = [];
  g.on('fire', (p) => p.source === u && list.push({ dmg: p.damage, kind: p.kind, splash: p.splash, onHit: p.onHit, crit: p.crit, target: p.target, t: g.time }));
  return list;
}

// ---------------------------------------------------------------- circles

test('three new circles: exact odds totalling 100%, tiers and prices as specified', () => {
  const spec = {
    [WILD_WEST_CIRCLE]: { currency: 'tokens', price: 300, pool: { gambler: [3, 0.3], bandit: [3, 0.25], outlaw: [5, 0.18], 'bounty-hunter': [5, 0.13], gunslinger: [7, 0.08], sheriff: [9, 0.04], 'outlaw-leader': [9, 0.015], 'fastest-hand': [12, 0.005] } },
    [GAMBINO_CIRCLE]: { currency: 'tokens', price: 300, pool: { drunkard: [1, 0.45], dealer: [6, 0.25], 'night-dancer': [6, 0.15], 'desperate-gambler': [7, 0.09], 'pit-boss': [9, 0.05], 'high-roller': [10, 0.009], 'the-house': [15, 0.001] } },
    [NUCLEAR_WAR_CIRCLE]: { currency: 'gems', price: 500, pool: { 'missile-launcher': [4, 0.35], 'special-force-battalion': [5, 0.25], icbm: [7, 0.15], bomber: [7, 0.12], b2: [9, 0.07], marshal: [12, 0.04], 'glorious-leader': [15, 0.015], 'nuclear-warhead': [17, 0.004], 'antimatter-warhead': [19, 0.001] } },
  };
  for (const [id, s] of Object.entries(spec)) {
    const b = getBanner(id);
    assert.equal(b.currency, s.currency, id);
    assert.equal(b.price, s.price, id);
    assert.ok(close(b.pool.reduce((t, p) => t + p.chance, 0), 1, 1e-12), `${id} sums to 100%`);
    assert.deepEqual(b.pool.map((p) => p.unit), Object.keys(s.pool));
    for (const p of b.pool) {
      assert.equal(p.chance, s.pool[p.unit][1], p.unit);
      assert.equal(getUnit(p.unit).tier, s.pool[p.unit][0], `${p.unit} tier`);
      assert.deepEqual(validateUnitDef(getUnit(p.unit)), [], p.unit);
    }
  }
  assert.deepEqual(getBanner(WILD_WEST_CIRCLE).pool.filter((p) => isRare(p.chance)).map((p) => p.unit), ['fastest-hand']);
  assert.deepEqual(getBanner(GAMBINO_CIRCLE).pool.filter((p) => isRare(p.chance)).map((p) => p.unit), ['high-roller', 'the-house']);
  assert.deepEqual(getBanner(NUCLEAR_WAR_CIRCLE).pool.filter((p) => isRare(p.chance)).map((p) => p.unit), ['nuclear-warhead', 'antimatter-warhead']);
});

test('pull frequencies match the odds over 2,000,000 pulls (including 0.1% units)', () => {
  for (const id of [WILD_WEST_CIRCLE, GAMBINO_CIRCLE, NUCLEAR_WAR_CIRCLE]) {
    const b = getBanner(id);
    const rng = createRng(77);
    const n = 2_000_000;
    const counts = new Map();
    for (let i = 0; i < n; i++) {
      const u = pull(b, rng).unit;
      counts.set(u, (counts.get(u) ?? 0) + 1);
    }
    for (const p of b.pool) {
      const f = (counts.get(p.unit) ?? 0) / n;
      const sd = Math.sqrt((p.chance * (1 - p.chance)) / n);
      assert.ok(Math.abs(f - p.chance) < 5 * sd, `${p.unit}: ${f} vs ${p.chance}`);
    }
  }
});

test('Nuclear War charges Gems (never Tokens); Gem duplicates pay 30% in Gems without an assumed rate', () => {
  const p = new Profile({ storage: memoryStorage(), starterUnits: ['dude'] });
  p.earn('tokens', 99999);
  p.earn('gems', 500 * 10);
  const b = getBanner(NUCLEAR_WAR_CIRCLE);
  assert.equal(compensationCurrency(b), 'gems');
  assert.equal(duplicateCompensation(b), 150);
  const r = summon(p, b, 10, createRng(3));
  assert.ok(r.ok);
  assert.equal(p.balance('tokens'), 99999, 'Tokens untouched');
  const dupes = r.results.filter((x) => !x.isNew).length;
  assert.equal(r.compensation, dupes * 150);
  assert.equal(p.balance('gems'), r.compensation);
  assert.ok(r.results.every((x) => getBanner(NUCLEAR_WAR_CIRCLE).pool.some((q) => q.unit === x.unit) && p.isUnlocked(x.unit)));
  assert.equal(summon(p, b, 10, createRng(4)).ok, false, 'insufficient Gems');
  // Token circles keep paying 30% of the Token price in Tokens
  assert.equal(duplicateCompensation(getBanner(WILD_WEST_CIRCLE)), 90);
  assert.equal(compensationCurrency(getBanner(GAMBINO_CIRCLE)), 'tokens');
});

test('Gems are earned only by clearing boss waves', () => {
  const g = arena(2);
  const got = [];
  g.on('waveClear', (d) => got.push(d));
  g.completeWave({ plan: { wave: 3, reward: 10, isBoss: false } });
  g.completeWave({ plan: { wave: 10, reward: 10, isBoss: true } });
  assert.deepEqual(got.map((d) => d.gems), [0, GAME_CONFIG.gemsPerBossWave]);
  assert.equal(g.gemsEarned, GAME_CONFIG.gemsPerBossWave);
});

// ---------------------------------------------------------------- statuses

test('variable statuses: strongest amount wins, weaker never overrides, nothing stacks', () => {
  const e = {};
  applyStatus(e, 'exposed', 0, { amount: 0.1, duration: 4 });
  applyStatus(e, 'exposed', 1, { amount: 0.3, duration: 8 });
  applyStatus(e, 'exposed', 2, { amount: 0.15, duration: 5 });
  assert.ok(close(statusDamageTakenMultiplier(e, 3), 1.3));
  assert.ok(close(statusDamageTakenMultiplier(e, 8.5), 1.3));
  assert.equal(statusDamageTakenMultiplier(e, 9.5), 1);
  applyStatus(e, 'crippled', 10);
  applyStatus(e, 'exposed', 10, { amount: 0.1 });
  assert.ok(close(statusDamageTakenMultiplier(e, 11), 1.2), 'different damage-taken statuses do not multiply');
  applyStatus(e, 'slowed', 10, { amount: 0.15, duration: 3 });
  assert.ok(close(statusSpeedMultiplier(e, 11), 0.85));
});

// ---------------------------------------------------------------- WILD WEST

test('Gambler: 15% crits for 3×, every 10th attack guaranteed + 2 coins', () => {
  const g = arena(3);
  const e = foe(g);
  const u = place(g, 'gambler', e);
  const s = shots(g, u);
  const c0 = g.coins;
  const N = 20000;
  for (let i = 0; i < N; i++) u.ability.fire(u, e, g);
  const base = u.stats.damage;
  assert.ok(s.every((x) => close(x.dmg, base) || close(x.dmg, base * 3)));
  for (let i = 9; i < N; i += 10) assert.ok(close(s[i].dmg, base * 3), 'guaranteed');
  const others = s.filter((_, i) => (i + 1) % 10 !== 0);
  const rate = others.filter((x) => x.crit).length / others.length;
  assert.ok(Math.abs(rate - 0.15) < 0.015, `crit rate ${rate}`);
  assert.equal(g.coins - c0, (N / 10) * 2);
});

test('Bandit: +3% per consecutive hit on one enemy, capped at +30%, resets on a new target', () => {
  const g = arena(4);
  const e = foe(g, 260);
  const e2 = foe(g, 300);
  const u = place(g, 'bandit', e);
  const s = shots(g, u);
  for (let i = 0; i < 14; i++) u.ability.fire(u, e, g);
  u.ability.fire(u, e2, g);
  const b = u.stats.damage;
  assert.deepEqual(s.map((x) => Math.round((x.dmg / b) * 100)), [100, 103, 106, 109, 112, 115, 118, 121, 124, 127, 130, 130, 130, 130, 100]);
});

test('Outlaw: every 6th attack is dynamite (area) that exposes enemies by 10% for 4 s', () => {
  const g = arena(5);
  const e = foe(g);
  const u = place(g, 'outlaw', e);
  const s = shots(g, u);
  for (let i = 0; i < 12; i++) u.ability.fire(u, e, g);
  assert.deepEqual(s.map((x) => x.kind === 'dynamite'), [false, false, false, false, false, true, false, false, false, false, false, true]);
  const dyn = s[5];
  assert.ok(dyn.splash > 0);
  assert.deepEqual({ ...dyn.onHit[0] }, { status: 'exposed', chance: 1, amount: 0.1, duration: 4 });
});

test('Bounty Hunter: marks the highest-HP enemy every 8 s, +20% damage to it, bounty coins on the kill', () => {
  const g = arena(6);
  const weak = foe(g, 240, 1000);
  const strong = foe(g, 280, 5000);
  const u = place(g, 'bounty-hunter', weak, 0, { fire: true });
  const s = shots(g, u);
  let markedAt = null;
  g.on('mark', () => (markedAt ??= g.time));
  for (let i = 0; i < 60 * 12; i++) g.update(1 / 60);
  assert.ok(strong.bounty && strong.bounty.until > g.time, 'strongest marked');
  assert.ok(!weak.bounty);
  const marked = s.filter((x) => x.t > markedAt);
  assert.ok(marked.length > 0 && marked.every((x) => close(x.dmg, u.stats.damage * 1.2)), 'prefers and bonuses the mark');
  const c0 = g.coins;
  const bounty = strong.bounty.coins;
  g.damageEnemy(strong, 1e9, u);
  assert.equal(g.coins - c0, strong.reward + bounty);
  assert.ok(bounty > 0);
});

test('Gunslinger: every 5th attack is a 3-shot burst at 70%; criticals deal 2.5×', () => {
  const g = arena(7);
  const e = foe(g);
  const u = place(g, 'gunslinger', e);
  const s = shots(g, u);
  for (let i = 0; i < 5; i++) u.ability.fire(u, e, g);
  for (let i = 0; i < 30; i++) g.update(1 / 60);
  assert.equal(s.length, 4 + 3);
  const b = u.stats.damage;
  for (const x of s.slice(4)) assert.ok(close(x.dmg, b * 0.7) || close(x.dmg, b * 0.7 * 2.5));
  for (const x of s.slice(0, 4)) assert.ok(close(x.dmg, b) || close(x.dmg, b * 2.5));
});

test('Sheriff: +12% damage / +10% range to allies in a large radius (no stacking, grows per upgrade) and a 5× shot every 15 s', () => {
  const g = arena(8);
  const e = foe(g);
  const ally = place(g, 'cadet', e, 0);
  const base = levelStats(getUnit('cadet'), 0);
  const sh = place(g, 'sheriff', e, 1);
  assert.ok(close(ally.stats.damage, base.damage * 1.12) && close(ally.stats.range, base.range * 1.1));
  place(g, 'sheriff', e, 2);
  assert.ok(close(ally.stats.damage, base.damage * 1.12), 'two Sheriffs: one badge');
  g.upgrade(sh);
  assert.ok(close(ally.stats.damage, base.damage * (1 + 0.12 * 1.1)), 'upgraded Sheriff badge is stronger');
  const s = shots(g, sh);
  for (let i = 0; i < 60 * 15.1; i++) g.update(1 / 60);
  assert.ok(s.some((x) => x.kind === 'golden' && close(x.dmg, sh.stats.damage * 5)));
});

test('Outlaw Leader: +5% per deployed Outlaw (max 50%), summons 3 Outlaws every 12 s that never count as deployed', () => {
  const g = arena(9);
  const e = foe(g);
  const L = place(g, 'outlaw-leader', e);
  const base = levelStats(getUnit('outlaw-leader'), 0).damage;
  assert.ok(close(L.stats.damage, base));
  const tiles = near(g, e.x, e.y);
  const outlaws = [];
  for (let i = 0; i < 12; i++) outlaws.push(g.deploy('outlaw', ...tiles[i]));
  assert.ok(close(L.stats.damage, base * 1.5), 'capped at +50%');
  for (const o of outlaws.slice(0, 9)) g.sell(o);
  assert.ok(close(L.stats.damage, base * 1.15), 'drops when Outlaws are sold');
  for (let i = 0; i < 60 * 12.2; i++) g.update(1 / 60);
  const summoned = g.alliesOf(L);
  assert.equal(summoned.length, 3);
  assert.ok(summoned.every((a) => a.def.id === 'outlaw' && a.ally));
  assert.equal(g.deployedCount('outlaw'), 3, 'summoned Outlaws are not deployed');
  assert.ok(close(L.stats.damage, base * 1.15), 'summoned Outlaws do not raise the bonus');
  for (let i = 0; i < 60 * 12; i++) g.update(1 / 60);
  assert.equal(g.alliesOf(L).length, 3, 'replaced, never accumulating');
});

test('Fastest Hand: six-shot barrage, +2% attack speed per consecutive kill up to 40%, reset after 8 s, 10× critical every 25 s', () => {
  const g = arena(10);
  const e = foe(g);
  const u = place(g, 'fastest-hand', e);
  const s = shots(g, u);
  u.ability.fire(u, e, g);
  for (let i = 0; i < 40; i++) g.update(1 / 60);
  assert.equal(s.filter((x) => x.kind === 'revolver').length, 6);
  const rate0 = u.stats.rate;
  for (let i = 0; i < 30; i++) u.ability.onKill(u, e, g);
  assert.ok(close(u.stats.rate, rate0 * 1.4), 'capped at +40%');
  for (let i = 0; i < 60 * 8.5; i++) g.update(1 / 60);
  assert.ok(close(u.stats.rate, rate0), 'reset without kills');
  s.length = 0;
  for (let i = 0; i < 60 * 17; i++) g.update(1 / 60);
  assert.ok(s.some((x) => x.kind === 'golden' && close(x.dmg, u.stats.damage * 10) && x.crit));
});

// ---------------------------------------------------------------- GAMBINO

test('Drunkard: 70% or 160% damage; every 10th attack stumbles (slow 5% for 2 s)', () => {
  const g = arena(11);
  const e = foe(g);
  const u = place(g, 'drunkard', e);
  const s = shots(g, u);
  for (let i = 0; i < 2000; i++) u.ability.fire(u, e, g);
  const b = u.stats.damage;
  assert.ok(s.every((x) => close(x.dmg, b * 0.7) || close(x.dmg, b * 1.6)));
  const hi = s.filter((x) => close(x.dmg, b * 1.6)).length / s.length;
  assert.ok(Math.abs(hi - 0.5) < 0.05);
  assert.deepEqual({ ...s[9].onHit[0] }, { status: 'slowed', chance: 1, amount: 0.05, duration: 2 });
  assert.ok(s[9].splash > 0 && !s[8].onHit?.length);
});

test('Dealer: 10% cooldown reduction for allies within its range only; pays for kills each 20 s', () => {
  const g = arena(12);
  const e = foe(g);
  const d = place(g, 'dealer', e);
  const t = near(g, d.x, d.y);
  const inside = g.deploy('cadet', ...t.find(([c, r]) => Math.hypot(c * 32 + 16 - d.x, r * 32 + 16 - d.y) < d.stats.range - 4));
  const outside = g.deploy('cadet', ...t.find(([c, r]) => Math.hypot(c * 32 + 16 - d.x, r * 32 + 16 - d.y) > d.stats.range + 4));
  const base = levelStats(getUnit('cadet'), 0).rate;
  assert.ok(close(inside.stats.rate, base / 0.9));
  assert.ok(close(outside.stats.rate, base));
  const c0 = g.coins;
  g.stats.kills += 37;
  for (let i = 0; i < 60 * 20.05; i++) g.update(1 / 60);
  assert.ok(g.coins - c0 >= 37, 'paid ~1 coin per kill');
});

test('Night Dancer: small area attacks; every 5 attacks a pulse slows enemies in range by 15% for 3 s', () => {
  const g = arena(13);
  const e = foe(g);
  const u = place(g, 'night-dancer', e);
  assert.ok(u.stats.splash > 0);
  for (let i = 0; i < 4; i++) u.ability.fire(u, e, g);
  assert.equal(statusSpeedMultiplier(e, g.time), 1);
  u.ability.fire(u, e, g);
  assert.ok(close(statusSpeedMultiplier(e, g.time), 0.85));
  assert.equal(statusSpeedMultiplier(e, g.time + 3.01), 1);
});

test('Desperate Gambler: 2.5× or 40% per attack; all-in shot of 0.5×–5× every 15 s', () => {
  const g = arena(14);
  const e = foe(g);
  const u = place(g, 'desperate-gambler', e);
  const s = shots(g, u);
  for (let i = 0; i < 1000; i++) u.ability.fire(u, e, g);
  const b = u.stats.damage;
  assert.ok(s.every((x) => close(x.dmg, b * 2.5) || close(x.dmg, b * 0.4)));
  s.length = 0;
  for (let i = 0; i < 60 * 15.1; i++) g.update(1 / 60);
  const allIn = s.filter((x) => x.kind === 'golden');
  assert.equal(allIn.length, 1);
  assert.ok(allIn[0].dmg >= b * 0.5 - 1e-9 && allIn[0].dmg <= b * 5 + 1e-9);
});

test('Pit Boss: +15% damage and 10% cooldown reduction in a large radius; High Roller jackpot bonus caps at 25%', () => {
  const g = arena(15);
  const e = foe(g);
  const ally = place(g, 'cadet', e, 0);
  place(g, 'pit-boss', e, 1);
  const base = levelStats(getUnit('cadet'), 0);
  assert.ok(close(ally.stats.damage, base.damage * 1.15) && close(ally.stats.rate, base.rate / 0.9));
  const hr = place(g, 'high-roller', e, 2);
  const d0 = hr.stats.damage;
  const c0 = g.coins;
  for (let i = 0; i < 400; i++) hr.ability.fire(hr, e, g);
  assert.ok(close(hr.stats.damage, d0 * 1.25), 'jackpot bonus capped');
  assert.equal(g.coins - c0, 40 * 30);
});

test('High Roller: 8× shot every 8 s', () => {
  const g = arena(16);
  const e = foe(g);
  const hr = place(g, 'high-roller', e);
  const s = shots(g, hr);
  for (let i = 0; i < 60 * 8.1; i++) g.update(1 / 60);
  assert.ok(s.some((x) => x.kind === 'golden' && close(x.dmg / hr.stats.damage, 8, 1e-6)));
});

test('THE HOUSE: global +10% damage / 10% CDR; wheel every 20 s; House Edge +1% per 50 kills, max +20%', () => {
  const g = arena(17);
  const e = foe(g);
  const far = near(g, e.x, e.y).at(-1);
  const ally = g.deploy('cadet', ...far);
  const base = levelStats(getUnit('cadet'), 0);
  const h = place(g, 'the-house', e);
  assert.ok(close(ally.stats.damage, base.damage * 1.1) && close(ally.stats.rate, base.rate / 0.9));
  const spins = [];
  g.on('houseWheel', (w) => spins.push(w.result));
  for (let i = 0; i < 60 * 20.05; i++) g.update(1 / 60);
  assert.equal(spins.length, 1);
  assert.ok(['jackpot', 'bankruptcy', 'doubledown'].includes(spins[0]));
  // 5000 kills → capped at +20%
  for (let i = 0; i < 5000; i++) g.houseEdgeKill();
  assert.ok(close(g.battleBonus.damage, 0.2));
  assert.ok(close(ally.stats.damage, base.damage * 1.1 * 1.2));
  void h;
});

test('THE HOUSE wheel outcomes: Jackpot +500 coins, Double Down doubles its damage for 10 s', () => {
  const g = arena(18);
  const e = foe(g);
  const h = place(g, 'the-house', e);
  const results = new Map();
  g.on('houseWheel', (w) => results.set(w.result, true));
  const c = [];
  g.on('bonusCoins', (b) => c.push(b.amount));
  for (let i = 0; i < 60 * 20 * 12 && results.size < 3; i++) g.update(1 / 60);
  assert.equal(results.size, 3, 'all three outcomes occur');
  assert.ok(c.includes(500));
  h.doubleUntil = g.time + 10;
  const s = shots(g, h);
  h.ability.fire(h, e, g);
  assert.ok(close(s[0].dmg, h.stats.damage * 2));
});

// ---------------------------------------------------------------- NUCLEAR WAR

test('Missile Launcher: area attacks and a 2× bonus missile every 8th attack', () => {
  const g = arena(19);
  const e = foe(g);
  const u = place(g, 'missile-launcher', e);
  assert.ok(u.stats.splash > 0);
  const s = shots(g, u);
  for (let i = 0; i < 8; i++) u.ability.fire(u, e, g);
  for (let i = 0; i < 20; i++) g.update(1 / 60);
  assert.equal(s.length, 9);
  assert.ok(close(s[8].dmg, u.stats.damage * 2));
});

test('Battalion: up to 3 soldiers, +5% damage per surviving soldier; soldiers are never deployed units', () => {
  const g = arena(20);
  const e = foe(g);
  const u = place(g, 'special-force-battalion', e);
  const base = levelStats(getUnit('special-force-battalion'), 0).damage;
  for (let i = 0; i < 60 * 12; i++) g.update(1 / 60);
  assert.equal(g.alliesOf(u).length, 3);
  assert.ok(close(u.stats.damage, base * 1.15));
  assert.equal(g.units.length, 1, 'soldiers are not units');
  assert.equal(g.deployedCount('battalion-soldier'), 0);
  for (const a of g.alliesOf(u)) a.life = 0;
  g.update(1 / 60);
  g.update(1 / 60);
  assert.ok(g.alliesOf(u).length <= 1);
  assert.ok(u.stats.damage <= base * 1.05 + 1e-9, 'bonus follows survivors');
  g.sell(u);
  g.update(1 / 60);
  assert.equal(g.allies.length, 0, 'soldiers leave with their leader');
});

test('ICBM: extreme range, large blast and a 40% aftershock', () => {
  const g = arena(21);
  const e = foe(g);
  const u = place(g, 'icbm', e);
  assert.ok(u.stats.range >= 15 * 32 && u.stats.splash >= 3 * 32);
  const hp0 = e.hp;
  const p = g.fireProjectile(u, e);
  p.x = e.x;
  p.y = e.y;
  p.alive = false;
  g.impact(p);
  const first = hp0 - e.hp;
  for (let i = 0; i < 40; i++) g.update(1 / 60);
  const second = hp0 - e.hp - first;
  assert.ok(close(second / first, 0.4, 1e-6), `${second}/${first}`);
});

test('Bomber: each attack is a flyover of 4 bombs; every third run adds an extra 2× explosion', () => {
  const g = arena(22);
  const e = foe(g);
  const u = place(g, 'bomber', e);
  const blasts = [];
  g.on('blast', (b) => blasts.push(b));
  const flights = [];
  g.on('flyover', (f) => flights.push(f));
  for (let run = 0; run < 3; run++) {
    u.ability.fire(u, e, g);
    for (let i = 0; i < 60 * 4; i++) g.update(1 / 60);
  }
  assert.equal(flights.length, 3);
  assert.equal(blasts.length, 4 + 4 + 5);
});

test('B-2: bombing run every 12 s; the strongest enemy in the main blast takes 3×', () => {
  const g = arena(23);
  const weak = foe(g, 260, 1e6);
  const strong = foe(g, 262, 1e9);
  const u = place(g, 'b2', weak);
  assert.ok(close(1 / u.stats.rate, 12, 0.5));
  g.explode(weak.x, weak.y, u.stats.splash, 1000, u, { focusMult: 3 });
  assert.ok(close(1e9 - strong.hp, 3000) && close(1e6 - weak.hp, 1000));
});

test('Marshal and Glorious Leader: global buffs that stack with each other but not with copies; Leader exposes every enemy', () => {
  const g = arena(24);
  const e = foe(g);
  const e2 = foe(g, 500);
  const ally = g.deploy('cadet', ...near(g, e.x, e.y).at(-1));
  const base = levelStats(getUnit('cadet'), 0);
  place(g, 'marshal', e, 0);
  place(g, 'marshal', e, 1);
  assert.ok(close(ally.stats.damage, base.damage * 1.15) && close(ally.stats.range, base.range * 1.1));
  const L = place(g, 'glorious-leader', e, 2);
  assert.ok(close(ally.stats.damage, base.damage * 1.15 * 1.2));
  for (let i = 0; i < 60 * 20.05; i++) g.update(1 / 60);
  for (const x of [e, e2]) assert.ok(close(statusDamageTakenMultiplier(x, g.time), 1.15), 'all enemies exposed');
  void L;
});

test('Nuclear Warhead leaves an energy zone and exposes by 20%; Antimatter exposes by 30% and its gravity field gathers then detonates', () => {
  const g = arena(25);
  const e = foe(g);
  const n = place(g, 'nuclear-warhead', e);
  const p = g.fireProjectile(n, e);
  p.x = e.x;
  p.y = e.y;
  p.alive = false;
  g.impact(p);
  assert.ok(g.hazards.some((h) => h.kind === 'energy'));
  assert.ok(close(statusDamageTakenMultiplier(e, g.time), 1.2));
  const a = place(g, 'antimatter-warhead', e, 1);
  const q = g.fireProjectile(a, e);
  q.x = e.x;
  q.y = e.y;
  q.alive = false;
  g.impact(q);
  assert.ok(close(statusDamageTakenMultiplier(e, g.time), 1.3));
  // gravity field
  const g2 = arena(26);
  const victims = [foe(g2, 300), foe(g2, 340)];
  victims.forEach((v) => (v.speed = 40));
  const blasts = [];
  g2.on('blast', (b) => b.kind === 'antimatter' && blasts.push(b));
  g2.addField({ x: victims[0].x, y: victims[0].y, radius: 144, duration: 3, damage: 100, source: null });
  g2.update(1 / 60); // the field takes hold during its first frame
  const d0 = victims.map((v) => v.d);
  for (let i = 0; i < 60 * 2.8; i++) g2.update(1 / 60);
  assert.deepEqual(victims.map((v) => v.d), d0, 'held in place');
  for (let i = 0; i < 20; i++) g2.update(1 / 60);
  assert.equal(blasts.length, 1);
});

// ---------------------------------------------------------------- upgrades

test('upgrades apply to one copy only, persist on it, and ability values scale', () => {
  const g = arena(27);
  const e = foe(g);
  const a = place(g, 'gunslinger', e, 0);
  const b = place(g, 'gunslinger', e, 1);
  for (let i = 0; i < maxLevel(a.def); i++) assert.ok(g.upgrade(a));
  assert.equal(a.level, 5);
  assert.equal(b.level, 0);
  assert.ok(a.stats.damage > b.stats.damage * 2);
  assert.equal(g.upgrade(a), false, 'max level');
  const coins = g.coins;
  g.coins = 0;
  assert.equal(g.upgrade(b), false, 'cannot afford');
  assert.equal(b.level, 0);
  g.coins = coins;
  // coin abilities scale with level
  const lead = place(g, 'marshal', e, 2);
  const paid = [];
  g.on('bonusCoins', (c) => paid.push(c.amount));
  for (let i = 0; i < 5; i++) g.upgrade(lead);
  for (let i = 0; i < 60 * 20.05; i++) g.update(1 / 60);
  assert.ok(paid.some((v) => v > 120));
});

test('long multi-wave battle with every new unit runs without errors and stays bounded', () => {
  const g = arena(28);
  g.weatherEnabled = true;
  g.setWeatherEnabled(true);
  const ids = ROSTER.slice(11).map((d) => d.id);
  const tiles = [];
  for (let r = 0; r < g.map.rows; r++) for (let c = 0; c < g.map.cols; c++) if (g.canPlace(c, r) && g.map.pathDist[r * g.map.cols + c] <= 3) tiles.push([c, r]);
  ids.forEach((id, i) => g.deploy(id, ...tiles[(i * 5) % tiles.length]));
  g.callWaves(30);
  for (let i = 0; i < 60 * 240; i++) g.update(1 / 60);
  assert.ok(g.stats.kills > 500, `${g.stats.kills} kills`);
  assert.ok(g.battleBonus.damage <= 0.2 + 1e-9);
  assert.ok(g.allies.length <= 3 + 3, 'allies bounded');
  for (const u of g.units) assert.ok(Number.isFinite(u.stats.damage) && u.stats.rate > 0);
  assert.ok(g.timers.length < 200 && g.fields.length <= 2);
});

test('range preview before deployment equals the range combat uses after deployment (buffs, weather, passives)', () => {
  const g = arena(29);
  const e = foe(g);
  place(g, 'sheriff', e, 0);
  place(g, 'marshal', e, 1);
  g.weather.start('windy');
  for (const [id, k] of [['cadet', 2], ['outlaw-leader', 3], ['dude', 4]]) {
    const [c, r] = near(g, e.x, e.y)[k];
    const preview = g.previewStats(id, c, r);
    const u = g.deploy(id, c, r);
    assert.ok(close(preview.range, u.stats.range), `${id} range`);
    assert.ok(close(preview.damage, u.stats.damage), `${id} damage`);
    // the targeting range is the same number
    const inside = g.hash.best(u.x, u.y, u.stats.range, () => 1);
    void inside;
  }
  g.weather.stop();
});
