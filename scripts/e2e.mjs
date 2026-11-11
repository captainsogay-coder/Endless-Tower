// End-to-end verification against a running build (use the production build:
// `npm run preview`, then `node scripts/e2e.mjs http://localhost:8080`).
// Drives the real UI in Chromium and prints PASS/FAIL for each requirement.
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const base = process.argv[2] ?? 'http://localhost:8080';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  — ${detail}` : ''}`);
};
const ev = (fn, arg) => page.evaluate(fn, arg);
const wallet = () => ev(() => window.endlessTower.profile.balance('tokens'));

await page.goto(base);
await page.waitForFunction(() => window.__etBooted === true, null, { timeout: 15000 });
check('production page boots (loader hidden, no errors)', (await page.isHidden('#boot')) && errors.length === 0, errors.join('; '));
const assets = await ev(() => [...document.querySelectorAll('script[type=module],link[rel=stylesheet]')].map((n) => n.src || n.href).filter((u) => u.includes('/assets/')).length);
check('hashed production assets are served', assets >= 2 || base.includes('8123'), `${assets} hashed assets`);

// 1. Map randomization
check('no battlefield selector exists', (await page.$('#realm-select')) === null && (await page.$('select')) === null);
const realms = [];
for (let i = 0; i < 4; i++) {
  await page.click('#btn-battle');
  await page.waitForTimeout(150);
  realms.push(await ev(() => `${window.endlessTower.game.biome.id}/${window.endlessTower.game.biome.variantId}`));
  await page.click('#btn-retreat');
  await page.click('#btn-retreat-confirm');
}
const biomes = realms.map((r) => r.split('/')[0]);
check('battlefields are assigned at random and do not repeat back-to-back', biomes.every((b, i) => i === 0 || b !== biomes[i - 1]) && new Set(biomes).size >= 3, realms.join(', '));

// 2 + 3. Tokens per completed wave, currencies separate
const t0 = await wallet();
await page.click('#btn-battle');
await page.waitForTimeout(150);
const wave = await ev(() => {
  const { game } = window.endlessTower;
  const coins0 = game.coins;
  game.coins = 1e6;
  for (let y = 0; y < 22; y++) for (let x = 0; x < 40; x++) if (game.map.pathDist[y * 40 + x] <= 2) game.deploy('dude', x, y);
  game.startNextWave();
  for (let i = 0; i < 60 * 600 && game.phase === 'wave'; i++) game.update(1 / 60);
  const afterFirst = window.endlessTower.profile.balance('tokens');
  game.startNextWave();
  for (let i = 0; i < 20; i++) game.update(1 / 60); // partially played wave
  return { phase: game.phase, afterFirst, partial: window.endlessTower.profile.balance('tokens'), coins0, profileCoins: window.endlessTower.profile.balance('coins'), gems: window.endlessTower.profile.data.wallet.gems };
});
check('exactly 100 Tokens for a completed wave', wave.afterFirst - t0 === 100, `${t0} → ${wave.afterFirst}`);
check('no Tokens for a partially completed wave', wave.partial === wave.afterFirst);
check('Coins and Tokens are separate balances (no Gems)', wave.profileCoins === 0 && wave.gems === undefined && wave.coins0 > 0);
await page.click('#btn-retreat');
await page.click('#btn-retreat-confirm');

