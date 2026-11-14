// CADET — Tier 1. A fresh recruit with a service rifle: Dude, but trained.
// Higher DPS and longer range than Dude; a straightforward damage dealer.
import { tierUnit } from '../levels.js';
export default {
  id: 'cadet',
  name: 'Cadet',
  tier: 1,
  role: 'Rifleman · damage dealer',
  description: 'Fresh out of basic training and eager to prove it. Steadier aim and a longer reach than any Dude.',
  targeting: 'first',
  projectile: { kind: 'bullet', speed: 900, color: '#f4e3a1' },
  // Base stats come from the tier budget (src/balance.js TIERS); this line is the unit's identity.
  ...tierUnit(1, { rate: 1.5, range: 80, price: 1.5 }),
  art: 'cadet',
};
