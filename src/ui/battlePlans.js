// BATTLE PLANS — the pre-battle army screen. Pure view over the persistent
// Profile and the battle-plan model; it never touches game state directly.

import { listUnits, getUnit } from '../units/unitRegistry.js';
import { getTier } from '../units/tiers.js';
import { levelStats, maxLevel } from '../units/unitStats.js';
import { togglePlan, removeFromPlan, validatePlan, createPlan, MAX_PLAN_TYPES } from '../meta/battlePlan.js';
import { sortRoster, autoBuildPlan, planDiff } from '../meta/rosterOrder.js';
import { listBanners } from '../units/summoning.js';
import { unitPortrait } from '../render/unitArt.js';
import { esc, tiles, upgradeRange, passiveScale } from './format.js';

const $ = (id) => document.getElementById(id);
/** Stats shown to players: one decimal at most (the global balance layer makes fractions). */
const num = (v) => String(Math.round(v * 10) / 10);
const portraitCache = new Map();
export function portrait(def, size = 160) {
  const key = `${def.id}|${size}`;
  if (!portraitCache.has(key)) portraitCache.set(key, unitPortrait(def.art, size));
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
      sort: document.querySelector('.roster-sort'),
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

  /** Owned unit types in roster order: pinned first, then by tier or acquisition order. */
  unlockedUnits() {
    const p = this.profile;
    return sortRoster(
      listUnits().filter((u) => p.isUnlocked(u.id)),
      { isFavorite: (id) => p.isFavorite(id), acquiredIndex: (id) => p.acquiredIndex(id), mode: p.data.rosterSort },
    );
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
    el.sort.addEventListener('click', (ev) => {
      const b = ev.target.closest('[data-sort]');
      if (!b) return;
      this.profile.data.rosterSort = b.dataset.sort;
      this.profile.save();
      this.render();
    });
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

  // ---------------------------------------------------------- Auto Build

  proposedBuild() {
    const p = this.profile;
    const owned = listUnits().filter((u) => p.isUnlocked(u.id));
    return autoBuildPlan(owned, { acquiredIndex: (id) => p.acquiredIndex(id) });
  }

  openAutoBuild() {
    const next = this.proposedBuild();
    this.pendingBuild = next;
    const diff = planDiff(this.plan.units, next);
    const chip = (id, cls) => {
      const d = getUnit(id);
      return `<li class="ab-unit ${cls}" style="--c:${getTier(d.tier).color}"><img alt="" src="${portrait(d, 64)}" /><span class="ab-name">${esc(d.name)}</span><span class="ab-tier">${esc(getTier(d.tier).label)}</span></li>`;
    };
    const same = diff.added.length === 0 && diff.removed.length === 0 && next.every((id, i) => this.plan.units[i] === id);
    this.el.abBody.innerHTML = `
      <div class="ab-section"><h3>New plan · ${next.length} / ${MAX_PLAN_TYPES}</h3><ol class="ab-list">${next.map((id) => chip(id, diff.added.includes(id) ? 'added' : 'kept')).join('')}</ol></div>
      ${diff.added.length ? `<div class="ab-section"><h3>Will be added (${diff.added.length})</h3><ul class="ab-list">${diff.added.map((id) => chip(id, 'added')).join('')}</ul></div>` : ''}
      ${diff.removed.length ? `<div class="ab-section"><h3>Will be replaced (${diff.removed.length})</h3><ul class="ab-list">${diff.removed.map((id) => chip(id, 'removed')).join('')}</ul></div>` : ''}
      ${same ? '<p class="muted">Your plan already is the strongest selection.</p>' : ''}
      ${next.length < MAX_PLAN_TYPES ? `<p class="muted small">You own ${next.length} unit type${next.length === 1 ? '' : 's'}; all of them are included.</p>` : ''}
      <p class="muted small">Your current plan is kept for Undo.</p>`;
    this.el.abOk.disabled = same;
    this.el.abModal.hidden = false;
    this.el.abOk.focus();
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
    this.message('Auto Build applied. Use Undo Auto Build to restore your previous plan.');
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
    for (const b of el.sort.querySelectorAll('[data-sort]')) b.setAttribute('aria-pressed', String(b.dataset.sort === this.profile.data.rosterSort));
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

  /** Where a locked unit can be obtained: banner name and per-pull chance. */
  sourceOf(id) {
    for (const b of listBanners()) {
      const entry = b.pool.find((p) => p.unit === id);
      if (entry) return { banner: b, chance: entry.chance };
    }
    return null;
  }

  renderRoster(units) {
    const locked = listUnits().filter((u) => !this.profile.isUnlocked(u.id)).sort((a, b) => a.tier - b.tier);
    this.el.rosterCount.textContent = `${units.length} of ${units.length + locked.length} unlocked`;
    const cards = units.map((def) => {
      const tier = getTier(def.tier);
      const s = levelStats(def, 0);
      const selected = this.plan.units.includes(def.id);
      const pinned = this.profile.isFavorite(def.id);
      return `<div class="unit-card ${selected ? 'selected' : ''} ${pinned ? 'pinned' : ''} ${def.id === this.focusId ? 'focused' : ''}" role="button" tabindex="0" data-id="${esc(def.id)}" aria-pressed="${selected}">
        <div class="uc-art"><img alt="" src="${portrait(def)}" /><span class="uc-tier">${esc(tier.label)}</span><span class="uc-pick">${selected ? 'In plan' : 'Add'}</span>
          <button type="button" class="uc-fav ${pinned ? 'on' : ''}" data-fav="${esc(def.id)}" aria-pressed="${pinned}" aria-label="${pinned ? 'Unpin' : 'Pin'} ${esc(def.name)}" title="${pinned ? 'Unpin' : 'Pin to the front'}">${pinned ? '★' : '☆'}</button></div>
        <div class="uc-head"><h3>${esc(def.name)}</h3><span class="uc-price"><span class="coin sm"></span>${def.price}</span></div>
        <div class="uc-role">${esc(def.role ?? '')}</div>
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
    const pinnedCount = units.filter((d) => this.profile.isFavorite(d.id)).length;
    if (pinnedCount && pinnedCount < units.length) cards.splice(pinnedCount, 0, '<div class="roster-divider" aria-hidden="true"></div>');
    if (locked.length) {
      cards.push('<div class="section-head roster-sub"><h2>Not yet obtained</h2><span class="muted">Unlock these by summoning</span></div>');
      for (const def of locked) {
        const tier = getTier(def.tier);
        const src = this.sourceOf(def.id);
        cards.push(`<button class="unit-card locked ${def.id === this.focusId ? 'focused' : ''}" data-id="${esc(def.id)}" data-name="${esc(def.name)}" aria-disabled="true">
          <div class="uc-art"><img alt="" src="${portrait(def)}" /><span class="uc-tier">${esc(tier.label)}</span><span class="uc-pick">Locked</span></div>
          <div class="uc-head"><h3>${esc(def.name)}</h3><span class="uc-price"><span class="coin sm"></span>${def.price}</span></div>
          <div class="uc-role">${esc(def.role ?? '')}</div>
          <div class="uc-foot"><div class="uc-line"><span class="k">Obtain</span><span class="v">${src ? `${esc(src.banner.name)} · ${Math.round(src.chance * 100)}% per summon` : 'Not available yet'}</span></div></div>
        </button>`);
      }
    }
    this.el.roster.innerHTML = cards.join('');
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
          ${src ? `<dt>Summon chance</dt><dd>${Math.round(src.chance * 100)}%</dd><dt>Times obtained</dt><dd>${this.profile.ownedCount(def.id)}</dd>` : ''}
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
