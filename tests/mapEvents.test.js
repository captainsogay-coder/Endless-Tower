// Map events: timing rules, realm pools, modifiers through the capped buff
// layer, the merchant trade and treasure (bounded), determinism.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/game/Game.js';
import { registerRoster } from '../src/units/roster.js';
import { levelStats } from '../src/units/unitStats.js';
import { getUnit } from '../src/units/unitRegistry.js';
import { EVENTS, eventsFor, getEvent, FIRST_WAVE, MIN_GAP_WAVES, MAX_TRADES, MAX_TREASURES, merchantOffer } from '../src/game/mapEvents.js';
import { listBiomes } from '../src/maps/biomes.js';
import { BALANCE } from '../src/balance.js';

registerRoster();
const close = (a, b, eps = 1e-9) => Math.abs(a - b) < eps;

/** Plays `waves` waves quickly with a sturdy tower, recording every event start. */
function playthrough(seed, biomeId, waves = 60, opts = {}) {
  const g = new Game({ seed, biomeId, loadout: ['cadet', 'gunnerman'], weatherEnabled: false, ...opts });
  g.towerHp = g.towerMaxHp = 1e12;
  g.coins = 1e6;
  const starts = [];
  g.on('mapEvent', (e) => e.phase === 'start' && starts.push({ id: e.event.def.id, wave: e.event.wave, t: g.time, boss: g.currentPlan?.archetype === 'boss' }));
  g.autoSkip = true;
  g.callWaves(waves);
  for (let i = 0; i < 20 * 60 * 12 && g.stats.wavesCleared < waves; i++) g.update(1 / 20);
  return { g, starts };
}

test('every realm has its own event pool, including one environmental surge with a clear, timed modifier', () => {
  for (const b of listBiomes()) {
    const pool = eventsFor(b.id);
    assert.ok(pool.length >= 3, `${b.id} has events`);
    const surges = pool.filter((e) => e.kind === 'modifier');
    assert.equal(surges.length, 1, `${b.id} has one surge`);
    for (const s of surges) assert.ok(s.effect && s.duration > 0 && s.duration <= 30, 'modifier text and a fixed duration');
    assert.ok(pool.some((e) => e.kind === 'cosmetic'), `${b.id} has a purely cosmetic event`);
  }
  for (const e of EVENTS) {
    assert.ok(e.name && e.text && e.duration > 0);
    if (e.mod) for (const v of Object.values(e.mod)) assert.ok(v >= 0.85 && v <= 1.15, `${e.id} modifier is small`);
  }
});

test('events are occasional: never before wave 3, never on a boss wave, one at a time, well spaced', () => {
  let total = 0;
  for (const [seed, realm] of [[1, 'forest'], [2, 'frozen'], [3, 'ruins'], [4, 'sky'], [5, 'mechanical'], [6, 'volcanic']]) {
    const { starts } = playthrough(seed, realm, 60);
    total += starts.length;
    for (const s of starts) {
      assert.ok(s.wave >= FIRST_WAVE, 'not before wave 3');
      assert.ok(!s.boss, 'not on a boss wave');
      assert.ok(eventsFor(realm).some((e) => e.id === s.id), 'from the realm pool');
    }
    for (let i = 1; i < starts.length; i++) assert.ok(starts[i].wave - starts[i - 1].wave >= MIN_GAP_WAVES, 'spaced in waves');
    assert.ok(starts.length <= 60 / MIN_GAP_WAVES + 1, 'never constant');
  }
  assert.ok(total >= 6, `events do happen (${total} over 360 waves)`);
});

test('the same seed gives the same events, and events never change the waves themselves', () => {
  const a = playthrough(21, 'forest', 30).starts.map((s) => `${s.id}@${s.wave}`);
  const b = playthrough(21, 'forest', 30).starts.map((s) => `${s.id}@${s.wave}`);
  assert.deepEqual(a, b);
  const on = new Game({ seed: 9, biomeId: 'ruins', loadout: ['cadet'] });
  const off = new Game({ seed: 9, biomeId: 'ruins', loadout: ['cadet'], mapEvents: false });
  for (let i = 0; i < 20; i++) assert.deepEqual(on.director.next(), off.director.next(), 'identical wave plans');
  const { starts } = playthrough(9, 'ruins', 40, { mapEvents: false });
  assert.equal(starts.length, 0, 'switched off for measurements');
});

