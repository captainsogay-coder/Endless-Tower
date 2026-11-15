// Synthesized sound kit (WebAudio, no asset files).
//
// Mixing: every sound goes to one of five buses – sfx, ambience, weather,
// music, ui – which feed a master gain and a compressor/limiter, so even hundreds of
// simultaneous shots can't clip. Combat call sites are additionally rate-
// limited by the AudioDirector so massive waves never become noise.
// Everything is a no-op until the context is unlocked by a user gesture, and
// while muted.

let ctx = null;
let master = null;
let buses = null;
let muted = false;
const noiseCache = new Map();

export const MIX = { master: 0.55, sfx: 0.8, ambience: 0.35, weather: 0.5, music: 0.32, ui: 0.8 };
/**
 * Player-facing channels: volume 0..1 and mute, applied on top of the base mix.
 * sfx = combat, ambient = realm + weather, ui = menus and summoning, music.
 */
const CHANNEL = { sfx: { v: 1, mute: false }, ambient: { v: 1, mute: false }, music: { v: 1, mute: false }, ui: { v: 1, mute: false } };
const channelOf = (busName) => (busName === 'ambience' || busName === 'weather' ? 'ambient' : busName);
const busGain = (name) => {
  const ch = CHANNEL[channelOf(name)];
  return ch.mute ? 0 : MIX[name] * ch.v;
};

function ac() {
  if (!ctx) {
    const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!AC) return null;
    try {
      ctx = new AC();
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -18;
      comp.knee.value = 12;
      comp.ratio.value = 6;
      comp.attack.value = 0.003;
      comp.release.value = 0.2;
      master = ctx.createGain();
      master.gain.value = muted ? 0 : MIX.master;
      master.connect(comp).connect(ctx.destination);
      buses = {};
      for (const name of ['sfx', 'ambience', 'weather', 'music', 'ui']) {
        const g = ctx.createGain();
        g.gain.value = busGain(name);
        g.connect(master);
        buses[name] = g;
      }
    } catch {
      return null;
    }
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

/** Call from a user gesture so browsers allow audio. */
export function unlock() {
  return !!ac();
}

export const ready = () => !!ctx && ctx.state === 'running' && !muted;

export function setMuted(m) {
  muted = !!m;
  if (master) master.gain.setTargetAtTime(muted ? 0 : MIX.master, ctx.currentTime, 0.05);
}
export const isMuted = () => muted;

/** Sets a player channel ('music' | 'sfx' | 'ambient' | 'ui'): volume 0..1 and mute. */
export function setChannel(name, volume, mute = false) {
  if (!CHANNEL[name]) return;
  CHANNEL[name].v = Math.min(1, Math.max(0, Number(volume) || 0));
  CHANNEL[name].mute = !!mute;
  if (!buses) return;
  for (const b of Object.keys(buses)) if (channelOf(b) === name) buses[b].gain.setTargetAtTime(busGain(b), ctx.currentTime, 0.08);
}
export const channelAudible = (name) => !muted && !CHANNEL[name].mute && CHANNEL[name].v > 0;
/** The audio context, for the music engine (null until unlocked). */
export const audioContext = () => ctx;
export const musicBus = () => buses?.music ?? null;

let forced = null;
function bus(name = 'sfx') {
  // music stays on its own bus; everything else may be redirected (summoning → ui)
  return buses?.[forced && name !== 'music' ? forced : name] ?? master;
}
/** Runs `fn` with every sound it makes routed to the UI/summoning bus (summon cinematics reuse combat sounds). */
export function asUi(fn) {
  const prev = forced;
  forced = 'ui';
  try {
    return fn();
  } finally {
    forced = prev;
  }
}

function noise(seconds) {
  const c = ctx;
  const key = Math.round(seconds * 10);
  let b = noiseCache.get(key);
  if (!b) {
    b = c.createBuffer(1, Math.max(1, Math.floor(c.sampleRate * seconds)), c.sampleRate);
    const d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    noiseCache.set(key, b);
  }
  return b;
}

function env(g, t, a, peak, d) {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + a);
  g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
}

function tone(type, f0, f1, dur, peak, out = 'sfx', delay = 0) {
  const c = ac();
  if (!c || muted) return;
  const t = c.currentTime + delay;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f0, t);
  if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
  env(g, t, Math.min(0.01, dur / 4), peak, dur);
  o.connect(g).connect(bus(out));
  o.start(t);
  o.stop(t + dur + 0.05);
}

function burst(dur, peak, filterType, f0, f1 = f0, q = 1, out = 'sfx', delay = 0) {
  const c = ac();
  if (!c || muted) return;
  const t = c.currentTime + delay;
  const n = c.createBufferSource();
  n.buffer = noise(Math.max(0.1, dur + 0.05));
  const f = c.createBiquadFilter();
  f.type = filterType;
  f.Q.value = q;
  f.frequency.setValueAtTime(f0, t);
  if (f1 !== f0) f.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  const g = c.createGain();
  env(g, t, 0.002, peak, dur);
  n.connect(f).connect(g).connect(bus(out));
  n.start(t);
  n.stop(t + dur + 0.05);
}

// ---------------------------------------------------------------- UI & summoning

