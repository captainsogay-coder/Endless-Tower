// Visuals for the Wild West, Gambino and Nuclear War units: their projectiles,
// bombing flyovers, gravity fields, slowing pulses, coin pop-ups, enemy marks
// (Exposed, Slowed, Bounty) and summoned allies. Kept separate from Renderer so
// the core renderer stays readable; Renderer calls in at a few fixed points.
//
// The Nuclear War hardware is fictional arcade sci-fi: toy-like silhouettes and
// stylised energy bursts.

import { TAU } from '../core/math.js';
import { circle, drawGlow } from './canvas.js';
import { drawUnit } from './unitArt.js';

const BLAST_STYLE = {
  dynamite: { palette: 'hot', max: 0.3 },
  bomb: { palette: null, max: 0.34 },
  barrage: { palette: null, max: 0.4 },
  aftershock: { palette: 'dust', max: 0.45 },
  bankruptcy: { palette: 'gold', max: 0.5 },
  warhead: { palette: 'energy', max: 0.7 },
  antimatter: { palette: 'antimatter', max: 0.7 },
  icbm: { palette: 'hot', max: 0.5 },
  missile: { palette: null, max: 0.28 },
  sequin: { palette: 'pink', max: 0.22 },
  chip: { palette: 'gold', max: 0.22 },
};

export const BLAST_PALETTES = {
  hot: ['#d9432c', '#ffcf6a'],
  dust: ['#9c8a72', '#d8cbb0'],
  gold: ['#d9a12a', '#fff1b8'],
  energy: ['#2fb39a', '#e9fff6'],
  antimatter: ['#7a4fe0', '#f3e9ff'],
  pink: ['#c45cc9', '#ffd9fb'],
};

export class CastFx {
  constructor(renderer) {
    this.r = renderer;
    this.planes = [];
    this.pulses = [];
    this.popups = [];
  }

  reset() {
    this.planes = [];
    this.pulses = [];
    this.popups = [];
  }

  attach(game, on) {
    this.game = game;
    on('blast', (b) => this.blast(b.x, b.y, b.radius, b.kind, b.focus));
    on('flyover', (f) => this.planes.push({ ...f, t: 0 }));
    on('pulse', (p) => this.pulses.push({ ...p, t: 0, max: p.radius === Infinity ? 0.9 : 0.6 }));
    on('bonusCoins', (c) => this.popups.push({ x: c.x, y: c.y, text: `${c.label ? `${c.label} ` : ''}+${c.amount}`, t: 0, big: !!c.label }));
    on('houseWheel', ({ unit, result }) => {
      const label = { jackpot: 'JACKPOT', bankruptcy: 'BANKRUPTCY', doubledown: 'DOUBLE DOWN' }[result];
      this.popups.push({ x: unit.x, y: unit.y - 40, text: label, t: 0, big: true, color: result === 'bankruptcy' ? '#e0584a' : '#f2d38a' });
      this.r.fx.ring(unit.x, unit.y, 6, 60, 0.6, '#f2d38a', 2.5);
    });
    on('houseEdge', (v) => this.popups.push({ x: game.house?.x ?? 0, y: (game.house?.y ?? 0) - 50, text: `House Edge +${Math.round(v * 100)}%`, t: 0, big: true }));
    on('mark', ({ enemy }) => this.r.fx.ring(enemy.x, enemy.y, 4, enemy.radius * 2.4, 0.5, '#e3a33b', 2));
    on('field', (f) => this.r.fx.ring(f.x, f.y, f.radius, 6, 0.8, '#b79cff', 2));
    on('allySpawn', (a) => this.r.fx.burst(a.x, a.y + 6, 4, '#d9cdb5', { speed: 24, life: 0.3, size: 2, glow: false }));
  }

