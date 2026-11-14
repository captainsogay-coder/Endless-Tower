// Balance report. Runs real headless battles (same simulation as the game) and
// prints the numbers used to tune progression.
//
//   node scripts/balance.mjs tokens            Token income and summon frequency
//   node scripts/balance.mjs units [W...]      every unit: DPS, kill time, value per coin at waves
//   node scripts/balance.mjs bot [maxWave]     a simple bot plays several loadouts until the Tower falls
//   add --before to any mode to switch the new balance layer off (old values)
//
// "units": one copy at the level a player would typically have reached
// (wave 1 → Lv 0, 10 → Lv 2, 25 → Lv 4, 50+ → Lv 5), next to the road, wave
// scaling for (wave − 1) completed waves. Two scenarios, 30 s each:
//   single – one wave-scaled Regular (single-target damage, incl. crits, marks…)
//   crowd  – a stream of wave-scaled Regulars (AOE, chains, summons all count)
// Enemies are made unkillable so damage is measured, not overkill.
import { Game } from '../src/game/Game.js';
import { sampleRoute } from '../src/maps/mapGenerator.js';
import { registerRoster, ROSTER } from '../src/units/roster.js';
import { maxLevel, upgradeCost } from '../src/units/unitStats.js';
import { waveScaling } from '../src/waves/scaling.js';
import { BALANCE, tokensForWave, tierPower } from '../src/balance.js';
import { getBanner, listBanners } from '../src/units/summoning.js';

registerRoster();
const args = process.argv.slice(2);
const before = args.includes('--before');
if (before) {
  BALANCE.tokens = { base: 100, milestoneEvery: 10, milestoneBonus: 0 };
  BALANCE.global = { damageMult: 1, rangeMult: 1, cooldownMult: 1, abilityCoinMult: 1 };
  BALANCE.upgrades = { damagePerLevel: 0, rangePerLevel: 0, ratePerLevel: 0 };
  BALANCE.waveScaling = [];
}
const mode = args.find((a) => !a.startsWith('--')) ?? 'units';
const nums = args.filter((a) => /^\d+$/.test(a)).map(Number);
const fmt = (v) => (v >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : v >= 1e4 ? `${(v / 1e3).toFixed(0)}k` : v >= 100 ? v.toFixed(0) : v.toFixed(1));
const levelFor = (w) => (w <= 1 ? 0 : w <= 10 ? 2 : w <= 25 ? 4 : 5);

function investment(def, level) {
  let c = def.price;
  for (let l = 0; l < level; l++) c += upgradeCost(def, l);
  return c;
}

