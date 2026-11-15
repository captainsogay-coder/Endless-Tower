// Turns game events into sound, with mixing rules that keep massive waves
// listenable:
//   - per-kind minimum gaps (a hundred Gunnermen sound like a firefight, not static)
//   - a global voice budget per 100 ms; beyond it, quieter sounds are dropped
//   - loudness scales down as the budget fills
// Also runs the realm ambience and the weather layer.
import { impactWeight } from '../render/impact.js';
import * as sfx from './sfx.js';
import { Music } from './music.js';
import { chaseOf } from '../render/chaseStandard.js';

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
  bossWarn: 0.5,
  // Circle Pack 3
  trainingsword: 0.05,
  spearjab: 0.05,
  blunt: 0.05,
  rapier: 0.04,
  icearrow: 0.05,
  icespear: 0.05,
  pagebolt: 0.05,
  rune: 0.06,
  spellcut: 0.04,
  rivetburst: 0.04,
  magma: 0.12,
  titanshell: 0.12,
  steelfist: 0.15,
  forgehammer: 0.12,
  freeze: 0.1,
  chase: 0.5,
};
const BUDGET_WINDOW = 0.1;
const BUDGET = 10;
const WEATHER_LOOP = { rainy: 'rain', windy: 'wind', thunderstorm: 'storm', aurora: 'aurora', nova: 'nova', ghastly: 'ghastly', starfall: 'starfall', twilight: 'twilight' };
/** Weathers with their own music theme (it replaces the battle theme while the weather lasts; bosses still win). */
const WEATHER_THEME = { ghastly: 'ghastly', starfall: 'starfall', twilight: 'twilight' };
const GHOST_FACTION = 'the-ghost';

/**
 * Which theme plays in battle (one at a time; Music crossfades on change):
 * boss → a weather theme → The Ghost (when Ghost units make up at least half
 * the field, 2+) → battle in a wave, main between waves.
 */
export function battleTheme(game) {
  if (game.boss?.alive) return 'boss';
  const w = WEATHER_THEME[game.weather?.current?.id];
  if (w) return w;
  const units = game.units ?? [];
  const ghosts = units.filter((u) => u.def?.faction === GHOST_FACTION).length;
  const wave = game.phase === 'wave';
  if (ghosts >= 2 && ghosts * 2 >= units.length) return wave ? 'ghostBattle' : 'ghost';
  return wave ? 'battle' : 'main';
}

export class AudioDirector {
  constructor({ muted = false } = {}) {
    this.last = new Map();
    this.window = [];
    this.ambience = null;
    this.weatherLoop = null;
    this.active = false;
    this.music = new Music();
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
    if (t - (this.last.get(kind) ?? -1) < (MIN_GAP[kind] ?? (kind.startsWith('chase:') ? 0.6 : 0.05))) return 0;
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
      if (!['grenade', 'shell', 'siege', 'artillery', 'drone', 'explosive-drone', 'dynamite', 'missile', 'icbm', 'warhead', 'antimatter', 'boulder', 'trebuchet', 'bombball', 'seedpod', 'stormball', 'comet', 'void', 'thornburst', 'magma', 'titanshell', 'hailstone', 'forgehammer'].includes(p.kind)) return;
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
    game.on('chaseCast', (c) => {
      const v = this.allow('chase');
      if (v) sfx.chaseCast(c.kind, v);
    });
    game.on('worldbreak', () => this.active && sfx.worldbreak());
    game.on('starfall', () => {
      const v = this.allow('starfall');
      if (v) sfx.starStrike(v);
    });
    game.on('celestialPulse', () => {
      const v = this.allow('celestialPulse');
      if (v) sfx.celestialPulse(v);
    });
    game.on('freeze', () => {
      const v = this.allow('freeze');
      if (v) sfx.freeze(v);
    });
    game.on('bossArrived', () => this.active && sfx.bossRoar());
    game.on('bossTelegraph', () => {
      const v = this.allow('bossWarn');
      if (v) sfx.bossWarn(v);
    });
    game.on('warCry', () => this.active && sfx.bossRoar());
    // every chase unit's special has its own sound (Chase Unit Standard)
    game.on('unitSpecial', (u) => {
      const c = chaseOf(u.def.id);
      if (!c) return;
      const v = this.allow(`chase:${u.def.id}`);
      if (v) sfx.chaseSignature(c.sfx, v);
    });
    game.on('bossDefeated', () => this.active && sfx.bossFanfare());
    game.on('mapEvent', (e) => {
      if (!this.active) return;
      if (e.phase === 'start') sfx.eventChime(e.event.def.kind);
      if (e.phase === 'start' && e.event.def.id === 'meteor-shower') sfx.meteor();
      if (e.phase === 'trade') sfx.coins(true);
    });
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
    this.music.start(game.biome.id);
    this.music.play(battleTheme(game));
  }

  /** Once per frame in battle: the music follows the fight (see battleTheme). */
  update(game) {
    if (!this.active) return;
    this.music.play(battleTheme(game));
  }

  /** The summoning screen: The Ghost circle has its own theme; picking a circle plays its motif. */
  summonCircle(banner, picked) {
    if (this.active) return;
    sfx.unlock();
    this.music.start('menu');
    this.music.play(banner?.id === 'the-ghost-circle' ? 'ghost' : 'main');
    if (picked && banner) this.music.circleMotif(banner.id);
  }

  /** Menus: calm music once audio is allowed (after the first click or tap). */
  menuMusic() {
    sfx.unlock();
    if (!this.active) {
      this.music.start('menu');
      this.music.play('main');
    }
  }

  stopBattle() {
    this.active = false;
    this.music.start('menu');
    this.music.play('main');
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
