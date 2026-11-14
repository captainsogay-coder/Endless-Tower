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

1. **Battle Plans:** pick up to **12 unit types** from the units you own and name the plan. You can deploy unlimited copies of each type in battle. Pin favourites to the front of the collection, filter by role, or let **Auto Pick** choose your strongest types, optionally by DPS, AOE, Summon, Empower or Economy (see [Battle Plans](#battle-plans)).
2. **Battle:** the game assigns a **random battlefield**: a realm, a terrain variant and a layout, avoiding what you fought on recently. Players can't choose or reroll it. Deploy plan units with **Coins**, upgrade and sell copies, and clear waves.
3. **Tokens:** every **fully completed wave pays 250 Tokens, +5% for every 10 waves** reached (wave 10: 263, wave 50: 313, wave 100: 375). The reward is shown before each wave and when it's cleared, and saved immediately.
4. **Summoning:** spend Tokens at eight circles to unlock new unit types permanently. All circles are shown together, cheapest first, and the cheapest opens by default. Tokens are the only summon currency.

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

- **Portrait:** a slim top bar (wave, Tower HP, Tokens earned, Coins, sound, retreat), then the battlefield at full width. Below it sits a horizontally scrolling row of unit cards (or the unit sheet), then a bottom control bar: pause, 1×/2×/3×, Call wave, Call ×N and Auto Skip.
- **Weather on phones:** while a weather is active, the top bar shows a small chip (icon + seconds left) in place of the weather toggle. Tap it for a compact panel with the weather's name, time left and buffs, plus *Turn weather off*. Tap outside or × to close. Starting a placement closes it, and the chip stays disabled while you place, so it never covers ground you're building on.
- **Landscape:** the battlefield takes the full height on the left. Pause and speed sit in the top bar, and a side column holds unit cards (or the unit sheet) and the wave controls.
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

While weather is on (the cloud button at the top left), every second has a **1% chance** of starting a random weather if none is active. Each weather lasts **20 s**, has its own visuals and sound, and a compact card at the top left (desktop) or a tappable chip in the top bar (phones) shows the time left and the effects. Bonuses are applied on top of a unit's stats only while the weather lasts, never stack with another weather, and never change base stats.

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

## Battle Plans

- **Plans** hold up to 12 distinct unit *types*. Tap an owned card to add or remove it.
- **Side tiers:** every card shows five measured ratings: **DPS, AOE, SUM (Summon), EMP (Empower) and ECO (Economy)**. They are numbers on coloured bars, while the overall tier keeps its Roman numeral. A dash means N/A. Hover or long-press a number for the measured value behind it. The unit's details panel lists all five with an explanation and where it ranks among your units ("#2 of 14 owned"). See [docs/SIDE_TIERS.md](docs/SIDE_TIERS.md) for how they are measured and the full table.
- **Collection filters:**
  - **Roles:** *All roles* · DPS · AOE · Summon · Empower · Economy. Shows only units with a real rating in that role and ranks them by it.
  - **Sort:** overall tier, acquired order, or any side tier.
  - **Circle:** a summoning circle, listed by price, or starter units.
  - **Ownership:** all / owned / not owned.
  - *Clear filters* resets everything. Units you don't own yet follow the same filters, so "the best Economy unit I can still summon" is two taps away.
- **Favourites:** the pin on an owned card (or *Pin to front* in its details) pins that unit type. Pinned types always come first in every sort, marked with a brass corner tab that looks nothing like the "in plan" frame. Pinning never uses a plan slot. Pins are saved and can be removed any time.
- **Auto Pick** (the upgraded Auto Build) fills the plan with your strongest owned types.
  - **Priority:** *Balanced* (the original Auto Build: overall tier, then measured combat strength, then acquisition order) or one side tier.
  - **Then:** an optional second side tier. For example, Economy first and DPS second puts the earners first, then fills the rest with the hardest hitters.
  - **Ranking:** primary side tier → secondary side tier → overall tier → combat strength → acquisition order. Units with N/A in the priority fill the remaining slots. At most 12 distinct owned types, never duplicates or units you don't own.
  - The preview updates live and marks each unit *New* or *Kept*, and lists what would be *replaced*. Nothing changes until you confirm.
  - It never spends Coins or Tokens, summons, or changes ownership. *Undo Auto Pick* restores the previous plan, even after a reload. Your priorities are remembered.

## Currencies

| Currency | Earned | Spent on | Lifetime |
| --- | --- | --- | --- |
| **Coins** | Defeating enemies, clearing waves | Deploying and upgrading units in battle | One battle |
| **Tokens** | 250 per completed wave, +5% per 10-wave milestone (`BALANCE.tokens` in `src/balance.js`) | Every summoning circle | Saved permanently |

There is exactly one summon currency: **Tokens**. `registerBanner` refuses a circle priced in anything else, the profile saves only a Token balance (an old save's stray Gem balance is dropped on load), and wave rewards are coins and Tokens only.

## Summoning

All circles live in one collection **sorted by Token price, cheapest first**. The order comes from the data (`listCirclesByPrice()` in `src/units/summoning.js`): a new circle lands in the right place just by being registered, and equal prices keep their registration order. On desktop every circle is visible at once; on phones they scroll sideways in the same order. Each circle's drop-rate list also shows every unit's side tiers.

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

### Village Militia: 100 Tokens per summon

| Unit | Tier | Chance |
| --- | --- | --- |
| Farmer | I | 35% |
| Spearman | I | 25% |
| Slingman | II | 20% |
| Militia Archer | II | 12% |
| Village Captain | III | 7% |
| The Village Hero | IV | 1% |

### Town Guard: 250 Tokens per summon

| Unit | Tier | Chance |
| --- | --- | --- |
| Guard Recruit | II | 30% |
| Crossbowman | III | 25% |
| Guard Sergeant | III | 20% |
| Halberdier | IV | 14% |
| Royal Patrol | V | 8% |
| Grand Captain | VI | 2.5% |
| The King's Champion | VIII | 0.5% |

### Siege Workshop: 400 Tokens per summon

| Unit | Tier | Chance |
| --- | --- | --- |
| Apprentice Engineer | III | 30% |
| Ballista | IV | 25% |
| Catapult | V | 20% |
| Bombardier | V | 13% |
| Siege Commander | VI | 8% |
| Trebuchet | VIII | 3% |
| The Master Engineer | X | 1% |

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
  - It's always paid in Tokens: 30 at Village Militia, 45 at Military, 75 at Advanced and Town Guard, 90 at Wild West and Gambino, 120 at Siege Workshop, 150 at Nuclear War.
- **Rare units:** any result with a chance of 1% or less gets a longer reveal with a blackout, a stamp, an armoured crate and an alarm. Each circle has its own floor art: concrete, red steel, Wild West floorboards with a sheriff's star, Gambino casino felt with a roulette wheel, a hazard-striped Nuclear War launch pad, village planks with a wheat sheaf, a Town Guard shield, or a Siege Workshop gear.
  - **Fastest Hand In The West:** "High Noon". At sundown a revolver cylinder spins in silence, then six shots ring out around the circle.
  - **THE HOUSE:** the circle becomes a slot machine. The reels stop one by one on 7-7-7, then coins pour down.
  - **High Roller:** a chip shower.
  - **Nuclear Warhead:** a launch countdown.
  - **Antimatter Warhead:** space folding into the centre.
  - **The Village Hero / The King's Champion / The Master Engineer:** HERO, CHAMPION and MASTERWORK stamps.

  Odds are never adjusted. Every pull is a plain independent draw, and the outcome is decided before the animation starts. Normal summons keep their short reveal.

## Balance and progression

Every knob is in `src/balance.js`. The measurements and the reasoning are in **[docs/BALANCE.md](docs/BALANCE.md)**.

**Tier means power.** Getting a higher-tier unit should be immediately noticeable. Three rules make it so.

1. **A steep, real power curve.** Each tier is a 20–60% step:

   | Tier | I | II | III | IV | V | VI | VII | VIII | IX | X | XI | XII | XIII | XIV | XV | XVII | XIX |
   | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
   | Power (× T1) | 1 | 1.6 | 2.4 | 3.4 | 4.7 | 6.3 | 8.3 | 10.8 | 13.8 | 17.5 | 22 | 27.5 | 34 | 42 | 51 | 73 | 106 |

   A Tier VII has ~2.4× the power of a Tier IV, and a Tier XII ~3.3× a Tier VII. Past XV, each tier is another ×1.2.

2. **Own fighting power matches the tier.** A unit's file only says *how* it fights: attack speed, range, splash, hits per attack and role. `tierUnit()` spends the tier's budget on damage after charging for area, long range and role. Support, summoner and economy units keep 85%, 80% or 75% of the budget for their own attacks and spend the rest on utility.
   - `node scripts/calibrate.mjs` measures every unit in a real headless battle: single-target and 10-enemy swarm damage, damage abilities included, reach credited. It sets each unit's `power` trim so that **own value = tier power × role share** (±5%).
   - Utility (buffs, summons, income) comes on top and never by gutting a unit's own stats. Before this rework, trims as low as 0.2 had left high-tier ability units weaker in direct combat than units several tiers below them.

3. **Price follows power.** Price is `20 × power^1.05` (it was `power^1.3`). Saving for a high tier buys nearly the same power per coin, concentrated in one tile with better upgrade growth. Tier I–V prices are unchanged or slightly lower, so the early game stays cheap.

**What the tests guarantee** (in real simulations, `tests/tiers.test.js` and `tests/progression.test.js`):
- Every unit two or more tiers higher out-fights every lower one.
- The Tier VII average is over 2× Tier IV, and Tier XII over 3× Tier VII.
- Baseline stats alone, without abilities, beat every unit three tiers below.
- The order holds at equal upgrade level (all at max).
- Every Tier VII+ single-target dealer out-hits every Tier III one on a boss.
- Swarm damage climbs with tier among area units.

**Full campaigns** (`node scripts/balance.mjs bot 400 --all`, 34 loadouts): the correlation between tier and waves survived went from 0.73 to 0.94. A Tier III army no longer outlasts Tier VII and X armies.

**Power-creep caps** (`BALANCE.caps`):
- **Wave scaling** is capped: Tier I–III +1.5%/wave up to +45%; IV–VI +1% up to +30%; VII–IX +0.5% up to +15%; X+ none. Before, +2%/wave forever let a Tier I match a Tier VII by wave 150.
- **Buffs:** each distinct buff applies once, and all buffs together are capped on one unit at ×1.8 damage, ×1.6 attack speed and ×1.35 range.
- **Additive bonuses** (wave scaling, count passives, House Edge) are capped at +150% in total.
- **Coin multipliers:** unit economy auras are capped at +50% together; weather stays a separate, temporary layer.
- **Repeat earners:** each extra copy of the same income unit pays 1/√k (the 2nd copy earns 71%, the 4th 50%), so stacking one earner can't run away.
- **Weather and ability effects** are temporary and never written into base stats.

Other layers (unchanged): a global +20% damage, +10% range, −10% cooldown and +15% ability coins. Upgrades add +8% damage, +2% range and +2% attack speed per level, and higher tiers grow faster per upgrade. Splash falloff: secondary targets in a blast take 60%.

**Numerical changes beyond the curve** (themes and abilities kept):
- ICBM aftershock: 40% → 20% of the impact.
- B-2 focus on the strongest enemy: 3× → 2×.
- Outlaw Leader's summoned Outlaws last 8 s, down from 12 s (they were effectively permanent).
- Colonel price: 0.3 → 0.5 of its tier price (it was cheaper than a Tier III).
- The Master Engineer counts as a gunner (its mini-ballistas are a small extra).

In every case, power moved from the ability into the unit's baseline, so its total stays on budget while its stats now reflect its tier.

**Comparing units:** a unit's details panel has a **combat sheet**: deployment cost, damage per hit, attacks per second, measured single-target and swarm DPS, range, the share of damage from abilities, summons, buffs to allies, income per minute and an overall combat rating. A *Compare with* picker puts it side by side with any other unit and shows the multiple you gain. By default it picks your best owned unit from a lower tier, so the sheet shows what an investment buys.

The tables below show level-0 stats as players see them (global layer included). DPS counts every hit of an attack. `node scripts/sync-readme-stats.mjs` regenerates the numbers from the definitions.

## Units

Every unit has a base level plus 5 upgrades, bought per copy in battle. Stats come from each unit's tier profile (see **Tiers** above).

| Unit | Tier | Price | Damage | Range (tiles) | Attacks/s | DPS | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Dude | I | 15 | 8.64 | 2.2 | 1.39 | 12 | Starter. **Dude Power:** `Damage × [1 + 0.10 × (deployed Dudes − 1)]` |
| Cadet | I | 30 | 9.6 | 2.75 | 1.67 | 16 | Better DPS and range than Dude |
| Gunnerman | II | 35 | 5.16 | 3.85 | 4.44 | 22.93 | Sustained machine-gun DPS |
| Grenade Launcher | III | 50 | 28.8 | 4.4 | 0.61 | 17.6 | Small blast (1.1 tiles). **Wounded:** 20% per enemy hit, −5% speed for 4 s, refreshes, never stacks |
| Tank | V | 100 | 44.4 | 5.5 | 0.44 | 19.73 | Blast 1.5 tiles. Leaves **flames** for 3 s (8% of shell damage per second). **Command Presence:** allies within 2.5 tiles attack 10% faster; overlapping Tanks don't stack |
| Special Forces | III | 50 | 10.92 | 3.85 | 3.33 | 36.4 | **Squad Tactics:** +15% damage per other Special Forces deployed, up to +300% (`SQUAD_TACTICS_PER_UNIT`, `SQUAD_TACTICS_CAP`) |
| Drone | V | 100 | 34.2 | 6.88 | 0.74 | 25.35 | Launches a drone every 1.5 s (1.35 s with the global cooldown cut) that hunts a target and detonates (1-tile blast). 10% are **Explosive Drones**: 5× damage, 2× blast radius |
| Commander | V | 100 | 15.6 | 11 | 2.67 | 41.6 | Extreme range, targets the strongest enemy. **Field Command:** allies within 5.5 tiles get +8% range and 8% cooldown reduction |
| Colonel | VI | 70 | 48 | 4.4 | 1.33 | 64 | Cheap. **Orders:** every unit on the map gets +15% damage, 10% cooldown reduction and +5% range. **Requisitions:** +15% coins |
| General | VII | 185 | 64.8 | 7.15 | 0.56 | 36 | Artillery (1.75-tile blast). **High Command:** allies within 6.5 tiles get +25% damage, 15% cooldown reduction and +10% range. Launches a regular drone every 4 s |
| Fortress | X | 400 | 144 | 9.35 | 0.33 | 48 | Siege guns with an enormous 3.75-tile blast. Launches an Explosive Drone every 5 s that inflicts **Crippled** (+20% damage taken, −10% speed for 5 s). **Logistics:** +25% coins |

### Circle units

Range is in tiles; ability numbers live in each unit's `ability` block (`src/units/defs/medieval.js`, `wildWest.js`, `gambino.js`, `nuclearWar.js`), the behaviour in `src/game/abilities.js`.

| Unit | Tier | Price | Damage | Range | Atk/s | DPS | Ability |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Farmer | I | 15 | 12.6 | 1.51 | 1.44 | 18.2 | Pitchfork; cheap |
| Spearman | I | 20 | 13.8 | 2.06 | 1.22 | 16.87 | Spear thrust |
| Slingman | II | 35 | 10.44 | 3.58 | 2.22 | 23.2 | Fast stones |
| Militia Archer | II | 35 | 22.2 | 5.16 | 0.89 | 19.73 | Long-range arrows |
| Village Captain | III | 50 | 26.4 | 1.93 | 1.33 | 35.2 | **Rally:** Village Militia within 4 tiles +10% damage |
| The Village Hero | IV | 70 | 28.8 | 2.75 | 1.44 | 41.6 | Every 10th attack strikes for 4×; +1% damage per other deployed Village Militia unit (max +30%) |
| Guard Recruit | II | 35 | 19.8 | 1.65 | 1.44 | 28.6 | Sword and shield |
| Crossbowman | III | 50 | 42 | 6.19 | 0.67 | 28 | Heavy bolts |
| Guard Sergeant | III | 50 | 18 | 1.79 | 2.44 | 44 | Fast sword |
| Halberdier | IV | 70 | 32.4 | 2.48 | 1 | 32.4 | Sweeping halberd (small area) |
| Royal Patrol | V | 100 | 41.4 | 5.16 | 1.44 | 59.8 | Always targets the enemy closest to the exit |
| Grand Captain | VI | 140 | 66.6 | 2.2 | 1.33 | 88.8 | Town Guard within 5 tiles +12% damage, +8% attack speed |
| The King's Champion | VIII | 240 | 124.8 | 2.48 | 1 | 124.8 | Every 12 s a 5× strike at the strongest enemy in range |
| Apprentice Engineer | III | 40 | 24.6 | 4.13 | 1.33 | 32.8 | Thrown wrenches |
| Ballista | IV | 70 | 84.6 | 7.7 | 0.44 | 37.6 | Huge bolts at the strongest enemy |
| Catapult | V | 100 | 71.4 | 5.78 | 0.39 | 27.77 | Boulders, 1.5-tile blast |
| Bombardier | V | 100 | 37.8 | 4.4 | 1 | 37.8 | Lit bombs, small blast |
| Siege Commander | VI | 140 | 65.4 | 4.4 | 1.11 | 72.67 | Siege Workshop units within 6 tiles +15% damage |
| Trebuchet | VIII | 240 | 220.8 | 15.4 | 0.17 | 36.8 | Extreme range (15 tiles), enormous 3.75-tile blast, very slow |
| The Master Engineer | X | 400 | 133.2 | 6.6 | 0.67 | 88.8 | Heavy 2-tile blasts; every 20 s builds a mini-ballista that fights for 10 s (max 2 at once) |
| Gambler | III | 50 | 15 | 3.85 | 1.56 | 23.33 | 15% crits for 3×; every 10th attack is a guaranteed crit and pays 2 coins |
| Bandit | III | 50 | 11.4 | 3.58 | 2.44 | 27.87 | +3% per consecutive hit on one enemy, up to +30%; resets on a new target |
| Outlaw | V | 100 | 32.4 | 4.4 | 1.33 | 43.2 | Every 6th attack: dynamite (1.5×, 1.4-tile blast), enemies hit take +10% damage for 4 s |
| Bounty Hunter | V | 100 | 54 | 6.05 | 0.89 | 48 | Every 8 s marks the highest-HP enemy in range; +20% damage to it; a marked kill pays 4× its coin reward |
| Gunslinger | VII | 185 | 30.6 | 5.16 | 2.22 | 68 | Every 5th attack: 3-shot burst at 70%; 20% crit chance, crits 2.5× |
| Sheriff | IX | 310 | 105.6 | 6.05 | 1.11 | 117.3 | Allies within 7 tiles: +12% damage, +10% range; every 15 s a 5× shot at the strongest enemy |
| Outlaw Leader | IX | 310 | 110.4 | 5.5 | 1.22 | 134.9 | Calls 3 Outlaws for 8 s every 12 s; +5% damage per *deployed* Outlaw (max +50%); every 20 s 0.5 coins per enemy alive (max 150) |
| Fastest Hand In The West | XII | 650 | 165.6 ×6 | 7.15 | 0.28 | 276 | Six-shot barrage per attack; +2% attack speed per consecutive kill (max +40%, resets after 8 s); every 25 s a 10× crit at the strongest enemy |
| Drunkard | I | 25 | 9.36 | 2.48 | 1.33 | 12.48 | 70% or 160% damage; every 10th attack a stumble that slows 5% for 2 s |
| Dealer | VI | 140 | 37.2 | 5.5 | 1.78 | 66.13 | Card throws; allies in its range: 10% cooldown reduction; every 20 s 1 coin per enemy eliminated (max 200) |
| Night Dancer | VI | 140 | 31.2 | 4.4 | 1.67 | 52 | Small blasts; every 5 attacks a pulse slowing enemies in range 15% for 3 s |
| Desperate Gambler | VII | 185 | 49.8 | 4.95 | 1.56 | 77.47 | 50%: 2.5× or 40%; every 15 s an all-in shot of 0.5×–5× |
| Pit Boss | IX | 310 | 134.4 | 5.5 | 1.11 | 149.3 | Allies within 7.5 tiles: +15% damage, 10% cooldown reduction; every 15 s 1.5 coins per enemy defeated (max 300) |
| High Roller | X | 400 | 97.2 | 6.05 | 1.33 | 129.6 | Every 8 s an 8× shot; every 10th attack a Jackpot: 30 coins and +1% battle damage (max +25%) |
| THE HOUSE | XV | 1,240 | 157.2 | 8.25 | 1.11 | 174.7 | All allies +10% damage, 10% cooldown reduction; every 20 s Jackpot (+500 coins), Bankruptcy (5× in a 4-tile area) or Double Down (2× damage for 10 s); every 50 kills all allies +1% damage for the battle (max +20%) |
| Missile Launcher | IV | 70 | 21.6 | 6.05 | 0.78 | 16.8 | Area rockets; every 8th attack a bonus 2× missile |
| Special Force Battalion | V | 100 | 20.4 | 4.68 | 2.22 | 45.33 | Keeps up to 3 mini soldiers (20 s each, one more every 3 s); +5% damage per surviving soldier |
| Intercontinental Ballistic Missile | VII | 185 | 102.6 | 16.5 | 0.22 | 22.8 | 3-tile blast plus a 20% aftershock |
| Bomber | VII | 185 | 46.2 ×4 | 7.7 | 0.25 | 45.58 | Flyover dropping 4 bombs along the road, leading the column; every 3rd run an extra 2× explosion |
| B-2 | IX | 310 | 236.4 ×2 | 8.8 | 1 per 10.84 s | 43.6 | Bombing run; the strongest enemy in the main blast takes 2× |
| Marshal | XII | 650 | 133.2 | 6.88 | 1.33 | 177.6 | All allies +15% damage, +10% range; every 20 s 120 coins; every 30 s a 6× barrage |
| Glorious Leader | XV | 1,240 | 373.2 | 7.15 | 1.33 | 497.6 | All allies +20% damage; every 25 s 400 coins; every 20 s every enemy takes +15% damage for 5 s |
| Nuclear Warhead | XVII | 1,820 | 762 | 11 | 0.22 | 169.3 | 5-tile blast, a 6 s energy zone, enemies hit take +20% damage for 5 s |
| Antimatter Warhead | XIX | 2,670 | 1606.8 | 12.1 | 0.2 | 321.4 | 6-tile energy blast, +30% damage taken for 8 s; every 40 s a gravity field holds and gathers enemies for 3 s, then detonates (bosses resist the pull) |

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

## Art direction

The game is staged as a **campaign table**. Units are painted miniatures on a diorama battlefield, and the interface is the commander's field kit. One set of rules covers everything.

- **Interface (the workbench):**
  - The menus are a hobbyist's green cutting mat (fine 16 px grid, stronger 80 px lines). Every unit is a printed datasheet card lying on it: card stock, ink text, and the miniature shown standing on the mat in an art window topped with its tier colour.
  - The unit details panel, drop-rate list, dialogs and battle unit panel are datasheets too. They re-scope the colour tokens, so everything inside flips to ink-on-stock without separate rules. The selected army stands on round miniature bases.
  - One typeface, Archivo, carries the personality through its width axis: extra-condensed heavy for names and titles, normal width for reading, tabular figures for stats. Sentence case throughout, with no tracked capitals and no monospace labels.
  - Ochre (ruler paint) marks the single primary action on each screen (Battle, Summon ×1, Upgrade, Call wave).
  - Feedback answers the player's actions (card lift, a frame on selection, the panel flash on upgrade). Reduced-motion settings turn it off.
- **Units:**
  - Every unit stands on a miniature base. The base size and rim metal show the tier band (iron I–III, bronze IV–VI, silver VII–X, gold XI–XIV, platinum XV+). A painted front edge shows the summoning circle (faction colour). Figures grow gently with tier.
  - Summoned allies get a ghosted, dashed base, so they never read as deployed units.
  - Shared body language on top of each unit's own animation:
    - breathing at rest
    - leaning into the target just before an attack
    - rocking back and squashing on recoil
    - a short hop with a faction-coloured ground ring when an ability fires
  - Support units send up blue Empower chevrons every few seconds.
- **Battlefields:**
  - **Shapes:** water, lava, ice and the sky void are traced from a noisy field (marching squares, `src/maps/contour.js`), so shores wander naturally instead of being built from circles.
  - **Roads:** irregular verges, a darker shoulder, a worn crown and wheel ruts. Ground tufts spill over the edge so the two materials interlock.
  - **Relief:** a height field (rolling ground, the road cut in, pools in hollows) lit from the same top-left key light as everything else.
  - **Set pieces:** each realm has a few beside the road (`src/maps/vignettes.js`) with live details: a woodcutters' camp with smoke, a frontier outpost with a pennant, a dig site with a lantern, an ore cart, a maintenance shed with a beacon, a sky mill whose sails turn.
  - **Movement:** trees sway gently, harder in wind and storms.
- **Effects are proportional** (`src/render/impact.js`):
  - Every explosion still shows its true area.
  - How much fire fills it, how long it lasts, its secondary shockwave, any screen shake and its sound all follow the damage it actually dealt relative to the enemies on the field. A warhead that only scratches a late-wave brute is a dust ring and a small pop.
  - Distinct visual language: damage is warm orange/white, crits are white with a label, buffs are blue chevrons, debuffs are coloured marks under enemies, summons are green ground rings, income is gold coin pop-ups.
- **Performance:**
  - Bases, trees and parts are pre-rendered sprites trimmed to their painted pixels.
  - Most units draw in a single scaled blit.
  - With more than 160 units and allies on the field, decorative cues (breathing, chevrons, ability rings) switch off.

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
  maps/                     generator, biomes + variants, rotation, painters, contour fields, set pieces
  waves/                    archetypes, director, scaling, traits, spawn schedules
  enemies/                  weight classes + roster variant hook
  units/                    tiers, registry, roster, defs/, stats/upgrades, summoning banners
  meta/                     battle plans, profile, roster order/filters/Auto Pick, side tiers (+ measuring bench)
  render/                   renderer, unit art & animation, miniature bases (unitIdentity), impact weight, summoning, effects
  audio/sfx.js              synthesized sound effects (WebAudio, no assets)
  ui/                       Battle Plans, Summoning, battle HUD
```

## Development

```bash
npm test                           # 139 unit tests: maps, waves, units, abilities, odds, side tiers, Auto Pick, filters, persistence
npm run ratings                    # re-measure every unit's side tiers (≈2 s); npm run ratings:check reports stale ones
node scripts/balance.mjs units     # balance report (also: tokens, bot; add --before for the old balance)
npm run build                      # production build → dist/
node scripts/e2e.mjs URL           # 72 browser checks
node scripts/mobile-shots.mjs URL  # phone + desktop screenshots with layout checks against a running build (needs Playwright)
npm run sim -- 10 150              # headless balance sim
node scripts/screenshot.mjs URL    # every realm mid-battle
node scripts/interactions.mjs URL  # real clicks/drags/keys: plan edit, deploy, upgrade, sell, boss
```

Pushes to `main` build the game and publish it to the `gh-pages` branch, which GitHub Pages serves. See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for setup and the DNS records for endlesstower.com.
