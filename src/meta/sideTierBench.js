// Side-tier measurement bench. Runs real headless battles with the game's own
// simulation and turns what a unit actually does into five independent values.
// Used by scripts/side-tiers.mjs (writes src/units/sideTiers.data.js) and by the
// tests; the game itself only reads the generated table.
//
// Every scenario: wave 10 (so wave scaling counts), level 0, no weather, a
// fixed map, the unit standing next to the road.
//
//   DPS     – own damage per second on one boss-like target (crits, every-Nth
//             shots, timed strikes, self-buffs and its own debuffs all count),
//             × (range / reference range)^rangeCost – the same value the tier
//             system puts on reach. Summoned allies and drones are excluded.
//   AOE     – extra own damage per second on a pack of 10 enemies compared with
//             the single target (splash, chains, zones, burning ground…), plus
//             crowd control: every enemy-second of slow/hold is worth 2 reference
//             DPS (enemies stay longer in the defence).
//   Summon  – damage per second of everything the unit creates (allies and the
//             drones it launches as a secondary attack) during a 90 s fight, so
//             uptime and cooldowns count.
//   Empower – how much it raises a reference squad's damage (buffs to allies and
//             debuffs on enemies), as a share, applied to a reference army
//             (8 × Tier VI). Only own-type buffs count 35%, faction-only 75%.
//   Economy – extra coins per minute in a 150 s battle where a fixed squad kills
//             a steady stream (kill rewards that would have been paid anyway are
//             removed), minus the unit's own price over a 3-minute stretch.
//
// Values are converted to the overall tier scale: DPS-like values use the
// Cadet's measured DPS × tierPower(t); Economy uses tierPrice(t) (= the net
// coins would buy a Tier t unit).

import { Game } from '../game/Game.js';
import { sampleRoute } from '../maps/mapGenerator.js';
import { getUnit, listUnits } from '../units/unitRegistry.js';
import { waveScaling } from '../waves/scaling.js';
import { TIERS, tierPower, waveDamageBonus } from '../balance.js';
import { statusSpeedMultiplier } from '../game/effects.js';
import { levelStats } from '../units/unitStats.js';

export const BENCH = {
  seed: 11,
  wave: 10,
  step: 1 / 30,
  singleTime: 60,
  packTime: 90,
  packSize: 10,
  packSpacing: 10,
  slowWeight: 2,
  squadTime: 45,
  squadOffsets: [-5, -3, -1.5, 1.5, 3, 5], // tiles along the road from the unit
  armyTier: 6,
  armySize: 8,
  coverage: { all: 1, faction: 0.75, self: 0.35 },
  econTime: 150,
  econWarmup: 20,
  econEvery: 0.6,
  econKiller: 'guard-sergeant',
  econKillers: [-4, -2, 2, 4],
  econHp: 0.35,
  econPeriodMin: 3,
  /** below these a category is N/A (in reference-DPS units, or coins/min) */
  naAoe: 0.25,
  naSummon: 0.1,
  naEmpower: 0.25,
  naEconPerMin: 2,
};

const UNKILLABLE = 1e15;

function arena(ids) {
  const g = new Game({ seed: BENCH.seed, loadout: [...new Set(ids)], weatherEnabled: false });
  g.coins = 1e12;
  g.towerHp = g.towerMaxHp = 1e15;
  g.stats.wavesCleared = BENCH.wave - 1;
  const route = g.map.routes[0];
  return { g, route };
}

const roadPoint = (route, d) => {
  const at = { x: 0, y: 0, dx: 0, dy: 0 };
  sampleRoute(route, Math.max(0, Math.min(route.length, d)), at, 0);
  return at;
};

/** Free buildable tile closest to a point. */
function tileNear(g, x, y) {
  let best = null;
  for (let r = 0; r < g.map.rows; r++)
    for (let c = 0; c < g.map.cols; c++) {
      if (!g.canPlace(c, r)) continue;
      const d = (c * 32 + 16 - x) ** 2 + (r * 32 + 16 - y) ** 2;
      if (!best || d < best.d) best = { c, r, d };
    }
  return best;
}

