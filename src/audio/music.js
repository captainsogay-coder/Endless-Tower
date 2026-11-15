// The Endless Tower soundtrack: original compositions, synthesized live with
// WebAudio (no recordings, no files – nothing to download).
//
// Themes (each is written-out music: melodies, bass lines, chord
// progressions and arrangement per section – not random loops):
//   main        – the menu / main theme: a hopeful modal melody over strings
//   battle      – energetic: string ostinato, war drums, brass answers
//   boss        – dramatic: low brass ostinato, timpani, choir pads
//   ghost       – The Ghost: in-scale (miyako-bushi) melody on a shakuhachi-like
//                 flute, koto plucks, taiko; atmospheric and emotional
//   ghostBattle – The Ghost's battle arrangement (more taiko, faster koto)
//   ghastly     – Ghastly Wind: mysterious, airy, whole-tone colour
//   starfall    – Starfall: celesta and harp arpeggios in a bright lydian
//   twilight    – Twilight of Gods: slow, epic brass chorale and choir
// Stingers (short, one-shot): chase and super chase acquisitions.
//
// One theme plays at a time. Changing theme crossfades (the old one fades
// out over ~2 s and its sequencer stops); stingers duck the theme briefly.
// Sections alternate (A/B/A/C…) and small variations (octave lifts, grace
// notes, rests) are applied per pass, so long sessions don't loop identically.
// Everything goes through the music bus (volume / mute in Settings).

import { audioContext, musicBus, channelAudible, setStingerHook } from './sfx.js';

const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);
const SCALES = {
  aeolian: [0, 2, 3, 5, 7, 8, 10],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  phrygian: [0, 1, 3, 5, 7, 8, 10],
  harmonic: [0, 2, 3, 5, 7, 8, 11],
  lydian: [0, 2, 4, 6, 7, 9, 11],
  miyako: [0, 1, 5, 7, 8], // in-scale: D Eb G A Bb
  whole: [0, 2, 4, 6, 8, 10],
};
/** Scale degree → MIDI note (degrees beyond the scale wrap into octaves). */
function note(root, scale, deg) {
  const s = SCALES[scale];
  const o = Math.floor(deg / s.length);
  const d = ((deg % s.length) + s.length) % s.length;
  return root + s[d] + 12 * o;
}

