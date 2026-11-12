// GENERAL — Tier 7. Calls in artillery (mid-sized blast, high damage), gives
// powerful buffs in a large radius, and launches regular drones (never
// Explosive Drones) every GENERAL_DRONE_INTERVAL seconds.
export const GENERAL_COMMAND = { id: 'general-command', label: 'General Command', radius: 208, damageMult: 1.25, cooldownMult: 0.85, rangeMult: 1.1 };
export const GENERAL_DRONE_INTERVAL = 4;

export default {
  id: 'general',
  name: 'General',
  tier: 7,
  role: 'High command · artillery & buffs',
  description: 'Points at the map, and the map explodes. Also brought a few drones along.',
  price: 900,
  targeting: 'first',
  projectile: { kind: 'artillery', speed: 420 },
  levels: [
    { damage: 150, range: 208, rate: 0.5, splash: 56 },
    { cost: 900, damage: 185, range: 216, rate: 0.52, splash: 56 },
    { cost: 1400, damage: 230, range: 224, rate: 0.55, splash: 60 },
    { cost: 2100, damage: 285, range: 232, rate: 0.58, splash: 62 },
    { cost: 3000, damage: 355, range: 240, rate: 0.62, splash: 64 },
    { cost: 4200, damage: 440, range: 256, rate: 0.66, splash: 68 },
  ],
  buffs: [GENERAL_COMMAND],
  summon: { every: GENERAL_DRONE_INTERVAL, kind: 'drone', speed: 230, damageFactor: 0.4, splash: 30, explosive: null },
  passive: {
    id: 'general-command',
    name: 'General Command',
    summary: 'Allies within 6.5 tiles: +25% damage, 15% cooldown reduction, +10% range. Launches a drone every 4 s (never explosive). Several Generals do not stack.',
    formula: 'Ally damage × 1.25 · cooldown × 0.85 · range × 1.1 within 6.5 tiles',
  },
  art: 'general',
};
