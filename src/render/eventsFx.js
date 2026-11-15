// Visuals for map events (src/game/mapEvents.js). Each event changes the mood
// of the field for its duration and then lets go. Effects stay off the road
// at gameplay-hiding strength: darkness (Eclipse) and snow (Whiteout) are
// drawn under the actors, everything above them is small or faint.

import { WORLD_W, WORLD_H, TILE } from '../config.js';
import { drawGlow, circle } from './canvas.js';

const TAU = Math.PI * 2;
const rnd = (a, b) => a + Math.random() * (b - a);

export class EventsFx {
  constructor(renderer) {
    this.r = renderer;
    this.reset();
  }

  reset() {
    this.ev = null; // the active event (from the game)
    this.t = 0;
    this.meteors = [];
    this.flashes = [];
    this.fade = 0;
  }

  attach(game, on) {
    this.game = game;
    on('mapEvent', (e) => {
      if (e.phase === 'start') {
        this.ev = e.event;
        this.t = 0;
        if (e.event.def.id === 'migration') this.r.scene.lifeLayer.migration = e.event.def.duration;
      } else if (e.phase === 'end') {
        this.endT = this.t;
      } else if (e.phase === 'trade') {
        const m = this.merchantSpot();
        this.r.fx.ring(m.x, m.y, 4, 30, 0.6, '#f2d38a', 2);
      }
    });
  }

  /** Where the merchant's cart stands: the treasure-style quiet spot nearest the tower. */
  merchantSpot() {
    if (this.ev?.spot) return this.ev.spot;
    const m = this.game.map;
    const tower = m.goal ? { x: m.goal.px, y: m.goal.py } : { x: WORLD_W / 2, y: WORLD_H / 2 };
    let best = null;
    for (let y = 1; y < m.rows - 1; y++) {
      for (let x = 1; x < m.cols - 1; x++) {
        if (m.pathDist[y * m.cols + x] < 3 || m.grid[y * m.cols + x] !== 0 || this.game.unitAt(x, y)) continue;
        const px = x * TILE + 16;
        const py = y * TILE + 16;
        const d = Math.hypot(px - tower.x, py - tower.y);
        if (!best || d < best.d) best = { x: px, y: py, d };
      }
    }
    if (this.ev) this.ev.spot = best ?? { x: 80, y: 80 };
    return this.ev?.spot ?? { x: 80, y: 80 };
  }

  update(dt) {
    const a = this.game?.events?.active;
    if (a && this.ev !== a) {
      this.ev = a;
      this.t = 0;
    }
    if (!a && this.ev) {
      // fade out over a second, then clear
      this.fade = Math.max(0, this.fade - dt);
      if (this.fade <= 0) this.ev = null;
    } else if (a) {
      this.fade = Math.min(1, this.fade + dt / 1.5);
    }
    this.t += dt;
    if (this.ev?.def.id === 'meteor-shower' && a && Math.random() < dt * 2.2 * this.r.q.weather) {
      const x = rnd(-100, WORLD_W - 200);
      this.meteors.push({ x, y: rnd(-80, WORLD_H * 0.3), vx: rnd(380, 520), vy: rnd(220, 320), t: 0, max: rnd(0.8, 1.3), land: Math.random() < 0.4 });
    }
    for (let i = this.meteors.length - 1; i >= 0; i--) {
      const m = this.meteors[i];
      m.t += dt;
      m.x += m.vx * dt;
      m.y += m.vy * dt;
      if (m.t >= m.max) {
        // a harmless glow where it burned out over the field
        if (m.land) this.flashes.push({ x: m.x, y: m.y, t: 0 });
        this.meteors.splice(i, 1);
      }
    }
    for (let i = this.flashes.length - 1; i >= 0; i--) if ((this.flashes[i].t += dt) > 1.2) this.flashes.splice(i, 1);
  }

