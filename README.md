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
4. **Summoning:** spend Tokens (or Gems) at five circles (Military, Advanced Military, Wild West, Gambino and Nuclear War) to unlock new unit types permanently.

### Upgrading and range

Tap any deployed unit to select it. Only that copy is selected and upgraded. The panel shows its name, tier, level, current and next-level stats (damage, range, attack speed, blast radius, DPS), the upgrade cost, its ability with the values at its current level, and every buff reaching it.

- The **Upgrade** button spends exactly the shown cost and the stats change at once. It is disabled when you can't afford it, saying how many coins you're short, and shows **Max level** at level 5.
- The panel is built once per selection and only updated in place, so clicks never get lost mid-battle. On phones it takes the unit cards' place in the dock, so the Upgrade button and the wave controls always stay on screen.
- On phones held sideways, the top bar and dock shrink to one compact row each, so the battlefield keeps most of the screen.
- A **range ring** is drawn around the selected unit. It is the exact range the targeting uses, after level, passives, buffs and weather, and it updates immediately when any of those change. Dashed rings show finite buff radii.
- While placing a unit, hovering (or pressing) on open ground previews the range that unit would have on that tile, using the same calculation.

Upgrade costs and stat growth are data. The original units have hand-written tables. The circle units use `buildLevels` with `UPGRADE_SCALING` in `src/units/levels.js`: costs of 0.8, 1.3, 2, 3 and 4.5 × the deploy price; ×1.22 damage, ×1.035 range and ×1.05 attack speed per level. Abilities grow with the level as well: anything based on damage scales with it, flat coin payouts grow 12% per level (`ABILITY_LEVEL_BONUS`), and buffs with a `levelScale` grow 10% of their bonus per level.

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
| Rainy | +20% cooldown reduction, +10% coin gain |
| Windy | +15% damage, +10% cooldown reduction, +20% range |
| Thunderstorm | +25% damage, +15% range; lightning every 3 s strikes a random enemy, and every enemy in the blast loses 7% of its max HP |
| Aurora | +35% coin gain |
| Nova | +30% damage, +40% cooldown reduction |

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
| **Tokens** | 100 per completed wave | Military, Advanced, Wild West and Gambino circles | Saved permanently |
| **Gems** | 50 per completed **boss** wave (`GAME_CONFIG.gemsPerBossWave`) | Nuclear War circle | Saved permanently |

The balances never mix. Nothing converts Gems to Tokens or back unless a rate is set in `SUMMON_CONFIG.tokenValue.gems` (it is `null` by default).

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

### Wild West: 300 Tokens per summon

| Unit | Tier | Chance |
| --- | --- | --- |
| Gambler | III | 30% |
| Bandit | III | 25% |
| Outlaw | V | 18% |
| Bounty Hunter | V | 13% |
| Gunslinger | VII | 8% |
| Sheriff | IX | 4% |
| Outlaw Leader | IX | 1.5% |
| Fastest Hand In The West | XII | 0.5% |

### Gambino: 300 Tokens per summon

| Unit | Tier | Chance |
| --- | --- | --- |
| Drunkard | I | 45% |
| Dealer | VI | 25% |
| Night Dancer | VI | 15% |
| Desperate Gambler | VII | 9% |
| Pit Boss | IX | 5% |
| High Roller | X | 0.9% |
| THE HOUSE | XV | 0.1% |

### Nuclear War: 500 Gems per summon

Fictional, arcade-style sci-fi: toy-like hardware and stylised energy blasts.

| Unit | Tier | Chance |
| --- | --- | --- |
| Missile Launcher | IV | 35% |
| Special Force Battalion | V | 25% |
| Intercontinental Ballistic Missile | VII | 15% |
| Bomber | VII | 12% |
| B-2 | IX | 7% |
| Marshal | XII | 4% |
| Glorious Leader | XV | 1.5% |
| Nuclear Warhead | XVII | 0.4% |
| Antimatter Warhead | XIX | 0.1% |

Every pool is checked at start-up to total exactly 100%.

### Duplicates and rare units