/** Mechanical ring lock: a short metallic click. */
export function click(pitch = 1) {
  tone('square', 1400 * pitch, 500 * pitch, 0.05, 0.22, 'ui');
  burst(0.03, 0.18, 'highpass', 3000, 3000, 1, 'ui');
}

/** Rising electrical hum used during the anticipation phase. */
export function hum(duration = 1, intensity = 1) {
  const c = ac();
  if (!c || muted) return;
  const t = c.currentTime;
  const o = c.createOscillator();
  o.type = 'sawtooth';
  o.frequency.setValueAtTime(50, t);
  o.frequency.linearRampToValueAtTime(70 + 25 * intensity, t + duration);
  const f = c.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.setValueAtTime(200, t);
  f.frequency.exponentialRampToValueAtTime(900 + 900 * intensity, t + duration);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.12, t + duration * 0.8);
  g.gain.exponentialRampToValueAtTime(0.0001, t + duration + 0.1);
  o.connect(f).connect(g).connect(bus('ui'));
  o.start(t);
  o.stop(t + duration + 0.15);
}

/** Two-tone alert; `long` adds a third rise for the rarest results. */
export function alarm(long = false) {
  for (let i = 0; i < (long ? 4 : 2); i++) tone('triangle', 620, 880, 0.22, 0.16, 'ui', i * 0.28);
}

/** Air rushing as the crate falls. */
export function whoosh(duration = 0.4) {
  burst(duration, 0.2, 'bandpass', 400, 2400, 1.5, 'ui');
}

/** Heavy landing. Weight scales with rarity. */
export function thud(weight = 1) {
  tone('sine', 120, 38, 0.3 + 0.1 * weight, 0.5 + 0.2 * weight, 'ui');
  burst(0.25, 0.35, 'lowpass', 500, 500, 1, 'ui');
}

/** Reveal sting: more notes and a higher top note for rarer tiers. */
export function sting(tier = 1, rare = false) {
  const scale = [0, 4, 7, 12, 16, 19, 24];
  const notes = scale.slice(0, Math.min(scale.length, 2 + Math.min(5, tier - 1) + (rare ? 1 : 0)));
  const base = 196 * Math.pow(2, Math.min(7, tier - 1) / 12);
  notes.forEach((semi, i) => tone(i === notes.length - 1 ? 'triangle' : 'sine', base * Math.pow(2, semi / 12), base * Math.pow(2, semi / 12), 0.5 + tier * 0.08 + (rare ? 0.8 : 0), 0.13, 'ui', i * (rare ? 0.11 : 0.06)));
  if (rare) tone('sine', base / 2, base / 2, 2.2, 0.16, 'ui', 0); // a low drone under the fanfare
}

/**
 * The rare-summon stinger: the moment a chase (or super chase) unit is revealed.
 * A short musical phrase on the music engine (registered by music.js) plus a
 * bright shimmer on the UI bus; falls back to the shimmer alone.
 */
let stingerHook = null;
export function setStingerHook(fn) {
  stingerHook = fn;
}
export function summonStinger(rarity = 'chase') {
  if (rarity !== 'chase' && rarity !== 'super') return;
  stingerHook?.(rarity);
  const n = rarity === 'super' ? 8 : 5;
  for (let i = 0; i < n; i++) tone('sine', 1568 * Math.pow(2, (i * 2) / 12), 1568 * Math.pow(2, (i * 2) / 12), 0.6, 0.03, 'ui', 0.1 + i * 0.07);
}

/** Crisp UI tick for buttons. */
export function tick() {
  click(1.6);
}

// ---------------------------------------------------------------- combat

/** One weapon report. `kind` is the projectile kind; `v` 0..1 scales loudness. */
export function shot(kind, v = 1) {
  switch (kind) {
    case 'pebble':
      tone('triangle', 900, 500, 0.04, 0.05 * v);
      break;
    case 'bullet':
      burst(0.05, 0.12 * v, 'highpass', 1800);
      tone('square', 220, 90, 0.04, 0.05 * v);
      break;
    case 'grenade':
      tone('sine', 160, 70, 0.12, 0.22 * v);
      burst(0.08, 0.08 * v, 'bandpass', 600, 300, 2);
      break;
    case 'shell':
    case 'siege':
      tone('sine', 110, 40, 0.3, 0.32 * v);
      burst(0.25, 0.24 * v, 'lowpass', 1200, 200);
      break;
    case 'artillery':
      // incoming whistle
      tone('sine', 1400, 500, 0.6, 0.05 * v);
      break;
    case 'drone':
    case 'explosive-drone':
      tone('sawtooth', 180, 240, 0.25, 0.04 * v);
      burst(0.2, 0.05 * v, 'bandpass', 1500, 2500, 6);
      break;
    case 'revolver':
    case 'golden':
      // a sharper crack with a short ring: frontier six-shooter
      burst(0.06, 0.14 * v, 'highpass', 2200);
      tone('square', 300, 120, 0.05, 0.05 * v);
      if (kind === 'golden') tone('triangle', 1600, 1500, 0.25, 0.04 * v);
      break;
    case 'bottle':
    case 'dynamite':
      tone('triangle', 500, 900, 0.12, 0.04 * v); // whoosh of a throw
      break;
    case 'card':
      burst(0.03, 0.06 * v, 'bandpass', 3500, 3000, 4); // flick
      break;
    case 'chip':
      tone('triangle', 2400, 2300, 0.05, 0.04 * v); // clink
      break;
    case 'sequin':
      tone('sine', 1200, 1800, 0.12, 0.04 * v);
      break;
    case 'missile':
    case 'icbm':
    case 'warhead':
    case 'antimatter':
      burst(0.4, 0.1 * v, 'lowpass', 1600, 400); // launch roar
      tone('sawtooth', 90, 60, 0.35, 0.04 * v);
      break;
    case 'slash':
    case 'thrust':
    case 'smite':
      burst(0.07, 0.07 * v, 'bandpass', 2600, 900, 2); // swish
      if (kind === 'smite') tone('triangle', 900, 1200, 0.2, 0.05 * v);
      break;
    case 'stone':
    case 'arrow':
      burst(0.08, 0.05 * v, 'bandpass', 1800, 1200, 3);
      break;
    case 'xbolt':
    case 'ballista':
      tone('triangle', kind === 'ballista' ? 160 : 260, kind === 'ballista' ? 90 : 140, 0.12, 0.08 * v); // string twang
      break;
    case 'boulder':
    case 'trebuchet':
      tone('sine', 120, 60, 0.25, 0.08 * v); // creak and thump of the arm
      burst(0.15, 0.05 * v, 'lowpass', 600, 200);
      break;
    case 'bombball':
      tone('triangle', 500, 900, 0.12, 0.04 * v);
      break;
    default: {
      const sp = PACK2_SHOTS[kind];
      if (sp) sp(v);
      else burst(0.05, 0.08 * v, 'highpass', 1500);
    }
  }
}

