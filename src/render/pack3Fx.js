// Visuals for Circle Pack 3: projectiles, ground zones and the short cinematic
// emphasis of chase abilities. Same rules as everywhere: effects say what
// happened (where the blizzard is, who got frozen, how big the slam was),
// sizes match the real area, and nothing flashes the whole screen.

import { TAU } from '../core/math.js';
import { circle, drawGlow } from './canvas.js';
import { impactWeight } from './impact.js';

/** Projectile looks (same schema as Pack 2's STYLE table). */
export const STYLE3 = {
  // Royal Academy: practice steel and blunt arrows
  trainingsword: { shape: 'melee', color: 'rgba(230,214,180,0.9)', size: 8 },
  spearjab: { shape: 'thrust', color: '#d9d6cc', len: 12 },
  blunt: { shape: 'needle', color: '#b48a5a', len: 8, width: 1.3, tip: '#e6dcc0' },
  rapier: { shape: 'thrust', color: '#f2f6fa', len: 14, thin: true },
  baton: { shape: 'spin', color: '#5a3f2a', edge: '#1a1410', size: 2, stick: true },
  saber: { shape: 'melee', color: 'rgba(255,246,220,0.95)', size: 10 },
  graduate: { shape: 'melee', color: 'rgba(255,224,138,0.95)', size: 15, wide: true },
  // Frostbound Legion: ice and hail
  icespear: { shape: 'thrust', color: '#cfeaff', len: 13 },
  icearrow: { shape: 'needle', color: '#9fc4dc', len: 9, width: 1.3, tip: '#e4f4ff' },
  freezearrow: { shape: 'needle', color: '#e4f4ff', len: 11, width: 1.8, tip: '#ffffff', frost: true },
  frostaxe: { shape: 'melee', color: 'rgba(214,240,255,0.95)', size: 12 },
  frostorb: { shape: 'orb', color: '#dff3ff', trail: 'rgba(160,210,240,0.55)', size: 3, arc: 10, frost: true },
  icesword: { shape: 'melee', color: 'rgba(214,240,255,0.95)', size: 12 },
  hailstone: { shape: 'orb', color: '#f4fbff', trail: 'rgba(170,220,255,0.6)', size: 3.6, arc: 20, frost: true },
  // Arcane Library: pages, runes and the void
  pagebolt: { shape: 'spin', color: '#efe6cc', edge: '#6b5a3a', size: 2.2, page: true },
  rune: { shape: 'orb', color: '#4fd0c0', trail: 'rgba(79,208,192,0.45)', size: 2.4, rune: true },
  spellcut: { shape: 'melee', color: 'rgba(150,255,240,0.9)', size: 9 },
  spellstrike: { shape: 'melee', color: 'rgba(170,255,245,0.98)', size: 14, wide: true },
  arcanebolt: { shape: 'bolt', color: '#7ff0e0', len: 10, width: 1.8, rune: true },
  voidbolt: { shape: 'orb', color: '#2a1440', trail: '#b06eff', size: 2.8, ring: '#d07aff' },
  // Titan Foundry: iron, magma and steel
  ingot: { shape: 'melee', color: 'rgba(240,226,190,0.95)', size: 10, wide: true },
  forgehammer: { shape: 'melee', color: 'rgba(255,190,110,0.95)', size: 13, wide: true },
  magma: { shape: 'orb', color: '#ffb04a', trail: 'rgba(224,116,46,0.7)', size: 4, arc: 22, ember: true },
  steelfist: { shape: 'melee', color: 'rgba(232,236,242,0.95)', size: 14, wide: true },
  titanshell: { shape: 'orb', color: '#3a3634', trail: 'rgba(160,150,140,0.55)', size: 3.4, arc: 8, ember: true },
  rivetburst: { shape: 'bolt', color: '#f2c06a', len: 8, width: 1.6 },
};

export const IMPACT3 = {
  trainingsword: '#e6dcc0', spearjab: '#d9d6cc', blunt: '#b48a5a', rapier: '#f2f6fa', baton: '#b48a5a', saber: '#f2efe6', graduate: '#ffe08a',
  icespear: '#cfeaff', icearrow: '#cfeaff', freezearrow: '#ffffff', frostaxe: '#dff3ff', frostorb: '#bfe6ff', icesword: '#dff3ff', hailstone: '#e4f4ff',
  pagebolt: '#efe6cc', rune: '#4fd0c0', spellcut: '#96fff0', spellstrike: '#aafff5', arcanebolt: '#7ff0e0', voidbolt: '#b06eff',
  ingot: '#d9a54a', forgehammer: '#ffb04a', magma: '#ff9a3a', steelfist: '#d9dee6', titanshell: '#c9b8a0', rivetburst: '#f2c06a',
};

