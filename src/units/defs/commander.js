// COMMANDER — Tier 5. Marksman officer: extremely long range, fast attacks,
// and a large aura that slightly extends allied range and shortens cooldowns.
export const COMMANDER_AURA = { id: 'commander-presence', label: 'Commander Presence', radius: 176, rangeMult: 1.08, cooldownMult: 0.92 };

export default {
  id: 'commander',
  name: 'Commander',
  tier: 5,
  role: 'Officer · long-range support',
  description: 'Reads the whole battlefield through a scoped rifle and keeps everyone nearby sharp.',
  price: 420,
  targeting: 'strongest',
  projectile: { kind: 'bullet', speed: 1400, color: '#f2e2a8' },
  levels: [
    { damage: 34, range: 320, rate: 2.4 },
    { cost: 420, damage: 42, range: 336, rate: 2.5 },
    { cost: 650, damage: 52, range: 352, rate: 2.7 },
    { cost: 950, damage: 64, range: 368, rate: 2.9 },
    { cost: 1350, damage: 80, range: 384, rate: 3.1 },
    { cost: 1900, damage: 100, range: 416, rate: 3.4 },
  ],
  buffs: [COMMANDER_AURA],
  passive: {
    id: 'commander-presence',
    name: 'Commander Presence',
    summary: 'Allies within 5.5 tiles get +8% range and 8% cooldown reduction. Stacks with other buff units; several Commanders do not stack.',
    formula: 'Ally range × 1.08 · cooldown × 0.92 within 5.5 tiles',
  },
  art: 'commander',
};
