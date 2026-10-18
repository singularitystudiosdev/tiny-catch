// Per-frame canvas drawing in logical 540-wide units. No game rules in here.
import { PALETTE, WATERLINE_Y, PX_PER_M, TUNING, DEPTH_CAP } from './config.63f07cfa.js';
import { drawSky, drawSea, drawSurfaceLine } from './scene.63f07cfa.js';
import { eachFish } from './world.63f07cfa.js';
import { boat } from './game.63f07cfa.js';

const lerp = (a, b, t) => a + (b - a) * t;

function drawSprite(ctx, sprite, width, x, y, dir, rot) {
  const h = width * sprite.aspect;
  ctx.save();
  ctx.translate(x, y);
  if (rot) ctx.rotate(rot);
  if (dir < 0) ctx.scale(-1, 1);
  ctx.drawImage(sprite.image, -width / 2, -h / 2, width, h);
  ctx.restore();
}

function hookWorld(game) {
  const { hook } = game;
  const hy = WATERLINE_Y + hook.depth * PX_PER_M;
  if (game.phase !== 'cashout') return { x: hook.x, y: hy };
  const geo = boat(game);
  return { x: lerp(geo.tipX, hook.x, hook.retract), y: lerp(geo.tipY + 16, hy, hook.retract) };
}

function drawSwimmers(ctx, game, camY) {
  const t = game.time;
  eachFish(game.world, (f) => {
    const y = f.cy - camY;
    if (y < -120 || y > game.view.h + 120) return;
    const tilt = Math.sin(t * 5 + f.phase) * 0.05;
    drawSprite(ctx, game.assets.fish[f.sp.id], f.sp.w, f.x, y, f.dir, tilt * f.dir);
  });
}

function drawBoat(ctx, game, camY) {
  const geo = boat(game);
  ctx.drawImage(game.assets.boat.image, geo.x, geo.y - camY, geo.w, geo.h);
}

function drawHook(ctx, x, y) {
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x, y - 12);
  ctx.lineTo(x, y + 4);
  ctx.arc(x + 8, y + 4, 8, Math.PI, Math.PI * 0.3, true);
  ctx.strokeStyle = PALETTE.ink;
  ctx.lineWidth = 7;
  ctx.stroke();
  ctx.strokeStyle = PALETTE.white;
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = PALETTE.accent;
  ctx.strokeStyle = PALETTE.ink;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x + 4, y + 10, 4.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
}

function drawLine(ctx, game, camY, hp) {
  const geo = boat(game);
  const sag = game.phase === 'idle' ? 8 : 0;
  ctx.lineCap = 'round';
  for (const [color, width, alpha] of [[PALETTE.ink, 4.5, 0.5], [PALETTE.white, 2, 0.95]]) {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.moveTo(geo.tipX, geo.tipY - camY);
    ctx.quadraticCurveTo((geo.tipX + hp.x) / 2 + sag, (geo.tipY + hp.y) / 2 - camY, hp.x, hp.y - camY);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

function drawDangling(ctx, game, camY, hp) {
  const t = game.time;
  game.caught.forEach((item, i) => {
    if (item.state !== 'hooked') return;
    const col = i % 4;
    const row = Math.floor(i / 4);
    const x = hp.x + (col - 1.5) * 30 + Math.sin(t * 5 + item.wig) * 5;
    const y = hp.y + 34 + row * 34 + Math.sin(t * 7 + item.wig) * 3 - camY;
    const rot = -Math.PI / 2 + Math.sin(t * 6 + item.wig) * 0.28;
    drawSprite(ctx, game.assets.fish[item.sp.id], item.sp.w * 0.6, x, y, 1, rot);
  });
}

function drawAirborne(ctx, game, camY) {
  for (const item of game.caught) {
    if (item.state !== 'air') continue;
    const y = item.y - camY;
    ctx.strokeStyle = PALETTE.white;
    ctx.globalAlpha = 0.5;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(item.x, y, Math.max(TUNING.tapRadius, item.hw), 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
    drawSprite(ctx, game.assets.fish[item.sp.id], item.sp.w * TUNING.airScale, item.x, y, item.dir, item.rot * item.dir);
  }
}

function drawBits(ctx, fx, camY) {
  const seabed = WATERLINE_Y + DEPTH_CAP * PX_PER_M;
  for (const b of fx.bubbles) {
    if (b.y > seabed) continue;
    ctx.strokeStyle = PALETTE.white;
    ctx.globalAlpha = 0.4;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(b.x, b.y - camY, b.r, 0, Math.PI * 2);
    ctx.stroke();
  }
  for (const p of fx.bits) {
    ctx.globalAlpha = Math.min(1, p.life / (p.ttl * 0.5));
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y - camY, p.r, 0, Math.PI * 2);
    if (p.kind === 'bubble') {
      ctx.strokeStyle = p.color;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    } else {
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
}

function drawFloaters(ctx, fx, camY) {
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  for (const f of fx.floaters) {
    const size = f.big ? 46 : 32;
    ctx.globalAlpha = Math.min(1, f.life / 0.4);
    ctx.font = `${size}px "Lilita One", system-ui, sans-serif`;
    ctx.lineWidth = 7;
    ctx.strokeStyle = PALETTE.ink;
    ctx.strokeText(f.text, f.x, f.y - camY);
    ctx.fillStyle = f.big ? PALETTE.sun : PALETTE.white;
    ctx.fillText(f.text, f.x, f.y - camY);
  }
  ctx.globalAlpha = 1;
}

export function render(ctx, game) {
  const { view, fx } = game;
  const camY = game.camY;
  ctx.setTransform(view.pxScale, 0, 0, view.pxScale, 0, 0);
  ctx.save();
  if (fx.shake > 0) ctx.translate((Math.random() - 0.5) * fx.shake, (Math.random() - 0.5) * fx.shake);
  drawSky(ctx, view, camY, game.time);
  drawSea(ctx, view, camY, game.time);
  drawBits(ctx, fx, camY);
  drawSwimmers(ctx, game, camY);
  drawBoat(ctx, game, camY);
  drawSurfaceLine(ctx, camY, game.time);
  const hp = hookWorld(game);
  drawLine(ctx, game, camY, hp);
  drawHook(ctx, hp.x, hp.y - camY);
  drawDangling(ctx, game, camY, hp);
  drawAirborne(ctx, game, camY);
  drawFloaters(ctx, fx, camY);
  ctx.restore();
}
