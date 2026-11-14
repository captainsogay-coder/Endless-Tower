import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/game/Game.js';
import { registerRoster, ROSTER } from '../src/units/roster.js';
import { getUnit, validateUnitDef } from '../src/units/unitRegistry.js';
import { levelStats } from '../src/units/unitStats.js';
import { getBanner, summon, pull, isRare, duplicateCompensation, VILLAGE_MILITIA_CIRCLE, TOWN_GUARD_CIRCLE, SIEGE_WORKSHOP_CIRCLE } from '../src/units/summoning.js';
import { Profile, memoryStorage } from '../src/meta/profile.js';
import { createRng } from '../src/core/rng.js';

registerRoster();
const ALL = ROSTER.map((d) => d.id);
const close = (a, b, eps = 1e-9) => Math.abs(a - b) < eps;
function arena(seed = 1) {
  const g = new Game({ seed, loadout: ALL, weatherEnabled: false });
  g.coins = 1e12;
  g.towerMaxHp = g.towerHp = 1e12;
  return g;
}
const FAKE_WAVE = { number: 1, alive: 0, plan: { scaling: { hp: 1, speed: 1, damage: 1, reward: 1 } } };
function foe(g, d = 260, hp = 1e9) {
  const e = g.spawnEnemy({ category: 'regular', route: 0, offset: d }, { ...FAKE_WAVE });
  e.hp = e.maxHp = hp;
  e.speed = 0;
  e.armor = 0;
  g.update(1e-4);
  return e;
}
function near(g, x, y) {
  const out = [];
  for (let r = 0; r < g.map.rows; r++) for (let c = 0; c < g.map.cols; c++) if (g.canPlace(c, r)) out.push([c, r, Math.hypot(c * 32 + 16 - x, r * 32 + 16 - y)]);
  return out.sort((a, b) => a[2] - b[2]).map(([c, r]) => [c, r]);
}
function place(g, id, e, k = 0, { fire = false } = {}) {
  const t = near(g, e.x, e.y)[k];
  const u = g.deploy(id, t[0], t[1]);
  if (!fire) u.cooldown = 1e9;
  return u;
}
function shots(g, u) {
  const list = [];
  g.on('fire', (p) => p.source === u && list.push({ dmg: p.damage, kind: p.kind, crit: p.crit }));
  return list;
}

test('Village Militia, Town Guard and Siege Workshop: Token prices, exact odds totalling 100%, tiers as specified', () => {
  const spec = {
    [VILLAGE_MILITIA_CIRCLE]: [100, { farmer: [1, 0.35], spearman: [1, 0.25], slingman: [2, 0.2], 'militia-archer': [2, 0.12], 'village-captain': [3, 0.07], 'village-hero': [4, 0.01] }],
    [TOWN_GUARD_CIRCLE]: [250, { 'guard-recruit': [2, 0.3], crossbowman: [3, 0.25], 'guard-sergeant': [3, 0.2], halberdier: [4, 0.14], 'royal-patrol': [5, 0.08], 'grand-captain': [6, 0.025], 'kings-champion': [8, 0.005] }],
    [SIEGE_WORKSHOP_CIRCLE]: [400, { 'apprentice-engineer': [3, 0.3], ballista: [4, 0.25], catapult: [5, 0.2], bombardier: [5, 0.13], 'siege-commander': [6, 0.08], trebuchet: [8, 0.03], 'master-engineer': [10, 0.01] }],
  };
  for (const [id, [price, pool]] of Object.entries(spec)) {
    const b = getBanner(id);
    assert.equal(b.currency, 'tokens');
    assert.equal(b.price, price);
    assert.ok(close(b.pool.reduce((t, p) => t + p.chance, 0), 1, 1e-12), `${id} = 100%`);
    assert.deepEqual(b.pool.map((p) => p.unit), Object.keys(pool));
    for (const p of b.pool) {
      assert.equal(p.chance, pool[p.unit][1]);
      assert.equal(getUnit(p.unit).tier, pool[p.unit][0], p.unit);
      assert.deepEqual(validateUnitDef(getUnit(p.unit)), [], p.unit);
      assert.ok(getUnit(p.unit).profile, `${p.unit} is tier-generated`);
    }
    assert.equal(duplicateCompensation(b), Math.round(price * 0.3));
  }
  assert.deepEqual(['village-hero', 'kings-champion', 'master-engineer'].map((id) => [VILLAGE_MILITIA_CIRCLE, TOWN_GUARD_CIRCLE, SIEGE_WORKSHOP_CIRCLE].some((b) => getBanner(b).pool.some((p) => p.unit === id && isRare(p.chance)))), [true, true, true], 'chase units get the rare reveal');
});

