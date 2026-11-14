// Battle Plans roster ordering and Auto Build. Pure functions over unit
// definitions and the player's profile, so they are unit-tested headless.

import { MAX_PLAN_TYPES } from './battlePlan.js';
import { levelStats } from '../units/unitStats.js';
import { BALANCE, TIERS } from '../balance.js';

/**
 * Baseline combat score of a unit type at level 0: single-target DPS combined
 * with its area reach, with support/summoner utility credited back (their
 * budget buys buffs and allies instead of own damage). Used to rank units of
 * the same tier; it never changes stats.
 */
export function combatScore(def) {
  const s = levelStats(def, 0);
  const hits = def.profile?.hits ?? 1;
  const single = s.damage * s.rate * hits;
  const tiles = (s.splash ?? 0) / 32;
  const crowd = single * (1 + BALANCE.splashFalloff * Math.min(8, Math.PI * tiles * tiles));
  const roleShare = TIERS.roles[def.profile?.role ?? 'gunner'] ?? 1;
  return Math.sqrt(single * crowd) / roleShare;
}

/**
 * Roster order: pinned unit types first, then the rest. Within each group,
 * 'tier' sorts highest tier first (stronger units first within a tier), and
 * 'acquired' keeps the order the player obtained them.
 */
export function sortRoster(defs, { isFavorite, acquiredIndex, mode = 'tier' }) {
  const pinned = (d) => (isFavorite(d.id) ? 0 : 1);
  return [...defs].sort((a, b) => {
    if (pinned(a) !== pinned(b)) return pinned(a) - pinned(b);
    if (mode === 'acquired') return acquiredIndex(a.id) - acquiredIndex(b.id);
    return b.tier - a.tier || combatScore(b) - combatScore(a) || acquiredIndex(a.id) - acquiredIndex(b.id);
  });
}

/**
 * Auto Build: the strongest plan from owned unit types.
 *   1. owned and usable types only (never invents or duplicates units)
 *   2. highest tier first
 *   3. same tier: higher combat score first
 *   4. final tie-break: acquisition order
 *   5. at most MAX_PLAN_TYPES (12) distinct types
 */
export function autoBuildPlan(ownedDefs, { acquiredIndex, max = MAX_PLAN_TYPES }) {
  const unique = [...new Map(ownedDefs.filter(Boolean).map((d) => [d.id, d])).values()];
  return unique
    .sort((a, b) => b.tier - a.tier || combatScore(b) - combatScore(a) || acquiredIndex(a.id) - acquiredIndex(b.id))
    .slice(0, max)
    .map((d) => d.id);
}

/** What applying a new plan changes: units added, units removed, units kept. */
export function planDiff(current, next) {
  return {
    added: next.filter((id) => !current.includes(id)),
    removed: current.filter((id) => !next.includes(id)),
    kept: next.filter((id) => current.includes(id)),
  };
}
