// BATTLE PLANS — the pre-battle army screen. Pure view over the persistent
// Profile and the battle-plan model; it never touches game state directly.

import { listUnits, getUnit } from '../units/unitRegistry.js';
import { getTier } from '../units/tiers.js';
import { levelStats, maxLevel } from '../units/unitStats.js';
import { togglePlan, removeFromPlan, validatePlan, createPlan, MAX_PLAN_TYPES } from '../meta/battlePlan.js';
import { sortRoster, filterRoster, autoBuildPlan, planDiff, isSideMode } from '../meta/rosterOrder.js';
import { listCirclesByPrice } from '../units/summoning.js';
import { CATEGORIES, categoryOf, sideTiers, ratingKey } from '../meta/sideTiers.js';
import { sideTierStrip, sideTierTable } from './sideTierView.js';
import { unitPortrait } from '../render/unitArt.js';
import { esc, tiles, upgradeRange, passiveScale } from './format.js';

const $ = (id) => document.getElementById(id);
/** Stats shown to players: one decimal at most (the global balance layer makes fractions). */
const num = (v) => String(Math.round(v * 10) / 10);
/** Drop chances keep sub-percent precision (0.5%, 2.5%). */
const pctText = (c) => `${Math.round(c * 10000) / 100}%`;
const portraitCache = new Map();
export function portrait(def, size = 160) {
  const key = `${def.id}|${size}`;
  if (!portraitCache.has(key)) portraitCache.set(key, unitPortrait(def.art, size, 0, def));
  return portraitCache.get(key);
}

export class BattlePlansView {
  constructor({ profile, onBattle, onGoto }) {
    this.profile = profile;
    this.onBattle = onBattle;
    this.onGoto = onGoto;
    this.focusId = null;
    this.el = {
      name: $('plan-name'),
      count: $('plan-count'),
      state: $('plan-state'),
      roster: $('roster-grid'),
      rosterCount: $('roster-count'),
      dossier: $('dossier'),
      slots: $('army-slots'),
      battle: $('btn-battle'),
      msg: $('battle-msg'),
      screen: $('screen-plans'),
      sort: $('roster-sort'),
      side: document.querySelector('.rt-focus'),
      circle: $('roster-circle'),
      own: document.querySelector('.rt-own'),
      reset: $('roster-reset'),
      abPrimary: $('ab-primary'),
      abSecondary: $('ab-secondary'),
      abRule: $('ab-rule'),
      autobuild: $('btn-autobuild'),
      undo: $('btn-undo-build'),
      abModal: $('screen-autobuild'),
      abBody: $('autobuild-body'),
      abOk: $('btn-autobuild-ok'),
    };
    this.bind();
  }

  get plan() {
    return this.profile.plan;
  }

  /** Owned unit types in roster order: pinned first, then by the chosen sort. */
  unlockedUnits() {
    const p = this.profile;
    return sortRoster(
      listUnits().filter((u) => p.isUnlocked(u.id)),
      { isFavorite: (id) => p.isFavorite(id), acquiredIndex: (id) => p.acquiredIndex(id), mode: p.data.rosterSort },
    );
  }

  /** The collection after the player's filters (ownership, circle, side tier). */
  filtered(defs) {
    const p = this.profile;
    return filterRoster(defs, { ...p.data.rosterFilter, isOwned: (id) => p.isUnlocked(id), circleOf: (id) => this.sourceOf(id)?.banner ?? null });
  }

  setFilter(patch) {
    Object.assign(this.profile.data.rosterFilter, patch);
    this.profile.save();
    this.render();
  }

