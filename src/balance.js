// ─────────────────────────────────────────────────────────────────────────────
//  BALANCE – every progression knob in one place.
//
//  How a unit's damage is built (the same for every unit, including units added
//  later and summoned allies):
//
//    base      = level table value × GLOBAL.damageMult × (1 + UPGRADES.damagePerLevel × level)
//    additive  = wave scaling + the unit's own capped bonuses (jackpots, soldiers…)
//                + battle-wide bonuses (House Edge) – SUMMED, then applied once:
//    damage    = base × (1 + additive) × passive × Π buffs (one per id) × weather
//
//  Additive bonuses never multiply each other, so they can't snowball. The
//  multiplicative layers are few and each is individually capped: a buff id
//  applies once, only one weather exists at a time, passives are bounded.
//  Range and attack speed follow the same shape (global × upgrades → buffs →
//  weather). Nothing here ever writes back into a unit's base stats.
// ─────────────────────────────────────────────────────────────────────────────

export const BALANCE = {
  /** Tokens for a completed wave: base × (1 + milestoneBonus × floor(wave / milestoneEvery)). */
  tokens: { base: 250, milestoneEvery: 10, milestoneBonus: 0.05 },

  /** Applied to every unit's level table (base stats). */
  global: {
    damageMult: 1.2, // +20% damage
    rangeMult: 1.1, // +10% range
    cooldownMult: 0.9, // −10% cooldown (attacks 1/0.9 = 11% faster)
    abilityCoinMult: 1.15, // +15% coins from unit abilities and economy bonuses
  },

  /**
   * Extra growth per upgrade level on top of each unit's table, so every
   * upgrade is a clear step (Lv 5 = +40% damage, +10% range, +10% speed extra).
   */
  upgrades: { damagePerLevel: 0.08, rangePerLevel: 0.02, ratePerLevel: 0.02 },

  /** Area damage: enemies other than the one a shot was aimed at take this share. */
  splashFalloff: 0.6,

  /**
   * Wave scaling: + `perWave` × waves completed this battle, as an additive
   * share of the unit's base damage, up to `cap`. It keeps cheap units useful
   * through the early waves but levels off, so low tiers can never grow into
   * high tiers over a long run (before: +2%/wave forever let a Tier I match a
   * Tier VII by wave 150). The first matching band applies.
   */
  waveScaling: [
    { maxTier: 3, perWave: 0.015, cap: 0.45 },
    { maxTier: 6, perWave: 0.01, cap: 0.3 },
    { maxTier: 9, perWave: 0.005, cap: 0.15 },
  ],

  /**
   * Stacking caps (power creep). Every distinct buff id still applies once,
   * but their combined effect on one unit is limited, the additive bucket
   * (wave scaling + passives + House Edge) is limited, and battle-wide coin
   * multipliers from units are limited. Weather stays a separate, temporary layer.
   */
  caps: {
    buffDamage: 1.8, // all aura damage buffs together: at most ×1.8
    buffRate: 1.6, // all cooldown reductions together: at most ×1.6 attack speed
    buffRange: 1.35, // all range buffs together: at most ×1.35
    additiveDamage: 1.5, // wave scaling + passives + battle bonuses: at most +150%
    unitCoinMult: 1.5, // economy auras together: at most +50% coins (weather on top)
    /** periodic income from abilities: the k-th copy of the same unit earns 1/√k of the base payout */
    copyIncomeExponent: 0.5,
  },
};

/**
 * TIER STAT GENERATION. Every unit's base stats come from its tier, not from
 * hand-picked numbers. A unit only states its identity (attack speed, range,
 * splash, hits per attack, role); the generator spends the tier's combat-power
 * budget on damage after charging for the extras that budget buys:
 *
 *   DPS(L0)  = baseDps × power[tier] × role × splashCost × rangeCost × unit.power
 *   damage   = DPS / (attacks per second × hits per attack)
 *   price    = basePrice × power[tier]^priceExponent × unit.price
 *   upgrades = price × upgradeCosts[i]; damage grows damageGrowth(tier) per level
 *
 * - power: overall combat budget relative to T1 (T16+ keeps growing by a step
 *   that widens by `stepGrowth` each tier).
 * - Area damage, long range and team-wide utility are paid for out of the same
 *   budget, so an AOE unit hits many targets for less each (and is weaker
 *   against bosses), and a support unit trades its own damage for its buffs.
 * - Higher tiers also grow faster per upgrade, so the order holds at every level.
 */
