// Weather visuals. Each weather has its own look, fades in/out over ~1.5 s,
// and stays low-contrast so enemies, units and projectiles remain readable.
import { WORLD_W, WORLD_H } from '../config.js';
import { drawGlow } from './canvas.js';

const TAU = Math.PI * 2;
const rnd = (a, b) => a + Math.random() * (b - a);

export class WeatherFx {
  constructor() {
    this.kind = null;
    this.fade = 0; // 0..1 presence of the current/last weather
    this.t = 0;
    this.drops = [];
    this.ripples = [];
    this.streaks = [];
    this.debris = [];
    this.motes = [];
    this.bolts = [];
    this.flash = 0;
  }

  /** Called every frame with the game's current weather (or null). */
  update(dt, weather, effects = 1) {
    this.t += dt;
    const id = weather?.id ?? null;
    if (id && id !== this.kind) {
      this.kind = id;
      this.seed(effects);
    }
    this.fade = Math.max(0, Math.min(1, this.fade + (id ? dt : -dt) / 1.5));
    if (!id && this.fade === 0) this.kind = null;
    if (!this.kind) return;
    const heavy = this.kind === 'thunderstorm';
    for (const d of this.drops) {
      d.x += d.vx * dt;
      d.y += d.vy * dt;
      if (d.y > d.floor) {
        if (this.ripples.length < 80 && Math.random() < 0.5) this.ripples.push({ x: d.x, y: d.floor, t: 0 });
        d.y = rnd(-60, -10);
        d.x = rnd(-100, WORLD_W);
        d.floor = rnd(40, WORLD_H);
      }
    }
    for (let i = this.ripples.length - 1; i >= 0; i--) if ((this.ripples[i].t += dt) > 0.5) this.ripples.splice(i, 1);
    for (const s of this.streaks) {
      s.x += s.v * dt;
      s.y += Math.sin(this.t * 0.8 + s.ph) * 6 * dt;
      if (s.x > WORLD_W + 200) {
        s.x = rnd(-400, -100);
        s.y = rnd(0, WORLD_H);
      }
    }
    for (const d of this.debris) {
      d.x += d.vx * dt;
      d.y += Math.sin(this.t * 3 + d.ph) * 20 * dt;
      d.rot += dt * 6;
      if (d.x > WORLD_W + 20) {
        d.x = -20;
        d.y = rnd(0, WORLD_H);
      }
    }
    for (const m of this.motes) {
      m.y += m.vy * dt;
      m.x += Math.sin(this.t + m.ph) * 8 * dt;
      if (m.y > WORLD_H + 10) {
        m.y = -10;
        m.x = rnd(0, WORLD_W);
      }
    }
    for (let i = this.bolts.length - 1; i >= 0; i--) if ((this.bolts[i].t += dt) > 0.35) this.bolts.splice(i, 1);
    this.flash = Math.max(0, this.flash - dt * 3);
    if (heavy && Math.random() < dt * 0.15) this.flash = 0.6; // distant sheet lightning
  }

  seed(effects) {
    const n = (k) => Math.round(k * (0.4 + 0.6 * effects));
    const rain = this.kind === 'rainy' || this.kind === 'thunderstorm';
    const heavy = this.kind === 'thunderstorm';
    this.drops = rain
      ? Array.from({ length: n(heavy ? 260 : 170) }, () => ({ x: rnd(-100, WORLD_W), y: rnd(-WORLD_H, WORLD_H), vx: heavy ? 170 : 90, vy: heavy ? 820 : 620, len: heavy ? 16 : 12, floor: rnd(40, WORLD_H) }))
      : [];
    this.ripples = [];
    this.streaks = this.kind === 'windy' || heavy ? Array.from({ length: n(heavy ? 18 : 34) }, () => ({ x: rnd(-400, WORLD_W), y: rnd(0, WORLD_H), len: rnd(60, 180), v: rnd(380, 620), ph: rnd(0, TAU) })) : [];
    this.debris = this.kind === 'windy' ? Array.from({ length: n(26) }, () => ({ x: rnd(0, WORLD_W), y: rnd(0, WORLD_H), vx: rnd(160, 300), rot: rnd(0, TAU), ph: rnd(0, TAU), c: Math.random() < 0.5 ? '#a08a5a' : '#6f7d4a' })) : [];
    this.motes = this.kind === 'nova' ? Array.from({ length: n(40) }, () => ({ x: rnd(0, WORLD_W), y: rnd(0, WORLD_H), vy: rnd(10, 26), ph: rnd(0, TAU) })) : [];
  }

  /** A lightning bolt from the sky to (x, y). */
  strike(x, y) {
    const pts = [{ x: x + rnd(-80, 80), y: -10 }];
    const steps = 9;
    for (let i = 1; i < steps; i++) {
      const k = i / steps;
      pts.push({ x: pts[0].x + (x - pts[0].x) * k + rnd(-18, 18), y: -10 + (y + 10) * k });
    }
    pts.push({ x, y });
    this.bolts.push({ pts, t: 0 });
    this.flash = 1;
  }

