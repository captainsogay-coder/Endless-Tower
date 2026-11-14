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
//    buffs?: [{ id, radius, damageMult?, cooldownMult?, rangeMult?, levelScale? }], // allies in radius (Infinity = map-wide,
//                                         // 'range' = its attack range); same id never stacks; levelScale grows it per upgrade
//    economy?: { id, coinMult },          // battle-wide coin gain; same id never stacks
//    summon?: { every, kind, speed, damageFactor, splash, explosive?, onHit? }, // secondary drone launches
//    ability?: { id, ...numbers },        // special behaviour (src/game/abilities.js); all tuning lives here
//    passive.watches?: [unitId],          // re-evaluate the passive when these units are deployed/sold
//                                         // (ctx.count(id) = player-deployed copies; summoned allies never count)
//    art: string,                         // key into src/render/unitArt.js
//    onFire?(unit, target, game), onUpdate?(unit, dt, game), onPlace?(unit, game)
//  }
// ─────────────────────────────────────────────────────────────────────────────

import { registerUnit, getUnit, registerAllyDef, getAllyDef } from './unitRegistry.js';
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
import { WILD_WEST_UNITS } from './defs/wildWest.js';
import { GAMBINO_UNITS } from './defs/gambino.js';
import { NUCLEAR_WAR_UNITS, BATTALION_SOLDIER } from './defs/nuclearWar.js';
import { VILLAGE_UNITS, GUARD_UNITS, SIEGE_UNITS, MEDIEVAL_ALLIES } from './defs/medieval.js';
import { PACK2_UNITS } from './defs/pack2.js';

export const ROSTER = [dude, cadet, gunnerman, grenadeLauncher, tank, specialForces, drone, commander, colonel, general, fortress, ...WILD_WEST_UNITS, ...GAMBINO_UNITS, ...NUCLEAR_WAR_UNITS, ...VILLAGE_UNITS, ...GUARD_UNITS, ...SIEGE_UNITS, ...PACK2_UNITS];

/** Temporary combatants created by abilities (never summoned, listed or deployed). */
export const ALLY_DEFS = [BATTALION_SOLDIER, ...MEDIEVAL_ALLIES];

/** Units every new player owns. Everything else is obtained by summoning. */
export const STARTER_UNITS = ['dude'];

export function registerRoster() {
  for (const def of ROSTER) if (!getUnit(def.id)) registerUnit(def);
  for (const def of ALLY_DEFS) if (!getAllyDef(def.id)) registerAllyDef(def);
}