/**
 * Circle Pack 2 attack sounds, one recipe per projectile kind (all synthesized):
 * throws whoosh, clockwork clicks and ticks, jungle darts puff, sky bolts hiss,
 * starlight chimes.
 */
const PACK2_SHOTS = {
  parcel: (v) => tone('triangle', 420, 760, 0.1, 0.035 * v),
  pan: (v) => tone('triangle', 380, 700, 0.1, 0.035 * v),
  trinket: (v) => tone('sine', 1300, 1700, 0.07, 0.03 * v),
  inkshot: (v) => burst(0.04, 0.05 * v, 'bandpass', 1200, 900, 3),
  coinshot: (v) => tone('sine', 1500, 1900, 0.09, 0.035 * v),
  rivet: (v) => (burst(0.03, 0.08 * v, 'highpass', 2600), tone('square', 600, 400, 0.03, 0.025 * v)),
  spring: (v) => tone('sawtooth', 300, 900, 0.07, 0.03 * v),
  steamfist: (v) => (burst(0.18, 0.07 * v, 'lowpass', 900, 300), tone('sine', 90, 50, 0.15, 0.12 * v)),
  clockhand: (v) => tone('square', 1800, 1800, 0.02, 0.03 * v),
  piston: (v) => (burst(0.05, 0.1 * v, 'bandpass', 700, 400, 2), tone('square', 180, 120, 0.05, 0.04 * v)),
  vine: (v) => burst(0.08, 0.04 * v, 'bandpass', 900, 500, 2),
  dart: (v) => burst(0.03, 0.05 * v, 'bandpass', 2500, 1800, 3),
  claw: (v) => burst(0.06, 0.08 * v, 'highpass', 1800, 3000),
  spore: (v) => burst(0.12, 0.04 * v, 'lowpass', 800, 400),
  seedpod: (v) => tone('sine', 220, 120, 0.15, 0.06 * v),
  leaf: (v) => burst(0.06, 0.04 * v, 'bandpass', 1800, 2400, 2),
  thornburst: (v) => (burst(0.1, 0.05 * v, 'bandpass', 1000, 600, 2), tone('sine', 300, 180, 0.12, 0.04 * v)),
  windbolt: (v) => burst(0.09, 0.05 * v, 'bandpass', 2200, 3400, 2),
  gale: (v) => burst(0.16, 0.07 * v, 'bandpass', 1400, 2600, 1.5),
  feather: (v) => burst(0.06, 0.05 * v, 'bandpass', 2600, 2000, 2),
  spark: (v) => burst(0.04, 0.07 * v, 'highpass', 3200),
  stormball: (v) => (burst(0.2, 0.06 * v, 'lowpass', 1200, 300), tone('sine', 140, 70, 0.2, 0.06 * v)),
  starbolt: (v) => tone('sine', 1760, 2200, 0.12, 0.03 * v),
  comet: (v) => tone('triangle', 1200, 300, 0.4, 0.04 * v),
  moonray: (v) => tone('sine', 2200, 2000, 0.15, 0.03 * v),
  shade: (v) => tone('sine', 300, 180, 0.15, 0.04 * v),
  void: (v) => tone('sine', 120, 60, 0.4, 0.06 * v),
  // ---- Circle Pack 3
  // Royal Academy: wood knocks, steel rings, a clean bowstring
  trainingsword: (v) => (tone('square', 520, 380, 0.04, 0.03 * v), burst(0.03, 0.04 * v, 'bandpass', 900, 700, 3)),
  spearjab: (v) => burst(0.05, 0.06 * v, 'bandpass', 1600, 1100, 2),
  blunt: (v) => burst(0.05, 0.05 * v, 'bandpass', 1300, 900, 3),
  rapier: (v) => (tone('sine', 2600, 3200, 0.06, 0.03 * v), burst(0.03, 0.05 * v, 'highpass', 3500)),
  baton: (v) => tone('triangle', 480, 360, 0.06, 0.035 * v),
  saber: (v) => (tone('sine', 1900, 2400, 0.1, 0.03 * v), burst(0.05, 0.06 * v, 'highpass', 2800)),
  graduate: (v) => (tone('sine', 1320, 1980, 0.25, 0.05 * v), burst(0.08, 0.08 * v, 'highpass', 2400)),
  // Frostbound Legion: brittle ice and wind
  icespear: (v) => (burst(0.05, 0.06 * v, 'bandpass', 2400, 1600, 2), tone('sine', 2600, 2200, 0.05, 0.02 * v)),
  icearrow: (v) => burst(0.05, 0.05 * v, 'bandpass', 2800, 2200, 3),
  freezearrow: (v) => (tone('sine', 3200, 1800, 0.25, 0.04 * v), burst(0.12, 0.05 * v, 'highpass', 4000)),
  frostaxe: (v) => (burst(0.08, 0.09 * v, 'bandpass', 1400, 2400, 1.5), tone('sine', 140, 90, 0.1, 0.06 * v)),
  frostorb: (v) => tone('sine', 1500, 900, 0.18, 0.035 * v),
  icesword: (v) => (tone('sine', 2200, 2600, 0.12, 0.03 * v), burst(0.05, 0.06 * v, 'highpass', 3000)),
  hailstone: (v) => (burst(0.2, 0.06 * v, 'bandpass', 2000, 900, 1.5), tone('sine', 1100, 500, 0.3, 0.04 * v)),
  // Arcane Library: page flutters and chimes
  pagebolt: (v) => burst(0.06, 0.04 * v, 'bandpass', 3000, 2400, 3),
  rune: (v) => tone('sine', 1046, 1568, 0.12, 0.035 * v),
  spellcut: (v) => (burst(0.04, 0.05 * v, 'highpass', 3000), tone('sine', 1760, 1760, 0.05, 0.02 * v)),
  spellstrike: (v) => (tone('sine', 880, 1760, 0.2, 0.05 * v), burst(0.08, 0.07 * v, 'highpass', 2600)),
  arcanebolt: (v) => tone('triangle', 1318, 1760, 0.1, 0.035 * v),
  voidbolt: (v) => (tone('sine', 200, 110, 0.25, 0.05 * v), tone('sine', 300, 165, 0.25, 0.025 * v)),
  // Titan Foundry: weight and heat
  ingot: (v) => (tone('sine', 110, 70, 0.14, 0.09 * v), burst(0.06, 0.06 * v, 'lowpass', 900, 400)),
  forgehammer: (v) => (tone('square', 220, 180, 0.06, 0.05 * v), tone('sine', 1760, 1700, 0.3, 0.02 * v), burst(0.1, 0.08 * v, 'lowpass', 1200, 300)),
  magma: (v) => (burst(0.25, 0.06 * v, 'lowpass', 600, 200, 0.8), tone('sine', 90, 60, 0.3, 0.06 * v)),
  steelfist: (v) => (tone('sine', 70, 40, 0.25, 0.12 * v), burst(0.12, 0.08 * v, 'lowpass', 700, 200)),
  titanshell: (v) => (tone('sine', 80, 45, 0.3, 0.1 * v), burst(0.15, 0.09 * v, 'lowpass', 1100, 250)),
  rivetburst: (v) => (burst(0.03, 0.08 * v, 'highpass', 2600), tone('square', 500, 380, 0.03, 0.025 * v)),
  // ---- The Ghost: steel draws and cuts, bowstrings, a heavy club, thrown kunai
  katana: (v) => (burst(0.06, 0.07 * v, 'bandpass', 3200, 1800, 2), tone('sine', 2900, 3300, 0.05, 0.015 * v)),
  katanaheavy: (v) => (burst(0.12, 0.1 * v, 'bandpass', 2600, 900, 1.5), tone('sine', 2400, 2800, 0.2, 0.025 * v)),
  combo: (v) => (burst(0.04, 0.06 * v, 'bandpass', 3600, 2200, 2), tone('sine', 3100, 3500, 0.04, 0.012 * v)),
  heavysaber: (v) => (burst(0.12, 0.1 * v, 'bandpass', 2000, 800, 1.5), tone('sine', 1900, 2300, 0.15, 0.025 * v)),
  horsebow: (v) => (tone('triangle', 240, 130, 0.08, 0.06 * v), burst(0.06, 0.04 * v, 'bandpass', 2200, 1500, 3)),
  powershot: (v) => (tone('triangle', 200, 100, 0.14, 0.09 * v), burst(0.12, 0.06 * v, 'bandpass', 2600, 1400, 2)),
  firearrow: (v) => (tone('triangle', 230, 120, 0.08, 0.05 * v), burst(0.25, 0.04 * v, 'bandpass', 900, 500, 0.8)),
  precision: (v) => (tone('triangle', 280, 140, 0.1, 0.07 * v), tone('sine', 2200, 2200, 0.15, 0.02 * v)),
  club: (v) => (tone('sine', 120, 60, 0.15, 0.1 * v), burst(0.08, 0.07 * v, 'lowpass', 700, 250)),
  kunai: (v) => burst(0.03, 0.06 * v, 'highpass', 3800, 4500),
  kunaivolley: (v) => [0, 0.04, 0.08].forEach((d) => burst(0.03, 0.06 * v, 'highpass', 3800, 4500, 1, 'sfx', d)),
  turncoat: (v) => (burst(0.05, 0.08 * v, 'bandpass', 3400, 2000, 2), tone('sine', 2600, 2200, 0.06, 0.02 * v)),
  khanvolley: (v) => [0, 0.05, 0.1].forEach((d) => (tone('triangle', 210, 120, 0.07, 0.04 * v, 'sfx', d), burst(0.05, 0.03 * v, 'bandpass', 2000, 1400, 3, 'sfx', d))),
  ghostblade: (v) => (burst(0.05, 0.08 * v, 'highpass', 3600, 5000), tone('sine', 1760, 2350, 0.08, 0.02 * v)),
  ghoststance: (v) => (burst(0.07, 0.1 * v, 'highpass', 3000, 5200), tone('sine', 1568, 2093, 0.12, 0.03 * v), burst(0.15, 0.03 * v, 'bandpass', 500, 900, 2)),
};

