// Collection: an encyclopedia of every unit, grouped by summoning circle, with
// overall and per-circle completion; and the unit showcase – a live stage
// where a unit attacks a practice target at any upgrade level, next to its
// abilities and combat numbers.
//
// What stays hidden until a unit is obtained: its artwork (a silhouette is
// shown), description, abilities and statistics. Its name, tier, circle and
// drop chance are public anyway (the summoning circles list them).

import { listCirclesByPrice, isRareEntry } from '../units/summoning.js';
import { getUnit } from '../units/unitRegistry.js';
import { getTier } from '../units/tiers.js';
import { levelStats, maxLevel, upgradeCost } from '../units/unitStats.js';
import { unitPortrait } from '../render/unitArt.js';
import { makeCanvas } from '../render/canvas.js';
import { UnitStage } from '../render/unitStage.js';
import { formatNumber } from '../core/math.js';
import { esc } from './format.js';
import { sideTierStrip } from './sideTierView.js';

const $ = (id) => document.getElementById(id);
const pct = (c) => `${Math.round(c * 1000) / 10}%`;

const silCache = new Map();
/** A dark silhouette of a unit (undiscovered entries). */
function silhouette(def, size = 96) {
  const key = `${def.id}|${size}`;
  if (silCache.has(key)) return silCache.get(key);
  const img = new Image();
  img.src = unitPortrait(def.art, size, 0, null);
  const out = makeCanvas(size, size);
  const url = new Promise((res) => {
    img.onload = () => {
      const g = out.getContext('2d');
      g.drawImage(img, 0, 0, size, size);
      g.globalCompositeOperation = 'source-in';
      g.fillStyle = '#121410';
      g.fillRect(0, 0, size, size);
      res(out.toDataURL());
    };
  });
  silCache.set(key, url);
  return url;
}

const portraitCache = new Map();
function portraitOf(def, size = 96) {
  const key = `${def.id}|${size}`;
  if (!portraitCache.has(key)) portraitCache.set(key, unitPortrait(def.art, size, 0, def));
  return portraitCache.get(key);
}

/** Every circle with its units, plus the starter units; in the order players meet them. */
export function collectionGroups(starterUnits = []) {
  const groups = [{ id: 'starter', name: 'Starting units', entries: starterUnits.map((id) => ({ unit: id, chance: null })) }];
  for (const b of listCirclesByPrice()) groups.push({ id: b.id, name: b.name, price: b.price, entries: b.pool.map((p) => ({ unit: p.unit, chance: p.chance, chase: isRareEntry(p) })) });
  return groups;
}

/** Collection numbers for the profile: totals and per-circle completion. */
export function collectionProgress(profile, starterUnits = []) {
  const all = collectionGroups(starterUnits);
  const groups = all.map((g) => {
    const owned = g.entries.filter((e) => profile.isUnlocked(e.unit)).length;
    return { id: g.id, name: g.name, owned, total: g.entries.length, complete: owned === g.entries.length };
  });
  const ids = new Set(all.flatMap((g) => g.entries.map((e) => e.unit)));
  const owned = [...ids].filter((id) => profile.isUnlocked(id)).length;
  return { owned, total: ids.size, circlesComplete: groups.filter((g) => g.id !== 'starter' && g.complete).length, circles: groups.length - 1, groups };
}

/** The unit showcase dialog (shared by the encyclopedia and the summon preview). */
export class Showcase {
  constructor({ profile }) {
    this.profile = profile;
    this.root = $('screen-showcase');
    this.stage = new UnitStage($('sc-stage'));
    this.level = 0;
    $('sc-level').addEventListener('input', (ev) => {
      this.level = Number(ev.target.value);
      this.stage.setLevel(this.level);
      this.renderStats();
    });
    for (const id of ['sc-close', 'sc-done']) $(id).addEventListener('click', () => this.close());
    this.root.addEventListener('click', (ev) => ev.target === this.root && this.close());
    window.addEventListener('keydown', (ev) => ev.key === 'Escape' && !this.root.hidden && this.close());
  }

  /**
   * Opens a unit. `context` = { chance, circle, preview } – a preview from the
   * summoning circle shows the model of a unit not yet owned (chase units stay
   * a silhouette until summoned); abilities and numbers need ownership.
   */
  open(defId, context = {}) {
    const def = getUnit(defId);
    if (!def) return;
    this.def = def;
    this.ctx = context;
    const owned = this.profile.isUnlocked(defId);
    const showModel = owned || (context.preview && !context.chase);
    this.owned = owned;
    this.level = 0;
    const tier = getTier(def.tier);
    this.root.style.setProperty('--c', tier.color);
    $('sc-tier').textContent = tier.label;
    $('sc-tier').style.setProperty('--c', tier.color);
    $('sc-name').textContent = def.name;
    $('sc-meta').textContent = [context.circle, context.chance != null ? `${pct(context.chance)} chance` : null, owned ? `Obtained ×${Math.max(1, this.profile.ownedCount(defId))}` : 'Not obtained yet'].filter(Boolean).join(' · ');
    $('sc-role').textContent = owned || showModel ? def.role ?? '' : '';
    $('sc-desc').textContent = owned ? def.description ?? '' : showModel ? 'Summon it to learn its abilities.' : 'Revealed when summoned.';
    $('sc-ability').innerHTML = owned && def.passive ? `<h4>${esc(def.passive.name)}</h4><p>${esc(def.passive.summary)}</p>` : '';
    $('sc-sides').innerHTML = owned ? sideTierStrip(def) : '';
    const lvl = $('sc-level');
    lvl.max = String(maxLevel(def));
    lvl.value = '0';
    $('sc-level-row').hidden = !owned;
    this.stage.silhouette = !showModel;
    this.stage.setUnit(def, 0);
    this.renderStats();
    this.root.hidden = false;
    this.stage.start();
  }