/** Damage per second of one copy against wave-`wave` Regulars. */
function measure(def, wave, scenario, opts = {}) {
  const g = new Game({ seed: 11, loadout: [def?.id ?? 'cadet', 'cadet'], weatherEnabled: false });
  g.coins = 1e12;
  g.towerHp = g.towerMaxHp = 1e15;
  g.stats.wavesCleared = wave - 1;
  const level = def ? Math.min(opts.level ?? levelFor(wave), maxLevel(def)) : 0;
  const route = g.map.routes[0];
  // stand next to the road a third of the way along it
  const mid = route.tiles[Math.floor(route.tiles.length * 0.35)];
  let best = null;
  for (let r = 0; r < g.map.rows; r++) for (let c = 0; c < g.map.cols; c++) if (g.canPlace(c, r)) {
    const d = Math.hypot(c - mid.x, r - mid.y);
    if (!best || d < best.d) best = { c, r, d };
  }
  // team scenario: a reference squad of six Cadets around the spot (same level as the unit)
  if (opts.team) {
    const near = [];
    for (let r = 0; r < g.map.rows; r++) for (let c = 0; c < g.map.cols; c++) if (g.canPlace(c, r) && !(c === best.c && r === best.r)) near.push([c, r, Math.hypot(c - mid.x, r - mid.y)]);
    near.sort((a, b) => a[2] - b[2]);
    for (const [c, r] of near.slice(0, 6)) {
      const cu = g.deploy('cadet', c, r);
      while (cu.level < (opts.level ?? levelFor(wave))) g.upgrade(cu);
    }
  }
  if (def) {
    const u = g.deploy(def.id, best.c, best.r);
    while (u.level < level) g.upgrade(u);
  }
  const s = waveScaling(wave);
  const plan = { scaling: s };
  const wv = { number: wave, alive: 0, plan };
  const spawn = (offset) => {
    const e = g.spawnEnemy({ category: 'regular', route: 0, offset }, wv);
    e.hp = e.maxHp = 62 * s.hp * 1e6; // unkillable: we measure damage
    e.reward = 0;
    return e;
  };
  let total = 0;
  const hp0 = new Map();
  const track = (e) => hp0.set(e, e.hp);
  if (scenario === 'single') {
    // the dummy stands on the stretch of road closest to the unit, so short-reach melee units can hit it too
    const ux = best.c * 32 + 16;
    const uy = best.r * 32 + 16;
    const at = { x: 0, y: 0, dx: 0, dy: 0 };
    let nearD = 0;
    let nearDist = Infinity;
    for (let d = 0; d < route.length; d += 4) {
      sampleRoute(route, d, at, 0);
      const dd = (at.x - ux) ** 2 + (at.y - uy) ** 2;
      if (dd < nearDist) {
        nearDist = dd;
        nearD = d;
      }
    }
    const e = spawn(nearD);
    e.speed = 0;
    track(e);
  }
  const T = 30;
  const step = 1 / 30;
  let spawnT = 0;
  for (let t = 0; t < T; t += step) {
    if (scenario === 'crowd') {
      spawnT -= step;
      if (spawnT <= 0) {
        spawnT = 0.35; // a steady column of Regulars
        for (let k = 0; k < 3; k++) track(spawn(-k * 10));
      }
    }
    g.update(step);
  }
  for (const [e, h] of hp0) total += h - e.hp;
  return { dps: total / T, level, cost: def ? investment(def, level) : 0, hp: 62 * s.hp };
}

