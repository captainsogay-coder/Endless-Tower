// Endless difficulty curves. All functions are smooth, monotonic and finite for
// any wave number, so progression never hits a wall or a sudden spike.
// HP grows polynomially (not exponentially) which keeps numbers representable
// essentially forever while still out-pacing a stagnant defense.

export function hpMultiplier(wave) {
  const n = Math.max(0, wave - 1);
  return 1 + 0.12 * n + 0.0045 * n * n + 0.00002 * n * n * n;
}

/** Speed approaches +32% asymptotically – faster, but never unreadable. */
export function speedMultiplier(wave) {
  const n = Math.max(0, wave - 1);
  return 1 + 0.32 * (1 - Math.exp(-n / 70));
}

export function towerDamageMultiplier(wave) {
  return 1 + 0.025 * Math.max(0, wave - 1);
}

export function rewardMultiplier(wave) {
  const n = Math.max(0, wave - 1);
  return 1 + 0.085 * n + 0.0006 * n * n;
}

export function waveScaling(wave) {
  return {
    hp: hpMultiplier(wave),
    speed: speedMultiplier(wave),
    damage: towerDamageMultiplier(wave),
    reward: rewardMultiplier(wave),
  };
}

/** How many encounter traits a wave may roll. Grows in steps, capped at 4. */
export function traitSlots(wave, rng) {
  let count = 0;
  if (wave >= 8 && rng.chance(Math.min(1, 0.35 + (wave - 8) * 0.03))) count++;
  if (wave >= 30 && rng.chance(Math.min(0.9, 0.3 + (wave - 30) * 0.02))) count++;
  if (wave >= 60 && rng.chance(Math.min(0.8, 0.25 + (wave - 60) * 0.015))) count++;
  if (wave >= 100 && rng.chance(0.5)) count++;
  return count;
}
