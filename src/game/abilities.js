// Unit abilities. A unit definition opts in with `ability: { id, ...params }`;
// every number lives in that data block so balance is tuned in the unit file,
// never here. Handlers implement the behaviour through a few hooks:
//
//   init(u, game)            – once when deployed
//   update(u, dt, game)      – every frame (periodic effects, timers)
//   target(u, game)          – optional custom target selection
//   fire(u, target, game)    – replaces the default single projectile
//   onKill(u, enemy, game)   – the unit (or its projectile) landed a kill
//   remove(u, game)          – sold / battle ended
//   describe(u)              – lines for the unit panel (current-level values)
//
// Upgrade levels scale abilities in two ways: everything based on the unit's
// damage grows with the level table, and flat values (coins, bonus caps) grow
// with abilityPower(u) = 1 + ABILITY_LEVEL_BONUS × level.
//
// Stacking: self-bonuses are capped per unit and stored in `u.bonus`; Game
// derives stats from scratch (base → passive → buffs → bonuses → weather),
// so nothing accumulates beyond its cap.

export const ABILITY_LEVEL_BONUS = 0.12;
export const abilityPower = (u) => 1 + ABILITY_LEVEL_BONUS * (u.level ?? 0);

const pct = (v) => `${Math.round(v * 100)}%`;
const every = (u, key, period, dt) => {
  u.timers ??= {};
  u.timers[key] = (u.timers[key] ?? period) - dt;
  if (u.timers[key] > 0) return false;
  u.timers[key] += period;
  if (u.timers[key] < 0) u.timers[key] = period;
  return true;
};
/** Seconds until a periodic effect fires (for the unit panel). */
export const timeLeft = (u, key, period) => Math.max(0, u.timers?.[key] ?? period);

const count = (u) => (u.shots = (u.shots ?? 0) + 1);

function setBonus(u, game, key, value) {
  u.bonus ??= {};
  if (u.bonus[key] === value) return;
  u.bonus[key] = value;
  if (u.placed) game.refreshUnit(u);
}

function shoot(game, u, target, mult = 1, extra = null) {
  const crit = extra?.crit;
  return game.fireProjectile(u, target, { damage: u.stats.damage * mult, ...extra, crit });
}

// ------------------------------------------------------------------ WILD WEST

const gambler = {
  fire(u, target, game) {
    const a = u.def.ability;
    const n = count(u);
    const guaranteed = n % a.guaranteedEvery === 0;
    const crit = guaranteed || game.combatRng.next() < a.critChance;
    shoot(game, u, target, crit ? a.critMult : 1, { crit });
    if (guaranteed) game.grantCoins(Math.round(a.coins * abilityPower(u)), u.x, u.y - 24);
  },
  describe(u) {
    const a = u.def.ability;
    return [`${pct(a.critChance)} chance of a ${a.critMult}× critical hit`, `Every ${a.guaranteedEvery}th attack: guaranteed critical + ${Math.round(a.coins * abilityPower(u))} coins`];
  },
};

const bandit = {
  fire(u, target, game) {
    const a = u.def.ability;
    u.ramp = target === u.lastTarget ? Math.min(a.maxStacks, (u.ramp ?? 0) + 1) : 0;
    u.lastTarget = target;
    shoot(game, u, target, 1 + a.perHit * u.ramp);
  },
  describe(u) {
    const a = u.def.ability;
    return [`Consecutive hits on one enemy: +${pct(a.perHit)} damage each, up to +${pct(a.perHit * a.maxStacks)}`, `Current streak: +${pct(a.perHit * (u.ramp ?? 0))}`];
  },
};

const outlaw = {
  fire(u, target, game) {
    const a = u.def.ability;
    if (count(u) % a.dynamiteEvery === 0) {
      shoot(game, u, target, a.dynamiteMult, { kind: 'dynamite', speed: 260, splash: a.dynamiteRadius, onHit: [{ status: 'exposed', chance: 1, amount: a.exposed, duration: a.exposedDuration }] });
    } else {
      shoot(game, u, target);
    }
  },
  describe(u) {
    const a = u.def.ability;
    return [`Every ${a.dynamiteEvery}th attack: dynamite (${a.dynamiteMult}× damage, ${(a.dynamiteRadius / 32).toFixed(1)}-tile blast)`, `Blasted enemies take +${pct(a.exposed)} damage for ${a.exposedDuration} s`];
  },
};

