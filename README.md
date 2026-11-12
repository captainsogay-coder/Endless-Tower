# Endless Tower

> There is no final wave. There is always another challenge.

An endless tower-defense game. Summon units, plan your army, deploy as many as you can afford on open ground, and hold off waves that never stop coming and keep changing.

**Play:** https://captainsogay-coder.github.io/Endless-Tower/ (endlesstower.com once its DNS is set up; see [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)) · Art direction: [docs/ART_DIRECTION.md](docs/ART_DIRECTION.md)

## Run locally

```bash
npm start            # source version at http://localhost:8080 (no build needed)
npm run preview      # production build (dist/) at http://localhost:8080
```

Debug URL options, which work on `localhost` only: `?seed=1234` (reproducible battle), `?realm=forest|volcanic|frozen|ruins|sky|mechanical`, `?tokens=5000`, `?fx=0` (ambient effects off).

## How it plays

1. **Battle Plans:** pick up to **12 unit types** from the units you own and name the plan. You can deploy unlimited copies of each type in battle.
2. **Battle:** the game assigns a **random battlefield**: a realm, a terrain variant and a layout, avoiding what you fought on recently. Players can't choose or reroll it. Deploy plan units with **Coins**, upgrade and sell copies, and clear waves.
3. **Tokens:** every **fully completed wave pays exactly 100 Tokens**. They are saved immediately and kept between battles and sessions.
4. **Summoning:** spend Tokens at the **Military Summoning Circle** or the **Advanced Military Circle** to unlock new unit types permanently.

### Deploying (two taps)

Tap a unit card (or press its key) to select it. This is free. Then tap open ground to deploy one copy. Coins are only charged when a unit is actually placed. Invalid ground, drags and accidental double taps (a 200 ms guard) never buy anything. Placement stays active so you can keep tapping; tap an existing unit to open it instead.

### Multiple waves and Auto Skip

- **Call wave N** calls the next wave immediately, even while others are fighting.
- **Call ×N** queues up to 1,000 waves at once. Queued waves enter 0.35 s apart, and enemies from every wave share the road.
- **Auto Skip** calls the next wave as soon as the newest one has finished spawning.
- Every wave keeps its own scaling and pays its own reward (coins plus 100 Tokens) the moment its last enemy dies. The HUD lists the active waves and the queue.

### Weather

While weather is on (the cloud button at the top left), every second has a **1% chance** of starting a random weather if none is active. Each weather lasts **20 s**, has its own visuals and sound, and its card at the top left shows the time left and the effects. Bonuses are applied on top of a unit's stats only while the weather lasts, never stack with another weather, and never change base stats.

| Weather | Effects |
| --- | --- |
| Rainy | +10% cooldown reduction, +5% coin gain |
| Windy | +5% damage, +5% cooldown reduction, +10% range |
| Thunderstorm | +20% damage, +10% range; lightning every 3 s strikes a random enemy for a small blast plus 7% of its max HP |
| Aurora | +20% coin gain |
| Nova | +20% damage, +30% cooldown reduction |

"X% cooldown reduction" multiplies the cooldown by (1 − X%). Turning weather off ends the current weather immediately.

| Input (battle) | Action |
| --- | --- |
| Deploy card / `1`–`9`, `0`, `-`, `=` | Choose a plan unit to place |
| Tap open ground | Deploy one copy (placement stays active) |
| Click a deployed unit | Stats, passive, upgrade preview |
| `U` / `X` | Upgrade / sell the selected unit |
| Right-click / `Esc` | Cancel placement or selection |
| Call wave / `N` | Call the next wave now (or tick **Auto Skip**) |
| Call ×N | Queue many waves at once |
| `Space`, `F` | Pause, cycle game speed |

## Currencies

| Currency | Earned | Spent on | Lifetime |
| --- | --- | --- | --- |
| **Coins** | Defeating enemies, clearing waves | Deploying and upgrading units in battle | One battle |
| **Tokens** | 100 per completed wave | Summoning | Saved permanently |

