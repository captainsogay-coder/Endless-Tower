// DUDE — Tier 1. An ordinary dude who somehow became a tower-defense unit.
// Cheap, short-ranged, weak alone; strong in numbers thanks to Dude Power.
// All numbers live in this table so they can be tuned in one place.

export const DUDE_POWER_PER_DUDE = 0.1;

/** Dude Power multiplier for a given number of deployed Dudes. */
export const dudePowerMultiplier = (deployed) => 1 + DUDE_POWER_PER_DUDE * Math.max(0, deployed - 1);

export default {
  id: 'dude',
  name: 'Dude',
  tier: 1,
  role: 'Cheap basic damage dealer',
  description: 'Just a regular guy with a good arm and a pocket full of rocks. One Dude is barely a speed bump. A crowd of Dudes is a problem.',
  price: 15,
  targeting: 'first',
  projectile: { kind: 'pebble', speed: 360 },
  // Level 0 is the base unit; levels 1–5 are bought per Dude during battle.
  levels: [
    { damage: 4, range: 64, rate: 1.25 },
    { cost: 25, damage: 6, range: 64, rate: 1.25 },
    { cost: 45, damage: 8, range: 64, rate: 1.4 },
    { cost: 80, damage: 11, range: 72, rate: 1.4 },
    { cost: 130, damage: 15, range: 72, rate: 1.6 },
    { cost: 210, damage: 21, range: 80, rate: 1.8 },
  ],
  passive: {
    id: 'dude-power',
    name: 'Dude Power',
    summary: '+10% damage to all Dudes for every other Dude deployed.',
    formula: 'Damage × [1 + 0.10 × (deployed Dudes − 1)]',
    /** ctx.deployed = number of Dudes currently on the battlefield. */
    modify(stats, ctx) {
      stats.damage *= dudePowerMultiplier(ctx.deployed);
    },
    bonus(ctx) {
      return dudePowerMultiplier(ctx.deployed) - 1;
    },
  },
  art: 'dude',
};
