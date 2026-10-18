// DOM layer: money counter, chips, upgrade tiles, welcome-back modal, sound toggle.
import { UPGRADES, UPGRADE_ORDER } from './config.63f07cfa.js';
import { upgradeValue, upgradeCost, formatMoney, maxDepth, maxFish } from './economy.63f07cfa.js';

const $ = (selector, root = document) => root.querySelector(selector);

// The current value omits the unit, the next value carries it: "40 > 55 m", "$0 > $2/min".
function formatValue(kind, value, withUnit) {
  const unit = withUnit ? UPGRADES[kind].unit : '';
  return (kind === 'offline' ? formatMoney(value) : String(value)) + unit;
}

export function createUi(game, handlers, reducedMotion) {
  const el = {
    money: $('#money'),
    depth: $('#chip-depth'),
    fish: $('#chip-fish'),
    hint: $('#hint'),
    cast: $('#cast'),
    sound: $('#sound'),
    welcome: $('#welcome'),
    amount: $('#welcome-amount'),
    collect: $('#welcome-collect'),
    tiles: UPGRADE_ORDER.map((kind) => ({ kind, root: $(`.tile[data-kind="${kind}"]`) }))
  };
  const ui = { el, shown: game.state.money, held: false, cache: {}, reduced: reducedMotion };

  el.cast.addEventListener('click', () => handlers.onCast());
  el.sound.addEventListener('click', () => handlers.onToggleSound());
  for (const tile of el.tiles) {
    $('.pill-buy', tile.root).addEventListener('click', () => handlers.onBuy(tile.kind));
  }
  el.collect.addEventListener('click', () => el.welcome.close());
  el.welcome.addEventListener('close', () => {
    ui.held = false;
    handlers.onCollect();
  });
  renderSound(ui, game);
  renderTiles(ui, game);
  return ui;
}

function setText(ui, key, node, text) {
  if (ui.cache[key] === text) return;
  ui.cache[key] = text;
  node.textContent = text;
}

export function renderSound(ui, game) {
  const on = !game.state.muted;
  setText(ui, 'sound', ui.el.sound, on ? 'Sound on' : 'Sound off');
  ui.el.sound.setAttribute('aria-pressed', String(on));
}

// The Buy pill is two spans so a narrow tile can drop the word and keep the price on one line.
function setBuyLabel(ui, kind, button, price) {
  const key = kind + 'btn';
  if (ui.cache[key] === price) return;
  ui.cache[key] = price;
  button.textContent = '';
  button.classList.toggle('is-long', price !== null && price.length >= 6);
  if (price === null) {
    button.textContent = 'Maxed';
    button.removeAttribute('aria-label');
    return;
  }
  const word = document.createElement('span');
  word.className = 'buy-word';
  word.textContent = 'Buy ';
  const amount = document.createElement('span');
  amount.textContent = price;
  button.append(word, amount);
  button.setAttribute('aria-label', 'Buy ' + price);
}

export function renderTiles(ui, game) {
  const { levels, money } = game.state;
  for (const { kind, root } of ui.el.tiles) {
    const level = levels[kind];
    const cost = upgradeCost(kind, level);
    const button = $('.pill-buy', root);
    const maxed = cost === null;
    setText(ui, kind + 'cur', $('.cur', root), formatValue(kind, upgradeValue(kind, level), false));
    setText(ui, kind + 'nxt', $('.nxt', root), maxed ? 'MAX' : formatValue(kind, upgradeValue(kind, level + 1), true));
    setBuyLabel(ui, kind, button, maxed ? null : formatMoney(cost));
    const affordable = !maxed && money >= cost;
    button.disabled = !affordable;
    root.classList.toggle('is-locked', !affordable);
    root.dataset.level = String(level);
  }
}

function renderChips(ui, game) {
  const diving = game.phase === 'drop' || game.phase === 'ascend';
  const s = game.state;
  if (diving) {
    const depth = Math.max(0, Math.floor(game.hook.depth));
    setText(ui, 'depth', ui.el.depth, `${depth} m / ${maxDepth(s.levels)} m`);
    setText(ui, 'fish', ui.el.fish, `${game.caught.length} / ${maxFish(s.levels)} fish`);
  } else if (game.phase === 'cashout') {
    const left = game.caught.filter((c) => c.state !== 'done').length;
    setText(ui, 'depth', ui.el.depth, `${left} left to grab`);
    setText(ui, 'fish', ui.el.fish, `${game.caught.length} / ${maxFish(s.levels)} fish`);
  } else {
    setText(ui, 'depth', ui.el.depth, `Best ${s.bestDepth} m`);
    setText(ui, 'fish', ui.el.fish, `Caught ${s.totalCaught}`);
  }
}

function renderHint(ui, game) {
  const phase = game.phase;
  let text = '';
  if (phase === 'drop' || phase === 'ascend') {
    if (game.state.totalCaught < 3) text = 'Drag or use arrow keys to steer';
  } else if (phase === 'cashout') {
    text = 'Tap the fish for full price';
  }
  ui.el.hint.hidden = text === '';
  setText(ui, 'hint', ui.el.hint, text);
}

function rollMoney(ui, game, dt) {
  const target = game.state.money;
  if (ui.held) return;
  if (ui.reduced || Math.abs(target - ui.shown) < 1) {
    ui.shown = target;
  } else {
    ui.shown += (target - ui.shown) * (1 - Math.exp(-12 * dt));
    if (Math.abs(target - ui.shown) < 1) ui.shown = target;
  }
  setText(ui, 'money', ui.el.money, formatMoney(Math.round(ui.shown)));
}

export function updateUi(ui, game, dt) {
  const key = game.state.money + ':' + game.state.levels.fish + game.state.levels.depth + game.state.levels.offline;
  if (ui.cache.tilesKey !== key) {
    ui.cache.tilesKey = key;
    renderTiles(ui, game);
  }
  rollMoney(ui, game, dt);
  renderChips(ui, game);
  renderHint(ui, game);
  const idle = game.phase === 'idle';
  ui.el.cast.hidden = !idle;
  document.body.dataset.phase = game.phase;
}

export function showWelcome(ui, earned, shownBefore) {
  ui.held = true;
  ui.shown = shownBefore;
  setText(ui, 'money', ui.el.money, formatMoney(shownBefore));
  ui.el.amount.textContent = 'You earned ' + formatMoney(earned);
  if (!ui.el.welcome.open) ui.el.welcome.showModal();
  ui.el.collect.focus();
}
