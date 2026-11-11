// Encounter traits: wave-level modifiers that change *how* a wave must be
// fought rather than just inflating numbers. Unlocked progressively.

const traits = new Map();

export function registerTrait(def) {
  if (!def.id || typeof def.apply !== 'function') throw new Error('Trait needs id and apply()');
  traits.set(def.id, Object.freeze({ minWave: 1, weight: 1, excludes: [], ...def }));
}
export const getTrait = (id) => traits.get(id);
export const listTraits = () => [...traits.values()];

registerTrait({
  id: 'armored',
  label: 'Armored',
  description: 'Incoming damage reduced by 35%',
  color: '#c0c8d8',
  minWave: 8,
  apply(e) { e.armor = Math.max(e.armor, 0.35); },
});
registerTrait({
  id: 'swift',
  label: 'Swift',
  description: '+35% speed, -15% health',
  color: '#7fe8ff',
  minWave: 12,
  apply(e) { e.speed *= 1.35; e.maxHp *= 0.85; },
});
registerTrait({
  id: 'regenerating',
  label: 'Regenerating',
  description: 'Recovers 3% health per second when not struck',
  color: '#7dff8a',
  minWave: 18,
  apply(e) { e.regen = Math.max(e.regen, 0.03); },
});
registerTrait({
  id: 'shielded',
  label: 'Shielded',
  description: 'Barrier absorbs damage equal to 50% health',
  color: '#a98bff',
  minWave: 26,
  apply(e) { e.maxShield = e.maxHp * 0.5; e.shield = e.maxShield; },
});

export function rollTraits(count, wave, archetypeId, rng) {
  const pool = listTraits().filter((t) => wave >= t.minWave && !t.excludes.includes(archetypeId));
  const out = [];
  for (let i = 0; i < count && pool.length; i++) {
    const t = rng.weighted(pool);
    out.push(t.id);
    pool.splice(pool.indexOf(t), 1);
  }
  return out;
}
