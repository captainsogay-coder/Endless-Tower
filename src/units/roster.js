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
//    price: number,                       // coins per deployed copy
//    targeting?: 'first' | 'last' | 'strongest' | 'closest',
//    projectile?: { kind, speed },        // visual style + px/s
//    levels: [                            // [0] = base, [1..] = upgrades
//      { damage, range, rate, cost? },    //   range in px (1 tile = 32), rate = attacks/s
//    ],
//    passive?: { id, name, summary, formula?, modify(stats, ctx), bonus?(ctx) },
//                                         // ctx = { deployed } copies of this unit on the field
//    onHit?: [{ status, chance }],        // status rolled per enemy damaged (see game/effects.js)
//    impactHazard?: { kind, radius, duration, dpsFactor }, // ground left burning where shots land
//    buffs?: [{ id, radius, damageMult?, cooldownMult?, rangeMult? }], // allies in radius (Infinity = map-wide); same id never stacks
//    economy?: { id, coinMult },          // battle-wide coin gain; same id never stacks
//    summon?: { every, kind, speed, damageFactor, splash, explosive?, onHit? }, // secondary drone launches
//    art: string,                         // key into src/render/unitArt.js
//    onFire?(unit, target, game), onUpdate?(unit, dt, game), onPlace?(unit, game)
//  }
// ─────────────────────────────────────────────────────────────────────────────

import { registerUnit, getUnit } from './unitRegistry.js';
import dude from './defs/dude.js';
import cadet from './defs/cadet.js';
import gunnerman from './defs/gunnerman.js';
import grenadeLauncher from './defs/grenadeLauncher.js';
import tank from './defs/tank.js';
import specialForces from './defs/specialForces.js';
import drone from './defs/drone.js';
import commander from './defs/commander.js';
import colonel from './defs/colonel.js';
import general from './defs/general.js';
import fortress from './defs/fortress.js';

export const ROSTER = [dude, cadet, gunnerman, grenadeLauncher, tank, specialForces, drone, commander, colonel, general, fortress];

/** Units every new player owns. Everything else is obtained by summoning. */
export const STARTER_UNITS = ['dude'];

export function registerRoster() {
  for (const def of ROSTER) if (!getUnit(def.id)) registerUnit(def);
}