  blast(x, y, radius, kind, focus) {
    const st = BLAST_STYLE[kind] ?? { palette: null, max: 0.32 };
    const r = this.r;
    if (r.blasts.length < 110 || kind === 'warhead' || kind === 'antimatter') {
      r.blasts.push({ x, y, r: radius, t: 0, max: st.max, seed: Math.random() * 6, palette: st.palette });
      if (r.blasts.length > 130) r.blasts.shift();
    }
    r.decals.push({ x, y, r: radius * 0.5, t: 0, max: 5, seed: Math.random() * 6 });
    if (r.decals.length > 140) r.decals.shift();
    const col = { energy: '#9ff5dd', antimatter: '#cdb6ff', gold: '#f2d38a' }[st.palette] ?? '#d8cbb0';
    r.fx.ring(x, y, radius * 0.25, radius * 1.05, 0.4, col, 2);
    if (kind === 'warhead' || kind === 'antimatter' || kind === 'bankruptcy') {
      r.fx.ring(x, y, radius * 0.5, radius * 1.5, 0.8, col, 3);
      r.shake(kind === 'bankruptcy' ? 2 : 3);
    }
    if (focus) r.fx.ring(focus.x, focus.y, 3, 26, 0.5, '#ffffff', 2.5);
  }

  /** Impacts of the new projectile kinds. Returns true when handled. */
  onImpact(p) {
    const d = this.r.fx.density;
    switch (p.kind) {
      case 'revolver':
      case 'golden':
        if (p.crit || p.kind === 'golden') {
          this.r.fx.ring(p.x, p.y, 2, p.kind === 'golden' ? 22 : 12, 0.25, '#ffe9a8', 2);
          this.r.fx.text(p.x, p.y - 10, 'CRIT', '#ffe08a', 9);
        } else if (Math.random() < 0.3 * d) this.r.fx.burst(p.x, p.y, 1, '#f4e3a1', { speed: 50, life: 0.12, size: 1.2, glow: false });
        return true;
      case 'bottle':
        this.r.fx.burst(p.x, p.y, Math.round(3 * d) + 1, '#7fb37a', { speed: 50, life: 0.3, size: 1.4, glow: false, gravity: 120 });
        if (p.stumble) this.r.fx.ring(p.x, p.y, 3, p.splash, 0.35, '#9fd3e8', 1.5);
        return true;
      case 'card':
        if (Math.random() < 0.5 * d) this.r.fx.burst(p.x, p.y, 2, '#f4efe6', { speed: 40, life: 0.25, size: 1.5, glow: false });
        return true;
      case 'dynamite':
        this.blast(p.x, p.y, p.splash, 'dynamite');
        this.r.fx.burst(p.x, p.y, Math.round(6 * d), '#3a332c', { speed: 90, life: 0.5, size: 2, glow: false, gravity: 120 });
        return true;
      case 'sequin':
        this.blast(p.x, p.y, p.splash, 'sequin');
        return true;
      case 'chip':
        if (p.splash > 0) this.blast(p.x, p.y, p.splash, 'chip');
        else if (Math.random() < 0.4 * d) this.r.fx.burst(p.x, p.y, 2, '#e9c45a', { speed: 40, life: 0.25, size: 1.4, glow: false });
        if (p.crit) this.r.fx.ring(p.x, p.y, 2, 16, 0.3, '#f2d38a', 2);
        return true;
      case 'missile':
        this.blast(p.x, p.y, p.splash || 36, 'missile');
        return true;
      case 'icbm':
        this.blast(p.x, p.y, p.splash, 'icbm');
        this.r.shake(1.5);
        return true;
      case 'warhead':
        this.blast(p.x, p.y, p.splash, 'warhead');
        return true;
      case 'antimatter':
        this.blast(p.x, p.y, p.splash, 'antimatter');
        return true;
      // ---- medieval
      case 'slash':
      case 'thrust':
        this.r.fx.burst(p.x, p.y, p.crit ? 4 : 2, '#f2efe6', { speed: 50, life: 0.15, size: 1.3, glow: false });
        if (p.crit) this.r.fx.ring(p.x, p.y, 2, 16, 0.25, '#ffe9a8', 2);
        if (p.splash > 0) this.r.fx.ring(p.x, p.y, 3, p.splash, 0.25, '#e6e1d6', 1.5);
        return true;
      case 'smite':
        this.r.fx.ring(p.x, p.y, 3, 30, 0.4, '#ffe08a', 3);
        this.r.fx.text(p.x, p.y - 12, '5×', '#ffe08a', 11);
        return true;
      case 'stone':
      case 'arrow':
      case 'xbolt':
      case 'ballista':
        if (Math.random() < 0.5 * d) this.r.fx.burst(p.x, p.y, p.kind === 'ballista' ? 4 : 2, '#cbbfa8', { speed: 40, life: 0.25, size: 1.4, glow: false });
        return true;
      case 'boulder':
      case 'trebuchet':
        this.blast(p.x, p.y, p.splash, 'aftershock');
        this.r.fx.burst(p.x, p.y, Math.round((p.kind === 'trebuchet' ? 10 : 6) * d), '#8d877c', { speed: 80, life: 0.5, size: 2.2, glow: false, gravity: 160 });
        if (p.kind === 'trebuchet') this.r.shake(1.2);
        return true;
      case 'bombball':
        this.blast(p.x, p.y, p.splash, 'dynamite');
        return true;
      default:
        return false;
    }
  }

