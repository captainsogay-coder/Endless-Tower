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
//   - a unit never buffs itself.

/** Enemy status effects. `slow` removes speed; `damageTaken` multiplies damage received. */
export const STATUSES = {
  wounded: { id: 'wounded', label: 'Wounded', slow: 0.05, damageTaken: 1, duration: 4, color: '#b8433a' },
  crippled: { id: 'crippled', label: 'Crippled', slow: 0.1, damageTaken: 1.2, duration: 5, color: '#8a5bd1' },
  burning: { id: 'burning', label: 'Burning', slow: 0, damageTaken: 1, duration: 0.6, color: '#e0742e' },
};

/** Applies (or refreshes) a status. Re-applying never stacks – it only resets the timer. */
export function applyStatus(e, id, now) {
  const def = STATUSES[id];
  if (!def) return;
  if (!e.statuses) e.statuses = {};
  e.statuses[id] = now + def.duration;
}

export function hasStatus(e, id, now) {
  return !!e.statuses && (e.statuses[id] ?? 0) > now;
}

/** Movement multiplier from active statuses: the strongest slow wins (no stacking). */
export function statusSpeedMultiplier(e, now) {
  if (!e.statuses) return 1;
  let slow = 0;
  for (const id in e.statuses) {
    if (e.statuses[id] > now) slow = Math.max(slow, STATUSES[id].slow);
  }
  return 1 - slow;
}

/** Damage-taken multiplier from active statuses: the strongest wins (no stacking). */
export function statusDamageTakenMultiplier(e, now) {
  if (!e.statuses) return 1;
  let m = 1;
  for (const id in e.statuses) {
    if (e.statuses[id] > now) m = Math.max(m, STATUSES[id].damageTaken);
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
    const ids = [];
    for (const { u: s, b } of sources) {
      if (s === u || ids.includes(b.id)) continue;
      if (b.radius === Infinity || (s.x - u.x) ** 2 + (s.y - u.y) ** 2 <= b.radius * b.radius) ids.push(b.id);
    }
    ids.sort();
    const key = ids.join('|');
    if (key !== (u.auraKey ?? '')) {
      u.auraKey = key;
      u.auras = ids;
      changed.push(u);
    }
  }
  return changed;
}

/** Applies a set of stat modifiers to a stats object (copy). */
export function applyModifiers(stats, mod) {
  if (!mod) return stats;
  if (mod.damageMult) stats.damage *= mod.damageMult;
  if (mod.cooldownMult) stats.rate /= mod.cooldownMult; // cooldown × m  ⇔  attack rate ÷ m
  if (mod.rangeMult) stats.range *= mod.rangeMult;
  return stats;
}
