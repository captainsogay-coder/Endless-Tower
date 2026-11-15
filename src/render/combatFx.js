// Combat feedback that carries information:
//  - heavy hits knock enemies back a little (visual only), so weight reads;
//  - eliminated enemies collapse and fade for a quarter second, no gore;
//  - heavy critical hits get a small "CRIT ×n" call-out (rate-limited);
//  - a unit using its special ability flashes a ring at its feet and, when
//    the field is calm enough, the ability's name;
//  - chase units' abilities get a short cinematic beat: the edges of the
//    screen dim for half a second and the ability is named (Intense effects);
//  - upgrades rise from the unit; reaching the top level is unmistakable.

import { WORLD_W, WORLD_H } from '../config.js';
import { drawGlow } from './canvas.js';
import { impactWeight } from './impact.js';
import { maxLevel } from '../units/unitStats.js';
import { listBanners } from '../units/summoning.js';


let chaseIds = null;
/** Unit types that are a circle's chase unit (the 2%/rare pulls). */
export function isChaseUnit(defId) {
  if (!chaseIds) {
    chaseIds = new Set();
    for (const b of listBanners()) for (const p of b.pool) if (p.chase || p.chance <= 0.01) chaseIds.add(p.unit);
  }
  return chaseIds.has(defId);
}

export class CombatFx {
  constructor(renderer) {
    this.r = renderer;
    this.reset();
  }

  reset() {
    this.corpses = [];
    this.pool = [];
    this.labels = [];
    this.cine = null;
    this.lastCine = -99;
    this.lastCrit = -99;
  }

  attach(game, on) {
    this.game = game;
    on('impact', (p) => {
      const e = p.target;
      if (!e || !e.alive) return;
      const w = impactWeight(game, p.damage, e);
      if (w > 0.55 && !e.isBoss) {
        // recoil along the shot's direction, scaled by how much the hit mattered
        const d = Math.hypot(p.tx - p.sx, p.ty - p.sy) || 1;
        const k = Math.min(3.5, 2 + 2 * (w - 0.55)) * (e.category === 'elite' ? 0.5 : 1);
        e.kickX = ((p.tx - p.sx) / d) * k;
        e.kickY = ((p.ty - p.sy) / d) * k;
      }
      if (p.crit && w > 0.5 && this.r.time - this.lastCrit > 0.18) {
        this.lastCrit = this.r.time;
        const mult = p.source?.stats?.damage ? Math.round((p.damage / p.source.stats.damage) * 10) / 10 : 0;
        this.r.fx.text(p.x, p.y - e.radius - 6, mult > 1.05 ? `CRIT ×${mult}` : 'CRIT', '#ffe08a', 10);
      }
    });
    on('death', (e) => {
      if (this.corpses.length > 70 || this.r.lite) return;
      const c = this.pool.pop() ?? {};
      c.x = e.x;
      c.y = e.y;
      c.cat = e.category;
      c.kind = e.bossKind ?? null;
      c.facing = e.facing;
      c.t = 0;
      c.max = e.isBoss ? 0.6 : 0.28;
      this.corpses.push(c);
    });
    on('upgrade', (u) => {
      const max = u.level >= maxLevel(u.def);
      this.labels.push({ x: u.x, y: u.y - 30, text: max ? 'MAX LEVEL' : `LEVEL ${u.level}`, t: 0, max: 1.1, color: max ? '#f2d38a' : '#e9e2d0' });
      this.r.fx.ring(u.x, u.y + 9, 4, max ? 26 : 18, max ? 0.6 : 0.4, max ? '#f2d38a' : '#e3a33b', max ? 2.4 : 1.6);
      if (max) this.r.fx.burst(u.x, u.y - 6, 10, '#f2d38a', { speed: 50, life: 0.6, size: 1.6, glow: false, gravity: -20 });
    });
  }

