// Visual-only state: ambient bubbles, droplets, sparks, floating "+$" labels, screen shake.
import { VIEW_W, WATERLINE_Y, PX_PER_M, PALETTE } from './config.63f07cfa.js';

const AMBIENT = 26;

export function createEffects(rng, reducedMotion) {
  const fx = { rng, reducedMotion, bubbles: [], bits: [], floaters: [], shake: 0 };
  for (let i = 0; i < AMBIENT; i += 1) fx.bubbles.push(newBubble(fx, 0, 960, true));
  return fx;
}

function newBubble(fx, camY, viewH, anywhere) {
  const r = fx.rng;
  const y = anywhere ? WATERLINE_Y + r() * 900 : camY + viewH + r() * 120;
  return { x: r() * VIEW_W, y, r: 2 + r() * 5, vy: -(18 + r() * 34), sway: r() * 6.28 };
}

export function updateEffects(fx, dt, camY, viewH, time) {
  for (let i = 0; i < fx.bubbles.length; i += 1) {
    const b = fx.bubbles[i];
    b.y += b.vy * dt;
    b.x += Math.sin(time * 1.5 + b.sway) * 10 * dt;
    if (b.y < Math.max(WATERLINE_Y, camY - 40)) fx.bubbles[i] = newBubble(fx, camY, viewH, false);
  }
  for (const p of fx.bits) {
    p.life -= dt;
    p.vy += p.g * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
  }
  fx.bits = fx.bits.filter((p) => p.life > 0);
  for (const f of fx.floaters) {
    f.life -= dt;
    f.y -= 46 * dt;
  }
  fx.floaters = fx.floaters.filter((f) => f.life > 0);
  fx.shake = Math.max(0, fx.shake - dt * 30);
}

export function addShake(fx, amount) {
  if (!fx.reducedMotion) fx.shake = Math.max(fx.shake, amount);
}

export function addSplash(fx, x, y, count = 14) {
  for (let i = 0; i < count; i += 1) {
    const a = -Math.PI / 2 + (fx.rng() - 0.5) * 1.6;
    const s = 140 + fx.rng() * 220;
    fx.bits.push({
      x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, g: 900, life: 0.55 + fx.rng() * 0.3,
      ttl: 0.85, r: 2 + fx.rng() * 3, color: PALETTE.white, kind: 'drop'
    });
  }
}

export function addSparks(fx, x, y, count = 10, color = PALETTE.sun) {
  for (let i = 0; i < count; i += 1) {
    const a = fx.rng() * Math.PI * 2;
    const s = 80 + fx.rng() * 180;
    fx.bits.push({
      x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, g: 300, life: 0.4 + fx.rng() * 0.25,
      ttl: 0.65, r: 3 + fx.rng() * 3, color, kind: 'spark'
    });
  }
}

export function addTrailBubble(fx, x, y) {
  fx.bits.push({
    x: x + (fx.rng() - 0.5) * 10, y, vx: 0, vy: -30, g: 0, life: 0.7, ttl: 0.7,
    r: 2 + fx.rng() * 2.5, color: PALETTE.white, kind: 'bubble'
  });
}

export function addFloater(fx, x, y, text, big) {
  fx.floaters.push({ x, y, text, life: 1.1, ttl: 1.1, big });
}

export function depthToY(depth) {
  return WATERLINE_Y + depth * PX_PER_M;
}
