// Shared unit math: level stats, upgrade costs and passive application.
// Every unit goes through these helpers – nothing here is unit-specific.

let nextUid = 1;

export const maxLevel = (def) => def.levels.length - 1;

/** Raw stats for a definition at a level (no passive applied). */
export function levelStats(def, level) {
  const L = def.levels[Math.max(0, Math.min(level, maxLevel(def)))];
  return {
    damage: L.damage,
    range: L.range,
    rate: L.rate,
    projectileSpeed: L.projectileSpeed ?? def.projectile?.speed ?? 520,
    splash: L.splash ?? 0,
  };
}

/** Gold cost to go from `level` to `level + 1`, or null at max level. */
export function upgradeCost(def, level) {
  return level < maxLevel(def) ? def.levels[level + 1].cost : null;
}

/** Applies the definition's passive (if any) to a copy of the given stats. */
export function applyPassive(def, stats, ctx) {
  const out = { ...stats };
  def.passive?.modify?.(out, ctx);
  return out;
}

export function createUnit(def) {
  return {
    uid: nextUid++,
    def,
    tier: def.tier,
    level: 0,
    spent: def.price,
    stats: levelStats(def, 0),
    placed: false,
    col: -1,
    row: -1,
    x: 0,
    y: 0,
    cooldown: 0,
    angle: 0,
    facing: 1,
    recoil: 0,
    kills: 0,
    damageDealt: 0,
    placedAt: 0,
  };
}