const bountyHunter = {
  update(u, dt, game) {
    const a = u.def.ability;
    if (!every(u, 'mark', a.markEvery, dt)) return;
    const e = game.hash.best(u.x, u.y, u.stats.range, (o) => o.hp);
    if (!e) {
      u.timers.mark = 0.5;
      return;
    }
    e.bounty = { until: game.time + a.markDuration, coins: Math.round(e.reward * a.bountyRewardMult * abilityPower(u)) };
    game.emit('mark', { unit: u, enemy: e });
  },
  target(u, game) {
    return game.hash.best(u.x, u.y, u.stats.range, (e) => (e.bounty && e.bounty.until > game.time ? 1e15 : 0) + e.d - e.route.length);
  },
  fire(u, target, game) {
    const a = u.def.ability;
    const marked = target.bounty && target.bounty.until > game.time;
    shoot(game, u, target, marked ? 1 + a.markedBonus : 1, { crit: marked });
  },
  describe(u) {
    const a = u.def.ability;
    return [`Every ${a.markEvery} s marks the enemy in range with the most HP`, `+${pct(a.markedBonus)} damage to marked enemies · a marked kill pays a ${(a.bountyRewardMult * abilityPower(u)).toFixed(1)}× bounty`];
  },
};

const gunslinger = {
  fire(u, target, game) {
    const a = u.def.ability;
    const roll = () => game.combatRng.next() < a.critChance;
    if (count(u) % a.burstEvery === 0) {
      for (let i = 0; i < a.burstShots; i++) {
        game.after(i * 0.09, () => {
          const t = target.alive ? target : game.findTarget(u, u.stats.range);
          if (!t) return;
          const crit = roll();
          shoot(game, u, t, a.burstDamage * (crit ? a.critMult : 1), { crit });
        });
      }
      return;
    }
    const crit = roll();
    shoot(game, u, target, crit ? a.critMult : 1, { crit });
  },
  describe(u) {
    const a = u.def.ability;
    return [`Every ${a.burstEvery}th attack: ${a.burstShots}-shot burst, ${pct(a.burstDamage)} damage each`, `${pct(a.critChance)} critical chance · criticals deal ${a.critMult}×`];
  },
};

const sheriff = {
  update(u, dt, game) {
    const a = u.def.ability;
    if (!every(u, 'justice', a.shotEvery, dt)) return;
    const e = game.hash.best(u.x, u.y, u.stats.range, (o) => o.hp + o.shield);
    if (!e) {
      u.timers.justice = 0.5;
      return;
    }
    u.lastSpecial = game.time;
    shoot(game, u, e, a.shotMult, { kind: 'golden', speed: 900, crit: true });
  },
  describe(u) {
    const a = u.def.ability;
    return [`Every ${a.shotEvery} s: a ${a.shotMult}× shot at the strongest enemy in range`];
  },
};

const outlawLeader = {
  update(u, dt, game) {
    const a = u.def.ability;
    if (every(u, 'posse', a.summonEvery, dt)) {
      for (let i = 0; i < a.summonCount; i++) game.spawnAlly(u, a.summonUnit, { life: a.summonLife, slot: i, of: a.summonCount });
      u.lastSpecial = game.time;
    }
    if (every(u, 'tribute', a.coinEvery, dt)) {
      const alive = game.enemies.length;
      const coins = Math.round(Math.min(a.coinCap, alive * a.coinsPerEnemy) * abilityPower(u));
      if (coins > 0) game.grantCoins(coins, u.x, u.y - 24);
    }
  },
  describe(u) {
    const a = u.def.ability;
    return [`Every ${a.summonEvery} s: calls ${a.summonCount} Outlaws for ${a.summonLife} s (they don't count as deployed)`, `Every ${a.coinEvery} s: ${(a.coinsPerEnemy * abilityPower(u)).toFixed(1)} coins per enemy alive (max ${Math.round(a.coinCap * abilityPower(u))})`];
  },
};

