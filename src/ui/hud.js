// DOM HUD. Reads game state, renders panels, and forwards user intent to the
// controller via callbacks. Text updates are throttled to keep the DOM cheap
// even when thousands of entities are on the field.

import { formatNumber } from '../core/math.js';
import { getTier } from '../units/tiers.js';
import { getTrait } from '../waves/traits.js';
import { hasRoster } from '../units/unitRegistry.js';
import { listBiomes } from '../maps/biomes.js';

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

function tierStyle(tierIndex) {
  const t = getTier(tierIndex);
  return { tier: t, style: `--c:${t.color}` };
}

export class Hud {
  constructor(actions) {
    this.actions = actions;
    this.el = {
      realmName: $('realm-name'), realmLayout: $('realm-layout'),
      waveNum: $('wave-num'), waveArch: $('wave-arch'), wavePattern: $('wave-pattern'), waveRemaining: $('wave-remaining'),
      waveProgress: $('wave-progress'), waveTraits: $('wave-traits'),
      hpFill: $('hp-fill'), hpText: $('hp-text'), gold: $('gold'),
      summon: $('btn-summon'), summon10: $('btn-summon10'), summonCost: $('summon-cost'), odds: $('odds'),
      benchList: $('bench-list'), benchCount: $('bench-count'),
      nextPreview: $('next-preview'), next: $('btn-next'), auto: $('auto'),
      banner: $('banner'), toasts: $('toasts'), unitPanel: $('unit-panel'),
      bossBar: $('boss-bar'), bossName: $('boss-name'), bossFill: $('boss-fill'), bossShield: $('boss-shield'), bossHpText: $('boss-hp-text'),
      pause: $('btn-pause'), pauseVeil: $('pause-veil'), fx: $('btn-fx'),
      start: $('screen-start'), over: $('screen-over'), realmChips: $('realm-chips'),
      overWave: $('over-wave'), overStats: $('over-stats'),
    };
    this.lastGold = null;
    this.benchKey = '';
    this.oddsKey = '';
    this.panelKey = '';
    this.textTimer = 0;
    this.bind();
  }

  bind() {
    const { el, actions } = this;
    el.summon.addEventListener('click', () => actions.summon(1));
    el.summon10.addEventListener('click', () => actions.summon(10));
    el.next.addEventListener('click', () => actions.nextWave());
    el.auto.addEventListener('change', () => actions.setAuto(el.auto.checked));
    el.pause.addEventListener('click', () => actions.togglePause());
    el.fx.addEventListener('click', () => actions.toggleEffects());
    document.querySelectorAll('.speed button').forEach((b) => b.addEventListener('click', () => actions.setSpeed(Number(b.dataset.speed))));
    el.benchList.addEventListener('click', (ev) => {
      const card = ev.target.closest('.bench-card');
      if (card) actions.selectBench(card.dataset.def);
    });
    el.unitPanel.addEventListener('click', (ev) => {
      const b = ev.target.closest('button');
      if (!b) return;
      if (b.dataset.act === 'recall') actions.recallSelected();
      if (b.dataset.act === 'close') actions.deselect();
    });
    $('btn-begin').addEventListener('click', () => actions.begin());
    $('btn-reroll').addEventListener('click', () => actions.reroll());
    $('btn-again').addEventListener('click', () => actions.again());
    el.realmChips.addEventListener('click', (ev) => {
      const chip = ev.target.closest('.chip');
      if (chip) actions.chooseRealm(chip.dataset.biome || null);
    });
  }

  // ------------------------------------------------------------ screens

  renderRealmChips(activeId) {
    const chips = [{ id: '', name: 'Random', color: '#ffd76a' }, ...listBiomes().map((b) => ({ id: b.id, name: b.name, color: b.portalColor }))];
    this.el.realmChips.innerHTML = chips
      .map((c) => `<button class="chip ${c.id === (activeId ?? '') ? 'active' : ''}" style="--c:${c.color}" data-biome="${c.id}">${esc(c.name)}</button>`)
      .join('');
  }

  showStart(show) {
    this.el.start.hidden = !show;
  }

