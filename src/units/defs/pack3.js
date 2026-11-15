// CIRCLE PACK 3: Royal Academy, Frostbound Legion, Arcane Library and
// Titan Foundry – 28 units.
// Stats come from the tier generator (tierUnit): each entry states only how the
// unit fights (attack speed, range, area, role) and its ability numbers; the
// tier budget decides how hard it hits. `power` trims are set by
// scripts/calibrate.mjs so own fighting power matches the tier.
// Ability behaviour lives in src/game/abilities.js.
import { tierUnit } from '../levels.js';

export const ACADEMY = 'royal-academy';
export const FROST = 'frostbound-legion';
export const ARCANE = 'arcane-library';
export const TITAN = 'titan-foundry';

const shot = (kind, speed = 520) => ({ kind, speed });

// ================================================================ ROYAL ACADEMY

export const squire = {
  id: 'squire', name: 'Squire', tier: 1, faction: ACADEMY,
  role: 'Very cheap melee',
  description: 'Carries the shield, polishes the sword, swings it now and then.',
  projectile: shot('trainingsword', 1400),
  ...tierUnit(1, { rate: 1.3, range: 60, price: 0.6, power: 0.96 }),
  ability: { id: 'heavy-every', heavyEvery: 10, heavyMult: 2 },
  passive: { id: 'squire', name: 'Lesson Learned', summary: 'Very cheap melee unit. Every 10th attack deals 2× damage.' },
  art: 'squire',
};

export const traineeGuard = {
  id: 'trainee-guard', name: 'Trainee Guard', tier: 2, faction: ACADEMY,
  role: 'Balanced melee · drills together',
  description: 'Fights better with a classmate watching.',
  projectile: shot('spearjab', 1400),
  ...tierUnit(2, { rate: 1.2, range: 68, power: 1.02 }),
  ability: { id: 'trainee-guard', radius: 128, bonus: 0.1 },
  passive: { id: 'trainee-guard', name: 'Drill Partner', summary: 'Balanced melee attacker. +10% damage while another Royal Academy unit is within 4 tiles.' },
  art: 'traineeGuard',
};

export const practiceArcher = {
  id: 'practice-archer', name: 'Practice Archer', tier: 2, faction: ACADEMY,
  role: 'Cheap ranged · consistent',
  description: 'Still aims for the painted rings. Hits them, too.',
  projectile: shot('blunt', 620),
  ...tierUnit(2, { rate: 1, range: 136, price: 0.85 }),
  passive: { id: 'practice-archer', name: 'Steady Draw', summary: 'Cheap ranged attacker with consistent damage.' },
  art: 'practiceArcher',
};

export const duelist = {
  id: 'duelist', name: 'Duelist', tier: 4, faction: ACADEMY,
  role: 'Single target · finisher',
  description: 'Salutes, then ends the argument.',
  projectile: shot('rapier', 1600),
  ...tierUnit(4, { rate: 1.5, range: 64, power: 1.08 }),
  ability: { id: 'panther', executeBelow: 0.5, executeBonus: 0.2 },
  passive: { id: 'duelist', name: 'Riposte', summary: 'High single-target damage. +20% damage to enemies below 50% health.' },
  art: 'duelist',
};

export const ACADEMY_DRILL = { id: 'academy-drill', label: 'Instruction', radius: 160, faction: ACADEMY, damageMult: 1.12, levelScale: 0.1 };
export const battleInstructor = {
  id: 'battle-instructor', name: 'Battle Instructor', tier: 5, faction: ACADEMY,
  role: 'Academy support',
  description: 'Shouts corrections. They work.',
  projectile: shot('baton', 900),
  ...tierUnit(5, { rate: 1, range: 96, role: 'support', power: 0.93 }),
  buffs: [ACADEMY_DRILL],
  passive: { id: 'battle-instructor', name: 'Instruction', summary: 'Royal Academy units within 5 tiles gain +12% damage (more per upgrade; Instructors do not stack).' },
  art: 'battleInstructor',
};