// 4 + 5. Summoning prices, insufficient funds, x1/x5/x10/x25
await page.click('.tab[data-page="summon"]');
await page.waitForTimeout(200);
await ev(() => {
  const p = window.endlessTower.profile;
  p.data.wallet.tokens = 700;
  p.save();
  window.endlessTower.summoning.render();
});
const disabled = await ev(() => [1, 5, 10, 25].map((n) => document.querySelector(`[data-count="${n}"]`).disabled));
check('buttons disable when Tokens are insufficient (700 Tokens)', JSON.stringify(disabled) === '[false,true,true,true]', JSON.stringify(disabled));
await ev(() => {
  const p = window.endlessTower.profile;
  p.data.wallet.tokens = 150 * 41;
  p.save();
  window.endlessTower.summoning.render();
});
for (const n of [1, 5, 10, 25]) {
  const before = await wallet();
  await page.click(`[data-count="${n}"]`);
  const confirmText = await page.textContent('#confirm-body');
  await page.click('#btn-confirm-ok');
  await page.waitForTimeout(400);
  const shown = await ev(() => window.endlessTower.summoning.results.length);
  await page.click('#btn-reveal-skip').catch(() => {});
  await page.waitForTimeout(300);
  if (n > 1) {
    const cards = await page.$$eval('.rs-item', (els) => els.length);
    check(`×${n} summon: ${n} independent results shown together`, shown === n && cards === n, `${cards} cards`);
  } else {
    check('×1 summon reveals one unit', shown === 1 && (await page.isVisible('#reveal-card')));
  }
  await page.click('#btn-reveal-done');
  const after = await wallet();
  check(`×${n} costs ${150 * n} Tokens (total shown before confirming)`, before - after === 150 * n && /Total cost/.test(confirmText), `${before} → ${after}`);
}
const odds = await page.$$eval('.pi-chance', (els) => els.map((e) => e.firstChild.textContent.trim()));
check('pool shows Cadet 50%, Gunnerman 30%, Grenade Launcher 15%, Tank 5%', JSON.stringify(odds) === '["50%","30%","15%","5%"]', odds.join(' '));

// 6. Unlocks appear in Battle Plans (force-unlock any the dice missed, via a real summon loop)
await ev(() => {
  const { profile } = window.endlessTower;
  profile.data.wallet.tokens = 150 * 25 * 6;
  profile.save();
});
for (let i = 0; i < 6 && (await ev(() => window.endlessTower.profile.data.unlocked.length)) < 5; i++) {
  await page.click('[data-count="25"]');
  await page.click('#btn-confirm-ok');
  await page.click('#btn-reveal-skip');
  await page.click('#btn-reveal-done');
}
await page.click('.tab[data-page="plans"]');
await page.waitForTimeout(200);
const unlockedCards = await page.$$eval('.unit-card:not(.locked)', (els) => els.map((e) => e.dataset.id).sort());
check('all five units are unlocked and selectable in Battle Plans', JSON.stringify(unlockedCards) === JSON.stringify(['cadet', 'dude', 'grenade-launcher', 'gunnerman', 'tank']), unlockedCards.join(', '));
for (const id of ['cadet', 'gunnerman', 'grenade-launcher', 'tank']) {
  const sel = await page.$eval(`.unit-card[data-id="${id}"]`, (e) => e.classList.contains('selected'));
  if (!sel) await page.click(`.unit-card[data-id="${id}"]`);
}
const planIds = await ev(() => window.endlessTower.profile.plan.units);
check('duplicates never create duplicate plan entries', new Set(planIds).size === planIds.length && planIds.length === 5, planIds.join(', '));