/** Circle Pack 3 chase abilities: short, distinct stingers (never longer than the effect). */
export function chaseCast(kind, v = 1) {
  switch (kind) {
    case 'blizzard':
      burst(1.6, 0.07 * v, 'bandpass', 900, 2200, 0.8);
      tone('sine', 1568, 1046, 1.2, 0.03 * v);
      break;
    case 'forbidden':
      tone('sine', 110, 55, 1.4, 0.08 * v);
      tone('sine', 165, 82, 1.4, 0.05 * v);
      burst(0.9, 0.05 * v, 'bandpass', 3000, 1200, 2);
      break;
    // ---- The Ghost
    case 'frenzy': // war drums
      [0, 0.18, 0.36, 0.5, 0.62].forEach((d, i) => tone('sine', 90, 45, 0.22, (0.1 + i * 0.01) * v, 'sfx', d));
      break;
    case 'flurry':
      [0, 0.07, 0.14, 0.21, 0.28].forEach((d) => burst(0.04, 0.07 * v, 'bandpass', 3400, 2000, 2, 'sfx', d));
      break;
    case 'lordtechnique':
      tone('sine', 98, 98, 0.6, 0.06 * v);
      burst(0.35, 0.1 * v, 'bandpass', 2600, 5000, 1.5, 'sfx', 0.25);
      break;
    case 'skyofarrows': // a horn, then the hiss of hundreds of arrows
      tone('sawtooth', 110, 104, 0.8, 0.06 * v);
      burst(1.2, 0.07 * v, 'bandpass', 3000, 1200, 1.5, 'sfx', 0.8);
      break;
    case 'ghoststance':
      burst(0.8, 0.05 * v, 'bandpass', 400, 1400, 2);
      tone('sine', 1047, 1047, 0.6, 0.03 * v, 'sfx', 0.2);
      break;
    case 'ghosttechnique':
      tone('sine', 1568, 1568, 0.4, 0.025 * v);
      [0.25, 0.32, 0.39, 0.46, 0.53, 0.6].forEach((d) => burst(0.04, 0.07 * v, 'highpass', 3600, 5000, 1, 'sfx', d));
      break;
    case 'worldbreak-charge':
      tone('sawtooth', 40, 90, 2, 0.05 * v);
      burst(2, 0.05 * v, 'lowpass', 200, 500, 0.7);
      break;
    default:
      blessing(v);
  }
}
export function worldbreak(v = 1) {
  tone('sine', 55, 28, 1.4, 0.2 * v);
  burst(1.2, 0.14 * v, 'lowpass', 400, 60, 0.7);
}
export function freeze(v = 1) {
  tone('sine', 2800, 3600, 0.15, 0.03 * v);
  burst(0.1, 0.04 * v, 'highpass', 5000);
}

