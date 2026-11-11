// Core simulation. Completely DOM-free: rendering and UI observe it through
// events and read its state, which lets the whole game run headless in tests.

import { COLS, ROWS, TILE, WORLD_W, WORLD_H, GAME_CONFIG } from '../config.js';
import { createRng, randomSeed, hashString } from '../core/rng.js';
import { Emitter } from '../core/events.js';
import { SpatialHash } from '../core/spatialHash.js';
import { getBiome, pickBiome } from '../maps/biomes.js';
import { generateMap, TileType, tileIndex, inBounds, sampleRoute } from '../maps/mapGenerator.js';
import { WaveDirector } from '../waves/waveDirector.js';
import { buildSpawnSchedule } from '../waves/spawnSchedule.js';
import { getTrait } from '../waves/traits.js';
import { getEnemyCategory } from '../enemies/enemyCategories.js';
import { getUnit } from '../units/unitRegistry.js';
import { createUnit, levelStats, applyPassive, upgradeCost, maxLevel } from '../units/unitStats.js';

const TARGETING = {
  first: (e) => e.d - e.route.length, // furthest along its route
  last: (e) => -(e.d - e.route.length),
  strongest: (e) => e.hp + e.shield,
};

export class Game {
  constructor(options = {}) {
    this.emitter = new Emitter();
    this.hash = new SpatialHash(WORLD_W, WORLD_H, GAME_CONFIG.spatialCellSize);
    this.autoStart = false;
    this.newRun(options);
  }

  on(type, fn) {
    return this.emitter.on(type, fn);
  }

  emit(type, data) {
    this.emitter.emit(type, data);
  }

  // ------------------------------------------------------------------ runs

  /**
   * Starts a new battle. `loadout` is the battle plan: a list of unit ids
   * (up to 12 types). It persists across newRun() calls unless replaced.
   */
  newRun({ seed = randomSeed(), biomeId = null, loadout } = {}) {
    if (loadout) this.setLoadout(loadout);
    else if (!this.loadout) this.loadout = [];
    this.seed = seed >>> 0;
    const rng = createRng(this.seed);
    this.biome = biomeId ? getBiome(biomeId) : pickBiome(rng, this.biome?.id);
    // Mix the biome into the map seed so the same run seed gives each realm its own layout.
    this.map = generateMap(this.biome, (rng.int(0, 2 ** 31 - 1) ^ hashString(this.biome.id)) >>> 0);
    this.director = new WaveDirector(rng.int(0, 2 ** 31 - 1), { entranceCount: this.map.routes.length });
    this.spawnRng = rng.fork();
    this.fxRng = rng.fork();

    this.phase = 'build';
    this.wave = 0;
    this.time = 0;
    this.gold = GAME_CONFIG.startingGold;
    this.towerMaxHp = GAME_CONFIG.towerMaxHp;
    this.towerHp = this.towerMaxHp;
    this.enemies = [];
    this.units = [];
    this.projectiles = [];
    this.projectilePool = [];
    this.deployed = new Map(); // defId -> number of copies on the field
    this.unitByTile = new Array(COLS * ROWS).fill(null);
    this.enemySeq = 0;
    this.currentPlan = null;
    this.nextPlan = this.director.next();
    this.schedule = [];
    this.scheduleIdx = 0;
    this.waveTime = 0;
    this.autoTimer = GAME_CONFIG.autoStartDelay;
    this.cinematic = null;
    this.boss = null;
    this.stats = { kills: 0, leaks: 0, bossesDefeated: 0, damage: 0, unitsDeployed: 0, upgrades: 0, goldSpent: 0, peakUnits: 0 };
    this.emit('runStart', this);
  }

  setLoadout(ids) {
    const defs = [];
    for (const id of ids) {
      const def = getUnit(id);
      if (def && !defs.includes(def)) defs.push(def);
    }
    this.loadout = defs;
  }

  inLoadout(defId) {
    return this.loadout.some((d) => d.id === defId);
  }

  // ------------------------------------------------------------------ waves

  startNextWave() {
    if (this.phase !== 'build') return false;
    this.wave += 1;
    this.currentPlan = this.nextPlan;
    this.nextPlan = this.director.next();
    this.schedule = buildSpawnSchedule(this.currentPlan, this.map, this.spawnRng);
    this.scheduleIdx = 0;
    this.waveTime = 0;
    this.phase = 'wave';
    this.emit('waveStart', this.currentPlan);
    return true;
  }

  get waveRemaining() {
    return this.schedule.length - this.scheduleIdx + this.enemies.length;
  }

