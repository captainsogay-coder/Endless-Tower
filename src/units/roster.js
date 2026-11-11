// ─────────────────────────────────────────────────────────────────────────────
//  UNIT ROSTER
//
//  Each unit is a self-contained definition module in ./defs. Add a module,
//  list it here, and it is registered at startup, appears in Battle Plans and
//  becomes deployable – nothing else needs to change.
//
//  Definition schema:
//  {
//    id, name, tier (integer ≥ 1), role, description,
//    price: number,                       // gold per deployed copy
//    targeting?: 'first' | 'last' | 'strongest' | 'closest',
//    projectile?: { kind, speed },        // visual style + px/s
//    levels: [                            // [0] = base, [1..] = upgrades
//      { damage, range, rate, cost? },    //   range in px (1 tile = 32), rate = attacks/s
//    ],
//    passive?: { id, name, summary, formula?, modify(stats, ctx), bonus?(ctx) },
//                                         // ctx = { deployed } copies of this unit on the field
//    art: string,                         // key into src/render/unitArt.js
//    onFire?(unit, target, game), onUpdate?(unit, dt, game), onPlace?(unit, game)
//  }
// ─────────────────────────────────────────────────────────────────────────────

import { registerUnit, getUnit } from './unitRegistry.js';
import dude from './defs/dude.js';

export const ROSTER = [dude];

/** Units every new player owns. */
export const STARTER_UNITS = ['dude'];

export function registerRoster() {
  for (const def of ROSTER) if (!getUnit(def.id)) registerUnit(def);
}
