// Headless balance/stability simulation: a simple bot deploys its battle plan
// greedily next to the busiest stretch of road, upgrades when it can, and plays
// until the tower falls (or a wave cap).
// Usage: node scripts/simulate.js [runs=5] [maxWave=60]
import { Game } from '../src/game/Game.js';
import { TileType, tileIndex } from '../src/maps/mapGenerator.js';
import { COLS, ROWS } from '../src/config.js';
import { registerRoster } from '../src/units/roster.js';
import { getUnit } from '../src/units/unitRegistry.js';

registerRoster();

function coverageMap(map) {
  // How many route tiles (weighted by how many routes share them) each tile can reach.
  const weight = new Map();
  for (const r of map.routes) for (const t of r.tiles) weight.set(t.y * COLS + t.x, (weight.get(t.y * COLS + t.x) ?? 0) + 1);
  const cov = new Float32Array(COLS * ROWS);
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      let c = 0;
      for (const [k, w] of weight) {
        const dx = (k % COLS) - x;
        const dy = Math.floor(k / COLS) - y;
        if (dx * dx + dy * dy <= 5) c += w;
      }
      cov[y * COLS + x] = c;
    }
  }
  return cov;
}

/** Spend coins: alternate between deploying new copies and upgrading existing ones. */
export function botStep(game, unitId = 'dude') {
  const { map } = game;
  if (!map._cov) map._cov = coverageMap(map);
  const def = getUnit(unitId);
  const spots = [];
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const i = tileIndex(x, y);
      if (map.grid[i] === TileType.GROUND && !game.unitByTile[i] && map._cov[i] > 0) spots.push({ x, y, c: map._cov[i] });
    }
  }
  spots.sort((a, b) => b.c - a.c);
  for (let guard = 0; guard < 2000; guard++) {
    // cheapest upgrade available on the best-placed units
    let best = null;
    for (const u of game.units) {
      const info = game.upgradeInfo(u);
      if (!info.maxed && (!best || info.cost < best.cost)) best = { u, cost: info.cost };
    }
    const canDeploy = spots.length && game.coins >= def.price;
    const preferUpgrade = best && (!spots.length || game.units.length > 40) && game.coins >= best.cost;
    if (preferUpgrade) game.upgrade(best.u);
    else if (canDeploy) {
      const s = spots.shift();
      game.deploy(def.id, s.x, s.y);
    } else if (best && game.coins >= best.cost) game.upgrade(best.u);
    else break;
  }
}

export function simulate({ seed, biomeId, maxWave = 60, step = 1 / 30, loadout = ['dude'] } = {}) {
  const game = new Game({ seed, biomeId, loadout });
  const archetypes = [];
  let guard = 0;
  while (game.phase !== 'gameover' && game.wave < maxWave && guard++ < 5e6) {
    if (game.phase === 'build') {
      botStep(game, loadout[0]);
      game.startNextWave();
      archetypes.push(game.currentPlan.archetype);
    }
    game.update(step);
  }
  return { game, archetypes };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const runs = Number(process.argv[2] ?? 5);
  const maxWave = Number(process.argv[3] ?? 60);
  for (let r = 0; r < runs; r++) {
    const t0 = Date.now();
    const { game, archetypes } = simulate({ seed: 1000 + r, maxWave });
    const lv = game.units.reduce((s, u) => s + u.level, 0) / Math.max(1, game.units.length);
    console.log(`run ${r} ${game.biome.id.padEnd(10)} wave ${String(game.wave).padStart(3)} hp ${game.towerHp}/${game.towerMaxHp} dudes ${game.units.length} avgLv ${lv.toFixed(1)} kills ${game.stats.kills} (${Date.now() - t0}ms)`);
    console.log('   ', archetypes.map((a) => a[0].toUpperCase()).join(''));
  }
}
