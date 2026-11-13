import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/game/Game.js';
import { registerRoster, ROSTER } from '../src/units/roster.js';
import { getUnit, validateUnitDef } from '../src/units/unitRegistry.js';
import { levelStats, maxLevel } from '../src/units/unitStats.js';
import { applyStatus, statusSpeedMultiplier, statusDamageTakenMultiplier } from '../src/game/effects.js';
import { squadTacticsMultiplier, SQUAD_TACTICS_PER_UNIT } from '../src/units/defs/specialForces.js';
import { DUDE_POWER_PER_DUDE } from '../src/units/defs/dude.js';

registerRoster();
const ALL = ROSTER.map((d) => d.id);
const freeTiles = (g) => {
  const out = [];
  for (let y = 0; y < g.map.rows; y++) for (let x = 0; x < g.map.cols; x++) if (g.canPlace(x, y)) out.push([x, y]);
  return out;
};
const game = (seed = 1) => {
  const g = new Game({ seed, loadout: ALL, weatherEnabled: false });
  g.coins = 1e9;
  return g;
};

test('Advanced Military units are valid with the specified tiers', () => {
  const tiers = { 'special-forces': 3, drone: 5, commander: 5, colonel: 6, general: 7, fortress: 10 };
  for (const [id, tier] of Object.entries(tiers)) {
    assert.deepEqual(validateUnitDef(getUnit(id)), [], id);
    assert.equal(getUnit(id).tier, tier, id);
  }
});

test('every unit is individually upgradeable through all five levels', () => {
  const g = game(2);
  const tiles = freeTiles(g);
  ROSTER.forEach((def, i) => {
    const u = g.deploy(def.id, ...tiles[i * 3]);
    assert.ok(u, `${def.id} deployed`);
    let prevDps = u.stats.damage * u.stats.rate;
    for (let l = 1; l <= maxLevel(def); l++) {
      const info = g.upgradeInfo(u);
      const coins = g.coins;
      assert.ok(g.upgrade(u), `${def.id} → Lv ${l}`);
      assert.equal(g.coins, coins - info.cost, `${def.id} Lv ${l} cost`);
      const dps = u.stats.damage * u.stats.rate;
      assert.ok(dps > prevDps, `${def.id} Lv ${l} is stronger`);
      prevDps = dps;
    }
    assert.equal(g.upgrade(u), false);
  });
});

test('Special Forces: stronger configurable Dude-style stacking', () => {
  assert.ok(SQUAD_TACTICS_PER_UNIT > DUDE_POWER_PER_DUDE);
  const g = game(3);
  const t = freeTiles(g);
  const a = g.deploy('special-forces', ...t[0]);
  g.deploy('special-forces', ...t[1]);
  g.deploy('special-forces', ...t[2]);
  assert.ok(Math.abs(a.stats.damage - levelStats(getUnit('special-forces'), 0).damage * squadTacticsMultiplier(3)) < 1e-9);
});

test('buffs: each id applies once (no infinite stacking), different buffs combine, map-wide reaches everyone', () => {
  const g = game(4);
  const t = freeTiles(g);
  const dude = g.deploy('dude', ...t[0]);
  const base = levelStats(getUnit('dude'), 0);
  const far = t[t.length - 1];
  // Colonel is map-wide: buffs a Dude anywhere
  g.deploy('colonel', ...far);
  assert.ok(Math.abs(dude.stats.damage - base.damage * 1.15) < 1e-9);
  assert.ok(Math.abs(dude.stats.range - base.range * 1.05) < 1e-9);
  // ten more Colonels: still exactly one application
  for (let i = 1; i <= 10; i++) g.deploy('colonel', ...t[t.length - 1 - i * 2]);
  assert.ok(Math.abs(dude.stats.damage - base.damage * 1.15) < 1e-9, 'no stacking from duplicate Colonels');
  // a Commander next to the Dude stacks with the Colonel (different buff)
  const near = t.find(([x, y]) => Math.hypot(x - t[0][0], y - t[0][1]) <= 2 && !(x === t[0][0] && y === t[0][1]));
  g.deploy('commander', ...near);
  assert.ok(Math.abs(dude.stats.range - base.range * 1.05 * 1.08) < 1e-9, 'Commander range stacks with Colonel');
  assert.ok(Math.abs(dude.stats.rate - base.rate / (0.9 * 0.92)) < 1e-9, 'cooldown reductions combine');
});

test('Colonel and Fortress raise coin gain once each, battle-wide', () => {
  const g = game(5);
  const t = freeTiles(g);
  assert.equal(g.coinMult, 1);
  g.deploy('colonel', ...t[0]);
  g.deploy('colonel', ...t[3]);
  const col = 1 + 0.15 * 1.15; // economy bonuses get the +15% ability-coin boost
  const fort = 1 + 0.25 * 1.15;
  assert.ok(Math.abs(g.coinMult - col) < 1e-9);
  const f = g.deploy('fortress', ...t[6]);
  assert.ok(Math.abs(g.coinMult - col * fort) < 1e-9);
  g.sell(f);
  assert.ok(Math.abs(g.coinMult - col) < 1e-9, 'removed with the unit');
});

