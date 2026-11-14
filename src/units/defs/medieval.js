// VILLAGE MILITIA, TOWN GUARD and SIEGE WORKSHOP circle units.
// Stats come from the tier generator (tierUnit); each line below is the unit's
// identity profile. Faction buffs only reach units of the same faction.
// Abilities live in src/game/abilities.js.
import { tierUnit } from '../levels.js';

export const VILLAGE = 'village-militia';
export const GUARD = 'town-guard';
export const SIEGE = 'siege-workshop';

const melee = (speed = 1400) => ({ kind: 'slash', speed });

// ---------------------------------------------------------------- VILLAGE MILITIA

export const farmer = {
  id: 'farmer',
  name: 'Farmer',
  tier: 1,
  faction: VILLAGE,
  role: 'Melee · cheap',
  description: 'Brought the pitchfork from the barn. Reliable up close.',
  projectile: melee(),
  ...tierUnit(1, { rate: 1.3, range: 44, price: 0.8, power: 1.15 }),
  passive: { id: 'farmer', name: 'Pitchfork', summary: 'Cheap, short-range melee attacker with reliable basic damage.' },
  art: 'farmer',
};

export const spearman = {
  id: 'spearman',
  name: 'Spearman',
  tier: 1,
  faction: VILLAGE,
  role: 'Melee · long reach',
  description: 'A longer stick with a sharper end.',
  projectile: { kind: 'thrust', speed: 1400 },
  ...tierUnit(1, { rate: 1.1, range: 60, power: 1.07 }),
  passive: { id: 'spearman', name: 'Reach', summary: 'Longer melee reach and slightly stronger attacks than the Farmer.' },
  art: 'spearman',
};

export const slingman = {
  id: 'slingman',
  name: 'Slingman',
  tier: 2,
  faction: VILLAGE,
  role: 'Ranged · fast',
  description: 'Spins, lets go, reaches for the next stone.',
  projectile: { kind: 'stone', speed: 520 },
  ...tierUnit(2, { rate: 2, range: 104, power: 0.97 }),
  passive: { id: 'slingman', name: 'Quick Sling', summary: 'Ranged attacker with moderate damage and fast attacks.' },
  art: 'slingman',
};

export const militiaArcher = {
  id: 'militia-archer',
  name: 'Militia Archer',
  tier: 2,
  faction: VILLAGE,
  role: 'Ranged · long range',
  description: 'Hunts deer on weekdays.',
  projectile: { kind: 'arrow', speed: 640 },
  ...tierUnit(2, { rate: 0.8, range: 150, power: 0.95 }),
  passive: { id: 'militia-archer', name: 'Longbow', summary: 'Longer range and slower attacks with stronger individual shots.' },
  art: 'militiaArcher',
};

export const VILLAGE_RALLY = { id: 'village-rally', label: 'Village Rally', radius: 128, faction: VILLAGE, damageMult: 1.1, levelScale: 0.1 };

export const villageCaptain = {
  id: 'village-captain',
  name: 'Village Captain',
  tier: 3,
  faction: VILLAGE,
  role: 'Frontline · militia buff',
  description: 'Was elected for being the loudest. Turned out to be good at it.',
  projectile: melee(),
  ...tierUnit(3, { rate: 1.2, range: 56, role: 'support', power: 1.07 }),
  buffs: [VILLAGE_RALLY],
  passive: { id: 'village-captain', name: 'Rally', summary: 'Strong frontline attacker. Village Militia units within 4 tiles gain +10% damage (more per upgrade; Captains do not stack).' },
  art: 'villageCaptain',
};

export const HERO_PER_MILITIA = 0.01;
export const HERO_CAP = 0.3;

export const villageHero = {
  id: 'village-hero',
  name: 'The Village Hero',
  tier: 4,
  faction: VILLAGE,
  role: 'Chase · single-target champion',
  description: 'Every village has one. Yours actually shows up.',
  projectile: melee(),
  ...tierUnit(4, { rate: 1.3, range: 80, power: 0.76 }),
  ability: { id: 'village-hero', heavyEvery: 10, heavyMult: 4 },
  passive: {
    id: 'village-hero',
    name: 'For the Village',
    summary: 'Every 10th attack deals 4× damage. +1% damage per other Village Militia unit deployed (up to +30%).',
    formula: 'Damage × [1 + min(0.30, 0.01 × other deployed Village Militia units)]',
    watchFaction: VILLAGE,
    /** Additive damage share; ctx.factionOthers = deployed militia units other than this one. */
    bonus(ctx) {
      return Math.min(HERO_CAP, HERO_PER_MILITIA * (ctx.factionOthers ?? 0));
    },
  },
  art: 'villageHero',
};

// ---------------------------------------------------------------- TOWN GUARD

