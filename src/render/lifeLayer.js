// The living layer of a battlefield: light that changes over the battle,
// wildlife, water glints and small atmospheric details. Every realm gets its
// own cast (see LIFE below); every battle draws its own light (dawn, midday,
// golden hour, overcast, dusk) so the same realm never looks quite the same.
//
// Budget: the graphics preset's `life` level (0 off, 1 basic, 2 full, 3 extra)
// decides what exists. Nothing here touches the game state, and nothing is
// drawn over the road at a strength that could hide an enemy.

import { WORLD_W, WORLD_H, TILE } from '../config.js';
import { createRng } from '../core/rng.js';
import { makeCanvas } from './canvas.js';

const TAU = Math.PI * 2;

/**
 * Light moods: `grade` is washed over the ground (under the actors, so units
 * and enemies keep their true colours), `sun` is the direction light falls from.
 */
export const MOODS = {
  dawn: { id: 'dawn', label: 'Dawn', grade: [255, 196, 150], strength: 0.1, shade: 0.04, sun: -0.6 },
  midday: { id: 'midday', label: 'Midday', grade: [255, 250, 235], strength: 0.03, shade: 0, sun: 0 },
  golden: { id: 'golden', label: 'Golden hour', grade: [255, 186, 96], strength: 0.12, shade: 0.06, sun: 0.7 },
  overcast: { id: 'overcast', label: 'Overcast', grade: [150, 165, 185], strength: 0.12, shade: 0.08, sun: 0 },
  dusk: { id: 'dusk', label: 'Dusk', grade: [120, 110, 190], strength: 0.16, shade: 0.16, sun: 0.9 },
};

/**
 * Per realm: which moods it can have, its wildlife and touches.
 *  flyers: 'birds' | 'crows' | 'bats' | 'vultures' | 'gulls' | 'none'
 *  ground: little creatures at the map's edges ('rabbits' | 'hares' | 'lizards' | 'none')
 *  motes:  drifting specks in the light ('pollen' | 'snow' | 'ash' | 'dust' | 'spores' | 'none')
 *  distant: something passing far away ('airships' | 'none')
 *  glint:  colour of light glinting on water/ice/lava
 */
export const LIFE = {
  forest: { moods: ['dawn', 'midday', 'golden', 'overcast', 'dusk'], flyers: 'birds', ground: 'rabbits', motes: 'pollen', butterflies: true, dapples: true, glint: '230,245,255' },
  frozen: { moods: ['dawn', 'midday', 'overcast', 'dusk'], flyers: 'crows', ground: 'hares', motes: 'snow', glint: '235,248,255' },
  volcanic: { moods: ['midday', 'overcast', 'dusk'], flyers: 'bats', ground: 'lizards', motes: 'ash', glint: '255,190,110' },
  ruins: { moods: ['dawn', 'midday', 'golden', 'dusk'], flyers: 'vultures', ground: 'lizards', motes: 'dust', dapples: true, glint: '240,240,220' },
  sky: { moods: ['dawn', 'midday', 'golden', 'dusk'], flyers: 'gulls', ground: 'none', motes: 'pollen', distant: 'airships', glint: '235,245,255' },
  mechanical: { moods: ['midday', 'overcast', 'dusk'], flyers: 'crows', ground: 'none', motes: 'dust', distant: 'airships', glint: '170,230,210' },
};

/** A soft round light (sun dapples), pre-rendered once. */
let dappleSprite = null;
function dapple() {
  if (dappleSprite) return dappleSprite;
  const c = makeCanvas(64, 64);
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255,246,214,0.55)');
  grad.addColorStop(1, 'rgba(255,246,214,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  dappleSprite = c;
  return c;
}

