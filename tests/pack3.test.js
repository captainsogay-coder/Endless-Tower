// Circle Pack 3: Royal Academy, Frostbound Legion, Arcane Library, Titan Foundry
// – circles, every unit and every ability.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/game/Game.js';
import { registerRoster, ROSTER } from '../src/units/roster.js';
import { getUnit, validateUnitDef } from '../src/units/unitRegistry.js';
import { levelStats, maxLevel } from '../src/units/unitStats.js';
import { getBanner, summon, pull, isRareEntry, duplicateCompensation, listCirclesByPrice } from '../src/units/summoning.js';
import { PACK3_UNITS } from '../src/units/defs/pack3.js';
import { Profile, memoryStorage } from '../src/meta/profile.js';
import { createRng } from '../src/core/rng.js';
import { sideTiers, isStale } from '../src/meta/sideTiers.js';
import { BALANCE } from '../src/balance.js';
import { statusDamageTakenMultiplier, statusSpeedMultiplier } from '../src/game/effects.js';
import { worldbreakMult } from '../src/game/abilities.js';
import { SIDE_TIER_DATA } from '../src/units/sideTiers.data.js';

const combat = (id) => SIDE_TIER_DATA.units[id].raw.combat;

registerRoster();
const ALL = ROSTER.map((d) => d.id);
const close = (a, b, eps = 1e-9) => Math.abs(a - b) < eps;

const SPEC = {
  'royal-academy-circle': [220, [['squire', 1, 0.3], ['trainee-guard', 2, 0.25], ['practice-archer', 2, 0.18], ['duelist', 4, 0.12], ['battle-instructor', 5, 0.08], ['royal-graduate', 7, 0.05], ['grandmaster', 10, 0.02]]],
  'frostbound-legion-circle': [650, [['frost-recruit', 3, 0.3], ['ice-archer', 5, 0.23], ['snow-berserker', 7, 0.18], ['frost-mage', 9, 0.13], ['glacier-knight', 11, 0.09], ['winter-general', 15, 0.05], ['eternal-winter', 19, 0.02]]],
  'arcane-library-circle': [950, [['page-apprentice', 4, 0.3], ['rune-caster', 6, 0.23], ['spellblade', 8, 0.18], ['arcane-scholar', 10, 0.13], ['void-reader', 13, 0.09], ['archmage', 17, 0.05], ['forbidden-author', 21, 0.02]]],
  'titan-foundry-circle': [1500, [['iron-hauler', 6, 0.3], ['forge-brute', 9, 0.23], ['molten-giant', 12, 0.18], ['steel-colossus', 15, 0.13], ['warforged-titan', 18, 0.09], ['foundry-overseer', 21, 0.05], ['worldbreaker', 25, 0.02]]],
};
const NAMES = {
  'royal-academy-circle': ['Squire', 'Trainee Guard', 'Practice Archer', 'Duelist', 'Battle Instructor', 'Royal Graduate', 'The Grandmaster'],
  'frostbound-legion-circle': ['Frost Recruit', 'Ice Archer', 'Snow Berserker', 'Frost Mage', 'Glacier Knight', 'Winter General', 'The Eternal Winter'],
  'arcane-library-circle': ['Page Apprentice', 'Rune Caster', 'Spellblade', 'Arcane Scholar', 'Void Reader', 'Archmage', 'The Forbidden Author'],
  'titan-foundry-circle': ['Iron Hauler', 'Forge Brute', 'Molten Giant', 'Steel Colossus', 'Warforged Titan', 'Foundry Overseer', 'The Worldbreaker'],
};

