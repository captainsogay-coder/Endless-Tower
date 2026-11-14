// CIRCLE PACK 2: Traveling Caravan, Clockwork Atelier, Jungle Covenant,
// Skybound Order and Astral Observatory – 35 units.
// Stats come from the tier generator (tierUnit): each entry states only how the
// unit fights (attack speed, range, area, role) and its ability numbers; the
// tier budget decides how hard it hits. `power` trims are set by
// scripts/calibrate.mjs so own fighting power matches the tier exactly.
// Ability behaviour lives in src/game/abilities.js.
import { tierUnit } from '../levels.js';

export const CARAVAN = 'traveling-caravan';
export const CLOCKWORK = 'clockwork-atelier';
export const JUNGLE = 'jungle-covenant';
export const SKY = 'skybound-order';
export const ASTRAL = 'astral-observatory';

const shot = (kind, speed = 520) => ({ kind, speed });

// ================================================================ TRAVELING CARAVAN

export const porter = {
  id: 'porter', name: 'Porter', tier: 1, faction: CARAVAN,
  role: 'Cheap · a little income',
  description: 'Carries everything, throws whatever is on top.',
  projectile: shot('parcel', 380),
  ...tierUnit(1, { rate: 1.1, range: 72, price: 0.6 }),
  ability: { id: 'porter', coinEvery: 12, coins: 1 },
  passive: { id: 'porter', name: 'Spare Change', summary: 'Very cheap to deploy. Every 12th attack finds 1 coin.' },
  art: 'porter',
};

export const caravanScout = {
  id: 'caravan-scout', name: 'Caravan Scout', tier: 1, faction: CARAVAN,
  role: 'Fast shots · finisher',
  description: 'Rides ahead, shoots fast, never lets anyone slip through.',
  projectile: shot('arrow', 640),
  ...tierUnit(1, { rate: 2.2, range: 112 }),
  ability: { id: 'caravan-scout', exitShare: 0.7, exitBonus: 0.15 },
  passive: { id: 'caravan-scout', name: 'Last Mile', summary: 'Fast attacks at medium range. +15% damage against enemies near the exit (the last 30% of the road).' },
  art: 'caravanScout',
};

export const campCook = {
  id: 'camp-cook', name: 'Camp Cook', tier: 2, faction: CARAVAN,
  role: 'Income · steady',
  description: 'Feeds the caravan; sells the leftovers.',
  projectile: shot('pan', 420),
  ...tierUnit(2, { rate: 0.9, range: 64, role: 'economy', power: 1.04 }),
  ability: { id: 'camp-cook', coinEvery: 10, coins: 3 },
  passive: { id: 'camp-cook', name: 'Hot Meals', summary: 'Generates 3 coins every 10 s.' },
  art: 'campCook',
};

export const travelingTrader = {
  id: 'traveling-trader', name: 'Traveling Trader', tier: 3, faction: CARAVAN,
  role: 'Income · from kills',
  description: 'Buys loot off the battlefield at a fair-ish price.',
  projectile: shot('trinket', 460),
  ...tierUnit(3, { rate: 1.1, range: 96, role: 'economy', power: 0.94 }),
  ability: { id: 'traveling-trader', coinEvery: 15, coinsPerKill: 0.5, coinCap: 20 },
  passive: { id: 'traveling-trader', name: 'Loot Buyer', summary: 'Every 15 s: 0.5 coins for each enemy defeated anywhere since the last payout (at most 20 per payout).' },
  art: 'travelingTrader',
};

export const CARTOGRAPHER_SURVEY = { id: 'cartographer-survey', label: 'Surveyed', radius: 128, rangeMult: 1.12, levelScale: 0.1 };
export const cartographer = {
  id: 'cartographer', name: 'Cartographer', tier: 4, faction: CARAVAN,
  role: 'Range support · leading enemy',
  description: 'Knows exactly how far it is to everything.',
  projectile: shot('inkshot', 560),
  targeting: 'first',
  ...tierUnit(4, { rate: 1, range: 136, role: 'support', power: 0.96 }),
  buffs: [CARTOGRAPHER_SURVEY],
  passive: { id: 'cartographer', name: 'Survey', summary: 'Allies within 4 tiles gain +12% range (more per upgrade). Always targets the enemy furthest along the road.' },
  art: 'cartographer',
};