test('chase units drop at their exact rates (2,000,000 pulls) and summons charge Tokens only', () => {
  for (const id of [VILLAGE_MILITIA_CIRCLE, TOWN_GUARD_CIRCLE, SIEGE_WORKSHOP_CIRCLE]) {
    const b = getBanner(id);
    const rng = createRng(31);
    const n = 2_000_000;
    const counts = new Map();
    for (let i = 0; i < n; i++) {
      const u = pull(b, rng).unit;
      counts.set(u, (counts.get(u) ?? 0) + 1);
    }
    for (const p of b.pool) {
      const sd = Math.sqrt((p.chance * (1 - p.chance)) / n);
      assert.ok(Math.abs((counts.get(p.unit) ?? 0) / n - p.chance) < 5 * sd, p.unit);
    }
    const prof = new Profile({ storage: memoryStorage(), starterUnits: ['dude'] });
    prof.earn('tokens', b.price * 10);
    const r = summon(prof, b, 10, createRng(2));
    assert.ok(r.ok);
    assert.equal(prof.balance('tokens'), r.compensation);
    assert.deepEqual(Object.keys(prof.data.wallet), ['tokens']);
  }
});

test('The Village Hero: every 10th attack 4×; +1% per other deployed Village Militia unit, capped at +30%', () => {
  const g = arena(1);
  const e = foe(g);
  const h = place(g, 'village-hero', e);
  const base = levelStats(getUnit('village-hero'), 0).damage;
  assert.ok(close(h.stats.damage, base), 'alone: no bonus');
  const s = shots(g, h);
  for (let i = 0; i < 20; i++) h.ability.fire(h, e, g);
  assert.deepEqual(s.map((x) => close(x.dmg, h.stats.damage * 4)), Array.from({ length: 20 }, (_, i) => (i + 1) % 10 === 0));
  const tiles = near(g, e.x, e.y);
  const militia = ['farmer', 'spearman', 'slingman', 'militia-archer', 'village-captain'];
  for (let i = 0; i < 5; i++) g.deploy(militia[i], ...tiles[i + 2]);
  g.deploy('cadet', ...tiles[8]); // not militia: doesn't count
  const captainBuff = h.auras.includes('village-rally') ? 1.1 : 1;
  assert.equal(captainBuff, 1.1, 'the Captain sits next to the Hero, so Rally applies on top');
  assert.ok(close(h.stats.damage, base * 1.05 * captainBuff), '+5% for five militia units (+ Rally if in range)');
  for (let i = 0; i < 40; i++) g.deploy('farmer', ...tiles[i + 10]);
  assert.ok(close(h.stats.damage / captainBuff / base, 1.3), 'capped at +30%');
});