  /** Watches for special-ability uses (abilities stamp `u.lastSpecial`). */
  scan() {
    const g = this.game;
    for (const u of g.units) {
      if (u.lastSpecial === undefined || u.lastSpecial === u._fxSpecial) continue;
      u._fxSpecial = u.lastSpecial;
      if (g.time - u.lastSpecial > 0.2) continue;
      this.r.fx.ring(u.x, u.y + 9, 3, 16, 0.4, '#f2e6c9', 1.4);
      const name = u.def.passive?.name;
      const chase = isChaseUnit(u.def.id);
      if (chase && this.r.flags.intenseFx && this.r.time - this.lastCine > 4) {
        this.lastCine = this.r.time;
        this.cine = { x: u.x, y: u.y, t: 0, max: 0.9, name: name ?? u.def.name };
      }
      if (name && this.labels.length < (chase ? 5 : 3)) this.labels.push({ x: u.x, y: u.y - 34, text: name, t: 0, max: 1, color: chase ? '#f2d38a' : '#e9e2d0', big: chase });
    }
  }

  /** Enemy draw offset from a recent heavy hit (decays quickly). */
  kick(e, dt) {
    if (!e.kickX && !e.kickY) return null;
    e.kickX *= Math.max(0, 1 - dt * 14);
    e.kickY *= Math.max(0, 1 - dt * 14);
    if (Math.abs(e.kickX) + Math.abs(e.kickY) < 0.05) e.kickX = e.kickY = 0;
    return e;
  }

  /** Collapsing silhouettes of the fallen (under living enemies). */
  drawCorpses(ctx, dt, sprites, bossSprites) {
    let w = 0;
    for (const c of this.corpses) {
      c.t += dt;
      if (c.t >= c.max) {
        this.pool.push(c);
        continue;
      }
      const k = c.t / c.max;
      const spr = (c.kind && bossSprites?.[c.kind]) || sprites[c.cat];
      if (spr) {
        ctx.save();
        ctx.globalAlpha = (1 - k) * 0.85;
        ctx.translate(c.x, c.y + k * 4);
        ctx.scale(c.facing * (1 + k * 0.25), 1 - k * 0.7);
        ctx.drawImage(spr.flash, -spr.half, -spr.half, spr.half * 2, spr.half * 2);
        ctx.restore();
      }
      this.corpses[w++] = c;
    }
    this.corpses.length = w;
  }

  /** Labels and the chase beat (top of the scene). */
  drawOver(ctx, dt) {
    this.scan();
    let w = 0;
    ctx.textAlign = 'center';
    for (const l of this.labels) {
      l.t += dt;
      if (l.t >= l.max) continue;
      const k = l.t / l.max;
      ctx.globalAlpha = k < 0.15 ? k / 0.15 : 1 - Math.max(0, k - 0.6) / 0.4;
      ctx.font = `800 ${l.big ? 11 : 9}px "Archivo", sans-serif`;
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(15,12,10,0.85)';
      ctx.strokeText(l.text.toUpperCase(), l.x, l.y - k * 10);
      ctx.fillStyle = l.color;
      ctx.fillText(l.text.toUpperCase(), l.x, l.y - k * 10);
      this.labels[w++] = l;
    }
    ctx.globalAlpha = 1;
    this.labels.length = w;
    const c = this.cine;
    if (c) {
      c.t += dt;
      if (c.t >= c.max) this.cine = null;
      else {
        // the edges of the field darken around the caster for a beat
        const k = c.t / c.max;
        const a = (k < 0.25 ? k / 0.25 : 1 - (k - 0.25) / 0.75) * 0.45;
        const g = ctx.createRadialGradient(c.x, c.y, 60, c.x, c.y, Math.max(WORLD_W, WORLD_H) * 0.75);
        g.addColorStop(0, 'rgba(8,6,12,0)');
        g.addColorStop(1, `rgba(8,6,12,${a.toFixed(3)})`);
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, WORLD_W, WORLD_H);
        drawGlow(ctx, '#f2d38a', c.x, c.y - 10, 40, 0.3 * a * 2);
      }
    }
  }
}