The two balances never mix. There is no Gem currency. If one is introduced later, a banner's `currency` field is the only thing that needs to change.

## Summoning

### Military Summoning Circle

**150 Tokens per summon.** ×1 = 150 · ×5 = 750 · ×10 = 1,500 · ×25 = 3,750.

| Unit | Chance | Tier |
| --- | --- | --- |
| Cadet | 50% | I |
| Gunnerman | 30% | II |
| Grenade Launcher | 15% | III |
| Tank | 5% | V |

- **Independent pulls:** every pull is a separate random draw. A multi-summon charges exactly price × count and shows all results together.
- **Before buying:** the total cost and resulting balance are shown before you confirm. Buttons you can't afford are disabled and say how many Tokens you still need.
- **The reveal:** the rings lock into place, the perimeter lamps climb through the rarity colours up to the result's tier, and then a supply crate drops onto the circle and opens. Rarer pulls get more locks, a heavier landing and a fuller sting, and the Tank adds an alarm. Multi-summons reveal crates one after another (click to advance) and can be skipped straight to the summary.
- **Unlocks:** results unlock units permanently. Duplicates are counted but never add a second unit type to Battle Plans. Summoned units are never auto-deployed.

### Advanced Military Circle

**250 Tokens per summon.** ×1 = 250 · ×5 = 1,250 · ×10 = 2,500 · ×25 = 6,250.

| Unit | Chance | Tier |
| --- | --- | --- |
| Special Forces | 40% | III |
| Drone | 30% | V |
| Commander | 10% | V |
| Colonel | 12% | VI |
| General | 7.5% | VII |
| Fortress | 0.5% | X |

### Duplicates and rare units

- **Duplicate compensation:** a pull of a unit you already own (including one pulled earlier in the same multi-summon) refunds **30% of one summon**, paid in Tokens: 45 at the Military Circle, 75 at the Advanced Circle. It is shown on each reveal card and totalled in the results. The rate is `SUMMON_CONFIG.duplicateCompensation` in `src/units/summoning.js`. A banner priced in another currency must declare its own `tokenValuePerUnit`; the code refuses to guess a conversion rate.
- **Rare units:** any result with a chance of 1% or less (currently the Fortress) gets a longer reveal: a blackout, a CLASSIFIED stamp, an armoured crate and an alarm. Odds are never adjusted. Every pull is a plain independent draw, and odds down to 0.01% are supported.

## Units

Every unit has a base level plus 5 upgrades, bought per copy in battle. All numbers live in one data table per unit in `src/units/defs/`.

| Unit | Tier | Price | Damage | Range (tiles) | Attacks/s | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Dude | I | 15 | 4 | 2 | 1.25 | Starter. **Dude Power:** `Damage × [1 + 0.10 × (deployed Dudes − 1)]` |
| Cadet | I | 30 | 7 | 2.5 | 1.5 | Better DPS and range than Dude |
| Gunnerman | II | 75 | 5 | 3.5 | 4.0 | Sustained machine-gun DPS |
| Grenade Launcher | III | 160 | 32 | 4 | 0.45 | Small blast (1.1 tiles). **Wounded:** 20% per enemy hit, −5% speed for 4 s, refreshes, never stacks |
| Tank | V | 450 | 85 | 5 | 0.4 | Blast 1.5 tiles. Leaves **flames** for 3 s (8% of shell damage per second). **Command Presence:** allies within 2.5 tiles attack 10% faster; overlapping Tanks don't stack |