/** Road distance closest to a unit (so even melee units reach their target). */
function nearestRoadD(route, x, y) {
  let bestD = 0;
  let best = Infinity;
  const at = { x: 0, y: 0, dx: 0, dy: 0 };
  for (let d = 0; d < route.length; d += 4) {
    sampleRoute(route, d, at, 0);
    const dd = (at.x - x) ** 2 + (at.y - y) ** 2;
    if (dd < best) {
      best = dd;
      bestD = d;
    }
  }
  return bestD;
}

function deployAt(g, id, x, y) {
  const t = tileNear(g, x, y);
  return g.deploy(id, t.c, t.r);
}

function waveCtx() {
  const s = waveScaling(BENCH.wave);
  return { number: BENCH.wave, alive: 0, plan: { scaling: s } };
}

function dummy(g, wv, d, { hp = UNKILLABLE, still = true } = {}) {
  const e = g.spawnEnemy({ category: 'regular', route: 0, offset: d }, wv);
  if (still) {
    e.hp = e.maxHp = hp;
    e.reward = 0;
    e.speed = 0;
  }
  return e;
}

function run(g, T, each = null) {
  for (let t = 0; t < T; t += BENCH.step) {
    g.update(BENCH.step);
    each?.(BENCH.step);
  }
}

const own = (u) => u.damageDealt - (u.droneDamage ?? 0);

/** Upgrades a freshly deployed unit to BENCH.level (0 by default; tests compare at max level too). */
function upgraded(g, u) {
  while (u.level < (BENCH.level ?? 0) && g.upgrade(u)) {
    /* keep upgrading */
  }
  return u;
}

/** Where the unit stands: next to the road, 40% along the first route. */
function anchor(g, route) {
  const p = roadPoint(route, route.length * 0.4);
  return tileNear(g, p.x, p.y);
}

// ---------------------------------------------------------------- scenarios

function single(def) {
  const { g, route } = arena([def.id]);
  const a = anchor(g, route);
  const u = upgraded(g, g.deploy(def.id, a.c, a.r));
  dummy(g, waveCtx(), nearestRoadD(route, u.x, u.y));
  run(g, BENCH.singleTime);
  return { own: own(u) / BENCH.singleTime, range: u.stats.range };
}

function pack(def) {
  const { g, route } = arena([def.id]);
  const a = anchor(g, route);
  const u = upgraded(g, g.deploy(def.id, a.c, a.r));
  const d0 = nearestRoadD(route, u.x, u.y);
  const wv = waveCtx();
  const foes = [];
  for (let k = 0; k < BENCH.packSize; k++) foes.push(dummy(g, wv, d0 + (k - (BENCH.packSize - 1) / 2) * BENCH.packSpacing));
  let slowSec = 0;
  run(g, BENCH.packTime, (dt) => {
    for (const e of foes) {
      if (e.gravity && e.gravity.until > g.time) slowSec += dt;
      else if (e.statuses) slowSec += (1 - statusSpeedMultiplier(e, g.time)) * dt;
    }
  });
  return { own: own(u) / BENCH.packTime, summon: (u.summonDamage ?? 0) / BENCH.packTime, slow: slowSec / BENCH.packTime };
}

/** True when each copy makes the other copies of the same unit stronger (e.g. Dude Power). */
function buffsOwnCopies(def) {
  const b = def.passive?.bonus;
  if (!b) return false;
  const ctx = (n) => ({ deployed: n, count: () => 0, countFaction: () => 0, factionOthers: 0 });
  try {
    return b(ctx(4)) > b(ctx(1)) + 1e-9;
  } catch {
    return false;
  }
}

