// GAMBINO circle units: casino crew. Abilities live in src/game/abilities.js;
// all numbers are in each unit's `ability` block.
import { tierUnit } from '../levels.js';

export const drunkard = {
  id: 'drunkard',
  name: 'Drunkard',
  tier: 1,
  role: 'Unpredictable · stumbles',
  description: 'Throws whatever is in his hand. Usually a bottle.',
  projectile: { kind: 'bottle', speed: 340 },
  ...tierUnit(1, { rate: 1.2, range: 72, price: 1.25, power: 0.6 }),
  ability: { id: 'drunkard', low: 0.7, high: 1.6, stumbleEvery: 10, stumbleRadius: 36, stumbleSlow: 0.05, stumbleDuration: 2 },
  passive: { id: 'drunkard', name: 'Liquid Courage', summary: 'Attacks deal either 70% or 160% damage. Every 10th attack is a small stumble that slows enemies by 5% for 2 s.' },
  art: 'drunkard',
};

export const DEALER_TABLE = { id: 'dealer-table', label: "Dealer's Table", radius: 'range', cooldownMult: 0.9, levelScale: 0.1 };

export const dealer = {
  id: 'dealer',
  name: 'Dealer',
  tier: 6,
  role: 'Cards · cooldown aura · income',
  description: 'Deals fast. Always deals himself in.',
  projectile: { kind: 'card', speed: 560 },
  ...tierUnit(6, { rate: 1.6, range: 160, role: 'support', power: 1.1 }),
  buffs: [DEALER_TABLE],
  ability: { id: 'dealer', coinEvery: 20, coinsPerKill: 1, coinCap: 200 },
  passive: { id: 'dealer', name: "Dealer's Table", summary: 'Allies within its range gain 10% cooldown reduction (more per upgrade; Dealers do not stack). Every 20 s pays coins for enemies eliminated in that time.' },
  art: 'dealer',
};

export const nightDancer = {
  id: 'night-dancer',
  name: 'Night Dancer',
  tier: 6,
  role: 'Small blasts · slowing pulse',
  description: 'Every spin sends out a shimmer that slows the crowd.',
  projectile: { kind: 'sequin', speed: 480 },
  ...tierUnit(6, { rate: 1.5, range: 128, splash: 28, power: 0.65 }),
  ability: { id: 'night-dancer', pulseEvery: 5, pulseSlow: 0.15, pulseDuration: 3 },
  passive: { id: 'night-dancer', name: 'Encore', summary: 'Small area attacks. Every 5 attacks releases a pulse that slows enemies in range by 15% for 3 s.' },
  art: 'nightDancer',
};

export const desperateGambler = {
  id: 'desperate-gambler',
  name: 'Desperate Gambler',
  tier: 7,
  role: 'Double or nothing',
  description: 'All in. Every time.',
  projectile: { kind: 'chip', speed: 600 },
  ...tierUnit(7, { rate: 1.4, range: 144, power: 0.74 }),
  ability: { id: 'desperate-gambler', winMult: 2.5, loseMult: 0.4, allInEvery: 15, allInMin: 0.5, allInMax: 5 },
  passive: { id: 'desperate-gambler', name: 'Double or Nothing', summary: 'Each attack: 50% chance of 2.5× damage, otherwise 40%. Every 15 s an all-in shot deals a random 0.5×–5×.' },
  art: 'desperateGambler',
};

export const PIT_BOSS_FLOOR = { id: 'pit-boss-floor', label: 'Pit Boss', radius: 240, damageMult: 1.15, cooldownMult: 0.9, levelScale: 0.1 };

export const pitBoss = {
  id: 'pit-boss',
  name: 'Pit Boss',
  tier: 9,
  role: 'Floor manager · buffs · income',
  description: 'Runs the floor. Everybody works harder.',
  projectile: { kind: 'chip', speed: 640 },
  ...tierUnit(9, { rate: 1, range: 160, role: 'support', power: 1.11 }),
  buffs: [PIT_BOSS_FLOOR],
  ability: { id: 'pit-boss', coinEvery: 15, coinsPerKill: 1.5, coinCap: 300 },
  passive: { id: 'pit-boss', name: 'Running the Floor', summary: 'Allies within 7.5 tiles gain +15% damage and 10% cooldown reduction (more per upgrade; Pit Bosses do not stack). Every 15 s pays coins for enemies defeated in that time.' },
  art: 'pitBoss',
};

export const highRoller = {
  id: 'high-roller',
  name: 'High Roller',
  tier: 10,
  role: 'Big bets · jackpots',
  description: 'Bets big. Wins bigger.',
  projectile: { kind: 'chip', speed: 680 },
  ...tierUnit(10, { rate: 1.2, range: 176, power: 0.7 }),
  ability: { id: 'high-roller', bigEvery: 8, bigMult: 8, jackpotEvery: 10, jackpotCoins: 30, jackpotDamage: 0.01, jackpotCap: 0.25 },
  passive: { id: 'high-roller', name: 'High Stakes', summary: 'Every 8 s fires an 8× shot. Every 10th attack hits a Jackpot: coins and +1% damage for the rest of the battle (up to +25%).' },
  art: 'highRoller',
};

export const HOUSE_RULES = { id: 'the-house', label: 'House Rules', radius: Infinity, damageMult: 1.1, cooldownMult: 0.9 };

export const theHouse = {
  id: 'the-house',
  name: 'THE HOUSE',
  tier: 15,
  role: 'The house always wins',
  description: 'A casino that walked onto the battlefield and set the odds.',
  projectile: { kind: 'chip', speed: 700 },
  ...tierUnit(15, { rate: 1, range: 240, splash: 40, role: 'support', power: 0.5 }),
  buffs: [HOUSE_RULES],
  ability: { id: 'the-house', wheelEvery: 20, jackpotCoins: 500, bankruptcyMult: 5, bankruptcyRadius: 128, doubleDuration: 10, killsPerEdge: 50, edgeCap: 0.2 },
  passive: { id: 'the-house', name: 'House Rules', summary: 'All allies on the map: +10% damage, 10% cooldown reduction. Every 20 s spins Jackpot, Bankruptcy or Double Down. Every 50 kills: +1% damage to all allies for the battle (up to +20%).' },
  art: 'theHouse',
};

export const GAMBINO_UNITS = [drunkard, dealer, nightDancer, desperateGambler, pitBoss, highRoller, theHouse];
