// Turns game events into sound, with mixing rules that keep massive waves
// listenable:
//   - per-kind minimum gaps (a hundred Gunnermen sound like a firefight, not static)
//   - a global voice budget per 100 ms; beyond it, quieter sounds are dropped
//   - loudness scales down as the budget fills
// Also runs the realm ambience and the weather layer.
import * as sfx from './sfx.js';

const MIN_GAP = {
  pebble: 0.06,
  bullet: 0.035,
  grenade: 0.09,
  shell: 0.14,
  siege: 0.2,
  artillery: 0.15,
  drone: 0.12,
  'explosive-drone': 0.12,
  explosion: 0.05,
  death: 0.08,
};
const BUDGET_WINDOW = 0.1;
const BUDGET = 10;
const WEATHER_LOOP = { rainy: 'rain', windy: 'wind', thunderstorm: 'storm', aurora: 'aurora', nova: 'nova' };

export class AudioDirector {
  constructor({ muted = false } = {}) {
    this.last = new Map();
    this.window = [];
    this.ambience = null;
    this.weatherLoop = null;
    this.active = false;
    sfx.setMuted(muted);
  }

  unlock() {
    sfx.unlock();
  }

  setMuted(m) {
    sfx.setMuted(m);
  }

  now() {
    return performance.now() / 1000;
  }

  /** Returns a loudness 0..1 if this sound may play now, or 0 to drop it. */
  allow(kind) {
    if (!this.active || !sfx.ready()) return 0;
    const t = this.now();
    if (t - (this.last.get(kind) ?? -1) < (MIN_GAP[kind] ?? 0.05)) return 0;
    while (this.window.length && t - this.window[0] > BUDGET_WINDOW) this.window.shift();
    if (this.window.length >= BUDGET) return 0;
    this.last.set(kind, t);
    this.window.push(t);
    return 1 - (this.window.length / BUDGET) * 0.6;
  }

  attach(game) {
    this.game = game;
    game.on('fire', (p) => {
      const v = this.allow(p.kind);
      if (v) sfx.shot(p.kind, v);
    });
    game.on('impact', (p) => {
      if (!['grenade', 'shell', 'siege', 'artillery', 'drone', 'explosive-drone'].includes(p.kind)) return;
      const v = this.allow('explosion');
      if (v) sfx.explosion((p.splash || 32) / 32, v);
    });
    game.on('lightning', () => this.active && sfx.lightning());
    game.on('bossArrived', () => this.active && sfx.bossRoar());
    game.on('waveStart', () => {
      const v = this.allow('wave');
      if (v) sfx.click(0.6);
    });
    game.on('weather', (w) => this.setWeather(w));
    game.on('runStart', () => this.active && this.startAmbience(game.biome.id));
  }

  startBattle(game) {
    this.active = true;
    sfx.unlock();
    this.startAmbience(game.biome.id);
    this.setWeather(game.weather.current);
  }

  stopBattle() {
    this.active = false;
    this.ambience?.stop();
    this.ambience = null;
    this.weatherLoop?.stop();
    this.weatherLoop = null;
  }

  startAmbience(biomeId) {
    this.ambience?.stop();
    this.ambience = sfx.loop(biomeId);
  }

  setWeather(w) {
    this.weatherLoop?.stop(2);
    this.weatherLoop = null;
    if (w && this.active) this.weatherLoop = sfx.loop(WEATHER_LOOP[w.id]);
  }
}
