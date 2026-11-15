// Map events: occasional happenings that make each run a little less
// predictable. Some are purely atmospheric, some carry a small, clearly
// displayed modifier for a fixed time, and one (the Traveling Merchant) offers
// an optional trade.
//
// Rules (tested in tests/mapEvents.test.js):
//  - never before wave 3, never during a boss wave, at most one at a time,
//    and at least MIN_GAP_WAVES waves and MIN_GAP_SECONDS seconds apart;
//  - every realm has its own pool (EVENTS[].realms);
//  - gameplay modifiers go through the same capped buff pipeline as unit
//    buffs (Game.effectiveStats) and end on time; nothing touches enemy
//    paths, placement or targeting;
//  - rewards are modest and bounded per battle (MAX_TRADES, MAX_TREASURES);
//  - the event RNG is a separate stream, so events never change spawns or combat rolls.

import { tokensForWave } from '../balance.js';

export const MIN_GAP_WAVES = 4;
export const MIN_GAP_SECONDS = 75;
export const FIRST_WAVE = 3;
export const CHANCE = 0.4; // per eligible wave start
export const MAX_TRADES = 2; // merchant trades per battle
export const MAX_TREASURES = 2;

const ALL = ['forest', 'frozen', 'volcanic', 'ruins', 'sky', 'mechanical'];

/**
 * kind: 'cosmetic' | 'modifier' | 'offer' | 'reward'
 * mod:  unit modifiers { damageMult, cooldownMult, rangeMult } and/or enemy { enemySpeed }
 */
export const EVENTS = [
  { id: 'meteor-shower', name: 'Meteor Shower', kind: 'cosmetic', realms: ['forest', 'frozen', 'ruins', 'sky'], duration: 18, weight: 1, text: 'Harmless meteors streak across the sky and light up the field.' },
  { id: 'migration', name: 'Wildlife Migration', kind: 'cosmetic', realms: ['forest', 'frozen', 'ruins', 'sky'], duration: 25, weight: 1, text: 'Flocks pass high overhead on their way somewhere quieter.' },
  { id: 'eclipse', name: 'Eclipse', kind: 'cosmetic', realms: ALL, duration: 22, weight: 0.7, text: 'The light dims as something passes in front of the sun.' },
  { id: 'merchant', name: 'Traveling Merchant', kind: 'offer', realms: ['forest', 'frozen', 'ruins', 'sky', 'mechanical'], duration: 30, weight: 0.8, text: 'A merchant offers to trade coins for Tokens. Optional.' },
  { id: 'treasure', name: 'Treasure Discovery', kind: 'reward', realms: ALL, duration: 8, weight: 0.7, text: 'A hidden cache is uncovered nearby.' },
  // environmental surges – one per realm, a small modifier with a fixed duration
  { id: 'verdant-surge', name: 'Verdant Surge', kind: 'modifier', realms: ['forest'], duration: 20, weight: 1, mod: { cooldownMult: 1 / 1.1 }, effect: '+10% attack speed for every unit', text: 'The forest stirs; sap and spirit quicken your army.' },
  { id: 'whiteout', name: 'Whiteout', kind: 'modifier', realms: ['frozen'], duration: 20, weight: 1, mod: { enemySpeed: 0.9 }, effect: 'Enemies move 10% slower', text: 'A wall of snow rolls over the road.' },
  { id: 'lava-surge', name: 'Lava Surge', kind: 'modifier', realms: ['volcanic'], duration: 20, weight: 1, mod: { damageMult: 1.1 }, effect: '+10% damage for every unit', text: 'The ground glows; the heat drives your army on.' },
  { id: 'ruins-awaken', name: 'The Ruins Awaken', kind: 'modifier', realms: ['ruins'], duration: 25, weight: 1, mod: { rangeMult: 1.1 }, effect: '+10% range for every unit', text: 'Dormant runes flare to life across the old stones.' },
  { id: 'tailwind', name: 'Tailwind', kind: 'modifier', realms: ['sky'], duration: 20, weight: 1, mod: { rangeMult: 1.1 }, effect: '+10% range for every unit', text: 'A steady wind carries every shot further.' },
  { id: 'power-surge', name: 'Power Surge', kind: 'modifier', realms: ['mechanical'], duration: 20, weight: 1, mod: { cooldownMult: 1 / 1.1 }, effect: '+10% attack speed for every unit', text: 'The old machines hum back to life for a moment.' },
];
export const getEvent = (id) => EVENTS.find((e) => e.id === id) ?? null;
export const eventsFor = (realm) => EVENTS.filter((e) => e.realms.includes(realm));

/** Merchant terms for a wave: a fair-ish rate, coins that matter, Tokens that don't break the economy. */
export function merchantOffer(wave, waveReward) {
  return { coins: Math.max(150, Math.round(waveReward * 2.5)), tokens: Math.max(10, Math.round(tokensForWave(wave) * 0.15)) };
}
export function treasureCoins(waveReward) {
  return Math.max(40, Math.round(waveReward));
}