/** Extra drawing for Pack 3 shapes that Pack 2's projectile painter doesn't have. Returns true when drawn. */
export function drawProjectile3(ctx, p, st, x, y, ang, t) {
  if (st.shape === 'thrust') {
    // a spear or rapier thrust: a line punching into the target
    const a2 = Math.atan2(p.ty - p.sy, p.tx - p.sx);
    ctx.strokeStyle = p.crit ? '#ffe08a' : st.color;
    ctx.lineWidth = st.thin ? 1 : 1.8;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(p.tx - Math.cos(a2) * st.len, p.ty - Math.sin(a2) * st.len);
    ctx.lineTo(p.tx + Math.cos(a2) * 2, p.ty + Math.sin(a2) * 2);
    ctx.stroke();
    return true;
  }
  return false;
}

/** Decorations layered on the standard shapes (runes, embers, frost, pages). */
export function decorate3(ctx, p, st, x, y, t) {
  if (st.rune) {
    ctx.strokeStyle = 'rgba(200,255,248,0.9)';
    ctx.lineWidth = 0.8;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(t * 4);
    ctx.beginPath();
    ctx.moveTo(-2, -2);
    ctx.lineTo(2, 2);
    ctx.moveTo(2, -2);
    ctx.lineTo(-2, 2);
    ctx.stroke();
    ctx.restore();
  }
  if (st.ember && Math.random() < 0.25) {
    ctx.fillStyle = 'rgba(255,170,80,0.8)';
    ctx.fillRect(x - 3 + Math.random() * 2, y + 1 + Math.random() * 2, 1, 1);
  }
  if (st.frost) {
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.fillRect(x - 0.6 + Math.sin(t * 30 + p.sx) * 2, y - 0.6 + Math.cos(t * 26 + p.sx) * 2, 1.2, 1.2);
  }
}

export class Pack3Fx {
  constructor(renderer) {
    this.r = renderer;
    this.casts = [];
    this.quakes = [];
  }

  reset() {
    this.casts = [];
    this.quakes = [];
  }

  attach(game, on) {
    this.game = game;
    on('chaseCast', (c) => {
      // a chase ability: its own short, readable emphasis
      this.casts.push({ ...c, t: 0, max: c.kind === 'worldbreak-charge' ? c.duration ?? 2 : 1.2 });
      if (this.casts.length > 12) this.casts.shift();
      const name = { blizzard: 'BLIZZARD', forbidden: 'THE UNWRITTEN CHAPTER', 'worldbreak-charge': 'WORLDBREAK' }[c.kind];
      if (name) this.r.castFx.callout(c.unit.x, c.unit.y - 46, name, c.kind === 'blizzard' ? '#dff3ff' : c.kind === 'forbidden' ? '#e2b8ff' : '#ffb04a');
    });
    on('worldbreak', (w) => {
      this.quakes.push({ x: w.unit.x, y: w.unit.y, t: 0, max: 0.9 });
      this.r.shake(4);
      this.r.fx.ring(w.unit.x, w.unit.y, 10, 260, 0.9, '#ffb04a', 3);
    });
    on('freeze', ({ enemy }) => {
      if (enemy.isBoss) return;
      this.r.fx.ring(enemy.x, enemy.y, 2, enemy.radius * 2, 0.35, '#dff3ff', 1.6);
      this.r.fx.burst(enemy.x, enemy.y, Math.round(3 * this.r.fx.density) + 1, '#e4f4ff', { speed: 40, life: 0.35, size: 1.4, glow: false });
    });
  }

  /** Impact puffs for Pack 3 kinds. Returns false for other kinds. */
  onImpact(p) {
    const col = IMPACT3[p.kind];
    if (!col) return false;
    const fx = this.r.fx;
    const w = Math.min(1, impactWeight(this.game, p.damage, p.target));
    if (p.splash > 0) {
      fx.ring(p.x, p.y, p.splash * 0.25, p.splash, 0.25 + 0.15 * w, col, 1 + w);
      fx.burst(p.x, p.y, Math.round(2 + 6 * w * fx.density), col, { speed: 30 + p.splash, life: 0.35, size: 1.6, glow: false, gravity: p.kind === 'magma' ? 120 : 0 });
      if (p.kind === 'titanshell' || p.kind === 'forgehammer') this.r.decals.push({ x: p.x, y: p.y, r: p.splash * 0.4, t: 0, max: 4, seed: Math.random() * 6 });
    } else if (Math.random() < (0.35 + 0.5 * w) * fx.density) {
      fx.burst(p.x, p.y, p.crit ? 4 : 2, col, { speed: 40, life: 0.22, size: 1.4, glow: false });
    }
    if (p.crit) fx.ring(p.x, p.y, 2, 12 + 6 * w, 0.25, p.kind === 'freezearrow' ? '#dff3ff' : '#ffe9a8', 1.6);
    if ((p.kind === 'graduate' || p.kind === 'spellstrike' || p.kind === 'steelfist') && w > 0.5) this.r.shake(1.2 * w);
    return true;
  }

