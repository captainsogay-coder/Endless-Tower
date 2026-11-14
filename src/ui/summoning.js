// SUMMONING page: banner, pool odds, x1/x5/x10/x25 with confirmation, and the
// reveal sequence (skippable) followed by a results summary.

import { getBanner, listCirclesByPrice, summon, summonCost, duplicateCompensation, isRare, SUMMON_CONFIG } from '../units/summoning.js';
import { BALANCE } from '../balance.js';
import { getUnit } from '../units/unitRegistry.js';
import { getTier } from '../units/tiers.js';
import { SummonStage, RevealSequence } from '../render/summonFx.js';
import { formatNumber } from '../core/math.js';
import { createRng } from '../core/rng.js';
import * as sfx from '../audio/sfx.js';
import { esc } from './format.js';
import { portrait } from './battlePlans.js';
import { sideTierStrip } from './sideTierView.js';

const $ = (id) => document.getElementById(id);
// keep sub-percent odds exact (0.5%, 7.5%)
const pct = (c) => `${Math.round(c * 10000) / 100}%`;
const tokenIcon = '<svg class="ico token"><use href="#i-token" /></svg>';

export class SummoningView {
  constructor({ profile, onChange }) {
    this.profile = profile;
    this.onChange = onChange;
    this.banner = listCirclesByPrice()[0];
    this.rng = createRng();
    this.pending = 0;
    this.stage = new SummonStage($('summon-stage'));
    this.stage.banner = this.banner;
    this.el = {
      page: $('screen-summon'),
      name: $('banner-name'),
      tagline: $('banner-tagline'),
      price: $('banner-price'),
      pool: $('pool-list'),
      buttons: $('pull-buttons'),
      confirm: $('screen-confirm'),
      confirmTitle: $('confirm-title'),
      confirmBody: $('confirm-body'),
      reveal: $('screen-reveal'),
      revealCanvas: $('reveal-canvas'),
      card: $('reveal-card'),
      summary: $('reveal-summary'),
      progress: $('reveal-progress'),
      skip: $('btn-reveal-skip'),
      done: $('btn-reveal-done'),
      mute: $('btn-mute'),
      tabs: $('banner-tabs'),
    };
    sfx.setMuted(!!profile.data.muted);
    this.bind();
  }

  bind() {
    const { el } = this;
    el.tabs.addEventListener('click', (ev) => {
      const b = ev.target.closest('[data-banner]');
      if (!b) return;
      this.banner = getBanner(b.dataset.banner);
      this.stage.banner = this.banner;
      this.render();
      b.blur();
      this.el.tabs.querySelector('.active')?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    });
    el.buttons.addEventListener('click', (ev) => {
      const b = ev.target.closest('[data-count]');
      if (b && !b.disabled) this.askConfirm(Number(b.dataset.count));
    });
    $('btn-confirm-cancel').addEventListener('click', () => this.closeConfirm());
    $('btn-confirm-ok').addEventListener('click', () => this.doSummon());
    el.confirm.addEventListener('click', (ev) => {
      if (ev.target === el.confirm) this.closeConfirm();
    });
    el.skip.addEventListener('click', () => this.seq?.skip());
    el.done.addEventListener('click', () => this.closeReveal());
    // Click/tap on the scene advances a multi-summon to the next crate.
    el.revealCanvas.addEventListener('click', () => {
      if (this.seq && this.seq.cardShown) this.seq.next();
    });
    el.mute.addEventListener('click', () => {
      this.profile.data.muted = !sfx.isMuted();
      sfx.setMuted(this.profile.data.muted);
      this.profile.save();
      this.renderMute();
    });
    window.addEventListener('keydown', (ev) => {
      if (!el.confirm.hidden && ev.key === 'Escape') this.closeConfirm();
      if (!el.confirm.hidden && ev.key === 'Enter') this.doSummon();
      if (!el.reveal.hidden && ev.key === 'Escape') (this.seq && !this.seq.done ? this.seq.skip() : this.closeReveal());
    });
  }

  show(on) {
    this.el.page.hidden = !on;
    if (on && !this.detailsInit) {
      // drop rates start collapsed on phones (expand on tap), open on desktop
      this.detailsInit = true;
      $('pool-details').open = !document.documentElement.classList.contains('phone');
    }
    if (on) {
      this.render();
      this.stage.start();
    } else {
      this.stage.stop();
    }
  }

  renderMute() {
    this.el.mute.innerHTML = `<svg><use href="#i-${sfx.isMuted() ? 'mute' : 'sound'}" /></svg>`;
    this.el.mute.classList.toggle('active', sfx.isMuted());
  }

