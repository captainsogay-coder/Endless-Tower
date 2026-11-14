// Unit comparison sheet. Every number comes from the same measured bench as
// the side tiers (a real headless battle at wave 10, level 0), so players
// compare what units actually do, not the damage printed on a card.
//
// One unit: its sheet. Two units: side by side with the multiple you gain,
// plus a one-line verdict about the investment.

import { getTier } from '../units/tiers.js';
import { sideTierRaw, sideTiers, ratingText } from '../meta/sideTiers.js';
import { esc, tiles } from './format.js';

const n1 = (v) => (v >= 1000 ? `${(v / 1000).toFixed(v >= 1e4 ? 0 : 1)}k` : v >= 100 ? String(Math.round(v)) : String(Math.round(v * 10) / 10));

/** Rows of the sheet: label, how to read a value, and whether more is better. */
function rows(def) {
  const r = sideTierRaw(def) ?? {};
  const st = sideTiers(def);
  return [
    { key: 'cost', label: 'Deployment cost', v: def.price, fmt: (v) => `${n1(v)} coins`, more: false },
    { key: 'hit', label: 'Damage per hit', v: r.hit ?? 0, fmt: (v, d) => `${n1(v)}${(d.hits ?? 1) > 1 ? ` × ${d.hits}` : ''}` },
    { key: 'rate', label: 'Attacks per second', v: r.rate ?? 0, fmt: (v) => v.toFixed(2) },
    { key: 'singleDps', label: 'Single-target DPS', hint: 'Measured on one tough target, abilities included', v: r.singleDps ?? 0, fmt: n1 },
    { key: 'packDps', label: 'Swarm DPS', hint: 'Its own damage per second against a pack of 10 enemies (area damage, chains, zones)', v: r.packDps ?? 0, fmt: n1 },
    { key: 'range', label: 'Range', v: r.range ?? 0, fmt: (v) => `${tiles(v)} tiles` },
    { key: 'abilityShare', label: 'From abilities', hint: 'How much of its single-target damage comes from abilities rather than plain attacks', v: Math.max(0, r.abilityShare ?? 0), pct: true, fmt: (v) => (v > 0.02 ? `+${Math.round(v * 100)}%` : 'none') },
    { key: 'summon', label: 'Summons', hint: 'Damage per second of the allies and drones it creates', v: r.summon ?? 0, fmt: (v) => (v > 0 ? `${n1(v)} DPS` : 'none') },
    { key: 'uplift', label: 'Buffs to allies', hint: 'Extra damage it gives a squad of nearby allies (including weaknesses it puts on enemies)', v: r.uplift ?? 0, pct: true, fmt: (v) => (v > 0.005 ? `+${Math.round(v * 100)}%` : 'none') },
    { key: 'grossPerMin', label: 'Income', hint: 'Extra coins per minute it actually produces', v: r.grossPerMin ?? 0, fmt: (v) => (v > 0 ? `${n1(v)} / min` : 'none') },
    { key: 'combat', label: 'Combat rating', hint: 'Its own damage, area damage and summons on the tier scale (1–20+)', v: r.combat ?? 0, fmt: (v) => ratingText(v), strong: true },
  ].map((x) => ({ ...x, st }));
}

function delta(a, b, more = true, pct = false) {
  if (pct) {
    // shares compare in percentage points, ignoring noise under 2 points
    const d = Math.round((a - b) * 100);
    return Math.abs(d) < 2 ? "" : `<span class="cmp-d">${d > 0 ? "+" : "−"}${Math.abs(d)} pts</span>`; // a different mix, not better or worse
  }
  if (!(a > 0) && !(b > 0)) return '';
  if (!(b > 0)) return `<span class="cmp-d up">new</span>`;
  if (!(a > 0)) return `<span class="cmp-d down">lost</span>`;
  const k = a / b;
  if (Math.abs(k - 1) < 0.03) return `<span class="cmp-d">same</span>`;
  const good = more ? k > 1 : k < 1;
  return `<span class="cmp-d ${good ? 'up' : 'down'}">×${k >= 10 ? Math.round(k) : k.toFixed(1)}</span>`;
}

/** The comparison sheet for `def`, optionally against `other`. */
export function combatSheet(def, other = null) {
  const A = rows(def);
  const B = other ? rows(other) : null;
  const ta = getTier(def.tier);
  const head = other
    ? `<tr><th></th><th style="--c:${ta.color}">${esc(def.name)}<small>${esc(ta.label)}</small></th><th style="--c:${getTier(other.tier).color}">${esc(other.name)}<small>${esc(getTier(other.tier).label)}</small></th><th></th></tr>`
    : '';
  const body = A.map((a, i) => {
    const b = B?.[i];
    return `<tr class="${a.strong ? 'strong' : ''}"><th scope="row"${a.hint ? ` title="${esc(a.hint)}"` : ''}>${esc(a.label)}</th><td>${a.fmt(a.v, def.profile ?? {})}</td>${b ? `<td>${b.fmt(b.v, other.profile ?? {})}</td><td>${delta(a.v, b.v, a.more !== false, a.pct)}</td>` : ''}</tr>`;
  }).join('');
  return `<table class="cmp-sheet ${other ? 'two' : ''}">${head ? `<thead>${head}</thead>` : ''}<tbody>${body}</tbody></table>${other ? `<p class="cmp-verdict">${verdict(def, other)}</p>` : ''}`;
}

/** One plain sentence about what the investment buys. */
function verdict(a, b) {
  const ra = sideTierRaw(a) ?? {};
  const rb = sideTierRaw(b) ?? {};
  const k = (x, y) => (y > 0 ? x / y : 0);
  const parts = [];
  const single = k(ra.singleDps, rb.singleDps);
  const swarm = k(ra.packDps, rb.packDps);
  if (single) parts.push(`${single >= 1 ? `${single.toFixed(1)}×` : `${Math.round(single * 100)}% of`} the single-target damage`);
  if (swarm && Math.abs(swarm - single) > 0.3) parts.push(`${swarm.toFixed(1)}× the swarm damage`);
  const cost = k(a.price, b.price);
  return `${esc(a.name)} deals ${parts.join(' and ')} of ${esc(b.name)}, for ${cost.toFixed(1)}× the cost.`;
}
