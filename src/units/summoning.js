// Summoning: banners with explicit, fixed-probability unit pools.
// A banner is pure data; summon() performs independent pulls, charges the
// banner's currency atomically and unlocks what was obtained. Duplicates are
// recorded but never create a second unit type.

import { createRng } from '../core/rng.js';
import { getUnit } from './unitRegistry.js';

const banners = new Map();

export const SUMMON_CONFIG = {
  /** Duplicates refund this fraction of the circle's per-summon value, paid in Tokens. */
  duplicateCompensation: 0.3,
  /** Results at or below this chance get the rare presentation. */
  rareThreshold: 0.01,
};

/**
 * Value of one summon in Tokens. Token-priced circles are worth their price.
 * Circles priced in any other currency (e.g. Gems) MUST declare
 * `tokenValuePerUnit` – no exchange rate is ever assumed.
 */
export function summonValueInTokens(banner) {
  if (banner.currency === 'tokens') return banner.price;
  if (!(banner.tokenValuePerUnit > 0)) throw new Error(`Banner "${banner.id}" is priced in ${banner.currency}; set tokenValuePerUnit to convert duplicate compensation`);
  return banner.price * banner.tokenValuePerUnit;
}

/** Tokens granted for each duplicate pulled from this circle. */
export function duplicateCompensation(banner) {
  return Math.round(summonValueInTokens(banner) * SUMMON_CONFIG.duplicateCompensation);
}

export const isRare = (chance) => chance <= SUMMON_CONFIG.rareThreshold;

export function registerBanner(def) {
  const total = def.pool.reduce((s, p) => s + p.chance, 0);
  if (Math.abs(total - 1) > 1e-9) throw new Error(`Banner "${def.id}" odds sum to ${total}, expected 1`);
  if (!def.currency) throw new Error(`Banner "${def.id}" needs a currency`);
  if (def.pool.some((p) => !(p.chance > 0))) throw new Error(`Banner "${def.id}" has a non-positive chance`);
  duplicateCompensation(def); // validates the conversion for non-token circles
  banners.set(def.id, Object.freeze({ ...def, pool: Object.freeze(def.pool.map((p) => Object.freeze({ ...p }))) }));
}

export const getBanner = (id) => banners.get(id);
export const listBanners = () => [...banners.values()];

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
