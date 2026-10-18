// Bootstrap: wires save, audio, assets, game, UI, input, the frame loop and the test hook.
import { VIEW_W, BASE_H, MAX_VIEW_H, OFFLINE_MIN_AWAY_S, SPECIES } from './config.63f07cfa.js';
import { loadSave, writeSave } from './save.63f07cfa.js';
import { createAudio } from './audio.63f07cfa.js';
import { createAssets } from './assets.63f07cfa.js';
import { createRng, seedFromLocation } from './rng.63f07cfa.js';
import { createGame, cast, update, setTargetX } from './game.63f07cfa.js';
import { clearWorld, placeFish } from './world.63f07cfa.js';
import { render } from './render.63f07cfa.js';
import { createUi, updateUi, renderSound, showWelcome } from './ui.63f07cfa.js';
import { attachInput, toClient } from './input.63f07cfa.js';
import { buyUpgrade, offlineEarnings, maxDepth, maxFish, offlineRate } from './economy.63f07cfa.js';

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const canvas = document.getElementById('game');
const stage = document.getElementById('stage');
const ctx = canvas.getContext('2d');
const view = { w: VIEW_W, h: BASE_H, pxScale: 1, hudBottom: 230 };

function layout() {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const logicalH = Math.min(MAX_VIEW_H, Math.max(BASE_H, (VIEW_W * vh) / vw));
  const cssW = Math.min(vw, (vh * VIEW_W) / logicalH);
  const cssH = (cssW * logicalH) / VIEW_W;
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  view.h = logicalH;
  view.pxScale = (cssW * dpr) / VIEW_W;
  canvas.width = Math.round(cssW * dpr);
  canvas.height = Math.round(cssH * dpr);
  canvas.logicalH = logicalH;
  stage.style.setProperty('--stage-w', cssW + 'px');
  stage.style.setProperty('--stage-h', cssH + 'px');
  stage.style.setProperty('--hud-scale', String(cssW / VIEW_W));
  measureHud(cssW);
}

// Bottom edge of the money counter and chips, in logical canvas units: fish stay below it.
function measureHud(cssW) {
  const block = document.querySelector('.money-block');
  const bottom = block.getBoundingClientRect().bottom - stage.getBoundingClientRect().top;
  view.hudBottom = (bottom + 8) / (cssW / VIEW_W);
}

const save = loadSave();
const audio = createAudio(save.muted);
const assets = createAssets();
let game = null;
let ui = null;

function persist() {
  writeSave(game.state);
}

function onEvent(name) {
  if (name === 'money' || name === 'best' || name === 'caught') persist();
}

function claimOffline() {
  const now = Date.now();
  const awayS = (now - game.state.lastSeen) / 1000;
  if (awayS < OFFLINE_MIN_AWAY_S) return;
  const earned = offlineEarnings(game.state.levels, awayS);
  game.state.lastSeen = now;
  if (earned < 1) return;
  const before = game.state.money;
  game.state.money += earned;
  persist();
  showWelcome(ui, earned, before);
}

const handlers = {
  onCast() {
    audio.unlock();
    cast(game);
  },
  onBuy(kind) {
    audio.unlock();
    if (buyUpgrade(game.state, kind) > 0) {
      audio.buy();
      persist();
    }
  },
  onToggleSound() {
    audio.unlock();
    game.state.muted = !game.state.muted;
    audio.setMuted(game.state.muted);
    renderSound(ui, game);
    persist();
  },
  onCollect() {
    audio.coin();
  }
};

let timeScale = 1;
let last = performance.now();

function frame(now) {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  let remaining = dt * timeScale;
  while (remaining > 0) {
    const step = Math.min(remaining, 1 / 60);
    update(game, step);
    remaining -= step;
  }
  updateUi(ui, game, dt);
  render(ctx, game);
  requestAnimationFrame(frame);
}

function airSnapshot() {
  return game.caught
    .filter((c) => c.state === 'air')
    .map((c) => ({
      id: c.sp.id,
      value: c.value,
      x: c.x,
      y: c.y - game.camY,
      left: c.x - c.hw,
      right: c.x + c.hw,
      top: c.y - c.hh - game.camY,
      bottom: c.y + c.hh - game.camY
    }));
}

function stateSnapshot() {
  const s = game.state;
  return {
    phase: game.phase,
    money: s.money,
    depth: Math.max(0, game.hook.depth),
    hookX: game.hook.x,
    maxDepth: maxDepth(s.levels),
    maxFish: maxFish(s.levels),
    caught: game.caught.length,
    levels: { ...s.levels },
    offlineRate: offlineRate(s.levels),
    bestDepth: s.bestDepth,
    totalCaught: s.totalCaught,
    muted: s.muted,
    assets: assets.source,
    viewH: view.h,
    hudBottom: view.hudBottom,
    air: airSnapshot(),
    values: game.caught.map((c) => c.value)
  };
}

function exposeTestHook() {
  window.__tc = {
    get state() {
      return stateSnapshot();
    },
    debug: {
      setMoney(n) {
        game.state.money = Math.max(0, Math.floor(n));
        persist();
      },
      cast() {
        return cast(game);
      },
      steer(x) {
        setTargetX(game, x);
      },
      setTimeScale(n) {
        timeScale = Math.min(20, Math.max(0.1, n));
      },
      toClient(x, y) {
        return toClient(canvas, x, y);
      },
      noFish(off) {
        game.world.disabled = off;
        clearWorld(game.world);
      },
      placeFish(id, depth, x) {
        placeFish(game.world, SPECIES.find((s) => s.id === id), depth, x);
      }
    }
  };
}

function start() {
  layout();
  game = createGame({
    save, rng: createRng(seedFromLocation()), assets, audio, view, reducedMotion, onEvent
  });
  ui = createUi(game, handlers, reducedMotion);
  attachInput(canvas, game, audio);
  exposeTestHook();
  window.addEventListener('resize', layout);
  document.fonts?.ready.then(layout);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) persist();
    else claimOffline();
  });
  window.addEventListener('pagehide', persist);
  setInterval(() => {
    if (!document.hidden) persist();
  }, 10000);
  claimOffline();
  requestAnimationFrame(frame);
}

start();
