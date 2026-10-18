// Persistence: one localStorage record, sanitized on read.
import { SAVE_KEY, UPGRADES } from './config.63f07cfa.js';

export function defaultSave() {
  return {
    money: 0,
    levels: { fish: 0, depth: 0, offline: 0 },
    lastSeen: Date.now(),
    bestDepth: 0,
    totalCaught: 0,
    muted: false
  };
}

function num(value, fallback, min, max) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

export function sanitize(raw) {
  const base = defaultSave();
  if (!raw || typeof raw !== 'object') return base;
  const levels = raw.levels || {};
  for (const kind of Object.keys(UPGRADES)) {
    base.levels[kind] = Math.floor(num(levels[kind], 0, 0, UPGRADES[kind].maxLevel));
  }
  base.money = Math.floor(num(raw.money, 0, 0, Number.MAX_SAFE_INTEGER));
  base.lastSeen = num(raw.lastSeen, Date.now(), 0, Date.now());
  base.bestDepth = num(raw.bestDepth, 0, 0, 1000);
  base.totalCaught = Math.floor(num(raw.totalCaught, 0, 0, Number.MAX_SAFE_INTEGER));
  base.muted = raw.muted === true;
  return base;
}

export function loadSave(storage = window.localStorage) {
  try {
    const text = storage.getItem(SAVE_KEY);
    return sanitize(text ? JSON.parse(text) : null);
  } catch {
    return defaultSave();
  }
}

export function writeSave(state, storage = window.localStorage) {
  state.lastSeen = Date.now();
  const record = {
    money: state.money,
    levels: { ...state.levels },
    lastSeen: state.lastSeen,
    bestDepth: state.bestDepth,
    totalCaught: state.totalCaught,
    muted: state.muted
  };
  try {
    storage.setItem(SAVE_KEY, JSON.stringify(record));
  } catch {
    // Storage can be full or blocked; the game keeps running from memory.
  }
}