  showGameOver(data) {
    const s = data.stats;
    this.el.overWave.textContent = data.wave;
    const stats = [
      ['Waves survived', Math.max(0, data.wave - 1)],
      ['Enemies defeated', formatNumber(s.kills)],
      ['Bosses felled', s.bossesDefeated],
      ['Units summoned', s.summons],
      ['Highest tier', s.highestTier ? getTier(s.highestTier).short : '—'],
      ['Damage dealt', formatNumber(s.damage)],
    ];
    this.el.overStats.innerHTML = stats.map(([k, v]) => `<div class="stat"><div class="v">${v}</div><div class="k">${k}</div></div>`).join('');
    this.el.over.hidden = false;
  }

  hideGameOver() {
    this.el.over.hidden = true;
  }

  // ------------------------------------------------------------ events

  onRunStart(game) {
    this.el.realmName.textContent = game.biome.name;
    this.el.realmLayout.textContent = `${game.map.layoutLabel} · ${game.map.routes.length} ${game.map.routes.length > 1 ? 'entrances' : 'entrance'}`;
    document.documentElement.style.setProperty('--accent', game.biome.palette.accent);
    this.benchKey = '';
    this.oddsKey = '';
    this.panelKey = '';
    this.el.bossBar.hidden = true;
    this.el.toasts.innerHTML = '';
    this.el.banner.innerHTML = '';
    this.update(game, null, true);
  }

  banner(html, cls = '') {
    this.el.banner.innerHTML = `<div class="banner-card ${cls}">${html}</div>`;
  }

  onWaveStart(plan, game) {
    const traits = plan.traits.map((id) => getTrait(id).label).join(' · ');
    if (plan.isBoss) {
      this.banner(
        `<div class="b-kicker">Wave ${plan.wave}</div><div class="b-title" style="--c:${plan.color}">BOSS</div>` +
          `<div class="b-arch" style="--c:${plan.color}">${esc(game.biome.bossTitle ?? 'Guardian')}</div>` +
          `<div class="b-sub">${esc(plan.tagline)}${traits ? ` — ${esc(traits)}` : ''}</div>`,
        'boss',
      );
    } else {
      this.banner(
        `<div class="b-kicker">Incoming</div><div class="b-title" style="--c:${plan.color}">Wave ${plan.wave}</div>` +
          `<div class="b-arch" style="--c:${plan.color}">${esc(plan.label)}</div>` +
          `<div class="b-sub">${esc(plan.tagline)} · ${formatNumber(plan.total)} foes · ${esc(plan.patternLabel)}${traits ? ` · ${esc(traits)}` : ''}</div>`,
      );
    }
  }

  onWaveClear({ wave, reward }) {
    this.banner(`<div class="b-title" style="--c:#9effc4">Wave ${wave} Held</div><div class="b-sub">+${formatNumber(reward)} gold</div>`, 'small');
  }

  onBossArrived(e, game) {
    this.el.bossName.textContent = game.biome.bossTitle ?? 'Boss';
    this.el.bossBar.hidden = false;
  }

  toast(html, color) {
    const t = document.createElement('div');
    t.className = 'toast';
    if (color) t.style.setProperty('--c', color);
    t.innerHTML = html;
    this.el.toasts.prepend(t);
    while (this.el.toasts.children.length > 5) this.el.toasts.lastChild.remove();
    setTimeout(() => t.remove(), 3300);
  }

  onSummon(units) {
    if (units.length === 1) {
      const u = units[0];
      const { tier } = tierStyle(u.tier);
      this.toast(`Summoned <b>${esc(tier.label)}</b> ${esc(u.def.name)}`, tier.color);
      return;
    }
    const byTier = new Map();
    for (const u of units) byTier.set(u.tier, (byTier.get(u.tier) ?? 0) + 1);
    const best = Math.max(...byTier.keys());
    const parts = [...byTier.entries()].sort((a, b) => b[0] - a[0]).map(([t, n]) => `<b style="color:${getTier(t).color}">${n}× ${getTier(t).short}</b>`);
    this.toast(`Summoned ${units.length}: ${parts.join(' ')}`, getTier(best).color);
  }

  setPaused(p) {
    this.el.pauseVeil.hidden = !p;
    this.el.pause.classList.toggle('active', p);
    this.el.pause.textContent = p ? '▶' : '❚❚';
  }