  bind() {
    const { el } = this;
    el.name.addEventListener('input', () => {
      this.plan.name = el.name.value.slice(0, 32);
      this.profile.save();
    });
    el.name.addEventListener('blur', () => {
      if (!el.name.value.trim()) {
        this.plan.name = 'Battle Plan';
        el.name.value = this.plan.name;
        this.profile.save();
      }
    });
    el.roster.addEventListener('click', (ev) => {
      // the star pins/unpins the unit TYPE; it never touches the plan
      const fav = ev.target.closest('.uc-fav');
      if (fav) {
        ev.stopPropagation();
        this.toggleFavorite(fav.dataset.fav);
        return;
      }
      const card = ev.target.closest('.unit-card');
      if (!card) return;
      if (card.classList.contains('locked')) {
        this.focusId = card.dataset.id;
        this.message(`${card.dataset.name} is obtained by summoning. Open the Summoning tab to try for it.`);
        this.render();
        return;
      }
      this.toggle(card.dataset.id);
    });
    el.roster.addEventListener('keydown', (ev) => {
      if ((ev.key === 'Enter' || ev.key === ' ') && ev.target.classList.contains('unit-card')) {
        ev.preventDefault();
        ev.target.click();
      }
    });
    el.sort.addEventListener('change', () => {
      this.profile.data.rosterSort = el.sort.value;
      this.profile.save();
      this.render();
    });
    el.side.addEventListener('click', (ev) => {
      const b = ev.target.closest('[data-side]');
      if (!b) return;
      const side = b.dataset.side || null;
      // focusing a role also ranks by it; going back to all roles restores the overall-tier order
      const d = this.profile.data;
      if (side) d.rosterSort = side;
      else if (isSideMode(d.rosterSort)) d.rosterSort = 'tier';
      this.setFilter({ side });
    });
    el.circle.addEventListener('change', () => this.setFilter({ circle: el.circle.value }));
    el.own.addEventListener('click', (ev) => {
      const b = ev.target.closest('[data-own]');
      if (b) this.setFilter({ ownership: b.dataset.own });
    });
    el.reset.addEventListener('click', () => {
      if (isSideMode(this.profile.data.rosterSort)) this.profile.data.rosterSort = 'tier';
      this.setFilter({ ownership: 'all', circle: 'all', side: null });
    });
    const prio = (box, key) =>
      box.addEventListener('click', (ev) => {
        const b = ev.target.closest('[data-prio]');
        if (!b) return;
        const ap = this.profile.data.autoPick;
        ap[key] = b.dataset.prio || null;
        if (key === 'primary' && (!ap.primary || ap.secondary === ap.primary)) ap.secondary = null;
        this.profile.save();
        this.renderAutoBuild();
      });
    prio(el.abPrimary, 'primary');
    prio(el.abSecondary, 'secondary');
    el.autobuild.addEventListener('click', () => this.openAutoBuild());
    el.undo.addEventListener('click', () => this.undoAutoBuild());
    $('btn-autobuild-cancel').addEventListener('click', () => this.closeAutoBuild());
    el.abOk.addEventListener('click', () => this.applyAutoBuild());
    el.abModal.addEventListener('click', (ev) => ev.target === el.abModal && this.closeAutoBuild());
    window.addEventListener('keydown', (ev) => {
      if (!el.abModal.hidden && ev.key === 'Escape') this.closeAutoBuild();
    });
    el.slots.addEventListener('click', (ev) => {
      const x = ev.target.closest('.slot-x');
      if (x) {
        removeFromPlan(this.plan, x.dataset.id);
        this.profile.save();
        this.render();
        return;
      }
      const slot = ev.target.closest('.slot.filled');
      if (slot) {
        this.focusId = slot.dataset.id;
        this.render();
      }
    });
    el.dossier.addEventListener('click', (ev) => {
      const b = ev.target.closest('[data-toggle]');
      if (b) this.toggle(b.dataset.toggle);
      const f = ev.target.closest('[data-fav]');
      if (f) this.toggleFavorite(f.dataset.fav);
      if (ev.target.closest('[data-goto="summon"]')) this.onGoto?.('summon');
    });
    el.battle.addEventListener('click', () => this.battle());
  }

  toggle(id) {
    this.focusId = id;
    if (!this.profile.isUnlocked(id)) return;
    const res = togglePlan(this.plan, id);
    if (!res.ok && res.reason === 'full') this.message(`A battle plan holds at most ${MAX_PLAN_TYPES} unit types. Remove one first.`, true);
    else this.message('');
    this.profile.save();
    this.render();
  }

