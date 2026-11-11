// Summoning infrastructure: rolls a unit *type* from the registered roster.
// A summon rolls a tier from a decaying odds table (higher tiers rarer), then a
// unit of that tier. Odds and the tier ceiling improve with progress and have
// no upper bound. Intended for unlocking new unit types once the roster grows;
// with a single unit there is nothing to roll yet, so it is not surfaced in UI.

import { createRng } from '../core/rng.js';
import { getTier } from './tiers.js';
import { hasRoster, listUnits, unitsOfTier, registeredTiers } from './unitRegistry.js';

export const SUMMON_SETTINGS = {
  baseMaxTier: 3,
  tierUnlockEvery: 10,
  baseRatio: 0.3,
  ratioPerWave: 0.002,
  maxRatio: 0.5,
};

export class Summoner {
  constructor({ seed, settings = SUMMON_SETTINGS } = {}) {
    this.rng = createRng(seed);
    this.settings = settings;
  }

  /** Highest tier currently reachable. Unbounded: rises every `tierUnlockEvery` waves. */
  maxTier(wave) {
    const s = this.settings;
    const ceiling = s.baseMaxTier + Math.floor(Math.max(0, wave - 1) / s.tierUnlockEvery);
    if (!hasRoster()) return 0;
    const tiers = registeredTiers();
    return Math.min(ceiling, tiers[tiers.length - 1]);
  }

  odds(wave) {
    const s = this.settings;
    const ratio = Math.min(s.maxRatio, s.baseRatio + s.ratioPerWave * wave);
    const max = this.maxTier(wave);
    const tiers = [];
    if (!hasRoster()) return [];
    const available = new Set(registeredTiers());
    for (let t = 1; t <= max; t++) {
      if (!available.has(t)) continue;
      tiers.push({ tier: t, weight: Math.pow(ratio, t - 1) * (getTier(t).summonWeight ?? 1) });
    }
    if (!tiers.length) {
      const lowest = registeredTiers()[0];
      tiers.push({ tier: lowest, weight: 1 });
    }
    const total = tiers.reduce((s2, t) => s2 + t.weight, 0);
    return tiers.map((t) => ({ tier: t.tier, chance: t.weight / total }));
  }

  /** Returns a unit definition, or null when the roster is empty. */
  roll(wave) {
    const odds = this.odds(wave);
    if (!odds.length) return null;
    const tier = this.rng.weighted(odds, (o) => o.chance).tier;
    const pool = unitsOfTier(tier);
    return this.rng.weighted(pool.length ? pool : listUnits(), (u) => u.summonWeight ?? 1);
  }
}
