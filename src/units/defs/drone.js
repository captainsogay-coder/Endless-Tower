// DRONE — Tier 5. A forward drone station: launches a strike drone every
// 1.5 s (attack rate 1/1.5 at base). Drones fly to an enemy and detonate
// for high damage in a moderately small area. 10% of launches are Explosive
// Drones: 5× damage, 2× blast radius.
export const EXPLOSIVE_DRONE = { chance: 0.1, damageMult: 5, splashMult: 2 };

export default {
  id: 'drone',
  name: 'Drone',
  tier: 5,
  role: 'Drone station · area damage',
  description: 'A launch rack and a tired operator. Every 1.5 seconds a strike drone leaves the rack, finds a target and detonates.',
  price: 320,
  targeting: 'first',
  projectile: { kind: 'drone', speed: 230, explosive: EXPLOSIVE_DRONE },
  // balance: damage trimmed 15% – with wave scaling it out-lasted the Tier VII General
  levels: [
    { damage: 51, range: 200, rate: 1 / 1.5, splash: 30 },
    { cost: 350, damage: 64, range: 200, rate: 1 / 1.5, splash: 30 },
    { cost: 550, damage: 78, range: 216, rate: 1 / 1.4, splash: 32 },
    { cost: 820, damage: 98, range: 216, rate: 1 / 1.3, splash: 32 },
    { cost: 1200, damage: 123, range: 232, rate: 1 / 1.2, splash: 34 },
    { cost: 1700, damage: 157, range: 248, rate: 1 / 1.1, splash: 36 },
  ],
  passive: {
    id: 'explosive-drones',
    name: 'Explosive Drones',
    summary: '10% of drones are Explosive Drones: 5× damage and 2× blast radius.',
    formula: 'Chance 10% per launch · Damage × 5 · Radius × 2',
  },
  art: 'drone',
};