test('Drone station launches a drone every 1.35 s (1.5 s − 10% global cooldown); ~10% are Explosive Drones (5× damage, 2× radius)', () => {
  const g = game(6);
  g.towerMaxHp = g.towerHp = 1e12;
  const t = freeTiles(g).filter(([x, y]) => g.map.pathDist[y * g.map.cols + x] === 1);
  g.on('spawn', (e) => (e.hp = e.maxHp = 1e9)); // keep targets alive so the station fires continuously
  const st = g.deploy('drone', ...t[Math.floor(t.length / 2)]);
  const shots = [];
  g.on('fire', (p) => p.source === st && shots.push({ kind: p.kind, dmg: p.damage, splash: p.splash, t: g.time }));
  g.callWaves(20);
  for (let i = 0; i < 60 * 200; i++) g.update(1 / 60);
  assert.ok(shots.length >= 20, `${shots.length} launches`);
  const gaps = shots.slice(1).map((s, i) => s.t - shots[i].t).filter((d) => d < 1.6);
  assert.ok(gaps.length > 10 && gaps.every((d) => d >= 1.35 - 1 / 60 - 1e-9 && d <= 1.35 + 2 / 60), 'one drone every 1.35 s');
  // the explosive roll itself, over many launches
  const target = { x: st.x + 50, y: st.y, alive: true, radius: 8 };
  const N = 5000;
  let ex = 0;
  let exShot = null;
  let normalShot = null;
  for (let i = 0; i < N; i++) {
    const p = g.fireProjectile(st, target);
    p.alive = false;
    if (p.kind === 'explosive-drone') {
      ex++;
      exShot ??= { dmg: p.damage, splash: p.splash };
    } else normalShot ??= { dmg: p.damage, splash: p.splash };
  }
  g.compact();
  assert.ok(Math.abs(ex / N - 0.1) < 0.015, `explosive fraction ${ex / N}`);
  assert.ok(Math.abs(exShot.dmg / normalShot.dmg - 5) < 1e-9, '5× damage');
  assert.ok(Math.abs(exShot.splash / normalShot.splash - 2) < 1e-9, '2× radius');
});

test('General launches regular drones (never explosive); Fortress launches Explosive Drones that Cripple', () => {
  const g = game(7);
  g.towerMaxHp = g.towerHp = 1e12;
  const t = freeTiles(g).filter(([x, y]) => g.map.pathDist[y * g.map.cols + x] === 1);
  g.on('spawn', (e) => (e.hp = e.maxHp = 1e9));
  const mid = Math.floor(t.length / 2);
  const gen = g.deploy('general', ...t[mid]);
  const fort = g.deploy('fortress', ...t[mid + 4]);
  const launches = [];
  g.on('fire', (p) => (p.source === gen || p.source === fort) && p.kind.includes('drone') && launches.push({ src: p.source.def.id, kind: p.kind, onHit: p.onHit, t: g.time }));
  let crippled = 0;
  g.on('impact', (p) => {
    if (p.source === fort && p.kind === 'explosive-drone') g.hash.each(p.x, p.y, p.splash, (e) => e.statuses?.crippled > g.time && crippled++);
  });
  g.callWaves(15);
  for (let i = 0; i < 60 * 60; i++) g.update(1 / 60);
  const genL = launches.filter((l) => l.src === 'general');
  const fortL = launches.filter((l) => l.src === 'fortress');
  assert.ok(genL.length >= 5 && genL.every((l) => l.kind === 'drone'), 'General: regular drones only');
  assert.ok(fortL.length >= 5 && fortL.every((l) => l.kind === 'explosive-drone' && l.onHit?.[0].status === 'crippled'));
  const gaps = fortL.slice(1).map((l, i) => l.t - fortL[i].t);
  assert.ok(gaps.every((d) => d >= 5 - 1 / 60 - 1e-9), 'Fortress drones every 5 s');
  assert.ok(crippled > 0, 'Crippled applied');
});

test('Crippled: +20% damage taken and −10% speed; strongest status wins, no stacking', () => {
  const e = {};
  applyStatus(e, 'wounded', 0);
  applyStatus(e, 'crippled', 0);
  applyStatus(e, 'crippled', 1);
  assert.equal(statusSpeedMultiplier(e, 2), 0.9);
  assert.equal(statusDamageTakenMultiplier(e, 2), 1.2);
  const g = game(8);
  g.startNextWave();
  g.update(1);
  const en = g.enemies[0];
  en.hp = en.maxHp = 1e6;
  en.armor = 0;
  g.damageEnemy(en, 100);
  const plain = 1e6 - en.hp;
  applyStatus(en, 'crippled', g.time);
  const before = en.hp;
  g.damageEnemy(en, 100);
  assert.ok(Math.abs((before - en.hp) / plain - 1.2) < 1e-9);
});