  setSpeed(s) {
    document.querySelectorAll('.speed button').forEach((b) => b.classList.toggle('active', Number(b.dataset.speed) === s));
  }

  setEffects(on) {
    this.el.fx.classList.toggle('off', !on);
  }

  // ------------------------------------------------------------ per frame

  update(game, ui, force = false) {
    const { el } = this;
    // gold & buttons every frame (cheap, responsive)
    if (game.gold !== this.lastGold) {
      if (this.lastGold !== null && game.gold > this.lastGold) {
        el.gold.parentElement.classList.remove('bump');
        void el.gold.offsetWidth;
        el.gold.parentElement.classList.add('bump');
      }
      el.gold.textContent = formatNumber(game.gold);
      this.lastGold = game.gold;
    }
    const canSummon = game.gold >= game.summonCost && game.phase !== 'gameover';
    el.summon.disabled = !canSummon;
    el.summon10.disabled = !canSummon;
    el.summonCost.textContent = formatNumber(game.summonCost);
    const canStart = game.phase === 'build';
    el.next.disabled = !canStart;
    el.next.classList.toggle('ready', canStart);
    el.next.textContent = canStart ? (game.autoStart ? `Begin (${Math.ceil(Math.max(0, game.autoTimer))})` : 'Begin Wave') : game.phase === 'wave' ? 'In Battle…' : 'Begin Wave';

    this.textTimer -= 1;
    if (this.textTimer > 0 && !force) {
      this.updateBoss(game);
      return;
    }
    this.textTimer = 6;

    el.waveNum.textContent = game.wave;
    const plan = game.phase === 'wave' ? game.currentPlan : null;
    if (plan) {
      el.waveArch.textContent = plan.label;
      el.waveArch.style.setProperty('--c', plan.color);
      el.wavePattern.textContent = plan.patternLabel;
      const remaining = game.waveRemaining;
      el.waveRemaining.textContent = `${formatNumber(remaining)} remaining`;
      el.waveProgress.style.width = `${(1 - remaining / Math.max(1, plan.total)) * 100}%`;
      el.waveTraits.innerHTML = plan.traits.map((id) => {
        const t = getTrait(id);
        return `<span class="trait" style="--c:${t.color}" title="${esc(t.description)}">${esc(t.label)}</span>`;
      }).join('');
    } else {
      el.waveArch.textContent = game.wave === 0 ? 'Preparing' : 'Respite';
      el.waveArch.style.setProperty('--c', '#9aa0b8');
      el.wavePattern.textContent = '';
      el.waveRemaining.textContent = game.wave === 0 ? 'Summon and place your defenders' : 'Reinforce your lines';
      el.waveProgress.style.width = game.wave === 0 ? '0%' : '100%';
      el.waveTraits.innerHTML = '';
    }

    const hp = game.towerHp / game.towerMaxHp;
    el.hpFill.style.width = `${hp * 100}%`;
    el.hpFill.classList.toggle('low', hp < 0.35);
    el.hpText.textContent = `${Math.ceil(game.towerHp)} / ${game.towerMaxHp}`;

    // next encounter preview
    const np = game.nextPlan;
    const npKey = `${np.wave}`;
    if (this.npKey !== npKey || force) {
      this.npKey = npKey;
      el.nextPreview.style.setProperty('--c', np.color);
      const traits = np.traits.map((id) => getTrait(id).label).join(' · ');
      el.nextPreview.innerHTML = `<div class="np-arch">Wave ${np.wave} · ${esc(np.label)}</div><div class="np-sub">${esc(np.tagline)} · ${formatNumber(np.total)} foes${traits ? ` · ${esc(traits)}` : ''}</div>`;
    }

    this.renderOdds(game);
    this.renderBench(game, ui);
    this.renderUnitPanel(ui);
    this.updateBoss(game);
  }

  updateBoss(game) {
    const b = game.boss;
    if (!b || !b.alive) {
      if (!this.el.bossBar.hidden) this.el.bossBar.hidden = true;
      return;
    }
    if (b.intro < 1) return;
    if (this.el.bossBar.hidden) this.el.bossBar.hidden = false;
    this.el.bossFill.style.width = `${Math.max(0, (b.hp / b.maxHp) * 100)}%`;
    this.el.bossShield.style.width = b.maxShield ? `${(b.shield / b.maxShield) * 100}%` : '0';
    this.el.bossHpText.textContent = `${formatNumber(Math.max(0, b.hp))} / ${formatNumber(b.maxHp)}`;
  }

