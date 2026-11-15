// THE CHASE UNIT STANDARD (src/render/chaseStandard.js), enforced for every
// chase unit – present and future. A circle's chase units (chase: true, or a
// chance of 1% or less) must each have their own animation personality, idle,
// attack and special effects, kill feedback, special sound and acquisition
// reveal. None may be shared with another chase unit.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { registerRoster } from '../src/units/roster.js';
import { listCirclesByPrice, isRareEntry } from '../src/units/summoning.js';
import { getUnit } from '../src/units/unitRegistry.js';
import { CHASE, chaseOf, installChaseAnimations } from '../src/render/chaseStandard.js';
import { CHASE_SFX } from '../src/audio/sfx.js';
import '../src/render/castArt.js';
import '../src/render/medievalArt.js';
import '../src/render/pack2Art.js';
import '../src/render/pack3Art.js';
import '../src/render/ghostArt.js';
import { animOf } from '../src/render/unitArt.js';
import { MOTIFS } from '../src/render/revealMotifs.js';
import { hasRareShow } from '../src/render/summonFx.js';

registerRoster();
installChaseAnimations();

const chaseUnits = () => listCirclesByPrice().flatMap((b) => b.pool.filter(isRareEntry).map((p) => ({ ...p, circle: b.id })));

test('every chase unit in every circle is registered in the Chase Unit Standard', () => {
  const ids = chaseUnits().map((p) => p.unit);
  assert.ok(ids.length >= 22, `${ids.length} chase units`);
  for (const id of ids) assert.ok(chaseOf(id), `${id} has no Chase Unit Standard entry – add one to src/render/chaseStandard.js`);
  for (const id of Object.keys(CHASE)) assert.ok(ids.includes(id), `${id} is registered but is not a chase unit`);
});

test('each has its own animation, idle, attack, special, kill feedback, sound and reveal – none shared', () => {
  const seen = { anim: new Set(), idle: new Set(), attack: new Set(), special: new Set(), kill: new Set(), sfx: new Set(), stamp: new Set() };
  for (const p of chaseUnits()) {
    const c = chaseOf(p.unit);
    const def = getUnit(p.unit);
    assert.equal(c.art, def.art, `${p.unit}: art key matches the unit`);
    // animation: installed over the painter's, or the painter animates itself
    if (!c.custom) {
      const a = animOf(c.art);
      assert.ok(a && (a === c.anim || a === c.wrapped), `${p.unit}: its own animation is installed`);
      assert.ok(!seen.anim.has(a), `${p.unit}: animation shared with another chase unit`);
      seen.anim.add(a);
      const pose = a({ uid: 3, lastFire: -99, lastSpecial: -99, hasTarget: false, cooldown: 1, recoil: 0, facing: 1, shots: 1 }, 5);
      assert.ok(Number.isInteger(pose.frame), `${p.unit}: animation returns a frame`);
    } else assert.ok(c.custom.length > 20, `${p.unit}: describes its custom renderer`);
    for (const k of ['idle', 'attack', 'special', 'kill']) {
      assert.equal(typeof c[k], 'function', `${p.unit}: ${k}`);
      assert.ok(!seen[k].has(c[k]), `${p.unit}: ${k} shared`);
      seen[k].add(c[k]);
    }
    assert.ok(CHASE_SFX[c.sfx], `${p.unit}: special sound "${c.sfx}" exists`);
    assert.ok(!seen.sfx.has(c.sfx), `${p.unit}: sound shared`);
    seen.sfx.add(c.sfx);
    assert.ok(c.reveal?.stamp && c.reveal.motif && c.reveal.colors?.length === 2, `${p.unit}: reveal`);
    assert.ok(MOTIFS.includes(c.reveal.motif), `${p.unit}: reveal motif "${c.reveal.motif}" is drawn by revealMotifs.js`);
    if (c.reveal.motif === 'show') assert.ok(hasRareShow(p.unit), `${p.unit}: "show" reveals need a bespoke RARE_SHOWS entry`);
    assert.ok(!seen.stamp.has(c.reveal.stamp), `${p.unit}: reveal stamp shared`);
    seen.stamp.add(c.reveal.stamp);
  }
});

test('super chase units (0.1% or rarer) are flagged for the extended reveal', () => {
  for (const p of chaseUnits()) {
    const superChase = p.chance <= 0.001;
    assert.equal(!!chaseOf(p.unit).superChase, superChase, `${p.unit} (${p.chance})`);
  }
});
