// Weather. Every whole second of battle time, while the sky is clear and
// weather is enabled, an independent 1% roll may start a weather event that
// lasts 20 seconds. Weather never touches base stats: it exposes temporary
// modifiers that Game folds into derived unit stats and coin gains, and it is
// recomputed when weather starts or ends.

export const WEATHER_SETTINGS = {
  chancePerSecond: 0.01,
  duration: 20,
  lightningInterval: 3,
  lightningRadius: 36,
  lightningBaseDamage: 12, // scaled by the current wave's HP multiplier
  lightningMaxHpFraction: 0.07,
};

/**
 * cooldownMult: cooldown × m (0.9 = "+10% cooldown reduction").
 * coinMult: multiplies every coin gain (kills and wave rewards).
 * weight: relative chance of this weather when a roll succeeds.
 */
export const WEATHERS = {
  rainy: {
    id: 'rainy',
    label: 'Rainy',
    weight: 1,
    cooldownMult: 0.8,
    coinMult: 1.1,
    effects: ['+20% cooldown reduction', '+10% coin gain'],
    short: ['−20% cooldown', '+10% coins'],
    color: '#7fa7c9',
  },
  windy: {
    id: 'windy',
    label: 'Windy',
    weight: 1,
    damageMult: 1.15,
    cooldownMult: 0.9,
    rangeMult: 1.2,
    effects: ['+15% damage', '+10% cooldown reduction', '+20% range'],
    short: ['+15% dmg', '−10% cooldown', '+20% range'],
    color: '#b9c4b0',
  },
  thunderstorm: {
    id: 'thunderstorm',
    label: 'Thunderstorm',
    weight: 1,
    damageMult: 1.25,
    rangeMult: 1.15,
    lightning: true,
    effects: ['+25% damage', '+15% range', 'Lightning every 3 s strikes a random enemy: area damage equal to 7% of its max HP'],
    short: ['+25% dmg', '+15% range', 'lightning'],
    color: '#c9c48a',
  },
  aurora: {
    id: 'aurora',
    label: 'Aurora',
    weight: 1,
    coinMult: 1.35,
    effects: ['+35% coin gain'],
    short: ['+35% coins'],
    color: '#8fe0c0',
  },
  nova: {
    id: 'nova',
    label: 'Nova',
    weight: 1,
    damageMult: 1.3,
    cooldownMult: 0.6,
    effects: ['+30% damage', '+40% cooldown reduction'],
    short: ['+30% dmg', '−40% cooldown'],
    color: '#f2c27a',
  },
  // ---- The Ghost update
  ghastly: {
    id: 'ghastly',
    label: 'Ghastly Wind',
    weight: 1,
    rangeMult: 1.15,
    enemySpeed: 0.9,
    effects: ['+15% range', 'Enemies move 10% slower'],
    short: ['+15% range', 'enemies −10% speed'],
    color: '#b8c2c8',
  },
  starfall: {
    id: 'starfall',
    label: 'Starfall',
    weight: 1,
    damageMult: 1.1,
    star: { every: 4, maxHpFraction: 0.04, bossFraction: 0.02 },
    effects: ['+10% damage', 'Every 4 s a falling star hits a random enemy for 4% of its max HP (bosses: 2%)'],
    short: ['+10% dmg', 'falling stars'],
    color: '#b9c8ff',
  },
  twilight: {
    id: 'twilight',
    label: 'Twilight of Gods',
    weight: 1,
    damageMult: 1.2,
    cooldownMult: 1 / 1.15,
    enemyDamageTaken: 1.1,
    pulse: { every: 5, radius: 96, maxHpFraction: 0.03, bossFraction: 0.01 },
    effects: ['+20% damage', '+15% attack speed', 'Enemies take +10% damage', 'Every 5 s a celestial pulse: area damage of 3% max HP (bosses: 1%)'],
    short: ['+20% dmg', '+15% speed', 'enemies +10% dmg taken'],
    color: '#f0a050',
  },
};

export class WeatherSystem {
  constructor(rng, { enabled = true, settings = WEATHER_SETTINGS } = {}) {
    this.rng = rng;
    this.settings = settings;
    this.enabled = enabled;
    this.current = null; // weather definition
    this.remaining = 0;
    this.secondTimer = 0;
    this.lightningTimer = 0;
    this.periodic = {}; // weather-specific periodic effects (stars, pulses): kind -> seconds to next
    this.due = []; // periodic effects due this step, read and cleared by Game
    this.onChange = null;
  }

  /** Modifiers in effect right now (never mutate these). */
  get modifiers() {
    return this.current;
  }

  setEnabled(on) {
    this.enabled = !!on;
    if (!on && this.current) this.stop();
  }

  start(id) {
    this.current = WEATHERS[id];
    this.remaining = this.settings.duration;
    this.lightningTimer = this.settings.lightningInterval;
    this.periodic = {};
    for (const k of ['star', 'pulse']) if (this.current[k]) this.periodic[k] = this.current[k].every;
    this.onChange?.(this.current);
  }

  stop() {
    this.current = null;
    this.remaining = 0;
    this.onChange?.(null);
  }

  /** Advances time; returns the number of lightning strikes due this step. */
  update(dt) {
    let strikes = 0;
    if (this.current) {
      this.remaining -= dt;
      if (this.current.lightning) {
        this.lightningTimer -= dt;
        while (this.lightningTimer <= 0) {
          strikes++;
          this.lightningTimer += this.settings.lightningInterval;
        }
      }
      for (const k of Object.keys(this.periodic)) {
        this.periodic[k] -= dt;
        while (this.periodic[k] <= 0) {
          this.due.push(k);
          this.periodic[k] += this.current[k].every;
        }
      }
      if (this.remaining <= 0) this.stop();
      this.secondTimer = 0; // no rolls while weather is active
      return strikes;
    }
    if (!this.enabled) return 0;
    this.secondTimer += dt;
    while (this.secondTimer >= 1 && !this.current) {
      this.secondTimer -= 1;
      if (this.rng.next() < this.settings.chancePerSecond) {
        const pick = this.rng.weighted(Object.values(WEATHERS));
        this.start(pick.id);
      }
    }
    return 0;
  }
}
