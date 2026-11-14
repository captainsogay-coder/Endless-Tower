// Core simulation. Completely DOM-free: rendering and UI observe it through
// events and read its state, which lets the whole game run headless in tests.

import { COLS, ROWS, TILE, WORLD_W, WORLD_H, GAME_CONFIG } from '../config.js';
import { createRng, randomSeed, hashString } from '../core/rng.js';
import { Emitter } from '../core/events.js';
import { SpatialHash } from '../core/spatialHash.js';
import { getBiome, pickBiome } from '../maps/biomes.js';
import { biomeWithVariant } from '../maps/rotation.js';
import { generateMap, TileType, tileIndex, inBounds, sampleRoute } from '../maps/mapGenerator.js';
import { WaveDirector } from '../waves/waveDirector.js';
import { buildSpawnSchedule } from '../waves/spawnSchedule.js';
import { getTrait } from '../waves/traits.js';
import { getEnemyCategory } from '../enemies/enemyCategories.js';
import { getUnit, listUnits, getAllyDef } from '../units/unitRegistry.js';
import { applyStatus, statusSpeedMultiplier, statusDamageTakenMultiplier, computeAuras, applyModifiers, scaledBuff, HAZARD_TICK } from './effects.js';
import { abilityOf } from './abilities.js';
import { BALANCE, tokensForWave, waveDamageBonus } from '../balance.js';
import { WeatherSystem, WEATHER_SETTINGS } from './weather.js';
import { createUnit, levelStats, applyPassive, upgradeCost, maxLevel } from '../units/unitStats.js';

let allySeq = 0;

const isDrone = (p) => p.kind === 'drone' || p.kind === 'explosive-drone';

const TARGETING = {
  first: (e) => e.d - e.route.length, // furthest along its route
  last: (e) => -(e.d - e.route.length),
  strongest: (e) => e.hp + e.shield,
};

