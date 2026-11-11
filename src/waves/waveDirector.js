// The wave director picks the next archetype and composes a full wave plan.
// Selection is random but shaped: archetypes are weighted toward ones not seen
// recently, can't repeat beyond their maxRepeat, and bosses arrive on a
// randomized cadence (never too close together, never too far apart).

import { createRng } from '../core/rng.js';
import { GAME_CONFIG } from '../config.js';
import { listArchetypes, getArchetype } from './archetypes.js';
import { waveScaling, traitSlots } from './scaling.js';
import { rollTraits, getTrait } from './traits.js';
import { pickVariant } from '../enemies/enemyCategories.js';

export const BOSS_MIN_GAP = 7;
export const BOSS_MAX_GAP = 11;
export const FIRST_BOSS_WAVE = 8;

export const PATTERN_LABELS = {
  stream: 'Steady Stream',
  burst: 'Bursts',
  surge: 'Rising Surge',
  pincer: 'Pincer',
};

export function waveClearReward(wave, isBoss) {
  const base = GAME_CONFIG.waveClearBase + GAME_CONFIG.waveClearPerWave * wave;
  return Math.round(base * (isBoss ? 2 : 1));
}

export class WaveDirector {
  constructor(seed, { entranceCount = 1 } = {}) {
    this.rng = createRng(seed);
    this.entranceCount = entranceCount;
    this.history = [];
    this.lastBossWave = 0;
  }

  get wave() {
    return this.history.length;
  }

  chooseArchetype(wave) {
    const since = wave - this.lastBossWave;
    const bossReady = wave >= FIRST_BOSS_WAVE && since >= BOSS_MIN_GAP;
    if (bossReady && (since >= BOSS_MAX_GAP || (wave >= FIRST_BOSS_WAVE + 4 && this.lastBossWave === 0))) {
      return getArchetype('boss');
    }
    const h = this.history;
    const entries = listArchetypes()
      .filter((a) => wave >= a.minWave)
      .map((a) => {
        let w = a.baseWeight;
        if (a.id === 'boss') w = bossReady ? (since - BOSS_MIN_GAP + 1) * 0.9 : 0;
        let run = 0;
        for (let i = h.length - 1; i >= 0 && h[i] === a.id; i--) run++;
        if (run >= a.maxRepeat) w = 0;
        else if (run > 0) w *= a.repeatFactor;
        // Favour archetypes we haven't seen in a while.
        const lastSeen = h.lastIndexOf(a.id);
        const gap = lastSeen < 0 ? 6 : h.length - 1 - lastSeen;
        w *= Math.min(2, Math.max(0.6, 0.7 + gap * 0.15));
        if (h[h.length - 1] === 'boss' && a.id === 'commando') w *= 0.5;
        return { a, weight: w };
      });
    return (this.rng.weighted(entries) ?? entries.find((e) => e.a.id === 'army')).a;
  }

  /** Composes and returns the plan for the next wave. */
  next() {
    const wave = this.history.length + 1;
    const arch = this.chooseArchetype(wave);
    const plan = composePlan(arch, wave, this.rng, this.entranceCount);
    this.history.push(arch.id);
    if (arch.id === 'boss') this.lastBossWave = wave;
    return plan;
  }
}

function pickPattern(arch, wave, rng, entranceCount) {
  const entries = Object.entries(arch.patterns)
    .filter(([id]) => (id !== 'pincer' || entranceCount > 1) && (wave >= 4 || id === 'stream'))
    .map(([id, weight]) => ({ id, weight }));
  return (rng.weighted(entries) ?? { id: 'stream' }).id;
}

export function composePlan(arch, wave, rng, entranceCount = 1) {
  const comp = arch.compose(wave, rng);
  const traits = rollTraits(traitSlots(wave, rng), wave, arch.id, rng);
  const groups = comp.groups
    .filter((g) => g.count > 0)
    .map((g, i) => ({
      ...g,
      variant: pickVariant(g.category, wave, rng),
      // The lead group always carries every trait; supporting groups each roll per trait.
      traits: traits.filter(() => i === 0 || rng.chance(0.6)),
    }));
  const pattern = pickPattern(arch, wave, rng, entranceCount);
  let entranceMode = 'single';
  if (entranceCount > 1) {
    entranceMode = pattern === 'pincer' ? 'alternate' : rng.weighted([
      { id: 'single', weight: 2 },
      { id: 'random', weight: wave >= 6 ? 2 : 0 },
      { id: 'alternate', weight: wave >= 10 ? 1 : 0 },
    ]).id;
  }
  const isBoss = arch.id === 'boss';
  const total = groups.reduce((s, g) => s + g.count, 0);
  return {
    wave,
    archetype: arch.id,
    label: arch.label,
    tagline: arch.tagline,
    color: arch.color,
    groups,
    total,
    traits,
    traitLabels: traits.map((t) => getTrait(t).label),
    pattern,
    patternLabel: PATTERN_LABELS[pattern] ?? pattern,
    entranceMode,
    spacing: comp.spacing,
    scaling: waveScaling(wave),
    isBoss,
    reward: waveClearReward(wave, isBoss),
  };
}
