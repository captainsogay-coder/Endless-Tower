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
  if (def.aura && !(def.aura.id && def.aura.radius > 0)) errors.push('aura needs id and radius');
  return errors;
}

export function registerUnit(def) {
  const errors = validateUnitDef(def);
  if (errors.length) throw new Error(`Invalid unit "${def?.id}": ${errors.join('; ')}`);
  units.set(def.id, Object.freeze({ targeting: 'first', ...def }));
  return units.get(def.id);
}

export const unregisterUnit = (id) => units.delete(id);
export const clearUnits = () => units.clear();
export const getUnit = (id) => units.get(id);
export const listUnits = () => [...units.values()];
export const hasRoster = () => units.size > 0;
export const unitsOfTier = (tier) => listUnits().filter((u) => u.tier === tier);
export const registeredTiers = () => [...new Set(listUnits().map((u) => u.tier))].sort((a, b) => a - b);