  /** Draws a projectile of one of the new kinds. Returns true when handled. */
  drawProjectile(ctx, p, k) {
    const t = this.r.time;
    switch (p.kind) {
      case 'revolver':
      case 'golden': {
        const dx = p.x - p.px;
        const dy = p.y - p.py;
        const len = Math.hypot(dx, dy) || 1;
        const gold = p.kind === 'golden' || p.crit;
        ctx.strokeStyle = gold ? '#ffd76a' : '#f6e6b8';
        ctx.lineWidth = p.kind === 'golden' ? 2.6 : gold ? 1.8 : 1.2;
        ctx.beginPath();
        ctx.moveTo(p.x - (dx / len) * (p.kind === 'golden' ? 18 : 10), p.y - (dy / len) * (p.kind === 'golden' ? 18 : 10));
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
        if (p.kind === 'golden') drawGlow(ctx, '#ffd76a', p.x, p.y, 8, 0.5);
        return true;
      }
      case 'bottle':
      case 'dynamite': {
        const hgt = 4 * (p.kind === 'dynamite' ? 22 : 14) * k * (1 - k);
        ctx.fillStyle = 'rgba(20,14,24,0.25)';
        ctx.fillRect(p.x - 1.5, p.y - 0.6, 3, 1.2);
        ctx.save();
        ctx.translate(p.x, p.y - hgt);
        ctx.rotate(t * 14 + p.sx);
        if (p.kind === 'bottle') {
          ctx.fillStyle = '#3f7a46';
          ctx.fillRect(-1.2, -3.5, 2.4, 7);
          ctx.fillRect(-0.6, -5, 1.2, 1.8);
        } else {
          ctx.fillStyle = '#c4392b';
          ctx.fillRect(-1.4, -3.8, 2.8, 7.6);
          ctx.fillStyle = '#f2e6c9';
          ctx.fillRect(-1.4, -0.6, 2.8, 1.2);
        }
        ctx.restore();
        if (p.kind === 'dynamite') {
          // fizzing fuse spark
          ctx.fillStyle = Math.sin(t * 50) > 0 ? '#ffe08a' : '#ff8a3a';
          circle(ctx, p.x, p.y - hgt - 5, 1.4);
          ctx.fill();
        }
        return true;
      }
      case 'card': {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(t * 18 + p.sx);
        ctx.fillStyle = '#f4efe6';
        ctx.strokeStyle = '#2a2420';
        ctx.lineWidth = 0.6;
        ctx.fillRect(-2.2, -3, 4.4, 6);
        ctx.strokeRect(-2.2, -3, 4.4, 6);
        ctx.fillStyle = (Math.floor(p.sx) & 1) ? '#c4392b' : '#1d1b1a';
        ctx.fillRect(-0.8, -0.8, 1.6, 1.6);
        ctx.restore();
        return true;
      }
      case 'chip': {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.scale(1, 0.5 + 0.5 * Math.abs(Math.sin(t * 16 + p.sx)));
        ctx.fillStyle = p.crit ? '#f2c14a' : '#b7353a';
        circle(ctx, 0, 0, 3);
        ctx.fill();
        ctx.strokeStyle = '#f4efe6';
        ctx.lineWidth = 1;
        ctx.setLineDash([1.4, 1.4]);
        circle(ctx, 0, 0, 2.2);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
        return true;
      }
      case 'sequin': {
        drawGlow(ctx, '#ff9cf0', p.x, p.y, 7, 0.45);
        ctx.fillStyle = '#ffe3fb';
        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * TAU + t * 6;
          const rr = i % 2 ? 1.2 : 3.4;
          ctx.lineTo(p.x + Math.cos(a) * rr, p.y + Math.sin(a) * rr);
        }
        ctx.closePath();
        ctx.fill();
        return true;
      }
      case 'missile':
      case 'icbm':
      case 'warhead':
      case 'antimatter': {
        const big = p.kind !== 'missile';
        const arc = { missile: 18, icbm: 120, warhead: 140, antimatter: 140 }[p.kind];
        const hgt = 4 * arc * k * (1 - k);
        // ground shadow grows as it comes down
        ctx.fillStyle = `rgba(20,14,24,${0.12 + 0.2 * k})`;
        ctx.beginPath();
        ctx.ellipse(big ? p.tx : p.x, big ? p.ty : p.y, (big ? 10 : 3) * (0.5 + k), (big ? 5 : 1.5) * (0.5 + k), 0, 0, TAU);
        ctx.fill();
        const ang = Math.atan2(p.ty - p.sy, p.tx - p.sx);
        const pitch = (0.5 - k) * (big ? 2.2 : 0.6);
        // smoke trail
        if (Math.random() < 0.7) this.r.fx.particle(p.x - Math.cos(ang) * 6, p.y - hgt - Math.sin(ang) * 6, 0, -6, big ? 0.9 : 0.5, big ? 3.5 : 2, p.kind === 'antimatter' ? '#b9a3f0' : p.kind === 'warhead' ? '#bfe9de' : '#b4ada2', { glow: false, drag: 0.95 });
        ctx.save();
        ctx.translate(p.x, p.y - hgt);
        ctx.rotate(ang - pitch * Math.sign(Math.cos(ang) || 1));
        const L = big ? 9 : 5;
        const body = { missile: '#d9d2c3', icbm: '#e6e1d6', warhead: '#f2d34a', antimatter: '#2a2240' }[p.kind];
        ctx.fillStyle = body;
        ctx.strokeStyle = '#1d1b1a';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(L, 0);
        ctx.lineTo(L * 0.4, -L * 0.28);
        ctx.lineTo(-L, -L * 0.28);
        ctx.lineTo(-L, L * 0.28);
        ctx.lineTo(L * 0.4, L * 0.28);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = p.kind === 'warhead' ? '#1d1b1a' : '#c4392b';
        ctx.fillRect(-L, -L * 0.45, L * 0.35, L * 0.9); // fins
        if (p.kind === 'antimatter') drawGlow(ctx, '#b79cff', 2, 0, 10, 0.7);
        if (p.kind === 'warhead') drawGlow(ctx, '#9ff5dd', 0, 0, 9, 0.35);
        ctx.fillStyle = '#ffcf6a';
        circle(ctx, -L - 1.5, 0, big ? 2.4 : 1.4);
        ctx.fill();
        ctx.restore();
        return true;
      }
      // ---- medieval
      case 'slash':
      case 'thrust':
      case 'smite': {
        // melee: a quick swipe (or thrust line) at the target, no flying object
        const ang = Math.atan2(p.ty - p.sy, p.tx - p.sx);
        ctx.strokeStyle = p.kind === 'smite' || p.crit ? 'rgba(255,224,138,0.95)' : 'rgba(250,246,236,0.85)';
        ctx.lineWidth = p.kind === 'smite' ? 2.6 : 1.6;
        ctx.beginPath();
        if (p.kind === 'thrust') {
          ctx.moveTo(p.tx - Math.cos(ang) * 12, p.ty - Math.sin(ang) * 12);
          ctx.lineTo(p.tx, p.ty);
        } else ctx.arc(p.tx - Math.cos(ang) * 6, p.ty - Math.sin(ang) * 6, p.kind === 'smite' ? 12 : 8, ang - 1.1, ang + 1.1);
        ctx.stroke();
        return true;
      }
      case 'stone': {
        const hgt = 4 * 8 * k * (1 - k);
        ctx.fillStyle = '#8d877c';
        circle(ctx, p.x, p.y - hgt, 1.5);
        ctx.fill();
        return true;
      }
      case 'arrow':
      case 'xbolt':
      case 'ballista': {
        const ang = Math.atan2(p.ty - p.sy, p.tx - p.sx);
        const L = p.kind === 'ballista' ? 14 : p.kind === 'xbolt' ? 7 : 9;
        const hgt = p.kind === 'arrow' ? 4 * 10 * k * (1 - k) : 0;
        ctx.save();
        ctx.translate(p.x, p.y - hgt);
        ctx.rotate(ang + (p.kind === 'arrow' ? (k - 0.5) * 0.6 : 0));
        ctx.strokeStyle = p.kind === 'ballista' ? '#3a2a1a' : '#5a3f2a';
        ctx.lineWidth = p.kind === 'ballista' ? 2 : 1;
        ctx.beginPath();
        ctx.moveTo(-L, 0);
        ctx.lineTo(0, 0);
        ctx.stroke();
        ctx.fillStyle = '#b9b6ad';
        ctx.beginPath();
        ctx.moveTo(0, -1.4);
        ctx.lineTo(p.kind === 'ballista' ? 4 : 2.5, 0);
        ctx.lineTo(0, 1.4);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#e6e1d6';
        ctx.fillRect(-L, -1, 2, 2); // fletching
        ctx.restore();
        return true;
      }
      case 'boulder':
      case 'trebuchet':
      case 'bombball': {
        const big = p.kind === 'trebuchet';
        const arc = big ? 120 : p.kind === 'boulder' ? 50 : 26;
        const hgt = 4 * arc * k * (1 - k);
        ctx.fillStyle = `rgba(20,14,24,${0.12 + 0.2 * k})`;
        ctx.beginPath();
        ctx.ellipse(p.tx, p.ty, (big ? 9 : 4) * (0.5 + k), (big ? 4.5 : 2) * (0.5 + k), 0, 0, TAU);
        ctx.fill();
        ctx.save();
        ctx.translate(p.x, p.y - hgt);
        ctx.rotate(t * 6 + p.sx);
        ctx.fillStyle = p.kind === 'bombball' ? '#26272b' : '#8d877c';
        ctx.strokeStyle = '#3a3530';
        ctx.lineWidth = 0.8;
        circle(ctx, 0, 0, big ? 5 : p.kind === 'boulder' ? 3.4 : 2.4);
        ctx.fill();
        ctx.stroke();
        if (p.kind === 'bombball') {
          ctx.fillStyle = Math.sin(t * 50) > 0 ? '#ffe08a' : '#ff8a3a';
          circle(ctx, 2, -2.2, 1);
          ctx.fill();
        }
        ctx.restore();
        return true;
      }
      default:
        return false;
    }
  }

  /** Under actors: gravity fields and slowing pulses on the ground. */
  drawUnder(ctx, dt) {
    const g = this.game;
    for (const f of g.fields) {
      const k = f.t / f.duration;
      ctx.save();
      ctx.translate(f.x, f.y);
      ctx.fillStyle = `rgba(40,20,70,${0.25 + 0.25 * k})`;
      ctx.beginPath();
      ctx.ellipse(0, 0, f.radius, f.radius * 0.75, 0, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = 'rgba(183,156,255,0.7)';
      ctx.lineWidth = 1.5;
      for (let i = 0; i < 4; i++) {
        const rr = f.radius * (((i / 4 + g.time * 0.8) % 1));
        ctx.globalAlpha = 1 - rr / f.radius;
        ctx.beginPath();
        ctx.ellipse(0, 0, f.radius - rr, (f.radius - rr) * 0.75, 0, 0, TAU);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      drawGlow(ctx, '#b79cff', 0, 0, 16 + 10 * k, 0.6);
      ctx.fillStyle = '#0c0814';
      circle(ctx, 0, 0, 5 + 3 * k);
      ctx.fill();
      ctx.restore();
    }
    let w = 0;
    for (let i = 0; i < this.pulses.length; i++) {
      const p = this.pulses[i];
      p.t += dt;
      if (p.t >= p.max) continue;
      const k = p.t / p.max;
      ctx.strokeStyle = p.color;
      ctx.globalAlpha = 1 - k;
      ctx.lineWidth = 2.5;
      if (p.radius === Infinity) {
        // a decree that reaches everyone: a sweeping band of colour across the map
        ctx.fillStyle = p.color;
        ctx.globalAlpha = 0.12 * (1 - k);
        ctx.fillRect(0, 0, 4000, 4000);
      } else {
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, p.radius * k, p.radius * k * 0.8, 0, 0, TAU);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      this.pulses[w++] = p;
    }
    this.pulses.length = w;
  }

  /** Summoned allies: drawn smaller than real units, fading out at the end of their time. */
  drawAllies(ctx, t) {
    for (const a of this.game.allies) {
      const s = 0.78;
      const born = Math.min(1, (this.game.time - a.bornAt) / 0.25);
      ctx.save();
      ctx.globalAlpha = Math.min(1, a.life / 1.2) * born;
      ctx.translate(a.x, a.y + 9);
      ctx.scale(s * born, s * born);
      ctx.translate(-a.x, -a.y - 9);
      drawUnit(ctx, a, t);
      ctx.restore();
    }
  }

  /** Marks for statuses introduced by the new units. */
  drawEnemyMarks(ctx, e, r, bob, now) {
    const st = e.statuses;
    if (st) {
      if ((st.exposed ?? 0) > now) {
        // Exposed: a cracked amber target ring under the enemy
        ctx.strokeStyle = 'rgba(224,162,58,0.85)';
        ctx.lineWidth = 1.2;
        ctx.setLineDash([2, 2]);
        ctx.beginPath();
        ctx.ellipse(e.x, e.y + r * 0.6, r * 1.1, r * 0.45, 0, 0, TAU);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      if ((st.slowed ?? 0) > now) {
        ctx.strokeStyle = 'rgba(159,211,232,0.9)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(e.x, e.y - r * 0.2 + bob, r * 1.05, Math.PI * 0.15, Math.PI * 0.85);
        ctx.stroke();
      }
      if ((st.charged ?? 0) > now) drawGlow(ctx, '#9ff5dd', e.x, e.y + bob, r * 1.2, 0.25);
    }
    if (e.bounty && e.bounty.until > now) {
      // WANTED: a gold crosshair over the marked enemy
      const cx = e.x;
      const cy = e.y - r * 1.9 + bob - 4;
      ctx.strokeStyle = '#e3a33b';
      ctx.lineWidth = 1.4;
      circle(ctx, cx, cy, 3.4);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx - 5.5, cy);
      ctx.lineTo(cx - 1.5, cy);
      ctx.moveTo(cx + 1.5, cy);
      ctx.lineTo(cx + 5.5, cy);
      ctx.moveTo(cx, cy - 5.5);
      ctx.lineTo(cx, cy - 1.5);
      ctx.moveTo(cx, cy + 1.5);
      ctx.lineTo(cx, cy + 5.5);
      ctx.stroke();
    }
    if (e.gravity && e.gravity.until > now) {
      ctx.strokeStyle = 'rgba(183,156,255,0.6)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(e.x, e.y);
      ctx.lineTo(e.gravity.x, e.gravity.y);
      ctx.stroke();
    }
  }

  /** Above everything: planes on bombing runs and coin pop-ups. */
  drawOver(ctx, dt) {
    let w = 0;
    for (let i = 0; i < this.planes.length; i++) {
      const pl = this.planes[i];
      pl.t += dt;
      if (pl.t >= pl.duration) continue;
      const k = pl.t / pl.duration;
      const x = pl.x0 + (pl.x1 - pl.x0) * k;
      const y = pl.y0 + (pl.y1 - pl.y0) * k;
      const ang = Math.atan2(pl.y1 - pl.y0, pl.x1 - pl.x0);
      // shadow far below, plane above
      this.drawPlane(ctx, x + 18, y + 26, ang, pl.kind, true);
      this.drawPlane(ctx, x, y, ang, pl.kind, false);
      this.planes[w++] = pl;
    }
    this.planes.length = w;
    w = 0;
    ctx.textAlign = 'center';
    for (let i = 0; i < this.popups.length; i++) {
      const p = this.popups[i];
      p.t += dt;
      if (p.t >= 1.4) continue;
      const k = p.t / 1.4;
      ctx.globalAlpha = k < 0.7 ? 1 : 1 - (k - 0.7) / 0.3;
      ctx.font = `700 ${p.big ? 14 : 11}px "Barlow Condensed", sans-serif`;
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(15,12,8,0.85)';
      const yy = p.y - 18 * k;
      ctx.strokeText(p.text, p.x, yy);
      ctx.fillStyle = p.color ?? '#f2d38a';
      ctx.fillText(p.text, p.x, yy);
      this.popups[w++] = p;
    }
    ctx.globalAlpha = 1;
    this.popups.length = w;
    if (this.popups.length > 60) this.popups.splice(0, this.popups.length - 60);
  }

  drawPlane(ctx, x, y, ang, kind, shadow) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(ang);
    const s = kind === 'b2' ? 1.5 : 1.2;
    ctx.scale(s, s);
    if (shadow) {
      ctx.fillStyle = 'rgba(15,12,20,0.22)';
    }
    if (kind === 'b2') {
      // flying wing: one swept silhouette with a saw-tooth trailing edge
      ctx.fillStyle = shadow ? ctx.fillStyle : '#3a3f47';
      ctx.beginPath();
      ctx.moveTo(10, 0);
      ctx.lineTo(-4, -16);
      ctx.lineTo(-7, -12);
      ctx.lineTo(-4, -8);
      ctx.lineTo(-7, -4);
      ctx.lineTo(-4, 0);
      ctx.lineTo(-7, 4);
      ctx.lineTo(-4, 8);
      ctx.lineTo(-7, 12);
      ctx.lineTo(-4, 16);
      ctx.closePath();
      ctx.fill();
      if (!shadow) {
        ctx.fillStyle = '#596170';
        ctx.beginPath();
        ctx.moveTo(8, 0);
        ctx.lineTo(-1, -9);
        ctx.lineTo(-1, 0);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#9fd0e8';
        ctx.fillRect(4, -1, 3, 2);
      }
    } else {
      // bomber: long fuselage, straight wings, four engines
      ctx.fillStyle = shadow ? ctx.fillStyle : '#7b8467';
      ctx.beginPath();
      ctx.roundRect(-12, -2.2, 24, 4.4, 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(2, -2);
      ctx.lineTo(-3, -15);
      ctx.lineTo(-7, -15);
      ctx.lineTo(-4, -2);
      ctx.moveTo(2, 2);
      ctx.lineTo(-3, 15);
      ctx.lineTo(-7, 15);
      ctx.lineTo(-4, 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-9, -1);
      ctx.lineTo(-13, -6);
      ctx.lineTo(-14, -6);
      ctx.lineTo(-12, 0);
      ctx.lineTo(-14, 6);
      ctx.lineTo(-13, 6);
      ctx.lineTo(-9, 1);
      ctx.fill();
      if (!shadow) {
        ctx.fillStyle = '#4c533f';
        for (const yy of [-10, -6, 6, 10]) ctx.fillRect(-2.5, yy - 1, 3, 2);
        ctx.fillStyle = '#9fd0e8';
        ctx.fillRect(9, -1, 2.5, 2);
      }
    }
    ctx.restore();
  }
}
