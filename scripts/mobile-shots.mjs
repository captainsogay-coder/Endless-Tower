// Screenshots of every main screen on several phones (and desktop) for layout review,
// plus automated layout checks: horizontal overflow, overlapping controls,
// touch-target sizes and elements outside the safe viewport.
// Usage: node scripts/mobile-shots.mjs [baseUrl] [outDir]
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium, devices } = require('playwright');

const base = process.argv[2] ?? 'http://localhost:8080';
const out = process.argv[3] ?? 'screenshots/mobile';
const DEVICES = {
  'se-portrait': { ...devices['iPhone SE'] },
  'iphone13-portrait': { ...devices['iPhone 13'] },
  'promax-portrait': { ...devices['iPhone 14 Pro Max'] },
  'iphone13-landscape': { ...devices['iPhone 13 landscape'] },
  'pixel-landscape': { ...devices['Pixel 7 landscape'] },
  desktop: { viewport: { width: 1440, height: 900 } },
};
const only = process.argv[4];
const b = await chromium.launch();
const T = { timeout: 5000 };
const problems = [];
const fs = await import('node:fs');
fs.mkdirSync(out, { recursive: true });

async function audit(page, name, screen) {
  const r = await page.evaluate(() => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const res = { overflowX: document.documentElement.scrollWidth > vw + 1, small: [], offscreen: [], overlaps: [] };
    const visible = (el) => {
      const s = getComputedStyle(el);
      const rc = el.getBoundingClientRect();
      return s.display !== 'none' && s.visibility !== 'hidden' && rc.width > 0 && rc.height > 0 && !el.closest('[hidden]');
    };
    const ctrls = [...document.querySelectorAll('button, input, select, .tab, [data-count], .deploy-card, label.auto')].filter(visible);
    const inScroller = (el) => {
      for (let n = el.parentElement; n && n !== document.body; n = n.parentElement) {
        const st = getComputedStyle(n);
        if (/(auto|scroll)/.test(st.overflowX + st.overflowY) && (n.scrollWidth > n.clientWidth + 1 || n.scrollHeight > n.clientHeight + 1)) return true;
      }
      return document.documentElement.scrollHeight > vh + 1 && getComputedStyle(el).position !== 'fixed';
    };
    for (const el of ctrls) {
      const rc = el.getBoundingClientRect();
      const label = (el.id || el.className || el.tagName).toString().slice(0, 40);
      if ((rc.height < 32 || rc.width < 32) && !el.matches('input[type=checkbox]') && !inScroller(el)) res.small.push(`${label} ${Math.round(rc.width)}×${Math.round(rc.height)}`);
      if (!inScroller(el) && (rc.right > vw + 1 || rc.left < -1 || rc.bottom > vh + 1)) res.offscreen.push(`${label} @${Math.round(rc.left)},${Math.round(rc.top)} ${Math.round(rc.width)}×${Math.round(rc.height)}`);
    }
    for (let i = 0; i < ctrls.length; i++) for (let j = i + 1; j < ctrls.length; j++) {
      const a = ctrls[i].getBoundingClientRect();
      const c = ctrls[j].getBoundingClientRect();
      if (ctrls[i].contains(ctrls[j]) || ctrls[j].contains(ctrls[i])) continue;
      const ix = Math.min(a.right, c.right) - Math.max(a.left, c.left);
      const iy = Math.min(a.bottom, c.bottom) - Math.max(a.top, c.top);
      if (ix > 4 && iy > 4 && !inScroller(ctrls[i]) && !inScroller(ctrls[j])) res.overlaps.push(`${ctrls[i].id || ctrls[i].className} × ${ctrls[j].id || ctrls[j].className}`);
    }
    const canvas = document.getElementById('game');
    if (canvas && visible(canvas)) {
      const cr = canvas.getBoundingClientRect();
      res.canvas = `${Math.round(cr.width)}×${Math.round(cr.height)} @${Math.round(cr.top)}`;
      for (const el of ctrls) {
        const a = el.getBoundingClientRect();
        const ix = Math.min(a.right, cr.right) - Math.max(a.left, cr.left);
        const iy = Math.min(a.bottom, cr.bottom) - Math.max(a.top, cr.top);
        if (ix > 4 && iy > 4 && !el.closest('#unit-panel')) res.overlaps.push(`${el.id || el.className} covers the battlefield`);
      }
    }
    return res;
  });
  const issues = [];
  if (r.overflowX) issues.push('horizontal overflow');
  if (r.small.length) issues.push(`small targets: ${r.small.slice(0, 6).join(', ')}${r.small.length > 6 ? ` (+${r.small.length - 6})` : ''}`);
  if (r.offscreen.length) issues.push(`off-screen: ${r.offscreen.slice(0, 4).join(', ')}`);
  if (r.overlaps.length) issues.push(`overlaps: ${[...new Set(r.overlaps)].slice(0, 4).join(', ')}`);
  problems.push({ name, screen, issues, canvas: r.canvas });
}

for (const [name, opts] of Object.entries(DEVICES)) {
  if (only && !name.includes(only)) continue;
  const ctx = await b.newContext(opts);
  const page = await ctx.newPage();
  await page.goto(base);
  await page.waitForFunction(() => window.__etBooted === true);
  const ids = ['dude', 'cadet', 'gunnerman', 'sheriff', 'the-house', 'nuclear-warhead', 'gambler', 'fortress', 'general'];
  await page.evaluate((ids) => { const { profile } = window.endlessTower; for (const id of ids) profile.recordSummon(id); profile.plan.units = ids; profile.data.wallet.tokens = 12345; profile.save(); window.endlessTower.plans.show(true); }, ids);
  const shot = async (screen) => {
    await page.waitForTimeout(350);
    await page.screenshot({ path: `${out}/${name}-${screen}.png` });
    await audit(page, name, screen);
  };
  await shot('plans');
  await page.click('.tab[data-page="summon"]', T);
  await shot('summon');
    await page.click('.tab[data-page="plans"]', T);
  await page.click('#btn-battle', T);
  await page.evaluate(() => { const { game } = window.endlessTower; game.coins = 99999; game.callWaves(3); game.weather.start('thunderstorm'); });
  await shot('battle');
  const pos = await page.evaluate(() => { const { game } = window.endlessTower; for (let y = 2; y < 20; y++) for (let x = 2; x < 38; x++) if (game.canPlace(x, y) && game.map.pathDist[y * 40 + x] <= 2) { game.deploy('sheriff', x, y); return [x, y]; } });
  const box = await page.locator('#game').boundingBox();
  await page.mouse.click(box.x + ((pos[0] + 0.5) / 40) * box.width, box.y + ((pos[1] + 0.5) / 22) * box.height);
  await shot('unit');
  await ctx.close();
}
await b.close();
for (const p of problems) console.log(`${p.name.padEnd(20)} ${p.screen.padEnd(7)} ${p.canvas ? `canvas ${p.canvas}  ` : ''}${p.issues.length ? p.issues.join(' | ') : 'OK'}`);