test('four new circles: exact prices, names, tiers and odds (100%), Tokens only, 2% chase units get the rare reveal', () => {
  const ids = new Set();
  for (const [id, [price, pool]] of Object.entries(SPEC)) {
    const b = getBanner(id);
    assert.equal(b.currency, 'tokens');
    assert.equal(b.price, price);
    assert.deepEqual(b.counts, [1, 5, 10, 25]);
    assert.ok(close(b.pool.reduce((t, p) => t + p.chance, 0), 1, 1e-12), `${id} totals 100%`);
    assert.deepEqual(b.pool.map((p) => [p.unit, getUnit(p.unit).tier, p.chance]), pool);
    assert.deepEqual(b.pool.map((p) => getUnit(p.unit).name), NAMES[id]);
    assert.equal(duplicateCompensation(b), Math.round(price * 0.3));
    assert.deepEqual(b.pool.filter(isRareEntry).map((p) => p.unit), [pool.at(-1)[0]], 'only the chase unit is rare');
    for (const p of b.pool) ids.add(p.unit);
  }
  assert.equal(ids.size, 28);
  assert.equal(PACK3_UNITS.length, 28);
  const circles = listCirclesByPrice();
  assert.equal(circles.length, 18);
  assert.deepEqual(circles.map((b) => b.price), [100, 150, 180, 220, 250, 250, 300, 300, 400, 500, 500, 650, 850, 950, 1200, 1500, 1800, 2500]);
  assert.equal(ROSTER.length, 90 + 28 + 14);
});

test('every one of the 28 can be summoned with x1/x5/x10/x25 (Tokens only), is saved, duplicates refund Tokens, chase rate is 2%', () => {
  const storage = memoryStorage();
  const p = new Profile({ storage, starterUnits: ['dude'] });
  const rng = createRng(91);
  for (const id of Object.keys(SPEC)) {
    const b = getBanner(id);
    for (const n of [1, 5, 10]) {
      p.earn('tokens', b.price * n);
      const before = p.balance('tokens');
      const r = summon(p, b, n, rng);
      assert.ok(r.ok && r.results.length === n);
      assert.equal(p.balance('tokens'), before - b.price * n + r.results.reduce((t, x) => t + x.compensation, 0));
    }
    for (let i = 0; i < 400 && !b.pool.every((e) => p.isUnlocked(e.unit)); i++) {
      p.earn('tokens', b.price * 25);
      assert.ok(summon(p, b, 25, rng).ok);
    }
    for (const e of b.pool) assert.ok(p.isUnlocked(e.unit), `${e.unit} obtained`);
  }
  assert.deepEqual(Object.keys(p.data.wallet), ['tokens']);
  const reloaded = new Profile({ storage, starterUnits: ['dude'] });
  for (const u of PACK3_UNITS) assert.ok(reloaded.isUnlocked(u.id), `${u.id} saved`);
  const b = getBanner('titan-foundry-circle');
  reloaded.earn('tokens', 1500 * 10);
  const before = reloaded.balance('tokens');
  summon(reloaded, b, 10, createRng(4));
  assert.equal(reloaded.balance('tokens'), before - 15000 + 10 * 450, 'every duplicate pays 450 Tokens');
  for (const [id, chaseId] of [['royal-academy-circle', 'grandmaster'], ['titan-foundry-circle', 'worldbreaker']]) {
    const r = createRng(id.length);
    let n = 0;
    for (let i = 0; i < 200000; i++) if (pull(getBanner(id), r).unit === chaseId) n++;
    assert.ok(Math.abs(n / 200000 - 0.02) < 0.002, `${chaseId} ${n}`);
  }
});