  toggleFavorite(id) {
    const on = this.profile.toggleFavorite(id);
    if (on === null) return;
    this.focusId = id;
    this.message(on ? `${getUnit(id).name} pinned to the front of the roster.` : `${getUnit(id).name} unpinned.`);
    this.render();
  }

  // ---------------------------------------------------------- Auto Pick

  proposedBuild() {
    const p = this.profile;
    const owned = listUnits().filter((u) => p.isUnlocked(u.id));
    const { primary, secondary } = p.data.autoPick;
    return autoBuildPlan(owned, { acquiredIndex: (id) => p.acquiredIndex(id), primary, secondary });
  }

  openAutoBuild() {
    this.renderAutoBuild();
    this.el.abModal.hidden = false;
    this.el.abOk.focus();
  }

  /** Priority buttons + live preview of the plan Auto Pick would build. */
  renderAutoBuild() {
    const { primary, secondary } = this.profile.data.autoPick;
    const seg = (key, current, noneLabel, disabled = false) =>
      [{ id: '', name: noneLabel, color: null }, ...CATEGORIES]
        .map((c) => {
          const on = (current ?? '') === c.id;
          const off = disabled || (key === 'secondary' && c.id && c.id === primary);
          return `<button type="button" role="radio" aria-checked="${on}" data-prio="${c.id}" ${off ? 'disabled' : ''} ${c.color ? `style="--c:${c.color}"` : ''}>${c.id ? `<svg class="st-ico"><use href="#i-st-${c.id}" /></svg>` : ''}${esc(c.name)}</button>`;
        })
        .join('');
    this.el.abPrimary.innerHTML = seg('primary', primary, 'Balanced');
    this.el.abSecondary.innerHTML = seg('secondary', secondary, 'None', !primary);
    const pc = categoryOf(primary);
    const sc = categoryOf(secondary);
    this.el.abRule.textContent = pc
      ? `Ranked by ${pc.name} side tier${sc ? `, then ${sc.name}` : ''}, then overall tier, then measured strength; units without ${pc.name} (N/A) fill the remaining slots.`
      : 'Ranked by overall tier, then measured strength, then the order you got them.';
    const next = this.proposedBuild();
    this.pendingBuild = next;
    const diff = planDiff(this.plan.units, next);
    const chip = (id, cls) => {
      const d = getUnit(id);
      const v = primary ? sideTiers(d)[primary] : null;
      const tag = primary ? `<span class="ab-side" style="--c:${pc.color}">${pc.label} ${v == null ? '–' : Math.max(1, Math.round(v))}</span>` : '';
      const mark = cls === 'added' ? '<span class="ab-mark">New</span>' : cls === 'kept' ? '<span class="ab-mark">Kept</span>' : '<span class="ab-mark">Out</span>';
      return `<li class="ab-unit ${cls}" style="--c:${getTier(d.tier).color}"><img alt="" src="${portrait(d, 64)}" /><span class="ab-name">${esc(d.name)}</span><span class="ab-tier">${esc(getTier(d.tier).label)}</span>${tag}${mark}</li>`;
    };
    const same = diff.added.length === 0 && diff.removed.length === 0 && next.every((id, i) => this.plan.units[i] === id);
    this.el.abBody.innerHTML = `
      <div class="ab-section"><h3>New plan · ${next.length} / ${MAX_PLAN_TYPES}<span class="ab-sum">${diff.added.length} new · ${diff.kept.length} kept · ${diff.removed.length} replaced</span></h3><ol class="ab-list">${next.map((id) => chip(id, diff.added.includes(id) ? 'added' : 'kept')).join('')}</ol></div>
      ${diff.removed.length ? `<div class="ab-section"><h3>Will be replaced (${diff.removed.length})</h3><ul class="ab-list">${diff.removed.map((id) => chip(id, 'removed')).join('')}</ul></div>` : ''}
      ${same ? '<p class="muted">Your plan already matches this selection.</p>' : ''}
      ${next.length < MAX_PLAN_TYPES ? `<p class="muted small">You own ${next.length} unit type${next.length === 1 ? '' : 's'}; all of them are included.</p>` : ''}
      <p class="muted small">Your current plan is kept for Undo.</p>`;
    this.el.abOk.disabled = same;
  }

