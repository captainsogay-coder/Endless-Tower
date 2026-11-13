// Entry point: Battle Plans → battle → back. Wires the headless Game to the
// Renderer, HUD, Battle Plans screen, persistent profile and input.
import { TILE, GAME_CONFIG } from './config.js';
import { Game } from './game/Game.js';
import { Renderer } from './render/Renderer.js';
import { Hud, SLOT_KEYS } from './ui/hud.js';
import { BattlePlansView } from './ui/battlePlans.js';
import { SummoningView } from './ui/summoning.js';
import { chooseBattlefield } from './maps/rotation.js';
import { formatNumber } from './core/math.js';
import { AudioDirector } from './audio/director.js';
import { registerRoster, STARTER_UNITS } from './units/roster.js';
import { Profile } from './meta/profile.js';
import { randomSeed, createRng } from './core/rng.js';
import './render/castArt.js';

registerRoster();

// Debug URL parameters (?seed, ?realm, ?tokens) work only on a local dev server –
// players can never choose a battlefield.
const LOCAL = ['localhost', '127.0.0.1', ''].includes(location.hostname);
const params = LOCAL ? new URLSearchParams(location.search) : new URLSearchParams();
const profile = new Profile({ starterUnits: STARTER_UNITS });
if (!profile.plan.units.length && !profile.data.battles) {
  // First visit: start with the starter unit already in the plan.
  profile.plan.units = [...STARTER_UNITS];
  profile.save();
}

if (LOCAL && params.get('tokens')) profile.earn('tokens', Number(params.get('tokens')));
if (LOCAL && params.get('gems')) profile.earn('gems', Number(params.get('gems')));

const canvas = document.getElementById('game');
const appEl = document.getElementById('app');
const menuEl = document.getElementById('menu');
const settings = { speed: 1, paused: false, effects: params.get('fx') === '0' ? 0 : 1, inBattle: false };

const game = new Game({ seed: randomSeed(), loadout: profile.plan.units });
const renderer = new Renderer(canvas, { effects: settings.effects });
const audio = new AudioDirector({ muted: !!profile.data.muted });
audio.attach(game);
game.setWeatherEnabled(profile.data.weatherEnabled ?? true);
const ui = renderer.ui;

function setPaused(p) {
  settings.paused = p;
  hud.setPaused(p);
}

/** The game assigns the battlefield: a random realm/variant/layout, avoiding recent repeats. */
function startBattle({ units }) {
  const seed = Number(params.get('seed')) || randomSeed();
  const pick = chooseBattlefield(createRng(seed ^ 0x5a5a), profile.data.mapHistory);
  game.newRun({ seed, biomeId: params.get('realm') || pick.biomeId, variantId: params.get('realm') ? null : pick.variantId, avoidStyles: pick.avoidStyles, loadout: units });
  profile.recordMap({ biome: game.biome.id, variant: game.biome.variantId, style: game.map.layoutStyle });
  menuEl.hidden = true;
  appEl.hidden = false;
  settings.inBattle = true;
  setPaused(false);
  hud.hideGameOver();
  hud.showRetreat(false);
  hud.setWeatherEnabled(game.weatherEnabled);
  hud.setSound(!profile.data.muted);
  audio.startBattle(game);
  requestAnimationFrame(() => renderer.resize());
}

function showPage(page) {
  document.querySelectorAll('.tab').forEach((t) => {
    const on = t.dataset.page === page;
    t.classList.toggle('active', on);
    t.setAttribute('aria-selected', String(on));
  });
  plans.show(page === 'plans');
  summoning.show(page === 'summon');
  updateWallet();
}

const lastBalance = {};
function updateWallet() {
  for (const cur of ['tokens', 'gems']) {
    const n = profile.balance(cur);
    const el = document.getElementById(`wallet-${cur}`);
    el.textContent = formatNumber(n);
    if (lastBalance[cur] !== undefined && n !== lastBalance[cur]) {
      el.parentElement.classList.remove('bump');
      void el.offsetWidth;
      el.parentElement.classList.add('bump');
    }
    lastBalance[cur] = n;
  }
}

function toPlans() {
  settings.inBattle = false;
  audio.stopBattle();
  hud.hideGameOver();
  hud.showRetreat(false);
  appEl.hidden = true;
  menuEl.hidden = false;
  showPage('plans');
}

// ----------------------------------------------------------------- actions

