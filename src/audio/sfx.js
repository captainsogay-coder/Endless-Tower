// Small synthesized sound kit (WebAudio, no asset files). Created lazily on
// first user gesture; every call is a no-op when muted or unsupported.

let ctx = null;
let master = null;
let muted = false;

function ac() {
  if (muted) return null;
  if (!ctx) {
    const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!AC) return null;
    try {
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);
    } catch {
      return null;
    }
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

export function setMuted(m) {
  muted = !!m;
  if (master) master.gain.value = muted ? 0 : 0.5;
}
export const isMuted = () => muted;

function noiseBuffer(c, seconds) {
  const b = c.createBuffer(1, Math.max(1, Math.floor(c.sampleRate * seconds)), c.sampleRate);
  const d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return b;
}

function env(g, t, a, peak, d) {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + a);
  g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
}

/** Mechanical ring lock: a short metallic click. */
export function click(pitch = 1) {
  const c = ac();
  if (!c) return;
  const t = c.currentTime;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = 'square';
  o.frequency.setValueAtTime(1400 * pitch, t);
  o.frequency.exponentialRampToValueAtTime(500 * pitch, t + 0.04);
  env(g, t, 0.002, 0.25, 0.05);
  o.connect(g).connect(master);
  o.start(t);
  o.stop(t + 0.08);
  const n = c.createBufferSource();
  n.buffer = noiseBuffer(c, 0.05);
  const f = c.createBiquadFilter();
  f.type = 'highpass';
  f.frequency.value = 3000;
  const ng = c.createGain();
  env(ng, t, 0.001, 0.2, 0.03);
  n.connect(f).connect(ng).connect(master);
  n.start(t);
}

/** Rising electrical hum used during the anticipation phase. */
export function hum(duration = 1, intensity = 1) {
  const c = ac();
  if (!c) return;
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
  o.connect(f).connect(g).connect(master);
  o.start(t);
  o.stop(t + duration + 0.15);
}

/** Two-tone alert used only for the rarest results. */
export function alarm() {
  const c = ac();
  if (!c) return;
  const t = c.currentTime;
  for (let i = 0; i < 2; i++) {
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = 'triangle';
    o.frequency.setValueAtTime(620, t + i * 0.28);
    o.frequency.linearRampToValueAtTime(880, t + i * 0.28 + 0.22);
    env(g, t + i * 0.28, 0.02, 0.18, 0.22);
    o.connect(g).connect(master);
    o.start(t + i * 0.28);
    o.stop(t + i * 0.28 + 0.3);
  }
}

/** Air rushing as the crate falls. */
export function whoosh(duration = 0.4) {
  const c = ac();
  if (!c) return;
  const t = c.currentTime;
  const n = c.createBufferSource();
  n.buffer = noiseBuffer(c, duration + 0.1);
  const f = c.createBiquadFilter();
  f.type = 'bandpass';
  f.Q.value = 1.5;
  f.frequency.setValueAtTime(400, t);
  f.frequency.exponentialRampToValueAtTime(2400, t + duration);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.2, t + duration * 0.9);
  g.gain.exponentialRampToValueAtTime(0.0001, t + duration + 0.05);
  n.connect(f).connect(g).connect(master);
  n.start(t);
}

/** Heavy landing. Weight scales with rarity. */
export function thud(weight = 1) {
  const c = ac();
  if (!c) return;
  const t = c.currentTime;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(120, t);
  o.frequency.exponentialRampToValueAtTime(38, t + 0.25 + 0.1 * weight);
  env(g, t, 0.005, 0.5 + 0.2 * weight, 0.3 + 0.1 * weight);
  o.connect(g).connect(master);
  o.start(t);
  o.stop(t + 0.6);
  const n = c.createBufferSource();
  n.buffer = noiseBuffer(c, 0.3);
  const f = c.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.value = 500;
  const ng = c.createGain();
  env(ng, t, 0.003, 0.35, 0.2);
  n.connect(f).connect(ng).connect(master);
  n.start(t);
}

/** Reveal sting: more notes and a higher top note for rarer tiers. */
export function sting(tier = 1) {
  const c = ac();
  if (!c) return;
  const t = c.currentTime;
  const scale = [0, 4, 7, 12, 16, 19];
  const notes = scale.slice(0, Math.min(scale.length, 2 + Math.min(4, tier - 1)));
  const base = 196 * Math.pow(2, Math.min(5, tier - 1) / 12);
  notes.forEach((semi, i) => {
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = i === notes.length - 1 ? 'triangle' : 'sine';
    o.frequency.value = base * Math.pow(2, semi / 12);
    env(g, t + i * 0.06, 0.01, 0.14, 0.5 + tier * 0.08);
    o.connect(g).connect(master);
    o.start(t + i * 0.06);
    o.stop(t + i * 0.06 + 0.9 + tier * 0.1);
  });
}

/** Crisp UI tick for buttons. */
export function tick() {
  click(1.6);
}
