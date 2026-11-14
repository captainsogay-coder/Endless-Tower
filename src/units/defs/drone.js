// DRONE — Tier 5. A forward drone station: launches a strike drone every
// 1.5 s (attack rate 1/1.5 at base). Drones fly to an enemy and detonate
// for high damage in a moderately small area. 10% of launches are Explosive
// Drones: 5× damage, 2× blast radius.
import { tierUnit } from '../levels.js';
export const EXPLOSIVE_DRONE = { chance: 0.1, damageMult: 5, splashMult: 2 };

export default {
  id: 'drone',
  name: 'Drone',
  tier: 5,
  role: 'Drone station · area damage',
  description: 'A launch rack and a tired operator. Every 1.5 seconds a strike drone leaves the rack, finds a target and detonates.',
  targeting: 'first',
  projectile: { kind: 'drone', speed: 230, explosive: EXPLOSIVE_DRONE },
  // Base stats come from the tier budget (src/balance.js TIERS); this line is the unit's identity.
  ...tierUnit(5, { rate: 1 / 1.5, range: 200, splash: 30, power: 0.71 }),
  passive: {
    id: 'explosive-drones',
    name: 'Explosive Drones',
    summary: '10% of drones are Explosive Drones: 5× damage and 2× blast radius.',
    formula: 'Chance 10% per launch · Damage × 5 · Radius × 2',
  },
  art: 'drone',
};
