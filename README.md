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
3. **Tokens:** every **fully completed wave pays 250 Tokens, +5% for every 10 waves** reached (wave 10: 263, wave 50: 313, wave 100: 375). The reward is shown before each wave and when it's cleared, and saved immediately.
4. **Summoning:** spend Tokens at five circles (Military, Advanced Military, Wild West, Gambino and Nuclear War) to unlock new unit types permanently. Tokens are the only summon currency.

### Upgrading and range

Tap any deployed unit to select it. Only that copy is selected and upgraded. The panel shows its name, tier, level, current and next-level stats (damage, range, attack speed, blast radius, DPS), the upgrade cost, its ability with the values at its current level, and every buff reaching it.

- The **Upgrade** button spends exactly the shown cost and the stats change at once. It is disabled when you can't afford it, saying how many coins you're short, and shows **Max level** at level 5.
- The panel is built once per selection and only updated in place, so clicks never get lost mid-battle. On phones it's a sheet that takes the unit cards' place in the dock. It shows a one-line stat summary, a scrolling comparison table and a fixed Upgrade/Sell row, so the battlefield and the wave controls stay visible.
- A **range ring** is drawn around the selected unit. It is the exact range the targeting uses, after level, passives, buffs and weather, and it updates immediately when any of those change. Dashed rings show finite buff radii.
- While placing a unit, hovering (or pressing) on open ground previews the range that unit would have on that tile, using the same calculation.

Upgrade costs and stat growth come from the tier system (see **Tiers** below):
- **Costs:** 0.8, 1.3, 2, 3 and 4.5 × the deploy price.
- **Growth per level:** damage ×1.2 at T1, rising with tier up to ×1.32; range ×1.03; attack speed ×1.04.

Abilities grow with the level as well: anything based on damage scales with it, flat coin payouts grow 12% per level (`ABILITY_LEVEL_BONUS`), and buffs with a `levelScale` grow 10% of their bonus per level.

### Phones

Phones get their own layout rather than a shrunken desktop one. It is driven by `src/ui/responsive.js` (`html.phone`, `html.phone-landscape`, `html.narrow`) and the "PHONE LAYOUT" section of `styles.css`.

- **Portrait:** a slim top bar (wave, Tower HP, Tokens earned, Coins, sound, retreat), then the battlefield at full width. Below it sits a compact weather strip, then a horizontally scrolling row of unit cards (or the unit sheet), then a bottom control bar: pause, 1×/2×/3×, Call wave, Call ×N and Auto Skip.
- **Landscape:** the battlefield takes the full height on the left. Pause and speed sit in the top bar, and a side column holds weather, unit cards (or the unit sheet) and the wave controls.
- **Narrow phones** (under 380 px): one speed button cycles 1× → 2× → 3×.
- **Everywhere:** every control is at least 40 px tall (main actions 44 px+), safe areas (notches, home indicator) are respected, menus scroll while the battlefield never does, and nothing overlaps the battlefield except short wave banners.
- **Menus:** Summoning uses scrollable circle cards (name, Token price, unit preview), a collapsible "Drop rates & units" section and a four-button pull row. Battle Plans uses compact unit cards and a sticky Battle bar.
- `node scripts/mobile-shots.mjs URL` screenshots every screen on a 320 px phone, two larger phones, two landscape phones and desktop, and checks for overflow, overlapping or off-screen controls and undersized touch targets.

### Deploying (two taps)

Tap a unit card (or press its key) to select it. This is free. Then tap open ground to deploy one copy. Coins are only charged when a unit is actually placed. Invalid ground, drags and accidental double taps (a 200 ms guard) never buy anything. Placement stays active so you can keep tapping; tap an existing unit to open it instead.

### Multiple waves and Auto Skip

- **Call wave N** calls the next wave immediately, even while others are fighting.
- **Call ×N** queues up to 1,000 waves at once. Queued waves enter 0.35 s apart, and enemies from every wave share the road.
- **Auto Skip** calls the next wave as soon as the newest one has finished spawning.
- Every wave keeps its own scaling and pays its own reward (coins plus its Tokens) the moment its last enemy dies. The HUD lists the active waves and the queue.

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
| **Tokens** | 250 per completed wave, +5% per 10-wave milestone (`BALANCE.tokens` in `src/balance.js`) | Every summoning circle | Saved permanently |