export class MapEvents {
  constructor(game, rng, { enabled = true } = {}) {
    this.game = game;
    this.rng = rng;
    this.enabled = enabled;
    this.active = null; // { def, until, ... }
    this.lastWave = -Infinity;
    this.lastEnd = -Infinity;
    this.history = [];
    this.trades = 0;
    this.treasures = 0;
    this.offer = null;
  }

  /** Unit stat modifiers from the active event (folded into the capped buff layer). */
  get unitMod() {
    const m = this.active?.def.mod;
    return m && (m.damageMult || m.cooldownMult || m.rangeMult) ? m : null;
  }

  /** Enemy speed multiplier from the active event. */
  get enemySpeed() {
    return this.active?.def.mod?.enemySpeed ?? 1;
  }

  eligible(plan) {
    const g = this.game;
    if (!this.enabled || this.active) return false;
    if (plan.wave < FIRST_WAVE || plan.archetype === 'boss' || g.boss) return false;
    if (plan.wave - this.lastWave < MIN_GAP_WAVES) return false;
    if (g.time - this.lastEnd < MIN_GAP_SECONDS) return false;
    return true;
  }

  /** Called at every wave start. */
  onWaveStart(plan) {
    if (!this.eligible(plan)) return null;
    if (this.rng.next() >= CHANCE) return null;
    let pool = eventsFor(this.game.biome.id);
    if (this.trades >= MAX_TRADES) pool = pool.filter((e) => e.kind !== 'offer');
    if (this.treasures >= MAX_TREASURES) pool = pool.filter((e) => e.kind !== 'reward');
    // the same event twice in a row is skipped when anything else is possible
    const last = this.history.at(-1);
    if (pool.length > 1) pool = pool.filter((e) => e.id !== last);
    const def = this.rng.weighted(pool.map((e) => ({ e, weight: e.weight })))?.e;
    return def ? this.start(def, plan) : null;
  }

  start(def, plan = this.game.currentPlan) {
    const g = this.game;
    const wave = plan?.wave ?? g.wave;
    const reward = plan?.reward ?? 0;
    this.active = { def, start: g.time, until: g.time + def.duration, wave };
    this.lastWave = wave;
    this.history.push(def.id);
    if (def.kind === 'offer') {
      this.offer = { ...merchantOffer(wave, reward), until: this.active.until, taken: false };
      this.active.offer = this.offer;
    }
    if (def.kind === 'reward') {
      this.active.treasure = this.pickSpot();
      this.active.coins = treasureCoins(reward);
    }
    if (def.mod && (def.mod.damageMult || def.mod.cooldownMult || def.mod.rangeMult)) g.refreshAll();
    g.emit('mapEvent', { phase: 'start', event: this.active });
    return this.active;
  }

  /** A quiet spot away from the road for a treasure cache (purely visual; never blocks a tile). */
  pickSpot() {
    const m = this.game.map;
    const spots = [];
    for (let y = 1; y < m.rows - 1; y++) for (let x = 1; x < m.cols - 1; x++) if (m.pathDist[y * m.cols + x] >= 3 && !this.game.unitAt(x, y)) spots.push({ x: x * 32 + 16, y: y * 32 + 16 });
    return spots.length ? spots[Math.floor(this.rng.next() * spots.length)] : { x: 64, y: 64 };
  }

  /** Accepts the merchant's trade. Returns true if it happened. */
  acceptOffer() {
    const g = this.game;
    const o = this.offer;
    if (!o || o.taken || !this.active || this.active.offer !== o || g.time > o.until) return false;
    if (g.coins < o.coins || this.trades >= MAX_TRADES) return false;
    g.coins -= o.coins;
    o.taken = true;
    this.trades++;
    g.tokensEarned += o.tokens;
    g.emit('bonusTokens', { amount: o.tokens, source: 'merchant' });
    g.emit('mapEvent', { phase: 'trade', event: this.active });
    return true;
  }

  update() {
    const g = this.game;
    const a = this.active;
    if (!a) return;
    if (a.def.kind === 'reward' && !a.paid && g.time >= a.start + a.def.duration * 0.5) {
      // the cache opens halfway through its reveal
      a.paid = true;
      this.treasures++;
      g.grantCoins(a.coins, a.treasure.x, a.treasure.y - 12, 'Treasure');
    }
    if (g.time >= a.until) this.end();
  }

  end() {
    const g = this.game;
    const a = this.active;
    if (!a) return;
    this.active = null;
    this.offer = null;
    this.lastEnd = g.time;
    if (a.def.mod && (a.def.mod.damageMult || a.def.mod.cooldownMult || a.def.mod.rangeMult)) g.refreshAll();
    g.emit('mapEvent', { phase: 'end', event: a });
  }
}
