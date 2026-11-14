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
check('no battlefield selector exists', (await page.$('#realm-select')) === null && (await page.$('#app select, .bp-footer select')) === null);
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
check('exactly 250 Tokens for a completed early wave', wave.afterFirst - t0 === 250, `${t0} → ${wave.afterFirst}`);
check('no Tokens for a partially completed wave', wave.partial === wave.afterFirst);
check('Coins and Tokens are separate balances (coins never saved); no other currency exists', wave.profileCoins === 0 && wave.gems === undefined && wave.coins0 > 0);
await page.click('#btn-retreat');
await page.click('#btn-retreat-confirm');

// 4 + 5. Summoning prices, insufficient funds, x1/x5/x10/x25
await page.click('.tab[data-page="summon"]');
await page.waitForTimeout(200);
const order = await page.$$eval('.circle-card', (els) => els.map((e) => ({ id: e.dataset.banner, price: Number(e.querySelector('.cc-price').textContent.replace(/[^0-9]/g, '')), active: e.classList.contains('active') })));
check('all 13 circles in one collection, sorted by Token price (cheapest first, opened by default)', order.length === 13 && order.every((c, i) => i === 0 || c.price >= order[i - 1].price) && order[0].active && order.map((c) => c.price).join() === '100,150,180,250,250,300,300,400,500,500,850,1200,1800', order.map((c) => `${c.id.replace('-circle', '')} ${c.price}`).join(' · '));
const poolStrips = await page.$$eval('.pool-item', (els) => els.every((e) => e.querySelectorAll('.st-cell').length === 5));
check('drop-rate list shows each unit\'s five side tiers', poolStrips);
await page.click('[data-banner="military-circle"]');
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
  await page.waitForSelector(`[data-count="${n}"]:not([disabled])`, { timeout: 5000 });
  await page.click(`[data-count="${n}"]`);
  const confirmText = await page.textContent('#confirm-body');
  await page.click('#btn-confirm-ok');
  await page.waitForTimeout(400);
  const shown = await ev(() => window.endlessTower.summoning.results.length);
  const comp = await ev(() => window.endlessTower.summoning.results.reduce((a, r) => a + r.compensation, 0));
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
  check(`×${n} costs ${150 * n} Tokens, duplicates refund 45 each (total shown before confirming)`, before - after === 150 * n - comp && comp % 45 === 0 && /Total cost/.test(confirmText), `${before} → ${after} (+${comp} compensation)`);
}
const odds = await page.$$eval('.pi-chance', (els) => els.map((e) => e.firstChild.textContent.trim()));
check('pool shows Cadet 50%, Gunnerman 30%, Grenade Launcher 15%, Tank 5%', JSON.stringify(odds) === '["50%","30%","15%","5%"]', odds.join(' '));