/** Piercing lines, sky strikes and blessings (Circle Pack 2 abilities). */
export function pierce(kind, v = 1) {
  if (kind === 'moonbeam') tone('sine', 900, 1600, 0.45, 0.06 * v);
  else if (kind === 'cavalry') {
    // a galloping charge: hoofbeats under a war cry
    for (let i = 0; i < 8; i++) tone('sine', 110, 60, 0.08, 0.07 * v, 'sfx', i * 0.09 + (i % 2) * 0.03);
    tone('sawtooth', 220, 180, 0.5, 0.025 * v);
  } else if (kind === 'gear') (tone('sawtooth', 300, 800, 0.35, 0.04 * v), burst(0.3, 0.04 * v, 'bandpass', 1500, 2500, 3));
  else burst(0.1, 0.07 * v, 'bandpass', 1800, 2800, 2);
}
export function zap(gold = false, v = 1) {
  burst(0.08, 0.12 * v, 'highpass', 2600);
  tone('square', gold ? 900 : 600, gold ? 300 : 200, 0.1, 0.035 * v);
}
export function blessing(v = 1) {
  tone('sine', 660, 990, 0.35, 0.05 * v);
  tone('sine', 990, 1320, 0.3, 0.035 * v, 'sfx', 0.08);
}

/** Coins: a bright little arpeggio (jackpots, bounties, payouts). */
export function coins(big = false, v = 1) {
  const n = big ? 6 : 3;
  for (let i = 0; i < n; i++) tone('triangle', 1320 * Math.pow(2, ((i * 4) % 12) / 12), 1320 * Math.pow(2, ((i * 4) % 12) / 12), 0.12, 0.05 * v, 'sfx', i * 0.05);
}

