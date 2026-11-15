// The Ghost: circle, every unit and ability, tag buffs, caps.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/game/Game.js';
import { registerRoster, ROSTER } from '../src/units/roster.js';
import { getUnit, validateUnitDef } from '../src/units/unitRegistry.js';
import { levelStats, maxLevel } from '../src/units/unitStats.js';
import { getBanner, summon, pull, isRareEntry, duplicateCompensation, listCirclesByPrice } from '../src/units/summoning.js';
import { GHOST_UNITS } from '../src/units/defs/ghost.js';
import { Profile, memoryStorage } from '../src/meta/profile.js';
import { createRng } from '../src/core/rng.js';
import { sideTiers, isStale } from '../src/meta/sideTiers.js';
import { SIDE_TIER_DATA } from '../src/units/sideTiers.data.js';
import { BALANCE } from '../src/balance.js';
import { statusDamageTakenMultiplier } from '../src/game/effects.js';

registerRoster();
const ALL = ROSTER.map((d) => d.id);
const close = (a, b, eps = 1e-9) => Math.abs(a - b) < eps;
const combat = (id) => SIDE_TIER_DATA.units[id].raw.combat;

const POOL = [
  ['starving-samurai', 2, 0.22], ['mongol-warrior', 4, 0.18], ['mongol-archer', 5, 0.15], ['mongol-horsemen', 7, 0.12], ['mongol-brute', 6, 0.1],
  ['ronin', 8, 0.08], ['mongol-commander', 10, 0.06], ['decorated-samurai', 11, 0.04], ['samurai-lord', 13, 0.025], ['desperate-thief', 14, 0.015],
  ['defected-lord', 17, 0.005], ['honourable-lord', 19, 0.003], ['great-khan', 23, 0.001], ['ghost-warrior', 25, 0.001],
];

test('The Ghost: 2,500 Tokens, 14 units with the specified tiers and odds (exactly 100%), four chase units, two super chase', () => {
  const b = getBanner('the-ghost-circle');
  assert.equal(b.price, 2500);
  assert.equal(b.currency, 'tokens');
  assert.deepEqual(b.counts, [1, 5, 10, 25]);
  assert.deepEqual(b.pool.map((p) => [p.unit, getUnit(p.unit).tier, p.chance]), POOL);
  assert.ok(close(b.pool.reduce((t, p) => t + p.chance, 0), 1, 1e-12));
  assert.deepEqual(b.pool.filter(isRareEntry).map((p) => p.unit), ['defected-lord', 'honourable-lord', 'great-khan', 'ghost-warrior']);
  assert.deepEqual(b.pool.filter((p) => p.superChase).map((p) => p.unit), ['great-khan', 'ghost-warrior']);
  assert.equal(duplicateCompensation(b), 750);
  const prices = listCirclesByPrice().map((c) => c.price);
  assert.deepEqual(prices, [...prices].sort((x, y) => x - y));
  assert.equal(prices.at(-1), 2500, 'the most expensive circle comes last');
  assert.equal(GHOST_UNITS.length, 14);
  assert.equal(ROSTER.length, 132);
});

test('every Ghost unit can be summoned and is saved; x1/x5/x10/x25 work; rarest odds hold over many pulls', () => {
  const storage = memoryStorage();
  const p = new Profile({ storage, starterUnits: ['dude'] });
  const b = getBanner('the-ghost-circle');
  const rng = createRng(4242);
  for (const n of [1, 5, 10, 25]) {
    p.earn('tokens', b.price * n);
    assert.equal(summon(p, b, n, rng).results.length, n);
  }
  for (let i = 0; i < 3000 && !b.pool.every((e) => p.isUnlocked(e.unit)); i++) {
    p.earn('tokens', b.price * 25);
    summon(p, b, 25, rng);
  }
  for (const e of b.pool) assert.ok(p.isUnlocked(e.unit), `${e.unit} obtained`);
  const again = new Profile({ storage, starterUnits: ['dude'] });
  for (const u of GHOST_UNITS) assert.ok(again.isUnlocked(u.id));
  const r = createRng(9);
  let jin = 0;
  for (let i = 0; i < 400000; i++) if (pull(b, r).unit === 'ghost-warrior') jin++;
  assert.ok(Math.abs(jin / 400000 - 0.001) < 0.0003, `${jin}`);
});

