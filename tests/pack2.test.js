// Circle Pack 2: Traveling Caravan, Clockwork Atelier, Jungle Covenant,
// Skybound Order, Astral Observatory – circles, every unit and every ability.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/game/Game.js';
import { registerRoster, ROSTER } from '../src/units/roster.js';
import { getUnit, validateUnitDef } from '../src/units/unitRegistry.js';
import { levelStats, maxLevel } from '../src/units/unitStats.js';
import { getBanner, summon, pull, isRareEntry, duplicateCompensation, listCirclesByPrice } from '../src/units/summoning.js';
import { PACK2_UNITS } from '../src/units/defs/pack2.js';
import { Profile, memoryStorage } from '../src/meta/profile.js';
import { createRng } from '../src/core/rng.js';
import { sideTiers, isStale } from '../src/meta/sideTiers.js';
import { BALANCE } from '../src/balance.js';
import { statusDamageTakenMultiplier } from '../src/game/effects.js';

registerRoster();
const ALL = ROSTER.map((d) => d.id);
const close = (a, b, eps = 1e-9) => Math.abs(a - b) < eps;

const SPEC = {
  'traveling-caravan-circle': [180, [['porter', 1, 0.3], ['caravan-scout', 1, 0.25], ['camp-cook', 2, 0.18], ['traveling-trader', 3, 0.12], ['cartographer', 4, 0.08], ['caravan-master', 6, 0.05], ['golden-merchant', 9, 0.02]]],
  'clockwork-atelier-circle': [500, [['tin-sentry', 3, 0.3], ['springling', 4, 0.23], ['gearshot', 5, 0.18], ['steam-golem', 7, 0.13], ['chrono-mechanic', 9, 0.09], ['grand-automaton', 12, 0.05], ['eternal-engine', 16, 0.02]]],
  'jungle-covenant-circle': [850, [['vine-tender', 4, 0.3], ['dartkeeper', 5, 0.23], ['panther', 7, 0.18], ['spore-shaman', 8, 0.13], ['elder-treant', 10, 0.09], ['canopy-warden', 14, 0.05], ['heart-of-the-wild', 18, 0.02]]],
  'skybound-order-circle': [1200, [['cloud-courier', 5, 0.3], ['gale-lancer', 7, 0.23], ['roc-rider', 9, 0.18], ['stormcaller', 11, 0.13], ['sky-admiral', 14, 0.09], ['tempest-sovereign', 17, 0.05], ['eye-of-the-zenith', 21, 0.02]]],
  'astral-observatory-circle': [1800, [['star-reader', 7, 0.3], ['comet-scribe', 9, 0.23], ['moon-prism', 12, 0.18], ['eclipse-adept', 14, 0.13], ['nebula-architect', 16, 0.09], ['celestial-oracle', 19, 0.05], ['singularity-monarch', 23, 0.02]]],
};

test('five new circles: exact prices, names, tiers and odds (100%), Tokens only, 2% chase units get the rare reveal', () => {
  const names = new Set();
  for (const [id, [price, pool]] of Object.entries(SPEC)) {
    const b = getBanner(id);
    assert.equal(b.currency, 'tokens');
    assert.equal(b.price, price);
    assert.deepEqual(b.counts, [1, 5, 10, 25]);
    assert.ok(close(b.pool.reduce((t, p) => t + p.chance, 0), 1, 1e-12), `${id} totals 100%`);
    assert.deepEqual(b.pool.map((p) => [p.unit, getUnit(p.unit).tier, p.chance]), pool);
    assert.equal(duplicateCompensation(b), Math.round(price * 0.3));
    const chase = b.pool.filter(isRareEntry);
    assert.deepEqual(chase.map((p) => p.unit), [pool.at(-1)[0]], 'only the chase unit is rare');
    for (const p of b.pool) names.add(p.unit);
  }
  assert.equal(names.size, 35);
  assert.equal(PACK2_UNITS.length, 35);
  // all thirteen circles, cheapest first; the new ones sit by price among the old
  const order = listCirclesByPrice().map((b) => b.price);
  assert.deepEqual(order, [...order].sort((a, b) => a - b));
  assert.equal(listCirclesByPrice().length, 13);
});

