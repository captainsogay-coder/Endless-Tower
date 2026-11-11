// Screenshots a forced encounter (swarm / boss) for visual review.
// Usage: node scripts/encounters.mjs [baseUrl]
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const base = process.argv[2] ?? 'http://localhost:8080';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
const shots = [
  { realm: 'sky', arch: 'swarm', wave: 30, wait: 9000, name: 'enc-swarm' },
  { realm: 'volcanic', arch: 'boss', wave: 40, wait: 1800, name: 'enc-boss-intro' },
  { realm: 'volcanic', arch: 'boss', wave: 40, wait: 7000, name: 'enc-boss' },
  { realm: 'ruins', arch: 'commando', wave: 45, wait: 9000, name: 'enc-commando' },
  { realm: 'frozen', arch: 'army', wave: 60, wait: 8000, name: 'enc-army' },
  { realm: 'mechanical', arch: 'army', wave: 3, wait: 3000, name: 'mech' },
  { realm: 'forest', arch: 'army', wave: 3, wait: 3000, name: 'forest2' },
];
for (const s of shots) {
  await page.goto(`${base}/?realm=${s.realm}&seed=${process.env.SEED ?? 7}`);
  await page.waitForTimeout(300);
  await page.click('#btn-battle');
  await page.waitForTimeout(200);
  await page.evaluate(async ({ arch, wave }) => {
    const { composePlan } = await import('/src/waves/waveDirector.js');
    const { getArchetype } = await import('/src/waves/archetypes.js');
    const { createRng } = await import('/src/core/rng.js');
    const { game } = window.endlessTower;
    game.gold = 1e6;
    game.wave = wave - 1;
    const spots = [];
    for (let y = 0; y < game.map.rows; y++) for (let x = 0; x < game.map.cols; x++) {
      const i = y * game.map.cols + x;
      if (game.map.grid[i] === 0 && game.map.pathDist[i] <= 2) spots.push([x, y]);
    }
    for (let k = 0; k < 80 && spots.length; k++) {
      const p = spots.splice(Math.floor(Math.random() * spots.length), 1)[0];
      const u = game.deploy('dude', p[0], p[1]);
      for (let l = 0; l < k % 6; l++) game.upgrade(u);
    }
    game.nextPlan = composePlan(getArchetype(arch), wave, createRng(5), game.map.routes.length);
    game.startNextWave();
  }, s);
  await page.waitForTimeout(s.wait);
  await page.screenshot({ path: `screenshots/${s.name}.png` });
}
console.log(errors.length ? errors.join('\n') : 'no errors');
await browser.close();