export const guardRecruit = {
  id: 'guard-recruit',
  name: 'Guard Recruit',
  tier: 2,
  faction: GUARD,
  role: 'Melee · dependable',
  description: 'Fresh tabard, fresh sword, fresh enthusiasm.',
  projectile: melee(),
  ...tierUnit(2, { rate: 1.3, range: 48, power: 1.13 }),
  passive: { id: 'guard-recruit', name: 'On Duty', summary: 'Affordable, dependable melee damage.' },
  art: 'guardRecruit',
};

export const crossbowman = {
  id: 'crossbowman',
  name: 'Crossbowman',
  tier: 3,
  faction: GUARD,
  role: 'Ranged · heavy bolts',
  description: 'Slow to reload. Worth the wait.',
  projectile: { kind: 'xbolt', speed: 760 },
  ...tierUnit(3, { rate: 0.6, range: 180, power: 0.97 }),
  passive: { id: 'crossbowman', name: 'Heavy Bolts', summary: 'Long range, slow firing speed, strong damage per shot.' },
  art: 'crossbowman',
};

export const guardSergeant = {
  id: 'guard-sergeant',
  name: 'Guard Sergeant',
  tier: 3,
  faction: GUARD,
  role: 'Melee · fast',
  description: 'Two swords, no patience.',
  projectile: melee(),
  ...tierUnit(3, { rate: 2.2, range: 52, power: 1.15 }),
  passive: { id: 'guard-sergeant', name: 'Flurry', summary: 'Fast melee attacker with more damage per second than the Guard Recruit.' },
  art: 'guardSergeant',
};

export const halberdier = {
  id: 'halberdier',
  name: 'Halberdier',
  tier: 4,
  faction: GUARD,
  role: 'Reach · small area',
  description: 'Axe, spear and hook in one long pole.',
  projectile: { kind: 'thrust', speed: 1400 },
  ...tierUnit(4, { rate: 0.9, range: 72, splash: 24, power: 0.89 }),
  passive: { id: 'halberdier', name: 'Sweep', summary: 'Medium-range attacks with a small area of effect, good against groups.' },
  art: 'halberdier',
};

export const royalPatrol = {
  id: 'royal-patrol',
  name: 'Royal Patrol',
  tier: 5,
  faction: GUARD,
  role: 'Ranged · guards the gate',
  description: 'Watches the road out. Nothing gets past.',
  targeting: 'first', // the enemy with the least road left to the exit (Tower)
  projectile: { kind: 'arrow', speed: 700 },
  ...tierUnit(5, { rate: 1.3, range: 150, power: 0.94 }),
  passive: { id: 'royal-patrol', name: 'Last Line', summary: 'Ranged attacker that always targets the enemy closest to the exit.' },
  art: 'royalPatrol',
};

export const GRAND_CAPTAIN_ORDERS = { id: 'grand-captain', label: "Grand Captain's Orders", radius: 160, faction: GUARD, damageMult: 1.12, cooldownMult: 1 / 1.08, levelScale: 0.1 };

export const grandCaptain = {
  id: 'grand-captain',
  name: 'Grand Captain',
  tier: 6,
  faction: GUARD,
  role: 'Commander · guard buff',
  description: 'Gold trim, steel nerves.',
  projectile: melee(),
  ...tierUnit(6, { rate: 1.2, range: 64, role: 'support', power: 1.04 }),
  buffs: [GRAND_CAPTAIN_ORDERS],
  passive: { id: 'grand-captain', name: 'Orders', summary: 'Town Guard units within 5 tiles gain +12% damage and +8% attack speed (more per upgrade; Grand Captains do not stack).' },
  art: 'grandCaptain',
};

export const kingsChampion = {
  id: 'kings-champion',
  name: "The King's Champion",
  tier: 8,
  faction: GUARD,
  role: 'Chase · duelist',
  description: 'Undefeated in the tournament. Undefeated outside it, too.',
  targeting: 'strongest',
  projectile: melee(),
  ...tierUnit(8, { rate: 0.9, range: 72, power: 0.72 }),
  ability: { id: 'kings-champion', strikeEvery: 12, strikeMult: 5 },
  passive: { id: 'kings-champion', name: 'Champion’s Strike', summary: 'High single-target damage. Every 12 s a powerful strike deals 5× damage to the strongest enemy in reach.' },
  art: 'kingsChampion',
};

// ---------------------------------------------------------------- SIEGE WORKSHOP

export const apprenticeEngineer = {
  id: 'apprentice-engineer',
  name: 'Apprentice Engineer',
  tier: 3,
  faction: SIEGE,
  role: 'Ranged · balanced',
  description: 'Built the crossbow himself. Mostly.',
  projectile: { kind: 'xbolt', speed: 680 },
  ...tierUnit(3, { rate: 1.2, range: 120, price: 0.8, power: 0.96 }),
  passive: { id: 'apprentice-engineer', name: 'Handmade', summary: 'Basic ranged attacker with balanced stats and a cheap price.' },
  art: 'apprenticeEngineer',
};

