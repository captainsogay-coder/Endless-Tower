// ─────────────────────────────────────────────────────────────────────────────
//  UNIT ROSTER — intentionally empty.
//
//  Units are designed separately. Add definitions to ROSTER below and they are
//  registered at startup, become summonable, and automatically replace the
//  prototype proxies. Nothing else needs to change.
//
//  Definition schema:
//  {
//    id: string,                 // unique key
//    name: string,
//    tier: integer >= 1,         // any tier – the tier scale is unbounded
//    stats: {
//      damage: number,           // per hit
//      range: number,            // world pixels (1 tile = 32)
//      rate: number,             // attacks per second
//      projectileSpeed?: number, // px/s (default 520)
//      splash?: number,          // splash radius in px (default 0)
//    },
//    summonWeight?: number,      // relative odds within its tier (default 1)
//    targeting?: 'first' | 'last' | 'strongest' | 'closest',
//    color?: string,             // projectile / accent colour
//    // Optional hooks — all receive the live unit instance and the game:
//    render?(ctx, unit, time),   // custom drawing (world coordinates)
//    onFire?(unit, target, game),// replace the default projectile attack
//    onUpdate?(unit, dt, game),
//    onPlace?(unit, game),
//  }
// ─────────────────────────────────────────────────────────────────────────────

import { registerUnit } from './unitRegistry.js';

export const ROSTER = [];

export function registerRoster() {
  for (const def of ROSTER) registerUnit(def);
}