export const caravanMaster = {
  id: 'caravan-master', name: 'Caravan Master', tier: 6, faction: CARAVAN,
  role: 'Rally · income',
  description: 'Keeps the wagons rolling and the guards paid.',
  projectile: shot('bullet', 900),
  ...tierUnit(6, { rate: 1.2, range: 128, role: 'support', power: 0.91 }),
  ability: { id: 'caravan-master', rallyEvery: 20, rallyDuration: 6, rallyRadius: 160, rallyDamage: 0.15, coins: 10 },
  passive: { id: 'caravan-master', name: 'Rally the Caravan', summary: 'Every 20 s: allies within 5 tiles gain +15% damage for 6 s, and the caravan earns 10 coins.' },
  art: 'caravanMaster',
};

export const goldenMerchant = {
  id: 'golden-merchant', name: 'The Golden Merchant', tier: 9, faction: CARAVAN,
  role: 'Chase · great income',
  description: 'Everything has a price. Most of it is paid to him.',
  projectile: shot('coinshot', 760),
  ...tierUnit(9, { rate: 1.2, range: 160, role: 'economy', power: 0.91 }),
  ability: { id: 'golden-merchant', coinEvery: 5, coins: 8, perKill: 1, killCap: 20, bonusEvery: 30, bonusCoins: 50 },
  passive: { id: 'golden-merchant', name: 'Golden Ledger', summary: 'Every 5 s: 8 coins plus 1 coin per enemy eliminated anywhere since (at most 20). Every 30 s: an extra 50 coins.' },
  art: 'goldenMerchant',
};

// ================================================================ CLOCKWORK ATELIER

export const tinSentry = {
  id: 'tin-sentry', name: 'Tin Sentry', tier: 3, faction: CLOCKWORK,
  role: 'Reliable single target',
  description: 'Wound once a morning. Fires rivets until sundown.',
  projectile: shot('rivet', 700),
  ...tierUnit(3, { rate: 1.4, range: 120, power: 0.98 }),
  passive: { id: 'tin-sentry', name: 'Clockwork', summary: 'Affordable, steady single-target damage. No tricks.' },
  art: 'tinSentry',
};

export const springling = {
  id: 'springling', name: 'Springling', tier: 4, faction: CLOCKWORK,
  role: 'Fast attacks · big hit',
  description: 'All coil, no patience.',
  projectile: shot('spring', 620),
  ...tierUnit(4, { rate: 2.6, range: 96, power: 0.78 }),
  ability: { id: 'heavy-every', heavyEvery: 8, heavyMult: 3 },
  passive: { id: 'springling', name: 'Wound Up', summary: 'Very fast attacks. Every 8th attack releases the spring for 3× damage.' },
  art: 'springling',
};

export const gearshot = {
  id: 'gearshot', name: 'Gearshot', tier: 5, faction: CLOCKWORK,
  role: 'Long range · piercing',
  description: 'A rifle that fires sharpened cogs straight through a column.',
  projectile: shot('gearbolt', 900),
  ...tierUnit(5, { rate: 0.7, range: 208, power: 0.57 }),
  ability: { id: 'pierce-shot', pierceCount: 3, kind: 'gearbolt' },
  passive: { id: 'gearshot', name: 'Through and Through', summary: 'Long range. Every shot pierces up to 3 enemies in a line.' },
  art: 'gearshot',
};

export const steamGolem = {
  id: 'steam-golem', name: 'Steam Golem', tier: 7, faction: CLOCKWORK,
  role: 'Heavy area · slows',
  description: 'Hisses, stomps, and hits everything in front of it.',
  projectile: shot('steamfist', 1400),
  ...tierUnit(7, { rate: 0.6, range: 88, splash: 48, power: 0.82 }),
  ability: { id: 'steam-golem', burstEvery: 12, burstRadius: 96, slow: 0.15, slowDuration: 3 },
  passive: { id: 'steam-golem', name: 'Pressure Valve', summary: 'Heavy area blows. Every 12 s vents steam that slows enemies within 3 tiles by 15% for 3 s.' },
  art: 'steamGolem',
};

export const chronoMechanic = {
  id: 'chrono-mechanic', name: 'Chrono Mechanic', tier: 9, faction: CLOCKWORK,
  role: 'Cooldown support',
  description: 'Adjusts the battle by a few seconds. Usually forward.',
  projectile: shot('clockhand', 700),
  ...tierUnit(9, { rate: 1.2, range: 128, role: 'support', power: 0.82 }),
  ability: { id: 'chrono-mechanic', warpEvery: 15, warpDuration: 5, warpRadius: 160, cooldown: 0.25 },
  passive: { id: 'chrono-mechanic', name: 'Time Warp', summary: 'Every 15 s: allies within 5 tiles get 25% shorter cooldowns for 5 s.' },
  art: 'chronoMechanic',
};

