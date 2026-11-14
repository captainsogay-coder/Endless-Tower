// Visuals for Circle Pack 2: projectiles, piercing lines, sky strikes, ability
// zones and timed-buff pulses. Effects follow the shared visual language:
// damage is warm, buffs rise in their own colour, debuff zones sit on the
// ground, income is gold. Sizes always match the real area (zones, pierce
// width), and brightness stays modest; strength reads from shape and motion.

import { TAU } from '../core/math.js';
import { circle, drawGlow } from './canvas.js';
import { impactWeight } from './impact.js';

/**
 * Projectile looks, data-driven:
 *  shape: 'bolt' (streak), 'orb' (round body + optional trail), 'spin' (tumbling
 *  object), 'melee' (no flight, a swipe at the target), 'needle' (thin dart).
 *  arc: lob height in px (0 = straight).
 */
const STYLE = {
  parcel: { shape: 'spin', color: '#b48a5a', edge: '#5a3f2a', size: 2.4, arc: 12 },
  pan: { shape: 'spin', color: '#3a3836', edge: '#111', size: 2.6, arc: 10 },
  trinket: { shape: 'spin', color: '#e0a23a', edge: '#6b4a1a', size: 1.8, arc: 8 },
  inkshot: { shape: 'orb', color: '#2a3f6a', trail: '#6a7fa8', size: 1.8 },
  coinshot: { shape: 'spin', color: '#f2c14a', edge: '#8a5a1a', size: 2.2, arc: 4, gold: true },
  rivet: { shape: 'bolt', color: '#c9cfd8', len: 7, width: 1.4 },
  spring: { shape: 'bolt', color: '#c9a24a', len: 6, width: 1.6 },
  steamfist: { shape: 'melee', color: 'rgba(240,238,232,0.9)', size: 12 },
  clockhand: { shape: 'bolt', color: '#e8c255', len: 8, width: 1.4 },
  piston: { shape: 'bolt', color: '#f2a23a', len: 10, width: 2.2 },
  vine: { shape: 'needle', color: '#5f9a3a', len: 9, width: 1.6 },
  dart: { shape: 'needle', color: '#e0742e', len: 6, width: 1 },
  claw: { shape: 'melee', color: 'rgba(250,246,236,0.9)', size: 9, claws: true },
  spore: { shape: 'orb', color: '#b8d46a', trail: 'rgba(160,200,90,0.5)', size: 3, arc: 10 },
  seedpod: { shape: 'orb', color: '#7a5a2a', trail: '#4f8a3a', size: 3.6, arc: 22 },
  leaf: { shape: 'spin', color: '#4f8a3a', edge: '#1f3a1a', size: 2.2, leaf: true },
  thornburst: { shape: 'orb', color: '#c2385a', trail: 'rgba(224,90,122,0.5)', size: 3.4, arc: 16 },
  windbolt: { shape: 'bolt', color: '#e9f4ff', len: 12, width: 1.6, wind: true },
  gale: { shape: 'bolt', color: '#cfe4ff', len: 14, width: 2, wind: true },
  feather: { shape: 'needle', color: '#f2ead8', len: 8, width: 1.6 },
  spark: { shape: 'orb', color: '#e9f4ff', trail: '#7fc4e8', size: 1.8, spark: true },
  stormball: { shape: 'orb', color: '#5a6aa8', trail: '#cfe4ff', size: 4.4, arc: 14, spark: true },
  starbolt: { shape: 'bolt', color: '#f2d38a', len: 9, width: 1.6, star: true },
  comet: { shape: 'orb', color: '#e9f8ff', trail: '#7fd4ff', size: 3.6, arc: 26, longTrail: true },
  moonray: { shape: 'bolt', color: '#e6ecff', len: 12, width: 1.8 },
  shade: { shape: 'orb', color: '#2a2450', trail: '#6a4fb0', size: 2.6 },
  void: { shape: 'orb', color: '#0d0a18', trail: '#8a7ad8', size: 4.4, arc: 18, ring: '#b8a6f0' },
};

const IMPACT = {
  parcel: '#b48a5a', pan: '#d9d4c8', trinket: '#e0a23a', inkshot: '#6a7fa8', coinshot: '#f2c14a',
  rivet: '#c9cfd8', spring: '#c9a24a', steamfist: '#e6e1d6', clockhand: '#e8c255', piston: '#f2a23a',
  vine: '#5f9a3a', dart: '#e0742e', claw: '#f2efe6', spore: '#b8d46a', seedpod: '#7a5a2a', leaf: '#4f8a3a', thornburst: '#e05a7a',
  windbolt: '#e9f4ff', gale: '#cfe4ff', feather: '#f2ead8', spark: '#cfe4ff', stormball: '#cfe4ff',
  starbolt: '#f2d38a', comet: '#bfeaff', moonray: '#e6ecff', shade: '#8a7ad8', void: '#b8a6f0',
};

