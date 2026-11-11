// Battle HUD. Reads game state, renders panels, and forwards intent to the
// controller via callbacks. DOM work is keyed/throttled so it stays cheap with
// hundreds of units on the field.

import { formatNumber } from '../core/math.js';
import { getTier } from '../units/tiers.js';
import { getTrait } from '../waves/traits.js';
import { maxLevel } from '../units/unitStats.js';
import { esc, tiles } from './format.js';
import { portrait } from './battlePlans.js';

const $ = (id) => document.getElementById(id);
export const SLOT_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '='];

export class Hud {
  constructor(actions) {
    this.actions = actions;
    this.el = {
      realmName: $('realm-name'), realmLayout: $('realm-layout'),
      waveNum: $('wave-num'), waveArch: $('wave-arch'), waveRemaining: $('wave-remaining'),
      waveProgress: $('wave-progress'), waveTraits: $('wave-traits'),
      hpFill: $('hp-fill'), hpText: $('hp-text'), coins: $('coins'), tokens: $('tokens-earned'),
      deployBar: $('deploy-bar'),
      nextPreview: $('next-preview'), next: $('btn-next'), auto: $('auto'),
      banner: $('banner'), toasts: $('toasts'), unitPanel: $('unit-panel'),
      bossBar: $('boss-bar'), bossName: $('boss-name'), bossFill: $('boss-fill'), bossShield: $('boss-shield'), bossHpText: $('boss-hp-text'),
      pause: $('btn-pause'), pauseVeil: $('pause-veil'), fx: $('btn-fx'),
      over: $('screen-over'), overWave: $('over-wave'), overStats: $('over-stats'),
      retreat: $('screen-retreat'),
    };
    this.deployKey = '';
    this.panelKey = '';
    this.npKey = '';
    this.textTimer = 0;
    this.bind();
  }

  bind() {
    const { el, actions } = this;
    el.next.addEventListener('click', () => actions.nextWave());
    el.auto.addEventListener('change', () => actions.setAuto(el.auto.checked));
    el.pause.addEventListener('click', () => actions.togglePause());
    el.fx.addEventListener('click', () => actions.toggleEffects());
    $('btn-retreat').addEventListener('click', () => actions.askRetreat());
    $('btn-retreat-cancel').addEventListener('click', () => actions.cancelRetreat());
    $('btn-retreat-confirm').addEventListener('click', () => actions.retreat());
    $('btn-again').addEventListener('click', () => actions.again());
    $('btn-to-plans').addEventListener('click', () => actions.toPlans());
    document.querySelectorAll('.speed button').forEach((b) => b.addEventListener('click', () => actions.setSpeed(Number(b.dataset.speed))));
    el.deployBar.addEventListener('click', (ev) => {
      const card = ev.target.closest('.deploy-card');
      if (card) actions.selectDeploy(card.dataset.def);
    });
    el.unitPanel.addEventListener('click', (ev) => {
      const b = ev.target.closest('button');
      if (!b) return;
      if (b.dataset.act === 'upgrade') actions.upgradeSelected();
      if (b.dataset.act === 'sell') actions.sellSelected();
      if (b.dataset.act === 'close') actions.deselect();
    });
  }

  // ------------------------------------------------------------ screens

  showGameOver(data) {
    const s = data.stats;
    this.el.overWave.textContent = data.wave;
    const stats = [
      ['Waves survived', Math.max(0, data.wave - 1)],
      ['Enemies defeated', formatNumber(s.kills)],
      ['Bosses felled', s.bossesDefeated],
      ['Units deployed', formatNumber(s.unitsDeployed)],
      ['Tokens earned', formatNumber(data.tokens ?? 0)],
      ['Damage dealt', formatNumber(s.damage)],
    ];
    this.el.overStats.innerHTML = stats.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('');
    this.el.over.hidden = false;
  }

  hideGameOver() {
    this.el.over.hidden = true;
  }

  showRetreat(on) {
    this.el.retreat.hidden = !on;
  }

  // ------------------------------------------------------------ events

  onRunStart(game) {
    this.el.realmName.textContent = game.biome.name;
    this.el.realmLayout.textContent = `${game.map.variantName ? `${game.map.variantName} · ` : ''}${game.map.layoutLabel} · ${game.map.routes.length} ${game.map.routes.length > 1 ? 'entrances' : 'entrance'}`;
    this.deployKey = '';
    this.panelKey = '';
    this.npKey = '';
    this.el.bossBar.hidden = true;
    this.el.toasts.innerHTML = '';
    this.el.banner.innerHTML = '';
    this.el.auto.checked = game.autoStart;
    this.el.tokens.textContent = `+${formatNumber(game.tokensEarned)}`;
    this.update(game, null, true);
  }

