// COLONEL — Tier 6. Cheap to deploy, mid-high damage, and a map-wide order
// that buffs every allied unit and raises coin income. Strongest early on.
import { tierUnit } from '../levels.js';
export const COLONEL_ORDERS = { id: 'colonel-orders', label: "Colonel's Orders", radius: Infinity, damageMult: 1.15, cooldownMult: 0.9, rangeMult: 1.05 };
export const COLONEL_ECONOMY = { id: 'colonel-requisition', label: 'Requisition', coinMult: 1.15 };

export default {
  id: 'colonel',
  name: 'Colonel',
  tier: 6,
  role: 'Officer · map-wide buffs & coins',
  description: 'Runs the whole front from one folding chair. Every allied unit fights harder, and the supply office pays out more.',
  targeting: 'first',
  projectile: { kind: 'bullet', speed: 1000, color: '#f0d890' },
  // Base stats come from the tier budget (src/balance.js TIERS); this line is the unit's identity.
  ...tierUnit(6, { rate: 1.2, range: 128, role: 'economy', price: 0.3 }),
  buffs: [COLONEL_ORDERS],
  economy: COLONEL_ECONOMY,
  passive: {
    id: 'colonel-orders',
    name: "Colonel's Orders",
    summary: 'Map-wide: allies deal +15% damage with 10% cooldown reduction and +5% range. +15% coin gain. Several Colonels do not stack.',
    formula: 'All allies: damage × 1.15 · cooldown × 0.9 · range × 1.05 · coins × 1.15',
  },
  art: 'colonel',
};
