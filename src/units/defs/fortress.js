// FORTRESS — Tier 10. A fortified gun emplacement with an enormous blast
// radius. Launches Explosive Drones every 5 s whose blasts Cripple enemies
// (+20% damage taken, −10% speed), and raises battle-wide coin income.
export const FORTRESS_LOGISTICS = { id: 'fortress-logistics', label: 'Fortress Logistics', coinMult: 1.25 };
export const FORTRESS_DRONE_INTERVAL = 5;

export default {
  id: 'fortress',
  name: 'Fortress',
  tier: 10,
  role: 'Fortification · massive area damage',
  description: 'Poured concrete, a siege gun, and a hangar full of drones. The rarest thing the military will requisition.',
  price: 3000,
  targeting: 'first',
  projectile: { kind: 'siege', speed: 480 },
  levels: [
    { damage: 380, range: 272, rate: 0.3, splash: 120 },
    { cost: 2800, damage: 470, range: 280, rate: 0.31, splash: 124 },
    { cost: 4200, damage: 580, range: 288, rate: 0.33, splash: 128 },
    { cost: 6200, damage: 720, range: 296, rate: 0.35, splash: 132 },
    { cost: 9000, damage: 890, range: 304, rate: 0.37, splash: 136 },
    { cost: 13000, damage: 1100, range: 320, rate: 0.4, splash: 144 },
  ],
  summon: {
    every: FORTRESS_DRONE_INTERVAL,
    kind: 'drone',
    speed: 230,
    damageFactor: 0.25,
    splash: 32,
    explosive: { chance: 1, damageMult: 5, splashMult: 2 },
    onHit: [{ status: 'crippled', chance: 1 }],
  },
  economy: FORTRESS_LOGISTICS,
  passive: {
    id: 'fortress-drones',
    name: 'Crippling Drones',
    summary: 'Launches an Explosive Drone every 5 s. Its blast Cripples enemies: +20% damage taken, −10% speed. +25% coin gain.',
    formula: 'Crippled: damage taken × 1.2 · speed × 0.9 · 5 s, refreshes',
  },
  art: 'fortress',
};