  /** Under the actors: darkness, ground glows, the cache, the merchant's cart. */
  drawUnder(ctx) {
    const e = this.ev;
    if (!e) return;
    const a = this.fade;
    const id = e.def.id;
    if (id === 'eclipse') {
      // the field goes dark and cold; a thin bright corona at the top of the sky
      const k = Math.min(1, this.t / 4) * a;
      ctx.fillStyle = `rgba(12,10,30,${0.38 * k})`;
      ctx.fillRect(0, 0, WORLD_W, WORLD_H);
    } else if (id === 'whiteout') {
      ctx.fillStyle = `rgba(235,242,250,${0.22 * a})`;
      ctx.fillRect(0, 0, WORLD_W, WORLD_H);
    } else if (id === 'lava-surge') {
      ctx.fillStyle = `rgba(200,70,20,${(0.06 + 0.04 * Math.sin(this.t * 2)) * a})`;
      ctx.fillRect(0, 0, WORLD_W, WORLD_H);
    } else if (id === 'ruins-awaken') {
      for (const d of this.game.map.decor) {
        if (d.kind !== 'runeCircle' && d.kind !== 'monument' && d.kind !== 'pillar' && d.kind !== 'obelisk') continue;
        const p = 0.5 + 0.5 * Math.sin(this.t * 3 + d.seed * 10);
        drawGlow(ctx, '#9fe8ff', d.x, d.y - 6, 26 + d.r, 0.25 * p * a);
      }
    } else if (id === 'verdant-surge') {
      ctx.fillStyle = `rgba(110,170,70,${0.06 * a})`;
      ctx.fillRect(0, 0, WORLD_W, WORLD_H);
    }
    for (const f of this.flashes) {
      const k = f.t / 1.2;
      drawGlow(ctx, '#ffe2a8', f.x, f.y, 40, 0.3 * (1 - k));
    }
    if (id === 'treasure' && e.treasure) this.drawCache(ctx, e);
    if (id === 'merchant' && this.game.events.active === e) this.drawMerchant(ctx, e);
  }

