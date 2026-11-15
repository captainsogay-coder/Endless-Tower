// Settings (graphics presets, accessibility, audio mix) and collection progress.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { QUALITY, QUALITY_IDS, defaultSettings, sanitizeSettings, qualityOf, autoQuality } from '../src/meta/settings.js';
import { Profile, memoryStorage, PROFILE_KEY } from '../src/meta/profile.js';
import { registerRoster, ROSTER, STARTER_UNITS } from '../src/units/roster.js';
import { listCirclesByPrice } from '../src/units/summoning.js';

registerRoster();

test('four graphics presets with rising budgets; Low switches environment life off', () => {
  assert.deepEqual(QUALITY_IDS, ['low', 'medium', 'high', 'ultra']);
  const keys = ['dpr', 'particles', 'density', 'ambient', 'weather', 'life', 'decals'];
  for (let i = 1; i < QUALITY_IDS.length; i++) {
    for (const k of keys) assert.ok(QUALITY[QUALITY_IDS[i]][k] >= QUALITY[QUALITY_IDS[i - 1]][k], `${k} rises with the preset`);
  }
  assert.equal(QUALITY.low.life, 0);
  assert.equal(QUALITY.low.dpr, 1);
});

test('auto quality picks a sensible preset per device', () => {
  const env = (coarse, w, cores) => ({ matchMedia: () => ({ matches: coarse }), screen: { width: w, height: w * 2 }, navigator: { hardwareConcurrency: cores } });
  assert.equal(autoQuality(env(false, 1920, 8)), 'high');
  assert.equal(autoQuality(env(true, 390, 8)), 'medium');
  assert.equal(autoQuality(env(false, 1920, 2)), 'low');
  assert.equal(qualityOf({ graphics: 'ultra' }), QUALITY.ultra);
  assert.equal(qualityOf({ graphics: 'auto' }, env(true, 390, 8)), QUALITY.medium);
});

test('settings are sanitised on load and persist in the profile', () => {
  assert.deepEqual(sanitizeSettings(null), defaultSettings());
  const junk = sanitizeSettings({ graphics: 'cinematic', shake: 'no', weatherFx: false, volume: { music: 7, sfx: -2, ambient: 'x' }, mute: { music: 1, sfx: true } });
  assert.equal(junk.graphics, 'auto');
  assert.equal(junk.shake, true, 'only an explicit false turns shake off');
  assert.equal(junk.weatherFx, false);
  assert.deepEqual(junk.volume, { music: 1, sfx: 0, ambient: 0.7, ui: 0.8 }, 'old saves without a ui volume get the default');
  assert.deepEqual(junk.mute, { music: false, sfx: true, ambient: false, ui: false });
  const storage = memoryStorage();
  const p = new Profile({ storage, starterUnits: ['dude'] });
  p.data.settings.graphics = 'low';
  p.data.settings.shake = false;
  p.data.settings.volume.music = 0.25;
  p.save();
  const q = new Profile({ storage, starterUnits: ['dude'] });
  assert.equal(q.data.settings.graphics, 'low');
  assert.equal(q.data.settings.shake, false);
  assert.equal(q.data.settings.volume.music, 0.25);
  // an old save without settings gets the defaults
  storage.setItem(PROFILE_KEY, JSON.stringify({ unlocked: ['dude'], wallet: { tokens: 5 } }));
  assert.deepEqual(new Profile({ storage, starterUnits: ['dude'] }).data.settings, defaultSettings());
});

test('collection progress: every unit once, per-circle completion, starters included', async () => {
  const { collectionProgress, collectionGroups } = await import('../src/ui/collectionView.js');
  const p = new Profile({ storage: memoryStorage(), starterUnits: STARTER_UNITS });
  const groups = collectionGroups(STARTER_UNITS);
  assert.equal(groups.length, listCirclesByPrice().length + 1);
  const start = collectionProgress(p, STARTER_UNITS);
  assert.equal(start.total, ROSTER.length);
  assert.equal(start.owned, STARTER_UNITS.length);
  for (const id of ['squire', 'trainee-guard', 'practice-archer', 'duelist', 'battle-instructor', 'royal-graduate', 'grandmaster']) p.unlock(id);
  const after = collectionProgress(p, STARTER_UNITS);
  assert.equal(after.owned, STARTER_UNITS.length + 7);
  assert.ok(after.groups.find((g) => g.id === 'royal-academy-circle').complete);
  assert.equal(after.circlesComplete, 1);
});
