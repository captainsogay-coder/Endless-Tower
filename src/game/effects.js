// Combat effects shared by all units: enemy status effects, ground hazards
// (e.g. flames) and unit auras. Units opt in declaratively in their definition:
//   onHit:        [{ status: 'wounded', chance: 0.2 }]      – rolled per enemy damaged
//   impactHazard: { kind: 'fire', radius, duration, dpsFactor } – left where a shot lands
//   aura:         { id, radius, cooldownMult }               – buffs nearby allied units

/** Enemy status effects. `slow` is a fraction of speed removed while active. */
export const STATUSES = {
  wounded: { id: 'wounded', label: 'Wounded', slow: 0.05, duration: 4, color: '#b8433a' },
  burning: { id: 'burning', label: 'Burning', slow: 0, duration: 0.6, color: '#e0742e' },
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

export const HAZARD_TICK = 0.25;

/**
 * Recomputes which auras reach each unit. Each unit records the set of aura
 * *ids* touching it, so several identical sources (e.g. three Tanks) still
 * grant the bonus only once. Returns units whose aura set changed.
 */
export function computeAuras(units) {
  const sources = units.filter((u) => u.def.aura);
  const changed = [];
  for (const u of units) {
    const ids = [];
    for (const s of sources) {
      if (s === u) continue;
      const a = s.def.aura;
      if (ids.includes(a.id)) continue;
      if ((s.x - u.x) ** 2 + (s.y - u.y) ** 2 <= a.radius * a.radius) ids.push(a.id);
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
