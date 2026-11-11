// Enemy *categories* are weight classes that wave archetypes compose from.
// They are deliberately generic: no named enemies, abilities or lore. The
// actual roster will be designed later and plugs in as *variants* of a
// category via registerEnemyVariant() – waves pick variants automatically.

const categories = new Map();
const variants = new Map(); // categoryId -> variant[]

const DEFAULTS = {
  hp: 50,
  speed: 45,
  radius: 10,
  towerDamage: 1,
  reward: 5,
  silhouette: 'regular',
  drawOrder: 1,
};

export function registerEnemyCategory(def) {
  if (!def.id) throw new Error('Enemy category needs an id');
  categories.set(def.id, Object.freeze({ ...DEFAULTS, ...def }));
  if (!variants.has(def.id)) variants.set(def.id, []);
}

export const getEnemyCategory = (id) => {
  const c = categories.get(id);
  if (!c) throw new Error(`Unknown enemy category "${id}"`);
  return c;
};
export const listEnemyCategories = () => [...categories.values()];

/**
 * Future roster hook. A variant may override any category stat and provide
 * `weight`, `minWave`, `render(ctx, enemy, t)` and lifecycle hooks
 * (`onSpawn(enemy, game)`, `onUpdate(enemy, dt, game)`, `onDeath(enemy, game)`).
 */
export function registerEnemyVariant(categoryId, variant) {
  if (!categories.has(categoryId)) throw new Error(`Unknown enemy category "${categoryId}"`);
  if (!variant.id) throw new Error('Enemy variant needs an id');
  variants.get(categoryId).push(Object.freeze({ weight: 1, minWave: 1, ...variant }));
}

export function pickVariant(categoryId, wave, rng) {
  const pool = (variants.get(categoryId) ?? []).filter((v) => wave >= v.minWave);
  return pool.length ? rng.weighted(pool) ?? null : null;
}

export const EnemyCategory = Object.freeze({ MINION: 'minion', REGULAR: 'regular', ELITE: 'elite', BOSS: 'boss' });

registerEnemyCategory({ id: 'minion', hp: 13, speed: 64, radius: 7, towerDamage: 1, reward: 2, silhouette: 'minion', drawOrder: 0 });
registerEnemyCategory({ id: 'regular', hp: 62, speed: 47, radius: 11, towerDamage: 2, reward: 7, silhouette: 'regular', drawOrder: 1 });
registerEnemyCategory({ id: 'elite', hp: 360, speed: 35, radius: 16, towerDamage: 5, reward: 32, silhouette: 'elite', drawOrder: 2 });
registerEnemyCategory({ id: 'boss', hp: 2900, speed: 22, radius: 30, towerDamage: 20, reward: 260, silhouette: 'boss', drawOrder: 3 });
