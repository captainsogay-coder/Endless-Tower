// Pooled, capped particle/ring/text effects. Purely cosmetic.
import { drawGlow, circle } from './canvas.js';
import { rgba } from '../core/color.js';

export class Effects {
  constructor(max = 1000) {
    this.max = max;
    this.particles = [];
    this.pool = [];
    this.rings = [];
    this.texts = [];
  }

  particle(x, y, vx, vy, life, size, color, opts = {}) {
    if (this.particles.length >= this.max) return;
    const p = this.pool.pop() ?? {};
    p.x = x; p.y = y; p.vx = vx; p.vy = vy;
    p.life = life; p.max = life; p.size = size; p.color = color;
    p.drag = opts.drag ?? 0.92; p.gravity = opts.gravity ?? 0; p.glow = opts.glow ?? true; p.shrink = opts.shrink ?? true;
    this.particles.push(p);
  }

  /** Fraction of requested particles to actually emit, shrinking as the field gets crowded. */
  get density() {
    return Math.max(0.15, 1 - this.particles.length / this.max);
  }

  burst(x, y, count, color, { speed = 80, life = 0.6, size = 2.5, gravity = 0, glow = true } = {}) {
    count = Math.ceil(count * this.density);
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = speed * (0.3 + Math.random() * 0.7);
      this.particle(x, y, Math.cos(a) * s, Math.sin(a) * s, life * (0.6 + Math.random() * 0.6), size * (0.6 + Math.random() * 0.8), color, { gravity, glow });
    }
  }

  ring(x, y, r0, r1, life, color, width = 2) {
    if (this.rings.length > 300) return;
    this.rings.push({ x, y, r0, r1, life, max: life, color, width });
  }

  text(x, y, str, color, size = 12) {
    if (this.texts.length > 60) return;
    this.texts.push({ x, y, str, color, size, life: 1.1, max: 1.1 });
  }

  update(dt) {
    const ps = this.particles;
    let w = 0;
    for (let i = 0; i < ps.length; i++) {
      const p = ps[i];
      p.life -= dt;
      if (p.life <= 0) { this.pool.push(p); continue; }
      const k = Math.pow(p.drag, dt * 60);
      p.vx *= k;
      p.vy = p.vy * k + p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      ps[w++] = p;
    }
    ps.length = w;
    for (let i = this.rings.length - 1; i >= 0; i--) if ((this.rings[i].life -= dt) <= 0) this.rings.splice(i, 1);
    for (let i = this.texts.length - 1; i >= 0; i--) {
      const t = this.texts[i];
      t.life -= dt;
      t.y -= 22 * dt;
      if (t.life <= 0) this.texts.splice(i, 1);
    }
  }

  draw(ctx) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const p of this.particles) {
      const k = p.life / p.max;
      const s = p.shrink ? p.size * (0.4 + 0.6 * k) : p.size;
      if (p.glow) drawGlow(ctx, p.color, p.x, p.y, s * 2.4, k);
      else {
        ctx.fillStyle = rgba(p.color, k);
        ctx.fillRect(p.x - s / 2, p.y - s / 2, s, s);
      }
    }
    ctx.globalCompositeOperation = 'source-over';
    for (const r of this.rings) {
      const k = 1 - r.life / r.max;
      ctx.strokeStyle = rgba(r.color, (1 - k) * 0.9);
      ctx.lineWidth = r.width * (1 - k * 0.6);
      circle(ctx, r.x, r.y, r.r0 + (r.r1 - r.r0) * (1 - Math.pow(1 - k, 3)));
      ctx.stroke();
    }
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const t of this.texts) {
      const k = t.life / t.max;
      ctx.font = `800 ${t.size}px "Nunito Sans", system-ui, sans-serif`;
      ctx.fillStyle = `rgba(0,0,0,${0.6 * k})`;
      ctx.fillText(t.str, t.x + 1, t.y + 1);
      ctx.fillStyle = rgba(t.color, k);
      ctx.fillText(t.str, t.x, t.y);
    }
    ctx.restore();
  }
}