test('surges change stats through the capped buff layer and end on time; Whiteout slows enemies 10%', () => {
  const g = new Game({ seed: 5, biomeId: 'forest', loadout: ['cadet'], weatherEnabled: false });
  g.coins = 1e6;
  let u = null;
  for (let y = 0; y < g.map.rows && !u; y++) for (let x = 0; x < g.map.cols && !u; x++) if (g.canPlace(x, y)) u = g.deploy('cadet', x, y);
  const base = { ...u.stats };
  const ev = g.events.start(getEvent('verdant-surge'), { wave: 5, reward: 100 });
  assert.ok(close(u.stats.rate / base.rate, 1.1, 1e-9), '+10% attack speed');
  g.time = ev.until + 0.01;
  g.events.update();
  assert.ok(close(u.stats.rate, base.rate, 1e-9) && g.events.active === null, 'ends on time');
  // a surge on top of every other buff still respects the caps
  g.events.start(getEvent('lava-surge'), { wave: 5, reward: 100 });
  for (const id of ['colonel', 'general', 'marshal', 'glorious-leader', 'the-house']) {
    let ok = null;
    for (let y = 0; y < g.map.rows && !ok; y++) for (let x = 0; x < g.map.cols && !ok; x++) if (g.canPlace(x, y)) ok = g.deploy(id, x, y);
  }
  const lvl = levelStats(getUnit('cadet'), 0);
  assert.ok(u.stats.damage <= lvl.damage * BALANCE.caps.buffDamage * (1 + BALANCE.caps.additiveDamage) + 1e-6);
  g.events.end();
  const g2 = new Game({ seed: 6, biomeId: 'frozen', loadout: ['cadet'], weatherEnabled: false });
  assert.equal(g2.eventEnemySpeed, 1);
  g2.events.start(getEvent('whiteout'), { wave: 5, reward: 100 });
  assert.equal(g2.eventEnemySpeed, 0.9);
  g2.events.end();
  assert.equal(g2.eventEnemySpeed, 1);
});

test('the Traveling Merchant: optional, coins for Tokens at a bounded rate, at most twice per battle', () => {
  const g = new Game({ seed: 7, biomeId: 'sky', loadout: ['cadet'], weatherEnabled: false });
  const tokens = [];
  g.on('bonusTokens', (t) => tokens.push(t.amount));
  const offer = merchantOffer(10, 200);
  assert.ok(offer.coins >= 150 && offer.tokens >= 10 && offer.tokens < 250, 'well below a wave reward in Tokens');
  g.coins = 0;
  g.events.start(getEvent('merchant'), { wave: 10, reward: 200 });
  assert.equal(g.events.acceptOffer(), false, 'needs the coins');
  g.coins = offer.coins + 5;
  const t0 = g.tokensEarned;
  assert.equal(g.events.acceptOffer(), true);
  assert.equal(g.coins, 5);
  assert.equal(g.tokensEarned - t0, offer.tokens);
  assert.deepEqual(tokens, [offer.tokens]);
  assert.equal(g.events.acceptOffer(), false, 'one trade per visit');
  g.events.end();
  g.coins = 1e6;
  g.events.start(getEvent('merchant'), { wave: 12, reward: 200 });
  assert.equal(g.events.acceptOffer(), true);
  g.events.end();
  g.events.start(getEvent('merchant'), { wave: 16, reward: 200 });
  assert.equal(g.events.acceptOffer(), false, `at most ${MAX_TRADES} trades per battle`);
  g.events.end();
  // declining is simply letting it pass: nothing changes
  const c = g.coins;
  g.events.start(getEvent('merchant'), { wave: 20, reward: 200 });
  g.time += 31;
  g.events.update();
  assert.equal(g.coins, c);
  // and the merchant stops visiting once the limit is reached
  const { starts } = playthrough(31, 'sky', 80);
  assert.ok(starts.filter((s) => s.id === 'merchant').length <= 8);
});

test('Treasure Discovery pays a modest coin reward once, at most twice per battle, without blocking any tile', () => {
  const g = new Game({ seed: 8, biomeId: 'ruins', loadout: ['cadet'], weatherEnabled: false });
  const coins = [];
  g.on('bonusCoins', (c) => coins.push(c));
  const before = g.coins;
  const ev = g.events.start(getEvent('treasure'), { wave: 6, reward: 120 });
  const tile = { x: Math.floor(ev.treasure.x / 32), y: Math.floor(ev.treasure.y / 32) };
  assert.ok(g.canPlace(tile.x, tile.y) || g.map.grid[tile.y * g.map.cols + tile.x] !== 0, 'the cache never changes placement');
  for (let i = 0; i < 20; i++) {
    g.time += 0.5;
    g.events.update();
  }
  assert.equal(coins.filter((c) => c.label === 'Treasure').length, 1, 'paid once');
  assert.ok(g.coins - before > 0 && g.coins - before <= 120 * BALANCE.global.abilityCoinMult * 1.5 + 1);
  g.events.treasures = MAX_TREASURES;
  g.events.lastWave = -99;
  g.events.lastEnd = -999;
  g.events.rng = { next: () => 0, weighted: (entries) => entries.find((x) => x.e.kind === 'reward') ?? entries[0] };
  const next = g.events.onWaveStart({ wave: 20, archetype: 'army', reward: 100 });
  assert.notEqual(next?.def.kind, 'reward', 'no more treasure after the limit');
});