// Melodies: [degree | null (rest), beats]. Chords: degree of the chord root per bar.
export const THEMES = {
  main: {
    bpm: 84, root: 62, scale: 'dorian', instrument: 'horn',
    chords: { A: [0, 5, 2, 6], B: [3, 0, 4, 4], C: [5, 3, 0, 4] },
    melody: {
      A: [[4, 1.5], [5, 0.5], [4, 1], [2, 1], [0, 2], [null, 1], [7, 1], [6, 1.5], [5, 0.5], [4, 1], [2, 1], [4, 3], [null, 1]],
      B: [[7, 1], [9, 1], [8, 1], [7, 1], [6, 2], [4, 2], [5, 1], [6, 1], [7, 1], [9, 1], [7, 4]],
      C: [[2, 1], [4, 1], [5, 2], [4, 1], [2, 1], [0, 2], [-1, 1], [0, 1], [2, 2], [0, 4]],
    },
    form: ['A', 'B', 'A', 'C'],
    layers: { pad: true, arp: 'gentle', bass: 'long', drums: null },
  },
  battle: {
    bpm: 120, root: 62, scale: 'aeolian', instrument: 'brass',
    chords: { A: [0, 6, 5, 6], B: [0, 3, 5, 4], C: [5, 6, 0, 0] },
    melody: {
      A: [[0, 0.5], [2, 0.5], [4, 1], [null, 0.5], [4, 0.5], [5, 0.5], [4, 0.5], [2, 1], [0, 1], [null, 2], [7, 1], [6, 0.5], [4, 0.5], [6, 2], [null, 4]],
      B: [[4, 1], [7, 1], [9, 1.5], [8, 0.5], [7, 2], [null, 1], [4, 1], [5, 1], [7, 1], [5, 1], [4, 4], [null, 1]],
      C: [[9, 2], [8, 1], [7, 1], [6, 2], [4, 2], [5, 1], [6, 1], [7, 2], [7, 4]],
    },
    form: ['A', 'A', 'B', 'C'],
    layers: { pad: false, arp: 'ostinato', bass: 'driving', drums: 'war' },
  },
  boss: {
    bpm: 132, root: 57, scale: 'harmonic', instrument: 'brass',
    chords: { A: [0, 0, 1, 0], B: [5, 4, 0, 4], C: [3, 1, 4, 4] },
    melody: {
      A: [[0, 1], [1, 1], [0, 0.5], [6, 0.5], [0, 1], [null, 1], [4, 2], [3, 1], [1, 1], [0, 4], [null, 3]],
      B: [[7, 2], [8, 1], [7, 1], [6, 2], [4, 2], [3, 1], [4, 1], [6, 2], [4, 4]],
      C: [[11, 1.5], [10, 0.5], [9, 1], [8, 1], [7, 4], [4, 2], [6, 2], [7, 4]],
    },
    form: ['A', 'B', 'A', 'C'],
    layers: { pad: 'choir', arp: 'low', bass: 'ostinato', drums: 'timpani' },
  },
  ghost: {
    bpm: 72, root: 62, scale: 'miyako', instrument: 'flute',
    chords: { A: [0, 0, 3, 0], B: [3, 2, 0, 0], C: [2, 3, 4, 0] },
    melody: {
      A: [[2, 2], [3, 1], [2, 1], [1, 2], [0, 2], [null, 1], [3, 1], [4, 1.5], [3, 0.5], [2, 3], [null, 1]],
      B: [[5, 3], [4, 1], [3, 2], [2, 1], [1, 1], [2, 2], [null, 1], [0, 1], [1, 1], [2, 1], [0, 2]],
      C: [[7, 2], [6, 1], [5, 1], [4, 3], [3, 1], [2, 2], [1, 1], [0, 1], [0, 3], [null, 1]],
    },
    form: ['A', 'B', 'A', 'C'],
    layers: { pad: 'mist', arp: 'koto', bass: 'drone', drums: 'taiko-sparse' },
  },
  ghostBattle: {
    bpm: 104, root: 62, scale: 'miyako', instrument: 'flute',
    chords: { A: [0, 0, 3, 3], B: [2, 3, 0, 0], C: [3, 4, 0, 0] },
    melody: {
      A: [[0, 1], [2, 0.5], [3, 0.5], [4, 2], [3, 1], [2, 1], [0, 2], [null, 1], [5, 1], [4, 1], [3, 1], [2, 4]],
      B: [[5, 1], [7, 1], [6, 2], [5, 1], [4, 1], [3, 2], [2, 1], [3, 1], [4, 2], [2, 4]],
      C: [[7, 3], [5, 1], [4, 2], [2, 2], [3, 1], [2, 1], [0, 2], [0, 4]],
    },
    form: ['A', 'B', 'A', 'C'],
    layers: { pad: 'mist', arp: 'koto-fast', bass: 'drone', drums: 'taiko' },
  },
  ghastly: {
    bpm: 60, root: 60, scale: 'whole', instrument: 'flute',
    chords: { A: [0, 1, 0, 2], B: [3, 2, 1, 0], C: [0, 0, 1, 1] },
    melody: {
      A: [[4, 3], [null, 1], [3, 2], [5, 2], [4, 4], [null, 4]],
      B: [[6, 2], [5, 2], [3, 3], [null, 1], [2, 4], [null, 4]],
      C: [[1, 2], [3, 2], [4, 4], [2, 6], [null, 2]],
    },
    form: ['A', 'B', 'A', 'C'],
    layers: { pad: 'mist', arp: null, bass: 'drone', drums: null },
  },
  starfall: {
    bpm: 70, root: 67, scale: 'lydian', instrument: 'celesta',
    chords: { A: [0, 1, 0, 4], B: [5, 3, 1, 4], C: [0, 3, 4, 0] },
    melody: {
      A: [[4, 1], [6, 1], [7, 2], [6, 1], [4, 1], [3, 2], [4, 1], [5, 0.5], [6, 0.5], [7, 4], [null, 2]],
      B: [[9, 2], [8, 1], [7, 1], [6, 2], [7, 2], [4, 4], [null, 4]],
      C: [[7, 1], [8, 1], [9, 1], [11, 1], [9, 4], [7, 4], [null, 4]],
    },
    form: ['A', 'B', 'A', 'C'],
    layers: { pad: true, arp: 'harp', bass: 'long', drums: null },
  },
  twilight: {
    bpm: 66, root: 57, scale: 'aeolian', instrument: 'brass',
    chords: { A: [0, 5, 3, 4], B: [5, 6, 0, 4], C: [3, 4, 5, 4] },
    melody: {
      A: [[4, 2], [5, 1], [4, 1], [2, 2], [0, 2], [2, 1], [4, 1], [5, 2], [4, 4]],
      B: [[7, 3], [6, 1], [5, 2], [4, 2], [5, 2], [6, 2], [7, 4]],
      C: [[9, 2], [7, 2], [8, 2], [6, 2], [7, 4], [4, 4]],
    },
    form: ['A', 'B', 'A', 'C'],
    layers: { pad: 'choir', arp: null, bass: 'long', drums: 'timpani-slow' },
  },
};
export const THEME_IDS = Object.keys(THEMES);

