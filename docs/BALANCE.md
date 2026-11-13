# Endless Tower: Progression Balance

All knobs live in `src/balance.js` (`BALANCE`); per-unit values live in the unit files. Every number below was measured with
`node scripts/balance.mjs` against the real simulation. The `--before` flag reproduces the previous balance for comparison.

## Rules

**Tokens per completed wave:** `250 × (1 + 0.05 × floor(wave / 10))`. That gives 250 Tokens at waves 1–9, 263 at 10, 313 at 50, 375 at 100 and 563 at 250. Milestones add +5% each and don't compound.
- The formula lives in `BALANCE.tokens`.
- Rewards are paid by the wave's own completion, so single calls, multi-wave queues and Auto Skip each pay exactly once per wave (unit-tested).
- The next-encounter panel and the wave banner show the reward before the wave; the clear banner shows it after.
- Gems are unchanged: 50 per boss wave.

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

## Individual adjustments

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

## Kill time of one Regular (single target, one copy at a typical level)

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

## Crowd damage per second (a dense column of Regulars, one copy)

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

## Full games

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
