// Summoning: banners with explicit, fixed-probability unit pools.
// A banner is pure data; summon() performs independent pulls, charges the
// banner's currency atomically and unlocks what was obtained. Duplicates are
// recorded but never create a second unit type.

import { createRng } from '../core/rng.js';
import { getUnit } from './unitRegistry.js';

const banners = new Map();

/** The one and only summon currency. Every circle is priced in Tokens. */
export const SUMMON_CURRENCY = 'tokens';

export const SUMMON_CONFIG = {
  /** Duplicates refund this fraction of the circle's per-summon price, in Tokens. */
  duplicateCompensation: 0.3,
  /** Results at or below this chance get the rare presentation. */
  rareThreshold: 0.01,
};

/** Value of one summon in Tokens (= its price). */
export const summonValueInTokens = (banner) => banner.price;

/** Tokens granted for each duplicate pulled from this circle. */
export function duplicateCompensation(banner) {
  return Math.round(banner.price * SUMMON_CONFIG.duplicateCompensation);
}

export const isRare = (chance) => chance <= SUMMON_CONFIG.rareThreshold;

export function registerBanner(def) {
  const total = def.pool.reduce((s, p) => s + p.chance, 0);
  if (Math.abs(total - 1) > 1e-9) throw new Error(`Banner "${def.id}" odds sum to ${total}, expected 1`);
  if (def.pool.some((p) => !(p.chance > 0))) throw new Error(`Banner "${def.id}" has a non-positive chance`);
  // Tokens are the only summon currency: a circle can't be registered with anything else.
  if ((def.currency ?? SUMMON_CURRENCY) !== SUMMON_CURRENCY) throw new Error(`Banner "${def.id}" must be priced in Tokens`);
  if (!(def.price > 0)) throw new Error(`Banner "${def.id}" needs a Token price`);
  banners.set(def.id, Object.freeze({ ...def, currency: SUMMON_CURRENCY, pool: Object.freeze(def.pool.map((p) => Object.freeze({ ...p }))) }));
}

export const getBanner = (id) => banners.get(id);
export const listBanners = () => [...banners.values()];

/**
 * Every circle in one collection, cheapest first. Purely data-driven: a new
 * circle lands in the right place just by being registered. Equal prices keep
 * their registration order (Array.prototype.sort is stable).
 */
export const listCirclesByPrice = () => listBanners().sort((a, b) => a.price - b.price);

export const MILITARY_CIRCLE = 'military-circle';

registerBanner({
  id: MILITARY_CIRCLE,
  name: 'Military Summoning Circle',
  tagline: 'Requisition forces from the front line.',
  currency: 'tokens',
  price: 150,
  counts: [1, 5, 10, 25],
  pool: [
    { unit: 'cadet', chance: 0.5 },
    { unit: 'gunnerman', chance: 0.3 },
    { unit: 'grenade-launcher', chance: 0.15 },
    { unit: 'tank', chance: 0.05 },
  ],
});

export const ADVANCED_MILITARY_CIRCLE = 'advanced-military-circle';

registerBanner({
  id: ADVANCED_MILITARY_CIRCLE,
  name: 'Advanced Military Circle',
  tagline: 'Special assets. Limited availability.',
  currency: 'tokens',
  price: 250,
  counts: [1, 5, 10, 25],
  pool: [
    { unit: 'special-forces', chance: 0.4 },
    { unit: 'drone', chance: 0.3 },
    { unit: 'commander', chance: 0.1 },
    { unit: 'colonel', chance: 0.12 },
    { unit: 'general', chance: 0.075 },
    { unit: 'fortress', chance: 0.005 },
  ],
});

export const WILD_WEST_CIRCLE = 'wild-west-circle';

registerBanner({
  id: WILD_WEST_CIRCLE,
  name: 'Wild West',
  tagline: 'Dead or alive. Mostly alive, until they meet you.',
  currency: 'tokens',
  price: 300,
  counts: [1, 5, 10, 25],
  pool: [
    { unit: 'gambler', chance: 0.3 },
    { unit: 'bandit', chance: 0.25 },
    { unit: 'outlaw', chance: 0.18 },
    { unit: 'bounty-hunter', chance: 0.13 },
    { unit: 'gunslinger', chance: 0.08 },
    { unit: 'sheriff', chance: 0.04 },
    { unit: 'outlaw-leader', chance: 0.015 },
    { unit: 'fastest-hand', chance: 0.005 },
  ],
});

export const GAMBINO_CIRCLE = 'gambino-circle';

registerBanner({
  id: GAMBINO_CIRCLE,
  name: 'Gambino',
  tagline: 'Place your bets. The house is watching.',
  currency: 'tokens',
  price: 300,
  counts: [1, 5, 10, 25],
  pool: [
    { unit: 'drunkard', chance: 0.45 },
    { unit: 'dealer', chance: 0.25 },
    { unit: 'night-dancer', chance: 0.15 },
    { unit: 'desperate-gambler', chance: 0.09 },
    { unit: 'pit-boss', chance: 0.05 },
    { unit: 'high-roller', chance: 0.009 },
    { unit: 'the-house', chance: 0.001 },
  ],
});

