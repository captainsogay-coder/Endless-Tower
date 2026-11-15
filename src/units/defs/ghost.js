// THE GHOST – a samurai-invasion summoning circle: 14 units, four chase units.
// An original interpretation of feudal Japanese and Mongol-era warfare; all
// characters, designs and names are original to Endless Tower.
//
// Tags cut across the circle for buffs: 'samurai', 'mongol', 'ronin'.
// Stats come from the tier generator (tierUnit); `power` trims are set by
// scripts/calibrate.mjs. Ability behaviour lives in src/game/abilities.js.
import { tierUnit } from '../levels.js';

export const GHOST = 'the-ghost';
const shot = (kind, speed = 520) => ({ kind, speed });

// ---------------------------------------------------------------- the rank and file

export const starvingSamurai = {
  id: 'starving-samurai', name: 'Starving Samurai', tier: 2, faction: GHOST, tags: ['samurai', 'ronin'],
  role: 'Cheap melee · early waves',
  description: 'Has not eaten in three days. Has not missed a cut in thirty years.',
  projectile: shot('katana', 1600),
  ...tierUnit(2, { rate: 1.3, range: 64, price: 0.7, power: 0.96 }),
  ability: { id: 'heavy-kind', heavyEvery: 10, heavyMult: 2, heavyKind: 'katanaheavy' },
  passive: { id: 'starving-samurai', name: 'Hunger Cut', summary: 'Cheap, reliable melee attacker. Every 10th attack deals 2× damage.' },
  art: 'starvingSamurai',
};

export const mongolWarrior = {
  id: 'mongol-warrior', name: 'Mongol Warrior', tier: 4, faction: GHOST, tags: ['mongol'],
  role: 'Balanced frontline',
  description: 'Crossed a continent to stand on this road.',
  projectile: shot('saber', 1500),
  ...tierUnit(4, { rate: 1.1, range: 96, power: 0.81 }),
  ability: { id: 'heavy-kind', heavyEvery: 8, heavyMult: 2.2, heavyKind: 'heavysaber' },
  passive: { id: 'mongol-warrior', name: 'Steppe Blow', summary: 'Medium damage at moderate range. Every 8th attack is a 2.2× strike.' },
  art: 'mongolWarrior',
};

export const mongolArcher = {
  id: 'mongol-archer', name: 'Mongol Archer', tier: 5, faction: GHOST, tags: ['mongol'],
  role: 'Long range · power shot',
  description: 'Draws a bow most men cannot bend.',
  projectile: shot('horsebow', 820),
  ...tierUnit(5, { rate: 1, range: 208, power: 0.81 }),
  ability: { id: 'heavy-kind', heavyEvery: 6, heavyMult: 2.5, heavyKind: 'powershot' },
  passive: { id: 'mongol-archer', name: 'Composite Bow', summary: 'Long range, consistent damage. Every 6th attack is a power shot for 2.5×.' },
  art: 'mongolArcher',
};

export const mongolHorsemen = {
  id: 'mongol-horsemen', name: 'Mongol Horsemen', tier: 7, faction: GHOST, tags: ['mongol'],
  role: 'Fast · cavalry charge',
  description: 'They are already past you. That is how it works.',
  projectile: shot('horsebow', 900),
  ...tierUnit(7, { rate: 1.6, range: 160, power: 0.68 }),
  ability: { id: 'mongol-horsemen', chargeEvery: 12, chargeCount: 6, chargeMult: 2.5, exitShare: 0.7, exitBonus: 0.2 },
  passive: { id: 'mongol-horsemen', name: 'Cavalry Charge', summary: 'Fast shots at medium-long range; +20% damage to enemies near the exit. Every 12 s a charge rides through up to 6 enemies for 2.5×.' },
  art: 'mongolHorsemen',
};

export const mongolBrute = {
  id: 'mongol-brute', name: 'Mongol Brute', tier: 6, faction: GHOST, tags: ['mongol'],
  role: 'Heavy hitter · ground slam',
  description: 'Carries a club made from a temple door.',
  projectile: shot('club', 1300),
  ...tierUnit(6, { rate: 0.55, range: 72, power: 0.49 }),
  ability: { id: 'slam-every', slamEvery: 10, slamRadius: 72, slamMult: 2, slamKind: 'bruteslam' },
  passive: { id: 'mongol-brute', name: 'Temple Door', summary: 'Slow, heavy single-target blows. Every 10 s a ground slam hits everything within 2.25 tiles for 2×.' },
  art: 'mongolBrute',
};

