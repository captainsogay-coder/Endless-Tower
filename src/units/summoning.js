// Summoning: spend currency to obtain a random unit. A summon rolls a tier
// from a decaying odds table (higher tiers rarer), then a unit of that tier.
// Odds and the reachable tier ceiling improve as the run progresses, without
// any upper bound on tiers.

import { createRng } from '../core/rng.js';
import { getTier } from './tiers.js';
import { hasRoster, listUnits, unitsOfTier, registeredTiers } from './unitRegistry.js';
import { getProxyDef } from './prototypeProxy.js';

export const SUMMON_SETTINGS = {
  baseMaxTier: 3,
  tierUnlockEvery: 10,
  baseRatio: 0.3,
  ratioPerWave: 0.002,
  maxRatio: 0.5,
};

let nextUid = 1;

export function createUnitInstance(def) {
  return {
    uid: nextUid++,
    def,
    tier: def.tier,
    stats: { ...def.stats },
    placed: false,
    col: -1,
    row: -1,
    x: 0,
    y: 0,
    cooldown: 0,
    angle: -Math.PI / 2,
    recoil: 0,
    kills: 0,
    damageDealt: 0,
    placedAt: 0,
  };
}

export class Summoner {
  constructor({ seed, settings = SUMMON_SETTINGS } = {}) {
    this.rng = createRng(seed);
    this.settings = settings;
  }

  /** Highest tier currently reachable. Unbounded: rises every `tierUnlockEvery` waves. */
  maxTier(wave) {
    const s = this.settings;
    const ceiling = s.baseMaxTier + Math.floor(Math.max(0, wave - 1) / s.tierUnlockEvery);
    if (!hasRoster()) return ceiling;
    const tiers = registeredTiers();
    return Math.min(ceiling, tiers[tiers.length - 1]);
  }

  odds(wave) {
    const s = this.settings;
    const ratio = Math.min(s.maxRatio, s.baseRatio + s.ratioPerWave * wave);
    const max = this.maxTier(wave);
    const tiers = [];
    const available = hasRoster() ? new Set(registeredTiers()) : null;
    for (let t = 1; t <= max; t++) {
      if (available && !available.has(t)) continue;
      tiers.push({ tier: t, weight: Math.pow(ratio, t - 1) * (getTier(t).summonWeight ?? 1) });
    }
    if (!tiers.length && available) {
      const lowest = registeredTiers()[0];
      tiers.push({ tier: lowest, weight: 1 });
    }
    const total = tiers.reduce((s2, t) => s2 + t.weight, 0);
    return tiers.map((t) => ({ tier: t.tier, chance: t.weight / total }));
  }

  roll(wave) {
    const odds = this.odds(wave);
    const tier = this.rng.weighted(odds, (o) => o.chance).tier;
    let def;
    if (hasRoster()) {
      const pool = unitsOfTier(tier);
      def = this.rng.weighted(pool.length ? pool : listUnits(), (u) => u.summonWeight);
    } else {
      def = getProxyDef(tier);
    }
    return createUnitInstance(def);
  }
}
