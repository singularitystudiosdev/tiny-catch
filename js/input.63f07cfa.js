// Pointer and keyboard input. Pointer X steers the hook; a tap collects airborne fish.
import { VIEW_W } from './config.63f07cfa.js';
import { setTargetX } from './game.63f07cfa.js';
import { tapAt } from './cashout.63f07cfa.js';

export function toLogical(canvas, event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((event.clientX - rect.left) / rect.width) * VIEW_W,
    y: ((event.clientY - rect.top) / rect.height) * canvas.logicalH
  };
}

export function toClient(canvas, x, y) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: rect.left + (x / VIEW_W) * rect.width,
    y: rect.top + (y / canvas.logicalH) * rect.height
  };
}

const KEY_DIRS = {
  ArrowLeft: 'left',
  a: 'left',
  A: 'left',
  ArrowRight: 'right',
  d: 'right',
  D: 'right'
};

export function attachInput(canvas, game, audio) {
  let down = false;

  canvas.addEventListener('pointerdown', (event) => {
    audio.unlock();
    down = true;
    canvas.setPointerCapture?.(event.pointerId);
    const p = toLogical(canvas, event);
    if (game.phase === 'cashout') tapAt(game, p.x, p.y);
    else setTargetX(game, p.x);
  });
  canvas.addEventListener('pointermove', (event) => {
    if (down && game.phase !== 'cashout') setTargetX(game, toLogical(canvas, event).x);
  });
  const release = () => {
    down = false;
  };
  canvas.addEventListener('pointerup', release);
  canvas.addEventListener('pointercancel', release);

  window.addEventListener('keydown', (event) => {
    audio.unlock();
    const dir = KEY_DIRS[event.key];
    if (!dir) return;
    game.keys[dir] = true;
    event.preventDefault();
  });
  window.addEventListener('keyup', (event) => {
    const dir = KEY_DIRS[event.key];
    if (dir) game.keys[dir] = false;
  });
  window.addEventListener('blur', () => {
    game.keys.left = false;
    game.keys.right = false;
  });
  document.addEventListener('pointerdown', () => audio.unlock(), { capture: true });
}