function arena(seed = 2) {
  const g = new Game({ seed, loadout: ALL, weatherEnabled: false, mapEvents: false });
  g.coins = 1e12;
  g.towerHp = g.towerMaxHp = 1e12;
  return g;
}
const W = { number: 1, alive: 0, plan: { scaling: { hp: 1, speed: 1, damage: 1, reward: 1 } } };
function foe(g, d = 260, { hp = 1e9, boss = false } = {}) {
  const e = g.spawnEnemy({ category: boss ? 'boss' : 'regular', route: 0, offset: d }, { ...W });
  e.hp = e.maxHp = hp;
  e.speed = 0;
  e.armor = 0;
  if (boss) {
    e.bossDef = null;
    e.bossTimer = 1e9;
  }
  g.update(1e-4);
  return e;
}
function near(g, x, y) {
  const out = [];
  for (let r = 0; r < g.map.rows; r++) for (let c = 0; c < g.map.cols; c++) if (g.canPlace(c, r)) out.push([c, r, Math.hypot(c * 32 + 16 - x, r * 32 + 16 - y)]);
  return out.sort((a, b) => a[2] - b[2]).map(([c, r]) => [c, r]);
}
const place = (g, id, e, k = 0) => g.deploy(id, ...near(g, e.x, e.y)[k]);
const run = (g, s) => {
  for (let i = 0; i < s * 30; i++) g.update(1 / 30);
};
const tick = (g, u, s) => {
  for (let i = 0; i < s * 30 + 2; i++) u.ability.update(u, 1 / 30, g);
};

test('all 14 deploy, upgrade, fight, describe themselves and are rated; tiers order price and power; T25 tops the game', () => {
  for (const def of GHOST_UNITS) {
    const g = arena(3);
    const e = foe(g);
    const u = place(g, def.id, e);
    assert.ok(u, def.id);
    assert.deepEqual(validateUnitDef(getUnit(def.id)), []);
    while (u.level < maxLevel(u.def)) assert.ok(g.upgrade(u));
    run(g, 6);
    assert.ok(u.damageDealt > 0, `${def.id} deals damage`);
    if (u.ability?.describe) assert.ok(u.ability.describe(u, g).every((l) => typeof l === 'string' && l.length > 10));
    assert.ok(!isStale(getUnit(def.id)) && sideTiers(def.id).dps >= 1);
  }
  const byTier = [...GHOST_UNITS].sort((a, b) => a.tier - b.tier);
  for (let i = 1; i < byTier.length; i++) {
    assert.ok(byTier[i].price > byTier[i - 1].price);
    assert.ok(combat(byTier[i].id) >= combat(byTier[i - 1].id) - 1, `${byTier[i].id}`);
  }
  assert.ok(getUnit('starving-samurai').price <= 30, 'cheap early unit');
  for (const d of ROSTER) if (d.id !== 'ghost-warrior' && d.id !== 'worldbreaker') assert.ok(combat(d.id) < combat('ghost-warrior'), d.id);
});

