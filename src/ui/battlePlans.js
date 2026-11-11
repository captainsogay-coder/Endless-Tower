// BATTLE PLANS — the pre-battle army screen. Pure view over the persistent
// Profile and the battle-plan model; it never touches game state directly.

import { listUnits, getUnit } from '../units/unitRegistry.js';
import { getTier } from '../units/tiers.js';
import { levelStats, maxLevel } from '../units/unitStats.js';
import { togglePlan, removeFromPlan, validatePlan, MAX_PLAN_TYPES } from '../meta/battlePlan.js';
import { listBiomes } from '../maps/biomes.js';
import { unitPortrait } from '../render/unitArt.js';
import { esc, tiles, upgradeRange, passiveScale } from './format.js';

const $ = (id) => document.getElementById(id);
const portraitCache = new Map();
export function portrait(def, size = 160) {
  const key = `${def.id}|${size}`;
  if (!portraitCache.has(key)) portraitCache.set(key, unitPortrait(def.art, size));
  return portraitCache.get(key);
}

export class BattlePlansView {
  constructor({ profile, onBattle }) {
    this.profile = profile;
    this.onBattle = onBattle;
    this.focusId = null;
    this.el = {
      name: $('plan-name'),
      count: $('plan-count'),
      state: $('plan-state'),
      roster: $('roster-grid'),
      rosterCount: $('roster-count'),
      dossier: $('dossier'),
      slots: $('army-slots'),
      realm: $('realm-select'),
      battle: $('btn-battle'),
      msg: $('battle-msg'),
      screen: $('screen-plans'),
    };
    this.bind();
  }

  get plan() {
    return this.profile.plan;
  }

  unlockedUnits() {
    return listUnits()
      .filter((u) => this.profile.isUnlocked(u.id))
      .sort((a, b) => a.tier - b.tier || a.price - b.price || a.name.localeCompare(b.name));
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
      const card = ev.target.closest('.unit-card');
      if (!card) return;
      this.toggle(card.dataset.id);
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
    });
    el.realm.addEventListener('change', () => {
      this.profile.data.realm = el.realm.value || null;
      this.profile.save();
    });
    el.battle.addEventListener('click', () => this.battle());
  }

  toggle(id) {
    this.focusId = id;
    const res = togglePlan(this.plan, id);
    if (!res.ok && res.reason === 'full') this.message(`A battle plan holds at most ${MAX_PLAN_TYPES} unit types. Remove one first.`, true);
    else this.message('');
    this.profile.save();
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
    this.onBattle({ units: v.ids, realm: this.profile.data.realm });
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
    this.renderRealms();
  }

  renderHeader() {
    const { el } = this;
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

  renderRoster(units) {
    this.el.rosterCount.textContent = `${units.length} unlocked`;
    const cards = units.map((def) => {
      const tier = getTier(def.tier);
      const s = levelStats(def, 0);
      const selected = this.plan.units.includes(def.id);
      return `<button class="unit-card ${selected ? 'selected' : ''} ${def.id === this.focusId ? 'focused' : ''}" data-id="${esc(def.id)}" aria-pressed="${selected}">
        <div class="uc-art"><img alt="" src="${portrait(def)}" /><span class="uc-tier">${esc(tier.label)}</span><span class="uc-pick">${selected ? 'In plan' : 'Add'}</span></div>
        <div class="uc-head"><h3>${esc(def.name)}</h3><span class="uc-price"><span class="coin sm"></span>${def.price}</span></div>
        <div class="uc-role">${esc(def.role ?? '')}</div>
        <dl class="uc-stats">
          <div><dt>Damage</dt><dd>${s.damage}</dd></div>
          <div><dt>Range</dt><dd>${tiles(s.range)}</dd></div>
          <div><dt>Speed</dt><dd>${s.rate.toFixed(2)}/s</dd></div>
        </dl>
        <div class="uc-foot">
          <div class="uc-line"><span class="k">Upgrades</span><span class="v">${maxLevel(def)} levels · ${upgradeRange(def)}</span></div>
          ${def.passive ? `<div class="uc-line"><span class="k">${esc(def.passive.name)}</span><span class="v">${esc(def.passive.summary)}</span></div>` : ''}
        </div>
      </button>`;
    });
    if (units.length < 4) cards.push('<div class="roster-note">New units will join the roster in future updates.</div>');
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
    const rows = def.levels
      .map((L, i) => `<tr class="${i === 0 ? 'current' : ''}"><td>${i === 0 ? 'Base' : `Lv ${i}`}</td><td>${i === 0 ? def.price : L.cost}</td><td>${L.damage}</td><td>${tiles(L.range)}</td><td>${L.rate.toFixed(2)}</td></tr>`)
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
          <dt>Purchase price</dt><dd>${def.price} gold</dd>
          <dt>Damage</dt><dd>${s.damage}</dd>
          <dt>Attack range</dt><dd>${tiles(s.range)} tiles</dd>
          <dt>Attack speed</dt><dd>${s.rate.toFixed(2)} / s</dd>
          <dt>Damage per second</dt><dd>${(s.damage * s.rate).toFixed(1)}</dd>
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
        <table class="levels"><thead><tr><th>Level</th><th>Cost</th><th>Dmg</th><th>Range</th><th>Speed</th></tr></thead><tbody>${rows}</tbody></table>
        <p class="muted small">Current upgrade level: <b>Base</b>. Each deployed copy is upgraded individually during battle, up to Lv ${maxLevel(def)}.</p>
      </div>
      <div class="ds-actions"><button class="${selected ? 'btn-secondary' : 'btn-primary'}" data-toggle="${esc(def.id)}">${selected ? 'Remove from plan' : 'Add to plan'}</button></div>`;
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

  renderRealms() {
    const current = this.profile.data.realm ?? '';
    const opts = [['', 'Random battlefield'], ...listBiomes().map((b) => [b.id, b.name])];
    const html = opts.map(([id, name]) => `<option value="${id}" ${id === current ? 'selected' : ''}>${esc(name)}</option>`).join('');
    if (this.el.realm.innerHTML !== html) this.el.realm.innerHTML = html;
  }
}
