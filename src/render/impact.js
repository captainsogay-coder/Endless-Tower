// How hard did that hit? One shared measure so the size, brightness, length,
// screen shake and sound of an effect follow what actually happened in the
// game, not the weapon's name: a warhead that tickles a late-wave brute looks
// and sounds like a pop, a single crossbow bolt that deletes a weak enemy
// gets a firm hit. Area effects always show their true radius (that is
// gameplay information); weight only decides how much spectacle fills it.

let cache = { t: -1, ref: 60 };

/** Typical enemy toughness right now: mean max HP of up to 24 living enemies (refreshed twice a second). */
export function referenceHp(game) {
  if (!game) return 60;
  if (game.time - cache.t < 0.5 && cache.game === game) return cache.ref;
  let sum = 0;
  let n = 0;
  for (const e of game.enemies) {
    if (!e.alive) continue;
    sum += e.maxHp;
    if (++n >= 24) break;
  }
  cache = { t: game.time, ref: n ? sum / n : cache.game === game ? cache.ref : 60, game };
  return cache.ref;
}

/**
 * 0.1 (scratch) … 1 (takes a typical enemy's full health) … 1.3 (overkill).
 * Square-root response so the middle of the range stays distinguishable.
 */
export function impactWeight(game, damage, target = null) {
  if (!(damage > 0)) return 0.1;
  const ref = target?.maxHp > 0 ? Math.max(target.maxHp * 0.6, referenceHp(game) * 0.6) : referenceHp(game);
  return Math.max(0.1, Math.min(1.3, Math.sqrt(damage / ref)));
}