const fastestHand = {
  update(u, dt, game) {
    const a = u.def.ability;
    if ((u.streak ?? 0) > 0 && game.time - (u.lastKillAt ?? 0) > a.streakTimeout) {
      u.streak = 0;
      setBonus(u, game, 'rate', 0);
    }
    if (every(u, 'deadeye', a.deadeyeEvery, dt)) {
      const e = game.hash.best(u.x, u.y, u.stats.range, (o) => o.hp + o.shield);
      if (!e) {
        u.timers.deadeye = 0.5;
        return;
      }
      u.lastSpecial = game.time;
      shoot(game, u, e, a.deadeyeMult, { kind: 'golden', speed: 1100, crit: true });
    }
  },
  fire(u, target, game) {
    const a = u.def.ability;
    const list = [];
    game.hash.each(u.x, u.y, u.stats.range, (e) => {
      if (e.alive && !e.invulnerable && e.intro >= 1) list.push(e);
    });
    list.sort((p, q) => q.d - q.route.length - (p.d - p.route.length));
    if (!list.length) list.push(target);
    for (let i = 0; i < a.barrageShots; i++) {
      game.after(i * a.barrageGap, () => {
        let t = list[i % list.length];
        if (!t.alive) t = game.findTarget(u, u.stats.range);
        if (t) shoot(game, u, t, 1, { kind: 'revolver' });
      });
    }
  },
  onKill(u, e, game) {
    const a = u.def.ability;
    u.lastKillAt = game.time;
    u.streak = Math.min(Math.round(a.streakCap / a.streakPerKill), (u.streak ?? 0) + 1);
    setBonus(u, game, 'rate', u.streak * a.streakPerKill);
  },
  describe(u) {
    const a = u.def.ability;
    return [
      `Fires a ${a.barrageShots}-shot barrage each attack`,
      `Each consecutive kill: +${pct(a.streakPerKill)} attack speed, up to +${pct(a.streakCap)} (resets after ${a.streakTimeout} s without a kill) · now +${pct((u.streak ?? 0) * a.streakPerKill)}`,
      `Every ${a.deadeyeEvery} s: guaranteed ${a.deadeyeMult}× critical at the strongest enemy`,
    ];
  },
};

// ------------------------------------------------------------------ GAMBINO

const drunkard = {
  fire(u, target, game) {
    const a = u.def.ability;
    const mult = game.combatRng.next() < 0.5 ? a.low : a.high;
    if (count(u) % a.stumbleEvery === 0) {
      shoot(game, u, target, mult, { splash: a.stumbleRadius, onHit: [{ status: 'slowed', chance: 1, amount: a.stumbleSlow, duration: a.stumbleDuration }], stumble: true });
    } else {
      shoot(game, u, target, mult);
    }
  },
  describe(u) {
    const a = u.def.ability;
    return [`Each attack deals ${pct(a.low)} or ${pct(a.high)} damage (50/50)`, `Every ${a.stumbleEvery}th attack: a stumble that slows nearby enemies by ${pct(a.stumbleSlow)} for ${a.stumbleDuration} s`];
  },
};

/** Pays coins for enemies defeated (anywhere) since the last payout. */
function killPayout(u, game, a) {
  const kills = game.stats.kills - (u.killMark ?? game.stats.kills);
  u.killMark = game.stats.kills;
  const coins = Math.round(Math.min(a.coinCap, kills * a.coinsPerKill) * abilityPower(u));
  if (coins > 0) game.grantCoins(coins, u.x, u.y - 24);
}

