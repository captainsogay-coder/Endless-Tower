// COLONEL — Tier 6. Cheap to deploy, mid-high damage, and a map-wide order
// that buffs every allied unit and raises coin income. Strongest early on.
export const COLONEL_ORDERS = { id: 'colonel-orders', label: "Colonel's Orders", radius: Infinity, damageMult: 1.15, cooldownMult: 0.9, rangeMult: 1.05 };
export const COLONEL_ECONOMY = { id: 'colonel-requisition', label: 'Requisition', coinMult: 1.15 };

export default {
  id: 'colonel',
  name: 'Colonel',
  tier: 6,
  role: 'Officer · map-wide buffs & coins',
  description: 'Runs the whole front from one folding chair. Every allied unit fights harder, and the supply office pays out more.',
  price: 90,
  targeting: 'first',
  projectile: { kind: 'bullet', speed: 1000, color: '#f0d890' },
  levels: [
    { damage: 26, range: 128, rate: 1.2 },
    { cost: 110, damage: 32, range: 128, rate: 1.25 },
    { cost: 180, damage: 40, range: 136, rate: 1.3 },
    { cost: 280, damage: 50, range: 136, rate: 1.4 },
    { cost: 420, damage: 62, range: 144, rate: 1.5 },
    { cost: 620, damage: 78, range: 152, rate: 1.6 },
  ],
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