/** A slot-machine reel stopping. */
export function reelStop(pitch = 1) {
  burst(0.05, 0.1, 'bandpass', 900 * pitch, 900 * pitch, 3);
  tone('square', 440 * pitch, 440 * pitch, 0.06, 0.04);
}

/** A plane passing overhead. */
export function flyover(duration = 2) {
  burst(duration, 0.07, 'lowpass', 400, 900, 1);
  tone('sawtooth', 70, 55, duration, 0.025);
}

/** Gravity field: a falling, sucking tone. */
export function implode(duration = 3) {
  tone('sine', 300, 40, duration, 0.12);
  burst(duration, 0.05, 'bandpass', 2000, 200, 4);
}

/** Spinning revolver cylinder: fast clicks. */
export function cylinder(n = 6) {
  for (let i = 0; i < n; i++) burst(0.02, 0.06, 'highpass', 3000, 3000, 1, 'sfx', i * 0.06);
}

/** Explosion; size ~ blast radius in tiles. */
export function explosion(size = 1, v = 1) {
  const s = Math.min(4, Math.max(0.5, size));
  tone('sine', 90 / Math.sqrt(s), 30, 0.25 + 0.12 * s, (0.18 + 0.08 * s) * v);
  burst(0.2 + 0.1 * s, (0.18 + 0.05 * s) * v, 'lowpass', 1800 / s, 150);
}

/** Lightning: a sharp crack, then a rolling rumble. */
export function lightning() {
  burst(0.12, 0.45, 'highpass', 2500, 900);
  burst(1.6, 0.35, 'lowpass', 400, 60, 0.7, 'weather', 0.12);
  tone('sine', 60, 30, 1.4, 0.25, 'weather', 0.1);
}

/**
 * Chase Unit Standard: every chase unit's own special-ability sound
 * (keys referenced by src/render/chaseStandard.js; tests check each exists).
 */
export const CHASE_SFX = {
  heroStrike: (v) => (tone('triangle', 392, 784, 0.25, 0.06 * v), burst(0.08, 0.06 * v, 'bandpass', 1400, 2200, 2)),
  championFanfare: (v) => [523, 659, 784].forEach((f, i) => tone('sawtooth', f, f, 0.18, 0.035 * v, 'sfx', i * 0.09)),
  engineerBuild: (v) => [0, 0.12, 0.24].forEach((d) => (tone('square', 900, 700, 0.04, 0.03 * v, 'sfx', d), burst(0.04, 0.05 * v, 'bandpass', 2400, 2400, 4, 'sfx', d))),
  fortressSiren: (v) => tone('sawtooth', 330, 660, 0.6, 0.04 * v),
  highNoon: (v) => (tone('sine', 1760, 1760, 0.6, 0.02 * v), [0, 0.1, 0.2].forEach((d) => burst(0.05, 0.1 * v, 'highpass', 2000, 2000, 1, 'sfx', 0.35 + d))),
  diceRoll: (v) => [0, 0.06, 0.13, 0.21].forEach((d) => burst(0.03, 0.05 * v, 'bandpass', 3000, 3000, 5, 'sfx', d)),
  houseWheel: (v) => (Array.from({ length: 10 }, (_, i) => tone('square', 1200, 1200, 0.02, 0.02 * v, 'sfx', i * (0.05 + i * 0.008))), tone('sine', 784, 1047, 0.4, 0.05 * v, 'sfx', 0.9)),
  launchKlaxon: (v) => [0, 0.4].forEach((d) => tone('square', 440, 330, 0.3, 0.035 * v, 'sfx', d)),
  antimatterFold: (v) => (tone('sine', 900, 60, 1.2, 0.07 * v), tone('sine', 1200, 80, 1.2, 0.04 * v)),
  merchantVault: (v) => [1319, 1568, 2093, 2637].forEach((f, i) => tone('sine', f, f, 0.12, 0.035 * v, 'sfx', i * 0.06)),
  overdrive: (v) => (tone('sawtooth', 80, 320, 0.6, 0.05 * v), burst(0.6, 0.04 * v, 'bandpass', 600, 2400, 2)),
  wildHeart: (v) => (tone('sine', 110, 110, 0.9, 0.08 * v), burst(0.7, 0.04 * v, 'bandpass', 800, 1400, 1)),
  zenithEye: (v) => (tone('sine', 220, 880, 0.5, 0.05 * v), burst(0.2, 0.08 * v, 'highpass', 3000, 3000, 1, 'sfx', 0.45)),
  eventHorizon: (v) => (tone('sine', 55, 30, 1.4, 0.12 * v), tone('triangle', 2400, 600, 1.2, 0.02 * v)),
  examBell: (v) => (tone('sine', 880, 880, 1.2, 0.05 * v), tone('sine', 1320, 1320, 1, 0.025 * v)),
  winterHowl: (v) => (burst(1.2, 0.07 * v, 'bandpass', 400, 1600, 3), tone('sine', 1568, 1046, 0.9, 0.025 * v)),
  chainsBreak: (v) => [0, 0.08, 0.15].forEach((d) => (tone('square', 2400, 1600, 0.05, 0.03 * v, 'sfx', d), burst(0.05, 0.06 * v, 'highpass', 3500, 3500, 1, 'sfx', d))),
  worldbreakRumble: (v) => (tone('sine', 40, 30, 1.6, 0.14 * v), burst(1.4, 0.06 * v, 'lowpass', 200, 120, 0.7)),
  turncoat: (v) => [0, 0.07, 0.14, 0.21, 0.28].forEach((d, i) => (burst(0.04, 0.07 * v, 'highpass', 3200 + i * 200, 3200, 1, 'sfx', d), tone('sine', 2600 - i * 200, 2400, 0.05, 0.02 * v, 'sfx', d))),
  lordsCut: (v) => (tone('sine', 98, 98, 0.8, 0.07 * v), burst(0.3, 0.08 * v, 'bandpass', 3000, 5000, 2, 'sfx', 0.35), tone('triangle', 1175, 1175, 0.8, 0.03 * v, 'sfx', 0.35)),
  khanHorn: (v) => (tone('sawtooth', 110, 104, 1, 0.07 * v), tone('sawtooth', 165, 156, 1, 0.04 * v), [0, 0.3, 0.6, 0.9].forEach((d) => tone('sine', 70, 40, 0.18, 0.12 * v, 'sfx', d))),
  ghostWind: (v) => (burst(1, 0.05 * v, 'bandpass', 500, 2000, 3), tone('sine', 1047, 1047, 0.5, 0.03 * v, 'sfx', 0.3), tone('sine', 1568, 1568, 0.6, 0.02 * v, 'sfx', 0.45), burst(0.05, 0.09 * v, 'highpass', 4000, 4000, 1, 'sfx', 0.7)),
};
export function chaseSignature(key, v = 1) {
  CHASE_SFX[key]?.(v);
}