export class Pack2Fx {
  constructor(renderer) {
    this.r = renderer;
    this.lines = [];
    this.zaps = [];
    this.pulses = [];
  }

  reset() {
    this.lines = [];
    this.zaps = [];
    this.pulses = [];
  }

  attach(game, on) {
    this.game = game;
    on('beam', (b) => {
      if (this.lines.length > 60) this.lines.shift();
      this.lines.push({ ...b, t: 0, max: b.kind === 'moonbeam' ? 0.45 : b.kind === 'gear' ? 0.4 : 0.2 });
    });
    on('zap', (z) => {
      if (this.zaps.length > 60) this.zaps.shift();
      this.zaps.push({ x: z.x, y: z.y, kind: z.kind, t: 0, max: 0.28, seed: Math.random() * 100 });
    });
    on('buffPulse', (b) => this.pulses.push({ ...b, t: 0, max: 0.9 }));
  }

  /** Draws a pack-2 projectile; returns false for kinds it doesn't own. */
  drawProjectile(ctx, p, k) {
    const st = STYLE[p.kind];
    if (!st) return false;
    const t = this.r.time;
    const ang = Math.atan2(p.ty - p.sy, p.tx - p.sx);
    const hgt = st.arc ? 4 * st.arc * k * (1 - k) : 0;
    if (st.arc) {
      ctx.fillStyle = 'rgba(20,14,24,0.22)';
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, (st.size ?? 2) * 0.9, (st.size ?? 2) * 0.45, 0, 0, TAU);
      ctx.fill();
    }
    const x = p.x;
    const y = p.y - hgt;
    switch (st.shape) {
      case 'bolt': {
        const c = Math.cos(ang);
        const s = Math.sin(ang);
        ctx.strokeStyle = p.crit ? '#ffe08a' : st.color;
        ctx.lineWidth = st.width * (p.crit ? 1.5 : 1);
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(x - c * st.len, y - s * st.len);
        ctx.lineTo(x, y);
        ctx.stroke();
        if (st.wind) {
          ctx.strokeStyle = 'rgba(233,244,255,0.45)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(x - c * st.len * 1.6 - s * 3, y - s * st.len * 1.6 + c * 3);
          ctx.quadraticCurveTo(x - c * st.len * 0.8, y - s * st.len * 0.8, x - s * 1.5, y + c * 1.5);
          ctx.stroke();
        }
        if (st.star) {
          ctx.fillStyle = '#fff6d8';
          circle(ctx, x, y, 1.4);
          ctx.fill();
        }
        return true;
      }
      case 'needle': {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(ang);
        ctx.strokeStyle = st.color;
        ctx.lineWidth = st.width;
        ctx.beginPath();
        ctx.moveTo(-st.len, 0);
        ctx.lineTo(0, 0);
        ctx.stroke();
        ctx.fillStyle = '#e9e2d0';
        ctx.beginPath();
        ctx.moveTo(1.6, 0);
        ctx.lineTo(-1, -1.2);
        ctx.lineTo(-1, 1.2);
        ctx.fill();
        ctx.restore();
        return true;
      }
      case 'orb': {
        if (st.trail) {
          ctx.strokeStyle = st.trail;
          ctx.lineWidth = st.size * (st.longTrail ? 1.2 : 0.8);
          ctx.lineCap = 'round';
          const back = st.longTrail ? 16 : 7;
          ctx.globalAlpha = 0.7;
          ctx.beginPath();
          ctx.moveTo(x - Math.cos(ang) * back, y - Math.sin(ang) * back + (st.arc ? 3 : 0));
          ctx.lineTo(x, y);
          ctx.stroke();
          ctx.globalAlpha = 1;
        }
        if (st.ring) {
          ctx.strokeStyle = st.ring;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.ellipse(x, y, st.size * 1.8, st.size * 0.7, t * 3, 0, TAU);
          ctx.stroke();
        }
        ctx.fillStyle = st.color;
        circle(ctx, x, y, st.size);
        ctx.fill();
        if (st.spark && Math.sin(t * 40 + p.sx) > 0.3) {
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 0.8;
          ctx.beginPath();
          ctx.moveTo(x - 2, y - st.size - 1);
          ctx.lineTo(x + 1, y - st.size - 3);
          ctx.stroke();
        }
        return true;
      }
      case 'spin': {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(t * 12 + p.sx);
        ctx.fillStyle = st.color;
        ctx.strokeStyle = st.edge ?? '#111';
        ctx.lineWidth = 0.7;
        ctx.beginPath();
        if (st.leaf) ctx.ellipse(0, 0, st.size * 1.4, st.size * 0.6, 0, 0, TAU);
        else if (st.gold) ctx.ellipse(0, 0, st.size, st.size * Math.abs(Math.cos(t * 14)), 0, 0, TAU);
        else ctx.rect(-st.size, -st.size * 0.8, st.size * 2, st.size * 1.6);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        return true;
      }
      case 'melee': {
        // close combat: a swipe at the target instead of a flying object
        const a2 = Math.atan2(p.ty - p.sy, p.tx - p.sx);
        ctx.strokeStyle = p.crit ? 'rgba(255,224,138,0.95)' : st.color;
        ctx.lineWidth = st.claws ? 1.2 : 2.4;
        ctx.beginPath();
        if (st.claws) {
          for (let i = -1; i <= 1; i++) {
            const ox = Math.cos(a2 + Math.PI / 2) * i * 2.4;
            const oy = Math.sin(a2 + Math.PI / 2) * i * 2.4;
            ctx.moveTo(p.tx - Math.cos(a2) * st.size + ox, p.ty - Math.sin(a2) * st.size + oy);
            ctx.lineTo(p.tx + ox, p.ty + oy);
          }
        } else ctx.arc(p.tx - Math.cos(a2) * 6, p.ty - Math.sin(a2) * 6, st.size, a2 - 1, a2 + 1);
        ctx.stroke();
        return true;
      }
      default:
        return false;
    }
  }

  /** Impact puffs for pack-2 kinds, sized by the hit's weight. Returns false for other kinds. */
  onImpact(p) {
    const col = IMPACT[p.kind];
    if (!col) return false;
    const fx = this.r.fx;
    const w = Math.min(1, impactWeight(this.game, p.damage, p.target));
    if (p.splash > 0) {
      fx.ring(p.x, p.y, p.splash * 0.25, p.splash, 0.25 + 0.15 * w, col, 1 + w);
      fx.burst(p.x, p.y, Math.round(2 + 6 * w * fx.density), col, { speed: 30 + p.splash, life: 0.35, size: 1.6, glow: false });
    } else if (Math.random() < (0.35 + 0.5 * w) * fx.density) {
      fx.burst(p.x, p.y, p.crit ? 4 : 2, col, { speed: 40, life: 0.22, size: 1.4, glow: false });
    }
    if (p.crit) fx.ring(p.x, p.y, 2, 12 + 6 * w, 0.25, '#ffe9a8', 1.6);
    if (p.kind === 'coinshot') fx.burst(p.x, p.y - 2, 2, '#f2c14a', { speed: 30, life: 0.4, size: 1.3, glow: false, gravity: 80 });
    return true;
  }

  /** Ability zones on the ground. Returns false for hazards it doesn't own. */
  drawHazard(ctx, h, t) {
    const life = Math.min(1, h.ttl / h.max, (h.max - h.ttl) * 4 + 0.2);
    switch (h.kind) {
      case 'roots': {
        // root field: dark soil ring with roots curling in from the edge
        ctx.fillStyle = `rgba(52,36,20,${0.32 * life})`;
        ctx.beginPath();
        ctx.ellipse(h.x, h.y, h.radius, h.radius * 0.75, 0, 0, TAU);
        ctx.fill();
        ctx.strokeStyle = `rgba(110,80,40,${0.85 * life})`;
        ctx.lineWidth = 1.6;
        ctx.lineCap = 'round';
        for (let i = 0; i < 9; i++) {
          const a = (i / 9) * TAU + h.x * 0.01;
          const r0 = h.radius * 0.95;
          const r1 = h.radius * (0.45 + 0.1 * Math.sin(t * 2 + i));
          ctx.beginPath();
          ctx.moveTo(h.x + Math.cos(a) * r0, h.y + Math.sin(a) * r0 * 0.75);
          ctx.quadraticCurveTo(h.x + Math.cos(a + 0.4) * r0 * 0.7, h.y + Math.sin(a + 0.4) * r0 * 0.5, h.x + Math.cos(a + 0.2) * r1, h.y + Math.sin(a + 0.2) * r1 * 0.75);
          ctx.stroke();
        }
        return true;
      }
      case 'overgrowth': {
        ctx.fillStyle = `rgba(60,110,40,${0.3 * life})`;
        ctx.beginPath();
        ctx.ellipse(h.x, h.y, h.radius, h.radius * 0.75, 0, 0, TAU);
        ctx.fill();
        ctx.strokeStyle = `rgba(224,90,122,${0.7 * life})`;
        ctx.lineWidth = 1.2;
        ctx.setLineDash([3, 4]);
        ctx.beginPath();
        ctx.ellipse(h.x, h.y, h.radius, h.radius * 0.75, 0, 0, TAU);
        ctx.stroke();
        ctx.setLineDash([]);
        for (let i = 0; i < 10; i++) {
          const a = (i / 10) * TAU + i;
          const rr = h.radius * (0.2 + 0.7 * ((i * 37) % 10) / 10);
          const px = h.x + Math.cos(a) * rr;
          const py = h.y + Math.sin(a) * rr * 0.75;
          const grow = 2 + 2.5 * Math.abs(Math.sin(t * 2 + i));
          ctx.fillStyle = i % 3 ? `rgba(95,154,58,${0.9 * life})` : `rgba(224,90,122,${0.9 * life})`;
          ctx.beginPath();
          ctx.moveTo(px - 1.2, py);
          ctx.lineTo(px, py - grow * 1.8);
          ctx.lineTo(px + 1.2, py);
          ctx.fill();
        }
        return true;
      }
      case 'storm':
      case 'eyestorm': {
        const eye = h.kind === 'eyestorm';
        ctx.fillStyle = `rgba(40,52,80,${(eye ? 0.28 : 0.22) * life})`;
        ctx.beginPath();
        ctx.ellipse(h.x, h.y, h.radius, h.radius * 0.75, 0, 0, TAU);
        ctx.fill();
        ctx.strokeStyle = `rgba(207,228,255,${0.5 * life})`;
        ctx.lineWidth = 1;
        for (let i = 0; i < 3; i++) {
          const q = ((t * 0.5 + i / 3) % 1) * h.radius;
          ctx.beginPath();
          ctx.ellipse(h.x, h.y, q, q * 0.75, t * 0.6 + i, 0.3, TAU - 0.3);
          ctx.stroke();
        }
        if (!eye && Math.sin(t * 23 + h.x) > 0.92) {
          const bx = h.x + Math.sin(t * 7) * h.radius * 0.6;
          const by = h.y + Math.cos(t * 5) * h.radius * 0.4;
          this.zaps.push({ x: bx, y: by, kind: 'storm', t: 0, max: 0.18, seed: t * 100 });
        }
        if (eye) {
          ctx.fillStyle = `rgba(232,184,58,${0.5 * life})`;
          ctx.beginPath();
          ctx.ellipse(h.x, h.y, 5, 2.6, 0, 0, TAU);
          ctx.fill();
        }
        return true;
      }
      case 'stardust': {
        ctx.fillStyle = `rgba(30,60,90,${0.25 * life})`;
        ctx.beginPath();
        ctx.ellipse(h.x, h.y, h.radius, h.radius * 0.7, 0, 0, TAU);
        ctx.fill();
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * TAU + t * 0.8;
          const rr = h.radius * (0.3 + 0.5 * ((i * 53) % 10) / 10);
          const tw = 0.5 + 0.5 * Math.sin(t * 9 + i * 2);
          ctx.fillStyle = `rgba(191,234,255,${0.85 * life * tw})`;
          ctx.fillRect(h.x + Math.cos(a) * rr - 0.8, h.y + Math.sin(a) * rr * 0.7 - 0.8, 1.6, 1.6);
        }
        return true;
      }
      default:
        return false;
    }
  }

  /** Lines (piercing shots, beams, gears), strikes from the sky and buff pulses. */
  draw(ctx, dt) {
    const t = this.r.time;
    let w = 0;
    for (const l of this.lines) {
      l.t += dt;
      if (l.t >= l.max) continue;
      const k = l.t / l.max;
      const a = 1 - k;
      const dx = l.x1 - l.x0;
      const dy = l.y1 - l.y0;
      switch (l.kind) {
        case 'moonbeam': {
          ctx.strokeStyle = `rgba(200,212,255,${0.35 * a})`;
          ctx.lineWidth = l.width * 2;
          ctx.beginPath();
          ctx.moveTo(l.x0, l.y0);
          ctx.lineTo(l.x1, l.y1);
          ctx.stroke();
          ctx.strokeStyle = `rgba(245,248,255,${0.9 * a})`;
          ctx.lineWidth = 2;
          ctx.stroke();
          break;
        }
        case 'gear': {
          // a spinning gear travelling the line
          const gx = l.x0 + dx * Math.min(1, k * 1.4);
          const gy = l.y0 + dy * Math.min(1, k * 1.4);
          ctx.save();
          ctx.translate(gx, gy);
          ctx.rotate(t * 20);
          ctx.fillStyle = '#c9a24a';
          ctx.strokeStyle = '#3a2a10';
          ctx.lineWidth = 0.8;
          ctx.beginPath();
          for (let i = 0; i < 16; i++) {
            const ang = (i / 16) * TAU;
            const rr = i % 2 ? 4.6 : 6;
            ctx.lineTo(Math.cos(ang) * rr, Math.sin(ang) * rr);
          }
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          ctx.restore();
          ctx.strokeStyle = `rgba(201,162,74,${0.35 * a})`;
          ctx.lineWidth = 1;
          ctx.setLineDash([2, 4]);
          ctx.beginPath();
          ctx.moveTo(l.x0, l.y0);
          ctx.lineTo(gx, gy);
          ctx.stroke();
          ctx.setLineDash([]);
          break;
        }
        default: {
          const col = { gearbolt: '201,207,216', dart: '224,116,46', gale: '207,228,255' }[l.kind] ?? '233,226,208';
          ctx.strokeStyle = `rgba(${col},${0.85 * a})`;
          ctx.lineWidth = l.kind === 'gale' ? 2.6 : 1.6;
          ctx.beginPath();
          ctx.moveTo(l.x0 + dx * k * 0.5, l.y0 + dy * k * 0.5);
          ctx.lineTo(l.x1, l.y1);
          ctx.stroke();
          if (l.kind === 'gale') {
            ctx.strokeStyle = `rgba(233,244,255,${0.4 * a})`;
            ctx.lineWidth = 1;
            const nx = -dy / Math.hypot(dx, dy);
            const ny = dx / Math.hypot(dx, dy);
            for (const s of [-1, 1]) {
              ctx.beginPath();
              ctx.moveTo(l.x0 + nx * 5 * s, l.y0 + ny * 5 * s);
              ctx.quadraticCurveTo(l.x0 + dx * 0.5 + nx * 9 * s, l.y0 + dy * 0.5 + ny * 9 * s, l.x1 + nx * 3 * s, l.y1 + ny * 3 * s);
              ctx.stroke();
            }
          }
        }
      }
      this.lines[w++] = l;
    }
    this.lines.length = w;

    w = 0;
    for (const z of this.zaps) {
      z.t += dt;
      if (z.t >= z.max) continue;
      const a = 1 - z.t / z.max;
      const gold = z.kind === 'zenith';
      ctx.strokeStyle = gold ? `rgba(255,226,140,${a})` : `rgba(225,238,255,${a})`;
      ctx.lineWidth = gold ? 2.2 : 1.6;
      ctx.beginPath();
      let x = z.x + Math.sin(z.seed) * 6;
      let y = z.y - 90;
      ctx.moveTo(x, y);
      for (let i = 1; i <= 6; i++) {
        x = z.x + (i === 6 ? 0 : Math.sin(z.seed + i * 2.3) * 7);
        y = z.y - 90 + i * 15;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
      if (z.t < 0.08) drawGlow(ctx, gold ? '#ffe08a' : '#cfe4ff', z.x, z.y, gold ? 14 : 10, 0.35);
      this.zaps[w++] = z;
    }
    this.zaps.length = w;

    w = 0;
    for (const p of this.pulses) {
      p.t += dt;
      if (p.t >= p.max) continue;
      const k = p.t / p.max;
      // a buff is a rising ring in its own colour (map-wide buffs pulse at the caster)
      const r = Number.isFinite(p.radius) ? p.radius * (0.3 + 0.7 * k) : 30 + 50 * k;
      ctx.strokeStyle = p.color;
      ctx.globalAlpha = 0.8 * (1 - k);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(p.x, p.y + 6, r, r * 0.75, 0, 0, TAU);
      ctx.stroke();
      ctx.lineWidth = 1.4;
      const yy = p.y - 18 - k * 14;
      ctx.beginPath();
      ctx.moveTo(p.x - 4, yy + 3);
      ctx.lineTo(p.x, yy - 1);
      ctx.lineTo(p.x + 4, yy + 3);
      ctx.stroke();
      ctx.globalAlpha = 1;
      this.pulses[w++] = p;
    }
    this.pulses.length = w;
  }
}