test('heavy strikes, combo, horsemen charge and exit bonus, brute slam, decorated precision + boss bonus', () => {
  const g = arena(4);
  const e = foe(g, 300);
  for (const [id, every, mult] of [['starving-samurai', 10, 2], ['mongol-warrior', 8, 2.2], ['mongol-archer', 6, 2.5]]) {
    const u = place(g, id, e, ['starving-samurai', 'mongol-warrior', 'mongol-archer'].indexOf(id));
    const d = [];
    const off = g.on('fire', (p) => p.source === u && d.push(p));
    for (let i = 0; i < every; i++) u.ability.fire(u, e, g);
    off();
    assert.ok(close(d[every - 1].damage / d[0].damage, mult) && d[every - 1].kind === u.def.ability.heavyKind, id);
  }
  const ro = place(g, 'ronin', e, 3);
  assert.equal(getUnit('ronin').targeting, 'strongest');
  const rd = [];
  g.on('fire', (p) => p.source === ro && rd.push(p.kind));
  for (let i = 0; i < 8; i++) ro.ability.fire(ro, e, g);
  run(g, 0.4);
  assert.equal(rd.filter((k) => k === 'combo').length, 3, 'three-strike combination on the 8th');
  // horsemen: +20% near the exit, and a charge through a line
  const g2 = arena(5);
  const route = g2.map.routes[0];
  const late = foe(g2, route.length * 0.9);
  const early = foe(g2, route.length * 0.2);
  const hm = place(g2, 'mongol-horsemen', late);
  const hd = [];
  g2.on('fire', (p) => p.source === hm && hd.push(p.damage));
  hm.ability.fire(hm, late, g2);
  hm.ability.fire(hm, early, g2);
  assert.ok(close(hd[0] / hd[1], 1.2));
  const beams = [];
  g2.on('beam', (b) => b.source === hm && beams.push(b));
  tick(g2, hm, 12);
  assert.equal(beams[0]?.kind, 'cavalry');
  const br = place(g2, 'mongol-brute', late, 1);
  const slams = [];
  g2.on('blast', (b) => b.kind === 'bruteslam' && slams.push(b));
  tick(g2, br, 10);
  assert.ok(slams.length === 1 && close(slams[0].damage, br.stats.damage * 2));
  // decorated: 4× precision at the strongest every 12 s, +10% to bosses
  const g3 = arena(6);
  const weak = foe(g3, 300, { hp: 100 });
  const strong = foe(g3, 310, { hp: 5000 });
  const ds = place(g3, 'decorated-samurai', weak);
  const shots = [];
  g3.on('fire', (p) => p.source === ds && shots.push(p));
  tick(g3, ds, 12);
  assert.ok(shots.length === 1 && shots[0].target === strong && close(shots[0].damage, ds.stats.damage * 4) && shots[0].kind === 'precision');
  const boss = foe(g3, 320, { boss: true });
  ds.ability.fire(ds, boss, g3);
  ds.ability.fire(ds, weak, g3);
  assert.ok(close(shots.at(-2).damage / shots.at(-1).damage, 1.1));
});

test('tag buffs: Mongol banner and drums reach Mongols only; Samurai Lord + Honourable Lord reach Samurai; Defected Lord reaches Ronin', () => {
  const g = arena(7);
  const e = foe(g);
  const mw = place(g, 'mongol-warrior', e);
  const ss = place(g, 'starving-samurai', e, 1); // samurai + ronin
  const dc = place(g, 'decorated-samurai', e, 2); // samurai only
  const cadet = place(g, 'cadet', e, 3);
  const base = Object.fromEntries([mw, ss, dc, cadet].map((u) => [u.def.id, { ...u.stats }]));
  const mc = place(g, 'mongol-commander', e, 4);
  assert.ok(close(mw.stats.damage / base['mongol-warrior'].damage, 1.12) && close(ss.stats.damage, base['starving-samurai'].damage) && close(cadet.stats.damage, base.cadet.damage));
  tick(g, mc, 20);
  assert.ok(close(mw.stats.rate / base['mongol-warrior'].rate, 1.2, 1e-9), 'war drums +20% speed (Mongols)');
  assert.ok(close(ss.stats.rate, base['starving-samurai'].rate, 1e-9));
  run(g, 5.2);
  assert.ok(close(mw.stats.rate, base['mongol-warrior'].rate, 1e-9), 'drums last 5 s');
  place(g, 'samurai-lord', e, 5);
  assert.ok(close(dc.stats.damage / base['decorated-samurai'].damage, 1.15) && close(mw.stats.damage / base['mongol-warrior'].damage, 1.12));
  const far = g.deploy('ronin', ...near(g, 0, 0)[0]);
  const r0 = { ...far.stats };
  place(g, 'honourable-lord', e, 6);
  assert.ok(close(far.stats.damage / r0.damage, 1.18) && close(far.stats.range / r0.range, 1.1), 'map-wide for Samurai');
  assert.ok(close(cadet.stats.damage, base.cadet.damage), 'not for others');
  const ss0 = ss.stats.damage;
  place(g, 'defected-lord', ss, 7);
  assert.ok(close(ss.stats.damage / ss0, 1.2), 'Ronin +20% near the Defected Lord');
  assert.ok(close(dc.stats.damage / (base['decorated-samurai'].damage * 1.15 * 1.18), 1, 1e-9), 'a non-Ronin samurai is untouched by it');
});

