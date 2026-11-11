import { test } from 'node:test';
import assert from 'node:assert/strict';
import { WaveDirector, BOSS_MIN_GAP, BOSS_MAX_GAP, FIRST_BOSS_WAVE } from '../src/waves/waveDirector.js';
import { getArchetype, listArchetypes } from '../src/waves/archetypes.js';
import { waveScaling, hpMultiplier, speedMultiplier } from '../src/waves/scaling.js';
import { buildSpawnSchedule } from '../src/waves/spawnSchedule.js';
import { generateMap } from '../src/maps/mapGenerator.js';
import { getBiome } from '../src/maps/biomes.js';
import { createRng } from '../src/core/rng.js';

function run(seed, waves, entranceCount = 2) {
  const d = new WaveDirector(seed, { entranceCount });
  return Array.from({ length: waves }, () => d.next());
}

test('the four archetypes exist', () => {
  assert.deepEqual(listArchetypes().map((a) => a.id).sort(), ['army', 'boss', 'commando', 'swarm']);
});

test('all archetypes appear and none repeats beyond its limit', () => {
  for (const seed of [1, 2, 3, 4, 5]) {
    const plans = run(seed, 300);
    const ids = plans.map((p) => p.archetype);
    for (const a of listArchetypes()) assert.ok(ids.includes(a.id), `${a.id} missing for seed ${seed}`);
    let run1 = 1;
    for (let i = 1; i < ids.length; i++) {
      run1 = ids[i] === ids[i - 1] ? run1 + 1 : 1;
      assert.ok(run1 <= getArchetype(ids[i]).maxRepeat, `${ids[i]} repeated ${run1}x at wave ${i + 1}`);
    }
  }
});

test('bosses arrive on a bounded cadence', () => {
  for (const seed of [11, 12, 13]) {
    const bossWaves = run(seed, 400).filter((p) => p.isBoss).map((p) => p.wave);
    assert.ok(bossWaves[0] >= FIRST_BOSS_WAVE && bossWaves[0] <= BOSS_MAX_GAP);
    for (let i = 1; i < bossWaves.length; i++) {
      const gap = bossWaves[i] - bossWaves[i - 1];
      assert.ok(gap >= BOSS_MIN_GAP && gap <= BOSS_MAX_GAP, `gap ${gap}`);
    }
  }
});

test('archetype compositions match their identity', () => {
  const rng = createRng(1);
  const wave = 20;
  const total = (p) => p.groups.reduce((s, g) => s + g.count, 0);
  const swarm = getArchetype('swarm').compose(wave, rng);
  const army = getArchetype('army').compose(wave, rng);
  const commando = getArchetype('commando').compose(wave, rng);
  const boss = getArchetype('boss').compose(wave, rng);
  assert.ok(total(swarm) > 50, 'swarm is a horde');
  assert.ok(Math.abs(army.groups[0].count - 12) <= 3, 'army is ~12 regulars');
  assert.ok(total(commando) <= 9 && commando.groups[0].category === 'elite', 'commando is a few elites');
  assert.equal(boss.groups[0].category, 'boss');
  assert.equal(boss.groups[0].count, 1);
});

test('scaling is monotonic, gentle early and finite forever', () => {
  let prev = 0;
  for (let w = 1; w <= 2000; w++) {
    const s = waveScaling(w);
    for (const v of Object.values(s)) assert.ok(Number.isFinite(v) && v > 0);
    assert.ok(s.hp >= prev);
    prev = s.hp;
    // never more than a 15% jump between consecutive waves
    if (w > 1) assert.ok(hpMultiplier(w) / hpMultiplier(w - 1) < 1.15, `spike at ${w}`);
  }
  assert.ok(hpMultiplier(10) < 3, 'early waves stay approachable');
  assert.ok(hpMultiplier(100) > 10 * hpMultiplier(10), 'wave 100 is much harder than wave 10');
  assert.ok(Number.isFinite(hpMultiplier(1e6)));
  assert.ok(speedMultiplier(1e6) < 1.33);
});

test('later waves bring traits and mixed compositions', () => {
  const plans = run(7, 120);
  const early = plans.slice(0, 7);
  const late = plans.slice(80);
  assert.ok(early.every((p) => p.traits.length === 0));
  assert.ok(late.some((p) => p.traits.length >= 2));
  assert.ok(late.some((p) => p.groups.length >= 2));
});

test('spawn schedules are sorted, complete and use valid routes', () => {
  const map = generateMap(getBiome('forest'), 5);
  const d = new WaveDirector(3, { entranceCount: map.routes.length });
  for (let i = 0; i < 60; i++) {
    const plan = d.next();
    const sched = buildSpawnSchedule(plan, map, createRng(i));
    assert.equal(sched.length, plan.total);
    for (let k = 1; k < sched.length; k++) assert.ok(sched[k].t >= sched[k - 1].t);
    for (const ev of sched) assert.ok(ev.route >= 0 && ev.route < map.routes.length);
  }
});
