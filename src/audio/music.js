// Generative, layered background music (WebAudio, no files).
//
// Three layers play together and crossfade with the battle's intensity:
//   calm   – a slow pad and a sparse melody (menus, build phase, respite)
//   combat – a plucked arpeggio, bass and light percussion (waves running)
//   boss   – a low ostinato, heavy drums and brass stabs (a boss on the field)
// Every realm has its own mode and tempo. Chords are chosen as the music goes
// (a small Markov walk over the scale), melodies are re-generated every few
// bars and rests are scattered, so the music never loops identically.
// Everything goes through the music bus (volume / mute in Settings).

import { audioContext, musicBus, channelAudible } from './sfx.js';

const MODES = {
  dorian: [0, 2, 3, 5, 7, 9, 10],
  aeolian: [0, 2, 3, 5, 7, 8, 10],
  phrygian: [0, 1, 3, 5, 7, 8, 10],
  lydian: [0, 2, 4, 6, 7, 9, 11],
  harmonicMinor: [0, 2, 3, 5, 7, 8, 11],
  mixolydian: [0, 2, 4, 5, 7, 9, 10],
};

/** Per realm: root (MIDI), mode, tempo and timbre leanings. */
export const REALM_MUSIC = {
  menu: { root: 50, mode: 'dorian', bpm: 76 },
  forest: { root: 50, mode: 'dorian', bpm: 84 },
  frozen: { root: 52, mode: 'aeolian', bpm: 70 },
  volcanic: { root: 48, mode: 'phrygian', bpm: 96 },
  ruins: { root: 45, mode: 'harmonicMinor', bpm: 88 },
  sky: { root: 55, mode: 'lydian', bpm: 90 },
  mechanical: { root: 53, mode: 'aeolian', bpm: 100 },
};

const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);
// chord walk: from a scale degree to the likely next ones
const NEXT = { 0: [3, 4, 5, 6], 1: [4, 5], 2: [5, 3], 3: [4, 0, 1], 4: [0, 5, 3], 5: [3, 1, 4], 6: [0, 4] };

export class Music {
  constructor() {
    this.on = false;
    this.target = { calm: 1, combat: 0, boss: 0 };
    this.realm = 'menu';
    this.timer = null;
    this.layers = null;
    this.rnd = Math.random;
  }

  /** Starts (or switches) the music for a realm. Needs an unlocked audio context. */
  start(realm = 'menu') {
    const ctx = audioContext();
    const out = musicBus();
    if (!ctx || !out) return false;
    this.realm = REALM_MUSIC[realm] ? realm : 'menu';
    this.cfg = REALM_MUSIC[this.realm];
    if (!this.layers) {
      this.layers = {};
      for (const name of ['calm', 'combat', 'boss']) {
        const g = ctx.createGain();
        g.gain.value = 0.0001;
        g.connect(out);
        this.layers[name] = g;
      }
    }
    this.on = true;
    this.beat = 0;
    this.degree = 0;
    this.bar = 0;
    this.next = ctx.currentTime + 0.1;
    this.newMotif();
    if (!this.timer) this.timer = setInterval(() => this.schedule(), 100);
    this.applyTargets(0.5);
    return true;
  }