test('Desperate Thief: leaders first, a 3-knife volley every 10 s, 15 coins every 20 eliminations', () => {
  const g = arena(8);
  const es = [100, 200, 300, 400, 500].map((d) => foe(g, d));
  const th = place(g, 'desperate-thief', es[2]);
  assert.equal(getUnit('desperate-thief').targeting, 'first');
  const shots = [];
  g.on('fire', (p) => p.source === th && p.kind === 'kunaivolley' && shots.push(p));
  tick(g, th, 10);
  assert.equal(shots.length, 3);
  const coins = [];
  g.on('bonusCoins', (c) => coins.push(c.amount));
  g.stats.kills += 45;
  th.ability.update(th, 1 / 30, g);
  th.ability.update(th, 1 / 30, g);
  th.ability.update(th, 1 / 30, g);
  assert.equal(coins.length, 2, 'two payouts for 45 eliminations');
});

test('Defected Lord flurry and frenzy; Honourable Lord technique + boss bonus', () => {
  const g = arena(9);
  const e = foe(g);
  const dl = place(g, 'defected-lord', e);
  const r0 = dl.stats.rate;
  const hits = [];
  g.on('fire', (p) => p.source === dl && p.kind === 'turncoat' && hits.push(p));
  tick(g, dl, 15);
  run(g, 0.6);
  assert.equal(hits.length, 5);
  tick(g, dl, 15);
  assert.ok(close(dl.stats.rate / r0, 1.3, 1e-9), 'frenzy +30% speed');
  g.time = dl.frenzyUntil + 0.01;
  dl.ability.update(dl, 1 / 30, g);
  assert.ok(close(dl.stats.rate, r0, 1e-9), 'frenzy ends after 6 s');
  const hl = place(g, 'honourable-lord', e, 1);
  const blasts = [];
  g.on('blast', (b) => b.kind === 'lordtechnique' && blasts.push(b));
  tick(g, hl, 25);
  run(g, 0.5);
  assert.ok(blasts.length === 1 && close(blasts[0].damage, hl.stats.damage * 5));
  const d = [];
  g.on('fire', (p) => p.source === hl && d.push(p.damage));
  const boss = foe(g, 280, { boss: true });
  hl.ability.fire(hl, boss, g);
  hl.ability.fire(hl, e, g);
  assert.ok(close(d[0] / d[1], 1.25));
});

test('The Great Khan: volleys expose, the sky of arrows hits every enemy for 4× + 20% for 6 s, tribute every 50 eliminations', () => {
  assert.deepEqual(getUnit('great-khan').onHit, [{ status: 'exposed', chance: 1, amount: 0.2, duration: 6 }]);
  const g = arena(10);
  const foes = [80, 200, 320, 440, 560].map((d) => foe(g, d));
  const k = place(g, 'great-khan', foes[2]);
  const hp0 = foes.map((x) => x.hp);
  tick(g, k, 30);
  assert.ok(foes.every((x, i) => x.hp === hp0[i]), 'a moment of warning first');
  run(g, 1.5);
  assert.ok(foes.every((x, i) => hp0[i] - x.hp >= k.stats.damage * 4 - 1e-6), 'every enemy on the map');
  assert.ok(foes.every((x) => close(statusDamageTakenMultiplier(x, g.time), 1.2)));
  const coins = [];
  g.on('bonusCoins', (c) => c.label === 'Tribute' && coins.push(c.amount));
  g.stats.kills += 120;
  for (let i = 0; i < 3; i++) k.ability.update(k, 1 / 30, g);
  assert.equal(coins.length, 2);
});

