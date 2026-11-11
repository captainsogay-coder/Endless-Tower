// Headless balance/stability simulation: a naive bot summons and places units
// greedily next to the road and plays until the tower falls (or a wave cap).
// Usage: node scripts/simulate.js [runs=5] [maxWave=60]
import { Game } from '../src/game/Game.js';
import { TileType, tileIndex } from '../src/maps/mapGenerator.js';
import { COLS, ROWS } from '../src/config.js';

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
        if (dx * dx + dy * dy <= 9) c += w;
      }
      cov[y * COLS + x] = c;
    }
  }
  return cov;
}

export function botStep(game) {
  game.summon(Math.floor(game.gold / game.summonCost));
  if (!game.bench.length) return;
  const { map } = game;
  if (!map._cov) map._cov = coverageMap(map);
  const spots = [];
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const i = tileIndex(x, y);
      if (map.grid[i] === TileType.GROUND && !game.unitByTile[i]) spots.push({ x, y, c: map._cov[i] });
    }
  }
  spots.sort((a, b) => b.c - a.c);
  // Highest tiers first onto the best spots.
  const bench = [...game.bench].sort((a, b) => b.tier - a.tier);
  for (const u of bench) {
    const s = spots.shift();
    if (!s) break;
    game.placeFromBench(u.def.id, s.x, s.y);
  }
}

export function simulate({ seed, biomeId, maxWave = 60, step = 1 / 30 } = {}) {
  const game = new Game({ seed, biomeId });
  const archetypes = [];
  let guard = 0;
  while (game.phase !== 'gameover' && game.wave < maxWave && guard++ < 5e6) {
    if (game.phase === 'build') {
      botStep(game);
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
    console.log(`run ${r} ${game.biome.id.padEnd(10)} reached wave ${String(game.wave).padStart(3)} hp ${game.towerHp}/${game.towerMaxHp} units ${game.units.length} topTier ${game.stats.highestTier} kills ${game.stats.kills} (${Date.now() - t0}ms)`);
    console.log('   ', archetypes.map((a) => a[0].toUpperCase()).join(''));
  }
}