const actions = {
  nextWave: () => settings.inBattle && game.startNextWave(),
  setAutoSkip(on) {
    game.autoSkip = on;
  },
  callWaves(n) {
    if (!settings.inBattle) return;
    const called = game.callWaves(n);
    if (called > 1) hud.toast(`Called ${called} waves (${game.queuedWaveNumbers().length} queued)`, '#e3a33b');
  },
  toggleWeather() {
    profile.data.weatherEnabled = !game.weatherEnabled;
    profile.save();
    game.setWeatherEnabled(profile.data.weatherEnabled);
    hud.setWeatherEnabled(game.weatherEnabled);
  },
  toggleSound() {
    profile.data.muted = !profile.data.muted;
    profile.save();
    audio.setMuted(profile.data.muted);
    hud.setSound(!profile.data.muted);
  },
  togglePause() {
    if (settings.inBattle && game.phase !== 'gameover') setPaused(!settings.paused);
  },
  setSpeed(s) {
    settings.speed = s;
    hud.setSpeed(s);
  },
  toggleEffects() {
    settings.effects = settings.effects ? 0 : 1;
    renderer.setEffects(settings.effects);
    hud.setEffects(!!settings.effects);
  },
  selectDeploy(defId) {
    ui.selected = null;
    ui.placingDef = ui.placingDef?.id === defId ? null : game.loadout.find((d) => d.id === defId) ?? null;
  },
  upgradeSelected() {
    if (!ui.selected) return;
    if (!game.upgrade(ui.selected)) {
      const info = game.upgradeInfo(ui.selected);
      if (!info.maxed) hud.toast(`Need ${info.cost} coins to upgrade`, '#d9534a');
    }
  },
  sellSelected() {
    if (ui.selected) game.sell(ui.selected);
    ui.selected = null;
  },
  deselect() {
    ui.selected = null;
    ui.placingDef = null;
  },
  askRetreat() {
    if (!settings.inBattle) return;
    setPaused(true);
    hud.showRetreat(true);
  },
  cancelRetreat() {
    hud.showRetreat(false);
    setPaused(false);
  },
  retreat() {
    if (game.wave > 0) profile.recordBattle(game.wave);
    toPlans();
  },
  again() {
    startBattle({ units: game.loadout.map((d) => d.id) });
  },
  toPlans,
};

const hud = new Hud(actions);
const plans = new BattlePlansView({ profile, onBattle: startBattle, onGoto: (p) => showPage(p) });
const summoning = new SummoningView({ profile, onChange: () => updateWallet() });
document.querySelector('.tabs').addEventListener('click', (ev) => {
  const t = ev.target.closest('.tab');
  if (t) showPage(t.dataset.page);
});
renderer.attach(game);
hud.setEffects(!!settings.effects);
hud.onRunStart(game);

game.on('runStart', () => hud.onRunStart(game));
game.on('waveStart', (plan) => hud.onWaveStart(plan, game));
game.on('waveClear', (d) => {
  // Tokens are persisted the moment a wave is completed.
  profile.earn('tokens', d.tokens);
  if (d.gems) profile.earn('gems', d.gems);
  profile.recordWaveCleared();
  profile.save();
  hud.onWaveClear(d, game);
});
game.on('bossArrived', (e) => hud.onBossArrived(e, game));
game.on('sell', ({ refund }) => hud.toast(`Sold for ${refund} coins`, '#8d939e'));
game.on('gameOver', (d) => {
  ui.placingDef = null;
  profile.recordBattle(d.wave);
  setTimeout(() => settings.inBattle && hud.showGameOver(d), 900);
});

showPage('plans');
summoning.show(false);
plans.show(true);
updateWallet();
if (!profile.storageOk) {
  plans.message('Saving is unavailable in this browser (private mode?). Progress will be lost when you close the page.', true);
}

// ----------------------------------------------------------------- input
// Two-tap deployment: tap a unit card (selects, costs nothing), then tap open
// ground to deploy one copy. Only a clean tap (no drag, short press) counts,
// coins are only spent when every check passes, and a second tap arriving
// within DEPLOY_GUARD_MS of a purchase is ignored to stop accidental double-buys.

const TAP_MAX_MOVE = 10;
const TAP_MAX_MS = 600;
const DEPLOY_GUARD_MS = 200;
let press = null;
let lastDeployAt = 0;
let lastWarn = 0;

