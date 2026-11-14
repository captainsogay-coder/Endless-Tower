# Endless Tower: Progression Balance

All knobs live in `src/balance.js` (`BALANCE`); per-unit values live in the unit files. Every number below was measured with
`node scripts/balance.mjs` against the real simulation. The `--before` flag reproduces the previous balance for comparison.

## Rules

**Tokens per completed wave:** `250 × (1 + 0.05 × floor(wave / 10))`. That gives 250 Tokens at waves 1–9, 263 at 10, 313 at 50, 375 at 100 and 563 at 250. Milestones add +5% each and don't compound.
- The formula lives in `BALANCE.tokens`.
- Rewards are paid by the wave's own completion, so single calls, multi-wave queues and Auto Skip each pay exactly once per wave (unit-tested).
- The next-encounter panel and the wave banner show the reward before the wave; the clear banner shows it after.
- Tokens are the only summon currency; every circle (Nuclear War included, 500 Tokens) is priced in Tokens.

**How a unit's damage is built** (the same for every unit, including units added later):

```
base     = level table × 1.2 (global) × (1 + 0.08 × upgrade level)
additive = wave scaling + count passives (Dude Power, Squad Tactics, The Gang)
           + capped self bonuses (jackpots, soldiers) + battle bonuses (House Edge)
damage   = base × (1 + additive) × Π buffs (each id once) × weather (one at a time)
```

- **Range:** table × 1.1 × (1 + 0.02 × level), then buffs, then weather.
- **Attack speed:** table ÷ 0.9 × (1 + 0.02 × level), then buffs, then weather.
- **Additive vs multiplicative:** everything that scales with *count* or *time* (wave scaling, number of copies, jackpots) is summed first, so these can never multiply each other. Only buffs (one application per buff id) and weather (one at a time) multiply, and each of those is bounded.
- **Wave scaling:**
  - Tier I–III: +2% of base damage per completed wave.
  - Tier IV–VI: +1% per wave.
  - Tier VII and up: none.

  It is linear (+100% at wave 50 for Tier I–III), identical for every copy, shown in the unit panel, and recalculated once per completed wave. It is never written into base stats. Summoned allies use their summoner's band.
- **Ability coins:** +15% on every ability payout (bounties, jackpots, tributes, payouts). Economy bonuses get +15% of their bonus: the Colonel goes from +15% to +17.25% coins and the Fortress from +25% to +28.75%. Coin fractions carry over, so small payouts aren't rounded away.
- **Upgrades:** on top of each unit's table, every level adds +8% damage, +2% range and +2% speed. Every upgrade of every unit is at least +20% DPS (unit-tested).
- **Timers:** ability timers (drone launches, special shots, payouts) are not shortened by the global cooldown cut. Attacks are, so the Drone station now launches every 1.35 s, the Bomber flies every 4 s and the B-2 every 10.8 s.

## Tier system

The previous balance let ability-heavy and area units run far over their tier: for example, the Fortress had about 14× a Tier I's damage *plus* a 3.75-tile blast. Now every unit's stats are generated from its tier's combat-power budget (`TIERS` in `src/balance.js`, `tierUnit` in `src/units/levels.js`).

- **What a unit declares:** only its identity – attack speed, range, splash, hits per attack and role.
- **What it pays for:** area damage (`1 / (1 + 0.6 × tiles^0.75)`), range beyond its tier's reference range, and the share of its budget a support, summoner or economy role spends on utility. These all come out of the same budget.
- **Splash falloff:** secondary targets in a blast take 60%, so area units keep useful single-target damage without dominating crowds.
- **Price:** `20 × budget^1.3`.
- **Upgrades:** costs are `price × [0.8, 1.3, 2, 3, 4.5]`, and damage grows ×1.2 per level at Tier I, up to ×1.32 at high tiers.
- **Trims:** a per-unit `power` trim was set by measurement, so every unit lands within ±12% of its tier target.

### Measured: battlefield value per unit (level 0 and level 5)

