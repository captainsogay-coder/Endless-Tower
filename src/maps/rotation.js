// Battlefield assignment. Players never choose a map: each battle draws a
// realm, a terrain variant and a layout at random, weighted away from what
// they fought on recently so consecutive battles feel different.

import { listBiomes, getBiome } from './biomes.js';

export const HISTORY_SPAN = 4;

/** Realm + variant for the next battle, avoiding recent repeats. */
export function chooseBattlefield(rng, history = []) {
  const recent = history.slice(-HISTORY_SPAN);
  const biomes = listBiomes();
  const weights = biomes.map((b) => {
    const idx = recent.map((h) => h.biome).lastIndexOf(b.id);
    if (idx < 0) return { b, weight: 3 };
    const age = recent.length - idx; // 1 = last battle
    return { b, weight: age <= 2 ? 0 : 0.6 * age };
  });
  const biome = (rng.weighted(weights) ?? { b: rng.pick(biomes) }).b;
  const variants = biome.variants ?? [{ id: 'base' }];
  const usedVariants = new Set(recent.filter((h) => h.biome === biome.id).map((h) => h.variant));
  const freshVariants = variants.filter((v) => !usedVariants.has(v.id));
  const variant = rng.pick(freshVariants.length ? freshVariants : variants);
  const lastStyle = history.length ? history[history.length - 1].style : null;
  return { biomeId: biome.id, variantId: variant.id, avoidStyles: lastStyle ? [lastStyle] : [] };
}

/** The biome with a terrain variant's overrides merged in. */
export function biomeWithVariant(biomeId, variantId) {
  const base = getBiome(biomeId);
  const v = (base.variants ?? []).find((x) => x.id === variantId);
  if (!v) return { ...base, variantId: 'base', variantName: null };
  return {
    ...base,
    variantId: v.id,
    variantName: v.name,
    layout: { ...base.layout, ...(v.layout ?? {}) },
    lighting: { ...(base.lighting ?? {}), ...(v.lighting ?? {}) },
    palette: { ...base.palette, ...(v.palette ?? {}) },
  };
}
