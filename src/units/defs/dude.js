// DUDE — Tier 1. An ordinary dude who somehow became a tower-defense unit.
// Cheap, short-ranged, weak alone; strong in numbers thanks to Dude Power.
// All numbers live in this table so they can be tuned in one place.
import { tierUnit } from '../levels.js';

export const DUDE_POWER_PER_DUDE = 0.1;

/** Dude Power multiplier for a given number of deployed Dudes. */
export const dudePowerMultiplier = (deployed) => 1 + DUDE_POWER_PER_DUDE * Math.max(0, deployed - 1);

export default {
  id: 'dude',
  name: 'Dude',
  tier: 1,
  role: 'Cheap basic damage dealer',
  description: 'Just a regular guy with a good arm and a pocket full of rocks. One Dude is barely a speed bump. A crowd of Dudes is a problem.',
  targeting: 'first',
  projectile: { kind: 'pebble', speed: 360 },
  // Base stats come from the tier budget (src/balance.js TIERS); this line is the unit's identity.
  ...tierUnit(1, { rate: 1.25, range: 64, power: 0.75, price: 0.75 }),
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
