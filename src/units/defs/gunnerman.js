// GUNNERMAN — Tier 2. Belt-fed machine gun: low damage per round, very high rate.
import { tierUnit } from '../levels.js';
export default {
  id: 'gunnerman',
  name: 'Gunnerman',
  tier: 2,
  role: 'Machine gunner · sustained DPS',
  description: 'Hauls a belt-fed machine gun nobody else wants to carry. Lays down a steady stream of fire at a good distance.',
  targeting: 'first',
  projectile: { kind: 'bullet', speed: 1000, color: '#f7d58a' },
  // Base stats come from the tier budget (src/balance.js TIERS); this line is the unit's identity.
  ...tierUnit(2, { rate: 4, range: 112 }),
  art: 'gunnerman',
};