test('faction buffs only reach their own faction: Village Rally, Grand Captain, Siege Command', () => {
  const g = arena(2);
  const e = foe(g);
  const t = near(g, e.x, e.y);
  const farmer = g.deploy('farmer', ...t[0]);
  const cadet = g.deploy('cadet', ...t[1]);
  const recruit = g.deploy('guard-recruit', ...t[2]);
  const apprentice = g.deploy('apprentice-engineer', ...t[3]);
  const b = (id) => levelStats(getUnit(id), 0);
  g.deploy('village-captain', ...t[4]);
  g.deploy('grand-captain', ...t[5]);
  g.deploy('siege-commander', ...t[6]);
  assert.ok(close(farmer.stats.damage, b('farmer').damage * 1.1), 'Rally on militia');
  assert.ok(close(recruit.stats.damage, b('guard-recruit').damage * 1.12) && close(recruit.stats.rate, b('guard-recruit').rate * 1.08), 'Grand Captain on guards');
  assert.ok(close(apprentice.stats.damage, b('apprentice-engineer').damage * 1.15), 'Siege Command on siege units');
  assert.ok(close(cadet.stats.damage, b('cadet').damage) && close(cadet.stats.rate, b('cadet').rate), 'no faction buff on outsiders');
  // preview ring/stats on an empty tile match deployed stats (same faction rules)
  const [c, r] = t[7];
  const pv = g.previewStats('slingman', c, r);
  const sl = g.deploy('slingman', c, r);
  assert.ok(close(pv.damage, sl.stats.damage) && close(pv.range, sl.stats.range));
});

test("The King's Champion: a 5× strike at the strongest enemy every 12 s", () => {
  const g = arena(3);
  const weak = foe(g, 250, 1e6);
  const strong = foe(g, 262, 1e9);
  const c = place(g, 'kings-champion', weak);
  const s = [];
  g.on('fire', (p) => p.source === c && p.kind === 'smite' && s.push({ t: g.time, dmg: p.damage, target: p.target }));
  for (let i = 0; i < 60 * 36.5; i++) g.update(1 / 60);
  assert.equal(s.length, 3);
  assert.ok(s.every((x) => x.target === strong && close(x.dmg, c.stats.damage * 5)));
  assert.ok(Math.abs(s[1].t - s[0].t - 12) < 0.05);
});

test('The Master Engineer: builds a mini-ballista every 20 s that fights for 10 s, never more than two', () => {
  const g = arena(4);
  const e = foe(g);
  const m = place(g, 'master-engineer', e);
  assert.ok(m.stats.splash >= 64 * 1, 'heavy area attacks');
  const counts = [];
  for (let s = 0; s < 70; s++) {
    for (let i = 0; i < 60; i++) g.update(1 / 60);
    counts.push(g.alliesOf(m).length);
  }
  assert.ok(Math.max(...counts) <= 2);
  assert.deepEqual([counts[18], counts[19], counts[28], counts[30], counts[39], counts[50]], [0, 1, 1, 0, 1, 0], 'built at 20 s and 40 s, each lasting 10 s');
  assert.ok(g.alliesOf(m).every((a) => a.def.id === 'mini-ballista'));
  assert.equal(g.deployedCount('mini-ballista'), 0, 'mini-ballistas are never deployed units');
  // the cap: with two already active, the next build is skipped
  g.spawnAlly(m, 'mini-ballista', { life: 10 });
  g.spawnAlly(m, 'mini-ballista', { life: 10 });
  const n = g.alliesOf(m).length;
  m.ability.update(m, 20.01, g);
  assert.equal(g.alliesOf(m).length, n);
  assert.ok(n >= 2);
});

test('Royal Patrol targets the enemy closest to the exit, whatever spawned first or has more HP', () => {
  const g = arena(5);
  const behind = foe(g, 250, 1e12);
  const ahead = foe(g, 280, 1e6);
  const rp = place(g, 'royal-patrol', behind, 0, { fire: true });
  assert.equal(getUnit('royal-patrol').targeting, 'first');
  assert.ok([behind, ahead].every((en) => Math.hypot(en.x - rp.x, en.y - rp.y) <= rp.stats.range), 'both in range');
  const s = [];
  g.on('fire', (p) => p.source === rp && s.push(p.target));
  for (let i = 0; i < 120; i++) g.update(1 / 60);
  assert.ok(s.length > 0 && s.every((x) => x === ahead));
});
