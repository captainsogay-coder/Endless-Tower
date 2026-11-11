// CADET — Tier 1. A fresh recruit with a service rifle: Dude, but trained.
// Higher DPS and longer range than Dude; a straightforward damage dealer.
export default {
  id: 'cadet',
  name: 'Cadet',
  tier: 1,
  role: 'Rifleman · damage dealer',
  description: 'Fresh out of basic training and eager to prove it. Steadier aim and a longer reach than any Dude.',
  price: 30,
  targeting: 'first',
  projectile: { kind: 'bullet', speed: 900, color: '#f4e3a1' },
  levels: [
    { damage: 7, range: 80, rate: 1.5 },
    { cost: 40, damage: 9, range: 80, rate: 1.5 },
    { cost: 70, damage: 11, range: 88, rate: 1.65 },
    { cost: 120, damage: 14, range: 88, rate: 1.65 },
    { cost: 190, damage: 18, range: 96, rate: 1.8 },
    { cost: 300, damage: 24, range: 104, rate: 2.0 },
  ],
  art: 'cadet',
};
