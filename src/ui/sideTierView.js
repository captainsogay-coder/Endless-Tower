// Shared presentation of side tiers. Every screen that shows ratings uses
// these helpers, so the look, the N/A handling and the tooltips are identical
// in Battle Plans, the collection, the battle unit panel and summon results.
//
// Side tiers are shown as plain numbers on coloured bars; the overall tier
// keeps its Roman numeral ("Tier IV"), so the two are never confused.

import { CATEGORIES, sideTiers, ratingText, ratingDetail } from '../meta/sideTiers.js';
import { esc } from './format.js';

/** Bars are scaled so a rating of 20 fills the bar (higher ratings clip at full). */
const FULL = 20;
const fill = (v) => (v == null ? 0 : Math.max(0.06, Math.min(1, v / FULL)));

const tip = (def, c) => `${ratingDetail(def, c.id)}\n\n${c.name} measures: ${c.measures}`;

/**
 * Compact strip: five cells with a 3-letter code, the number and a thin bar.
 * `highlight` marks one category (the active sort/filter or Auto Pick priority).
 */
export function sideTierStrip(def, { highlight = null, label = true } = {}) {
  const r = sideTiers(def);
  const cells = CATEGORIES.map((c) => {
    const v = r[c.id];
    return `<span class="st-cell ${v == null ? 'na' : ''} ${highlight === c.id ? 'hl' : ''}" style="--c:${c.color}" title="${esc(tip(def, c))}">
      <span class="st-code">${c.label}</span><b class="st-num">${v == null ? '–' : ratingText(v)}</b><i class="st-bar"><i style="width:${fill(v) * 100}%"></i></i>
    </span>`;
  }).join('');
  return `<div class="st-strip" role="group" aria-label="Side tiers for ${esc(def.name)}: ${CATEGORIES.map((c) => `${c.name} ${ratingText(r[c.id])}`).join(', ')}">${label ? '<span class="st-label">Side tiers</span>' : ''}${cells}</div>`;
}

/**
 * Full readout for detail panels: one row per category with name, bar, number
 * and the measured explanation. `rank` (optional) returns e.g. "#2 of 14 owned".
 */
export function sideTierTable(def, { rank = null } = {}) {
  const r = sideTiers(def);
  const rows = CATEGORIES.map((c) => {
    const v = r[c.id];
    const rk = v != null && rank ? rank(c.id) : '';
    return `<li class="st-row ${v == null ? 'na' : ''}" style="--c:${c.color}" title="${esc(c.measures)}">
      <span class="st-name"><svg class="st-ico" aria-hidden="true"><use href="#i-st-${c.id}" /></svg>${c.name}</span>
      <i class="st-bar"><i style="width:${fill(v) * 100}%"></i></i>
      <b class="st-num">${v == null ? 'N/A' : ratingText(v)}</b>
      <span class="st-why">${esc(ratingDetail(def, c.id))}${rk ? ` <em>${esc(rk)}</em>` : ''}</span>
    </li>`;
  }).join('');
  return `<ul class="st-table" aria-label="Side tiers">${rows}</ul>`;
}

/** Legend/explainer shown once near filters: what each category measures. */
export function sideTierLegend() {
  return CATEGORIES.map((c) => `<span class="st-legend" style="--c:${c.color}" title="${esc(c.measures)}"><svg class="st-ico" aria-hidden="true"><use href="#i-st-${c.id}" /></svg>${c.label} = ${c.name}</span>`).join('');
}
