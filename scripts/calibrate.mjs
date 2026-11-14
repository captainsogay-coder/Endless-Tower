// Tier calibration. Every unit's own fighting power must match its tier:
//
//   own value  = √(single-target × swarm) relative to the Cadet, measured in a
//                real headless battle (wave 1, level 0), abilities that deal
//                damage included, reach credited like the tier system charges it
//   target     = tierPower(tier) × role share (support/summoner/economy units
//                spend part of their budget on utility instead of own damage)
//
// The per-unit `power` trim in src/units/defs scales the generated damage, and
// damage scales the value linearly, so trim × target / value converges in two
// passes. Trims stay within [0.45, 1.6]; a unit that needs more is reported.
//
//   node scripts/calibrate.mjs          report
//   node scripts/calibrate.mjs --write  rewrite the trims in src/units/defs/*.js
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { registerRoster, ROSTER } from '../src/units/roster.js';
import { getUnit } from '../src/units/unitRegistry.js';
import { BENCH, ownCombat } from '../src/meta/sideTierBench.js';
import { TIERS, tierPower } from '../src/balance.js';

registerRoster();
BENCH.wave = 1;
BENCH.singleTime = 40;
BENCH.packTime = 40;
const write = process.argv.includes('--write');
const SKIP = new Set(['dude']); // weak alone by design: Dude Power scales with copies
const ref = ownCombat(getUnit('cadet'));
const rows = [];
for (const raw of ROSTER) {
  const def = getUnit(raw.id);
  const role = def.profile?.role ?? 'gunner';
  const target = tierPower(def.tier) * (TIERS.roles[role] ?? 1);
  const m = ownCombat(def, ref);
  const trim = def.profile?.power ?? 1;
  const next = Math.min(1.6, Math.max(0.45, trim * (target / m.value)));
  rows.push({ id: def.id, tier: def.tier, role, value: m.value, target, ratio: m.value / target, trim, next: Math.round(next * 100) / 100 });
}
for (const r of rows.sort((a, b) => a.tier - b.tier || a.id.localeCompare(b.id))) {
  const flag = SKIP.has(r.id) ? ' (skipped)' : r.next === 1.6 || r.next === 0.45 ? '  <-- at trim bound' : '';
  console.log(`T${String(r.tier).padStart(2)} ${r.id.padEnd(24)} ${r.role.padEnd(9)} value ${r.value.toFixed(2).padStart(6)} target ${r.target.toFixed(2).padStart(6)} ×${r.ratio.toFixed(2)}  trim ${r.trim.toFixed(2)} → ${r.next.toFixed(2)}${flag}`);
}
if (write) {
  const dir = new URL('../src/units/defs/', import.meta.url);
  const files = readdirSync(dir).filter((f) => f.endsWith('.js'));
  const texts = Object.fromEntries(files.map((f) => [f, readFileSync(new URL(f, dir), 'utf8')]));
  let changed = 0;
  for (const r of rows) {
    if (SKIP.has(r.id) || Math.abs(r.next - r.trim) < 0.015) continue; // measurement granularity
    const key = `\n  id: '${r.id}',`;
    const f = files.find((x) => texts[x].includes(key));
    let t = texts[f];
    const at = t.indexOf(key);
    const call = t.indexOf('tierUnit(', at);
    const nextId = t.indexOf("  id: '", at + 5);
    if (call < 0 || (nextId > 0 && nextId < call)) throw new Error(`no tierUnit call for ${r.id}`);
    const open = t.indexOf('{', call);
    const close = t.indexOf('}', open);
    let args = t.slice(open, close + 1);
    args = /power: [\d.]+/.test(args) ? args.replace(/power: [\d.]+/, `power: ${r.next}`) : args.replace(/ \}$/, `, power: ${r.next} }`);
    texts[f] = t.slice(0, open) + args + t.slice(close + 1);
    changed++;
  }
  for (const f of files) writeFileSync(new URL(f, dir), texts[f]);
  console.log(`rewrote ${changed} trims`);
}
