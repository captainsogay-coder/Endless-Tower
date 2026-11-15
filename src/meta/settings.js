// Player settings: graphics quality, accessibility toggles and audio mix.
// Saved in the profile and sanitised on load, so a broken or old save can
// never put the renderer or the mixer into an invalid state.

/**
 * Graphics presets. Every visual system reads its budget from here:
 *  dpr        – maximum canvas pixel ratio (render resolution)
 *  particles  – particle pool size (combat sparks, debris)
 *  density    – multiplier on requested particle counts
 *  ambient    – environment life (0 = static scenery, 1 = full, >1 = extra detail)
 *  weather    – weather particle multiplier
 *  life       – wildlife / clouds / light layer detail (0 off, 1 basic, 2 full, 3 extra)
 *  decals     – scorch marks kept on the ground
 */
export const QUALITY = {
  low: { id: 'low', label: 'Low', dpr: 1, particles: 300, density: 0.45, ambient: 0.35, weather: 0.35, life: 0, decals: 40 },
  medium: { id: 'medium', label: 'Medium', dpr: 1.5, particles: 600, density: 0.7, ambient: 0.7, weather: 0.65, life: 1, decals: 90 },
  high: { id: 'high', label: 'High', dpr: 2, particles: 1000, density: 1, ambient: 1, weather: 1, life: 2, decals: 140 },
  ultra: { id: 'ultra', label: 'Ultra', dpr: 3, particles: 1600, density: 1.2, ambient: 1.25, weather: 1.25, life: 3, decals: 200 },
};
export const QUALITY_IDS = ['low', 'medium', 'high', 'ultra'];

/** Sensible default for this device: phones and small screens start on Medium. */
export function autoQuality(env = globalThis) {
  try {
    const coarse = env.matchMedia?.('(pointer: coarse)').matches;
    const small = Math.min(env.screen?.width ?? 1920, env.screen?.height ?? 1080) < 700;
    const cores = env.navigator?.hardwareConcurrency ?? 8;
    if (cores <= 2) return 'low';
    if (coarse || small || cores <= 4) return 'medium';
  } catch {
    /* no window: tests */
  }
  return 'high';
}

export const AUDIO_CHANNELS = ['music', 'sfx', 'ambient'];

export function defaultSettings() {
  return {
    graphics: 'auto', // 'auto' resolves with autoQuality() at start-up
    shake: true, // camera shake on major impacts
    weatherFx: true, // weather visuals (gameplay modifiers are a separate toggle)
    intenseFx: true, // big flashes, chase cinematics, heavy particle bursts
    ambientLife: true, // animated environment, wildlife, drifting clouds
    volume: { music: 0.6, sfx: 0.8, ambient: 0.7 },
    mute: { music: false, sfx: false, ambient: false },
  };
}

const unit = (v, d) => (Number.isFinite(Number(v)) ? Math.min(1, Math.max(0, Number(v))) : d);

export function sanitizeSettings(s) {
  const d = defaultSettings();
  if (!s || typeof s !== 'object') return d;
  return {
    graphics: s.graphics === 'auto' || QUALITY_IDS.includes(s.graphics) ? s.graphics : d.graphics,
    shake: s.shake !== false,
    weatherFx: s.weatherFx !== false,
    intenseFx: s.intenseFx !== false,
    ambientLife: s.ambientLife !== false,
    volume: Object.fromEntries(AUDIO_CHANNELS.map((c) => [c, unit(s.volume?.[c], d.volume[c])])),
    mute: Object.fromEntries(AUDIO_CHANNELS.map((c) => [c, s.mute?.[c] === true])),
  };
}

/** The effective preset for these settings (resolving 'auto'). */
export function qualityOf(settings, env) {
  const id = settings.graphics === 'auto' ? autoQuality(env) : settings.graphics;
  return QUALITY[id] ?? QUALITY.high;
}