/** Which squad a unit's buffs are judged on, and how much of an army they can reach. */
export function squadFor(def) {
  if (buffsOwnCopies(def)) return { id: def.id, coverage: BENCH.coverage.self };
  if (def.faction) {
    const base = listUnits()
      .filter((u) => u.faction === def.faction)
      .sort((a, b) => a.tier - b.tier)[0];
    return { id: base.id, coverage: BENCH.coverage.faction };
  }
  return { id: 'cadet', coverage: BENCH.coverage.all };
}

function squad(def, squadId) {
  const { g, route } = arena(def ? [def.id, squadId] : [squadId]);
  const a = anchor(g, route);
  const ax = a.c * 32 + 16;
  const ay = a.r * 32 + 16;
  const d0 = nearestRoadD(route, ax, ay);
  // the unit's tile is reserved first so the squad stands in the same spots with and without it
  const u = def ? g.deploy(def.id, a.c, a.r) : null;
  const members = [];
  for (const off of BENCH.squadOffsets) {
    const p = roadPoint(route, d0 + off * 32);
    members.push(deployAt(g, squadId, p.x, p.y));
  }
  const wv = waveCtx();
  for (let d = d0 - 8 * 32; d <= d0 + 8 * 32; d += 16) dummy(g, wv, d);
  run(g, BENCH.squadTime);
  return members.reduce((s, m) => s + m.damageDealt + (m.summonDamage ?? 0), 0) / BENCH.squadTime;
}

function economy(def) {
  const ids = def ? [def.id, BENCH.econKiller] : [BENCH.econKiller];
  const { g, route } = arena(ids);
  const a = anchor(g, route);
  const ax = a.c * 32 + 16;
  const ay = a.r * 32 + 16;
  const d0 = nearestRoadD(route, ax, ay);
  if (def) g.deploy(def.id, a.c, a.r);
  for (const off of BENCH.econKillers) {
    const p = roadPoint(route, d0 + off * 32);
    deployAt(g, BENCH.econKiller, p.x, p.y);
  }
  const wv = waveCtx();
  let killedReward = 0;
  g.on('death', (e) => (killedReward += e.reward));
  const coins0 = g.coins;
  let spawnT = 0;
  run(g, BENCH.econTime, (dt) => {
    spawnT -= dt;
    if (spawnT <= 0 && g.time < BENCH.econTime - BENCH.econWarmup) {
      spawnT = BENCH.econEvery;
      const e = g.spawnEnemy({ category: 'regular', route: 0, offset: 0 }, wv);
      e.hp = e.maxHp = e.maxHp * BENCH.econHp; // the killers clear the stream with or without the unit
    }
  });
  return { coins: g.coins - coins0, killedReward, leaks: g.stats.leaks };
}

// ---------------------------------------------------------------- conversion

/** Continuous inverse of tierPower: the (fractional) tier whose power equals `p`. */
export function tierForPower(p) {
  if (!(p > 0)) return 0;
  const p1 = tierPower(1);
  if (p <= p1) return p / p1;
  let t = 1;
  while (tierPower(t + 1) < p && t < 60) t++;
  const lo = tierPower(t);
  const hi = tierPower(t + 1);
  return t + (p - lo) / (hi - lo);
}

const round1 = (v) => Math.round(v * 10) / 10;

/** Context shared by every unit in one bench run (reference values, baselines). */
export function benchContext() {
  const cadet = getUnit('cadet');
  const c = single(cadet);
  const refDps = c.own * rangeFactor(c.range);
  const squads = new Map();
  const baseEcon = economy(null);
  return { refDps, squadBase: (id) => (squads.has(id) ? squads.get(id) : squads.set(id, squad(null, id)).get(id)), baseEcon };
}

function rangeFactor(range) {
  return (range / TIERS.refRange) ** TIERS.rangeCost;
}

