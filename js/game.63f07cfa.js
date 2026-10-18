// Game rules: the idle / drop / ascend / cashout state machine and the hook.
import { TUNING, WATERLINE_Y, PX_PER_M, PALETTE } from './config.63f07cfa.js';
import { maxDepth, maxFish } from './economy.63f07cfa.js';
import { createWorld, updateWorld, findHit, removeFish } from './world.63f07cfa.js';
import { createEffects, updateEffects, addSplash, addSparks, addShake, addTrailBubble } from './effects.63f07cfa.js';
import { boatGeometry } from './geometry.63f07cfa.js';
import { startCashout, updateCashout } from './cashout.63f07cfa.js';

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

export function createGame({ save, rng, assets, audio, view, reducedMotion, onEvent }) {
  const game = {
    state: save,
    phase: 'idle',
    time: 0,
    rng,
    assets,
    audio,
    view,
    onEvent: onEvent || (() => {}),
    world: createWorld(rng),
    fx: createEffects(rng, reducedMotion),
    hook: { x: 270, targetX: 270, depth: 0, splashed: false, retract: 1 },
    caught: [],
    keys: { left: false, right: false },
    camY: 0,
    tickClock: 0,
    trailClock: 0,
    dive: { reached: 0 }
  };
  resetHook(game);
  return game;
}

export function boat(game) {
  return boatGeometry(game.assets.boat, game.time);
}

export function resetHook(game) {
  const geo = boat(game);
  game.hook.x = geo.tipX;
  game.hook.targetX = geo.tipX;
  game.hook.depth = (geo.tipY + 16 - WATERLINE_Y) / PX_PER_M;
  game.hook.splashed = false;
  game.hook.retract = 1;
}

export function hookY(game) {
  return WATERLINE_Y + game.hook.depth * PX_PER_M;
}

export function sinkSpeed(game) {
  return TUNING.sinkSpeed * (1 + maxDepth(game.state.levels) * TUNING.sinkDepthGain);
}

export function cast(game) {
  if (game.phase !== 'idle') return false;
  resetHook(game);
  game.phase = 'drop';
  game.dive.reached = 0;
  game.tickClock = 0;
  game.onEvent('phase');
  return true;
}

export function setTargetX(game, x) {
  game.hook.targetX = clamp(x, TUNING.hookMinX, TUNING.hookMaxX);
}

function steer(game, dt) {
  const hook = game.hook;
  const dir = (game.keys.right ? 1 : 0) - (game.keys.left ? 1 : 0);
  if (dir !== 0) setTargetX(game, hook.targetX + dir * TUNING.keySpeed * dt);
  const ease = (hook.targetX - hook.x) * (1 - Math.exp(-TUNING.steerEase * dt));
  const limit = TUNING.steerMaxSpeed * dt;
  hook.x = clamp(hook.x + clamp(ease, -limit, limit), TUNING.hookMinX, TUNING.hookMaxX);
}

function attach(game, fish) {
  removeFish(game.world, fish);
  game.caught.push({ sp: fish.sp, value: fish.sp.value, wig: game.rng() * 6.28, state: 'hooked' });
  game.audio.plink();
  addSparks(game.fx, game.hook.x, hookY(game), 8, PALETTE.white);
  game.onEvent('caught');
}

function turn(game) {
  game.phase = 'ascend';
  game.audio.plink();
  game.onEvent('phase');
}

function updateDrop(game, dt) {
  const hook = game.hook;
  const inAir = hook.depth < 0;
  hook.depth += (inAir ? TUNING.airSpeed : sinkSpeed(game)) * dt;
  steer(game, dt);
  if (!hook.splashed && hook.depth >= 0) {
    hook.splashed = true;
    addSplash(game.fx, hook.x, WATERLINE_Y);
    addShake(game.fx, 5);
    game.audio.splash();
  }
  if (hook.depth <= 0) return;
  trail(game, dt);
  game.dive.reached = Math.max(game.dive.reached, hook.depth);
  const hit = findHit(game.world, hook.x, hookY(game), TUNING.hookRadius);
  if (hit) {
    attach(game, hit);
    turn(game);
  } else if (hook.depth >= maxDepth(game.state.levels)) {
    hook.depth = maxDepth(game.state.levels);
    turn(game);
  }
}

function trail(game, dt) {
  game.trailClock += dt;
  if (game.trailClock > 0.09) {
    game.trailClock = 0;
    addTrailBubble(game.fx, game.hook.x, hookY(game));
  }
}

function noteBest(game) {
  const s = game.state;
  if (game.dive.reached > s.bestDepth) {
    s.bestDepth = Math.floor(game.dive.reached);
    game.onEvent('best');
  }
}

function updateAscend(game, dt) {
  const hook = game.hook;
  hook.depth -= sinkSpeed(game) * TUNING.ascendMul * dt;
  steer(game, dt);
  trail(game, dt);
  game.tickClock += dt;
  if (game.tickClock >= TUNING.tickEvery) {
    game.tickClock = 0;
    game.audio.tick(game.caught.length);
  }
  if (game.caught.length < maxFish(game.state.levels)) {
    const hit = findHit(game.world, hook.x, hookY(game), TUNING.hookRadius);
    if (hit) attach(game, hit);
  }
  if (hook.depth <= 0) {
    hook.depth = 0;
    surface(game);
  }
}

function surface(game) {
  noteBest(game);
  addSplash(game.fx, game.hook.x, WATERLINE_Y, 10);
  game.audio.splash();
  if (game.caught.length === 0) {
    game.phase = 'idle';
    resetHook(game);
    game.onEvent('phase');
    return;
  }
  startCashout(game);
}

function updateCamera(game, dt) {
  const diving = game.phase === 'drop' || game.phase === 'ascend';
  const want = diving ? Math.max(0, hookY(game) - TUNING.anchor * game.view.h) : 0;
  game.camY += (want - game.camY) * (1 - Math.exp(-TUNING.camEase * dt));
  if (Math.abs(want - game.camY) < 0.01) game.camY = want;
}

export function visibleMeters(game) {
  return [(game.camY - WATERLINE_Y) / PX_PER_M, (game.camY + game.view.h - WATERLINE_Y) / PX_PER_M];
}

export function update(game, dt) {
  game.time += dt;
  if (game.phase === 'drop') updateDrop(game, dt);
  else if (game.phase === 'ascend') updateAscend(game, dt);
  else if (game.phase === 'cashout') updateCashout(game, dt);
  else idleHook(game);
  updateCamera(game, dt);
  const [top, bottom] = visibleMeters(game);
  updateWorld(game.world, dt, top, bottom);
  updateEffects(game.fx, dt, game.camY, game.view.h, game.time);
}

function idleHook(game) {
  const geo = boat(game);
  game.hook.x = geo.tipX;
  game.hook.targetX = geo.tipX;
  game.hook.depth = (geo.tipY + 16 - WATERLINE_Y) / PX_PER_M;
}
