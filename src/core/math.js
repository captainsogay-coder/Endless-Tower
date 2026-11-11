export const TAU = Math.PI * 2;
export const clamp = (v, min, max) => (v < min ? min : v > max ? max : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
export const easeInOutSine = (t) => -(Math.cos(Math.PI * t) - 1) / 2;
export const easeOutBack = (t) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};

const ROMAN = [
  [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'],
  [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I'],
];
export function toRoman(n) {
  if (!Number.isInteger(n) || n < 1 || n > 3999) return String(n);
  let out = '';
  for (const [v, s] of ROMAN) while (n >= v) { out += s; n -= v; }
  return out;
}

const SUFFIXES = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc'];
/** Compact number formatting that stays readable for arbitrarily large values. */
export function formatNumber(n) {
  if (!Number.isFinite(n)) return n > 0 ? '∞' : '-∞';
  const a = Math.abs(n);
  if (a < 1000) return String(Math.round(n));
  let e = Math.floor(Math.log10(a) / 3);
  // 999,950 would round to "1000K" – promote it to the next suffix instead.
  if (Math.abs(n / Math.pow(10, e * 3)) >= 999.5) e++;
  if (e < SUFFIXES.length) {
    const v = n / Math.pow(10, e * 3);
    const s = Math.abs(v) < 10 ? v.toFixed(2) : Math.abs(v) < 100 ? v.toFixed(1) : v.toFixed(0);
    return s + SUFFIXES[e];
  }
  return n.toExponential(2).replace('+', '');
}
