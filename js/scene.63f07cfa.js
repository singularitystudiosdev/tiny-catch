// Backdrop: sky, sun, clouds, depth-tinted sea, light rays, wavy surface, depth ticks, seabed.
import { PALETTE, VIEW_W, WATERLINE_Y, PX_PER_M, DEPTH_CAP } from './config.63f07cfa.js';

const toRgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const SHALLOW = toRgb(PALETTE.shallow);
const ABYSS = toRgb(PALETTE.abyss);
const WHITE = toRgb(PALETTE.white);
const SUN = toRgb(PALETTE.sun);

function mix(a, b, t) {
  return `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * t)).join(',')})`;
}

const CLOUDS = [
  { x: 60, y: 130, s: 1.0, v: 9 },
  { x: 330, y: 70, s: 0.8, v: 6 },
  { x: 220, y: 250, s: 1.2, v: 12 },
  { x: 470, y: 300, s: 0.7, v: 7 }
];

function waveY(x, time) {
  return Math.sin(x * 0.032 + time * 1.8) * 4 + Math.sin(x * 0.011 - time * 1.1) * 3;
}

function drawCloud(ctx, c, camY, time) {
  const x = ((c.x + time * c.v) % (VIEW_W + 240)) - 120;
  const y = c.y - camY * 0.5;
  ctx.fillStyle = PALETTE.white;
  ctx.globalAlpha = 0.9;
  ctx.beginPath();
  ctx.ellipse(x, y, 54 * c.s, 20 * c.s, 0, 0, Math.PI * 2);
  ctx.ellipse(x - 30 * c.s, y + 8 * c.s, 34 * c.s, 15 * c.s, 0, 0, Math.PI * 2);
  ctx.ellipse(x + 30 * c.s, y + 6 * c.s, 38 * c.s, 16 * c.s, 0, 0, Math.PI * 2);
  ctx.ellipse(x + 4 * c.s, y - 14 * c.s, 30 * c.s, 18 * c.s, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
}

export function drawSky(ctx, view, camY, time) {
  const surface = WATERLINE_Y - camY;
  if (surface <= 0) return;
  const grad = ctx.createLinearGradient(0, 0, 0, surface);
  grad.addColorStop(0, mix(SHALLOW, WHITE, 0.2));
  grad.addColorStop(1, mix(SHALLOW, WHITE, 0.62));
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, VIEW_W, surface + 8);
  ctx.fillStyle = PALETTE.sun;
  ctx.strokeStyle = PALETTE.ink;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(474, 190 - camY * 0.5, 40, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  CLOUDS.forEach((c) => drawCloud(ctx, c, camY, time));
}

function wavePath(ctx, y0, time, closeTo) {
  ctx.beginPath();
  ctx.moveTo(0, y0 + waveY(0, time));
  for (let x = 12; x <= VIEW_W + 12; x += 12) ctx.lineTo(x, y0 + waveY(x, time));
  if (closeTo !== null) {
    ctx.lineTo(VIEW_W, closeTo);
    ctx.lineTo(0, closeTo);
    ctx.closePath();
  }
}

function drawRays(ctx, view, camY, time) {
  const centerDepth = (camY + view.h / 2 - WATERLINE_Y) / PX_PER_M;
  const alpha = 0.17 * Math.max(0, 1 - centerDepth / 90);
  if (alpha <= 0.002) return;
  const top = WATERLINE_Y - camY;
  ctx.fillStyle = PALETTE.white;
  ctx.globalAlpha = alpha;
  for (let i = 0; i < 5; i += 1) {
    const x0 = i * 126 + Math.sin(time * 0.35 + i * 1.7) * 26;
    ctx.beginPath();
    ctx.moveTo(x0, top);
    ctx.lineTo(x0 + 54, top);
    ctx.lineTo(x0 + 190, top + 900);
    ctx.lineTo(x0 + 80, top + 900);
    ctx.closePath();
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawTicks(ctx, view, camY) {
  const topM = (camY - WATERLINE_Y) / PX_PER_M;
  const bottomM = (camY + view.h - WATERLINE_Y) / PX_PER_M;
  const first = Math.max(10, Math.ceil(topM / 10) * 10);
  ctx.fillStyle = PALETTE.white;
  ctx.strokeStyle = PALETTE.white;
  ctx.lineWidth = 2;
  ctx.font = '800 16px Nunito, system-ui, sans-serif';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  ctx.globalAlpha = 0.34;
  for (let d = first; d <= Math.min(bottomM, DEPTH_CAP); d += 10) {
    const y = WATERLINE_Y + d * PX_PER_M - camY;
    ctx.beginPath();
    ctx.moveTo(VIEW_W - 84, y);
    ctx.lineTo(VIEW_W - 70, y);
    ctx.stroke();
    ctx.fillText(d + ' m', VIEW_W - 10, y);
  }
  ctx.globalAlpha = 1;
}

function drawSeabed(ctx, view, camY) {
  const y = WATERLINE_Y + DEPTH_CAP * PX_PER_M - camY;
  if (y >= view.h) return;
  ctx.fillStyle = mix(SUN, ABYSS, 0.5);
  ctx.beginPath();
  ctx.moveTo(0, y + 10);
  for (let x = 0; x <= VIEW_W; x += 45) ctx.lineTo(x, y + (x % 90 === 0 ? 0 : 12));
  ctx.lineTo(VIEW_W, view.h + 4);
  ctx.lineTo(0, view.h + 4);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = mix(SUN, ABYSS, 0.7);
  ctx.fillRect(0, y + 44, VIEW_W, view.h);
}

export function drawSea(ctx, view, camY, time) {
  const y0 = WATERLINE_Y - camY;
  const yEnd = y0 + DEPTH_CAP * PX_PER_M;
  const grad = ctx.createLinearGradient(0, y0, 0, yEnd);
  grad.addColorStop(0, mix(SHALLOW, ABYSS, 0));
  grad.addColorStop(0.3, mix(SHALLOW, ABYSS, 0.55));
  grad.addColorStop(1, mix(SHALLOW, ABYSS, 1));
  ctx.fillStyle = grad;
  wavePath(ctx, y0, time, view.h + 4);
  ctx.fill();
  drawRays(ctx, view, camY, time);
  drawTicks(ctx, view, camY);
  drawSeabed(ctx, view, camY);
}

export function drawSurfaceLine(ctx, camY, time) {
  const y0 = WATERLINE_Y - camY;
  if (y0 < -10 || y0 > 2000) return;
  ctx.strokeStyle = PALETTE.white;
  ctx.globalAlpha = 0.85;
  ctx.lineWidth = 3;
  wavePath(ctx, y0, time, null);
  ctx.stroke();
  ctx.globalAlpha = 1;
}