// 6. Unlocks appear in Battle Plans (force-unlock any the dice missed, via a real summon loop)
await ev(() => {
  const { profile } = window.endlessTower;
  profile.data.wallet.tokens = 150 * 25 * 6;
  profile.save();
  window.endlessTower.summoning.render();
});
for (let i = 0; i < 6 && (await ev(() => window.endlessTower.profile.data.unlocked.length)) < 5; i++) {
  await page.waitForSelector('[data-count="25"]:not([disabled])', { timeout: 5000 });
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

// 10. Gameplay & content update: two-tap deploy, multi-wave, weather, Advanced circle
await page.click('.tab[data-page="plans"]').catch(() => {});
await page.click('#btn-battle');
await page.waitForTimeout(300);
const box = await page.locator('#game').boundingBox();
const spot = await ev(() => {
  const { game } = window.endlessTower;
  for (let y = 2; y < 20; y++) for (let x = 2; x < 38; x++) if (game.canPlace(x, y) && game.canPlace(x + 3, y)) return [x, y];
});
const sc = (x, y) => ({ x: box.x + ((x + 0.5) / 40) * box.width, y: box.y + ((y + 0.5) / 22) * box.height });
const coins0 = await ev(() => window.endlessTower.game.coins);
await page.keyboard.press('1'); // first tap equivalent: select Dude
const coinsSel = await ev(() => window.endlessTower.game.coins);
const p0 = sc(...spot);
await page.mouse.click(p0.x, p0.y);
await page.mouse.click(p0.x, p0.y); // double tap must not double-buy
const tapRes = await ev(() => ({ coins: window.endlessTower.game.coins, n: window.endlessTower.game.units.length }));
check('two-tap deploy: selecting is free, one tap buys exactly one unit', coinsSel === coins0 && tapRes.n === 1 && coins0 - tapRes.coins === 15, `${coins0} → ${coinsSel} → ${tapRes.coins}, ${tapRes.n} unit(s)`);
await page.waitForTimeout(250);
const p1 = sc(spot[0] + 3, spot[1]);
await page.mouse.move(p1.x, p1.y);
await page.mouse.down();
await page.mouse.move(p1.x + 60, p1.y + 40, { steps: 6 });
await page.mouse.up();
const dragN = await ev(() => window.endlessTower.game.units.length);
check('dragging across the map deploys nothing', dragN === 1, `${dragN} units`);
await page.keyboard.press('Escape');
await page.fill('#call-count', '40');
await page.click('#btn-call-many');
await page.waitForTimeout(1500);
const mw = await ev(() => {
  const { game } = window.endlessTower;
  return { active: game.activeWaveNumbers().length, queued: game.queuedWaveNumbers().length, waves: new Set(game.enemies.map((e) => e.wave?.number)).size, info: document.getElementById('queue-info').textContent };
});
check('calling 40 waves: several waves active at once, rest queued, HUD lists them', mw.active > 1 && mw.active + mw.queued >= 39 && mw.waves > 1 && /queued/.test(mw.info), JSON.stringify(mw));
const np = await page.textContent('#next-preview');
const npWave = await ev(() => window.endlessTower.game.nextPlan.wave);
const expectTok = Math.round(250 * (1 + 0.05 * Math.floor(npWave / 10)));
check('the next wave shows its Token reward before it starts (+5% per 10 waves)', new RegExp(`\\+${expectTok} Tokens on clear`).test(np.replace(/,/g, '')), `wave ${npWave}: ${np.replace(/\s+/g, ' ').slice(-40)}`);
const wx = await ev(() => {
  const { game } = window.endlessTower;
  game.weather.start('nova');
  const card = document.getElementById('weather-card');
  return { id: game.weather.current?.id, rem: game.weather.remaining, rate: game.units[0].stats.rate };
});
await page.waitForTimeout(400);
const card = await page.textContent('#weather-card');
check('weather: Nova shows its card with remaining time and effects', wx.id === 'nova' && wx.rem === 20 && /Nova/i.test(card) && /40% cooldown/.test(card) && /30% damage/.test(card), card.replace(/\s+/g, ' ').slice(0, 80));
await page.click('#btn-weather');
const off = await ev(() => ({ cur: window.endlessTower.game.weather.current, en: window.endlessTower.game.weatherEnabled }));
check('weather toggle turns weather off and clears the active weather', off.cur === null && off.en === false);
await page.click('#btn-weather');
await page.click('#btn-retreat');
await page.click('#btn-retreat-confirm');
await page.click('.tab[data-page="summon"]');
await page.waitForTimeout(200);
await page.click('[data-banner="advanced-military-circle"]');
const adv = await page.$$eval('.pi-chance', (els) => els.map((e) => e.firstChild.textContent.trim()));
check('Advanced circle odds 40/30/10/12/7.5/0.5%', JSON.stringify(adv) === '["40%","30%","10%","12%","7.5%","0.5%"]', adv.join(' '));
const rareRow = await page.$$eval('.pool-item.rare', (els) => els.length);
check('only the 0.5% Fortress is flagged rare', rareRow === 1);
await ev(() => { const p = window.endlessTower.profile; p.data.wallet.tokens = 250 * 25; p.save(); window.endlessTower.summoning.render(); });
const b0 = await wallet();
await page.waitForSelector('[data-count="25"]:not([disabled])', { timeout: 5000 });
await page.click('[data-count="25"]');
await page.click('#btn-confirm-ok');
await page.click('#btn-reveal-skip');
await page.waitForTimeout(300);
const advComp = await ev(() => window.endlessTower.summoning.results.reduce((a, r) => a + r.compensation, 0));
const compShown = await page.$$eval('.rs-comp', (els) => els.length);
await page.click('#btn-reveal-done');
const b1 = await wallet();
check('Advanced ×25 costs 6,250 and pays 75 per duplicate, shown in results', b0 - b1 === 6250 - advComp && advComp === compShown * 75 && compShown > 0, `${b0} → ${b1}, ${compShown} dupes`);

// 11. New circles, full flow: summon → plan → deploy → select → range → upgrade → fight → rewards
await page.click('.tab[data-page="summon"]');
await page.waitForTimeout(200);
const circles = [];
for (const id of ['wild-west-circle', 'gambino-circle', 'nuclear-war-circle']) {
  await page.click(`[data-banner="${id}"]`);
  const rows = await page.$$eval('.pool-item', (els) => els.map((e) => ({ name: e.querySelector('.pi-name').textContent, tier: e.querySelector('.pi-sub').textContent.split(',')[0].trim(), chance: parseFloat(e.querySelector('.pi-chance').firstChild.textContent) })));
  circles.push({ id, rows, sum: Math.round(rows.reduce((a, r) => a + r.chance, 0) * 1000) / 1000, price: await page.textContent('#banner-price'), card: await page.textContent(`[data-banner="${id}"] .cc-price`) });
}
check('Wild West, Gambino and Nuclear War pools list tier + drop rate and total exactly 100%', circles.every((c) => c.sum === 100 && c.rows.every((r) => /^Tier [IVXL]+$/.test(r.tier))) && circles.map((c) => c.rows.length).join() === '8,7,9', circles.map((c) => `${c.id}:${c.rows.length}/${c.sum}%`).join(' '));
check('every circle is priced in Tokens: Wild West 300, Gambino 300, Nuclear War 500', circles.map((c) => `${c.price}|${c.card.trim()}`).join(' ') === '300|300 Tokens 300|300 Tokens 500|500 Tokens', circles.map((c) => c.card.trim()).join(' / '));
const allCards = await page.$$eval('.circle-card .cc-price', (els) => els.map((e) => e.textContent.trim()));
const gemText = await ev(() => /\bgems?\b/i.test(document.body.innerText + document.body.innerHTML.replace(/<svg[\s\S]*?<\/svg>/g, '')));
check('no Gems anywhere: no Gem text, icon, balance or price in the page; one currency in the wallet', !gemText && allCards.every((t) => /Tokens$/.test(t)) && (await page.$('#i-gem, #wallet-gems')) === null && JSON.stringify(Object.keys(await ev(() => window.endlessTower.profile.data.wallet))) === '["tokens"]', allCards.join(', '));
// Wild West ×10
await page.click('[data-banner="wild-west-circle"]');
await ev(() => { const p = window.endlessTower.profile; p.data.wallet.tokens = 3000; p.save(); window.endlessTower.summoning.render(); });
await page.click('[data-count="10"]');
await page.click('#btn-confirm-ok');
await page.click('#btn-reveal-skip');
await page.waitForTimeout(200);
const ww = await ev(() => ({ res: window.endlessTower.summoning.results.map((r) => ({ unit: r.unit, comp: r.compensation })), t: window.endlessTower.profile.balance('tokens') }));
await page.click('#btn-reveal-done');
const wwComp = ww.res.reduce((a, r) => a + r.comp, 0);
check('Wild West ×10 charges 3,000 Tokens; duplicates refund 90 Tokens each', ww.t === wwComp && ww.res.every((r) => r.comp === 0 || r.comp === 90), `tokens ${ww.t}, comp ${wwComp}`);
// Nuclear War: 500 Tokens
await page.click('[data-banner="nuclear-war-circle"]');
await ev(() => { const p = window.endlessTower.profile; p.data.wallet.tokens = 505; p.save(); window.endlessTower.summoning.render(); });
await page.click('[data-count="1"]');
const nwConfirm = await page.textContent('#confirm-body');
await page.click('#btn-confirm-ok');
await page.click('#btn-reveal-skip');
await page.waitForTimeout(200);
const nw = await ev(() => ({ r: window.endlessTower.summoning.results[0], t: window.endlessTower.profile.balance('tokens') }));
await page.click('#btn-reveal-done');
check('Nuclear War deducts 500 Tokens (150 back per duplicate) and unlocks the pulled unit', nw.t === 5 + nw.r.compensation && [0, 150].includes(nw.r.compensation) && /500 Tokens/.test(nwConfirm) && (await ev((u) => window.endlessTower.profile.isUnlocked(u), nw.r.unit)), `${nw.r.unit}, tokens ${nw.t}`);
// put a summoned Wild West unit in the plan through the Battle Plans screen
const wwUnit = ww.res[0].unit;
await page.click('.tab[data-page="plans"]');
await page.waitForTimeout(200);
const inPlan = await ev(() => window.endlessTower.profile.plan.units.length);
if (inPlan >= 12) await ev(() => window.endlessTower.profile.plan.units.pop());
const wwCard = `.unit-card[data-id="${wwUnit}"]`;
if (!(await page.$eval(wwCard, (e) => e.classList.contains("selected")))) await page.click(wwCard);
const planHas = await ev((u) => window.endlessTower.profile.plan.units.includes(u), wwUnit);
check('the summoned unit can be added to the Battle Plan', planHas, wwUnit);
await page.click('#btn-battle');
await page.waitForTimeout(300);
await ev(() => { window.endlessTower.game.coins = 50000; });
const slot = await ev((u) => window.endlessTower.game.loadout.findIndex((d) => d.id === u), wwUnit);
await page.click(`.deploy-card[data-def="${wwUnit}"]`);
const box2 = await page.locator('#game').boundingBox();
const at = await ev(() => { const g = window.endlessTower.game; for (let y = 2; y < 20; y++) for (let x = 2; x < 38; x++) if (g.canPlace(x, y) && g.map.pathDist[y * 40 + x] <= 2) return [x, y]; });
const tp = { x: box2.x + ((at[0] + 0.5) / 40) * box2.width, y: box2.y + ((at[1] + 0.5) / 22) * box2.height };
await page.mouse.move(tp.x, tp.y);
await page.waitForTimeout(100);
const preview = await ev(([x, y, u]) => window.endlessTower.game.previewStats(u, x, y).range, [at[0], at[1], wwUnit]);
await page.mouse.click(tp.x, tp.y);
await page.keyboard.press('Escape');
await page.waitForTimeout(250);
await page.mouse.click(tp.x, tp.y);
await page.waitForTimeout(150);
const sel = await ev(() => { const u = window.endlessTower.renderer.ui.selected; return u && { id: u.def.id, lv: u.level, range: u.stats.range, dmg: u.stats.damage, panel: !document.getElementById('unit-panel').hidden, text: document.getElementById('unit-panel').textContent }; });
check('tapping the deployed unit selects it and opens its upgrade panel (name, tier, level, stats, next level, cost)', sel && sel.id === wwUnit && sel.panel && /Tier/.test(sel.text) && /Level 0 \/ 5/.test(sel.text) && /Damage/.test(sel.text) && /Range/.test(sel.text) && /Upgrade cost/.test(sel.text), sel?.text?.slice(0, 90));
check('range ring = combat range (preview before deploy matched too)', Math.abs(preview - sel.range) < 1e-9, `${sel.range.toFixed(1)} px`);
const coinsBefore = await ev(() => window.endlessTower.game.coins);
const cost = await ev(() => window.endlessTower.game.upgradeInfo(window.endlessTower.renderer.ui.selected).cost);
await page.click('[data-act="upgrade"]');
await page.waitForTimeout(150);
const up = await ev(() => { const u = window.endlessTower.renderer.ui.selected; return { lv: u.level, range: u.stats.range, dmg: u.stats.damage, coins: window.endlessTower.game.coins }; });
check('Upgrade button spends the exact cost and updates stats and range immediately', up.lv === 1 && coinsBefore - up.coins === cost && up.dmg > sel.dmg && up.range >= sel.range, `Lv ${up.lv}, −${coinsBefore - up.coins}, dmg ${sel.dmg.toFixed(1)}→${up.dmg.toFixed(1)}`);
await ev(() => { window.endlessTower.game.coins = 0; });
await page.waitForTimeout(100);
const poor = await ev(() => document.querySelector('[data-act="upgrade"]').disabled);
await ev(() => { window.endlessTower.game.coins = 1e7; });
for (let i = 0; i < 6; i++) { await page.waitForTimeout(60); await page.click('[data-act="upgrade"]').catch(() => {}); }
const maxed = await ev(() => ({ lv: window.endlessTower.renderer.ui.selected.level, btn: document.querySelector('[data-act="upgrade"]').textContent.trim(), dis: document.querySelector('[data-act="upgrade"]').disabled }));
check('upgrade is blocked when unaffordable and shows a clear max-level state', poor && maxed.lv === 5 && /Max level/.test(maxed.btn) && maxed.dis, JSON.stringify(maxed));
await ev(() => { window.endlessTower.game.weather.start('windy'); });
await page.waitForTimeout(100);
const windy = await ev(() => window.endlessTower.renderer.ui.selected.stats.range);
await ev(() => { window.endlessTower.game.weather.stop(); });
const calm = await ev(() => window.endlessTower.renderer.ui.selected.stats.range);
check('weather changes the range ring immediately and leaves no trace afterwards (Windy +20%)', Math.abs(windy / calm - 1.2) < 1e-9, `${calm.toFixed(1)} → ${windy.toFixed(1)}`);
const tokens0 = await ev(() => window.endlessTower.profile.balance('tokens'));
await ev(() => { const g = window.endlessTower.game; g.towerHp = g.towerMaxHp = 1e9; g.callWaves(3); });
await page.click('.speed button[data-speed="3"]');
await page.waitForFunction(() => window.endlessTower.game.stats.wavesCleared >= 3, null, { timeout: 120000 });
const fought = await ev(() => ({ kills: window.endlessTower.game.stats.kills, unitKills: window.endlessTower.game.units.reduce((a, u) => a + u.kills, 0), tokens: window.endlessTower.profile.balance('tokens') }));
check('the battle is fought and rewards land in the profile (250 Tokens per early wave)', fought.kills > 0 && fought.unitKills > 0 && fought.tokens - tokens0 === 750, JSON.stringify(fought));
await page.click('.speed button[data-speed="1"]');
await page.click('#btn-retreat');
await page.click('#btn-retreat-confirm');

// 12. Village Militia / Town Guard / Siege Workshop circles
await page.click('.tab[data-page="summon"]');
await page.waitForTimeout(200);
const med = [];
for (const id of ['village-militia-circle', 'town-guard-circle', 'siege-workshop-circle']) {
  await page.click(`[data-banner="${id}"]`);
  const rows = await page.$$eval('.pool-item', (els) => els.map((e) => ({ name: e.querySelector('.pi-name').textContent.trim(), chance: parseFloat(e.querySelector('.pi-chance').firstChild.textContent), rare: e.classList.contains('rare') })));
  med.push({ id, rows, sum: Math.round(rows.reduce((a, r) => a + r.chance, 0) * 1000) / 1000, card: (await page.textContent(`[data-banner="${id}"] .cc-price`)).trim() });
}
check('Village Militia / Town Guard / Siege Workshop: 6/7/7 units, odds total 100%, priced 100/250/400 Tokens', med.every((c) => c.sum === 100) && med.map((c) => c.rows.length).join() === '6,7,7' && med.map((c) => c.card).join('|') === '100 Tokens|250 Tokens|400 Tokens', med.map((c) => `${c.rows.length}/${c.sum}% ${c.card}`).join(' · '));
check('chase odds: Village Hero 1%, King\'s Champion 0.5%, Master Engineer 1%', med.map((c) => `${c.rows.at(-1).name}=${c.rows.at(-1).chance}`).join('|') === "The Village Hero=1|The King's Champion=0.5|The Master Engineer=1", med.map((c) => `${c.rows.at(-1).name}=${c.rows.at(-1).chance}`).join('|'));
await page.click('[data-banner="village-militia-circle"]');
await ev(() => { const p = window.endlessTower.profile; p.data.wallet.tokens = 1000; p.save(); window.endlessTower.summoning.render(); });
await page.click('[data-count="10"]');
await page.click('#btn-confirm-ok');
await page.click('#btn-reveal-skip');
await page.waitForTimeout(200);
const vm = await ev(() => ({ res: window.endlessTower.summoning.results.map((r) => ({ unit: r.unit, comp: r.compensation })), t: window.endlessTower.profile.balance('tokens'), w: Object.keys(window.endlessTower.profile.data.wallet) }));
await page.click('#btn-reveal-done');
check('Village Militia ×10 charges 1,000 Tokens (30 back per duplicate), nothing else', vm.t === vm.res.reduce((a, r) => a + r.comp, 0) && vm.res.every((r) => [0, 30].includes(r.comp)) && vm.w.join() === 'tokens', `tokens ${vm.t}`);

// 12b. Summoning Circle Pack 2: five circles, 35 units, Tokens only, chase reveals, deploy + abilities
const p2 = [];
for (const id of ['traveling-caravan-circle', 'clockwork-atelier-circle', 'jungle-covenant-circle', 'skybound-order-circle', 'astral-observatory-circle']) {
  await page.click(`[data-banner="${id}"]`);
  const rows = await ev(() => window.endlessTower.summoning.banner.pool.map((e) => ({ id: e.unit, chance: Math.round(e.chance * 1e5) / 1e3, chase: !!e.chase })));
  p2.push({ id, rows, sum: Math.round(rows.reduce((a, r) => a + r.chance, 0) * 1000) / 1000, card: (await page.textContent(`[data-banner="${id}"] .cc-price`)).trim() });
}
check('Pack 2: five circles, 7 units each, odds total 100%, priced 180/500/850/1200/1800 Tokens', p2.every((c) => c.sum === 100 && c.rows.length === 7) && p2.map((c) => c.card).join('|') === '180 Tokens|500 Tokens|850 Tokens|1,200 Tokens|1,800 Tokens', p2.map((c) => `${c.rows.length}/${c.sum}% ${c.card}`).join(' · '));
check('Pack 2 chase units are 2% and flagged for a rare reveal', p2.every((c) => c.rows.at(-1).chance === 2 && c.rows.at(-1).chase && c.rows.filter((r) => r.chase).length === 1), p2.map((c) => c.rows.at(-1).id).join(', '));
await page.click('[data-banner="astral-observatory-circle"]');
await ev(() => { const p = window.endlessTower.profile; p.data.wallet.tokens = 1800 * 25; p.save(); window.endlessTower.summoning.render(); });
await page.click('[data-count="25"]');
await page.click('#btn-confirm-ok');
await page.click('#btn-reveal-skip');
await page.waitForTimeout(200);
const astral = await ev(() => ({ res: window.endlessTower.summoning.results.map((r) => ({ unit: r.unit, comp: r.compensation })), t: window.endlessTower.profile.balance('tokens'), w: Object.keys(window.endlessTower.profile.data.wallet), pool: window.endlessTower.summoning.banner.pool.map((e) => e.unit) }));
await page.click('#btn-reveal-done');
check('Astral ×25 charges 45,000 Tokens, gives 25 Astral units, duplicates refund Tokens only', astral.res.length === 25 && astral.res.every((r) => astral.pool.includes(r.unit)) && astral.t === astral.res.reduce((a, r) => a + r.comp, 0) && astral.w.join() === 'tokens', `tokens back ${astral.t}`);
const p2deploy = await ev((pulled) => {
  const g = window.endlessTower.game; const ids = [pulled, 'golden-merchant', 'eternal-engine', 'heart-of-the-wild', 'eye-of-the-zenith', 'singularity-monarch'];
  g.newRun({ loadout: ids }); g.coins = 1e7; const placed = [];
  for (const id of ids) { let done = false; for (let y = 0; y < 22 && !done; y++) for (let x = 0; x < 40 && !done; x++) if (g.map.pathDist[y * 40 + x] <= 2 && g.canPlace(x, y)) { const u = g.deploy(id, x, y); if (u) { placed.push(u); done = true; } } }
  for (const u of placed) g.upgrade(u);
  g.towerHp = g.towerMaxHp = 1e12; g.callWaves(3); for (let i = 0; i < 20 * 60; i++) g.update(1 / 20);
  return { placed: placed.map((u) => u.def.id), levels: placed.map((u) => u.level), kills: g.stats.kills ?? null, wave: g.wave };
}, astral.res[0].unit);
check('a summoned Astral unit and every Pack 2 chase unit deploy, upgrade and fight', p2deploy.placed.length === 6 && p2deploy.levels.every((l) => l >= 1) && p2deploy.kills > 0, `${p2deploy.placed.join(', ')} · lv ${p2deploy.levels.join(',')} · wave ${p2deploy.wave} kills ${p2deploy.kills}`);

// 13. Battle Plans: favorites, sorting, Auto Build + Undo, manual editing
await page.click('.tab[data-page="plans"]');
await page.waitForTimeout(200);
const owned = await ev(() => window.endlessTower.profile.data.unlocked.length);
const planBefore = await ev(() => [...window.endlessTower.profile.plan.units]);
const favId = await page.$$eval('.roster-grid .unit-card:has(.uc-fav)', (els) => els.at(-1).dataset.id);
const lockedStars = await page.$$eval('.roster-grid .unit-card.locked .uc-fav', (els) => els.length);
await page.click(`.unit-card[data-id="${favId}"] .uc-fav`);
await page.waitForTimeout(100);
const fav = await ev((id) => ({ first: document.querySelector('.roster-grid .unit-card[data-id]').dataset.id, pinned: document.querySelector(`.unit-card[data-id="${id}"]`).classList.contains('pinned'), fav: window.endlessTower.profile.data.favorites, plan: [...window.endlessTower.profile.plan.units], divider: !!document.querySelector('.roster-divider') }), favId);
check('star pins a unit type to the front, visibly, without using a plan slot', fav.first === favId && fav.pinned && fav.fav.includes(favId) && JSON.stringify(fav.plan) === JSON.stringify(planBefore) && fav.divider && lockedStars === 0, `${favId} first=${fav.first}`);
await page.selectOption('#roster-sort', 'acquired');
await page.waitForTimeout(100);
const acq = await ev(() => { const p = window.endlessTower.profile; const ids = [...document.querySelectorAll('.roster-grid .unit-card[data-id]')].map((e) => e.dataset.id).filter((id) => p.isUnlocked(id)); return { ids, mode: p.data.rosterSort }; });
const acqRest = acq.ids.filter((id) => id !== favId);
const acqOk = acq.ids[0] === favId && acq.mode === 'acquired';
const acqIdx = await ev((ids) => ids.map((id) => window.endlessTower.profile.acquiredIndex(id)), acqRest);
check('"Acquired" sort keeps pinned first, then acquisition order (and is remembered)', acqOk && acqIdx.every((v, i) => i === 0 || v > acqIdx[i - 1]), acq.ids.slice(0, 4).join(', '));
await page.selectOption('#roster-sort', 'tier');
// manual plan edit still works
const manual = await page.$$eval('.roster-grid .unit-card:has(.uc-fav)', (els) => els.map((e) => e.dataset.id));
await ev(() => { window.endlessTower.profile.plan.units.length = 0; window.endlessTower.profile.save(); window.endlessTower.plans.render(); });
await page.click(`.unit-card[data-id="${manual[0]}"]`);
await page.click(`.unit-card[data-id="${manual[1]}"]`);
const man = await ev(() => [...window.endlessTower.profile.plan.units]);
check('manual plan building still works (tap to add)', JSON.stringify(man) === JSON.stringify(manual.slice(0, 2)), man.join(', '));
// Auto Build: confirm dialog lists added / replaced, cancel changes nothing
const wallet0 = await ev(() => JSON.stringify(window.endlessTower.profile.data.wallet) + JSON.stringify(window.endlessTower.profile.data.owned));
await page.click('#btn-autobuild');
await page.waitForTimeout(150);
const dlg = await page.textContent('#autobuild-body');
await page.click('#btn-autobuild-cancel');
const afterCancel = await ev(() => [...window.endlessTower.profile.plan.units]);
check('Auto Pick asks first (preview of new, kept and replaced units); Cancel changes nothing', /new/i.test(dlg) && /replaced/i.test(dlg) && afterCancel.join() === man.join() && (await page.isHidden('#screen-autobuild')), dlg.replace(/\s+/g, ' ').slice(0, 90));
await page.click('#btn-autobuild');
await page.click('#btn-autobuild-ok');
await page.waitForTimeout(150);
const ab = await ev(() => { const p = window.endlessTower.profile; const R = window.endlessTower.getUnit; const defs = p.plan.units.map(R); return { units: [...p.plan.units], tiers: defs.map((d) => d.tier), allOwned: p.plan.units.every((id) => p.isUnlocked(id)), maxOwnedTier: Math.max(...p.data.unlocked.map((id) => R(id).tier)), backup: p.data.planBackup?.units ?? null, money: JSON.stringify(p.data.wallet) + JSON.stringify(p.data.owned) }; });
check('Auto Build fills up to 12 unique owned types, strongest tier first, spending nothing', ab.units.length === Math.min(12, owned) && new Set(ab.units).size === ab.units.length && ab.allOwned && ab.tiers[0] === ab.maxOwnedTier && ab.tiers.every((t, i) => i === 0 || t <= ab.tiers[i - 1]) && ab.money === wallet0, `${ab.units.length} types, tiers ${ab.tiers.join(',')}`);
check('Undo Auto Build is offered and restores the previous plan', (await page.isVisible('#btn-undo-build')) && JSON.stringify(ab.backup) === JSON.stringify(man));
await page.click('#btn-undo-build');
const undone = await ev(() => ({ u: [...window.endlessTower.profile.plan.units], b: window.endlessTower.profile.data.planBackup }));
check('Undo restores the exact manual plan and hides itself', JSON.stringify(undone.u) === JSON.stringify(man) && undone.b === null && (await page.isHidden('#btn-undo-build')), undone.u.join(', '));

// 14. Side tiers everywhere + side-tier Auto Pick + collection filters
await ev(() => { const p = window.endlessTower.profile; for (const id of ['colonel', 'bomber', 'outlaw-leader', 'glorious-leader', 'bounty-hunter', 'trebuchet', 'pit-boss', 'fastest-hand']) p.recordSummon(id); p.save(); window.endlessTower.plans.render(); });
const strips = await page.$$eval('.roster-grid .unit-card', (els) => els.map((e) => e.querySelectorAll('.st-strip .st-cell').length));
const dossierRows = await page.$$eval('#dossier .st-row', (els) => els.map((e) => e.querySelector('.st-name').textContent.trim()));
const naShown = await page.$$eval('.roster-grid .st-cell.na .st-num', (els) => els.length);
check('every collection card shows five side tiers (DPS AOE SUM EMP ECO), N/A drawn as a dash; the dossier explains each', strips.length > 0 && strips.every((n) => n === 5) && dossierRows.join() === 'DPS,AOE,Summon,Empower,Economy' && naShown > 0, `${strips.length} cards, dossier: ${dossierRows.join('/')}`);
const tip = await page.$eval('.roster-grid .st-cell[title]', (e) => e.title);
check('side-tier numbers have tooltips with the measured value and what the category measures', /measures:/.test(tip) && tip.length > 60, tip.slice(0, 70));
await page.click('.rt-focus [data-side="economy"]');
await page.waitForTimeout(100);
const eco = await ev(() => {
  const ids = [...document.querySelectorAll('.roster-grid .unit-card:not(.locked)')].map((e) => e.dataset.id);
  const nums = [...document.querySelectorAll('.roster-grid .unit-card:not(.locked) .st-cell.hl .st-num')].map((e) => Number(e.textContent));
  return { ids, nums, sort: document.getElementById('roster-sort').value, pinnedFirst: document.querySelector('.roster-grid .unit-card').classList.contains('pinned') };
});
const unpinned = eco.nums.slice(eco.pinnedFirst ? 1 : 0);
check('Economy filter shows only earners, ranked by Economy (pinned still first)', eco.sort === 'economy' && eco.ids.length >= 3 && !eco.ids.includes('fastest-hand') && eco.ids.includes('glorious-leader') && unpinned.every((v, i) => i === 0 || v <= unpinned[i - 1]), `${eco.ids.join(', ')} | ${eco.nums.join(',')}`);
await page.selectOption('#roster-circle', 'wild-west-circle');
await page.click('.rt-own [data-own="locked"]');
await page.waitForTimeout(100);
const wwf = await ev(() => [...document.querySelectorAll(".roster-grid .unit-card")].map((e) => ({ id: e.dataset.id, locked: e.classList.contains('locked') })));
check("circle + ownership filters combine (Wild West · not owned · Economy)", wwf.every((c) => c.locked) && wwf.every((c) => ['gambler', 'bandit', 'outlaw', 'bounty-hunter', 'gunslinger', 'sheriff', 'outlaw-leader', 'fastest-hand'].includes(c.id)), wwf.map((c) => c.id).join(", ") || "none");
await page.click('#roster-reset');
await page.waitForTimeout(100);
const reset = await ev(() => ({ f: window.endlessTower.profile.data.rosterFilter, n: document.querySelectorAll('.roster-grid .unit-card').length, sort: window.endlessTower.profile.data.rosterSort }));
check('Clear filters restores the full collection', reset.f.ownership === 'all' && reset.f.circle === 'all' && reset.f.side === null && reset.n === 90 && reset.sort === 'tier', JSON.stringify(reset));
// combat sheet + comparison in the unit details panel
await ev(() => { window.endlessTower.plans.focusId = 'glorious-leader'; window.endlessTower.plans.compare = null; window.endlessTower.plans.render(); });
const sheet = await ev(() => ({ rows: [...document.querySelectorAll('#dossier .cmp-sheet tbody th')].map((e) => e.textContent.trim()), against: document.getElementById('compare-with').value, verdict: document.querySelector('#dossier .cmp-verdict')?.textContent ?? '' }));
const need = ['Deployment cost', 'Damage per hit', 'Attacks per second', 'Single-target DPS', 'Swarm DPS', 'Range', 'From abilities', 'Summons', 'Buffs to allies', 'Income', 'Combat rating'];
check('unit details show a combat sheet (cost, hit, speed, single-target and swarm DPS, range, abilities, summons, buffs, income, combat rating)', need.every((n) => sheet.rows.includes(n)), sheet.rows.join(', '));
check('by default it compares with your best owned lower-tier unit and says what the investment buys', sheet.against && sheet.against !== 'glorious-leader' && /deals [\d.]+× the single-target damage of .+, for [\d.]+× the cost\./.test(sheet.verdict), sheet.verdict);
await page.selectOption('#compare-with', 'cadet');
const vsCadet = await ev(() => ({ v: document.querySelector('#dossier .cmp-verdict').textContent, ups: [...document.querySelectorAll('#dossier .cmp-d.up')].length }));
check('Compare with any unit: Glorious Leader vs Cadet shows the multiples gained', /Cadet/.test(vsCadet.v) && vsCadet.ups >= 4, vsCadet.v);
const before14 = await ev(() => [...window.endlessTower.profile.plan.units]);
await page.click('#btn-autobuild');
await page.click('#ab-primary [data-prio="economy"]');
await page.click('#ab-secondary [data-prio="dps"]');
await page.waitForTimeout(100);
const pv = await ev(() => ({ chips: [...document.querySelectorAll('#autobuild-body .ab-section:first-child .ab-unit .ab-side')].map((e) => e.textContent.trim()), rule: document.getElementById('ab-rule').textContent, secDisabled: document.querySelector('#ab-secondary [data-prio="economy"]').disabled }));
await page.click('#btn-autobuild-ok');
await page.waitForTimeout(100);
const ap = await ev(() => { const p = window.endlessTower.profile; return { units: [...p.plan.units], backup: p.data.planBackup?.units ?? null, prio: p.data.autoPick }; });
const exp = await ev(() => { const p = window.endlessTower.profile; const T = window.endlessTower.sideTiers; return p.data.unlocked.filter((id) => T(id).economy != null).sort((a, b) => T(b).economy - T(a).economy)[0]; });
check('Auto Pick by Economy then DPS: preview shows ECO values, the top earner leads, ranking rule explained', pv.chips[0]?.startsWith('ECO') && /Economy side tier, then DPS/.test(pv.rule) && pv.secDisabled && ap.units[0] === exp && ap.prio.primary === 'economy' && ap.prio.secondary === 'dps', `${pv.chips.slice(0, 4).join(' ')} · first ${ap.units[0]}`);
check('side-tier Auto Pick keeps Undo (previous plan saved)', JSON.stringify(ap.backup) === JSON.stringify(before14));
await page.click('#btn-undo-build');
check('Undo after a side-tier Auto Pick restores the plan', JSON.stringify(await ev(() => window.endlessTower.profile.plan.units)) === JSON.stringify(before14));
await page.click('#btn-autobuild');
await page.click('#ab-primary [data-prio=""]');
await page.click('#btn-autobuild-ok');

// 8. Persistence across a restart
const snapOf = () => ev(() => ({ t: window.endlessTower.profile.balance('tokens'), u: [...window.endlessTower.profile.data.unlocked].sort(), p: [...window.endlessTower.profile.plan.units], f: [...window.endlessTower.profile.data.favorites] }));
const snap = await snapOf();
await page.reload();
await page.waitForFunction(() => window.__etBooted === true);
const after = await snapOf();
check('Tokens, unlocked units, the plan and pinned favorites persist after restart', JSON.stringify(snap) === JSON.stringify(after), `${after.t} tokens, ${after.u.length} units`);
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
const mu = await m.evaluate(() => { const g = window.endlessTower.game; g.coins = 1e5; for (let y = 2; y < 20; y++) for (let x = 2; x < 38; x++) if (g.canPlace(x, y)) { g.deploy(g.loadout[0].id, x, y); return [x, y]; } });
const mbox = await m.locator('#game').boundingBox();
await m.touchscreen.tap(mbox.x + ((mu[0] + 0.5) / 40) * mbox.width, mbox.y + ((mu[1] + 0.5) / 22) * mbox.height);
await m.waitForTimeout(250);
const ubtn = await m.locator('[data-act="upgrade"]').boundingBox();
const vp = m.viewportSize();
await m.touchscreen.tap(ubtn.x + ubtn.width / 2, ubtn.y + ubtn.height / 2);
await m.waitForTimeout(200);
const mlv = await m.evaluate(() => window.endlessTower.game.units[0].level);
const panelStrip = await m.$$eval('#unit-panel .st-cell', (els) => els.length);
check('battle unit panel shows the five side tiers', panelStrip === 5);
check('mobile: the upgrade panel is fully on screen and upgrades by touch; wave controls stay visible', ubtn.y + ubtn.height <= vp.height && mlv === 1 && (await m.isVisible('#btn-next')), `button bottom ${Math.round(ubtn.y + ubtn.height)} / ${vp.height}`);

// mobile weather: compact chip → tap opens details → tap outside closes → placing keeps it collapsed
await m.evaluate(() => { const g = window.endlessTower.game; g.weatherEnabled = true; g.weather.start('windy'); });
if (await m.isVisible('.up-close')) await m.tap('.up-close');
await m.waitForTimeout(400);
const chipBox = await m.locator('#weather-chip').boundingBox();
const wxClosed = await m.isHidden('#weather-card');
await m.tap('#weather-chip');
await m.waitForTimeout(200);
const wxOpen = { vis: await m.isVisible('#weather-card'), text: (await m.textContent('#weather-card')).replace(/\s+/g, ' ') };
await m.touchscreen.tap(vp.width / 2, vp.height * 0.45);
await m.waitForTimeout(200);
const wxAfterOutside = await m.isHidden('#weather-card');
await m.tap('#weather-chip');
await m.waitForTimeout(150);
await m.tap('.deploy-card');
await m.waitForTimeout(200);
const wxPlacing = { hidden: await m.isHidden('#weather-card'), chipDisabled: await m.$eval('#weather-chip', (b) => b.disabled) };
check('mobile weather: a small chip in the top bar; tap opens details (name, time, buffs); tap outside closes', chipBox && chipBox.y + chipBox.height < 80 && chipBox.width < 120 && wxClosed && wxOpen.vis && /Windy/.test(wxOpen.text) && /20% range/.test(wxOpen.text) && /\d+s/.test(wxOpen.text) && wxAfterOutside, wxOpen.text.slice(0, 80));
check('mobile weather: starting placement collapses the panel and keeps it closed while placing', wxPlacing.hidden && wxPlacing.chipDisabled, JSON.stringify(wxPlacing));
const wxMech = await m.evaluate(() => window.endlessTower.game.weather.current?.id);
check('weather mechanics unchanged by the UI (Windy still active)', wxMech === 'windy');

check('no runtime errors during the whole run', errors.length === 0, errors.slice(0, 3).join(' | '));
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} checks passed`);
await browser.close();
process.exit(failed ? 1 : 0);