  closeAutoBuild() {
    this.el.abModal.hidden = true;
    this.pendingBuild = null;
  }

  applyAutoBuild() {
    const next = this.pendingBuild;
    if (!next) return;
    const p = this.profile;
    p.data.planBackup = createPlan(this.plan.name, this.plan.units);
    this.plan.units = [...next];
    p.save();
    this.closeAutoBuild();
    this.focusId = next[0] ?? this.focusId;
    this.message('Auto Pick applied. Use Undo Auto Pick to restore your previous plan.');
    this.render();
  }

  undoAutoBuild() {
    const p = this.profile;
    const backup = p.data.planBackup;
    if (!backup) return;
    // only restore units that are still owned (they always are: ownership never shrinks)
    this.plan.units = backup.units.filter((id) => getUnit(id) && p.isUnlocked(id));
    this.plan.name = backup.name;
    p.data.planBackup = null;
    p.save();
    this.message('Previous plan restored.');
    this.render();
  }

  message(text, error = false) {
    this.el.msg.textContent = text;
    this.el.msg.classList.toggle('error', error);
  }

  validate() {
    return validatePlan(this.plan, { isKnown: (id) => !!getUnit(id), isUnlocked: (id) => this.profile.isUnlocked(id) });
  }

  battle() {
    const v = this.validate();
    if (!v.ok) {
      // Drop anything stale (e.g. a unit removed from the game) but keep the rest.
      if (v.ids.length) {
        this.plan.units = v.ids;
        this.profile.save();
        this.render();
        return this.battle();
      }
      this.message('Select at least one unit to battle.', true);
      return;
    }
    this.plan.units = v.ids;
    this.profile.save();
    this.message('');
    this.onBattle({ units: v.ids });
  }

  show(on = true) {
    this.el.screen.hidden = !on;
    if (on) this.render();
  }

  render() {
    const units = this.unlockedUnits();
    if (!this.focusId || !getUnit(this.focusId)) this.focusId = this.plan.units[0] ?? units[0]?.id ?? null;
    this.renderHeader();
    this.renderRoster(units);
    this.renderDossier();
    this.renderSlots();
  }

  renderHeader() {
    const { el } = this;
    el.undo.hidden = !this.profile.data.planBackup;
    el.autobuild.disabled = !listUnits().some((u) => this.profile.isUnlocked(u.id));
    const d = this.profile.data;
    el.sort.value = d.rosterSort;
    const f = d.rosterFilter;
    for (const b of el.side.querySelectorAll('[data-side]')) b.setAttribute('aria-pressed', String((b.dataset.side || null) === f.side));
    for (const b of el.own.querySelectorAll('[data-own]')) b.setAttribute('aria-pressed', String(b.dataset.own === f.ownership));
    const circles = listCirclesByPrice();
    if (f.circle !== 'all' && f.circle !== 'starter' && !circles.some((c) => c.id === f.circle)) f.circle = 'all';
    el.circle.innerHTML = [`<option value="all">All circles</option>`, `<option value="starter">Starter units</option>`, ...circles.map((c) => `<option value="${esc(c.id)}">${esc(c.name)} · ${c.price} Tokens</option>`)].join('');
    el.circle.value = f.circle;
    el.reset.hidden = f.ownership === 'all' && f.circle === 'all' && !f.side;
    const n = this.plan.units.length;
    if (document.activeElement !== el.name) el.name.value = this.plan.name;
    el.count.textContent = n;
    el.state.className = 'state-tag';
    if (n === 0) el.state.textContent = 'Empty plan';
    else if (n >= MAX_PLAN_TYPES) {
      el.state.textContent = 'Plan complete';
      el.state.classList.add('full');
    } else {
      el.state.textContent = 'Ready for battle';
      el.state.classList.add('ready');
    }
    el.battle.disabled = n === 0;
    if (n === 0 && !el.msg.classList.contains('error')) this.message('Select at least one unit to battle.');
    else if (n > 0 && !el.msg.classList.contains('error')) this.message(`${n} unit type${n > 1 ? 's' : ''} ready. Copies are unlimited in battle.`);
  }

