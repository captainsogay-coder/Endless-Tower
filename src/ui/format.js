// Small, shared presentation helpers for UI text.
import { TILE } from '../config.js';

export const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

/** Range in tiles, e.g. 64px → "2", 72px → "2.25". */
export const tiles = (px) => String(Math.round((px / TILE) * 100) / 100);

export function upgradeRange(def) {
  const costs = def.levels.slice(1).map((l) => l.cost);
  if (!costs.length) return 'none';
  return `${Math.min(...costs)}–${Math.max(...costs)} coins`;
}

/** Sample points showing how a count-based passive scales. */
export function passiveScale(def, counts = [1, 2, 5, 10, 25]) {
  return counts.map((n) => [n, def.passive.bonus({ deployed: n, count: () => n })]);
}