  banner(html, color, cls = '') {
    this.el.banner.innerHTML = `<div class="banner-card ${cls}" style="--c:${color}"><div>${html}</div></div>`;
  }

  onWaveStart(plan, game) {
    const traits = plan.traits.map((id) => getTrait(id).label).join(' · ');
    if (plan.isBoss) {
      this.banner(
        `<div class="b-kicker">Wave ${plan.wave} · Boss</div><div class="b-title">${esc(game.biome.bossTitle ?? 'Guardian')}</div>` +
          `<div class="b-sub">${esc(plan.tagline)}${traits ? ` · ${esc(traits)}` : ''}</div>`,
        plan.color,
        'boss',
      );
    } else {
      this.banner(
        `<div class="b-kicker">Wave ${plan.wave}</div><div class="b-title"><em>${esc(plan.label)}</em></div>` +
          `<div class="b-sub">${formatNumber(plan.total)} enemies · ${esc(plan.patternLabel)}${traits ? ` · ${esc(traits)}` : ''}</div>`,
        plan.color,
      );
    }
  }

  onWaveClear({ wave, reward, tokens }, game) {
    this.banner(`<div class="b-kicker">Wave ${wave} held · +${formatNumber(reward)} coins</div><div class="b-title">+${formatNumber(tokens)} Tokens</div>`, '#e3a33b', 'small');
    this.el.tokens.textContent = `+${formatNumber(game.tokensEarned)}`;
    this.el.tokens.parentElement.classList.remove('bump');
    void this.el.tokens.offsetWidth;
    this.el.tokens.parentElement.classList.add('bump');
  }

  onBossArrived(e, game) {
    this.el.bossName.textContent = game.biome.bossTitle ?? 'Boss';
    this.el.bossBar.hidden = false;
  }

  toast(text, color) {
    const t = document.createElement('div');
    t.className = 'toast';
    if (color) t.style.setProperty('--c', color);
    t.textContent = text;
    this.el.toasts.prepend(t);
    while (this.el.toasts.children.length > 4) this.el.toasts.lastChild.remove();
    setTimeout(() => t.remove(), 2700);
  }