/** A boss is about to use its ability: a short low horn (the visual telegraph runs at the same time). */
export function bossWarn(v = 1) {
  tone('sawtooth', 110, 104, 0.5, 0.05 * v);
  tone('sawtooth', 165, 156, 0.5, 0.03 * v);
}
/** Boss defeated: a rising brass fanfare, under two seconds. */
export function bossFanfare(v = 1) {
  const notes = [392, 494, 587, 784];
  notes.forEach((f, i) => {
    tone('sawtooth', f, f, 0.28, 0.05 * v, 'sfx', i * 0.12);
    tone('triangle', f * 2, f * 2, 0.3, 0.02 * v, 'sfx', i * 0.12);
  });
  tone('sine', 98, 49, 1.2, 0.12 * v);
}
/** A map event begins: a soft two-note chime (gold for rewards and trades). */
export function eventChime(kind = 'cosmetic', v = 1) {
  const base = kind === 'modifier' ? 660 : kind === 'cosmetic' ? 523 : 784;
  tone('sine', base, base, 0.5, 0.05 * v, 'ambience');
  tone('sine', base * 1.5, base * 1.5, 0.6, 0.04 * v, 'ambience', 0.14);
}
export function meteor(v = 1) {
  burst(0.7, 0.04 * v, 'bandpass', 3000, 600, 1.2, 'ambience');
}

/** Starfall: a falling whistle and a bright strike. */
export function starStrike(v = 1) {
  tone('sine', 2600, 700, 0.35, 0.03 * v);
  burst(0.2, 0.08 * v, 'highpass', 2400, 1200, 1, 'sfx', 0.3);
  tone('sine', 1760, 1760, 0.4, 0.02 * v, 'sfx', 0.3);
}
/** Twilight of Gods: a deep, divine pulse. */
export function celestialPulse(v = 1) {
  tone('sine', 82, 55, 0.9, 0.09 * v);
  tone('sine', 330, 330, 0.8, 0.02 * v);
  tone('sine', 495, 495, 0.8, 0.015 * v);
}

export function bossRoar() {
  tone('sawtooth', 70, 45, 1.2, 0.18);
  burst(1.0, 0.15, 'lowpass', 300, 120);
}

// ---------------------------------------------------------------- loops

/**
 * Starts a looping layer and returns a handle with stop(). Layers:
 *   rain, wind, storm, aurora, nova, ghastly, starfall, twilight – weather bus
 *   forest, volcanic, frozen, ruins, sky, mechanical – ambience bus
 */
