// NUCLEAR WAR circle units: fictional, arcade-style sci-fi hardware. They are
// drawn as toy-like game pieces and their attacks are stylised energy blasts –
// nothing here models real weapons. Abilities live in src/game/abilities.js.
import { buildLevels } from '../levels.js';

export const missileLauncher = {
  id: 'missile-launcher',
  name: 'Missile Launcher',
  tier: 4,
  role: 'Area rockets',
  description: 'A truck full of fireworks with ambitions.',
  price: 220,
  projectile: { kind: 'missile', speed: 380 },
  // balance: the best value per coin in every test (early and late) – trimmed from 40 damage
  levels: buildLevels({ damage: 32, range: 176, rate: 0.7, splash: 40 }, 220),
  ability: { id: 'missile-launcher', bonusEvery: 8, bonusMult: 2 },
  passive: { id: 'missile-launcher', name: 'Salvo', summary: 'Area attacks. Every 8th attack fires a bonus missile for 2× damage.' },
  art: 'missileLauncher',
};

/** Miniature soldiers fielded by the Battalion. Not summonable, never deployed. */
export const BATTALION_SOLDIER = {
  id: 'battalion-soldier',
  name: 'Battalion Soldier',
  tier: 1,
  role: 'Temporary',
  price: 0,
  projectile: { kind: 'bullet', speed: 820 },
  levels: buildLevels({ damage: 8, range: 96, rate: 1.6 }, 50),
  art: 'miniSoldier',
};

export const battalion = {
  id: 'special-force-battalion',
  name: 'Special Force Battalion',
  tier: 5,
  role: 'Squad leader · soldiers',
  description: 'Brings friends. Small ones.',
  price: 350,
  projectile: { kind: 'bullet', speed: 860 },
  levels: buildLevels({ damage: 26, range: 136, rate: 2 }, 350),
  ability: { id: 'battalion', soldierUnit: 'battalion-soldier', soldiers: 3, soldierLife: 20, musterEvery: 3, perSoldier: 0.05 },
  passive: { id: 'battalion', name: 'Fire Team', summary: 'Fields up to 3 miniature soldiers. +5% damage per surviving soldier. Soldiers never count as deployed units.' },
  art: 'battalion',
};

export const icbm = {
  id: 'icbm',
  name: 'Intercontinental Ballistic Missile',
  tier: 7,
  role: 'Extreme range · huge blasts',
  description: 'Launches from across the map. Arrives with a second thump.',
  price: 900,
  projectile: { kind: 'icbm', speed: 300 },
  levels: buildLevels({ damage: 260, range: 480, rate: 0.2, splash: 96 }, 900),
  ability: { id: 'icbm', aftershock: 0.4, aftershockDelay: 0.45 },
  passive: { id: 'icbm', name: 'Aftershock', summary: 'Extremely long range and a large blast, followed by an aftershock dealing 40% of the impact damage.' },
  art: 'icbm',
};

export const bomber = {
  id: 'bomber',
  name: 'Bomber',
  tier: 7,
  role: 'Bombing flyovers',
  description: 'Circles overhead and drops a line of bombs across the road.',
  price: 850,
  levels: buildLevels({ damage: 145, range: 224, rate: 1 / 4.5, splash: 40 }, 850), // balance: 145 per bomb (was 120), a run every 4.5 s (was 6 s); flies along the road
  ability: { id: 'bomber', bombOffsets: [-60, -20, 20, 60], bonusEvery: 3, bonusMult: 2, bonusRadius: 1.6, planeSpeed: 520 },
  passive: { id: 'bomber', name: 'Carpet Run', summary: 'Every attack is a flyover dropping 4 bombs along its path. Every third run adds an extra 2× explosion.' },
  art: 'bomber',
};

export const b2 = {
  id: 'b2',
  name: 'B-2',
  tier: 9,
  role: 'Stealth strike',
  description: 'You never hear it coming.',
  price: 1600,
  levels: buildLevels({ damage: 900, range: 256, rate: 1 / 12, splash: 80 }, 1600),
  ability: { id: 'b2', bombOffsets: [-90, -45, 45, 90], sideBombs: 0.25, focusMult: 3, planeSpeed: 640 },
  passive: { id: 'b2', name: 'Precision Strike', summary: 'A powerful bombing run every 12 s. The strongest enemy caught in the main blast takes 3× damage.' },
  art: 'b2',
};

