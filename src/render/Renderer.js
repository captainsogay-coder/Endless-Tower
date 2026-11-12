// Draws the game state. Owns all cosmetic state (effects, shake, cinematic
// overlays) so the simulation stays deterministic and headless.
//
// Art direction: one light source (top-left), soft contact shadows, flat
// fills with tinted outlines. Glow is reserved for things that emit light in
// the world (lava, runes). Screen shake is reserved for bosses.

import { WORLD_W, WORLD_H, TILE, COLS, ROWS } from '../config.js';
import { TileType, tileIndex } from '../maps/mapGenerator.js';
import { MapScene } from '../maps/MapScene.js';
import { buildEnemySprites } from './enemySprites.js';
import { drawUnit, unitSprite } from './unitArt.js';
import { Effects } from './fx.js';
import { WeatherFx } from './weatherFx.js';
import { circle, drawGlow } from './canvas.js';
import { rgba, shade } from '../core/color.js';
import { getTrait } from '../waves/traits.js';
import { TAU, easeOutBack, clamp } from '../core/math.js';

const DEATH_PARTICLES = { minion: 4, regular: 6, elite: 12, boss: 40 };
const PLAYER_COLOR = '#e3a33b';
const STONE = '#9a958c';

export class Renderer {
  constructor(canvas, { effects = 1 } = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.effectsLevel = effects;
    this.fx = new Effects();
    this.scale = 1;
    this.dpr = 1;
    this.shakeAmt = 0;
    this.shakeX = 0;
    this.shakeY = 0;
    this.time = 0;
    this.towerHit = 0;
    this.breachPulse = [];
    this.bossFlash = 0;
    this.ui = { hover: null, placingDef: null, selected: null };
    this.blasts = []; // flat, short-lived explosion shapes
    this.decals = []; // scorch marks on the ground
    this.weatherFx = new WeatherFx();
    this.unsub = [];
  }

  attach(game) {
    this.game = game;
    this.unsub.forEach((u) => u());
    this.unsub = [];
    const on = (t, fn) => this.unsub.push(game.on(t, fn));
    const rebuild = () => {
      this.scene = new MapScene(game.map, game.biome, { effects: this.effectsLevel, shake: (a) => this.shake(a) });
      this.sprites = buildEnemySprites(game.biome.enemyPalette);
      this.breachPulse = game.map.entrances.map(() => 0);
      this.fx = new Effects();
      this.blasts = [];
      this.decals = [];
      this.ui.selected = null;
      this.ui.placingDef = null;
      this.resize();
    };
    rebuild();
    on('runStart', rebuild);
    on('spawn', (e) => {
      this.breachPulse[e.routeIndex] = Math.min(1, (this.breachPulse[e.routeIndex] ?? 0) + (e.isBoss ? 1 : 0.3));
    });
    on('death', (e) => this.onDeath(e));
    on('impact', (p) => this.onImpact(p));
    on('fire', (p) => this.onFire(p));
    on('leak', () => {
      this.towerHit = 1;
    });
    on('place', (u) => {
      this.fx.burst(u.x, u.y + 6, 5, '#d9cdb5', { speed: 28, life: 0.35, size: 2, glow: false });
    });
    on('upgrade', (u) => {
      this.fx.ring(u.x, u.y + 4, 4, 16, 0.35, PLAYER_COLOR, 1.5);
    });
    on('sell', ({ unit }) => {
      this.fx.burst(unit.x, unit.y + 4, 6, '#d9cdb5', { speed: 34, life: 0.4, size: 2, glow: false });
      if (this.ui.selected === unit) this.ui.selected = null;
    });
    on('waveStart', () => {
      for (let i = 0; i < this.breachPulse.length; i++) this.breachPulse[i] = 1;
    });
    on('bossIntro', ({ enemy }) => {
      this.shake(3);
      this.fx.ring(enemy.x, enemy.y, 10, 120, 1.0, game.biome.enemyPalette.body, 3);
    });
    on('bossArrived', (e) => {
      this.shake(5);
      this.bossFlash = 0.35;
      this.fx.ring(e.x, e.y, 20, 160, 0.8, '#ffffff', 3);
    });
    on('lightning', (l) => {
      this.weatherFx.strike(l.x, l.y);
      this.blasts.push({ x: l.x, y: l.y, r: l.radius, t: 0, max: 0.25, seed: Math.random() * 6, palette: 'lightning' });
      this.decals.push({ x: l.x, y: l.y, r: l.radius * 0.5, t: 0, max: 4, seed: Math.random() * 6 });
      this.fx.ring(l.x, l.y, 4, l.radius * 1.2, 0.3, '#e8ecff', 2);
    });
    on('bossDefeated', (e) => {
      this.shake(7);
      this.bossFlash = 0.4;
      this.fx.ring(e.x, e.y, 20, 200, 1.0, '#ffffff', 4);
    });
  }

  setEffects(level) {
    this.effectsLevel = level;
    if (this.scene) this.scene.effects = level;
  }

  shake(amount) {
    this.shakeAmt = Math.min(8, Math.max(this.shakeAmt, amount * (0.5 + 0.5 * this.effectsLevel)));
  }

