// Visuals for the Ghost update's weathers. Same rules as the others: fades in
// and out over ~1.5 s, darkness and fog stay under the actors, anything over
// them is faint; the strikes (falling stars, celestial pulses) always show
// because they deal damage.
//
//  Ghastly Wind      – fog banks rolling across, autumn leaves in swirls,
//                      trees bent hard by the wind (MapScene wind = 1.4)
//  Starfall          – the field turns to night: a starry wash, shooting
//                      stars across the sky; strikes are a bright streak
//                      down to the target and a soft white flare
//  Twilight of Gods  – a golden-red sunset that deepens into dusk over the
//                      20 s, low sun rays slanting across the field, drifting
//                      embers; each pulse is a gold ring at its true size

import { WORLD_W, WORLD_H } from '../config.js';
import { drawGlow } from './canvas.js';

const TAU = Math.PI * 2;
const rnd = (a, b) => a + Math.random() * (b - a);
export const GHOST_WEATHERS = ['ghastly', 'starfall', 'twilight'];

export class GhostWeatherFx {
  constructor() {
    this.kind = null;
    this.fade = 0;
    this.t = 0;
    this.age = 0;
    this.enabled = true;
    this.detail = 1;
    this.strikes = [];
    this.pulses = [];
    this.reset();
  }

  reset() {
    this.leaves = [];
    this.fog = [];
    this.shooting = [];
    this.stars = [];
    this.embers = [];
  }

  update(dt, weather) {
    this.t += dt;
    const id = weather && GHOST_WEATHERS.includes(weather.id) ? weather.id : null;
    if (id && id !== this.kind) {
      this.kind = id;
      this.age = 0;
      this.seed();
    }
    this.fade = Math.max(0, Math.min(1, this.fade + (id ? dt : -dt) / 1.5));
    if (!id && this.fade === 0) this.kind = null;
    this.age += dt;
    for (const s of this.strikes) s.t += dt;
    this.strikes = this.strikes.filter((s) => s.t < 0.7);
    for (const p of this.pulses) p.t += dt;
    this.pulses = this.pulses.filter((p) => p.t < 0.8);
    if (!this.kind) return;
    for (const l of this.leaves) {
      l.x += l.vx * dt;
      l.y += (Math.sin(this.t * 2 + l.ph) * 40 + 12) * dt;
      l.rot += dt * l.spin;
      if (l.x > WORLD_W + 20) {
        l.x = -20;
        l.y = rnd(0, WORLD_H);
      }
    }
    for (const f of this.fog) {
      f.x += f.v * dt;
      if (f.x - f.r > WORLD_W) f.x = -f.r * 2;
    }
    if (this.kind === 'starfall' && Math.random() < dt * 1.2 * this.detail) {
      this.shooting.push({ x: rnd(0, WORLD_W), y: rnd(-20, WORLD_H * 0.4), vx: rnd(-420, -260), vy: rnd(160, 240), t: 0, max: rnd(0.6, 1) });
    }
    for (const s of this.shooting) {
      s.t += dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
    }
    this.shooting = this.shooting.filter((s) => s.t < s.max);
    for (const e of this.embers) {
      e.y -= e.vy * dt;
      e.x += Math.sin(this.t + e.ph) * 10 * dt;
      if (e.y < -10) {
        e.y = WORLD_H + 10;
        e.x = rnd(0, WORLD_W);
      }
    }
  }

  seed() {
    this.reset();
    const n = (k) => Math.round(k * Math.max(0.3, this.detail));
    if (this.kind === 'ghastly') {
      const cols = ['#c8642e', '#d9a04a', '#a8402a', '#e0b85a'];
      this.leaves = Array.from({ length: n(46) }, () => ({ x: rnd(0, WORLD_W), y: rnd(0, WORLD_H), vx: rnd(160, 300), rot: rnd(0, TAU), spin: rnd(-8, 8), ph: rnd(0, TAU), c: cols[Math.floor(Math.random() * cols.length)] }));
      this.fog = Array.from({ length: n(6) }, () => ({ x: rnd(-300, WORLD_W), y: rnd(0, WORLD_H), r: rnd(140, 240), v: rnd(70, 120) }));
    } else if (this.kind === 'starfall') {
      this.stars = Array.from({ length: n(110) }, () => ({ x: rnd(0, WORLD_W), y: rnd(0, WORLD_H), s: rnd(0.6, 1.6), ph: rnd(0, TAU) }));
    } else if (this.kind === 'twilight') {
      this.embers = Array.from({ length: n(40) }, () => ({ x: rnd(0, WORLD_W), y: rnd(0, WORLD_H), vy: rnd(10, 26), ph: rnd(0, TAU) }));
    }
  }

  /** Called on gameplay events: these always show, even with weather visuals off. */
  star(x, y) {
    this.strikes.push({ x, y, t: 0 });
  }

  pulse(x, y, radius) {
    this.pulses.push({ x, y, r: radius, t: 0 });
  }