export function loop(name) {
  const c = ac();
  if (!c) return { stop() {} };
  const out = ['rain', 'wind', 'storm', 'aurora', 'nova', 'ghastly', 'starfall', 'twilight'].includes(name) ? 'weather' : 'ambience';
  const g = c.createGain();
  g.gain.value = 0.0001;
  g.connect(bus(out));
  const nodes = [];
  const timers = [];
  const t = c.currentTime;
  const noiseLayer = (type, freq, q, level, lfoRate = 0, lfoDepth = 0) => {
    const n = c.createBufferSource();
    n.buffer = noise(2);
    n.loop = true;
    const f = c.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    const lg = c.createGain();
    lg.gain.value = level;
    n.connect(f).connect(lg).connect(g);
    n.start(t);
    nodes.push(n);
    if (lfoRate) {
      const lfo = c.createOscillator();
      const lfoGain = c.createGain();
      lfo.frequency.value = lfoRate;
      lfoGain.gain.value = lfoDepth;
      lfo.connect(lfoGain).connect(f.frequency);
      lfo.start(t);
      nodes.push(lfo);
    }
  };
  const padLayer = (freqs, type, level, vib = 0.2) => {
    for (const fr of freqs) {
      const o = c.createOscillator();
      o.type = type;
      o.frequency.value = fr;
      const v = c.createOscillator();
      const vg = c.createGain();
      v.frequency.value = vib + Math.random() * 0.2;
      vg.gain.value = fr * 0.004;
      v.connect(vg).connect(o.frequency);
      const lg = c.createGain();
      lg.gain.value = level;
      o.connect(lg).connect(g);
      o.start(t);
      v.start(t);
      nodes.push(o, v);
    }
  };
  const every = (min, max, fn) => {
    const schedule = () => timers.push(setTimeout(() => {
      if (!muted) fn();
      schedule();
    }, (min + Math.random() * (max - min)) * 1000));
    schedule();
  };
  let level = 0.5;
  switch (name) {
    case 'rain':
      noiseLayer('highpass', 2500, 0.5, 0.35);
      noiseLayer('bandpass', 900, 0.8, 0.25);
      level = 0.6;
      break;
    case 'wind':
      noiseLayer('bandpass', 500, 1.2, 0.6, 0.15, 300);
      level = 0.55;
      break;
    case 'storm':
      noiseLayer('highpass', 2200, 0.5, 0.45);
      noiseLayer('lowpass', 180, 0.7, 0.5);
      level = 0.7;
      break;
    case 'aurora':
      padLayer([220, 277.2, 329.6, 440], 'sine', 0.05, 0.15);
      level = 0.6;
      break;
    case 'nova':
      padLayer([261.6, 392, 523.2], 'triangle', 0.04, 0.3);
      noiseLayer('highpass', 6000, 0.5, 0.06);
      level = 0.6;
      break;
    case 'ghastly': // a hollow, howling wind with rustling leaves
      noiseLayer('bandpass', 380, 3, 0.5, 0.09, 180);
      noiseLayer('bandpass', 1400, 1.5, 0.12, 0.2, 500);
      every(4, 9, () => burst(0.5, 0.025, 'bandpass', 3000, 2000, 2, 'weather'));
      level = 0.55;
      break;
    case 'starfall': // a still night: a soft shimmer and distant twinkles
      noiseLayer('highpass', 7000, 0.5, 0.04);
      padLayer([392, 587.3], 'sine', 0.025, 0.1);
      every(1.5, 4, () => tone('sine', 2093 + Math.random() * 1500, 2093, 0.3, 0.012, 'weather'));
      level = 0.5;
      break;
    case 'twilight': // a low, sacred drone
      padLayer([55, 82.4, 110], 'sine', 0.06, 0.05);
      padLayer([220, 329.6], 'triangle', 0.015, 0.1);
      noiseLayer('lowpass', 300, 0.7, 0.08, 0.04, 80);
      level = 0.55;
      break;
    case 'forest':
      noiseLayer('bandpass', 700, 0.6, 0.12, 0.08, 200);
      every(2, 6, () => {
        const f = 2400 + Math.random() * 1400;
        for (let i = 0; i < 2 + Math.floor(Math.random() * 3); i++) tone('sine', f, f * 1.25, 0.07, 0.03, 'ambience', i * 0.12);
      });
      break;
    case 'volcanic':
      noiseLayer('lowpass', 120, 0.7, 0.6, 0.05, 40);
      every(5, 12, () => burst(0.6, 0.06, 'lowpass', 300, 80, 0.7, 'ambience'));
      break;
    case 'frozen':
      noiseLayer('bandpass', 600, 1.4, 0.4, 0.1, 350);
      break;
    case 'ruins':
      noiseLayer('bandpass', 400, 1, 0.2, 0.05, 150);
      every(6, 14, () => tone('sine', 880, 880, 1.5, 0.012, 'ambience'));
      break;
    case 'sky':
      noiseLayer('bandpass', 800, 0.8, 0.3, 0.07, 400);
      break;
    case 'mechanical':
      padLayer([55, 110], 'sawtooth', 0.02, 0.05);
      every(3, 8, () => {
        tone('square', 300 + Math.random() * 300, 200, 0.05, 0.03, 'ambience');
        burst(0.05, 0.04, 'bandpass', 2000, 2000, 4, 'ambience');
      });
      break;
    default:
  }
  g.gain.exponentialRampToValueAtTime(level, t + 1.5);
  return {
    stop(fade = 1.2) {
      for (const id of timers) clearTimeout(id);
      const now = c.currentTime;
      g.gain.cancelScheduledValues(now);
      g.gain.setValueAtTime(Math.max(0.0001, g.gain.value), now);
      g.gain.exponentialRampToValueAtTime(0.0001, now + fade);
      for (const n of nodes) {
        try {
          n.stop(now + fade + 0.05);
        } catch {
          /* already stopped */
        }
      }
      setTimeout(() => g.disconnect(), (fade + 0.2) * 1000);
    },
  };
}