  /** Ground zones. Returns false for kinds it doesn't own. */
  drawHazard(ctx, h, t) {
    const life = Math.min(1, h.ttl / h.max, (h.max - h.ttl) * 4 + 0.2);
    switch (h.kind) {
      case 'molten': {
        // a cooling pool: bright core, darkening crust at the rim
        ctx.fillStyle = `rgba(40,20,14,${0.45 * life})`;
        ctx.beginPath();
        ctx.ellipse(h.x, h.y, h.radius, h.radius * 0.7, 0, 0, TAU);
        ctx.fill();
        const heat = h.ttl / h.max;
        ctx.fillStyle = `rgba(240,${110 + 60 * heat},40,${0.55 * life * (0.4 + 0.6 * heat)})`;
        ctx.beginPath();
        for (let i = 0; i < 9; i++) {
          const a = (i / 9) * TAU + h.x * 0.05;
          const rr = h.radius * (0.45 + 0.15 * Math.sin(i * 2.1 + h.y)) * (0.6 + 0.4 * heat);
          ctx.lineTo(h.x + Math.cos(a) * rr, h.y + Math.sin(a) * rr * 0.7);
        }
        ctx.closePath();
        ctx.fill();
        if (Math.sin(t * 6 + h.x) > 0.7) {
          ctx.fillStyle = `rgba(255,200,110,${0.8 * life})`;
          circle(ctx, h.x + Math.sin(t * 3 + h.y) * h.radius * 0.3, h.y - 2, 1.2);
          ctx.fill();
        }
        return true;
      }
      case 'blizzard': {
        // the blizzard's true radius on the ground, snow driving across it
        ctx.fillStyle = `rgba(200,225,245,${0.22 * life})`;
        ctx.beginPath();
        ctx.ellipse(h.x, h.y, h.radius, h.radius * 0.75, 0, 0, TAU);
        ctx.fill();
        ctx.strokeStyle = `rgba(235,246,255,${0.65 * life})`;
        ctx.lineWidth = 1.4;
        ctx.setLineDash([5, 5]);
        ctx.lineDashOffset = -t * 20;
        ctx.beginPath();
        ctx.ellipse(h.x, h.y, h.radius, h.radius * 0.75, 0, 0, TAU);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.lineDashOffset = 0;
        const n = Math.round(28 * Math.max(0.35, this.r.fx.density));
        ctx.fillStyle = `rgba(255,255,255,${0.85 * life})`;
        for (let i = 0; i < n; i++) {
          // flakes stream diagonally and wrap inside the circle
          const u = ((i * 0.618 + t * 0.35) % 1) * 2 - 1;
          const v = ((i * 0.377 + t * 0.12) % 1) * 2 - 1;
          if (u * u + v * v > 1) continue;
          ctx.fillRect(h.x + u * h.radius, h.y + v * h.radius * 0.75, 1.6, 1.6);
        }
        return true;
      }
      default:
        return false;
    }
  }

  /** Cinematic emphasis drawn above the actors. Short and local. */
  draw(ctx, dt) {
    let w = 0;
    for (const c of this.casts) {
      c.t += dt;
      if (c.t >= c.max) continue;
      const k = c.t / c.max;
      const u = c.unit;
      if (c.kind === 'worldbreak-charge') {
        // the charge: dust rising off the whole field toward the titan
        ctx.strokeStyle = `rgba(255,176,74,${0.25 + 0.5 * k})`;
        ctx.lineWidth = 1.5 + 2 * k;
        ctx.beginPath();
        ctx.ellipse(u.x, u.y + 4, 30 - 20 * k, (30 - 20 * k) * 0.6, 0, 0, TAU);
        ctx.stroke();
        drawGlow(ctx, '#ffb04a', u.x, u.y - 24, 18 + 10 * k, 0.15 + 0.25 * k);
      } else if (c.kind === 'forbidden') {
        // pages of script lifting off the author and spreading out
        ctx.fillStyle = `rgba(239,226,192,${0.9 * (1 - k)})`;
        for (let i = 0; i < 10; i++) {
          const a = (i / 10) * TAU;
          const d = 12 + k * 120;
          ctx.save();
          ctx.translate(u.x + Math.cos(a) * d, u.y - 20 + Math.sin(a) * d * 0.6);
          ctx.rotate(a + k * 4);
          ctx.fillRect(-2.4, -1.8, 4.8, 3.6);
          ctx.restore();
        }
      } else if (c.kind === 'blizzard') {
        ctx.strokeStyle = `rgba(223,243,255,${0.8 * (1 - k)})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(u.x, u.y - 30);
        ctx.quadraticCurveTo((u.x + c.x) / 2, Math.min(u.y, c.y) - 60, c.x, c.y);
        ctx.stroke();
      }
      this.casts[w++] = c;
    }
    this.casts.length = w;
    w = 0;
    for (const q of this.quakes) {
      q.t += dt;
      if (q.t >= q.max) continue;
      const k = q.t / q.max;
      // a single shock ring rolling over the battlefield
      ctx.strokeStyle = `rgba(255,190,110,${0.6 * (1 - k)})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(q.x, q.y, 40 + k * 900, (40 + k * 900) * 0.7, 0, 0, TAU);
      ctx.stroke();
      this.quakes[w++] = q;
    }
    this.quakes.length = w;
  }
}
