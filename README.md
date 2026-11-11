# Endless Tower

> There is no final wave. There is always another challenge.

An endless tower-defense game. Plan your army, deploy as many units as you can afford on open ground, and hold off waves that never stop coming and keep changing.

**Status: Foundation + Battle Plans + first unit (Dude).** Art direction is documented in [docs/ART_DIRECTION.md](docs/ART_DIRECTION.md).

## Play

No build step and no dependencies.

```bash
npm start            # serves the game at http://localhost:8080
```

URL options: `?realm=forest|volcanic|frozen|ruins|sky|mechanical`, `?seed=1234` (reproducible battle), `?fx=0` (ambient effects off).

### Flow

1. **Battle Plans:** choose up to **12 unit types** for your army, name the plan, pick a battlefield (or leave it random), then press **Battle**. The plan is saved in the browser and stays in place between battles.
2. **Battle:** only units in your plan can be deployed. Each copy costs its purchase price, and **there is no limit on copies**; you are limited only by gold and open ground. Upgrade and sell individual copies.
3. When the Tower falls, choose **Battle again** (same plan, new map) or return to **Battle Plans**. **Retreat** (flag icon) ends a battle early.

| Input | Action |
| --- | --- |
| Deploy card / `1`–`9`, `0`, `-`, `=` | Choose a plan unit to place |
| Click or drag on open ground | Deploy copies (placement stays active) |
| Click a deployed unit | Open its panel: stats, passive, upgrade preview |
| `U` / `X` | Upgrade / sell the selected unit |
| Right-click / `Esc` | Cancel placement or selection |
| Start wave / `N` | Start the next wave (or tick **Auto**) |
| `Space`, `F` | Pause, cycle game speed |

## Units

### Dude (Tier I)

An ordinary guy who throws rocks. He is cheap (15 gold), short-ranged and weak alone.

- **Dude Power (passive):** every deployed Dude deals `Base Damage × [1 + 0.10 × (deployed Dudes − 1)]`. Only Dudes on the battlefield count. The bonus updates for every Dude the moment one is deployed or sold. It shows on the deploy card, in the unit panel and as a scaling table in Battle Plans.
- **Upgrades:** a base level plus 5 upgrade levels, bought per Dude in battle. The panel shows the current and next level, the cost and before/after stats. The numbers are in one table in `src/units/defs/dude.js`.

| Level | Cost | Damage | Range (tiles) | Attacks/s |
| --- | --- | --- | --- | --- |
| Base | 15 | 4 | 2 | 1.25 |
| 1 | 25 | 6 | 2 | 1.25 |
| 2 | 45 | 8 | 2 | 1.40 |
| 3 | 80 | 11 | 2.25 | 1.40 |
| 4 | 130 | 15 | 2.25 | 1.60 |
| 5 | 210 | 21 | 2.5 | 1.80 |

Selling refunds 70% of everything spent on that copy.

### Adding a unit

Create a definition module in `src/units/defs/` (schema in `src/units/roster.js`), add it to `ROSTER`, and give it an art painter in `src/render/unitArt.js`. It then appears in Battle Plans and becomes deployable. Combat, targeting, upgrades and passives all use the shared systems (`unitStats.js`, `Game.deploy/upgrade/sell`). Passives receive `{ deployed }` and are recomputed only when a unit of that type is deployed, sold or upgraded, never every frame.

The summoning system (`src/units/summoning.js`) is kept as infrastructure for unlocking future unit types. With one unit there is nothing to roll yet, so it isn't shown in the UI.

## Waves, scaling and realms

These are unchanged from the foundation phase:
- Endless waves built from four archetypes: Swarm, Army, Commando and Boss.
- Gradual, finite-forever scaling with progressive encounter traits.
- Six procedurally laid-out realms. Each now has a landmark, natural ground variation, clustered decoration, its own lighting grade and purposeful ambient animation.

## Architecture

```
src/
  config.js                 world grid + tunables
  core/                     seeded RNG & noise, spatial hash, events, math, colour
  game/Game.js              the simulation – DOM-free, event-driven, runs headless
  maps/
    mapGenerator.js         procedural layouts, features, decorations, validation
    biomes.js               biome registry  (add a realm = add one module here)
    biomes/*.js             palette, layout tuning, decor painters, ambient animation
    paint.js, MapScene.js   cached static terrain + live ambient layers
  waves/
    archetypes.js           Swarm / Army / Commando / Boss  (registerArchetype)
    waveDirector.js         archetype selection & wave plans
    scaling.js              endless difficulty curves
    traits.js               encounter traits  (registerTrait)
    spawnSchedule.js        plan → timed spawn events per entrance
  enemies/enemyCategories.js  minion / regular / elite / boss weight classes
                              + registerEnemyVariant() hook for the future roster
  units/                    tiers, registry, roster, defs/ (Dude), stats/upgrades, summoning
  meta/                     battle-plan model (12 types max) + persistent profile
  render/                   renderer, unit art & sprite caches, enemy sprites, effects
  ui/                       Battle Plans screen, battle HUD
```

Each system is a registry, so future units, enemies, realms, archetypes, traits and tiers can be added on their own without touching the other systems.

## Development

```bash
npm test                           # maps, waves, scaling, Dude, Dude Power, upgrades, plans, persistence
npm run sim -- 10 150              # headless balance sim: a bot deploys/upgrades Dudes, 10 runs to wave 150
node scripts/screenshot.mjs URL    # Battle Plans + every realm mid-battle (needs Playwright + server)
node scripts/interactions.mjs URL  # drives real clicks/drags/keys: plan edit, deploy, upgrade, sell, boss
node scripts/encounters.mjs URL    # forced swarm / boss / commando / army encounters
```