test('The Ghost Warrior: techniques hit 6, Ghost Stance +40%/+25% and cleaves, legend +1% per 100 eliminations capped at +25%', () => {
  const g = arena(11);
  const foes = [200, 215, 230, 245, 260, 275, 290, 305].map((d) => foe(g, d));
  const j = place(g, 'ghost-warrior', foes[4]);
  const base = { ...j.stats };
  const cuts = [];
  g.on('zap', (z) => z.source === j && z.kind === 'ghostcut' && cuts.push(z));
  tick(g, j, 12);
  run(g, 0.8);
  assert.equal(cuts.length, 6, 'Ghost technique strikes 6');
  tick(g, j, 18);
  assert.ok(j.stanceUntil > g.time);
  assert.ok(close(j.stats.damage / base.damage, 1.4, 1e-9) && close(j.stats.rate / base.rate, 1.25, 1e-9), 'Ghost Stance');
  const cleave = [];
  g.on('zap', (z) => z.source === j && z.kind === 'ghostcleave' && cleave.push(z));
  j.ability.fire(j, foes[4], g);
  assert.equal(cleave.length, 2, 'each stance attack cuts 2 more');
  g.time = j.stanceUntil + 0.01;
  j.ability.update(j, 1 / 30, g);
  assert.ok(close(j.stats.damage, base.damage, 1e-9) && close(j.stats.rate, base.rate, 1e-9), 'stance ends');
  g.stats.kills += 350;
  j.ability.update(j, 1 / 30, g);
  assert.ok(close(j.legend, 0.03));
  g.stats.kills += 1e6;
  j.ability.update(j, 1 / 30, g);
  assert.ok(close(j.legend, 0.25), 'legend capped at +25%');
});

test('stacking stays bounded with The Ghost: all tag buffs, drums, stance and the strongest auras never pass the caps', () => {
  const g = arena(12);
  const e = foe(g);
  const ally = place(g, 'starving-samurai', e);
  const base = levelStats(getUnit('starving-samurai'), 0);
  let k = 1;
  for (const id of ['samurai-lord', 'honourable-lord', 'defected-lord', 'mongol-commander', 'sky-admiral', 'archmage', 'foundry-overseer', 'glorious-leader', 'the-house', 'marshal']) place(g, id, e, k++);
  g.weather.start('nova');
  const C = BALANCE.caps;
  assert.ok(ally.stats.damage <= base.damage * C.buffDamage * (1 + C.additiveDamage) * 1.3 + 1e-6);
  assert.ok(ally.stats.range <= base.range * C.buffRange * 1.2 + 1e-6);
});

test('The Ghost survives long endless runs with Auto Skip, weather, bosses and events', () => {
  const g = new Game({ seed: 77, loadout: ['starving-samurai', 'mongol-archer', 'ronin', 'mongol-commander', 'samurai-lord', 'desperate-thief', 'defected-lord', 'honourable-lord', 'great-khan', 'ghost-warrior', 'cadet', 'gunnerman'], weatherEnabled: true });
  g.coins = 1e9;
  g.towerHp = g.towerMaxHp = 1e15;
  const ids = g.loadout.map((x) => x.id);
  let k = 0;
  for (let y = 0; y < g.map.rows; y++) for (let x = 0; x < g.map.cols; x++) if (g.canPlace(x, y) && g.map.pathDist[y * g.map.cols + x] <= 2 && k < 60) g.deploy(ids[k++ % ids.length], x, y);
  g.callWaves(40);
  g.autoSkip = true;
  for (let i = 0; i < 300 * 20; i++) g.update(1 / 20);
  assert.ok(g.stats.wavesCleared >= 25);
  for (const u of g.units) for (const v of Object.values(u.stats)) if (typeof v === 'number') assert.ok(Number.isFinite(v), u.def.id);
});