function tileFromEvent(ev) {
  const p = renderer.toWorld(ev.clientX, ev.clientY);
  return { col: Math.floor(p.x / TILE), row: Math.floor(p.y / TILE) };
}

function handleTap(t) {
  if (!ui.placingDef) {
    ui.selected = game.unitAt(t.col, t.row);
    return;
  }
  const now = performance.now();
  if (now - lastDeployAt < DEPLOY_GUARD_MS) return;
  const reason = game.canDeploy(ui.placingDef.id, t.col, t.row);
  if (!reason) {
    game.deploy(ui.placingDef.id, t.col, t.row);
    lastDeployAt = now;
  } else if (reason === 'blocked' && game.unitAt(t.col, t.row)) {
    // tapping an existing unit while placing opens it instead of buying anything
    ui.selected = game.unitAt(t.col, t.row);
    ui.placingDef = null;
  } else if (reason === 'coins' && now - lastWarn > 1200) {
    lastWarn = now;
    hud.toast(`Not enough coins — ${ui.placingDef.name} costs ${ui.placingDef.price}`, '#d9534a');
  }
}

canvas.addEventListener('pointermove', (ev) => {
  ui.hover = tileFromEvent(ev);
  if (press && Math.hypot(ev.clientX - press.x, ev.clientY - press.y) > TAP_MAX_MOVE) press.moved = true;
});
canvas.addEventListener('pointerleave', () => {
  ui.hover = null;
});
canvas.addEventListener('pointerdown', (ev) => {
  if (!settings.inBattle || ev.button === 2) return;
  audio.unlock();
  ui.hover = tileFromEvent(ev);
  press = { id: ev.pointerId, x: ev.clientX, y: ev.clientY, t: performance.now(), moved: false };
});
canvas.addEventListener('pointerup', (ev) => {
  const p = press;
  press = null;
  if (!p || p.id !== ev.pointerId || p.moved || performance.now() - p.t > TAP_MAX_MS) return;
  handleTap(tileFromEvent(ev));
});
canvas.addEventListener('pointercancel', () => {
  press = null;
});
canvas.addEventListener('contextmenu', (ev) => {
  ev.preventDefault();
  actions.deselect();
});

window.addEventListener('keydown', (ev) => {
  if (ev.target instanceof HTMLInputElement || ev.target instanceof HTMLSelectElement) return;
  if (!settings.inBattle) {
    if (ev.key === 'Enter' && !document.getElementById('screen-plans').hidden && document.getElementById('screen-confirm').hidden) plans.battle();
    return;
  }
  const slot = SLOT_KEYS.indexOf(ev.key);
  if (slot >= 0 && game.loadout[slot]) {
    actions.selectDeploy(game.loadout[slot].id);
    return;
  }
  switch (ev.key) {
    case ' ':
      ev.preventDefault();
      actions.togglePause();
      break;
    case 'Escape':
      actions.deselect();
      break;
    case 'f':
    case 'F':
      actions.setSpeed((settings.speed % 3) + 1);
      break;
    case 'u':
    case 'U':
      actions.upgradeSelected();
      break;
    case 'x':
    case 'X':
    case 'Delete':
      actions.sellSelected();
      break;
    case 'n':
    case 'N':
    case 'Enter':
      actions.nextWave();
      break;
    default:
  }
});

window.addEventListener('resize', () => settings.inBattle && renderer.resize());
new ResizeObserver(() => settings.inBattle && renderer.resize()).observe(canvas.parentElement);

// ----------------------------------------------------------------- loop

const STEP = GAME_CONFIG.fixedStep;
let last = performance.now();
let acc = 0;

function frame(now) {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  if (settings.inBattle) {
    let gameDt = 0;
    if (!settings.paused && game.phase !== 'gameover') {
      acc += dt * settings.speed;
      let steps = 0;
      while (acc >= STEP && steps < 10) {
        game.update(STEP);
        acc -= STEP;
        steps++;
      }
      if (steps >= 10) acc = 0;
      gameDt = steps * STEP;
    } else if (game.phase === 'gameover') {
      gameDt = dt;
    }
    if (ui.selected && !ui.selected.placed) ui.selected = null;
    renderer.render(dt, gameDt);
    hud.update(game, ui);
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// Exposed for debugging and automated screenshots.
window.endlessTower = { game, renderer, settings, actions, profile, plans, summoning };

// Boot complete: hide the loader.
window.__etBooted = true;
document.getElementById('boot').hidden = true;