  /** Ground layer (under the actors). */
  drawUnder(ctx) {
    if (!this.kind || !this.enabled) return;
    const a = this.fade;
    if (this.kind === 'ghastly') {
      ctx.fillStyle = `rgba(150,160,170,${0.1 * a})`;
      ctx.fillRect(0, 0, WORLD_W, WORLD_H);
      for (const f of this.fog) drawGlow(ctx, '#d8dde2', f.x, f.y, f.r, 0.16 * a);
    } else if (this.kind === 'starfall') {
      // night falls on the field
      ctx.fillStyle = `rgba(14,18,48,${0.42 * a})`;
      ctx.fillRect(0, 0, WORLD_W, WORLD_H);
      for (const s of this.stars) {
        const tw = 0.5 + 0.5 * Math.sin(this.t * 2.4 + s.ph);
        ctx.fillStyle = `rgba(230,236,255,${(0.35 + 0.45 * tw) * a})`;
        ctx.fillRect(s.x, s.y, s.s, s.s);
      }
    } else if (this.kind === 'twilight') {
      // gold at first, deepening to a red-violet dusk across the 20 s
      const k = Math.min(1, this.age / 18);
      const top = `rgba(${Math.round(255 - 110 * k)},${Math.round(140 - 90 * k)},${Math.round(50 + 40 * k)},${((0.32 + 0.06 * k) * a).toFixed(3)})`;
      const bottom = `rgba(${Math.round(90 - 50 * k)},${Math.round(30 - 15 * k)},${Math.round(40 + 20 * k)},${((0.22 + 0.22 * k) * a).toFixed(3)})`;
      const g = ctx.createLinearGradient(0, 0, 0, WORLD_H);
      g.addColorStop(0, top);
      g.addColorStop(1, bottom);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, WORLD_W, WORLD_H);
    }
  }

  /** Sky layer (over the actors) – kept faint – plus the strikes. */
  drawOver(ctx) {
    if (this.kind && this.enabled) {
      const a = this.fade;
      if (this.kind === 'ghastly') {
        for (const l of this.leaves) {
          ctx.save();
          ctx.translate(l.x, l.y);
          ctx.rotate(l.rot);
          ctx.globalAlpha = 0.85 * a;
          ctx.fillStyle = l.c;
          ctx.beginPath();
          ctx.ellipse(0, 0, 3.4, 1.7, 0, 0, TAU);
          ctx.fill();
          ctx.restore();
        }
        ctx.globalAlpha = 1;
        // gust lines
        ctx.strokeStyle = `rgba(230,234,238,${0.18 * a})`;
        ctx.lineWidth = 1.3;
        for (let i = 0; i < 10; i++) {
          const x = ((i * 191 + this.t * 420) % (WORLD_W + 300)) - 150;
          const y = (i * 71 + Math.sin(this.t + i) * 20) % WORLD_H;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.quadraticCurveTo(x + 60, y - 10, x + 130, y + 2);
          ctx.stroke();
        }
      } else if (this.kind === 'starfall') {
        for (const s of this.shooting) {
          const k = s.t / s.max;
          const g = ctx.createLinearGradient(s.x - s.vx * 0.12, s.y - s.vy * 0.12, s.x, s.y);
          g.addColorStop(0, 'rgba(200,214,255,0)');
          g.addColorStop(1, `rgba(240,244,255,${0.8 * (1 - k) * a})`);
          ctx.strokeStyle = g;
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.moveTo(s.x - s.vx * 0.12, s.y - s.vy * 0.12);
          ctx.lineTo(s.x, s.y);
          ctx.stroke();
        }
      } else if (this.kind === 'twilight') {
        // the low sun: broad golden rays slanting across the field from the west, slowly turning
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const k = Math.min(1, this.age / 18);
        for (let i = 0; i < 5; i++) {
          const ang = 0.18 + i * 0.09 + Math.sin(this.t * 0.15 + i) * 0.02;
          ctx.fillStyle = `rgba(255,${Math.round(170 - 60 * k)},80,${(0.05 * a * (1 - 0.5 * k)).toFixed(3)})`;
          ctx.beginPath();
          ctx.moveTo(-40, -40);
          ctx.lineTo(-40 + Math.cos(ang - 0.025) * WORLD_W * 1.4, -40 + Math.sin(ang - 0.025) * WORLD_W * 1.4);
          ctx.lineTo(-40 + Math.cos(ang + 0.025) * WORLD_W * 1.4, -40 + Math.sin(ang + 0.025) * WORLD_W * 1.4);
          ctx.closePath();
          ctx.fill();
        }
        ctx.restore();
        for (const e of this.embers) {
          ctx.fillStyle = `rgba(255,${180 + Math.round(40 * Math.sin(this.t + e.ph))},90,${0.6 * a})`;
          ctx.fillRect(e.x, e.y, 1.6, 1.6);
        }
      }
    }
    for (const s of this.strikes) {
      const k = s.t / 0.7;
      if (k < 0.3) {
        ctx.strokeStyle = `rgba(240,244,255,${1 - k / 0.3})`;
        ctx.lineWidth = 2.6;
        ctx.beginPath();
        ctx.moveTo(s.x + 70, s.y - 160);
        ctx.lineTo(s.x, s.y);
        ctx.stroke();
      }
      drawGlow(ctx, '#e6ecff', s.x, s.y, 26, 0.55 * (1 - k));
    }
    for (const p of this.pulses) {
      const k = p.t / 0.8;
      ctx.strokeStyle = `rgba(255,200,110,${0.9 * (1 - k)})`;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, p.r * (0.3 + 0.7 * k), p.r * (0.3 + 0.7 * k) * 0.75, 0, 0, TAU);
      ctx.stroke();
      if (k < 0.3) drawGlow(ctx, '#ffd27a', p.x, p.y, p.r * 0.6, 0.35 * (1 - k / 0.3));
    }
  }
}
