// Drives real UI interactions (clicks, taps, keys) and screenshots the results.
// Usage: node scripts/interactions.mjs [baseUrl]
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const base = process.argv[2] ?? 'http://localhost:8080';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
const log = (...a) => console.log(...a);

await page.goto(`${base}/?realm=ruins&seed=11`);
await page.waitForTimeout(300);
// Battle Plans: deselect via slot ×, verify empty state, re-add via card, rename, battle
await page.click('.slot-x');
log('after remove:', await page.textContent('#plan-count'), await page.textContent('#plan-state'), 'battle disabled:', await page.isDisabled('#btn-battle'));
await page.screenshot({ path: 'screenshots/plans-empty.png' });
await page.click('.unit-card');
log('after add:', await page.textContent('#plan-count'), await page.textContent('#plan-state'));
await page.fill('#plan-name', 'Dude Ranch');
await page.click('#btn-battle');
await page.waitForTimeout(300);

// Deploy by keyboard slot, then one tap per unit on open ground near the road
await page.keyboard.press('1');
const pts = await page.evaluate(() => {
  const { game } = window.endlessTower;
  const out = [];
  for (let y = 0; y < 22 && out.length < 1; y++) for (let x = 0; x < 36; x++) {
    let ok = true;
    for (let k = 0; k < 5; k++) if (!game.canPlace(x + k, y) || game.map.pathDist[y * 40 + x + k] > 2) ok = false;
    if (ok) { out.push({ x, y }); break; }
  }
  return out[0];
});
const box = await page.locator('#game').boundingBox();
const sc = (x, y) => ({ x: box.x + ((x + 0.5) / 40) * box.width, y: box.y + ((y + 0.5) / 22) * box.height });
let p = sc(pts.x, pts.y);
for (let k = 0; k < 5; k++) { const q = sc(pts.x + k, pts.y); await page.mouse.click(q.x, q.y); await page.waitForTimeout(220); }
const st = await page.evaluate(() => {
  const { game } = window.endlessTower;
  return { deployed: game.deployedCount('dude'), coins: game.coins, dmg: game.units.map((u) => u.stats.damage) };
});
log('tap-deployed:', st);
await page.mouse.move(p.x, p.y + box.height / 22 * 2);
await page.screenshot({ path: 'screenshots/ui-placing.png' });
// select a Dude and upgrade with the panel button, then key U
await page.keyboard.press('Escape');
await page.mouse.click(p.x, p.y);
await page.waitForTimeout(100);
await page.evaluate(() => { window.endlessTower.game.coins += 500; });
await page.waitForTimeout(100);
await page.click('[data-act="upgrade"]');
await page.keyboard.press('u');
await page.waitForTimeout(150);
log('level after 2 upgrades:', await page.evaluate(() => window.endlessTower.renderer.ui.selected?.level));
await page.screenshot({ path: 'screenshots/ui-panel.png' });
// sell and verify Dude Power drops for the rest
await page.click('[data-act="sell"]');
log('after sell:', await page.evaluate(() => { const g = window.endlessTower.game; return { deployed: g.deployedCount('dude'), dmg: g.units.map((u) => +u.stats.damage.toFixed(2)) }; }));
// boss entrance
await page.evaluate(async () => {
  const { composePlan } = await import('/src/waves/waveDirector.js');
  const { getArchetype } = await import('/src/waves/archetypes.js');
  const { createRng } = await import('/src/core/rng.js');
  const { game } = window.endlessTower;
  game.wave = 19;
  game.nextPlan = composePlan(getArchetype('boss'), 20, createRng(3), game.map.routes.length);
  game.startNextWave();
});
await page.waitForTimeout(1600);
await page.screenshot({ path: 'screenshots/boss-intro.png' });
await page.waitForTimeout(3500);
await page.screenshot({ path: 'screenshots/boss.png' });
// retreat and confirm persistence after reload
await page.click('#btn-retreat');
await page.click('#btn-retreat-confirm');
await page.reload();
await page.waitForTimeout(300);
log('persisted plan:', await page.inputValue('#plan-name'), await page.textContent('#plan-count'));
console.log(errors.length ? errors.join('\n') : 'no errors');
await browser.close();
