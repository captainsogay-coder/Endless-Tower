// COMMANDER — Tier 5. Marksman officer: extremely long range, fast attacks,
// and a large aura that slightly extends allied range and shortens cooldowns.
import { tierUnit } from '../levels.js';
export const COMMANDER_AURA = { id: 'commander-presence', label: 'Commander Presence', radius: 176, rangeMult: 1.08, cooldownMult: 0.92 };

export default {
  id: 'commander',
  name: 'Commander',
  tier: 5,
  role: 'Officer · long-range support',
  description: 'Reads the whole battlefield through a scoped rifle and keeps everyone nearby sharp.',
  targeting: 'strongest',
  projectile: { kind: 'bullet', speed: 1400, color: '#f2e2a8' },
  // Base stats come from the tier budget (src/balance.js TIERS); this line is the unit's identity.
  ...tierUnit(5, { rate: 2.4, range: 320, role: 'support', power: 1.05 }),
  buffs: [COMMANDER_AURA],
  passive: {
    id: 'commander-presence',
    name: 'Commander Presence',
    summary: 'Allies within 5.5 tiles get +8% range and 8% cooldown reduction. Stacks with other buff units; several Commanders do not stack.',
    formula: 'Ally range × 1.08 · cooldown × 0.92 within 5.5 tiles',
  },
  art: 'commander',
};