  render() {
    const { el, banner, profile } = this;
    el.name.textContent = banner.name;
    el.tagline.textContent = banner.tagline;
    el.price.textContent = banner.price;
    $('earn-note').textContent = `Earn ${BALANCE.tokens.base} Tokens per wave cleared, +${Math.round(BALANCE.tokens.milestoneBonus * 100)}% every ${BALANCE.tokens.milestoneEvery} waves.`;
    const pctComp = Math.round(SUMMON_CONFIG.duplicateCompensation * 100);
    $('pool-note').textContent = `Summoned units are unlocked permanently and appear in Battle Plans. Duplicates pay back ${duplicateCompensation(banner)} Tokens each (${pctComp}% of a summon).`;
    // circle cards: name, Token price and a preview of the units inside
    el.tabs.innerHTML = listCirclesByPrice()
      .map((b) => {
        const top = [...b.pool].sort((x, y) => getUnit(y.unit).tier - getUnit(x.unit).tier).slice(0, 3);
        return `<button class="circle-card ${b.id === banner.id ? 'active' : ''}" role="tab" aria-selected="${b.id === banner.id}" data-banner="${esc(b.id)}">
          <span class="cc-name">${esc(b.name)}</span>
          <span class="cc-price">${tokenIcon}${formatNumber(b.price)} Tokens</span>
          <span class="cc-units">${top.map((p) => `<img alt="" src="${portrait(getUnit(p.unit), 60)}" />`).join('')}<span>${b.pool.length} units</span></span>
        </button>`;
      })
      .join('');
    const rarest = Math.min(...banner.pool.map((p) => p.chance));
    $('pool-summary').textContent = `${banner.pool.length} units, rarest ${pct(rarest)}`;
    el.pool.innerHTML = banner.pool
      .map((p) => {
        const def = getUnit(p.unit);
        const tier = getTier(def.tier);
        const owned = profile.ownedCount(p.unit);
        return `<li class="pool-item ${isRare(p.chance) ? 'rare' : ''}" style="--c:${tier.color}">
          <img alt="" src="${portrait(def, 104)}" />
          <div class="pi-main"><div class="pi-name">${esc(def.name)}</div><div class="pi-sub"><span style="color:${tier.color}">${esc(tier.label)}</span>, ${owned ? `<b>Owned</b> ×${owned}` : 'Not obtained'}</div>${sideTierStrip(def, { label: false })}</div>
          <div class="pi-chance">${pct(p.chance)}<span>Chance</span></div>
        </li>`;
      })
      .join('');
    const bal = profile.balance(banner.currency);
    el.buttons.innerHTML = banner.counts
      .map((n, i) => {
        const cost = summonCost(banner, n);
        const short = cost - bal;
        return `<button class="pull-btn ${i === 0 ? 'primary' : ''}" data-count="${n}" ${short > 0 ? 'disabled' : ''} aria-label="Summon ${n} for ${cost} Tokens">
          <span class="pb-n">×${n}</span>
          <span class="pb-cost">${tokenIcon}${formatNumber(cost)}</span>
          ${short > 0 ? `<span class="pb-need">Need ${formatNumber(short)} more</span>` : ''}
        </button>`;
      })
      .join('');
    this.renderMute();
  }

  askConfirm(n) {
    const { banner, profile, el } = this;
    const cost = summonCost(banner, n);
    const bal = profile.balance(banner.currency);
    if (bal < cost) return;
    this.pending = n;
    sfx.tick();
    el.confirmTitle.textContent = `Summon ×${n}`;
    el.confirmBody.innerHTML = `
      <dt>Banner</dt><dd>${esc(banner.name)}</dd>
      <dt>Price per summon</dt><dd>${banner.price} Tokens</dd>
      <dt>Total cost</dt><dd>${formatNumber(cost)} Tokens</dd>
      <dt>Balance</dt><dd>${formatNumber(bal)} Tokens</dd>
      <dt>Balance after</dt><dd class="after">${formatNumber(bal - cost)}</dd>`;
    el.confirm.hidden = false;
    $('btn-confirm-ok').focus();
  }

  closeConfirm() {
    this.el.confirm.hidden = true;
    this.pending = 0;
  }

  doSummon() {
    const n = this.pending;
    if (!n) return;
    this.closeConfirm();
    const res = summon(this.profile, this.banner, n, this.rng);
    if (!res.ok) {
      this.render();
      return;
    }
    this.onChange?.();
    this.playReveal(res.results);
  }

