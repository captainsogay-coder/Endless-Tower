// Browser-side presentation of a generated map: cached static terrain plus the
// biome's live ambient layers.
import { WORLD_W, WORLD_H, TILE } from '../config.js';
import { createRng } from '../core/rng.js';
import { makeCanvas, drawGlow } from '../render/canvas.js';
import { paintTerrain, featurePath } from './paint.js';
import { VIGNETTES, VIGNETTE_SCALE } from './vignettes.js';

export class MapScene {
  constructor(map, biome, { effects = 1, shake } = {}) {
    this.map = map;
    this.biome = biome;
    this.effects = effects;
    this.shake = shake;
    this.time = 0;
    this.terrain = null;
    this.terrainScale = 0;
    this.featurePath = featurePath(map);
    // live layers: set pieces (smoke, flags, lanterns, sails) and swaying plants
    this.vignettes = map.decor.filter((d) => VIGNETTES[d.kind]?.live);
    const sway = new Set(biome.swayKinds ?? []);
    this.swayers = map.decor.filter((d) => sway.has(d.kind)).sort((a, b) => a.y - b.y);
    this.wind = 0;
    this.windTarget = 0;
    this.ambient = biome.createAmbient(map, createRng(map.seed ^ 0x51ed27), this);
    // Atmosphere: large, slow cloud shadows drifting across the ground.
    const arng = createRng(map.seed ^ 0x2c1b);
    this.cloudShadows = Array.from({ length: biome.atmosphere?.cloudShadows ?? 0 }, () => ({
      x: arng.float(-200, WORLD_W),
      y: arng.float(0, WORLD_H),
      r: arng.float(140, 240),
      sp: arng.float(6, 12),
      squash: arng.float(0.5, 0.8),
    }));
  }

  /** (Re)paints the static terrain at the given pixel density. */
  ensureTerrain(scale) {
    const s = Math.min(3, Math.max(1, Math.round(scale * 4) / 4));
    if (this.terrain && this.terrainScale === s) return;
    const c = this.terrain ?? makeCanvas(1, 1);
    c.width = Math.ceil(WORLD_W * s);
    c.height = Math.ceil(WORLD_H * s);
    const ctx = c.getContext('2d');
    ctx.setTransform(s, 0, 0, s, 0, 0);
    paintTerrain(ctx, this.map, this.biome, createRng(this.map.seed ^ 0x7e3a11));
    this.terrain = c;
    this.terrainScale = s;
    this.buildSwaySprites(s);
  }

  /**
   * Trees and similar plants are pre-rendered once into small sprites at the
   * terrain's density, then drawn every frame with a gentle sway (stronger in
   * wind). Each keeps its own phase so a grove never moves in lockstep.
   */
  buildSwaySprites(s) {
    const rng = createRng(this.map.seed ^ 0x9e3779);
    for (const d of this.swayers) {
      const half = Math.ceil(d.r * 1.9 + 10);
      const c = makeCanvas(Math.ceil(half * 2 * s), Math.ceil(half * 2 * s));
      const g = c.getContext('2d');
      g.setTransform(s, 0, 0, s, 0, 0);
      this.biome.paintDecor?.(g, { ...d, x: half, y: half }, rng, this.map);
      d.sprite = { img: c, half };
      d.phase = d.seed * 40;
    }
  }

  /** Wind strength from the weather (windy and stormy weather bend the trees harder). */
  setWind(weatherId) {
    this.windTarget = weatherId === 'windy' ? 1 : weatherId === 'thunderstorm' ? 0.8 : weatherId === 'rainy' ? 0.35 : 0.1;
  }

  update(dt) {
    this.time += dt;
    this.wind += (this.windTarget - this.wind) * Math.min(1, dt * 0.8);
    this.ambient.update?.(dt, this.time);
    for (const c of this.cloudShadows) {
      c.x += c.sp * dt;
      c.y += c.sp * 0.25 * dt;
      if (c.x - c.r > WORLD_W) c.x = -c.r * 1.5;
      if (c.y - c.r > WORLD_H) c.y = -c.r;
    }
  }

  drawBackground(ctx) {
    if (this.ambient.drawBackground) this.ambient.drawBackground(ctx, this.time);
  }

  drawTerrain(ctx) {
    ctx.drawImage(this.terrain, 0, 0, WORLD_W, WORLD_H);
  }

  /** Plants and set pieces – between the ground and the actors. */
  drawProps(ctx) {
    const t = this.time;
    const motion = this.effects > 0 ? 1 : 0;
    for (const d of this.swayers) {
      if (!d.sprite) continue;
      const { img, half } = d.sprite;
      // canopy leans and returns; the trunk (sprite centre) stays planted
      const lean = motion * (Math.sin(t * 1.3 + d.phase) * 0.018 + Math.sin(t * 0.47 + d.phase * 0.7) * 0.012) * (1 + this.wind * 3.5) + this.wind * 0.03 * motion;
      ctx.save();
      ctx.translate(d.x, d.y);
      ctx.transform(1, 0, lean, 1, 0, 0);
      ctx.drawImage(img, -half, -half, half * 2, half * 2);
      ctx.restore();
    }
    for (const d of this.vignettes) {
      ctx.save();
      ctx.translate(d.x, d.y);
      ctx.scale(VIGNETTE_SCALE, VIGNETTE_SCALE);
      ctx.translate(-d.x, -d.y);
      VIGNETTES[d.kind].live(ctx, d, motion ? t : 0, this.wind);
      ctx.restore();
    }
  }

  drawUnder(ctx) {
    this.drawProps(ctx);
    if (this.cloudShadows.length && this.effects > 0) {
      ctx.save();
      for (const c of this.cloudShadows) {
        ctx.save();
        ctx.translate(c.x, c.y);
        ctx.scale(1, c.squash);
        drawGlow(ctx, '#0a1020', 0, 0, c.r, 0.16 * this.effects, 0.85);
        ctx.restore();
      }
      ctx.restore();
    }
    ctx.save();
    this.ambient.drawUnder?.(ctx, this.time);
    ctx.restore();
  }

  drawOver(ctx) {
    if (this.effects <= 0) return;
    ctx.save();
    this.ambient.drawOver?.(ctx, this.time);
    ctx.restore();
  }
}
