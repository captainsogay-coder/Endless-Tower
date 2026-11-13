// WILD WEST circle units. Abilities are implemented in src/game/abilities.js;
// every number they use is the `ability` data block below.
import { buildLevels } from '../levels.js';

const revolver = { kind: 'revolver', speed: 760 };

export const gambler = {
  id: 'gambler',
  name: 'Gambler',
  tier: 3,
  role: 'Lucky shots · criticals',
  description: 'Bets on every bullet. Wins more often than he should.',
  price: 120,
  projectile: revolver,
  levels: buildLevels({ damage: 14, range: 112, rate: 1.4 }, 120),
  ability: { id: 'gambler', critChance: 0.15, critMult: 3, guaranteedEvery: 10, coins: 2 },
  passive: { id: 'gambler', name: 'Lucky Streak', summary: '15% chance to deal 3× damage. Every 10th attack is a guaranteed critical hit and pays 2 coins.' },
  art: 'gambler',
};

export const bandit = {
  id: 'bandit',
  name: 'Bandit',
  tier: 3,
  role: 'Focused fire · ramping damage',
  description: 'Picks one mark and keeps at it.',
  price: 100,
  projectile: revolver,
  levels: buildLevels({ damage: 9, range: 104, rate: 2.2 }, 100),
  ability: { id: 'bandit', perHit: 0.03, maxStacks: 10 },
  passive: { id: 'bandit', name: 'Stick-Up', summary: 'Each consecutive hit on the same enemy deals +3% damage, up to +30%. Resets when switching targets.' },
  art: 'bandit',
};

export const outlaw = {
  id: 'outlaw',
  name: 'Outlaw',
  tier: 5,
  role: 'Gunfire · dynamite',
  description: 'Six shots, then something louder.',
  price: 260,
  projectile: revolver,
  levels: buildLevels({ damage: 30, range: 128, rate: 1.2 }, 260),
  ability: { id: 'outlaw', dynamiteEvery: 6, dynamiteMult: 1.5, dynamiteRadius: 44, exposed: 0.1, exposedDuration: 4 },
  passive: { id: 'outlaw', name: 'Dynamite', summary: 'Every 6th attack throws dynamite for area damage. Enemies hit take +10% damage for 4 s.' },
  art: 'outlaw',
};

export const bountyHunter = {
  id: 'bounty-hunter',
  name: 'Bounty Hunter',
  tier: 5,
  role: 'Marksman · bounties',
  description: 'Reads the posters. Collects.',
  price: 300,
  projectile: { kind: 'bullet', speed: 900 },
  levels: buildLevels({ damage: 48, range: 176, rate: 0.8 }, 300),
  ability: { id: 'bounty-hunter', markEvery: 8, markDuration: 8, markedBonus: 0.2, bountyRewardMult: 4 },
  passive: { id: 'bounty-hunter', name: 'Wanted', summary: 'Every 8 s marks the enemy in range with the most HP. +20% damage to marked enemies; killing one pays a bounty.' },
  art: 'bountyHunter',
};

export const gunslinger = {
  id: 'gunslinger',
  name: 'Gunslinger',
  tier: 7,
  role: 'Fast hands · bursts',
  description: 'Fans the hammer. Rarely misses.',
  price: 650,
  projectile: revolver,
  levels: buildLevels({ damage: 55, range: 150, rate: 2 }, 650),
  ability: { id: 'gunslinger', burstEvery: 5, burstShots: 3, burstDamage: 0.7, critChance: 0.2, critMult: 2.5 },
  passive: { id: 'gunslinger', name: 'Fan the Hammer', summary: 'Every 5th attack fires a 3-shot burst at 70% damage each. 20% critical chance; criticals deal 2.5×.' },
  art: 'gunslinger',
};

export const SHERIFF_BADGE = { id: 'sheriff-badge', label: "Sheriff's Badge", radius: 224, damageMult: 1.12, rangeMult: 1.1, levelScale: 0.1 };

export const sheriff = {
  id: 'sheriff',
  name: 'Sheriff',
  tier: 9,
  role: 'Lawman · ally buffs',
  description: 'Keeps the peace with a very large revolver.',
  price: 1100,
  projectile: revolver,
  levels: buildLevels({ damage: 120, range: 176, rate: 1 }, 1100),
  buffs: [SHERIFF_BADGE],
  ability: { id: 'sheriff', shotEvery: 15, shotMult: 5 },
  passive: { id: 'sheriff', name: "Sheriff's Badge", summary: 'Allies within 7 tiles gain +12% damage and +10% range (more per upgrade; several Sheriffs do not stack). Every 15 s fires a 5× shot at the strongest enemy.' },
  art: 'sheriff',
};

const OUTLAW_LEADER_PER_OUTLAW = 0.05;
const OUTLAW_LEADER_CAP = 0.5;

export const outlawLeader = {
  id: 'outlaw-leader',
  name: 'Outlaw Leader',
  tier: 9,
  role: 'Gang boss · summons',
  description: 'Never rides alone.',
  price: 1300,
  projectile: revolver,
  levels: buildLevels({ damage: 110, range: 160, rate: 1.1 }, 1300),
  ability: { id: 'outlaw-leader', summonUnit: 'outlaw', summonCount: 3, summonEvery: 12, summonLife: 12, coinEvery: 20, coinsPerEnemy: 0.5, coinCap: 150 },
  passive: {
    id: 'outlaw-leader',
    name: 'The Gang',
    summary: 'Calls 3 Outlaws every 12 s. +5% damage per Outlaw you have deployed (up to +50%; summoned Outlaws do not count). Pays coins every 20 s based on enemies alive.',
    formula: 'Damage × [1 + min(0.5, 0.05 × deployed Outlaws)]',
    watches: ['outlaw'],
    modify(stats, ctx) {
      stats.damage *= 1 + Math.min(OUTLAW_LEADER_CAP, OUTLAW_LEADER_PER_OUTLAW * ctx.count('outlaw'));
    },
  },
  art: 'outlawLeader',
};

export const fastestHand = {
  id: 'fastest-hand',
  name: 'Fastest Hand In The West',
  tier: 12,
  role: 'Legend · six-shot barrages',
  description: 'Nobody has ever seen the draw.',
  price: 4000,
  projectile: revolver,
  levels: buildLevels({ damage: 260, range: 208, rate: 0.25 }, 4000),
  ability: { id: 'fastest-hand', barrageShots: 6, barrageGap: 0.07, streakPerKill: 0.02, streakCap: 0.4, streakTimeout: 8, deadeyeEvery: 25, deadeyeMult: 10 },
  passive: { id: 'fastest-hand', name: 'High Noon', summary: 'Fires a six-shot barrage every 4 s. Consecutive kills: +2% attack speed each, up to +40% (resets after 8 s without one). Every 25 s a guaranteed 10× critical at the strongest enemy.' },
  art: 'fastestHand',
};

export const WILD_WEST_UNITS = [gambler, bandit, outlaw, bountyHunter, gunslinger, sheriff, outlawLeader, fastestHand];
