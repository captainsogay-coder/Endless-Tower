// Summoning: banners with explicit, fixed-probability unit pools.
// A banner is pure data; summon() performs independent pulls, charges the
// banner's currency atomically and unlocks what was obtained. Duplicates are
// recorded but never create a second unit type.

import { createRng } from '../core/rng.js';
import { getUnit } from './unitRegistry.js';

const banners = new Map();

export function registerBanner(def) {
  const total = def.pool.reduce((s, p) => s + p.chance, 0);
  if (Math.abs(total - 1) > 1e-9) throw new Error(`Banner "${def.id}" odds sum to ${total}, expected 1`);
  if (!['tokens'].includes(def.currency)) throw new Error(`Banner "${def.id}" uses unknown currency "${def.currency}"`);
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
  for (let i = 0; i < count; i++) {
    const entry = pull(banner, rng);
    const def = getUnit(entry.unit);
    const isNew = !profile.isUnlocked(entry.unit);
    profile.recordSummon(entry.unit);
    results.push({ unit: entry.unit, name: def?.name ?? entry.unit, tier: def?.tier ?? 1, chance: entry.chance, isNew });
  }
  profile.save();
  return { ok: true, cost, results };
}
