// Boat placement shared by the game rules (where the hook starts) and the renderer.
import { TUNING, WATERLINE_Y } from './config.63f07cfa.js';

export function boatGeometry(meta, time) {
  const w = TUNING.boatW;
  const h = w * meta.aspect;
  const bob = Math.sin(time * 1.6) * TUNING.boatBob;
  const top = WATERLINE_Y - meta.waterline * h + bob;
  const left = TUNING.boatX - w / 2;
  return {
    x: left,
    y: top,
    w,
    h,
    tipX: left + meta.rodTip[0] * w,
    tipY: top + meta.rodTip[1] * h
  };
}