export const grandAutomaton = {
  id: 'grand-automaton', name: 'Grand Automaton', tier: 12, faction: CLOCKWORK,
  role: 'Heavy hitter · spinning gear',
  description: 'The Atelier’s masterpiece, still under warranty.',
  projectile: shot('rivet', 760),
  ...tierUnit(12, { rate: 0.9, range: 160, power: 0.58 }),
  ability: { id: 'grand-automaton', gearEvery: 10, gearCount: 6, gearMult: 2.5 },
  passive: { id: 'grand-automaton', name: 'Flywheel', summary: 'Every 10th attack launches a spinning gear that cuts through up to 6 enemies for 2.5× damage.' },
  art: 'grandAutomaton',
};

export const eternalEngine = {
  id: 'eternal-engine', name: 'The Eternal Engine', tier: 16, faction: CLOCKWORK,
  role: 'Chase · overdrive',
  description: 'It has never stopped. Nobody knows how to stop it.',
  projectile: shot('piston', 900),
  ...tierUnit(16, { rate: 1.6, range: 176, power: 0.7 }),
  ability: { id: 'eternal-engine', overdriveEvery: 25, overdriveDuration: 8, rate: 0.6, damage: 0.3, extendPerKill: 0.5, extendCap: 5 },
  passive: { id: 'eternal-engine', name: 'Overdrive', summary: 'Every 25 s: Overdrive for 8 s (+60% attack speed, +30% damage). Each kill during Overdrive adds 0.5 s, up to 5 s more.' },
  art: 'eternalEngine',
};

// ================================================================ JUNGLE COVENANT

export const vineTender = {
  id: 'vine-tender', name: 'Vine Tender', tier: 4, faction: JUNGLE,
  role: 'Cheap ranged · light slow',
  description: 'Coaxes the vines to grab at passing ankles.',
  projectile: shot('vine', 520),
  ...tierUnit(4, { rate: 1.2, range: 128, price: 0.8, power: 0.95 }),
  onHit: [{ status: 'slowed', chance: 1, amount: 0.05, duration: 2 }],
  passive: { id: 'vine-tender', name: 'Grasping Vines', summary: 'Cheap ranged attacker. Every hit slows the enemy by 5% for 2 s.' },
  art: 'vineTender',
};

export const dartkeeper = {
  id: 'dartkeeper', name: 'Dartkeeper', tier: 5, faction: JUNGLE,
  role: 'Rapid · piercing',
  description: 'A quiver of a hundred darts and a very good aim.',
  projectile: shot('dart', 900),
  ...tierUnit(5, { rate: 3, range: 136, power: 0.85 }),
  ability: { id: 'pierce-every', pierceEvery: 7, pierceCount: 4, kind: 'dart' },
  passive: { id: 'dartkeeper', name: 'Long Breath', summary: 'Rapid attacks. Every 7th dart pierces up to 4 enemies.' },
  art: 'dartkeeper',
};

export const panther = {
  id: 'panther', name: 'Panther', tier: 7, faction: JUNGLE,
  role: 'Single target · finisher',
  description: 'You will not see it. That is the point.',
  projectile: shot('claw', 1400),
  ...tierUnit(7, { rate: 1.4, range: 56, power: 1.09 }),
  ability: { id: 'panther', executeBelow: 0.5, executeBonus: 0.2 },
  passive: { id: 'panther', name: 'Go for the Throat', summary: 'High single-target damage. +20% damage to enemies below 50% health.' },
  art: 'panther',
};

export const sporeShaman = {
  id: 'spore-shaman', name: 'Spore Shaman', tier: 8, faction: JUNGLE,
  role: 'Weakens enemies · area',
  description: 'Breathes out a cloud that makes everything a little softer.',
  projectile: shot('spore', 380),
  ...tierUnit(8, { rate: 1, range: 144, splash: 32, role: 'support', power: 0.76 }),
  onHit: [{ status: 'infected', chance: 1, duration: 4 }],
  passive: { id: 'spore-shaman', name: 'Infection', summary: 'Spore clouds infect every enemy they touch: infected enemies take +5% damage from all sources for 4 s (does not stack with stronger weaknesses).' },
  art: 'sporeShaman',
};

