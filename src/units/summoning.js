// Summoning: banners with explicit, fixed-probability unit pools.
// A banner is pure data; summon() performs independent pulls, charges the
// banner's currency atomically and unlocks what was obtained. Duplicates are
// recorded but never create a second unit type.

import { createRng } from '../core/rng.js';
import { getUnit } from './unitRegistry.js';

const banners = new Map();

export const SUMMON_CONFIG = {
  /** Duplicates refund this fraction of the circle's per-summon value. */
  duplicateCompensation: 0.3,
  /** Results at or below this chance get the rare presentation. */
  rareThreshold: 0.01,
  /**
   * Token value of one unit of another currency, used ONLY to pay duplicate
   * compensation in Tokens for circles priced in that currency. null = no rate
   * is configured: such circles compensate in their own currency instead
   * (e.g. 30% of a 500-Gem summon = 150 Gems). No rate is ever assumed.
   */
  tokenValue: { gems: null },
};

/** Configured Token value of one unit of a banner's currency, or null. */
export function tokenRate(banner) {
  if (banner.currency === 'tokens') return 1;
  const r = banner.tokenValuePerUnit ?? SUMMON_CONFIG.tokenValue[banner.currency] ?? null;
  return r > 0 ? r : null;
}

/** Value of one summon in Tokens, or null when no conversion is configured. */
export function summonValueInTokens(banner) {
  const r = tokenRate(banner);
  return r === null ? null : banner.price * r;
}

/** Currency duplicates from this circle are paid in: Tokens when a rate exists, else the circle's own. */
export function compensationCurrency(banner) {
  return tokenRate(banner) === null ? banner.currency : 'tokens';
}

/** Amount (in compensationCurrency) granted for each duplicate pulled from this circle. */
export function duplicateCompensation(banner) {
  const inTokens = summonValueInTokens(banner);
  return Math.round((inTokens ?? banner.price) * SUMMON_CONFIG.duplicateCompensation);
}

export const CURRENCY_LABEL = { tokens: 'Tokens', gems: 'Gems' };

export const isRare = (chance) => chance <= SUMMON_CONFIG.rareThreshold;

export function registerBanner(def) {
  const total = def.pool.reduce((s, p) => s + p.chance, 0);
  if (Math.abs(total - 1) > 1e-9) throw new Error(`Banner "${def.id}" odds sum to ${total}, expected 1`);
  if (!def.currency) throw new Error(`Banner "${def.id}" needs a currency`);
  if (def.pool.some((p) => !(p.chance > 0))) throw new Error(`Banner "${def.id}" has a non-positive chance`);
  if (!CURRENCY_LABEL[def.currency]) throw new Error(`Banner "${def.id}" uses unknown currency ${def.currency}`);
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
  tagline: 'Arcade armageddon. Premium hardware, paid in Gems.',
  currency: 'gems',
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
  const compCurrency = compensationCurrency(banner);
  let compensation = 0;
  for (let i = 0; i < count; i++) {
    const entry = pull(banner, rng);
    const def = getUnit(entry.unit);
    // "Duplicate" = already owned before this pull (including earlier pulls in the same batch).
    const isNew = !profile.isUnlocked(entry.unit);
    profile.recordSummon(entry.unit);
    const comp = isNew ? 0 : perDuplicate;
    compensation += comp;
    results.push({ unit: entry.unit, name: def?.name ?? entry.unit, tier: def?.tier ?? 1, chance: entry.chance, isNew, compensation: comp, compensationCurrency: compCurrency, rare: isRare(entry.chance) });
  }
  profile.data.wallet[compCurrency] = profile.balance(compCurrency) + compensation;
  profile.save();
  return { ok: true, cost, currency: banner.currency, results, compensation, compensationCurrency: compCurrency };
}