| Special Forces | III | 110 | 10 | 3.5 | 3.0 | **Squad Tactics:** `Damage × [1 + 0.20 × (deployed Special Forces − 1)]` (`SQUAD_TACTICS_PER_UNIT`) |
| Drone | V | 320 | 60 | 6.25 | 0.67 | Launches a drone every 1.5 s that hunts a target and detonates (1-tile blast). 10% are **Explosive Drones**: 5× damage, 2× blast radius |
| Commander | V | 420 | 34 | 10 | 2.4 | Extreme range, targets the strongest enemy. **Field Command:** allies within 5.5 tiles get +8% range and 8% cooldown reduction |
| Colonel | VI | 90 | 26 | 4 | 1.2 | Cheap. **Orders:** every unit on the map gets +15% damage, 10% cooldown reduction and +5% range. **Requisitions:** +15% coins |
| General | VII | 900 | 150 | 6.5 | 0.5 | Artillery (1.75-tile blast). **High Command:** allies within 6.5 tiles get +25% damage, 15% cooldown reduction and +10% range. Launches a regular drone every 4 s |
| Fortress | X | 3000 | 380 | 8.5 | 0.3 | Siege guns with an enormous 3.75-tile blast. Launches an Explosive Drone every 5 s that inflicts **Crippled** (+20% damage taken, −10% speed for 5 s). **Logistics:** +25% coins |

Selling refunds 70% of everything spent on that copy.

**Buff rules:** every buff and coin bonus has an id and applies **at most once per unit**, however many copies are on the map. Different buffs (Tank, Commander, Colonel, General, weather) multiply together, so a stack is bounded. A unit never buffs itself. Statuses don't stack either: the strongest Wounded or Crippled wins and refreshes the duration. Drone launch intervals are fixed and not affected by cooldown buffs.

### Adding a unit

1. Create a definition in `src/units/defs/` (the schema is in `src/units/roster.js`) and add it to `ROSTER`.
2. Give it an art painter in `src/render/unitArt.js`.
3. To make it summonable, add it to a banner pool in `src/units/summoning.js`.

Shared systems handle the rest: targeting, upgrades, passives, `onHit` statuses, `impactHazard` ground effects, `buffs`, `economy` coin bonuses and `summon` drone launchers, mostly in `src/game/effects.js` and `src/game/Game.js`. Passives and buffs are recomputed only when units are deployed, sold or upgraded, never every frame.

## Waves, scaling and realms

- **Waves:** endless, built from four archetypes (Swarm, Army, Commando and Boss), with gradual, finite-forever scaling and progressive encounter traits.
- **Realms:** six, each with three terrain variants, a landmark, natural ground and its own lighting.
- **Layouts:** procedurally generated and validated so every route is a contiguous road from the edge to the Tower.

## Audio

All sound is synthesized with WebAudio, so nothing is downloaded. Effects, ambience and weather run on separate buses into a compressor. Each realm has its own ambience loop and each weather its own layer. Huge waves stay listenable: each sound kind has a minimum gap, at most 10 voices start per 100 ms, and loudness eases off as that budget fills. The sound button in the HUD mutes everything, and the setting is saved.

## Architecture

```
src/
  config.js                 world grid + tunables (coins, tokens per wave, …)
  core/                     seeded RNG & noise, spatial hash, events, math, colour
  game/Game.js              the simulation – DOM-free, event-driven, runs headless
  game/effects.js           statuses (Wounded, Burning), hazards (flames), auras
  maps/                     generator, biomes + variants, rotation (random battlefields), painters
  waves/                    archetypes, director, scaling, traits, spawn schedules
  enemies/                  weight classes + roster variant hook
  units/                    tiers, registry, roster, defs/, stats/upgrades, summoning banners
  meta/                     battle plans (12 types) + persistent profile (tokens, unlocks)
  render/                   renderer, unit art & animation, summoning circle & reveal, effects
  audio/sfx.js              synthesized sound effects (WebAudio, no assets)
  ui/                       Battle Plans, Summoning, battle HUD
```

## Development

```bash
npm test                           # 46 unit tests: maps, rotation, waves, units, effects, tokens, summoning, persistence
npm run build                      # production build → dist/
node scripts/e2e.mjs URL           # 26 browser checks against a running build (needs Playwright)
npm run sim -- 10 150              # headless balance sim
node scripts/screenshot.mjs URL    # every realm mid-battle
node scripts/interactions.mjs URL  # real clicks/drags/keys: plan edit, deploy, upgrade, sell, boss
```

Pushes to `main` build the game and publish it to the `gh-pages` branch, which GitHub Pages serves. See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for setup and the DNS records for endlesstower.com.
