// THE CHASE UNIT STANDARD
//
// Chase units are not just rare units, they are special experiences. Every
// chase unit (a circle's rarest pull: `chase: true`, or 1% or less) must have
// ALL of the following, registered here. tests/chaseStandard.test.js fails
// for any chase unit – present or future – that is missing one, or that
// shares one with another chase unit:
//
//   anim     – its own animation personality: idle motion, wind-up and strike
//              (installed over the unit's painter animation), or `custom`
//              when its painter animates itself (the Fortress);
//   idle     – a signature idle effect drawn around it at rest;
//   attack   – a signature flourish on every attack;
//   special  – its special-ability sequence;
//   kill     – feedback when it eliminates an enemy;
//   sfx      – its own special-ability sound (src/audio/sfx.js CHASE_SFX);
//   reveal   – its acquisition reveal: stamp text, motif and colours
//              (src/render/summonCinematic.js). Super chase units (0.1% or
//              rarer) additionally carry `superChase: true` and get the
//              extended reveal.
//
// Effects follow the house rules: small and readable at rest, larger only
// for the moment of the special, never covering the road for long.

import { since, special } from './castArt.js';
import { registerAnim, animOf } from './unitArt.js';
import { drawGlow, circle } from './canvas.js';

const TAU = Math.PI * 2;
const sway = (u, t, k = 1, a = 0.8) => Math.sin(t * k + (u.uid ?? 0)) * a;
const pulse = (t, k = 2) => 0.5 + 0.5 * Math.sin(t * k);

function ring(ctx, x, y, r, color, a, w = 1.4) {
  ctx.strokeStyle = color;
  ctx.globalAlpha = a;
  ctx.lineWidth = w;
  ctx.beginPath();
  ctx.ellipse(x, y, r, r * 0.6, 0, 0, TAU);
  ctx.stroke();
  ctx.globalAlpha = 1;
}
function dots(ctx, x, y, n, r, t, color, size = 1.4, speed = 1, squash = 0.5) {
  ctx.fillStyle = color;
  for (let i = 0; i < n; i++) {
    const a = t * speed + (i / n) * TAU;
    ctx.fillRect(x + Math.cos(a) * r - size / 2, y + Math.sin(a) * r * squash - size / 2, size, size);
  }
}