  spawnEnemy(ev) {
    const cat = getEnemyCategory(ev.category);
    const v = ev.variant ?? {};
    const s = this.currentPlan.scaling;
    const route = this.map.routes[ev.route];
    const p0 = route.points[0];
    const e = {
      id: ++this.enemySeq,
      category: cat.id,
      cat,
      variant: ev.variant ?? null,
      route,
      routeIndex: ev.route,
      d: ev.offset ?? 0,
      seg: 0,
      x: p0.x,
      y: p0.y,
      ox: 0,
      oy: 0,
      lateral: ev.lateral ?? 0,
      radius: v.radius ?? cat.radius,
      maxHp: (v.hp ?? cat.hp) * s.hp,
      speed: (v.speed ?? cat.speed) * s.speed * this.spawnRng.float(0.94, 1.06),
      towerDamage: Math.max(1, Math.round((v.towerDamage ?? cat.towerDamage) * s.damage)),
      reward: Math.max(1, Math.round((v.reward ?? cat.reward) * s.reward)),
      armor: 0,
      regen: 0,
      shield: 0,
      maxShield: 0,
      traits: ev.traits ?? [],
      flash: 0,
      age: 0,
      lastHit: -10,
      facing: 1,
      phase: this.spawnRng.float(0, Math.PI * 2),
      alive: true,
      invulnerable: false,
      isBoss: cat.id === 'boss',
      intro: 1,
    };
    for (const id of e.traits) getTrait(id)?.apply(e);
    e.hp = e.maxHp;
    if (ev.cinematic) {
      // Bosses materialise just inside the entrance so the arrival is visible.
      e.d = Math.min(route.length * 0.25, TILE * 3.8);
      const at = { x: 0, y: 0, dx: 0, dy: 0 };
      e.seg = sampleRoute(route, e.d, at, 0);
      e.x = at.x;
      e.y = at.y;
      e.invulnerable = true;
      e.intro = 0;
      this.cinematic = { type: 'bossIntro', enemy: e, t: 0, duration: GAME_CONFIG.bossIntroDuration };
    }
    if (e.isBoss) this.boss = e;
    v.onSpawn?.(e, this);
    this.enemies.push(e);
    this.emit('spawn', e);
    if (ev.cinematic) this.emit('bossIntro', { enemy: e, plan: this.currentPlan });
    return e;
  }

  // ------------------------------------------------------------------ update

  update(dt) {
    if (this.phase === 'gameover') return;
    this.time += dt;

    if (this.phase === 'build' && this.autoStart) {
      this.autoTimer -= dt;
      if (this.autoTimer <= 0) this.startNextWave();
    }

    if (this.phase === 'wave') {
      this.waveTime += dt;
      while (this.scheduleIdx < this.schedule.length && this.schedule[this.scheduleIdx].t <= this.waveTime) {
        this.spawnEnemy(this.schedule[this.scheduleIdx++]);
      }
    }

    if (this.cinematic) {
      const c = this.cinematic;
      c.t += dt;
      c.enemy.intro = Math.min(1, c.t / c.duration);
      if (c.t >= c.duration) {
        c.enemy.invulnerable = false;
        c.enemy.intro = 1;
        this.cinematic = null;
        this.emit('bossArrived', c.enemy);
      }
    }

    this.updateEnemies(dt);
    this.hash.clear();
    for (const e of this.enemies) if (e.alive && e.intro >= 1) this.hash.insert(e);
    this.updateUnits(dt);
    this.updateProjectiles(dt);
    this.compact();

    if (this.phase === 'wave' && this.scheduleIdx >= this.schedule.length && this.enemies.length === 0) {
      this.completeWave();
    }
  }

  updateEnemies(dt) {
    const tmp = this._tmp ?? (this._tmp = { x: 0, y: 0, dx: 0, dy: 0 });
    for (const e of this.enemies) {
      if (!e.alive) continue;
      e.age += dt;
      if (e.flash > 0) e.flash -= dt;
      if (e.intro < 1) continue; // boss emerging – holds position
      if (e.regen > 0 && e.hp < e.maxHp && this.time - e.lastHit > 1.5) e.hp = Math.min(e.maxHp, e.hp + e.maxHp * e.regen * dt);
      e.variant?.onUpdate?.(e, dt, this);
      e.d += e.speed * dt;
      if (e.d >= e.route.length) {
        this.leak(e);
        continue;
      }
      e.seg = sampleRoute(e.route, e.d, tmp, e.seg);
      // Lateral spread follows the road's normal, smoothed through corners.
      const k = Math.min(1, dt * 5);
      e.ox += (-tmp.dy * e.lateral - e.ox) * k;
      e.oy += (tmp.dx * e.lateral - e.oy) * k;
      e.x = tmp.x + e.ox;
      e.y = tmp.y + e.oy;
      if (Math.abs(tmp.dx) > 0.3) e.facing = tmp.dx > 0 ? 1 : -1;
    }
  }