export const TIERS = {
  // T1…T15. Steep enough that tier is real power: T4 = 3.4×, T7 = 8.3×, T12 = 27.5× a T1;
  // past T15 every tier is another ×growthPastTable.
  power: [1.0, 1.6, 2.4, 3.4, 4.7, 6.3, 8.3, 10.8, 13.8, 17.5, 22, 27.5, 34, 42, 51],
  growthPastTable: 1.2,
  baseDps: 12, // T1 single-target DPS at level 0, before the global layer
  /** share of the budget a role spends on its own damage (the rest is its utility) */
  roles: { gunner: 1, summoner: 0.8, support: 0.85, economy: 0.75 },
  /** area damage: DPS × 1 / (1 + splashCost × splashTiles^0.75) */
  splashCost: 0.6,
  /** range beyond the tier's reference range costs DPS: × 1 / (1 + rangeCost × min(2, excess)) */
  refRange: 80, // px at T1 (2.5 tiles)
  refRangePerTier: 0.04,
  rangeCost: 0.3,
  basePrice: 20, // T1 deploy price
  // price = basePrice × power^1.05: cost rises almost in step with power, so saving for a
  // high tier never buys less power per coin (it buys it in one tile, with better upgrades)
  priceExponent: 1.05,
  upgradeCosts: [0.8, 1.3, 2, 3, 4.5], // × deploy price
  damageGrowth: { base: 1.2, perTier: 0.006, max: 1.32 }, // × per upgrade level
  rangeGrowth: 1.03,
  rateGrowth: 1.04,
};

/** Combat-power budget of a tier relative to T1 (unbounded, controlled growth past T15). */
export function tierPower(tier) {
  const p = TIERS.power;
  if (tier <= p.length) return p[Math.max(1, tier) - 1];
  return p[p.length - 1] * Math.pow(TIERS.growthPastTable, tier - p.length);
}

export const tierPrice = (tier) => TIERS.basePrice * Math.pow(tierPower(tier), TIERS.priceExponent);
export const tierDamageGrowth = (tier) => Math.min(TIERS.damageGrowth.max, TIERS.damageGrowth.base + TIERS.damageGrowth.perTier * (tier - 1));
export const tierRefRange = (tier) => TIERS.refRange * (1 + TIERS.refRangePerTier * (tier - 1));

/** The DPS a unit's profile buys from its tier budget (level 0, before the global layer). */
export function profileDps(tier, { range, splash = 0, role = 'gunner', power = 1 }) {
  const roleShare = TIERS.roles[role] ?? 1;
  const splashTiles = splash / 32;
  const splashF = splashTiles > 0 ? 1 / (1 + TIERS.splashCost * Math.pow(splashTiles, 0.75)) : 1;
  const excess = Math.max(0, range / tierRefRange(tier) - 1);
  const rangeF = 1 / (1 + TIERS.rangeCost * Math.min(2, excess));
  return TIERS.baseDps * tierPower(tier) * roleShare * splashF * rangeF * power;
}

/** Tokens paid for completing wave `wave`. */
export function tokensForWave(wave, cfg = BALANCE.tokens) {
  const milestones = Math.floor(Math.max(0, wave) / cfg.milestoneEvery);
  return Math.round(cfg.base * (1 + cfg.milestoneBonus * milestones));
}

const waveBand = (tier) => BALANCE.waveScaling.find((b) => tier <= b.maxTier) ?? null;

/** Damage bonus per completed wave for a tier (0 for T10+). */
export function waveBonusPerWave(tier) {
  return waveBand(tier)?.perWave ?? 0;
}

/** The most wave scaling a tier can reach. */
export function waveBonusCap(tier) {
  return waveBand(tier)?.cap ?? 0;
}

/** Additive damage bonus from wave scaling after `wavesCleared` completed waves (capped). */
export function waveDamageBonus(tier, wavesCleared) {
  const b = waveBand(tier);
  return b ? Math.min(b.cap ?? Infinity, b.perWave * Math.max(0, wavesCleared)) : 0;
}

/** The global and per-upgrade layer applied on top of a level table entry. */
export function balanceLayer(level) {
  const g = BALANCE.global;
  const u = BALANCE.upgrades;
  return {
    damage: g.damageMult * (1 + u.damagePerLevel * level),
    range: g.rangeMult * (1 + u.rangePerLevel * level),
    rate: (1 / g.cooldownMult) * (1 + u.ratePerLevel * level),
  };
}