  /** Impact feedback scales with the weapon: dust for pebbles, sparks for bullets, blasts for explosives. */
  onImpact(p) {
    const d = this.fx.density;
    switch (p.kind) {
      case 'pebble':
        if (Math.random() < 0.6 * d) this.fx.burst(p.x, p.y, 2, '#cbbfa8', { speed: 30, life: 0.3, size: 1.6, glow: false });
        break;
      case 'bullet':
        if (Math.random() < 0.35 * d) this.fx.burst(p.x, p.y, 1, '#f4e3a1', { speed: 50, life: 0.12, size: 1.2, glow: false });
        break;
      case 'grenade':
      case 'shell':
      case 'artillery':
      case 'siege':
      case 'drone':
      case 'explosive-drone': {
        const big = p.kind !== 'grenade' && p.kind !== 'drone';
        const r = p.splash || (big ? 48 : 36);
        const max = p.kind === 'siege' ? 0.45 : big ? 0.32 : 0.26;
        // Under heavy AOE load, thin out repeated blasts rather than stacking hundreds of shapes.
        if (this.blasts.length < 90 || p.kind === 'siege' || p.kind === 'explosive-drone') {
          this.blasts.push({ x: p.x, y: p.y, r, t: 0, max, seed: Math.random() * 6, palette: p.kind === 'explosive-drone' ? 'hot' : null });
          if (this.blasts.length > 120) this.blasts.shift();
        }
        this.decals.push({ x: p.x, y: p.y, r: r * 0.55, t: 0, max: big ? 6 : 4, seed: Math.random() * 6 });
        if (this.decals.length > 140) this.decals.shift();
        this.fx.ring(p.x, p.y, r * 0.3, r * 1.05, 0.35, '#d8cbb0', 2);
        if (p.kind === 'siege') this.fx.ring(p.x, p.y, r * 0.6, r * 1.6, 0.6, '#efe6d0', 3);
        if (p.kind === 'explosive-drone') this.fx.ring(p.x, p.y, r * 0.2, r * 0.9, 0.3, '#d9533f', 2.5);
        this.fx.burst(p.x, p.y, Math.round((big ? 8 : 5) * d), '#3a332c', { speed: 70 + r, life: 0.5, size: 2, glow: false, gravity: 120 });
        break;
      }
      default:
        if (Math.random() < 0.5 * d) this.fx.burst(p.x, p.y, 2, p.color ?? '#e8e2d4', { speed: 40, life: 0.2, size: 1.5, glow: false });
    }
    if (p.splash > 0 && !['grenade', 'shell', 'artillery', 'siege', 'drone', 'explosive-drone'].includes(p.kind)) this.fx.ring(p.x, p.y, 4, p.splash, 0.3, '#ffffff', 1.5);
  }

  onFire(p) {
    const u = p.source;
    if (!u) return;
    if (u.def.art === 'gunnerman' && Math.random() < 0.35 * this.fx.density) {
      // ejected brass, flicked to the side away from the target
      this.fx.particle(u.x - u.facing * 2, u.y - 1, -u.facing * (20 + Math.random() * 20), -40 - Math.random() * 20, 0.35, 1.6, '#c9a24a', { glow: false, gravity: 260, drag: 0.98, shrink: false });
    } else if (u.def.art === 'tank') {
      const mx = u.x + Math.cos(u.angle) * 20;
      const my = u.y + Math.sin(u.angle) * 20;
      for (let i = 0; i < 3; i++) this.fx.particle(mx, my, Math.cos(u.angle) * 30 + (Math.random() - 0.5) * 20, Math.sin(u.angle) * 30 - 10, 0.6, 4, '#8a857c', { glow: false, drag: 0.92 });
    }
  }

  onDeath(e) {
    const pal = this.game.biome.enemyPalette;
    const n = DEATH_PARTICLES[e.category] ?? 6;
    this.fx.burst(e.x, e.y, n, pal.body, { speed: 24 + e.radius * 4, life: 0.45, size: 1.6 + e.radius * 0.12, glow: false });
    this.fx.burst(e.x, e.y, Math.ceil(n / 2), pal.dark, { speed: 18 + e.radius * 3, life: 0.45, size: 1.4 + e.radius * 0.1, glow: false });
    if (e.category === 'elite' || e.isBoss) {
      this.fx.ring(e.x, e.y, e.radius * 0.6, e.radius * 2.2, 0.4, pal.body, 2);
      this.fx.text(e.x, e.y - e.radius, `+${e.reward}`, '#f2d38a', e.isBoss ? 16 : 11);
    }
  }

  /** Fit the world into the canvas' parent while keeping aspect ratio. */
  resize() {
    const parent = this.canvas.parentElement;
    if (!parent) return;
    const r = parent.getBoundingClientRect();
    if (r.width < 10 || r.height < 10) return;
    const scale = Math.max(0.2, Math.min(r.width / WORLD_W, r.height / WORLD_H));
    this.scale = scale;
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.floor(WORLD_W * scale);
    const h = Math.floor(WORLD_H * scale);
    this.canvas.style.width = `${w}px`;
    this.canvas.style.height = `${h}px`;
    this.canvas.width = Math.floor(w * this.dpr);
    this.canvas.height = Math.floor(h * this.dpr);
    this.scene?.ensureTerrain(scale * this.dpr);
  }

  toWorld(clientX, clientY) {
    const r = this.canvas.getBoundingClientRect();
    return { x: ((clientX - r.left) / r.width) * WORLD_W, y: ((clientY - r.top) / r.height) * WORLD_H };
  }

