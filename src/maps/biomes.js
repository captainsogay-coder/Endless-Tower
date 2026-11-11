// Biome registry. Add a new environment by creating a module in ./biomes and
// registering it here – nothing else in the game needs to change.
import forest from './biomes/forest.js';
import volcanic from './biomes/volcanic.js';
import frozen from './biomes/frozen.js';
import ruins from './biomes/ruins.js';
import sky from './biomes/sky.js';
import mechanical from './biomes/mechanical.js';

const registry = new Map();

export function registerBiome(biome) {
  for (const key of ['id', 'name', 'palette', 'enemyPalette', 'layout', 'createAmbient']) {
    if (!biome[key]) throw new Error(`Biome is missing "${key}"`);
  }
  registry.set(biome.id, biome);
}

export const getBiome = (id) => {
  const b = registry.get(id);
  if (!b) throw new Error(`Unknown biome "${id}"`);
  return b;
};
export const listBiomes = () => [...registry.values()];

/** Random biome, avoiding an immediate repeat of the previous one when possible. */
export function pickBiome(rng, previousId = null) {
  const pool = listBiomes().filter((b) => b.id !== previousId);
  return rng.pick(pool.length ? pool : listBiomes());
}

[forest, volcanic, frozen, ruins, sky, mechanical].forEach(registerBiome);
