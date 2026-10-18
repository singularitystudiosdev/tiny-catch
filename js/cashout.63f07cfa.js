// Cash-out: caught fish are flung up in a staggered fountain; tapping one collects its full
// value, a fish that falls back into the sea is auto-collected at half value.
// Each airborne fish gets its own landing lane and apex tier, chosen to stay clear of the fish
// already in the air, fully inside the canvas and below the HUD (view.hudBottom).
import { TUNING, WATERLINE_Y, VIEW_W, PALETTE } from './config.63f07cfa.js';
import { addSplash, addSparks, addFloater, addShake } from './effects.63f07cfa.js';
import { formatMoney } from './economy.63f07cfa.js';

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

// Half extents of the drawn sprite's bounding box at the largest tilt.
export function fishHalfExtents(game, sp) {
  const w = sp.w * TUNING.airScale;
  const h = w * game.assets.fish[sp.id].aspect;
  const a = TUNING.tilt;
  return {
    hw: (w * Math.cos(a) + h * Math.sin(a)) / 2,
    hh: (w * Math.sin(a) + h * Math.cos(a)) / 2
  };
}

export function startCashout(game) {
  game.phase = 'cashout';
  game.cashClock = 0;
  game.caught.forEach((item, i) => {
    item.launchIn = i * TUNING.stagger;
    item.t = 0;
    item.x = game.hook.x;
    item.y = WATERLINE_Y;
  });
  game.onEvent('phase');
}

// Position on the arc: sideways from the hook to the lane and back, up to the apex and down.
function arcAt(x0, lane, apex, t) {
  const T = TUNING.airTime;
  const vy0 = (4 * apex) / T;
  const g = (8 * apex) / (T * T);
  return {
    x: x0 + (lane - x0) * Math.sin((Math.PI * t) / T),
    y: WATERLINE_Y - (vy0 * t - 0.5 * g * t * t)
  };
}

const CHECK_STEPS = 8;

// How close the candidate arc comes to the fish already airborne, in sprite sizes, comparing
// both at the same moment (1 or more means no overlap).
function slotScore(game, cand, hw, hh) {
  let score = 99;
  for (const o of game.caught) {
    if (o.state !== 'air') continue;
    for (let k = 0; k <= CHECK_STEPS; k += 1) {
      const t = (TUNING.airTime * k) / CHECK_STEPS;
      const mine = arcAt(cand.x0, cand.lane, cand.apex, t);
      const theirs = arcAt(o.x0, o.lane, o.apex, Math.min(TUNING.airTime, o.t + t));
      if (o.t + t > TUNING.airTime) continue;
      const dx = Math.abs(mine.x - theirs.x) / (hw + o.hw);
      const dy = Math.abs(mine.y - theirs.y) / (hh + o.hh);
      score = Math.min(score, Math.max(dx, dy));
    }
  }
  return score + game.rng() * 0.01;
}

// Picks the (lane, apex tier) pair whose arc stays furthest from every airborne fish.
function chooseSlot(game, x0, hw, hh) {
  const { lanes, laneMin, laneMax, edgePad, apexTiers, apexMin } = TUNING;
  const room = WATERLINE_Y - (game.view.hudBottom + hh);
  let best = null;
  for (let i = 0; i < lanes; i += 1) {
    const raw = VIEW_W * (laneMin + ((laneMax - laneMin) * i) / (lanes - 1));
    const lane = clamp(raw, hw + edgePad, VIEW_W - hw - edgePad);
    for (const tier of apexTiers) {
      const cand = { x0, lane, apex: Math.max(apexMin, room * tier) };
      const score = slotScore(game, cand, hw, hh);
      if (!best || score > best.score) best = { ...cand, score };
    }
  }
  return best;
}

function launch(game, item) {
  const { hw, hh } = fishHalfExtents(game, item.sp);
  const x0 = clamp(game.hook.x, hw + TUNING.edgePad, VIEW_W - hw - TUNING.edgePad);
  const slot = chooseSlot(game, x0, hw, hh);
  Object.assign(item, {
    state: 'air', hw, hh, x0, lane: slot.lane, apex: slot.apex,
    dir: slot.lane >= x0 ? 1 : -1, t: Math.max(0, -item.launchIn)
  });
  addSplash(game.fx, x0, WATERLINE_Y, 6);
  addShake(game.fx, 3);
  game.audio.splash();
}

function moveItem(item) {
  const p = arcAt(item.x0, item.lane, item.apex, item.t);
  item.x = p.x;
  item.y = p.y;
  item.rot = -TUNING.tilt * Math.sin((2 * Math.PI * item.t) / TUNING.airTime);
}

function resolve(game, item, fraction) {
  const full = fraction === 1;
  const pay = full ? item.value : Math.max(1, Math.round(item.value * fraction));
  item.state = 'done';
  item.paid = pay;
  game.state.money += pay;
  game.state.totalCaught += 1;
  addFloater(game.fx, item.x, Math.min(item.y, WATERLINE_Y - 20), '+' + formatMoney(pay), full);
  if (full) {
    addSparks(game.fx, item.x, item.y, 12, PALETTE.sun);
    game.audio.coin();
  } else {
    addSplash(game.fx, item.x, WATERLINE_Y, 6);
    game.audio.miss();
  }
  game.onEvent('money');
}

export function tapAt(game, x, y) {
  if (game.phase !== 'cashout') return false;
  const wy = y + game.camY;
  let best = null;
  let bestDist = Infinity;
  for (const item of game.caught) {
    if (item.state !== 'air') continue;
    const reach = Math.max(TUNING.tapRadius, item.hw);
    const d = Math.hypot(item.x - x, item.y - wy);
    if (d <= reach && d < bestDist) {
      best = item;
      bestDist = d;
    }
  }
  if (!best) return false;
  resolve(game, best, 1);
  return true;
}

function stepItem(game, item, dt) {
  if (item.state === 'hooked') {
    item.launchIn -= dt;
    if (item.launchIn <= 0) launch(game, item);
  } else if (item.state === 'air') {
    item.t += dt;
    if (item.t >= TUNING.airTime) {
      item.t = TUNING.airTime;
      moveItem(item);
      resolve(game, item, TUNING.autoFrac);
    } else {
      moveItem(item);
    }
  }
}

export function updateCashout(game, dt) {
  game.cashClock += dt;
  game.hook.retract = Math.max(0, 1 - game.cashClock / 0.45);
  for (const item of game.caught) stepItem(game, item, dt);
  if (game.caught.every((item) => item.state === 'done')) {
    game.finishClock = (game.finishClock || 0) + dt;
    if (game.finishClock > 0.4) finish(game);
  }
}

function finish(game) {
  game.finishClock = 0;
  game.caught = [];
  game.phase = 'idle';
  game.hook.retract = 1;
  game.onEvent('phase');
}
