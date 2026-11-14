// TANK — Tier 5. Heavy shells with a small blast that leave burning ground.
// Passive aura: allied units within a small radius attack 10% faster
// (cooldown × 0.9). Overlapping Tank auras do not stack.
import { tierUnit } from '../levels.js';
export const TANK_AURA = { id: 'tank-command', label: 'Command Presence', radius: 80, cooldownMult: 0.9 };

export default {
  id: 'tank',
  name: 'Tank',
  tier: 5,
  role: 'Armour · area damage & support',
  description: 'A battered main battle tank. Its shells hit harder and reach further than any grenade, and they leave the ground burning.',
  targeting: 'first',
  projectile: { kind: 'shell', speed: 560 },
  // Base stats come from the tier budget (src/balance.js TIERS); this line is the unit's identity.
  ...tierUnit(5, { rate: 0.4, range: 160, splash: 48, role: 'support', power: 0.68 }),
  // Flames: 3 s of burning ground, low damage per second (8% of shell damage).
  impactHazard: { kind: 'fire', radius: 28, duration: 3, dpsFactor: 0.08 },
  buffs: [TANK_AURA],
  passive: {
    id: 'command-presence',
    name: 'Command Presence',
    summary: 'Allied units within 2.5 tiles attack 10% faster. Multiple Tanks do not stack.',
    formula: 'Ally cooldown × 0.90 within 2.5 tiles',
  },
  art: 'tank',
};
