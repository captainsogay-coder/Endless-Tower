// Upgrade tables for units that use the standard progression. Every number is
// configuration: change UPGRADE_SCALING (or pass a custom scaling to
// buildLevels) to retune how all of these units grow. The UI only ever reads
// the resulting `levels` table.
//
// levels[0] is the base unit; levels[1..5] are the five upgrades. Each upgrade
// costs `price × costs[i]` coins and multiplies the stats by the growth factors.

export const UPGRADE_SCALING = Object.freeze({
  costs: [0.8, 1.3, 2, 3, 4.5], // × the unit's deploy price, per upgrade
  damage: 1.22, // × per level
  range: 1.035,
  rate: 1.05,
  splash: 1.04,
});

const round = (v, step) => Math.round(v / step) * step;

/**
 * Builds a level table from base stats. `base` = { damage, range, rate, splash? }
 * (range/splash in px, rate in attacks per second).
 */
export function buildLevels(base, price, scaling = UPGRADE_SCALING) {
  const levels = [];
  for (let i = 0; i <= scaling.costs.length; i++) {
    const L = {
      damage: round(base.damage * scaling.damage ** i, base.damage >= 20 ? 1 : 0.5),
      range: round(base.range * scaling.range ** i, 1),
      rate: round(base.rate * scaling.rate ** i, 0.005),
    };
    if (base.splash) L.splash = round(base.splash * scaling.splash ** i, 1);
    if (i > 0) L.cost = round(price * scaling.costs[i - 1], price >= 200 ? 10 : 5);
    levels.push(L);
  }
  return levels;
}
