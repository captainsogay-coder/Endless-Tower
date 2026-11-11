// Draws the game state. Owns all cosmetic state (effects, shake, cinematic
// overlays) so the simulation stays deterministic and headless.

import { WORLD_W, WORLD_H, TILE, COLS, ROWS } from '../config.js';
import { TileType, tileIndex } from '../maps/mapGenerator.js';
import { MapScene } from '../maps/MapScene.js';
import { buildEnemySprites } from './enemySprites.js';
import { drawDefaultUnit } from './unitSprites.js';
import { Effects } from './fx.js';
import { drawGlow, circle } from './canvas.js';
import { rgba } from '../core/color.js';
import { getTier } from '../units/tiers.js';
import { getTrait } from '../waves/traits.js';
import { TAU, easeOutBack, clamp } from '../core/math.js';

const DEATH_PARTICLES = { minion: 5, regular: 10, elite: 20, boss: 90 };

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
    this.towerFlash = 0;
    this.portalFlare = [];
    this.bossFlash = 0;
    this.ui = { hover: null, placingDef: null, selected: null };
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
      this.portalFlare = game.map.entrances.map(() => 0);
      this.fx = new Effects();
      this.ui.selected = null;
      this.resize();
    };
    rebuild();
    on('runStart', rebuild);
    on('spawn', (e) => {
      this.portalFlare[e.routeIndex] = Math.min(1.5, (this.portalFlare[e.routeIndex] ?? 0) + (e.isBoss ? 1.5 : 0.25));
    });
    on('death', (e) => this.onDeath(e));
    on('impact', (p) => {
      if (Math.random() < 0.5 * this.fx.density) this.fx.burst(p.x, p.y, 3, p.color, { speed: 60, life: 0.25, size: 2 });
      if (p.splash > 0) this.fx.ring(p.x, p.y, 4, p.splash, 0.3, p.color, 2);
    });
    on('leak', (e) => {
      this.towerFlash = 1;
      this.shake(e.isBoss ? 10 : e.category === 'elite' ? 4 : 1.5);
      this.fx.ring(game.map.goal.px, game.map.goal.py, 10, 60, 0.5, '#ff4a4a', 3);
    });
    on('place', (u) => {
      const c = getTier(u.tier).color;
      this.fx.ring(u.x, u.y, 4, 22, 0.45, c, 2);
      this.fx.burst(u.x, u.y, 8, c, { speed: 50, life: 0.5 });
    });
    on('waveStart', () => {
      game.map.entrances.forEach((en, i) => {
        this.portalFlare[i] = 1.2;
        this.fx.ring(en.px, en.py, 6, 70, 0.8, game.biome.portalColor, 3);
      });
    });
    on('bossIntro', ({ enemy }) => {
      this.shake(6);
      this.fx.ring(enemy.x, enemy.y, 10, 160, 1.2, game.biome.enemyPalette.glow, 4);
    });
    on('bossArrived', (e) => {
      this.shake(12);
      this.bossFlash = 0.6;
      this.fx.ring(e.x, e.y, 20, 220, 0.9, '#ffffff', 5);
      this.fx.burst(e.x, e.y, 50, game.biome.enemyPalette.glow, { speed: 220, life: 0.9, size: 3.5 });
    });
    on('bossDefeated', (e) => {
      this.shake(14);
      this.bossFlash = 0.8;
      this.fx.ring(e.x, e.y, 20, 260, 1.2, '#ffffff', 6);
      this.fx.ring(e.x, e.y, 10, 180, 1.0, game.biome.palette.accent, 4);
    });
  }

  setEffects(level) {
    this.effectsLevel = level;
    if (this.scene) this.scene.effects = level;
  }

  shake(amount) {
    this.shakeAmt = Math.min(16, Math.max(this.shakeAmt, amount * (0.4 + 0.6 * this.effectsLevel)));
  }

  onDeath(e) {
    const pal = this.game.biome.enemyPalette;
    const n = DEATH_PARTICLES[e.category] ?? 8;
    this.fx.burst(e.x, e.y, n, pal.glow, { speed: 40 + e.radius * 6, life: 0.55, size: 1.5 + e.radius * 0.15 });
    this.fx.burst(e.x, e.y, Math.ceil(n / 2), pal.body, { speed: 30 + e.radius * 4, life: 0.5, size: 2 + e.radius * 0.1, glow: false });
    if (e.category !== 'minion') this.fx.ring(e.x, e.y, e.radius * 0.5, e.radius * 2.4, 0.4, pal.glow, 2);
    if (e.category === 'elite' || e.isBoss) this.fx.text(e.x, e.y - e.radius, `+${e.reward}`, '#ffd76a', e.isBoss ? 18 : 12);
  }

  /** Fit the world into the canvas' parent while keeping aspect ratio. */
  resize() {
    const parent = this.canvas.parentElement;
    if (!parent) return;
    const r = parent.getBoundingClientRect();
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

  /** Converts a client (mouse) position into world coordinates. */
  toWorld(clientX, clientY) {
    const r = this.canvas.getBoundingClientRect();
    return { x: ((clientX - r.left) / r.width) * WORLD_W, y: ((clientY - r.top) / r.height) * WORLD_H };
  }

  render(dt, gameDt) {
    const { ctx, scene } = this;
    if (!scene) return;
    this.time += dt;
    scene.update(dt);
    this.fx.update(gameDt);
    this.towerFlash = Math.max(0, this.towerFlash - dt * 2.5);
    this.bossFlash = Math.max(0, this.bossFlash - dt);
    for (let i = 0; i < this.portalFlare.length; i++) this.portalFlare[i] = Math.max(0, this.portalFlare[i] - dt * 1.5);
    this.shakeAmt = Math.max(0, this.shakeAmt - dt * 22);
    this.shakeX = (Math.random() * 2 - 1) * this.shakeAmt;
    this.shakeY = (Math.random() * 2 - 1) * this.shakeAmt;

    const k = this.scale * this.dpr;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#05060a';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.setTransform(k, 0, 0, k, this.shakeX * k, this.shakeY * k);

    const t = this.time;
    scene.drawBackground(ctx);
    scene.drawTerrain(ctx);
    scene.drawUnder(ctx);
    if (this.ui.placingDef) this.drawPlacementGrid(ctx);
    this.drawPortals(ctx, t);
    this.drawTower(ctx, t);
    this.drawUnits(ctx, t);
    this.drawRangePreview(ctx);
    this.drawCinematicUnder(ctx, t);
    this.drawEnemies(ctx, t);
    this.drawProjectiles(ctx);
    this.fx.draw(ctx);
    scene.drawOver(ctx);
    this.drawCinematicOver(ctx, t);
  }

  // -------------------------------------------------------------- layers

  drawPlacementGrid(ctx) {
    const { game } = this;
    ctx.fillStyle = 'rgba(140,255,170,0.10)';
    ctx.strokeStyle = 'rgba(160,255,190,0.22)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const i = tileIndex(x, y);
        if (game.map.grid[i] !== TileType.GROUND || game.unitByTile[i]) continue;
        ctx.rect(x * TILE + 2, y * TILE + 2, TILE - 4, TILE - 4);
      }
    }
    ctx.fill();
    ctx.stroke();
    const h = this.ui.hover;
    if (h) {
      const ok = game.canPlace(h.col, h.row);
      ctx.fillStyle = ok ? 'rgba(120,255,160,0.35)' : 'rgba(255,90,90,0.35)';
      ctx.strokeStyle = ok ? '#8dffb0' : '#ff6a6a';
      ctx.lineWidth = 2;
      ctx.fillRect(h.col * TILE + 1, h.row * TILE + 1, TILE - 2, TILE - 2);
      ctx.strokeRect(h.col * TILE + 1, h.row * TILE + 1, TILE - 2, TILE - 2);
    }
  }

  drawRangePreview(ctx) {
    const { ui } = this;
    let x;
    let y;
    let range;
    let color;
    if (ui.placingDef && ui.hover && this.game.canPlace(ui.hover.col, ui.hover.row)) {
      x = ui.hover.col * TILE + TILE / 2;
      y = ui.hover.row * TILE + TILE / 2;
      range = ui.placingDef.stats.range;
      color = getTier(ui.placingDef.tier).color;
    } else if (ui.selected?.placed) {
      ({ x, y } = ui.selected);
      range = ui.selected.stats.range;
      color = getTier(ui.selected.tier).color;
    } else {
      return;
    }
    ctx.fillStyle = rgba(color, 0.1);
    ctx.strokeStyle = rgba(color, 0.75);
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 5]);
    ctx.lineDashOffset = -this.time * 12;
    circle(ctx, x, y, range);
    ctx.fill();
    ctx.stroke();
    ctx.setLineDash([]);
  }

  drawPortals(ctx, t) {
    const { game } = this;
    const color = game.biome.portalColor;
    game.map.entrances.forEach((en, i) => {
      const flare = this.portalFlare[i] ?? 0;
      const vertical = en.dir.x !== 0; // portal plane is perpendicular to travel
      ctx.save();
      ctx.translate(en.px, en.py);
      if (!vertical) ctx.rotate(Math.PI / 2);
      drawGlow(ctx, color, 0, 0, 34 + flare * 26, 0.55 + flare * 0.35);
      for (let k = 0; k < 3; k++) {
        ctx.strokeStyle = rgba(k === 1 ? '#ffffff' : color, 0.55 + 0.2 * Math.sin(t * 3 + k));
        ctx.lineWidth = 2.2 - k * 0.5;
        ctx.beginPath();
        ctx.ellipse(0, 0, 7 + k * 3, 20 + k * 4 + Math.sin(t * 2 + k) * 2, 0, t * (1 + k * 0.4), t * (1 + k * 0.4) + Math.PI * 1.4);
        ctx.stroke();
      }
      ctx.restore();
    });
  }

  drawTower(ctx, t) {
    const { game } = this;
    const { px, py } = game.map.goal;
    const accent = game.biome.palette.accent;
    const hpFrac = game.towerHp / game.towerMaxHp;
    const danger = 1 - hpFrac;
    // rotating rune ring
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(t * 0.3);
    ctx.strokeStyle = rgba(accent, 0.55);
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * TAU;
      ctx.beginPath();
      ctx.arc(0, 0, TILE * 1.18, a, a + 0.32);
      ctx.stroke();
    }
    ctx.restore();
    drawGlow(ctx, this.towerFlash > 0 ? '#ff5050' : accent, px, py - 8, 56 + Math.sin(t * 2) * 4, 0.55 + this.towerFlash * 0.4);
    // base
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.ellipse(px + 3, py + 10, 22, 10, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#2a2d3a';
    ctx.beginPath();
    ctx.ellipse(px, py + 6, 20, 9, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#4a4f66';
    ctx.beginPath();
    ctx.ellipse(px, py + 3, 16, 7, 0, 0, TAU);
    ctx.fill();
    // spire
    const bob = Math.sin(t * 1.6) * 2;
    const h = 40;
    const g = ctx.createLinearGradient(px - 10, py - h, px + 10, py);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(0.4, accent);
    g.addColorStop(1, '#2a3550');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(px, py - h + bob);
    ctx.lineTo(px + 10, py - 12 + bob);
    ctx.lineTo(px + 6, py + 2);
    ctx.lineTo(px - 6, py + 2);
    ctx.lineTo(px - 10, py - 12 + bob);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(px, py - h + bob);
    ctx.lineTo(px, py);
    ctx.stroke();
    // orbiting shards
    for (let i = 0; i < 3; i++) {
      const a = t * 1.2 + (i / 3) * TAU;
      const sx = px + Math.cos(a) * 20;
      const sy = py - 16 + Math.sin(a) * 7;
      ctx.fillStyle = rgba(accent, 0.9);
      ctx.beginPath();
      ctx.moveTo(sx, sy - 5);
      ctx.lineTo(sx + 3, sy);
      ctx.lineTo(sx, sy + 5);
      ctx.lineTo(sx - 3, sy);
      ctx.fill();
    }
    if (danger > 0.5) drawGlow(ctx, '#ff3030', px, py - 10, 40, (danger - 0.5) * (0.6 + 0.4 * Math.sin(t * 8)));
  }

  drawUnits(ctx, t) {
    const units = this.game.units;
    for (let i = 0; i < units.length; i++) {
      const u = units[i];
      const age = this.game.time - u.placedAt;
      if (age < 0.25) {
        ctx.save();
        const s = easeOutBack(clamp(age / 0.25, 0, 1));
        ctx.translate(u.x, u.y);
        ctx.scale(s, s);
        ctx.translate(-u.x, -u.y);
        (u.def.render ?? drawDefaultUnit)(ctx, u, t);
        ctx.restore();
      } else {
        (u.def.render ?? drawDefaultUnit)(ctx, u, t);
      }
    }
    const sel = this.ui.selected;
    if (sel?.placed) {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.strokeRect(sel.col * TILE + 1, sel.row * TILE + 1, TILE - 2, TILE - 2);
    }
  }

  drawEnemies(ctx, t) {
    const enemies = this.game.enemies;
    for (let order = 0; order <= 3; order++) {
      for (let i = 0; i < enemies.length; i++) {
        const e = enemies[i];
        if (!e.alive || e.cat.drawOrder !== order) continue;
        this.drawEnemy(ctx, e, t);
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
    } else if (e.age < 0.3) {
      scale = 0.5 + 0.5 * (e.age / 0.3);
    }
    const bob = Math.sin(t * (e.category === 'minion' ? 14 : 8) + e.phase) * (e.category === 'boss' ? 1.5 : 1.2);
    const squash = 1 + Math.sin(t * 14 + e.phase) * (e.category === 'minion' ? 0.06 : 0.03);

    // ground shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(e.x + 1, e.y + r * 0.75, r * 0.95 * scale, r * 0.38 * scale, 0, 0, TAU);
    ctx.fill();

    if (e.isBoss) {
      const pal = this.game.biome.enemyPalette;
      drawGlow(ctx, pal.glow, e.x, e.y, r * 2.4 * scale, 0.5 + 0.15 * Math.sin(t * 3));
      ctx.save();
      ctx.translate(e.x, e.y);
      ctx.rotate(t * 0.8);
      ctx.strokeStyle = rgba(pal.glow, 0.7);
      ctx.lineWidth = 2;
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * TAU;
        ctx.beginPath();
        ctx.arc(0, 0, r * 1.75 * scale, a, a + 0.42);
        ctx.stroke();
      }
      ctx.restore();
    }

    if (e.traits.includes('swift')) {
      const pal = getTrait('swift').color;
      ctx.strokeStyle = rgba(pal, 0.55);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (const off of [-r * 0.5, r * 0.4]) {
        ctx.moveTo(e.x - e.facing * r * 0.9, e.y + off);
        ctx.lineTo(e.x - e.facing * r * 2.1, e.y + off);
      }
      ctx.stroke();
    }

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(e.x, e.y + bob);
    ctx.scale(scale * e.facing * (2 - squash), scale * squash);
    const h = spr.half;
    ctx.drawImage(spr.img, -h, -h, h * 2, h * 2);
    if (e.flash > 0) {
      ctx.globalAlpha = alpha * Math.min(1, e.flash * 10) * 0.85;
      ctx.drawImage(spr.flash, -h, -h, h * 2, h * 2);
    }
    ctx.restore();

    if (e.armor > 0) {
      ctx.strokeStyle = 'rgba(210,220,235,0.85)';
      ctx.lineWidth = 2;
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * TAU + Math.PI / 4;
        ctx.beginPath();
        ctx.arc(e.x, e.y + bob, r * 1.2 * scale, a - 0.4, a + 0.4);
        ctx.stroke();
      }
    }
    if (e.maxShield > 0 && e.shield > 0) {
      const k = e.shield / e.maxShield;
      ctx.fillStyle = rgba('#a98bff', 0.12 + 0.12 * k);
      ctx.strokeStyle = rgba('#d4c4ff', 0.35 + 0.5 * k);
      ctx.lineWidth = 1.5;
      circle(ctx, e.x, e.y + bob, r * 1.35 * scale);
      ctx.fill();
      ctx.stroke();
    }
    if (e.regen > 0 && e.hp < e.maxHp) {
      const a = 0.5 + 0.5 * Math.sin(t * 6 + e.phase);
      ctx.fillStyle = rgba('#7dff8a', a);
      const cx = e.x + r * 0.9;
      const cy = e.y - r * 0.9;
      ctx.fillRect(cx - 3, cy - 1, 6, 2);
      ctx.fillRect(cx - 1, cy - 3, 2, 6);
    }

    // health bar (bosses use the HUD bar plus a local one)
    if (e.intro >= 1 && (e.hp < e.maxHp || e.shield < e.maxShield || e.isBoss)) {
      const w = Math.max(16, r * 2.1);
      const bx = e.x - w / 2;
      const by = e.y - r * (e.isBoss ? 1.75 : 1.45) - 5;
      ctx.fillStyle = 'rgba(0,0,0,0.65)';
      ctx.fillRect(bx - 1, by - 1, w + 2, 5);
      const hp = Math.max(0, e.hp / e.maxHp);
      ctx.fillStyle = hp > 0.5 ? '#6dff7a' : hp > 0.25 ? '#ffd24a' : '#ff5a4a';
      ctx.fillRect(bx, by, w * hp, 3);
      if (e.maxShield > 0) {
        ctx.fillStyle = '#b9a2ff';
        ctx.fillRect(bx, by - 2, w * (e.shield / e.maxShield), 1.5);
      }
    }
  }

  drawProjectiles(ctx) {
    const ps = this.game.projectiles;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    for (let i = 0; i < ps.length; i++) {
      const p = ps[i];
      if (!p.alive) continue;
      const dx = p.x - p.px;
      const dy = p.y - p.py;
      const len = Math.hypot(dx, dy) || 1;
      const tx = p.x - (dx / len) * 12;
      const ty = p.y - (dy / len) * 12;
      ctx.strokeStyle = rgba(p.color, 0.55);
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(tx, ty);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
      drawGlow(ctx, p.color, p.x, p.y, 7 + Math.min(6, p.tier), 0.9);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(p.x - 1.2, p.y - 1.2, 2.4, 2.4);
    }
    ctx.restore();
  }

  drawCinematicUnder(ctx, t) {
    const c = this.game.cinematic;
    if (!c) return;
    const e = c.enemy;
    const k = c.t / c.duration;
    const pal = this.game.biome.enemyPalette;
    // summoning circle + pillar of light where the boss materialises
    ctx.save();
    ctx.translate(e.x, e.y);
    ctx.rotate(t * 1.5);
    ctx.strokeStyle = rgba(pal.glow, 0.9);
    ctx.lineWidth = 2;
    circle(ctx, 0, 0, 48 * Math.min(1, k * 3));
    ctx.stroke();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * TAU;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * 48, Math.sin(a) * 48);
      ctx.lineTo(Math.cos(a + 2.1) * 48, Math.sin(a + 2.1) * 48);
      ctx.stroke();
    }
    ctx.restore();
    const beam = ctx.createLinearGradient(e.x - 26, 0, e.x + 26, 0);
    beam.addColorStop(0, rgba(pal.glow, 0));
    beam.addColorStop(0.5, rgba('#ffffff', 0.35 * (1 - k * 0.5)));
    beam.addColorStop(1, rgba(pal.glow, 0));
    ctx.fillStyle = beam;
    ctx.fillRect(e.x - 26, 0, 52, e.y);
    if (Math.random() < 0.7) {
      const a = Math.random() * TAU;
      this.fx.particle(e.x + Math.cos(a) * 60, e.y + Math.sin(a) * 60, -Math.cos(a) * 90, -Math.sin(a) * 90, 0.6, 2.5, pal.glow);
    }
  }

  drawCinematicOver(ctx) {
    const c = this.game.cinematic;
    if (c) {
      const e = c.enemy;
      const k = Math.sin(Math.min(1, c.t / c.duration) * Math.PI);
      const g = ctx.createRadialGradient(e.x, e.y, 60, e.x, e.y, WORLD_W * 0.7);
      g.addColorStop(0, 'rgba(0,0,0,0)');
      g.addColorStop(1, `rgba(5,0,15,${0.5 * k})`);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, WORLD_W, WORLD_H);
    }
    if (this.bossFlash > 0) {
      ctx.fillStyle = `rgba(255,255,255,${this.bossFlash * 0.25})`;
      ctx.fillRect(0, 0, WORLD_W, WORLD_H);
    }
  }
}