  /** Ground layer: ripples, cloud darkening, aurora/nova light on the terrain. */
  drawUnder(ctx) {
    if (!this.kind) return;
    const a = this.fade;
    if (this.kind === 'rainy' || this.kind === 'thunderstorm') {
      ctx.fillStyle = `rgba(20,30,45,${(this.kind === 'thunderstorm' ? 0.22 : 0.1) * a})`;
      ctx.fillRect(0, 0, WORLD_W, WORLD_H);
      ctx.strokeStyle = `rgba(200,220,240,${0.35 * a})`;
      ctx.lineWidth = 1;
      for (const r of this.ripples) {
        const k = r.t / 0.5;
        ctx.globalAlpha = (1 - k) * a;
        ctx.beginPath();
        ctx.ellipse(r.x, r.y, 1 + k * 6, 0.5 + k * 3, 0, 0, TAU);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    } else if (this.kind === 'aurora') {
      ctx.fillStyle = `rgba(30,60,70,${0.12 * a})`;
      ctx.fillRect(0, 0, WORLD_W, WORLD_H);
    } else if (this.kind === 'nova') {
      const g = ctx.createRadialGradient(WORLD_W * 0.82, -40, 0, WORLD_W * 0.82, -40, WORLD_W * 0.9);
      g.addColorStop(0, `rgba(255,214,140,${0.22 * a})`);
      g.addColorStop(1, 'rgba(255,214,140,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, WORLD_W, WORLD_H);
    }
  }

  /** Sky layer above actors – kept faint. */
  drawOver(ctx) {
    if (!this.kind) return;
    const a = this.fade;
    switch (this.kind) {
      case 'rainy':
      case 'thunderstorm': {
        ctx.strokeStyle = `rgba(190,210,230,${(this.kind === 'thunderstorm' ? 0.38 : 0.3) * a})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (const d of this.drops) {
          ctx.moveTo(d.x, d.y);
          ctx.lineTo(d.x - d.vx * 0.02, d.y - d.len);
        }
        ctx.stroke();
        break;
      }
      case 'windy': {
        ctx.strokeStyle = `rgba(235,235,225,${0.16 * a})`;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        for (const s of this.streaks) {
          ctx.moveTo(s.x, s.y);
          ctx.quadraticCurveTo(s.x + s.len * 0.5, s.y - 6, s.x + s.len, s.y);
        }
        ctx.stroke();
        for (const d of this.debris) {
          ctx.save();
          ctx.translate(d.x, d.y);
          ctx.rotate(d.rot);
          ctx.globalAlpha = 0.7 * a;
          ctx.fillStyle = d.c;
          ctx.fillRect(-2.5, -1, 5, 2);
          ctx.restore();
        }
        ctx.globalAlpha = 1;
        break;
      }
      case 'aurora': {
        // three slow ribbons of light across the top third
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const cols = ['120,230,190', '120,190,240', '190,140,230'];
        for (let r = 0; r < 3; r++) {
          const base = WORLD_H * (0.08 + r * 0.07);
          ctx.beginPath();
          for (let x = -20; x <= WORLD_W + 20; x += 40) {
            const y = base + Math.sin(x * 0.006 + this.t * 0.4 + r * 1.7) * 26 + Math.sin(x * 0.017 + this.t * 0.9 + r) * 8;
            if (x === -20) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          for (let x = WORLD_W + 20; x >= -20; x -= 40) {
            const y = base + 70 + Math.sin(x * 0.006 + this.t * 0.4 + r * 1.7 + 0.4) * 30;
            ctx.lineTo(x, y);
          }
          ctx.closePath();
          const g = ctx.createLinearGradient(0, base - 30, 0, base + 100);
          g.addColorStop(0, `rgba(${cols[r]},0)`);
          g.addColorStop(0.4, `rgba(${cols[r]},${0.1 * a})`);
          g.addColorStop(1, `rgba(${cols[r]},0)`);
          ctx.fillStyle = g;
          ctx.fill();
        }
        ctx.restore();
        break;
      }
      case 'nova': {
        const cx = WORLD_W * 0.82;
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        for (let i = 0; i < 7; i++) {
          const ang = Math.PI * 0.35 + (i / 7) * Math.PI * 0.45 + Math.sin(this.t * 0.2 + i) * 0.03;
          ctx.fillStyle = `rgba(255,220,150,${0.035 * a})`;
          ctx.beginPath();
          ctx.moveTo(cx, -40);
          ctx.lineTo(cx + Math.cos(ang - 0.04) * WORLD_W, -40 + Math.sin(ang - 0.04) * WORLD_W);
          ctx.lineTo(cx + Math.cos(ang + 0.04) * WORLD_W, -40 + Math.sin(ang + 0.04) * WORLD_W);
          ctx.closePath();
          ctx.fill();
        }
        ctx.restore();
        for (const m of this.motes) drawGlow(ctx, '#ffe2a0', m.x, m.y, 3, (0.35 + 0.25 * Math.sin(this.t * 3 + m.ph)) * a);
        break;
      }
      default:
    }
    // lightning bolts and flashes (also used outside storms if strike() is called)
    for (const b of this.bolts) {
      const k = b.t / 0.35;
      ctx.strokeStyle = `rgba(255,255,240,${(1 - k) * 0.95})`;
      ctx.lineWidth = 2.4 * (1 - k) + 0.6;
      ctx.beginPath();
      b.pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
      ctx.stroke();
      ctx.strokeStyle = `rgba(200,210,255,${(1 - k) * 0.4})`;
      ctx.lineWidth = 6 * (1 - k);
      ctx.stroke();
    }
    if (this.flash > 0) {
      ctx.fillStyle = `rgba(230,235,255,${this.flash * 0.12})`;
      ctx.fillRect(0, 0, WORLD_W, WORLD_H);
    }
  }
}
