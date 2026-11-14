// Responsive layout helper. CSS does almost all of the work; this only moves
// the one control group that changes place between layouts, so every button
// keeps a single DOM node (and its listeners) in every layout:
//   desktop – pause + speed sit in the top HUD
//   phones  – portrait: they join the bottom control bar next to Call wave / Auto Skip
//             (landscape keeps them in the wide top bar),
//             and the weather card moves off the battlefield into the dock
// It also tags <html> with the layout so CSS and code agree on it.

export const PHONE_QUERY = '(max-width: 760px), (max-height: 520px)';
export const LANDSCAPE_PHONE_QUERY = '(max-height: 520px) and (orientation: landscape)';
export const NARROW_QUERY = '(max-width: 379px)';

export function initResponsive({ onChange } = {}) {
  const phone = window.matchMedia(PHONE_QUERY);
  const landscape = window.matchMedia(LANDSCAPE_PHONE_QUERY);
  const narrow = window.matchMedia(NARROW_QUERY);
  const play = document.getElementById('play-controls');
  const topSlot = play.parentElement;
  const dockSlot = document.getElementById('dock-controls');
  // the weather card overlays the battlefield on desktop; on phones it becomes a strip in the dock
  const weather = document.getElementById('weather-card');
  const weatherHome = weather.parentElement;
  const weatherSlot = document.getElementById('dock-weather');
  const apply = () => {
    const isPhone = phone.matches;
    const sideways = isPhone && landscape.matches;
    document.documentElement.classList.toggle('phone', isPhone);
    document.documentElement.classList.toggle('phone-landscape', sideways);
    document.documentElement.classList.toggle('narrow', isPhone && narrow.matches);
    // portrait phones: pause/speed join the bottom bar; sideways the wide top bar has room for them
    const toDock = isPhone && !sideways;
    if (toDock && play.parentElement !== dockSlot) dockSlot.appendChild(play);
    if (!toDock && play.parentElement !== topSlot) topSlot.prepend(play);
    if (isPhone && weather.parentElement !== weatherSlot) weatherSlot.appendChild(weather);
    if (!isPhone && weather.parentElement !== weatherHome) weatherHome.appendChild(weather);
    onChange?.({ phone: isPhone, landscape: isPhone && landscape.matches });
  };
  phone.addEventListener('change', apply);
  landscape.addEventListener('change', apply);
  narrow.addEventListener('change', apply);
  apply();
  return { isPhone: () => phone.matches };
}
