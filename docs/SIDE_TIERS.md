# Side tiers

Every unit has five ratings next to its overall combat tier: **DPS, AOE, Summon, Empower and Economy**. They use the same 1–20+ scale as the overall tier, but they are plain numbers ("DPS 8"), while the overall tier stays a Roman numeral ("Tier V"), so the two can't be mixed up. **N/A** means the unit has no real contribution in that category.

## How they are measured

The ratings are measured, not assigned. `src/meta/sideTierBench.js` runs real headless battles with the game's own simulation. Every unit is tested at wave 10 (so wave scaling counts), level 0, with weather off, on a fixed map, standing next to the road.

| Category | What is measured | N/A when |
| --- | --- | --- |
| DPS | Own damage per second on one tough target over 60 s. Crits, every-Nth shots, timed strikes, self-buffs and its own debuffs all count. The result is multiplied by (range ÷ reference range)^0.3, the same value the tier system puts on reach. Allies and drones are excluded. | never (every unit attacks) |
| AOE | Extra own damage per second on a pack of 10 enemies compared with one target (splash, chains, zones, burning ground). Crowd control is added: each enemy-second of slow or hold counts as 2 reference DPS. | below ¼ of a Cadet |
| Summon | Damage per second of everything the unit creates (allies, and drones launched as a secondary attack) over 90 s, so cooldowns and uptime count. | below ⅒ of a Cadet |
| Empower | How much it raises a reference squad's damage, through buffs to allies and debuffs on enemies. The share is applied to a reference army of 8 × Tier VI. Faction-only buffs count 75%; buffs to its own type only (Dude Power) count 35%. | below ¼ of a Cadet |
| Economy | Extra coins per minute in a 150 s battle where a fixed squad kills a steady stream. Kill rewards that would have been paid anyway are removed, so only real extra income counts. Rating *n* ≈ the net income over 3 minutes **minus the unit's own price** would buy a Tier *n* unit. | under 2 coins/min |

How values become ratings:
- DPS-like values: the tier whose `tierPower × Cadet DPS` matches the value.
- Economy: the tier whose price matches the net income.

## Keeping them current

`npm run ratings` re-measures all 55 units in about 2 seconds and writes `src/units/sideTiers.data.js`. Each unit's entry stores a signature of its definition: stats, ability numbers, the ability code and the global balance.

If any of those change and the table isn't regenerated:
- `npm test` fails.
- `npm run build` refuses to build.
- `npm run ratings:check` reports which units are stale.

The tests also re-measure every unit and require an exact match, and they check that a changed unit (e.g. tripled Bandit damage, tripled Marshal income) gets a different rating.

## Where they appear

- Battle Plans collection cards and the dossier (with "#2 of 14 owned" rankings)
- The battle unit panel
- The summoning drop-rate list
- Summon reveals and results
- The Auto Pick preview

They also drive the collection filters and sorting, and Auto Pick priorities.

## Current table