  drawCache(ctx, e) {
    const { x, y } = e.treasure;
    const open = !!e.paid;
    const rise = Math.min(1, this.t / 1.5);
    ctx.save();
    ctx.globalAlpha = this.fade;
    drawGlow(ctx, '#f2d38a', x, y - 4, 26, (open ? 0.45 : 0.25) * (0.7 + 0.3 * Math.sin(this.t * 4)));
    ctx.translate(x, y + (1 - rise) * 6);
    ctx.fillStyle = 'rgba(20,14,10,0.35)';
    ctx.beginPath();
    ctx.ellipse(0, 6, 11, 3.5, 0, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = '#2a1a10';
    ctx.lineWidth = 1;
    ctx.fillStyle = '#7a4a2a';
    ctx.fillRect(-9, -4, 18, 10);
    ctx.strokeRect(-9, -4, 18, 10);
    ctx.fillStyle = '#c9a24a';
    ctx.fillRect(-9, -1, 18, 1.6);
    ctx.fillRect(-1.4, -2, 2.8, 4);
    ctx.fillStyle = '#8a5a32';
    if (open) {
      ctx.beginPath();
      ctx.moveTo(-9, -4);
      ctx.lineTo(-9, -12);
      ctx.lineTo(9, -14);
      ctx.lineTo(9, -4);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#f2d38a';
      for (let i = 0; i < 4; i++) {
        circle(ctx, -5 + i * 3.2, -5 - (i % 2), 1.6);
        ctx.fill();
      }
    } else {
      ctx.beginPath();
      ctx.ellipse(0, -4, 9, 4, 0, Math.PI, 0);
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  }

  drawMerchant(ctx, e) {
    const { x, y } = this.merchantSpot();
    const bob = Math.sin(this.t * 2) * 0.6;
    ctx.save();
    ctx.globalAlpha = this.fade;
    ctx.translate(x, y);
    ctx.fillStyle = 'rgba(20,14,10,0.3)';
    ctx.beginPath();
    ctx.ellipse(0, 9, 18, 4, 0, 0, TAU);
    ctx.fill();
    // cart with a striped awning and a lantern
    ctx.strokeStyle = '#2a1a10';
    ctx.lineWidth = 1;
    ctx.fillStyle = '#8a5a32';
    ctx.fillRect(-14, -2, 24, 9);
    ctx.strokeRect(-14, -2, 24, 9);
    for (const wx of [-9, 6]) {
      ctx.fillStyle = '#3a2a1a';
      circle(ctx, wx, 8, 3.4);
      ctx.fill();
      ctx.fillStyle = '#c9a24a';
      circle(ctx, wx, 8, 1);
      ctx.fill();
    }
    for (let i = 0; i < 6; i++) {
      ctx.fillStyle = i % 2 ? '#e6dcc0' : '#b7353a';
      ctx.beginPath();
      ctx.moveTo(-15 + i * 4.4, -2);
      ctx.lineTo(-13 + i * 4.4, -12 + bob);
      ctx.lineTo(-10.6 + i * 4.4, -12 + bob);
      ctx.lineTo(-10.6 + i * 4.4, -2);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = '#3a2a1a';
    ctx.fillRect(10, -14, 1.2, 14);
    drawGlow(ctx, '#ffd27a', 11, -14, 9, 0.5);
    ctx.fillStyle = '#ffd27a';
    circle(ctx, 11, -14, 1.6);
    ctx.fill();
    // a coin sign while the offer is open
    if (e.offer && !e.offer.taken) {
      ctx.fillStyle = '#f2c14a';
      ctx.strokeStyle = '#6b4a1a';
      circle(ctx, -2, -20 + Math.sin(this.t * 3) * 1.5, 4);
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  }

  /** Above the actors: meteors, drifting snow walls, tailwind lines, surge sparks. Faint. */
  drawOver(ctx) {
    const e = this.ev;
    for (const m of this.meteors) {
      const k = m.t / m.max;
      const len = 46;
      const n = Math.hypot(m.vx, m.vy);
      const tx = m.x - (m.vx / n) * len;
      const ty = m.y - (m.vy / n) * len;
      const g = ctx.createLinearGradient(tx, ty, m.x, m.y);
      g.addColorStop(0, 'rgba(255,220,160,0)');
      g.addColorStop(1, `rgba(255,236,200,${0.85 * (1 - k * 0.6)})`);
      ctx.strokeStyle = g;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(tx, ty);
      ctx.lineTo(m.x, m.y);
      ctx.stroke();
      ctx.fillStyle = '#fff6e0';
      circle(ctx, m.x, m.y, 1.8);
      ctx.fill();
    }
    if (!e) return;
    const a = this.fade;
    const id = e.def.id;
    if (id === 'eclipse') {
      const k = Math.min(1, this.t / 4) * a;
      // the eclipsed sun: a dark disc with a thin corona, high in the sky corner
      const cx = WORLD_W * 0.68;
      const cy = 46;
      drawGlow(ctx, '#ffe9c0', cx, cy, 46, 0.35 * k);
      ctx.fillStyle = `rgba(8,6,16,${0.9 * k})`;
      circle(ctx, cx, cy, 18);
      ctx.fill();
      ctx.strokeStyle = `rgba(255,240,210,${0.7 * k})`;
      ctx.lineWidth = 1.2;
      circle(ctx, cx, cy, 18.5);
      ctx.stroke();
    } else if (id === 'whiteout') {
      ctx.fillStyle = `rgba(255,255,255,${0.5 * a})`;
      for (let i = 0; i < 60; i++) {
        const x = ((i * 97 + this.t * 220) % (WORLD_W + 40)) - 20;
        const y = ((i * 53 + this.t * 60 + Math.sin(i) * 30) % WORLD_H);
        ctx.fillRect(x, y, 2, 1.4);
      }
    } else if (id === 'tailwind') {
      ctx.strokeStyle = `rgba(240,248,255,${0.22 * a})`;
      ctx.lineWidth = 1.2;
      for (let i = 0; i < 14; i++) {
        const x = ((i * 173 + this.t * 300) % (WORLD_W + 300)) - 150;
        const y = (i * 89) % WORLD_H;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.quadraticCurveTo(x + 40, y - 5, x + 90, y);
        ctx.stroke();
      }
    } else if (id === 'power-surge' || id === 'verdant-surge' || id === 'lava-surge') {
      // the army glows faintly at the feet: who is being boosted, at a glance
      const col = { 'power-surge': '#9fe8ff', 'verdant-surge': '#a6e07a', 'lava-surge': '#ffb04a' }[id];
      for (const u of this.game.units) drawGlow(ctx, col, u.x, u.y + 6, 12, 0.18 * a * (0.7 + 0.3 * Math.sin(this.t * 4 + u.uid)));
    }
  }
}
