// Rewrites the price / damage / range / attack-speed / DPS columns of every unit
// row in README.md from the real unit definitions (level 0, global layer
// included), so the docs can never drift from the game. Run after rebalancing.
import { readFileSync, writeFileSync } from 'node:fs';
import { registerRoster, ROSTER } from '../src/units/roster.js';
import { getUnit } from '../src/units/unitRegistry.js';
import { levelStats } from '../src/units/unitStats.js';

registerRoster();
const byName = new Map(ROSTER.map((d) => [getUnit(d.id).name, getUnit(d.id)]));
const r1 = (v) => (v >= 100 ? String(Math.round(v * 10) / 10) : String(Math.round(v * 100) / 100));
const url = new URL('../README.md', import.meta.url);
let n = 0;
const out = readFileSync(url, 'utf8').split('\n').map((line) => {
  const cells = line.split('|').map((c) => c.trim());
  // | Name | Tier | Price | Damage | Range | Atk/s | DPS | Ability |
  if (cells.length < 10) return line;
  const def = byName.get(cells[1]);
  if (!def || !/^[IVXL]+$/.test(cells[2]) || !/^[\d,]+$/.test(cells[3])) return line;
  const s = levelStats(def, 0);
  const hits = def.profile?.hits ?? 1;
  cells[3] = def.price.toLocaleString('en-US');
  cells[4] = `${r1(s.damage)}${hits > 1 ? ` ×${hits}` : ''}`;
  cells[5] = r1(s.range / 32);
  cells[6] = s.rate < 0.15 ? `1 per ${r1(1 / s.rate)} s` : r1(s.rate);
  cells[7] = r1(s.damage * s.rate * hits);
  n++;
  return `| ${cells.slice(1, -1).join(' | ')} |`;
});
writeFileSync(url, out.join('\n'));
console.log(`updated ${n} unit rows`);
