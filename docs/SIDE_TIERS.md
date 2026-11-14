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

| Unit | Tier | DPS | AOE | Summon | Empower | Economy | Combat rating | Measured income |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Dude | I | 1 | N/A | N/A | 1 | N/A | 1 |  |
| Cadet | I | 1 | N/A | N/A | N/A | N/A | 1 |  |
| Gunnerman | II | 2 | N/A | N/A | N/A | N/A | 2 |  |
| Grenade Launcher | III | 2 | 3 | N/A | N/A | N/A | 3 |  |
| Tank | V | 2 | 5 | N/A | 2 | N/A | 4 |  |
| Special Forces | III | 3 | N/A | N/A | 2 | N/A | 3 |  |
| Drone | V | 3 | 6 | N/A | N/A | N/A | 5 |  |
| Commander | V | 4 | N/A | N/A | 6 | N/A | 4 |  |
| Colonel | VI | 5 | N/A | N/A | 9 | 11 | 5 | 213 coins/min, net 568 |
| General | VII | 4 | 7 | 1 | 11 | N/A | 6 |  |
| Fortress | X | 5 | 10 | 8 | 4 | 12 | 11 | 355 coins/min, net 665 |
| Gambler | III | 3 | N/A | N/A | N/A | 1 | 3 | 18 coins/min, net 4 |
| Bandit | III | 3 | N/A | N/A | N/A | N/A | 3 |  |
| Outlaw | V | 4 | 2 | N/A | 2 | N/A | 5 |  |
| Bounty Hunter | V | 5 | N/A | N/A | N/A | 15 | 5 | 469 coins/min, net 1307 |
| Gunslinger | VII | 7 | N/A | N/A | N/A | N/A | 7 |  |
| Sheriff | IX | 8 | N/A | N/A | 6 | N/A | 8 |  |
| Outlaw Leader | IX | 8 | N/A | 6 | 1 | 1 | 10 | 16 coins/min, net -263 |
| Fastest Hand In The West | XII | 12 | N/A | N/A | N/A | N/A | 12 |  |
| Drunkard | I | 1 | 1 | N/A | N/A | N/A | 1 |  |
| Dealer | VI | 5 | N/A | N/A | 6 | 7 | 5 | 109 coins/min, net 187 |
| Night Dancer | VI | 4 | 7 | N/A | N/A | N/A | 6 |  |
| Desperate Gambler | VII | 7 | N/A | N/A | N/A | N/A | 7 |  |
| Pit Boss | IX | 8 | N/A | N/A | 9 | 7 | 8 | 165 coins/min, net 184 |
| High Roller | X | 10 | 1 | N/A | N/A | 10 | 10 | 270 coins/min, net 411 |
| THE HOUSE | XV | 10 | 14 | N/A | 8 | 9 | 13 | 531 coins/min, net 352 |
| Missile Launcher | IV | 2 | 4 | N/A | N/A | N/A | 4 |  |
| Special Force Battalion | V | 4 | N/A | 2 | N/A | N/A | 5 |  |
| Intercontinental Ballistic Missile | VII | 4 | 8 | N/A | N/A | N/A | 6 |  |
| Bomber | VII | 3 | 9 | N/A | N/A | N/A | 6 |  |
| B-2 | IX | 5 | 10 | N/A | N/A | N/A | 8 |  |
| Marshal | XII | 9 | 9 | N/A | 7 | 12 | 11 | 446 coins/min, net 688 |
| Glorious Leader | XV | 14 | 1 | N/A | 8 | 19 | 14 | 1274 coins/min, net 2582 |
| Nuclear Warhead | XVII | 12 | 19 | N/A | 5 | N/A | 15 |  |
| Antimatter Warhead | XIX | 14 | 22 | N/A | 8 | N/A | 19 |  |
| Farmer | I | 1 | N/A | N/A | N/A | N/A | 1 |  |
| Spearman | I | 1 | N/A | N/A | N/A | N/A | 1 |  |
| Slingman | II | 2 | N/A | N/A | N/A | N/A | 2 |  |
| Militia Archer | II | 2 | N/A | N/A | N/A | N/A | 2 |  |
| Village Captain | III | 3 | N/A | N/A | 3 | N/A | 3 |  |
| The Village Hero | IV | 4 | N/A | N/A | N/A | N/A | 4 |  |
| Guard Recruit | II | 2 | N/A | N/A | N/A | N/A | 2 |  |
| Crossbowman | III | 3 | N/A | N/A | N/A | N/A | 3 |  |
| Guard Sergeant | III | 3 | N/A | N/A | N/A | N/A | 3 |  |
| Halberdier | IV | 2 | 4 | N/A | N/A | N/A | 4 |  |
| Royal Patrol | V | 5 | N/A | N/A | N/A | N/A | 5 |  |
| Grand Captain | VI | 5 | N/A | N/A | 6 | N/A | 5 |  |
| The King's Champion | VIII | 8 | N/A | N/A | N/A | N/A | 8 |  |
| Apprentice Engineer | III | 3 | N/A | N/A | N/A | N/A | 3 |  |
| Ballista | IV | 4 | N/A | N/A | N/A | N/A | 4 |  |
| Catapult | V | 3 | 5 | N/A | N/A | N/A | 4 |  |
| Bombardier | V | 3 | 5 | N/A | N/A | N/A | 5 |  |
| Siege Commander | VI | 5 | N/A | N/A | 6 | N/A | 5 |  |
| Trebuchet | VIII | 4 | 8 | N/A | N/A | N/A | 7 |  |
| The Master Engineer | X | 6 | 11 | 1 | N/A | N/A | 9 |  |
