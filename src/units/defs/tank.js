// TANK — Tier 5. Heavy shells with a small blast that leave burning ground.
// Passive aura: allied units within a small radius attack 10% faster
// (cooldown × 0.9). Overlapping Tank auras do not stack.
export const TANK_AURA = { id: 'tank-command', radius: 80, cooldownMult: 0.9 };

export default {
  id: 'tank',
  name: 'Tank',
  tier: 5,
  role: 'Armour · area damage & support',
  description: 'A battered main battle tank. Its shells hit harder and reach further than any grenade, and they leave the ground burning.',
  price: 450,
  targeting: 'first',
  projectile: { kind: 'shell', speed: 560 },
  levels: [
    { damage: 85, range: 160, rate: 0.4, splash: 48 },
    { cost: 500, damage: 105, range: 168, rate: 0.42, splash: 48 },
    { cost: 800, damage: 130, range: 176, rate: 0.45, splash: 50 },
    { cost: 1200, damage: 160, range: 176, rate: 0.48, splash: 52 },
    { cost: 1700, damage: 200, range: 184, rate: 0.5, splash: 54 },
    { cost: 2400, damage: 250, range: 192, rate: 0.55, splash: 56 },
  ],
  // Flames: 3 s of burning ground, low damage per second (8% of shell damage).
  impactHazard: { kind: 'fire', radius: 28, duration: 3, dpsFactor: 0.08 },
  aura: TANK_AURA,
  passive: {
    id: 'command-presence',
    name: 'Command Presence',
    summary: 'Allied units within 2.5 tiles attack 10% faster. Multiple Tanks do not stack.',
    formula: 'Ally cooldown × 0.90 within 2.5 tiles',
  },
  art: 'tank',
};
