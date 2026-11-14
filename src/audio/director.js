// Turns game events into sound, with mixing rules that keep massive waves
// listenable:
//   - per-kind minimum gaps (a hundred Gunnermen sound like a firefight, not static)
//   - a global voice budget per 100 ms; beyond it, quieter sounds are dropped
//   - loudness scales down as the budget fills
// Also runs the realm ambience and the weather layer.
import { impactWeight } from '../render/impact.js';
import * as sfx from './sfx.js';

const MIN_GAP = {
  pierce: 0.08,
  zap: 0.06,
  blessing: 0.4,
  rivet: 0.04,
  dart: 0.04,
  spark: 0.05,
  windbolt: 0.05,
  claw: 0.06,
  pebble: 0.06,
  bullet: 0.035,
  grenade: 0.09,
  shell: 0.14,
  siege: 0.2,
  artillery: 0.15,
  drone: 0.12,
  'explosive-drone': 0.12,
  revolver: 0.03,
  golden: 0.1,
  bottle: 0.1,
  dynamite: 0.12,
  card: 0.05,
  chip: 0.05,
  sequin: 0.08,
  missile: 0.12,
  icbm: 0.3,
  warhead: 0.4,
  antimatter: 0.4,
  coins: 0.15,
  slash: 0.05,
  thrust: 0.05,
  smite: 0.2,
  stone: 0.05,
  arrow: 0.05,
  xbolt: 0.08,
  ballista: 0.15,
  boulder: 0.2,
  trebuchet: 0.4,
  bombball: 0.1,
  flyover: 1,
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
    game.on('beam', (b) => {
      const v = this.allow('pierce');
      if (v) sfx.pierce(b.kind, v);
    });
    game.on('zap', (z) => {
      const v = this.allow('zap');
      if (v) sfx.zap(z.kind === 'zenith', v);
    });
    game.on('buffPulse', () => {
      const v = this.allow('blessing');
      if (v) sfx.blessing(v);
    });
    game.on('impact', (p) => {
      if (!['grenade', 'shell', 'siege', 'artillery', 'drone', 'explosive-drone', 'dynamite', 'missile', 'icbm', 'warhead', 'antimatter', 'boulder', 'trebuchet', 'bombball', 'seedpod', 'stormball', 'comet', 'void', 'thornburst'].includes(p.kind)) return;
      const v = this.allow('explosion');
      // louder and deeper only when the hit really matters
      const w = Math.min(1, impactWeight(game, p.damage, p.target));
      if (v) sfx.explosion(((p.splash || 32) / 32) * (0.5 + 0.5 * w), v * (0.4 + 0.6 * w));
    });
    game.on('blast', (b) => {
      const v = this.allow('explosion');
      const w = b.damage == null ? 0.7 : Math.min(1, impactWeight(game, b.damage));
      if (v) sfx.explosion(Math.min(4, b.radius / 32) * (0.5 + 0.5 * w), v * (0.4 + 0.6 * w));
    });
    game.on('bonusCoins', (c) => {
      const v = this.allow('coins');
      if (v) sfx.coins(!!c.label, v);
    });
    game.on('flyover', (f) => {
      const v = this.allow('flyover');
      if (v) sfx.flyover(Math.min(3, f.duration));
    });
    game.on('field', (f) => this.active && sfx.implode(f.duration));
    game.on('houseWheel', () => this.active && sfx.reelStop(1.2));
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