/** Every chase unit's standard. Keyed by unit id. */
export const CHASE = {
  // ------------------------------------------------ Village Militia
  'village-hero': {
    art: 'villageHero',
    anim: (u, t) => {
      // a proud stance: chest out, shield up; every tenth swing a leaping hero's strike
      if ((u.shots ?? 0) % 10 === 0 && since(u, t) < 0.3) return { frame: 2, dy: -3, dx: 2 };
      if (since(u, t) < 0.12) return { frame: 2, dx: 1.5 };
      if (u.hasTarget && u.cooldown < 0.2) return { frame: 1 };
      return { frame: 0, dy: -Math.max(0, Math.sin(t * 1.1 + u.uid)) * 0.8 };
    },
    idle: (ctx, u, t) => {
      // a green ribbon of courage fluttering over the head
      ctx.strokeStyle = 'rgba(95,154,58,0.8)';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(u.x - 2, u.y - 26);
      ctx.quadraticCurveTo(u.x - 8, u.y - 30 + Math.sin(t * 4) * 2, u.x - 13, u.y - 27 + Math.sin(t * 5) * 2);
      ctx.stroke();
    },
    attack: (ctx, u, t, k) => ring(ctx, u.x + 8 * u.facing, u.y - 6, 6 + 8 * k, '#e8c255', 1 - k),
    special: (ctx, u, t, k) => {
      drawGlow(ctx, '#e8c255', u.x, u.y - 10, 26, 0.4 * (1 - k));
      ctx.fillStyle = `rgba(232,194,85,${1 - k})`;
      ctx.font = '800 9px Archivo, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('4×', u.x, u.y - 34 - k * 8);
    },
    kill: (fx, e) => fx.burst(e.x, e.y, 5, '#8fb35a', { speed: 40, life: 0.4, size: 1.6, glow: false }),
    sfx: 'heroStrike',
    reveal: { stamp: 'HERO', motif: 'banners', colors: ['#5f9a3a', '#e8c255'] },
  },
  // ------------------------------------------------ Town Guard
  'kings-champion': {
    art: 'kingsChampion',
    anim: (u, t) => {
      // the tournament salute at rest; a lunging overhead cut
      if (special(u, t) < 0.4) return { frame: 2, dx: 3, dy: 0.5 };
      if (since(u, t) < 0.14) return { frame: 2, dx: 1 };
      if (u.hasTarget && u.cooldown < 0.3) return { frame: 1, dy: -0.6 };
      return { frame: Math.sin(t * 0.4 + u.uid) > 0.85 ? 1 : 0 };
    },
    idle: (ctx, u, t) => {
      // a small crown glinting over his helm
      const a = pulse(t, 1.4);
      ctx.fillStyle = `rgba(232,194,85,${0.5 + 0.4 * a})`;
      ctx.beginPath();
      ctx.moveTo(u.x - 3, u.y - 34);
      ctx.lineTo(u.x - 3, u.y - 37);
      ctx.lineTo(u.x - 1.5, u.y - 35.5);
      ctx.lineTo(u.x, u.y - 38);
      ctx.lineTo(u.x + 1.5, u.y - 35.5);
      ctx.lineTo(u.x + 3, u.y - 37);
      ctx.lineTo(u.x + 3, u.y - 34);
      ctx.fill();
    },
    attack: (ctx, u, t, k) => {
      ctx.strokeStyle = `rgba(242,239,230,${1 - k})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(u.x + 4 * u.facing, u.y - 8, 14, -2.2, -0.6);
      ctx.stroke();
    },
    special: (ctx, u, t, k) => {
      // a lance of light toward the strongest – the champion's strike
      ctx.strokeStyle = `rgba(255,240,200,${1 - k})`;
      ctx.lineWidth = 3 * (1 - k) + 1;
      ctx.beginPath();
      ctx.moveTo(u.x, u.y - 10);
      ctx.lineTo(u.x + Math.cos(u.angle ?? 0) * 60, u.y - 10 + Math.sin(u.angle ?? 0) * 60);
      ctx.stroke();
    },
    kill: (fx, e) => fx.ring(e.x, e.y, 2, 14, 0.35, '#e8c255', 1.6),
    sfx: 'championFanfare',
    reveal: { stamp: 'CHAMPION', motif: 'lances', colors: ['#2f4a7a', '#e8c255'] },
  },
  // ------------------------------------------------ Siege Workshop
  'master-engineer': {
    art: 'masterEngineer',
    anim: (u, t) => {
      // tinkering at rest: the wrench taps on a regular beat
      if (special(u, t) < 0.6) return { frame: 1, dy: -0.4 };
      if (since(u, t) < 0.12) return { frame: 2 };
      return { frame: Math.floor(t * 2.5 + u.uid) % 4 === 0 ? 2 : 0, dy: 0 };
    },
    idle: (ctx, u, t) => dots(ctx, u.x, u.y - 30, 3, 4, t, 'rgba(201,162,74,0.85)', 1.6, 2.4, 0.4),
    attack: (ctx, u, t, k) => ring(ctx, u.x, u.y + 6, 4 + 10 * k, '#c9a24a', 0.7 * (1 - k)),
    special: (ctx, u, t, k) => {
      // a blueprint grid unfolding where the ballista appears
      ctx.strokeStyle = `rgba(150,200,255,${0.6 * (1 - k)})`;
      ctx.lineWidth = 0.8;
      for (let i = -2; i <= 2; i++) {
        ctx.beginPath();
        ctx.moveTo(u.x + i * 6, u.y - 14);
        ctx.lineTo(u.x + i * 6, u.y + 12);
        ctx.moveTo(u.x - 14, u.y + i * 5);
        ctx.lineTo(u.x + 14, u.y + i * 5);
        ctx.stroke();
      }
    },
    kill: (fx, e) => fx.burst(e.x, e.y, 4, '#c9a24a', { speed: 50, life: 0.3, size: 1.3, glow: false, gravity: 100 }),
    sfx: 'engineerBuild',
    reveal: { stamp: 'MASTERWORK', motif: 'gears', colors: ['#9b6a3a', '#c9a24a'] },
  },
  // ------------------------------------------------ Advanced Military
  fortress: {
    art: 'fortress',
    custom: 'drawFortress – a slow-tracking siege turret that charges before firing and opens its hangar for drones',
    idle: (ctx, u, t) => {
      // searchlight sweeping from the turret
      const a = t * 0.6 + u.uid;
      ctx.fillStyle = 'rgba(255,246,214,0.08)';
      ctx.beginPath();
      ctx.moveTo(u.x, u.y - 12);
      ctx.lineTo(u.x + Math.cos(a - 0.15) * 70, u.y - 12 + Math.sin(a - 0.15) * 40);
      ctx.lineTo(u.x + Math.cos(a + 0.15) * 70, u.y - 12 + Math.sin(a + 0.15) * 40);
      ctx.closePath();
      ctx.fill();
    },
    attack: (ctx, u, t, k) => drawGlow(ctx, '#ffcf6a', u.x + Math.cos(u.angle ?? 0) * 22, u.y - 12 + Math.sin(u.angle ?? 0) * 22, 14, 0.6 * (1 - k)),
    special: (ctx, u, t, k) => ring(ctx, u.x, u.y + 6, 10 + 30 * k, '#d9533f', 1 - k, 2),
    kill: (fx, e) => fx.burst(e.x, e.y, 6, '#5a5550', { speed: 70, life: 0.5, size: 2, glow: false, gravity: 160 }),
    sfx: 'fortressSiren',
    reveal: { stamp: 'FORTRESS', motif: 'searchlights', colors: ['#b44d3f', '#d6b048'] },
  },
  // ------------------------------------------------ Wild West
  'fastest-hand': {
    art: 'fastestHand',
    wrap: (base) => (u, t) => {
      // at rest he twirls the revolver; otherwise his own gunfighter draw
      const a = base(u, t);
      if (a.frame === 0 && Math.floor(t * 1.5 + u.uid) % 5 === 0) return { ...a, frame: 1, dx: Math.sin(t * 20) * 0.5 };
      return a;
    },
    idle: (ctx, u, t) => {
      // the brim of the hat catches the sun, and dust curls at his boots
      ctx.fillStyle = `rgba(200,170,120,${0.35 * pulse(t, 0.8)})`;
      ctx.beginPath();
      ctx.ellipse(u.x + Math.sin(t) * 6, u.y + 9, 8, 2, 0, 0, TAU);
      ctx.fill();
    },
    attack: (ctx, u, t, k) => {
      ctx.strokeStyle = `rgba(255,230,150,${1 - k})`;
      ctx.lineWidth = 1.2;
      for (let i = 0; i < 3; i++) {
        const a = (u.angle ?? 0) + (i - 1) * 0.1;
        ctx.beginPath();
        ctx.moveTo(u.x + Math.cos(a) * 10, u.y - 10 + Math.sin(a) * 10);
        ctx.lineTo(u.x + Math.cos(a) * (20 + 30 * k), u.y - 10 + Math.sin(a) * (20 + 30 * k));
        ctx.stroke();
      }
    },
    special: (ctx, u, t, k) => {
      // HIGH NOON: the revolver cylinder spins over him
      ctx.save();
      ctx.translate(u.x, u.y - 40);
      ctx.rotate(k * TAU * 2);
      ctx.globalAlpha = 1 - k;
      ctx.strokeStyle = '#e8c255';
      ctx.lineWidth = 1.4;
      circle(ctx, 0, 0, 7);
      ctx.stroke();
      for (let i = 0; i < 6; i++) {
        circle(ctx, Math.cos((i / 6) * TAU) * 4.4, Math.sin((i / 6) * TAU) * 4.4, 1.4);
        ctx.stroke();
      }
      ctx.restore();
    },
    kill: (fx, e) => fx.text(e.x, e.y - 8, '✦', '#e8c255', 9),
    sfx: 'highNoon',
    reveal: { stamp: 'HIGH NOON', motif: 'show', colors: ['#c58d4c', '#e8c255'] },
  },
  // ------------------------------------------------ Gambino
  'high-roller': {
    art: 'highRoller',
    wrap: (base) => (u, t) => {
      // shakes the dice at rest
      const a = base(u, t);
      if (a.frame === 0) return { ...a, dx: Math.sin(t * 18 + u.uid) * (Math.sin(t * 0.8 + u.uid) > 0.6 ? 0.6 : 0) };
      return a;
    },
    idle: (ctx, u, t) => {
      ctx.fillStyle = '#f4efe6';
      const y = u.y - 30 - Math.abs(Math.sin(t * 3 + u.uid)) * 4;
      ctx.fillRect(u.x - 4, y, 3, 3);
      ctx.fillRect(u.x + 1, y - 1, 3, 3);
      ctx.fillStyle = '#b7353a';
      ctx.fillRect(u.x - 3, y + 1, 1, 1);
      ctx.fillRect(u.x + 2, y, 1, 1);
    },
    attack: (ctx, u, t, k) => dots(ctx, u.x, u.y - 8, 4, 6 + 8 * k, t, `rgba(242,211,138,${1 - k})`, 1.6, 6),
    special: (ctx, u, t, k) => {
      ctx.fillStyle = `rgba(242,193,74,${1 - k})`;
      ctx.font = '800 10px Archivo, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('JACKPOT', u.x, u.y - 36 - k * 10);
    },
    kill: (fx, e) => fx.burst(e.x, e.y, 3, '#2f9a68', { speed: 40, life: 0.4, size: 1.6, glow: false }),
    sfx: 'diceRoll',
    reveal: { stamp: 'HIGH ROLLER', motif: 'show', colors: ['#2f9a68', '#f2d38a'] },
  },
  'the-house': {
    art: 'theHouse',
    wrap: (base) => (u, t) => base(u, t),
    idle: (ctx, u, t) => {
      // the marquee lights chase around the building
      for (let i = 0; i < 8; i++) {
        const on = Math.floor(t * 6 + i) % 3 === 0;
        ctx.fillStyle = on ? '#ffe08a' : 'rgba(120,90,40,0.6)';
        ctx.fillRect(u.x - 14 + i * 4, u.y - 30, 2, 2);
      }
    },
    attack: (ctx, u, t, k) => ring(ctx, u.x, u.y + 4, 8 + 12 * k, '#f2d38a', 0.6 * (1 - k)),
    special: (ctx, u, t, k) => {
      // the wheel of fortune spins over the casino
      ctx.save();
      ctx.translate(u.x, u.y - 44);
      ctx.rotate(k * TAU * 3);
      ctx.globalAlpha = 1 - k * 0.8;
      for (let i = 0; i < 12; i++) {
        ctx.fillStyle = i % 2 ? '#b7353a' : '#1d1d1d';
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, 10, (i / 12) * TAU, ((i + 1) / 12) * TAU);
        ctx.fill();
      }
      ctx.restore();
    },
    kill: (fx, e) => fx.burst(e.x, e.y, 4, '#f2c14a', { speed: 60, life: 0.5, size: 1.6, glow: false, gravity: 120 }),
    sfx: 'houseWheel',
    superChase: true,
    reveal: { stamp: 'THE HOUSE', motif: 'show', colors: ['#2f9a68', '#b7353a'] },
  },
  // ------------------------------------------------ Nuclear War
  'nuclear-warhead': {
    art: 'nuclearWarhead',
    wrap: (base) => (u, t) => ({ ...base(u, t), dy: Math.sin(t * 9 + u.uid) * 0.25 }),
    idle: (ctx, u, t) => {
      // a fizzing fuse light, blinking amber
      ctx.fillStyle = Math.floor(t * 3 + u.uid) % 2 ? '#ffd27a' : '#7a4a1a';
      ctx.fillRect(u.x - 1, u.y - 32, 2, 2);
    },
    attack: (ctx, u, t, k) => drawGlow(ctx, '#7af0d2', u.x, u.y - 16, 18, 0.5 * (1 - k)),
    special: (ctx, u, t, k) => ring(ctx, u.x, u.y + 6, 6 + 40 * k, '#2fb39a', 1 - k, 2.4),
    kill: (fx, e) => fx.ring(e.x, e.y, 2, 16, 0.4, '#7af0d2', 1.4),
    sfx: 'launchKlaxon',
    reveal: { stamp: 'OMEGA', motif: 'show', colors: ['#2fb39a', '#d9a12a'] },
  },
  'antimatter-warhead': {
    art: 'antimatter',
    wrap: (base) => (u, t) => ({ ...base(u, t), dx: Math.sin(t * 13 + u.uid) * 0.3 }),
    idle: (ctx, u, t) => dots(ctx, u.x, u.y - 14, 5, 12, t, 'rgba(183,156,255,0.8)', 1.4, -2, 0.45),
    attack: (ctx, u, t, k) => ring(ctx, u.x, u.y - 12, 14 * (1 - k) + 2, '#cdb6ff', 1 - k, 1.6),
    special: (ctx, u, t, k) => {
      // space folding in: rings converging on the warhead
      for (let i = 0; i < 3; i++) ring(ctx, u.x, u.y - 12, 40 * (1 - k) + i * 8, '#7a4fe0', 0.8 * (1 - k), 1.4);
    },
    kill: (fx, e) => fx.ring(e.x, e.y, 14, 1, 0.35, '#b79cff', 1.4),
    sfx: 'antimatterFold',
    superChase: true,
    reveal: { stamp: 'ANTIMATTER', motif: 'show', colors: ['#7a4fe0', '#f3e9ff'] },
  },
  // ------------------------------------------------ Circle Pack 2
  'golden-merchant': {
    art: 'goldenMerchant',
    anim: (u, t) => {
      // counts coins at rest (hand up and down), throws a coin on the attack, raises the purse for the vault
      if (special(u, t) < 0.7) return { frame: 2, dy: -1 };
      if (since(u, t) < 0.12) return { frame: 2 };
      return { frame: Math.floor(t * 3 + u.uid) % 3 === 0 ? 1 : 0, dy: sway(u, t, 1.2, 0.3) };
    },
    idle: (ctx, u, t) => {
      // a coin flipped from hand to hand
      const k = (t * 1.2 + u.uid) % 1;
      const x = u.x + 4 - k * 8;
      const y = u.y - 22 - Math.sin(k * Math.PI) * 8;
      ctx.fillStyle = '#f2c14a';
      ctx.beginPath();
      ctx.ellipse(x, y, 1.8, 1.8 * Math.abs(Math.cos(t * 12)), 0, 0, TAU);
      ctx.fill();
    },
    attack: (ctx, u, t, k) => dots(ctx, u.x + 6 * u.facing, u.y - 14, 3, 3 + 6 * k, t, `rgba(242,193,74,${1 - k})`, 1.4, 4),
    special: (ctx, u, t, k) => {
      // the vault opens: a fountain of coins
      ctx.fillStyle = `rgba(242,193,74,${1 - k})`;
      for (let i = 0; i < 10; i++) {
        const a = -Math.PI / 2 + (i - 4.5) * 0.18;
        const r = 30 * k;
        ctx.fillRect(u.x + Math.cos(a) * r, u.y - 20 + Math.sin(a) * r + 40 * k * k, 2, 2);
      }
    },
    kill: (fx, e) => fx.text(e.x, e.y - 6, '¤', '#f2c14a', 10),
    sfx: 'merchantVault',
    reveal: { stamp: 'FORTUNE', motif: 'coins', colors: ['#c9962a', '#5a2a50'] },
  },
  'eternal-engine': {
    art: 'eternalEngine',
    wrap: (base) => (u, t) => {
      // in Overdrive the engine shakes on its mounts
      const a = base(u, t);
      return u.overdriveUntil > t ? { ...a, dx: Math.sin(t * 50) * 0.6 } : a;
    },
    idle: (ctx, u, t) => {
      // a slow puff of steam from the stack
      const k = (t * 0.7 + u.uid) % 1;
      ctx.fillStyle = `rgba(230,226,218,${0.5 * (1 - k)})`;
      circle(ctx, u.x - 6, u.y - 30 - k * 12, 2 + k * 4);
      ctx.fill();
    },
    attack: (ctx, u, t, k) => drawGlow(ctx, '#f2a23a', u.x + 10 * u.facing, u.y - 12, 8, 0.6 * (1 - k)),
    special: (ctx, u, t, k) => {
      // OVERDRIVE: pistons of light pumping out of the boiler
      for (let i = 0; i < 4; i++) {
        const h = 10 + Math.abs(Math.sin(t * 20 + i)) * 8;
        ctx.fillStyle = `rgba(242,162,58,${0.8 * (1 - k)})`;
        ctx.fillRect(u.x - 8 + i * 5, u.y - 24 - h, 2, h);
      }
    },
    kill: (fx, e) => fx.burst(e.x, e.y, 3, '#c9a24a', { speed: 60, life: 0.3, size: 1.6, glow: false, gravity: 90 }),
    sfx: 'overdrive',
    reveal: { stamp: 'PERPETUAL', motif: 'gears', colors: ['#b8733a', '#c9a24a'] },
  },
  'heart-of-the-wild': {
    art: 'heartOfTheWild',
    anim: (u, t) => {
      // breathes slowly like a sleeping forest; the overgrowth call is a long upward heave
      if (special(u, t) < 0.9) return { frame: 2, dy: -1.6 };
      if (since(u, t) < 0.16) return { frame: 2 };
      return { frame: u.hasTarget && u.cooldown < 0.3 ? 1 : 0, dy: Math.sin(t * 0.9 + u.uid) * 1.1 };
    },
    idle: (ctx, u, t) => {
      // fireflies orbiting the heart
      dots(ctx, u.x, u.y - 14, 4, 13, t, `rgba(220,240,140,${0.5 + 0.4 * pulse(t, 3)})`, 1.5, 0.8, 0.55);
    },
    attack: (ctx, u, t, k) => {
      ctx.fillStyle = `rgba(224,90,122,${1 - k})`;
      for (let i = 0; i < 4; i++) ctx.fillRect(u.x - 6 + i * 4, u.y + 6 - k * 6, 1.5, 3);
    },
    special: (ctx, u, t, k) => {
      // vines whip outward from it in a spiral
      ctx.strokeStyle = `rgba(95,154,58,${1 - k})`;
      ctx.lineWidth = 1.8;
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * TAU + k * 2;
        ctx.beginPath();
        ctx.moveTo(u.x, u.y);
        ctx.quadraticCurveTo(u.x + Math.cos(a + 0.6) * 20 * k, u.y + Math.sin(a + 0.6) * 12 * k, u.x + Math.cos(a) * 40 * k, u.y + Math.sin(a) * 24 * k);
        ctx.stroke();
      }
    },
    kill: (fx, e) => fx.burst(e.x, e.y, 4, '#5f9a3a', { speed: 30, life: 0.6, size: 1.6, glow: false, gravity: -20 }),
    sfx: 'wildHeart',
    reveal: { stamp: 'WILD HEART', motif: 'leaves', colors: ['#4f9a3a', '#e05a7a'] },
  },
  'eye-of-the-zenith': {
    art: 'eyeOfTheZenith',
    anim: (u, t) => {
      // hangs in the sky, slowly turning to watch the field; blinks before every bolt
      if (special(u, t) < 0.8) return { frame: 2, dy: -2 };
      if (since(u, t) < 0.1) return { frame: 2 };
      return { frame: Math.sin(t * 0.5 + u.uid) > 0.97 ? 1 : 0, dy: Math.sin(t * 1.3 + u.uid) * 1.6, dx: Math.cos(t * 0.65 + u.uid) * 1.2 };
    },
    idle: (ctx, u, t) => {
      // the storm eye's slow cloud ring
      ctx.strokeStyle = 'rgba(207,228,255,0.45)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.ellipse(u.x, u.y - 16, 14, 5, 0, t, t + 4.4);
      ctx.stroke();
    },
    attack: (ctx, u, t, k) => {
      ctx.strokeStyle = `rgba(255,226,140,${1 - k})`;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(u.x, u.y - 22);
      ctx.lineTo(u.x + 4, u.y - 30);
      ctx.lineTo(u.x - 2, u.y - 34);
      ctx.stroke();
    },
    special: (ctx, u, t, k) => {
      // the eye opens: golden rays in every direction
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * TAU;
        ctx.strokeStyle = `rgba(232,184,58,${0.8 * (1 - k)})`;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(u.x + Math.cos(a) * 12, u.y - 16 + Math.sin(a) * 12);
        ctx.lineTo(u.x + Math.cos(a) * (14 + 26 * k), u.y - 16 + Math.sin(a) * (14 + 26 * k));
        ctx.stroke();
      }
    },
    kill: (fx, e) => fx.ring(e.x, e.y, 2, 18, 0.3, '#ffe08a', 1.6),
    sfx: 'zenithEye',
    reveal: { stamp: 'ZENITH', motif: 'storm', colors: ['#6fa8d8', '#e8b83a'] },
  },
  'singularity-monarch': {
    art: 'singularityMonarch',
    anim: (u, t) => {
      // a regal, weightless float; casting tips the crown back
      if (special(u, t) < 1) return { frame: 2, dy: -2.4 };
      if (since(u, t) < 0.14) return { frame: 2, dy: -0.6 };
      return { frame: u.hasTarget ? 1 : 0, dy: -1.6 + Math.sin(t * 0.8 + u.uid) * 1.2 };
    },
    idle: (ctx, u, t) => {
      // a tiny accretion disc spinning in the palm
      ctx.save();
      ctx.translate(u.x + 8 * u.facing, u.y - 18);
      ctx.rotate(t * 2);
      ctx.strokeStyle = 'rgba(184,166,240,0.8)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(0, 0, 5, 1.6, 0, 0, TAU);
      ctx.stroke();
      ctx.restore();
      ctx.fillStyle = '#0d0a18';
      circle(ctx, u.x + 8 * u.facing, u.y - 18, 1.6);
      ctx.fill();
    },
    attack: (ctx, u, t, k) => ring(ctx, u.x + 8 * u.facing, u.y - 18, 2 + 10 * k, '#8a7ad8', 1 - k),
    special: (ctx, u, t, k) => {
      // EVENT HORIZON: the light bends toward him
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * TAU + k * 3;
        const r = 50 * (1 - k);
        ctx.fillStyle = `rgba(216,201,255,${1 - k})`;
        ctx.fillRect(u.x + Math.cos(a) * r, u.y - 10 + Math.sin(a) * r * 0.6, 1.6, 1.6);
      }
    },
    kill: (fx, e) => fx.ring(e.x, e.y, 16, 1, 0.4, '#8a7ad8', 1.4),
    sfx: 'eventHorizon',
    reveal: { stamp: 'EVENT HORIZON', motif: 'gravity', colors: ['#4a3a8a', '#d8c9ff'] },
  },
  // ------------------------------------------------ Circle Pack 3
  grandmaster: {
    art: 'grandmaster',
    wrap: (base) => (u, t) => {
      // between bouts he plants the greatsword and rests both hands on the pommel
      const a = base(u, t);
      if (a.frame === 0 && Math.sin(t * 0.3 + u.uid) > 0.4) return { ...a, frame: 1, dy: 0.4 };
      return a;
    },
    idle: (ctx, u, t) => {
      // laurel leaves drifting off his crown
      const k = (t * 0.5 + u.uid) % 1;
      ctx.fillStyle = `rgba(224,184,74,${1 - k})`;
      ctx.beginPath();
      ctx.ellipse(u.x - 4 - k * 8, u.y - 30 + k * 16, 2, 1, k * 3, 0, TAU);
      ctx.fill();
    },
    attack: (ctx, u, t, k) => ring(ctx, u.x + 10 * u.facing, u.y - 4, 4 + 14 * k, '#fbf6e6', 1 - k, 1.8),
    special: (ctx, u, t, k) => {
      // FINAL EXAMINATION: the Academy crest rises over the field
      ctx.globalAlpha = 1 - k;
      ctx.fillStyle = '#2f5aa8';
      ctx.beginPath();
      ctx.moveTo(u.x - 7, u.y - 40 - k * 10);
      ctx.lineTo(u.x + 7, u.y - 40 - k * 10);
      ctx.lineTo(u.x + 7, u.y - 33 - k * 10);
      ctx.quadraticCurveTo(u.x, u.y - 26 - k * 10, u.x - 7, u.y - 33 - k * 10);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#e0b84a';
      ctx.fillRect(u.x - 0.8, u.y - 39 - k * 10, 1.6, 9);
      ctx.globalAlpha = 1;
    },
    kill: (fx, e) => fx.ring(e.x, e.y, 2, 12, 0.3, '#e0b84a', 1.4),
    sfx: 'examBell',
    reveal: { stamp: 'GRANDMASTER', motif: 'banners', colors: ['#2f5aa8', '#e0b84a'] },
  },
  'eternal-winter': {
    art: 'eternalWinter',
    anim: (u, t) => {
      // drifts like snow on the wind; raises the hailstone to call the blizzard
      if (special(u, t) < 1) return { frame: 2, dy: -1.4 };
      if (since(u, t) < 0.14) return { frame: 2 };
      return { frame: u.hasTarget ? 1 : 0, dy: Math.sin(t * 0.6 + u.uid) * 1.4, dx: Math.sin(t * 0.37 + u.uid) * 1 };
    },
    idle: (ctx, u, t) => {
      // snowflakes spiralling down around the spirit
      for (let i = 0; i < 4; i++) {
        const k = (t * 0.35 + i / 4) % 1;
        const a = i * 1.7 + t * 0.8;
        ctx.fillStyle = `rgba(255,255,255,${0.8 * (1 - k)})`;
        ctx.fillRect(u.x + Math.cos(a) * 12, u.y - 34 + k * 40, 1.6, 1.6);
      }
    },
    attack: (ctx, u, t, k) => drawGlow(ctx, '#bfe6ff', u.x + 8 * u.facing, u.y - 22, 9, 0.6 * (1 - k)),
    special: (ctx, u, t, k) => {
      // a crown of icicles grows over it
      ctx.fillStyle = `rgba(228,244,255,${1 - k})`;
      for (let i = 0; i < 7; i++) {
        const x = u.x - 12 + i * 4;
        const h = 6 + 10 * k * (i % 2 ? 0.6 : 1);
        ctx.beginPath();
        ctx.moveTo(x - 1.4, u.y - 38);
        ctx.lineTo(x, u.y - 38 - h);
        ctx.lineTo(x + 1.4, u.y - 38);
        ctx.fill();
      }
    },
    kill: (fx, e) => fx.burst(e.x, e.y, 5, '#e4f4ff', { speed: 50, life: 0.4, size: 1.4, glow: false }),
    sfx: 'winterHowl',
    reveal: { stamp: 'ETERNAL WINTER', motif: 'snow', colors: ['#9fd0ec', '#ffffff'] },
  },
  'forbidden-author': {
    art: 'forbiddenAuthor',
    anim: (u, t) => {
      // writes in the air at rest (a slow nodding scrawl); the book flies open for the chapter
      if (special(u, t) < 1.1) return { frame: 2, dy: -2 };
      if (since(u, t) < 0.16) return { frame: 2 };
      return { frame: Math.floor(t * 1.6 + u.uid) % 2 ? 1 : 0, dy: Math.sin(t * 1.5 + u.uid) * 1.4 };
    },
    idle: (ctx, u, t) => {
      // glowing script trailing from the quill
      ctx.strokeStyle = 'rgba(208,122,255,0.5)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 0; i < 8; i++) ctx.lineTo(u.x + 10 + i * 2.4, u.y - 22 + Math.sin(t * 6 + i) * 2);
      ctx.stroke();
    },
    attack: (ctx, u, t, k) => {
      ctx.fillStyle = `rgba(239,226,192,${1 - k})`;
      ctx.fillRect(u.x + 6 * u.facing + k * 10 * u.facing, u.y - 18 - k * 6, 3, 2.4);
    },
    special: (ctx, u, t, k) => {
      // the chains snap: links flying off the grimoire
      ctx.strokeStyle = `rgba(141,147,158,${1 - k})`;
      ctx.lineWidth = 1.2;
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * TAU;
        circle(ctx, u.x + Math.cos(a) * 30 * k, u.y - 6 + Math.sin(a) * 18 * k, 2);
        ctx.stroke();
      }
    },
    kill: (fx, e) => fx.text(e.x, e.y - 6, '✕', '#d07aff', 9),
    sfx: 'chainsBreak',
    reveal: { stamp: 'FORBIDDEN', motif: 'pages', colors: ['#3a2a5a', '#d07aff'] },
  },
  worldbreaker: {
    art: 'worldbreaker',
    wrap: (base) => (u, t) => base(u, t),
    idle: (ctx, u, t) => {
      // the ground cracks glow and cool under its weight
      ctx.strokeStyle = `rgba(240,130,50,${0.3 + 0.3 * pulse(t, 0.9)})`;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(u.x - 18, u.y + 10);
      ctx.lineTo(u.x - 8, u.y + 7);
      ctx.lineTo(u.x, u.y + 11);
      ctx.lineTo(u.x + 12, u.y + 8);
      ctx.stroke();
    },
    attack: (ctx, u, t, k) => ring(ctx, u.x + 18 * u.facing, u.y + 8, 6 + 18 * k, '#ffb04a', 0.8 * (1 - k), 2),
    special: (ctx, u, t, k) => {
      // the maul raised: rocks float up around the titan
      for (let i = 0; i < 6; i++) {
        ctx.fillStyle = `rgba(74,63,58,${1 - k * 0.6})`;
        ctx.fillRect(u.x - 20 + i * 8, u.y + 6 - k * (10 + i * 3), 4, 3);
      }
    },
    kill: (fx, e) => fx.burst(e.x, e.y, 5, '#4a3f3a', { speed: 70, life: 0.5, size: 2, glow: false, gravity: 200 }),
    sfx: 'worldbreakRumble',
    reveal: { stamp: 'WORLDBREAKER', motif: 'quake', colors: ['#d0662a', '#3a3230'] },
  },
  // ------------------------------------------------ The Ghost
  'defected-lord': {
    art: 'defectedLord',
    wrap: (base) => (u, t) => base(u, t),
    idle: (ctx, u, t) => {
      // the red cord of the old clan stirring in the wind
      ctx.strokeStyle = 'rgba(183,53,58,0.85)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(u.x + 4, u.y - 26);
      ctx.quadraticCurveTo(u.x + 9, u.y - 22 + Math.sin(t * 3) * 2, u.x + 12, u.y - 18 + Math.sin(t * 4) * 2);
      ctx.stroke();
    },
    attack: (ctx, u, t, k) => {
      ctx.strokeStyle = `rgba(255,220,220,${1 - k})`;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(u.x + 6 * u.facing, u.y - 6, 12, 0.3, 1.8);
      ctx.stroke();
    },
    special: (ctx, u, t, k) => {
      // two crests – the old and the new – flicker over him, one cut through
      ctx.globalAlpha = 1 - k;
      ctx.fillStyle = '#b7353a';
      circle(ctx, u.x - 6, u.y - 40, 4);
      ctx.fill();
      ctx.fillStyle = '#7a5a3a';
      circle(ctx, u.x + 6, u.y - 40, 4);
      ctx.fill();
      ctx.strokeStyle = '#f2efe6';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(u.x - 12, u.y - 34);
      ctx.lineTo(u.x + 12, u.y - 46);
      ctx.stroke();
      ctx.globalAlpha = 1;
    },
    kill: (fx, e) => fx.burst(e.x, e.y, 3, '#b7353a', { speed: 40, life: 0.3, size: 1.4, glow: false }),
    sfx: 'turncoat',
    reveal: { stamp: 'DEFECTED', motif: 'crests', colors: ['#2a2a34', '#b7353a'] },
  },
  'honourable-lord': {
    art: 'honourableLord',
    wrap: (base) => (u, t) => base(u, t),
    idle: (ctx, u, t) => {
      // stillness: a single falling cherry petal passes his blade now and then
      const k = (t * 0.25 + u.uid) % 1;
      ctx.fillStyle = `rgba(242,190,200,${0.9 * (1 - k)})`;
      ctx.beginPath();
      ctx.ellipse(u.x + 14 - k * 20, u.y - 36 + k * 44, 1.6, 0.9, k * 6, 0, TAU);
      ctx.fill();
    },
    attack: (ctx, u, t, k) => {
      ctx.strokeStyle = `rgba(250,246,230,${1 - k})`;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(u.x + 4 * u.facing, u.y - 22);
      ctx.lineTo(u.x + 26 * u.facing, u.y - 8);
      ctx.stroke();
    },
    special: (ctx, u, t, k) => {
      // the blade raised to the sky draws a column of light
      const a = k < 0.3 ? k / 0.3 : 1 - (k - 0.3) / 0.7;
      const g = ctx.createLinearGradient(u.x, u.y - 120, u.x, u.y - 20);
      g.addColorStop(0, 'rgba(255,246,210,0)');
      g.addColorStop(1, `rgba(255,246,210,${0.45 * a})`);
      ctx.fillStyle = g;
      ctx.fillRect(u.x - 4, u.y - 120, 8, 100);
    },
    kill: (fx, e) => fx.ring(e.x, e.y, 2, 12, 0.4, '#f2efe6', 1.4),
    sfx: 'lordsCut',
    reveal: { stamp: 'HONOUR', motif: 'petals', colors: ['#1f2a44', '#e8c255'] },
  },
  'great-khan': {
    art: 'greatKhan',
    wrap: (base) => (u, t) => base(u, t),
    idle: (ctx, u, t) => {
      // the warhorse's breath steaming, the tug's tails streaming
      const k = (t * 0.8 + u.uid) % 1;
      ctx.fillStyle = `rgba(230,226,218,${0.35 * (1 - k)})`;
      circle(ctx, u.x + 26 * u.facing + k * 6 * u.facing, u.y - 22 - k * 4, 1.6 + k * 3);
      ctx.fill();
    },
    attack: (ctx, u, t, k) => {
      ctx.strokeStyle = `rgba(217,176,112,${1 - k})`;
      ctx.lineWidth = 1;
      for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.moveTo(u.x + 12 * u.facing, u.y - 30 - i * 3);
        ctx.lineTo(u.x + (18 + 20 * k) * u.facing, u.y - 38 - i * 3 - 10 * k);
        ctx.stroke();
      }
    },
    special: (ctx, u, t, k) => {
      // the war standard blazes; drums beat outward as rings
      for (let i = 0; i < 3; i++) {
        const kk = (k * 3 - i * 0.4) % 1;
        if (kk > 0) ring(ctx, u.x, u.y + 8, 20 + 60 * kk, '#ffcf7a', 0.7 * (1 - kk), 2);
      }
      drawGlow(ctx, '#ffcf7a', u.x - 14, u.y - 74, 16, 0.5 * (1 - k));
    },
    kill: (fx, e) => fx.burst(e.x, e.y, 4, '#d9b070', { speed: 50, life: 0.4, size: 1.6, glow: false, gravity: 120 }),
    sfx: 'khanHorn',
    superChase: true,
    reveal: { stamp: 'THE GREAT KHAN', motif: 'arrows', colors: ['#8a2a1a', '#e8c255'] },
  },
  'ghost-warrior': {
    art: 'ghostWarrior',
    wrap: (base) => (u, t) => base(u, t),
    idle: (ctx, u, t) => {
      // mist pooling at his feet; the scarf's end lifting in a breeze that isn't there
      for (let i = 0; i < 3; i++) {
        const k = (t * 0.3 + i / 3) % 1;
        drawGlow(ctx, '#e8eef8', u.x - 6 + i * 6, u.y + 8 - k * 6, 8, 0.18 * (1 - k));
      }
    },
    attack: (ctx, u, t, k) => {
      // a single clean pale line, then nothing
      ctx.strokeStyle = `rgba(244,248,255,${1 - k})`;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(u.x - 4 * u.facing, u.y - 2);
      ctx.lineTo(u.x + 24 * u.facing, u.y - 14);
      ctx.stroke();
    },
    special: (ctx, u, t, k) => {
      // he vanishes into the mist for a heartbeat: a pale silhouette ring and drifting leaves
      ring(ctx, u.x, u.y + 6, 10 + 24 * k, '#eef4ff', 1 - k, 2);
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * TAU + k * 2;
        ctx.fillStyle = `rgba(200,100,46,${1 - k})`;
        ctx.beginPath();
        ctx.ellipse(u.x + Math.cos(a) * 26 * k, u.y - 10 + Math.sin(a) * 16 * k, 2, 1, a, 0, TAU);
        ctx.fill();
      }
    },
    kill: (fx, e) => fx.ring(e.x, e.y, 10, 1, 0.3, '#eef4ff', 1.2),
    sfx: 'ghostWind',
    superChase: true,
    reveal: { stamp: 'THE GHOST', motif: 'mist', colors: ['#c8ccd4', '#a82a2a'] },
  },
};

export const chaseOf = (defId) => CHASE[defId] ?? null;

/**
 * Installs every chase unit's own animation personality over its painter's.
 * Called once the painters are registered (main.js imports this last).
 */
export function installChaseAnimations() {
  for (const c of Object.values(CHASE)) {
    if (c.anim) registerAnim(c.art, c.anim);
    else if (c.wrap) {
      const base = animOf(c.art);
      if (base) registerAnim(c.art, (c.wrapped = c.wrap(base)));
    }
  }
}

/**
 * Renderer layer: draws each chase unit's idle, attack and special effects and
 * the kill marks of its eliminations.
 */
export class ChaseFx {
  constructor(renderer) {
    this.r = renderer;
  }

  attach(game, on) {
    this.game = game;
    on('death', (e) => {
      const c = e.killedBy && chaseOf(e.killedBy.def?.id);
      if (c && this.r.fx.density > 0.3) c.kill(this.r.fx, e);
    });
  }

  draw(ctx) {
    const g = this.game;
    const t = g.time;
    for (const u of g.units) {
      const c = chaseOf(u.def.id);
      if (!c) continue;
      ctx.save();
      const s = t - (u.lastSpecial ?? -99);
      const f = t - (u.lastFire ?? -99);
      if (s < 1.2) c.special(ctx, u, t, s / 1.2);
      else if (f < 0.25) c.attack(ctx, u, t, f / 0.25);
      else c.idle(ctx, u, t);
      ctx.restore();
    }
  }
}