/** Measures one unit type. Returns raw values and ratings (null = N/A). */
export function measureUnit(def, ctx) {
  const { refDps } = ctx;
  const s = single(def);
  const p = pack(def);
  const sq = squadFor(def);
  const base = ctx.squadBase(sq.id);
  const withU = squad(def, sq.id);
  const ec = economy(def);
  const be = ctx.baseEcon;

  const dpsV = s.own * rangeFactor(s.range);
  const aoeV = Math.max(0, p.own - s.own) + p.slow * BENCH.slowWeight * refDps;
  const summonV = p.summon;
  const uplift = base > 0 ? Math.max(0, withU / base - 1) : 0;
  const armyDps = refDps * tierPower(BENCH.armyTier) * BENCH.armySize;
  const empowerV = uplift * sq.coverage * armyDps;
  // coins that only exist because of this unit: total change minus kill rewards (at ×1)
  const minutes = (BENCH.econTime - BENCH.econWarmup) / 60;
  const grossPerMin = Math.max(0, (ec.coins - be.coins - (ec.killedReward - be.killedReward)) / minutes);
  const net = grossPerMin * BENCH.econPeriodMin - def.price;

  // auto-attack only: damage per hit × hits × attacks per second, nothing from abilities
  const st = levelStats(def, 0);
  const baseDps = st.damage * (1 + waveDamageBonus(def.tier, BENCH.wave - 1)) * st.rate * (def.profile?.hits ?? 1);
  const dr = (v, na) => (v >= na * refDps ? round1(Math.max(1, tierForPower(v / refDps))) : null);
  const econ =
    grossPerMin >= BENCH.naEconPerMin
      ? round1(Math.max(1, net > 0 ? tierForPower((net / TIERS.basePrice) ** (1 / TIERS.priceExponent)) : 0))
      : null;
  return {
    ratings: {
      dps: dpsV > 0 ? round1(Math.max(1, tierForPower(dpsV / refDps))) : null,
      aoe: dr(aoeV, BENCH.naAoe),
      summon: dr(summonV, BENCH.naSummon),
      empower: dr(empowerV, BENCH.naEmpower),
      economy: econ,
    },
    raw: {
      // comparison sheet: what one copy actually does (wave 10, level 0)
      hit: round1(st.damage * (1 + waveDamageBonus(def.tier, BENCH.wave - 1))),
      hits: def.profile?.hits ?? 1,
      rate: Math.round(st.rate * 100) / 100,
      range: Math.round(st.range),
      baseDps: round1(baseDps),
      singleDps: round1(s.own),
      packDps: round1(p.own),
      abilityShare: baseDps > 0 ? Math.round((s.own / baseDps - 1) * 100) / 100 : 0,
      combat: round1(Math.max(1, tierForPower((Math.sqrt(dpsV * (dpsV + aoeV)) + summonV) / refDps))),
      dps: round1(dpsV),
      aoe: round1(aoeV),
      summon: round1(summonV),
      empower: round1(empowerV),
      uplift: Math.round(uplift * 1000) / 1000,
      grossPerMin: Math.round(grossPerMin),
      net: Math.round(net),
      payback: grossPerMin > 0 ? Math.round((def.price / grossPerMin) * 60) : null,
    },
  };
}

export const benchStats = (def) => levelStats(def, 0);

/**
 * A unit's OWN fighting value relative to the Cadet (plain Tier I rifleman):
 * √(single-target × swarm), with reach credited exactly as the tier system
 * charges for it. Abilities that deal damage count; buffs, summons and income
 * do not (those are utility, paid for by the role share). Measured at the
 * bench's current wave, level 0.
 */
export function ownCombat(def, ref = null) {
  const s = single(def);
  const p = pack(def);
  const sv = s.own * rangeFactor(s.range);
  const pv = p.own * rangeFactor(s.range);
  if (!ref) return { single: sv, pack: pv };
  return { single: sv, pack: pv, value: Math.sqrt(Math.max(0, sv / ref.single) * Math.max(0, pv / ref.pack)) };
}
