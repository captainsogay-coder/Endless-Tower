// SPECIAL FORCES — Tier 3. Elite DPS rifleman with a stronger, Dude-style
// stacking passive. SQUAD_TACTICS_PER_UNIT is the configurable scaling.
import { tierUnit } from '../levels.js';
export const SQUAD_TACTICS_PER_UNIT = 0.15;
export const SQUAD_TACTICS_CAP = 3; // balance: capped at +300% (21 operators) – uncapped, 60 copies out-scaled Tier X units
export const squadTacticsMultiplier = (deployed) => 1 + Math.min(SQUAD_TACTICS_CAP, SQUAD_TACTICS_PER_UNIT * Math.max(0, deployed - 1));

export default {
  id: 'special-forces',
  name: 'Special Forces',
  tier: 3,
  role: 'Operator · sustained DPS',
  description: 'Quiet, fast and precise. Each additional operator on the field makes the whole squad deadlier.',
  targeting: 'first',
  projectile: { kind: 'bullet', speed: 1100, color: '#e8e2c8' },
  // Base stats come from the tier budget (src/balance.js TIERS); this line is the unit's identity.
  ...tierUnit(3, { rate: 3, range: 112, power: 1.12 }),
  passive: {
    id: 'squad-tactics',
    name: 'Squad Tactics',
    summary: `+${Math.round(SQUAD_TACTICS_PER_UNIT * 100)}% damage to all Special Forces for every other Special Forces deployed (up to +${SQUAD_TACTICS_CAP * 100}%).`,
    formula: `Damage × [1 + min(${SQUAD_TACTICS_CAP}, ${SQUAD_TACTICS_PER_UNIT.toFixed(2)} × (deployed Special Forces − 1))]`,
    modify(stats, ctx) {
      stats.damage *= squadTacticsMultiplier(ctx.deployed);
    },
    bonus(ctx) {
      return squadTacticsMultiplier(ctx.deployed) - 1;
    },
  },
  art: 'specialForces',
};
