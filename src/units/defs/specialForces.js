// SPECIAL FORCES — Tier 3. Elite DPS rifleman with a stronger, Dude-style
// stacking passive. SQUAD_TACTICS_PER_UNIT is the configurable scaling.
export const SQUAD_TACTICS_PER_UNIT = 0.2;
export const squadTacticsMultiplier = (deployed) => 1 + SQUAD_TACTICS_PER_UNIT * Math.max(0, deployed - 1);

export default {
  id: 'special-forces',
  name: 'Special Forces',
  tier: 3,
  role: 'Operator · sustained DPS',
  description: 'Quiet, fast and precise. Each additional operator on the field makes the whole squad deadlier.',
  price: 110,
  targeting: 'first',
  projectile: { kind: 'bullet', speed: 1100, color: '#e8e2c8' },
  levels: [
    { damage: 10, range: 112, rate: 3.0 },
    { cost: 120, damage: 13, range: 112, rate: 3.0 },
    { cost: 200, damage: 16, range: 120, rate: 3.3 },
    { cost: 320, damage: 20, range: 120, rate: 3.6 },
    { cost: 480, damage: 26, range: 128, rate: 3.9 },
    { cost: 700, damage: 34, range: 136, rate: 4.3 },
  ],
  passive: {
    id: 'squad-tactics',
    name: 'Squad Tactics',
    summary: `+${SQUAD_TACTICS_PER_UNIT * 100}% damage to all Special Forces for every other Special Forces deployed.`,
    formula: `Damage × [1 + ${SQUAD_TACTICS_PER_UNIT.toFixed(2)} × (deployed Special Forces − 1)]`,
    modify(stats, ctx) {
      stats.damage *= squadTacticsMultiplier(ctx.deployed);
    },
    bonus(ctx) {
      return squadTacticsMultiplier(ctx.deployed) - 1;
    },
  },
  art: 'specialForces',
};
