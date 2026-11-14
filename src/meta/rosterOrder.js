// Battle Plans roster ordering and Auto Build. Pure functions over unit
// definitions and the player's profile, so they are unit-tested headless.

import { MAX_PLAN_TYPES } from './battlePlan.js';
import { levelStats } from '../units/unitStats.js';
import { BALANCE, TIERS } from '../balance.js';
import { sideTiers, ratingKey, CATEGORY_IDS } from './sideTiers.js';

/** Roster sort modes: overall tier, acquisition order, or one side tier. */
export const SORT_MODES = ['tier', 'acquired', ...CATEGORY_IDS];
export const isSideMode = (m) => CATEGORY_IDS.includes(m);

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
export function sortRoster(defs, { isFavorite = () => false, acquiredIndex, mode = 'tier' }) {
  const pinned = (d) => (isFavorite(d.id) ? 0 : 1);
  const strength = (a, b) => b.tier - a.tier || combatScore(b) - combatScore(a) || acquiredIndex(a.id) - acquiredIndex(b.id);
  return [...defs].sort((a, b) => {
    if (pinned(a) !== pinned(b)) return pinned(a) - pinned(b);
    if (mode === 'acquired') return acquiredIndex(a.id) - acquiredIndex(b.id);
    if (isSideMode(mode)) return ratingKey(sideTiers(b)[mode]) - ratingKey(sideTiers(a)[mode]) || strength(a, b);
    return strength(a, b);
  });
}

/**
 * Collection filters (all optional, combined with AND):
 *   ownership: 'all' | 'owned' | 'locked'
 *   circle:    'all' | 'starter' | a circle id (units in that circle's pool)
 *   side:      null | a side-tier id – only units with a real (non-N/A) rating there
 */
export function filterRoster(defs, { ownership = 'all', circle = 'all', side = null, isOwned, circleOf }) {
  return defs.filter((d) => {
    if (ownership === 'owned' && !isOwned(d.id)) return false;
    if (ownership === 'locked' && isOwned(d.id)) return false;
    if (circle !== 'all') {
      const c = circleOf(d.id);
      if (circle === 'starter' ? c !== null : c?.id !== circle) return false;
    }
    if (side && sideTiers(d)[side] == null) return false;
    return true;
  });
}

/**
 * Auto Pick: the strongest plan from owned unit types.
 *   1. owned and usable types only (never invents or duplicates units)
 *   2. with a priority: highest rating in that side tier first (N/A last),
 *      then the optional secondary side tier
 *   3. then highest overall tier
 *   4. then higher combat score (practical effectiveness)
 *   5. final tie-break: acquisition order
 *   6. at most MAX_PLAN_TYPES (12) distinct types
 * Without a priority this is the original Auto Build (steps 3–6).
 */
export function autoBuildPlan(ownedDefs, { acquiredIndex, primary = null, secondary = null, max = MAX_PLAN_TYPES }) {
  const unique = [...new Map(ownedDefs.filter(Boolean).map((d) => [d.id, d])).values()];
  const side = (d, c) => (c ? ratingKey(sideTiers(d)[c]) : 0);
  const second = secondary && secondary !== primary ? secondary : null;
  return unique
    .sort(
      (a, b) =>
        side(b, primary) - side(a, primary) ||
        side(b, second) - side(a, second) ||
        b.tier - a.tier ||
        combatScore(b) - combatScore(a) ||
        acquiredIndex(a.id) - acquiredIndex(b.id),
    )
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