export const royalGraduate = {
  id: 'royal-graduate', name: 'Royal Graduate', tier: 7, faction: ACADEMY,
  role: 'Timed strike · strongest enemy',
  description: 'Top of the class, and keen to prove it on the strongest opponent.',
  projectile: shot('saber', 1600),
  ...tierUnit(7, { rate: 1.1, range: 88, power: 0.77 }),
  ability: { id: 'kings-champion', strikeEvery: 15, strikeMult: 5, strikeKind: 'graduate' },
  passive: { id: 'royal-graduate', name: 'Graduation Strike', summary: 'Every 15 s a powerful 5× strike at the strongest enemy in reach.' },
  art: 'royalGraduate',
};

const GRANDMASTER_PER = 0.03;
const GRANDMASTER_CAP = 0.3;
export const grandmaster = {
  id: 'grandmaster', name: 'The Grandmaster', tier: 10, faction: ACADEMY,
  role: 'Chase · Academy commander',
  description: 'Wrote every manual the Academy teaches from.',
  projectile: shot('saber', 1600),
  ...tierUnit(10, { rate: 1.2, range: 112, role: 'support', power: 0.82 }),
  ability: { id: 'grandmaster', every: 20, duration: 6, damage: 0.25, rate: 0.2 },
  passive: {
    id: 'grandmaster',
    name: 'Final Examination',
    summary: 'Every 20 s: Royal Academy allies gain +25% damage and +20% attack speed for 6 s. +3% own damage per other deployed Royal Academy unit (max +30%).',
    formula: 'Damage × [1 + min(0.30, 0.03 × other deployed Royal Academy units)]',
    watchFaction: ACADEMY,
    bonus(ctx) {
      return Math.min(GRANDMASTER_CAP, GRANDMASTER_PER * (ctx.factionOthers ?? 0));
    },
  },
  art: 'grandmaster',
};

// ================================================================ FROSTBOUND LEGION

export const frostRecruit = {
  id: 'frost-recruit', name: 'Frost Recruit', tier: 3, faction: FROST,
  role: 'Affordable · light slow',
  description: 'Issued a cold spear and colder orders.',
  projectile: shot('icespear', 1200),
  ...tierUnit(3, { rate: 1.2, range: 80, price: 0.85, power: 0.97 }),
  onHit: [{ status: 'slowed', chance: 1, amount: 0.05, duration: 2 }],
  passive: { id: 'frost-recruit', name: 'Chill', summary: 'Affordable attacker. Every hit slows the enemy by 5% for 2 s.' },
  art: 'frostRecruit',
};

export const iceArcher = {
  id: 'ice-archer', name: 'Ice Archer', tier: 5, faction: FROST,
  role: 'Long range · freezes',
  description: 'Its arrows arrive before the cold does. Only just.',
  projectile: shot('icearrow', 760),
  ...tierUnit(5, { rate: 1, range: 192 }),
  ability: { id: 'ice-archer', freezeEvery: 6, freezeDuration: 0.8 },
  passive: { id: 'ice-archer', name: 'Flash Freeze', summary: 'Long-range attacks. Every 6th shot freezes the enemy solid for 0.8 s (bosses are slowed 50% instead).' },
  art: 'iceArcher',
};

export const snowBerserker = {
  id: 'snow-berserker', name: 'Snow Berserker', tier: 7, faction: FROST,
  role: 'Big damage vs slowed',
  description: 'Stripped to the waist in a blizzard, and furious about it.',
  projectile: shot('frostaxe', 1400),
  ...tierUnit(7, { rate: 1.3, range: 64, power: 1.03 }),
  ability: { id: 'snow-berserker', vsSlowed: 0.4 },
  passive: { id: 'snow-berserker', name: 'Cold Fury', summary: 'High damage, and +40% more against slowed or frozen enemies.' },
  art: 'snowBerserker',
};

export const frostMage = {
  id: 'frost-mage', name: 'Frost Mage', tier: 9, faction: FROST,
  role: 'Small area · slows',
  description: 'Every spell starts as a snowflake.',
  projectile: shot('frostorb', 460),
  ...tierUnit(9, { rate: 0.9, range: 160, splash: 36, power: 0.81 }),
  onHit: [{ status: 'slowed', chance: 1, amount: 0.15, duration: 2.5 }],
  passive: { id: 'frost-mage', name: 'Frost Nova', summary: 'Small area attacks that slow every enemy hit by 15% for 2.5 s.' },
  art: 'frostMage',
};