export class LifeLayer {
  /**
   * @param map    the generated map (decor, pathDist, featureTiles)
   * @param biome  the realm (id selects the LIFE profile)
   * @param level  graphics `life` level 0..3
   * @param seed   battle seed: decides the light mood and the cast
   */
  constructor(map, biome, level, seed) {
    this.map = map;
    this.profile = LIFE[biome.id] ?? LIFE.forest;
    this.level = level;
    const rng = createRng((seed ^ 0x11fe) >>> 0);
    this.rng = rng;
    this.mood = MOODS[rng.pick(this.profile.moods)];
    this.t = 0;
    // the sun drifts during the battle: light strength breathes over ~4 minutes
    this.sunPhase = rng.float(0, TAU);
    this.flyers = [];
    this.flyerTimer = rng.float(4, 10);
    this.critters = [];
    this.critterTimer = rng.float(6, 14);
    this.distant = [];
    this.distantTimer = rng.float(10, 30);
    this.butterflies = [];
    this.migration = 0; // > 0 while a Wildlife Migration event runs
    // quiet tiles far from the road, for little creatures and butterflies
    this.edgeTiles = [];
    for (let y = 0; y < map.rows; y++) {
      for (let x = 0; x < map.cols; x++) {
        const i = y * map.cols + x;
        if (map.pathDist[i] >= 4 && map.grid[i] === 0) this.edgeTiles.push({ x, y });
      }
    }
    if (this.profile.butterflies && level >= 2) {
      for (let i = 0; i < 5 && this.edgeTiles.length; i++) {
        const t = rng.pick(this.edgeTiles);
        this.butterflies.push({ hx: t.x * TILE + 16, hy: t.y * TILE + 16, ph: rng.float(0, TAU), c: rng.pick(['#f2d38a', '#e9eef5', '#d98aa6']) });
      }
    }
    this.motes = level >= 1 && this.profile.motes !== 'none' ? Array.from({ length: [0, 14, 26, 40][level] }, () => ({ x: rng.float(0, WORLD_W), y: rng.float(0, WORLD_H), ph: rng.float(0, TAU), s: rng.float(0.6, 1.4) })) : [];
    this.dapples = this.profile.dapples && level >= 2 ? Array.from({ length: level >= 3 ? 9 : 6 }, () => ({ x: rng.float(0, WORLD_W), y: rng.float(0, WORLD_H), r: rng.float(40, 80), ph: rng.float(0, TAU) })) : [];
    this.glints = level >= 2 && map.featureTiles.length ? Array.from({ length: Math.min(30, Math.round(map.featureTiles.length * 0.25)) }, () => ({ t: rng.pick(map.featureTiles), ph: rng.float(0, TAU), sp: rng.float(1.5, 3) })) : [];
  }

  /** Current light: the mood, breathing slowly as clouds pass and the sun moves. */
  light() {
    const breathe = 0.85 + 0.15 * Math.sin(this.t * 0.026 + this.sunPhase);
    return { ...this.mood, k: breathe };
  }

  spawnFlock(scale = 1) {
    const rng = this.rng;
    const kind = this.profile.flyers;
    if (kind === 'none') return;
    const fromLeft = rng.next() < 0.5;
    const y = rng.float(40, WORLD_H - 40);
    const vul = kind === 'vultures';
    const n = vul ? rng.int(1, 3) : Math.round(rng.int(3, 7) * scale);
    const speed = (vul ? 38 : kind === 'bats' ? 90 : kind === 'gulls' ? 70 : 60) * (fromLeft ? 1 : -1);
    const birds = [];
    for (let i = 0; i < n; i++) birds.push({ dx: -Math.abs(i - n / 2) * 10 * Math.sign(speed), dy: (i - n / 2) * 7, ph: rng.float(0, TAU) });
    this.flyers.push({ kind, x: fromLeft ? -60 : WORLD_W + 60, y, vx: speed, vy: rng.float(-8, 8), birds, circle: vul ? { cx: rng.float(200, WORLD_W - 200), cy: y, r: rng.float(60, 110), a: 0 } : null, life: vul ? rng.float(20, 35) : 999 });
  }

  spawnCritter() {
    const kind = this.profile.ground;
    if (kind === 'none' || !this.edgeTiles.length) return;
    const t = this.rng.pick(this.edgeTiles);
    this.critters.push({ kind, x: t.x * TILE + 16, y: t.y * TILE + 22, dir: this.rng.next() < 0.5 ? -1 : 1, t: 0, max: this.rng.float(5, 9), hop: this.rng.float(0, TAU) });
  }