- **Duplicate compensation:** a pull of a unit you already own refunds **30% of one summon**. This includes a unit pulled earlier in the same multi-summon. It is shown on each reveal card and totalled in the results.
  - Token circles pay in Tokens: 45 at Military, 75 at Advanced, 90 at Wild West and Gambino.
  - The Gem circle pays 150 **Gems**, because no Gem-to-Token rate is configured. Set `SUMMON_CONFIG.tokenValue.gems` (or a banner's `tokenValuePerUnit`) to pay it in Tokens instead. No rate is ever assumed.
- **Rare units:** any result with a chance of 1% or less gets a longer reveal with a blackout, a stamp, an armoured crate and an alarm. Each circle has its own floor art: concrete, red steel, Wild West floorboards with a sheriff's star, Gambino casino felt with a roulette wheel, or a hazard-striped Nuclear War launch pad.
  - **Fastest Hand In The West:** "High Noon". At sundown a revolver cylinder spins in silence, then six shots ring out around the circle.
  - **THE HOUSE:** the circle becomes a slot machine. The reels stop one by one on 7-7-7, then coins pour down.
  - **High Roller:** a chip shower.
  - **Nuclear Warhead:** a launch countdown.
  - **Antimatter Warhead:** space folding into the centre.

  Odds are never adjusted. Every pull is a plain independent draw, and the outcome is decided before the animation starts. Normal summons keep their short reveal.

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

### Circle units

Range is in tiles; ability numbers live in each unit's `ability` block (`src/units/defs/wildWest.js`, `gambino.js`, `nuclearWar.js`), the behaviour in `src/game/abilities.js`.

| Unit | Price | Dmg | Range | Atk/s | Ability |
| --- | --- | --- | --- | --- | --- |
| Gambler | 120 | 14 | 3.5 | 1.4 | 15% crits for 3×; every 10th attack is a guaranteed crit and pays 2 coins |
| Bandit | 100 | 9 | 3.25 | 2.2 | +3% per consecutive hit on one enemy, up to +30%; resets on a new target |
| Outlaw | 260 | 30 | 4 | 1.2 | Every 6th attack: dynamite (1.5×, 1.4-tile blast), enemies hit take +10% damage for 4 s |
| Bounty Hunter | 300 | 48 | 5.5 | 0.8 | Every 8 s marks the highest-HP enemy in range; +20% damage to it; a marked kill pays 4× its coin reward |
| Gunslinger | 650 | 55 | 4.7 | 2.0 | Every 5th attack: 3-shot burst at 70%; 20% crit chance, crits 2.5× |
| Sheriff | 1,100 | 120 | 5.5 | 1.0 | Allies within 7 tiles: +12% damage, +10% range; every 15 s a 5× shot at the strongest enemy |
| Outlaw Leader | 1,300 | 110 | 5 | 1.1 | Calls 3 Outlaws for 12 s every 12 s; +5% damage per *deployed* Outlaw (max +50%); every 20 s 0.5 coins per enemy alive (max 150) |
| Fastest Hand In The West | 4,000 | 260 | 6.5 | 0.25 | Six-shot barrage per attack; +2% attack speed per consecutive kill (max +40%, resets after 8 s); every 25 s a 10× crit at the strongest enemy |
| Drunkard | 25 | 6 | 2.25 | 1.2 | 70% or 160% damage; every 10th attack a stumble that slows 5% for 2 s |
| Dealer | 500 | 40 | 5 | 1.6 | Card throws; allies in its range: 10% cooldown reduction; every 20 s 1 coin per enemy eliminated (max 200) |
| Night Dancer | 480 | 30 | 4 | 1.5 | Small blasts; every 5 attacks a pulse slowing enemies in range 15% for 3 s |
| Desperate Gambler | 600 | 60 | 4.5 | 1.4 | 50%: 2.5× or 40%; every 15 s an all-in shot of 0.5×–5× |
| Pit Boss | 1,200 | 90 | 5 | 1.0 | Allies within 7.5 tiles: +15% damage, 10% cooldown reduction; every 15 s 1.5 coins per enemy defeated (max 300) |
| High Roller | 2,200 | 140 | 5.5 | 1.2 | Every 8 s an 8× shot; every 10th attack a Jackpot: 30 coins and +1% battle damage (max +25%) |
| THE HOUSE | 8,000 | 300 | 7.5 | 1.0 | All allies +10% damage, 10% cooldown reduction; every 20 s Jackpot (+500 coins), Bankruptcy (5× in a 4-tile area) or Double Down (2× damage for 10 s); every 50 kills all allies +1% damage for the battle (max +20%) |
| Missile Launcher | 220 | 40 | 5.5 | 0.7 | Area rockets; every 8th attack a bonus 2× missile |
| Special Force Battalion | 350 | 26 | 4.25 | 2.0 | Keeps up to 3 mini soldiers (20 s each, one more every 3 s); +5% damage per surviving soldier |
| ICBM | 900 | 260 | 15 | 0.2 | 3-tile blast plus a 40% aftershock |
| Bomber | 850 | 120 | 7 | 1 per 6 s | Flyover dropping 4 bombs along its path; every 3rd run an extra 2× explosion |
| B-2 | 1,600 | 900 | 8 | 1 per 12 s | Bombing run; the strongest enemy in the main blast takes 3× |
| Marshal | 3,500 | 200 | 6.25 | 1.2 | All allies +15% damage, +10% range; every 20 s 120 coins; every 30 s a 6× barrage |
| Glorious Leader | 7,000 | 320 | 6.5 | 1.2 | All allies +20% damage; every 25 s 400 coins; every 20 s every enemy takes +15% damage for 5 s |
| Nuclear Warhead | 12,000 | 2,500 | 10 | 0.12 | 5-tile blast, a 6 s energy zone, enemies hit take +20% damage for 5 s |
| Antimatter Warhead | 20,000 | 4,000 | 11 | 0.12 | 6-tile energy blast, +30% damage taken for 8 s; every 40 s a gravity field holds and gathers enemies for 3 s, then detonates (bosses resist the pull) |

Selling refunds 70% of everything spent on that copy.

**Summoned allies** (the Outlaw Leader's Outlaws, the Battalion's soldiers) are temporary. They can't be selected, sold or upgraded, receive no buffs, leave with the unit that called them, and **never count as deployed units**, so they can't trigger Dude Power, Squad Tactics or the Outlaw Leader's own bonus.

**Buff rules:**

- Every buff and coin bonus has an id and applies **at most once per unit**, however many copies are on the map. If several copies reach the same unit, the highest-level one counts.
- Different buffs multiply together, so a stack is bounded. This covers Tank, Commander, Colonel, General, Sheriff, Dealer, Pit Boss, THE HOUSE, Marshal, Glorious Leader and weather.
- A unit never buffs itself.
- Self-bonuses are capped per unit: Bandit +30%, High Roller +25%, Fastest Hand +40% attack speed, Battalion +15%. House Edge is capped at +20% for the battle and resets every battle.
- Stats are re-derived from scratch: level, then passive, then buffs, then bonuses, then weather. Nothing ever accumulates beyond its cap.
- Statuses don't stack. Wounded, Crippled, Exposed (+X% damage taken) and Slowed each keep only their strongest active strength. Damage-taken statuses don't multiply each other: the strongest one applies.
- Drone and ability timers are fixed and not affected by cooldown buffs.

### Adding a unit

1. Create a definition in `src/units/defs/` (the schema is in `src/units/roster.js`) and add it to `ROSTER`.
2. Give it an art painter in `src/render/unitArt.js` (or `registerPainter` from another module, like `src/render/castArt.js`).
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
  game/effects.js           statuses (Wounded, Crippled, Exposed, Slowed, Burning), hazards, buffs
  game/abilities.js         circle unit abilities (crits, bursts, bounties, summons, bombing runs, fields)
  game/weather.js           weather rolls and modifiers
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
npm test                           # 100 unit tests: maps, waves, units, every ability, odds, currencies, weather, persistence
npm run build                      # production build → dist/
node scripts/e2e.mjs URL           # 46 browser checks against a running build (needs Playwright)
npm run sim -- 10 150              # headless balance sim
node scripts/screenshot.mjs URL    # every realm mid-battle
node scripts/interactions.mjs URL  # real clicks/drags/keys: plan edit, deploy, upgrade, sell, boss
```

Pushes to `main` build the game and publish it to the `gh-pages` branch, which GitHub Pages serves. See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for setup and the DNS records for endlesstower.com.