export const glacierKnight = {
  id: 'glacier-knight', name: 'Glacier Knight', tier: 11, faction: FROST,
  role: 'Melee · icy shockwave',
  description: 'Armour carved from a glacier that never melted.',
  projectile: shot('icesword', 1400),
  ...tierUnit(11, { rate: 1, range: 80, power: 0.51 }),
  ability: { id: 'glacier-knight', waveEvery: 12, waveRadius: 112, waveMult: 3, slow: 0.2, slowDuration: 3 },
  passive: { id: 'glacier-knight', name: 'Glacial Shockwave', summary: 'Every 12 s: an icy shockwave around itself (3.5 tiles) deals 3× damage and slows enemies by 20% for 3 s.' },
  art: 'glacierKnight',
};

export const WINTER_COMMAND = { id: 'winter-command', label: 'Winter Command', radius: Infinity, vsSlowed: 0.15, levelScale: 0.1 };
export const winterGeneral = {
  id: 'winter-general', name: 'Winter General', tier: 15, faction: FROST,
  role: 'Global support · vs slowed',
  description: 'Has never lost a winter campaign. Has never fought a summer one.',
  projectile: shot('icespear', 1000),
  ...tierUnit(15, { rate: 1, range: 160, role: 'support', power: 0.86 }),
  buffs: [WINTER_COMMAND],
  passive: { id: 'winter-general', name: 'Winter Command', summary: 'All allies on the map deal +15% damage to slowed or frozen enemies (more per upgrade; Generals do not stack).' },
  art: 'winterGeneral',
};

export const eternalWinter = {
  id: 'eternal-winter', name: 'The Eternal Winter', tier: 19, faction: FROST,
  role: 'Chase · blizzard',
  description: 'The season that never ends, wearing a crown of hail.',
  projectile: shot('hailstone', 620),
  ...tierUnit(19, { rate: 0.7, range: 208, splash: 48, power: 0.57 }),
  ability: { id: 'eternal-winter', every: 30, duration: 8, radius: 176, slow: 0.25, dps: 0.7 },
  passive: { id: 'eternal-winter', name: 'Blizzard', summary: 'Every 30 s: a large blizzard (5.5 tiles) for 8 s slows every enemy inside by 25% and deals continuous damage.' },
  art: 'eternalWinter',
};

// ================================================================ ARCANE LIBRARY

export const pageApprentice = {
  id: 'page-apprentice', name: 'Page Apprentice', tier: 4, faction: ARCANE,
  role: 'Cheap magic · big hit',
  description: 'Reads one page ahead of the lesson.',
  projectile: shot('pagebolt', 620),
  ...tierUnit(4, { rate: 1.3, range: 128, price: 0.85, power: 0.83 }),
  ability: { id: 'heavy-every', heavyEvery: 8, heavyMult: 2 },
  passive: { id: 'page-apprentice', name: 'Underlined', summary: 'Cheap magic attacker. Every 8th attack deals 2× damage.' },
  art: 'pageApprentice',
};

export const runeCaster = {
  id: 'rune-caster', name: 'Rune Caster', tier: 6, faction: ARCANE,
  role: 'Ranged · small splash',
  description: 'Writes a rune in the air and throws it.',
  projectile: shot('rune', 560),
  ...tierUnit(6, { rate: 1, range: 160, splash: 28, power: 0.87 }),
  passive: { id: 'rune-caster', name: 'Runic Bolt', summary: 'Ranged attacks that burst in a small area.' },
  art: 'runeCaster',
};

export const spellblade = {
  id: 'spellblade', name: 'Spellblade', tier: 8, faction: ARCANE,
  role: 'Fast cuts · heavy strike',
  description: 'Fences with one hand and casts with the other.',
  projectile: shot('spellcut', 1600),
  ...tierUnit(8, { rate: 1.4, range: 80, power: 0.72 }),
  ability: { id: 'spellblade', cycle: 4, fastCooldown: 0.7, heavyCooldown: 1.9, heavyMult: 2.4 },
  passive: { id: 'spellblade', name: 'Blade and Spell', summary: 'Alternates three fast cuts with one slower, powerful strike for 2.4× damage.' },
  art: 'spellblade',
};