There is exactly one summon currency: **Tokens**. `registerBanner` refuses a circle priced in anything else, the profile saves only a Token balance (an old save's stray Gem balance is dropped on load), and wave rewards are coins and Tokens only.

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

### Nuclear War: 500 Tokens per summon

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
  - It's always paid in Tokens: 45 at Military, 75 at Advanced, 90 at Wild West and Gambino, 150 at Nuclear War.
- **Rare units:** any result with a chance of 1% or less gets a longer reveal with a blackout, a stamp, an armoured crate and an alarm. Each circle has its own floor art: concrete, red steel, Wild West floorboards with a sheriff's star, Gambino casino felt with a roulette wheel, or a hazard-striped Nuclear War launch pad.
  - **Fastest Hand In The West:** "High Noon". At sundown a revolver cylinder spins in silence, then six shots ring out around the circle.
  - **THE HOUSE:** the circle becomes a slot machine. The reels stop one by one on 7-7-7, then coins pour down.
  - **High Roller:** a chip shower.
  - **Nuclear Warhead:** a launch countdown.
  - **Antimatter Warhead:** space folding into the centre.

  Odds are never adjusted. Every pull is a plain independent draw, and the outcome is decided before the animation starts. Normal summons keep their short reveal.

## Balance and progression

Every knob is in `src/balance.js`; measurements and the reasoning behind each individual adjustment are in **[docs/BALANCE.md](docs/BALANCE.md)** (`node scripts/balance.mjs tokens|units|bot [--before]` reproduces them).

- **Global layer (every unit, including future ones):** +20% damage, +10% range, −10% attack cooldown, +15% coins from abilities and economy bonuses.
- **Upgrades:** each level adds +8% damage, +2% range and +2% attack speed on top of the unit's own table, so every upgrade is at least +20% DPS.
- **Wave scaling:** Tier I–III units gain +2% of their base damage per completed wave and Tier IV–VI +1%. Tier VII and up get none. It is linear, the same for every copy, shown in the unit panel, and never written into base stats.
- **Stacking:** wave scaling, count passives (Dude Power, Squad Tactics, The Gang) and capped self bonuses are **added** together. Buffs (once per id) and weather (one at a time) **multiply**. Nothing compounds per wave.
- **Splash falloff:** the enemy a shot was aimed at takes full damage; others in the blast take 60%.

### Tiers

No unit has hand-picked stats. `tierUnit(tier, profile)` in `src/units/levels.js` builds every level table from the tier's **combat-power budget** (`TIERS` in `src/balance.js`).

| Tier | I | II | III | IV | V | VI | VII | VIII | IX | X | XI | XII | XIII | XIV | XV | XVII | XIX |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Budget (× T1) | 1.0 | 1.5 | 2.1 | 2.8 | 3.6 | 4.5 | 5.5 | 6.6 | 7.8 | 9.1 | 10.5 | 12 | 13.7 | 15.5 | 17.5 | 22.1 | 27.5 |

Past XV, each step grows by 0.2 more than the last.

A unit's file only describes **how** it fights: attack speed, range, splash, hits per attack and role (gunner / summoner / support / economy). The generator then spends the budget:

- **Damage:** `12 DPS × budget × role share × splash cost × range cost`, split across attacks and hits. Area damage, long range and team-wide buffs are paid for out of the same budget, so an area unit hits many enemies for less each (and is weaker against bosses) and a support unit trades its own damage for its buffs.
- **Price:** `20 × budget^1.3`. Higher tiers cost more but stay worth it. The Colonel is deliberately cheap.
- **Upgrades:** costs scale with the price, and higher tiers grow faster per level, so the order holds at every level.
- **Per-unit trims:** an optional `power` factor (0.22–1.35) corrects measured outliers, mostly abilities worth a lot on their own, like summoned gangs and global barrages. It's written next to each unit's profile.

`node scripts/balance.mjs tiers [level]` measures every unit in the real simulation: its single-target DPS, and its *battlefield contribution* (a six-Cadet squad's crowd damage with the unit minus without it, so buffs and summons count). It reports the geometric mean of the two against the tier target. `tests/tiers.test.js` runs that measurement and fails if a tier's average drifts more than 15% from its budget, any unit more than 25%, or any Tier III unit falls below a Tier I.

The tables show level-0 stats as players see them (with the global layer). DPS counts every hit of an attack.

## Units

Every unit has a base level plus 5 upgrades, bought per copy in battle. Stats come from each unit's tier profile (see **Tiers** above).

| Unit | Tier | Price | Damage | Range (tiles) | Attacks/s | DPS | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Dude | I | 15 | 8.6 | 2.2 | 1.39 | 12 | Starter. **Dude Power:** `Damage × [1 + 0.10 × (deployed Dudes − 1)]` |
| Cadet | I | 30 | 9.6 | 2.75 | 1.67 | 16 | Better DPS and range than Dude |
| Gunnerman | II | 35 | 4.9 | 3.85 | 4.44 | 21.9 | Sustained machine-gun DPS |
| Grenade Launcher | III | 50 | 18 | 4.4 | 0.61 | 11 | Small blast (1.1 tiles). **Wounded:** 20% per enemy hit, −5% speed for 4 s, refreshes, never stacks |
| Tank | V | 105 | 28.2 | 5.5 | 0.44 | 12.5 | Blast 1.5 tiles. Leaves **flames** for 3 s (8% of shell damage per second). **Command Presence:** allies within 2.5 tiles attack 10% faster; overlapping Tanks don't stack |
| Special Forces | III | 50 | 10.3 | 3.85 | 3.33 | 34.4 | **Squad Tactics:** +15% damage per other Special Forces deployed, up to +300% (`SQUAD_TACTICS_PER_UNIT`, `SQUAD_TACTICS_CAP`) |
| Drone | V | 105 | 25.2 | 6.88 | 0.74 | 18.7 | Launches a drone every 1.5 s (1.35 s with the global cooldown cut) that hunts a target and detonates (1-tile blast). 10% are **Explosive Drones**: 5× damage, 2× blast radius |
| Commander | V | 105 | 15.6 | 11 | 2.67 | 41.6 | Extreme range, targets the strongest enemy. **Field Command:** allies within 5.5 tiles get +8% range and 8% cooldown reduction |
| Colonel | VI | 40 | 36.6 | 4.4 | 1.33 | 48.8 | Cheap. **Orders:** every unit on the map gets +15% damage, 10% cooldown reduction and +5% range. **Requisitions:** +15% coins |
| General | VII | 185 | 33.6 | 7.15 | 0.56 | 18.7 | Artillery (1.75-tile blast). **High Command:** allies within 6.5 tiles get +25% damage, 15% cooldown reduction and +10% range. Launches a regular drone every 4 s |
| Fortress | X | 350 | 48.6 | 9.35 | 0.33 | 16.2 | Siege guns with an enormous 3.75-tile blast. Launches an Explosive Drone every 5 s that inflicts **Crippled** (+20% damage taken, −10% speed for 5 s). **Logistics:** +25% coins |

### Circle units

Range is in tiles; ability numbers live in each unit's `ability` block (`src/units/defs/wildWest.js`, `gambino.js`, `nuclearWar.js`), the behaviour in `src/game/abilities.js`.

| Unit | Tier | Price | Damage | Range | Atk/s | DPS | Ability |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Gambler | III | 50 | 16.8 | 3.85 | 1.56 | 26.1 | 15% crits for 3×; every 10th attack is a guaranteed crit and pays 2 coins |
| Bandit | III | 50 | 13.2 | 3.58 | 2.44 | 32.3 | +3% per consecutive hit on one enemy, up to +30%; resets on a new target |
| Outlaw | V | 105 | 21.6 | 4.4 | 1.33 | 28.8 | Every 6th attack: dynamite (1.5×, 1.4-tile blast), enemies hit take +10% damage for 4 s |
| Bounty Hunter | V | 105 | 51 | 6.05 | 0.89 | 45.3 | Every 8 s marks the highest-HP enemy in range; +20% damage to it; a marked kill pays 4× its coin reward |
| Gunslinger | VII | 185 | 24 | 5.16 | 2.22 | 53.3 | Every 5th attack: 3-shot burst at 70%; 20% crit chance, crits 2.5× |
| Sheriff | IX | 290 | 79.8 | 6.05 | 1.11 | 88.7 | Allies within 7 tiles: +12% damage, +10% range; every 15 s a 5× shot at the strongest enemy |
| Outlaw Leader | IX | 290 | 14.4 | 5.5 | 1.22 | 17.6 | Calls 3 Outlaws for 12 s every 12 s; +5% damage per *deployed* Outlaw (max +50%); every 20 s 0.5 coins per enemy alive (max 150) |
| Fastest Hand In The West | XII | 510 | 81 ×6 | 7.15 | 0.28 | 135 | Six-shot barrage per attack; +2% attack speed per consecutive kill (max +40%, resets after 8 s); every 25 s a 10× crit at the strongest enemy |
| Drunkard | I | 25 | 7.2 | 2.48 | 1.33 | 9.6 | 70% or 160% damage; every 10th attack a stumble that slows 5% for 2 s |
| Dealer | VI | 140 | 31.8 | 5.5 | 1.78 | 56.5 | Card throws; allies in its range: 10% cooldown reduction; every 20 s 1 coin per enemy eliminated (max 200) |
| Night Dancer | VI | 140 | 16.8 | 4.4 | 1.67 | 28 | Small blasts; every 5 attacks a pulse slowing enemies in range 15% for 3 s |
| Desperate Gambler | VII | 185 | 36.6 | 4.95 | 1.56 | 56.9 | 50%: 2.5× or 40%; every 15 s an all-in shot of 0.5×–5× |
| Pit Boss | IX | 290 | 91.8 | 5.5 | 1.11 | 102 | Allies within 7.5 tiles: +15% damage, 10% cooldown reduction; every 15 s 1.5 coins per enemy defeated (max 300) |
| High Roller | X | 350 | 64.2 | 6.05 | 1.33 | 85.6 | Every 8 s an 8× shot; every 10th attack a Jackpot: 30 coins and +1% battle damage (max +25%) |
| THE HOUSE | XV | 830 | 49.2 | 8.25 | 1.11 | 54.7 | All allies +10% damage, 10% cooldown reduction; every 20 s Jackpot (+500 coins), Bankruptcy (5× in a 4-tile area) or Double Down (2× damage for 10 s); every 50 kills all allies +1% damage for the battle (max +20%) |
| Missile Launcher | IV | 75 | 13.8 | 6.05 | 0.78 | 10.7 | Area rockets; every 8th attack a bonus 2× missile |
| Special Force Battalion | V | 105 | 15.6 | 4.68 | 2.22 | 34.7 | Keeps up to 3 mini soldiers (20 s each, one more every 3 s); +5% damage per surviving soldier |
| Intercontinental Ballistic Missile | VII | 185 | 59.4 | 16.5 | 0.22 | 13.2 | 3-tile blast plus a 40% aftershock |
| Bomber | VII | 185 | 26.4 ×4 | 7.7 | 0.25 | 26 | Flyover dropping 4 bombs along the road, leading the column; every 3rd run an extra 2× explosion |
| B-2 | IX | 290 | 90.6 ×2 | 8.8 | 1 per 10.8 s | 16.7 | Bombing run; the strongest enemy in the main blast takes 3× |
| Marshal | XII | 510 | 39 | 6.88 | 1.33 | 52 | All allies +15% damage, +10% range; every 20 s 120 coins; every 30 s a 6× barrage |
| Glorious Leader | XV | 830 | 163.2 | 7.15 | 1.33 | 217.6 | All allies +20% damage; every 25 s 400 coins; every 20 s every enemy takes +15% damage for 5 s |
| Nuclear Warhead | XVII | 1,120 | 170.4 | 11 | 0.22 | 37.9 | 5-tile blast, a 6 s energy zone, enemies hit take +20% damage for 5 s |
| Antimatter Warhead | XIX | 1,490 | 318 | 12.1 | 0.2 | 63.6 | 6-tile energy blast, +30% damage taken for 8 s; every 40 s a gravity field holds and gathers enemies for 3 s, then detonates (bosses resist the pull) |

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

1. Create a definition in `src/units/defs/` (the schema is in `src/units/roster.js`) with `...tierUnit(tier, { rate, range, splash?, hits?, role? })` for its stats, and add it to `ROSTER`. Run `node scripts/balance.mjs tiers` to see where it lands.
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
npm test                           # 115 unit tests: maps, waves, units, every ability, odds, currencies, weather, balance, persistence
node scripts/balance.mjs units     # balance report (also: tokens, bot; add --before for the old balance)
npm run build                      # production build → dist/
node scripts/e2e.mjs URL           # 48 browser checks
node scripts/mobile-shots.mjs URL  # phone + desktop screenshots with layout checks against a running build (needs Playwright)
npm run sim -- 10 150              # headless balance sim
node scripts/screenshot.mjs URL    # every realm mid-battle
node scripts/interactions.mjs URL  # real clicks/drags/keys: plan edit, deploy, upgrade, sell, boss
```

Pushes to `main` build the game and publish it to the `gh-pages` branch, which GitHub Pages serves. See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for setup and the DNS records for endlesstower.com.