  setPaused(p) {
    this.el.pauseVeil.hidden = !p;
    this.el.pause.classList.toggle('active', p);
    this.el.pause.innerHTML = `<svg><use href="#i-${p ? 'play' : 'pause'}" /></svg>`;
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
    el.coins.textContent = formatNumber(game.coins);
    const canStart = game.phase === 'build';
    el.next.disabled = !canStart;
    el.next.textContent = canStart ? (game.autoStart ? `Start wave · ${Math.ceil(Math.max(0, game.autoTimer))}` : 'Start wave') : game.phase === 'wave' ? 'Wave in progress' : 'Start wave';

    this.renderDeployBar(game, ui);
    this.renderUnitPanel(game, ui);
    this.updateBoss(game);

    this.textTimer -= 1;
    if (this.textTimer > 0 && !force) return;
    this.textTimer = 6;

    el.waveNum.textContent = game.wave;
    const plan = game.phase === 'wave' ? game.currentPlan : null;
    if (plan) {
      el.waveArch.textContent = plan.label;
      el.waveArch.style.setProperty('--c', plan.color);
      const remaining = game.waveRemaining;
      el.waveRemaining.textContent = `${formatNumber(remaining)} remaining · ${plan.patternLabel}`;
      el.waveProgress.style.width = `${(1 - remaining / Math.max(1, plan.total)) * 100}%`;
      const traitsHtml = plan.traits.map((id) => {
        const t = getTrait(id);
        return `<span class="trait" style="--c:${t.color}" title="${esc(t.description)}">${esc(t.label)}</span>`;
      }).join('');
      if (el.waveTraits.innerHTML !== traitsHtml) el.waveTraits.innerHTML = traitsHtml;
    } else {
      el.waveArch.textContent = game.wave === 0 ? 'Preparing' : 'Respite';
      el.waveArch.style.setProperty('--c', '#8d939e');
      el.waveRemaining.textContent = game.wave === 0 ? 'Deploy your army, then start the wave' : 'Reinforce and upgrade';
      el.waveProgress.style.width = game.wave === 0 ? '0%' : '100%';
      el.waveTraits.innerHTML = '';
    }

    const hp = game.towerHp / game.towerMaxHp;
    el.hpFill.style.width = `${hp * 100}%`;
    el.hpFill.classList.toggle('low', hp < 0.35);
    el.hpText.textContent = Math.ceil(game.towerHp);

    const np = game.nextPlan;
    if (this.npKey !== `${np.wave}` || force) {
      this.npKey = `${np.wave}`;
      el.nextPreview.style.setProperty('--c', np.color);
      const traits = np.traits.map((id) => getTrait(id).label).join(' · ');
      el.nextPreview.innerHTML = `<div class="np-arch">Wave ${np.wave} · <em>${esc(np.label)}</em></div><div class="np-sub">${formatNumber(np.total)} enemies${traits ? ` · ${esc(traits)}` : ''}</div>`;
    }
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

  renderDeployBar(game, ui) {
    const active = ui?.placingDef?.id ?? '';
    const parts = game.loadout.map((def) => {
      const n = game.deployedCount(def.id);
      const bonus = def.passive?.bonus ? def.passive.bonus({ deployed: n }) : null;
      return { def, n, bonus, poor: game.coins < def.price };
    });
    const key = parts.map((p) => `${p.def.id}:${p.n}:${p.poor}`).join(',') + `|${active}`;
    if (key === this.deployKey) return;
    this.deployKey = key;
    this.el.deployBar.innerHTML = parts
      .map(({ def, n, bonus, poor }, i) => `<button class="deploy-card ${def.id === active ? 'active' : ''} ${poor ? 'poor' : ''}" data-def="${esc(def.id)}" title="${esc(def.name)} — ${def.price} coins (key ${SLOT_KEYS[i]})">
        <div class="dc-art"><img alt="" src="${portrait(def, 96)}" /></div>
        <span class="dc-key">${SLOT_KEYS[i]}</span><span class="dc-count">×${n}</span>
        <div class="dc-info"><div class="dc-name">${esc(def.name)}</div>
          <div class="dc-row"><span class="dc-price"><span class="coin sm"></span>${def.price}</span>${bonus !== null ? `<span class="dc-bonus" title="${esc(def.passive.name)}">+${Math.round(bonus * 100)}%</span>` : ''}</div>
        </div></button>`)
      .join('');
  }

  renderUnitPanel(game, ui) {
    const u = ui?.selected;
    if (!u || !u.placed) {
      if (this.panelKey !== '') {
        this.panelKey = '';
        this.el.unitPanel.hidden = true;
      }
      return;
    }
    const info = game.upgradeInfo(u);
    const n = game.deployedCount(u.def.id);
    const key = `${u.uid}:${u.level}:${n}:${info.affordable}:${u.kills}`;
    if (key === this.panelKey) return;
    this.panelKey = key;
    const def = u.def;
    const tier = getTier(def.tier);
    const cur = info.current;
    const row = (label, a, b, fmt) => {
      const up = b !== undefined && b > a;
      return `<tr><td>${label}</td><td>${fmt(a)}</td>${b !== undefined ? `<td class="arrow">→</td><td class="${up ? 'up' : ''}">${fmt(b)}</td>` : ''}</tr>`;
    };
    const f1 = (v) => (Math.round(v * 10) / 10).toString();
    const nx = info.maxed ? {} : info.next;
    const passive = def.passive
      ? `<div class="up-passive"><div class="row"><b>${esc(def.passive.name)}</b><span class="pct">+${Math.round((def.passive.bonus?.({ deployed: n }) ?? 0) * 100)}%</span></div>
         <div class="muted">${n} ${esc(def.name)}${n === 1 ? '' : 's'} deployed · ${esc(def.passive.summary)}</div></div>`
      : '';
    this.el.unitPanel.innerHTML = `
      <div class="up-head"><img alt="" src="${portrait(def, 96)}" /><div><h3>${esc(def.name)}</h3><div class="ds-sub">${esc(tier.label)} · Level ${u.level} / ${maxLevel(def)}</div></div>
        <button class="up-close" data-act="close" aria-label="Close">×</button></div>
      <div class="up-body">
        ${passive}
        <div class="up-upgrade">
          <h4><span>${info.maxed ? `Level ${u.level} · max` : `Level ${info.level} → ${info.nextLevel}`}</span><span>${formatNumber(u.kills)} kills</span></h4>
          <table class="cmp">
            ${row('Damage', cur.damage, nx.damage, f1)}
            ${row('Range', cur.range, nx.range, tiles)}
            ${row('Attack speed', cur.rate, nx.rate, (v) => v.toFixed(2))}
            ${row('DPS', cur.damage * cur.rate, info.maxed ? undefined : nx.damage * nx.rate, f1)}
          </table>
        </div>
        <div class="up-actions">
          <button class="btn-primary" data-act="upgrade" ${info.maxed || !info.affordable ? 'disabled' : ''} title="Upgrade (U)">
            ${info.maxed ? 'Max level' : `Upgrade <span class="coin sm"></span>${formatNumber(info.cost)}`}</button>
          <button class="btn-secondary" data-act="sell" title="Sell (X)">Sell +${formatNumber(game.sellValue(u))}</button>
        </div>
      </div>`;
    this.el.unitPanel.hidden = false;
  }
}
