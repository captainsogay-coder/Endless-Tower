// GRENADE LAUNCHER — Tier 3. Slow, lobbed grenades with a small blast radius.
// Passive WOUNDED: each enemy hit has a 20% chance to be Wounded (5% slower).
export const WOUND_CHANCE = 0.2;

export default {
  id: 'grenade-launcher',
  name: 'Grenade Launcher',
  tier: 3,
  role: 'Grenadier · small area damage',
  description: 'Lobs high-explosive grenades in a long arc. Hits hard and catches small groups, but reloads slowly.',
  price: 160,
  targeting: 'first',
  projectile: { kind: 'grenade', speed: 260 },
  levels: [
    { damage: 32, range: 128, rate: 0.45, splash: 36 },
    { cost: 200, damage: 40, range: 128, rate: 0.45, splash: 36 },
    { cost: 320, damage: 50, range: 136, rate: 0.5, splash: 38 },
    { cost: 480, damage: 62, range: 136, rate: 0.5, splash: 40 },
    { cost: 700, damage: 78, range: 144, rate: 0.55, splash: 42 },
    { cost: 1000, damage: 98, range: 152, rate: 0.6, splash: 44 },
  ],
  onHit: [{ status: 'wounded', chance: WOUND_CHANCE }],
  passive: {
    id: 'wounded',
    name: 'Wounded',
    summary: '20% chance per hit to Wound an enemy, slowing it by 5% for 4 seconds.',
    formula: 'Chance 20% per enemy hit · Slow 5% · Refreshes, does not stack',
  },
  art: 'grenadier',
};