  update(dt) {
    this.t += dt;
    if (this.level <= 0) return;
    const rng = this.rng;
    this.flyerTimer -= dt * (this.migration > 0 ? 4 : 1);
    if (this.flyerTimer <= 0 && this.flyers.length < 4 + (this.migration > 0 ? 6 : 0)) {
      this.spawnFlock(this.migration > 0 ? 1.6 : 1);
      this.flyerTimer = rng.float(10, 24) / this.level;
    }
    for (let i = this.flyers.length - 1; i >= 0; i--) {
      const f = this.flyers[i];
      if (f.circle) {
        // vultures circle a spot for a while, then leave
        f.circle.a += dt * 0.4;
        f.life -= dt;
        f.x = f.circle.cx + Math.cos(f.circle.a) * f.circle.r;
        f.y = f.circle.cy + Math.sin(f.circle.a) * f.circle.r * 0.6;
        if (f.life <= 0) f.circle = null;
      } else {
        f.x += f.vx * dt;
        f.y += f.vy * dt;
      }
      if (f.x < -120 || f.x > WORLD_W + 120) this.flyers.splice(i, 1);
    }
    if (this.level >= 2) {
      this.critterTimer -= dt;
      if (this.critterTimer <= 0 && this.critters.length < 2) {
        this.spawnCritter();
        this.critterTimer = rng.float(10, 22);
      }
    }
    for (let i = this.critters.length - 1; i >= 0; i--) {
      const c = this.critters[i];
      c.t += dt;
      c.x += c.dir * (Math.sin(c.t * 5 + c.hop) > 0.3 ? 14 : 0) * dt;
      if (c.t > c.max) this.critters.splice(i, 1);
    }
    if (this.profile.distant && this.level >= 2) {
      this.distantTimer -= dt;
      if (this.distantTimer <= 0 && !this.distant.length) {
        const left = rng.next() < 0.5;
        this.distant.push({ x: left ? -120 : WORLD_W + 120, y: rng.float(30, 120), vx: (left ? 1 : -1) * rng.float(9, 16), s: rng.float(0.7, 1.1) });
        this.distantTimer = rng.float(40, 80);
      }
      for (let i = this.distant.length - 1; i >= 0; i--) {
        const d = this.distant[i];
        d.x += d.vx * dt;
        if (d.x < -200 || d.x > WORLD_W + 200) this.distant.splice(i, 1);
      }
    }
    for (const m of this.motes) {
      const kind = this.profile.motes;
      const fall = kind === 'snow' ? 14 : kind === 'ash' ? 8 : 3;
      m.y += fall * dt;
      m.x += (Math.sin(this.t * 0.7 + m.ph) * 6 + (kind === 'dust' ? 10 : 2)) * dt;
      if (m.y > WORLD_H + 6) m.y = -6;
      if (m.x > WORLD_W + 6) m.x = -6;
    }
    if (this.migration > 0) this.migration -= dt;
  }

