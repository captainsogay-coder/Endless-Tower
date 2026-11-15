// Cinematic summon timing (pure; tested in tests/revealPlan.test.js).
//
// Every summon gets one cinematic: a build-up on the circle (rings lock, lamps
// climb, the circle's own motif), the drop, and the reveal.
//  - A single summon lasts 4–9 s depending on rarity (always > 3 s, < 10 s).
//  - A batch (×5, ×10, ×25) is ONE sequence of 4–9 s in total: the build-up
//    plays once for the best result, then every result cascades onto the
//    results board; chase and super chase results get an extra spotlight.
//  - Skip is always available. The units are granted before any of this
//    starts – the cinematic only shows what already happened.

export const RARITY = { common: 0, high: 1, chase: 2, super: 3 };

/** Rarity of a summon result: super chase (0.1% or rarer), chase, high tier (X+), common. */
export function rarityOf(r) {
  if (r.rare && r.chance <= 0.001) return 'super';
  if (r.rare) return 'chase';
  if (r.tier >= 10) return 'high';
  return 'common';
}

const SINGLE = {
  common: { lock: 1.1, charge: 1.6, drop: 0.6, open: 0.9 },
  high: { lock: 1.2, charge: 2.0, drop: 0.7, open: 1.1 },
  chase: { lock: 1.4, charge: 2.8, drop: 0.8, open: 1.4 },
  super: { lock: 1.8, charge: 3.6, drop: 1.0, open: 2.0 },
};
const BATCH_LEAD = {
  common: { lock: 0.8, charge: 1.3, drop: 0.4, open: 0.5 },
  high: { lock: 0.8, charge: 1.6, drop: 0.45, open: 0.55 },
  chase: { lock: 0.9, charge: 2.2, drop: 0.5, open: 0.6 },
  super: { lock: 1.0, charge: 2.8, drop: 0.6, open: 0.7 },
};
const SPOTLIGHT = { common: 0, high: 0, chase: 0.8, super: 1.4 };
export const LIMITS = { min: 3, max: 10, batchMin: 4, batchMax: 9 };

/** The result a batch builds up to: rarest first, then highest tier. */
export function headline(results) {
  return [...results].sort((a, b) => RARITY[rarityOf(b)] - RARITY[rarityOf(a)] || b.tier - a.tier)[0];
}

/**
 * The plan for a summon: { mode, phases: {lock, charge, drop, open}, cascade,
 * spotlight, total, headline, rarity }. For a single summon the result card
 * stays on screen after `total` until the player closes it.
 */
export function revealPlan(results) {
  const best = headline(results);
  const rarity = rarityOf(best);
  if (results.length === 1) {
    const phases = SINGLE[rarity];
    const total = phases.lock + phases.charge + phases.drop + phases.open;
    return { mode: 'single', phases, cascade: 0, spotlight: 0, total, headline: best, rarity };
  }
  const phases = BATCH_LEAD[rarity];
  const lead = phases.lock + phases.charge + phases.drop + phases.open;
  // the cascade grows a little with the batch size, but never past the total budget
  const cascade = Math.min(1.8, 0.9 + results.length * 0.035);
  const extra = Math.max(...results.map((r) => SPOTLIGHT[rarityOf(r)]));
  const total = Math.min(LIMITS.batchMax, Math.max(LIMITS.batchMin, lead + cascade + extra));
  return { mode: 'batch', phases, cascade, spotlight: extra, total, headline: best, rarity };
}
