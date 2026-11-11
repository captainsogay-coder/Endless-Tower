// Persistent player profile: unlocked units, battle plan and preferences.
// Storage is injectable so this module stays testable outside the browser.

import { createPlan, MAX_PLAN_TYPES } from './battlePlan.js';

export const PROFILE_KEY = 'endless-tower/profile/v1';

export function memoryStorage() {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)) };
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
    this.starterUnits = starterUnits;
    this.data = this.load();
  }

  fresh() {
    return {
      version: 1,
      unlocked: [...this.starterUnits],
      plan: createPlan('Battle Plan Alpha', []),
      realm: null,
      battles: 0,
      bestWave: 0,
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
      realm: typeof d.realm === 'string' ? d.realm : null,
      battles: Number(d.battles) || 0,
      bestWave: Number(d.bestWave) || 0,
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

  get plan() {
    return this.data.plan;
  }

  recordBattle(wave) {
    this.data.battles++;
    this.data.bestWave = Math.max(this.data.bestWave, wave);
    this.save();
  }
}
