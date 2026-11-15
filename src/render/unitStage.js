// A small looping stage that shows one unit "for real": its own painter and
// animation personality, attacking a practice target, using its special now
// and then, at any upgrade level. Used by the unit showcase, the collection
// encyclopedia and the summon preview. Draws only while visible.

import { drawUnit, unitSprite } from './unitArt.js';
import { levelStats } from '../units/unitStats.js';

const TAU = Math.PI * 2;

export class UnitStage {
  /** @param canvas  the <canvas> to draw into (sized by CSS; resolution follows) */
  constructor(canvas, { silhouette = false } = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.def = null;
    this.level = 0;
    this.silhouette = silhouette;
    this.raf = 0;
    this.t = 0;
    this.shots = [];
    this.loop = this.loop.bind(this);
  }

  setUnit(def, level = 0) {
    this.def = def;
    this.level = level;
    this.t = 0;
    this.shots = [];
    const rate = def ? Math.max(0.35, Math.min(2.5, levelStats(def, level).rate)) : 1;
    this.u = def && {
      def, level, uid: 7, x: 0, y: 0, facing: 1, angle: 0,
      recoil: 0, cooldown: 1 / rate, hasTarget: true, lastFire: -99, lastSpecial: -99, ally: false,
      period: 1 / rate,
    };
  }

  setLevel(level) {
    if (this.def) this.setUnit(this.def, level);
  }

  start() {
    if (!this.raf) {
      this.last = performance.now();
      this.raf = requestAnimationFrame(this.loop);
    }
  }

  stop() {
    cancelAnimationFrame(this.raf);
    this.raf = 0;
  }

  loop(now) {
    this.raf = 0;
    if (!this.canvas.isConnected || this.canvas.offsetParent === null) return; // hidden: stop until started again
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    this.step(dt);
    this.draw();
    this.raf = requestAnimationFrame(this.loop);
  }

  step(dt) {
    const u = this.u;
    if (!u) return;
    this.t += dt;
    u.recoil = Math.max(0, u.recoil - dt * 6);
    u.cooldown -= dt;
    if (u.cooldown <= 0 && !this.silhouette) {
      u.cooldown = u.period;
      u.lastFire = this.t;
      u.recoil = 1;
      this.shots.push({ t: 0, max: 0.25 });
    }
    // the special ability every few seconds, so its pose and cue show too
    if (!this.silhouette && this.t - (u.lastSpecial < 0 ? 0 : u.lastSpecial) > 6) u.lastSpecial = this.t;
    for (const s of this.shots) s.t += dt;
    this.shots = this.shots.filter((s) => s.t < s.max);
  }

  draw() {
    const c = this.canvas;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.max(1, Math.round(c.clientWidth * dpr));
    const h = Math.max(1, Math.round(c.clientHeight * dpr));
    if (c.width !== w || c.height !== h) {
      c.width = w;
      c.height = h;
    }
    const ctx = this.ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const u = this.u;
    if (!u) return;
    // fit: tall giants get more room
    const k = (h / 64) * (u.def.tier >= 18 ? 0.8 : 1);
    const cx = w * 0.4;
    const cy = h * 0.72;
    ctx.setTransform(k, 0, 0, k, cx, cy);
    // ground disc and a practice target to the right
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.beginPath();
    ctx.ellipse(0, 9, 26, 7, 0, 0, TAU);
    ctx.fill();
    if (!this.silhouette) {
      const tx = 34;
      ctx.fillStyle = '#6b4a2c';
      ctx.fillRect(tx - 1, -4, 2, 13);
      ctx.fillStyle = '#e6dcc0';
      ctx.beginPath();
      ctx.arc(tx, -12, 6, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#b7353a';
      ctx.beginPath();
      ctx.arc(tx, -12, 3, 0, TAU);
      ctx.fill();
      for (const s of this.shots) {
        const p = s.t / s.max;
        ctx.strokeStyle = `rgba(255,236,190,${1 - p})`;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(4 + 26 * p, -12);
        ctx.lineTo(Math.min(tx - 4, 12 + 26 * p), -12);
        ctx.stroke();
      }
    }
    if (this.silhouette) {
      // undiscovered: the shape only, nothing else revealed
      const s = unitSprite(u.def.art, 0, 1, 0);
      ctx.filter = 'brightness(0) opacity(0.55)';
      ctx.drawImage(s.img, s.ox * 1.3, 9 + s.oy * 1.3, s.w * 1.3, s.h * 1.3);
      ctx.filter = 'none';
      return;
    }
    u.x = 0;
    u.y = 0;
    drawUnit(ctx, u, this.t);
  }
}
