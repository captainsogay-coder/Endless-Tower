// GRENADE LAUNCHER — Tier 3. Slow, lobbed grenades with a small blast radius.
// Passive WOUNDED: each enemy hit has a 20% chance to be Wounded (5% slower).
import { tierUnit } from '../levels.js';
export const WOUND_CHANCE = 0.2;

export default {
  id: 'grenade-launcher',
  name: 'Grenade Launcher',
  tier: 3,
  role: 'Grenadier · small area damage',
  description: 'Lobs high-explosive grenades in a long arc. Hits hard and catches small groups, but reloads slowly.',
  targeting: 'first',
  projectile: { kind: 'grenade', speed: 260 },
  // Base stats come from the tier budget (src/balance.js TIERS); this line is the unit's identity.
  ...tierUnit(3, { rate: 0.55, range: 128, splash: 36, power: 0.62 }),
  onHit: [{ status: 'wounded', chance: WOUND_CHANCE }],
  passive: {
    id: 'wounded',
    name: 'Wounded',
    summary: '20% chance per hit to Wound an enemy, slowing it by 5% for 4 seconds.',
    formula: 'Chance 20% per enemy hit · Slow 5% · Refreshes, does not stack',
  },
  art: 'grenadier',
};