  leak(e) {
    e.alive = false;
    this.towerHp = Math.max(0, this.towerHp - e.towerDamage);
    this.stats.leaks++;
    if (this.boss === e) this.boss = null;
    this.emit('leak', e);
    if (this.towerHp <= 0) this.gameOver();
  }

  updateUnits(dt) {
    for (const u of this.units) {
      if (u.recoil > 0) u.recoil = Math.max(0, u.recoil - dt * 6);
      u.def.onUpdate?.(u, dt, this);
      u.cooldown -= dt;
      if (u.cooldown > 0) continue;
      const score = TARGETING[u.def.targeting] ?? TARGETING.first;
      const target = u.def.targeting === 'closest'
        ? this.hash.best(u.x, u.y, u.stats.range, (e) => -((e.x - u.x) ** 2 + (e.y - u.y) ** 2))
        : this.hash.best(u.x, u.y, u.stats.range, score);
      if (!target) {
        u.cooldown = 0.1;
        continue;
      }
      u.angle = Math.atan2(target.y - u.y, target.x - u.x);
      if (Math.abs(target.x - u.x) > 2) u.facing = target.x > u.x ? 1 : -1;
      u.cooldown = 1 / Math.max(0.01, u.stats.rate);
      u.recoil = 1;
      if (u.def.onFire) u.def.onFire(u, target, this);
      else this.fireProjectile(u, target);
    }
  }

  fireProjectile(u, target) {
    const p = this.projectilePool.pop() ?? {};
    p.x = u.x + Math.cos(u.angle) * 6;
    p.y = u.y + Math.sin(u.angle) * 6;
    p.sx = p.x;
    p.sy = p.y;
    p.kind = u.def.projectile?.kind ?? 'bolt';
    p.px = p.x;
    p.py = p.y;
    p.target = target;
    p.tx = target.x;
    p.ty = target.y;
    p.speed = u.stats.projectileSpeed;
    p.damage = u.stats.damage;
    p.splash = u.stats.splash;
    p.color = u.def.projectile?.color ?? '#ffffff';
    p.tier = u.tier;
    p.source = u;
    p.life = 3;
    p.alive = true;
    this.projectiles.push(p);
    this.emit('fire', p);
    return p;
  }

  updateProjectiles(dt) {
    for (const p of this.projectiles) {
      if (!p.alive) continue;
      p.life -= dt;
      if (p.target && p.target.alive) {
        p.tx = p.target.x;
        p.ty = p.target.y;
      } else {
        p.target = null;
      }
      const dx = p.tx - p.x;
      const dy = p.ty - p.y;
      const dist = Math.hypot(dx, dy);
      const step = p.speed * dt;
      p.px = p.x;
      p.py = p.y;
      const hitR = p.target ? p.target.radius * 0.6 : 2;
      if (dist <= step + hitR || p.life <= 0) {
        p.x = p.tx;
        p.y = p.ty;
        p.alive = false;
        this.impact(p);
        continue;
      }
      p.x += (dx / dist) * step;
      p.y += (dy / dist) * step;
    }
  }

  impact(p) {
    if (p.splash > 0) {
      this.hash.each(p.x, p.y, p.splash, (e) => this.damageEnemy(e, p.damage, p.source));
    } else if (p.target) {
      this.damageEnemy(p.target, p.damage, p.source);
    }
    this.emit('impact', p);
  }

  damageEnemy(e, amount, source = null) {
    if (!e.alive || e.invulnerable) return 0;
    let dmg = amount * (1 - e.armor);
    if (e.shield > 0) {
      const absorbed = Math.min(e.shield, dmg);
      e.shield -= absorbed;
      dmg -= absorbed;
    }
    const dealt = Math.min(e.hp, dmg);
    e.hp -= dmg;
    e.flash = 0.1;
    e.lastHit = this.time;
    this.stats.damage += dealt;
    if (source) source.damageDealt += dealt;
    if (e.hp <= 0) this.killEnemy(e, source);
    return dealt;
  }

  killEnemy(e, source) {
    e.alive = false;
    this.gold += e.reward;
    this.stats.kills++;
    if (source) source.kills++;
    e.variant?.onDeath?.(e, this);
    this.emit('death', e);
    if (e.isBoss) {
      this.stats.bossesDefeated++;
      if (this.boss === e) this.boss = null;
      this.emit('bossDefeated', e);
    }
  }

  compact() {
    let w = 0;
    for (let i = 0; i < this.enemies.length; i++) if (this.enemies[i].alive) this.enemies[w++] = this.enemies[i];
    this.enemies.length = w;
    w = 0;
    for (let i = 0; i < this.projectiles.length; i++) {
      const p = this.projectiles[i];
      if (p.alive) this.projectiles[w++] = p;
      else {
        p.target = null;
        p.source = null;
        this.projectilePool.push(p);
      }
    }
    this.projectiles.length = w;
  }