| Unit | Tier | DPS | AOE | Summon | Empower | Economy | Measured income |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Dude | I | 1 | N/A | N/A | 1 | N/A |  |
| Cadet | I | 1 | N/A | N/A | N/A | N/A |  |
| Gunnerman | II | 2 | N/A | N/A | N/A | N/A |  |
| Grenade Launcher | III | 1 | 3 | N/A | N/A | N/A |  |
| Tank | V | 1 | 4 | N/A | 2 | N/A |  |
| Special Forces | III | 3 | N/A | N/A | 1 | N/A |  |
| Drone | V | 3 | 5 | N/A | N/A | N/A |  |
| Commander | V | 5 | N/A | N/A | 6 | N/A |  |
| Colonel | VI | 5 | N/A | N/A | 11 | 13 | 213 coins/min, net 598 |
| General | VII | 2 | 5 | 1 | 15 | N/A |  |
| Fortress | X | 2 | 8 | 5 | 3 | 14 | 355 coins/min, net 715 |
| Gambler | III | 4 | N/A | N/A | N/A | 1 | 20 coins/min, net 10 |
| Bandit | III | 4 | N/A | N/A | N/A | N/A |  |
| Outlaw | V | 3 | 2 | N/A | 1 | N/A |  |
| Bounty Hunter | V | 6 | N/A | N/A | N/A | 18 | 469 coins/min, net 1302 |
| Gunslinger | VII | 7 | N/A | N/A | N/A | N/A |  |
| Sheriff | IX | 9 | N/A | N/A | 6 | N/A |  |
| Outlaw Leader | IX | 2 | N/A | 8 | 1 | 1 | 16 coins/min, net -243 |
| Fastest Hand In The West | XII | 12 | N/A | N/A | N/A | N/A |  |
| Drunkard | I | 1 | 1 | N/A | N/A | N/A |  |
| Dealer | VI | 6 | N/A | N/A | 6 | 7 | 109 coins/min, net 187 |
| Night Dancer | VI | 3 | 7 | N/A | N/A | N/A |  |
| Desperate Gambler | VII | 7 | N/A | N/A | N/A | N/A |  |
| Pit Boss | IX | 8 | N/A | N/A | 11 | 7 | 165 coins/min, net 204 |
| High Roller | X | 11 | 1 | N/A | N/A | 12 | 270 coins/min, net 461 |
| THE HOUSE | XV | 6 | 13 | N/A | 9 | 15 | 531 coins/min, net 762 |
| Missile Launcher | IV | 1 | 3 | N/A | N/A | N/A |  |
| Special Force Battalion | V | 4 | N/A | 2 | N/A | N/A |  |
| Intercontinental Ballistic Missile | VII | 3 | 8 | N/A | N/A | N/A |  |
| Bomber | VII | 2 | 9 | N/A | N/A | N/A |  |
| B-2 | IX | 4 | 8 | N/A | N/A | N/A |  |
| Marshal | XII | 6 | 5 | N/A | 7 | 15 | 446 coins/min, net 828 |
| Glorious Leader | XV | 14 | N/A | N/A | 10 | 25 | 1274 coins/min, net 2992 |
| Nuclear Warhead | XVII | 7 | 17 | N/A | 5 | N/A |  |
| Antimatter Warhead | XIX | 9 | 21 | N/A | 8 | N/A |  |
| Farmer | I | 1 | N/A | N/A | N/A | N/A |  |
| Spearman | I | 1 | N/A | N/A | N/A | N/A |  |
| Slingman | II | 2 | N/A | N/A | N/A | N/A |  |
| Militia Archer | II | 2 | N/A | N/A | N/A | N/A |  |
| Village Captain | III | 3 | N/A | N/A | 3 | N/A |  |
| The Village Hero | IV | 4 | N/A | N/A | N/A | N/A |  |
| Guard Recruit | II | 2 | N/A | N/A | N/A | N/A |  |
| Crossbowman | III | 4 | N/A | N/A | N/A | N/A |  |
| Guard Sergeant | III | 3 | N/A | N/A | N/A | N/A |  |
| Halberdier | IV | 1 | 3 | N/A | N/A | N/A |  |
| Royal Patrol | V | 5 | N/A | N/A | N/A | N/A |  |
| Grand Captain | VI | 5 | N/A | N/A | 7 | N/A |  |
| The King's Champion | VIII | 7 | N/A | N/A | N/A | N/A |  |
| Apprentice Engineer | III | 3 | N/A | N/A | N/A | N/A |  |
| Ballista | IV | 4 | N/A | N/A | N/A | N/A |  |
| Catapult | V | 1 | 4 | N/A | N/A | N/A |  |
| Bombardier | V | 2 | 3 | N/A | N/A | N/A |  |
| Siege Commander | VI | 6 | N/A | N/A | 6 | N/A |  |
| Trebuchet | VIII | 3 | 8 | N/A | N/A | N/A |  |
| The Master Engineer | X | 3 | 9 | 1 | N/A | N/A |  |
