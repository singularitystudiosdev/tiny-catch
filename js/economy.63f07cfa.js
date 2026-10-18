// Pure upgrade math: values, prices, purchases, offline earnings. No DOM access.
import { UPGRADES, DEPTH_CAP, OFFLINE_CAP_MIN } from './config.63f07cfa.js';

export function upgradeValue(kind, level) {
  const u = UPGRADES[kind];
  const raw = u.start + u.step * level;
  return kind === 'depth' ? Math.min(DEPTH_CAP, raw) : raw;
}

export function upgradeCost(kind, level) {
  const u = UPGRADES[kind];
  if (level >= u.maxLevel) return null;
  return Math.ceil(u.base + u.scale * Math.pow(level, u.power));
}

export function maxFish(levels) {
  return upgradeValue('fish', levels.fish);
}

export function maxDepth(levels) {
  return upgradeValue('depth', levels.depth);
}

export function offlineRate(levels) {
  return upgradeValue('offline', levels.offline);
}

export function canBuy(state, kind) {
  const cost = upgradeCost(kind, state.levels[kind]);
  return cost !== null && state.money >= cost;
}

// Returns the price paid, or 0 when the purchase is refused.
export function buyUpgrade(state, kind) {
  const cost = upgradeCost(kind, state.levels[kind]);
  if (cost === null || state.money < cost) return 0;
  state.money -= cost;
  state.levels[kind] += 1;
  return cost;
}

export function offlineEarnings(levels, awaySeconds) {
  const minutes = Math.min(OFFLINE_CAP_MIN, Math.max(0, awaySeconds) / 60);
  return Math.floor(offlineRate(levels) * minutes);
}

export function formatMoney(n) {
  const v = Math.max(0, Math.floor(n));
  if (v < 10000) return '$' + v.toLocaleString('en-US');
  const units = [['T', 1e12], ['B', 1e9], ['M', 1e6], ['K', 1e3]];
  for (const [suffix, size] of units) {
    if (v >= size) {
      const scaled = v / size;
      const text = scaled >= 100 ? scaled.toFixed(0) : scaled >= 10 ? scaled.toFixed(1) : scaled.toFixed(2);
      return '$' + text.replace(/\.?0+$/, '') + suffix;
    }
  }
  return '$' + v;
}
