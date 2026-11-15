// Boss presentation: what makes each archetype recognisable on the field,
// its telegraphs (a growing warning before every ability), the war-cry stun
// on units, the environment's reaction to a boss arriving, and a short,
// rewarding defeat.

import { TAU } from '../core/math.js';
import { drawGlow, circle } from './canvas.js';

export class BossFx {
  constructor(renderer) {
    this.r = renderer;
    this.reset();
  }

  reset() {
    this.cries = [];
    this.pillars = [];
  }

  attach(game, on) {
    this.game = game;
    on('bossIntro', ({ enemy }) => {
      // the field reacts: birds scatter, the light dims while it lives
      const life = this.r.scene?.lifeLayer;
      if (life && life.level > 0) for (let i = 0; i < 2; i++) life.spawnFlock(1.4);
    });
    on('warCry', (w) => {
      this.cries.push({ x: w.enemy.x, y: w.enemy.y, r: w.radius, t: 0 });
      this.r.shake(1.5);
    });
    on('bossAbility', ({ enemy, kind }) => {
      if (kind === 'phantom') this.r.fx.burst(enemy.x, enemy.y, 10, '#d9e2ff', { speed: 50, life: 0.5, size: 2, glow: false });
      if (kind === 'broodmother') this.r.fx.burst(enemy.x, enemy.y, 8, '#a6c46a', { speed: 60, life: 0.5, size: 2, glow: false, gravity: 120 });
    });
    on('bossDefeated', (e) => {
      // a pillar of light where it fell, coins thrown up, then calm
      this.pillars.push({ x: e.x, y: e.y, t: 0, color: e.bossDef?.color ?? '#ffffff' });
      this.r.fx.burst(e.x, e.y, 18, '#f2d38a', { speed: 120, life: 0.9, size: 2.2, glow: false, gravity: 200 });
    });
  }

  /** Dimming while a boss is on the field (applied under the actors). */
  drawUnder(ctx, W, H) {
    const b = this.game.boss;
    if (!b?.alive) return;
    const k = Math.min(1, b.age / 2);
    ctx.fillStyle = `rgba(14,10,24,${(0.12 * k).toFixed(3)})`;
    ctx.fillRect(0, 0, W, H);
  }

