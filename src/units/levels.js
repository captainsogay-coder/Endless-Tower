// Unit stat generation. Every unit's level table is built here from its tier
// and its identity profile (see TIERS in src/balance.js). Unit files never
// hand-pick damage, prices or upgrade costs – they only describe *how* the unit
// fights (attack speed, range, splash, hits per attack, role).
import { TIERS, profileDps, tierPrice, tierDamageGrowth } from '../balance.js';

const round = (v, step) => Math.round(v / step) * step;
const niceDamage = (v) => (v >= 100 ? Math.round(v) : v >= 10 ? Math.round(v * 2) / 2 : Math.round(v * 10) / 10);

/**
 * Builds { price, levels } for a unit of `tier`.
 *   rate    attacks per second (identity: fast gunner vs slow artillery)
 *   range   attack range in px
 *   splash  blast radius in px (0 = single target)
 *   hits    damage instances per attack (6-shot barrage, 4 bombs per run)
 *   role    'gunner' | 'summoner' | 'support' | 'economy' – how much of the
 *           budget goes into its own damage
 *   power   small per-unit trim (default 1) used only to correct measured outliers
 *   price   per-unit price factor (default 1)
 */
export function tierUnit(tier, { rate, range, splash = 0, hits = 1, role = 'gunner', power = 1, price = 1 }) {
  const dps = profileDps(tier, { range, splash, role, power });
  const deployPrice = Math.max(5, round(tierPrice(tier) * price, tierPrice(tier) * price >= 200 ? 10 : 5));
  const growth = tierDamageGrowth(tier);
  const levels = [];
  for (let i = 0; i <= TIERS.upgradeCosts.length; i++) {
    const L = {
      damage: niceDamage((dps / (rate * hits)) * growth ** i),
      range: round(range * TIERS.rangeGrowth ** i, 1),
      rate: Math.round(rate * TIERS.rateGrowth ** i * 1000) / 1000,
    };
    if (splash) L.splash = round(splash * 1.03 ** i, 1);
    if (i > 0) L.cost = round(deployPrice * TIERS.upgradeCosts[i - 1], deployPrice >= 200 ? 10 : 5);
    levels.push(L);
  }
  return { price: deployPrice, levels, profile: { tier, rate, range, splash, hits, role, power, price } };
}

/** @deprecated kept for allies/tests: a fixed table from explicit base stats. */
export function buildLevels(base, price) {
  const levels = [];
  for (let i = 0; i <= TIERS.upgradeCosts.length; i++) {
    const L = { damage: niceDamage(base.damage * 1.22 ** i), range: round(base.range * 1.035 ** i, 1), rate: Math.round(base.rate * 1.05 ** i * 1000) / 1000 };
    if (base.splash) L.splash = round(base.splash * 1.04 ** i, 1);
    if (i > 0) L.cost = round(price * TIERS.upgradeCosts[i - 1], 5);
    levels.push(L);
  }
  return levels;
}