const dealer = {
  init(u, game) {
    u.killMark = game.stats.kills;
  },
  update(u, dt, game) {
    if (every(u, 'payout', u.def.ability.coinEvery, dt)) killPayout(u, game, u.def.ability);
  },
  describe(u) {
    const a = u.def.ability;
    return [`Every ${a.coinEvery} s: ${(a.coinsPerKill * abilityPower(u)).toFixed(1)} coins per enemy eliminated since the last payout (max ${Math.round(a.coinCap * abilityPower(u))})`];
  },
};

const nightDancer = {
  fire(u, target, game) {
    const a = u.def.ability;
    shoot(game, u, target);
    if (count(u) % a.pulseEvery === 0) {
      game.hash.each(u.x, u.y, u.stats.range, (e) => game.applyStatusTo(e, 'slowed', { amount: a.pulseSlow, duration: a.pulseDuration }));
      game.emit('pulse', { x: u.x, y: u.y, radius: u.stats.range, color: '#d77fe0', source: u });
    }
  },
  describe(u) {
    const a = u.def.ability;
    return [`Every ${a.pulseEvery} attacks: a pulse that slows enemies in range by ${pct(a.pulseSlow)} for ${a.pulseDuration} s`];
  },
};

const desperateGambler = {
  update(u, dt, game) {
    const a = u.def.ability;
    if (!every(u, 'allin', a.allInEvery, dt)) return;
    const e = game.findTarget(u, u.stats.range);
    if (!e) {
      u.timers.allin = 0.5;
      return;
    }
    const mult = a.allInMin + game.combatRng.next() * (a.allInMax - a.allInMin);
    u.lastSpecial = game.time;
    u.lastRoll = mult;
    shoot(game, u, e, mult, { kind: 'golden', speed: 800, crit: mult >= 2.5 });
  },
  fire(u, target, game) {
    const a = u.def.ability;
    const win = game.combatRng.next() < 0.5;
    shoot(game, u, target, win ? a.winMult : a.loseMult, { crit: win });
  },
  describe(u) {
    const a = u.def.ability;
    return [`Each attack: 50% for ${a.winMult}× damage, otherwise ${pct(a.loseMult)}`, `Every ${a.allInEvery} s: an all-in shot for ${a.allInMin}×–${a.allInMax}× damage`];
  },
};

const pitBoss = {
  init: dealer.init,
  update(u, dt, game) {
    if (every(u, 'payout', u.def.ability.coinEvery, dt)) killPayout(u, game, u.def.ability);
  },
  describe: dealer.describe,
};

const highRoller = {
  update(u, dt, game) {
    const a = u.def.ability;
    if (!every(u, 'highstakes', a.bigEvery, dt)) return;
    const e = game.findTarget(u, u.stats.range);
    if (!e) {
      u.timers.highstakes = 0.5;
      return;
    }
    u.lastSpecial = game.time;
    shoot(game, u, e, a.bigMult, { kind: 'golden', speed: 900, crit: true });
  },
  fire(u, target, game) {
    const a = u.def.ability;
    shoot(game, u, target, 1, { kind: 'chip' });
    if (count(u) % a.jackpotEvery === 0) {
      game.grantCoins(Math.round(a.jackpotCoins * abilityPower(u)), u.x, u.y - 24, 'Jackpot');
      setBonus(u, game, 'damage', Math.min(a.jackpotCap, (u.bonus?.damage ?? 0) + a.jackpotDamage));
    }
  },
  describe(u) {
    const a = u.def.ability;
    return [
      `Every ${a.bigEvery} s: an ${a.bigMult}× high-stakes shot`,
      `Every ${a.jackpotEvery}th attack: Jackpot (${Math.round(a.jackpotCoins * abilityPower(u))} coins, +${pct(a.jackpotDamage)} damage for this battle, up to +${pct(a.jackpotCap)}) · now +${pct(u.bonus?.damage ?? 0)}`,
    ];
  },
};

