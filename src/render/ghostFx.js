// Visuals for THE GHOST: blades, horse bows and fire arrows, and the chase
// units' signature sequences. Steel is pale and quick, Mongol fire is warm,
// the Ghost is white mist and single clean lines. Every special has its own
// shape so a glance tells you who just acted.

import { WORLD_W, WORLD_H } from '../config.js';
import { drawGlow } from './canvas.js';
import { impactWeight } from './impact.js';

const TAU = Math.PI * 2;

/** Projectile looks (Pack 2 STYLE schema). */
export const STYLE_G = {
  katana: { shape: 'melee', color: 'rgba(240,244,250,0.95)', size: 10 },
  katanaheavy: { shape: 'melee', color: 'rgba(255,240,210,0.98)', size: 13, wide: true },
  heavysaber: { shape: 'melee', color: 'rgba(255,220,190,0.95)', size: 13, wide: true },
  combo: { shape: 'melee', color: 'rgba(230,236,250,0.95)', size: 9 },
  club: { shape: 'melee', color: 'rgba(220,200,170,0.95)', size: 13, wide: true },
  horsebow: { shape: 'needle', color: '#6b4a2c', len: 9, width: 1.2, tip: '#d9d6cc' },
  powershot: { shape: 'needle', color: '#e8c255', len: 12, width: 1.8, tip: '#ffffff' },
  firearrow: { shape: 'needle', color: '#c86a2a', len: 10, width: 1.4, tip: '#ffb04a', ember: true },
  precision: { shape: 'thrust', color: '#fff6d8', len: 16 },
  kunai: { shape: 'needle', color: '#c9cfd8', len: 6, width: 1.2, tip: '#ffffff' },
  kunaivolley: { shape: 'needle', color: '#e9eef5', len: 7, width: 1.4, tip: '#b7353a' },
  turncoat: { shape: 'melee', color: 'rgba(255,200,200,0.95)', size: 11 },
  khanvolley: { shape: 'orb', color: '#5a3a1a', trail: 'rgba(210,170,110,0.6)', size: 2.6, arc: 26, ember: true },
  ghostblade: { shape: 'melee', color: 'rgba(244,248,255,0.98)', size: 11 },
  ghoststance: { shape: 'melee', color: 'rgba(220,232,255,1)', size: 14, wide: true },
};

const IMPACT_G = {
  katana: '#eef2f8', katanaheavy: '#fff0d0', heavysaber: '#ffdcc0', saber: '#f2efe6', combo: '#e6ecfa', club: '#c9b89a',
  horsebow: '#d9d6cc', powershot: '#f2d38a', firearrow: '#ffb04a', precision: '#fff6d8', kunai: '#e9eef5', kunaivolley: '#e9eef5',
  turncoat: '#ffcccc', khanvolley: '#d9b070', ghostblade: '#f4f8ff', ghoststance: '#dfe8ff',
};

export class GhostFx {
  constructor(renderer) {
    this.r = renderer;
    this.reset();
  }

  reset() {
    this.seqs = [];
    this.arrows = [];
  }

  attach(game, on) {
    this.game = game;
    on('chaseCast', (c) => {
      if (!['frenzy', 'flurry', 'lordtechnique', 'skyofarrows', 'ghoststance', 'ghosttechnique'].includes(c.kind)) return;
      this.seqs.push({ ...c, t: 0, max: c.kind === 'skyofarrows' ? 1.6 : c.kind === 'ghoststance' ? 1.1 : c.kind === 'lordtechnique' ? 0.9 : 0.7 });
      const names = { lordtechnique: 'WAY OF THE LORD', skyofarrows: 'SKY OF ARROWS', ghoststance: 'GHOST STANCE', ghosttechnique: 'GHOST TECHNIQUE', flurry: 'TURNCOAT BLADE' };
      if (names[c.kind]) this.r.castFx.callout(c.unit.x, c.unit.y - 48, names[c.kind], c.kind === 'skyofarrows' ? '#ffcf7a' : c.kind.startsWith('ghost') ? '#eef4ff' : c.kind === 'flurry' ? '#ff9a9a' : '#f2d38a');
      if (c.kind === 'skyofarrows' && this.r.flags.intenseFx) {
        // the sky fills with arrows before they fall
        const n = Math.round(90 * Math.max(0.4, this.r.fx.density));
        for (let i = 0; i < n; i++) this.arrows.push({ x: Math.random() * WORLD_W + 120, y: -40 - Math.random() * 200, t: -Math.random() * 0.5, max: 1.6 });
      }
    });
    on('skyofarrows', (s) => {
      for (const p of s.targets) this.r.fx.burst(p.x, p.y, 2, '#d9b070', { speed: 30, life: 0.3, size: 1.4, glow: false });
      this.r.shake(3);
    });
  }

