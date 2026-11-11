// Seeded randomness. Everything random in the game flows through these so runs
// are reproducible from a single seed (useful for testing and sharing runs).

export function randomSeed() {
  return Math.floor(Math.random() * 4294967296) >>> 0;
}

export function hashString(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** mulberry32-based RNG with convenience helpers. */
export function createRng(seed = randomSeed()) {
  let state = seed >>> 0 || 0x9e3779b9;
  const next = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const rng = {
    seed: seed >>> 0,
    next,
    float: (min = 0, max = 1) => min + (max - min) * next(),
    int: (min, max) => min + Math.floor(next() * (max - min + 1)),
    chance: (p) => next() < p,
    sign: () => (next() < 0.5 ? -1 : 1),
    pick: (arr) => arr[Math.floor(next() * arr.length)],
    /** Picks an entry proportionally to weightOf(entry). Returns undefined if all weights are 0. */
    weighted(entries, weightOf = (e) => e.weight) {
      let total = 0;
      for (const e of entries) total += Math.max(0, weightOf(e));
      if (total <= 0) return undefined;
      let r = next() * total;
      let lastPositive;
      for (const e of entries) {
        const w = Math.max(0, weightOf(e));
        if (w <= 0) continue;
        lastPositive = e;
        r -= w;
        if (r < 0) return e;
      }
      return lastPositive;
    },
    shuffle(arr) {
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
    },
    fork: () => createRng(Math.floor(next() * 4294967296)),
  };
  return rng;
}

/** Smooth 2D value noise in [0,1]. */
export function createNoise2D(seed) {
  const rng = createRng(seed);
  const perm = new Uint8Array(512);
  const vals = new Float32Array(256);
  const p = Array.from({ length: 256 }, (_, i) => i);
  rng.shuffle(p);
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
  for (let i = 0; i < 256; i++) vals[i] = rng.next();
  const h = (x, y) => vals[perm[(x & 255) + perm[y & 255]]];
  return (x, y) => {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const xf = x - xi;
    const yf = y - yi;
    const u = xf * xf * (3 - 2 * xf);
    const v = yf * yf * (3 - 2 * yf);
    const a = h(xi, yi);
    const b = h(xi + 1, yi);
    const c = h(xi, yi + 1);
    const d = h(xi + 1, yi + 1);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  };
}

export function fbm(noise, x, y, octaves = 3) {
  let amp = 1;
  let freq = 1;
  let sum = 0;
  let norm = 0;
  for (let i = 0; i < octaves; i++) {
    sum += noise(x * freq, y * freq) * amp;
    norm += amp;
    amp *= 0.5;
    freq *= 2;
  }
  return sum / norm;
}
