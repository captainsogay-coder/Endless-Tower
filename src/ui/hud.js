// Battle HUD. Reads game state, renders panels, and forwards intent to the
// controller via callbacks. DOM work is keyed/throttled so it stays cheap with
// hundreds of units on the field.

import { formatNumber } from '../core/math.js';
import { getTier } from '../units/tiers.js';
import { getTrait } from '../waves/traits.js';
import { maxLevel } from '../units/unitStats.js';
import { esc, tiles } from './format.js';
import { portrait } from './battlePlans.js';
import { waveBonusPerWave } from '../balance.js';

const $ = (id) => document.getElementById(id);

/** Compact list of wave numbers: "12–15, 18" (runs collapse into ranges). */
export function waveRange(nums) {
  if (!nums.length) return '';
  const sorted = [...nums].sort((a, b) => a - b);
  const parts = [];
  let start = sorted[0];
  let prev = start;
  for (const n of sorted.slice(1).concat(Infinity)) {
    if (n === prev + 1) {
      prev = n;
      continue;
    }
    parts.push(start === prev ? `${start}` : `${start}–${prev}`);
    start = prev = n;
  }
  const text = parts.join(', ');
  return text.length > 40 ? `${sorted[0]}–${sorted[sorted.length - 1]}` : text;
}
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
      callCount: $('call-count'), callMany: $('btn-call-many'), queueInfo: $('queue-info'),
      weatherBtn: $('btn-weather'), weatherCard: $('weather-card'), weatherChip: $('weather-chip'), sound: $('btn-sound'),
      banner: $('banner'), toasts: $('toasts'), unitPanel: $('unit-panel'),
      bossBar: $('boss-bar'), bossName: $('boss-name'), bossFill: $('boss-fill'), bossShield: $('boss-shield'), bossHpText: $('boss-hp-text'),
      pause: $('btn-pause'), pauseVeil: $('pause-veil'), fx: $('btn-fx'),
      over: $('screen-over'), overWave: $('over-wave'), overStats: $('over-stats'),
      retreat: $('screen-retreat'),
    };
    this.deployKey = '';
    this.panelUnit = null;
    this.npKey = '';
    this.textTimer = 0;
    this.bind();
  }

  bind() {
    const { el, actions } = this;
    el.next.addEventListener('click', () => actions.nextWave());
    el.auto.addEventListener('change', () => actions.setAutoSkip(el.auto.checked));
    const count = () => Math.max(1, Math.min(1000, Math.floor(Number(el.callCount.value) || 1)));
    el.callCount.addEventListener('input', () => (el.callMany.textContent = `Call ×${count()}`));
    el.callCount.addEventListener('keydown', (ev) => ev.key === 'Enter' && actions.callWaves(count()));
    el.callMany.addEventListener('click', () => actions.callWaves(count()));
    el.weatherBtn.addEventListener('click', () => actions.toggleWeather());
    // phones: the weather chip expands a compact panel; tapping outside or × collapses it
    el.weatherChip.addEventListener('click', (ev) => {
      ev.stopPropagation();
      this.setWeatherExpanded(!this.weatherExpanded);
    });
    el.weatherCard.addEventListener('click', (ev) => {
      if (ev.target.closest('.wc-close')) this.setWeatherExpanded(false);
      if (ev.target.closest('.wc-off')) {
        this.setWeatherExpanded(false);
        actions.toggleWeather();
      }
      ev.stopPropagation();
    });
    document.addEventListener('pointerdown', (ev) => {
      if (this.weatherExpanded && !ev.target.closest('#weather-card, #weather-chip')) this.setWeatherExpanded(false);
    });
    el.sound.addEventListener('click', () => actions.toggleSound());
    el.pause.addEventListener('click', () => actions.togglePause());
    el.fx.addEventListener('click', () => actions.toggleEffects());
    $('btn-retreat').addEventListener('click', () => actions.askRetreat());
    $('btn-retreat-cancel').addEventListener('click', () => actions.cancelRetreat());
    $('btn-retreat-confirm').addEventListener('click', () => actions.retreat());
    $('btn-again').addEventListener('click', () => actions.again());
    $('btn-to-plans').addEventListener('click', () => actions.toPlans());
    document.querySelectorAll('.speed button').forEach((b) =>
      b.addEventListener('click', () => {
        // narrow phones show one speed button that cycles 1× → 2× → 3×
        const cycle = document.documentElement.classList.contains('narrow') && b.classList.contains('active');
        actions.setSpeed(cycle ? (Number(b.dataset.speed) % 3) + 1 : Number(b.dataset.speed));
      }),
    );
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
    this.panelUnit = null;
    this.el.unitPanel.hidden = true;
    document.getElementById('app')?.classList.remove('inspecting');
    this.npKey = '';
    this.el.bossBar.hidden = true;
    this.el.toasts.innerHTML = '';
    this.el.banner.innerHTML = '';
    this.el.auto.checked = game.autoSkip;
    this.weatherKey = '';
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
        `<div class="b-kicker">Wave ${plan.wave} · Boss · +${formatNumber(plan.tokens)} Tokens on clear</div><div class="b-title">${esc(game.biome.bossTitle ?? 'Guardian')}</div>` +
          `<div class="b-sub">${esc(plan.tagline)}${traits ? ` · ${esc(traits)}` : ''}</div>`,
        plan.color,
        'boss',
      );
    } else {
      this.banner(
        `<div class="b-kicker">Wave ${plan.wave} · +${formatNumber(plan.tokens)} Tokens on clear</div><div class="b-title"><em>${esc(plan.label)}</em></div>` +
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
    el.next.disabled = game.phase === 'gameover';
    el.next.textContent = `Call wave ${game.nextPlan.wave}`;
    this.renderWeather(game, ui);

    this.renderDeployBar(game, ui);
    this.renderUnitPanel(game, ui);
    this.updateBoss(game);

    this.textTimer -= 1;
    if (this.textTimer > 0 && !force) return;
    this.textTimer = 6;

    el.waveNum.textContent = game.wave;
    const plan = game.phase === 'wave' ? game.currentPlan : null;
    const active = game.activeWaveNumbers();
    const queued = game.queuedWaveNumbers();
    el.queueInfo.textContent = queued.length ? `${formatNumber(queued.length)} queued (${waveRange(queued)})` : '';
    if (plan) {
      el.waveArch.textContent = active.length > 1 ? `${active.length} waves` : plan.label;
      el.waveArch.style.setProperty('--c', plan.color);
      const remaining = game.waveRemaining;
      const list = active.length > 1 ? `Active ${waveRange(active)}` : plan.patternLabel;
      el.waveRemaining.textContent = `${formatNumber(remaining)} remaining · ${list}${queued.length ? ` · ${formatNumber(queued.length)} queued` : ''}`;
      el.waveProgress.style.width = `${(1 - remaining / Math.max(1, game.waveTotal)) * 100}%`;
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
      el.nextPreview.innerHTML = `<div class="np-arch">Wave ${np.wave} · <em>${esc(np.label)}</em></div><div class="np-sub">${formatNumber(np.total)} enemies${traits ? ` · ${esc(traits)}` : ''}</div><div class="np-reward"><svg class="ico token"><use href="#i-token" /></svg>+${formatNumber(np.tokens)} Tokens on clear</div>`;
    }
  }

  setWeatherEnabled(on) {
    this.el.weatherBtn.setAttribute('aria-pressed', String(on));
    this.el.weatherBtn.innerHTML = `<svg><use href="#i-${on ? 'cloud' : 'cloud-off'}" /></svg>`;
    this.el.weatherBtn.title = on ? 'Weather on (tap to disable)' : 'Weather off (tap to enable)';
  }

  setSound(on) {
    this.el.sound.innerHTML = `<svg><use href="#i-${on ? 'sound' : 'mute'}" /></svg>`;
    this.el.sound.classList.toggle('off', !on);
  }

  /**
   * Weather. Desktop: a compact card at the top left of the battlefield.
   * Phones: a chip (icon + seconds left) in the top bar; tapping it expands the
   * same card as a small panel. The panel collapses on tap-outside, ×, when
   * weather ends, and as soon as unit placement starts (and can't be opened
   * while placing), so it never covers ground the player is choosing.
   */
  renderWeather(game, ui) {
    const w = game.weather.current;
    const card = this.el.weatherCard;
    const chip = this.el.weatherChip;
    const phone = document.documentElement.classList.contains('phone');
    this.placing = !!ui?.placingDef;
    document.getElementById('hud-top').classList.toggle('has-weather', !!w);
    if (!w) {
      if (!card.hidden) card.hidden = true;
      if (!chip.hidden) chip.hidden = true;
      this.weatherKey = '';
      this.weatherExpanded = false;
      return;
    }
    if (this.placing && this.weatherExpanded) this.setWeatherExpanded(false);
    const rem = Math.max(0, game.weather.remaining);
    const key = w.id;
    if (this.weatherKey !== key) {
      this.weatherKey = key;
      card.style.setProperty('--c', w.color);
      chip.style.setProperty('--c', w.color);
      chip.querySelector('use').setAttribute('href', `#i-wx-${w.id}`);
      chip.setAttribute('aria-label', `${w.label} weather – show details`);
      card.innerHTML = `<div class="wc-head"><svg class="wx-ico"><use href="#i-wx-${w.id}" /></svg><span class="wc-name">${esc(w.label)}</span><span class="wc-time num"></span>
          <button class="wc-close" type="button" aria-label="Close weather details">×</button></div>
        <div class="wc-bar"><div></div></div><ul>${w.effects.map((e) => `<li>${esc(e)}</li>`).join('')}</ul>
        <button class="wc-off btn-secondary" type="button">Turn weather off</button>`;
    }
    chip.hidden = !phone;
    card.hidden = phone && !this.weatherExpanded;
    chip.disabled = this.placing;
    const secs = `${Math.ceil(rem)}s`;
    const t = chip.querySelector('.wx-time');
    if (t.textContent !== secs) t.textContent = secs;
    const ct = card.querySelector('.wc-time');
    if (ct.textContent !== secs) ct.textContent = secs;
    card.querySelector('.wc-bar div').style.width = `${(rem / game.weather.settings.duration) * 100}%`;
  }

  setWeatherExpanded(on) {
    const open = !!on && !this.placing && !!this.weatherKey;
    this.weatherExpanded = open;
    this.el.weatherChip.setAttribute('aria-expanded', String(open));
    this.el.weatherCard.classList.toggle('expanded', open);
    if (document.documentElement.classList.contains('phone')) this.el.weatherCard.hidden = !open || !this.weatherKey;
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
      const bonus = def.passive?.bonus ? def.passive.bonus(game.passiveContext(def)) : null;
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

  /**
   * Unit panel. The frame (header, buttons) is built once per selected unit and
   * then only updated in place, so buttons are never replaced under the
   * player's finger – a click always lands, even mid-battle. The stats body is
   * re-rendered only when its text actually changes.
   */
  renderUnitPanel(game, ui) {
    const u = ui?.selected;
    const panel = this.el.unitPanel;
    if (!u || !u.placed) {
      if (this.panelUnit) {
        this.panelUnit = null;
        panel.hidden = true;
        document.getElementById('app')?.classList.remove('inspecting');
      }
      return;
    }
    const def = u.def;
    if (this.panelUnit !== u) {
      this.panelUnit = u;
      this.panelBody = '';
      const tier = getTier(def.tier);
      panel.innerHTML = `
        <div class="up-head"><img alt="" src="${portrait(def, 96)}" /><div><h3>${esc(def.name)}</h3><div class="ds-sub"><span class="up-tier" style="--c:${tier.color}">${esc(tier.label)}</span> · <span class="up-lv"></span></div><div class="up-quick"></div></div>
          <button class="up-close" data-act="close" aria-label="Close" type="button">×</button></div>
        <div class="up-body"></div>
        <div class="up-actions">
          <button class="btn-primary up-btn" data-act="upgrade" type="button" title="Upgrade (U)"></button>
          <button class="btn-secondary up-sell" data-act="sell" type="button" title="Sell (X)"></button>
        </div>`;
      this.panelEls = {
        lv: panel.querySelector('.up-lv'),
        quick: panel.querySelector('.up-quick'),
        body: panel.querySelector('.up-body'),
        up: panel.querySelector('.up-btn'),
        sell: panel.querySelector('.up-sell'),
      };
      panel.hidden = false;
      document.getElementById('app')?.classList.add('inspecting');
    }
    const info = game.upgradeInfo(u);
    const E = this.panelEls;
    const max = maxLevel(def);
    E.lv.textContent = `Level ${u.level} / ${max}`;
    // always-visible stat line for phones (the full comparison table scrolls below)
    const c = info.current;
    const quick = `${formatNumber(Math.round(c.damage * 10) / 10)} dmg · ${tiles(c.range)} range · ${c.rate.toFixed(2)}/s`;
    if (E.quick.textContent !== quick) E.quick.textContent = quick;
    // upgrade button: label, cost and affordability
    const upKey = info.maxed ? 'max' : `${info.cost}:${info.affordable}`;
    if (E.up.dataset.key !== upKey) {
      E.up.dataset.key = upKey;
      E.up.disabled = info.maxed || !info.affordable;
      E.up.classList.toggle('maxed', info.maxed);
      E.up.innerHTML = info.maxed
        ? 'Max level'
        : `<span>Upgrade</span><span class="up-cost"><span class="coin sm"></span>${formatNumber(info.cost)}</span>`;
    }
    const need = info.maxed || info.affordable ? '' : `Need ${formatNumber(info.cost - game.coins)} more coins`;
    if (E.up.title !== (need || 'Upgrade (U)')) E.up.title = need || 'Upgrade (U)';
    const sell = `Sell +${formatNumber(game.sellValue(u))}`;
    if (E.sell.textContent !== sell) E.sell.textContent = sell;
    const body = this.unitPanelBody(game, u, info, need);
    if (body !== this.panelBody) {
      this.panelBody = body;
      E.body.innerHTML = body;
    }
  }

  unitPanelBody(game, u, info, need) {
    const def = u.def;
    const n = game.deployedCount(def.id);
    const cur = info.current;
    const nx = info.maxed ? null : info.next;
    const f1 = (v) => formatNumber(Math.round(v * 10) / 10);
    const row = (label, a, b, fmt) => {
      const show = b !== undefined && b !== null;
      const up = show && b > a + 1e-9;
      return `<tr><td>${label}</td><td>${fmt(a)}</td>${show ? `<td class="arrow">→</td><td class="${up ? 'up' : ''}">${fmt(b)}</td>` : '<td></td><td></td>'}</tr>`;
    };
    const pips = Array.from({ length: maxLevel(def) }, (_, i) => `<i class="${i < u.level ? 'on' : ''}"></i>`).join('');
    const bonusFn = def.passive?.bonus;
    const lines = u.ability?.describe?.(u, game) ?? [];
    const passive = def.passive
      ? `<div class="up-passive"><div class="row"><b>${esc(def.passive.name)}</b>${bonusFn ? `<span class="pct">+${Math.round(bonusFn(game.passiveContext(def)) * 100)}%</span>` : ''}</div>
         <div class="muted">${bonusFn ? `${n} ${esc(def.name)}${n === 1 ? '' : 's'} deployed · ` : ''}${esc(def.passive.summary)}</div>
         ${lines.length ? `<div class="up-now">At this level</div><ul class="up-lines">${lines.map((l) => `<li>${esc(l)}</li>`).join('')}</ul>` : ''}</div>`
      : '';
    const per = waveBonusPerWave(def.tier);
    const waveLine = per
      ? `<div class="up-wave"><b>Wave scaling +${Math.round(game.waveBonus(def) * 100)}%</b> damage · +${Math.round(per * 100)}% of base damage per wave cleared (${game.stats.wavesCleared} so far)</div>`
      : `<div class="up-wave muted">No wave scaling at ${esc(getTier(def.tier).label)} (Tier I–VI only)</div>`;
    const buffNames = (u.auras ?? []).map((id) => game.buffDefs().get(id)?.label ?? id);
    if (game.battleBonus?.damage) buffNames.push(`House Edge +${Math.round(game.battleBonus.damage * 100)}%`);
    if (game.weather.current) buffNames.push(`${game.weather.current.label} weather`);
    const buffs = buffNames.length ? `<div class="up-buffs muted small">Active buffs: ${buffNames.map(esc).join(' · ')}</div>` : '';
    return `
      <div class="up-pips" title="Upgrade level">${pips}</div>
      <div class="up-upgrade">
        <h4><span>${info.maxed ? `Level ${u.level} · maximum` : `Level ${info.level} → ${info.nextLevel}`}</span><span>${formatNumber(u.kills)} kills</span></h4>
        <table class="cmp">
          ${row('Damage', cur.damage, nx?.damage, f1)}
          ${row('Range', cur.range, nx?.range, tiles)}
          ${row('Attack speed', cur.rate, nx?.rate, (v) => `${v.toFixed(2)}/s`)}
          ${cur.splash ? row('Blast radius', cur.splash, nx?.splash, tiles) : ''}
          ${row('DPS', cur.damage * cur.rate, nx ? nx.damage * nx.rate : undefined, f1)}
        </table>
        ${info.maxed ? '<div class="up-max">Fully upgraded</div>' : `<div class="up-costline">Upgrade cost <b><span class="coin sm"></span>${formatNumber(info.cost)}</b>${need ? ` · <span class="up-need">${need}</span>` : ''}</div>`}
      </div>
      ${waveLine}
      ${passive}
      ${buffs}`;
  }
}