export const ronin = {
  id: 'ronin', name: 'Ronin', tier: 8, faction: GHOST, tags: ['samurai', 'ronin'],
  role: 'Duelist · three-strike combo',
  description: 'Serves no lord. Answers to no one. Never misses.',
  targeting: 'strongest',
  projectile: shot('katana', 1600),
  ...tierUnit(8, { rate: 1.2, range: 80, power: 0.79 }),
  ability: { id: 'combo-every', every: 8, hits: 3, gap: 0.09, mult: 1, kind: 'combo' },
  passive: { id: 'ronin', name: 'Three Cuts', summary: 'High single-target damage, always at the enemy with the most health. Every 8th attack is a rapid three-strike combination.' },
  art: 'ronin',
};

export const MONGOL_WARBANNER = { id: 'mongol-warbanner', label: 'War Banner', radius: 160, tag: 'mongol', damageMult: 1.12, levelScale: 0.1 };
export const mongolCommander = {
  id: 'mongol-commander', name: 'Mongol Commander', tier: 10, faction: GHOST, tags: ['mongol'],
  role: 'Area · Mongol support',
  description: 'Signals the horde with drums, flags and fire arrows.',
  projectile: shot('firearrow', 700),
  ...tierUnit(10, { rate: 0.9, range: 176, splash: 36, role: 'support', power: 0.79 }),
  buffs: [MONGOL_WARBANNER],
  ability: { id: 'mongol-commander', drumEvery: 20, drumDuration: 5, drumRate: 0.2, drumRadius: 160, buffTag: 'mongol' },
  passive: { id: 'mongol-commander', name: 'War Drums', summary: 'Fire-arrow volleys that burst in an area. Mongol units within 5 tiles +12% damage; every 20 s the drums give them +20% attack speed for 5 s.' },
  art: 'mongolCommander',
};

export const decoratedSamurai = {
  id: 'decorated-samurai', name: 'Decorated Samurai', tier: 11, faction: GHOST, tags: ['samurai'],
  role: 'Elite duelist · boss hunter',
  description: 'Every scar on the armour is a lacquered story.',
  projectile: shot('katana', 1600),
  ...tierUnit(11, { rate: 1.1, range: 88, power: 0.75 }),
  ability: { id: 'decorated-samurai', strikeEvery: 12, strikeMult: 4, bossBonus: 0.1 },
  passive: { id: 'decorated-samurai', name: 'Precision Strike', summary: 'Elite single-target attacker, +10% damage to bosses. Every 12 s a precision strike deals 4× to the strongest enemy in reach.' },
  art: 'decoratedSamurai',
};

export const SAMURAI_RESOLVE = { id: 'samurai-resolve', label: 'Resolve', radius: 160, tag: 'samurai', damageMult: 1.15, levelScale: 0.1 };
export const samuraiLord = {
  id: 'samurai-lord', name: 'Samurai Lord', tier: 13, faction: GHOST, tags: ['samurai'],
  role: 'Samurai support · sword technique',
  description: 'Commands from the front, as his father did.',
  projectile: shot('katana', 1500),
  ...tierUnit(13, { rate: 1, range: 128, role: 'support', power: 0.56 }),
  buffs: [SAMURAI_RESOLVE],
  ability: { id: 'self-wave', waveEvery: 20, waveRadius: 112, waveMult: 2.5, kind: 'swordwave' },
  passive: { id: 'samurai-lord', name: 'Crescent Technique', summary: 'Medium range. Samurai units within 5 tiles +15% damage. Every 20 s a sweeping sword technique hits everything within 3.5 tiles for 2.5×.' },
  art: 'samuraiLord',
};

export const desperateThief = {
  id: 'desperate-thief', name: 'Desperate Thief', tier: 14, faction: GHOST, tags: [],
  role: 'Agile · last line · loot',
  description: 'Climbs anything, steals anything, and fights dirty when it matters.',
  targeting: 'first',
  projectile: shot('kunai', 980),
  ...tierUnit(14, { rate: 1.6, range: 176, power: 0.7 }),
  ability: { id: 'desperate-thief', volleyEvery: 10, volleyCount: 3, volleyMult: 2.5, killsPerPayout: 20, coins: 15 },
  passive: { id: 'desperate-thief', name: 'Dirty Tricks', summary: 'Agile ranged attacker, always at the enemy closest to the exit. Every 10 s a volley of knives hits up to 3 enemies for 2.5×. Every 20 eliminations: 15 coins.' },
  art: 'desperateThief',
};

// ---------------------------------------------------------------- chase units

