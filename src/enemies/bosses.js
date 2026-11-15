// Boss archetypes. Every boss wave brings one of these: a different way to
// threaten the tower, not just more health. Each ability is telegraphed for a
// moment before it happens (the renderer draws `e.telegraph`), so the player
// can read it and react.
//
// The archetype is chosen from the run seed and the wave number with a hash –
// never from the wave director's random stream – so adding bosses changes no
// wave plans. Health multipliers keep the overall difficulty close to the old
// single boss: abilities replace raw hit points.

import { hashString } from '../core/rng.js';

/**
 *  hp / speed: multipliers on the boss category's stats
 *  every:      seconds between ability uses (first use after `first` s)
 *  telegraph:  seconds of warning before the ability fires
 */
export const BOSSES = {
  juggernaut: {
    id: 'juggernaut', name: 'Ironhide Juggernaut', color: '#c9ccd2',
    palette: { body: '#7d838d', dark: '#24272d', eye: '#ffb04a', glow: '#c9ccd2' },
    intro: 'Braces behind its plates: while its armour glows it takes 60% less damage.',
    hp: 1, speed: 0.9, every: 11, first: 5, telegraph: 1.2,
    brace: { duration: 3, damageTaken: 0.4 },
  },
  broodmother: {
    id: 'broodmother', name: 'The Broodmother', color: '#a6c46a',
    palette: { body: '#6f8f36', dark: '#25330f', eye: '#f2e65c', glow: '#c4e08a' },
    intro: 'Bursts open egg sacs: every few seconds a brood of fast minions joins the march.',
    hp: 0.85, speed: 1, every: 9, first: 4, telegraph: 1.2,
    brood: { count: 4, max: 32 },
  },
  warlord: {
    id: 'warlord', name: 'Warlord of the Pass', color: '#e07a5a',
    palette: { body: '#963826', dark: '#33100a', eye: '#ffd27a', glow: '#e07a5a' },
    intro: 'Lets out a war cry: units caught in the red ring are stunned for 2 s.',
    hp: 0.95, speed: 1, every: 12, first: 6, telegraph: 1.5,
    cry: { radius: 112, stun: 2 },
  },
  phantom: {
    id: 'phantom', name: 'The Pale Phantom', color: '#b8c8f0',
    palette: { body: '#9aa8d0', dark: '#262c48', eye: '#e8f4ff', glow: '#dfe8ff' },
    intro: 'Steps through the veil: it vanishes and reappears further along the road, untouchable for a moment.',
    hp: 0.8, speed: 1.1, every: 8, first: 5, telegraph: 1,
    blink: { distance: 96, phase: 0.45 },
  },
};
export const BOSS_IDS = Object.keys(BOSSES);

/** Which archetype comes on this boss wave (deterministic, never the same twice in a row). */
export function pickBoss(seed, wave, previous = null) {
  let i = hashString(`${seed >>> 0}:${wave}`) % BOSS_IDS.length;
  if (BOSS_IDS[i] === previous) i = (i + 1) % BOSS_IDS.length;
  return BOSSES[BOSS_IDS[i]];
}

/** Applies the archetype to a freshly spawned boss. */
export function applyBoss(e, def) {
  e.bossKind = def.id;
  e.bossDef = def;
  e.maxHp *= def.hp;
  e.hp = e.maxHp;
  e.speed *= def.speed;
  e.bossTimer = def.first;
  e.telegraph = null; // { kind, t, max, x, y, radius }
  e.bracedUntil = 0;
  e.brood = 0;
}

/** Per-frame boss behaviour (called by Game.updateEnemies for bosses that have arrived). */
export function updateBoss(e, dt, game) {
  const def = e.bossDef;
  if (!def || e.intro < 1) return;
  if (e.telegraph) {
    e.telegraph.t += dt;
    if (e.telegraph.t >= e.telegraph.max) {
      const kind = e.telegraph.kind;
      e.telegraph = null;
      fire(e, kind, game);
    }
    return;
  }
  e.bossTimer -= dt;
  if (e.bossTimer > 0) return;
  e.bossTimer = def.every;
  if (def.brood && e.brood >= def.brood.max) return;
  e.telegraph = { kind: def.id, t: 0, max: def.telegraph, radius: def.cry?.radius ?? e.radius * 2 };
  game.emit('bossTelegraph', { enemy: e, kind: def.id, duration: def.telegraph });
}

function fire(e, kind, game) {
  const def = e.bossDef;
  switch (kind) {
    case 'juggernaut':
      e.bracedUntil = game.time + def.brace.duration;
      break;
    case 'broodmother': {
      const n = Math.min(def.brood.count, def.brood.max - e.brood);
      for (let i = 0; i < n; i++) {
        const m = game.spawnEnemy({ category: 'minion', route: e.routeIndex, offset: Math.max(0, e.d - 6 - i * 9), lateral: (i % 2 ? 1 : -1) * 6 }, e.wave);
        m.broodOf = e.id;
      }
      e.brood += n;
      break;
    }
    case 'warlord': {
      const r2 = def.cry.radius ** 2;
      const until = game.time + def.cry.stun;
      let n = 0;
      for (const u of game.units) {
        if ((u.x - e.x) ** 2 + (u.y - e.y) ** 2 > r2) continue;
        u.stunnedUntil = Math.max(u.stunnedUntil ?? 0, until);
        n++;
      }
      game.emit('warCry', { enemy: e, radius: def.cry.radius, stunned: n });
      break;
    }
    case 'phantom': {
      // never blinks into the tower: it stops at least three tiles short of the end
      const max = e.route.length - 96;
      e.d = Math.min(max, e.d + def.blink.distance);
      e.invulnerable = true;
      game.after(def.blink.phase, () => {
        if (e.alive) e.invulnerable = false;
      });
      break;
    }
    default:
  }
  game.emit('bossAbility', { enemy: e, kind });
}

/** Damage multiplier from a boss's own defences (Juggernaut's brace). */
export function bossDamageTaken(e, now) {
  return e.bracedUntil > now ? e.bossDef.brace.damageTaken : 1;
}