/** A realm's colour: the same themes transposed a little, so each realm sounds its own. */
const REALM_SHIFT = { menu: 0, forest: 0, frozen: 2, volcanic: -2, ruins: -5, sky: 5, mechanical: -1 };

class Track {
  constructor(music, id, shift) {
    this.m = music;
    this.id = id;
    this.th = THEMES[id];
    this.shift = shift;
    const ctx = audioContext();
    this.out = ctx.createGain();
    this.out.gain.value = 0.0001;
    this.out.connect(music.master);
    this.bar = 0;
    this.section = 0;
    this.pass = 0;
    this.next = ctx.currentTime + 0.1;
    this.loadSection();
  }

  loadSection() {
    const key = this.th.form[this.section % this.th.form.length];
    this.key = key;
    this.chordList = this.th.chords[key];
    // the section's melody as [degree, startBeat, beats], with a small per-pass variation
    const v = this.pass % 3;
    let at = 0;
    this.notes = this.th.melody[key].map(([d, b], i) => {
      const n = [d === null || (v === 1 && i === 2) ? null : d + (v === 2 && i % 4 === 0 ? 7 : 0), at, b];
      at += b;
      return n;
    });
  }

  fade(to, seconds) {
    const ctx = audioContext();
    this.out.gain.cancelScheduledValues(ctx.currentTime);
    this.out.gain.setTargetAtTime(Math.max(0.0001, to), ctx.currentTime, seconds / 3);
  }

