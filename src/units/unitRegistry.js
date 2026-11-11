// Unit definition registry. The game ships with NO units – the roster is
// designed separately and registered here (see roster.js for the schema).

import { getTier } from './tiers.js';

const units = new Map();

export function validateUnitDef(def) {
  const errors = [];
  if (!def || typeof def !== 'object') return ['definition must be an object'];
  if (!def.id || typeof def.id !== 'string') errors.push('id (string) is required');
  if (!def.name) errors.push('name is required');
  if (!Number.isInteger(def.tier) || def.tier < 1) errors.push('tier must be an integer ≥ 1');
  const s = def.stats ?? {};
  for (const k of ['damage', 'range', 'rate']) if (!(typeof s[k] === 'number' && s[k] >= 0)) errors.push(`stats.${k} must be a number ≥ 0`);
  return errors;
}

export function registerUnit(def) {
  const errors = validateUnitDef(def);
  if (errors.length) throw new Error(`Invalid unit "${def?.id}": ${errors.join('; ')}`);
  units.set(def.id, Object.freeze({ summonWeight: 1, targeting: 'first', ...def, stats: Object.freeze({ projectileSpeed: 520, splash: 0, ...def.stats }) }));
  return units.get(def.id);
}

export const unregisterUnit = (id) => units.delete(id);
export const clearUnits = () => units.clear();
export const getUnit = (id) => units.get(id);
export const listUnits = () => [...units.values()];
export const hasRoster = () => units.size > 0;
export const unitsOfTier = (tier) => listUnits().filter((u) => u.tier === tier);
export const registeredTiers = () => [...new Set(listUnits().map((u) => u.tier))].sort((a, b) => a - b);
export const tierOf = (def) => getTier(def.tier);
