// Battle Plans: which unit *types* a player brings into battle.
// MAX_PLAN_TYPES caps distinct types, NOT deployed copies – copies are
// unlimited in battle (bounded only by buildable ground and gold).

export const MAX_PLAN_TYPES = 12;

export function createPlan(name = 'Battle Plan', units = []) {
  return { name, units: [...new Set(units)].slice(0, MAX_PLAN_TYPES) };
}

export const planHas = (plan, id) => plan.units.includes(id);
export const planIsFull = (plan) => plan.units.length >= MAX_PLAN_TYPES;

/** Adds a unit type. Returns { ok, reason } and leaves the plan unchanged on failure. */
export function addToPlan(plan, id) {
  if (planHas(plan, id)) return { ok: false, reason: 'duplicate' };
  if (planIsFull(plan)) return { ok: false, reason: 'full' };
  plan.units.push(id);
  return { ok: true };
}

export function removeFromPlan(plan, id) {
  const i = plan.units.indexOf(id);
  if (i < 0) return { ok: false, reason: 'missing' };
  plan.units.splice(i, 1);
  return { ok: true };
}

export function togglePlan(plan, id) {
  return planHas(plan, id) ? { ...removeFromPlan(plan, id), removed: true } : { ...addToPlan(plan, id), removed: false };
}

/**
 * Validates a plan against the unit registry and the player's unlocked units.
 * Returns the sanitised list of ids that may enter battle.
 */
export function validatePlan(plan, { isKnown, isUnlocked }) {
  const errors = [];
  const seen = new Set();
  const ids = [];
  for (const id of plan.units) {
    if (seen.has(id)) { errors.push(`duplicate unit "${id}"`); continue; }
    seen.add(id);
    if (!isKnown(id)) { errors.push(`unknown unit "${id}"`); continue; }
    if (!isUnlocked(id)) { errors.push(`unit "${id}" is locked`); continue; }
    ids.push(id);
  }
  if (ids.length > MAX_PLAN_TYPES) errors.push(`more than ${MAX_PLAN_TYPES} unit types`);
  if (ids.length === 0) errors.push('select at least one unit');
  return { ok: errors.length === 0, errors, ids: ids.slice(0, MAX_PLAN_TYPES) };
}