  /** Schedules one bar (4 beats) at time t. */
  bar4(t) {
    const th = this.th;
    const spb = 60 / th.bpm;
    const root = th.root + this.shift;
    const chordDeg = this.chordList[this.bar % this.chordList.length];
    const tri = [0, 2, 4].map((k) => note(root - 12, th.scale, chordDeg + k));
    const v = this.m.voices;
    const L = th.layers;
    // pads
    if (L.pad === true) for (const n of tri) v.pad(this.out, hz(n + 12), t, spb * 4, 0.035);
    if (L.pad === 'choir') for (const n of tri) v.choir(this.out, hz(n + 12), t, spb * 4, 0.03);
    if (L.pad === 'mist') v.pad(this.out, hz(tri[0] + 12), t, spb * 4, 0.025, 'sine');
    // bass
    if (L.bass === 'long') v.bass(this.out, hz(tri[0] - 12), t, spb * 3.8, 0.09);
    if (L.bass === 'drone') v.bass(this.out, hz(root - 24), t, spb * 4, 0.06);
    if (L.bass === 'driving') for (let i = 0; i < 8; i++) v.bass(this.out, hz(tri[0] - 12 + (i % 4 === 3 ? 7 : 0)), t + i * spb * 0.5, spb * 0.45, 0.08, 'sawtooth');
    if (L.bass === 'ostinato') for (let i = 0; i < 8; i++) v.bass(this.out, hz(tri[0] - 12 + [0, 0, 1, 0, 0, 0, -1, 0][i]), t + i * spb * 0.5, spb * 0.42, 0.1, 'sawtooth');
    // arpeggios and plucked parts
    if (L.arp === 'gentle') for (let i = 0; i < 4; i++) v.pluck(this.out, hz(tri[i % 3] + 12), t + i * spb, spb * 1.6, 0.025, 'triangle');
    if (L.arp === 'ostinato') for (let i = 0; i < 8; i++) v.pluck(this.out, hz(tri[[0, 1, 2, 1, 0, 2, 1, 2][i]] + 12), t + i * spb * 0.5, spb * 0.45, 0.03, 'sawtooth', 1800);
    if (L.arp === 'low') for (let i = 0; i < 4; i++) v.pluck(this.out, hz(tri[i % 3]), t + i * spb, spb * 0.9, 0.035, 'sawtooth', 900);
    if (L.arp === 'harp') for (let i = 0; i < 8; i++) v.celesta(this.out, hz(tri[i % 3] + 24 + (i > 3 ? 12 : 0)), t + i * spb * 0.5, 0.02);
    if (L.arp === 'koto' || L.arp === 'koto-fast') {
      const n = L.arp === 'koto' ? 4 : 8;
      const pattern = [0, 2, 3, 1, 4, 2, 3, 1];
      for (let i = 0; i < n; i++) {
        if (L.arp === 'koto' && i === 3 && this.bar % 2) continue;
        v.koto(this.out, hz(note(root, th.scale, chordDeg + pattern[i])), t + (i * spb * 4) / n, 0.045);
      }
    }
    // percussion
    if (L.drums === 'war') {
      for (let i = 0; i < 4; i++) v.drum(this.out, t + i * spb, i % 2 ? 0.08 : 0.14, i % 2 ? 140 : 70);
      for (let i = 0; i < 8; i++) v.hat(this.out, t + i * spb * 0.5, 0.012);
      if (this.bar % 4 === 3) v.roll(this.out, t + spb * 3, spb);
    }
    if (L.drums === 'timpani') {
      for (let i = 0; i < 4; i++) v.drum(this.out, t + i * spb, i === 0 ? 0.2 : 0.1, 60);
      v.drum(this.out, t + spb * 3.5, 0.08, 60);
      if (this.bar % 2) v.roll(this.out, t + spb * 3, spb);
    }
    if (L.drums === 'timpani-slow') {
      v.drum(this.out, t, 0.18, 55);
      if (this.bar % 2 === 1) v.roll(this.out, t + spb * 2, spb * 2);
    }
    if (L.drums === 'taiko' || L.drums === 'taiko-sparse') {
      const hits = L.drums === 'taiko' ? [0, 1.5, 2, 3, 3.5] : this.bar % 2 ? [0, 2.5] : [0];
      for (const b of hits) v.taiko(this.out, t + b * spb, b === 0 ? 0.22 : 0.14);
      if (L.drums === 'taiko') for (let i = 0; i < 4; i++) v.rim(this.out, t + (i + 0.5) * spb, 0.02);
    }
    // the melody: every note that starts in this bar (4 bars per section)
    const from = (this.bar % 4) * 4;
    for (const [d, at, b] of this.notes) {
      if (d === null || at < from || at >= from + 4) continue;
      v.lead(th.instrument, this.out, hz(note(root, th.scale, d)), t + (at - from) * spb, b * spb, 0.05);
    }
    this.bar++;
    if (this.bar % 4 === 0) {
      this.section++;
      if (this.section % th.form.length === 0) this.pass++;
      this.loadSection();
    }
    return spb * 4;
  }

  schedule(now) {
    // after a pause (muted, tab hidden) pick up from now instead of replaying missed bars
    if (this.next < now) this.next = now + 0.05;
    while (this.next < now + 0.3) this.next += this.bar4(this.next);
  }
}

export class Music {
  constructor() {
    this.track = null;
    this.old = [];
    this.timer = null;
    this.realm = 'menu';
    this.themeId = null;
    this.voices = null;
    setStingerHook((rarity) => this.stinger(rarity));
  }

  ensure() {
    const ctx = audioContext();
    const bus = musicBus();
    if (!ctx || !bus) return false;
    if (!this.master) {
      this.master = ctx.createGain();
      this.master.gain.value = 1;
      this.master.connect(bus);
      this.voices = new Voices();
    }
    if (!this.timer) this.timer = setInterval(() => this.tick(), 100);
    return true;
  }

  /** Starts (or switches to) a realm's music; the theme follows with setIntensity(). */
  start(realm = 'menu') {
    this.realm = REALM_SHIFT[realm] !== undefined ? realm : 'menu';
    if (!this.ensure()) return false;
    if (!this.themeId) this.play('main');
    return true;
  }

