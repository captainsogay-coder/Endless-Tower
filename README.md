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
4. **Summoning:** spend Tokens at the **Military Summoning Circle** to unlock new unit types permanently.

| Input (battle) | Action |
| --- | --- |
| Deploy card / `1`–`9`, `0`, `-`, `=` | Choose a plan unit to place |
| Click or drag on open ground | Deploy copies (placement stays active) |
| Click a deployed unit | Stats, passive, upgrade preview |
| `U` / `X` | Upgrade / sell the selected unit |
| Right-click / `Esc` | Cancel placement or selection |
| Start wave / `N` | Start the next wave (or tick **Auto**) |
| `Space`, `F` | Pause, cycle game speed |

## Currencies

| Currency | Earned | Spent on | Lifetime |
| --- | --- | --- | --- |
| **Coins** | Defeating enemies, clearing waves | Deploying and upgrading units in battle | One battle |
| **Tokens** | 100 per completed wave | Summoning | Saved permanently |

The two balances never mix. There is no Gem currency. If one is introduced later, a banner's `currency` field is the only thing that needs to change.

## Summoning: Military Summoning Circle

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

## Units

Every unit has a base level plus 5 upgrades, bought per copy in battle. All numbers live in one data table per unit in `src/units/defs/`.

| Unit | Tier | Price | Damage | Range (tiles) | Attacks/s | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Dude | I | 15 | 4 | 2 | 1.25 | Starter. **Dude Power:** `Damage × [1 + 0.10 × (deployed Dudes − 1)]` |
| Cadet | I | 30 | 7 | 2.5 | 1.5 | Better DPS and range than Dude |
| Gunnerman | II | 75 | 5 | 3.5 | 4.0 | Sustained machine-gun DPS |
| Grenade Launcher | III | 160 | 32 | 4 | 0.45 | Small blast (1.1 tiles). **Wounded:** 20% per enemy hit, −5% speed for 4 s, refreshes, never stacks |
| Tank | V | 450 | 85 | 5 | 0.4 | Blast 1.5 tiles. Leaves **flames** for 3 s (8% of shell damage per second). **Command Presence:** allies within 2.5 tiles attack 10% faster; overlapping Tanks don't stack |

Selling refunds 70% of everything spent on that copy.

### Adding a unit

1. Create a definition in `src/units/defs/` (the schema is in `src/units/roster.js`) and add it to `ROSTER`.
2. Give it an art painter in `src/render/unitArt.js`.
3. To make it summonable, add it to a banner pool in `src/units/summoning.js`.

Shared systems handle the rest: targeting, upgrades, passives, `onHit` statuses, `impactHazard` ground effects and `aura` buffs, all in `src/game/effects.js`. Passives and auras are recomputed only when units are deployed, sold or upgraded, never every frame.

## Waves, scaling and realms

- **Waves:** endless, built from four archetypes (Swarm, Army, Commando and Boss), with gradual, finite-forever scaling and progressive encounter traits.
- **Realms:** six, each with three terrain variants, a landmark, natural ground and its own lighting.
- **Layouts:** procedurally generated and validated so every route is a contiguous road from the edge to the Tower.

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
