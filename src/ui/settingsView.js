// Settings panel: graphics preset, accessibility toggles and the audio mix.
// Every change applies immediately and is saved in the profile.
import { qualityOf, AUDIO_CHANNELS, QUALITY } from '../meta/settings.js';

const NOTES = {
  auto: (q) => `Chosen for this device: ${q.label}.`,
  low: () => 'For older laptops and phones: static scenery, light particles, standard resolution.',
  medium: () => 'Animated scenery and weather at reduced density.',
  high: () => 'Full environment animation, wildlife and weather.',
  ultra: () => 'Everything, at full device resolution with extra environmental detail.',
};

export class SettingsView {
  /** onApply(settings) is called after every change; onMaster(on) toggles all sound. */
  constructor({ profile, onApply, onMaster }) {
    this.profile = profile;
    this.onApply = onApply;
    this.onMaster = onMaster;
    const $ = (id) => document.getElementById(id);
    this.root = $('screen-settings');
    this.el = {
      quality: $('set-quality'), note: $('set-quality-note'),
      ambient: $('set-ambient'), weather: $('set-weatherfx'), intense: $('set-intense'), shake: $('set-shake'), master: $('set-master'),
    };
    this.el.quality.addEventListener('click', (ev) => {
      const b = ev.target.closest('[data-q]');
      if (!b) return;
      this.s.graphics = b.dataset.q;
      this.commit();
    });
    const bindToggle = (el, key) => el.addEventListener('change', () => {
      this.s[key] = el.checked;
      this.commit();
    });
    bindToggle(this.el.ambient, 'ambientLife');
    bindToggle(this.el.weather, 'weatherFx');
    bindToggle(this.el.intense, 'intenseFx');
    bindToggle(this.el.shake, 'shake');
    for (const c of AUDIO_CHANNELS) {
      $(`set-vol-${c}`).addEventListener('input', (ev) => {
        this.s.volume[c] = Number(ev.target.value) / 100;
        this.commit(false);
      });
      $(`set-mute-${c}`).addEventListener('change', (ev) => {
        this.s.mute[c] = ev.target.checked;
        this.commit();
      });
    }
    this.el.master.addEventListener('change', () => this.onMaster(this.el.master.checked));
    for (const id of ['btn-settings-close', 'btn-settings-done']) $(id).addEventListener('click', () => this.close());
    this.root.addEventListener('click', (ev) => ev.target === this.root && this.close());
    document.addEventListener('keydown', (ev) => ev.key === 'Escape' && !this.root.hidden && this.close());
  }

  get s() {
    return this.profile.data.settings;
  }

  open() {
    this.render();
    this.root.hidden = false;
  }

  close() {
    this.root.hidden = true;
    this.onClose?.();
  }

  get isOpen() {
    return !this.root.hidden;
  }

  commit(rerender = true) {
    this.profile.save();
    this.onApply(this.s);
    if (rerender) this.render();
  }

  render() {
    const s = this.s;
    const q = qualityOf(s);
    for (const b of this.el.quality.querySelectorAll('[data-q]')) b.setAttribute('aria-checked', String(b.dataset.q === s.graphics));
    this.el.note.textContent = (NOTES[s.graphics] ?? NOTES.high)(q ?? QUALITY.high);
    this.el.ambient.checked = s.ambientLife;
    this.el.weather.checked = s.weatherFx;
    this.el.intense.checked = s.intenseFx;
    this.el.shake.checked = s.shake;
    this.el.master.checked = !this.profile.data.muted;
    for (const c of AUDIO_CHANNELS) {
      document.getElementById(`set-vol-${c}`).value = Math.round(s.volume[c] * 100);
      document.getElementById(`set-mute-${c}`).checked = s.mute[c];
    }
  }
}
