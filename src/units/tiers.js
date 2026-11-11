// Unit tier progression. Tiers are an unbounded integer scale (1, 2, 3, …):
// getTier(n) works for any n ≥ 1 and produces sensible defaults. Specific tiers
// can be customised (name, colour, power, odds) with defineTier() without
// touching any other system – this is the hook for the future tier design.

import { toRoman } from '../core/math.js';
import { hslToHex } from '../core/color.js';

export const TIER_SETTINGS = {
  /** Default power multiplier growth per tier (power = growth^(tier-1)). */
  powerGrowth: 1.75,
};

const overrides = new Map();
const cache = new Map();

// Display colours for the first tiers; beyond these the hue keeps rotating.
const BASE_HUES = [210, 140, 200, 275, 42, 352];

function defaultColor(index) {
  if (index === 1) return '#9aa7b8';
  const hue = index <= BASE_HUES.length ? BASE_HUES[index - 1] : (BASE_HUES[BASE_HUES.length - 1] + (index - BASE_HUES.length) * 47) % 360;
  return hslToHex(hue, 70 + Math.min(20, index), 58);
}

export function defineTier(index, props) {
  if (!Number.isInteger(index) || index < 1) throw new Error('Tier index must be an integer ≥ 1');
  overrides.set(index, { ...(overrides.get(index) ?? {}), ...props });
  cache.delete(index);
}

export function getTier(index) {
  if (!Number.isInteger(index) || index < 1) throw new Error(`Invalid tier ${index}`);
  let t = cache.get(index);
  if (t) return t;
  t = Object.freeze({
    index,
    label: `Tier ${toRoman(index)}`,
    short: toRoman(index),
    color: defaultColor(index),
    power: Math.pow(TIER_SETTINGS.powerGrowth, index - 1),
    /** Tiers beyond the first six get an animated prismatic treatment in the UI. */
    prismatic: index > BASE_HUES.length,
    ...(overrides.get(index) ?? {}),
  });
  cache.set(index, t);
  return t;
}

export function compareTiers(a, b) {
  return a - b;
}