Value is the geometric mean of single-target DPS and battlefield contribution (a six-Cadet squad's crowd damage with the unit minus without it), relative to the Cadet. Reproduce with `node scripts/balance.mjs tiers 0` (or `5`).

```
AFTER – level 0, wave 1. single/team relative to the Cadet (plain T1); value = √(single × team)
T 1 dude                     price    15  single   0.79×  team   0.78×  value   0.78×  target 1.0×
T 1 cadet                    price    30  single   1.00×  team   1.00×  value   1.00×  target 1.0×
T 1 drunkard                 price    25  single   0.75×  team   1.57×  value   1.09×  target 1.0×
T 2 gunnerman                price    35  single   1.40×  team   1.44×  value   1.42×  target 1.5×
T 3 special-forces           price    50  single   2.06×  team   2.12×  value   2.09×  target 2.1×
T 3 grenade-launcher         price    50  single   0.72×  team   6.51×  value   2.16×  target 2.1×
T 3 gambler                  price    50  single   2.35×  team   2.18×  value   2.26×  target 2.1×
T 3 bandit                   price    50  single   2.58×  team   2.12×  value   2.33×  target 2.1×
T 4 missile-launcher         price    75  single   0.83×  team   9.99×  value   2.87×  target 2.8×
T 5 commander                price   105  single   2.59×  team   4.03×  value   3.23×  target 3.6×
T 5 bounty-hunter            price   105  single   3.50×  team   3.59×  value   3.55×  target 3.6×
T 5 outlaw                   price   105  single   2.14×  team   6.26×  value   3.66×  target 3.6×
T 5 drone                    price   105  single   1.23×  team  11.04×  value   3.68×  target 3.6×
T 5 tank                     price   105  single   1.07×  team  13.36×  value   3.78×  target 3.6×
T 5 special-force-battalion  price   105  single   3.72×  team   4.15×  value   3.93×  target 3.6×
T 6 colonel                  price    40  single   3.16×  team   5.10×  value   4.02×  target 4.5×
T 6 dealer                   price   140  single   3.74×  team   4.85×  value   4.26×  target 4.5×
T 6 night-dancer             price   140  single   1.75×  team  15.07×  value   5.14×  target 4.5×
T 7 desperate-gambler        price   185  single   5.42×  team   5.67×  value   5.54×  target 5.5×
T 7 gunslinger               price   185  single   5.32×  team   5.87×  value   5.59×  target 5.5×
T 7 icbm                     price   185  single   1.29×  team  25.59×  value   5.75×  target 5.5×
T 7 general                  price   185  single   1.47×  team  22.45×  value   5.75×  target 5.5×
T 7 bomber                   price   185  single   1.05×  team  32.18×  value   5.82×  target 5.5×
T 9 sheriff                  price   290  single   6.54×  team   8.51×  value   7.46×  target 7.8×
T 9 pit-boss                 price   290  single   6.51×  team   8.98×  value   7.64×  target 7.8×
T 9 b2                       price   290  single   2.11×  team  32.01×  value   8.22×  target 7.8×
T 9 outlaw-leader            price   290  single   5.06×  team  15.18×  value   8.77×  target 7.8×
T10 fortress                 price   350  single   1.92×  team  45.86×  value   9.39×  target 9.1×
T10 high-roller              price   350  single   9.11×  team  10.79×  value   9.92×  target 9.1×
T12 marshal                  price   510  single   3.89×  team  37.29×  value  12.04×  target 12.0×
T12 fastest-hand             price   510  single  11.49×  team  13.23×  value  12.33×  target 12.0×
T15 glorious-leader          price   830  single  14.49×  team  18.92×  value  16.55×  target 17.5×
T15 the-house                price   830  single   4.03×  team  80.85×  value  18.06×  target 17.5×
T17 nuclear-warhead          price  1120  single   4.14×  team 127.21×  value  22.94×  target 22.1×
T19 antimatter-warhead       price  1490  single   5.29×  team 150.74×  value  28.23×  target 27.5×
tier averages (value): T1 0.96  T2 1.42  T3 2.21  T4 2.87  T5 3.64  T6 4.47  T7 5.69  T9 8.02  T10 9.65  T12 12.19  T15 17.31  T17 22.94  T19 28.23
```

```
AFTER – level 5, wave 1. single/team relative to the Cadet (plain T1); value = √(single × team)
T 1 dude                     price    15  single   0.75×  team   0.74×  value   0.74×  target 1.0×
T 1 drunkard                 price    25  single   0.72×  team   1.35×  value   0.98×  target 1.0×
T 1 cadet                    price    30  single   1.00×  team   1.00×  value   1.00×  target 1.0×
T 2 gunnerman                price    35  single   1.22×  team   1.30×  value   1.26×  target 1.5×
T 3 bandit                   price    50  single   2.52×  team   2.11×  value   2.31×  target 2.1×
T 3 special-forces           price    50  single   2.25×  team   2.38×  value   2.32×  target 2.1×
T 3 gambler                  price    50  single   2.45×  team   2.61×  value   2.53×  target 2.1×
T 3 grenade-launcher         price    50  single   0.73×  team   8.79×  value   2.53×  target 2.1×
T 4 missile-launcher         price    75  single   0.88×  team   9.57×  value   2.90×  target 2.8×
T 5 commander                price   105  single   2.77×  team   4.03×  value   3.34×  target 3.6×
T 5 bounty-hunter            price   105  single   3.67×  team   3.99×  value   3.83×  target 3.6×
T 5 special-force-battalion  price   105  single   3.74×  team   4.32×  value   4.02×  target 3.6×
T 5 tank                     price   105  single   1.10×  team  15.88×  value   4.19×  target 3.6×
T 5 outlaw                   price   105  single   2.38×  team   7.83×  value   4.31×  target 3.6×
T 5 drone                    price   105  single   1.47×  team  17.78×  value   5.11×  target 3.6×
T 6 colonel                  price    40  single   3.58×  team   5.52×  value   4.45×  target 4.5×
T 6 dealer                   price   140  single   3.99×  team   5.64×  value   4.74×  target 4.5×
T 6 night-dancer             price   140  single   1.95×  team  18.06×  value   5.93×  target 4.5×
T 7 gunslinger               price   185  single   5.85×  team   6.67×  value   6.25×  target 5.5×
T 7 general                  price   185  single   1.55×  team  25.93×  value   6.34×  target 5.5×
T 7 desperate-gambler        price   185  single   6.20×  team   6.96×  value   6.57×  target 5.5×
T 7 icbm                     price   185  single   1.41×  team  31.71×  value   6.68×  target 5.5×
T 7 bomber                   price   185  single   1.28×  team  41.63×  value   7.30×  target 5.5×
T 9 sheriff                  price   290  single   7.54×  team  10.38×  value   8.85×  target 7.8×
T 9 b2                       price   290  single   2.49×  team  32.86×  value   9.05×  target 7.8×
T 9 pit-boss                 price   290  single   7.79×  team  11.68×  value   9.54×  target 7.8×
T 9 outlaw-leader            price   290  single   5.45×  team  17.29×  value   9.71×  target 7.8×
T10 fortress                 price   350  single   2.21×  team  47.69×  value  10.27×  target 9.1×
T10 high-roller              price   350  single  10.27×  team  12.37×  value  11.27×  target 9.1×
T12 marshal                  price   510  single   4.89×  team  38.80×  value  13.77×  target 12.0×
T12 fastest-hand             price   510  single  13.00×  team  16.32×  value  14.57×  target 12.0×
T15 the-house                price   830  single   5.36×  team  80.84×  value  20.82×  target 17.5×
T15 glorious-leader          price   830  single  20.21×  team  26.88×  value  23.31×  target 17.5×
T17 nuclear-warhead          price  1120  single   5.75×  team 197.85×  value  33.72×  target 22.1×
T19 antimatter-warhead       price  1490  single   8.01×  team 309.79×  value  49.81×  target 27.5×
tier averages (value): T1 0.91  T2 1.26  T3 2.42  T4 2.90  T5 4.13  T6 5.04  T7 6.63  T9 9.29  T10 10.77  T12 14.17  T15 22.07  T17 33.72  T19 49.81
```

At level 5 the higher tiers pull further ahead, because their upgrades grow faster.

### Full games (bot, ≤60 units, waves one at a time, cap 300)

| Army | Wave | Avg level |
| --- | --- | --- |
| dude | 88 | 5.0 |
| cadet | 69 | 5.0 |
| drunkard | 61 | 5.0 |
| gunnerman | 88 | 5.0 |
| bandit | 103 | 5.0 |
| special-forces | 131 | 5.0 |
| gambler | 106 | 5.0 |
| dude + grenade-launcher | 71 | 5.0 |
| dude + tank | 88 | 5.0 |
| dude + drone | 106 | 5.0 |
| dude + commander | 99 | 5.0 |
| dude + outlaw | 97 | 5.0 |
| dude + bounty-hunter | 103 | 5.0 |
| dude + special-force-battalion | 112 | 5.0 |
| dude + missile-launcher | 80 | 5.0 |
| dude + night-dancer | 97 | 5.0 |
| dude + dealer | 103 | 5.0 |
| dude + general | 97 | 5.0 |
| dude + gunslinger | 103 | 5.0 |
| dude + desperate-gambler | 99 | 5.0 |
| dude + icbm | 88 | 5.0 |
| dude + bomber | 97 | 5.0 |
| dude + sheriff | 107 | 5.0 |
| dude + outlaw-leader | 122 | 5.0 |
| dude + pit-boss | 112 | 5.0 |
| dude + b2 | 94 | 5.0 |
| dude + fortress | 116 | 5.0 |
| dude + high-roller | 112 | 5.0 |
| dude + fastest-hand | 129 | 5.0 |
| dude + marshal | 129 | 5.0 |
| dude + the-house | 144 | 5.0 |
| dude + glorious-leader | 131 | 5.0 |
| dude + nuclear-warhead | 106 | 3.7 |
| dude + antimatter-warhead | 182 | 5.0 |

With a single-target escort (Dude filler + Gunslinger + main unit):

| Army | Wave | Avg level |
| --- | --- | --- |
| dude + gunslinger + grenade-launcher | 112 | 5.0 |
| dude + gunslinger + tank | 112 | 5.0 |
| dude + gunslinger + drone | 112 | 5.0 |
| dude + gunslinger + commander | 99 | 5.0 |
| dude + gunslinger + outlaw | 112 | 5.0 |
| dude + gunslinger + bounty-hunter | 103 | 5.0 |
| dude + gunslinger + special-force-battalion | 103 | 5.0 |
| dude + gunslinger + missile-launcher | 112 | 5.0 |
| dude + gunslinger + night-dancer | 112 | 5.0 |
| dude + gunslinger + dealer | 103 | 5.0 |
| dude + gunslinger + general | 122 | 5.0 |
| dude + gunslinger | 103 | 5.0 |
| dude + gunslinger + desperate-gambler | 103 | 5.0 |
| dude + gunslinger + icbm | 113 | 5.0 |
| dude + gunslinger + bomber | 106 | 5.0 |
| dude + gunslinger + sheriff | 103 | 5.0 |
| dude + gunslinger + outlaw-leader | 113 | 5.0 |
| dude + gunslinger + pit-boss | 112 | 5.0 |
| dude + gunslinger + b2 | 106 | 5.0 |
| dude + gunslinger + fortress | 117 | 5.0 |
| dude + gunslinger + high-roller | 112 | 5.0 |
| dude + gunslinger + fastest-hand | 129 | 5.0 |
| dude + gunslinger + marshal | 126 | 5.0 |
| dude + gunslinger + the-house | 144 | 5.0 |
| dude + gunslinger + glorious-leader | 129 | 5.0 |
| dude + gunslinger + nuclear-warhead | 106 | 3.5 |
| dude + gunslinger + antimatter-warhead | 182 | 5.0 |

**Findings:**
- **Tier order holds in play:** Tier III armies (Bandit, Gambler, Special Forces) outlast Tier I armies, and the high-tier armies (Marshal, THE HOUSE, Glorious Leader, Antimatter) last longest.
- **Area armies need single-target help.** Pure area-damage armies (Grenade Launcher, Tank, Missile Launcher, warheads) fall to armoured or shielded bosses without it. That's intended: area damage is cheap per target but weak against one big enemy.
- **Expensive upgrades limit the warheads in a bot.** They often aren't fully upgraded (average level 2–3), because their upgrades are the most expensive in the game.
- **The late game is shorter than in the previous update,** when over-budget units carried armies to wave 200–300. Strong armies now stop around wave 100–150 because enemy HP grows with the cube of the wave (×76 at 100, ×620 at 250). A +30% boost to every unit only moved that wall by about 10 waves, so late-game length is a question for the enemy curve, not unit power.

## Individual adjustments (previous update – superseded by the tier generator)

These hand edits were replaced by the tier system below: every unit's stats are now generated from its tier, and remaining outliers are corrected by a measured `power` trim in the unit's profile.

These are made after the global changes, based on the measurements below.

| Unit | Change | Why |
| --- | --- | --- |
| Special Forces | Squad Tactics +20% → +15% per copy, **capped at +300%** | uncapped, 60 copies (Tier III) reached wave 236, level with a Tier X Fortress; now 145 |
| Drone (station) | damage −15% at every level | out-lasted the Tier VII General (198 vs 182); now 159 |
| Missile Launcher | damage 40 → 32 | best value per coin in every test, early and late |
| Night Dancer | damage 30 → 27 | matched the General's crowd damage by wave 250 |
| Grenade Launcher | +0.1 attacks/s at every level | the slowest early AOE couldn't carry an army (wave 45); now 106 |
| Bomber | 120 → 145 per bomb, a run every 4.5 s (was 6 s); **runs now follow the road and lead the target** | bombs landed behind the moving column; wave 69 → 159 |
| Gunslinger, Desperate Gambler, Sheriff, Bounty Hunter, Outlaw | +12–25% damage | single-target units in Tier VII+ get no wave scaling and were being overtaken by Tier III gunmen late |
| Glorious Leader | damage 320 → 420 | weakest Tier XV |
| Nuclear Warhead | 12,000 → 9,000 coins, attack 0.12 → 0.2/s | the rarest units arrived too late to matter (wave 45); now on top |
| Antimatter Warhead | 20,000 → 14,000 coins, attack 0.12 → 0.18/s | same (wave 80); now on top |

Fastest Hand and High Roller were tested with +30% damage and dropped back: both stall at the same wave 131 because a boss wave with Swift + Shielded + Armored traits breaks any army without area damage. In the per-unit report they are among the fastest single-target killers, so their role is intact.

## Early game: Tokens and summon frequency

```
BEFORE token formula {"base":100,"milestoneEvery":10,"milestoneBonus":0}
wave   1  + 100/wave  cumulative     100
wave   5  + 100/wave  cumulative     500
wave  10  + 100/wave  cumulative    1000
wave  25  + 100/wave  cumulative    2500
wave  50  + 100/wave  cumulative    5000
wave 100  + 100/wave  cumulative   10000
wave 250  + 100/wave  cumulative   25000
Military Summoning Circle    first ×1 after wave 2, first ×10 after wave 15, pulls by wave 50: 33
Advanced Military Circle     first ×1 after wave 3, first ×10 after wave 25, pulls by wave 50: 20
Wild West                    first ×1 after wave 3, first ×10 after wave 30, pulls by wave 50: 16
Gambino                      first ×1 after wave 3, first ×10 after wave 30, pulls by wave 50: 16

AFTER token formula {"base":250,"milestoneEvery":10,"milestoneBonus":0.05}
wave   1  + 250/wave  cumulative     250
wave   5  + 250/wave  cumulative    1250
wave  10  + 263/wave  cumulative    2513
wave  25  + 275/wave  cumulative    6530
wave  50  + 313/wave  cumulative   13823
wave 100  + 375/wave  cumulative   30775
wave 250  + 563/wave  cumulative  100373
Military Summoning Circle    first ×1 after wave 1, first ×10 after wave 6, pulls by wave 50: 92
Advanced Military Circle     first ×1 after wave 1, first ×10 after wave 10, pulls by wave 50: 55
Wild West                    first ×1 after wave 2, first ×10 after wave 12, pulls by wave 50: 46
Gambino                      first ×1 after wave 2, first ×10 after wave 12, pulls by wave 50: 46
```

## Kill time of one Regular – previous update (before the tier generator)

The level by wave is: wave 1 → Lv 0, wave 10 → Lv 2, wave 25 → Lv 4, wave 50+ → Lv 5. Enemy HP grows ×2.5 by wave 10, ×20 by wave 50, ×76 by wave 100 and ×620 by wave 250. Values are before → **after**.

| Unit | Tier | w1 | w10 | w25 | w50 | w100 | w250 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| dude | 1 | 12.9s → **9.5s** | 13.9s → **7.4s** | 17.8s → **6.4s** | 33.5s → **8.3s** | >99s → **21.1s** | >99s → **85.2s** |
| cadet | 1 | 6.2s → **4.7s** | 8.8s → **4.5s** | 13.2s → **4.6s** | 27.7s → **6.8s** | >99s → **17.1s** | >99s → **69.2s** |
| gunnerman | 2 | 3.3s → **2.4s** | 5.1s → **2.7s** | 7.7s → **2.7s** | 17.9s → **4.5s** | 68.1s → **11.3s** | >99s → **45.7s** |
| grenade-launcher | 3 | 3.4s → **2.7s** | 5.1s → **2.7s** | 8.5s → **3.0s** | 18.1s → **4.6s** | 69.0s → **11.6s** | >99s → **46.7s** |
| tank | 5 | 1.5s → **1.1s** | 2.1s → **1.2s** | 3.4s → **1.4s** | 7.2s → **2.4s** | 27.4s → **6.9s** | >99s → **31.9s** |
| special-forces | 3 | 2.3s → **1.7s** | 3.2s → **1.6s** | 4.3s → **1.6s** | 8.6s → **2.2s** | 32.6s → **5.6s** | >99s → **22.6s** |
| drone | 5 | 1.8s → **1.4s** | 2.7s → **1.6s** | 4.1s → **1.5s** | 8.8s → **2.6s** | 33.5s → **7.5s** | >99s → **34.7s** |
| commander | 5 | 0.8s → **0.6s** | 1.2s → **0.6s** | 1.7s → **0.8s** | 3.7s → **1.3s** | 14.2s → **3.8s** | >99s → **17.5s** |
| colonel | 6 | 2.0s → **1.5s** | 3.0s → **1.7s** | 4.7s → **1.9s** | 10.2s → **3.4s** | 38.8s → **9.7s** | >99s → **44.9s** |
| general | 7 | 0.7s → **0.5s** | 1.0s → **0.7s** | 1.6s → **0.9s** | 3.7s → **1.9s** | 14.2s → **7.2s** | >99s → **58.1s** |
| fortress | 10 | 0.3s → **0.2s** | 0.4s → **0.3s** | 0.7s → **0.4s** | 1.7s → **0.9s** | 6.4s → **3.3s** | 51.7s → **26.3s** |
| gambler | 3 | 2.3s → **1.8s** | 3.5s → **1.8s** | 5.8s → **2.0s** | 13.1s → **3.3s** | 49.9s → **8.3s** | >99s → **33.5s** |
| bandit | 3 | 2.5s → **2.0s** | 3.8s → **2.0s** | 6.5s → **2.3s** | 14.7s → **3.6s** | 56.0s → **9.1s** | >99s → **36.8s** |
| outlaw | 5 | 1.4s → **1.0s** | 2.0s → **1.1s** | 3.4s → **1.5s** | 7.8s → **2.6s** | 29.6s → **7.4s** | >99s → **34.4s** |
| bounty-hunter | 5 | 1.2s → **0.9s** | 1.8s → **1.0s** | 3.0s → **1.2s** | 6.9s → **2.3s** | 26.3s → **6.6s** | >99s → **30.3s** |
| gunslinger | 7 | 0.3s → **0.2s** | 0.5s → **0.3s** | 0.8s → **0.4s** | 1.7s → **0.9s** | 6.5s → **3.3s** | 53.0s → **26.7s** |
| sheriff | 9 | 0.4s → **0.3s** | 0.6s → **0.4s** | 1.0s → **0.6s** | 2.4s → **1.2s** | 9.1s → **4.6s** | 73.3s → **37.5s** |
| outlaw-leader | 9 | 0.3s → **0.2s** | 0.4s → **0.3s** | 0.8s → **0.4s** | 1.7s → **0.9s** | 6.6s → **3.3s** | 53.8s → **27.0s** |
| fastest-hand | 12 | 0.1s → **0.1s** | 0.2s → **0.1s** | 0.3s → **0.2s** | 0.8s → **0.4s** | 2.9s → **1.5s** | 23.4s → **11.9s** |
| drunkard | 1 | 7.1s → **5.5s** | 10.8s → **5.9s** | 18.3s → **7.0s** | 44.6s → **11.4s** | >99s → **28.9s** | >99s → **>99s** |
| dealer | 6 | 1.0s → **0.7s** | 1.4s → **0.8s** | 2.5s → **1.0s** | 5.8s → **2.0s** | 21.9s → **5.7s** | >99s → **26.3s** |
| night-dancer | 6 | 1.6s → **1.2s** | 2.4s → **1.3s** | 3.9s → **1.7s** | 9.1s → **3.0s** | 34.8s → **8.4s** | >99s → **39.0s** |
| desperate-gambler | 7 | 0.4s → **0.3s** | 0.6s → **0.4s** | 1.0s → **0.5s** | 2.5s → **1.1s** | 9.4s → **4.4s** | 76.3s → **35.4s** |
| pit-boss | 9 | 0.7s → **0.5s** | 1.1s → **0.6s** | 1.8s → **0.9s** | 4.0s → **2.0s** | 15.4s → **7.7s** | >99s → **62.6s** |
| high-roller | 10 | 0.2s → **0.2s** | 0.3s → **0.2s** | 0.6s → **0.3s** | 1.4s → **0.7s** | 5.3s → **2.8s** | 43.3s → **23.0s** |
| the-house | 15 | 0.2s → **0.1s** | 0.3s → **0.2s** | 0.5s → **0.2s** | 1.1s → **0.5s** | 4.1s → **2.1s** | 33.0s → **16.9s** |
| missile-launcher | 4 | 2.3s → **1.8s** | 3.5s → **1.9s** | 5.7s → **2.5s** | 13.1s → **4.3s** | 50.1s → **12.4s** | >99s → **57.1s** |
| special-force-battalion | 5 | 0.8s → **0.6s** | 1.1s → **0.6s** | 1.9s → **0.8s** | 4.3s → **1.5s** | 16.5s → **4.3s** | >99s → **20.2s** |
| icbm | 7 | 0.9s → **0.6s** | 1.2s → **0.8s** | 1.9s → **1.1s** | 4.7s → **2.3s** | 18.0s → **8.6s** | >99s → **69.6s** |
| bomber | 7 | 0.7s → **0.6s** | 1.2s → **0.8s** | 2.0s → **0.9s** | 3.4s → **1.6s** | 12.9s → **6.0s** | >99s → **48.5s** |
| b2 | 9 | 0.2s → **0.2s** | 0.3s → **0.2s** | 0.6s → **0.3s** | 1.5s → **0.7s** | 5.6s → **2.5s** | 45.1s → **20.1s** |
| marshal | 12 | 0.2s → **0.2s** | 0.3s → **0.2s** | 0.6s → **0.3s** | 1.4s → **0.7s** | 5.1s → **2.6s** | 41.7s → **21.5s** |
| glorious-leader | 15 | 0.1s → **0.1s** | 0.2s → **0.1s** | 0.3s → **0.2s** | 0.7s → **0.4s** | 2.7s → **1.4s** | 21.9s → **11.1s** |
| nuclear-warhead | 17 | 0.1s → **0.1s** | 0.1s → **0.1s** | 0.2s → **0.1s** | 0.4s → **0.2s** | 1.7s → **0.8s** | 13.6s → **6.5s** |
| antimatter-warhead | 19 | 0.1s → **0.1s** | 0.1s → **0.1s** | 0.2s → **0.1s** | 0.4s → **0.2s** | 1.5s → **0.7s** | 12.1s → **5.6s** |

## Crowd damage per second – previous update (before the tier generator)

| Unit | Tier | w1 | w10 | w25 | w50 | w100 | w250 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| dude | 1 | 3.7 → **5.1** | 8.5 → **16.2** | 18.5 → **52.7** | 30.1 → **121** | 30.1 → **186** | 30.8 → **380** |
| cadet | 1 | 7.9 → **10.4** | 13.9 → **27.1** | 25.8 → **74.5** | 36.8 → **154** | 37.6 → **236** | 38.4 → **474** |
| gunnerman | 2 | 15.0 → **20.8** | 24.3 → **47.1** | 45.5 → **130** | 58.8 → **244** | 59.3 → **371** | 60.2 → **750** |
| grenade-launcher | 3 | 199 → **261** | 352 → **662** | 632 → **2018** | 830 → **3662** | 800 → **5299** | 787 → **11k** |
| tank | 5 | 615 → **797** | 1011 → **2008** | 2074 → **4636** | 2706 → **7630** | 2581 → **9880** | 2537 → **17k** |
| special-forces | 3 | 21.7 → **29.2** | 38.9 → **81.5** | 80.6 → **219** | 122 → **494** | 124 → **755** | 125 → **1514** |
| drone | 5 | 355 → **502** | 632 → **1038** | 1259 → **3584** | 1450 → **5738** | 1366 → **7208** | 1277 → **12k** |
| commander | 5 | 78.2 → **101** | 128 → **234** | 237 → **519** | 330 → **926** | 330 → **1237** | 330 → **2169** |
| colonel | 6 | 24.3 → **33.3** | 41.3 → **76.9** | 74.4 → **191** | 107 → **332** | 107 → **443** | 107 → **777** |
| general | 7 | 1598 → **1979** | 2374 → **3961** | 4651 → **7985** | 6016 → **12k** | 5875 → **12k** | 5635 → **11k** |
| fortress | 10 | 6421 → **8261** | 11k → **16k** | 17k → **28k** | 21k → **35k** | 20k → **33k** | 20k → **31k** |
| gambler | 3 | 20.1 → **25.8** | 32.9 → **71.3** | 62.0 → **177** | 79.8 → **337** | 79.8 → **507** | 81.1 → **1031** |
| bandit | 3 | 15.5 → **20.5** | 25.5 → **50.6** | 42.0 → **120** | 56.4 → **238** | 57.1 → **361** | 58.0 → **731** |
| outlaw | 5 | 143 → **199** | 246 → **422** | 362 → **1050** | 510 → **1665** | 523 → **1955** | 499 → **3287** |
| bounty-hunter | 5 | 42.5 → **57.5** | 68.8 → **126** | 119 → **288** | 150 → **477** | 152 → **630** | 150 → **1111** |
| gunslinger | 7 | 166 → **236** | 293 → **488** | 481 → **935** | 645 → **1350** | 645 → **1361** | 651 → **1361** |
| sheriff | 9 | 140 → **184** | 228 → **373** | 379 → **726** | 487 → **981** | 487 → **981** | 487 → **981** |
| outlaw-leader | 9 | 462 → **588** | 746 → **1340** | 1123 → **2296** | 1692 → **2808** | 1638 → **2879** | 1577 → **2602** |
| fastest-hand | 12 | 451 → **603** | 748 → **1149** | 1229 → **2311** | 1570 → **3228** | 1570 → **3228** | 1617 → **3228** |
| drunkard | 1 | 17.8 → **25.4** | 31.7 → **57.2** | 51.2 → **119** | 58.9 → **199** | 57.2 → **295** | 51.6 → **578** |
| dealer | 6 | 53.3 → **73.6** | 92.0 → **164** | 148 → **373** | 194 → **577** | 198 → **782** | 198 → **1372** |
| night-dancer | 6 | 410 → **545** | 695 → **1105** | 1186 → **2852** | 1511 → **4849** | 1421 → **6134** | 1387 → **11k** |
| desperate-gambler | 7 | 107 → **165** | 206 → **355** | 361 → **703** | 506 → **980** | 506 → **980** | 511 → **1008** |
| pit-boss | 9 | 75.0 → **101** | 125 → **211** | 212 → **420** | 275 → **572** | 275 → **572** | 275 → **585** |
| high-roller | 10 | 255 → **334** | 414 → **637** | 661 → **1184** | 832 → **1622** | 845 → **1622** | 845 → **1622** |
| the-house | 15 | 6150 → **8784** | 11k → **15k** | 17k → **31k** | 20k → **39k** | 20k → **38k** | 19k → **36k** |
| missile-launcher | 4 | 367 → **527** | 682 → **1071** | 1022 → **2529** | 1356 → **3818** | 1330 → **4878** | 1316 → **8488** |
| special-force-battalion | 5 | 70.3 → **96.3** | 121 → **217** | 196 → **472** | 261 → **779** | 263 → **1023** | 263 → **1791** |
| icbm | 7 | 1350 → **1945** | 2621 → **3462** | 3786 → **7524** | 5540 → **10k** | 5183 → **8992** | 4537 → **8677** |
| bomber | 7 | 1832 → **2569** | 3298 → **4951** | 5660 → **11k** | 7265 → **14k** | 6599 → **13k** | 6586 → **13k** |
| b2 | 9 | 3293 → **4365** | 5561 → **6870** | 8209 → **15k** | 9566 → **17k** | 8958 → **18k** | 8634 → **18k** |
| marshal | 12 | 2293 → **2640** | 3099 → **4079** | 4135 → **7742** | 4671 → **9755** | 4562 → **9755** | 4454 → **9210** |
| glorious-leader | 15 | 461 → **639** | 793 → **1282** | 1304 → **2472** | 1672 → **3391** | 1672 → **3391** | 1672 → **3391** |
| nuclear-warhead | 17 | 28k → **37k** | 48k → **68k** | 71k → **137k** | 93k → **174k** | 86k → **156k** | 82k → **153k** |
| antimatter-warhead | 19 | 39k → **44k** | 58k → **95k** | 99k → **185k** | 118k → **234k** | 109k → **227k** | 105k → **216k** |

## Full games – previous update (before the tier generator)

A bot keeps up to 60 units on the best tiles, fills with Dudes until it can afford the army's main unit, then saves for it and upgrades. It calls waves one at a time until the Tower falls (cap 300). The table shows the wave reached.

| Army (bot) | Before | After |
| --- | --- | --- |
| dude | 69 | **97** |
| cadet | 28 | **71** |
| drunkard | 28 | **63** |
| gunnerman | 37 | **106** |
| bandit | 28 | **103** |
| special-forces | 106 | **145** |
| gambler | 28 | **106** |
| dude + grenade-launcher | 36 | **106** |
| dude + tank | 37 | **144** |
| dude + drone | 71 | **159** |
| dude + commander | 82 | **120** |
| dude + outlaw | 37 | **126** |
| dude + bounty-hunter | 82 | **103** |
| dude + special-force-battalion | 69 | **131** |
| dude + missile-launcher | 37 | **126** |
| dude + night-dancer | 37 | **106** |
| dude + dealer | 69 | **123** |
| dude + general | 28 | **182** |
| dude + gunslinger | 80 | **131** |
| dude + desperate-gambler | 80 | **129** |
| dude + icbm | 28 | **159** |
| dude + bomber | 28 | **159** |
| dude + sheriff | 28 | **112** |
| dude + outlaw-leader | 28 | **179** |
| dude + pit-boss | 28 | **112** |
| dude + b2 | 28 | **228** |
| dude + fortress | 28 | **232** |
| dude + high-roller | 28 | **129** |
| dude + fastest-hand | 28 | **131** |
| dude + marshal | 28 | **232** |
| dude + the-house | 28 | **277** |
| dude + glorious-leader | 28 | **179** |
| dude + nuclear-warhead | 28 | **300** |
| dude + antimatter-warhead | 28 | **300** |

**Findings:**
- Before, almost every army hit a wall at wave 28. Now first units carry an army to waves 63–106. Mid tiers reach roughly 100–180, Tier IX–XV reach 160–280, and the two rarest units reach the cap.
- Dude is the best Tier I solo army, thanks to Dude Power. Cadet and Drunkard trail it but still reach waves 60–70 alone.
- Support units (Sheriff, Pit Boss, Dealer, Glorious Leader) score lower here because the bot only buffs Dudes. Their value is in mixed armies.
