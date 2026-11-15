// Boss archetypes: assignment, telegraphs, and each ability's rules.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/game/Game.js';
import { registerRoster } from '../src/units/roster.js';
import { BOSSES, BOSS_IDS, pickBoss } from '../src/enemies/bosses.js';

registerRoster();
const W = { number: 10, alive: 0, plan: { wave: 10, scaling: { hp: 1, speed: 1, damage: 1, reward: 1 } } };

function arena(seed = 3) {
  const g = new Game({ seed, loadout: ['cadet', 'gunnerman'], weatherEnabled: false, mapEvents: false });
  g.towerHp = g.towerMaxHp = 1e12;
  g.coins = 1e9;
  return g;
}
function boss(g, kind, d = 200) {
  const e = g.spawnEnemy({ category: 'boss', route: 0, offset: d }, { ...W });
  // force the archetype under test
  const def = BOSSES[kind];
  e.maxHp = e.hp = 1e9;
  e.bossDef = def;
  e.bossKind = kind;
  e.bossTimer = def.first;
  e.telegraph = null;
  e.brood = 0;
  e.speed = 0;
  g.update(1e-4);
  return e;
}
const run = (g, s) => {
  for (let i = 0; i < s * 30; i++) g.update(1 / 30);
};

test('four boss archetypes with names, intros and distinct abilities; chosen per wave without repeats', () => {
  assert.deepEqual(BOSS_IDS, ['juggernaut', 'broodmother', 'warlord', 'phantom']);
  for (const b of Object.values(BOSSES)) {
    assert.ok(b.name && b.intro.length > 30 && b.telegraph >= 1 && b.every > b.telegraph);
    assert.ok(b.hp >= 0.8 && b.hp <= 1, 'abilities replace raw health');
  }
  const seen = new Set();
  let prev = null;
  for (let w = 5; w < 200; w += 5) {
    const b = pickBoss(1234, w, prev);
    assert.notEqual(b.id, prev, 'never the same boss twice in a row');
    assert.equal(pickBoss(1234, w, prev).id, b.id, 'deterministic');
    seen.add(b.id);
    prev = b.id;
  }
  assert.equal(seen.size, 4, 'every archetype appears');
  // a real boss wave gets one, and the wave plans themselves are untouched
  const g = arena(8);
  const e = g.spawnEnemy({ category: 'boss', route: 0, offset: 100 }, { ...W });
  assert.ok(BOSS_IDS.includes(e.bossKind) && e.bossDef);
});

test('Juggernaut: telegraphs, then braces for 3 s taking 60% less damage', () => {
  const g = arena();
  const e = boss(g, 'juggernaut');
  const tel = [];
  g.on('bossTelegraph', (t) => tel.push(t));
  run(g, BOSSES.juggernaut.first + 0.1);
  assert.equal(tel.length, 1);
  assert.ok(e.telegraph && e.bracedUntil <= g.time, 'warning first, no brace yet');
  const hp0 = e.hp;
  g.damageEnemy(e, 1000);
  assert.equal(hp0 - e.hp, 1000);
  run(g, BOSSES.juggernaut.telegraph + 0.05);
  assert.ok(e.bracedUntil > g.time);
  const hp1 = e.hp;
  g.damageEnemy(e, 1000);
  assert.ok(Math.abs(hp1 - e.hp - 400) < 1e-6, 'braced: 40% gets through');
  run(g, 3.1);
  const hp2 = e.hp;
  g.damageEnemy(e, 1000);
  assert.equal(hp2 - e.hp, 1000, 'brace ends');
});

test('Broodmother: a brood of 4 minions per cast that join its wave, capped at 32 in all', () => {
  const g = arena();
  const e = boss(g, 'broodmother', 300);
  const before = g.enemies.filter((x) => x.category === 'minion').length;
  run(g, BOSSES.broodmother.first + BOSSES.broodmother.telegraph + 0.1);
  const minions = g.enemies.filter((x) => x.category === 'minion' && x.broodOf === e.id);
  assert.equal(minions.length - 0, 4);
  assert.equal(g.enemies.filter((x) => x.category === 'minion').length - before, 4);
  assert.ok(minions.every((m) => m.wave === e.wave), 'they belong to its wave');
  for (const m of minions) m.speed = 0;
  e.brood = 30;
  run(g, BOSSES.broodmother.every + BOSSES.broodmother.telegraph + 0.1);
  assert.equal(e.brood, 32, 'capped');
  run(g, BOSSES.broodmother.every * 2 + 3);
  assert.equal(e.brood, 32, 'no more after the cap');
});

test('Warlord: a war cry stuns units inside its ring for 2 s; units outside keep firing', () => {
  const g = arena();
  const e = boss(g, 'warlord', 300);
  const near = [];
  const far = [];
  for (let y = 0; y < g.map.rows; y++) {
    for (let x = 0; x < g.map.cols; x++) {
      if (!g.canPlace(x, y)) continue;
      const d = Math.hypot(x * 32 + 16 - e.x, y * 32 + 16 - e.y);
      if (d < 80 && near.length < 2) near.push(g.deploy('cadet', x, y));
      else if (d > 200 && far.length < 1) far.push(g.deploy('cadet', x, y));
    }
  }
  assert.ok(near.length && far.length);
  run(g, BOSSES.warlord.first + BOSSES.warlord.telegraph + 0.1);
  assert.ok(near.every((u) => u.stunnedUntil > g.time), 'stunned inside the ring');
  assert.ok(far.every((u) => !(u.stunnedUntil > g.time)), 'not outside');
  const shots = near.map((u) => u.lastFire ?? -1);
  run(g, 1.5);
  assert.deepEqual(near.map((u) => u.lastFire ?? -1), shots, 'stunned units do not attack');
  run(g, 1);
  assert.ok(near.every((u) => !(u.stunnedUntil > g.time)), 'stun lasts 2 s');
});

test('Phantom: steps 3 tiles forward, untouchable for a moment, and never into the tower', () => {
  const g = arena();
  const e = boss(g, 'phantom', 200);
  run(g, BOSSES.phantom.first + BOSSES.phantom.telegraph + 0.05);
  assert.ok(Math.abs(e.d - 296) < 1, `blinked to ${e.d}`);
  assert.equal(e.invulnerable, true);
  const hp = e.hp;
  g.damageEnemy(e, 1000);
  assert.equal(e.hp, hp, 'untouchable while phasing');
  run(g, 0.5);
  assert.equal(e.invulnerable, false);
  e.d = e.route.length - 100;
  e.bossTimer = 0.01;
  run(g, BOSSES.phantom.telegraph + 0.1);
  assert.ok(e.d <= e.route.length - 96 + 1e-6, 'stops three tiles short');
});