  stop() {
    this.on = false;
    const ctx = audioContext();
    if (this.layers && ctx) for (const g of Object.values(this.layers)) g.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.6);
    clearInterval(this.timer);
    this.timer = null;
  }

  /**
   * Sets the intensity: 'calm' | 'combat' | 'boss'. Layers fade over a couple
   * of seconds; the calm pad stays faintly under combat so it never feels cut.
   */
  setIntensity(level) {
    const t = level === 'boss' ? { calm: 0.25, combat: 0.45, boss: 1 } : level === 'combat' ? { calm: 0.4, combat: 1, boss: 0 } : { calm: 1, combat: 0, boss: 0 };
    if (t.calm === this.target.calm && t.combat === this.target.combat && t.boss === this.target.boss) return;
    this.target = t;
    this.applyTargets(level === 'boss' ? 1.2 : 2.5);
  }

  applyTargets(fade) {
    const ctx = audioContext();
    if (!ctx || !this.layers) return;
    const LEVEL = { calm: 0.5, combat: 0.42, boss: 0.5 };
    for (const [name, g] of Object.entries(this.layers)) g.gain.setTargetAtTime(Math.max(0.0001, this.target[name] * LEVEL[name]), ctx.currentTime, fade / 3);
  }

  scale(deg, oct = 0) {
    const m = MODES[this.cfg.mode];
    const d = ((deg % 7) + 7) % 7;
    return this.cfg.root + m[d] + 12 * (oct + Math.floor(deg / 7));
  }

  newMotif() {
    // a short melodic idea: 8 steps of scale degrees with rests
    const r = this.rnd;
    this.motif = Array.from({ length: 8 }, (_, i) => (r() < (i % 2 ? 0.45 : 0.2) ? null : Math.floor(r() * 6)));
  }

  /** Look-ahead scheduler: queues notes for the next ~0.25 s. */
  schedule() {
    const ctx = audioContext();
    if (!ctx || !this.on || !channelAudible('music')) return;
    const spb = 60 / this.cfg.bpm / 2; // eighth notes
    while (this.next < ctx.currentTime + 0.25) {
      this.step(this.next, spb);
      this.next += spb;
      this.beat++;
    }
  }

  step(t, spb) {
    const b = this.beat % 16; // a bar of 8 eighths = 2 bars of 4/4 quarter feel
    const r = this.rnd;
    if (b === 0) {
      this.bar++;
      // chord walk every bar; a new motif every four bars
      const opts = NEXT[this.degree] ?? [0];
      this.degree = this.bar % 8 === 0 ? 0 : opts[Math.floor(r() * opts.length)];
      if (this.bar % 4 === 0) this.newMotif();
    }
    const L = this.layers;
    const chord = [this.scale(this.degree, -1), this.scale(this.degree + 2, -1), this.scale(this.degree + 4, -1)];
    // ---- calm: pad on the bar, sparse high melody
    if (b === 0) for (const n of chord) this.pad(L.calm, hz(n + 12), t, spb * 16, 0.05);
    if (b % 4 === 2 && r() < 0.5) {
      const m = this.motif[(b / 2) % 8];
      if (m !== null) this.pluck(L.calm, hz(this.scale(this.degree + m, 1)), t, spb * 3, 0.035, 'sine');
    }
    // ---- combat: arpeggio, bass, light hats and kick
    const arp = [0, 2, 4, 7, 4, 2];
    if (r() > 0.08) this.pluck(L.combat, hz(this.scale(this.degree + arp[b % arp.length], 0)), t, spb * 0.9, 0.04, 'triangle');
    if (b % 4 === 0) this.bass(L.combat, hz(chord[0] - 12), t, spb * 3.5, 0.11);
    if (b % 2 === 1) this.hat(L.combat, t, 0.025);
    if (b % 8 === 0) this.kick(L.combat, t, 0.16);
    if (b % 8 === 4) this.snare(L.combat, t, 0.05);
    // ---- boss: driving low ostinato, war drums, brass stabs
    if (b % 2 === 0) this.bass(L.boss, hz(chord[0] - 12 + (b % 4 === 2 ? 7 : 0)), t, spb * 1.6, 0.12, 'sawtooth');
    if (b % 4 === 0 || (b % 8 === 6 && r() < 0.7)) this.kick(L.boss, t, 0.24);
    if (b === 8) this.drumRoll(L.boss, t, spb);
    if (b === 0 || (b === 12 && r() < 0.5)) for (const n of chord) this.brass(L.boss, hz(n), t, spb * 2, 0.04);
  }

  // ------------------------------------------------------------ voices

  osc(dest, type, f, t, dur, peak, attack = 0.01, detune = 0) {
    const ctx = audioContext();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.value = f;
    o.detune.value = detune;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(dest);
    o.start(t);
    o.stop(t + dur + 0.05);
    return o;
  }

  pad(dest, f, t, dur, peak) {
    const ctx = audioContext();
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(600, t);
    lp.frequency.linearRampToValueAtTime(1400, t + dur * 0.5);
    lp.frequency.linearRampToValueAtTime(700, t + dur);
    lp.connect(dest);
    this.osc(lp, 'triangle', f, t, dur, peak, dur * 0.3, -6);
    this.osc(lp, 'sine', f, t, dur, peak * 0.8, dur * 0.3, 7);
  }

  pluck(dest, f, t, dur, peak, type) {
    this.osc(dest, type, f, t, dur, peak, 0.005);
  }

  bass(dest, f, t, dur, peak, type = 'sine') {
    const ctx = audioContext();
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = type === 'sawtooth' ? 420 : 900;
    lp.connect(dest);
    this.osc(lp, type, f, t, dur, peak, 0.01);
  }

  brass(dest, f, t, dur, peak) {
    const ctx = audioContext();
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(400, t);
    lp.frequency.exponentialRampToValueAtTime(2200, t + 0.08);
    lp.frequency.exponentialRampToValueAtTime(700, t + dur);
    lp.connect(dest);
    this.osc(lp, 'sawtooth', f, t, dur, peak, 0.03, -5);
    this.osc(lp, 'sawtooth', f, t, dur, peak, 0.03, 5);
  }

  noise(dest, t, dur, peak, type, freq) {
    const ctx = audioContext();
    if (!this.noiseBuf) {
      const b = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
      const d = b.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      this.noiseBuf = b;
    }
    const n = ctx.createBufferSource();
    n.buffer = this.noiseBuf;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(peak, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    n.connect(f).connect(g).connect(dest);
    n.start(t);
    n.stop(t + dur + 0.02);
  }

  hat(dest, t, peak) {
    this.noise(dest, t, 0.04, peak, 'highpass', 7000);
  }

  snare(dest, t, peak) {
    this.noise(dest, t, 0.14, peak, 'bandpass', 1800);
  }

  kick(dest, t, peak) {
    const ctx = audioContext();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.setValueAtTime(120, t);
    o.frequency.exponentialRampToValueAtTime(42, t + 0.18);
    g.gain.setValueAtTime(peak, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
    o.connect(g).connect(dest);
    o.start(t);
    o.stop(t + 0.32);
  }

  drumRoll(dest, t, spb) {
    for (let i = 0; i < 4; i++) this.noise(dest, t + i * spb * 0.25, 0.1, 0.03 + i * 0.01, 'lowpass', 400);
  }
}
