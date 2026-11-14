// Side tiers: five independent ratings per unit type (DPS, AOE, Summon,
// Empower, Economy) on the same 1–20+ scale as the overall combat tier.
//
// The numbers are MEASURED, not hand-assigned: src/meta/sideTierBench.js runs
// headless battles and scripts/side-tiers.mjs writes the results to
// src/units/sideTiers.data.js together with a signature of every unit's
// definition (stats, ability numbers and ability code, global balance). When a
// unit changes, its signature no longer matches, `isStale()` reports it and
// the test suite fails until `npm run ratings` is re-run.
//
// This module is the single source for everything that shows, sorts or picks
// by side tier (unit panel, Battle Plans, collection filters, summon results,
// Auto Pick).

import { SIDE_TIER_DATA } from '../units/sideTiers.data.js';
import { ABILITIES } from '../game/abilities.js';
import { BALANCE, TIERS } from '../balance.js';
import { getUnit } from '../units/unitRegistry.js';

export const CATEGORIES = [
  {
    id: 'dps',
    label: 'DPS',
    name: 'DPS',
    color: '#e0644a',
    measures: 'Damage it deals to a single tough target per second – attack speed, damage, crits, timed strikes and reach all count.',
  },
  {
    id: 'aoe',
    label: 'AOE',
    name: 'AOE',
    color: '#e3a33c',
    measures: 'Extra damage it spreads across a group of enemies (blasts, chains, burning ground, zones) plus how much it slows or holds groups.',
  },
  {
    id: 'summon',
    label: 'SUM',
    name: 'Summon',
    color: '#5fae6e',
    measures: 'Damage of the allies and drones it creates, averaged over a long fight so cooldowns and uptime count.',
  },
  {
    id: 'empower',
    label: 'EMP',
    name: 'Empower',
    color: '#6f9be0',
    measures: 'How much stronger it makes other units: buffs to allies and weaknesses it puts on enemies. Map-wide effects count fully; faction-only or own-type-only buffs count less.',
  },
  {
    id: 'economy',
    label: 'ECO',
    name: 'Economy',
    color: '#d6c04a',
    measures: 'Extra coins it actually produces (passive income, bonus rewards, coin multipliers) minus its own price over a 3-minute stretch. Rating n ≈ its net income would buy a Tier n unit.',
  },
];

export const CATEGORY_IDS = CATEGORIES.map((c) => c.id);
export const categoryOf = (id) => CATEGORIES.find((c) => c.id === id) ?? null;

// ---------------------------------------------------------------- signatures

function fnv1a(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

const SKIP = new Set(['name', 'description', 'role', 'art', 'portrait', 'flavor', 'tagline']);

function stable(value) {
  return JSON.stringify(value, function (key, v) {
    if (SKIP.has(key) && this && typeof this === 'object' && 'tier' in this) return undefined; // cosmetic unit fields
    if (typeof v === 'function') return `fn:${v.toString()}`;
    if (v === Infinity) return 'Infinity';
    if (v && typeof v === 'object' && !Array.isArray(v)) return Object.fromEntries(Object.keys(v).sort().map((k) => [k, v[k]]));
    return v;
  });
}

/** Everything about the global balance that changes how any unit performs. */
export const balanceSignature = () => fnv1a(stable({ global: BALANCE.global, caps: BALANCE.caps, upgrades: BALANCE.upgrades, splash: BALANCE.splashFalloff, waves: BALANCE.waveScaling, tiers: TIERS }));

/** Hash of everything about a unit that affects its performance. */
export function unitSignature(defOrId) {
  // always the registered definition: that is what battles (and the bench) use
  const def = getUnit(typeof defOrId === 'string' ? defOrId : defOrId.id) ?? defOrId;
  const handler = def.ability ? ABILITIES[def.ability.id] : null;
  return fnv1a(stable({ def, handler }));
}

// ---------------------------------------------------------------- lookup

const EMPTY = Object.freeze({ dps: null, aoe: null, summon: null, empower: null, economy: null });

/** Ratings for a unit type ({dps, aoe, summon, empower, economy}; null = N/A). */
export function sideTiers(defOrId) {
  const id = typeof defOrId === 'string' ? defOrId : defOrId?.id;
  return SIDE_TIER_DATA.units[id]?.ratings ?? EMPTY;
}

/** Raw measurements behind the ratings (for tooltips). */
export const sideTierRaw = (defOrId) => SIDE_TIER_DATA.units[typeof defOrId === 'string' ? defOrId : defOrId?.id]?.raw ?? null;

/** A rating as players see it: a whole number ≥ 1, or N/A. */
export const ratingText = (v) => (v == null ? 'N/A' : String(Math.max(1, Math.round(v))));

/** Sort key: N/A sorts below every real rating. */
export const ratingKey = (v) => (v == null ? -1 : v);

/** True when the stored ratings no longer describe this unit (balance or ability changed). */
export function isStale(def) {
  const rec = SIDE_TIER_DATA.units[def.id];
  return !rec || rec.sig !== unitSignature(def) || SIDE_TIER_DATA.balance !== balanceSignature();
}

/** The unit's strongest side (for a one-word summary such as "Economy"). */
export function bestSide(def) {
  const r = sideTiers(def);
  let best = null;
  for (const c of CATEGORIES) if (r[c.id] != null && (!best || r[c.id] > r[best.id])) best = c;
  return best;
}

/** One-line explanation of a rating, using the measured numbers. */
export function ratingDetail(def, cat) {
  const raw = sideTierRaw(def);
  const r = sideTiers(def)[cat];
  const c = categoryOf(cat);
  if (r == null) return `${c.name}: N/A – it has no meaningful ${c.name.toLowerCase()} contribution.`;
  if (!raw) return `${c.name} ${ratingText(r)}`;
  const n = (v) => (v >= 100 ? Math.round(v) : Math.round(v * 10) / 10);
  switch (cat) {
    case 'dps':
      return `${c.name} ${ratingText(r)}: ${n(raw.dps)} effective damage per second on one target (wave 10, level 0).`;
    case 'aoe':
      return `${c.name} ${ratingText(r)}: +${n(raw.aoe)} damage per second spread over a group, including slows.`;
    case 'summon':
      return `${c.name} ${ratingText(r)}: its summons deal ${n(raw.summon)} damage per second over a long fight.`;
    case 'empower':
      return `${c.name} ${ratingText(r)}: raises nearby allies' damage by ${Math.round(raw.uplift * 1000) / 10}%.`;
    case 'economy':
      return `${c.name} ${ratingText(r)}: +${raw.grossPerMin} coins/min; ${raw.net >= 0 ? `net +${raw.net}` : `net ${raw.net}`} over 3 min after its price${raw.payback ? `, pays for itself in ${raw.payback} s` : ''}.`;
    default:
      return '';
  }
}
