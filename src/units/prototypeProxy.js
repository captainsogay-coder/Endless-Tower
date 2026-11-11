// Prototype proxies are NOT units. They are a neutral, tier-parameterised test
// harness that keeps the prototype playable while the real roster does not
// exist yet. They are used only when the roster is empty and disappear
// automatically as soon as any real unit is registered.

import { getTier } from './tiers.js';

const cache = new Map();

export function getProxyDef(tier) {
  let def = cache.get(tier);
  if (def) return def;
  const t = getTier(tier);
  def = Object.freeze({
    id: `proxy-t${tier}`,
    name: 'Prototype Proxy',
    tier,
    isProxy: true,
    summonWeight: 1,
    targeting: 'first',
    color: t.color,
    stats: Object.freeze({
      damage: Math.round(14 * t.power),
      range: Math.min(230, 104 + 9 * (tier - 1)),
      rate: Math.min(2.6, 1.1 + 0.08 * (tier - 1)),
      projectileSpeed: 540,
      splash: 0,
    }),
  });
  cache.set(tier, def);
  return def;
}