test('every one of the 35 can be summoned (Tokens only), is saved, and duplicates refund Tokens', () => {
  const storage = memoryStorage();
  const p = new Profile({ storage, starterUnits: ['dude'] });
  const rng = createRng(77);
  for (const id of Object.keys(SPEC)) {
    const b = getBanner(id);
    for (let i = 0; i < 400 && !b.pool.every((e) => p.isUnlocked(e.unit)); i++) {
      p.earn('tokens', b.price * 25);
      assert.ok(summon(p, b, 25, rng).ok);
    }
    for (const e of b.pool) assert.ok(p.isUnlocked(e.unit), `${e.unit} obtained`);
  }
  assert.deepEqual(Object.keys(p.data.wallet), ['tokens']);
  const reloaded = new Profile({ storage, starterUnits: ['dude'] });
  for (const u of PACK2_UNITS) assert.ok(reloaded.isUnlocked(u.id), `${u.id} saved`);
  const b = getBanner('clockwork-atelier-circle');
  reloaded.earn('tokens', 500 * 10);
  const before = reloaded.balance('tokens');
  const r = summon(reloaded, b, 10, createRng(3));
  assert.equal(r.results.filter((x) => x.isNew).length, 0);
  assert.equal(reloaded.balance('tokens'), before - 5000 + 10 * 150, 'every duplicate pays 150 Tokens');
  // chase rate is right over many pulls
  const rng2 = createRng(5);
  let chase = 0;
  for (let i = 0; i < 200000; i++) if (pull(getBanner('astral-observatory-circle'), rng2).unit === 'singularity-monarch') chase++;
  assert.ok(Math.abs(chase / 200000 - 0.02) < 0.002, `${chase}`);
});