  renderOdds(game) {
    const odds = game.summoner.odds(game.oddsWave);
    const key = odds.map((o) => `${o.tier}:${o.chance.toFixed(4)}`).join('|');
    if (key === this.oddsKey) return;
    this.oddsKey = key;
    this.el.odds.innerHTML = odds
      .filter((o) => o.chance >= 0.0005)
      .slice(0, 9)
      .map((o) => {
        const t = getTier(o.tier);
        const pct = o.chance * 100;
        return `<span class="odd" style="--c:${t.color}" title="${esc(t.label)}">${t.short} ${pct >= 10 ? pct.toFixed(0) : pct >= 1 ? pct.toFixed(1) : pct.toFixed(2)}%</span>`;
      })
      .join('');
  }

  renderBench(game, ui) {
    const groups = game.benchGroups();
    const active = ui?.placingDef?.id ?? '';
    const key = groups.map((g) => `${g.def.id}x${g.count}`).join(',') + `|${active}|${game.units.length}`;
    if (key === this.benchKey) return;
    this.benchKey = key;
    const total = game.bench.length;
    this.el.benchCount.textContent = `${total} in reserve · ${game.units.length} deployed`;
    if (!groups.length) {
      const note = hasRoster()
        ? 'Summon units to fill your reserves.'
        : 'Summon to obtain units. <span class="muted">The unit roster is empty — tiered <b>Prototype Proxies</b> stand in until real units are registered.</span>';
      this.el.benchList.innerHTML = `<div class="bench-empty">${note}</div>`;
      return;
    }
    this.el.benchList.innerHTML = groups
      .map((g) => {
        const { tier, style } = tierStyle(g.def.tier);
        const s = g.def.stats;
        return `<button class="bench-card ${g.def.id === active ? 'active' : ''}" style="${style}" data-def="${esc(g.def.id)}" title="${esc(g.def.name)} — ${esc(tier.label)}">
          <div class="bc-tier">${esc(tier.label)}</div>
          <div class="bc-name">${esc(g.def.name)}</div>
          <div class="bc-stats">${formatNumber(s.damage)} dmg · ${s.rate.toFixed(1)}/s · ${(s.range / 32).toFixed(1)}r</div>
          <span class="bc-count">×${g.count}</span><span class="bc-gem"></span>
        </button>`;
      })
      .join('');
  }

  renderUnitPanel(ui) {
    const u = ui?.selected;
    const key = u ? `${u.uid}:${u.kills}:${Math.round(u.damageDealt)}` : '';
    if (key === this.panelKey) return;
    this.panelKey = key;
    if (!u) {
      this.el.unitPanel.hidden = true;
      return;
    }
    const tier = getTier(u.tier);
    const s = u.stats;
    this.el.unitPanel.hidden = false;
    this.el.unitPanel.innerHTML = `
      <h3>${esc(u.def.name)}</h3>
      <span class="tier-badge ${tier.prismatic ? 'prismatic' : ''}" style="--c:${tier.color}">${esc(tier.label)}</span>
      <dl class="stat-list">
        <dt>Damage</dt><dd>${formatNumber(s.damage)}</dd>
        <dt>Attack rate</dt><dd>${s.rate.toFixed(2)}/s</dd>
        <dt>Range</dt><dd>${(s.range / 32).toFixed(1)} tiles</dd>
        <dt>Tier power</dt><dd>×${tier.power.toFixed(2)}</dd>
        <dt>Defeated</dt><dd>${formatNumber(u.kills)}</dd>
        <dt>Damage dealt</dt><dd>${formatNumber(u.damageDealt)}</dd>
      </dl>
      <div class="panel-actions"><button class="btn-secondary" data-act="recall" title="Return to reserves (R)">Recall</button><button class="btn-secondary" data-act="close">Close</button></div>
      ${u.def.isProxy ? '<div class="proxy-note">Prototype Proxy: a neutral tier test-stand used until the real unit roster is registered.</div>' : ''}`;
  }
}
