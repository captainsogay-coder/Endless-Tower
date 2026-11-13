// Unit definition registry. Definitions are data (see roster.js for the schema).

const units = new Map();

export function validateUnitDef(def) {
  const errors = [];
  if (!def || typeof def !== 'object') return ['definition must be an object'];
  if (!def.id || typeof def.id !== 'string') errors.push('id (string) is required');
  if (!def.name) errors.push('name is required');
  if (!Number.isInteger(def.tier) || def.tier < 1) errors.push('tier must be an integer ≥ 1');
  if (!(typeof def.price === 'number' && def.price >= 0)) errors.push('price must be a number ≥ 0');
  if (!Array.isArray(def.levels) || def.levels.length < 1) errors.push('levels must be a non-empty array');
  else {
    def.levels.forEach((L, i) => {
      for (const k of ['damage', 'range', 'rate']) if (!(typeof L[k] === 'number' && L[k] >= 0)) errors.push(`levels[${i}].${k} must be a number ≥ 0`);
      if (i > 0 && !(typeof L.cost === 'number' && L.cost > 0)) errors.push(`levels[${i}].cost must be a number > 0`);
    });
  }
  if (def.passive) {
    if (!def.passive.name || !def.passive.summary) errors.push('passive needs name and summary');
    if (def.passive.modify !== undefined && typeof def.passive.modify !== 'function') errors.push('passive.modify must be a function');
  }
  for (const b of def.buffs ?? []) if (!(b.id && (b.radius > 0 || b.radius === 'range'))) errors.push("each buff needs an id and a radius > 0 (Infinity = map-wide, 'range' = the unit's attack range)");
  if (def.ability && !def.ability.id) errors.push('ability needs an id');
  if (def.economy && !(def.economy.id && def.economy.coinMult > 0)) errors.push('economy needs id and coinMult');
  if (def.summon && !(def.summon.every > 0 && def.summon.kind)) errors.push('summon needs every (s) and kind');
  return errors;
}

export function registerUnit(def) {
  const errors = validateUnitDef(def);
  if (errors.length) throw new Error(`Invalid unit "${def?.id}": ${errors.join('; ')}`);
  units.set(def.id, Object.freeze({ targeting: 'first', ...def }));
  return units.get(def.id);
}

// Temporary combatants (e.g. Battalion soldiers) that are never summoned,
// listed in Battle Plans or deployed by the player.
const allyUnits = new Map();
export function registerAllyDef(def) {
  allyUnits.set(def.id, Object.freeze({ targeting: 'first', ...def }));
}
export const getAllyDef = (id) => allyUnits.get(id);

export const unregisterUnit = (id) => units.delete(id);
export const clearUnits = () => units.clear();
export const getUnit = (id) => units.get(id);
export const listUnits = () => [...units.values()];
export const hasRoster = () => units.size > 0;
export const unitsOfTier = (tier) => listUnits().filter((u) => u.tier === tier);
export const registeredTiers = () => [...new Set(listUnits().map((u) => u.tier))].sort((a, b) => a - b);