export const NUCLEAR_WAR_CIRCLE = 'nuclear-war-circle';

registerBanner({
  id: NUCLEAR_WAR_CIRCLE,
  name: 'Nuclear War',
  tagline: 'Arcade armageddon. Top-shelf hardware.',
  currency: 'tokens',
  price: 500,
  counts: [1, 5, 10, 25],
  pool: [
    { unit: 'missile-launcher', chance: 0.35 },
    { unit: 'special-force-battalion', chance: 0.25 },
    { unit: 'icbm', chance: 0.15 },
    { unit: 'bomber', chance: 0.12 },
    { unit: 'b2', chance: 0.07 },
    { unit: 'marshal', chance: 0.04 },
    { unit: 'glorious-leader', chance: 0.015 },
    { unit: 'nuclear-warhead', chance: 0.004 },
    { unit: 'antimatter-warhead', chance: 0.001 },
  ],
});

export const VILLAGE_MILITIA_CIRCLE = 'village-militia-circle';

registerBanner({
  id: VILLAGE_MILITIA_CIRCLE,
  name: 'Village Militia',
  tagline: 'Pitchforks up. The village defends itself.',
  currency: 'tokens',
  price: 100,
  counts: [1, 5, 10, 25],
  pool: [
    { unit: 'farmer', chance: 0.35 },
    { unit: 'spearman', chance: 0.25 },
    { unit: 'slingman', chance: 0.2 },
    { unit: 'militia-archer', chance: 0.12 },
    { unit: 'village-captain', chance: 0.07 },
    { unit: 'village-hero', chance: 0.01 },
  ],
});

export const TOWN_GUARD_CIRCLE = 'town-guard-circle';

registerBanner({
  id: TOWN_GUARD_CIRCLE,
  name: 'Town Guard',
  tagline: 'Steel at the gate. Order on the walls.',
  currency: 'tokens',
  price: 250,
  counts: [1, 5, 10, 25],
  pool: [
    { unit: 'guard-recruit', chance: 0.3 },
    { unit: 'crossbowman', chance: 0.25 },
    { unit: 'guard-sergeant', chance: 0.2 },
    { unit: 'halberdier', chance: 0.14 },
    { unit: 'royal-patrol', chance: 0.08 },
    { unit: 'grand-captain', chance: 0.025 },
    { unit: 'kings-champion', chance: 0.005 },
  ],
});

export const SIEGE_WORKSHOP_CIRCLE = 'siege-workshop-circle';

registerBanner({
  id: SIEGE_WORKSHOP_CIRCLE,
  name: 'Siege Workshop',
  tagline: 'Timber, rope and very large rocks.',
  currency: 'tokens',
  price: 400,
  counts: [1, 5, 10, 25],
  pool: [
    { unit: 'apprentice-engineer', chance: 0.3 },
    { unit: 'ballista', chance: 0.25 },
    { unit: 'catapult', chance: 0.2 },
    { unit: 'bombardier', chance: 0.13 },
    { unit: 'siege-commander', chance: 0.08 },
    { unit: 'trebuchet', chance: 0.03 },
    { unit: 'master-engineer', chance: 0.01 },
  ],
});

export const summonCost = (banner, count) => banner.price * count;

/** One independent pull: inverse-CDF over the pool using a single uniform draw. */
export function pull(banner, rng) {
  let r = rng.next();
  for (const entry of banner.pool) {
    r -= entry.chance;
    if (r < 0) return entry;
  }
  return banner.pool[banner.pool.length - 1];
}

/**
 * Performs `count` independent pulls if the wallet can pay for all of them.
 * Charges exactly price × count, unlocks new unit types, and saves the profile.
 */
export function summon(profile, banner, count, rng = createRng()) {
  if (!banner.counts.includes(count)) return { ok: false, reason: 'invalid-count' };
  const cost = summonCost(banner, count);
  if (profile.balance(banner.currency) < cost) return { ok: false, reason: 'insufficient', cost };
  profile.spend(banner.currency, cost);
  const results = [];
  const perDuplicate = duplicateCompensation(banner);
  let compensation = 0;
  for (let i = 0; i < count; i++) {
    const entry = pull(banner, rng);
    const def = getUnit(entry.unit);
    // "Duplicate" = already owned before this pull (including earlier pulls in the same batch).
    const isNew = !profile.isUnlocked(entry.unit);
    profile.recordSummon(entry.unit);
    const comp = isNew ? 0 : perDuplicate;
    compensation += comp;
    results.push({ unit: entry.unit, name: def?.name ?? entry.unit, tier: def?.tier ?? 1, chance: entry.chance, isNew, compensation: comp, rare: isRare(entry.chance) });
  }
  profile.data.wallet.tokens = profile.balance('tokens') + compensation;
  profile.save();
  return { ok: true, cost, results, compensation };
}
