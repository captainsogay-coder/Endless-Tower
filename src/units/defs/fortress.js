// FORTRESS — Tier 10. A fortified gun emplacement with an enormous blast
// radius. Launches Explosive Drones every 5 s whose blasts Cripple enemies
// (+20% damage taken, −10% speed), and raises battle-wide coin income.
import { tierUnit } from '../levels.js';
export const FORTRESS_LOGISTICS = { id: 'fortress-logistics', label: 'Fortress Logistics', coinMult: 1.25 };
export const FORTRESS_DRONE_INTERVAL = 5;

export default {
  id: 'fortress',
  name: 'Fortress',
  tier: 10,
  role: 'Fortification · massive area damage',
  description: 'Poured concrete, a siege gun, and a hangar full of drones. The rarest thing the military will requisition.',
  targeting: 'first',
  projectile: { kind: 'siege', speed: 480 },
  // Base stats come from the tier budget (src/balance.js TIERS); this line is the unit's identity.
  ...tierUnit(10, { rate: 0.3, range: 272, splash: 120, role: 'summoner', power: 0.81 }),
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