const theHouse = {
  update(u, dt, game) {
    const a = u.def.ability;
    if (!every(u, 'wheel', a.wheelEvery, dt)) return;
    const pick = ['jackpot', 'bankruptcy', 'doubledown'][Math.floor(game.combatRng.next() * 3)];
    u.lastSpecial = game.time;
    u.lastWheel = pick;
    if (pick === 'jackpot') {
      game.grantCoins(Math.round(a.jackpotCoins * abilityPower(u)), u.x, u.y - 30, 'Jackpot');
    } else if (pick === 'bankruptcy') {
      const e = game.findTarget(u, u.stats.range) ?? game.enemies.find((o) => o.alive && o.intro >= 1);
      if (e) game.explode(e.x, e.y, a.bankruptcyRadius, u.stats.damage * a.bankruptcyMult, u, { kind: 'bankruptcy' });
    } else {
      u.doubleUntil = game.time + a.doubleDuration;
    }
    game.emit('houseWheel', { unit: u, result: pick });
  },
  fire(u, target, game) {
    const doubled = (u.doubleUntil ?? 0) > game.time;
    shoot(game, u, target, doubled ? 2 : 1, { kind: 'chip', crit: doubled });
  },
  describe(u, game) {
    const a = u.def.ability;
    const edge = game?.battleBonus?.damage ?? 0;
    return [
      `Every ${a.wheelEvery} s spins the wheel: Jackpot (+${Math.round(a.jackpotCoins * abilityPower(u))} coins), Bankruptcy (${a.bankruptcyMult}× damage in a ${(a.bankruptcyRadius / 32).toFixed(1)}-tile area) or Double Down (2× damage for ${a.doubleDuration} s)`,
      `House Edge: every ${a.killsPerEdge} enemy kills while the House is deployed, all allies gain +1% damage for this battle (max +${pct(a.edgeCap)}) · now +${pct(edge)}`,
    ];
  },
};

// ------------------------------------------------------------------ NUCLEAR WAR (arcade sci-fi)

const missileLauncher = {
  fire(u, target, game) {
    const a = u.def.ability;
    shoot(game, u, target);
    if (count(u) % a.bonusEvery === 0) game.after(0.12, () => target.alive && shoot(game, u, target, a.bonusMult, { crit: true }));
  },
  describe(u) {
    const a = u.def.ability;
    return [`Every ${a.bonusEvery}th attack: a bonus missile for ${a.bonusMult}× damage`];
  },
};

const battalion = {
  update(u, dt, game) {
    const a = u.def.ability;
    const alive = game.alliesOf(u).length;
    setBonus(u, game, 'damage', alive * a.perSoldier);
    if (alive < a.soldiers && every(u, 'muster', a.musterEvery, dt)) {
      game.spawnAlly(u, a.soldierUnit, { life: a.soldierLife, slot: alive, of: a.soldiers });
    }
  },
  describe(u, game) {
    const a = u.def.ability;
    const n = game ? game.alliesOf(u).length : 0;
    return [`Keeps up to ${a.soldiers} miniature soldiers in the field (each lasts ${a.soldierLife} s, one more every ${a.musterEvery} s)`, `+${pct(a.perSoldier)} damage per surviving soldier · now ${n} (+${pct(n * a.perSoldier)})`];
  },
};

const icbm = {
  describe(u) {
    const a = u.def.ability;
    return [`Aftershock ${a.aftershockDelay} s later for ${pct(a.aftershock)} of the impact damage`];
  },
};

/** Flyover: a plane crosses the map over the target and bombs along its line. */
function bombingRun(u, target, game, opts) {
  const reach = 760;
  const speed = opts.speed;
  const arrive = reach / speed + 0.25;
  // lead the target: aim where it will be when the bombs land, and lay the bombs
  // along the road (around corners too) so the line follows the enemy column
  const lead = (target.speed ?? 0) * arrive;
  const centre = game.roadPoint(target, lead) ?? { x: target.x, y: target.y, dx: 1, dy: 0 };
  const ang = Math.atan2(centre.dy, centre.dx);
  const dx = Math.cos(ang);
  const dy = Math.sin(ang);
  game.emit('flyover', { kind: opts.kind, x0: centre.x - dx * reach, y0: centre.y - dy * reach, x1: centre.x + dx * reach, y1: centre.y + dy * reach, duration: (2 * reach) / speed, unit: u });
  for (const b of opts.bombs) {
    const p = game.roadPoint(target, lead + b.offset) ?? { x: centre.x + dx * b.offset, y: centre.y + dy * b.offset };
    const t = (reach + b.offset) / speed + 0.25;
    game.after(t, () => game.explode(p.x, p.y, b.radius, b.damage, u, { kind: opts.blast, focusMult: b.focusMult }));
  }
}

