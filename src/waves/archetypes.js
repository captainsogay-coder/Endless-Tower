// Wave archetypes. Each one defines its feel through composition, pacing and
// presentation. compose() returns enemy groups for a given wave; later waves
// introduce mixed compositions so wave 100 plays differently from wave 10.

import { clamp } from '../core/math.js';

const archetypes = new Map();

export function registerArchetype(def) {
  for (const k of ['id', 'label', 'compose']) if (!def[k]) throw new Error(`Archetype missing "${k}"`);
  archetypes.set(def.id, Object.freeze({ minWave: 1, baseWeight: 1, repeatFactor: 0.3, maxRepeat: 2, patterns: { stream: 1 }, ...def }));
}
export const getArchetype = (id) => archetypes.get(id);
export const listArchetypes = () => [...archetypes.values()];

export const Archetype = Object.freeze({ SWARM: 'swarm', ARMY: 'army', COMMANDO: 'commando', BOSS: 'boss' });

registerArchetype({
  id: 'swarm',
  label: 'Swarm',
  tagline: 'An overwhelming tide',
  color: '#ffb347',
  minWave: 3,
  baseWeight: 3,
  maxRepeat: 2,
  patterns: { burst: 3, surge: 3, stream: 1, pincer: 2 },
  compose(wave, rng) {
    const count = Math.round(Math.min(380, 24 + wave * 2.4 + rng.int(-3, 3)));
    const groups = [{ category: 'minion', count }];
    if (wave >= 18) groups.push({ category: 'regular', count: Math.min(36, Math.floor((wave - 12) / 5)), mix: 'interleave' });
    if (wave >= 45) groups.push({ category: 'elite', count: Math.min(4, Math.floor((wave - 35) / 20)), mix: 'tail' });
    return { groups, spacing: clamp(0.3 - wave * 0.002, 0.07, 0.3) };
  },
});

registerArchetype({
  id: 'army',
  label: 'Army',
  tagline: 'A disciplined march',
  color: '#ff6b6b',
  minWave: 1,
  baseWeight: 4,
  maxRepeat: 2,
  patterns: { stream: 3, pincer: 2, burst: 1 },
  compose(wave, rng) {
    const base = wave <= 2 ? 8 + wave * 2 : 12;
    const groups = [{ category: 'regular', count: Math.min(30, base + Math.floor(wave / 14) + rng.int(0, 1)) }];
    if (wave >= 15) groups.push({ category: 'elite', count: Math.min(6, Math.floor((wave - 9) / 12)), mix: 'interleave' });
    if (wave >= 22) groups.push({ category: 'minion', count: Math.min(80, 10 + Math.floor(wave / 3)), mix: 'front' });
    return { groups, spacing: clamp(0.95 - wave * 0.006, 0.45, 0.95) };
  },
});

registerArchetype({
  id: 'commando',
  label: 'Commando',
  tagline: 'Few in number. Hard to kill.',
  color: '#5ad1ff',
  minWave: 5,
  baseWeight: 2,
  maxRepeat: 1,
  repeatFactor: 0,
  patterns: { stream: 2, pincer: 2, burst: 1 },
  compose(wave, rng) {
    const groups = [{ category: 'elite', count: Math.min(9, 3 + Math.floor(wave / 18) + rng.int(0, 1)) }];
    if (wave >= 28) groups.push({ category: 'regular', count: Math.min(16, 4 + Math.floor((wave - 28) / 6)), mix: 'interleave' });
    return { groups, spacing: clamp(2.4 - wave * 0.008, 1.2, 2.4) };
  },
});

registerArchetype({
  id: 'boss',
  label: 'Boss',
  tagline: 'Something enormous approaches',
  color: '#ff4fd8',
  minWave: 8,
  baseWeight: 0, // the director schedules bosses on its own cadence
  maxRepeat: 1,
  repeatFactor: 0,
  patterns: { stream: 1 },
  compose(wave) {
    const groups = [{ category: 'boss', count: 1, cinematic: true }];
    if (wave >= 40) groups.push({ category: 'elite', count: Math.min(4, Math.floor((wave - 30) / 15)), mix: 'tail' });
    if (wave >= 70) groups.push({ category: 'minion', count: Math.min(60, Math.floor((wave - 50) / 2)), mix: 'tail' });
    return { groups, spacing: 1.2 };
  },
});
