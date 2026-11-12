# Endless Tower: Art Direction

These are the rules every asset follows. New units, enemies, realms and UI should follow them too, so the game keeps one consistent look.

## World

- **One light source.** Light comes from the top-left in every realm. Highlights sit on the top-left of forms and contact shadows fall down and to the right. Use `dropShadow()` / `rgba(20,14,24,0.3)` and not pure black.
- **Flat fills, tinted outlines.** Shapes are flat colour with at most one light-side highlight. Outlines are a dark version of the object's own hue, never `#000`.
- **Glow means light.** Only things that emit light in the world may glow: lava, bioluminescent mushrooms, runes, warning lamps. Units, projectiles, enemies and the UI never glow.
- **Every particle has a source.** There are no ambient "magic dust" fields. Leaves fall from trees, fireflies stay around mushroom groves, embers come from eruptions, and steam comes from vents. Weather (snow, ash) counts as a source and stays low-contrast.
- **Restraint in combat.** Hits make a small puff of dust. Deaths make a short burst in the enemy's own colours. Only boss arrivals and boss deaths shake the screen, and only gently.
- **Natural distribution.** Ground colour comes from a noise field. Grass, flowers and decorations cluster through density noise, forming groves, rubble fields and colonnades instead of even dustings.
- **One landmark per realm,** recognisable at a glance:

  | Realm | Landmark |
  | --- | --- |
  | Enchanted Forest | Elder Tree in a stone ring |
  | Volcanic Wasteland | The volcano |
  | Frozen Frontier | Calved glacier |
  | Ancient Ruins | Fallen colossus head |
  | Sky Islands | Bell shrine |
  | Mechanical Wasteland | Derelict reactor |

- **Per-realm lighting.** Each realm sets `lighting` (key light position, strength, multiply colour grade, vignette) and optionally `atmosphere.cloudShadows`.
- **Gameplay first.** Ambient layers sit beneath combatants or at low opacity. Roads keep a clear verge so the path always reads, and the ✦ button turns effects off.

## Units

- Units are pre-rendered sprites drawn in `src/render/unitArt.js`, so a crowd of a thousand costs one image blit each.
- The silhouette must read at 20px tall and in crowds. Prefer a single strong colour block (Dude: red tee) over detail.
- Upgrade level appears as small ground stripes under the unit, so the silhouette stays the same.

## Interface

- **Type:** Barlow Condensed for headings, labels and numbers (uppercase, tracked); Barlow for reading text. Numbers are tabular.
- **Colour:** slate surfaces (`#161920` / `#1c2028` / `#252a34`), hairline borders, warm off-white text, and one accent: signal amber `#e3a33b`, the colour of the Tower's banner. Red is for danger and green for bonuses and health.
- **Shape:** 3px radii, 1px borders. No gradients, glows or drop-shadowed panels.
- **Selection** is shown with an accent outline plus an explicit "In plan" tag, never with glow alone.

## Unit animation personalities

No two units share an attack template:

| Unit | Attack | Idle |
| --- | --- | --- |
| **Dude** | Underarm throw; the pebble follows a shallow lob | Lazy sway |
| **Cadet** | Snaps the rifle to the shoulder for a split second with a crisp muzzle flash and a straight tracer | Stands at attention, glances around between engagements |
| **Gunnerman** | Vibrates between two recoil frames while the gun runs, ejecting brass | Heavy breathing |
| **Grenade Launcher** | Big kick-back and a smoke puff; the grenade takes a high arc with its shadow tracking the ground | Shifts weight |
| **Tank** | Turret tracks the target independently of the hull; barrel recoils on each shot, with exhaust smoke at the muzzle | Engine shimmy |
| **Special Forces** | Fast double-tap with a compact carbine, then a short settle | Low crouch, scanning |
| **Drone** | Launch rack cycles through three frames as each drone lifts off; explosive drones carry a hazard band | Rotors idle on the pad |
| **Commander** | Raises the scope (anticipation), fires a long tracer, lowers it (recovery) | Binoculars sweep |
| **Colonel** | Crisp pistol shot with a pointed arm | Hands behind the back |
| **General** | Baton raised before the artillery lands; shells fly a high arc | Steady, upright |
| **Fortress** | Hangar hatch opens to release a drone; the main barrel glows as it charges, then recoils hard | Turret slowly traverses |

## Impacts and status

- Feedback scales with the weapon: dust for pebbles, a spark for bullets, and a flat, hard-edged burst plus scorch decal for explosives. Burst size matches the real blast radius. Scorch marks fade within seconds.
- Enemies flinch when hit and move with distinct gaits: minions hop, regulars march, elites stomp, bosses lumber.
- **Wounded** enemies limp and carry a field-dressing mark. **Burning** enemies show small flames.
- **Crippled** enemies limp harder and carry a red cracked mark.
- Fire and lightning are light sources, so they may glow softly. Nothing else does.
- Drones are tiny quadcopters with a shadow; Explosive Drones end in a larger, hotter burst.
- In crowds of more than 900 enemies, rank-and-file enemies drop to a simplified sprite so the frame rate holds. Elites and bosses always keep full detail.

## Weather

Weather fades in and out over about 1.5 s and is kept low-contrast so units and enemies stay readable.

- **Rainy:** slanted rain, puddle ripples, slightly cooler light.
- **Windy:** long air streaks and tumbling leaves and grit.
- **Thunderstorm:** heavier rain, darker sky, sheet-lightning flashes, and a forked bolt plus scorch mark for each strike.
- **Aurora:** three slow ribbons of green, blue and violet light across the top of the map.
- **Nova:** warm rays from one corner and drifting motes.

## Summoning presentation

The motif is a stencilled requisition circle on a concrete slab under one hanging work lamp, not a magic portal.

- **Rarity:** shown by how many ring locks you hear, how high the perimeter lamps climb through the tier colours, how hard the crate lands, and how full the sting is. Bloom is never used.
- **Sound:** synthesized on the fly: mechanical clicks, a rising hum, a whoosh, a thud and a short chord.
- **Circles:** each banner has its own style. The Advanced Circle has a double ring, chevrons and a darker steel palette.
- **Rare results (1% or less):** the reveal slows down. The lamp goes dark, a red beacon turns, a CLASSIFIED stamp slams onto the slab, and a hazard-striped armoured crate drops with a long alarm. The outcome itself is decided before the animation starts and is never altered.

## Audio mix

Gunfire is short and dry, explosions are low thumps, and lightning is a sharp crack with a rolling tail. Realm ambience and weather loops sit well below combat. A per-kind rate limit and a voice budget keep thousands of enemies from turning into noise.