const bomber = {
  fire(u, target, game) {
    const a = u.def.ability;
    u.runs = (u.runs ?? 0) + 1;
    const bombs = a.bombOffsets.map((offset) => ({ offset, radius: u.stats.splash, damage: u.stats.damage }));
    if (u.runs % a.bonusEvery === 0) bombs.push({ offset: 0, radius: u.stats.splash * a.bonusRadius, damage: u.stats.damage * a.bonusMult });
    bombingRun(u, target, game, { kind: 'bomber', blast: 'bomb', speed: a.planeSpeed, bombs });
  },
  describe(u) {
    const a = u.def.ability;
    return [`Each attack is a flyover dropping ${a.bombOffsets.length} bombs along its path`, `Every ${a.bonusEvery}rd run: an extra ${a.bonusMult}× explosion`];
  },
};

const b2 = {
  fire(u, target, game) {
    const a = u.def.ability;
    const bombs = a.bombOffsets.map((offset) => ({ offset, radius: u.stats.splash * 0.6, damage: u.stats.damage * a.sideBombs }));
    bombs.push({ offset: 0, radius: u.stats.splash, damage: u.stats.damage, focusMult: a.focusMult });
    bombingRun(u, target, game, { kind: 'b2', blast: 'bomb', speed: a.planeSpeed, bombs });
  },
  describe(u) {
    const a = u.def.ability;
    return [`Bombing run every ${(1 / u.stats.rate).toFixed(1)} s`, `The strongest enemy caught in the main blast takes ${a.focusMult}× damage`];
  },
};

const marshal = {
  update(u, dt, game) {
    const a = u.def.ability;
    if (every(u, 'pay', a.coinEvery, dt)) game.grantCoins(Math.round(a.coins * abilityPower(u)), u.x, u.y - 24);
    if (every(u, 'barrage', a.aoeEvery, dt)) {
      const e = game.findTarget(u, u.stats.range);
      if (!e) {
        u.timers.barrage = 0.5;
        return;
      }
      u.lastSpecial = game.time;
      game.explode(e.x, e.y, a.aoeRadius, u.stats.damage * a.aoeMult, u, { kind: 'barrage' });
    }
  },
  describe(u) {
    const a = u.def.ability;
    return [`Every ${a.coinEvery} s: +${Math.round(a.coins * abilityPower(u))} coins`, `Every ${a.aoeEvery} s: barrage for ${a.aoeMult}× damage in a ${(a.aoeRadius / 32).toFixed(1)}-tile area`];
  },
};

const gloriousLeader = {
  update(u, dt, game) {
    const a = u.def.ability;
    if (every(u, 'tribute', a.coinEvery, dt)) game.grantCoins(Math.round(a.coins * abilityPower(u)), u.x, u.y - 24);
    if (every(u, 'decree', a.weakenEvery, dt)) {
      u.lastSpecial = game.time;
      for (const e of game.enemies) if (e.alive) game.applyStatusTo(e, 'exposed', { amount: a.weaken, duration: a.weakenDuration });
      game.emit('pulse', { x: u.x, y: u.y, radius: Infinity, color: '#e0a23a', source: u });
    }
  },
  describe(u) {
    const a = u.def.ability;
    return [`Every ${a.coinEvery} s: +${Math.round(a.coins * abilityPower(u))} coins`, `Every ${a.weakenEvery} s: every enemy on the battlefield takes +${pct(a.weaken)} damage for ${a.weakenDuration} s`];
  },
};

const nuclearWarhead = {
  describe(u) {
    const a = u.def.ability;
    return [`Leaves an energy zone for ${a.zoneDuration} s`, `Enemies hit take +${pct(a.exposed)} damage for ${a.exposedDuration} s`];
  },
};

