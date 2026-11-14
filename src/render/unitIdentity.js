// Unit identity on the battlefield: every unit is a painted miniature on a base.
//
//   base size + rim metal → overall tier band (iron, bronze, silver, gold, platinum)
//   painted front edge    → the summoning circle it comes from (faction colour)
//   figure scale          → grows gently with tier, so heroes stand taller
//
// This keeps hundreds of units readable on a busy field without glows: tier
// and faction read from the ground up, the silhouette stays the unit's own.

import { makeCanvas } from './canvas.js';
import { listBanners } from '../units/summoning.js';
import { TAU } from '../core/math.js';

/** Faction colours, one per summoning circle (starter units use plain stone). */
export const CIRCLE_TRIM = {
  'military-circle': '#7f8f48',
  'advanced-military-circle': '#b44d3f',
  'wild-west-circle': '#c58d4c',
  'gambino-circle': '#2f9a68',
  'nuclear-war-circle': '#d4c03c',
  'village-militia-circle': '#b8a25c',
  'town-guard-circle': '#4f75c4',
  'siege-workshop-circle': '#9b6a3a',
};
const STARTER_TRIM = '#8f8a80';

export const TIER_METAL = [
  { upTo: 3, name: 'iron', rim: '#77736a', hi: '#a19c92' },
  { upTo: 6, name: 'bronze', rim: '#a8733b', hi: '#d9a56a' },
  { upTo: 10, name: 'silver', rim: '#b9bec6', hi: '#eef1f5' },
  { upTo: 14, name: 'gold', rim: '#d6ab3e', hi: '#fbe39a' },
  { upTo: Infinity, name: 'platinum', rim: '#d9d4ee', hi: '#ffffff' },
];

export const tierBand = (tier) => TIER_METAL.findIndex((m) => tier <= m.upTo);

let circleOf = null;
/** Faction colour of a unit type (from the circle whose pool contains it). */
export function trimOf(defId) {
  if (!circleOf) {
    circleOf = new Map();
    for (const b of listBanners()) for (const p of b.pool) if (!circleOf.has(p.unit)) circleOf.set(p.unit, CIRCLE_TRIM[b.id] ?? STARTER_TRIM);
  }
  return circleOf.get(defId) ?? STARTER_TRIM;
}

/** Arts whose own drawing is a vehicle/emplacement footprint: they grow less. */
const LARGE = new Set(['tank', 'fortress', 'theHouse', 'icbm', 'nuclearWarhead', 'antimatter', 'bomber', 'b2', 'missileLauncher', 'catapult', 'trebuchet', 'ballista', 'miniBallista', 'drone', 'battalion']);

/** Figure scale: a touch larger than the old art for legibility, + up to ~25% by tier. */
export function unitScale(def) {
  if (LARGE.has(def.art)) return 1 + Math.min(0.12, (def.tier - 1) * 0.008);
  return 1.12 + Math.min(0.26, (def.tier - 1) * 0.019);
}

/** Base radius (world px) by tier band; vehicles get a wider plate. */
export function baseRadius(def) {
  const band = tierBand(def.tier);
  return (LARGE.has(def.art) ? 13 : 8.5) + band * 1.3;
}

const RES = 3;
const baseCache = new Map();

/**
 * Cached base sprite: dark top with a lit upper-left edge, metal rim for the
 * tier band, the faction colour painted along the front edge. Summoned
 * allies get a ghosted, dashed rim so they never read as deployed units.
 */
export function baseSprite(def, ally = false) {
  const band = tierBand(def.tier);
  const trim = trimOf(def.id);
  const rx = baseRadius(def);
  const key = `${band}|${trim}|${rx}|${ally ? 1 : 0}`;
  let s = baseCache.get(key);
  if (s) return s;
  const ry = rx * 0.42;
  const pad = 3;
  const w = (rx + pad) * 2;
  const h = (ry + pad) * 2 + 2;
  const c = makeCanvas(Math.ceil(w * RES), Math.ceil(h * RES));
  const g = c.getContext('2d');
  g.setTransform(RES, 0, 0, RES, (rx + pad) * RES, (ry + pad) * RES);
  const m = TIER_METAL[band];
  // contact shadow, offset away from the top-left light
  g.fillStyle = 'rgba(10,8,12,0.38)';
  g.beginPath();
  g.ellipse(1.4, 1.6, rx + 0.6, ry + 0.6, 0, 0, TAU);
  g.fill();
  if (ally) {
    g.fillStyle = 'rgba(30,28,24,0.45)';
    g.beginPath();
    g.ellipse(0, 0, rx, ry, 0, 0, TAU);
    g.fill();
    g.setLineDash([2.2, 1.6]);
    g.strokeStyle = trim;
    g.lineWidth = 1.1;
    g.stroke();
    g.setLineDash([]);
  } else {
    // base side (thickness) then the top
    g.fillStyle = '#15130f';
    g.beginPath();
    g.ellipse(0, 1.2, rx, ry, 0, 0, TAU);
    g.fill();
    g.fillStyle = '#2a2720';
    g.beginPath();
    g.ellipse(0, 0, rx, ry, 0, 0, TAU);
    g.fill();
    // painted faction edge along the front (lower) half
    g.strokeStyle = trim;
    g.lineWidth = 1.6;
    g.beginPath();
    g.ellipse(0, 0.3, rx - 0.9, ry - 0.5, 0, 0.12, Math.PI - 0.12);
    g.stroke();
    // metal rim, lit at the top-left
    g.strokeStyle = m.rim;
    g.lineWidth = band >= 3 ? 1.3 : 1;
    g.beginPath();
    g.ellipse(0, 0, rx, ry, 0, 0, TAU);
    g.stroke();
    g.strokeStyle = m.hi;
    g.lineWidth = 0.9;
    g.beginPath();
    g.ellipse(0, 0, rx, ry, 0, Math.PI * 1.05, Math.PI * 1.6);
    g.stroke();
  }
  s = { img: c, ox: -(rx + pad), oy: -(ry + pad), w, h };
  baseCache.set(key, s);
  return s;
}