  /** Old API: 'calm' | 'combat' | 'boss'. */
  setIntensity(level) {
    this.play(level === 'boss' ? 'boss' : level === 'combat' ? 'battle' : 'main');
  }

  /** Crossfades to a theme (no-op when it is already playing). */
  play(id) {
    if (!THEMES[id] || !this.ensure()) return;
    if (this.themeId === id && this.track) return;
    if (this.track) {
      this.track.fade(0, 2);
      const t = this.track;
      this.old.push(t);
      setTimeout(() => {
        t.out.disconnect();
        this.old = this.old.filter((x) => x !== t);
      }, 2600);
    }
    this.themeId = id;
    this.track = new Track(this, id, REALM_SHIFT[this.realm] ?? 0);
    this.track.fade(0.55, 2);
  }

  stop() {
    this.track?.fade(0, 1.2);
    this.themeId = null;
    const t = this.track;
    this.track = null;
    if (t) setTimeout(() => t.out.disconnect(), 1600);
  }

  /** Short one-shot for an acquisition: 'chase' | 'super'. The theme ducks under it. */
  stinger(kind = 'chase') {
    if (!this.ensure()) return;
    const ctx = audioContext();
    const t = ctx.currentTime + 0.05;
    const dur = kind === 'super' ? 3.6 : 2.2;
    this.master.gain.cancelScheduledValues(t);
    this.master.gain.setTargetAtTime(0.25, t, 0.1);
    this.master.gain.setTargetAtTime(1, t + dur, 0.6);
    const out = ctx.createGain();
    out.gain.value = 0.9;
    out.connect(musicBus());
    const v = this.voices;
    const root = 62;
    if (kind === 'super') {
      // taiko roll, a rising fanfare, and a held major chord with choir
      for (let i = 0; i < 6; i++) v.taiko(out, t + i * 0.12, 0.08 + i * 0.03);
      [0, 4, 7, 12].forEach((s, i) => v.lead('brass', out, hz(root + s), t + 0.8 + i * 0.22, 0.5, 0.07));
      for (const s of [0, 4, 7, 12, 16]) v.choir(out, hz(root + s), t + 1.7, 1.9, 0.035);
      v.drum(out, t + 1.7, 0.25, 50);
      v.celesta(out, hz(root + 36), t + 1.9, 0.03);
      v.celesta(out, hz(root + 40), t + 2.05, 0.03);
    } else {
      [0, 7, 12].forEach((s, i) => v.lead('brass', out, hz(root + s), t + i * 0.18, 0.45, 0.06));
      for (const s of [0, 4, 7]) v.pad(out, hz(root + 12 + s), t + 0.54, 1.5, 0.04);
      v.drum(out, t + 0.54, 0.18, 60);
    }
    setTimeout(() => out.disconnect(), (dur + 1) * 1000);
  }

  /** A short signature for a summoning circle (its sound identity), played when it is opened. */
  circleMotif(bannerId) {
    if (!this.ensure()) return;
    const sig = CIRCLE_MOTIFS[bannerId] ?? CIRCLE_MOTIFS.default;
    const ctx = audioContext();
    const out = ctx.createGain();
    out.gain.value = 0.7;
    out.connect(musicBus());
    const t = ctx.currentTime + 0.03;
    sig.notes.forEach((s, i) => this.voices.lead(sig.instrument, out, hz(sig.root + s), t + i * sig.step, sig.step * 1.6, 0.05));
    if (sig.drum) this.voices[sig.drum](out, t, 0.12, 70);
    setTimeout(() => out.disconnect(), 3000);
  }

  tick() {
    const ctx = audioContext();
    if (!ctx || !this.track || !channelAudible('music')) return;
    this.track.schedule(ctx.currentTime);
    for (const t of this.old) t.schedule(ctx.currentTime);
  }
}

