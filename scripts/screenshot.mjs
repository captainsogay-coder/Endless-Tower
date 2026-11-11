// Captures Battle Plans and every realm mid-battle with a Dude army deployed.
// Requires a running server (npm start) and Playwright.
// Usage: node scripts/screenshot.mjs [baseUrl]   env: BIOMES=forest,sky SEED=42 WAIT=5000
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
await page.goto(`${base}/`);
await page.waitForTimeout(500);
await page.screenshot({ path: 'screenshots/battle-plans.png' });
for (const b of biomes) {
  await page.goto(`${base}/?realm=${b}&seed=${process.env.SEED ?? 42}`);
  await page.waitForTimeout(300);
  await page.click('#btn-battle');
  await page.waitForTimeout(300);
  await page.evaluate(() => {
    const { game } = window.endlessTower;
    game.coins = 4000;
    const spots = [];
    for (let y = 0; y < game.map.rows; y++) for (let x = 0; x < game.map.cols; x++) {
      const i = y * game.map.cols + x;
      if (game.map.grid[i] === 0 && game.map.pathDist[i] === 1) spots.push([x, y]);
    }
    for (let k = 0; k < 45 && spots.length; k++) {
      const s = spots.splice(Math.floor(Math.random() * spots.length), 1)[0];
      const u = game.deploy('dude', s[0], s[1]);
      if (u && k % 3 === 0) { game.upgrade(u); game.upgrade(u); }
    }
    game.startNextWave();
  });
  await page.waitForTimeout(Number(process.env.WAIT ?? 6000));
  await page.screenshot({ path: `screenshots/${b}.png` });
}
console.log(errors.length ? errors.join('\n') : 'no errors');
await browser.close();