  render(dt, gameDt) {
    const { ctx, scene } = this;
    if (!scene) return;
    if (!scene.terrain) {
      // the battle screen was hidden when the map was built; size up now
      this.resize();
      if (!scene.terrain) return;
    }
    this.time += dt;
    scene.update(dt);
    this.fx.update(gameDt);
    this.weatherFx.update(dt, this.game.weather?.current, this.effectsLevel);
    this.towerHit = Math.max(0, this.towerHit - dt * 3);
    this.bossFlash = Math.max(0, this.bossFlash - dt);
    for (let i = 0; i < this.breachPulse.length; i++) this.breachPulse[i] = Math.max(0, this.breachPulse[i] - dt * 1.2);
    this.shakeAmt = Math.max(0, this.shakeAmt - dt * 18);
    this.shakeX = (Math.random() * 2 - 1) * this.shakeAmt;
    this.shakeY = (Math.random() * 2 - 1) * this.shakeAmt;

    const k = this.scale * this.dpr;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#0d0f13';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.setTransform(k, 0, 0, k, this.shakeX * k, this.shakeY * k);

    const t = this.time;
    scene.drawBackground(ctx);
    scene.drawTerrain(ctx);
    scene.drawUnder(ctx);
    this.weatherFx.drawUnder(ctx);
    this.drawDecals(ctx, gameDt);
    this.drawHazards(ctx, t);
    this.drawBreaches(ctx, t);
    if (this.ui.placingDef) this.drawPlacementGrid(ctx);
    this.drawTower(ctx, t);
    this.drawRangePreview(ctx);
    this.drawCinematicUnder(ctx, t);
    this.drawActors(ctx, t);
    this.drawProjectiles(ctx);
    this.drawBlasts(ctx, gameDt);
    this.drawPlacementGhost(ctx);
    this.fx.draw(ctx);
    scene.drawOver(ctx);
    this.weatherFx.drawOver(ctx);
    this.drawCinematicOver(ctx);
  }

  // -------------------------------------------------------------- layers

  drawDecals(ctx, dt) {
    let w = 0;
    for (let i = 0; i < this.decals.length; i++) {
      const d = this.decals[i];
      d.t += dt;
      if (d.t >= d.max) continue;
      const a = 0.45 * Math.min(1, (d.max - d.t) / 1.5);
      ctx.fillStyle = `rgba(28,20,16,${a})`;
      ctx.beginPath();
      for (let k = 0; k < 9; k++) {
        const ang = (k / 9) * TAU;
        const rr = d.r * (0.7 + 0.3 * Math.abs(Math.sin(d.seed + k * 1.7)));
        ctx.lineTo(d.x + Math.cos(ang) * rr, d.y + Math.sin(ang) * rr * 0.75);
      }
      ctx.closePath();
      ctx.fill();
      this.decals[w++] = d;
    }
    this.decals.length = w;
  }

  /** Burning ground: flickering flame tongues over a scorched patch. Fire is a light source, so it may glow softly. */
  drawHazards(ctx, t) {
    const hz = this.game.hazards;
    if (!hz.length) return;
    for (const h of hz) {
      const life = Math.min(1, h.ttl / h.max, (h.max - h.ttl) * 6 + 0.2);
      ctx.fillStyle = `rgba(40,18,10,${0.35 * life})`;
      ctx.beginPath();
      ctx.ellipse(h.x, h.y, h.radius, h.radius * 0.7, 0, 0, TAU);
      ctx.fill();
      drawGlow(ctx, '#e0742e', h.x, h.y - 4, h.radius * 1.2, 0.18 * life);
      const n = 6;
      for (let k = 0; k < n; k++) {
        const a = (k / n) * TAU + h.x * 0.13;
        const rr = h.radius * (0.25 + 0.5 * ((k * 37) % 10) / 10);
        const fx = h.x + Math.cos(a) * rr;
        const fy = h.y + Math.sin(a) * rr * 0.7;
        const flick = 0.75 + 0.25 * Math.sin(t * 14 + k * 2.1 + h.y);
        const fh = (5 + (k % 3) * 2.2) * flick * life;
        this.flame(ctx, fx, fy, fh);
      }
    }
  }

  flame(ctx, x, y, h) {
    ctx.fillStyle = '#c5401c';
    ctx.beginPath();
    ctx.moveTo(x - h * 0.42, y);
    ctx.quadraticCurveTo(x - h * 0.45, y - h * 0.6, x, y - h);
    ctx.quadraticCurveTo(x + h * 0.45, y - h * 0.6, x + h * 0.42, y);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#f2a23a';
    ctx.beginPath();
    ctx.moveTo(x - h * 0.22, y);
    ctx.quadraticCurveTo(x - h * 0.24, y - h * 0.4, x, y - h * 0.62);
    ctx.quadraticCurveTo(x + h * 0.24, y - h * 0.4, x + h * 0.22, y);
    ctx.closePath();
    ctx.fill();
  }