  /** Ground level, under the actors: light grade, sun dapples, glints, little creatures. */
  drawGround(ctx, featurePath) {
    const L = this.light();
    if (L.strength > 0.02) {
      const [r, g, b] = L.grade;
      ctx.fillStyle = `rgba(${r},${g},${b},${(L.strength * L.k).toFixed(3)})`;
      ctx.fillRect(0, 0, WORLD_W, WORLD_H);
    }
    if (L.shade > 0) {
      // the low sun leaves one side of the field a little darker
      const grad = ctx.createLinearGradient(L.sun > 0 ? WORLD_W : 0, 0, L.sun > 0 ? 0 : WORLD_W, 0);
      grad.addColorStop(0, 'rgba(10,12,30,0)');
      grad.addColorStop(1, `rgba(10,12,30,${(L.shade * L.k).toFixed(3)})`);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, WORLD_W, WORLD_H);
    }
    if (this.level <= 0) return;
    if (this.dapples.length && this.mood.id !== 'overcast' && this.mood.id !== 'dusk') {
      const img = dapple();
      for (const d of this.dapples) {
        const a = 0.35 + 0.3 * Math.sin(this.t * 0.35 + d.ph);
        ctx.globalAlpha = a * L.k;
        const x = d.x + Math.sin(this.t * 0.05 + d.ph) * 30;
        ctx.drawImage(img, x - d.r, d.y - d.r * 0.7, d.r * 2, d.r * 1.4);
      }
      ctx.globalAlpha = 1;
    }
    if (this.glints.length && featurePath) {
      ctx.save();
      ctx.clip(featurePath);
      for (const g of this.glints) {
        const k = Math.sin(this.t * g.sp + g.ph);
        if (k < 0.6) continue;
        ctx.fillStyle = `rgba(${this.profile.glint},${((k - 0.6) * 1.6).toFixed(3)})`;
        const x = g.t.x * TILE + 8 + ((g.ph * 7) % 16);
        const y = g.t.y * TILE + 10 + ((g.ph * 11) % 12);
        ctx.fillRect(x - 3, y, 6, 1);
        ctx.fillRect(x - 1, y - 1, 2, 3);
      }
      ctx.restore();
    }
    for (const c of this.critters) this.drawCritter(ctx, c);
    // shadows of whatever flies overhead fall on the ground
    ctx.fillStyle = 'rgba(10,12,16,0.12)';
    for (const f of this.flyers) {
      for (const b of f.birds) {
        ctx.beginPath();
        ctx.ellipse(f.x + b.dx + 28, f.y + b.dy + 54, f.kind === 'vultures' ? 7 : 3.5, 1.6, 0, 0, TAU);
        ctx.fill();
      }
    }
  }

  drawCritter(ctx, c) {
    const fade = Math.min(1, c.t * 2, (c.max - c.t) * 2);
    const hop = Math.max(0, Math.sin(c.t * 10 + c.hop)) * (c.kind === 'lizards' ? 0 : 2);
    ctx.save();
    ctx.globalAlpha = fade;
    ctx.translate(c.x, c.y - hop);
    ctx.scale(c.dir, 1);
    if (c.kind === 'lizards') {
      ctx.fillStyle = '#5a5236';
      ctx.fillRect(-4, -1, 8, 2);
      ctx.fillRect(3, -1.6, 2.4, 2);
      ctx.strokeStyle = '#5a5236';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(-4, 0);
      ctx.quadraticCurveTo(-7, 1 + Math.sin(c.t * 8), -9, 0);
      ctx.stroke();
    } else {
      const col = c.kind === 'hares' ? '#ecebe6' : '#8a7458';
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.ellipse(0, -2, 3.4, 2.4, 0, 0, TAU);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(3, -4, 1.8, 1.6, 0, 0, TAU);
      ctx.fill();
      ctx.fillRect(2.4, -8, 0.9, 3.2);
      ctx.fillRect(3.6, -8, 0.9, 3.2);
      ctx.fillStyle = '#f2efe6';
      ctx.fillRect(-4, -2.6, 1.4, 1.4);
    }
    ctx.restore();
  }

  /** Far away, under the islands (Sky Islands) or above the field: airships crossing. */
  drawDistant(ctx) {
    if (!this.distant.length) return;
    for (const d of this.distant) {
      ctx.save();
      ctx.translate(d.x, d.y);
      ctx.scale(d.s * Math.sign(d.vx), d.s);
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = '#3a4250';
      ctx.beginPath();
      ctx.ellipse(0, 0, 26, 8, 0, 0, TAU);
      ctx.fill();
      ctx.fillRect(-8, 7, 16, 4);
      ctx.beginPath();
      ctx.moveTo(-24, 0);
      ctx.lineTo(-32, -6);
      ctx.lineTo(-32, 6);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }

  /** In the air, above the actors: flyers, butterflies and motes. Faint and small. */
  drawAir(ctx) {
    if (this.level <= 0) return;
    this.drawDistant(ctx);
    for (const f of this.flyers) {
      const col = f.kind === 'gulls' ? 'rgba(240,242,246,0.85)' : f.kind === 'bats' ? 'rgba(30,22,26,0.85)' : 'rgba(34,30,32,0.8)';
      ctx.strokeStyle = col;
      ctx.lineWidth = f.kind === 'vultures' ? 1.8 : 1.2;
      for (const b of f.birds) {
        const flap = Math.sin(this.t * (f.kind === 'bats' ? 18 : f.kind === 'vultures' ? 3 : 10) + b.ph);
        const w = f.kind === 'vultures' ? 9 : 4;
        const x = f.x + b.dx;
        const y = f.y + b.dy;
        ctx.beginPath();
        ctx.moveTo(x - w, y - flap * w * 0.5);
        ctx.quadraticCurveTo(x - w * 0.4, y - 1.5, x, y);
        ctx.quadraticCurveTo(x + w * 0.4, y - 1.5, x + w, y - flap * w * 0.5);
        ctx.stroke();
      }
    }
    for (const b of this.butterflies) {
      const x = b.hx + Math.sin(this.t * 0.6 + b.ph) * 22 + Math.sin(this.t * 1.7 + b.ph) * 6;
      const y = b.hy + Math.cos(this.t * 0.5 + b.ph) * 14 - 8;
      const flap = Math.abs(Math.sin(this.t * 14 + b.ph));
      ctx.fillStyle = b.c;
      ctx.fillRect(x - 2 * flap - 0.5, y - 1, 2 * flap, 2);
      ctx.fillRect(x + 0.5, y - 1, 2 * flap, 2);
    }
    if (this.motes.length) {
      const kind = this.profile.motes;
      const col = { pollen: '255,244,190', snow: '255,255,255', ash: '90,84,80', dust: '220,200,160', spores: '200,230,140' }[kind] ?? '255,255,255';
      for (const m of this.motes) {
        const a = kind === 'snow' ? 0.7 : 0.35 + 0.25 * Math.sin(this.t * 1.3 + m.ph);
        ctx.fillStyle = `rgba(${col},${a.toFixed(3)})`;
        ctx.fillRect(m.x, m.y, m.s * 1.4, m.s * 1.4);
      }
    }
  }
}
