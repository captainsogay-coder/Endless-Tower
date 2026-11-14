// Artwork for the Wild West, Gambino and Nuclear War units, in the same house
// style as unitArt.js: light from the top-left, flat fills, one dark outline,
// no glow except on things that emit light (marquee bulbs, energy cores).
//
// People share one parametric figure (hat, clothes, weapon, extras) so every
// character keeps the same proportions; machines and buildings have their own
// painters. Nuclear War hardware is deliberately toy-like arcade sci-fi.
//
// Frames: 0 idle · 1 aiming / acting · 2 recoil (the shot itself).

import { circle } from './canvas.js';
import { shade } from '../core/color.js';
import { registerPainter, shadow, limb, legs, torso, levelStripes, muzzleFlash } from './unitArt.js';

// ---------------------------------------------------------------- figure parts

/**
 * Extension points for newer circles: extra hat types, extra hand-held props
 * and layers drawn behind the body (packs, wings, capes, auras). Each is a
 * painter in the same house style; see src/render/pack2Art.js.
 */
export const EXTRA_HATS = {};
export const EXTRA_PROPS = {};
export const EXTRA_BEHIND = {};

function hat(ctx, h, o) {
  if (!h) return;
  const c = h.color;
  ctx.lineWidth = 1.2;
  ctx.strokeStyle = o;
  ctx.fillStyle = c;
  switch (h.type) {
    case 'cowboy': {
      ctx.beginPath();
      ctx.ellipse(0.5, -23.6, 9.6, 2.2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-4.4, -23.8);
      ctx.quadraticCurveTo(-4.6, -30, -1.5, -29.8);
      ctx.lineTo(0.5, -28.6);
      ctx.lineTo(2.5, -29.8);
      ctx.quadraticCurveTo(5.6, -30, 5.4, -23.8);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      if (h.band) {
        ctx.fillStyle = h.band;
        ctx.fillRect(-4.4, -25.6, 9.8, 1.5);
      }
      ctx.fillStyle = shade(c, 0.18);
      ctx.fillRect(-3.4, -29, 2.2, 4.5);
      break;
    }
    case 'bowler':
    case 'fedora': {
      ctx.beginPath();
      ctx.ellipse(0.5, -23.6, h.type === 'fedora' ? 8 : 6.8, 1.7, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      if (h.type === 'bowler') ctx.arc(0.5, -24, 4.8, Math.PI, 0);
      else {
        ctx.moveTo(-4.2, -23.8);
        ctx.lineTo(-3.6, -29);
        ctx.lineTo(0.6, -28);
        ctx.lineTo(4.8, -29);
        ctx.lineTo(5.2, -23.8);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      if (h.band) {
        ctx.fillStyle = h.band;
        ctx.fillRect(-4.2, -25.6, 9.4, 1.4);
      }
      break;
    }
    case 'tophat': {
      ctx.beginPath();
      ctx.ellipse(0.5, -23.6, 7.2, 1.6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.rect(-3.6, -32, 8.2, 8.4);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = h.band ?? '#b7353a';
      ctx.fillRect(-3.6, -26.2, 8.2, 1.6);
      break;
    }
    case 'cap':
    case 'bigcap': {
      const big = h.type === 'bigcap';
      ctx.beginPath();
      ctx.ellipse(0.5, big ? -26.5 : -25, big ? 8.2 : 6.2, big ? 3.2 : 2.2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#1d1b18';
      ctx.beginPath();
      ctx.ellipse(3.2, big ? -23.6 : -23.2, big ? 5 : 4, 1.3, 0.1, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = h.band ?? '#b1923f';
      ctx.fillRect(-4.6, big ? -25 : -24.4, 10.2, big ? 1.8 : 1.3);
      if (h.badge) {
        ctx.fillStyle = h.badge;
        circle(ctx, 1.2, big ? -27 : -25.6, big ? 1.8 : 1.2);
        ctx.fill();
      }
      break;
    }
    case 'helmet': {
      ctx.beginPath();
      ctx.arc(0.3, -21.6, 5.9, Math.PI * 1.02, -0.02);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = shade(c, 0.18);
      ctx.fillRect(-4.2, -26, 3, 2.4);
      break;
    }
    case 'visor': {
      ctx.fillStyle = h.color;
      ctx.beginPath();
      ctx.moveTo(-5, -23.5);
      ctx.lineTo(7.6, -23.2);
      ctx.lineTo(6.6, -21.4);
      ctx.lineTo(-4.6, -22);
      ctx.closePath();
      ctx.globalAlpha = 0.9;
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.stroke();
      break;
    }
    case 'hair': {
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.moveTo(-5.6, -19);
      ctx.quadraticCurveTo(-6.4, -26.5, 0, -26.2);
      ctx.quadraticCurveTo(5.8, -26.6, 5.4, -21.5);
      ctx.lineTo(1.5, -23.2);
      ctx.lineTo(-3.6, -21.8);
      ctx.lineTo(-4.4, -14.5); // long hair falling to the shoulders
      ctx.lineTo(-6.4, -14.8);
      ctx.closePath();
      ctx.fill();
      if (h.flower) {
        ctx.fillStyle = h.flower;
        circle(ctx, -4.2, -24.2, 1.6);
        ctx.fill();
      }
      break;
    }
    case 'messy': {
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.moveTo(-5.5, -20.5);
      ctx.quadraticCurveTo(-6, -26.5, 0, -26);
      ctx.quadraticCurveTo(4.5, -26.8, 5.6, -21.5);
      ctx.lineTo(2.5, -23);
      ctx.lineTo(-0.5, -22.4);
      ctx.lineTo(-3, -23.6);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case 'straw': {
      ctx.beginPath();
      ctx.ellipse(0.5, -23.4, 9, 2.4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(0.5, -25.2, 4.6, 2.6, 0, Math.PI, 0);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = h.band ?? '#a0522d';
      ctx.fillRect(-4, -24.4, 9, 1.1);
      break;
    }
    case 'hood': {
      ctx.beginPath();
      ctx.moveTo(-6, -15.5);
      ctx.quadraticCurveTo(-7.4, -27.5, 0.4, -27);
      ctx.quadraticCurveTo(6.4, -26.4, 6, -19.5);
      ctx.lineTo(4.2, -21.4);
      ctx.quadraticCurveTo(0, -23.2, -3.6, -21);
      ctx.lineTo(-3.6, -15.5);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      break;
    }
    case 'kettle':
    case 'plume':
    case 'coif':
    case 'greathelm': {
      if (h.type === 'coif') {
        // chainmail coif around the face
        ctx.beginPath();
        ctx.moveTo(-5.8, -15.6);
        ctx.quadraticCurveTo(-7, -27, 0.4, -26.6);
        ctx.quadraticCurveTo(6.6, -26.4, 6, -19.4);
        ctx.lineTo(4.6, -22);
        ctx.quadraticCurveTo(0.4, -23.6, -3.6, -21.6);
        ctx.lineTo(-3.8, -15.6);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,0.18)';
        for (let i = 0; i < 4; i++) ctx.fillRect(-5 + i * 1.6, -24 + (i % 2), 0.8, 0.8);
        break;
      }
      if (h.type === 'greathelm') {
        ctx.beginPath();
        ctx.roundRect(-5.4, -26.4, 11, 11, 2.2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#16161a';
        ctx.fillRect(-0.4, -21.6, 5.8, 1.1); // visor slit
        ctx.fillStyle = shade(c, 0.2);
        ctx.fillRect(-4.6, -25.6, 2.4, 9);
      } else {
        ctx.beginPath();
        ctx.arc(0.3, -21.4, 5.8, Math.PI * 1.02, -0.02);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        if (h.type === 'kettle') {
          ctx.beginPath();
          ctx.ellipse(0.3, -21.6, 8, 1.6, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }
      }
      if (h.plume) {
        ctx.fillStyle = h.plume;
        ctx.beginPath();
        ctx.moveTo(-0.5, -26.6);
        ctx.quadraticCurveTo(-6, -33, -8.5, -27.5);
        ctx.quadraticCurveTo(-4.5, -29, -1.5, -25.5);
        ctx.closePath();
        ctx.fill();
      }
      if (h.crown) {
        ctx.fillStyle = h.crown;
        ctx.beginPath();
        ctx.moveTo(-3.5, -26.4);
        for (let i = 0; i < 5; i++) ctx.lineTo(-3.5 + i * 1.9 + 0.95, i % 2 ? -27.4 : -29.4);
        ctx.lineTo(4.8, -26.4);
        ctx.closePath();
        ctx.fill();
      }
      break;
    }
    case 'goggles': {
      // messy hair with brass goggles pushed up
      ctx.fillStyle = h.hair ?? '#5a4636';
      ctx.beginPath();
      ctx.moveTo(-5.5, -20.5);
      ctx.quadraticCurveTo(-6, -26.5, 0, -26);
      ctx.quadraticCurveTo(4.5, -26.8, 5.6, -21.5);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#3a2f25';
      ctx.fillRect(-5.4, -23.6, 11, 1.4);
      for (const gx of [0.4, 3.4]) {
        ctx.fillStyle = '#c9a24a';
        circle(ctx, gx, -23.4, 1.7);
        ctx.fill();
        ctx.fillStyle = '#9fd0e8';
        circle(ctx, gx, -23.4, 1);
        ctx.fill();
      }
      break;
    }
    default:
      EXTRA_HATS[h.type]?.(ctx, h, o);
  }
}

function face(ctx, f, o) {
  ctx.lineWidth = 1.4;
  ctx.strokeStyle = o;
  ctx.fillStyle = f.skin;
  circle(ctx, 0, -20, 5.2);
  ctx.fill();
  ctx.stroke();
  const ex = f.extras ?? [];
  if (ex.includes('mask')) {
    // bandana over the lower face
    ctx.fillStyle = f.maskColor ?? '#b7353a';
    ctx.beginPath();
    ctx.moveTo(-4.8, -19.4);
    ctx.lineTo(5.2, -19.6);
    ctx.lineTo(4.4, -16.4);
    ctx.lineTo(0.6, -15);
    ctx.lineTo(-4.4, -16.6);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    circle(ctx, 1.2, -17.6, 0.5);
    ctx.fill();
  }
  if (ex.includes('shades')) {
    ctx.fillStyle = '#121214';
    ctx.fillRect(0.2, -21.2, 5.2, 1.9);
  } else {
    ctx.fillStyle = o;
    const squint = ex.includes('squint');
    if (squint) {
      ctx.fillRect(0.8, -20, 1.6, 0.6);
      ctx.fillRect(3.1, -20, 1.6, 0.6);
    } else {
      circle(ctx, 1.5, -19.6, 0.7);
      ctx.fill();
      circle(ctx, 3.8, -19.6, 0.7);
      ctx.fill();
    }
  }
  if (ex.includes('mustache')) {
    ctx.fillStyle = f.hairColor ?? '#3a2618';
    ctx.beginPath();
    ctx.moveTo(0.4, -17.6);
    ctx.quadraticCurveTo(2.8, -18.8, 5.4, -17.4);
    ctx.quadraticCurveTo(3, -16.6, 0.4, -17.6);
    ctx.fill();
  }
  if (ex.includes('beard')) {
    ctx.fillStyle = f.hairColor ?? '#5a4636';
    ctx.beginPath();
    ctx.moveTo(-3.6, -18);
    ctx.quadraticCurveTo(0.6, -12.6, 5, -17.6);
    ctx.lineTo(4.2, -16.6);
    ctx.quadraticCurveTo(0.6, -14.6, -2.6, -17.2);
    ctx.closePath();
    ctx.fill();
  }
  if (ex.includes('stubble')) {
    ctx.fillStyle = 'rgba(60,45,40,0.45)';
    ctx.beginPath();
    ctx.ellipse(1.8, -16.8, 3.4, 1.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#d97a7a'; // red nose
    circle(ctx, 5, -18.6, 1.1);
    ctx.fill();
  }
  if (ex.includes('cigar')) {
    ctx.fillStyle = '#6b4a2c';
    ctx.fillRect(4.2, -17.2, 3.6, 1.2);
    ctx.fillStyle = '#e0742e';
    ctx.fillRect(7.6, -17.2, 0.8, 1.2);
  }
  if (ex.includes('smile')) {
    ctx.strokeStyle = o;
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.arc(2.8, -18, 1.6, 0.2, Math.PI - 0.2);
    ctx.stroke();
  }
}

/** Weapon/prop in the leading hand. `aim` raises it to the target. */
function prop(ctx, f, frame, o) {
  const aim = frame >= 1;
  const w = f.weapon;
  const arm = f.sleeve ?? f.top;
  const hand = f.skin;
  // back arm
  limb(ctx, -4.8, -12.8, -6, -7.6, arm, o, 2.3);
  ctx.fillStyle = hand;
  circle(ctx, -6.1, -7.2, 1.1);
  ctx.fill();
  if (f.shield) {
    // round or heater shield on the back arm
    ctx.fillStyle = f.shield;
    ctx.strokeStyle = o;
    ctx.lineWidth = 1;
    ctx.beginPath();
    if (f.shieldShape === 'heater') {
      ctx.moveTo(-10, -14);
      ctx.lineTo(-3.6, -14);
      ctx.lineTo(-3.8, -9);
      ctx.quadraticCurveTo(-5, -5, -6.8, -4);
      ctx.quadraticCurveTo(-9, -5, -10, -9);
      ctx.closePath();
    } else circle(ctx, -6.6, -10, 4);
    ctx.fill();
    ctx.stroke();
    if (f.shieldMark) {
      ctx.fillStyle = f.shieldMark;
      ctx.fillRect(-7.4, -12.5, 1.6, 6);
      ctx.fillRect(-9, -10.4, 4.8, 1.6);
    }
  }
  const hx = aim ? 8 : 5.6;
  const hy = aim ? -13.4 : -8.2;
  const draw = () => {
    switch (w) {
      case 'revolver':
      case 'pistol': {
        ctx.save();
        ctx.translate(hx, hy);
        ctx.rotate(aim ? (frame === 2 ? -0.35 : 0) : 1.1);
        ctx.fillStyle = f.gunColor ?? '#2b2a2e';
        ctx.fillRect(-0.6, -1.2, w === 'revolver' ? 6.2 : 5, 1.9);
        ctx.fillStyle = f.grip ?? '#6b4a2c';
        ctx.fillRect(-1, -0.2, 1.8, 3);
        if (w === 'revolver') {
          ctx.fillStyle = '#4a4850';
          ctx.fillRect(0.8, -1.6, 2, 2.6);
        }
        ctx.restore();
        if (frame === 2) muzzleFlash(ctx, hx + 7, hy - 0.6, 2.2);
        break;
      }
      case 'rifle': {
        ctx.save();
        ctx.translate(aim ? 1 : 2, aim ? -13.2 : -10.4);
        ctx.rotate(aim ? (frame === 2 ? -0.12 : 0) : 0.45);
        ctx.fillStyle = f.grip ?? '#6b4a2c';
        ctx.fillRect(-4, -1, 5, 2.4);
        ctx.fillStyle = f.gunColor ?? '#2b2a2e';
        ctx.fillRect(0, -1.1, 13, 1.8);
        ctx.restore();
        if (frame === 2) muzzleFlash(ctx, 15, -13.4, 2.4);
        break;
      }
      case 'smg': {
        ctx.save();
        ctx.translate(1.5, aim ? -12.8 : -10.4);
        ctx.rotate(aim ? 0 : 0.35);
        ctx.fillStyle = f.gunColor ?? '#1f2022';
        ctx.fillRect(-2, -1.2, 11, 2.4);
        ctx.fillRect(2, 1, 1.8, 3.2);
        ctx.restore();
        if (frame === 2) muzzleFlash(ctx, 11.5, -12.8, 2);
        break;
      }
      case 'bottle': {
        const bx = aim ? 6.5 : 6;
        const by = aim ? -21 : -9;
        ctx.fillStyle = '#3f7a46';
        ctx.strokeStyle = o;
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.roundRect(bx - 1.4, by - 3, 2.8, 5.6, 1);
        ctx.fill();
        ctx.stroke();
        ctx.fillRect(bx - 0.6, by - 4.8, 1.2, 2);
        break;
      }
      case 'cards': {
        ctx.save();
        ctx.translate(hx, hy - 1);
        for (let i = 0; i < 3; i++) {
          ctx.save();
          ctx.rotate(-0.5 + i * 0.35);
          ctx.fillStyle = '#f4efe6';
          ctx.strokeStyle = o;
          ctx.lineWidth = 0.6;
          ctx.fillRect(-1.3, -4.4, 2.6, 3.8);
          ctx.strokeRect(-1.3, -4.4, 2.6, 3.8);
          ctx.fillStyle = i === 1 ? '#c4392b' : '#1d1b1a';
          ctx.fillRect(-0.5, -3.2, 1, 1);
          ctx.restore();
        }
        ctx.restore();
        break;
      }
      case 'chips': {
        for (let i = 0; i < 3; i++) {
          ctx.fillStyle = ['#b7353a', '#2f5fa8', '#e9c45a'][i];
          ctx.strokeStyle = o;
          ctx.lineWidth = 0.5;
          ctx.beginPath();
          ctx.ellipse(hx + 0.6, hy - 1 - i * 1.3, 2.2, 0.9, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }
        break;
      }
      case 'baton': {
        ctx.strokeStyle = '#2a2016';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(hx - 1, hy + 1);
        ctx.lineTo(hx + (aim ? 4 : 2), hy - (aim ? 6 : 4));
        ctx.stroke();
        ctx.fillStyle = '#d6b048';
        circle(ctx, hx + (aim ? 4 : 2), hy - (aim ? 6 : 4), 0.9);
        ctx.fill();
        break;
      }
      case 'radio': {
        ctx.fillStyle = '#3a3f2e';
        ctx.fillRect(hx - 1, hy - 3, 2.4, 4.4);
        ctx.strokeStyle = '#1d1b18';
        ctx.lineWidth = 0.7;
        ctx.beginPath();
        ctx.moveTo(hx + 0.6, hy - 3);
        ctx.lineTo(hx + 1.6, hy - 7);
        ctx.stroke();
        break;
      }
      // ---------------- medieval gear (Village Militia, Town Guard, Siege Workshop)
      case 'pitchfork':
      case 'spear':
      case 'halberd': {
        // a long pole: held upright at rest, levelled forward (and pushed further on the thrust frame)
        const push = frame === 2 ? 4 : 0;
        ctx.save();
        ctx.translate(hx + push, hy);
        ctx.rotate(aim ? 0 : -1.2);
        ctx.strokeStyle = '#6b4a2c';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(-7, 0);
        ctx.lineTo(w === 'pitchfork' ? 9 : 12, 0);
        ctx.stroke();
        ctx.fillStyle = '#b9b6ad';
        ctx.strokeStyle = '#4a4850';
        ctx.lineWidth = 0.7;
        if (w === 'pitchfork') {
          ctx.beginPath();
          for (const t of [-1.6, 0, 1.6]) {
            ctx.moveTo(9, t);
            ctx.lineTo(13, t);
          }
          ctx.moveTo(9, -1.6);
          ctx.lineTo(9, 1.6);
          ctx.stroke();
        } else if (w === 'spear') {
          ctx.beginPath();
          ctx.moveTo(12, -1.4);
          ctx.lineTo(16, 0);
          ctx.lineTo(12, 1.4);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        } else {
          // halberd: spike, axe blade, back hook
          ctx.beginPath();
          ctx.moveTo(12, -0.8);
          ctx.lineTo(16, 0);
          ctx.lineTo(12, 0.8);
          ctx.closePath();
          ctx.fill();
          ctx.beginPath();
          ctx.moveTo(9.5, 0);
          ctx.quadraticCurveTo(12.5, -4.5, 11.5, -5);
          ctx.lineTo(9.5, -3.5);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          ctx.fillRect(10, 0.5, 1, 2.5);
        }
        ctx.restore();
        break;
      }
      case 'sword':
      case 'greatsword':
      case 'dualswords': {
        // raised for the wind-up (frame 1), swung forward on the strike (frame 2)
        const big = w === 'greatsword';
        const ang = frame === 1 ? -2.2 : frame === 2 ? 0.15 : -0.6;
        ctx.save();
        ctx.translate(hx, hy);
        ctx.rotate(ang);
        ctx.fillStyle = f.blade ?? '#d9d6cc';
        ctx.strokeStyle = '#4a4850';
        ctx.lineWidth = 0.6;
        ctx.beginPath();
        ctx.moveTo(1.5, -0.8 * (big ? 1.4 : 1));
        ctx.lineTo(big ? 14 : 10, 0);
        ctx.lineTo(1.5, 0.8 * (big ? 1.4 : 1));
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = f.hilt ?? '#c9a24a';
        ctx.fillRect(0.6, -2, 1, 4); // crossguard
        ctx.restore();
        if (frame === 2) {
          // the swing: a short pale arc in front
          ctx.strokeStyle = 'rgba(255,248,230,0.75)';
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.arc(hx - 2, hy - 2, big ? 13 : 10, -1.2, 0.5);
          ctx.stroke();
        }
        if (w === 'dualswords') {
          ctx.fillStyle = '#d9d6cc';
          ctx.save();
          ctx.translate(-6.4, -7.4);
          ctx.rotate(frame === 2 ? -0.4 : 0.9);
          ctx.fillRect(0, -0.6, 7, 1.2);
          ctx.restore();
        }
        break;
      }
      case 'sling': {
        ctx.strokeStyle = '#8a6a4a';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        if (frame === 1) {
          // whirling over the head
          ctx.moveTo(hx - 1, hy);
          ctx.lineTo(2, -28);
          ctx.stroke();
          ctx.fillStyle = '#8d877c';
          circle(ctx, 2, -28.5, 1.4);
          ctx.fill();
          ctx.strokeStyle = 'rgba(255,255,255,0.35)';
          ctx.beginPath();
          ctx.ellipse(1, -26, 6, 2, 0, 0, Math.PI * 2);
          ctx.stroke();
        } else {
          ctx.moveTo(hx, hy);
          ctx.lineTo(hx + 1, hy + (frame === 2 ? -4 : 5));
          ctx.stroke();
          if (frame !== 2) {
            ctx.fillStyle = '#8d877c';
            circle(ctx, hx + 1, hy + 5.5, 1.3);
            ctx.fill();
          }
        }
        break;
      }
      case 'bow': {
        const bx = aim ? 8.5 : 6;
        const by = aim ? -14 : -10;
        ctx.strokeStyle = '#6b4a2c';
        ctx.lineWidth = 1.3;
        ctx.beginPath();
        ctx.arc(bx - 3, by, 7, -1.1, 1.1);
        ctx.stroke();
        ctx.strokeStyle = '#e6e1d6';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        const pull = frame === 1 ? -3 : 0;
        ctx.moveTo(bx - 3 + 7 * Math.cos(-1.1), by + 7 * Math.sin(-1.1));
        ctx.lineTo(bx - 1 + pull, by);
        ctx.lineTo(bx - 3 + 7 * Math.cos(1.1), by + 7 * Math.sin(1.1));
        ctx.stroke();
        if (frame === 1) {
          ctx.strokeStyle = '#4a3a2a';
          ctx.lineWidth = 0.8;
          ctx.beginPath();
          ctx.moveTo(bx - 4, by);
          ctx.lineTo(bx + 6, by);
          ctx.stroke();
        }
        break;
      }
      case 'crossbow': {
        ctx.save();
        ctx.translate(aim ? 2 : 2.5, aim ? -13.2 : -10.5);
        ctx.rotate(aim ? 0 : 0.35);
        ctx.fillStyle = '#6b4a2c';
        ctx.fillRect(-3, -0.9, 12, 1.8);
        ctx.strokeStyle = '#3a3d42';
        ctx.lineWidth = 1.1;
        ctx.beginPath();
        ctx.moveTo(8, -4);
        ctx.quadraticCurveTo(10, 0, 8, 4);
        ctx.stroke();
        ctx.strokeStyle = '#e6e1d6';
        ctx.lineWidth = 0.4;
        ctx.beginPath();
        ctx.moveTo(8, -4);
        ctx.lineTo(frame === 2 ? 8.5 : 5, 0);
        ctx.lineTo(8, 4);
        ctx.stroke();
        ctx.restore();
        break;
      }
      case 'bomb': {
        const bx = frame === 1 ? 6 : hx + 0.5;
        const by = frame === 1 ? -21 : hy - 1.5;
        if (frame !== 2) {
          ctx.fillStyle = '#26272b';
          circle(ctx, bx, by, 2.4);
          ctx.fill();
          ctx.strokeStyle = '#8a6a4a';
          ctx.lineWidth = 0.6;
          ctx.beginPath();
          ctx.moveTo(bx + 1.2, by - 1.8);
          ctx.lineTo(bx + 2.4, by - 3.4);
          ctx.stroke();
          ctx.fillStyle = '#ffb04a';
          circle(ctx, bx + 2.5, by - 3.6, 0.7);
          ctx.fill();
        }
        break;
      }
      case 'wrench':
      case 'scroll': {
        if (w === 'wrench') {
          ctx.save();
          ctx.translate(hx, hy);
          ctx.rotate(aim ? -0.8 : 0.9);
          ctx.fillStyle = '#9aa1aa';
          ctx.fillRect(0, -0.6, 6, 1.2);
          ctx.beginPath();
          ctx.arc(6.5, 0, 1.6, 0.6, Math.PI * 2 - 0.6);
          ctx.fill();
          ctx.restore();
        } else {
          ctx.fillStyle = '#e8dcc0';
          ctx.strokeStyle = '#6b521c';
          ctx.lineWidth = 0.5;
          ctx.fillRect(hx - 1, hy - 4, 2.4, 6);
          ctx.strokeRect(hx - 1, hy - 4, 2.4, 6);
        }
        break;
      }
      default:
        EXTRA_PROPS[w]?.(ctx, f, frame, o, hx, hy, aim);
    }
  };
  draw();
  // front arm reaching the prop
  limb(ctx, 4.8, -12.8, hx - (aim ? 1 : 0.4), hy + (aim ? 0.4 : 0), arm, o, 2.3);
  ctx.fillStyle = hand;
  circle(ctx, hx - 0.6, hy + 0.2, 1.1);
  ctx.fill();
  if (f.dual && w === 'revolver') {
    // a second revolver in the back hand
    ctx.fillStyle = f.gunColor ?? '#2b2a2e';
    ctx.fillRect(-7, -8.2, 1.9, 5);
  }
}

/** One parametric character. All people in the three circles use it. */
export function figure(f) {
  return (ctx, { frame = 0, facing = 1, level = 0 } = {}) => {
    const o = f.outline ?? '#1a1612';
    shadow(ctx, f.wide ? 8.5 : 7.5);
    ctx.save();
    ctx.scale(facing, 1);
    if (f.scale) {
      ctx.scale(f.scale, f.scale);
    }
    if (f.behind) EXTRA_BEHIND[f.behind]?.(ctx, f, o, frame);
    // legs (a dress hides most of them)
    if (f.dress) {
      limb(ctx, -2, -6, -2.4, -1, f.skin, o, 1.8);
      limb(ctx, 2, -6, 2.6, -1, f.skin, o, 1.8);
      ctx.fillStyle = f.boots ?? '#1d1b1a';
      ctx.fillRect(-3.8, -1.4, 3, 1.8);
      ctx.fillRect(1.4, -1.4, 3, 1.8);
    } else legs(ctx, f.pants, f.boots ?? '#1d1b1a', o, f.wide ? 0.6 : 0);
    // long coat tails behind the legs
    if (f.coat?.long) {
      ctx.fillStyle = f.coat.color;
      ctx.strokeStyle = o;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(-5.6, -8);
      ctx.lineTo(-6.6, -2.4);
      ctx.lineTo(-1.2, -3.6);
      ctx.lineTo(1.2, -3.6);
      ctx.lineTo(6.6, -2.4);
      ctx.lineTo(5.6, -8);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
    if (f.dress) {
      ctx.fillStyle = f.top;
      ctx.strokeStyle = o;
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.moveTo(-4.6, -15);
      ctx.quadraticCurveTo(0, -16.2, 4.6, -15);
      ctx.lineTo(4, -10);
      ctx.lineTo(7.4, -4.6);
      ctx.quadraticCurveTo(0, -2.6, -7.4, -4.6);
      ctx.lineTo(-4, -10);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      for (let i = 0; i < 6; i++) ctx.fillRect(-5 + i * 2, -5.6 + (i % 2), 0.9, 0.9); // sequins
    } else torso(ctx, f.top, o, f.wide ? 0.8 : 0);
    // vest / coat front / poncho
    if (f.vest) {
      ctx.fillStyle = f.vest;
      ctx.beginPath();
      ctx.moveTo(-5.4, -14.4);
      ctx.lineTo(-0.8, -14.6);
      ctx.lineTo(-0.4, -6.4);
      ctx.lineTo(-5, -6.6);
      ctx.closePath();
      ctx.moveTo(5.4, -14.4);
      ctx.lineTo(1.6, -14.6);
      ctx.lineTo(1.4, -6.4);
      ctx.lineTo(5, -6.6);
      ctx.closePath();
      ctx.fill();
    }
    if (f.coat) {
      ctx.fillStyle = f.coat.color;
      ctx.beginPath();
      ctx.moveTo(-5.9, -14.8);
      ctx.lineTo(-1.6, -15);
      ctx.lineTo(-1.2, -5.6);
      ctx.lineTo(-5.6, -5.8);
      ctx.closePath();
      ctx.moveTo(5.9, -14.8);
      ctx.lineTo(2.4, -15);
      ctx.lineTo(2.2, -5.6);
      ctx.lineTo(5.6, -5.8);
      ctx.closePath();
      ctx.fill();
    }
    if (f.poncho) {
      ctx.fillStyle = f.poncho;
      ctx.strokeStyle = o;
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.moveTo(-6.6, -14.4);
      ctx.lineTo(6.6, -14.4);
      ctx.lineTo(4.2, -9);
      ctx.lineTo(-4.2, -9);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = shade(f.poncho, -0.3);
      ctx.fillRect(-5, -11.6, 10, 1);
    }
    if (f.sash) {
      ctx.strokeStyle = f.sash;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(-4.8, -14.4);
      ctx.lineTo(4.4, -6.8);
      ctx.stroke();
    }
    if (f.belt) {
      ctx.fillStyle = f.belt;
      ctx.fillRect(-5.4, -7.6, 10.8, 1.5);
      ctx.fillStyle = '#d6b048';
      ctx.fillRect(-0.8, -7.8, 1.8, 1.9);
    }
    if (f.bandolier) {
      ctx.strokeStyle = '#5c4026';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(5, -14.6);
      ctx.lineTo(-4.6, -7.4);
      ctx.stroke();
      ctx.fillStyle = '#c9a24a';
      for (let i = 0; i < 4; i++) ctx.fillRect(2.6 - i * 2.4, -12.8 + i * 1.8, 1, 1.4);
    }
    if (f.bowtie) {
      ctx.fillStyle = f.bowtie;
      ctx.beginPath();
      ctx.moveTo(-1.6, -15.6);
      ctx.lineTo(1.4, -14.4);
      ctx.lineTo(1.4, -15.6);
      ctx.lineTo(-1.6, -14.4);
      ctx.closePath();
      ctx.fill();
    }
    if (f.badge) {
      // star badge on the chest
      ctx.fillStyle = '#e8c255';
      ctx.strokeStyle = '#6b521c';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const a = -Math.PI / 2 + (i / 10) * Math.PI * 2;
        const r = i % 2 ? 0.9 : 2.1;
        ctx.lineTo(-3 + Math.cos(a) * r, -11.6 + Math.sin(a) * r);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
    if (f.medals) {
      const cols = ['#d6b048', '#b7353a', '#2f5fa8', '#d6b048', '#3f8a5a', '#e9e2d0'];
      for (let i = 0; i < f.medals; i++) {
        ctx.fillStyle = cols[i % cols.length];
        ctx.fillRect(-4.6 + (i % 3) * 1.8, -13.2 + Math.floor(i / 3) * 2.1, 1.4, 1.6);
      }
    }
    if (f.scarf) {
      ctx.fillStyle = f.scarf;
      ctx.fillRect(-4, -15.8, 8, 1.8);
      ctx.fillRect(-4.4, -15, 1.8, 4);
    }
    prop(ctx, f, frame, o);
    face(ctx, f, o);
    hat(ctx, f.hat, o);
    ctx.restore();
    levelStripes(ctx, level);
  };
}

// ---------------------------------------------------------------- people

const WEST = { outline: '#1d1610' };

const PEOPLE = {
  gambler: { ...WEST, skin: '#e2b08a', top: '#e9e2d0', vest: '#7a2a2a', pants: '#3d3a46', boots: '#2a1d14', bowtie: '#1d1b1a', hat: { type: 'bowler', color: '#2b2622', band: '#b7353a' }, weapon: 'revolver', gunColor: '#c9c3b6', extras: ['mustache', 'smile'], hairColor: '#2b1d14' },
  bandit: { ...WEST, skin: '#c99a74', top: '#6b5a44', pants: '#4a3f33', boots: '#2a1d14', hat: { type: 'cowboy', color: '#3b2f25' }, weapon: 'revolver', extras: ['mask', 'squint'], maskColor: '#b7353a', scarf: null },
  outlaw: { ...WEST, skin: '#d4a07a', top: '#7a5a3a', poncho: '#a2643a', pants: '#4b3b2c', boots: '#2a1d14', hat: { type: 'cowboy', color: '#5a4030', band: '#2a1d14' }, weapon: 'revolver', extras: ['beard', 'squint'], hairColor: '#3a2618' },
  bountyHunter: { ...WEST, skin: '#c48f69', top: '#4f4636', coat: { color: '#7d6a4c', long: true }, pants: '#3d3528', boots: '#24190f', hat: { type: 'cowboy', color: '#6b5636', band: '#2a1d14' }, weapon: 'rifle', bandolier: true, extras: ['stubble-none', 'squint'] },
  gunslinger: { ...WEST, skin: '#e0ad86', top: '#2b2a33', vest: '#151418', pants: '#2b2a33', boots: '#141210', hat: { type: 'cowboy', color: '#1a1a1d', band: '#b9b2a4' }, weapon: 'revolver', dual: true, belt: '#3b2a1a', extras: ['squint'] },
  sheriff: { ...WEST, skin: '#e0ad86', top: '#c9b48a', vest: '#5c4430', pants: '#4a3f33', boots: '#2a1d14', hat: { type: 'cowboy', color: '#e8dcc0', band: '#5c4430' }, weapon: 'revolver', badge: true, belt: '#3b2a1a', extras: ['mustache'], hairColor: '#7a6a5a' },
  outlawLeader: { ...WEST, skin: '#c99a74', top: '#3a2f2a', coat: { color: '#5a1f1f', long: true }, pants: '#2b2622', boots: '#1d1610', hat: { type: 'cowboy', color: '#1f1a17', band: '#c9a24a' }, weapon: 'revolver', dual: true, bandolier: true, extras: ['beard', 'cigar', 'squint'], hairColor: '#1f1a17', wide: true },
  fastestHand: { ...WEST, skin: '#e8b892', top: '#f2ecdf', coat: { color: '#2a2a30', long: true }, pants: '#26252b', boots: '#141210', hat: { type: 'cowboy', color: '#f2ecdf', band: '#c9a24a' }, weapon: 'revolver', gunColor: '#e9c45a', grip: '#f2ecdf', dual: true, belt: '#3b2a1a', scarf: '#b7353a', extras: ['squint'] },
  // GAMBINO
  drunkard: { outline: '#1a1614', skin: '#e6b48f', top: '#9a8e6a', pants: '#4b4a52', boots: '#2a2622', hat: { type: 'messy', color: '#5a4636' }, weapon: 'bottle', extras: ['stubble'] },
  dealer: { outline: '#151614', skin: '#e2b08a', top: '#f2ecdf', vest: '#1f3b2c', pants: '#1d1d22', bowtie: '#b7353a', hat: { type: 'visor', color: '#3c9a5a' }, sleeve: '#f2ecdf', weapon: 'cards', extras: ['smile'] },
  nightDancer: { outline: '#1d1222', skin: '#e9b896', top: '#b03a8a', dress: true, boots: '#2a1424', hat: { type: 'hair', color: '#2a1810', flower: '#ff9cf0' }, sleeve: '#e9b896', weapon: 'none', extras: ['smile'] },
  desperateGambler: { outline: '#1a1614', skin: '#d9a47c', top: '#8a8370', vest: '#4a453a', pants: '#3a3833', boots: '#24211d', hat: { type: 'fedora', color: '#55504a', band: '#2a2622' }, weapon: 'revolver', extras: ['stubble-none', 'squint', 'cigar'] },
  pitBoss: { outline: '#121214', skin: '#d9a47c', top: '#1d1d22', coat: { color: '#2b2b33' }, pants: '#1d1d22', boots: '#111', bowtie: '#d6b048', hat: { type: 'fedora', color: '#1d1d22', band: '#d6b048' }, weapon: 'chips', extras: ['shades', 'cigar'], wide: true },
  highRoller: { outline: '#141214', skin: '#e8b892', top: '#f2ecdf', coat: { color: '#5a1f2a', long: true }, pants: '#1d1b20', boots: '#111', bowtie: '#d6b048', hat: { type: 'tophat', color: '#1a181c', band: '#d6b048' }, weapon: 'chips', extras: ['mustache', 'smile'] },
  // NUCLEAR WAR
  battalion: { outline: '#151710', skin: '#d9a47c', top: '#4f5a36', vest: '#3a4229', pants: '#3f4730', boots: '#1d1b18', hat: { type: 'helmet', color: '#56603a' }, weapon: 'radio', extras: [] },
  miniSoldier: { outline: '#151710', skin: '#d9a47c', top: '#5d6a3b', pants: '#424b2a', boots: '#1d1b18', hat: { type: 'helmet', color: '#5f6b3c' }, weapon: 'smg', extras: [], scale: 0.86 },
  marshal: { outline: '#121309', skin: '#e0aa82', top: '#4a5233', coat: { color: '#3c4329', long: true }, pants: '#3c4329', boots: '#141210', hat: { type: 'cap', color: '#4a5233', band: '#d6b048', badge: '#d6b048' }, weapon: 'baton', medals: 4, sash: '#b7353a', extras: ['mustache'], hairColor: '#8a8070' },
  gloriousLeader: { outline: '#120f0c', skin: '#e6b48f', top: '#5c5a3c', coat: { color: '#4a4830', long: true }, pants: '#4a4830', boots: '#141210', hat: { type: 'bigcap', color: '#5c5a3c', band: '#b7353a', badge: '#d6b048' }, weapon: 'baton', medals: 9, sash: '#d6b048', extras: ['smile'], wide: true },
};

// ---------------------------------------------------------------- machines & buildings

function outlineRect(ctx, x, y, w, h, fill, o, r = 1) {
  ctx.fillStyle = fill;
  ctx.strokeStyle = o;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fill();
  ctx.stroke();
}

function wheels(ctx, xs, y, o) {
  for (const x of xs) {
    ctx.fillStyle = '#1f1f22';
    circle(ctx, x, y, 2.6);
    ctx.fill();
    ctx.fillStyle = '#6b6b70';
    circle(ctx, x, y, 1);
    ctx.fill();
  }
  void o;
}

/** THE HOUSE: a small casino with a marquee, a neon sign and a roulette crown. Bulbs chase (frames 0/1/2). */
function theHouse(ctx, { frame = 0, level = 0 } = {}) {
  const o = '#120d10';
  shadow(ctx, 18);
  // body
  outlineRect(ctx, -17, -24, 34, 25, '#5a1f2a', o, 1.5);
  ctx.fillStyle = shade('#5a1f2a', 0.14);
  ctx.fillRect(-16, -23, 10, 23);
  // columns
  ctx.fillStyle = '#d9c8a0';
  for (const x of [-14, -6, 4, 12]) ctx.fillRect(x, -16, 2.4, 16);
  // doors
  outlineRect(ctx, -4, -9, 8, 10, '#1d1a1e', o, 0.5);
  ctx.fillStyle = '#d6b048';
  ctx.fillRect(-0.4, -9, 0.8, 10);
  // marquee with chasing bulbs
  outlineRect(ctx, -19, -19, 38, 4, '#d6b048', o, 1);
  for (let i = 0; i < 9; i++) {
    const on = (i + frame) % 3 === 0;
    ctx.fillStyle = on ? '#fff3c4' : '#8a6a2a';
    circle(ctx, -16 + i * 4, -17, 1);
    ctx.fill();
  }
  // sign
  outlineRect(ctx, -11, -31, 22, 7, '#1d1a1e', o, 1);
  ctx.fillStyle = frame === 1 ? '#ff7ab8' : '#ff4f9a';
  ctx.font = '700 6px "Barlow Condensed", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('HOUSE', 0, -25.6);
  // roulette crown on the roof
  ctx.save();
  ctx.translate(13, -27);
  ctx.rotate(frame * 0.7);
  ctx.fillStyle = '#1d1a1e';
  circle(ctx, 0, 0, 4.2);
  ctx.fill();
  for (let i = 0; i < 8; i++) {
    ctx.fillStyle = i % 2 ? '#b7353a' : '#1d1b1a';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, 3.6, (i / 8) * Math.PI * 2, ((i + 1) / 8) * Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#d6b048';
  circle(ctx, 0, 0, 1.2);
  ctx.fill();
  ctx.restore();
  levelStripes(ctx, level);
}

/** Missile Launcher: a stubby truck with a tilting six-tube pod. Frame 2: a tube flashes. */
function missileLauncher(ctx, { frame = 0, facing = 1, level = 0 } = {}) {
  const o = '#151710';
  shadow(ctx, 13);
  ctx.save();
  ctx.scale(facing, 1);
  outlineRect(ctx, -13, -9, 20, 7, '#5d6a3b', o);
  outlineRect(ctx, 6, -12, 8, 10, '#6b7944', o);
  ctx.fillStyle = '#9fd0e8';
  ctx.fillRect(9.5, -10.5, 3, 3);
  wheels(ctx, [-9, -2, 10], -1.5, o);
  ctx.save();
  ctx.translate(-4, -10);
  ctx.rotate(frame >= 1 ? -0.6 : -0.35);
  outlineRect(ctx, -6, -6, 15, 8, '#4a5232', o);
  for (let r = 0; r < 2; r++) {
    for (let c = 0; c < 3; c++) {
      ctx.fillStyle = frame === 2 && r === 0 && c === 1 ? '#ffcf6a' : '#1d1f16';
      circle(ctx, 9, -3.6 + r * 3.4 + c * 0, 1.2);
      ctx.fill();
      ctx.fillStyle = '#c4392b';
      ctx.fillRect(-5 + c * 4, -5 + r * 3.4, 2.4, 1.2);
    }
  }
  ctx.restore();
  ctx.restore();
  levelStripes(ctx, level);
}

/** ICBM: an open silo with the missile standing ready. Frame 1: hatch opening glow; 2: launch flame. */
function icbm(ctx, { frame = 0, level = 0 } = {}) {
  const o = '#17181a';
  shadow(ctx, 14);
  ctx.fillStyle = '#6f6c66';
  ctx.strokeStyle = o;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.ellipse(0, -2, 14, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#1a1b1d';
  ctx.beginPath();
  ctx.ellipse(0, -2.5, 7.5, 3.2, 0, 0, Math.PI * 2);
  ctx.fill();
  // hazard ring
  ctx.strokeStyle = '#d9a12a';
  ctx.lineWidth = 1.2;
  ctx.setLineDash([2, 2]);
  ctx.beginPath();
  ctx.ellipse(0, -2, 11, 4.6, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  // missile
  const lift = frame === 2 ? 2 : 0;
  outlineRect(ctx, -2.8, -30 - lift, 5.6, 27, '#e6e1d6', o, 2);
  ctx.fillStyle = '#c4392b';
  ctx.beginPath();
  ctx.moveTo(-2.8, -26 - lift);
  ctx.quadraticCurveTo(0, -34 - lift, 2.8, -26 - lift);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#2f5fa8';
  ctx.fillRect(-2.8, -18 - lift, 5.6, 1.6);
  ctx.fillStyle = '#c4392b';
  ctx.fillRect(-5, -8 - lift, 2.4, 5);
  ctx.fillRect(2.6, -8 - lift, 2.4, 5);
  if (frame >= 1) {
    ctx.fillStyle = frame === 2 ? '#ffcf6a' : 'rgba(255,207,106,0.45)';
    ctx.beginPath();
    ctx.ellipse(0, -2.5, 6, 2.6, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  levelStripes(ctx, level);
}

/** Airfield pad with a parked plane, seen from above at an angle. `wing` = B-2 flying wing. */
function airfield(wing) {
  return (ctx, { frame = 0, level = 0 } = {}) => {
    const o = '#15161a';
    shadow(ctx, 15);
    // pad
    ctx.fillStyle = '#5b5a55';
    ctx.strokeStyle = o;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.roundRect(-17, -10, 34, 12, 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#e9e2d0';
    for (let i = 0; i < 4; i++) ctx.fillRect(-14 + i * 8, -4.5, 4, 1);
    // control mast
    outlineRect(ctx, 12, -22, 3, 13, '#7a776f', o, 0.5);
    ctx.fillStyle = frame === 1 ? '#ff5a4a' : '#7a1f1f';
    circle(ctx, 13.5, -23, 1.6);
    ctx.fill();
    // plane
    ctx.save();
    ctx.translate(-2, -9 - (frame === 2 ? 4 : 0));
    ctx.scale(1, 0.6);
    if (wing) {
      ctx.fillStyle = '#3a3f47';
      ctx.beginPath();
      ctx.moveTo(0, -12);
      ctx.lineTo(16, 6);
      ctx.lineTo(12, 8);
      ctx.lineTo(8, 5);
      ctx.lineTo(4, 8);
      ctx.lineTo(0, 5);
      ctx.lineTo(-4, 8);
      ctx.lineTo(-8, 5);
      ctx.lineTo(-12, 8);
      ctx.lineTo(-16, 6);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = o;
      ctx.stroke();
      ctx.fillStyle = '#596170';
      ctx.beginPath();
      ctx.moveTo(0, -10);
      ctx.lineTo(7, 2);
      ctx.lineTo(0, 2);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#9fd0e8';
      ctx.fillRect(-1.5, -6, 3, 2.4);
    } else {
      ctx.fillStyle = '#7b8467';
      ctx.strokeStyle = o;
      ctx.beginPath();
      ctx.roundRect(-2.4, -14, 4.8, 26, 2);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-2, -2);
      ctx.lineTo(-17, 2);
      ctx.lineTo(-17, 5);
      ctx.lineTo(-2, 3);
      ctx.moveTo(2, -2);
      ctx.lineTo(17, 2);
      ctx.lineTo(17, 5);
      ctx.lineTo(2, 3);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-1, 9);
      ctx.lineTo(-7, 12);
      ctx.lineTo(7, 12);
      ctx.lineTo(1, 9);
      ctx.fill();
      ctx.fillStyle = '#4c533f';
      for (const x of [-12, -7, 7, 12]) ctx.fillRect(x - 1.2, 0, 2.4, 3.4);
      ctx.fillStyle = '#9fd0e8';
      ctx.fillRect(-1.2, -12, 2.4, 2.4);
    }
    ctx.restore();
    levelStripes(ctx, level);
  };
}

/** Nuclear Warhead (arcade): a striped warhead on a launch rail with an atom emblem. */
function nuclearWarhead(ctx, { frame = 0, level = 0 } = {}) {
  const o = '#17150f';
  shadow(ctx, 15);
  outlineRect(ctx, -15, -6, 30, 7, '#55524a', o, 1.5);
  ctx.fillStyle = '#d9a12a';
  for (let i = 0; i < 7; i++) ctx.fillRect(-14 + i * 4.2, -5, 2, 5);
  // rail
  ctx.strokeStyle = '#3a3830';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-10, -6);
  ctx.lineTo(-4, -22);
  ctx.moveTo(10, -6);
  ctx.lineTo(4, -22);
  ctx.stroke();
  // warhead body (lifts on frame 2)
  const up = frame === 2 ? 3 : 0;
  ctx.save();
  ctx.translate(0, -15 - up);
  ctx.rotate(-0.12);
  outlineRect(ctx, -10, -5, 17, 10, '#f2d34a', o, 4);
  ctx.fillStyle = '#1d1b1a';
  ctx.beginPath();
  ctx.moveTo(7, -5);
  ctx.quadraticCurveTo(14, 0, 7, 5);
  ctx.closePath();
  ctx.fill();
  ctx.fillRect(-12, -6, 3, 12);
  // atom emblem
  ctx.strokeStyle = '#1d1b1a';
  ctx.lineWidth = 0.9;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.ellipse(-1.5, 0, 4, 1.5, (i * Math.PI) / 3, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.fillStyle = frame === 1 ? '#7af0d2' : '#2fb39a';
  circle(ctx, -1.5, 0, 1.2);
  ctx.fill();
  ctx.restore();
  levelStripes(ctx, level);
}

/** Antimatter Warhead (arcade): a containment frame around a swirling violet core (frames rotate the rings). */
function antimatter(ctx, { frame = 0, level = 0 } = {}) {
  const o = '#120e1a';
  shadow(ctx, 14);
  outlineRect(ctx, -13, -5, 26, 6, '#3a3846', o, 1.5);
  // frame posts
  for (const x of [-11, 9]) outlineRect(ctx, x, -28, 2.6, 24, '#5a5868', o, 0.5);
  outlineRect(ctx, -12, -30, 24, 3, '#5a5868', o, 0.5);
  // core
  ctx.fillStyle = 'rgba(120,80,220,0.35)';
  circle(ctx, 0, -16, 9);
  ctx.fill();
  ctx.fillStyle = '#2a1f45';
  circle(ctx, 0, -16, 5.6);
  ctx.fill();
  ctx.fillStyle = frame === 1 ? '#f3e9ff' : '#cdb6ff';
  circle(ctx, 0, -16, 2.6 + (frame === 2 ? 1 : 0));
  ctx.fill();
  ctx.strokeStyle = '#b79cff';
  ctx.lineWidth = 1;
  for (let i = 0; i < 2; i++) {
    ctx.beginPath();
    ctx.ellipse(0, -16, 8, 2.6, frame * 0.6 + i * 1.6, 0, Math.PI * 2);
    ctx.stroke();
  }
  levelStripes(ctx, level);
}

// ---------------------------------------------------------------- animation personalities

export const since = (u, t) => t - (u.lastFire ?? -99);
export const special = (u, t) => t - (u.lastSpecial ?? -99);
export const sway = (u, t, k = 1) => Math.round(Math.sin(t * 1.4 * k + u.uid * 1.3) * 0.8) / 2;

/** Default gunfighter: draws, fires (recoil frame), holsters after a while. */
export const gunfighter = (holdTime = 0.6, draw = 0.06) => (u, t) => {
  const s = since(u, t);
  if (s < draw) return { frame: 2, dx: -0.6 };
  if (s < holdTime || special(u, t) < 0.6) return { frame: 1 };
  return { frame: 0, dy: sway(u, t) };
};

export const ANIM = {
  gambler(u, t) {
    const a = gunfighter(0.4)(u, t);
    // idle: flips a coin now and then (a little hop)
    if (a.frame === 0 && Math.sin(t * 0.8 + u.uid) > 0.93) a.dy = -1;
    return a;
  },
  bandit: gunfighter(0.8),
  outlaw: gunfighter(0.5),
  bountyHunter(u, t) {
    // patient marksman: aims early (anticipation), holds after the shot
    const s = since(u, t);
    if (s < 0.08) return { frame: 2, dx: -1 };
    if (u.hasTarget) return { frame: 1 };
    return { frame: 0, dy: sway(u, t, 0.5) };
  },
  gunslinger: gunfighter(0.35, 0.05),
  sheriff(u, t) {
    if (special(u, t) < 0.12) return { frame: 2, dx: -1.2 };
    return gunfighter(0.6)(u, t);
  },
  outlawLeader(u, t) {
    if (special(u, t) < 0.7) return { frame: 1, dy: -1 }; // whistles the gang in
    return gunfighter(0.6)(u, t);
  },
  fastestHand(u, t) {
    // the draw is invisible: straight from idle to recoil, then back to the holster
    const s = since(u, t);
    if (s < 0.5) return { frame: Math.floor(s / 0.07) % 2 ? 1 : 2, dx: -0.5 };
    if (special(u, t) < 0.15) return { frame: 2, dx: -1.5 };
    return { frame: 0, dy: sway(u, t, 0.4) };
  },
  drunkard(u, t) {
    if (since(u, t) < 0.3) return { frame: 1, dx: 0.5 };
    // wobbles constantly
    return { frame: 0, dx: Math.round(Math.sin(t * 2.3 + u.uid) * 2) / 2, dy: sway(u, t, 2) };
  },
  dealer(u, t) {
    if (since(u, t) < 0.15) return { frame: 1 };
    return { frame: 0, dy: sway(u, t, 0.7) };
  },
  nightDancer(u, t) {
    // always dancing: steps side to side, spins on each attack
    const s = since(u, t);
    return { frame: s < 0.25 ? 1 : 0, flip: s < 0.25 ? Math.floor(s * 16) % 2 === 1 : Math.sin(t * 3 + u.uid) > 0.6, dy: -Math.abs(Math.round(Math.sin(t * 6 + u.uid) * 2)) / 2 };
  },
  desperateGambler(u, t) {
    if (special(u, t) < 0.5) return { frame: 1, dy: -1 };
    return gunfighter(0.4)(u, t);
  },
  pitBoss(u, t) {
    if (since(u, t) < 0.25) return { frame: 1 };
    return { frame: 0 };
  },
  highRoller(u, t) {
    if (special(u, t) < 0.6) return { frame: 1, dy: -1 };
    if (since(u, t) < 0.2) return { frame: 1 };
    return { frame: 0, dy: sway(u, t, 0.6) };
  },
  theHouse(u, t) {
    // the marquee chases faster while the wheel is hot
    const fast = special(u, t) < 3;
    return { frame: Math.floor(t * (fast ? 12 : 4) + u.uid) % 3 };
  },
  missileLauncher(u, t) {
    const s = since(u, t);
    if (s < 0.12) return { frame: 2, dx: -0.8 };
    return { frame: u.hasTarget ? 1 : 0 };
  },
  battalion(u, t) {
    if (since(u, t) < 0.2) return { frame: 1 };
    return { frame: 0, dy: sway(u, t) };
  },
  miniSoldier(u, t) {
    const s = since(u, t);
    if (s < 0.06) return { frame: 2 };
    return { frame: u.hasTarget ? 1 : 0 };
  },
  icbm(u, t) {
    const s = since(u, t);
    if (s < 0.25) return { frame: 2 };
    const ready = u.hasTarget && u.cooldown < 0.8; // the hatch glows before a launch
    return { frame: ready ? 1 : 0 };
  },
  bomber(u, t) {
    const s = since(u, t);
    return { frame: s < 0.6 ? 2 : Math.floor(t * 2) % 2 };
  },
  b2(u, t) {
    const s = since(u, t);
    return { frame: s < 0.6 ? 2 : Math.floor(t * 1.5) % 2 };
  },
  marshal(u, t) {
    if (special(u, t) < 0.8) return { frame: 1, dy: -0.5 };
    if (since(u, t) < 0.15) return { frame: 1 };
    return { frame: 0 };
  },
  gloriousLeader(u, t) {
    // waves to the crowd
    if (special(u, t) < 1) return { frame: 1, dy: -1 };
    return { frame: Math.sin(t * 1.2 + u.uid) > 0.7 ? 1 : 0 };
  },
  nuclearWarhead(u, t) {
    const s = since(u, t);
    if (s < 0.3) return { frame: 2 };
    return { frame: Math.floor(t * 2) % 2 };
  },
  antimatter(u, t) {
    const s = since(u, t);
    if (s < 0.3 || special(u, t) < 1) return { frame: 2 };
    return { frame: Math.floor(t * 3 + u.uid) % 2 };
  },
};

// ---------------------------------------------------------------- registration

for (const [key, f] of Object.entries(PEOPLE)) registerPainter(key, figure(f), ANIM[key]);
registerPainter('theHouse', theHouse, ANIM.theHouse);
registerPainter('missileLauncher', missileLauncher, ANIM.missileLauncher);
registerPainter('icbm', icbm, ANIM.icbm);
registerPainter('bomber', airfield(false), ANIM.bomber);
registerPainter('b2', airfield(true), ANIM.b2);
registerPainter('nuclearWarhead', nuclearWarhead, ANIM.nuclearWarhead);
registerPainter('antimatter', antimatter, ANIM.antimatter);

export const CAST_ART_KEYS = [...Object.keys(PEOPLE), 'theHouse', 'missileLauncher', 'icbm', 'bomber', 'b2', 'nuclearWarhead', 'antimatter'];