export const elderTreant = {
  id: 'elder-treant', name: 'Elder Treant', tier: 10, faction: JUNGLE,
  role: 'Large area · root fields',
  description: 'Older than the road. Slower, too, but not by much.',
  projectile: shot('seedpod', 360),
  ...tierUnit(10, { rate: 0.45, range: 120, splash: 64, power: 0.76 }),
  ability: { id: 'elder-treant', rootEvery: 15, rootRadius: 96, rootSlow: 0.25, rootDuration: 4 },
  passive: { id: 'elder-treant', name: 'Root Field', summary: 'Large area attacks. Every 15 s grows a root field (3 tiles) that slows enemies inside by 25% for 4 s.' },
  art: 'elderTreant',
};

export const CANOPY_BLESSING = { id: 'canopy-blessing', label: 'Canopy Blessing', radius: 192, faction: JUNGLE, damageMult: 1.2, rangeMult: 1.1, levelScale: 0.1 };
export const canopyWarden = {
  id: 'canopy-warden', name: 'Canopy Warden', tier: 14, faction: JUNGLE,
  role: 'Jungle support',
  description: 'Speaks for the trees, and the trees are angry.',
  projectile: shot('leaf', 560),
  ...tierUnit(14, { rate: 1, range: 160, role: 'support', power: 0.87 }),
  buffs: [CANOPY_BLESSING],
  passive: { id: 'canopy-warden', name: 'Canopy Blessing', summary: 'Jungle Covenant units within 6 tiles gain +20% damage and +10% range (more per upgrade; Wardens do not stack).' },
  art: 'canopyWarden',
};

export const heartOfTheWild = {
  id: 'heart-of-the-wild', name: 'Heart of the Wild', tier: 18, faction: JUNGLE,
  role: 'Chase · overgrowth',
  description: 'The jungle, given a single will.',
  projectile: shot('thornburst', 520),
  ...tierUnit(18, { rate: 0.8, range: 192, splash: 40, power: 0.53 }),
  ability: { id: 'heart-of-the-wild', zoneEvery: 25, zoneDuration: 8, zoneRadius: 96, zoneDps: 0.6, exposed: 0.2, killsPerStack: 50, perStack: 0.01, stackCap: 0.3 },
  passive: { id: 'heart-of-the-wild', name: 'Overgrowth', summary: 'Every 25 s: an overgrowth zone for 8 s – enemies inside take continuous damage and +20% damage from all allies. Every 50 eliminations: +1% damage for the battle (max +30%).' },
  art: 'heartOfTheWild',
};

// ================================================================ SKYBOUND ORDER

export const cloudCourier = {
  id: 'cloud-courier', name: 'Cloud Courier', tier: 5, faction: SKY,
  role: 'Affordable ranged · fast shots',
  description: 'Delivers messages. And bolts of compressed air.',
  projectile: shot('windbolt', 1150),
  ...tierUnit(5, { rate: 1.6, range: 160, price: 0.85, power: 0.93 }),
  passive: { id: 'cloud-courier', name: 'Express Delivery', summary: 'Affordable ranged attacker; its bolts fly very fast and rarely miss moving targets.' },
  art: 'cloudCourier',
};

export const galeLancer = {
  id: 'gale-lancer', name: 'Gale Lancer', tier: 7, faction: SKY,
  role: 'Piercing wind',
  description: 'Rides the gust and lets it through.',
  projectile: shot('gale', 820),
  ...tierUnit(7, { rate: 1.1, range: 144, power: 0.71 }),
  ability: { id: 'pierce-every', pierceEvery: 6, pierceCount: 5, kind: 'gale' },
  passive: { id: 'gale-lancer', name: 'Gale Lance', summary: 'Every 6th attack is a wind lance that hits up to 5 enemies in a line.' },
  art: 'galeLancer',
};

export const rocRider = {
  id: 'roc-rider', name: 'Roc Rider', tier: 9, faction: SKY,
  role: 'Long range · boss hunter',
  description: 'The bird does most of the work. The rider takes the credit.',
  projectile: shot('feather', 760),
  ...tierUnit(9, { rate: 0.9, range: 224, power: 0.95 }),
  ability: { id: 'roc-rider', bossBonus: 0.25 },
  passive: { id: 'roc-rider', name: 'Talon Strike', summary: 'Very long range. +25% damage to bosses.' },
  art: 'rocRider',
};

