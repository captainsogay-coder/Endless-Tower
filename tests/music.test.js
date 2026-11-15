import test from 'node:test';
import assert from 'node:assert/strict';
import { THEMES, THEME_IDS, CIRCLE_MOTIFS } from '../src/audio/music.js';
import { battleTheme } from '../src/audio/director.js';
import { listCirclesByPrice } from '../src/units/summoning.js';
import { defaultSettings, sanitizeSettings, AUDIO_CHANNELS } from '../src/meta/settings.js';
import * as sfx from '../src/audio/sfx.js';

test('every theme is written out: a full form, 4-bar sections, distinct melodies', () => {
  for (const id of ['main', 'battle', 'boss', 'ghost', 'ghostBattle', 'ghastly', 'starfall', 'twilight']) assert.ok(THEMES[id], id);
  const seen = new Set();
  for (const id of THEME_IDS) {
    const th = THEMES[id];
    assert.ok(th.bpm >= 50 && th.bpm <= 160, id);
    for (const key of new Set(th.form)) {
      assert.ok(th.melody[key] && th.chords[key], `${id} ${key}`);
      const beats = th.melody[key].reduce((a, [, b]) => a + b, 0);
      assert.equal(beats, 16, `${id} section ${key} must be 4 bars`);
      assert.ok(th.melody[key].some(([d]) => d !== null), `${id} ${key} is not silent`);
      const sig = JSON.stringify(th.melody[key]);
      assert.ok(!seen.has(sig), `${id} ${key} reuses another melody`);
      seen.add(sig);
    }
  }
  assert.equal(THEMES.ghost.scale, 'miyako');
});

test('every summoning circle has its own motif', () => {
  for (const c of listCirclesByPrice()) assert.ok(CIRCLE_MOTIFS[c.id], c.id);
});

test('battle music follows the fight: boss, weather, The Ghost, wave', () => {
  const g = (o) => ({ boss: null, weather: { current: null }, units: [], phase: 'build', ...o });
  const ghost = { def: { faction: 'the-ghost' } };
  const other = { def: { faction: 'military' } };
  assert.equal(battleTheme(g({})), 'main');
  assert.equal(battleTheme(g({ phase: 'wave' })), 'battle');
  assert.equal(battleTheme(g({ phase: 'wave', units: [ghost, ghost, other] })), 'ghostBattle');
  assert.equal(battleTheme(g({ units: [ghost, ghost] })), 'ghost');
  assert.equal(battleTheme(g({ phase: 'wave', units: [ghost, other, other] })), 'battle');
  assert.equal(battleTheme(g({ phase: 'wave', weather: { current: { id: 'starfall' } } })), 'starfall');
  assert.equal(battleTheme(g({ weather: { current: { id: 'ghastly' } } })), 'ghastly');
  assert.equal(battleTheme(g({ weather: { current: { id: 'twilight' } } })), 'twilight');
  assert.equal(battleTheme(g({ boss: { alive: true }, weather: { current: { id: 'twilight' } } })), 'boss');
});

test('audio settings have four saved channels including UI / summoning', () => {
  assert.deepEqual(AUDIO_CHANNELS, ['music', 'sfx', 'ambient', 'ui']);
  const s = sanitizeSettings({ volume: { ui: 0.25, music: 2 }, mute: { ui: true } });
  assert.equal(s.volume.ui, 0.25);
  assert.equal(s.volume.music, 1);
  assert.equal(s.mute.ui, true);
  assert.equal(defaultSettings().mute.ui, false);
  assert.equal(typeof sfx.summonStinger, 'function');
  assert.equal(typeof sfx.asUi, 'function');
  sfx.setChannel('ui', 0.5, false); // no audio context in Node: a safe no-op
  assert.equal(sfx.channelAudible('ui'), true);
});
