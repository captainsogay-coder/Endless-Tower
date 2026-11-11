// Captures a screenshot of every biome after a short battle. Requires a running
// server (npm start) and Playwright. Usage: node scripts/screenshot.mjs [baseUrl]
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const base = process.argv[2] ?? 'http://localhost:8080';
const biomes = (process.env.BIOMES ?? 'forest,volcanic,frozen,ruins,sky,mechanical').split(',');
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
for (const b of biomes) {
  await page.goto(`${base}/?realm=${b}&seed=${process.env.SEED ?? 42}`);
  await page.waitForTimeout(400);
  if (process.env.START) await page.screenshot({ path: `screenshots/start-${b}.png` });
  await page.evaluate(() => {
    const { game, actions } = window.endlessTower;
    actions.begin();
    game.gold = 5000;
    game.summon(40);
    // place along the road
    const spots = [];
    for (let y = 0; y < game.map.rows; y++) for (let x = 0; x < game.map.cols; x++) {
      const i = y * game.map.cols + x;
      if (game.map.grid[i] === 0 && game.map.pathDist[i] === 1) spots.push([x, y]);
    }
    for (const u of [...game.bench]) { const s = spots.splice(Math.floor(Math.random() * spots.length), 1)[0]; if (s) game.placeFromBench(u.def.id, s[0], s[1]); }
    // fast-forward to a mixed wave
    game.startNextWave();
  });
  await page.waitForTimeout(Number(process.env.WAIT ?? 6000));
  await page.screenshot({ path: `screenshots/${b}.png` });
}
console.log(errors.length ? errors.join('\n') : 'no errors');
await browser.close();
