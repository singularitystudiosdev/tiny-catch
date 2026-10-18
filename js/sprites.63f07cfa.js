// Procedural fallback sprites: used until (or instead of) the PNGs in assets/.
import { PALETTE, SPECIES } from './config.63f07cfa.js';

const SCALE = 3; // fallback bitmaps are drawn at 3x the logical size for sharpness

function makeCanvas(w, h) {
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(w);
  canvas.height = Math.ceil(h);
  return canvas;
}

function ellipse(g, cx, cy, rx, ry) {
  g.beginPath();
  g.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
}

function drawTail(g, sp, w, h) {
  g.fillStyle = sp.fin;
  g.beginPath();
  g.moveTo(w * 0.26, h * 0.5);
  g.lineTo(w * 0.02, h * 0.12);
  g.lineTo(w * 0.08, h * 0.5);
  g.lineTo(w * 0.02, h * 0.88);
  g.closePath();
  g.fill();
  g.stroke();
}

function drawFins(g, sp, w, h) {
  g.fillStyle = sp.fin;
  g.beginPath();
  g.moveTo(w * 0.42, h * 0.2);
  g.lineTo(w * 0.52, h * 0.0);
  g.lineTo(w * 0.62, h * 0.2);
  g.closePath();
  g.fill();
  g.stroke();
}

export function makeFishSprite(sp) {
  const w = sp.w * SCALE;
  const h = sp.w * sp.aspect * SCALE;
  const canvas = makeCanvas(w, h);
  const g = canvas.getContext('2d');
  g.lineWidth = SCALE * 1.6;
  g.lineJoin = 'round';
  g.strokeStyle = PALETTE.ink;
  drawTail(g, sp, w, h);
  drawFins(g, sp, w, h);
  g.fillStyle = sp.body;
  ellipse(g, w * 0.58, h * 0.52, w * 0.38, h * 0.4);
  g.fill();
  g.stroke();
  g.fillStyle = sp.belly;
  g.beginPath();
  g.ellipse(w * 0.6, h * 0.66, w * 0.3, h * 0.17, 0, 0, Math.PI);
  g.fill();
  g.fillStyle = PALETTE.white;
  ellipse(g, w * 0.82, h * 0.44, h * 0.14, h * 0.14);
  g.fill();
  g.stroke();
  g.fillStyle = PALETTE.ink;
  ellipse(g, w * 0.85, h * 0.45, h * 0.07, h * 0.07);
  g.fill();
  return { image: canvas, aspect: sp.aspect };
}

function drawHull(g, w, h) {
  g.fillStyle = PALETTE.accent;
  g.strokeStyle = PALETTE.ink;
  g.lineWidth = 10;
  g.lineJoin = 'round';
  g.beginPath();
  g.moveTo(w * 0.05, h * 0.62);
  g.lineTo(w * 0.95, h * 0.62);
  g.lineTo(w * 0.8, h * 0.82);
  g.lineTo(w * 0.2, h * 0.82);
  g.closePath();
  g.fill();
  g.stroke();
  g.fillStyle = PALETTE.white;
  g.fillRect(w * 0.12, h * 0.66, w * 0.76, h * 0.05);
}

function drawFisher(g, w, h) {
  g.strokeStyle = PALETTE.ink;
  g.lineWidth = 10;
  g.lineCap = 'round';
  g.fillStyle = PALETTE.sun;
  ellipse(g, w * 0.5, h * 0.2, w * 0.06, w * 0.06);
  g.fill();
  g.stroke();
  g.beginPath();
  g.moveTo(w * 0.5, h * 0.29);
  g.lineTo(w * 0.5, h * 0.5);
  g.moveTo(w * 0.5, h * 0.5);
  g.lineTo(w * 0.42, h * 0.62);
  g.moveTo(w * 0.5, h * 0.5);
  g.lineTo(w * 0.58, h * 0.62);
  g.moveTo(w * 0.5, h * 0.36);
  g.lineTo(w * 0.66, h * 0.42);
  g.stroke();
  g.lineWidth = 7;
  g.beginPath();
  g.moveTo(w * 0.62, h * 0.44);
  g.lineTo(w * 0.96, h * 0.05);
  g.stroke();
}

export function makeBoatSprite(meta) {
  const w = 512;
  const h = Math.round(512 * meta.aspect);
  const canvas = makeCanvas(w, h);
  const g = canvas.getContext('2d');
  drawFisher(g, w, h);
  drawHull(g, w, h);
  return { image: canvas, ...meta };
}

export function makeFallbackSet(boatMeta) {
  const fish = {};
  for (const sp of SPECIES) fish[sp.id] = makeFishSprite(sp);
  return { fish, boat: makeBoatSprite(boatMeta) };
}