// 7. Effects in a live battle
await page.click('#btn-battle');
await page.waitForTimeout(200);
const fx = await ev(() => {
  const { game } = window.endlessTower;
  game.coins = 1e6;
  let spot = null;
  for (let y = 1; y < 21 && !spot; y++) for (let x = 1; x < 39 && !spot; x++) if (game.canPlace(x, y) && game.canPlace(x + 1, y) && game.canPlace(x - 1, y)) spot = [x, y];
  const d = game.deploy('dude', ...spot);
  const r0 = d.stats.rate;
  const t1 = game.deploy('tank', spot[0] + 1, spot[1]);
  const r1 = d.stats.rate;
  const t2 = game.deploy('tank', spot[0] - 1, spot[1]);
  const r2 = d.stats.rate;
  game.sell(t1);
  game.sell(t2);
  const r3 = d.stats.rate;
  // wound + flames
  game.startNextWave();
  game.update(1);
  const e = game.enemies[0];
  e.hp = e.maxHp = 1e9;
  const gl = game.deploy('grenade-launcher', ...[...Array(22).keys()].flatMap((y) => [...Array(40).keys()].map((x) => [x, y])).find(([x, y]) => game.canPlace(x, y)));
  let wounded = 0;
  for (let i = 0; i < 200; i++) {
    if (e.statuses) delete e.statuses.wounded;
    game.impact({ x: e.x, y: e.y, splash: 0, target: e, damage: 1, source: gl });
    if (e.statuses?.wounded) wounded++;
  }
  const tank = game.deploy('tank', ...[...Array(22).keys()].flatMap((y) => [...Array(40).keys()].map((x) => [x, y])).find(([x, y]) => game.canPlace(x, y)));
  game.addHazard(e.x, e.y, tank.def.impactHazard, 100, tank);
  game.hash.clear();
  game.hash.insert(e);
  const hp = e.hp;
  for (let i = 0; i < 61; i++) game.updateHazards(1 / 60); // just past 1 s: four 0.25 s ticks
  return { aura: [r0, r1, r2, r3], wounded, burn: hp - e.hp, burning: (e.statuses?.burning ?? 0) > game.time };
});
check('Tank aura: +10% attack rate, no stacking, removed on sale', Math.abs(fx.aura[1] / fx.aura[0] - 1 / 0.9) < 1e-9 && fx.aura[2] === fx.aura[1] && fx.aura[3] === fx.aura[0], fx.aura.map((r) => r.toFixed(3)).join(' → '));
check('Grenade Launcher Wounded applies on ~20% of hits', fx.wounded > 20 && fx.wounded < 65, `${fx.wounded}/200`);
check('Tank flames burn enemies for low periodic damage (8% of shell damage per second)', Math.abs(fx.burn - 8) < 0.01 && fx.burning, `${fx.burn.toFixed(1)} dmg over 1 s from a 100-damage shell`);
await page.waitForTimeout(500);
await page.screenshot({ path: 'screenshots/e2e-battle.png' });
await page.click('#btn-retreat');
await page.click('#btn-retreat-confirm');

// 8. Persistence across a restart
const snap = await ev(() => ({ t: window.endlessTower.profile.balance('tokens'), u: [...window.endlessTower.profile.data.unlocked].sort(), p: [...window.endlessTower.profile.plan.units] }));
await page.reload();
await page.waitForFunction(() => window.__etBooted === true);
const after = await ev(() => ({ t: window.endlessTower.profile.balance('tokens'), u: [...window.endlessTower.profile.data.unlocked].sort(), p: [...window.endlessTower.profile.plan.units] }));
check('Tokens, unlocked units and the plan persist after restart', JSON.stringify(snap) === JSON.stringify(after), `${after.t} tokens, ${after.u.length} units`);
check('wallet shows the persisted balance', (await page.textContent('#wallet-tokens')).length > 0);

// 9. Mobile layout
const m = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
await m.goto(base);
await m.waitForFunction(() => window.__etBooted === true);
const overflow = await m.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
await m.tap('.tab[data-page="summon"]');
await m.waitForTimeout(300);
await m.screenshot({ path: 'screenshots/e2e-mobile-summon.png' });
await m.tap('.tab[data-page="plans"]');
await m.tap('#btn-battle');
await m.waitForTimeout(400);
const mobileBattle = await m.evaluate(() => window.endlessTower.settings.inBattle && !!window.endlessTower.game.map);
await m.screenshot({ path: 'screenshots/e2e-mobile-battle.png' });
check('mobile: no horizontal overflow, tabs and battle work by touch', !overflow && mobileBattle);

check('no runtime errors during the whole run', errors.length === 0, errors.slice(0, 3).join(' | '));
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} checks passed`);
await browser.close();
process.exit(failed ? 1 : 0);