export const arcaneScholar = {
  id: 'arcane-scholar', name: 'Arcane Scholar', tier: 10, faction: ARCANE,
  role: 'Timed spell · up to 5',
  description: 'Has read every book in the Library. Twice.',
  projectile: shot('arcanebolt', 700),
  ...tierUnit(10, { rate: 1, range: 176, power: 0.58 }),
  ability: { id: 'arcane-scholar', spellEvery: 12, spellCount: 5, spellMult: 3 },
  passive: { id: 'arcane-scholar', name: 'Chain of Verses', summary: 'Every 12 s: a spell strikes up to 5 enemies in range for 3× damage each.' },
  art: 'arcaneScholar',
};

export const voidReader = {
  id: 'void-reader', name: 'Void Reader', tier: 13, faction: ARCANE,
  role: 'Marks enemies',
  description: 'Reads the blank pages. Something reads back.',
  projectile: shot('voidbolt', 640),
  ...tierUnit(13, { rate: 1.1, range: 176, role: 'support', power: 0.76 }),
  onHit: [{ status: 'exposed', chance: 1, amount: 0.15, duration: 5 }],
  passive: { id: 'void-reader', name: 'Void Mark', summary: 'Every hit marks the enemy: it takes +15% damage from all sources for 5 s (does not stack with stronger weaknesses).' },
  art: 'voidReader',
};

export const ARCANE_SANCTUM = { id: 'arcane-sanctum', label: 'Arcane Sanctum', radius: 160, damageMult: 1.15, rangeMult: 1.1, levelScale: 0.1 };
export const archmage = {
  id: 'archmage', name: 'Archmage', tier: 17, faction: ARCANE,
  role: 'Damage + range support',
  description: 'The head of the Library, and of anyone who disagrees.',
  projectile: shot('arcanebolt', 760),
  ...tierUnit(17, { rate: 1, range: 176, role: 'support', power: 0.85 }),
  buffs: [ARCANE_SANCTUM],
  passive: { id: 'archmage', name: 'Arcane Sanctum', summary: 'Allies within 5 tiles gain +15% damage and +10% range (more per upgrade; Archmages do not stack).' },
  art: 'archmage',
};

export const forbiddenAuthor = {
  id: 'forbidden-author', name: 'The Forbidden Author', tier: 21, faction: ARCANE,
  role: 'Chase · map-wide spell',
  description: 'Wrote the one book the Library keeps chained shut.',
  projectile: shot('voidbolt', 700),
  ...tierUnit(21, { rate: 0.8, range: 224, power: 0.51 }),
  ability: { id: 'forbidden-author', every: 35, mult: 4, exposed: 0.25, exposedDuration: 8 },
  passive: { id: 'forbidden-author', name: 'The Unwritten Chapter', summary: 'Every 35 s: a spell strikes every enemy on the map for 4× damage; survivors take +25% damage from all sources for 8 s.' },
  art: 'forbiddenAuthor',
};

// ================================================================ TITAN FOUNDRY

export const ironHauler = {
  id: 'iron-hauler', name: 'Iron Hauler', tier: 6, faction: TITAN,
  role: 'Heavy single target',
  description: 'Built to carry ingots. Hits like one.',
  projectile: shot('ingot', 900),
  ...tierUnit(6, { rate: 0.7, range: 80, power: 0.95 }),
  passive: { id: 'iron-hauler', name: 'Dead Weight', summary: 'Slow, heavy single-target blows.' },
  art: 'ironHauler',
};

export const forgeBrute = {
  id: 'forge-brute', name: 'Forge Brute', tier: 9, faction: TITAN,
  role: 'Slow heavy · small splash',
  description: 'Swings a forge hammer that is still glowing.',
  projectile: shot('forgehammer', 1400),
  ...tierUnit(9, { rate: 0.55, range: 80, splash: 36, power: 0.86 }),
  passive: { id: 'forge-brute', name: 'Forge Hammer', summary: 'Slow attacks with high damage that splash a small area.' },
  art: 'forgeBrute',
};

export const moltenGiant = {
  id: 'molten-giant', name: 'Molten Giant', tier: 12, faction: TITAN,
  role: 'Area · burning ground',
  description: 'A furnace that got up and walked.',
  projectile: shot('magma', 420),
  ...tierUnit(12, { rate: 0.6, range: 144, splash: 40, power: 0.48 }),
  impactHazard: { kind: 'molten', status: 'burning', radius: 34, duration: 3, dpsFactor: 0.15 },
  passive: { id: 'molten-giant', name: 'Molten Pool', summary: 'Area attacks that leave a burning pool damaging enemies inside for 3 s.' },
  art: 'moltenGiant',
};

