// Combat effects shared by all units: enemy status effects, ground hazards
// (e.g. flames) and unit buffs. Units opt in declaratively in their definition:
//   onHit:        [{ status: 'wounded', chance: 0.2 }]          – rolled per enemy damaged
//   impactHazard: { kind: 'fire', radius, duration, dpsFactor }    – left where a shot lands
//   buffs:        [{ id, radius, damageMult?, cooldownMult?, rangeMult? }]
//                 – applied to nearby allied units (radius Infinity = map-wide)
//   economy:      { id, coinMult }                                 – battle-wide coin gain
//
// Stacking rules (prevent runaway buffs):
//   - a given buff/economy id applies at most ONCE to a unit/battle, however many
//     copies of the source unit are deployed;
//   - different ids are compatible and multiply together;
//   - a unit never buffs itself;
//   - a buff with `faction` only reaches units of that faction (e.g. Village Rally);
//   - when several copies of a source reach a unit, the highest-level copy counts
//     (buffs with `levelScale` grow with the source's upgrade level).

/**
 * Enemy status effects. `slow` removes speed; `damageTaken` multiplies damage
 * received. Statuses marked `variable` take their strength from the source
 * (e.g. Dynamite exposes by 10%, the Antimatter Warhead by 30%).
 */
export const STATUSES = {
  wounded: { id: 'wounded', label: 'Wounded', slow: 0.05, damageTaken: 1, duration: 4, color: '#b8433a' },
  crippled: { id: 'crippled', label: 'Crippled', slow: 0.1, damageTaken: 1.2, duration: 5, color: '#8a5bd1' },
  burning: { id: 'burning', label: 'Burning', slow: 0, damageTaken: 1, duration: 0.6, color: '#e0742e' },
  // variable strength: `amount` = extra damage taken (0.1 = +10%)
  exposed: { id: 'exposed', label: 'Exposed', variable: 'damageTaken', slow: 0, damageTaken: 1, duration: 4, color: '#e0a23a' },
  // variable strength: `amount` = speed removed (0.15 = −15%)
  slowed: { id: 'slowed', label: 'Slowed', variable: 'slow', slow: 0, damageTaken: 1, duration: 3, color: '#6fb6d9' },
  // visual-only: radiation-free arcade "energy" scorch from warheads
  charged: { id: 'charged', label: 'Charged', slow: 0, damageTaken: 1, duration: 0.6, color: '#7af0d2' },
};

/**
 * Applies (or refreshes) a status. Re-applying never stacks:
 *  - fixed statuses just reset their timer;
 *  - variable statuses keep the STRONGEST active amount. A weaker application
 *    while a stronger one is active changes nothing; an equal or stronger one
 *    replaces it and restarts the timer.
 * `opts` = { duration?, amount? } (used by variable statuses).
 */
export function applyStatus(e, id, now, opts = null) {
  const def = STATUSES[id];
  if (!def) return;
  if (!e.statuses) e.statuses = {};
  const until = now + (opts?.duration ?? def.duration);
  if (def.variable) {
    if (!e.statusAmount) e.statusAmount = {};
    const amount = opts?.amount ?? 0;
    const active = (e.statuses[id] ?? 0) > now;
    const prev = active ? e.statusAmount[id] ?? 0 : -1;
    if (amount < prev) return;
    e.statusAmount[id] = amount;
    e.statuses[id] = amount === prev ? Math.max(e.statuses[id], until) : until;
    return;
  }
  e.statuses[id] = Math.max(e.statuses[id] ?? 0, until);
}

export function hasStatus(e, id, now) {
  return !!e.statuses && (e.statuses[id] ?? 0) > now;
}

/** Movement multiplier from active statuses: the strongest slow wins (no stacking). */
export function statusSpeedMultiplier(e, now) {
  if (!e.statuses) return 1;
  let slow = 0;
  for (const id in e.statuses) {
    if (e.statuses[id] > now) slow = Math.max(slow, STATUSES[id].variable === 'slow' ? e.statusAmount[id] : STATUSES[id].slow);
  }
  return 1 - slow;
}

/** Damage-taken multiplier from active statuses: the strongest wins (no stacking). */
export function statusDamageTakenMultiplier(e, now) {
  if (!e.statuses) return 1;
  let m = 1;
  for (const id in e.statuses) {
    if (e.statuses[id] > now) m = Math.max(m, STATUSES[id].variable === 'damageTaken' ? 1 + e.statusAmount[id] : STATUSES[id].damageTaken);
  }
  return m;
}

export const HAZARD_TICK = 0.25;

/**
 * Recomputes which buffs reach each unit. Each unit records the set of buff
 * *ids* touching it, so several identical sources (e.g. three Tanks) still
 * grant a bonus only once. Returns units whose buff set changed.
 */
export function computeAuras(units) {
  const sources = [];
  for (const u of units) for (const b of u.def.buffs ?? []) sources.push({ u, b });
  const changed = [];
  for (const u of units) {
    const best = new Map(); // buff id -> highest source level reaching u
    for (const { u: s, b } of sources) {
      if (s === u) continue;
      if (b.faction && u.def.faction !== b.faction) continue; // faction buffs only reach their own faction
      const r = buffRadius(b, s);
      if (r === Infinity || (s.x - u.x) ** 2 + (s.y - u.y) ** 2 <= r * r) {
        if (!best.has(b.id) || s.level > best.get(b.id)) best.set(b.id, s.level);
      }
    }
    const ids = [...best.keys()].sort();
    const key = ids.map((id) => `${id}@${best.get(id)}`).join('|');
    if (key !== (u.auraKey ?? '')) {
      u.auraKey = key;
      u.auras = ids;
      u.auraLevels = Object.fromEntries(best);
      changed.push(u);
    }
  }
  return changed;
}

/** A buff's reach. `radius: 'range'` follows the source's current attack range. */
export function buffRadius(b, source) {
  return b.radius === 'range' ? source.stats.range : b.radius;
}

/**
 * Strength of a buff from a source at `level`. With `levelScale` s, each upgrade
 * level adds s × the base bonus (e.g. +15% damage, s 0.1 → +16.5% at level 1).
 */
export function scaledBuff(b, level = 0) {
  const k = 1 + (b.levelScale ?? 0) * level;
  if (k === 1) return b;
  const out = { ...b };
  if (b.damageMult) out.damageMult = 1 + (b.damageMult - 1) * k;
  if (b.rangeMult) out.rangeMult = 1 + (b.rangeMult - 1) * k;
  if (b.cooldownMult) out.cooldownMult = Math.max(0.5, 1 - (1 - b.cooldownMult) * k);
  return out;
}

/** Applies a set of stat modifiers to a stats object (copy). */
export function applyModifiers(stats, mod) {
  if (!mod) return stats;
  if (mod.damageMult) stats.damage *= mod.damageMult;
  if (mod.cooldownMult) stats.rate /= mod.cooldownMult; // cooldown × m  ⇔  attack rate ÷ m
  if (mod.rangeMult) stats.range *= mod.rangeMult;
  return stats;
}
