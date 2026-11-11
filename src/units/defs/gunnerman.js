// GUNNERMAN — Tier 2. Belt-fed machine gun: low damage per round, very high rate.
export default {
  id: 'gunnerman',
  name: 'Gunnerman',
  tier: 2,
  role: 'Machine gunner · sustained DPS',
  description: 'Hauls a belt-fed machine gun nobody else wants to carry. Lays down a steady stream of fire at a good distance.',
  price: 75,
  targeting: 'first',
  projectile: { kind: 'bullet', speed: 1000, color: '#f7d58a' },
  levels: [
    { damage: 5, range: 112, rate: 4.0 },
    { cost: 100, damage: 6, range: 112, rate: 4.2 },
    { cost: 160, damage: 7, range: 120, rate: 4.5 },
    { cost: 250, damage: 9, range: 120, rate: 4.8 },
    { cost: 380, damage: 11, range: 128, rate: 5.2 },
    { cost: 560, damage: 14, range: 136, rate: 5.8 },
  ],
  art: 'gunnerman',
};
