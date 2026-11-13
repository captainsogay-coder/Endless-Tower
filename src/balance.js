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

  /**
   * Wave scaling: + `perWave` × waves completed this battle, as an additive
   * share of the unit's base damage (linear – it never compounds). The first
   * matching tier band applies.
   */
  waveScaling: [
    { maxTier: 3, perWave: 0.02 },
    { maxTier: 6, perWave: 0.01 },
  ],
};

/** Tokens paid for completing wave `wave`. */
export function tokensForWave(wave, cfg = BALANCE.tokens) {
  const milestones = Math.floor(Math.max(0, wave) / cfg.milestoneEvery);
  return Math.round(cfg.base * (1 + cfg.milestoneBonus * milestones));
}

/** Damage bonus per completed wave for a tier (0 for T7+). */
export function waveBonusPerWave(tier) {
  for (const band of BALANCE.waveScaling) if (tier <= band.maxTier) return band.perWave;
  return 0;
}

/** Additive damage bonus from wave scaling after `wavesCleared` completed waves. */
export function waveDamageBonus(tier, wavesCleared) {
  return waveBonusPerWave(tier) * Math.max(0, wavesCleared);
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