export const stormcaller = {
  id: 'stormcaller', name: 'Stormcaller', tier: 11, faction: SKY,
  role: 'Chain lightning',
  description: 'Asks the sky nicely. The sky answers loudly.',
  projectile: shot('spark', 900),
  ...tierUnit(11, { rate: 1, range: 176, power: 0.58 }),
  ability: { id: 'stormcaller', strikeEvery: 10, strikeCount: 6, strikeMult: 2.5 },
  passive: { id: 'stormcaller', name: 'Call Lightning', summary: 'Every 10 s: lightning strikes up to 6 enemies in range for 2.5× damage each.' },
  art: 'stormcaller',
};

export const SKY_COMMAND = { id: 'sky-command', label: 'Sky Command', radius: Infinity, damageMult: 1.12, rangeMult: 1.12, levelScale: 0.1 };
export const skyAdmiral = {
  id: 'sky-admiral', name: 'Sky Admiral', tier: 14, faction: SKY,
  role: 'Global support',
  description: 'Commands the fleet from the highest deck.',
  projectile: shot('windbolt', 1000),
  ...tierUnit(14, { rate: 1.1, range: 176, role: 'support', power: 0.86 }),
  buffs: [SKY_COMMAND],
  passive: { id: 'sky-admiral', name: 'Sky Command', summary: 'All allies on the map: +12% range and +12% damage (more per upgrade; Admirals do not stack).' },
  art: 'skyAdmiral',
};

export const tempestSovereign = {
  id: 'tempest-sovereign', name: 'Tempest Sovereign', tier: 17, faction: SKY,
  role: 'Large area · storms',
  description: 'Wears the weather like a cloak.',
  projectile: shot('stormball', 520),
  ...tierUnit(17, { rate: 0.5, range: 192, splash: 72, power: 0.57 }),
  ability: { id: 'tempest-sovereign', stormEvery: 20, stormDuration: 5, stormRadius: 112, stormDps: 0.8 },
  passive: { id: 'tempest-sovereign', name: 'Tempest', summary: 'Large area storm bolts. Every 20 s calls a storm (3.5 tiles) that damages enemies inside for 5 s.' },
  art: 'tempestSovereign',
};

export const eyeOfTheZenith = {
  id: 'eye-of-the-zenith', name: 'Eye of the Zenith', tier: 21, faction: SKY,
  role: 'Chase · storm zone',
  description: 'The storm has an eye, and it is looking at you.',
  projectile: shot('spark', 1000),
  ...tierUnit(21, { rate: 0.8, range: 224, power: 0.48 }),
  ability: { id: 'eye-of-the-zenith', zoneEvery: 30, zoneDuration: 8, zoneRadius: 160, strikeEvery: 1.5, strikeMult: 4 },
  passive: { id: 'eye-of-the-zenith', name: 'Zenith Storm', summary: 'Every 30 s: a storm zone for 8 s that strikes a random enemy inside every 1.5 s for 4× damage – bosses first.' },
  art: 'eyeOfTheZenith',
};

// ================================================================ ASTRAL OBSERVATORY

export const starReader = {
  id: 'star-reader', name: 'Star Reader', tier: 7, faction: ASTRAL,
  role: 'Steady · big hit',
  description: 'Reads the sky, then throws a bit of it.',
  projectile: shot('starbolt', 720),
  ...tierUnit(7, { rate: 1.2, range: 144, power: 0.81 }),
  ability: { id: 'heavy-every', heavyEvery: 10, heavyMult: 2.5 },
  passive: { id: 'star-reader', name: 'Bright Star', summary: 'Medium range. Every 10th attack deals 2.5× damage.' },
  art: 'starReader',
};

export const cometScribe = {
  id: 'comet-scribe', name: 'Comet Scribe', tier: 9, faction: ASTRAL,
  role: 'Area · burning trail',
  description: 'Writes in the sky with comets. The ink burns.',
  projectile: shot('comet', 420),
  ...tierUnit(9, { rate: 0.6, range: 176, splash: 40, power: 0.45 }),
  impactHazard: { kind: 'stardust', status: 'charged', radius: 28, duration: 3, dpsFactor: 0.25 },
  passive: { id: 'comet-scribe', name: 'Comet Trail', summary: 'Comets explode in a small area and leave stardust that burns enemies for 3 s.' },
  art: 'cometScribe',
};