  /** Explosions: a flat, hard-edged burst that pops and shrinks – readable, no bloom. */
  drawBlasts(ctx, dt) {
    let w = 0;
    for (let i = 0; i < this.blasts.length; i++) {
      const b = this.blasts[i];
      b.t += dt;
      if (b.t >= b.max) continue;
      const k = b.t / b.max;
      const grow = k < 0.3 ? k / 0.3 : 1;
      const r = b.r * (0.45 + 0.4 * grow) * (k > 0.5 ? 1 - (k - 0.5) * 0.6 : 1);
      const pts = 10;
      const shape = (rad, col) => {
        ctx.fillStyle = col;
        ctx.beginPath();
        for (let j = 0; j < pts; j++) {
          const a = (j / pts) * TAU + b.seed;
          const rr = rad * (j % 2 ? 0.62 : 1) * (0.85 + 0.15 * Math.sin(b.seed * 3 + j));
          ctx.lineTo(b.x + Math.cos(a) * rr, b.y + Math.sin(a) * rr * 0.8);
        }
        ctx.closePath();
        ctx.fill();
      };
      ctx.globalAlpha = 1 - Math.max(0, k - 0.4) / 0.6;
      if (k < 0.15) drawGlow(ctx, '#ffd38a', b.x, b.y, b.r * 1.2, 0.35);
      const pal = b.palette === 'lightning' ? ['#cfd8ff', '#ffffff'] : b.palette === 'hot' ? ['#d9432c', '#ffcf6a'] : ['#e8742c', '#ffd57a'];
      shape(r, k < 0.55 ? pal[0] : '#6d5e52');
      shape(r * 0.62, k < 0.4 ? pal[1] : '#8b7d70');
      ctx.globalAlpha = 1;
      this.blasts[w++] = b;
    }
    this.blasts.length = w;
  }