export const ballista = {
  id: 'ballista',
  name: 'Ballista',
  tier: 4,
  faction: SIEGE,
  role: 'Long range · heavy bolt',
  description: 'A crossbow the size of a cart.',
  targeting: 'strongest',
  projectile: { kind: 'ballista', speed: 900 },
  ...tierUnit(4, { rate: 0.4, range: 224, power: 1 }),
  passive: { id: 'ballista', name: 'Skewer', summary: 'Long range, high single-target damage, slow attack speed.' },
  art: 'ballista',
};

export const catapult = {
  id: 'catapult',
  name: 'Catapult',
  tier: 5,
  faction: SIEGE,
  role: 'Area · boulders',
  description: 'Throws rocks. Big ones.',
  projectile: { kind: 'boulder', speed: 300 },
  ...tierUnit(5, { rate: 0.35, range: 168, splash: 48, power: 0.83 }),
  passive: { id: 'catapult', name: 'Boulder', summary: 'Medium-range area attacks, effective against groups.' },
  art: 'catapult',
};

export const bombardier = {
  id: 'bombardier',
  name: 'Bombardier',
  tier: 5,
  faction: SIEGE,
  role: 'Area · quick bombs',
  description: 'Lights fuses faster than anyone thinks is wise.',
  projectile: { kind: 'bombball', speed: 380 },
  ...tierUnit(5, { rate: 0.9, range: 128, splash: 28, power: 0.87 }),
  passive: { id: 'bombardier', name: 'Short Fuse', summary: 'Faster explosive attacks with a smaller blast and less damage per hit than the Catapult.' },
  art: 'bombardier',
};

export const SIEGE_COMMAND = { id: 'siege-command', label: 'Siege Command', radius: 192, faction: SIEGE, damageMult: 1.15, levelScale: 0.1 };

export const siegeCommander = {
  id: 'siege-commander',
  name: 'Siege Commander',
  tier: 6,
  faction: SIEGE,
  role: 'Commander · siege buff',
  description: 'Knows exactly where every stone will land.',
  projectile: { kind: 'xbolt', speed: 700 },
  ...tierUnit(6, { rate: 1, range: 128, role: 'support', power: 0.93 }),
  buffs: [SIEGE_COMMAND],
  passive: { id: 'siege-commander', name: 'Siege Command', summary: 'Siege Workshop units within 6 tiles gain +15% damage (more per upgrade; Siege Commanders do not stack).' },
  art: 'siegeCommander',
};

export const trebuchet = {
  id: 'trebuchet',
  name: 'Trebuchet',
  tier: 8,
  faction: SIEGE,
  role: 'Extreme range · enormous area',
  description: 'Counterweight, sling, and a very long wait.',
  projectile: { kind: 'trebuchet', speed: 260 },
  ...tierUnit(8, { rate: 0.15, range: 448, splash: 120, power: 0.89 }),
  passive: { id: 'trebuchet', name: 'Counterweight', summary: 'Extremely long-range attacks with an enormous blast and a slow cooldown.' },
  art: 'trebuchet',
};

/** Automated mini-ballista built by the Master Engineer. Never summoned or deployed. */
export const MINI_BALLISTA = {
  id: 'mini-ballista',
  name: 'Mini Ballista',
  tier: 6,
  faction: SIEGE,
  role: 'Temporary',
  targeting: 'strongest',
  projectile: { kind: 'ballista', speed: 900 },
  ...tierUnit(6, { rate: 0.6, range: 200, power: 0.6 }),
  price: 0,
  art: 'miniBallista',
};

export const masterEngineer = {
  id: 'master-engineer',
  name: 'The Master Engineer',
  tier: 10,
  faction: SIEGE,
  role: 'Chase · builder',
  description: 'Draws a ballista on a napkin. It works.',
  projectile: { kind: 'bombball', speed: 360 },
  ...tierUnit(10, { rate: 0.6, range: 192, splash: 64, power: 0.78 }),
  ability: { id: 'master-engineer', buildEvery: 20, buildLife: 10, maxActive: 2, allyUnit: 'mini-ballista' },
  passive: { id: 'master-engineer', name: 'Automaton', summary: 'Heavy area attacks. Every 20 s builds an automated mini-ballista that fights on its own for 10 s (at most two at once).' },
  art: 'masterEngineer',
};

export const VILLAGE_UNITS = [farmer, spearman, slingman, militiaArcher, villageCaptain, villageHero];
export const GUARD_UNITS = [guardRecruit, crossbowman, guardSergeant, halberdier, royalPatrol, grandCaptain, kingsChampion];
export const SIEGE_UNITS = [apprenticeEngineer, ballista, catapult, bombardier, siegeCommander, trebuchet, masterEngineer];
export const MEDIEVAL_ALLIES = [MINI_BALLISTA];