  /** Archetype parts behind the body: plates, egg sacs, banner, veil. */
  drawBossBack(ctx, e, bob, scale, t) {
    const def = e.bossDef;
    if (!def || e.intro < 0.3) return;
    const r = e.radius * scale;
    const x = e.x;
    const y = e.y + bob;
    ctx.save();
    switch (def.id) {
      case 'juggernaut': {
        // riveted shoulder plates and two horns
        ctx.fillStyle = '#7d8189';
        ctx.strokeStyle = '#2a2c30';
        ctx.lineWidth = 1.4;
        for (const s of [-1, 1]) {
          ctx.beginPath();
          ctx.ellipse(x + s * r * 0.92, y - r * 0.15, r * 0.4, r * 0.3, s * 0.4, 0, TAU);
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = '#d9cdb5';
          ctx.beginPath();
          ctx.moveTo(x + s * r * 0.3, y - r * 0.75);
          ctx.quadraticCurveTo(x + s * r * 0.9, y - r * 1.2, x + s * r * 0.75, y - r * 1.45);
          ctx.quadraticCurveTo(x + s * r * 0.6, y - r * 1.05, x + s * r * 0.15, y - r * 0.85);
          ctx.fill();
          ctx.fillStyle = '#7d8189';
        }
        break;
      }
      case 'broodmother': {
        // egg sacs on its back, swelling before they burst
        const swell = e.telegraph ? 1 + 0.35 * (e.telegraph.t / e.telegraph.max) : 1;
        for (let i = 0; i < 4; i++) {
          const a = Math.PI * (1.15 + i * 0.23);
          ctx.fillStyle = i % 2 ? '#b8d47a' : '#9ab85a';
          ctx.strokeStyle = '#3a4a20';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.ellipse(x + Math.cos(a) * r * 0.95, y + Math.sin(a) * r * 0.85, r * 0.24 * swell, r * 0.3 * swell, a, 0, TAU);
          ctx.fill();
          ctx.stroke();
        }
        break;
      }
      case 'warlord': {
        // a war banner on a pole and a spiked crown
        ctx.strokeStyle = '#3a2a1a';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x - r * 0.8, y + r * 0.3);
        ctx.lineTo(x - r * 0.8, y - r * 1.9);
        ctx.stroke();
        ctx.fillStyle = '#9a2f2a';
        const flap = Math.sin(t * 4) * r * 0.08;
        ctx.beginPath();
        ctx.moveTo(x - r * 0.8, y - r * 1.85);
        ctx.lineTo(x - r * 0.05, y - r * 1.7 + flap);
        ctx.lineTo(x - r * 0.25, y - r * 1.45);
        ctx.lineTo(x - r * 0.05, y - r * 1.2 + flap);
        ctx.lineTo(x - r * 0.8, y - r * 1.3);
        ctx.closePath();
        ctx.fill();
        break;
      }
      case 'phantom': {
        // a cold veil trailing behind, and a faint glow while it phases
        ctx.fillStyle = 'rgba(200,214,255,0.25)';
        for (let i = 1; i <= 3; i++) {
          ctx.beginPath();
          ctx.ellipse(x - e.facing * r * 0.5 * i, y + r * 0.1 * i, r * (0.8 - i * 0.15), r * (0.7 - i * 0.12), 0, 0, TAU);
          ctx.fill();
        }
        if (e.invulnerable) drawGlow(ctx, '#dfe8ff', x, y, r * 1.8, 0.45);
        break;
      }
      default:
    }
    ctx.restore();
  }

  /** Archetype parts in front of the body (horns, crown, brace), and the telegraph. */
  drawBoss(ctx, e, bob, scale, t) {
    const def = e.bossDef;
    if (!def) return;
    const r = e.radius * scale;
    const x = e.x;
    const y = e.y + bob;
    ctx.save();
    if (def.id === 'juggernaut' && e.bracedUntil > this.game.time) {
      // braced: the armour glows steel-white in a closed ring
      ctx.strokeStyle = 'rgba(230,236,245,0.9)';
      ctx.lineWidth = 3;
      circle(ctx, x, y, r * 1.25);
      ctx.stroke();
      drawGlow(ctx, '#e6ecf5', x, y, r * 1.6, 0.25);
    } else if (def.id === 'warlord') {
      ctx.fillStyle = '#c9a24a';
      ctx.strokeStyle = '#5a3f1a';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x - r * 0.42, y - r * 0.82);
      for (let i = 0; i < 5; i++) ctx.lineTo(x - r * 0.42 + (i + 0.5) * r * 0.168, i % 2 ? y - r * 0.98 : y - r * 1.25);
      ctx.lineTo(x + r * 0.42, y - r * 0.82);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
    if (e.telegraph) this.drawTelegraph(ctx, e, x, y, r);
    ctx.restore();
  }

  /** A warning that fills as the ability approaches; the war cry shows its real reach. */
  drawTelegraph(ctx, e, x, y, r) {
    const k = e.telegraph.t / e.telegraph.max;
    const col = e.bossDef.color;
    if (e.bossDef.id === 'warlord') {
      const R = e.telegraph.radius;
      ctx.fillStyle = `rgba(224,90,60,${0.08 + 0.12 * k})`;
      ctx.beginPath();
      ctx.ellipse(x, e.y, R, R * 0.75, 0, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = `rgba(224,90,60,${0.5 + 0.4 * k})`;
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.ellipse(x, e.y, R * k, R * k * 0.75, 0, 0, TAU);
      ctx.stroke();
      return;
    }
    // other bosses: a ring closing around them and an exclamation mark
    ctx.strokeStyle = col;
    ctx.globalAlpha = 0.5 + 0.5 * k;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(x, y, r * (1.9 - 0.6 * k), -Math.PI / 2, -Math.PI / 2 + TAU * k);
    ctx.stroke();
    ctx.fillStyle = col;
    ctx.fillRect(x - 1.5, y - r * 1.9 - 9, 3, 7);
    ctx.fillRect(x - 1.5, y - r * 1.9, 3, 3);
    ctx.globalAlpha = 1;
  }

  /** Stars over stunned units, the war-cry shockwave, defeat pillars. */
  drawOver(ctx, dt) {
    const g = this.game;
    for (const u of g.units) {
      if (!(u.stunnedUntil > g.time)) continue;
      ctx.fillStyle = '#f2d38a';
      for (let i = 0; i < 3; i++) {
        const a = g.time * 5 + (i / 3) * TAU;
        circle(ctx, u.x + Math.cos(a) * 7, u.y - 26 + Math.sin(a) * 2.5, 1.5);
        ctx.fill();
      }
    }
    let w = 0;
    for (const c of this.cries) {
      c.t += dt;
      if (c.t > 0.5) continue;
      const k = c.t / 0.5;
      ctx.strokeStyle = `rgba(224,90,60,${0.8 * (1 - k)})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(c.x, c.y, c.r * (0.6 + 0.4 * k), c.r * (0.6 + 0.4 * k) * 0.75, 0, 0, TAU);
      ctx.stroke();
      this.cries[w++] = c;
    }
    this.cries.length = w;
    w = 0;
    for (const p of this.pillars) {
      p.t += dt;
      if (p.t > 1.4) continue;
      const k = p.t / 1.4;
      const a = k < 0.2 ? k / 0.2 : 1 - (k - 0.2) / 0.8;
      const grad = ctx.createLinearGradient(p.x, p.y - 220, p.x, p.y);
      grad.addColorStop(0, 'rgba(255,240,200,0)');
      grad.addColorStop(1, `rgba(255,240,200,${0.45 * a})`);
      ctx.fillStyle = grad;
      ctx.fillRect(p.x - 16, p.y - 220, 32, 220);
      this.pillars[w++] = p;
    }
    this.pillars.length = w;
  }
}