  drawPlacementGrid(ctx) {
    const { game } = this;
    ctx.strokeStyle = 'rgba(255,255,255,0.16)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const i = tileIndex(x, y);
        if (game.map.grid[i] !== TileType.GROUND || game.unitByTile[i]) continue;
        ctx.rect(x * TILE + 3.5, y * TILE + 3.5, TILE - 7, TILE - 7);
      }
    }
    ctx.stroke();
    const h = this.ui.hover;
    if (h) {
      const reason = game.canDeploy(this.ui.placingDef.id, h.col, h.row);
      const ok = !reason;
      ctx.strokeStyle = ok ? '#f2efe6' : reason === 'coins' ? '#e3a33b' : '#d9534a';
      ctx.lineWidth = 2;
      ctx.strokeRect(h.col * TILE + 1.5, h.row * TILE + 1.5, TILE - 3, TILE - 3);
    }
  }

  drawPlacementGhost(ctx) {
    const { ui, game } = this;
    if (!ui.placingDef || !ui.hover || !game.canPlace(ui.hover.col, ui.hover.row)) return;
    const s = unitSprite(ui.placingDef.art, 0, 1, 0);
    ctx.globalAlpha = game.coins >= ui.placingDef.price ? 0.75 : 0.35;
    ctx.drawImage(s.img, ui.hover.col * TILE + TILE / 2 + s.ox, ui.hover.row * TILE + TILE / 2 + 9 + s.oy, s.w, s.h);
    ctx.globalAlpha = 1;
  }

  drawRangePreview(ctx) {
    const { ui, game } = this;
    let x;
    let y;
    let range;
    if (ui.placingDef && ui.hover && game.canPlace(ui.hover.col, ui.hover.row)) {
      x = ui.hover.col * TILE + TILE / 2;
      y = ui.hover.row * TILE + TILE / 2;
      range = ui.placingDef.levels[0].range;
    } else if (ui.selected?.placed) {
      ({ x, y } = ui.selected);
      range = ui.selected.stats.range;
    } else {
      return;
    }
    ctx.fillStyle = 'rgba(255,248,230,0.08)';
    ctx.strokeStyle = 'rgba(255,248,230,0.7)';
    ctx.lineWidth = 1.25;
    circle(ctx, x, y, range);
    ctx.fill();
    ctx.stroke();
    const def = ui.placingDef ?? ui.selected?.def;
    // finite buff radii (map-wide buffs are shown in the unit panel instead)
    for (const b of def?.buffs ?? []) {
      if (!Number.isFinite(b.radius)) continue;
      ctx.strokeStyle = 'rgba(227,163,59,0.85)';
      ctx.setLineDash([4, 4]);
      circle(ctx, x, y, b.radius);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  /** Where the road leaves the map: a darkened gap flanked by two marker stones. */
  drawBreaches(ctx, t) {
    const { game } = this;
    game.map.entrances.forEach((en, i) => {
      const pulse = this.breachPulse[i] ?? 0;
      ctx.save();
      ctx.translate(en.px, en.py);
      ctx.rotate(Math.atan2(en.dir.y, en.dir.x));
      // the road fades into darkness beyond the edge
      const g = ctx.createLinearGradient(-TILE * 1.6, 0, 0, 0);
      g.addColorStop(0, 'rgba(10,8,12,0)');
      g.addColorStop(1, `rgba(10,8,12,${0.45 + pulse * 0.2})`);
      ctx.fillStyle = g;
      ctx.fillRect(-TILE * 1.6, -TILE * 0.75, TILE * 1.6, TILE * 1.5);
      // marker stones
      for (const side of [-1, 1]) {
        const sx = -TILE * 0.35;
        const sy = side * TILE * 0.72;
        ctx.fillStyle = 'rgba(20,14,24,0.3)';
        ctx.beginPath();
        ctx.ellipse(sx + 2, sy + 3, 6, 3.5, 0, 0, TAU);
        ctx.fill();
        ctx.fillStyle = STONE;
        ctx.strokeStyle = '#3a3630';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.roundRect(sx - 4, sy - 5, 8, 9, 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = game.biome.portalColor;
        ctx.fillRect(sx - 2.5, sy - 3.5, 5, 2);
      }
      ctx.restore();
      void t;
    });
  }

  /** The Tower: a round stone keep seen from above, flying the player's banner. */
  drawTower(ctx, t) {
    const { game } = this;
    const { px, py } = game.map.goal;
    const hp = game.towerHp / game.towerMaxHp;
    const R = 19;
    // contact shadow (light from top-left)
    ctx.fillStyle = 'rgba(20,14,24,0.35)';
    ctx.beginPath();
    ctx.ellipse(px + 6, py + 7, R + 3, R * 0.8, 0.3, 0, TAU);
    ctx.fill();
    // outer wall
    const wall = this.towerHit > 0 ? '#b0675c' : '#a49e93';
    ctx.fillStyle = shade(wall, -0.35);
    circle(ctx, px, py, R + 1.5);
    ctx.fill();
    const g = ctx.createLinearGradient(px - R, py - R, px + R, py + R);
    g.addColorStop(0, shade(wall, 0.12));
    g.addColorStop(1, shade(wall, -0.25));
    ctx.fillStyle = g;
    circle(ctx, px, py, R);
    ctx.fill();
    // crenellations
    ctx.fillStyle = shade(wall, -0.45);
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * TAU;
      ctx.save();
      ctx.translate(px + Math.cos(a) * (R - 2.5), py + Math.sin(a) * (R - 2.5));
      ctx.rotate(a);
      ctx.fillRect(-1.6, -2.6, 3.2, 5.2);
      ctx.restore();
    }
    // inner roof: conical, lit from the top-left
    const r2 = R - 6;
    for (let i = 0; i < 8; i++) {
      const a0 = (i / 8) * TAU;
      const a1 = ((i + 1) / 8) * TAU;
      const lit = Math.cos((a0 + a1) / 2 + Math.PI * 0.75);
      ctx.fillStyle = shade('#5c6b8a', lit * 0.22);
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.arc(px, py, r2, a0, a1);
      ctx.closePath();
      ctx.fill();
    }
    ctx.strokeStyle = '#2b3140';
    ctx.lineWidth = 1;
    circle(ctx, px, py, r2);
    ctx.stroke();
    // banner on a pole
    ctx.strokeStyle = '#2a2420';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(px, py - 22);
    ctx.stroke();
    const wave = Math.sin(t * 3) * 1.5;
    ctx.fillStyle = PLAYER_COLOR;
    ctx.strokeStyle = '#5a3a12';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(px, py - 22);
    ctx.quadraticCurveTo(px + 7, py - 23 + wave, px + 13, py - 20 + wave);
    ctx.lineTo(px + 11, py - 17 + wave * 0.6);
    ctx.quadraticCurveTo(px + 6, py - 16 - wave * 0.5, px, py - 15);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // damage states: cracks below half, smoke below a quarter
    if (hp < 0.5) {
      ctx.strokeStyle = 'rgba(30,20,20,0.75)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(px - R * 0.8, py - R * 0.3);
      ctx.lineTo(px - R * 0.55, py - R * 0.05);
      ctx.lineTo(px - R * 0.62, py + R * 0.25);
      ctx.moveTo(px + R * 0.6, py + R * 0.55);
      ctx.lineTo(px + R * 0.4, py + R * 0.42);
      ctx.stroke();
    }
    if (hp < 0.25 && Math.random() < 0.15) {
      this.fx.particle(px + (Math.random() - 0.5) * 16, py - 6, 4, -14, 1.4, 4, '#4a4440', { glow: false, drag: 0.98 });
    }
  }

  drawActors(ctx, t) {
    const { game } = this;
    // Units first (they stand on the ground), then enemies by weight class.
    const units = game.units;
    for (let i = 0; i < units.length; i++) {
      const u = units[i];
      const age = game.time - u.placedAt;
      if (age < 0.2) {
        const s = easeOutBack(clamp(age / 0.2, 0, 1));
        ctx.save();
        ctx.translate(u.x, u.y + 9);
        ctx.scale(s, s);
        ctx.translate(-u.x, -u.y - 9);
        (u.def.render ?? drawUnit)(ctx, u, t);
        ctx.restore();
      } else {
        (u.def.render ?? drawUnit)(ctx, u, t);
      }
    }
    const sel = this.ui.selected;
    if (sel?.placed) {
      ctx.strokeStyle = '#f2efe6';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(sel.x, sel.y + 9, 10, 4.5, 0, 0, TAU);
      ctx.stroke();
    }
    const enemies = game.enemies;
    // Level of detail: with huge crowds, drop shadows, per-enemy bars and marks.
    this.lite = enemies.length > 900;
    for (let order = 0; order <= 3; order++) {
      for (let i = 0; i < enemies.length; i++) {
        const e = enemies[i];
        if (e.alive && e.cat.drawOrder === order) this.drawEnemy(ctx, e, t);
      }
    }
  }

  drawEnemy(ctx, e, t) {
    const spr = this.sprites[e.category];
    const r = e.radius;
    let scale = 1;
    let alpha = 1;
    if (e.intro < 1) {
      scale = 0.15 + 0.85 * easeOutBack(e.intro);
      alpha = Math.min(1, e.intro * 3);
    } else if (e.age < 0.25) {
      scale = 0.6 + 0.4 * (e.age / 0.25);
    }
    // Distinct gaits per weight class; wounded enemies limp (slower, uneven step).
    const wounded = !!e.statuses && ((e.statuses.wounded ?? 0) > this.game.time || (e.statuses.crippled ?? 0) > this.game.time);
    const pace = wounded ? 0.7 : 1;
    const ph = t * pace + e.phase;
    let bob = 0;
    let squash = 1;
    let tilt = 0;
    switch (e.category) {
      case 'minion': { // quick hops, squashing on landing
        const hop = Math.abs(Math.sin(ph * 9));
        bob = -hop * 3.2;
        squash = 1 + (1 - hop) * 0.12 - 0.04;
        break;
      }
      case 'regular': // marching waddle
        bob = -Math.abs(Math.sin(ph * 6)) * 1.4;
        tilt = Math.sin(ph * 6) * 0.08;
        break;
      case 'elite': { // heavy stomp: slow rise, hard drop
        const st = (ph * 1.6) % 1;
        bob = -Math.pow(Math.sin(st * Math.PI), 0.6) * 1.6;
        squash = st < 0.08 ? 1.06 : 1;
        tilt = Math.sin(ph * 3.2) * 0.04;
        break;
      }
      default: // boss: lumbering sway
        bob = -Math.abs(Math.sin(ph * 2.2)) * 2;
        tilt = Math.sin(ph * 2.2) * 0.05;
    }
    if (wounded) tilt += Math.sin(ph * 6) > 0.6 ? 0.08 : 0;
    // hit flinch: a brief squash when struck
    if (e.flash > 0) squash *= 1 - Math.min(1, e.flash * 10) * 0.1;

    const lite = this.lite && !e.isBoss && e.category !== 'elite';
    if (lite) {
      // crowd mode: sprite only
      const h = spr.half;
      ctx.drawImage(e.flash > 0 ? spr.flash : spr.img, e.x - h, e.y + bob - h, h * 2, h * 2);
      return;
    }
    ctx.fillStyle = 'rgba(20,14,24,0.3)';
    ctx.beginPath();
    ctx.ellipse(e.x + 2, e.y + r * 0.78, r * 0.95 * scale, r * 0.36 * scale, 0, 0, TAU);
    ctx.fill();

    if (e.isBoss) {
      // a scorched footprint ring rather than a glow
      ctx.save();
      ctx.translate(e.x, e.y + r * 0.6);
      ctx.scale(1, 0.45);
      ctx.rotate(t * 0.6);
      ctx.strokeStyle = rgba(this.game.biome.enemyPalette.body, 0.55);
      ctx.lineWidth = 3;
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * TAU;
        ctx.beginPath();
        ctx.arc(0, 0, r * 1.5 * scale, a, a + 0.6);
        ctx.stroke();
      }
      ctx.restore();
    }

    if (e.traits.includes('swift')) {
      ctx.strokeStyle = rgba(getTrait('swift').color, 0.5);
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      for (const off of [-r * 0.45, r * 0.35]) {
        ctx.moveTo(e.x - e.facing * r * 0.95, e.y + off);
        ctx.lineTo(e.x - e.facing * r * 2, e.y + off);
      }
      ctx.stroke();
    }

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(e.x, e.y + bob);
    ctx.rotate(tilt);
    ctx.scale(scale * e.facing * (2 - squash), scale * squash);
    const h = spr.half;
    ctx.drawImage(spr.img, -h, -h, h * 2, h * 2);
    if (e.flash > 0) {
      ctx.globalAlpha = alpha * Math.min(1, e.flash * 10) * 0.7;
      ctx.drawImage(spr.flash, -h, -h, h * 2, h * 2);
    }
    ctx.restore();

    if (e.armor > 0) {
      ctx.strokeStyle = 'rgba(214,220,230,0.85)';
      ctx.lineWidth = 1.8;
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * TAU + Math.PI / 4;
        ctx.beginPath();
        ctx.arc(e.x, e.y + bob, r * 1.2 * scale, a - 0.38, a + 0.38);
        ctx.stroke();
      }
    }
    if (e.maxShield > 0 && e.shield > 0) {
      const k = e.shield / e.maxShield;
      ctx.strokeStyle = rgba('#c9b8ff', 0.35 + 0.5 * k);
      ctx.lineWidth = 1.5;
      circle(ctx, e.x, e.y + bob, r * 1.32 * scale);
      ctx.stroke();
    }
    if (e.statuses && (e.statuses.crippled ?? 0) > this.game.time) {
      // Crippled: a broken-chevron mark beside the enemy
      const cx = e.x + r * 0.95;
      const cy = e.y - r * 0.2 + bob;
      ctx.fillStyle = '#2a1840';
      ctx.fillRect(cx - 3.5, cy - 3.5, 7, 7);
      ctx.strokeStyle = '#b48cf0';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(cx - 2.2, cy - 1.6);
      ctx.lineTo(cx, cy + 0.6);
      ctx.lineTo(cx + 2.2, cy - 1.6);
      ctx.moveTo(cx - 2.2, cy + 0.6);
      ctx.lineTo(cx, cy + 2.8);
      ctx.lineTo(cx + 2.2, cy + 0.6);
      ctx.stroke();
    }
    if (wounded) {
      // field-dressing mark: reads as "wounded" at a glance
      const wx = e.x - r * 0.7;
      const wy = e.y - r * 0.6 + bob;
      ctx.fillStyle = '#f1ece2';
      ctx.fillRect(wx - 2.5, wy - 2.5, 5, 5);
      ctx.fillStyle = '#b8433a';
      ctx.fillRect(wx - 2, wy - 0.7, 4, 1.4);
      ctx.fillRect(wx - 0.7, wy - 2, 1.4, 4);
    }
    if (e.statuses && (e.statuses.burning ?? 0) > this.game.time) {
      const fl = 0.8 + 0.2 * Math.sin(t * 16 + e.phase);
      this.flame(ctx, e.x - r * 0.35, e.y + r * 0.2 + bob, r * 0.8 * fl);
      this.flame(ctx, e.x + r * 0.3, e.y + r * 0.35 + bob, r * 0.6 * fl);
    }
    if (e.regen > 0 && e.hp < e.maxHp) {
      ctx.fillStyle = '#7fd98a';
      const cx = e.x + r * 0.9;
      const cy = e.y - r * 0.9;
      ctx.fillRect(cx - 3, cy - 1, 6, 2);
      ctx.fillRect(cx - 1, cy - 3, 2, 6);
    }

    if (e.intro >= 1 && (e.hp < e.maxHp || e.shield < e.maxShield)) {
      const w = Math.max(14, r * 2);
      const bx = Math.round(e.x - w / 2);
      const by = Math.round(e.y - r * (e.isBoss ? 1.7 : 1.4) - 5);
      ctx.fillStyle = 'rgba(16,12,18,0.8)';
      ctx.fillRect(bx - 1, by - 1, w + 2, 4);
      const hp = Math.max(0, e.hp / e.maxHp);
      ctx.fillStyle = hp > 0.5 ? '#8fcf6a' : hp > 0.25 ? '#e3b54a' : '#d9534a';
      ctx.fillRect(bx, by, w * hp, 2);
      if (e.maxShield > 0) {
        ctx.fillStyle = '#c9b8ff';
        ctx.fillRect(bx, by - 2, w * (e.shield / e.maxShield), 1);
      }
    }
  }

  drawProjectiles(ctx) {
    const ps = this.game.projectiles;
    for (let i = 0; i < ps.length; i++) {
      const p = ps[i];
      if (!p.alive) continue;
      const done = Math.hypot(p.x - p.sx, p.y - p.sy);
      const left = Math.hypot(p.tx - p.x, p.ty - p.y);
      const k = done / Math.max(1, done + left);
      switch (p.kind) {
        case 'pebble': {
          // a lobbed stone: shadow on the ground, stone on a shallow arc
          const hgt = 4 * 9 * k * (1 - k);
          ctx.fillStyle = 'rgba(20,14,24,0.25)';
          ctx.fillRect(p.x - 1.2, p.y - 0.6, 2.4, 1.2);
          ctx.fillStyle = '#8d877c';
          ctx.strokeStyle = '#2b2722';
          ctx.lineWidth = 0.8;
          circle(ctx, p.x, p.y - hgt, 1.7);
          ctx.fill();
          ctx.stroke();
          break;
        }
        case 'grenade': {
          // high lob: the arc peaks well above the field; a shadow tracks the ground point
          const hgt = 4 * 30 * k * (1 - k);
          ctx.fillStyle = 'rgba(20,14,24,0.28)';
          ctx.beginPath();
          ctx.ellipse(p.x, p.y, 2.6 - hgt * 0.03, 1.3, 0, 0, TAU);
          ctx.fill();
          ctx.fillStyle = '#3f5530';
          ctx.strokeStyle = '#15180e';
          ctx.lineWidth = 0.8;
          circle(ctx, p.x, p.y - hgt, 2.5);
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = '#9aa38a';
          ctx.fillRect(p.x - 0.6, p.y - hgt - 3, 1.2, 1.4);
          break;
        }
        case 'shell': {
          const hgt = 4 * 7 * k * (1 - k);
          const a = Math.atan2(p.ty - p.sy, p.tx - p.sx);
          ctx.fillStyle = 'rgba(20,14,24,0.25)';
          ctx.fillRect(p.x - 1.5, p.y - 0.7, 3, 1.4);
          ctx.save();
          ctx.translate(p.x, p.y - hgt);
          ctx.rotate(a);
          ctx.strokeStyle = 'rgba(160,150,135,0.45)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(-14, 0);
          ctx.lineTo(-3, 0);
          ctx.stroke();
          ctx.fillStyle = '#2f3324';
          ctx.beginPath();
          ctx.ellipse(0, 0, 3.6, 1.8, 0, 0, TAU);
          ctx.fill();
          ctx.restore();
          break;
        }
        case 'drone':
        case 'explosive-drone': {
          // a quadcopter flying low: shadow on the ground, body above, blurred rotors
          const ex = p.kind === 'explosive-drone';
          const hover = 10 + Math.sin(this.time * 9 + p.sx) * 1.5;
          const a = Math.atan2(p.y - p.py, p.x - p.px);
          const sz = ex ? 1.35 : 1;
          ctx.fillStyle = 'rgba(20,14,24,0.25)';
          ctx.beginPath();
          ctx.ellipse(p.x, p.y, 5 * sz, 2.4 * sz, 0, 0, TAU);
          ctx.fill();
          ctx.save();
          ctx.translate(p.x, p.y - hover);
          ctx.rotate(a);
          ctx.scale(sz, sz);
          ctx.strokeStyle = '#1d1f22';
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.moveTo(-5, -5);
          ctx.lineTo(5, 5);
          ctx.moveTo(-5, 5);
          ctx.lineTo(5, -5);
          ctx.stroke();
          ctx.fillStyle = 'rgba(200,205,210,0.35)';
          for (const [rx, ry] of [[-5, -5], [5, 5], [-5, 5], [5, -5]]) {
            ctx.beginPath();
            ctx.ellipse(rx, ry, 3.4, 3.4 * (0.6 + 0.4 * Math.abs(Math.sin(this.time * 40 + rx))), 0, 0, TAU);
            ctx.fill();
          }
          ctx.fillStyle = ex ? '#2a2a2a' : '#4b5560';
          ctx.beginPath();
          ctx.roundRect(-3.6, -2.6, 7.2, 5.2, 1.5);
          ctx.fill();
          if (ex) {
            // hazard band + warhead: reads instantly as the dangerous one
            ctx.fillStyle = '#d9a12a';
            ctx.fillRect(-3.6, -0.9, 7.2, 1.8);
            ctx.fillStyle = '#c8402c';
            ctx.beginPath();
            ctx.arc(4.4, 0, 2, -Math.PI / 2, Math.PI / 2);
            ctx.fill();
          } else {
            ctx.fillStyle = '#9fd0e8';
            ctx.fillRect(1.6, -1, 1.6, 2);
          }
          ctx.restore();
          break;
        }
        case 'artillery':
        case 'siege': {
          // a heavy round on a tall arc; the shadow grows as it comes down
          const big = p.kind === 'siege';
          const hgt = 4 * (big ? 90 : 70) * k * (1 - k);
          const a = Math.atan2(p.ty - p.sy, p.tx - p.sx);
          ctx.fillStyle = `rgba(20,14,24,${0.15 + 0.2 * k})`;
          ctx.beginPath();
          ctx.ellipse(p.tx, p.ty, (big ? 10 : 6) * (0.5 + k), (big ? 5 : 3) * (0.5 + k), 0, 0, TAU);
          ctx.fill();
          ctx.save();
          ctx.translate(p.x, p.y - hgt);
          ctx.rotate(a + (k - 0.5) * 1.6);
          ctx.fillStyle = big ? '#23261d' : '#3a3d30';
          ctx.beginPath();
          ctx.ellipse(0, 0, big ? 6 : 4.4, big ? 3 : 2.2, 0, 0, TAU);
          ctx.fill();
          ctx.fillStyle = '#a8865a';
          ctx.fillRect(big ? -6 : -4.4, -0.8, 2, 1.6);
          ctx.restore();
          break;
        }
        case 'bullet': {
          // a short tracer streak along the line of fire
          const dx = p.x - p.px;
          const dy = p.y - p.py;
          const len = Math.hypot(dx, dy) || 1;
          ctx.strokeStyle = p.color;
          ctx.lineWidth = 1.3;
          ctx.beginPath();
          ctx.moveTo(p.x - (dx / len) * 9, p.y - (dy / len) * 9);
          ctx.lineTo(p.x, p.y);
          ctx.stroke();
          break;
        }
        default: {
          const dx = p.x - p.px;
          const dy = p.y - p.py;
          const len = Math.hypot(dx, dy) || 1;
          ctx.strokeStyle = p.color;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(p.x - (dx / len) * 8, p.y - (dy / len) * 8);
          ctx.lineTo(p.x, p.y);
          ctx.stroke();
        }
      }
    }
  }

  drawCinematicUnder(ctx, t) {
    const c = this.game.cinematic;
    if (!c) return;
    const e = c.enemy;
    const k = c.t / c.duration;
    const pal = this.game.biome.enemyPalette;
    // the ground splits open where the boss arrives
    ctx.save();
    ctx.translate(e.x, e.y + e.radius * 0.6);
    ctx.scale(1, 0.5);
    const rr = 60 * Math.min(1, k * 2.5);
    ctx.fillStyle = 'rgba(12,8,14,0.55)';
    circle(ctx, 0, 0, rr);
    ctx.fill();
    ctx.strokeStyle = rgba(pal.body, 0.8);
    ctx.lineWidth = 2;
    ctx.rotate(t * 0.8);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU;
      ctx.beginPath();
      ctx.arc(0, 0, rr, a, a + 0.45);
      ctx.stroke();
    }
    ctx.restore();
    if (Math.random() < 0.5) {
      const a = Math.random() * TAU;
      this.fx.particle(e.x + Math.cos(a) * 50, e.y + Math.sin(a) * 25, -Math.cos(a) * 40, -Math.sin(a) * 20 - 20, 0.7, 2.5, pal.dark, { glow: false });
    }
  }

  drawCinematicOver(ctx) {
    const c = this.game.cinematic;
    if (c) {
      const e = c.enemy;
      const k = Math.sin(Math.min(1, c.t / c.duration) * Math.PI);
      const g = ctx.createRadialGradient(e.x, e.y, 70, e.x, e.y, WORLD_W * 0.75);
      g.addColorStop(0, 'rgba(0,0,0,0)');
      g.addColorStop(1, `rgba(8,6,12,${0.45 * k})`);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, WORLD_W, WORLD_H);
    }
    if (this.bossFlash > 0) {
      ctx.fillStyle = `rgba(255,250,240,${this.bossFlash * 0.25})`;
      ctx.fillRect(0, 0, WORLD_W, WORLD_H);
    }
  }
}