export const RONIN_BAND = { id: 'ronin-band', label: 'Straw-hat Band', radius: 160, tag: 'ronin', damageMult: 1.2, levelScale: 0.1 };
export const defectedLord = {
  id: 'defected-lord', name: 'The Defected Lord', tier: 17, faction: GHOST, tags: ['ronin'],
  role: 'Chase · multi-strike duelist',
  description: 'Chose the side that would feed his men. Still wears the old crest under the new colours.',
  projectile: shot('katana', 1700),
  ...tierUnit(17, { rate: 1.3, range: 112, power: 0.67 }),
  buffs: [RONIN_BAND],
  ability: { id: 'defected-lord', comboEvery: 15, comboHits: 5, comboMult: 1.4, frenzyEvery: 30, frenzyDuration: 6, frenzyRate: 0.3 },
  passive: { id: 'defected-lord', name: 'Turncoat Blade', summary: 'Strong single-target damage. Ronin units within 5 tiles +20% damage. Every 15 s a five-strike flurry (1.4× each); every 30 s +30% attack speed for 6 s.' },
  art: 'defectedLord',
};

export const LORDS_EDICT = { id: 'lords-edict', label: "Lord's Edict", radius: Infinity, tag: 'samurai', damageMult: 1.18, rangeMult: 1.1, levelScale: 0.1 };
export const honourableLord = {
  id: 'honourable-lord', name: 'The Honourable Lord', tier: 19, faction: GHOST, tags: ['samurai'],
  role: 'Chase · Samurai commander',
  description: 'Holds the line by the old code, and expects the same of everyone.',
  projectile: shot('katana', 1600),
  ...tierUnit(19, { rate: 1, range: 136, role: 'support', power: 0.53 }),
  buffs: [LORDS_EDICT],
  ability: { id: 'honourable-lord', techniqueEvery: 25, techniqueRadius: 128, techniqueMult: 5, bossBonus: 0.25 },
  passive: { id: 'honourable-lord', name: 'Way of the Lord', summary: 'All Samurai units on the map +18% damage and +10% range. +25% damage to bosses. Every 25 s an area-clearing sword technique hits everything within 4 tiles for 5×.' },
  art: 'honourableLord',
};

export const greatKhan = {
  id: 'great-khan', name: 'The Great Khan', tier: 23, faction: GHOST, tags: ['mongol'],
  role: 'Super chase · battlefield destroyer',
  description: 'Rides at the head of an empire that has never been told no.',
  projectile: shot('khanvolley', 620),
  ...tierUnit(23, { rate: 0.55, range: 224, splash: 64, power: 0.48 }),
  onHit: [{ status: 'exposed', chance: 1, amount: 0.2, duration: 6 }],
  ability: { id: 'great-khan', every: 30, mult: 4, exposed: 0.2, exposedDuration: 6, killsPerPayout: 50, coins: 25 },
  passive: { id: 'great-khan', name: 'Sky of Arrows', summary: 'Huge area volleys; enemies hit take +20% damage from all allies for 6 s. Every 30 s a sky of arrows hits every enemy on the battlefield for 4×. Every 50 eliminations: 25 coins.' },
  art: 'greatKhan',
};

export const ghostWarrior = {
  id: 'ghost-warrior', name: 'The Ghost Warrior', tier: 25, faction: GHOST, tags: ['samurai'],
  role: 'Super chase · the legend',
  description: 'A samurai who learned to fight in the dark. The invaders tell stories about him to frighten each other.',
  projectile: shot('ghostblade', 1800),
  ...tierUnit(25, { rate: 2, range: 120, power: 0.5 }),
  ability: { id: 'ghost-warrior', techniqueEvery: 12, techniqueCount: 6, techniqueMult: 3, stanceEvery: 30, stanceDuration: 8, stanceDamage: 0.4, stanceRate: 0.25, cleave: 2, cleaveRadius: 56, cleaveMult: 0.7, killsPerStack: 100, perStack: 0.01, stackCap: 0.25 },
  passive: { id: 'ghost-warrior', name: 'Way of the Ghost', summary: 'High damage, very fast attacks. Every 12 s a Ghost technique cuts through up to 6 enemies for 3×. Every 30 s Ghost Stance for 8 s: +40% damage, +25% attack speed, each attack also cuts 2 nearby enemies. +1% damage per 100 eliminations (max +25%).' },
  art: 'ghostWarrior',
};

export const GHOST_UNITS = [starvingSamurai, mongolWarrior, mongolArcher, mongolHorsemen, mongolBrute, ronin, mongolCommander, decoratedSamurai, samuraiLord, desperateThief, defectedLord, honourableLord, greatKhan, ghostWarrior];