  completeWave() {
    const plan = this.currentPlan;
    this.gold += plan.reward;
    this.phase = 'build';
    this.autoTimer = GAME_CONFIG.autoStartDelay;
    this.emit('waveClear', { wave: this.wave, reward: plan.reward, plan });
  }

  gameOver() {
    if (this.phase === 'gameover') return;
    this.phase = 'gameover';
    this.emit('gameOver', { wave: this.wave, stats: this.stats, biome: this.biome });
  }

  // ------------------------------------------------------------------ units

  canPlace(col, row) {
    return inBounds(col, row) && this.map.grid[tileIndex(col, row)] === TileType.GROUND && !this.unitByTile[tileIndex(col, row)];
  }

  unitAt(col, row) {
    return inBounds(col, row) ? this.unitByTile[tileIndex(col, row)] : null;
  }

  deployedCount(defId) {
    return this.deployed.get(defId) ?? 0;
  }

  /** Context handed to passives. Counts only units actually on the battlefield. */
  passiveContext(def) {
    return { deployed: this.deployedCount(def.id) };
  }

  /** Recomputes effective stats for one unit (level stats + passive). */
  refreshUnit(u) {
    const s = applyPassive(u.def, levelStats(u.def, u.level), this.passiveContext(u.def));
    Object.assign(u.stats, s);
  }

  /**
   * Event-driven refresh: called only when a unit of this type is deployed,
   * sold or upgraded – never per frame. Passives that depend on deployed
   * counts (e.g. Dude Power) update for every copy immediately.
   */
  refreshType(defId) {
    for (const u of this.units) if (u.def.id === defId) this.refreshUnit(u);
    this.emit('statsChanged', defId);
  }

  canDeploy(defId, col, row) {
    const def = getUnit(defId);
    if (!def || !this.inLoadout(defId)) return 'not-in-plan';
    if (!this.canPlace(col, row)) return 'blocked';
    if (this.gold < def.price) return 'gold';
    return null;
  }

  /**
   * Buys and places one copy of a battle-plan unit. There is no cap on copies:
   * deployment is limited only by buildable tiles and gold.
   */
  deploy(defId, col, row) {
    if (this.canDeploy(defId, col, row)) return null;
    const def = getUnit(defId);
    const u = createUnit(def);
    this.gold -= def.price;
    this.stats.goldSpent += def.price;
    u.col = col;
    u.row = row;
    u.x = col * TILE + TILE / 2;
    u.y = row * TILE + TILE / 2;
    u.placed = true;
    u.cooldown = 0.25;
    u.placedAt = this.time;
    this.units.push(u);
    this.unitByTile[tileIndex(col, row)] = u;
    this.deployed.set(def.id, this.deployedCount(def.id) + 1);
    this.stats.unitsDeployed++;
    this.stats.peakUnits = Math.max(this.stats.peakUnits, this.units.length);
    if (def.passive) this.refreshType(def.id);
    else this.refreshUnit(u);
    def.onPlace?.(u, this);
    this.emit('place', u);
    return u;
  }

  sellValue(u) {
    return Math.floor(u.spent * GAME_CONFIG.sellRefund);
  }

  /** Removes a deployed unit for a partial refund. */
  sell(u) {
    const i = this.units.indexOf(u);
    if (i < 0) return 0;
    this.units.splice(i, 1);
    this.unitByTile[tileIndex(u.col, u.row)] = null;
    u.placed = false;
    const refund = this.sellValue(u);
    this.gold += refund;
    this.deployed.set(u.def.id, Math.max(0, this.deployedCount(u.def.id) - 1));
    if (u.def.passive) this.refreshType(u.def.id);
    this.emit('sell', { unit: u, refund });
    return refund;
  }

  /** Preview of the next upgrade: cost and before/after effective stats. */
  upgradeInfo(u) {
    const cost = upgradeCost(u.def, u.level);
    const ctx = this.passiveContext(u.def);
    const current = applyPassive(u.def, levelStats(u.def, u.level), ctx);
    if (cost === null) return { maxed: true, level: u.level, maxLevel: maxLevel(u.def), current };
    return {
      maxed: false,
      level: u.level,
      nextLevel: u.level + 1,
      maxLevel: maxLevel(u.def),
      cost,
      affordable: this.gold >= cost,
      current,
      next: applyPassive(u.def, levelStats(u.def, u.level + 1), ctx),
    };
  }

  upgrade(u) {
    if (!u.placed) return false;
    const cost = upgradeCost(u.def, u.level);
    if (cost === null || this.gold < cost) return false;
    this.gold -= cost;
    u.spent += cost;
    u.level++;
    this.stats.upgrades++;
    this.stats.goldSpent += cost;
    this.refreshUnit(u);
    this.emit('upgrade', u);
    return true;
  }
}