if (mode === 'tiers') {
  // Tier hierarchy at wave 1 (no wave scaling), level 0 and level 5:
  //   single – own DPS on one target (boss-like)
  //   team   – battlefield contribution: (6 Cadets + unit) − (6 Cadets) on a crowd,
  //            so buffs, summons and area damage all count
  //   value  – geometric mean of single and team, normalised to the T1 average
  const res = [];
  const lv = nums[0] ?? 0;
  const baseTeam = measure(null, 1, 'crowd', { team: true, level: lv }).dps;
  for (const def of ROSTER) {
    const single = measure(def, 1, 'single', { level: lv }).dps;
    const team = measure(def, 1, 'crowd', { team: true, level: lv }).dps - baseTeam;
    res.push({ id: def.id, tier: def.tier, price: def.price, single, team });
  }
  // reference: the Cadet – the plain T1 rifleman with no ability (1.0× by definition)
  const ref = res.find((r) => r.id === 'cadet');
  const n1s = ref.single;
  const n1t = ref.team;
  for (const r of res) r.value = Math.sqrt(Math.max(0, r.single / n1s) * Math.max(0, r.team / n1t));
  console.log(`${before ? 'BEFORE' : 'AFTER'} – level ${lv}, wave 1. single/team relative to the Cadet (plain T1); value = √(single × team)`);
  for (const r of res.sort((a, b) => a.tier - b.tier || a.value - b.value)) {
    console.log(`T${String(r.tier).padStart(2)} ${r.id.padEnd(24)} price ${String(r.price).padStart(5)}  single ${(r.single / n1s).toFixed(2).padStart(6)}×  team ${(r.team / n1t).toFixed(2).padStart(6)}×  value ${r.value.toFixed(2).padStart(6)}×  target ${tierPower(r.tier).toFixed(1)}×`);
  }
  const tiers = [...new Set(res.map((r) => r.tier))];
  console.log('tier averages (value):', tiers.map((t) => `T${t} ${(res.filter((r) => r.tier === t).reduce((a, r) => a + r.value, 0) / res.filter((r) => r.tier === t).length).toFixed(2)}`).join('  '));
  if (args.includes('--json')) console.log(JSON.stringify(res));
} else if (mode === 'tokens') {
  console.log(before ? 'BEFORE' : 'AFTER', 'token formula', JSON.stringify(BALANCE.tokens));
  let cum = 0;
  const marks = [1, 5, 10, 25, 50, 100, 250];
  const rows = [];
  for (let w = 1; w <= 250; w++) {
    cum += tokensForWave(w);
    if (marks.includes(w)) rows.push({ wave: w, perWave: tokensForWave(w), total: cum });
  }
  for (const r of rows) console.log(`wave ${String(r.wave).padStart(3)}  +${String(r.perWave).padStart(4)}/wave  cumulative ${String(r.total).padStart(7)}`);
  const firstPull = (price) => {
    let c = 0;
    for (let w = 1; w < 1e4; w++) if ((c += tokensForWave(w)) >= price) return w;
    return null;
  };
  for (const b of listBanners().filter((x) => x.currency === 'tokens')) {
    console.log(`${b.name.padEnd(28)} first ×1 after wave ${firstPull(b.price)}, first ×10 after wave ${firstPull(b.price * 10)}, pulls by wave 50: ${Math.floor(rows.find((r) => r.wave === 50).total / b.price)}`);
  }
  void getBanner;
} else if (mode === 'units') {
  const waves = nums.length ? nums : [1, 10, 25, 50, 100, 250];
  console.log(before ? 'BEFORE (old balance)' : 'AFTER (new balance)');
  console.log('per wave: crowd DPS · kill time of one Regular (s, single target) · crowd DPS per 1k coins invested');
  const header = 'unit'.padEnd(26) + 'T'.padStart(3) + waves.map((w) => `w${w}`.padStart(22)).join('');
  console.log(header);
  const out = {};
  for (const def of ROSTER) {
    const cells = [];
    out[def.id] = {};
    for (const w of waves) {
      const single = measure(def, w, 'single');
      const crowd = measure(def, w, 'crowd');
      const ttk = single.hp / Math.max(1e-9, single.dps);
      const perK = (crowd.dps / crowd.cost) * 1000;
      out[def.id][w] = { crowd: crowd.dps, single: single.dps, ttk, perK, cost: crowd.cost };
      cells.push(`${fmt(crowd.dps)}·${ttk < 100 ? ttk.toFixed(1) : '>99'}s·${fmt(perK)}`.padStart(22));
    }
    console.log(def.id.padEnd(26) + String(def.tier).padStart(3) + cells.join(''));
  }
  if (args.includes('--json')) console.log(JSON.stringify(out));
} else if (mode === 'bot') {
  // Bot: keeps up to 40 units near the road. Deploys the most expensive loadout unit it can
  // afford (so a Dude bot saves nothing, a Dude+General bot builds Dudes until Generals are
  // affordable), otherwise buys the cheapest upgrade. Calls one wave at a time.
  const maxWave = nums[0] ?? 250;
  const { TileType, tileIndex } = await import('../src/maps/mapGenerator.js');
  const { getUnit } = await import('../src/units/unitRegistry.js');
  const ALL = [['dude'], ['cadet'], ['drunkard'], ['gunnerman'], ['bandit'], ['special-forces'], ['gambler'], ['dude', 'grenade-launcher'], ['dude', 'tank'], ['dude', 'drone'], ['dude', 'commander'], ['dude', 'outlaw'], ['dude', 'bounty-hunter'], ['dude', 'special-force-battalion'], ['dude', 'missile-launcher'], ['dude', 'night-dancer'], ['dude', 'dealer'], ['dude', 'general'], ['dude', 'gunslinger'], ['dude', 'desperate-gambler'], ['dude', 'icbm'], ['dude', 'bomber'], ['dude', 'sheriff'], ['dude', 'outlaw-leader'], ['dude', 'pit-boss'], ['dude', 'b2'], ['dude', 'fortress'], ['dude', 'high-roller'], ['dude', 'fastest-hand'], ['dude', 'marshal'], ['dude', 'the-house'], ['dude', 'glorious-leader'], ['dude', 'nuclear-warhead'], ['dude', 'antimatter-warhead']];
  const MIXED = ALL.filter((l) => l.length > 1).map((l) => (l[1] === 'gunslinger' ? ['dude', 'gunslinger'] : ['dude', 'gunslinger', l[1]]));
  const loadouts = args.includes('--mixed') ? MIXED : args.includes('--all') ? ALL : ALL.filter((l) => ['dude', 'cadet', 'gunnerman', 'special-forces', 'grenade-launcher', 'general', 'fortress', 'the-house'].includes(l.at(-1)));
  const marks = [10, 25, 50, 100, 250];
  console.log(before ? 'BEFORE' : 'AFTER', 'bot: ≤40 units near the road, waves called one at a time');
  for (const lo of loadouts) {
    const g = new Game({ seed: 5, loadout: lo, weatherEnabled: false });
    const spots = [];
    // best coverage first: how much road (weighted by shared routes) lies within ~3 tiles
    const road = new Map();
    for (const r of g.map.routes) for (const t of r.tiles) road.set(t.y * g.map.cols + t.x, (road.get(t.y * g.map.cols + t.x) ?? 0) + 1);
    for (let y = 0; y < g.map.rows; y++) for (let x = 0; x < g.map.cols; x++) {
      if (g.map.grid[tileIndex(x, y)] !== TileType.GROUND) continue;
      let c = 0;
      for (const [k, w] of road) if (((k % g.map.cols) - x) ** 2 + (Math.floor(k / g.map.cols) - y) ** 2 <= 9) c += w;
      if (c > 0) spots.push([x, y, -c]);
    }
    spots.sort((a, b) => a[2] - b[2]);
    const defs = lo.map(getUnit).sort((a, b) => b.price - a.price);
    const atWave = {};
    const main = defs[0];
    // with three unit types: the most expensive is the main unit; one single-target escort per three mains
    const escort = defs.length > 2 ? defs[1] : null;
    const spend = () => {
      for (let guard = 0; guard < 500; guard++) {
        const free = spots.find(([x, y]) => g.canPlace(x, y));
        const room = g.units.length < 60 && free;
        const mains = g.units.filter((u) => u.def === main);
        // 1. the loadout's best unit whenever affordable (keeping an escort ratio of 1 : 3)
        if (escort && room && g.coins >= escort.price && g.units.filter((u) => u.def === escort).length * 3 < Math.max(1, g.units.filter((u) => u.def === main).length)) {
          g.deploy(escort.id, free[0], free[1]);
          continue;
        }
        if (room && g.coins >= main.price) {
          g.deploy(main.id, free[0], free[1]);
          continue;
        }
        // 2. a thin early screen of the cheapest unit
        const cheap = defs[defs.length - 1];
        if (room && g.units.length < 12 && g.coins >= cheap.price && (defs.length === 1 || !mains.length)) {
          g.deploy(cheap.id, free[0], free[1]);
          continue;
        }
        // 3. upgrades: main units first; fillers only once no main unit is waiting for coins
        let best = null;
        const pool = defs.length > 1 && mains.some((u) => !g.upgradeInfo(u).maxed) ? mains : g.units;
        for (const u of pool) {
          const info = g.upgradeInfo(u);
          if (!info.maxed && (!best || info.cost < best.cost)) best = { u, cost: info.cost };
        }
        const saving = defs.length > 1 && room && g.units.length >= 12 && (!best || best.u.def !== main);
        if (best && g.coins >= best.cost && !(saving && g.coins + best.cost > main.price)) g.upgrade(best.u);
        else break;
      }
    };
    let guard = 0;
    const t0 = Date.now();
    while (g.phase !== 'gameover' && g.wave < maxWave && guard++ < 2e7) {
      if (g.phase === 'build') {
        spend();
        if (marks.includes(g.wave)) atWave[g.wave] = g.units.map((u) => u.def.id[0]).join('').length;
        g.startNextWave();
      }
      g.update(1 / 20);
    }
    const lv = g.units.reduce((a, u) => a + u.level, 0) / Math.max(1, g.units.length);
    const mix = Object.entries(g.units.reduce((m, u) => ((m[u.def.id] = (m[u.def.id] ?? 0) + 1), m), {})).map(([k, v]) => `${k}×${v}`).join(' ');
    console.log(`${lo.join('+').padEnd(30)} wave ${String(g.wave).padStart(3)}  avg Lv ${lv.toFixed(1)}  tokens ${String(g.tokensEarned).padStart(6)}  ${mix}  (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
  }
}