export const steelColossus = {
  id: 'steel-colossus', name: 'Steel Colossus', tier: 15, faction: TITAN,
  role: 'Heavy · ground slam',
  description: 'Twelve storeys of riveted steel, and every rivet holds a grudge.',
  projectile: shot('steelfist', 1400),
  ...tierUnit(15, { rate: 0.7, range: 96, splash: 32, power: 0.49 }),
  ability: { id: 'steel-colossus', slamEvery: 15, slamRadius: 112, slamMult: 5 },
  passive: { id: 'steel-colossus', name: 'Ground Slam', summary: 'Every 15 s: a massive ground slam on the leading enemy in reach hits everything within 3.5 tiles for 5× damage.' },
  art: 'steelColossus',
};

export const warforgedTitan = {
  id: 'warforged-titan', name: 'Warforged Titan', tier: 18, faction: TITAN,
  role: 'Boss and elite hunter',
  description: 'Forged for one purpose: to stand in front of very big things.',
  projectile: shot('titanshell', 900),
  ...tierUnit(18, { rate: 0.8, range: 176, splash: 24, power: 0.71 }),
  ability: { id: 'warforged-titan', bonus: 0.25 },
  passive: { id: 'warforged-titan', name: 'Giant Slayer', summary: 'Deals +25% damage to bosses and elite (high-HP) enemies.' },
  art: 'warforgedTitan',
};

export const FOUNDRY_FIRES = { id: 'foundry-fires', label: 'Foundry Fires', radius: 160, damageMult: 1.15, levelScale: 0.1 };
export const foundryOverseer = {
  id: 'foundry-overseer', name: 'Foundry Overseer', tier: 21, faction: TITAN,
  role: 'Damage support · surges',
  description: 'Runs the Foundry floor. Nobody takes a break.',
  projectile: shot('rivetburst', 900),
  ...tierUnit(21, { rate: 0.9, range: 176, role: 'support', power: 0.79 }),
  buffs: [FOUNDRY_FIRES],
  ability: { id: 'foundry-overseer', surgeEvery: 25, surgeDuration: 5, surgeDamage: 0.25, surgeRadius: 160 },
  passive: { id: 'foundry-overseer', name: 'Foundry Fires', summary: 'Allies within 5 tiles gain +15% damage. Every 25 s: those allies gain a further +25% damage for 5 s.' },
  art: 'foundryOverseer',
};

export const worldbreaker = {
  id: 'worldbreaker', name: 'The Worldbreaker', tier: 25, faction: TITAN,
  role: 'Chase · map-wide slam',
  description: 'The Foundry’s last commission. The ground has never forgiven it.',
  projectile: shot('titanshell', 900),
  ...tierUnit(25, { rate: 0.6, range: 208, splash: 56, power: 0.69 }),
  ability: { id: 'worldbreaker', every: 40, charge: 2, mult: 3, perEnemy: 0.05, maxMult: 2 },
  passive: { id: 'worldbreaker', name: 'Worldbreak', summary: 'Every 40 s: charges for 2 s, then slams the whole battlefield. Every enemy takes 3× damage, +5% per enemy alive (up to 2× more, so 6× at most).' },
  art: 'worldbreaker',
};

export const ACADEMY_UNITS = [squire, traineeGuard, practiceArcher, duelist, battleInstructor, royalGraduate, grandmaster];
export const FROST_UNITS = [frostRecruit, iceArcher, snowBerserker, frostMage, glacierKnight, winterGeneral, eternalWinter];
export const ARCANE_UNITS = [pageApprentice, runeCaster, spellblade, arcaneScholar, voidReader, archmage, forbiddenAuthor];
export const TITAN_UNITS = [ironHauler, forgeBrute, moltenGiant, steelColossus, warforgedTitan, foundryOverseer, worldbreaker];
export const PACK3_UNITS = [...ACADEMY_UNITS, ...FROST_UNITS, ...ARCANE_UNITS, ...TITAN_UNITS];