  playReveal(results) {
    const { el } = this;
    this.results = results;
    el.reveal.hidden = false;
    el.card.hidden = true;
    el.summary.hidden = true;
    el.done.hidden = true;
    el.skip.hidden = false;
    el.skip.textContent = results.length > 1 ? 'Skip to results' : 'Skip';
    el.progress.textContent = results.length > 1 ? `1 / ${results.length}` : '';
    this.stage.stop();
    this.seq = new RevealSequence({
      canvas: el.revealCanvas,
      banner: this.banner,
      results,
      onCard: (r, i) => this.showCard(r, i),
      onDone: () => this.showSummary(),
    });
    this.seq.start();
  }

  showCard(r, i) {
    const { el } = this;
    const def = getUnit(r.unit);
    const tier = getTier(r.tier);
    el.progress.textContent = this.results.length > 1 ? `${i + 1} / ${this.results.length}` : '';
    el.card.hidden = false;
    // restart the entrance animation for each card
    el.card.style.animation = 'none';
    void el.card.offsetWidth;
    el.card.style.animation = '';
    el.card.classList.toggle('rare', !!r.rare);
    el.card.innerHTML = `
      <span class="rc-tier" style="--c:${tier.color}">${esc(tier.label)}</span>
      <div class="rc-name">${esc(def.name)}${r.isNew ? '<span class="rc-new">New</span>' : `<span class="rc-dupe">Duplicate</span><span class="rc-comp">+${r.compensation} Tokens</span>`}</div>
      ${r.rare ? `<div class="rc-rare">Rare asset, ${pct(r.chance)}</div>` : ''}
      <div class="rc-meta">${esc(def.role ?? '')}, ${pct(r.chance)} chance${r.isNew ? ', Unlocked in Battle Plans' : `, Owned ×${this.profile.ownedCount(r.unit)}, duplicate refunded`}</div>
      ${sideTierStrip(def)}`;
    if (this.results.length === 1) {
      el.skip.hidden = true;
      el.done.hidden = false;
      el.done.focus();
    }
  }

  showSummary() {
    const { el } = this;
    if (this.results.length === 1) {
      // single summon: make sure the card is shown even when skipped
      if (el.card.hidden) this.showCard(this.results[0], 0);
      this.seq = null;
      return;
    }
    el.card.hidden = true;
    el.skip.hidden = true;
    el.done.hidden = false;
    el.progress.textContent = '';
    const tally = new Map();
    let fresh = 0;
    for (const r of this.results) {
      tally.set(r.unit, (tally.get(r.unit) ?? 0) + 1);
      if (r.isNew) fresh++;
    }
    const sorted = [...this.results].sort((a, b) => b.tier - a.tier);
    const comp = this.results.reduce((sum, r) => sum + r.compensation, 0);
    const dupes = this.results.filter((r) => !r.isNew).length;
    el.summary.innerHTML = `
      <h2>Requisition complete</h2>
      ${comp ? `<div class="rs-comp-total">Duplicate compensation: +${formatNumber(comp)} Tokens (${dupes} × ${this.results.find((r) => !r.isNew).compensation})</div>` : ''}
      <div class="rs-tally">${[...tally.entries()].sort((a, b) => getUnit(b[0]).tier - getUnit(a[0]).tier).map(([id, n]) => `<span style="color:${getTier(getUnit(id).tier).color}">${esc(getUnit(id).name)} ×${n}</span>`).join('')}${fresh ? `<span>${fresh} new</span>` : ''}</div>
      <div class="rs-grid">${sorted
        .map((r, i) => {
          const def = getUnit(r.unit);
          const tier = getTier(r.tier);
          return `<div class="rs-item ${r.rare ? 'rare' : ''}" style="--c:${tier.color}; animation-delay:${Math.min(i, 30) * 25}ms">
            ${r.isNew ? '<span class="rc-new">New</span>' : ''}
            <img alt="" src="${portrait(def, 160)}" /><div class="rs-name">${esc(def.name)}</div><div class="rs-tier">${esc(tier.label)}</div>
            ${sideTierStrip(def, { label: false })}
            ${r.isNew ? '' : `<div class="rs-comp">+${r.compensation} Tokens</div>`}</div>`;
        })
        .join('')}</div>`;
    el.summary.hidden = false;
    this.seq = null;
    el.done.focus();
  }

  closeReveal() {
    if (this.seq && !this.seq.done) {
      this.seq.skip();
      if (this.results.length > 1) return;
    }
    this.seq = null;
    this.el.reveal.hidden = true;
    this.render();
    if (!this.el.page.hidden) this.stage.start();
    this.onChange?.();
  }
}
