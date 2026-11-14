// Synthesized sound kit (WebAudio, no asset files).
//
// Mixing: every sound goes to one of three buses – sfx, ambience, weather –
// which feed a master gain and a compressor/limiter, so even hundreds of
// simultaneous shots can't clip. Combat call sites are additionally rate-
// limited by the AudioDirector so massive waves never become noise.
// Everything is a no-op until the context is unlocked by a user gesture, and
// while muted.

let ctx = null;
let master = null;
let buses = null;
let muted = false;
const noiseCache = new Map();

export const MIX = { master: 0.55, sfx: 0.8, ambience: 0.35, weather: 0.5 };

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
      for (const name of ['sfx', 'ambience', 'weather']) {
        const g = ctx.createGain();
        g.gain.value = MIX[name];
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

function bus(name = 'sfx') {
  return buses?.[name] ?? master;
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
  tone('square', 1400 * pitch, 500 * pitch, 0.05, 0.22);
  burst(0.03, 0.18, 'highpass', 3000);
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
  o.connect(f).connect(g).connect(bus());
  o.start(t);
  o.stop(t + duration + 0.15);
}

/** Two-tone alert; `long` adds a third rise for the rarest results. */
export function alarm(long = false) {
  for (let i = 0; i < (long ? 4 : 2); i++) tone('triangle', 620, 880, 0.22, 0.16, 'sfx', i * 0.28);
}

/** Air rushing as the crate falls. */
export function whoosh(duration = 0.4) {
  burst(duration, 0.2, 'bandpass', 400, 2400, 1.5);
}

/** Heavy landing. Weight scales with rarity. */
export function thud(weight = 1) {
  tone('sine', 120, 38, 0.3 + 0.1 * weight, 0.5 + 0.2 * weight);
  burst(0.25, 0.35, 'lowpass', 500);
}

/** Reveal sting: more notes and a higher top note for rarer tiers. */
export function sting(tier = 1, rare = false) {
  const scale = [0, 4, 7, 12, 16, 19, 24];
  const notes = scale.slice(0, Math.min(scale.length, 2 + Math.min(5, tier - 1) + (rare ? 1 : 0)));
  const base = 196 * Math.pow(2, Math.min(7, tier - 1) / 12);
  notes.forEach((semi, i) => tone(i === notes.length - 1 ? 'triangle' : 'sine', base * Math.pow(2, semi / 12), base * Math.pow(2, semi / 12), 0.5 + tier * 0.08 + (rare ? 0.8 : 0), 0.13, 'sfx', i * (rare ? 0.11 : 0.06)));
  if (rare) tone('sine', base / 2, base / 2, 2.2, 0.16, 'sfx', 0); // a low drone under the fanfare
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
};

/** Piercing lines, sky strikes and blessings (Circle Pack 2 abilities). */
export function pierce(kind, v = 1) {
  if (kind === 'moonbeam') tone('sine', 900, 1600, 0.45, 0.06 * v);
  else if (kind === 'gear') (tone('sawtooth', 300, 800, 0.35, 0.04 * v), burst(0.3, 0.04 * v, 'bandpass', 1500, 2500, 3));
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

export function bossRoar() {
  tone('sawtooth', 70, 45, 1.2, 0.18);
  burst(1.0, 0.15, 'lowpass', 300, 120);
}

// ---------------------------------------------------------------- loops

/**
 * Starts a looping layer and returns a handle with stop(). Layers:
 *   rain, wind, storm, aurora, nova       – weather bus
 *   forest, volcanic, frozen, ruins, sky, mechanical – ambience bus
 */
export function loop(name) {
  const c = ac();
  if (!c) return { stop() {} };
  const out = ['rain', 'wind', 'storm', 'aurora', 'nova'].includes(name) ? 'weather' : 'ambience';
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