function arena(seed = 2) {
  const g = new Game({ seed, loadout: ALL, weatherEnabled: false });
  g.coins = 1e12;
  g.towerHp = g.towerMaxHp = 1e12;
  return g;
}
const W = { number: 1, alive: 0, plan: { scaling: { hp: 1, speed: 1, damage: 1, reward: 1 } } };
function foe(g, d = 260, { hp = 1e9, boss = false, elite = false, still = true } = {}) {
  const e = g.spawnEnemy({ category: boss ? 'boss' : elite ? 'elite' : 'regular', route: 0, offset: d }, { ...W });
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
const tick = (g, u, s) => {
  for (let i = 0; i < s * 30 + 2; i++) u.ability.update(u, 1 / 30, g);
};

test('all 28 deploy, upgrade to max, attack in real combat, show panel lines and have current side tiers', () => {
  for (const def of PACK3_UNITS) {
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

test('tiers matter: price, base damage and combat rating rise with tier inside every circle; T1–T2 stay cheap and T25 is exceptional', () => {
  for (const [, [, pool]] of Object.entries(SPEC)) {
    const defs = pool.map(([id]) => getUnit(id));
    for (let i = 1; i < defs.length; i++) {
      if (defs[i].tier === defs[i - 1].tier) continue;
      assert.ok(defs[i].price > defs[i - 1].price, `${defs[i].id} costs more`);
      assert.ok(combat(defs[i].id) >= combat(defs[i - 1].id) - 1, `${defs[i].id} rates at least as high`);
    }
  }
  assert.ok(getUnit('squire').price <= 15 && getUnit('practice-archer').price <= 35 && getUnit('trainee-guard').price <= 40);
  const wb = combat('worldbreaker');
  for (const d of ROSTER) if (d.id !== 'worldbreaker' && d.id !== 'ghost-warrior') assert.ok(combat(d.id) < wb, `${d.id} below the Worldbreaker`);
});

test('Royal Academy: Squire 2× every 10th, Trainee +10% beside a classmate, Duelist +20% below half, Instructor +12% (Academy only), Graduate 5× strike, Grandmaster exam + count bonus', () => {
  const g = arena(4);
  const e = foe(g, 300, { hp: 1000 });
  const sq = place(g, 'squire', e);
  const d = [];
  g.on('fire', (p) => p.source === sq && d.push(p.damage));
  for (let i = 0; i < 10; i++) sq.ability.fire(sq, e, g);
  assert.ok(close(d[9] / d[0], 2) && close(d[8], d[0]));
  // Trainee alone: no bonus; next to the squire: +10%
  const g2 = arena(5);
  const e2 = foe(g2);
  const tg = place(g2, 'trainee-guard', e2);
  tick(g2, tg, 1);
  assert.equal(tg.bonus?.damage ?? 0, 0);
  const lone = tg.stats.damage;
  place(g2, 'squire', e2, 1);
  tick(g2, tg, 1);
  assert.ok(close(tg.stats.damage / lone, 1.1, 1e-9), 'drill partner +10%');
  const du = place(g, 'duelist', e, 1);
  const dd = [];
  g.on('fire', (p) => p.source === du && dd.push(p.damage));
  du.ability.fire(du, e, g);
  e.hp = 400;
  du.ability.fire(du, e, g);
  assert.ok(close(dd[1] / dd[0], 1.2, 1e-9));
  // Instructor reaches Academy units only
  const g3 = arena(6);
  const e3 = foe(g3);
  const ac = place(g3, 'practice-archer', e3);
  const out = place(g3, 'cadet', e3, 1);
  const a0 = ac.stats.damage;
  const o0 = out.stats.damage;
  place(g3, 'battle-instructor', e3, 2);
  assert.ok(close(ac.stats.damage / a0, 1.12, 1e-9) && close(out.stats.damage, o0), 'Instruction is Academy only');
  // Graduate: 5× strike every 15 s at the strongest
  const g4 = arena(7);
  const weak = foe(g4, 300, { hp: 100 });
  const strong = foe(g4, 310, { hp: 5000 });
  const gr = place(g4, 'royal-graduate', weak);
  const shots = [];
  g4.on('fire', (p) => p.source === gr && shots.push(p));
  tick(g4, gr, 15);
  assert.equal(shots.length, 1);
  assert.ok(shots[0].target === strong && close(shots[0].damage, gr.stats.damage * 5) && shots[0].kind === 'graduate');
  // Grandmaster: +3% per other Academy unit (cap 30%), and the exam buff (Academy only)
  const g5 = arena(8);
  const e5 = foe(g5);
  const gm = place(g5, 'grandmaster', e5);
  const solo = gm.stats.damage;
  const ar = place(g5, 'practice-archer', e5, 1);
  place(g5, 'squire', e5, 2);
  assert.ok(close(gm.stats.damage / solo, 1.06, 1e-9), '+3% per other Academy unit');
  const outsider = place(g5, 'cadet', e5, 3);
  const r0 = ar.stats.rate;
  const d0 = ar.stats.damage;
  const od = outsider.stats.damage;
  tick(g5, gm, 20);
  assert.ok(close(ar.stats.damage / d0, 1.25, 1e-9) && close(ar.stats.rate / r0, 1.2, 1e-9), 'exam +25% damage, +20% speed');
  assert.ok(close(outsider.stats.damage, od), 'exam is Academy only');
  run(g5, 6.2);
  assert.ok(close(ar.stats.damage, d0, 1e-9), 'exam lasts 6 s');
  for (let k = 0; k < 14; k++) place(g5, 'squire', e5, 4 + k);
  assert.ok(gm.stats.damage / solo <= 1.3 + 1e-9, 'count bonus capped at +30%');
});

test('Frostbound Legion: Recruit slow 5%, Ice Archer freezes on every 6th (bosses only slowed), Berserker +40% vs slowed, Mage slows 15%, Glacier shockwave, General +15% vs slowed map-wide, Eternal Winter blizzard', () => {
  assert.deepEqual(getUnit('frost-recruit').onHit, [{ status: 'slowed', chance: 1, amount: 0.05, duration: 2 }]);
  assert.deepEqual(getUnit('frost-mage').onHit, [{ status: 'slowed', chance: 1, amount: 0.15, duration: 2.5 }]);
  const g = arena(9);
  const e = foe(g, 300, { still: false });
  const ia = place(g, 'ice-archer', e);
  for (let i = 0; i < 6; i++) ia.ability.fire(ia, e, g);
  run(g, 0.3);
  assert.ok(e.statuses?.frozen > g.time && statusSpeedMultiplier(e, g.time) === 0, 'frozen solid');
  const boss = foe(g, 320, { boss: true });
  g.freeze(boss, 0.8);
  assert.ok(!(boss.statuses?.frozen > g.time) && close(statusSpeedMultiplier(boss, g.time), 0.5), 'bosses: 50% slow instead');
  const g2 = arena(10);
  const t = foe(g2);
  const sb = place(g2, 'snow-berserker', t);
  const d = [];
  g2.on('fire', (p) => p.source === sb && d.push(p.damage));
  sb.ability.fire(sb, t, g2);
  g2.applyStatusTo(t, 'slowed', { amount: 0.05, duration: 3 });
  sb.ability.fire(sb, t, g2);
  assert.ok(close(d[1] / d[0], 1.4, 1e-9));
  // Glacier Knight shockwave around itself
  const gk = place(g2, 'glacier-knight', t, 1);
  const blasts = [];
  g2.on('blast', (b) => b.kind === 'frostwave' && blasts.push(b));
  tick(g2, gk, 12);
  assert.ok(blasts.length === 1 && blasts[0].x === gk.x && blasts[0].y === gk.y);
  // Winter General: damage vs slowed only, every ally on the map
  const g3 = arena(11);
  const s1 = foe(g3, 300);
  const far = g3.deploy('cadet', ...near(g3, 0, 0)[0]);
  place(g3, 'winter-general', s1);
  assert.ok(close(far.stats.vsSlowed, 0.15), 'map-wide');
  const hp0 = s1.hp;
  g3.damageEnemy(s1, 100, far);
  const plain = hp0 - s1.hp;
  g3.applyStatusTo(s1, 'slowed', { amount: 0.05, duration: 3 });
  const hp1 = s1.hp;
  g3.damageEnemy(s1, 100, far);
  assert.ok(close((hp1 - s1.hp) / plain, 1.15, 1e-9), '+15% vs slowed');
  // Eternal Winter: 8 s blizzard, 25% slow, continuous damage
  const ew = place(g3, 'eternal-winter', s1, 1);
  tick(g3, ew, 30);
  const z = g3.hazards.find((h) => h.kind === 'blizzard');
  assert.ok(z && z.max === 8 && z.dps > 0 && z.statusOpts.amount === 0.25 && z.radius >= 160);
});

test('Arcane Library: Apprentice 2× every 8th, Rune splash, Spellblade 3 fast + 1 heavy, Scholar hits 5, Void +15% for 5 s, Archmage +15%/+10%, Forbidden Author hits every enemy + 25%', () => {
  const g = arena(12);
  const e = foe(g);
  const pa = place(g, 'page-apprentice', e);
  const d = [];
  g.on('fire', (p) => p.source === pa && d.push(p.damage));
  for (let i = 0; i < 8; i++) pa.ability.fire(pa, e, g);
  assert.ok(close(d[7] / d[0], 2));
  assert.ok(getUnit('rune-caster').levels[0].splash > 0);
  const sb = place(g, 'spellblade', e, 1);
  const cds = [];
  const dm = [];
  g.on('fire', (p) => p.source === sb && dm.push(p.damage));
  for (let i = 0; i < 8; i++) {
    sb.ability.fire(sb, e, g);
    cds.push(sb.cooldown * sb.stats.rate);
  }
  assert.deepEqual(cds.map((c) => Math.round(c * 10) / 10), [0.7, 0.7, 0.7, 1.9, 0.7, 0.7, 0.7, 1.9]);
  assert.ok(close(dm[3] / dm[0], 2.4, 1e-9));
  const many = [0, 1, 2, 3, 4, 5, 6].map((k) => foe(g, 240 + k * 10));
  const sc = place(g, 'arcane-scholar', many[3], 2);
  const zaps = [];
  g.on('zap', (z) => z.source === sc && zaps.push(z));
  tick(g, sc, 12);
  assert.equal(zaps.length, 5);
  assert.deepEqual(getUnit('void-reader').onHit, [{ status: 'exposed', chance: 1, amount: 0.15, duration: 5 }]);
  const ally = place(g, 'cadet', e, 3);
  const a0 = { ...ally.stats };
  place(g, 'archmage', e, 4);
  assert.ok(close(ally.stats.damage / a0.damage, 1.15, 1e-9) && close(ally.stats.range / a0.range, 1.1, 1e-9));
  const g2 = arena(13);
  const foes = [100, 200, 300, 400, 500].map((k) => foe(g2, k));
  const fa = place(g2, 'forbidden-author', foes[2]);
  const hp0 = foes.map((x) => x.hp);
  tick(g2, fa, 35);
  assert.ok(foes.every((x, i) => close(hp0[i] - x.hp, fa.stats.damage * 4, 1e-6)), 'every enemy takes 4×');
  assert.ok(foes.every((x) => close(statusDamageTakenMultiplier(x, g2.time), 1.25)), '+25% damage taken');
  run(g2, 8.2);
  assert.ok(foes.every((x) => statusDamageTakenMultiplier(x, g2.time) === 1), 'mark lasts 8 s');
});

test('Titan Foundry: Molten pools burn, Colossus slam 5×, Warforged +25% vs bosses/elites, Overseer +15% aura and +25% surge, Worldbreaker charges then hits everything with a capped multiplier', () => {
  assert.equal(getUnit('molten-giant').impactHazard.kind, 'molten');
  assert.ok(getUnit('forge-brute').levels[0].splash > 0 && !getUnit('iron-hauler').levels[0].splash);
  const g = arena(14);
  const e = foe(g);
  const col = place(g, 'steel-colossus', e);
  const blasts = [];
  g.on('blast', (b) => b.kind === 'slam' && blasts.push(b));
  tick(g, col, 15);
  assert.ok(blasts.length === 1 && close(blasts[0].damage, col.stats.damage * 5));
  const wt = place(g, 'warforged-titan', e, 1);
  const elite = foe(g, 280, { elite: true });
  const boss = foe(g, 290, { boss: true });
  const d = [];
  g.on('fire', (p) => p.source === wt && d.push(p.damage));
  wt.ability.fire(wt, e, g);
  wt.ability.fire(wt, elite, g);
  wt.ability.fire(wt, boss, g);
  assert.ok(close(d[1] / d[0], 1.25, 1e-9) && close(d[2] / d[0], 1.25, 1e-9));
  const ally = place(g, 'cadet', e, 2);
  const a0 = ally.stats.damage;
  const ov = place(g, 'foundry-overseer', e, 3);
  assert.ok(close(ally.stats.damage / a0, 1.15, 1e-9), 'aura +15%');
  tick(g, ov, 25);
  assert.ok(close(ally.stats.damage / a0, 1.15 * 1.25, 1e-9), 'surge +25% on top');
  run(g, 5.2);
  assert.ok(close(ally.stats.damage / a0, 1.15, 1e-9), 'surge lasts 5 s');
  // Worldbreaker
  const a = getUnit('worldbreaker').ability;
  assert.ok(close(worldbreakMult(a, 0), 3) && close(worldbreakMult(a, 10), 4.5) && close(worldbreakMult(a, 1000), 6), 'controlled maximum 6×');
  const g2 = arena(15);
  const all = [80, 160, 240, 320, 400, 480].map((k) => foe(g2, k));
  const wb = place(g2, 'worldbreaker', all[2]);
  const hp0 = all.map((x) => x.hp);
  const events = [];
  g2.on('chaseCast', (c) => events.push(c.kind));
  tick(g2, wb, 40);
  assert.ok(wb.charging && events.includes('worldbreak-charge'));
  assert.ok(all.every((x, i) => x.hp === hp0[i]), 'nothing happens during the charge');
  const m = worldbreakMult(a, all.length);
  run(g2, 2.1);
  assert.ok(!wb.charging);
  assert.ok(all.every((x, i) => hp0[i] - x.hp >= wb.stats.damage * m - 1e-6), 'the slam reaches every enemy on the map');
});

test('stacking stays bounded with Pack 3: auras, timed buffs, exam, surges and Nova never exceed the caps', () => {
  const g = arena(16);
  const e = foe(g);
  const ally = place(g, 'practice-archer', e);
  const base = levelStats(getUnit('practice-archer'), 0);
  let k = 1;
  for (const id of ['battle-instructor', 'archmage', 'foundry-overseer', 'winter-general', 'canopy-warden', 'sky-admiral', 'nebula-architect', 'colonel', 'general', 'marshal', 'glorious-leader', 'the-house']) place(g, id, e, k++);
  const casters = ['grandmaster', 'foundry-overseer', 'celestial-oracle', 'chrono-mechanic', 'caravan-master'].map((id) => place(g, id, e, k++));
  for (let i = 0; i < 40 * 30; i++) for (const u of casters) u.ability.update(u, 1 / 30, g);
  g.weather.start('nova');
  const C = BALANCE.caps;
  assert.ok(ally.stats.damage <= base.damage * C.buffDamage * (1 + C.additiveDamage) * 1.3 + 1e-6);
  assert.ok(ally.stats.rate <= base.rate * C.buffRate / 0.6 + 1e-6);
  assert.ok(ally.stats.range <= base.range * C.buffRange + 1e-6);
  assert.ok(ally.stats.vsSlowed <= C.buffDamage - 1 + 1e-9);
  // several Winter Generals still give the bonus once
  for (let i = 0; i < 3; i++) place(g, 'winter-general', e, k++);
  assert.ok(close(ally.stats.vsSlowed, 0.15));
});

test('Pack 3 survives early, mid and late endless waves with Auto Skip, weather, bosses and older units without errors', () => {
  const g = new Game({ seed: 33, loadout: ['squire', 'trainee-guard', 'frost-recruit', 'ice-archer', 'frost-mage', 'spellblade', 'forbidden-author', 'eternal-winter', 'molten-giant', 'worldbreaker', 'grandmaster', 'cadet'], weatherEnabled: true });
  g.coins = 1e9;
  g.towerHp = g.towerMaxHp = 1e15;
  const ids = g.loadout.map((x) => x.id);
  let k = 0;
  for (let y = 0; y < g.map.rows; y++) for (let x = 0; x < g.map.cols; x++) if (g.canPlace(x, y) && g.map.pathDist[y * g.map.cols + x] <= 2 && k < 60) g.deploy(ids[k++ % ids.length], x, y);
  g.callWaves(40);
  g.autoSkip = true;
  for (let i = 0; i < 300 * 20; i++) g.update(1 / 20);
  assert.ok(g.stats.wavesCleared >= 25, `${g.stats.wavesCleared} waves`);
  assert.ok(g.stats.bossesDefeated >= 1, 'bosses fought');
  for (const u of g.units) for (const v of Object.values(u.stats)) if (typeof v === 'number') assert.ok(Number.isFinite(v), u.def.id);
  assert.ok(Number.isFinite(g.coins));
});