function arena(seed = 2) {
  const g = new Game({ seed, loadout: ALL, weatherEnabled: false });
  g.coins = 1e12;
  g.towerHp = g.towerMaxHp = 1e12;
  return g;
}
const W = { number: 1, alive: 0, plan: { scaling: { hp: 1, speed: 1, damage: 1, reward: 1 } } };
function foe(g, d = 260, { hp = 1e9, boss = false, still = true } = {}) {
  const e = g.spawnEnemy({ category: boss ? 'boss' : 'regular', route: 0, offset: d }, { ...W });
  e.hp = e.maxHp = hp;
  if (still) e.speed = 0;
  e.armor = 0;
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

test('all 35 deploy, upgrade to max, attack in real combat, show panel lines and have current side tiers', () => {
  for (const def of PACK2_UNITS) {
    const g = arena(3);
    const e = foe(g, 260, { hp: 1e9 });
    const u = place(g, def.id, e);
    assert.ok(u, `${def.id} deploys`);
    assert.deepEqual(validateUnitDef(getUnit(def.id)), []);
    while (u.level < maxLevel(u.def)) assert.ok(g.upgrade(u), `${def.id} upgrades`);
    assert.ok(levelStats(u.def, 5).damage > levelStats(u.def, 0).damage);
    run(g, 6);
    assert.ok(u.damageDealt > 0, `${def.id} deals damage`);
    if (u.ability?.describe) assert.ok(u.ability.describe(u, g).every((l) => typeof l === 'string' && l.length > 10), def.id);
    assert.ok(!isStale(getUnit(def.id)) && sideTiers(def.id).dps >= 1, `${def.id} rated`);
  }
});

test('Caravan economy: Porter coin every 12th attack, Camp Cook 3 per 10 s, Trader per kill (capped), Golden Merchant ledger + vault', () => {
  const g = arena(4);
  const e = foe(g);
  const porter = place(g, 'porter', e);
  const coins = [];
  g.on('bonusCoins', (c) => coins.push(c.amount));
  for (let i = 0; i < 24; i++) porter.ability.fire(porter, e, g);
  assert.equal(coins.length, 2, 'two payouts in 24 attacks');
  const cook = place(g, 'camp-cook', e, 1);
  coins.length = 0;
  for (let i = 0; i < 10 * 30 + 2; i++) cook.ability.update(cook, 1 / 30, g);
  assert.deepEqual(coins, [Math.floor(3 * BALANCE.global.abilityCoinMult)], 'Camp Cook: 3 coins (+15% ability coins) each 10 s');
  // Traveling Trader: 0.5 per kill, capped at 20 per payout
  const trader = place(g, 'traveling-trader', e, 2);
  coins.length = 0;
  g.stats.kills += 1000;
  for (let i = 0; i < 15 * 30 + 2; i++) trader.ability.update(trader, 1 / 30, g);
  assert.equal(coins.length, 1);
  assert.ok(coins[0] <= Math.ceil(20 * BALANCE.global.abilityCoinMult), `capped: ${coins[0]}`);
  // Golden Merchant: 8 + 1/kill (max 20) every 5 s, +50 every 30 s
  const gm = place(g, 'golden-merchant', e, 3);
  coins.length = 0;
  g.stats.kills += 5;
  for (let i = 0; i < 5 * 30 + 2; i++) gm.ability.update(gm, 1 / 30, g);
  assert.ok(Math.abs(coins[0] - (8 + 5) * 1.15) <= 1, `8 + 5 kills: ${coins[0]}`); // fractions carry over between payouts
  coins.length = 0;
  g.stats.kills += 999;
  for (let i = 0; i < 25 * 30 + 2; i++) gm.ability.update(gm, 1 / 30, g);
  assert.ok(coins.some((c) => Math.abs(c - 50 * 1.15) <= 1), 'vault pays 50');
  assert.ok(Math.max(...coins) <= Math.ceil(50 * 1.15) + 1 && coins.filter((c) => Math.abs(c - 50 * 1.15) > 1).every((c) => c <= Math.ceil(28 * 1.15) + 1), 'kill share capped at 20 per payout');
});

test('Caravan support: Scout +15% near the exit, Cartographer +12% range and targets the leader, Caravan Master rally (+15% for 6 s) + 10 coins', () => {
  const g = arena(5);
  const route = g.map.routes[0];
  const late = foe(g, route.length * 0.9);
  const scout = place(g, 'caravan-scout', late);
  const dmg = [];
  g.on('fire', (p) => p.source === scout && dmg.push(p.damage));
  scout.ability.fire(scout, late, g);
  const early = foe(g, route.length * 0.2);
  scout.ability.fire(scout, early, g);
  assert.ok(close(dmg[0] / dmg[1], 1.15, 1e-9));
  const cart = place(g, 'cartographer', late, 2);
  const ally = place(g, 'cadet', late, 3);
  assert.ok(close(ally.stats.range, levelStats(getUnit('cadet'), 0).range * 1.12, 1e-6), 'Survey +12% range nearby');
  assert.equal(getUnit('cartographer').targeting, 'first');
  void cart;
  const master = place(g, 'caravan-master', late, 4);
  const base = ally.stats.damage;
  const paid = [];
  g.on('bonusCoins', (c) => c.amount > 0 && paid.push(c.amount));
  for (let i = 0; i < 20 * 30 + 2; i++) master.ability.update(master, 1 / 30, g);
  assert.ok(close(ally.stats.damage / base, 1.15, 1e-9), 'rally +15% damage');
  assert.equal(paid[0], Math.floor(10 * 1.15));
  run(g, 6.2);
  assert.ok(close(ally.stats.damage, base, 1e-9), 'rally expires after 6 s');
});

test('Clockwork: Springling 3× every 8th, Gearshot pierces 3, Steam Golem slows 15%, Chrono −25% cooldowns for 5 s, Automaton gear hits 6', () => {
  const g = arena(6);
  const e = foe(g);
  const sp = place(g, 'springling', e);
  const d = [];
  g.on('fire', (p) => p.source === sp && d.push(p.damage));
  for (let i = 0; i < 16; i++) sp.ability.fire(sp, e, g);
  assert.deepEqual(d.map((x) => close(x, sp.stats.damage * 3)), Array.from({ length: 16 }, (_, i) => (i + 1) % 8 === 0));
  // a column of enemies: piercing hits exactly 3
  const g2 = arena(7);
  const col = [0, 1, 2, 3, 4].map((k) => foe(g2, 300 + k * 12));
  const gs = place(g2, 'gearshot', col[2]);
  const hit = g2.pierce(gs, col[0], { count: 3, kind: 'gearbolt' });
  assert.equal(hit.length, 3);
  const golem = place(g2, 'steam-golem', col[2], 1);
  for (let i = 0; i < 12 * 30 + 2; i++) golem.ability.update(golem, 1 / 30, g2);
  assert.ok(col.some((x) => x.statuses?.slowed > g2.time && close(x.statusAmount.slowed, 0.15)), 'steam slows 15%');
  const chrono = place(g2, 'chrono-mechanic', col[2], 2);
  const ally = place(g2, 'cadet', col[2], 3);
  const r0 = ally.stats.rate;
  for (let i = 0; i < 15 * 30 + 2; i++) chrono.ability.update(chrono, 1 / 30, g2);
  assert.ok(close(ally.stats.rate / r0, 1 / 0.75, 1e-9), '25% shorter cooldowns');
  run(g2, 5.2);
  assert.ok(close(ally.stats.rate, r0, 1e-9), 'warp expires');
  const ga = place(g2, 'grand-automaton', col[2], 4);
  const lines = [];
  g2.on('beam', (b) => b.source === ga && lines.push(b));
  for (let i = 0; i < 10; i++) ga.ability.fire(ga, col[0], g2);
  assert.equal(lines.length, 1, 'gear on the 10th attack');
  assert.equal(lines[0].kind, 'gear');
});

test('Eternal Engine: Overdrive +60% speed / +30% damage for 8 s; kills extend it by 0.5 s up to +5 s', () => {
  const g = arena(8);
  const e = foe(g);
  const u = place(g, 'eternal-engine', e);
  const base = { ...u.stats };
  for (let i = 0; i < 25 * 30 + 2; i++) u.ability.update(u, 1 / 30, g);
  assert.ok(close(u.stats.rate / base.rate, 1.6, 1e-9) && close(u.stats.damage / base.damage, 1.3, 1e-9));
  const end0 = u.overdriveUntil;
  for (let i = 0; i < 30; i++) u.ability.onKill(u, e, g);
  assert.ok(close(u.overdriveUntil - end0, 5, 1e-9), 'extension capped at +5 s');
  g.time = u.overdriveUntil + 0.01;
  u.ability.update(u, 1 / 30, g);
  assert.ok(close(u.stats.rate, base.rate, 1e-9) && close(u.stats.damage, base.damage, 1e-9), 'Overdrive ends cleanly');
});

test('Jungle: Vine slow 5%/2 s, Dartkeeper pierces 4 on every 7th, Panther +20% below half, Spores +5% damage taken, roots slow 25%, Canopy +20%/+10% (jungle only)', () => {
  const g = arena(9);
  const e = foe(g, 300, { hp: 1000 });
  assert.deepEqual(getUnit('vine-tender').onHit, [{ status: 'slowed', chance: 1, amount: 0.05, duration: 2 }]);
  const pan = place(g, 'panther', e);
  const d = [];
  g.on('fire', (p) => p.source === pan && d.push(p.damage));
  pan.ability.fire(pan, e, g);
  e.hp = 400;
  pan.ability.fire(pan, e, g);
  assert.ok(close(d[1] / d[0], 1.2, 1e-9));
  g.applyStatusTo(e, 'infected', { duration: 4 });
  assert.ok(close(statusDamageTakenMultiplier(e, g.time), 1.05));
  g.applyStatusTo(e, 'exposed', { amount: 0.2, duration: 4 });
  assert.ok(close(statusDamageTakenMultiplier(e, g.time), 1.2), 'damage-taken effects never stack: the strongest applies');
  const tre = place(g, 'elder-treant', e, 1);
  for (let i = 0; i < 15 * 30 + 2; i++) tre.ability.update(tre, 1 / 30, g);
  assert.ok(g.hazards.some((h) => h.kind === 'roots' && h.statusOpts.amount === 0.25 && h.max === 4));
  const dk = place(g, 'dartkeeper', e, 2);
  const beams = [];
  g.on('beam', (b) => b.source === dk && beams.push(b));
  for (let i = 0; i < 14; i++) dk.ability.fire(dk, e, g);
  assert.equal(beams.length, 2, 'every 7th dart pierces');
  const jungle = place(g, 'vine-tender', e, 3);
  const outsider = place(g, 'cadet', e, 4);
  const j0 = jungle.stats.damage;
  const o0 = outsider.stats.damage;
  place(g, 'canopy-warden', e, 5);
  assert.ok(close(jungle.stats.damage / j0, 1.2, 1e-9) && close(outsider.stats.damage, o0), 'Canopy blesses jungle units only');
});

test('Heart of the Wild: overgrowth zone (8 s, continuous damage, +20% damage taken) and +1% per 50 eliminations up to +30%', () => {
  const g = arena(10);
  const e = foe(g);
  const u = place(g, 'heart-of-the-wild', e);
  for (let i = 0; i < 25 * 30 + 2; i++) u.ability.update(u, 1 / 30, g);
  const z = g.hazards.find((h) => h.kind === 'overgrowth');
  assert.ok(z && z.max === 8 && z.dps > 0 && z.statusOpts.amount === 0.2);
  g.stats.kills += 120;
  u.ability.update(u, 1 / 30, g);
  assert.ok(close(u.bonus.damage, 0.02));
  g.stats.kills += 1e6;
  u.ability.update(u, 1 / 30, g);
  assert.ok(close(u.bonus.damage, 0.3), 'capped at +30%');
});

test('Skybound: Roc +25% vs bosses, Stormcaller hits 6, Admiral +12%/+12% map-wide, Tempest storm 5 s, Zenith strikes bosses first', () => {
  const g = arena(11);
  const boss = foe(g, 300, { boss: true });
  const reg = foe(g, 320);
  const roc = place(g, 'roc-rider', boss);
  const d = [];
  g.on('fire', (p) => p.source === roc && d.push(p.damage));
  roc.ability.fire(roc, reg, g);
  roc.ability.fire(roc, boss, g);
  assert.ok(close(d[1] / d[0], 1.25, 1e-9));
  const many = [0, 1, 2, 3, 4, 5, 6, 7].map((k) => foe(g, 240 + k * 10));
  const sc = place(g, 'stormcaller', many[3], 1);
  const zaps = [];
  g.on('zap', (z) => z.source === sc && zaps.push(z));
  for (let i = 0; i < 10 * 30 + 2; i++) sc.ability.update(sc, 1 / 30, g);
  assert.equal(zaps.length, 6);
  const far = g.deploy('cadet', ...near(g, 0, 0)[0]);
  const r0 = far.stats.range;
  place(g, 'sky-admiral', boss, 2);
  assert.ok(close(far.stats.range / r0, 1.12, 1e-9), 'map-wide');
  const ts = place(g, 'tempest-sovereign', boss, 3);
  for (let i = 0; i < 20 * 30 + 2; i++) ts.ability.update(ts, 1 / 30, g);
  assert.ok(g.hazards.some((h) => h.kind === 'storm' && h.max === 5 && h.dps > 0));
  const eye = place(g, 'eye-of-the-zenith', boss, 4);
  const hits = [];
  g.on('zap', (z) => z.source === eye && hits.push(z));
  for (let i = 0; i < 38 * 30; i++) eye.ability.update(eye, 1 / 30, g);
  assert.ok(hits.length >= 4, `${hits.length} strikes`);
  assert.ok(hits.every((h) => h.x === boss.x && h.y === boss.y), 'bosses first');
});

test('Astral: Star Reader 2.5× every 10th, Comet leaves stardust, Moon Prism beam hits 8, Eclipse +20%, Nebula +20% speed, Oracle +25% for all, Singularity pulls + detonates + 25%', () => {
  const g = arena(12);
  const e = foe(g);
  const sr = place(g, 'star-reader', e);
  const d = [];
  g.on('fire', (p) => p.source === sr && d.push(p.damage));
  for (let i = 0; i < 10; i++) sr.ability.fire(sr, e, g);
  assert.ok(close(d[9] / d[0], 2.5, 1e-9));
  assert.equal(getUnit('comet-scribe').impactHazard.kind, 'stardust');
  const col = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((k) => foe(g, 200 + k * 10));
  const mp = place(g, 'moon-prism', col[5], 1);
  const beams = [];
  g.on('beam', (b) => b.source === mp && beams.push(b));
  for (let i = 0; i < 12 * 30 + 2; i++) mp.ability.update(mp, 1 / 30, g);
  assert.equal(beams[0]?.kind, 'moonbeam');
  assert.ok(beams[0].hits <= 8 && beams[0].hits >= 1);
  const ec = place(g, 'eclipse-adept', e, 2);
  for (let i = 0; i < 10 * 30 + 2; i++) ec.ability.update(ec, 1 / 30, g);
  const marked = g.enemies.filter((x) => x.statuses?.exposed > g.time && close(x.statusAmount.exposed, 0.2));
  assert.ok(marked.length >= 1);
  const ally = place(g, 'cadet', e, 3);
  const rate0 = ally.stats.rate;
  place(g, 'nebula-architect', e, 4);
  assert.ok(close(ally.stats.rate / rate0, 1.2, 1e-9));
  const dmg0 = ally.stats.damage;
  const or = place(g, 'celestial-oracle', e, 5);
  for (let i = 0; i < 25 * 30 + 2; i++) or.ability.update(or, 1 / 30, g);
  assert.ok(close(ally.stats.damage / dmg0, 1.25, 1e-9), 'blessing reaches everyone');
  const sm = place(g, 'singularity-monarch', e, 6);
  for (let i = 0; i < 35 * 30 + 2; i++) sm.ability.update(sm, 1 / 30, g);
  assert.ok(g.fields.some((f) => f.kind === 'singularity'));
  run(g, 3.2);
  assert.ok(g.enemies.some((x) => x.statuses?.exposed > g.time && close(x.statusAmount.exposed, 0.25)), 'detonation exposes by 25%');
});

test('stacking stays bounded with Pack 2: all buffs + timed buffs + Nova never exceed the caps; income units diminish per copy', () => {
  const g = arena(13);
  const e = foe(g);
  const ally = place(g, 'vine-tender', e);
  const base = levelStats(getUnit('vine-tender'), 0);
  let k = 1;
  for (const id of ['canopy-warden', 'sky-admiral', 'nebula-architect', 'cartographer', 'colonel', 'general', 'marshal', 'glorious-leader', 'the-house', 'grand-captain']) place(g, id, e, k++);
  const or = place(g, 'celestial-oracle', e, k++);
  const ch = place(g, 'chrono-mechanic', e, k++);
  const cm = place(g, 'caravan-master', e, k++);
  for (let i = 0; i < 30 * 30; i++) for (const u of [or, ch, cm]) u.ability.update(u, 1 / 30, g);
  g.weather.start('nova');
  const C = BALANCE.caps;
  assert.ok(ally.stats.damage <= base.damage * C.buffDamage * (1 + C.additiveDamage) * 1.3 + 1e-6);
  assert.ok(ally.stats.rate <= base.rate * C.buffRate / 0.6 + 1e-6);
  assert.ok(ally.stats.range <= base.range * C.buffRange + 1e-6);
  // two Golden Merchants: the second earns 1/√2
  const a = place(g, 'golden-merchant', e, k++);
  const b = place(g, 'golden-merchant', e, k++);
  assert.ok(close(g.copyIncomeFactor(a), 1) && close(g.copyIncomeFactor(b), 1 / Math.SQRT2));
});

test('Pack 2 survives endless waves with Auto Skip, weather and older units without errors', () => {
  const g = new Game({ seed: 21, loadout: ['porter', 'gearshot', 'elder-treant', 'stormcaller', 'moon-prism', 'eye-of-the-zenith', 'singularity-monarch', 'heart-of-the-wild', 'eternal-engine', 'celestial-oracle', 'cadet', 'the-house'], weatherEnabled: true });
  g.coins = 1e9;
  g.towerHp = g.towerMaxHp = 1e15;
  const ids = g.loadout.map((x) => x.id);
  let k = 0;
  for (let y = 0; y < g.map.rows; y++) for (let x = 0; x < g.map.cols; x++) if (g.canPlace(x, y) && g.map.pathDist[y * g.map.cols + x] <= 2 && k < 60) g.deploy(ids[k++ % ids.length], x, y);
  g.callWaves(30);
  g.autoSkip = true;
  for (let i = 0; i < 240 * 20; i++) g.update(1 / 20);
  assert.ok(g.stats.wavesCleared >= 20, `${g.stats.wavesCleared} waves`);
  for (const u of g.units) for (const v of Object.values(u.stats)) if (typeof v === 'number') assert.ok(Number.isFinite(v), u.def.id);
  assert.ok(Number.isFinite(g.coins));
});
