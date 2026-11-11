// Entry point: wires the headless Game to the Renderer, HUD and input.
import { TILE, GAME_CONFIG } from './config.js';
import { Game } from './game/Game.js';
import { Renderer } from './render/Renderer.js';
import { Hud } from './ui/hud.js';
import { registerRoster } from './units/roster.js';
import { randomSeed } from './core/rng.js';

registerRoster();

const canvas = document.getElementById('game');
const params = new URLSearchParams(location.search);
const settings = {
  speed: 1,
  paused: false,
  effects: params.get('fx') === '0' ? 0 : 1,
  started: false,
  realm: params.get('realm') || null,
};

const seedParam = params.get('seed');
const game = new Game({ seed: seedParam ? Number(seedParam) : randomSeed(), biomeId: settings.realm });
const renderer = new Renderer(canvas, { effects: settings.effects });
const ui = renderer.ui;

// ----------------------------------------------------------------- actions

const actions = {
  summon(n) {
    game.summon(n);
  },
  nextWave() {
    if (!settings.started) return;
    game.startNextWave();
  },
  setAuto(on) {
    game.autoStart = on;
    game.autoTimer = Math.min(game.autoTimer, GAME_CONFIG.autoStartDelay);
  },
  togglePause() {
    if (!settings.started || game.phase === 'gameover') return;
    settings.paused = !settings.paused;
    hud.setPaused(settings.paused);
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
  selectBench(defId) {
    if (ui.placingDef?.id === defId) {
      ui.placingDef = null;
      return;
    }
    const entry = game.bench.find((u) => u.def.id === defId);
    ui.placingDef = entry ? entry.def : null;
    ui.selected = null;
  },
  recallSelected() {
    if (ui.selected) game.recallUnit(ui.selected);
    ui.selected = null;
  },
  deselect() {
    ui.selected = null;
    ui.placingDef = null;
  },
  begin() {
    settings.started = true;
    hud.showStart(false);
  },
  reroll() {
    game.newRun({ biomeId: settings.realm });
  },
  chooseRealm(id) {
    settings.realm = id;
    hud.renderRealmChips(id);
    game.newRun({ biomeId: id });
  },
  again() {
    hud.hideGameOver();
    settings.paused = false;
    hud.setPaused(false);
    game.newRun({ biomeId: settings.realm });
  },
};

const hud = new Hud(actions);
renderer.attach(game);
hud.renderRealmChips(settings.realm);
hud.setEffects(!!settings.effects);
hud.onRunStart(game);

game.on('runStart', () => {
  ui.placingDef = null;
  ui.selected = null;
  hud.onRunStart(game);
});
game.on('waveStart', (plan) => hud.onWaveStart(plan, game));
game.on('waveClear', (d) => hud.onWaveClear(d));
game.on('bossArrived', (e) => hud.onBossArrived(e, game));
game.on('summon', (units) => hud.onSummon(units));
game.on('gameOver', (d) => {
  ui.placingDef = null;
  setTimeout(() => hud.showGameOver(d), 900);
});

// ----------------------------------------------------------------- input

let dragging = false;
let lastPlaced = null;

function tileFromEvent(ev) {
  const p = renderer.toWorld(ev.clientX, ev.clientY);
  return { col: Math.floor(p.x / TILE), row: Math.floor(p.y / TILE) };
}

function tryPlace(t) {
  if (!ui.placingDef) return;
  const key = `${t.col},${t.row}`;
  if (key === lastPlaced) return;
  if (game.placeFromBench(ui.placingDef.id, t.col, t.row)) {
    lastPlaced = key;
    if (!game.bench.some((u) => u.def.id === ui.placingDef.id)) ui.placingDef = null;
  }
}

canvas.addEventListener('pointermove', (ev) => {
  ui.hover = tileFromEvent(ev);
  if (dragging) tryPlace(ui.hover);
});
canvas.addEventListener('pointerleave', () => {
  ui.hover = null;
});
canvas.addEventListener('pointerdown', (ev) => {
  if (!settings.started) return;
  const t = tileFromEvent(ev);
  ui.hover = t;
  if (ev.button === 2) return;
  if (ui.placingDef) {
    dragging = true;
    lastPlaced = null;
    canvas.setPointerCapture(ev.pointerId);
    tryPlace(t);
    return;
  }
  ui.selected = game.unitAt(t.col, t.row);
});
window.addEventListener('pointerup', () => {
  dragging = false;
  lastPlaced = null;
});
canvas.addEventListener('contextmenu', (ev) => {
  ev.preventDefault();
  actions.deselect();
});

window.addEventListener('keydown', (ev) => {
  if (ev.target instanceof HTMLInputElement) return;
  if (!settings.started) {
    if (ev.key === 'Enter') actions.begin();
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
    case '1':
    case '2':
    case '3':
      actions.setSpeed(Number(ev.key));
      break;
    case 's':
    case 'S':
      actions.summon(ev.shiftKey ? 10 : 1);
      break;
    case 'n':
    case 'N':
    case 'Enter':
      actions.nextWave();
      break;
    case 'r':
    case 'R':
      actions.recallSelected();
      break;
    default:
  }
});

let resizeTimer = 0;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => renderer.resize(), 80);
});
new ResizeObserver(() => renderer.resize()).observe(canvas.parentElement);

// ----------------------------------------------------------------- loop

const STEP = GAME_CONFIG.fixedStep;
let last = performance.now();
let acc = 0;

function frame(now) {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  let gameDt = 0;
  if (settings.started && !settings.paused && game.phase !== 'gameover') {
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
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// Exposed for debugging and automated screenshots.
window.endlessTower = { game, renderer, settings, actions };
