// Reveal motifs for chase units (Chase Unit Standard → reveal.motif). Each is
// drawn over the summoning circle during the build-up and fades after the
// crate opens: a distinct visual idea per chase unit, in its own two colours.

const TAU = Math.PI * 2;
const clamp01 = (v) => Math.max(0, Math.min(1, v));

/**
 * @param m motif id; colors [main, accent]; p = { cx, cy, R, w, h, t, tLock, tCharge, tDrop, tOpen }
 */
export function drawMotif(ctx, m, [c1, c2], p) {
  const { cx, cy, R, w, h, t, tLock, tCharge, tOpen } = p;
  const k = clamp01((t - tLock * 0.5) / (tCharge - tLock * 0.5)); // build-up progress
  const out = t > tOpen ? clamp01(1 - (t - tOpen) / 1.2) : 1; // fades after the reveal
  if (k <= 0 || out <= 0) return;
  const a = out;
  ctx.save();
  switch (m) {
    case 'banners': {
      // banners unfurl on poles around the circle
      for (let i = 0; i < 6; i++) {
        const ang = (i / 6) * TAU + Math.PI / 6;
        const x = cx + Math.cos(ang) * R * 1.35;
        const y = cy + Math.sin(ang) * R * 0.95;
        ctx.strokeStyle = `rgba(60,40,20,${a})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x, y - R * 0.5);
        ctx.stroke();
        ctx.globalAlpha = a;
        ctx.fillStyle = i % 2 ? c2 : c1;
        const len = R * 0.28 * k;
        ctx.beginPath();
        ctx.moveTo(x, y - R * 0.5);
        ctx.lineTo(x + len, y - R * 0.48 + Math.sin(t * 6 + i) * 3);
        ctx.lineTo(x, y - R * 0.34);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
      break;
    }
    case 'lances': {
      // tournament lances lower one by one toward the centre
      for (let i = 0; i < 8; i++) {
        const kk = clamp01(k * 1.6 - i * 0.08);
        const ang = (i / 8) * TAU;
        ctx.strokeStyle = i % 2 ? c2 : c1;
        ctx.globalAlpha = a;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(ang) * R * 1.6, cy + Math.sin(ang) * R * 1.1);
        ctx.lineTo(cx + Math.cos(ang) * R * (1.6 - 0.7 * kk), cy + Math.sin(ang) * R * (1.1 - 0.5 * kk));
        ctx.stroke();
      }
      break;
    }
    case 'gears': {
      // interlocking gears turning faster as the charge builds
      for (let g = 0; g < 3; g++) {
        const gx = cx + (g - 1) * R * 0.9;
        const gy = cy - R * 1.05;
        const r = R * (g === 1 ? 0.3 : 0.22);
        ctx.save();
        ctx.translate(gx, gy);
        ctx.rotate((g % 2 ? -1 : 1) * t * (1 + k * 6));
        ctx.globalAlpha = a * 0.9;
        ctx.fillStyle = g === 1 ? c2 : c1;
        ctx.beginPath();
        for (let i = 0; i < 20; i++) {
          const ang = (i / 20) * TAU;
          const rr = i % 2 ? r * 0.8 : r;
          ctx.lineTo(Math.cos(ang) * rr, Math.sin(ang) * rr);
        }
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
      break;
    }
    case 'searchlights': {
      // two searchlights sweep and cross over the circle
      for (const s of [-1, 1]) {
        const ang = -Math.PI / 2 + s * (0.6 - 0.6 * k) + Math.sin(t * 2) * 0.1 * (1 - k);
        ctx.fillStyle = `rgba(255,246,214,${0.12 * a})`;
        ctx.beginPath();
        ctx.moveTo(cx + s * w * 0.4, h);
        ctx.lineTo(cx + s * w * 0.4 + Math.cos(ang - 0.08) * h * 1.2, h + Math.sin(ang - 0.08) * h * 1.2);
        ctx.lineTo(cx + s * w * 0.4 + Math.cos(ang + 0.08) * h * 1.2, h + Math.sin(ang + 0.08) * h * 1.2);
        ctx.closePath();
        ctx.fill();
      }
      break;
    }
    case 'coins': {
      // coins rain and pile on the circle
      ctx.fillStyle = c2;
      for (let i = 0; i < 40; i++) {
        const fall = ((t * 1.4 + i * 0.137) % 1) * k;
        const x = cx + Math.sin(i * 12.9) * R * 1.4;
        const y = cy - R * 1.6 + fall * R * 2.4;
        ctx.globalAlpha = a * (1 - fall * 0.5);
        ctx.beginPath();
        ctx.ellipse(x, y, 4, 4 * Math.abs(Math.cos(t * 10 + i)), 0, 0, TAU);
        ctx.fill();
      }
      break;
    }
    case 'leaves': {
      // a spiral of leaves and petals closing on the centre
      for (let i = 0; i < 30; i++) {
        const ang = i * 0.7 + t * 1.5;
        const r = R * (1.5 - k * 1.1) * (0.6 + 0.4 * ((i * 37) % 10) / 10);
        ctx.globalAlpha = a;
        ctx.fillStyle = i % 4 ? c1 : c2;
        ctx.save();
        ctx.translate(cx + Math.cos(ang) * r, cy + Math.sin(ang) * r * 0.7);
        ctx.rotate(ang);
        ctx.beginPath();
        ctx.ellipse(0, 0, 5, 2.4, 0, 0, TAU);
        ctx.fill();
        ctx.restore();
      }
      break;
    }
    case 'storm': {
      // a slow cloud ring; lightning forks into the circle at the climax
      ctx.strokeStyle = c1;
      ctx.globalAlpha = 0.5 * a;
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.ellipse(cx, cy - R * 0.2, R * (1.5 - 0.3 * k), R * 0.5, 0, t, t + 5);
      ctx.stroke();
      if (k > 0.85 && Math.sin(t * 40) > 0) {
        ctx.globalAlpha = a;
        ctx.strokeStyle = c2;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(cx + 30, 0);
        for (let i = 1; i <= 6; i++) ctx.lineTo(cx + Math.sin(i * 7 + t) * 20, (cy / 6) * i);
        ctx.stroke();
      }
      break;
    }
    case 'gravity': {
      // stars stream inward along curving paths into a black point
      for (let i = 0; i < 50; i++) {
        const life = (t * 0.6 + i * 0.13) % 1;
        const ang = i * 2.39 + life * 2;
        const r = R * 1.8 * (1 - life);
        ctx.fillStyle = i % 3 ? c2 : '#ffffff';
        ctx.globalAlpha = a * life;
        ctx.fillRect(cx + Math.cos(ang) * r, cy + Math.sin(ang) * r * 0.7, 2, 2);
      }
      ctx.globalAlpha = a * k;
      ctx.fillStyle = '#05030a';
      ctx.beginPath();
      ctx.arc(cx, cy, R * 0.12 * k, 0, TAU);
      ctx.fill();
      break;
    }
    case 'snow': {
      // a blizzard whirling around the circle, thickening
      ctx.fillStyle = c2;
      for (let i = 0; i < Math.round(70 * k); i++) {
        const ang = i * 0.9 + t * (2 + i % 3);
        const r = R * (0.8 + ((i * 53) % 10) / 12);
        ctx.globalAlpha = a * 0.85;
        ctx.fillRect(cx + Math.cos(ang) * r, cy + Math.sin(ang) * r * 0.6 - R * 0.2, 2.4, 2.4);
      }
      break;
    }
    case 'pages': {
      // torn pages orbit and chains tighten, then snap
      for (let i = 0; i < 16; i++) {
        const ang = i * 0.39 + t * 1.2;
        const r = R * 1.3;
        ctx.save();
        ctx.translate(cx + Math.cos(ang) * r, cy + Math.sin(ang) * r * 0.6);
        ctx.rotate(ang * 2);
        ctx.globalAlpha = a;
        ctx.fillStyle = '#efe2c0';
        ctx.fillRect(-5, -3.5, 10, 7);
        ctx.restore();
      }
      if (k < 1) {
        ctx.strokeStyle = c1;
        ctx.globalAlpha = a * (1 - k);
        ctx.lineWidth = 3;
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        ctx.ellipse(cx, cy, R * 0.9 * (1 - k * 0.5), R * 0.6 * (1 - k * 0.5), 0, 0, TAU);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      ctx.globalAlpha = a * k;
      ctx.fillStyle = c2;
      ctx.beginPath();
      ctx.arc(cx, cy - R * 0.1, R * 0.08, 0, TAU);
      ctx.fill();
      break;
    }
    case 'quake': {
      // the floor cracks outward in molten lines
      ctx.strokeStyle = c1;
      ctx.lineWidth = 3;
      for (let i = 0; i < 9; i++) {
        const ang = (i / 9) * TAU + i;
        const len = R * 1.6 * k;
        ctx.globalAlpha = a;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        for (let s = 1; s <= 4; s++) ctx.lineTo(cx + Math.cos(ang + Math.sin(s * 3 + i) * 0.2) * len * (s / 4), cy + Math.sin(ang + Math.sin(s * 3 + i) * 0.2) * len * 0.7 * (s / 4));
        ctx.stroke();
      }
      break;
    }
    case 'crests': {
      // two clan crests circle each other; a blade cuts between them
      for (const [s, col] of [[-1, c1], [1, c2]]) {
        const ang = t * 1.5 + (s > 0 ? Math.PI : 0);
        ctx.globalAlpha = a;
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.arc(cx + Math.cos(ang) * R * (1.1 - 0.4 * k), cy - R * 0.4 + Math.sin(ang) * R * 0.4, R * 0.16, 0, TAU);
        ctx.fill();
      }
      if (k > 0.8) {
        ctx.globalAlpha = a * (k - 0.8) * 5;
        ctx.strokeStyle = '#f2efe6';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(cx - R * 1.4, cy + R * 0.3);
        ctx.lineTo(cx + R * 1.4, cy - R * 0.9);
        ctx.stroke();
      }
      break;
    }
    case 'petals': {
      // cherry petals falling slowly through a column of light
      ctx.fillStyle = `rgba(255,246,210,${0.12 * a * k})`;
      ctx.fillRect(cx - R * 0.3, 0, R * 0.6, cy);
      for (let i = 0; i < 30; i++) {
        const fall = (t * 0.25 + i * 0.033) % 1;
        ctx.globalAlpha = a;
        ctx.fillStyle = i % 5 ? '#f2bec8' : c2;
        ctx.save();
        ctx.translate(cx + Math.sin(i * 9.1 + t) * R * 1.5, fall * h);
        ctx.rotate(t + i);
        ctx.beginPath();
        ctx.ellipse(0, 0, 3.5, 1.8, 0, 0, TAU);
        ctx.fill();
        ctx.restore();
      }
      break;
    }
    case 'arrows': {
      // a sky of arrows darkens the top of the frame, then falls
      ctx.strokeStyle = 'rgba(40,28,18,0.9)';
      ctx.lineWidth = 1.4;
      ctx.globalAlpha = a;
      ctx.beginPath();
      for (let i = 0; i < 70; i++) {
        const x = ((i * 97) % w) + (k > 0.9 ? (t * 400) % 60 : 0);
        const y = (k > 0.9 ? ((t * 600 + i * 31) % h) : ((i * 41) % (h * 0.3)) * k);
        ctx.moveTo(x, y);
        ctx.lineTo(x - 6, y - 12);
      }
      ctx.stroke();
      ctx.fillStyle = c1;
      ctx.globalAlpha = 0.25 * a * k;
      ctx.fillRect(0, 0, w, h * 0.12);
      break;
    }
    case 'mist': {
      // mist rolls in over the circle; at the climax a single white line cuts it in two
      for (let i = 0; i < 8; i++) {
        const x = cx + Math.sin(t * 0.4 + i * 0.8) * R * 1.4;
        const y = cy + Math.cos(t * 0.3 + i) * R * 0.4;
        const g = ctx.createRadialGradient(x, y, 0, x, y, R * 0.9);
        g.addColorStop(0, `rgba(230,236,246,${0.22 * a * k})`);
        g.addColorStop(1, 'rgba(230,236,246,0)');
        ctx.fillStyle = g;
        ctx.fillRect(x - R, y - R, R * 2, R * 2);
      }
      if (k >= 1 && t < tOpen) {
        ctx.strokeStyle = `rgba(250,252,255,${a})`;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(0, cy + R * 0.6);
        ctx.lineTo(w, cy - R * 0.8);
        ctx.stroke();
      }
      ctx.fillStyle = c2;
      ctx.globalAlpha = a * k * 0.8;
      for (let i = 0; i < 10; i++) {
        const fall = (t * 0.3 + i * 0.1) % 1;
        ctx.save();
        ctx.translate(cx + Math.sin(i * 5.3) * R * 1.6 + fall * 30, fall * h);
        ctx.rotate(t * 2 + i);
        ctx.fillRect(-3, -1.5, 6, 3);
        ctx.restore();
      }
      break;
    }
    default:
  }
  ctx.restore();
}

/** Every motif id this module draws (used by the Chase Unit Standard test). */
export const MOTIFS = ['banners', 'lances', 'gears', 'searchlights', 'coins', 'leaves', 'storm', 'gravity', 'snow', 'pages', 'quake', 'crests', 'petals', 'arrows', 'mist', 'show'];