export class Game {
  constructor(options = {}) {
    this.emitter = new Emitter();
    this.hash = new SpatialHash(WORLD_W, WORLD_H, GAME_CONFIG.spatialCellSize);
    this.autoSkip = false;
    this.weatherEnabled = options.weatherEnabled ?? true;
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
  newRun({ seed = randomSeed(), biomeId = null, variantId = null, avoidStyles = [], loadout } = {}) {
    if (loadout) this.setLoadout(loadout);
    else if (!this.loadout) this.loadout = [];
    this.seed = seed >>> 0;
    const rng = createRng(this.seed);
    // Battlefields are assigned by the game (see maps/rotation.js); biomeId/variantId
    // are only passed by the rotation, tests and local debugging.
    const id = biomeId ?? pickBiome(rng, this.biome?.id).id;
    const variants = getBiome(id).variants ?? [];
    this.biome = biomeWithVariant(id, variantId ?? (variants.length ? rng.pick(variants).id : null));
    // Mix the biome into the map seed so the same run seed gives each realm its own layout.
    this.map = generateMap(this.biome, (rng.int(0, 2 ** 31 - 1) ^ hashString(this.biome.id)) >>> 0, { avoidStyles });
    this.director = new WaveDirector(rng.int(0, 2 ** 31 - 1), { entranceCount: this.map.routes.length });
    this.spawnRng = rng.fork();
    this.fxRng = rng.fork();
    this.combatRng = rng.fork();

    this.phase = 'build';
    this.wave = 0; // highest wave number started
    this.time = 0;
    this.coins = GAME_CONFIG.startingCoins;
    this.towerMaxHp = GAME_CONFIG.towerMaxHp;
    this.towerHp = this.towerMaxHp;
    this.enemies = [];
    this.units = [];
    this.projectiles = [];
    this.projectilePool = [];
    this.hazards = [];
    this.hazardTimer = 0;
    this.allies = []; // temporary combatants (summoned Outlaws, Battalion soldiers) – never "deployed"
    this.timers = []; // delayed actions: bursts, bombs, aftershocks
    this.fields = []; // gravity fields
    // Battle-long bonuses (e.g. THE HOUSE's House Edge). Capped, reset every battle.
    this.battleBonus = { damage: 0 };
    this.houseKills = 0;
    this.tokensEarned = 0;
    this.deployed = new Map(); // defId -> number of copies on the field
    this.unitByTile = new Array(COLS * ROWS).fill(null);
    this.enemySeq = 0;
    // Waves: any number can run at once. `queue` holds called waves that are
    // released one by one (staggered) into `activeWaves`.
    this.activeWaves = [];
    this.queue = [];
    this.queueTimer = 0;
    this.currentPlan = null;
    this.nextPlan = this.director.next();
    this.cinematic = null;
    this.boss = null;
    this.coinMult = 1;
    this.weather = new WeatherSystem(rng.fork(), { enabled: this.weatherEnabled });
    this.weather.onChange = (w) => {
      this.refreshAll();
      this.emit('weather', w);
    };
    this.stats = { kills: 0, leaks: 0, bossesDefeated: 0, damage: 0, unitsDeployed: 0, upgrades: 0, coinsSpent: 0, peakUnits: 0, wavesCleared: 0, lightning: 0, dronesLaunched: 0, bonusCoins: 0, alliesSummoned: 0 };
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

  setWeatherEnabled(on) {
    this.weatherEnabled = !!on;
    this.weather.setEnabled(on);
  }

  // ------------------------------------------------------------------ waves

  /** Calls the next wave. Waves can be called at any time and run concurrently. */
  startNextWave() {
    if (this.phase === 'gameover') return false;
    return this.callWaves(1) > 0;
  }

  /**
   * Calls the next `n` waves. The first starts immediately (if nothing is
   * waiting); the rest are released `waveStagger` seconds apart so a call of
   * 100 waves never spawns everything in one frame.
   */
  callWaves(n = 1) {
    if (this.phase === 'gameover') return 0;
    const count = Math.max(0, Math.min(GAME_CONFIG.maxWaveCall, Math.floor(n)));
    for (let i = 0; i < count; i++) {
      this.queue.push(this.nextPlan);
      this.nextPlan = this.director.next();
    }
    if (count && this.queueTimer <= 0) this.releaseQueuedWave();
    if (count) this.emit('wavesCalled', { count, queued: this.queue.length });
    return count;
  }

  releaseQueuedWave() {
    const plan = this.queue.shift();
    if (!plan) return null;
    const wave = { number: plan.wave, plan, schedule: buildSpawnSchedule(plan, this.map, this.spawnRng), idx: 0, t: 0, alive: 0 };
    this.activeWaves.push(wave);
    this.wave = Math.max(this.wave, plan.wave);
    this.currentPlan = plan;
    this.phase = 'wave';
    this.queueTimer = GAME_CONFIG.waveStagger;
    this.emit('waveStart', plan);
    return wave;
  }

  /** Wave numbers currently in progress / waiting to start. */
  activeWaveNumbers() {
    return this.activeWaves.map((w) => w.number);
  }

  queuedWaveNumbers() {
    return this.queue.map((p) => p.wave);
  }

  /** Enemies still to come or alive across all active and queued waves. */
  get waveRemaining() {
    let n = 0;
    for (const w of this.activeWaves) n += w.schedule.length - w.idx + w.alive;
    for (const p of this.queue) n += p.total;
    return n;
  }

  get waveTotal() {
    let n = 0;
    for (const w of this.activeWaves) n += w.plan.total;
    for (const p of this.queue) n += p.total;
    return n;
  }

  spawnEnemy(ev, wave = this.activeWaves[this.activeWaves.length - 1]) {
    const cat = getEnemyCategory(ev.category);
    const v = ev.variant ?? {};
    const s = wave.plan.scaling;
    const route = this.map.routes[ev.route];
    const p0 = route.points[0];
    const e = {
      id: ++this.enemySeq,
      wave,
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
    wave.alive++;
    this.enemies.push(e);
    this.emit('spawn', e);
    if (ev.cinematic) this.emit('bossIntro', { enemy: e, plan: wave.plan });
    return e;
  }

  updateWaves(dt) {
    // release staggered queued waves
    if (this.queueTimer > 0) this.queueTimer -= dt;
    while (this.queue.length && this.queueTimer <= 0) this.releaseQueuedWave();
    // spawn from every active wave's own schedule
    for (const w of this.activeWaves) {
      w.t += dt;
      while (w.idx < w.schedule.length && w.schedule[w.idx].t <= w.t) this.spawnEnemy(w.schedule[w.idx++], w);
    }
    // Auto Skip: as soon as the newest wave has finished spawning, call the next one.
    if (this.autoSkip && !this.queue.length) {
      const newest = this.activeWaves[this.activeWaves.length - 1];
      if (!newest || newest.idx >= newest.schedule.length) this.callWaves(1);
    }
  }

  // ------------------------------------------------------------------ update

  update(dt) {
    if (this.phase === 'gameover') return;
    this.time += dt;

    this.updateWaves(dt);

    const strikes = this.weather.update(dt);

    this.updateEnemies(dt);
    this.hash.clear();
    for (const e of this.enemies) if (e.alive && e.intro >= 1) this.hash.insert(e);
    for (let i = 0; i < strikes; i++) this.lightningStrike();
    this.updateTimers();
    this.updateFields(dt);
    this.updateUnits(dt);
    this.updateAllies(dt);
    this.updateProjectiles(dt);
    this.updateHazards(dt);
    this.compact();
    this.checkWaves();
  }

  checkWaves() {
    if (!this.activeWaves.length) return;
    let w = 0;
    for (let i = 0; i < this.activeWaves.length; i++) {
      const wave = this.activeWaves[i];
      if (wave.idx >= wave.schedule.length && wave.alive <= 0) {
        this.completeWave(wave);
        if (this.phase === 'gameover') return;
      } else {
        this.activeWaves[w++] = wave;
      }
    }
    this.activeWaves.length = w;
    if (!this.activeWaves.length && !this.queue.length && this.phase === 'wave') this.phase = 'build';
  }

  updateEnemies(dt) {
    const tmp = this._tmp ?? (this._tmp = { x: 0, y: 0, dx: 0, dy: 0 });
    for (const e of this.enemies) {
      if (!e.alive) continue;
      e.age += dt;
      if (e.flash > 0) e.flash -= dt;
      if (e.intro < 1) {
        // Boss emerging: holds position, invulnerable, until its intro completes.
        e.intro = Math.min(1, e.intro + dt / GAME_CONFIG.bossIntroDuration);
        if (this.cinematic?.enemy === e) this.cinematic.t = e.intro * this.cinematic.duration;
        if (e.intro >= 1) {
          e.invulnerable = false;
          if (this.cinematic?.enemy === e) this.cinematic = null;
          this.emit('bossArrived', e);
        }
        continue;
      }
      if (e.regen > 0 && e.hp < e.maxHp && this.time - e.lastHit > 1.5) e.hp = Math.min(e.maxHp, e.hp + e.maxHp * e.regen * dt);
      e.variant?.onUpdate?.(e, dt, this);
      if (e.gravity && e.gravity.until > this.time) {
        // held by a gravity field: no progress along the road, drawn toward its centre
        e.seg = sampleRoute(e.route, e.d, tmp, e.seg);
        const g = Math.min(1, dt * 3);
        e.ox += (e.gravity.x - tmp.x - e.ox) * g;
        e.oy += (e.gravity.y - tmp.y - e.oy) * g;
        e.x = tmp.x + e.ox;
        e.y = tmp.y + e.oy;
        continue;
      }
      e.d += e.speed * (e.statuses ? statusSpeedMultiplier(e, this.time) : 1) * dt;
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

  removeEnemy(e) {
    e.alive = false;
    if (e.wave) e.wave.alive--;
    if (this.boss === e) this.boss = this.enemies.find((o) => o.alive && o.isBoss && o !== e) ?? null;
  }

  leak(e) {
    this.removeEnemy(e);
    this.towerHp = Math.max(0, this.towerHp - e.towerDamage);
    this.stats.leaks++;
    this.emit('leak', e);
    if (this.towerHp <= 0) this.gameOver();
  }

  /** Thunderstorm: strike a random enemy; everything in the blast takes 7% of its max HP. */
  lightningStrike() {
    const candidates = this.enemies.filter((e) => e.alive && !e.invulnerable && e.intro >= 1);
    if (!candidates.length) return null;
    const target = candidates[Math.floor(this.combatRng.next() * candidates.length)];
    const S = WEATHER_SETTINGS;
    const scale = (target.wave?.plan.scaling.hp ?? 1);
    const base = S.lightningBaseDamage * scale;
    const { x, y } = target;
    const hit = [];
    this.hash.each(x, y, S.lightningRadius, (e) => hit.push(e));
    if (!hit.includes(target)) hit.push(target);
    // area damage: every enemy in the blast loses 7% of its own max HP (plus a small flat amount)
    for (const e of hit) this.damageEnemy(e, base + e.maxHp * S.lightningMaxHpFraction, null);
    this.stats.lightning++;
    this.emit('lightning', { x, y, radius: S.lightningRadius, target });
    return target;
  }

  updateUnits(dt) {
    for (const u of this.units) {
      u.def.onUpdate?.(u, dt, this);
      if (u.def.summon) this.updateSummon(u, dt);
      u.ability?.update?.(u, dt, this);
      this.attack(u, dt);
    }
  }

  /** Shared attack loop for deployed units and temporary allies. */
  attack(u, dt) {
    if (u.recoil > 0) u.recoil = Math.max(0, u.recoil - dt * 6);
    u.cooldown -= dt;
    if (u.cooldown > 0) return;
    const target = u.ability?.target ? u.ability.target(u, this) : this.findTarget(u, u.stats.range);
    u.hasTarget = !!target;
    if (!target) {
      u.cooldown = 0.1;
      return;
    }
    u.angle = Math.atan2(target.y - u.y, target.x - u.x);
    if (Math.abs(target.x - u.x) > 2) u.facing = target.x > u.x ? 1 : -1;
    u.cooldown = 1 / Math.max(0.01, u.stats.rate);
    u.recoil = 1;
    u.lastFire = this.time;
    if (u.def.onFire) u.def.onFire(u, target, this);
    else if (u.ability?.fire) u.ability.fire(u, target, this);
    else this.fireProjectile(u, target);
  }

  // ------------------------------------------------------------------ allies, timers, fields

  /**
   * Summons a temporary combatant for `owner`. Allies fight with the stats of
   * `def` at the owner's level (clamped), receive no buffs, can't be selected,
   * sold or upgraded, and never count as deployed units for any passive.
   */
  spawnAlly(owner, defId, { life = 10, slot = 0, of = 1 } = {}) {
    const def = getUnit(defId) ?? getAllyDef(defId);
    if (!def) return null;
    const level = Math.min(owner.level, maxLevel(def));
    const ang = (slot / Math.max(1, of)) * Math.PI * 2 + (owner.uid % 7);
    const a = createUnit(def);
    Object.assign(a, {
      uid: `ally-${++allySeq}`,
      ally: true,
      owner,
      level,
      stats: this.allyStats(def, level, owner),
      x: owner.x + Math.cos(ang) * TILE * 0.9,
      y: owner.y + Math.sin(ang) * TILE * 0.6,
      cooldown: 0.4,
      life,
      maxLife: life,
      bornAt: this.time,
      ability: abilityOf(def),
      spent: 0,
    });
    a.ability?.init?.(a, this);
    this.allies.push(a);
    this.stats.alliesSummoned++;
    this.emit('allySpawn', a);
    return a;
  }

  /** Allies use their own table at the owner's level plus the owner's wave scaling (no buffs). */
  allyStats(def, level, owner) {
    const s = levelStats(def, level);
    s.damage *= 1 + this.waveBonus(owner.def);
    return s;
  }

  /** A point `ahead` px further along an enemy's road (with the travel direction), or null. */
  roadPoint(e, ahead = 0) {
    if (!e.route) return null;
    const at = { x: 0, y: 0, dx: 0, dy: 0 };
    sampleRoute(e.route, Math.max(0, Math.min(e.route.length, e.d + ahead)), at, 0);
    return Math.hypot(at.dx, at.dy) > 0 ? at : null;
  }

  alliesOf(owner) {
    return this.allies.filter((a) => a.owner === owner);
  }

  updateAllies(dt) {
    if (!this.allies.length) return;
    let w = 0;
    for (let i = 0; i < this.allies.length; i++) {
      const a = this.allies[i];
      a.life -= dt;
      if (a.life <= 0 || !a.owner.placed) {
        this.emit('allyGone', a);
        continue;
      }
      this.attack(a, dt);
      this.allies[w++] = a;
    }
    this.allies.length = w;
  }

  /** Runs `fn` after `delay` seconds of game time (bursts, bombs, aftershocks). */
  after(delay, fn) {
    this.timers.push({ t: this.time + delay, fn });
  }

  updateTimers() {
    if (!this.timers.length) return;
    const due = [];
    let w = 0;
    for (let i = 0; i < this.timers.length; i++) {
      const t = this.timers[i];
      if (t.t <= this.time) due.push(t);
      else this.timers[w++] = t;
    }
    this.timers.length = w;
    for (const t of due) t.fn();
  }

  /** Gravity field: holds enemies inside and gathers them, then detonates. */
  addField(f) {
    const field = { ...f, t: 0 };
    this.fields.push(field);
    this.emit('field', field);
    return field;
  }

  updateFields(dt) {
    if (!this.fields.length) return;
    let w = 0;
    for (let i = 0; i < this.fields.length; i++) {
      const f = this.fields[i];
      f.t += dt;
      if (f.t >= f.duration) {
        this.explode(f.x, f.y, f.radius, f.damage, f.source, { kind: 'antimatter', onHit: f.onHit });
        continue;
      }
      this.hash.each(f.x, f.y, f.radius, (e) => {
        if (e.isBoss) return; // bosses resist the pull (they still take the blast)
        e.gravity = { x: f.x, y: f.y, until: this.time + 0.15 };
      });
      this.fields[w++] = f;
    }
    this.fields.length = w;
  }

  /** Damage every enemy within `radius`. Used by bombs, barrages and fields. */
  explode(x, y, radius, damage, source, { kind = 'blast', onHit = null, focusMult = 1 } = {}) {
    let focus = null;
    if (focusMult > 1) focus = this.hash.best(x, y, radius, (e) => e.hp + e.shield);
    this.hash.each(x, y, radius, (e) => {
      if (!e.alive || e.invulnerable) return;
      this.damageEnemy(e, damage * (e === focus ? focusMult : 1), source);
      if (onHit && e.alive) this.applyOnHit(e, onHit);
    });
    this.emit('blast', { x, y, radius, kind, focus: focus ? { x: focus.x, y: focus.y } : null });
  }

  applyStatusTo(e, id, opts) {
    if (e.alive && !e.invulnerable) applyStatus(e, id, this.time, opts);
  }

  applyOnHit(e, onHit) {
    for (const h of onHit) if (h.chance >= 1 || this.combatRng.next() < h.chance) applyStatus(e, h.status, this.time, h);
  }

  /** Bonus coins from abilities (shown as a pop-up). Goes through the coin multiplier. */
  grantCoins(amount, x, y, label = null) {
    const gained = this.gainCoins(amount * BALANCE.global.abilityCoinMult);
    this.stats.bonusCoins += gained;
    this.emit('bonusCoins', { amount: gained, x, y, label });
    return gained;
  }

  findTarget(u, range) {
    if (u.def.targeting === 'closest') return this.hash.best(u.x, u.y, range, (e) => -((e.x - u.x) ** 2 + (e.y - u.y) ** 2));
    return this.hash.best(u.x, u.y, range, TARGETING[u.def.targeting] ?? TARGETING.first);
  }

  /** Secondary attack: periodically launches summoned drones at an enemy in range. */
  updateSummon(u, dt) {
    const s = u.def.summon;
    u.summonTimer = (u.summonTimer ?? s.every) - dt;
    if (u.summonTimer > 0) return;
    const target = this.findTarget(u, u.stats.range);
    if (!target) {
      u.summonTimer = 0.2;
      return;
    }
    u.summonTimer = s.every;
    u.lastSummon = this.time;
    this.fireProjectile(u, target, {
      kind: s.kind,
      speed: s.speed,
      damage: u.stats.damage * s.damageFactor,
      splash: s.splash,
      explosive: s.explosive,
      onHit: s.onHit ?? null,
      summoned: true,
    });
  }

  /**
   * Fires a projectile. `spec` overrides the unit's own projectile for
   * secondary attacks (summoned drones). Drones may roll to become explosive.
   */
  fireProjectile(u, target, spec = null) {
    const proj = u.def.projectile ?? {};
    const p = this.projectilePool.pop() ?? {};
    p.x = u.x + Math.cos(u.angle) * 6;
    p.y = u.y + Math.sin(u.angle) * 6;
    p.sx = p.x;
    p.sy = p.y;
    p.kind = spec?.kind ?? proj.kind ?? 'bolt';
    p.px = p.x;
    p.py = p.y;
    p.target = target;
    p.tx = target.x;
    p.ty = target.y;
    p.speed = spec?.speed ?? u.stats.projectileSpeed;
    p.damage = spec?.damage ?? u.stats.damage;
    p.splash = spec?.splash ?? u.stats.splash;
    p.onHit = spec ? spec.onHit : (u.def.onHit ?? null);
    p.crit = !!spec?.crit;
    p.stumble = !!spec?.stumble;
    p.color = proj.color ?? '#ffffff';
    p.tier = u.tier;
    p.source = u;
    p.life = isDrone(p) ? 6 : 3;
    p.alive = true;
    const explosive = spec ? spec.explosive : proj.explosive;
    if (explosive && this.combatRng.next() < (explosive.chance ?? 1)) {
      p.kind = 'explosive-drone';
      p.damage *= explosive.damageMult ?? 1;
      p.splash *= explosive.splashMult ?? 1;
    }
    if (isDrone(p)) this.stats.dronesLaunched++;
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
      } else if (p.target) {
        // Drones re-acquire a new target when theirs dies; shells land where aimed.
        p.target = isDrone(p) ? this.hash.best(p.x, p.y, 160, TARGETING.first) : null;
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
    const def = p.source?.def;
    const onHit = p.onHit !== undefined ? p.onHit : def?.onHit;
    // splash falloff: the enemy the shot was aimed at takes full damage, others in the blast less
    const primary = p.splash > 0 && p.target && p.target.alive ? p.target : null;
    const falloff = BALANCE.splashFalloff;
    const hit = (e) => {
      if (!e.alive || e.invulnerable) return;
      this.damageEnemy(e, primary && e !== primary ? p.damage * falloff : p.damage, p.source);
      if (onHit && e.alive) this.applyOnHit(e, onHit);
    };
    if (p.splash > 0) this.hash.each(p.x, p.y, p.splash, hit);
    else if (p.target) hit(p.target);
    if (def?.impactHazard && !isDrone(p)) this.addHazard(p.x, p.y, def.impactHazard, p.damage, p.source);
    const a = def?.ability;
    if (a?.aftershock && p.kind === def.projectile?.kind) {
      const { x, y, splash, damage, source } = p;
      this.after(a.aftershockDelay, () => this.explode(x, y, splash, damage * a.aftershock, source, { kind: 'aftershock' }));
    }
    this.emit('impact', p);
  }

  /** Ground hazard such as flames: periodic damage to enemies standing in it. */
  addHazard(x, y, spec, baseDamage, source) {
    const h = { x, y, kind: spec.kind, status: spec.status ?? 'burning', radius: spec.radius, ttl: spec.duration, max: spec.duration, dps: baseDamage * spec.dpsFactor, source };
    this.hazards.push(h);
    if (this.hazards.length > 400) this.hazards.shift();
    this.emit('hazard', h);
    return h;
  }

  updateHazards(dt) {
    if (!this.hazards.length) return;
    this.hazardTimer += dt;
    const tick = this.hazardTimer >= HAZARD_TICK;
    if (tick) this.hazardTimer -= HAZARD_TICK;
    let w = 0;
    for (let i = 0; i < this.hazards.length; i++) {
      const h = this.hazards[i];
      h.ttl -= dt;
      if (h.ttl <= 0) continue;
      if (tick) {
        this.hash.each(h.x, h.y, h.radius, (e) => {
          if (!e.alive || e.invulnerable) return;
          applyStatus(e, h.status, this.time);
          this.damageEnemy(e, h.dps * HAZARD_TICK, h.source);
        });
      }
      this.hazards[w++] = h;
    }
    this.hazards.length = w;
  }

  damageEnemy(e, amount, source = null) {
    if (!e.alive || e.invulnerable) return 0;
    let dmg = amount * (1 - e.armor);
    if (e.statuses) dmg *= statusDamageTakenMultiplier(e, this.time);
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

  /** All coin income goes through here so weather and economy buffs apply once. */
  gainCoins(amount) {
    // fractions carry over, so small multipliers (e.g. +15% on a 2-coin payout) are never rounded away
    const exact = amount * this.coinMult + (this.coinFrac ?? 0);
    const gained = Math.floor(exact + 1e-9);
    this.coinFrac = Math.max(0, exact - gained);
    this.coins += gained;
    return gained;
  }

  killEnemy(e, source) {
    this.removeEnemy(e);
    this.gainCoins(e.reward);
    this.stats.kills++;
    if (source) source.kills++;
    if (e.bounty && e.bounty.until > this.time) this.grantCoins(e.bounty.coins, e.x, e.y - 12, 'Bounty');
    source?.ability?.onKill?.(source, e, this);
    this.houseEdgeKill();
    e.variant?.onDeath?.(e, this);
    this.emit('death', e);
    if (e.isBoss) {
      this.stats.bossesDefeated++;
      this.emit('bossDefeated', e);
    }
  }

  /** THE HOUSE: every N kills while one is deployed, +1% damage to all allies for this battle (capped). */
  houseEdgeKill() {
    const house = this.house;
    if (!house) return;
    const a = house.def.ability;
    if (++this.houseKills % a.killsPerEdge !== 0 || this.battleBonus.damage >= a.edgeCap - 1e-9) return;
    this.battleBonus.damage = Math.min(a.edgeCap, Math.round((this.battleBonus.damage + 0.01) * 100) / 100);
    this.refreshAll();
    this.emit('houseEdge', this.battleBonus.damage);
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
        p.onHit = null;
        this.projectilePool.push(p);
      }
    }
    this.projectiles.length = w;
  }

  completeWave(wave) {
    const plan = wave.plan;
    const coins = this.gainCoins(plan.reward);
    // Tokens are only granted for fully completed waves.
    const tokens = plan.tokens ?? tokensForWave(plan.wave);
    this.tokensEarned += tokens;
    this.stats.wavesCleared++;
    // wave scaling changed: re-derive stats (once per completed wave, never per frame)
    if (this.units.some((u) => this.waveBonus(u.def) > 0)) this.refreshAll();
    this.emit('waveClear', { wave: plan.wave, reward: coins, tokens, plan });
  }

  gameOver() {
    if (this.phase === 'gameover') return;
    this.phase = 'gameover';
    this.emit('gameOver', { wave: this.wave, stats: this.stats, biome: this.biome, tokens: this.tokensEarned });
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
  passiveContext(def, { preview = false } = {}) {
    const faction = def.faction ? this.factionCount(def.faction) : 0;
    return {
      deployed: this.deployedCount(def.id),
      count: (id) => this.deployedCount(id),
      countFaction: (f) => this.factionCount(f),
      // units of the same faction other than this copy (a preview isn't on the field yet)
      factionOthers: Math.max(0, faction - (preview ? 0 : 1)),
    };
  }

  /** Player-deployed units of a faction (summoned allies never count). */
  factionCount(faction) {
    let n = 0;
    for (const [id, c] of this.deployed) if (c && getUnit(id)?.faction === faction) n += c;
    return n;
  }

  /** Recomputes effective stats for one unit (level stats + passive + buffs + weather). */
  refreshUnit(u) {
    Object.assign(u.stats, this.effectiveStats(u));
  }

  buffDefs() {
    if (!this._buffDefs) {
      this._buffDefs = new Map();
      for (const d of listUnits()) for (const b of d.buffs ?? []) this._buffDefs.set(b.id, b);
    }
    return this._buffDefs;
  }

  /** Recomputes the battle-wide coin multiplier: weather × each distinct economy buff once. */
  refreshEconomy() {
    const ids = new Map();
    // economy bonuses are unit abilities too: their extra share gets the ability coin boost
    for (const u of this.units) if (u.def.economy) ids.set(u.def.economy.id, 1 + (u.def.economy.coinMult - 1) * BALANCE.global.abilityCoinMult);
    let m = this.weather?.current?.coinMult ?? 1;
    for (const v of ids.values()) m *= v;
    this.coinMult = m;
    this.house = this.units.find((u) => u.def.ability?.id === 'the-house') ?? null;
    this.economyIds = [...ids.keys()];
  }

  /** Called when units appear or disappear (never per frame): re-resolve buff coverage. */
  refreshAuras() {
    for (const u of computeAuras(this.units)) this.refreshUnit(u);
    this.refreshEconomy();
  }

  refreshAll() {
    for (const u of this.units) this.refreshUnit(u);
    // buffs whose radius follows the source's range may now reach different units
    for (const u of computeAuras(this.units)) this.refreshUnit(u);
    this.refreshEconomy();
    this.emit('statsChanged', null);
  }

  /** Units whose passive depends on how many of `defId` are deployed (e.g. Outlaw Leader ← Outlaws). */
  refreshWatchers(defId) {
    const faction = getUnit(defId)?.faction;
    for (const u of this.units) {
      const p = u.def.passive;
      if (p?.watches?.includes(defId) || (faction && p?.watchFaction === faction)) this.refreshUnit(u);
    }
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
    if (this.coins < def.price) return 'coins';
    return null;
  }

  /**
   * Buys and places one copy of a battle-plan unit. There is no cap on copies:
   * deployment is limited only by buildable tiles and coins. Coins are only
   * deducted when every check passes.
   */
  deploy(defId, col, row) {
    if (this.canDeploy(defId, col, row)) return null;
    const def = getUnit(defId);
    const u = createUnit(def);
    this.coins -= def.price;
    this.stats.coinsSpent += def.price;
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
    u.ability = abilityOf(def);
    if (def.passive?.modify) this.refreshType(def.id);
    else this.refreshUnit(u);
    this.refreshWatchers(def.id);
    this.refreshAuras();
    u.ability?.init?.(u, this);
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
    this.coins += refund;
    this.deployed.set(u.def.id, Math.max(0, this.deployedCount(u.def.id) - 1));
    if (u.def.passive?.modify) this.refreshType(u.def.id);
    this.refreshWatchers(u.def.id);
    this.refreshAuras();
    u.ability?.remove?.(u, this);
    this.emit('sell', { unit: u, refund });
    return refund;
  }

  /**
   * Effective stats for a unit at a level, derived from scratch every time:
   * level table → passive → each distinct buff id once → current weather.
   * Nothing here mutates base stats, so buffs can never accumulate.
   */
  effectiveStats(u, level = u.level) {
    const ctx = this.passiveContext(u.def);
    const p = u.def.passive;
    // Count-based damage passives (Dude Power, Squad Tactics, The Gang) expose `bonus(ctx)`
    // and join the ADDITIVE bucket, so they add to wave scaling instead of multiplying it.
    const s = p?.bonus ? levelStats(u.def, level) : applyPassive(u.def, levelStats(u.def, level), ctx);
    const defs = this.buffDefs();
    for (const id of u.auras ?? []) applyModifiers(s, scaledBuff(defs.get(id), u.auraLevels?.[id] ?? 0));
    // ADDITIVE bucket: wave scaling + capped self bonuses (jackpots, soldiers) + battle-long bonuses
    const dmg = this.waveBonus(u.def) + (p?.bonus ? p.bonus(ctx) : 0) + (u.bonus?.damage ?? 0) + (this.battleBonus?.damage ?? 0);
    if (dmg) s.damage *= 1 + dmg;
    if (u.bonus?.rate) s.rate *= 1 + u.bonus.rate;
    applyModifiers(s, this.weather?.current);
    return s;
  }

  /**
   * Stats a new copy of `defId` would have on (col, row): the same derivation as
   * a deployed unit (level 0 → passive with one more copy → buffs reaching that
   * tile → weather), so the placement preview ring matches combat exactly.
   */
  previewStats(defId, col, row) {
    const def = getUnit(defId);
    if (!def) return null;
    const x = col * TILE + TILE / 2;
    const y = row * TILE + TILE / 2;
    const probe = { def, level: 0, x, y, auras: [], auraLevels: {} };
    const best = new Map();
    for (const s of this.units) {
      for (const b of s.def.buffs ?? []) {
        const r = b.radius === 'range' ? s.stats.range : b.radius;
        if (b.faction && def.faction !== b.faction) continue;
        if (r === Infinity || (s.x - x) ** 2 + (s.y - y) ** 2 <= r * r) if (!best.has(b.id) || s.level > best.get(b.id)) best.set(b.id, s.level);
      }
    }
    probe.auras = [...best.keys()];
    probe.auraLevels = Object.fromEntries(best);
    const ctx0 = this.passiveContext(def, { preview: true });
    const ctx = { ...ctx0, deployed: ctx0.deployed + 1 };
    const s = def.passive?.bonus ? levelStats(def, 0) : applyPassive(def, levelStats(def, 0), ctx);
    const defs = this.buffDefs();
    for (const id of probe.auras) applyModifiers(s, scaledBuff(defs.get(id), probe.auraLevels[id]));
    const add = this.waveBonus(def) + (def.passive?.bonus ? def.passive.bonus(ctx) : 0) + (this.battleBonus?.damage ?? 0);
    if (add) s.damage *= 1 + add;
    applyModifiers(s, this.weather?.current);
    return s;
  }

  /** Wave-scaling damage share for a unit type (same for every copy). */
  waveBonus(def) {
    return waveDamageBonus(def.tier, this.stats.wavesCleared);
  }

  /** Preview of the next upgrade: cost and before/after effective stats. */
  upgradeInfo(u) {
    const cost = upgradeCost(u.def, u.level);
    const current = this.effectiveStats(u);
    if (cost === null) return { maxed: true, level: u.level, maxLevel: maxLevel(u.def), current };
    return {
      maxed: false,
      level: u.level,
      nextLevel: u.level + 1,
      maxLevel: maxLevel(u.def),
      cost,
      affordable: this.coins >= cost,
      current,
      next: this.effectiveStats(u, u.level + 1),
    };
  }

  upgrade(u) {
    if (!u.placed) return false;
    const cost = upgradeCost(u.def, u.level);
    if (cost === null || this.coins < cost) return false;
    this.coins -= cost;
    u.spent += cost;
    u.level++;
    this.stats.upgrades++;
    this.stats.coinsSpent += cost;
    this.refreshUnit(u);
    if (u.def.buffs) for (const o of computeAuras(this.units)) this.refreshUnit(o);
    this.emit('upgrade', u);
    return true;
  }
}