  renderStats() {
    const el = $('sc-stats');
    if (!this.owned) {
      el.innerHTML = '';
      return;
    }
    const def = this.def;
    const s = levelStats(def, this.level);
    const hits = def.profile?.hits ?? 1;
    const cost = upgradeCost(def, this.level);
    const max = this.level >= maxLevel(def);
    $('sc-level-val').textContent = max ? `Level ${this.level} (max)` : `Level ${this.level}`;
    const rows = [
      ['Deployment cost', `${formatNumber(def.price)} coins`],
      ['Damage per hit', `${formatNumber(Math.round(s.damage * 10) / 10)}${hits > 1 ? ` ×${hits}` : ''}`],
      ['Attacks per second', (Math.round(s.rate * 100) / 100).toString()],
      ['Damage per second', formatNumber(Math.round(s.damage * s.rate * hits))],
      ['Range', `${(Math.round((s.range / 32) * 10) / 10).toString()} tiles`],
      ...(s.splash ? [['Area', `${(Math.round((s.splash / 32) * 10) / 10).toString()} tiles`]] : []),
      ['Next upgrade', max ? 'Fully upgraded' : `${formatNumber(cost)} coins`],
    ];
    el.innerHTML = rows.map(([k, v]) => `<tr><th>${esc(k)}</th><td class="num">${esc(v)}</td></tr>`).join('');
  }

  close() {
    this.root.hidden = true;
    this.stage.stop();
  }
}

/** The Collection page. */
export class CollectionView {
  constructor({ profile, starterUnits, showcase }) {
    this.profile = profile;
    this.starterUnits = starterUnits;
    this.showcase = showcase;
    this.page = $('screen-collection');
    this.page.addEventListener('click', (ev) => {
      const card = ev.target.closest('[data-unit]');
      if (card) this.showcase.open(card.dataset.unit, { circle: card.dataset.circle, chance: card.dataset.chance ? Number(card.dataset.chance) : null });
      const jump = ev.target.closest('[data-jump]');
      if (jump) $(`col-${jump.dataset.jump}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  show(on) {
    this.page.hidden = !on;
    if (on) this.render();
  }

  render() {
    const p = collectionProgress(this.profile, this.starterUnits);
    $('col-total').innerHTML = `<b class="num">${p.owned}</b> of <b class="num">${p.total}</b> units obtained · <b class="num">${p.circlesComplete}</b> of ${p.circles} circles complete`;
    $('col-bar').style.width = `${(p.owned / p.total) * 100}%`;
    $('col-circles').innerHTML = p.groups
      .map((g) => `<button type="button" class="col-circle ${g.complete ? 'complete' : ''}" data-jump="${esc(g.id)}"><span class="cc-name">${esc(g.name)}</span><span class="col-count num">${g.owned}/${g.total}</span><span class="col-mini"><span style="width:${(g.owned / g.total) * 100}%"></span></span>${g.complete ? '<span class="col-badge">Complete</span>' : ''}</button>`)
      .join('');
    const groups = collectionGroups(this.starterUnits);
    $('col-list').innerHTML = groups
      .map((g) => {
        const done = p.groups.find((x) => x.id === g.id);
        return `<section class="col-group" id="col-${esc(g.id)}">
          <h3>${esc(g.name)}${g.price ? `<span class="muted"> · ${formatNumber(g.price)} Tokens</span>` : ''}<span class="col-count num">${done.owned}/${done.total}</span></h3>
          <div class="col-grid">${g.entries.map((e) => this.card(e, g)).join('')}</div>
        </section>`;
      })
      .join('');
    // silhouettes are made asynchronously (image decode)
    for (const img of this.page.querySelectorAll('img[data-sil]')) {
      silhouette(getUnit(img.dataset.sil), 96).then((src) => {
        img.src = src;
      });
    }
  }

  card(e, g) {
    const def = getUnit(e.unit);
    const owned = this.profile.isUnlocked(e.unit);
    const tier = getTier(def.tier);
    const img = owned ? `<img alt="" src="${portraitOf(def)}" />` : `<img alt="" data-sil="${esc(def.id)}" />`;
    return `<button type="button" class="col-card ${owned ? 'owned' : 'locked'} ${e.chase ? 'chase' : ''}" style="--c:${tier.color}" data-unit="${esc(def.id)}" data-circle="${esc(g.name)}" ${e.chance != null ? `data-chance="${e.chance}"` : ''}>
      ${img}
      <span class="col-name">${esc(def.name)}</span>
      <span class="col-sub"><span style="color:${tier.color}">${esc(tier.label)}</span>${e.chance != null ? ` · ${pct(e.chance)}` : ''}</span>
      <span class="col-state">${owned ? `Obtained${this.profile.ownedCount(e.unit) > 1 ? ` ×${this.profile.ownedCount(e.unit)}` : ''}` : 'Undiscovered'}</span>
    </button>`;
  }
}
