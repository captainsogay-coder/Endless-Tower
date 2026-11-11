// Turns a wave plan into a timed list of spawn events: which category, from
// which entrance, when, and with what lateral offset on the road.

import { GAME_CONFIG } from '../config.js';

function orderUnits(plan, rng) {
  const lead = [];
  const front = [];
  const tail = [];
  const inter = [];
  plan.groups.forEach((g, gi) => {
    for (let i = 0; i < g.count; i++) {
      const unit = { category: g.category, variant: g.variant, traits: g.traits, cinematic: !!g.cinematic && i === 0 };
      if (gi === 0) lead.push(unit);
      else if (g.mix === 'front') front.push(unit);
      else if (g.mix === 'tail') tail.push(unit);
      else inter.push(unit);
    }
  });
  // Spread interleaved supporters evenly through the lead group (with jitter).
  const merged = lead.slice();
  inter.forEach((u, k) => {
    const pos = Math.floor(((k + rng.float(0.2, 0.8)) / inter.length) * merged.length);
    merged.splice(Math.min(merged.length, pos + 1), 0, u);
  });
  return [...front, ...merged, ...tail];
}

export function buildSpawnSchedule(plan, map, rng) {
  const units = orderUnits(plan, rng);
  const routes = map.routes.length;
  const fixedRoute = rng.int(0, routes - 1);
  const altStart = rng.int(0, routes - 1);
  const events = [];
  const spacing = plan.spacing;
  let t = plan.isBoss ? 0 : 0.6;
  let burstLeft = 0;

  units.forEach((u, i) => {
    let route = fixedRoute;
    if (plan.entranceMode === 'alternate') route = (altStart + i) % routes;
    else if (plan.entranceMode === 'random') route = rng.int(0, routes - 1);

    events.push({
      t,
      category: u.category,
      variant: u.variant,
      traits: u.traits,
      route,
      cinematic: u.cinematic,
      lateral: rng.float(-1, 1) * (u.category === 'boss' ? 2 : u.category === 'elite' ? 5 : 8),
      offset: rng.float(0, 8),
    });

    if (u.cinematic) {
      t += GAME_CONFIG.bossIntroDuration + 0.6;
      return;
    }
    const progress = i / Math.max(1, units.length - 1);
    switch (plan.pattern) {
      case 'burst':
        if (burstLeft <= 0) burstLeft = rng.int(5, 10);
        burstLeft--;
        t += burstLeft === 0 ? spacing * rng.float(5, 8) : spacing * 0.3;
        break;
      case 'surge':
        t += spacing * (1.7 - 1.3 * progress) * rng.float(0.85, 1.15);
        break;
      case 'pincer':
        // pairs arrive together from alternating entrances
        t += i % 2 === 0 ? spacing * 0.15 : spacing * 1.7;
        break;
      default:
        t += spacing * rng.float(0.8, 1.2);
    }
  });
  events.sort((a, b) => a.t - b.t);
  return events;
}
