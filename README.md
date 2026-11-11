# Endless Tower

> There is no final wave. There is always another challenge.

An endless tower-defense prototype. You summon units, place as many as you like on open ground, and hold off waves that never stop coming and keep changing.

**Status: The Foundation (prototype).** This phase covers the core loop, procedural maps, wave variety, endless scaling and the summoning/tier infrastructure. No units are designed yet (see [Units](#units--the-roster-is-intentionally-empty)).

## Play

No build step and no dependencies.

```bash
npm start            # serves the game at http://localhost:8080
```

URL options: `?realm=forest|volcanic|frozen|ruins|sky|mechanical`, `?seed=1234` (reproducible run), `?fx=0` (ambient effects off).

| Input | Action |
| --- | --- |
| Summon / `S` (`Shift+S` = ×10) | Spend gold on a random unit |
| Click a reserve card, then click or drag on open ground | Place units (there is no unit cap) |
| Click a placed unit | Inspect it, or recall it (`R`) |
| Right-click / `Esc` | Cancel placement or selection |
| Begin Wave / `N` | Start the next wave (or tick **Auto**) |
| `Space`, `1`–`3` | Pause, game speed |

## What's in this phase

1. **Endless wave progression.** The wave counter never ends, and the next encounter is previewed in the dock.
2. **Four randomized wave archetypes:**
   - **Swarm:** hordes of weak minions (about 30 at first, up to 380 per wave) arriving in bursts or rising surges.
   - **Army:** about 12 regular troops, the standard fight.
   - **Commando:** 3–9 elites that each take sustained fire to bring down.
   - **Boss:** a single colossus with an entrance cinematic: the screen darkens, a summoning circle and pillar of light appear, the boss materialises while invulnerable, then a shockwave and a boss health bar.

   The `WaveDirector` mixes these intelligently. It weights toward archetypes not seen recently, enforces per-archetype repeat limits, and schedules a boss every 7–11 waves.
3. **Gradual endless scaling** (`src/waves/scaling.js`). HP grows polynomially (×2.5 at wave 10, ×76 at wave 100, finite at wave 1,000,000). Speed rises toward a +32% ceiling, and tower damage and rewards also scale. No two consecutive waves differ by more than 15% in HP. Depth comes from more than bigger numbers:
   - **Encounter traits** unlock over time: Armored (w8), Swift (w12), Regenerating (w18), Shielded (w26). Late waves can roll several at once.
   - **Mixed compositions:** armies gain elites and minion screens, swarms gain regulars and elites, commandos gain escorts, bosses gain retinues.
   - **Entrance patterns:** stream, bursts, surge and pincer, plus single, alternating or random entrances on multi-entrance maps.
4. **Six randomized, animated realms.** Each has its own palette, terrain, decorations, ambient animation and enemy colouring:
   - **Enchanted Forest:** ancient trees with swaying canopies, glowing mushrooms, fireflies, rippling ponds.
   - **Volcanic Wasteland:** lava rivers with bridges, pulsing cracks, a volcano that erupts, ash and embers.
   - **Frozen Frontier:** frozen lakes with a moving shimmer, snowy pines, ice crystals, snowfall and periodic blizzard gusts.
   - **Ancient Ruins:** paved roads, broken and toppled columns, monuments, rotating rune circles, light shafts.
   - **Sky Islands:** floating land over a parallax sky, cliff undersides, waterfalls into the void, bobbing rocks.
   - **Mechanical Wasteland:** riveted plates, rotating gears, steam vents, smokestacks, blinking machines, animated flow chevrons on the track.

   Layouts are procedural: a winding road, a serpent coil, or converging paths with 2–3 entrances. Each layout is randomly oriented and mirrored, and decorations are scattered per seed. Ambient effects sit under combat or at low opacity so enemies, units and projectiles stay readable. They can be toggled with ✦.
5. **Map-specific spawning and pathing.** Enemies spawn at the realm's entrances with randomized lateral offsets and entrance sequences. Every route is validated as a contiguous road from a map edge to the Tower (`validateMap`).
6. **Unlimited unit placement.** Any open ground tile accepts a unit, with no cap. Difficulty comes from the waves, not from limits on your army. A spatial hash, pooled projectiles, cached sprites and adaptive effects keep 600+ units and hundreds of enemies running smoothly.
7. **Summoning and tier infrastructure.** Gold buys summons. Each summon rolls a tier from decaying odds, and both the odds and the tier ceiling improve as waves progress, with no upper bound.

## Units: the roster is intentionally empty

`src/units/roster.js` ships empty and documents the definition schema: stats, tier, optional `render`, `onFire`, `onUpdate` and `onPlace` hooks. Units added there are summoned automatically.

Until then, the prototype stays playable with **Prototype Proxies**. These are not units. They are a neutral, tier-parameterised test stand whose stats derive only from the tier's power multiplier. They are used only while the roster is empty and disappear as soon as any real unit is registered.

Tiers (`src/units/tiers.js`) are an unbounded integer scale. `getTier(n)` works for any `n ≥ 1`. Labels are plain (`Tier I`, `Tier II`, …) and you can override any tier's name, colour, power or odds with `defineTier(n, {...})`.

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
  units/                    tiers, unit registry, empty roster, summoning, proxies
  render/                   renderer, sprite caches, effects
  ui/hud.js                 DOM HUD
```

Each system is a registry, so future units, enemies, realms, archetypes, traits and tiers can be added on their own without touching the other systems.

## Development

```bash
npm test                         # map validity, wave director, scaling, tiers/summoning, gameplay
npm run sim -- 10 150            # headless balance sim: a naive bot plays 10 runs up to wave 150
node scripts/screenshot.mjs URL  # capture every realm (needs Playwright + a running server)
node scripts/encounters.mjs URL  # capture forced swarm / boss / commando / army encounters
```