const antimatter = {
  update(u, dt, game) {
    const a = u.def.ability;
    if (!every(u, 'singularity', a.fieldEvery, dt)) return;
    const e = game.findTarget(u, u.stats.range);
    if (!e) {
      u.timers.singularity = 0.5;
      return;
    }
    u.lastSpecial = game.time;
    game.addField({ x: e.x, y: e.y, radius: a.fieldRadius, duration: a.fieldDuration, damage: u.stats.damage * a.fieldMult, source: u, onHit: [{ status: 'exposed', chance: 1, amount: a.exposed, duration: a.exposedDuration }] });
  },
  describe(u) {
    const a = u.def.ability;
    return [`Enemies hit take +${pct(a.exposed)} damage for ${a.exposedDuration} s`, `Every ${a.fieldEvery} s: a gravity field gathers enemies for ${a.fieldDuration} s, then detonates for ${a.fieldMult}× damage`];
  },
};

// ------------------------------------------------------------------ VILLAGE / TOWN GUARD / SIEGE WORKSHOP

const villageHero = {
  fire(u, target, game) {
    const a = u.def.ability;
    const heavy = count(u) % a.heavyEvery === 0;
    shoot(game, u, target, heavy ? a.heavyMult : 1, { crit: heavy });
  },
  describe(u, game) {
    const a = u.def.ability;
    const others = game ? game.passiveContext(u.def).factionOthers : 0;
    return [`Every ${a.heavyEvery}th attack: ${a.heavyMult}× damage`, `+1% damage per other Village Militia unit deployed (max +30%) · now +${Math.min(30, others)}%`];
  },
};

const kingsChampion = {
  update(u, dt, game) {
    const a = u.def.ability;
    if (!every(u, 'strike', a.strikeEvery, dt)) return;
    const e = game.hash.best(u.x, u.y, u.stats.range, (o) => o.hp + o.shield);
    if (!e) {
      u.timers.strike = 0.5;
      return;
    }
    u.lastSpecial = game.time;
    shoot(game, u, e, a.strikeMult, { kind: 'smite', speed: 1600, crit: true });
  },
  describe(u) {
    const a = u.def.ability;
    return [`Every ${a.strikeEvery} s: a ${a.strikeMult}× strike at the strongest enemy in reach`];
  },
};

const masterEngineer = {
  update(u, dt, game) {
    const a = u.def.ability;
    if (!every(u, 'build', a.buildEvery, dt)) return;
    if (game.alliesOf(u).length >= a.maxActive) return; // at most two automatons at once
    u.lastSpecial = game.time;
    game.spawnAlly(u, a.allyUnit, { life: a.buildLife, slot: game.alliesOf(u).length, of: a.maxActive });
  },
  describe(u, game) {
    const a = u.def.ability;
    const n = game ? game.alliesOf(u).length : 0;
    return [`Every ${a.buildEvery} s builds a mini-ballista that fights for ${a.buildLife} s (max ${a.maxActive} at once) · active ${n}`];
  },
};

export const ABILITIES = {
  'village-hero': villageHero,
  'kings-champion': kingsChampion,
  'master-engineer': masterEngineer,
  gambler,
  bandit,
  outlaw,
  'bounty-hunter': bountyHunter,
  gunslinger,
  sheriff,
  'outlaw-leader': outlawLeader,
  'fastest-hand': fastestHand,
  drunkard,
  dealer,
  'night-dancer': nightDancer,
  'desperate-gambler': desperateGambler,
  'pit-boss': pitBoss,
  'high-roller': highRoller,
  'the-house': theHouse,
  'missile-launcher': missileLauncher,
  battalion,
  icbm,
  bomber,
  b2,
  marshal,
  'glorious-leader': gloriousLeader,
  'nuclear-warhead': nuclearWarhead,
  antimatter,
};

export const abilityOf = (def) => (def.ability ? ABILITIES[def.ability.id] ?? null : null);