  /** Where a unit can be obtained: circle and per-pull chance (null for starter units). */
  sourceOf(id) {
    for (const b of listCirclesByPrice()) {
      const entry = b.pool.find((p) => p.unit === id);
      if (entry) return { banner: b, chance: entry.chance };
    }
    return null;
  }

  renderRoster(allOwned) {
    const p = this.profile;
    const f = p.data.rosterFilter;
    const mode = p.data.rosterSort;
    const hl = isSideMode(mode) ? mode : f.side;
    const units = this.filtered(allOwned);
    const lockedAll = listUnits().filter((u) => !p.isUnlocked(u.id));
    // locked units follow the same sort (minus pins), so "best Economy I don't own yet" is easy to find
    const locked = sortRoster(this.filtered(lockedAll), { acquiredIndex: () => 0, mode: mode === 'acquired' ? 'tier' : mode });
    const total = allOwned.length + lockedAll.length;
    const shown = units.length + locked.length;
    this.el.rosterCount.textContent = `${allOwned.length} of ${total} owned${shown < total ? ` · ${shown} shown` : ''}`;
    const cards = units.map((def) => {
      const tier = getTier(def.tier);
      const s = levelStats(def, 0);
      const selected = this.plan.units.includes(def.id);
      const pinned = p.isFavorite(def.id);
      return `<div class="unit-card ${selected ? 'selected' : ''} ${pinned ? 'pinned' : ''} ${def.id === this.focusId ? 'focused' : ''}" role="button" tabindex="0" data-id="${esc(def.id)}" aria-pressed="${selected}" style="--tc:${tier.color}">
        <div class="uc-art"><img alt="" src="${portrait(def)}" /><span class="uc-tier">${esc(tier.label)}</span><span class="uc-pick">${selected ? 'In plan' : 'Add'}</span>
          <button type="button" class="uc-fav ${pinned ? 'on' : ''}" data-fav="${esc(def.id)}" aria-pressed="${pinned}" aria-label="${pinned ? 'Unpin' : 'Pin'} ${esc(def.name)}" title="${pinned ? 'Unpin' : 'Pin to the front'}"><svg><use href="#i-pin" /></svg></button></div>
        <div class="uc-head"><h3>${esc(def.name)}</h3><span class="uc-price"><span class="coin sm"></span>${def.price}</span></div>
        <div class="uc-role">${esc(def.role ?? '')}</div>
        ${sideTierStrip(def, { highlight: hl, label: false })}
        <dl class="uc-stats">
          <div><dt>Damage</dt><dd>${num(s.damage)}</dd></div>
          <div><dt>Range</dt><dd>${tiles(s.range)}</dd></div>
          <div><dt>Speed</dt><dd>${s.rate.toFixed(2)}/s</dd></div>
        </dl>
        <div class="uc-foot">
          <div class="uc-line"><span class="k">Upgrades</span><span class="v">${maxLevel(def)} levels · ${upgradeRange(def)}</span></div>
          ${def.passive ? `<div class="uc-line"><span class="k">${esc(def.passive.name)}</span><span class="v">${esc(def.passive.summary)}</span></div>` : ''}
        </div>
      </div>`;
    });
    const pinnedCount = units.filter((d) => p.isFavorite(d.id)).length;
    if (pinnedCount && pinnedCount < units.length) cards.splice(pinnedCount, 0, '<div class="roster-divider" aria-hidden="true"></div>');
    if (!units.length && f.ownership !== 'locked') {
      cards.push(`<div class="roster-empty">${allOwned.length ? 'No owned unit matches these filters.' : 'You do not own any units yet.'}${f.side ? ` <span class="muted">Units with N/A in ${esc(categoryOf(f.side).name)} are hidden.</span>` : ''}</div>`);
    }
    if (locked.length) {
      cards.push(`<div class="section-head roster-sub"><h2>Not yet obtained</h2><span class="muted">Unlock these by summoning</span></div>`);
      for (const def of locked) {
        const tier = getTier(def.tier);
        const src = this.sourceOf(def.id);
        cards.push(`<button class="unit-card locked ${def.id === this.focusId ? 'focused' : ''}" data-id="${esc(def.id)}" data-name="${esc(def.name)}" aria-disabled="true" style="--tc:${tier.color}">
          <div class="uc-art"><img alt="" src="${portrait(def)}" /><span class="uc-tier">${esc(tier.label)}</span><span class="uc-pick">Locked</span></div>
          <div class="uc-head"><h3>${esc(def.name)}</h3><span class="uc-price"><span class="coin sm"></span>${def.price}</span></div>
          <div class="uc-role">${esc(def.role ?? '')}</div>
          ${sideTierStrip(def, { highlight: hl, label: false })}
          <div class="uc-foot"><div class="uc-line"><span class="k">Obtain</span><span class="v">${src ? `${esc(src.banner.name)} · ${pctText(src.chance)} per summon` : 'Not available yet'}</span></div></div>
        </button>`);
      }
    }
    this.el.roster.innerHTML = cards.join('');
  }

