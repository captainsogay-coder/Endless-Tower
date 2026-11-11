// Browser-side presentation of a generated map: cached static terrain plus the
// biome's live ambient layers.
import { WORLD_W, WORLD_H, TILE } from '../config.js';
import { createRng } from '../core/rng.js';
import { makeCanvas } from '../render/canvas.js';
import { paintTerrain, featurePath } from './paint.js';

export class MapScene {
  constructor(map, biome, { effects = 1, shake } = {}) {
    this.map = map;
    this.biome = biome;
    this.effects = effects;
    this.shake = shake;
    this.time = 0;
    this.terrain = null;
    this.terrainScale = 0;
    this.featurePath = featurePath(map, TILE * 0.7);
    this.ambient = biome.createAmbient(map, createRng(map.seed ^ 0x51ed27), this);
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
  }

  update(dt) {
    this.time += dt;
    this.ambient.update?.(dt, this.time);
  }

  drawBackground(ctx) {
    if (this.ambient.drawBackground) this.ambient.drawBackground(ctx, this.time);
  }

  drawTerrain(ctx) {
    ctx.drawImage(this.terrain, 0, 0, WORLD_W, WORLD_H);
  }

  drawUnder(ctx) {
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