export const moonPrism = {
  id: 'moon-prism', name: 'Moon Prism', tier: 12, faction: ASTRAL,
  role: 'Piercing beam',
  description: 'A shard of the moon that remembers how to shine.',
  projectile: shot('moonray', 900),
  ...tierUnit(12, { rate: 1, range: 176, power: 0.51 }),
  ability: { id: 'moon-prism', beamEvery: 12, beamCount: 8, beamMult: 4 },
  passive: { id: 'moon-prism', name: 'Moonbeam', summary: 'Every 12 s fires a beam that pierces up to 8 enemies for 4× damage.' },
  art: 'moonPrism',
};

export const eclipseAdept = {
  id: 'eclipse-adept', name: 'Eclipse Adept', tier: 14, faction: ASTRAL,
  role: 'Marks the strongest',
  description: 'Casts a shadow nobody can step out of.',
  projectile: shot('shade', 700),
  ...tierUnit(14, { rate: 1.1, range: 176, role: 'support', power: 0.8 }),
  ability: { id: 'eclipse-adept', markEvery: 10, exposed: 0.2, markDuration: 10 },
  passive: { id: 'eclipse-adept', name: 'Eclipse', summary: 'Every 10 s marks the strongest enemy in range: it takes +20% damage from all sources for 10 s.' },
  art: 'eclipseAdept',
};

export const NEBULA_FIELD = { id: 'nebula-field', label: 'Nebula', radius: 160, cooldownMult: 1 / 1.2, levelScale: 0.1 };
export const nebulaArchitect = {
  id: 'nebula-architect', name: 'Nebula Architect', tier: 16, faction: ASTRAL,
  role: 'Attack-speed support',
  description: 'Builds clouds of starlight where thoughts move faster.',
  projectile: shot('starbolt', 760),
  ...tierUnit(16, { rate: 1, range: 160, role: 'support', power: 0.85 }),
  buffs: [NEBULA_FIELD],
  passive: { id: 'nebula-architect', name: 'Nebula', summary: 'Allies within 5 tiles attack 20% faster (more per upgrade; nebulae do not stack).' },
  art: 'nebulaArchitect',
};

export const celestialOracle = {
  id: 'celestial-oracle', name: 'Celestial Oracle', tier: 19, faction: ASTRAL,
  role: 'Global blessing',
  description: 'Has seen how this battle ends. Approves.',
  projectile: shot('starbolt', 820),
  ...tierUnit(19, { rate: 1, range: 192, role: 'support', power: 0.81 }),
  ability: { id: 'celestial-oracle', blessEvery: 25, blessDuration: 6, blessDamage: 0.25 },
  passive: { id: 'celestial-oracle', name: 'Foretold Victory', summary: 'Every 25 s: every ally on the map gains +25% damage for 6 s.' },
  art: 'celestialOracle',
};

export const singularityMonarch = {
  id: 'singularity-monarch', name: 'Singularity Monarch', tier: 23, faction: ASTRAL,
  role: 'Chase · singularity',
  description: 'Rules everything within the event horizon. Which is getting bigger.',
  projectile: shot('void', 480),
  ...tierUnit(23, { rate: 0.4, range: 224, splash: 64, power: 0.45 }),
  ability: { id: 'singularity-monarch', every: 35, radius: 144, duration: 3, mult: 6, exposed: 0.25, exposedDuration: 8 },
  passive: { id: 'singularity-monarch', name: 'Singularity', summary: 'Every 35 s: a singularity pulls enemies toward its centre for 3 s, then detonates for massive area damage; enemies hit take +25% damage for 8 s.' },
  art: 'singularityMonarch',
};

export const CARAVAN_UNITS = [porter, caravanScout, campCook, travelingTrader, cartographer, caravanMaster, goldenMerchant];
export const CLOCKWORK_UNITS = [tinSentry, springling, gearshot, steamGolem, chronoMechanic, grandAutomaton, eternalEngine];
export const JUNGLE_UNITS = [vineTender, dartkeeper, panther, sporeShaman, elderTreant, canopyWarden, heartOfTheWild];
export const SKY_UNITS = [cloudCourier, galeLancer, rocRider, stormcaller, skyAdmiral, tempestSovereign, eyeOfTheZenith];
export const ASTRAL_UNITS = [starReader, cometScribe, moonPrism, eclipseAdept, nebulaArchitect, celestialOracle, singularityMonarch];
export const PACK2_UNITS = [...CARAVAN_UNITS, ...CLOCKWORK_UNITS, ...JUNGLE_UNITS, ...SKY_UNITS, ...ASTRAL_UNITS];