/** Each circle's short signature (instrument, notes as semitones over a root, step in seconds). */
export const CIRCLE_MOTIFS = {
  default: { instrument: 'horn', root: 62, notes: [0, 7, 12], step: 0.18 },
  'village-militia-circle': { instrument: 'flute', root: 67, notes: [0, 2, 4, 7], step: 0.14 },
  'military-circle': { instrument: 'brass', root: 58, notes: [0, 5, 7, 12], step: 0.12, drum: 'drum' },
  'traveling-caravan-circle': { instrument: 'celesta', root: 69, notes: [0, 3, 7, 10, 12], step: 0.1 },
  'royal-academy-circle': { instrument: 'horn', root: 60, notes: [0, 4, 7, 12, 7], step: 0.13 },
  'advanced-military-circle': { instrument: 'brass', root: 55, notes: [0, 3, 7, 6], step: 0.12, drum: 'drum' },
  'town-guard-circle': { instrument: 'horn', root: 62, notes: [0, 7, 5, 12], step: 0.16 },
  'wild-west-circle': { instrument: 'flute', root: 64, notes: [7, 5, 0, -5], step: 0.16 },
  'gambino-circle': { instrument: 'celesta', root: 65, notes: [0, 4, 7, 11, 14], step: 0.08 },
  'siege-workshop-circle': { instrument: 'brass', root: 53, notes: [0, 0, 7, 5], step: 0.14, drum: 'drum' },
  'nuclear-war-circle': { instrument: 'brass', root: 57, notes: [0, 6, 0, 6], step: 0.12 },
  'clockwork-atelier-circle': { instrument: 'celesta', root: 72, notes: [0, 7, 4, 7, 0], step: 0.09 },
  'frostbound-legion-circle': { instrument: 'celesta', root: 76, notes: [0, -2, -5, -9], step: 0.14 },
  'jungle-covenant-circle': { instrument: 'flute', root: 62, notes: [0, 3, 5, 3, 7], step: 0.12, drum: 'taiko' },
  'arcane-library-circle': { instrument: 'celesta', root: 67, notes: [0, 1, 6, 7], step: 0.15 },
  'skybound-order-circle': { instrument: 'flute', root: 69, notes: [0, 4, 6, 11], step: 0.13 },
  'titan-foundry-circle': { instrument: 'brass', root: 45, notes: [0, 1, 0, 7], step: 0.18, drum: 'drum' },
  'astral-observatory-circle': { instrument: 'celesta', root: 74, notes: [0, 6, 11, 18], step: 0.14 },
  'the-ghost-circle': { instrument: 'flute', root: 62, notes: [7, 8, 5, 1, 0], step: 0.22, drum: 'taiko' },
};

/** The instruments: small, cheap WebAudio voices. */
class Voices {
  get ctx() {
    return audioContext();
  }