export const MARSHAL_COMMAND = { id: 'marshal-command', label: "Marshal's Command", radius: Infinity, damageMult: 1.15, rangeMult: 1.1, levelScale: 0.1 };

export const marshal = {
  id: 'marshal',
  name: 'Marshal',
  tier: 12,
  role: 'Supreme command · global buffs',
  description: 'Everyone stands a little straighter.',
  price: 3500,
  projectile: { kind: 'bullet', speed: 900 },
  levels: buildLevels({ damage: 200, range: 200, rate: 1.2 }, 3500),
  buffs: [MARSHAL_COMMAND],
  ability: { id: 'marshal', coinEvery: 20, coins: 120, aoeEvery: 30, aoeMult: 6, aoeRadius: 112 },
  passive: { id: 'marshal', name: "Marshal's Command", summary: 'All allies: +15% damage and +10% range (more per upgrade). Every 20 s grants coins; every 30 s calls a large barrage.' },
  art: 'marshal',
};

export const LEADER_GLORY = { id: 'glorious-leader', label: 'Glory', radius: Infinity, damageMult: 1.2, levelScale: 0.1 };

export const gloriousLeader = {
  id: 'glorious-leader',
  name: 'Glorious Leader',
  tier: 15,
  role: 'Inspires everyone · weakens everything',
  description: 'A very big hat and a very loud speech.',
  price: 7000,
  projectile: { kind: 'golden', speed: 900 },
  levels: buildLevels({ damage: 420, range: 208, rate: 1.2 }, 7000), // balance: 320 → 420 (weakest Tier XV)
  buffs: [LEADER_GLORY],
  ability: { id: 'glorious-leader', coinEvery: 25, coins: 400, weakenEvery: 20, weaken: 0.15, weakenDuration: 5 },
  passive: { id: 'glorious-leader', name: 'Glory', summary: 'All allies: +20% damage (more per upgrade). Every 25 s a large coin reward. Every 20 s all enemies take +15% damage for 5 s.' },
  art: 'gloriousLeader',
};

export const nuclearWarhead = {
  id: 'nuclear-warhead',
  name: 'Nuclear Warhead',
  tier: 17,
  role: 'Enormous blast · energy zone',
  description: 'Arcade-grade boom. Leaves the ground humming.',
  price: 9000,
  projectile: { kind: 'warhead', speed: 260 },
  // balance: cheaper and faster (was 12,000 coins, 0.12/s) – the rarest units must arrive in time to matter
  levels: buildLevels({ damage: 2500, range: 320, rate: 0.2, splash: 160 }, 9000),
  onHit: [{ status: 'exposed', chance: 1, amount: 0.2, duration: 5 }],
  impactHazard: { kind: 'energy', status: 'charged', radius: 112, duration: 6, dpsFactor: 0.06 },
  ability: { id: 'nuclear-warhead', exposed: 0.2, exposedDuration: 5, zoneDuration: 6 },
  passive: { id: 'nuclear-warhead', name: 'Ground Zero', summary: 'Enormous area attack that leaves a damaging energy zone. Enemies hit take +20% damage for 5 s.' },
  art: 'nuclearWarhead',
};

export const antimatterWarhead = {
  id: 'antimatter-warhead',
  name: 'Antimatter Warhead',
  tier: 19,
  role: 'Huge energy blast · gravity field',
  description: 'Fictional physics, very real results.',
  price: 14000,
  projectile: { kind: 'antimatter', speed: 280 },
  // balance: cheaper and faster (was 20,000 coins, 0.12/s)
  levels: buildLevels({ damage: 4000, range: 352, rate: 0.18, splash: 192 }, 14000),
  onHit: [{ status: 'exposed', chance: 1, amount: 0.3, duration: 8 }],
  ability: { id: 'antimatter', exposed: 0.3, exposedDuration: 8, fieldEvery: 40, fieldRadius: 144, fieldDuration: 3, fieldMult: 2 },
  passive: { id: 'antimatter', name: 'Singularity', summary: 'Huge energy blast; enemies hit take +30% damage for 8 s. Every 40 s a gravity field gathers enemies, then detonates.' },
  art: 'antimatter',
};

export const NUCLEAR_WAR_UNITS = [missileLauncher, battalion, icbm, bomber, b2, marshal, gloriousLeader, nuclearWarhead, antimatterWarhead];
