// Persistent player profile: unlocked units, battle plan and preferences.
// Storage is injectable so this module stays testable outside the browser.

import { createPlan, MAX_PLAN_TYPES } from './battlePlan.js';

export const PROFILE_KEY = 'endless-tower/profile/v1';

export function memoryStorage() {
  const m = new Map();
  return { memory: true, getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)) };
}

/** localStorage when available and working, otherwise in-memory. */
export function defaultStorage() {
  try {
    const ls = globalThis.localStorage;
    const probe = '__et_probe__';
    ls.setItem(probe, '1');
    ls.removeItem?.(probe);
    return ls;
  } catch {
    return memoryStorage();
  }
}

export class Profile {
  constructor({ storage = defaultStorage(), starterUnits = [] } = {}) {
    this.storage = storage;
    /** False when only an in-memory fallback is available (nothing persists). */
    this.storageOk = !storage.memory;
    this.starterUnits = starterUnits;
    this.data = this.load();
  }

  fresh() {
    return {
      version: 1,
      unlocked: [...this.starterUnits],
      plan: createPlan('Battle Plan Alpha', []),
      // Meta currencies. Coins are per-battle and live in the Game, never here.
      wallet: { tokens: 0 },
      owned: {}, // unitId -> times obtained (duplicates are counted, not duplicated)
      mapHistory: [], // recent battlefields, used to avoid repeats
      battles: 0,
      bestWave: 0,
      wavesCleared: 0,
      weatherEnabled: true,
      muted: false,
      favorites: [], // pinned unit TYPES (never copies, never plan slots)
      rosterSort: 'tier', // Battle Plans roster order within pinned/unpinned: 'tier' | 'acquired'
      planBackup: null, // the plan replaced by the last Auto Build, for Undo
    };
  }

  load() {
    let d = null;
    try {
      d = JSON.parse(this.storage.getItem(PROFILE_KEY) ?? 'null');
    } catch {
      d = null;
    }
    const base = this.fresh();
    if (!d || typeof d !== 'object') return base;
    const unlocked = new Set([...(Array.isArray(d.unlocked) ? d.unlocked : []), ...this.starterUnits]);
    const units = Array.isArray(d.plan?.units) ? [...new Set(d.plan.units.filter((x) => typeof x === 'string'))].slice(0, MAX_PLAN_TYPES) : [];
    return {
      ...base,
      unlocked: [...unlocked],
      plan: createPlan(typeof d.plan?.name === 'string' && d.plan.name.trim() ? d.plan.name.slice(0, 32) : base.plan.name, units),
      // Tokens are the only meta currency; anything else in an old save (e.g. a stray Gem balance) is dropped.
      wallet: { tokens: Math.max(0, Math.floor(Number(d.wallet?.tokens) || 0)) },
      owned: d.owned && typeof d.owned === 'object' ? Object.fromEntries(Object.entries(d.owned).filter(([, v]) => Number(v) > 0).map(([k, v]) => [k, Math.floor(Number(v))])) : {},
      mapHistory: Array.isArray(d.mapHistory) ? d.mapHistory.filter((m) => m && typeof m.biome === 'string').slice(-8) : [],
      battles: Number(d.battles) || 0,
      bestWave: Number(d.bestWave) || 0,
      wavesCleared: Number(d.wavesCleared) || 0,
      weatherEnabled: d.weatherEnabled !== false,
      muted: d.muted === true,
      favorites: Array.isArray(d.favorites) ? [...new Set(d.favorites.filter((x) => typeof x === 'string'))] : [],
      rosterSort: d.rosterSort === 'acquired' ? 'acquired' : 'tier',
      planBackup: d.planBackup && Array.isArray(d.planBackup.units) ? createPlan(String(d.planBackup.name ?? 'Battle Plan').slice(0, 32), d.planBackup.units.filter((x) => typeof x === 'string')) : null,
    };
  }

  save() {
    try {
      this.storage.setItem(PROFILE_KEY, JSON.stringify(this.data));
      return true;
    } catch {
      return false;
    }
  }

  isUnlocked(id) {
    return this.data.unlocked.includes(id);
  }

  unlock(id) {
    if (!this.isUnlocked(id)) {
      this.data.unlocked.push(id);
      this.save();
    }
  }

  balance(currency) {
    return this.data.wallet[currency] ?? 0;
  }

  /** Adds currency (persisted immediately so progress survives crashes and reloads). */
  earn(currency, amount) {
    if (!(amount > 0)) return;
    this.data.wallet[currency] = this.balance(currency) + Math.floor(amount);
    this.save();
  }

  /** Removes currency if affordable. Returns false (and changes nothing) otherwise. */
  spend(currency, amount) {
    if (this.balance(currency) < amount) return false;
    this.data.wallet[currency] = this.balance(currency) - amount;
    return true;
  }

  recordSummon(unitId) {
    this.data.owned[unitId] = (this.data.owned[unitId] ?? 0) + 1;
    if (!this.isUnlocked(unitId)) this.data.unlocked.push(unitId);
  }

  // ---------------------------------------------------------- favorites

  isFavorite(id) {
    return this.data.favorites.includes(id);
  }

  /** Pins/unpins an owned unit type. Returns the new state (or null if the unit isn't owned). */
  toggleFavorite(id) {
    if (!this.isUnlocked(id)) return null;
    const i = this.data.favorites.indexOf(id);
    if (i >= 0) this.data.favorites.splice(i, 1);
    else this.data.favorites.push(id);
    this.save();
    return i < 0;
  }

  /** Acquisition order: position in the unlock history (starter units first). */
  acquiredIndex(id) {
    const i = this.data.unlocked.indexOf(id);
    return i < 0 ? Number.MAX_SAFE_INTEGER : i; // finite, so sort comparators never see NaN
  }

  ownedCount(unitId) {
    return this.data.owned[unitId] ?? 0;
  }

  recordMap(entry) {
    this.data.mapHistory = [...this.data.mapHistory, entry].slice(-8);
    this.save();
  }

  recordWaveCleared() {
    this.data.wavesCleared++;
  }

  get plan() {
    return this.data.plan;
  }

  recordBattle(wave) {
    this.data.battles++;
    this.data.bestWave = Math.max(this.data.bestWave, wave);
    this.save();
  }
}