  env(g, t, attack, peak, dur, release = 0.2) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + attack);
    g.gain.setValueAtTime(peak, Math.max(t + attack, t + dur - release));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  }

  osc(dest, type, f, t, dur, peak, attack = 0.01, detune = 0, filter = 0) {
    const c = this.ctx;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.value = f;
    o.detune.value = detune;
    this.env(g, t, attack, peak, dur, Math.min(0.3, dur * 0.4));
    if (filter) {
      const lp = c.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = filter;
      o.connect(lp).connect(g).connect(dest);
    } else o.connect(g).connect(dest);
    o.start(t);
    o.stop(t + dur + 0.05);
    return o;
  }

  noise(dest, t, dur, peak, type, freq, q = 1) {
    const c = this.ctx;
    if (!this.nb) {
      const b = c.createBuffer(1, c.sampleRate, c.sampleRate);
      const d = b.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      this.nb = b;
    }
    const n = c.createBufferSource();
    n.buffer = this.nb;
    const f = c.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    const g = c.createGain();
    g.gain.setValueAtTime(peak, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    n.connect(f).connect(g).connect(dest);
    n.start(t);
    n.stop(t + dur + 0.02);
  }

  pad(dest, f, t, dur, peak, type = 'triangle') {
    this.osc(dest, type, f, t, dur, peak, dur * 0.35, -7, 1600);
    this.osc(dest, type, f, t, dur, peak * 0.8, dur * 0.35, 7, 1600);
  }

  choir(dest, f, t, dur, peak) {
    // a vowel-like pad: two detuned saws through a formant-ish band
    const c = this.ctx;
    const bp = c.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 900;
    bp.Q.value = 1.2;
    bp.connect(dest);
    this.osc(bp, 'sawtooth', f, t, dur, peak, dur * 0.4, -9);
    this.osc(bp, 'sawtooth', f, t, dur, peak, dur * 0.4, 9);
  }

  bass(dest, f, t, dur, peak, type = 'sine') {
    this.osc(dest, type, f, t, dur, peak, 0.015, 0, type === 'sawtooth' ? 520 : 0);
  }

  pluck(dest, f, t, dur, peak, type = 'triangle', filter = 0) {
    this.osc(dest, type, f, t, dur, peak, 0.004, 0, filter);
  }

  celesta(dest, f, t, peak) {
    this.osc(dest, 'sine', f, t, 1.4, peak, 0.003);
    this.osc(dest, 'sine', f * 4, t, 0.3, peak * 0.25, 0.002);
  }

  koto(dest, f, t, peak) {
    // a plucked string: bright attack, quick decay, a slight pitch bend down
    const c = this.ctx;
    const o = c.createOscillator();
    const g = c.createGain();
    const lp = c.createBiquadFilter();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(f * 1.012, t);
    o.frequency.exponentialRampToValueAtTime(f, t + 0.06);
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(3200, t);
    lp.frequency.exponentialRampToValueAtTime(600, t + 0.5);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.1);
    o.connect(lp).connect(g).connect(dest);
    o.start(t);
    o.stop(t + 1.15);
  }

  taiko(dest, t, peak) {
    const c = this.ctx;
    const o = c.createOscillator();
    const g = c.createGain();
    o.frequency.setValueAtTime(110, t);
    o.frequency.exponentialRampToValueAtTime(48, t + 0.25);
    g.gain.setValueAtTime(peak, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
    o.connect(g).connect(dest);
    o.start(t);
    o.stop(t + 0.52);
    this.noise(dest, t, 0.06, peak * 0.4, 'lowpass', 800);
  }

  rim(dest, t, peak) {
    this.noise(dest, t, 0.04, peak, 'bandpass', 2400, 4);
  }

  drum(dest, t, peak, f0 = 70) {
    const c = this.ctx;
    const o = c.createOscillator();
    const g = c.createGain();
    o.frequency.setValueAtTime(f0 * 1.8, t);
    o.frequency.exponentialRampToValueAtTime(f0 * 0.6, t + 0.2);
    g.gain.setValueAtTime(peak, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
    o.connect(g).connect(dest);
    o.start(t);
    o.stop(t + 0.37);
  }

  hat(dest, t, peak) {
    this.noise(dest, t, 0.04, peak, 'highpass', 7000);
  }

  roll(dest, t, dur) {
    const n = 6;
    for (let i = 0; i < n; i++) this.noise(dest, t + (i * dur) / n, 0.1, 0.02 + i * 0.008, 'lowpass', 500);
  }

  /** The melody instruments. */
  lead(instrument, dest, f, t, dur, peak) {
    switch (instrument) {
      case 'flute': {
        // shakuhachi-like: breathy attack, sine body with a slow vibrato
        const c = this.ctx;
        const o = c.createOscillator();
        const vib = c.createOscillator();
        const vg = c.createGain();
        const g = c.createGain();
        o.type = 'sine';
        o.frequency.setValueAtTime(f * 0.985, t);
        o.frequency.linearRampToValueAtTime(f, t + 0.12);
        vib.frequency.value = 5;
        vg.gain.setValueAtTime(0, t);
        vg.gain.linearRampToValueAtTime(f * 0.008, t + Math.min(0.6, dur * 0.6));
        vib.connect(vg).connect(o.frequency);
        this.env(g, t, 0.09, peak * 1.2, dur, Math.min(0.4, dur * 0.4));
        o.connect(g).connect(dest);
        o.start(t);
        vib.start(t);
        o.stop(t + dur + 0.05);
        vib.stop(t + dur + 0.05);
        this.noise(dest, t, 0.18, peak * 0.5, 'bandpass', f * 2, 2);
        break;
      }
      case 'brass':
        this.osc(dest, 'sawtooth', f, t, dur, peak, 0.05, -4, 1400);
        this.osc(dest, 'sawtooth', f, t, dur, peak * 0.7, 0.05, 5, 1400);
        break;
      case 'celesta':
        this.celesta(dest, f, t, peak * 0.8);
        break;
      case 'horn':
      default:
        this.osc(dest, 'triangle', f, t, dur, peak * 1.1, 0.06, 0, 2200);
        this.osc(dest, 'sawtooth', f, t, dur, peak * 0.35, 0.08, 3, 900);
    }
  }
}