  /** "#2 of 14 owned" – where a unit stands among the player's units in one side tier. */
  rankAmongOwned(def, cat) {
    const owned = listUnits().filter((u) => this.profile.isUnlocked(u.id) && sideTiers(u)[cat] != null);
    const mine = ratingKey(sideTiers(def)[cat]);
    if (mine < 0) return '';
    const better = owned.filter((u) => ratingKey(sideTiers(u)[cat]) > mine).length;
    return this.profile.isUnlocked(def.id) ? `#${better + 1} of ${owned.length} owned` : owned.length ? `would rank #${better + 1} of ${owned.length + 1}` : '';
  }

  renderDossier() {
    const def = this.focusId ? getUnit(this.focusId) : null;
    if (!def) {
      this.el.dossier.innerHTML = '<div class="ds-empty">Select a unit to see its details.</div>';
      return;
    }
    const tier = getTier(def.tier);
    const s = levelStats(def, 0);
    const selected = this.plan.units.includes(def.id);
    const unlocked = this.profile.isUnlocked(def.id);
    const hasSplash = def.levels.some((L) => L.splash);
    const src = this.sourceOf(def.id);
    // the same stats as in battle (level table + global balance layer + per-level growth)
    const rows = def.levels
      .map((L, i) => {
        const v = levelStats(def, i);
        return `<tr class="${i === 0 ? 'current' : ''}"><td>${i === 0 ? 'Base' : `Lv ${i}`}</td><td>${i === 0 ? def.price : L.cost}</td><td>${num(v.damage)}</td><td>${tiles(v.range)}</td><td>${v.rate.toFixed(2)}</td>${hasSplash ? `<td>${tiles(v.splash ?? 0)}</td>` : ''}</tr>`;
      })
      .join('');
    const scale = def.passive?.bonus
      ? `<div class="scale-row">${passiveScale(def).map(([n, b]) => `<div><b>+${Math.round(b * 100)}%</b><span>${n} deployed</span></div>`).join('')}</div>`
      : '';
    this.el.dossier.innerHTML = `
      <div class="ds-top">
        <div class="ds-art"><img alt="" src="${portrait(def)}" /></div>
        <div><h2>${esc(def.name)}</h2><div class="ds-sub">${esc(tier.label)} · ${esc(def.role ?? '')}</div></div>
      </div>
      <p class="ds-desc">${esc(def.description ?? '')}</p>
      <div class="ds-section">
        <h3>Side tiers <span class="muted small">vs overall ${esc(tier.label)}</span></h3>
        ${sideTierTable(def, { rank: (c) => this.rankAmongOwned(def, c) })}
      </div>
      <div class="ds-section">
        <h3>Base statistics</h3>
        <dl class="kv">
          <dt>Purchase price</dt><dd>${def.price} coins</dd>
          <dt>Damage</dt><dd>${num(s.damage)}</dd>
          <dt>Attack range</dt><dd>${tiles(s.range)} tiles</dd>
          <dt>Attack speed</dt><dd>${s.rate.toFixed(2)} / s</dd>
          <dt>Damage per second</dt><dd>${(s.damage * s.rate).toFixed(1)}</dd>
          ${s.splash ? `<dt>Blast radius</dt><dd>${tiles(s.splash)} tiles</dd>` : ''}
          ${def.impactHazard ? `<dt>Burning ground</dt><dd>${def.impactHazard.duration}s</dd>` : ''}
          <dt>Targeting</dt><dd>${esc(def.targeting === 'first' ? 'Furthest along' : def.targeting)}</dd>
        </dl>
      </div>
      ${def.passive ? `<div class="ds-section">
        <h3>Passive ability</h3>
        <div class="passive-name">${esc(def.passive.name)}</div>
        <div>${esc(def.passive.summary)}</div>
        ${def.passive.formula ? `<code class="passive-formula">${esc(def.passive.formula)}</code>` : ''}
        ${scale}
      </div>` : ''}
      <div class="ds-section">
        <h3>Upgrade levels</h3>
        <table class="levels"><thead><tr><th>Level</th><th>Cost</th><th>Dmg</th><th>Range</th><th>Speed</th>${hasSplash ? '<th>Blast</th>' : ''}</tr></thead><tbody>${rows}</tbody></table>
        <p class="muted small">Current upgrade level: <b>Base</b>. Each deployed copy is upgraded individually during battle, up to Lv ${maxLevel(def)}.</p>
      </div>
      <div class="ds-section">
        <h3>Acquisition</h3>
        <dl class="kv">
          <dt>Status</dt><dd>${unlocked ? 'Unlocked' : 'Locked'}</dd>
          <dt>Source</dt><dd>${src ? esc(src.banner.name) : 'Starter unit'}</dd>
          ${src ? `<dt>Summon chance</dt><dd>${pctText(src.chance)}</dd><dt>Times obtained</dt><dd>${this.profile.ownedCount(def.id)}</dd>` : ''}
        </dl>
      </div>
      <div class="ds-actions">${unlocked
        ? `<button class="${selected ? 'btn-secondary' : 'btn-primary'}" data-toggle="${esc(def.id)}">${selected ? 'Remove from plan' : 'Add to plan'}</button>
           <button class="btn-secondary ds-fav" data-fav="${esc(def.id)}" aria-pressed="${this.profile.isFavorite(def.id)}">${this.profile.isFavorite(def.id) ? '★ Unpin' : '☆ Pin to front'}</button>`
        : `<button class="btn-secondary" data-goto="summon">Go to Summoning</button>`}</div>`;
  }

  renderSlots() {
    const out = [];
    for (let i = 0; i < MAX_PLAN_TYPES; i++) {
      const id = this.plan.units[i];
      const def = id ? getUnit(id) : null;
      if (def) {
        out.push(`<li class="slot filled" data-id="${esc(def.id)}" title="${esc(def.name)}"><span class="slot-n">${i + 1}</span><img alt="" src="${portrait(def, 96)}" /><span class="slot-name">${esc(def.name)}</span><button class="slot-x" data-id="${esc(def.id)}" aria-label="Remove ${esc(def.name)}">×</button></li>`);
      } else {
        out.push(`<li class="slot"><span class="slot-n">${i + 1}</span></li>`);
      }
    }
    this.el.slots.innerHTML = out.join('');
  }

}