  onImpact(p) {
    const col = IMPACT_G[p.kind];
    if (!col) return false;
    const fx = this.r.fx;
    const w = Math.min(1, impactWeight(this.game, p.damage, p.target));
    if (p.splash > 0) {
      fx.ring(p.x, p.y, p.splash * 0.25, p.splash, 0.25 + 0.15 * w, col, 1 + w);
      fx.burst(p.x, p.y, Math.round(2 + 6 * w * fx.density), col, { speed: 30 + p.splash, life: 0.35, size: 1.6, glow: false });
    } else if (Math.random() < (0.3 + 0.5 * w) * fx.density) {
      // blades leave a short bright spark line, arrows a little dust
      fx.burst(p.x, p.y, p.crit ? 4 : 2, col, { speed: 46, life: 0.18, size: 1.3, glow: false });
    }
    if (p.crit) fx.ring(p.x, p.y, 2, 12 + 6 * w, 0.25, p.kind === 'turncoat' ? '#ff9a9a' : '#fff0c8', 1.6);
    if (p.kind === 'firearrow') this.r.decals.push({ x: p.x, y: p.y, r: 6, t: 0, max: 2, seed: Math.random() * 6 });
    return true;
  }

  /** Signature sequences (above the actors). */
  draw(ctx, dt) {
    let w = 0;
    for (const s of this.seqs) {
      s.t += dt;
      if (s.t >= s.max) continue;
      const k = s.t / s.max;
      const u = s.unit;
      switch (s.kind) {
        case 'ghoststance': {
          // white mist ring collapsing inward onto him, then a still pale aura
          const r = 60 * (1 - k) + 12;
          ctx.strokeStyle = `rgba(232,240,255,${0.7 * (1 - k)})`;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.ellipse(u.x, u.y + 6, r, r * 0.6, 0, 0, TAU);
          ctx.stroke();
          drawGlow(ctx, '#e8eef8', u.x, u.y - 6, 26, 0.3 * (1 - k * 0.5));
          break;
        }
        case 'ghosttechnique': {
          // one straight pale line from him to each victim in turn – the cuts arrive one by one
          const n = s.targets?.length ?? 0;
          for (let i = 0; i < n; i++) {
            const kk = k * 1.4 - i * 0.12;
            if (kk <= 0 || kk >= 1) continue;
            const p = s.targets[i];
            ctx.strokeStyle = `rgba(244,248,255,${(1 - kk) * 0.9})`;
            ctx.lineWidth = 1.8;
            ctx.beginPath();
            ctx.moveTo(u.x, u.y - 10);
            ctx.lineTo(p.x, p.y);
            ctx.stroke();
          }
          break;
        }
        case 'flurry': {
          // five crossing red and white arcs at the target
          for (let i = 0; i < 5; i++) {
            const kk = k * 1.6 - i * 0.12;
            if (kk <= 0 || kk >= 1) continue;
            ctx.strokeStyle = i % 2 ? `rgba(183,53,58,${1 - kk})` : `rgba(250,250,255,${1 - kk})`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(s.x, s.y, 12 + i * 2, -2 + i * 0.9, -0.6 + i * 0.9);
            ctx.stroke();
          }
          break;
        }
        case 'frenzy': {
          ctx.strokeStyle = `rgba(183,53,58,${0.7 * (1 - k)})`;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.ellipse(u.x, u.y + 8, 14 + 16 * k, (14 + 16 * k) * 0.5, 0, 0, TAU);
          ctx.stroke();
          break;
        }
        case 'lordtechnique': {
          // a golden crescent sweeping across the true area, then the cut
          const R = s.radius;
          ctx.strokeStyle = `rgba(232,194,85,${0.85 * (1 - k)})`;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(s.x, s.y, R * (0.6 + 0.4 * k), -Math.PI * 0.9 + k * 2.2, -Math.PI * 0.2 + k * 2.2);
          ctx.stroke();
          ctx.strokeStyle = `rgba(232,194,85,${0.25 * (1 - k)})`;
          ctx.lineWidth = 1;
          ctx.setLineDash([4, 4]);
          ctx.beginPath();
          ctx.ellipse(s.x, s.y, R, R * 0.75, 0, 0, TAU);
          ctx.stroke();
          ctx.setLineDash([]);
          break;
        }
        case 'skyofarrows': {
          // the field darkens under the cloud of arrows; the Khan glows gold
          const a = k < 0.2 ? k / 0.2 : 1 - (k - 0.2) / 0.8;
          ctx.fillStyle = `rgba(20,14,10,${(0.22 * a).toFixed(3)})`;
          ctx.fillRect(0, 0, WORLD_W, WORLD_H);
          drawGlow(ctx, '#ffcf7a', u.x, u.y - 30, 40, 0.35 * a);
          break;
        }
        default:
      }
      this.seqs[w++] = s;
    }
    this.seqs.length = w;
    // the falling arrows of the Khan's volley
    w = 0;
    ctx.strokeStyle = 'rgba(40,28,18,0.85)';
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    for (const a of this.arrows) {
      a.t += dt;
      if (a.t >= a.max) continue;
      if (a.t > 0) {
        a.x -= 260 * dt;
        a.y += 520 * dt;
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(a.x + 5, a.y - 10);
      }
      this.arrows[w++] = a;
    }
    ctx.stroke();
    this.arrows.length = w;
  }
}
